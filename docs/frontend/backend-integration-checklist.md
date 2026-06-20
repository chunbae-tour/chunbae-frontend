# 백엔드 연결 테스트 체크리스트

백엔드와 붙여서 프론트를 테스트할 때 막히는 지점을 빠르게 찾기 위한 문서입니다.

실제 화면 클릭 순서는 `docs/frontend/manual-backend-test-scenarios.md`를 함께 봅니다.
로컬 PC와 실제 휴대폰 접속 방법은 `docs/frontend/local-mobile-test-guide.md`를 먼저 확인합니다.

## 1. 실행 전 확인

- 프론트 `.env` 파일은 사용자가 사이트에 접속할 때 직접 읽는 파일이 아닙니다. Vite가 개발 서버 실행 또는 빌드 시 읽어서 프론트 코드에 반영하는 설정 파일입니다.
- 로컬 팀원은 각자 `.env` 또는 `.env.ec2`를 만들고, Vercel 배포는 Vercel 대시보드 Environment Variables에 같은 값을 등록합니다.
- 로컬 백엔드는 `.env`에 `VITE_API_BASE_URL=http://localhost:8080` 형태로 백엔드 주소를 넣습니다.
- EC2 백엔드는 `.env.ec2.example`을 `.env.ec2`로 복사한 뒤 `VITE_API_BASE_URL`에 EC2 백엔드 origin을 넣습니다.
- 춘배투어 EC2 API origin은 `https://api.chunbae-tour.site`입니다.
- `VITE_API_BASE_URL`에는 `/api/v1`을 붙이지 않습니다. 프론트 공통 클라이언트가 자동으로 붙입니다.
- 백엔드만으로 검증하고 싶을 때는 `.env`에 `VITE_STRICT_API=true`를 넣으면 API 실패 시 mock fallback을 막을 수 있습니다.
- EC2 백엔드로 개발 서버를 띄울 때는 `corepack pnpm dev:ec2`를 사용합니다.
- EC2 백엔드로 빌드할 때는 `corepack pnpm build:ec2`를 사용합니다.
- 휴대폰에서 확인할 때는 `corepack pnpm dev -- --host 0.0.0.0`로 실행하고 `http://<PC IPv4>:5173`로 접속합니다.
- 로그인 테스트 전 브라우저 `sessionStorage`의 기존 mock 토큰을 지우면 실제 인증 흐름 확인이 쉽습니다.
- 백엔드 CORS는 프론트 개발 서버 주소인 `http://localhost:5173`을 허용해야 합니다.
- EC2 연동 시 백엔드 CORS는 현재 프론트 origin을 허용해야 합니다. 배포 origin은 `https://chunbae-tour.site`, `https://www.chunbae-tour.site`입니다.
- Vercel 배포 환경변수에는 `VITE_API_BASE_URL=https://api.chunbae-tour.site`와 `VITE_STRICT_API=true`를 등록합니다.
- USER 실제 토큰이 저장된 상태로 새로고침하면 `/api/v1/users/me`로 세션을 재검증합니다.

## 2. 우선 테스트 순서

1. USER 로그인 후 홈 진입
2. 새로고침 후 USER 세션이 홈으로 복구되는지 확인
3. MERCHANT/ADMIN 로그인 후 새로고침 시 각 권한 화면으로 복구되는지 확인
4. 장소 목록/상세 조회
5. 엽전 잔액 조회
6. 결제내역 조회
7. 결제내역에서 상점 상세 진입
8. 상점 리뷰 작성
9. 커뮤니티 동행 게시글 상세에서 작성자 계정으로 채팅방 생성
10. 커뮤니티 목록/상세/댓글
11. 채팅방 목록/메시지
12. 알림 목록/전체 읽음

## 2-1. strict mode 화면 상태 확인

`VITE_STRICT_API=true`에서는 API 실패가 mock 데이터로 덮이지 않아야 합니다. 아래 화면에서 공통 에러 카드와 재시도 버튼이 보이면 정상입니다.

| 화면 | 실패 시 확인할 UI |
|---|---|
| 지도/장소 목록 | 주변 장소 API 오류 안내, 기본 위치 재조회 |
| 검색 | 검색 결과 API 오류 안내, 다시 검색 |
| 축제 목록/캘린더 | 축제 API 오류 안내, 다시 시도 |
| 결제내역 | 결제내역 API 오류 안내, 다시 시도 |
| 스토어 목록 | 상품 API 오류 안내, 다시 시도 |
| 상점 상세 | 상점 상세 API 오류 안내 |
| 커뮤니티 목록 | 게시글 API 오류 안내, 다시 시도 |
| 채팅방 목록 | 채팅방 API 오류 안내, 다시 시도 |
| 참여 신청 목록 | 참여 신청 API 오류 안내, 다시 시도 |
| 알림/마이페이지 | 알림, 찜, 리뷰, 보유 아이템 API 오류 안내, 다시 시도 |
| 상인 화면 | 결제 요청, 메뉴, 정산 목록 로딩/빈 상태 카드 |
| 관리자 화면 | 유저, 신고, 콘텐츠, 상인 신청 목록 로딩/빈 상태 카드 |

