import {
  decimal,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { bills } from "./bills.schema";
import { users } from "./users.schema";

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").references(() => bills.id),
  userId: integer("user_id").references(() => users.id),
  paidAmount: decimal("paid_amount", { precision: 15, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date").defaultNow(),
  paymentMethod: varchar("payment_method", { length: 50 }),
  transactionRef: varchar("transaction_ref", { length: 100 }),
  notes: text("notes"),
});

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
