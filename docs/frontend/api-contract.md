# 프론트엔드 API 계약 요약

이 문서는 `docs/api-spec.json` (OpenAPI 3.1) 기준으로 갱신한 프론트 연결 기준입니다.

## 공통 응답

```json
{ "code": "SUCCESS", "message": "OK", "data": {} }
```

프론트 `apiClient.js`는 `payload.data ?? payload`로 처리합니다.

## 공통 에러 응답

```json
{ "code": "AUTH_001", "message": "이메일 또는 비밀번호가 올바르지 않습니다.", "data": null }
```

---

## 1. 인증

### USER 인증

| 기능 | Method | URL | 인증 | 비고 |
|---|---:|---|---|---|
| 회원가입 | POST | `/api/v1/users/auth/signup` | 불필요 | req: `SignupRequest` (email, password, nickname) |
| 일반 로그인 | POST | `/api/v1/users/auth/login` | 불필요 | resp: `LoginResponse` (accessToken, role) |
| 소셜 로그인 1단계 | POST | `/api/v1/users/auth/oauth/{provider}` | 불필요 | req: `OauthLoginRequest` |
| 소셜 가입 2단계 | POST | `/api/v1/users/auth/oauth/signup` | 불필요 | req: `OauthSignupRequest` |

### MERCHANT 인증

| 기능 | Method | URL | 인증 | 비고 |
|---|---:|---|---|---|
| 상인 로그인 | POST | `/api/v1/merchants/auth/login` | 불필요 | resp: `LoginResponse` |
| 상인 소셜 로그인 | POST | `/api/v1/merchants/auth/oauth/{provider}` | 불필요 | req: `OauthLoginRequest` |

### ADMIN 인증

| 기능 | Method | URL | 인증 |
|---|---:|---|---|
| 관리자 로그인 | POST | `/api/v1/admin/auth/login` | 불필요 |

### 공통 토큰

| 기능 | Method | URL | 인증 |
|---|---:|---|---|
| Access Token 재발급 | POST | `/api/v1/auth/reissue` | Refresh Cookie |
| 로그아웃 | POST | `/api/v1/auth/logout` | Access Token |

---

## 2. 내 정보 (USER)

| 기능 | Method | URL | 인증 | 비고 |
|---|---:|---|---|---|
| 내 프로필 조회 | GET | `/api/v1/users/me` | USER | resp: `UserMeResponse` |
| 내 프로필 수정 | PATCH | `/api/v1/users/me` | USER | req: `PatchUserMeRequest` |
| 회원 탈퇴 | DELETE | `/api/v1/users/me` | USER | |
| 마이페이지 홈 | GET | `/api/v1/users/me/home` | USER | resp: `UserMeHomeResponse` |
| 내 찜 목록 | GET | `/api/v1/users/me/likes` | USER | query: `type`, `pageable` |
| 내 리뷰 목록 | GET | `/api/v1/users/me/reviews` | USER | query: `pageable` |
| 내 보유 아이템 | GET | `/api/v1/users/me/items` | USER | query: `cursor`, `size` |
| 보유 아이템 QR 발급 | GET | `/api/v1/users/me/items/{itemId}/qr` | USER | resp: `UserItemQrResponse` |
| 프로필 이미지 업로드 | POST | `/api/v1/users/me/profile-image` | USER | multipart |

---

## 3. 장소/지도

