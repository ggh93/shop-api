import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { User } from '../src/user/user.entity';
import { Product } from '../src/product/product.entity';
import { Order } from '../src/order/order.entity';
import { OrderItem } from '../src/order/order-item.entity';
import { UserModule } from '../src/user/user.module';
import { ProductModule } from '../src/product/product.module';
import { OrderModule } from '../src/order/order.module';
import { AuthModule } from '../src/auth/auth.module';
import { PaymentModule } from '../src/payment/payment.module';

// 테스트 전용 환경변수 (실제 .env 파일 없이 동작)
process.env.JWT_SECRET = 'e2e-test-jwt-secret';
process.env.PORTONE_IMP_KEY = 'e2e-test-imp-key';
process.env.PORTONE_IMP_SECRET = 'e2e-test-imp-secret';

/**
 * E2E 테스트용 NestJS 앱 팩토리
 * - better-sqlite3 인메모리 DB 사용 (MySQL 없이 테스트 가능)
 * - 테스트마다 독립적인 DB 인스턴스 생성 (dropSchema: true)
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
      TypeOrmModule.forRoot({
        type: 'better-sqlite3',
        database: ':memory:',
        entities: [User, Product, Order, OrderItem],
        synchronize: true,
        dropSchema: true,
      }),
      UserModule,
      ProductModule,
      OrderModule,
      AuthModule,
      PaymentModule,
    ],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  await app.init();
  return app;
}
