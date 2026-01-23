import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class MarkPaidDto {
  @ApiProperty({ example: "bank_transfer" })
  @IsString()
  paymentMethod: string;

  @ApiProperty({ required: false, example: "TXN123456" })
  @IsOptional()
  @IsString()
  transactionRef?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