데이터가 정상 응답이지만 빈 배열이면 에러가 아니라 빈 상태 카드가 보여야 합니다.

## 2-2. 화면 가독성/접근성 확인

- 화면에 직접 노출되는 텍스트는 14px 이상으로 확인합니다.
- 모바일 하단 탭바는 실제 `button`으로 동작하며 포커스 링이 보여야 합니다.
- 단독 아이콘 버튼은 `aria-label` 또는 화면 텍스트가 있는지 확인합니다.

## 3. 현재 API 연결 현황

| 도메인 | 프론트 서비스 | 현재 연결 경로 | mock 유지 여부 | 협의 필요 |
|---|---|---|---|---|
| 로그인 | `authService.js` | `/users/auth/login`, `/merchants/auth/login`, `/admin/auth/login` | 실패 시 테스트 계정 fallback | 로그인 응답의 `accessToken`, `role`, `nickname` |
| 회원가입 | `authService.js` | `/users/auth/signup` 후 자동 로그인 | 실패 시 mock 가입 fallback | 회원가입 후 자동 로그인 정책 유지 여부 |
| 장소 | `placeService.js` | `/places/nearby`, `/places/{placeId}` | 실패 시 화면별 mock fallback | 주변 장소 응답 pagination 필드 |
| 장소 리뷰 | `placeService.js` | `/places/{placeId}/reviews` | mock 리뷰 유지 | 리뷰 작성 API 명세 |
| 주변 상점 | `placeService.js` | `/places/{placeId}/nearby-shops` | mock 상점 유지 | 실제 endpoint 확정 필요 |
| 검색 | `searchService.js` | `/search/places`, `/search/suggest`, `/search/popular` | mock 검색 유지 | 검색 Controller/필터/정렬 |
| 엽전 | `paymentService.js` | `/yeopjeon/balance`, `/yeopjeon/histories`, `/payments/charge` | mock 잔액/내역 유지 | PG redirect 응답 |
| 결제내역 | `paymentService.js` | `/yeopjeon/histories` | mock 결제내역 유지 | 상점 리뷰 가능 필드 |
| QR 결제 | `paymentService.js` | `/yeopjeon/qr/shops/{shopId}`, `/yeopjeon/qr/pay` | mock QR 상점 유지 | QR 검증/상인 확인/알림 플로우 |
| 상점 상세 | `shopService.js` | `/shops/{shopId}` | mock 상점 유지 | 상점 상세/메뉴/인증 상태 응답 |
| 상점 리뷰 | `shopService.js` | `/shops/{shopId}/reviews` | mock 리뷰 유지 | `paymentHistoryId` 기반 작성 권한 |
| 광고 | `promotionService.js` | `/promotions/certified-stores` 후보 | mock 광고 유지 | 춘배인증 광고 목록/노출 순서/과금 정책 |
| 커뮤니티 | `communityService.js` | `/community/posts/companions`, `/community/posts/free`, `/community/posts/{postType}/{postId}/comments` | 실패 시 mock 유지 | 상세 화면 API 직접 조회 적용 여부 |
| 채팅 | `chatService.js` | `/chat/rooms` 계열 | mock 채팅 유지 | 메시지, 파일 첨부, 신고 사유 enum |
| 축제 | `festivalService.js` | `/festivals` 후보, 백엔드 구현은 `/search/festivals` | mock 축제 유지 | 전용 축제 API를 만들지 검색 API를 재사용할지 |
| 알림 | `notificationService.js` | `/notifications`, `/notifications/read-all`, `/users/me/notification-settings` | mock 알림/설정 유지 | 전체 삭제/알림 설정 최종 경로 |
| 마이 | `myService.js` | `/users/me/likes`, `/users/me/reviews`, `/users/me/items` | mock 찜/리뷰/보유 아이템 유지 | 보유 아이템 API 최종 경로 |
| 스토어 | `storeService.js` | `/store/products` | mock 상품 유지 | 보유 아이템/구매내역 응답 |

## 4. 백엔드 응답에서 프론트가 바로 쓰는 주요 필드

### 인증
- `accessToken`
- `role`
- `userId`
- `nickname`
- `email`

### 장소
- `placeId`
- `name`
- `description`
- `address`
- `latitude`
- `longitude`
- `operatingHours`
- `reviewCount`
- `imageUrls`
- `isLiked`

