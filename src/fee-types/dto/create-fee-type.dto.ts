import { ApiProperty } from "@nestjs/swagger";
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateFeeTypeDto {
  @ApiProperty({ example: "Điện" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: "Phí điện hàng tháng", required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: "3500.00" })
  @IsString()
  @IsNotEmpty()
  unitPrice: string;

  @ApiProperty({ example: "kWh", required: false })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  measureUnit?: string;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;
}
