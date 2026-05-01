import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './user.entity';

const mockUser: Partial<User> = {
  id: 1,
  email: 'test@test.com',
  password: 'hashed-password',
  name: '테스터',
};

describe('UserService', () => {
  let service: UserService;
  let mockRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(async () => {
    mockRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(User), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  describe('create', () => {
    it('새 사용자를 생성하고 반환한다', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.create.mockReturnValue(mockUser);
      mockRepo.save.mockResolvedValue(mockUser);

      const result = await service.create({
        email: 'test@test.com',
        password: '123456',
        name: '테스터',
      });

      expect(result.email).toBe('test@test.com');
      expect(mockRepo.save).toHaveBeenCalledTimes(1);
    });

    it('비밀번호는 해시화되어 저장된다', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.create.mockReturnValue(mockUser);
      mockRepo.save.mockResolvedValue(mockUser);

      await service.create({
        email: 'test@test.com',
        password: 'plaintext-password',
        name: '테스터',
      });

      const savedUser = mockRepo.create.mock.calls[0][0] as User;
      expect(savedUser.password).not.toBe('plaintext-password');
    });

    it('이미 존재하는 이메일이면 ConflictException을 던진다', async () => {
      mockRepo.findOne.mockResolvedValue(mockUser);

      await expect(
        service.create({ email: 'dup@test.com', password: '123456', name: '테스터' }),
      ).rejects.toThrow(ConflictException);

      expect(mockRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('findByEmail', () => {
    it('이메일로 사용자를 찾아 반환한다', async () => {
      mockRepo.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@test.com');

      expect(result).toEqual(mockUser);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { email: 'test@test.com' },
      });
    });

    it('존재하지 않는 이메일이면 null을 반환한다', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('none@test.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('ID로 사용자를 찾아 반환한다', async () => {
      mockRepo.findOne.mockResolvedValue(mockUser);

      const result = await service.findById(1);

      expect(result).toEqual(mockUser);
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('존재하지 않는 ID이면 null을 반환한다', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      const result = await service.findById(999);

      expect(result).toBeNull();
    });
  });
});
