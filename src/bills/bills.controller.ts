import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../database/schema';
import { BillsService } from './bills.service';
import { CreateBillDto } from './dto/create-bill.dto';
import { GetBillsDto } from './dto/get-bills.dto';
import { MarkPaidDto } from './dto/mark-paid.dto';

@ApiTags('Bills')
@ApiBearerAuth()
@Controller('bills')
@UseGuards(JwtAuthGuard)
export class BillsController {
  constructor(private readonly billsService: BillsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a bill (manager only)' })
  async createBill(@CurrentUser() user: User, @Body() dto: CreateBillDto) {
    return this.billsService.createBill(user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all bills for current user' })
  async getBills(@CurrentUser() user: User, @Query() query: GetBillsDto) {
    return this.billsService.getBills(user, query);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming bills (within 7 days)' })
  async getUpcomingBills(@CurrentUser() user: User) {
    return this.billsService.getUpcomingBills(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get bill details by ID' })
  async getBillById(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.billsService.getBillById(user, id);
  }

  @Get(':id/payment-status')
  @ApiOperation({ summary: 'Get payment status of a bill' })
  async getPaymentStatus(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.billsService.getPaymentStatus(user, id);
  }

  @Patch(':id/mark-paid')
  @ApiOperation({ summary: 'Mark bill as paid' })
  async markAsPaid(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MarkPaidDto,
  ) {
    return this.billsService.markAsPaid(user, id, dto);
  }
}
