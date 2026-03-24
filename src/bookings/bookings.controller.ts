import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';

@ApiTags('Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  private ensureManagerRole(req: any) {
    if (req.user?.role !== 'manager') {
      throw new ForbiddenException('Only manager can perform this action');
    }
  }

  @Post()
  @ApiOperation({ summary: 'Create a new booking' })
  create(@Req() req: any, @Body() createBookingDto: CreateBookingDto) {
    return this.bookingsService.create(req.user.id, createBookingDto);
  }

  @Get('me')
  @ApiOperation({ summary: "Get current user's bookings" })
  findAllMyBookings(@Req() req: any) {
    return this.bookingsService.findAllByUser(req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all bookings by date and service type' })
  findAll(
    @Query('date') date: string,
    @Query('serviceType') serviceType: string,
  ) {
    if (!date || !serviceType) {
      throw new BadRequestException('date and serviceType are required');
    }
    return this.bookingsService.findAll(date, serviceType);
  }

  @Get('admin')
  @ApiOperation({ summary: 'Get all bookings for manager view' })
  findAllForManager(@Req() req: any) {
    this.ensureManagerRole(req);
    return this.bookingsService.findAllForManager();
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update booking status (manager)' })
  updateStatus(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateBookingStatusDto,
  ) {
    this.ensureManagerRole(req);
    return this.bookingsService.updateStatus(id, payload.status);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update booking details (manager)' })
  updateBooking(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateBookingDto,
  ) {
    this.ensureManagerRole(req);
    return this.bookingsService.updateBooking(id, payload);
  }
}