### 결제내역
- `historyId`
- `paymentHistoryId`
- `type`
- `historyType`
- `transactionType`
- `description`
- `amount`
- `coinAmount`
- `yeopjeonAmount`
- `createdAt`
- `paidAt`
- `shopId`
- `storeId`
- `shopName`
- `storeName`
- `placeId`
- `placeName`
- `marketName`
- `paidAmount`
- `paymentAmount`
- `reviewWritable`
- `canWriteReview`
- `reviewId`

결제 타입은 `결제`, `PAYMENT`, `PAY`, `USE`, `QR_PAYMENT`를 결제내역으로 처리합니다. 충전/적립/환불 코드값은 화면 라벨로 변환합니다.

### 충전 결제수단
현재 프론트는 화면 라벨을 아래 코드값으로 변환해 `/payments/charge`에 전송합니다.

| 화면 라벨 | 전송 값 | 비고 |
|---|---|---|
| 카카오페이 | `KAKAO_PAY` | 국내 간편결제 |
| 토스페이 | `TOSS_PAY` | 국내 간편결제 |
| 신용카드 | `CARD` | 국내 카드 |
| 해외카드 | `FOREIGN_CARD` | 외국인 관광객 카드 결제 |

### 상점
- `shopId`
- `shopName`
- `marketName`
- `description`
- `menu`
- `benefit`
- `isCertified`
- `acceptsYeopjeon`
- `imageUrl`

### 춘배인증 광고
현재 프론트는 홈 메인 광고 영역에서 아래 후보 경로를 호출합니다. endpoint와 응답 필드 확정이 필요합니다.

- `GET /promotions/certified-stores?status=ACTIVE&size=5`
- 후보 필드: `promotionId`, `shopId`, `shopName`, `marketName`, `headline`, `description`, `benefit`, `imageUrl`, `displayOrder`, `startAt`, `endAt`, `status`
- 광고 클릭 대상은 상점 상세입니다. `targetType`은 MVP에서는 `SHOP` 기준으로 봅니다.

### 채팅방
- `chatRoomId`
- `title`
- `currentMembers`
- `maxMembers`
- `lastMessage`
- `unreadCount`
- `tags`

### 채팅 메시지
현재 프론트는 아래 후보 경로를 기준으로 API 연결 자리를 준비했습니다. 백엔드 최종 명세 확정이 필요합니다.

| 기능 | 후보 경로 | 요청/응답에서 필요한 값 |
|---|---|---|
| 메시지 목록 | `GET /chat/rooms/{chatRoomId}/messages` | `messageId`, `senderId`, `senderNickname`, `content`, `sentAt`, `isMine`, `isRead` |
| 메시지 전송 | `POST /chat/rooms/{chatRoomId}/messages` | request: `content`, `attachmentIds`; response: 메시지 단건 |
| 채팅 첨부 업로드 | `POST /files/chat-attachments` | multipart: `file`, `chatRoomId`, `type`; response: `attachmentId/fileId`, `url`, `originalName` |
| 읽음 처리 | 미확인 | 성공 여부 |
| 채팅방 나가기 | `DELETE /chat/rooms/{chatRoomId}/members/me` | 성공 여부 |
| 채팅방 신고 | `POST /chat/rooms/{chatRoomId}/reports` | request: `reason` |
| 메시지 신고 | `POST /chat/rooms/{chatRoomId}/messages/{messageId}/reports` | request: `reason` |
| 사용자 신고 | `POST /users/{userId}/reports` | request: `reason` |
| 참여자 목록 | `GET /chat/rooms/{chatRoomId}` | `members`, `myMemberState` |
| 참여자 내보내기 | `DELETE /chat/rooms/{chatRoomId}/members/{userId}` | 방장 권한, 대상 `userId` |
| 참여 신청 목록 | `GET /chat/rooms/{chatRoomId}/join-requests` | `joinRequestId`, `nickname`, `message`, `companionScore`, `companionReviewCount` |
| 참여 신청 수락 | `POST /chat/rooms/{chatRoomId}/join-requests/{joinRequestId}/approve` | 방장 권한, 성공 여부 |
| 참여 신청 거절 | `POST /chat/rooms/{chatRoomId}/join-requests/{joinRequestId}/reject` | request: `reason`; 방장 권한 |

### 보유 아이템
- `ownedItemId`
- `itemId`
- `name`
- `shopName`
- `marketName`
- `expiresAt`
- `status`

## 5. 테스트 중 자주 볼 수 있는 문제

