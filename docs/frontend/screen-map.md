# 화면-API 매핑

`src/pages/` 디렉터리 구조 기준. API 경로는 `/api/v1` 접두사 생략.

## 인증

| 화면 | 파일 | 주요 API | 상태 |
|---|---|---|---|
| 일반 로그인 | `auth/LoginPage.jsx` | POST `/users/auth/login`, POST `/merchants/auth/login`, POST `/admin/auth/login` | 구현 가능 |
| 일반 회원가입 | `auth/SignupPage.jsx` | POST `/users/auth/signup` | 구현 가능 |
| 소셜 가입 (2단계) | `auth/OauthSignupPage.jsx` | POST `/users/auth/oauth/{provider}`, POST `/users/auth/oauth/signup` | 구현 가능 |
| 개인정보 처리방침 | `auth/PrivacyPolicyPage.jsx` | 없음 | 정적 화면 |

## 홈

| 화면 | 파일 | 주요 API | 상태 |
|---|---|---|---|
| 홈 (로그인) | `home/HomePage.jsx` | GET `/recommend/popular`, GET `/places/nearby`, GET `/search/suggest`, GET `/search/popular` | 구현 가능 |
| 홈 (비로그인) | `home/PublicHomePage.jsx` | GET `/recommend/popular`, GET `/search/popular` | 구현 가능 |

## 지도/장소

| 화면 | 파일 | 주요 API | 상태 |
|---|---|---|---|
| 지도 | `map/MapPage.jsx` | GET `/places/nearby`, GET `/places/map-markers`, GET `/traditional-markets/nearby`, GET `/places/region` | 구현 가능 |
| 장소 상세 | `map/PlaceDetailPage.jsx` | GET `/places/{placeId}`, POST/DELETE `/places/{placeId}/like`, GET `/places/{placeId}/nearby-shops`, GET `/places/{placeId}/nearby-places`, GET `/places/{placeId}/recommend`, GET `/places/{placeId}/reviews`, POST `/places/{placeId}/reviews` | 구현 가능 |
| 길찾기 | `map/DirectionPage.jsx` | GET `/directions` | 구현 가능 |

## 검색 / 기타

| 화면 | 파일 | 주요 API | 상태 |
|---|---|---|---|
| 검색 / 자동완성 | `misc/MiscPages.jsx` | GET `/search`, GET `/search/suggest`, GET `/search/popular`, GET `/search/recent`, DELETE `/search/recent`, GET `/search/places`, GET `/api/v2/search/festivals` | 구현 가능 |
| 알림 | `misc/MiscPages.jsx` | GET `/notifications`, PATCH `/notifications/{id}/read`, PATCH `/notifications/read-all`, DELETE `/notifications/{id}` | 구현 가능 |

## 축제

| 화면 | 파일 | 주요 API | 상태 |
|---|---|---|---|
| 축제 캘린더 | `festival/FestivalCalendarPage.jsx` | GET `/calendar`, GET `/calendar/daily`, GET `/api/v2/search/festivals` | 구현 가능 |
| 축제 상세 | `festival/FestivalDetailPage.jsx` | GET `/festivals/{festivalId}`, POST/DELETE `/festivals/{festivalId}/like` | 구현 가능 |

## 커뮤니티

| 화면 | 파일 | 주요 API | 상태 |
|---|---|---|---|
| 동행·자유 게시판 | `community/CommunityPages.jsx` | GET/POST `/community/posts/companions`, GET/PUT/DELETE `/community/posts/companions/{postId}`, GET/POST `/community/posts/free`, GET/PATCH/DELETE `/community/posts/free/{postId}`, POST `/community/posts/free/images`, GET/POST/PATCH/DELETE `/community/posts/{postType}/{postId}/comments`, GET `…/comments/{commentId}/replies` | 구현 가능 |

## 채팅

| 화면 | 파일 | 주요 API | 상태 |
|---|---|---|---|
| 채팅방 목록·상세·메시지 | `chat/ChatPage.jsx` | GET/POST `/chat/rooms`, GET `/chat/rooms/{roomId}`, GET `/chat/rooms/{roomId}/messages`, POST `/chat/rooms/{roomId}/files`, PATCH `/chat/rooms/{roomId}/close`, PATCH `/chat/rooms/{roomId}/owner`, GET/DELETE `/chat/rooms/{roomId}/members`, DELETE `…/members/{targetUserId}`, DELETE `…/members/me`, GET/POST/DELETE/PATCH `/chat/rooms/{roomId}/companion` | 구현 가능 |
| 채팅 참여 신청 | `chat/ChatRequestPage.jsx` | GET `/chat/rooms/join-requests/me`, GET/POST `/chat/rooms/{chatRoomId}/join-requests`, POST `…/{requestId}/approve`, POST `…/{requestId}/reject`, DELETE `…/{requestId}` | 구현 가능 |

