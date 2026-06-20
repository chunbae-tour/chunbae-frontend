# 백엔드 연결 수동 테스트 시나리오

프론트와 백엔드를 함께 실행한 뒤, 아래 순서대로 확인합니다.

## 0. 실행 준비

1. `.env`에 `VITE_API_BASE_URL=http://localhost:8080`을 설정합니다.
2. API 실패를 mock으로 숨기지 않고 확인하려면 `VITE_STRICT_API=true`를 설정합니다.
3. 프론트 dev 서버를 재시작합니다.
4. 브라우저 `sessionStorage`를 비운 뒤 시작합니다.
5. 실제 휴대폰에서 확인하려면 `corepack pnpm dev -- --host 0.0.0.0`로 실행하고 `http://<PC IPv4>:5173`에 접속합니다.

참고:
- 로컬/모바일 접속 방법은 `docs/frontend/local-mobile-test-guide.md`를 기준으로 확인합니다.
- `VITE_STRICT_API` 값을 바꾸면 dev 서버를 반드시 재시작합니다.
- PC와 휴대폰 화면이 다르게 보이는 것은 PWA 설치 때문이 아니라 반응형 CSS 때문입니다.

## 1. 인증

### USER 로그인
- 일반 탭 선택
- USER 계정으로 로그인
- `sessionStorage.userAccessToken` 저장 확인
- 새로고침 후 홈으로 복구되는지 확인
- `/api/v1/users/me` 호출이 성공하는지 확인

### MERCHANT 로그인
- 상인 탭 선택
- 상인 계정으로 로그인
- `sessionStorage.merchantAccessToken` 저장 확인
- 새로고침 후 상인 화면으로 복구되는지 확인

### ADMIN 로그인
- 관리자 탭 선택
- 관리자 계정으로 로그인
- `sessionStorage.adminAccessToken` 저장 확인
- 새로고침 후 관리자 대시보드로 복구되는지 확인

## 2. 홈/검색/장소

1. 홈 진입
2. 메인 춘배인증 광고가 노출되는지 확인
3. 광고 클릭 시 상점 상세로 이동하는지 확인
4. 검색바에서 `광장` 입력
5. 광장시장만 검색되는지 확인
6. 추천 장소 카드 클릭
7. 장소 상세 진입
8. 주변 상점 카드 클릭
9. 상점 상세 진입

확인 API:
- `GET /api/v1/promotions/certified-stores`
- `GET /api/v1/search/places`
- `GET /api/v1/places/nearby`
- `GET /api/v1/places/{placeId}`
- `GET /api/v1/places/{placeId}/nearby-shops`

## 3. 엽전/충전/결제내역

1. 마이페이지 진입
2. 엽전 잔액 조회 확인
3. 충전 화면 진입
4. 5,000원 선택
5. 해외카드 선택
6. 요청 body의 `paymentMethod`가 `FOREIGN_CARD`인지 확인
7. 결제내역 진입
8. 결제한 상점 클릭
9. 상점 상세에서 리뷰 작성

확인 API:
- `GET /api/v1/yeopjeon/balance`
- `POST /api/v1/payments/charge`
- `GET /api/v1/yeopjeon/histories`
- `GET /api/v1/shops/{shopId}`
- `POST /api/v1/shops/{shopId}/reviews`

## 4. QR 결제

1. QR 결제 화면 진입
2. 테스트 QR 스캔 버튼 클릭
3. 가게 정보 확인
4. 메뉴 선택 또는 금액 입력
5. 결제 요청
6. 상인 승인 대기 상태 표시 확인

확인 API:
- `GET /api/v1/yeopjeon/qr/shops/{shopId}`
- `POST /api/v1/yeopjeon/qr/pay`

TODO:
- 실제 QR 검증
- 상인 승인/거절
- 결제 완료 알림

## 5. 커뮤니티/채팅

1. 커뮤니티 진입
2. 동행 게시판 선택
3. 내가 작성한 동행 게시글 상세 진입
4. 채팅방 생성 클릭
5. 채팅방으로 이동 확인
6. 채팅방 목록에서 방이 보이는지 확인
7. 메시지 목록 로드 확인
8. 메시지 입력 후 전송 확인
9. `+` 버튼에서 사진 또는 파일 선택 후 전송 확인
10. 참여자 버튼 클릭 후 참여자 목록 로드 확인
11. 신청 관리 클릭 후 참여 신청 목록 로드 확인
12. 참여 신청 수락 클릭 시 API 호출 확인
13. 참여 신청 거절 클릭 시 확인 다이얼로그가 먼저 뜨고, `신청 거절` 클릭 후 API 호출 확인
14. 참여자 신고/내보내기 버튼 클릭 시 확인 또는 API 호출 확인
15. 참여자 내보내기는 확인 다이얼로그가 먼저 뜨고, `내보내기` 클릭 후 API 호출 확인
16. 채팅방 신고/메시지 신고 버튼 클릭 시 API 호출 확인
17. 채팅방 나가기 클릭 시 확인 다이얼로그가 먼저 뜨고, `채팅방 나가기` 클릭 후 목록으로 복귀 확인

