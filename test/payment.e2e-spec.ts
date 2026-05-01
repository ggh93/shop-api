import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './test-app.factory';

describe('Payment (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let orderId: number;

  const PRODUCT_PRICE = 8000;
  const IMP_UID = 'imp_e2e_test_123456';

  beforeAll(async () => {
    app = await createTestApp();

    // 테스트 계정 생성 및 로그인
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'payment-e2e@test.com', password: 'password123', name: '결제테스터' });

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'payment-e2e@test.com', password: 'password123' });

    accessToken = loginRes.body.accessToken;

    // 결제 검증용 상품 및 주문 생성
    const productRes = await request(app.getHttpServer())
      .post('/product')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: '결제용 상품', description: '설명', price: PRODUCT_PRICE, stock: 100 });

    const orderRes = await request(app.getHttpServer())
      .post('/order')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ items: [{ productId: productRes.body.id, quantity: 1 }] });

    orderId = orderRes.body.id;
  });

  afterAll(async () => {
    await app.close();
    jest.restoreAllMocks();
  });

  /** 포트원 API 호출을 성공 응답으로 모킹 */
  const mockPortoneSuccess = (amount: number) => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        json: async () => ({
          code: 0,
          response: { access_token: 'mock-portone-token' },
        }),
      } as any)
      .mockResolvedValueOnce({
        json: async () => ({
          code: 0,
          response: { status: 'paid', amount },
        }),
      } as any);
  };

  describe('POST /payment/verify (인증 필요)', () => {
    it('401 - 토큰 없이 요청하면 Unauthorized 반환', async () => {
      await request(app.getHttpServer())
        .post('/payment/verify')
        .send({ impUid: IMP_UID, orderId })
        .expect(401);
    });

    it('400 - 잘못된 요청 바디이면 Bad Request 반환', async () => {
      await request(app.getHttpServer())
        .post('/payment/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ impUid: 123, orderId: 'invalid' }) // 타입 오류
        .expect(400);
    });

    it('201 - 결제 검증 성공 시 주문 상태가 PAID로 변경된다', async () => {
      mockPortoneSuccess(PRODUCT_PRICE);

      const res = await request(app.getHttpServer())
        .post('/payment/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ impUid: IMP_UID, orderId })
        .expect(201);

      expect(res.body.status).toBe('PAID');
      expect(res.body.impUid).toBe(IMP_UID);
    });

    it('400 - 결제 금액 불일치 시 Bad Request 반환', async () => {
      // 새 주문 생성
      const productRes = await request(app.getHttpServer())
        .post('/product')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: '금액불일치 상품', description: '설명', price: 9999, stock: 10 });

      const orderRes = await request(app.getHttpServer())
        .post('/order')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ items: [{ productId: productRes.body.id, quantity: 1 }] });

      jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce({
          json: async () => ({ code: 0, response: { access_token: 'token' } }),
        } as any)
        .mockResolvedValueOnce({
          json: async () => ({
            code: 0,
            response: { status: 'paid', amount: 1 }, // 실제 금액과 다름
          }),
        } as any);

      await request(app.getHttpServer())
        .post('/payment/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ impUid: 'imp_mismatch', orderId: orderRes.body.id })
        .expect(400);
    });

    it('404 - 존재하지 않는 주문 ID이면 Not Found 반환', async () => {
      await request(app.getHttpServer())
        .post('/payment/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ impUid: IMP_UID, orderId: 99999 })
        .expect(404);
    });
  });
});
