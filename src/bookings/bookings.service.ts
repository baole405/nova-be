import { BadRequestException, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../database/database';
import { apartments, bookings, users } from '../database/schema';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';

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

  async findAllForManager() {
    const rows = await db
      .select({
        id: bookings.id,
        serviceType: bookings.serviceType,
        slotNumber: bookings.slotNumber,
        date: bookings.date,
        endDate: bookings.endDate,
        startTime: bookings.startTime,
        endTime: bookings.endTime,
        status: bookings.status,
        notes: bookings.notes,
        createdAt: bookings.createdAt,
        residentName: users.fullName,
        residentUsername: users.username,
        apartmentUnit: apartments.unitNumber,
      })
      .from(bookings)
      .leftJoin(users, eq(bookings.userId, users.id))
      .leftJoin(apartments, eq(users.id, apartments.ownerId))
      .orderBy(desc(bookings.createdAt));

    return rows.map((row) => ({
      id: row.id,
      serviceType: row.serviceType,
      slotNumber: row.slotNumber ?? undefined,
      date: row.date,
      endDate: row.endDate ?? undefined,
      startTime: row.startTime,
      endTime: row.endTime,
      status: row.status,
      notes: row.notes ?? undefined,
      createdAt: row.createdAt,
      residentName:
        row.residentName || row.residentUsername || `Resident #${row.id}`,
      apartmentUnit: row.apartmentUnit || 'N/A',
    }));
  }

  async updateStatus(id: number, status: string) {
    const [updated] = await db
      .update(bookings)
      .set({ status })
      .where(eq(bookings.id, id))
      .returning();

    if (!updated) {
      throw new BadRequestException('Booking not found');
    }

    return this.findOneForManager(updated.id);
  }

  async updateBooking(id: number, payload: UpdateBookingDto) {
    const [updated] = await db
      .update(bookings)
      .set({
        notes: payload.notes,
      })
      .where(eq(bookings.id, id))
      .returning();

    if (!updated) {
      throw new BadRequestException('Booking not found');
    }

    return this.findOneForManager(updated.id);
  }

  private async findOneForManager(id: number) {
    const [row] = await db
      .select({
        id: bookings.id,
        serviceType: bookings.serviceType,
        slotNumber: bookings.slotNumber,
        date: bookings.date,
        endDate: bookings.endDate,
        startTime: bookings.startTime,
        endTime: bookings.endTime,
        status: bookings.status,
        notes: bookings.notes,
        createdAt: bookings.createdAt,
        residentName: users.fullName,
        residentUsername: users.username,
        apartmentUnit: apartments.unitNumber,
      })
      .from(bookings)
      .leftJoin(users, eq(bookings.userId, users.id))
      .leftJoin(apartments, eq(users.id, apartments.ownerId))
      .where(eq(bookings.id, id))
      .limit(1);

    if (!row) {
      throw new BadRequestException('Booking not found');
    }

    return {
      id: row.id,
      serviceType: row.serviceType,
      slotNumber: row.slotNumber ?? undefined,
      date: row.date,
      endDate: row.endDate ?? undefined,
      startTime: row.startTime,
      endTime: row.endTime,
      status: row.status,
      notes: row.notes ?? undefined,
      createdAt: row.createdAt,
      residentName:
        row.residentName || row.residentUsername || `Resident #${row.id}`,
      apartmentUnit: row.apartmentUnit || 'N/A',
    };
  }
}