## 결제/엽전

| 화면 | 파일 | 주요 API | 상태 |
|---|---|---|---|
| 결제·충전·환불 | `payment/PaymentPages.jsx` | GET `/yeopjeon/balance`, GET `/yeopjeon/histories`, POST `/payments/charge`, GET `/payments/history`, POST `/payments/{orderId}/refund`, PATCH `/payments/refund/{refundId}/cancel`, GET `/payments/refunds` | 구현 가능 |
| QR 결제 (USER) | `payment/QRPayPage.jsx` | POST `/payments/qr`, GET `/payments/qr/{payRequestId}/status`, POST `/payments/qr/{payRequestId}/cancel` | 구현 가능 |

## 스토어

| 화면 | 파일 | 주요 API | 상태 |
|---|---|---|---|
| 스토어 상품·주문·보유 아이템 | `store/StorePages.jsx` | GET `/store/products`, GET `/store/products/{productId}`, POST `/store/orders`, GET `/store/orders`, GET `/users/me/items`, GET `/users/me/items/{itemId}/qr` | 구현 가능 |

## 상인

| 화면 | 파일 | 주요 API | 상태 |
|---|---|---|---|
| 상인 신청 | `merchant/MerchantApplyPage.jsx` | POST `/merchants/apply` | 구현 가능 |
| 상인 홈·가게·메뉴·정산·QR | `merchant/MerchantPages.jsx` | GET `/merchants/me/home`, GET/PATCH `/merchants/me/shops/{shopId}`, PATCH `…/status`, GET/POST/DELETE `/merchants/me/shops/{shopId}/menus`, PATCH `…/menus/{menuId}`, GET/POST/DELETE `/merchants/me/shops/{shopId}/images`, GET/POST/DELETE `/merchants/me/shops/{shopId}/notices`, GET/POST `/merchants/me/shops/{shopId}/settlements`, PUT `/merchants/me/shops/{shopId}/account`, GET `/merchants/me/shops/{shopId}/wallet`, GET `/merchants/me/shops/{shopId}/qr`, POST `…/qr/reissue`, GET `/merchants/me/qr-payments/pending`, PATCH `/payments/qr/{payRequestId}/confirm`, POST `/merchants/me/shop/items/use` | 구현 가능 |

## 마이페이지

| 화면 | 파일 | 주요 API | 상태 |
|---|---|---|---|
| 마이페이지 하위 | `my/MySubPages.jsx` | GET `/users/me`, PATCH `/users/me`, DELETE `/users/me`, GET `/users/me/home`, GET `/users/me/likes`, GET `/users/me/reviews`, POST `/users/me/profile-image`, GET `/companion-reviews`, GET `/users/{userId}/companion-score`, GET `/users/{userId}/companion-reviews`, POST `/companion-reviews` | 구현 가능 |

## 관리자

| 화면 | 파일 | 주요 API | 상태 |
|---|---|---|---|
| 관리자 전체 | `admin/AdminPages.jsx` | GET `/admin/dashboard`, GET/POST/PATCH/DELETE `/admin/users/{userId}`, GET/PATCH `/admin/merchant-applications`, GET/PATCH `/admin/shops`, GET/PATCH `/admin/shop-certifications`, GET/PATCH `/admin/refunds`, GET/PATCH `/admin/settlements`, GET/POST `/admin/reports`, GET/PATCH `/admin/banners`, GET/POST/PATCH/DELETE `/admin/places`, GET/POST `/admin/traditional-markets`, GET/POST/PUT/DELETE `/admin/festivals`, GET/POST/PATCH/DELETE `/admin/faqs`, GET/POST/PATCH/DELETE `/admin/store/products`, GET/PATCH `/admin/ads`, GET/POST `/admin/support/rooms` | 구현 가능 |

## 고객센터

| 화면 | 파일 | 주요 API | 상태 |
|---|---|---|---|
| 고객센터 상담 | `support/SupportPage.jsx` | POST `/support/rooms`, GET `/support/rooms/me`, GET `/support/rooms/{supportRoomId}/messages`, POST `/support/rooms/{supportRoomId}/files`, GET `/faqs`, GET `/faqs/{faqId}/translation` | 구현 가능 |
