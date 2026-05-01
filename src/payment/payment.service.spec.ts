import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { Order, OrderStatus } from '../order/order.entity';

const mockOrder: Partial<Order> = {
  id: 1,
  userId: 1,
  totalPrice: 10000,
  status: OrderStatus.PENDING,
  impUid: null,
};

describe('PaymentService', () => {
  let service: PaymentService;
  let orderRepo: { findOne: jest.Mock; save: jest.Mock };

  beforeEach(async () => {
    orderRepo = { findOne: jest.fn(), save: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-portone-key'),
          },
        },
        { provide: getRepositoryToken(Order), useValue: orderRepo },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /** fetch를 두 번 성공적으로 응답하도록 설정 */
  const mockFetch = (amount: number, payStatus = 'paid') => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        json: async () => ({
          code: 0,
          response: { access_token: 'mock-access-token' },
        }),
      } as any)
      .mockResolvedValueOnce({
        json: async () => ({
          code: 0,
          response: { status: payStatus, amount },
        }),
      } as any);
  };

  describe('verifyPayment', () => {
    it('결제 검증 성공 시 주문 상태가 PAID로 업데이트된다', async () => {
      const paidOrder = { ...mockOrder, status: OrderStatus.PAID, impUid: 'imp_test_123' };
      orderRepo.findOne.mockResolvedValue({ ...mockOrder });
      orderRepo.save.mockResolvedValue(paidOrder);
      mockFetch(10000);

      const result = await service.verifyPayment(1, {
        impUid: 'imp_test_123',
        orderId: 1,
      });

      expect(result.status).toBe(OrderStatus.PAID);
      expect(result.impUid).toBe('imp_test_123');
      expect(orderRepo.save).toHaveBeenCalledTimes(1);
    });

    it('주문이 존재하지 않으면 NotFoundException을 던진다', async () => {
      orderRepo.findOne.mockResolvedValue(null);

      await expect(
        service.verifyPayment(1, { impUid: 'imp_test_123', orderId: 999 }),
      ).rejects.toThrow(NotFoundException);

      // 포트원 API 호출 없이 즉시 예외 발생 확인
      expect(orderRepo.save).not.toHaveBeenCalled();
    });

    it('다른 사용자의 주문이면 NotFoundException을 던진다', async () => {
      orderRepo.findOne.mockResolvedValue(null); // userId 불일치 → TypeORM에서 null 반환

      await expect(
        service.verifyPayment(99, { impUid: 'imp_test_123', orderId: 1 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('포트원 토큰 발급 실패 시 BadRequestException을 던진다', async () => {
      orderRepo.findOne.mockResolvedValue({ ...mockOrder });
      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        json: async () => ({ code: -1, message: '인증 실패' }),
      } as any);

      await expect(
        service.verifyPayment(1, { impUid: 'imp_test_123', orderId: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('결제 조회 실패 시 BadRequestException을 던진다', async () => {
      orderRepo.findOne.mockResolvedValue({ ...mockOrder });
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce({
          json: async () => ({ code: 0, response: { access_token: 'token' } }),
        } as any)
        .mockResolvedValueOnce({
          json: async () => ({ code: -1, message: '조회 실패' }),
        } as any);

      await expect(
        service.verifyPayment(1, { impUid: 'imp_test_123', orderId: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('결제 상태가 paid가 아니면 BadRequestException을 던진다', async () => {
      orderRepo.findOne.mockResolvedValue({ ...mockOrder });
      mockFetch(10000, 'ready'); // 미결제 상태

      await expect(
        service.verifyPayment(1, { impUid: 'imp_test_123', orderId: 1 }),
      ).rejects.toThrow(BadRequestException);

      expect(orderRepo.save).not.toHaveBeenCalled();
    });

    it('결제 금액이 주문 금액과 다르면 BadRequestException을 던진다', async () => {
      orderRepo.findOne.mockResolvedValue({ ...mockOrder }); // totalPrice: 10000
      mockFetch(5000); // 실제 결제금액: 5000 (불일치)

      await expect(
        service.verifyPayment(1, { impUid: 'imp_test_123', orderId: 1 }),
      ).rejects.toThrow(BadRequestException);

      expect(orderRepo.save).not.toHaveBeenCalled();
    });
  });
});