| 기능 | Method | URL | 인증 | 주요 파라미터 |
|---|---:|---|---|---|
| 관광지 목록 조회 | GET | `/api/v1/places` | 선택적 | query: `request` |
| 주변 관광지 조회 | GET | `/api/v1/places/nearby` | 선택적 | query: `request` (lat, lng, radius, page, size) |
| 지도 마커 일괄 조회 | GET | `/api/v1/places/map-markers` | 선택적 | query: `request` |
| 관광지 상세 조회 | GET | `/api/v1/places/{placeId}` | 선택적 | resp: `PlaceDetailResponse` |
| 관광지 찜 추가 | POST | `/api/v1/places/{placeId}/like` | USER | |
| 관광지 찜 취소 | DELETE | `/api/v1/places/{placeId}/like` | USER | |
| 관광지 주변 상점 | GET | `/api/v1/places/{placeId}/nearby-shops` | 불필요 | query: `limit` |
| 관광지 주변 장소 | GET | `/api/v1/places/{placeId}/nearby-places` | 불필요 | query: `category`, `radius` |
| 관광지 기반 추천 | GET | `/api/v1/places/{placeId}/recommend` | 불필요 | resp: `List<RecommendPlaceResponse>` |
| 관광지 리뷰 조회 | GET | `/api/v1/places/{placeId}/reviews` | 불필요 | query: `pageable` |
| 관광지 리뷰 작성 | POST | `/api/v1/places/{placeId}/reviews` | USER | req: `ReviewCreateRequest` |
| 주소→좌표 변환 | GET | `/api/v1/places/geocoding` | 불필요 | query: `query` |
| 좌표→지역 역변환 | GET | `/api/v1/places/region` | 불필요 | query: `lat`, `lng` |
| 길찾기 URL 생성 | GET | `/api/v1/directions` | 불필요 | query: `request` |

### 전통시장

| 기능 | Method | URL | 인증 | 주요 파라미터 |
|---|---:|---|---|---|
| 주변 전통시장 조회 | GET | `/api/v1/traditional-markets/nearby` | 불필요 | query: `lat`, `lng`, `radius`, `page`, `size` |
| 전통시장 상세 조회 | GET | `/api/v1/traditional-markets/{marketId}` | 불필요 | |
| 전통시장 찜 추가 | POST | `/api/v1/traditional-markets/{marketId}/like` | USER | |
| 전통시장 찜 취소 | DELETE | `/api/v1/traditional-markets/{marketId}/like` | USER | |

---

## 4. 검색

| 기능 | Method | URL | 인증 | 주요 파라미터 |
|---|---:|---|---|---|
| 통합 검색 | GET | `/api/v1/search` | 불필요 | query: `q`, `type(ALL\|PLACE\|SHOP\|MENU\|FESTIVAL)`, `cursor`, `size` |
| 최근 검색어 저장 | POST | `/api/v1/search` | USER | req: `RecentSearchRequest` |
| 자동완성 | GET | `/api/v1/search/suggest` | 불필요 | query: `q` |
| 최근 검색어 조회 | GET | `/api/v1/search/recent` | USER | |
| 최근 검색어 삭제 | DELETE | `/api/v1/search/recent` | USER | query: `keyword` (없으면 전체 삭제) |
| 인기 검색어 TOP10 | GET | `/api/v1/search/popular` | 불필요 | |
| 관광지 검색 | GET | `/api/v1/search/places` | 불필요 | query: `q`, `category`, `region`, `cursor`, `size` |
| 축제 검색 v1 | GET | `/api/v1/search/festivals` | 불필요 | query: `q`, `startDate`, `endDate`, `region`, `cursor`, `size` |
| **축제 검색 v2** | GET | `/api/v2/search/festivals` | 불필요 | query: `q`, `startDate`, `endDate`, `region`, `cursor`, `size` ← **신규 화면 표준** |

> v2는 응답 키가 `address`/`imageUrl`이며 오타 교정을 지원합니다. 신규 화면은 v2를 사용하세요.

---

## 5. 추천

| 기능 | Method | URL | 인증 | 파라미터 |
|---|---:|---|---|---|
| 인기 관광지 추천 | GET | `/api/v1/recommend/popular` | 불필요 | |
| 위치 기반 추천 | GET | `/api/v1/recommend/nearby` | 불필요 | query: `lat`, `lng`, `radius`, `limit` |
| 카테고리별 추천 | GET | `/api/v1/recommend/category` | 불필요 | query: `category` |

---

## 6. 축제

| 기능 | Method | URL | 인증 | 파라미터 |
|---|---:|---|---|---|
| 축제 목록 조회 | GET | `/api/v1/festivals` | 불필요 | query: `date`, `region`, `cursor`, `size` |
| 축제 상세 조회 | GET | `/api/v1/festivals/{festivalId}` | 불필요 | |
| 축제 찜 추가 | POST | `/api/v1/festivals/{festivalId}/like` | USER | |
| 축제 찜 취소 | DELETE | `/api/v1/festivals/{festivalId}/like` | USER | |

