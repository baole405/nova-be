import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { User } from "../database/schema";
import { BillsService } from "./bills.service";
import { GetBillsDto } from "./dto/get-bills.dto";
import { MarkPaidDto } from "./dto/mark-paid.dto";

@ApiTags("Bills")
@ApiBearerAuth()
@Controller("bills")
@UseGuards(JwtAuthGuard)
export class BillsController {
  constructor(private readonly billsService: BillsService) {}

  @Get()
  @ApiOperation({ summary: "Get all bills for current user" })
  async getBills(@CurrentUser() user: User, @Query() query: GetBillsDto) {
    return this.billsService.getBills(user, query);
  }

  @Get("upcoming")
  @ApiOperation({ summary: "Get upcoming bills (within 7 days)" })
  async getUpcomingBills(@CurrentUser() user: User) {
    return this.billsService.getUpcomingBills(user);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get bill details by ID" })
  async getBillById(
    @CurrentUser() user: User,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.billsService.getBillById(user, id);
  }

  @Patch(":id/mark-paid")
  @ApiOperation({ summary: "Mark bill as paid" })
  async markAsPaid(
    @CurrentUser() user: User,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: MarkPaidDto,
  ) {
    return this.billsService.markAsPaid(user, id, dto);
  }
}
