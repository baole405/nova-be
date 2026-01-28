import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users.schema";

export const visitors = pgTable("visitors", {
  id: serial("id").primaryKey(),
  residentId: integer("resident_id")
    .notNull()
    .references(() => users.id),
  guestName: varchar("guest_name", { length: 100 }).notNull(),
  phoneNumber: varchar("phone_number", { length: 20 }),
  vehiclePlate: varchar("vehicle_plate", { length: 20 }),
  expectedArrival: timestamp("expected_arrival").notNull(),
  expectedDeparture: timestamp("expected_departure"),
  purpose: varchar("purpose", { length: 255 }),
  accessCode: varchar("access_code", { length: 100 }).notNull().unique(),
  qrImageUrl: text("qr_image_url"),
  status: varchar("status", { length: 50 }).default("pending"), // pending, arrived, expired, cancelled
  checkInAt: timestamp("check_in_at"),
  checkOutAt: timestamp("check_out_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Visitor = typeof visitors.$inferSelect;
export type NewVisitor = typeof visitors.$inferInsert;
