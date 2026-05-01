import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './test-app.factory';

describe('App (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /product - 앱이 정상 기동되고 상품 목록 API가 200을 반환한다', () => {
    return request(app.getHttpServer()).get('/product').expect(200);
  });
});
