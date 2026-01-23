import {
  boolean,
  decimal,
  pgTable,
  serial,
  text,
  varchar,
} from "drizzle-orm/pg-core";

export const feeTypes = pgTable("fee_types", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
  measureUnit: varchar("measure_unit", { length: 50 }),
  isRecurring: boolean("is_recurring").default(true),
});

export type FeeType = typeof feeTypes.$inferSelect;
export type NewFeeType = typeof feeTypes.$inferInsert;
