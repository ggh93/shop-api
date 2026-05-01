import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './test-app.factory';

describe('Order (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let productId: number;

  beforeAll(async () => {
    app = await createTestApp();

    // 테스트 계정 생성 및 로그인
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'order-e2e@test.com', password: 'password123', name: '주문테스터' });

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'order-e2e@test.com', password: 'password123' });

    accessToken = loginRes.body.accessToken;

    // 주문용 테스트 상품 생성
    const productRes = await request(app.getHttpServer())
      .post('/product')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: '주문용 상품', description: '설명', price: 5000, stock: 100 });

    productId = productRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /order (인증 필요)', () => {
    it('401 - 토큰 없이 요청하면 Unauthorized 반환', async () => {
      await request(app.getHttpServer())
        .post('/order')
        .send({ items: [{ productId, quantity: 1 }] })
        .expect(401);
    });

    it('400 - items가 비어 있으면 Bad Request 반환', async () => {
      await request(app.getHttpServer())
        .post('/order')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ items: [] })
        .expect(400);
    });

    it('201 - 주문 생성 성공 및 totalPrice가 올바르게 계산된다', async () => {
      const res = await request(app.getHttpServer())
        .post('/order')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ items: [{ productId, quantity: 2 }] })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.totalPrice).toBe(10000); // 5000 * 2
      expect(res.body.status).toBe('PENDING');
      expect(res.body.orderItems).toHaveLength(1);
      expect(res.body.orderItems[0].quantity).toBe(2);
      expect(res.body.orderItems[0].price).toBe(5000);
    });

    it('404 - 존재하지 않는 상품으로 주문 시 Not Found 반환', async () => {
      await request(app.getHttpServer())
        .post('/order')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ items: [{ productId: 99999, quantity: 1 }] })
        .expect(404);
    });
  });

  describe('GET /order/my (인증 필요)', () => {
    it('401 - 토큰 없이 요청하면 Unauthorized 반환', async () => {
      await request(app.getHttpServer()).get('/order/my').expect(401);
    });

    it('200 - 내 주문 내역 조회 성공', async () => {
      const res = await request(app.getHttpServer())
        .get('/order/my')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const order = res.body[0];
      expect(order.status).toBe('PENDING');
      expect(order.orderItems).toBeDefined();
    });

    it('200 - 다른 사용자의 주문은 조회되지 않는다', async () => {
      // 다른 계정 생성 및 로그인
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'other-order@test.com', password: 'password123', name: '다른유저' });

      const otherLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'other-order@test.com', password: 'password123' });

      const otherToken = otherLogin.body.accessToken;

      // 다른 유저는 주문 내역이 없어야 함
      const res = await request(app.getHttpServer())
        .get('/order/my')
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(200);

      expect(res.body).toEqual([]);
    });
  });
});
