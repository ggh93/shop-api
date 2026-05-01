import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';

// bcrypt를 모듈 레벨에서 모킹 (non-configurable 속성 문제 회피)
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require('bcrypt') as { compare: jest.Mock; hash: jest.Mock };

const mockUser = {
  id: 1,
  email: 'test@test.com',
  password: 'hashed-password',
  name: '테스터',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AuthService', () => {
  let service: AuthService;
  let userService: jest.Mocked<UserService>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: {
            create: jest.fn(),
            findByEmail: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get(UserService);
    jwtService = module.get(JwtService);
  });

  describe('register', () => {
    it('회원가입 성공 시 password를 제외한 사용자 정보를 반환한다', async () => {
      userService.create.mockResolvedValue(mockUser as any);

      const result = await service.register({
        email: 'test@test.com',
        password: '123456',
        name: '테스터',
      });

      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe('test@test.com');
      expect(result.name).toBe('테스터');
    });

    it('UserService.create를 정확히 1번 호출한다', async () => {
      userService.create.mockResolvedValue(mockUser as any);

      await service.register({
        email: 'test@test.com',
        password: '123456',
        name: '테스터',
      });

      expect(userService.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('login', () => {
    it('로그인 성공 시 accessToken을 반환한다', async () => {
      userService.findByEmail.mockResolvedValue(mockUser as any);
      bcrypt.compare.mockResolvedValue(true);

      const result = await service.login('test@test.com', '123456');

      expect(result).toEqual({ accessToken: 'mock-jwt-token' });
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
      });
    });

    it('존재하지 않는 이메일로 로그인 시 UnauthorizedException을 던진다', async () => {
      userService.findByEmail.mockResolvedValue(null);

      await expect(service.login('none@test.com', '123456')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('비밀번호가 틀리면 UnauthorizedException을 던진다', async () => {
      userService.findByEmail.mockResolvedValue(mockUser as any);
      bcrypt.compare.mockResolvedValue(false);

      await expect(service.login('test@test.com', 'wrong-pw')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
