import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreatePaymentLinkDto {
  @ApiProperty({ example: 1, description: "ID of the bill to pay" })
  @IsInt()
  billId: number;

  @ApiPropertyOptional({ example: 10000, description: "Override amount for dev testing (only honored when PAYOS_TEST_MODE=true)" })
  @IsOptional()
  @IsInt()
  @Min(10000)
  testAmount?: number;

  @ApiPropertyOptional({ example: "http://localhost:5000/bills?payment=success", description: "URL to redirect after successful payment" })
  @IsOptional()
  @IsString()
  returnUrl?: string;

  @ApiPropertyOptional({ example: "http://localhost:5000/bills?payment=cancelled", description: "URL to redirect after cancelled payment" })
  @IsOptional()
  @IsString()
  cancelUrl?: string;
}