| 증상 | 먼저 확인할 것 |
|---|---|
| 모든 API가 404 | `.env`의 `VITE_API_BASE_URL`에 `/api/v1`이 중복으로 붙었는지 확인 |
| 인증 API만 실패 | 역할별 endpoint가 백엔드와 일치하는지 확인 |
| 인증 필요한 API가 mock으로만 보임 | `sessionStorage`에 `userAccessToken`이 저장됐는지 확인 |
| API 실패가 mock으로 덮임 | `.env`의 `VITE_STRICT_API=true` 설정 후 재실행 |
| 새로고침 후 로그인 상태가 풀림 | `sessionStorage`에 `{role}AccessToken`과 `{role}Profile`이 함께 저장됐는지 확인 |
| 새로고침 직후 로그인 화면으로 이동 | `/api/v1/users/me`가 401을 반환했는지 확인 |
| CORS 에러 | 백엔드 CORS 허용 origin에 `http://localhost:5173` 추가 |
| 결제내역에서 리뷰 버튼이 이상함 | 결제내역 응답에 `shopId/storeId`, `reviewWritable/canWriteReview`, `paymentHistoryId/historyId` 확인 |
| 채팅방 목록이 비어 있음 | `/api/v1/chat/rooms` 경로와 인증 토큰 확인 |
| 동행 게시글에서 채팅방 생성 실패 | `postId`, `title`, `description`, `maxMembers` 요청 body와 작성자 권한 확인 |
| 메시지 전송 버튼이 mock으로만 동작 | `/api/v1/chat/rooms/{chatRoomId}/messages` endpoint와 요청 body 확인 |
| 사진/파일 첨부 후 전송 실패 | `/api/v1/files/chat-attachments` multipart endpoint와 업로드 응답의 attachment id 확인 |
| 채팅방 나가기/신고가 실패 | 나가기/신고 endpoint와 신고 `reason` enum 확인 |
| 참여자 내보내기가 비활성/실패 | 참여자 목록 응답의 `userId`, `role`, 방장 권한 필드 확인 |
| 참여 신청 수락/거절이 실패 | 신청 목록 endpoint, `joinRequestId`, 방장 권한, 거절 `reason` enum 확인 |
| strict mode에서 빈 카드가 아니라 mock 데이터가 보임 | `shouldUseMockFallback` 분기와 dev 서버 재시작 여부 확인 |
| 데이터가 빈 배열인데 에러 카드가 보임 | 백엔드 응답 HTTP status와 `success` 값 확인 |

## 5-1. 프론트 공통 API 에러 코드 기준

`apiClient.js`는 백엔드 연결 테스트 중 원인을 빨리 찾을 수 있도록 다음 정보를 `ApiClientError`에 남깁니다.

| code/status | 의미 | 확인할 것 |
|---|---|---|
| `NETWORK_ERROR` | fetch 자체가 실패 | 백엔드 서버 실행 여부, CORS, `VITE_API_BASE_URL` |
| `INVALID_JSON` | 응답이 JSON이 아님 | 백엔드 공통 응답 포맷, HTML 에러 페이지 반환 여부 |
| `401` 또는 `AUTH_*` | 인증 실패 | `sessionStorage` 토큰, 로그인 응답, Authorization 헤더 |
| `403` | 권한 불일치 | USER/MERCHANT/ADMIN 역할과 endpoint 권한 |
| `404` | endpoint 불일치 | 프론트 서비스 경로와 백엔드 Controller 경로 |
| `429` | Rate Limit | `Retry-After` 헤더와 재시도 정책 |
| `500+` | 서버 오류 | 백엔드 서버 로그 |

화면에서 상세 메시지가 필요하면 `getApiErrorHint(error)`를 사용하면 됩니다.

## 6. 아직 mock으로 유지하는 영역

- 광고/이벤트 배너
- QR 결제의 실제 상인 확인/승인/알림
- 상점 메뉴 상세
- 보유 아이템
- 알림 설정
- 참여자 선택 기반 내보내기
- 채팅 메시지/첨부/신고

## 7. 백엔드와 우선 협의할 질문

- 결제내역 응답에 `reviewWritable`, `reviewId`, `shopId`, `paidAmount`를 포함할지
- 상점 상세 API와 장소 상세 API의 경계를 어떻게 둘지
- 춘배인증 광고 API의 노출 단위가 상점인지, 배너인지, 이벤트인지
- 채팅 메시지 전송/읽음/첨부/신고 endpoint
- 축제 화면은 `/search/festivals`를 재사용할지 `/festivals` 전용 API를 만들지
- 알림 전체 삭제와 알림 설정 endpoint
- MERCHANT/ADMIN 세션 재검증용 내 정보 endpoint
- 보유 아이템 목록/사용 처리 endpoint
- 알림 전체 삭제 endpoint와 알림 설정 카테고리 enum
