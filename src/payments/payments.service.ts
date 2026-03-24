import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PayOS } from '@payos/node';
import { and, eq } from 'drizzle-orm';
import { db } from '../database/database';
import {
  apartments,
  billItems,
  bills,
  feeTypes,
  notifications,
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

  async createPaymentLink(
    billId: number,
    user: User,
    testAmount?: number,
    returnUrl?: string,
    cancelUrl?: string,
  ) {
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
    const effectiveReturnUrl =
      returnUrl ?? `${frontendUrl}/bills?payment=success`;
    const effectiveCancelUrl =
      cancelUrl ?? `${frontendUrl}/bills?payment=cancelled`;

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

    return {
      checkoutUrl: paymentLinkResponse.checkoutUrl,
      orderCode,
      amount: effectiveAmount,
      testMode: isTestMode,
    };
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

    const result = await this.markBillAsPaidWithTransaction(
      bill,
      paymentData,
      'webhook',
    );

    this.logger.log(`Bill ${bill.id} marked as paid via PayOS webhook`);
    return result;
  }

  async reconcilePayment(billId: number, user: User) {
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
      throw new ForbiddenException('You can only reconcile your own bills');
    }

    if (bill.status === 'paid') {
      return {
        billId: bill.id,
        status: bill.status,
        paidAt: bill.paidAt,
        reconciled: false,
        source: 'database',
      };
    }

    if (!bill.orderCode) {
      return {
        billId: bill.id,
        status: bill.status,
        paidAt: bill.paidAt,
        reconciled: false,
        source: 'missing-order-code',
      };
    }

    const payosInfo = await this.getPaymentInfoByOrderCode(bill.orderCode);

    if (!payosInfo) {
      return {
        billId: bill.id,
        status: bill.status,
        paidAt: bill.paidAt,
        reconciled: false,
        source: 'payos-unreachable',
      };
    }

    const paid = this.isPayOSPaidStatus(payosInfo);
    if (!paid) {
      return {
        billId: bill.id,
        status: bill.status,
        paidAt: bill.paidAt,
        reconciled: false,
        source: 'payos-pending',
        payosStatus: this.extractPayOSStatus(payosInfo),
      };
    }

    await this.markBillAsPaidWithTransaction(bill, payosInfo, 'reconcile');

    const [updatedBill] = await db
      .select({
        id: bills.id,
        status: bills.status,
        paidAt: bills.paidAt,
      })
      .from(bills)
      .where(eq(bills.id, bill.id));

    return {
      billId: updatedBill.id,
      status: updatedBill.status,
      paidAt: updatedBill.paidAt,
      reconciled: true,
      source: 'payos-reconcile',
      payosStatus: this.extractPayOSStatus(payosInfo),
    };
  }

  private async markBillAsPaidWithTransaction(
    bill: typeof bills.$inferSelect,
    paymentData: any,
    source: 'webhook' | 'reconcile',
  ) {
    if (bill.status === 'paid') {
      this.logger.log(`Bill ${bill.id} already paid, skipping`);
      return { success: true, idempotent: true };
    }

    const transactionRef = this.extractTransactionRef(paymentData, bill);

    const [existingTransactionByRef] = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(eq(transactions.transactionRef, transactionRef))
      .limit(1);

    if (existingTransactionByRef) {
      this.logger.log(
        `Duplicate ${source} by transactionRef ${transactionRef}, skipping`,
      );
      return { success: true, idempotent: true };
    }

    const [existingTransactionByBill] = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(
        and(
          eq(transactions.billId, bill.id),
          eq(transactions.paymentMethod, 'payos'),
        ),
      )
      .limit(1);

    if (existingTransactionByBill) {
      this.logger.log(`Duplicate ${source} by billId ${bill.id}, skipping`);
      return { success: true, idempotent: true };
    }

    await db
      .update(bills)
      .set({ status: 'paid', paidAt: new Date() })
      .where(eq(bills.id, bill.id));

    const [apartment] = await db
      .select()
      .from(apartments)
      .where(eq(apartments.id, bill.apartmentId!));

    await db.insert(transactions).values({
      billId: bill.id,
      userId: apartment?.ownerId ?? null,
      paidAmount: String(this.extractPaidAmount(paymentData, bill)),
      paymentDate: new Date(),
      paymentMethod: 'payos',
      transactionRef,
      notes: `PayOS payment (${source}) - ${paymentData?.description || ''}`,
    });

    if (apartment?.ownerId) {
      await db.insert(notifications).values({
        userId: apartment.ownerId,
        title: 'Thanh toán thành công',
        content: `Hóa đơn "${bill.title}" đã được thanh toán thành công.`,
        type: 'payment',
        isRead: false,
        relatedBillId: bill.id,
      });
    }

    return { success: true };
  }

  private async getPaymentInfoByOrderCode(orderCode: number) {
    try {
      const payosAny = this.payOS as any;
      const paymentRequests = payosAny?.paymentRequests;

      if (typeof paymentRequests?.get === 'function') {
        return await paymentRequests.get(orderCode);
      }

      if (typeof paymentRequests?.getPaymentLinkInformation === 'function') {
        return await paymentRequests.getPaymentLinkInformation(orderCode);
      }

      if (typeof payosAny?.getPaymentLinkInformation === 'function') {
        return await payosAny.getPaymentLinkInformation(orderCode);
      }

      this.logger.warn(
        'PayOS SDK does not expose payment lookup method for reconcile flow',
      );
      return null;
    } catch (error) {
      this.logger.warn(
        `Failed to query PayOS order ${orderCode}: ${(error as Error).message}`,
      );
      return null;
    }
  }

  private extractPayOSStatus(paymentInfo: any): string {
    return String(
      paymentInfo?.status ?? paymentInfo?.data?.status ?? paymentInfo?.code,
    );
  }

  private isPayOSPaidStatus(paymentInfo: any): boolean {
    const normalized = this.extractPayOSStatus(paymentInfo).toLowerCase();

    if (!normalized) {
      return false;
    }

    if (normalized.includes('cancel') || normalized.includes('failed')) {
      return false;
    }

    return (
      normalized.includes('paid') ||
      normalized.includes('success') ||
      normalized.includes('succeeded') ||
      normalized === '00'
    );
  }

  private extractTransactionRef(
    paymentData: any,
    bill: typeof bills.$inferSelect,
  ): string {
    return (
      paymentData?.reference ??
      paymentData?.transactionRef ??
      paymentData?.id ??
      String(bill.orderCode ?? bill.id)
    );
  }

  private extractPaidAmount(
    paymentData: any,
    bill: typeof bills.$inferSelect,
  ): number {
    const rawAmount = paymentData?.amount ?? paymentData?.data?.amount;
    const parsed = Number(rawAmount);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : Number(bill.amount);
  }
}
