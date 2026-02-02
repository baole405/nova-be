import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { User } from "../database/schema";
import { TransactionsService } from "./transactions.service";

@ApiTags("Transactions")
@ApiBearerAuth()
@Controller("transactions")
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  @ApiOperation({ summary: "Get transaction history" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "offset", required: false, type: Number })
  async getTransactions(
    @CurrentUser() user: User,
    @Query("limit") limit?: number,
    @Query("offset") offset?: number,
  ) {
    return this.transactionsService.getTransactions(user, limit, offset);
  }

  @Get("by-month/:month")
  @ApiOperation({ summary: "Get transactions by month (format: YYYY-MM)" })
  async getTransactionsByMonth(
    @CurrentUser() user: User,
    @Param("month") month: string,
  ) {
    return this.transactionsService.getTransactionsByMonth(user, month);
  }
}