### 축제 캘린더

| 기능 | Method | URL | 인증 | 파라미터 |
|---|---:|---|---|---|
| 월별 캘린더 조회 | GET | `/api/v1/calendar` | 불필요 | query: `year`, `month` |
| 일별 캘린더 조회 | GET | `/api/v1/calendar/daily` | 불필요 | query: `date` |

---

## 7. 커뮤니티

### 동행 게시판

| 기능 | Method | URL | 인증 | 비고 |
|---|---:|---|---|---|
| 목록 조회 | GET | `/api/v1/community/posts/companions` | 불필요 | query: `region`, `meetingDate`, `cursor`, `size` |
| 작성 | POST | `/api/v1/community/posts/companions` | USER | req: `CompanionPostCreateRequest` |
| 단건 조회 | GET | `/api/v1/community/posts/companions/{postId}` | 불필요 | |
| 수정 | PUT | `/api/v1/community/posts/companions/{postId}` | USER | req: `CompanionPostUpdateRequest` |
| 삭제 | DELETE | `/api/v1/community/posts/companions/{postId}` | USER | |

### 자유 게시판

| 기능 | Method | URL | 인증 | 비고 |
|---|---:|---|---|---|
| 목록 조회 | GET | `/api/v1/community/posts/free` | 불필요 | query: `cursor`, `size` |
| 작성 | POST | `/api/v1/community/posts/free` | USER | req: `FreePostCreateRequest` |
| 단건 조회 | GET | `/api/v1/community/posts/free/{postId}` | 불필요 | |
| 수정 | PATCH | `/api/v1/community/posts/free/{postId}` | USER | req: `FreePostUpdateRequest` |
| 삭제 | DELETE | `/api/v1/community/posts/free/{postId}` | USER | |
| 이미지 업로드 | POST | `/api/v1/community/posts/free/images` | USER | multipart |

### 댓글

| 기능 | Method | URL | 인증 | 비고 |
|---|---:|---|---|---|
| 목록 조회 | GET | `/api/v1/community/posts/{postType}/{postId}/comments` | 불필요 | query: `cursor`, `size` |
| 작성 | POST | `/api/v1/community/posts/{postType}/{postId}/comments` | USER | req: `CommentCreateRequest` |
| 수정 | PATCH | `/api/v1/community/posts/{postType}/{postId}/comments/{commentId}` | USER | req: `CommentUpdateRequest` |
| 삭제 | DELETE | `/api/v1/community/posts/{postType}/{postId}/comments/{commentId}` | USER | |
| 대댓글 더보기 | GET | `/api/v1/community/posts/{postType}/{postId}/comments/{commentId}/replies` | 불필요 | |

---

## 8. 채팅

### 채팅방

| 기능 | Method | URL | 인증 | 비고 |
|---|---:|---|---|---|
| 내 채팅방 목록 | GET | `/api/v1/chat/rooms` | USER | query: `cursor`, `size` |
| 채팅방 생성 | POST | `/api/v1/chat/rooms` | USER | req: `CreateChatRoomRequest` |
| 채팅방 상세 | GET | `/api/v1/chat/rooms/{roomId}` | USER | resp: `ChatRoomDetailResponse` |
| 채팅방 종료 | PATCH | `/api/v1/chat/rooms/{roomId}/close` | USER | 방장 권한 |
| 방장 위임 | PATCH | `/api/v1/chat/rooms/{roomId}/owner` | USER | req: `TransferOwnerRequest` |
| 참여자 목록 | GET | `/api/v1/chat/rooms/{roomId}/members` | USER | |
| 참여자 강퇴 | DELETE | `/api/v1/chat/rooms/{roomId}/members/{targetUserId}` | USER | 방장 권한 |
| 채팅방 퇴장 | DELETE | `/api/v1/chat/rooms/{roomId}/members/me` | USER | |
| 메시지 내역 조회 | GET | `/api/v1/chat/rooms/{roomId}/messages` | USER | query: `cursor`, `size` |
| 파일 업로드 | POST | `/api/v1/chat/rooms/{roomId}/files` | USER | multipart |

### 채팅 참여 신청

