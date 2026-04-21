import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

@ApiTags('payments')
@Controller('payment')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('verify')
  verify(@Request() req, @Body() dto: VerifyPaymentDto) {
    return this.paymentService.verifyPayment(req.user.id, dto);
  }
}
