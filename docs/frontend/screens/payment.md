# 결제/엽전 화면 작업 문서

## 관련 화면
- `src/pages/payment/PaymentPages.jsx`
- `src/pages/payment/QRPayPage.jsx`

## API
### 잔액 조회
`GET /api/v1/yeopjeon/balance`

Response data:
- `balance`

### 충전 요청
`POST /api/v1/payments/charge`

Headers:
- `Authorization: Bearer {accessToken}`
- `Idempotency-Key: {uuid}`

Body:
- `amount`: 5000~100000
- `paymentMethod`: 백엔드 enum 확인 필요

Response data:
- `orderUid`

## 구현 주의
- 충전 버튼 중복 클릭 방지 필요
- `Idempotency-Key`는 사용자 클릭 1회당 하나 생성
- 실제 PG 결제창 이동 URL이 응답에 없는 상태라 협의 필요
- QR 결제 API는 현재 코드 기준 확인되지 않음

## 의논 필요
- 충전 응답이 `orderUid`만으로 충분한지, 결제창 URL이 필요한지
- QR 결제 요청/승인/완료 API 명세
- 엽전 사용 내역 API 명세
