# merchant 화면 작업 문서

## 상태
OpenAPI 문서 기준으로 상인 홈, 내 가게, 수익 지갑, QR 결제 대기, 메뉴 등록/수정/삭제, 정산 내역/신청 API가 확인되었습니다.

## 인증
- 모든 상인 화면 API는 MERCHANT Access Token을 사용합니다.
- 프론트 `apiRequest` 호출 시 `auth: true, role: "MERCHANT"`를 지정합니다.

## API 계약 요약

### 내 가게
| 기능 | Method | URL | 응답 |
|---|---:|---|---|
| 내 가게 목록 | GET | `/api/v1/merchants/me/shops` | `ShopResponse[]` |
| 내 가게 단건 | GET | `/api/v1/merchants/me/shops/{shopId}` | `ShopResponse` |
| 내 가게 수정 | PATCH | `/api/v1/merchants/me/shops/{shopId}` | `ShopResponse` |
| 가게 상태 변경 | PATCH | `/api/v1/merchants/me/shops/{shopId}/status` | `{ "status": "ACTIVE" \| "CLOSED" }` → `ShopResponse` |
| 가게 공지 목록 | GET | `/api/v1/merchants/me/shops/{shopId}/notices` | `ShopNoticeResponse[]` |
| 가게 공지 등록 | POST | `/api/v1/merchants/me/shops/{shopId}/notices` | `{ "title": string, "content": string }` → `ShopNoticeResponse` |
| 가게 공지 삭제 | DELETE | `/api/v1/merchants/me/shops/{shopId}/notices/{noticeId}` | 204/응답 없음 |

`ShopResponse` 주요 필드:
- `id`, `shopName`, `category`, `address`, `phone`, `description`
- `operatingHours`, `closedDays`, `isCertified`, `rating`, `reviewCount`, `status`
- `imageUrls` 또는 `thumbnailUrl`

`ShopNoticeResponse` 주요 필드:
- `noticeId` 또는 `id`, `title`, `content`, `createdAt`

### 가게 수익 지갑
| 기능 | Method | URL | 응답 |
|---|---:|---|---|
| 가게 지갑 조회 | GET | `/api/v1/merchants/me/shops/{shopId}/wallet` | `ShopWalletResponse` |

`ShopWalletResponse` 주요 필드:
- `shopId`, `balance`, `updatedAt`

### QR 결제 대기/승인
| 기능 | Method | URL | 요청/응답 |
|---|---:|---|---|
| 대기중 QR 결제 목록 | GET | `/api/v1/merchants/me/qr-payments/pending` | `PendingQrPayResponse[]` |
| QR 결제 승인/거절 | PATCH | `/api/v1/payments/qr/{payRequestId}/confirm` | `QrPayConfirmRequest` |

`PendingQrPayResponse` 주요 필드:
- `payRequestId`, `shopId`, `amount`, `menuItems`, `createdAt`, `expiredAt`

`QrPayConfirmRequest`:
```json
{
  "action": "APPROVE",
  "rejectReason": "거절 사유"
}
```

`action` enum:
- `APPROVE`
- `REJECT`

### 메뉴
| 기능 | Method | URL | 요청/응답 |
|---|---:|---|---|
| 메뉴 등록 | POST | `/api/v1/merchants/me/shops/{shopId}/menus` | `MenuCreateRequest` → `MenuResponse` |
| 메뉴 수정 | PATCH | `/api/v1/merchants/me/shops/{shopId}/menus/{menuId}` | `MenuUpdateRequest` → `MenuResponse` |
| 메뉴 삭제 | DELETE | `/api/v1/merchants/me/shops/{shopId}/menus/{menuId}` | 204/응답 없음 |

확인된 상인 전용 메뉴 목록 조회 API는 없습니다. 현재 프론트는 가게 상세 응답에 `menus`가 포함될 때만 실제 목록을 사용하고, 없으면 빈 상태 또는 fallback을 사용합니다.

### 정산
| 기능 | Method | URL | 요청/응답 |
|---|---:|---|---|
| 정산 내역 조회 | GET | `/api/v1/merchants/me/shops/{shopId}/settlements?cursor=&size=20` | Cursor page of `SettlementResponse` |
| 정산 신청 | POST | `/api/v1/merchants/me/shops/{shopId}/settlements` | `SettlementResponse` |
| 정산 계좌 등록/변경 | PUT | `/api/v1/merchants/me/shops/{shopId}/account` | `ShopAccountRequest` → `ShopAccountResponse` |

`SettlementResponse` 주요 필드:
- `settlementId`, `shopId`, `amount`, `status`, `rejectReason`
- `bankName`, `accountNumber`, `accountHolder`, `createdAt`

## 현재 mock 유지 영역
- 가게 사진 업로드 API는 S3 미설정 stub으로 `@Hidden` 처리되어 있어 프론트에서 노출하거나 호출하지 않습니다.
- 상인 전용 메뉴 목록 조회 API가 없어 메뉴 목록은 가게 상세 응답에 `menus`가 없으면 fallback을 유지합니다.
- 정산 신청 금액 요청 body는 OpenAPI에 명시되지 않았습니다. 현재 프론트는 금액이 있을 때 body를 함께 보내지만, 백엔드가 무시하거나 거절하면 API 계약 협의가 필요합니다.
