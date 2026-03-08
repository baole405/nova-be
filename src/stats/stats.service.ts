import { Injectable } from "@nestjs/common";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "../database/database";
import {
  apartments,
  bills,
  transactions,
  users,
} from "../database/schema";

@Injectable()
export class StatsService {
  async getOverview() {
    const [billStats] = await db
      .select({
        totalDue: sql<string>`coalesce(sum(case when ${bills.status} in ('pending', 'overdue') then ${bills.amount}::numeric else 0 end), 0)`,
        pendingCount: sql<number>`count(case when ${bills.status} = 'pending' then 1 end)`,
        overdueCount: sql<number>`count(case when ${bills.status} = 'overdue' then 1 end)`,
      })
      .from(bills);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [paidStats] = await db
      .select({
        paidThisMonth: sql<string>`coalesce(sum(${transactions.paidAmount}::numeric), 0)`,
        paidThisMonthCount: sql<number>`count(*)`,
      })
      .from(transactions)
      .where(gte(transactions.paymentDate, monthStart));

    const [{ totalResidents }] = await db
      .select({ totalResidents: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, "resident"));

    const [{ totalApartments }] = await db
      .select({ totalApartments: sql<number>`count(*)` })
      .from(apartments);

    return {
      totalDue: Number(billStats.totalDue),
      pendingCount: Number(billStats.pendingCount),
      overdueCount: Number(billStats.overdueCount),
      paidThisMonth: Number(paidStats.paidThisMonth),
      paidThisMonthCount: Number(paidStats.paidThisMonthCount),
      totalResidents: Number(totalResidents),
      totalApartments: Number(totalApartments),
    };
  }

  async getRevenue(period?: string) {
    const monthsBack = this.periodToMonths(period);
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const rows = await db
      .select({
        month: sql<string>`to_char(${transactions.paymentDate}, 'YYYY-MM')`,
        total: sql<string>`coalesce(sum(${transactions.paidAmount}::numeric), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(transactions)
      .where(gte(transactions.paymentDate, startDate))
      .groupBy(sql`to_char(${transactions.paymentDate}, 'YYYY-MM')`)
      .orderBy(desc(sql`to_char(${transactions.paymentDate}, 'YYYY-MM')`));

    return {
      months: rows.map((r) => ({
        month: r.month,
        total: Number(r.total),
        count: Number(r.count),
      })),
    };
  }

  async getActivity() {
    const recentTransactions = await db
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
      .orderBy(desc(transactions.paymentDate))
      .limit(5);

    const recentBills = await db
      .select({
        id: bills.id,
        title: bills.title,
        amount: bills.amount,
        dueDate: bills.dueDate,
        status: bills.status,
        createdAt: bills.createdAt,
      })
      .from(bills)
      .orderBy(desc(bills.createdAt))
      .limit(5);

    return { recentTransactions, recentBills };
  }

  private periodToMonths(period?: string): number {
    switch (period) {
      case "this-month":
        return 0;
      case "last-month":
        return 1;
      case "3-months":
        return 3;
      case "6-months":
        return 6;
      case "year":
        return 12;
      default:
        return 6;
    }
  }
}
