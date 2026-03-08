import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { GetStatsDto } from "./dto/get-stats.dto";
import { StatsService } from "./stats.service";

@ApiTags("Stats")
@ApiBearerAuth()
@Controller("stats")
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  @ApiOperation({ summary: "Get building-wide stats (overview, revenue, activity)" })
  async getStats(@Query() query: GetStatsDto) {
    switch (query.type) {
      case "overview":
        return this.statsService.getOverview();
      case "revenue":
        return this.statsService.getRevenue(query.period);
      case "activity":
        return this.statsService.getActivity();
    }
  }
}
