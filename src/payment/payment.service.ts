import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../order/order.entity';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

interface PortoneTokenResponse {
  code: number;
  response: {
    access_token: string;
  };
}

interface PortonePaymentResponse {
  code: number;
  response: {
    status: string;
    amount: number;
  };
}

@Injectable()
export class PaymentService {
  constructor(
    private configService: ConfigService,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
  ) {}

  private async getPortoneToken(): Promise<string> {
    const impKey = this.configService.get<string>('PORTONE_IMP_KEY');
    const impSecret = this.configService.get<string>('PORTONE_IMP_SECRET');

    const response = await fetch('https://api.iamport.kr/users/getToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imp_key: impKey, imp_secret: impSecret }),
    });

    const data = (await response.json()) as PortoneTokenResponse;
    if (data.code !== 0) {
      throw new BadRequestException('포트원 인증 토큰 발급에 실패했습니다.');
    }

    return data.response.access_token;
  }

  async verifyPayment(userId: number, dto: VerifyPaymentDto): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: dto.orderId, userId },
    });
    if (!order) {
      throw new NotFoundException('주문을 찾을 수 없습니다.');
    }

    const accessToken = await this.getPortoneToken();

    const response = await fetch(
      `https://api.iamport.kr/payments/${dto.impUid}`,
      { headers: { Authorization: accessToken } },
    );

    const data = (await response.json()) as PortonePaymentResponse;
    if (data.code !== 0) {
      throw new BadRequestException('결제 정보를 조회할 수 없습니다.');
    }

    const payment = data.response;

    if (payment.status !== 'paid') {
      throw new BadRequestException('결제가 완료되지 않았습니다.');
    }

    if (payment.amount !== order.totalPrice) {
      throw new BadRequestException(
        '결제 금액이 주문 금액과 일치하지 않습니다.',
      );
    }

    order.status = OrderStatus.PAID;
    order.impUid = dto.impUid;
    return this.orderRepository.save(order);
  }
}
