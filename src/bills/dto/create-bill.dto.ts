import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class CreateBillItemDto {
  @ApiProperty({ example: 1, description: 'Fee type ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  feeTypeId?: number;

  @ApiProperty({ example: 'Phí quản lý tháng 03/2026' })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  usage?: number;

  @ApiPropertyOptional({ example: 10000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional({ example: 'kWh' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  measureUnit?: string;

  @ApiProperty({ example: 2000, description: 'Final amount for this item' })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount: number;
}

export class CreateBillDto {
  @ApiProperty({ example: 12, description: 'Apartment ID' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  apartmentId: number;

  @ApiProperty({ example: 'Hóa đơn tháng 03/2026' })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({
    example: 2000,
    description: 'Optional. If omitted, amount will be summed from items',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount?: number;

  @ApiProperty({ example: '2026-03-01' })
  @IsDateString()
  period: string;

  @ApiProperty({ example: '2026-03-25' })
  @IsDateString()
  dueDate: string;

  @ApiPropertyOptional({
    enum: ['pending', 'paid', 'overdue'],
    default: 'pending',
  })
  @IsOptional()
  @IsEnum(['pending', 'paid', 'overdue'])
  status?: 'pending' | 'paid' | 'overdue';

  @ApiPropertyOptional({
    type: [CreateBillItemDto],
    description: 'Optional detailed line items',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateBillItemDto)
  items?: CreateBillItemDto[];
}
