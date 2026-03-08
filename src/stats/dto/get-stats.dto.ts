import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";

export class GetStatsDto {
  @ApiProperty({
    required: true,
    enum: ["overview", "revenue", "activity"],
    example: "overview",
    description: "Type of stats to retrieve",
  })
  @IsEnum(["overview", "revenue", "activity"])
  type: string;

  @ApiProperty({
    required: false,
    enum: ["this-month", "last-month", "3-months", "6-months", "year"],
    example: "6-months",
    description: "Time period filter (used with revenue type)",
  })
  @IsOptional()
  @IsEnum(["this-month", "last-month", "3-months", "6-months", "year"])
  period?: string;
}
