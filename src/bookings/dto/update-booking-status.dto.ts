import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum BookingStatusAction {
  CONFIRMED = 'confirmed',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export class UpdateBookingStatusDto {
  @ApiProperty({
    enum: BookingStatusAction,
    description: 'New booking status for manager moderation',
  })
  @IsEnum(BookingStatusAction)
  status: BookingStatusAction;
}
