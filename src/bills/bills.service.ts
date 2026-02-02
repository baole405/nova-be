import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "../database/database";
import {
  apartments,
  bills,
  feeTypes,
  transactions,
  User,
} from "../database/schema";
import { GetBillsDto } from "./dto/get-bills.dto";
import { MarkPaidDto } from "./dto/mark-paid.dto";

@Injectable()
export class BillsService {
  async getBills(user: User, query: GetBillsDto) {
    // Get user's apartment
    const [apartment] = await db
      .select()
      .from(apartments)
      .where(eq(apartments.ownerId, user.id));

    if (!apartment) {
      return { data: [], total: 0, page: 1 };
    }

    // Build query conditions
    const conditions = [eq(bills.apartmentId, apartment.id)];

    if (query.status && query.status !== "all") {
      conditions.push(eq(bills.status, query.status));
    }

    // Get bills with fee type info
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
        feeType: {
          id: feeTypes.id,
          name: feeTypes.name,
        },
      })
      .from(bills)
      .leftJoin(feeTypes, eq(bills.feeTypeId, feeTypes.id))
      .where(and(...conditions))
      .limit(query.limit!)
      .offset(query.offset!)
      .orderBy(sql`${bills.dueDate} DESC`);

    // Get total count
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
    // Get user's apartment
    const [apartment] = await db
      .select()
      .from(apartments)
      .where(eq(apartments.ownerId, user.id));

    if (!apartment) {
      throw new NotFoundException("Apartment not found");
    }

    // Get bill with relations
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
        feeType: {
          id: feeTypes.id,
          name: feeTypes.name,
          description: feeTypes.description,
        },
        apartment: {
          unitNumber: apartments.unitNumber,
          floor: apartments.floorNumber,
          block: apartments.blockName,
        },
      })
      .from(bills)
      .leftJoin(feeTypes, eq(bills.feeTypeId, feeTypes.id))
      .leftJoin(apartments, eq(bills.apartmentId, apartments.id))
      .where(eq(bills.id, billId));

    if (!bill) {
      throw new NotFoundException("Bill not found");
    }

    // Authorization check
    if (!bill.apartment || bill.apartment.unitNumber !== apartment.unitNumber) {
      throw new ForbiddenException("You can only view your own bills");
    }

    return bill;
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
        feeType: {
          id: feeTypes.id,
          name: feeTypes.name,
        },
      })
      .from(bills)
      .leftJoin(feeTypes, eq(bills.feeTypeId, feeTypes.id))
      .where(
        and(
          eq(bills.apartmentId, apartment.id),
          eq(bills.status, "pending"),
          gte(bills.dueDate, today.toISOString().split("T")[0]),
          lte(bills.dueDate, sevenDaysLater.toISOString().split("T")[0]),
        ),
      )
      .orderBy(bills.dueDate);

    return { data: upcomingBills };
  }

  async markAsPaid(user: User, billId: number, dto: MarkPaidDto) {
    // Get bill and verify ownership
    const bill = await this.getBillById(user, billId);

    if (bill.status === "paid") {
      throw new ForbiddenException("Bill is already paid");
    }

    // Update bill status
    const [updatedBill] = await db
      .update(bills)
      .set({
        status: "paid",
        paidAt: new Date(),
      })
      .where(eq(bills.id, billId))
      .returning();

    // Create transaction record
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

    return {
      message: "Bill marked as paid",
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
}
