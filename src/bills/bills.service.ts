import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm';
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
import { CreateBillDto } from './dto/create-bill.dto';
import { GetBillsDto } from './dto/get-bills.dto';
import { MarkPaidDto } from './dto/mark-paid.dto';

@Injectable()
export class BillsService {
  async createBill(user: User, dto: CreateBillDto) {
    if (user.role !== 'manager') {
      throw new ForbiddenException('Only managers can create bills');
    }

    const [apartment] = await db
      .select()
      .from(apartments)
      .where(eq(apartments.id, dto.apartmentId));

    if (!apartment) {
      throw new NotFoundException('Apartment not found');
    }

    const computedAmount =
      dto.items?.reduce((sum, item) => sum + Number(item.amount), 0) ?? 0;

    const finalAmount =
      dto.amount != null ? Number(dto.amount) : Number(computedAmount);

    if (!Number.isFinite(finalAmount) || finalAmount <= 0) {
      throw new BadRequestException(
        'Bill amount must be greater than 0 (from amount or item totals)',
      );
    }

    const [createdBill] = await db
      .insert(bills)
      .values({
        apartmentId: dto.apartmentId,
        title: dto.title,
        amount: String(finalAmount),
        period: dto.period,
        dueDate: dto.dueDate,
        status: dto.status ?? 'pending',
      })
      .returning();

    if (dto.items?.length) {
      await db.insert(billItems).values(
        dto.items.map((item) => ({
          billId: createdBill.id,
          feeTypeId: item.feeTypeId,
          title: item.title,
          usage: item.usage != null ? String(item.usage) : null,
          unitPrice: item.unitPrice != null ? String(item.unitPrice) : null,
          measureUnit: item.measureUnit,
          amount: String(item.amount),
        })),
      );
    }

    if (apartment.ownerId) {
      await db.insert(notifications).values({
        userId: apartment.ownerId,
        title: 'Hóa đơn mới',
        content: `Hóa đơn "${createdBill.title}" kỳ ${createdBill.period} đã được tạo.`,
        type: 'bill',
        isRead: false,
        relatedBillId: createdBill.id,
      });
    }

    return {
      message: 'Bill created successfully',
      bill: {
        id: createdBill.id,
        apartmentId: createdBill.apartmentId,
        title: createdBill.title,
        amount: createdBill.amount,
        period: createdBill.period,
        dueDate: createdBill.dueDate,
        status: createdBill.status,
      },
      itemsCount: dto.items?.length ?? 0,
    };
  }

  async getBills(user: User, query: GetBillsDto) {
    const [apartment] = await db
      .select()
      .from(apartments)
      .where(eq(apartments.ownerId, user.id));

    if (!apartment) {
      return { data: [], total: 0, page: 1 };
    }

    const conditions = [eq(bills.apartmentId, apartment.id)];

    if (query.status && query.status !== 'all') {
      conditions.push(eq(bills.status, query.status));
    }

    if (query.dueDateFrom) {
      conditions.push(gte(bills.dueDate, query.dueDateFrom));
    }
    if (query.dueDateTo) {
      conditions.push(lte(bills.dueDate, query.dueDateTo));
    }

    const billsData = await db
      .select({
        id: bills.id,
        title: bills.title,
        amount: bills.amount,
        period: bills.period,
        dueDate: bills.dueDate,
        status: bills.status,
        createdAt: bills.createdAt,
        paidAt: bills.paidAt,
      })
      .from(bills)
      .where(and(...conditions))
      .limit(query.limit!)
      .offset(query.offset!)
      .orderBy(
        (query.sortOrder === 'asc' ? asc : desc)(
          query.sortBy === 'amount'
            ? bills.amount
            : query.sortBy === 'createdAt'
              ? bills.createdAt
              : bills.dueDate,
        ),
      );

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(bills)
      .where(and(...conditions));

    return {
      data: billsData,
      total: Number(count),
      page: Math.floor(query.offset! / query.limit!) + 1,
    };
  }

  async getBillById(user: User, billId: number) {
    const [apartment] = await db
      .select()
      .from(apartments)
      .where(eq(apartments.ownerId, user.id));

    if (!apartment) {
      throw new NotFoundException('Apartment not found');
    }

    const [bill] = await db
      .select({
        id: bills.id,
        title: bills.title,
        amount: bills.amount,
        period: bills.period,
        dueDate: bills.dueDate,
        status: bills.status,
        createdAt: bills.createdAt,
        paidAt: bills.paidAt,
        apartment: {
          unitNumber: apartments.unitNumber,
          floor: apartments.floorNumber,
          block: apartments.blockName,
        },
      })
      .from(bills)
      .leftJoin(apartments, eq(bills.apartmentId, apartments.id))
      .where(eq(bills.id, billId));

    if (!bill) {
      throw new NotFoundException('Bill not found');
    }

    if (!bill.apartment || bill.apartment.unitNumber !== apartment.unitNumber) {
      throw new ForbiddenException('You can only view your own bills');
    }

    // Fetch bill items with fee type info
    const items = await db
      .select({
        id: billItems.id,
        title: billItems.title,
        usage: billItems.usage,
        unitPrice: billItems.unitPrice,
        measureUnit: billItems.measureUnit,
        amount: billItems.amount,
        feeType: {
          id: feeTypes.id,
          name: feeTypes.name,
        },
      })
      .from(billItems)
      .leftJoin(feeTypes, eq(billItems.feeTypeId, feeTypes.id))
      .where(eq(billItems.billId, billId))
      .orderBy(billItems.id);

    return { ...bill, items };
  }

