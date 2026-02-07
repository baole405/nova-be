import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@ApiTags('Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

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
    return this.bookingsService.findAll(date, serviceType);
  }
}
