import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PayOS } from '@payos/node';
import { eq } from 'drizzle-orm';
import { db } from '../database/database';
import {
  apartments,
  billItems,
  bills,
  feeTypes,
  transactions,
  User,
} from '../database/schema';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly payOS: PayOS;

  constructor(private readonly configService: ConfigService) {
    this.payOS = new PayOS({
      clientId: this.configService.getOrThrow<string>('PAYOS_CLIENT_ID'),
      apiKey: this.configService.getOrThrow<string>('PAYOS_API_KEY'),
      checksumKey: this.configService.getOrThrow<string>('PAYOS_CHECKSUM_KEY'),
    });
  }

  async createPaymentLink(billId: number, user: User, testAmount?: number, returnUrl?: string, cancelUrl?: string) {
    const [apartment] = await db
      .select()
      .from(apartments)
      .where(eq(apartments.ownerId, user.id));

    if (!apartment) {
      throw new NotFoundException('Apartment not found');
    }

    const [bill] = await db.select().from(bills).where(eq(bills.id, billId));

    if (!bill) {
      throw new NotFoundException('Bill not found');
    }

    if (bill.apartmentId !== apartment.id) {
      throw new ForbiddenException('You can only pay your own bills');
    }

    if (bill.status === 'paid') {
      throw new BadRequestException('Bill is already paid');
    }

    // Generate unique orderCode (timestamp-based, last 8 digits)
    const orderCode = Number(String(Date.now()).slice(-8));

    // Save orderCode to bill
    await db.update(bills).set({ orderCode }).where(eq(bills.id, billId));

    // Fetch bill items for line items
    const items = await db
      .select({
        title: billItems.title,
        amount: billItems.amount,
      })
      .from(billItems)
      .leftJoin(feeTypes, eq(billItems.feeTypeId, feeTypes.id))
      .where(eq(billItems.billId, billId));

    // In test mode, override amount to the provided testAmount
    const isTestMode =
      this.configService.get<string>('PAYOS_TEST_MODE') === 'true';
    const effectiveAmount =
      isTestMode && testAmount ? testAmount : Math.round(Number(bill.amount));

    if (isTestMode && testAmount) {
      this.logger.warn(
        `TEST MODE: Overriding bill amount from ${bill.amount} to ${testAmount} VND`,
      );
    }

    const frontendUrl = this.configService
      .getOrThrow<string>('FRONTEND_URL')
      .split(',')[0]
      .trim();

    // In test mode, replace line items with a single item matching the override amount
    const paymentItems =
      isTestMode && testAmount
        ? [{ name: 'Test payment', quantity: 1, price: testAmount }]
        : items.map((item) => ({
            name: item.title,
            quantity: 1,
            price: Math.round(Number(item.amount)),
          }));
    // Build PayOS payload — prefer FE-provided URLs, fall back to FRONTEND_URL env
    const effectiveReturnUrl = returnUrl ?? `${frontendUrl}/bills?payment=success`;
    const effectiveCancelUrl = cancelUrl ?? `${frontendUrl}/bills?payment=cancelled`;

    const payosPayload = {
      orderCode,
      amount: effectiveAmount,
      description: `${bill.title} - ${bill.period}`.slice(0, 25),
      items: paymentItems,
      returnUrl: effectiveReturnUrl,
      cancelUrl: effectiveCancelUrl,
    };

    // Create PayOS payment link
    const paymentLinkResponse =
      await this.payOS.paymentRequests.create(payosPayload);

    return { checkoutUrl: paymentLinkResponse.checkoutUrl };
  }

  async handleWebhook(body: any) {
    let verified: any;
    try {
      verified = this.payOS.webhooks.verify(body);
    } catch {
      this.logger.warn('Invalid webhook signature');
      throw new BadRequestException('Invalid signature');
    }

    // verify() may return full body or just the data — normalize
    const paymentData = verified.data ?? verified;
    const orderCode: number | undefined = paymentData.orderCode;

    this.logger.log(`Webhook received — orderCode: ${orderCode}`);

    // Ignore test webhook from PayOS dashboard (orderCode = 123)
    if (orderCode === 123) {
      this.logger.log('Test webhook received, ignoring');
      return { success: true };
    }

    if (orderCode == null) {
      this.logger.warn('Webhook missing orderCode, skipping');
      return { success: true };
    }

    // Find bill by orderCode
    const [bill] = await db
      .select()
      .from(bills)
      .where(eq(bills.orderCode, orderCode));

    if (!bill) {
      this.logger.warn(`Bill not found for orderCode: ${orderCode}`);
      return { success: true };
    }

    if (bill.status === 'paid') {
      this.logger.log(`Bill ${bill.id} already paid, skipping`);
      return { success: true };
    }

    // Mark bill as paid
    await db
      .update(bills)
      .set({ status: 'paid', paidAt: new Date() })
      .where(eq(bills.id, bill.id));

    // Create transaction record
    const [apartment] = await db
      .select()
      .from(apartments)
      .where(eq(apartments.id, bill.apartmentId!));

    await db.insert(transactions).values({
      billId: bill.id,
      userId: apartment?.ownerId ?? null,
      paidAmount: String(paymentData.amount ?? bill.amount),
      paymentDate: new Date(),
      paymentMethod: 'payos',
      transactionRef: paymentData.reference || String(orderCode),
      notes: `PayOS payment - ${paymentData.description || ''}`,
    });

    this.logger.log(`Bill ${bill.id} marked as paid via PayOS webhook`);
    return { success: true };
  }
}