  async getUpcomingBills(user: User) {
    const [apartment] = await db
      .select()
      .from(apartments)
      .where(eq(apartments.ownerId, user.id));

    if (!apartment) {
      return { data: [] };
    }

    const today = new Date();
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(today.getDate() + 7);

    const upcomingBills = await db
      .select({
        id: bills.id,
        title: bills.title,
        amount: bills.amount,
        dueDate: bills.dueDate,
        status: bills.status,
      })
      .from(bills)
      .where(
        and(
          eq(bills.apartmentId, apartment.id),
          eq(bills.status, 'pending'),
          gte(bills.dueDate, today.toISOString().split('T')[0]),
          lte(bills.dueDate, sevenDaysLater.toISOString().split('T')[0]),
        ),
      )
      .orderBy(bills.dueDate);

    return { data: upcomingBills };
  }

  async markAsPaid(user: User, billId: number, dto: MarkPaidDto) {
    if (user.role !== 'manager') {
      throw new ForbiddenException(
        'Manual mark-paid is manager-only. Residents must pay via PayOS.',
      );
    }

    const [bill] = await db.select().from(bills).where(eq(bills.id, billId));

    if (!bill) {
      throw new NotFoundException('Bill not found');
    }

    if (bill.status === 'paid') {
      throw new ForbiddenException('Bill is already paid');
    }

    const [updatedBill] = await db
      .update(bills)
      .set({
        status: 'paid',
        paidAt: new Date(),
      })
      .where(eq(bills.id, billId))
      .returning();

    const [transaction] = await db
      .insert(transactions)
      .values({
        billId: updatedBill.id,
        userId: user.id,
        paidAmount: updatedBill.amount,
        paymentDate: new Date(),
        paymentMethod: dto.paymentMethod,
        transactionRef: dto.transactionRef,
        notes: dto.notes,
      })
      .returning();

    const [apartment] = await db
      .select({ ownerId: apartments.ownerId })
      .from(apartments)
      .where(eq(apartments.id, updatedBill.apartmentId!));

    if (apartment?.ownerId) {
      await db.insert(notifications).values({
        userId: apartment.ownerId,
        title: 'Hóa đơn đã thanh toán',
        content: `Hóa đơn "${updatedBill.title}" đã được xác nhận thanh toán bởi ban quản lý.`,
        type: 'payment',
        isRead: false,
        relatedBillId: updatedBill.id,
      });
    }

    return {
      message: 'Bill marked as paid',
      bill: {
        id: updatedBill.id,
        status: updatedBill.status,
        paidAt: updatedBill.paidAt,
      },
      transaction: {
        id: transaction.id,
        amount: transaction.paidAmount,
        method: transaction.paymentMethod,
      },
    };
  }

  async getPaymentStatus(user: User, billId: number) {
    const [apartment] = await db
      .select()
      .from(apartments)
      .where(eq(apartments.ownerId, user.id));

    if (!apartment) {
      throw new NotFoundException('Apartment not found');
    }

    const [bill] = await db
      .select({
        id: bills.id,
        status: bills.status,
        paidAt: bills.paidAt,
        amount: bills.amount,
      })
      .from(bills)
      .where(eq(bills.id, billId));

    if (!bill) {
      throw new NotFoundException('Bill not found');
    }

    const [ownerBill] = await db
      .select({ id: bills.id })
      .from(bills)
      .where(and(eq(bills.id, billId), eq(bills.apartmentId, apartment.id)));

    if (!ownerBill) {
      throw new ForbiddenException(
        'You can only view payment status of your own bills',
      );
    }

    const [transaction] = await db
      .select({
        transactionRef: transactions.transactionRef,
        paymentDate: transactions.paymentDate,
        amount: transactions.paidAmount,
      })
      .from(transactions)
      .where(eq(transactions.billId, billId))
      .orderBy(desc(transactions.paymentDate))
      .limit(1);

    return {
      billId: bill.id,
      status: bill.status,
      paidAt: bill.paidAt,
      amount: bill.amount,
      transactionRef: transaction?.transactionRef ?? null,
      paymentDate: transaction?.paymentDate ?? null,
      paidAmount: transaction?.amount ?? null,
    };
  }
}
