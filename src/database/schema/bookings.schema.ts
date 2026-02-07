import {
  date,
  integer,
  pgTable,
  serial,
  text,
  time,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const bookings = pgTable('bookings', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  serviceType: varchar('service_type', { length: 50 }).notNull(), // 'parking', 'bbq'
  date: date('date').notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(), // 'pending', 'confirmed', 'cancelled', 'rejected'
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
