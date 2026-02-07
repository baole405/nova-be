import { BadRequestException, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { db } from '../database/database';
import { bookings } from '../database/schema';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingsService {
  async create(userId: number, createBookingDto: CreateBookingDto) {
    // 1. Fetch all confirmed bookings for the same service and slot
    const existingBookings = await db.query.bookings.findMany({
      where: and(
        eq(bookings.serviceType, createBookingDto.serviceType),
        eq(bookings.slotNumber, createBookingDto.slotNumber),
        eq(bookings.status, 'confirmed'),
      ),
    });

    // 2. Check for overlap in JS
    const hasOverlap = existingBookings.some((booking) => {
      // Date Range Overlap Check
      const bStart = new Date(booking.date);
      const bEnd = new Date(booking.endDate || booking.date);
      const cStart = new Date(createBookingDto.date);
      const cEnd = new Date(createBookingDto.endDate || createBookingDto.date);

      // Check if date ranges disjoint
      if (cStart > bEnd || cEnd < bStart) return false;

      // If dates overlap, check time.
      // If either booking is a "range" (has endDate), assume full-day blocking -> Overlap!
      if (booking.endDate || createBookingDto.endDate) return true;

      // If both are single-day, check time overlap
      // e.g. Booked: 10:00-12:00. New: 11:00-13:00 -> Overlap
      // Logic: StartA <= EndB AND EndA >= StartB
      return (
        booking.startTime <= createBookingDto.endTime &&
        booking.endTime >= createBookingDto.startTime
      );
    });

    if (hasOverlap) {
      throw new BadRequestException(
        `Slot ${createBookingDto.slotNumber} is already booked for this time.`,
      );
    }

    const [newBooking] = await db
      .insert(bookings)
      .values({
        userId,
        serviceType: createBookingDto.serviceType,
        slotNumber: createBookingDto.slotNumber,
        date: createBookingDto.date,
        endDate: createBookingDto.endDate,
        startTime: createBookingDto.startTime,
        endTime: createBookingDto.endTime,
        notes: createBookingDto.notes,
        status: 'confirmed', // Auto-confirm for now
      })
      .returning();

    return newBooking;
  }

  async findAllByUser(userId: number) {
    return db.query.bookings.findMany({
      where: eq(bookings.userId, userId),
      orderBy: (schema, { desc }) => [desc(schema.createdAt)],
    });
  }

  async findAll(date: string, serviceType: string) {
    const targetDate = new Date(date);

    // Fetch all confirmed bookings for the service type
    // We need to check if the target date falls within any booking's range
    const allBookings = await db.query.bookings.findMany({
      where: and(
        eq(bookings.serviceType, serviceType),
        eq(bookings.status, 'confirmed'),
      ),
    });

    // Filter in JS for date overlap
    return allBookings.filter((booking) => {
      const bStart = new Date(booking.date);
      const bEnd = new Date(booking.endDate || booking.date);
      return targetDate >= bStart && targetDate <= bEnd;
    });
  }
}