| 기능 | Method | URL | 인증 | 비고 |
|---|---:|---|---|---|
| 내 신청 목록 | GET | `/api/v1/chat/rooms/join-requests/me` | USER | query: `cursor`, `size` |
| 방장 신청 목록 | GET | `/api/v1/chat/rooms/{chatRoomId}/join-requests` | USER | 방장 권한 |
| 참여 신청 | POST | `/api/v1/chat/rooms/{chatRoomId}/join-requests` | USER | req: `CreateJoinRequestRequest` |
| 신청 수락 | POST | `/api/v1/chat/rooms/{chatRoomId}/join-requests/{requestId}/approve` | USER | 방장 권한 |
| 신청 거절 | POST | `/api/v1/chat/rooms/{chatRoomId}/join-requests/{requestId}/reject` | USER | 방장 권한 |
| 신청 취소 | DELETE | `/api/v1/chat/rooms/{chatRoomId}/join-requests/{requestId}` | USER | |

### 동행

| 기능 | Method | URL | 인증 | 비고 |
|---|---:|---|---|---|
| 동행 상세 조회 | GET | `/api/v1/chat/rooms/{roomId}/companion` | USER | |
| 동행 생성 | POST | `/api/v1/chat/rooms/{roomId}/companion` | USER | req: `CompanionCreateRequest` |
| 동행 취소 | DELETE | `/api/v1/chat/rooms/{roomId}/companion` | USER | |
| 참여자 추가 | POST | `/api/v1/chat/rooms/{roomId}/companion/participants` | USER | req: `CompanionAddParticipantsRequest` |
| 참여 종료 | PATCH | `/api/v1/chat/rooms/{roomId}/companion/participation/end` | USER | |

### 동행 리뷰

| 기능 | Method | URL | 인증 | 파라미터 |
|---|---:|---|---|---|
| 동행 리뷰 등록 | POST | `/api/v1/companion-reviews` | USER | req: `CompanionReviewCreateRequest` |
| 동행 점수 조회 | GET | `/api/v1/users/{userId}/companion-score` | 불필요 | |
| 동행 리뷰 목록 | GET | `/api/v1/users/{userId}/companion-reviews` | 불필요 | query: `cursor`, `size` |

---

## 9. 결제/엽전

### 엽전

| 기능 | Method | URL | 인증 | 비고 |
|---|---:|---|---|---|
| 잔액 조회 | GET | `/api/v1/yeopjeon/balance` | USER/MERCHANT | resp: `WalletBalanceResponse` |
| 사용 내역 조회 | GET | `/api/v1/yeopjeon/histories` | USER/MERCHANT | query: `cursor`, `size` |

### 결제 (USER)

| 기능 | Method | URL | 인증 | 비고 |
|---|---:|---|---|---|
| 엽전 충전 요청 | POST | `/api/v1/payments/charge` | USER | req: `ChargeRequest`; `Idempotency-Key` 헤더 필수 |
| 충전 주문 취소 | POST | `/api/v1/payments/{orderId}/cancel` | USER | |
| 결제 내역 조회 | GET | `/api/v1/payments/history` | USER | query: `cursor`, `size` |
| 환불 요청 생성 | POST | `/api/v1/payments/{orderId}/refund` | USER | req: `RefundRequest` |
| 환불 요청 취소 | PATCH | `/api/v1/payments/refund/{refundId}/cancel` | USER | |
| 내 환불 내역 | GET | `/api/v1/payments/refunds` | USER | query: `status`, `cursor`, `size` |
| PortOne 웹훅 | POST | `/api/v1/payments/webhook` | 불필요 | 서버→서버 |

### QR 결제

| 기능 | Method | URL | 인증 | 비고 |
|---|---:|---|---|---|
| QR 결제 요청 생성 | POST | `/api/v1/payments/qr` | USER | req: `QrPayCreateRequest` |
| QR 결제 상태 폴링 | GET | `/api/v1/payments/qr/{payRequestId}/status` | USER | resp: `QrPayStatusResponse` |
| QR 결제 요청 취소 | POST | `/api/v1/payments/qr/{payRequestId}/cancel` | USER | |
| QR 결제 승인 | PATCH | `/api/v1/payments/qr/{payRequestId}/confirm` | MERCHANT | req: `QrPayConfirmRequest` |

