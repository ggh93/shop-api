import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../user/user.entity';

@ApiTags('payments')
@Controller('payment')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('verify')
  verify(@CurrentUser() user: User, @Body() dto: VerifyPaymentDto) {
    return this.paymentService.verifyPayment(user.id, dto);
  }
}
