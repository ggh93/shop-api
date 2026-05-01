import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './test-app.factory';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  const registerDto = {
    email: 'auth-e2e@test.com',
    password: 'password123',
    name: '인증테스터',
  };

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('201 - 회원가입 성공: password 필드를 응답에서 제외한다', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      expect(res.body.email).toBe(registerDto.email);
      expect(res.body.name).toBe(registerDto.name);
      expect(res.body).not.toHaveProperty('password');
      expect(res.body.id).toBeDefined();
    });

    it('409 - 중복 이메일로 가입 시 Conflict 반환', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(409);
    });

    it('400 - 잘못된 이메일 형식으로 가입 시 Bad Request 반환', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'invalid-email', password: '123456', name: '테스터' })
        .expect(400);
    });

    it('400 - 비밀번호 6자 미만이면 Bad Request 반환', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'short@test.com', password: '123', name: '테스터' })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('201 - 로그인 성공 시 accessToken을 반환한다', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: registerDto.email, password: registerDto.password })
        .expect(201);

      expect(res.body.accessToken).toBeDefined();
      expect(typeof res.body.accessToken).toBe('string');
    });

    it('401 - 잘못된 비밀번호로 로그인 시 Unauthorized 반환', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: registerDto.email, password: 'wrong-password' })
        .expect(401);
    });

    it('401 - 존재하지 않는 이메일로 로그인 시 Unauthorized 반환', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@test.com', password: '123456' })
        .expect(401);
    });
  });
});
