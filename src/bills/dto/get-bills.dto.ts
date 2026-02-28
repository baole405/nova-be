import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsInt, IsOptional, Min } from "class-validator";

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

  @ApiProperty({
    required: false,
    enum: ["dueDate", "amount", "createdAt"],
    default: "dueDate",
  })
  @IsOptional()
  @IsEnum(["dueDate", "amount", "createdAt"])
  sortBy?: string = "dueDate";

  @ApiProperty({
    required: false,
    enum: ["asc", "desc"],
    default: "desc",
  })
  @IsOptional()
  @IsEnum(["asc", "desc"])
  sortOrder?: string = "desc";

  @ApiProperty({
    required: false,
    description: "Filter bills with dueDate >= this (ISO date, e.g. 2026-01-01)",
  })
  @IsOptional()
  @IsDateString()
  dueDateFrom?: string;

  @ApiProperty({
    required: false,
    description: "Filter bills with dueDate <= this (ISO date, e.g. 2026-02-28)",
  })
  @IsOptional()
  @IsDateString()
  dueDateTo?: string;
}