#### 충전 결제수단 (PaymentMethod enum)

| 화면 라벨 | 전송 값 |
|---|---|
| 카카오페이 | `KAKAO_PAY` |
| 토스페이 | `TOSS_PAY` |
| 신용카드 | `CARD` |
| 해외카드 | `FOREIGN_CARD` |

---

## 10. 가게 (공개)

| 기능 | Method | URL | 인증 | 비고 |
|---|---:|---|---|---|
| 가게 공개 정보 조회 | GET | `/api/v1/shops/{shopId}` | 불필요 | resp: `ShopInfoResponse` |
| 가게 공개 공지 목록 | GET | `/api/v1/shops/{shopId}/notices` | 불필요 | query: `cursor`, `size` |

---

## 11. 상인 (MERCHANT)

### 상인 신청

| 기능 | Method | URL | 인증 | 비고 |
|---|---:|---|---|---|
| 상인 등록 신청 | POST | `/api/v1/merchants/apply` | USER | req: `MerchantApplyRequest` |

### 상인 홈/가게

| 기능 | Method | URL | 인증 | 비고 |
|---|---:|---|---|---|
| 상인 홈 대시보드 | GET | `/api/v1/merchants/me/home` | MERCHANT | 오늘/어제 매출, 시간대별 분포 |
| 내 가게 목록 | GET | `/api/v1/merchants/me/shops` | MERCHANT | |
| 내 가게 단건 조회 | GET | `/api/v1/merchants/me/shops/{shopId}` | MERCHANT | |
| 내 가게 수정 | PATCH | `/api/v1/merchants/me/shops/{shopId}` | MERCHANT | req: `ShopUpdateRequest` |
| 내 가게 상태 전환 | PATCH | `/api/v1/merchants/me/shops/{shopId}/status` | MERCHANT | req: `MerchantShopStatusRequest` (ACTIVE/CLOSED) |

### 가게 이미지 (MERCHANT)

| 기능 | Method | URL | 인증 | 비고 |
|---|---:|---|---|---|
| 사진 목록 조회 | GET | `/api/v1/merchants/me/shops/{shopId}/images` | MERCHANT | |
| 사진 업로드 | POST | `/api/v1/merchants/me/shops/{shopId}/images` | MERCHANT | query: `type`; multipart |
| 사진 삭제 | DELETE | `/api/v1/merchants/me/shops/{shopId}/images/{imageId}` | MERCHANT | |

### 메뉴 (MERCHANT)

| 기능 | Method | URL | 인증 |
|---|---:|---|---|
| 메뉴 목록 조회 | GET | `/api/v1/merchants/me/shops/{shopId}/menus` | MERCHANT |
| 메뉴 등록 | POST | `/api/v1/merchants/me/shops/{shopId}/menus` | MERCHANT |
| 메뉴 수정 | PATCH | `/api/v1/merchants/me/shops/{shopId}/menus/{menuId}` | MERCHANT |
| 메뉴 삭제 | DELETE | `/api/v1/merchants/me/shops/{shopId}/menus/{menuId}` | MERCHANT |

### 가게 공지 (MERCHANT)

| 기능 | Method | URL | 인증 |
|---|---:|---|---|
| 공지 목록 조회 | GET | `/api/v1/merchants/me/shops/{shopId}/notices` | MERCHANT |
| 공지 등록 | POST | `/api/v1/merchants/me/shops/{shopId}/notices` | MERCHANT |
| 공지 삭제 | DELETE | `/api/v1/merchants/me/shops/{shopId}/notices/{noticeId}` | MERCHANT |

### QR 코드 (MERCHANT)

| 기능 | Method | URL | 인증 |
|---|---:|---|---|
| QR 코드 조회 | GET | `/api/v1/merchants/me/shops/{shopId}/qr` | MERCHANT |
| QR 재발급 | POST | `/api/v1/merchants/me/shops/{shopId}/qr/reissue` | MERCHANT |

### 정산 (MERCHANT)

