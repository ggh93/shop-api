import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './test-app.factory';

describe('Product (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let createdProductId: number;

  beforeAll(async () => {
    app = await createTestApp();

    // 테스트용 계정 생성 및 로그인
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'product-e2e@test.com', password: 'password123', name: '상품테스터' });

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'product-e2e@test.com', password: 'password123' });

    accessToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /product (공개)', () => {
    it('200 - 인증 없이 상품 목록 조회 성공', async () => {
      const res = await request(app.getHttpServer()).get('/product').expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /product (인증 필요)', () => {
    it('401 - 토큰 없이 요청하면 Unauthorized 반환', async () => {
      await request(app.getHttpServer())
        .post('/product')
        .send({ name: '상품', description: '설명', price: 10000, stock: 100 })
        .expect(401);
    });

    it('400 - price가 음수이면 Bad Request 반환', async () => {
      await request(app.getHttpServer())
        .post('/product')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: '상품', description: '설명', price: -100, stock: 100 })
        .expect(400);
    });

    it('201 - 상품 생성 성공', async () => {
      const res = await request(app.getHttpServer())
        .post('/product')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: '테스트 상품', description: '상품 설명입니다', price: 15000, stock: 50 })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('테스트 상품');
      expect(res.body.price).toBe(15000);
      createdProductId = res.body.id;
    });
  });

  describe('GET /product/:id (공개)', () => {
    it('200 - 상품 상세 조회 성공', async () => {
      const res = await request(app.getHttpServer())
        .get(`/product/${createdProductId}`)
        .expect(200);

      expect(res.body.id).toBe(createdProductId);
      expect(res.body.name).toBe('테스트 상품');
    });

    it('404 - 존재하지 않는 상품 조회 시 Not Found 반환', async () => {
      await request(app.getHttpServer()).get('/product/99999').expect(404);
    });
  });

  describe('PATCH /product/:id (인증 필요)', () => {
    it('401 - 토큰 없이 수정 요청하면 Unauthorized 반환', async () => {
      await request(app.getHttpServer())
        .patch(`/product/${createdProductId}`)
        .send({ name: '수정된 상품' })
        .expect(401);
    });

    it('200 - 상품 부분 수정 성공', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/product/${createdProductId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: '수정된 상품', price: 20000 })
        .expect(200);

      expect(res.body.name).toBe('수정된 상품');
      expect(res.body.price).toBe(20000);
    });
  });

  describe('DELETE /product/:id (인증 필요)', () => {
    it('401 - 토큰 없이 삭제 요청하면 Unauthorized 반환', async () => {
      await request(app.getHttpServer())
        .delete(`/product/${createdProductId}`)
        .expect(401);
    });

    it('200 - 상품 삭제 성공', async () => {
      await request(app.getHttpServer())
        .delete(`/product/${createdProductId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('404 - 삭제 후 동일 ID 조회 시 Not Found 반환', async () => {
      await request(app.getHttpServer())
        .get(`/product/${createdProductId}`)
        .expect(404);
    });
  });
});
