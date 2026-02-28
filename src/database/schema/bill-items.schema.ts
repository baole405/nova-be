import {
  decimal,
  index,
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { bills } from "./bills.schema";
import { feeTypes } from "./fee-types.schema";

export const billItems = pgTable(
  "bill_items",
  {
    id: serial("id").primaryKey(),
    billId: integer("bill_id")
      .references(() => bills.id)
      .notNull(),
    feeTypeId: integer("fee_type_id").references(() => feeTypes.id),
    title: varchar("title", { length: 255 }).notNull(),
    usage: decimal("usage", { precision: 10, scale: 2 }),
    unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
    measureUnit: varchar("measure_unit", { length: 50 }),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    billIdIdx: index("idx_bill_items_bill_id").on(table.billId),
  }),
);

export type BillItem = typeof billItems.$inferSelect;
export type NewBillItem = typeof billItems.$inferInsert;