| 기능 | Method | URL | 인증 | 비고 |
|---|---:|---|---|---|
| 정산 내역 조회 | GET | `/api/v1/merchants/me/shops/{shopId}/settlements` | MERCHANT | query: `cursor`, `size` |
| 정산 신청 | POST | `/api/v1/merchants/me/shops/{shopId}/settlements` | MERCHANT | |
| 정산 계좌 등록/변경 | PUT | `/api/v1/merchants/me/shops/{shopId}/account` | MERCHANT | req: `ShopAccountRequest` |
| 가게 수익 지갑 조회 | GET | `/api/v1/merchants/me/shops/{shopId}/wallet` | MERCHANT | resp: `ShopWalletResponse` |

### QR 결제 대기 (MERCHANT)

| 기능 | Method | URL | 인증 |
|---|---:|---|---|
| 대기중 QR 결제 목록 | GET | `/api/v1/merchants/me/qr-payments/pending` | MERCHANT |

### 스토어 아이템 사용 처리

| 기능 | Method | URL | 인증 | 비고 |
|---|---:|---|---|---|
| 아이템 QR 사용 처리 | POST | `/api/v1/merchants/me/shop/items/use` | MERCHANT | req: `UserItemUseRequest` |

### 광고 신청 (MERCHANT)

| 기능 | Method | URL | 인증 |
|---|---:|---|---|
| 광고 신청 | POST | `/api/v1/merchants/me/ads` | MERCHANT |
| 광고 연장 | POST | `/api/v1/merchants/me/ads/{adId}/extend` | MERCHANT |

---

## 12. 스토어

| 기능 | Method | URL | 인증 | 비고 |
|---|---:|---|---|---|
| 상품 목록 조회 | GET | `/api/v1/store/products` | 불필요 | query: `category`, `cursor`, `size` |
| 상품 상세 조회 | GET | `/api/v1/store/products/{productId}` | 불필요 | |
| 상품 구매 | POST | `/api/v1/store/orders` | USER | req: `StorePurchaseRequest` |
| 내 주문 내역 | GET | `/api/v1/store/orders` | USER | query: `cursor`, `size` |

---

## 13. 신고

| 기능 | Method | URL | 인증 | 비고 |
|---|---:|---|---|---|
| 신고 접수 | POST | `/api/v1/reports` | USER | req: `ReportCreateRequest` |
| 내 신고 내역 목록 | GET | `/api/v1/reports/me` | USER | query: `cursor`, `size` |
| 내 신고 단건 조회 | GET | `/api/v1/reports/{reportId}` | USER | |

---

## 14. 알림

| 기능 | Method | URL | 인증 | 비고 |
|---|---:|---|---|---|
| 알림 목록 조회 | GET | `/api/v1/notifications` | USER | query: `cursor`, `size` |
| 단건 읽음 처리 | PATCH | `/api/v1/notifications/{notificationId}/read` | USER | |
| 전체 읽음 처리 | PATCH | `/api/v1/notifications/read-all` | USER | |
| 알림 삭제 | DELETE | `/api/v1/notifications/{notificationId}` | USER | |

---

## 15. 고객센터 (Support)

| 기능 | Method | URL | 인증 | 비고 |
|---|---:|---|---|---|
| 상담방 생성 | POST | `/api/v1/support/rooms` | USER/MERCHANT | req: `SupportRoomCreateRequest` |
| 내 상담방 목록 | GET | `/api/v1/support/rooms/me` | USER/MERCHANT | query: `cursor`, `size`, `status` |
| 상담 메시지 조회 | GET | `/api/v1/support/rooms/{supportRoomId}/messages` | USER/MERCHANT | query: `cursor`, `size` |
| 상담 파일 업로드 | POST | `/api/v1/support/rooms/{supportRoomId}/files` | USER/MERCHANT | multipart |

---

## 16. FAQ

| 기능 | Method | URL | 인증 | 비고 |
|---|---:|---|---|---|
| FAQ 목록 조회 | GET | `/api/v1/faqs` | 불필요 | query: `cursor`, `size`, `category` |
| FAQ 번역 조회 | GET | `/api/v1/faqs/{faqId}/translation` | 불필요 | query: `targetLanguage` |

---

## 17. 번역

| 기능 | Method | URL | 인증 | 비고 |
|---|---:|---|---|---|
| 텍스트 번역 | POST | `/api/v1/translations` | USER | req: `TranslationRequest` |

