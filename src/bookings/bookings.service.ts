import { BadRequestException, Injectable } from '@nestjs/common';
import { and, eq, gte, lte, or } from 'drizzle-orm';
import { db } from '../database/database';
import { bookings } from '../database/schema';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingsService {
  async create(userId: number, createBookingDto: CreateBookingDto) {
    // Check for overlapping bookings for the same service type
    const existingBooking = await db.query.bookings.findFirst({
      where: and(
        eq(bookings.serviceType, createBookingDto.serviceType),
        eq(bookings.date, createBookingDto.date),
        eq(bookings.status, 'confirmed'),
        or(
          and(
            gte(bookings.startTime, createBookingDto.startTime),
            lte(bookings.startTime, createBookingDto.endTime),
          ),
          and(
            gte(bookings.endTime, createBookingDto.startTime),
            lte(bookings.endTime, createBookingDto.endTime),
          ),
        ),
      ),
    });

    if (existingBooking) {
      throw new BadRequestException('Time slot is already booked');
    }

    const [newBooking] = await db
      .insert(bookings)
      .values({
        userId,
        ...createBookingDto,
        status: 'confirmed', // Auto-confirm for now
      })
      .returning();

    return newBooking;
  }

  async findAllByUser(userId: number) {
    return db.query.bookings.findMany({
      where: eq(bookings.userId, userId),
      orderBy: (bookings, { desc }) => [desc(bookings.createdAt)],
    });
  }
}
