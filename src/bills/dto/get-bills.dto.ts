import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, Min } from "class-validator";

export class GetBillsDto {
  @ApiProperty({
    required: false,
    enum: ["pending", "paid", "overdue", "all"],
    default: "all",
  })
  @IsOptional()
  @IsEnum(["pending", "paid", "overdue", "all"])
  status?: string = "all";

  @ApiProperty({ required: false, default: 50, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 50;

  @ApiProperty({ required: false, default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