---

## 18. 관리자 (ADMIN)

### 대시보드

| 기능 | Method | URL |
|---|---:|---|
| 대시보드 카운트 요약 | GET | `/api/v1/admin/dashboard` |

### 사용자 관리

| 기능 | Method | URL | 비고 |
|---|---:|---|---|
| 사용자 목록 조회 | GET | `/api/v1/admin/users` | query: `keyword`, `status`, `role`, `cursor`, `size` |
| 사용자 상세 조회 | GET | `/api/v1/admin/users/{userId}` | |
| 사용자 정지 | POST | `/api/v1/admin/users/{userId}/suspensions` | req: `UserSuspendRequest` |
| 사용자 정지 해제 | DELETE | `/api/v1/admin/users/{userId}/suspensions` | |
| 제재 이력 조회 | GET | `/api/v1/admin/users/{userId}/sanctions` | |
| 제재 조기 해제 | DELETE | `/api/v1/admin/users/{userId}/sanctions/{sanctionId}` | |

### 상인 신청

| 기능 | Method | URL | 비고 |
|---|---:|---|---|
| 상인 신청 목록 | GET | `/api/v1/admin/merchant-applications` | query: `cursor`, `size`, `status` |
| 상인 신청 상세 | GET | `/api/v1/admin/merchant-applications/{applicationId}` | |
| 상인 신청 승인 | PATCH | `/api/v1/admin/merchant-applications/{applicationId}/approve` | req: `AdminApproveRequest` |
| 상인 신청 거절 | PATCH | `/api/v1/admin/merchant-applications/{applicationId}/reject` | req: `MerchantApplicationRejectRequest` |

### 가게 관리

| 기능 | Method | URL | 비고 |
|---|---:|---|---|
| 가게 목록 조회 | GET | `/api/v1/admin/shops` | query: `keyword`, `status`, `cursor`, `size` |
| 가게 상세 조회 | GET | `/api/v1/admin/shops/{shopId}` | |
| 가게 정보 수정 | PATCH | `/api/v1/admin/shops/{shopId}` | req: `AdminShopUpdateRequest` |
| 가게 상태 변경 | PATCH | `/api/v1/admin/shops/{shopId}/status` | |
| 가게 장소 연결 | PATCH | `/api/v1/admin/shops/{shopId}/place` | |
| 가게 전통시장 연결 | PATCH | `/api/v1/admin/shops/{shopId}/market` | |

### 상인 인증 관리

| 기능 | Method | URL |
|---|---:|---|
| 인증 신청 목록 | GET | `/api/v1/admin/shop-certifications` |
| 인증 신청 상세 | GET | `/api/v1/admin/shop-certifications/{certificationId}` |
| 인증 승인 | PATCH | `/api/v1/admin/shop-certifications/{certificationId}/approve` |
| 인증 거절 | PATCH | `/api/v1/admin/shop-certifications/{certificationId}/reject` |
| 인증 취소 | PATCH | `/api/v1/admin/shop-certifications/{certificationId}/cancel` |

### 관광지 관리

| 기능 | Method | URL |
|---|---:|---|
| 관광지 목록 | GET | `/api/v1/admin/places` |
| 관광지 등록 | POST | `/api/v1/admin/places` |
| 관광지 수정 | PATCH | `/api/v1/admin/places/{placeId}` |
| 관광지 삭제 | DELETE | `/api/v1/admin/places/{placeId}` |
| 관광지 동기화 | POST | `/api/v1/admin/places/sync` |

### 전통시장 관리

| 기능 | Method | URL |
|---|---:|---|
| 전통시장 목록 | GET | `/api/v1/admin/traditional-markets` |
| 전통시장 상세 | GET | `/api/v1/admin/traditional-markets/{marketId}` |
| 전통시장 동기화 | POST | `/api/v1/admin/traditional-markets/sync` |

### 축제 관리

| 기능 | Method | URL |
|---|---:|---|
| 축제 목록 조회 | GET | `/api/v1/admin/festivals` |
| 축제 수동 등록 | POST | `/api/v1/admin/festivals` |
| 축제 수정 | PUT | `/api/v1/admin/festivals/{festivalId}` |
| 축제 삭제 | DELETE | `/api/v1/admin/festivals/{festivalId}` |
| 정부 API 즉시 수집 | POST | `/api/v1/admin/festivals/fetch` |

