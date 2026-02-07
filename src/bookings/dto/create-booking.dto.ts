import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export enum ServiceType {
  PARKING = 'parking',
  BBQ = 'bbq',
}

export class CreateBookingDto {
  @ApiProperty({ enum: ServiceType, description: 'Type of service to book' })
  @IsEnum(ServiceType)
  serviceType: ServiceType;

  @ApiProperty({
    description: 'Specific slot number (e.g., A1, B2)',
    example: 'A1',
  })
  @IsString()
  slotNumber: string;

  @ApiProperty({
    description: 'Date of booking (YYYY-MM-DD)',
    example: '2024-03-20',
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    description: 'End date for monthly booking (YYYY-MM-DD)',
    example: '2024-04-20',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ description: 'Start time (HH:mm)', example: '14:00' })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in HH:mm format',
  })
  startTime: string;

  @ApiProperty({ description: 'End time (HH:mm)', example: '16:00' })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime must be in HH:mm format',
  })
  endTime: string;

  @ApiProperty({ description: 'Optional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
