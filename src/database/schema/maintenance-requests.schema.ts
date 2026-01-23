import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { apartments } from "./apartments.schema";
import { users } from "./users.schema";

export const maintenanceRequests = pgTable("maintenance_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  apartmentId: integer("apartment_id").references(() => apartments.id),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 50 }).default("pending"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export type MaintenanceRequest = typeof maintenanceRequests.$inferSelect;
export type NewMaintenanceRequest = typeof maintenanceRequests.$inferInsert;
