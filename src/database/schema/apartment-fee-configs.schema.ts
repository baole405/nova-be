import {
  index,
  integer,
  pgTable,
  serial,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { apartments } from "./apartments.schema";
import { feeTypes } from "./fee-types.schema";

export const apartmentFeeConfigs = pgTable(
  "apartment_fee_configs",
  {
    id: serial("id").primaryKey(),
    apartmentId: integer("apartment_id")
      .references(() => apartments.id)
      .notNull(),
    feeTypeId: integer("fee_type_id")
      .references(() => feeTypes.id)
      .notNull(),
    quantity: integer("quantity").default(1).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    apartmentIdIdx: index("idx_apt_fee_configs_apartment_id").on(table.apartmentId),
    uniqueAptFee: uniqueIndex("idx_apt_fee_configs_unique").on(
      table.apartmentId,
      table.feeTypeId,
    ),
  }),
);

export type ApartmentFeeConfig = typeof apartmentFeeConfigs.$inferSelect;
export type NewApartmentFeeConfig = typeof apartmentFeeConfigs.$inferInsert;
