import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ProductService } from './product.service';
import { Product } from './product.entity';

const mockProduct: Partial<Product> = {
  id: 1,
  name: '테스트 상품',
  description: '상품 설명입니다',
  price: 15000,
  stock: 100,
};

describe('ProductService', () => {
  let service: ProductService;
  let mockRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    mockRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        { provide: getRepositoryToken(Product), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
  });

  describe('findAll', () => {
    it('모든 상품 목록을 배열로 반환한다', async () => {
      mockRepo.find.mockResolvedValue([mockProduct, { ...mockProduct, id: 2 }]);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(mockRepo.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
    });

    it('상품이 없으면 빈 배열을 반환한다', async () => {
      mockRepo.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('ID로 상품을 찾아 반환한다', async () => {
      mockRepo.findOne.mockResolvedValue(mockProduct);

      const result = await service.findOne(1);

      expect(result).toEqual(mockProduct);
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('존재하지 않는 ID이면 NotFoundException을 던진다', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow('999');
    });
  });

  describe('create', () => {
    it('상품을 생성하고 저장된 결과를 반환한다', async () => {
      mockRepo.create.mockReturnValue(mockProduct);
      mockRepo.save.mockResolvedValue(mockProduct);

      const result = await service.create({
        name: '테스트 상품',
        description: '상품 설명입니다',
        price: 15000,
        stock: 100,
      });

      expect(result.name).toBe('테스트 상품');
      expect(result.price).toBe(15000);
      expect(mockRepo.create).toHaveBeenCalledTimes(1);
      expect(mockRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    it('상품을 수정하고 업데이트된 결과를 반환한다', async () => {
      const original = { ...mockProduct };
      const updated = { ...mockProduct, name: '수정된 상품', price: 20000 };
      mockRepo.findOne.mockResolvedValue(original);
      mockRepo.save.mockResolvedValue(updated);

      const result = await service.update(1, { name: '수정된 상품', price: 20000 });

      expect(result.name).toBe('수정된 상품');
      expect(result.price).toBe(20000);
    });

    it('존재하지 않는 상품 수정 시 NotFoundException을 던진다', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.update(999, { name: '수정' })).rejects.toThrow(
        NotFoundException,
      );
      expect(mockRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('상품을 성공적으로 삭제한다', async () => {
      mockRepo.findOne.mockResolvedValue(mockProduct);
      mockRepo.remove.mockResolvedValue(undefined);

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(mockRepo.remove).toHaveBeenCalledWith(mockProduct);
    });

    it('존재하지 않는 상품 삭제 시 NotFoundException을 던진다', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
      expect(mockRepo.remove).not.toHaveBeenCalled();
    });
  });
});