### 환불 관리

| 기능 | Method | URL |
|---|---:|---|
| 환불 목록 | GET | `/api/v1/admin/refunds` |
| 환불 승인 | PATCH | `/api/v1/admin/refunds/{refundId}/approve` |
| 환불 거절 | PATCH | `/api/v1/admin/refunds/{refundId}/reject` |

### 정산 관리

| 기능 | Method | URL |
|---|---:|---|
| 정산 목록 | GET | `/api/v1/admin/settlements` |
| 정산 승인 | PATCH | `/api/v1/admin/settlements/{settlementId}/approve` |
| 정산 거절 | PATCH | `/api/v1/admin/settlements/{settlementId}/reject` |

### 신고 관리

| 기능 | Method | URL |
|---|---:|---|
| 신고 목록 | GET | `/api/v1/admin/reports` |
| 신고 상세 | GET | `/api/v1/admin/reports/{reportId}` |
| 미처리 신고 건수 | GET | `/api/v1/admin/reports/pending-count` |
| 콘텐츠 신고 처리 | POST | `/api/v1/admin/reports/{reportId}/resolve` |
| 가게 신고 처리 | POST | `/api/v1/admin/reports/{reportId}/resolve/merchant` |
| 신고 상태 정정 | PATCH | `/api/v1/admin/reports/{reportId}/status` |

### 배너 관리

| 기능 | Method | URL |
|---|---:|---|
| 배너 목록 | GET | `/api/v1/admin/banners` |
| 배너 등록 | POST | `/api/v1/admin/banners` |
| 배너 수정 | PATCH | `/api/v1/admin/banners/{bannerId}` |
| 배너 삭제 | DELETE | `/api/v1/admin/banners/{bannerId}` |

### 상품 관리 (ADMIN)

| 기능 | Method | URL |
|---|---:|---|
| 상품 목록 (HIDDEN 포함) | GET | `/api/v1/admin/store/products` |
| 상품 등록 | POST | `/api/v1/admin/store/products` |
| 상품 수정 | PATCH | `/api/v1/admin/store/products/{productId}` |
| 상품 숨김 (soft delete) | DELETE | `/api/v1/admin/store/products/{productId}` |

### 광고 신청 관리

| 기능 | Method | URL |
|---|---:|---|
| 광고 신청 목록 | GET | `/api/v1/admin/ads` |
| 광고 신청 상세 | GET | `/api/v1/admin/ads/{adId}` |
| 광고 승인 | PATCH | `/api/v1/admin/ads/{adId}/approve` |
| 광고 거절 | PATCH | `/api/v1/admin/ads/{adId}/reject` |

### FAQ 관리

| 기능 | Method | URL |
|---|---:|---|
| FAQ 목록 | GET | `/api/v1/admin/faqs` |
| FAQ 등록 | POST | `/api/v1/admin/faqs` |
| FAQ 수정 | PATCH | `/api/v1/admin/faqs/{faqId}` |
| FAQ 삭제 | DELETE | `/api/v1/admin/faqs/{faqId}` |

### 고객센터 관리

| 기능 | Method | URL |
|---|---:|---|
| 전체 상담방 목록 | GET | `/api/v1/admin/support/rooms` |
| 상담 메시지 조회 | GET | `/api/v1/admin/support/rooms/{supportRoomId}/messages` |
| 상담방 배정 | POST | `/api/v1/admin/support/rooms/{supportRoomId}/assign` |
| 상담 종료 | POST | `/api/v1/admin/support/rooms/{supportRoomId}/close` |
| 파일 업로드 | POST | `/api/v1/admin/support/rooms/{supportRoomId}/files` |

---

## API 미완성 영역 처리 정책

- `VITE_STRICT_API=false` 환경에서는 mock fallback 허용.
- `VITE_STRICT_API=true` 환경에서는 API 실패가 에러 카드로 드러나야 함.
- API 명세에 없는 필드는 추측하지 않고 TODO 또는 백엔드 협의 항목으로 남김.
