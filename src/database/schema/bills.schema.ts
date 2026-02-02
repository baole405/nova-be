import {
  date,
  decimal,
  index,
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { apartments } from "./apartments.schema";
import { feeTypes } from "./fee-types.schema";

export const bills = pgTable(
  "bills",
  {
    id: serial("id").primaryKey(),
    apartmentId: integer("apartment_id").references(() => apartments.id),
    feeTypeId: integer("fee_type_id").references(() => feeTypes.id),
    title: varchar("title", { length: 255 }).notNull(),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    period: date("period").notNull(),
    dueDate: date("due_date").notNull(),
    status: varchar("status", { length: 50 }).default("pending"),
    createdAt: timestamp("created_at").defaultNow(),
    paidAt: timestamp("paid_at"),
  },
  (table) => ({
    apartmentStatusIdx: index("idx_apartment_status").on(
      table.apartmentId,
      table.status,
    ),
    dueDateIdx: index("idx_due_date").on(table.dueDate),
  }),
);

export type Bill = typeof bills.$inferSelect;
export type NewBill = typeof bills.$inferInsert;
