# 🛒 Shop API

NestJS 기반 커머스 주문/결제 백엔드 API 서버

## 📌 프로젝트 개요

실무 결제 경험을 바탕으로 구현한 커머스 도메인 백엔드 서버입니다.
JWT 인증, 상품/주문 관리, 포트원 결제 연동까지 커머스 핵심 기능을 포함합니다.

## 🛠 기술 스택

- **Framework**: NestJS, TypeScript
- **Database**: MySQL, TypeORM
- **Auth**: JWT, Passport
- **Payment**: 포트원 (iamport)
- **Infra**: Docker, AWS EC2
- **Docs**: Swagger

## ✅ 구현 기능

- [x] 회원가입 / 로그인 (JWT)
- [x] 상품 목록 조회 / 상세
- [x] 주문 생성
- [x] 포트원 결제 연동
- [x] 주문 내역 조회

## 🔐 인증이 필요한 API

JWT Bearer 토큰이 필요한 엔드포인트:

| Method | Path | 설명 |
|--------|------|------|
| POST | /product | 상품 등록 |
| PATCH | /product/:id | 상품 수정 |
| DELETE | /product/:id | 상품 삭제 |
| POST | /order | 주문 생성 |
| GET | /order/my | 내 주문 내역 조회 |
| POST | /payment/verify | 결제 검증 |

## 🚀 실행 방법

```bash
# 환경 변수 설정 (.env)
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=password
DB_DATABASE=shop
JWT_SECRET=your_jwt_secret
PORTONE_IMP_KEY=your_imp_key
PORTONE_IMP_SECRET=your_imp_secret

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

Swagger 문서: `http://localhost:3000/api-docs`
