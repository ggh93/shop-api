import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { OrderService } from './order.service';
import { Order, OrderStatus } from './order.entity';
import { OrderItem } from './order-item.entity';
import { Product } from '../product/product.entity';

const mockProduct: Partial<Product> = {
  id: 1,
  name: '테스트 상품',
  price: 10000,
  stock: 50,
};

const mockOrder: Partial<Order> = {
  id: 1,
  userId: 1,
  totalPrice: 20000,
  status: OrderStatus.PENDING,
  orderItems: [],
};

describe('OrderService', () => {
  let service: OrderService;
  let orderRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let orderItemRepo: { create: jest.Mock };
  let productRepo: { findOne: jest.Mock };

  beforeEach(async () => {
    orderRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    orderItemRepo = { create: jest.fn() };
    productRepo = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: getRepositoryToken(OrderItem), useValue: orderItemRepo },
        { provide: getRepositoryToken(Product), useValue: productRepo },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  describe('create', () => {
    it('주문을 생성하고 총 금액을 올바르게 계산한다', async () => {
      productRepo.findOne.mockResolvedValue(mockProduct);
      orderItemRepo.create.mockReturnValue({
        productId: 1,
        quantity: 2,
        price: 10000,
      });
      orderRepo.create.mockReturnValue(mockOrder);
      orderRepo.save.mockResolvedValue(mockOrder);

      const result = await service.create(1, {
        items: [{ productId: 1, quantity: 2 }],
      });

      expect(result.totalPrice).toBe(20000);
      expect(orderRepo.save).toHaveBeenCalledTimes(1);
    });

    it('여러 상품을 포함한 주문의 총 금액을 합산한다', async () => {
      const product2: Partial<Product> = { id: 2, price: 5000, stock: 10 };
      productRepo.findOne
        .mockResolvedValueOnce(mockProduct) // price: 10000
        .mockResolvedValueOnce(product2); // price: 5000

      orderItemRepo.create
        .mockReturnValueOnce({ productId: 1, quantity: 1, price: 10000 })
        .mockReturnValueOnce({ productId: 2, quantity: 2, price: 5000 });

      const expectedOrder = { ...mockOrder, totalPrice: 20000 }; // 10000*1 + 5000*2
      orderRepo.create.mockReturnValue(expectedOrder);
      orderRepo.save.mockResolvedValue(expectedOrder);

      const result = await service.create(1, {
        items: [
          { productId: 1, quantity: 1 },
          { productId: 2, quantity: 2 },
        ],
      });

      // create에 넘어간 totalPrice 확인
      const createdArgs = orderRepo.create.mock.calls[0][0];
      expect(createdArgs.totalPrice).toBe(20000);
      expect(result).toBeDefined();
    });

    it('존재하지 않는 상품이 포함되면 NotFoundException을 던진다', async () => {
      productRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create(1, { items: [{ productId: 999, quantity: 1 }] }),
      ).rejects.toThrow(NotFoundException);

      expect(orderRepo.save).not.toHaveBeenCalled();
    });

    it('주문 생성 시 userId가 올바르게 설정된다', async () => {
      productRepo.findOne.mockResolvedValue(mockProduct);
      orderItemRepo.create.mockReturnValue({ productId: 1, quantity: 1, price: 10000 });
      orderRepo.create.mockReturnValue(mockOrder);
      orderRepo.save.mockResolvedValue(mockOrder);

      await service.create(42, { items: [{ productId: 1, quantity: 1 }] });

      const createdArgs = orderRepo.create.mock.calls[0][0];
      expect(createdArgs.userId).toBe(42);
    });
  });

  describe('findMyOrders', () => {
    it('사용자의 주문 내역 목록을 반환한다', async () => {
      orderRepo.find.mockResolvedValue([mockOrder, { ...mockOrder, id: 2 }]);

      const result = await service.findMyOrders(1);

      expect(result).toHaveLength(2);
      expect(orderRepo.find).toHaveBeenCalledWith({
        where: { userId: 1 },
        relations: ['orderItems', 'orderItems.product'],
        order: { createdAt: 'DESC' },
      });
    });

    it('주문이 없으면 빈 배열을 반환한다', async () => {
      orderRepo.find.mockResolvedValue([]);

      const result = await service.findMyOrders(1);

      expect(result).toEqual([]);
    });
  });
});
