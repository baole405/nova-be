import {
  decimal,
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users.schema";

export const apartments = pgTable("apartments", {
  id: serial("id").primaryKey(),
  unitNumber: varchar("unit_number", { length: 50 }).notNull(),
  floorNumber: integer("floor_number"),
  blockName: varchar("block_name", { length: 50 }),
  ownerId: integer("owner_id").references(() => users.id),
  areaSqm: decimal("area_sqm", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Apartment = typeof apartments.$inferSelect;
export type NewApartment = typeof apartments.$inferInsert;