확인 API:
- `GET /api/v1/community/posts/companions`
- `GET /api/v1/community/posts/free`
- `GET /api/v1/community/posts/{postType}/{postId}/comments`
- `POST /api/v1/community/posts/{postType}/{postId}/comments`
- `POST /api/v1/chat/rooms`
- `GET /api/v1/chat/rooms`
- `GET /api/v1/chat/rooms/{chatRoomId}`
- `GET /api/v1/chat/rooms/{chatRoomId}/messages`
- `POST /api/v1/files/chat-attachments`
- `POST /api/v1/chat/rooms/{chatRoomId}/messages`
- `PATCH /api/v1/chat/rooms/{chatRoomId}/read`
- `POST /api/v1/chat/rooms/{chatRoomId}/reports`
- `POST /api/v1/chat/rooms/{chatRoomId}/messages/{messageId}/reports`
- `DELETE /api/v1/chat/rooms/{chatRoomId}/members/{userId}`
- `POST /api/v1/users/{userId}/reports`
- `GET /api/v1/chat/rooms/{chatRoomId}/join-requests`
- `POST /api/v1/chat/rooms/{chatRoomId}/join-requests/{joinRequestId}/approve`
- `POST /api/v1/chat/rooms/{chatRoomId}/join-requests/{joinRequestId}/reject`
- `DELETE /api/v1/chat/rooms/{chatRoomId}/members/me`

TODO:
- WebSocket/STOMP 실시간 수신
- 메시지 목록/전송 REST 또는 WebSocket endpoint
- 신고 사유 enum
- 참여 신청 거절 사유 enum
- 첨부파일 최대 용량/허용 확장자/보관 정책

## 6. 알림

1. 알림 화면 진입
2. 알림 목록 조회 확인
3. 전체 읽음 클릭
4. 전체 삭제 클릭 시 확인 다이얼로그가 먼저 뜨는지 확인
5. `전체 삭제` 클릭 후 알림 목록이 비워지는지 확인
6. 알림 설정 화면 진입
7. 광고/게시물/채팅/결제 알림 토글 저장 확인

확인 API:
- `GET /api/v1/notifications`
- `PATCH /api/v1/notifications/read-all`
- `DELETE /api/v1/notifications`
- `GET /api/v1/users/me/notification-settings`
- `PUT /api/v1/users/me/notification-settings`

## 7. 마이페이지

1. 찜 목록 진입
2. 찜 삭제 클릭
3. 내 리뷰 진입
4. 보유 아이템 진입

확인 API:
- `GET /api/v1/users/me/likes`
- `DELETE /api/v1/places/{placeId}/like`
- `GET /api/v1/users/me/reviews`
- `GET /api/v1/users/me/items`

## 8. 실패 상황 테스트

### 백엔드 서버 종료
- `NETWORK_ERROR` 안내가 보이는지 확인
- 화면에 재시도 버튼이 있는 경우 다시 시도 시 동일 오류가 유지되는지 확인

### 토큰 삭제
- 인증 필요 화면에서 로그인 필요 메시지 또는 로그인 이동 확인

### 잘못된 API 경로
- `404` 안내가 보이는지 확인

### HTML 에러 페이지 반환
- `INVALID_JSON` 안내가 보이는지 확인

### 빈 배열 응답
- 목록 화면에서 에러가 아니라 빈 상태 카드가 보이는지 확인
- 빈 상태 카드가 있는 화면: 검색, 지도, 축제, 결제내역, 커뮤니티, 채팅방, 알림, 찜, 리뷰, 보유 아이템, 스토어
- 상인 화면의 결제 요청/메뉴/정산 목록과 관리자 화면의 유저/신고/콘텐츠/상인 신청 목록도 빈 상태 카드가 보여야 함

### 화면 가독성
- 본문, 안내, 배지, 오류 문구가 14px 미만으로 보이지 않는지 확인
- 모바일 하단 탭바가 터치와 키보드 포커스 모두에서 동작하는지 확인
- 마이페이지 > 서비스 > 편한 보기 모드를 켠 뒤 글씨, 버튼, 입력창이 커지는지 확인
- 새로고침 후에도 편한 보기 모드가 유지되는지 확인
- 편한 보기 모드에서 홈/검색/알림/채팅/결제/QR 화면의 카드 내부 여백과 버튼 간격이 충분한지 확인
- 편한 보기 모드에서 QR 결제 금액 입력, 채팅 메시지 입력, 검색 입력창 높이가 56px 이상으로 보이는지 확인
- 잔액 조회, QR 스캔 가게 확인, 검색 결과 로딩 중에는 텍스트만 보이지 않고 스켈레톤 로딩이 함께 표시되는지 확인
- 로그아웃, 전체 알림 삭제, 채팅방 나가기, 참여자 내보내기, 참여 신청 거절은 브라우저 기본 팝업이 아니라 앱 다이얼로그로 확인되는지 확인
- 확인 다이얼로그의 제목/설명/확인 버튼 문구가 18px 이상으로 읽히고, 취소 버튼과 충분히 떨어져 있는지 확인

### mock fallback 확인
- `VITE_STRICT_API=false`에서는 API 미구현 화면이 mock 데이터로 이어지는지 확인
- `VITE_STRICT_API=true`에서는 같은 화면에서 mock 대신 에러 카드가 보이는지 확인

## 9. 테스트 후 기록할 것

- 실패한 화면
- 호출한 API
- HTTP status
- 백엔드 응답 body
- 프론트 화면 메시지
- mock fallback 발생 여부
