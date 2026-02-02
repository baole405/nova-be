import { Injectable } from "@nestjs/common";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "../database/database";
import { apartments, bills, transactions, User } from "../database/schema";

@Injectable()
export class TransactionsService {
  async getTransactions(user: User, limit: number = 50, offset: number = 0) {
    // Get user's apartment
    const [apartment] = await db
      .select()
      .from(apartments)
      .where(eq(apartments.ownerId, user.id));

    if (!apartment) {
      return { data: [], total: 0 };
    }

    // Get transactions through bills
    const transactionsData = await db
      .select({
        id: transactions.id,
        billTitle: bills.title,
        amount: transactions.paidAmount,
        paymentDate: transactions.paymentDate,
        paymentMethod: transactions.paymentMethod,
        transactionRef: transactions.transactionRef,
        notes: transactions.notes,
      })
      .from(transactions)
      .leftJoin(bills, eq(transactions.billId, bills.id))
      .where(
        and(
          eq(bills.apartmentId, apartment.id),
          eq(transactions.userId, user.id),
        ),
      )
      .limit(limit)
      .offset(offset)
      .orderBy(sql`${transactions.paymentDate} DESC`);

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .leftJoin(bills, eq(transactions.billId, bills.id))
      .where(
        and(
          eq(bills.apartmentId, apartment.id),
          eq(transactions.userId, user.id),
        ),
      );

    return {
      data: transactionsData,
      total: Number(count),
    };
  }

  async getTransactionsByMonth(user: User, month: string) {
    // month format: "2025-12"
    const [year, monthNum] = month.split("-");
    const startDate = new Date(`${year}-${monthNum}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    // Get user's apartment
    const [apartment] = await db
      .select()
      .from(apartments)
      .where(eq(apartments.ownerId, user.id));

    if (!apartment) {
      return { data: [], month };
    }

    const transactionsData = await db
      .select({
        id: transactions.id,
        billTitle: bills.title,
        amount: transactions.paidAmount,
        paymentDate: transactions.paymentDate,
        paymentMethod: transactions.paymentMethod,
        transactionRef: transactions.transactionRef,
      })
      .from(transactions)
      .leftJoin(bills, eq(transactions.billId, bills.id))
      .where(
        and(
          eq(bills.apartmentId, apartment.id),
          eq(transactions.userId, user.id),
          gte(transactions.paymentDate, startDate),
          lte(transactions.paymentDate, endDate),
        ),
      )
      .orderBy(sql`${transactions.paymentDate} DESC`);

    return {
      data: transactionsData,
      month,
    };
  }
}
