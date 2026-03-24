import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../database/schema';
import { CreatePaymentLinkDto } from './dto/create-payment-link.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-link')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create PayOS payment link for a bill' })
  async createPaymentLink(
    @CurrentUser() user: User,
    @Body() dto: CreatePaymentLinkDto,
  ) {
    return this.paymentsService.createPaymentLink(
      dto.billId,
      user,
      dto.testAmount,
      dto.returnUrl,
      dto.cancelUrl,
    );
  }

  @Post('webhook')
  @ApiOperation({ summary: 'PayOS webhook endpoint (no auth)' })
  async handleWebhook(@Body() body: any) {
    return this.paymentsService.handleWebhook(body);
  }

  @Post('reconcile/:billId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Reconcile payment status from PayOS for a resident bill',
  })
  async reconcilePayment(
    @CurrentUser() user: User,
    @Param('billId', ParseIntPipe) billId: number,
  ) {
    return this.paymentsService.reconcilePayment(billId, user);
  }
}
