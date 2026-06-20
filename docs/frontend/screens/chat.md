# 채팅 화면 작업 문서

## 관련 화면
- `src/pages/chat/ChatPage.jsx`
- `src/pages/chat/ChatRequestPage.jsx`

## API
### 채팅방 생성
`POST /api/v1/chat/rooms`

Body:
- `postId`
- `title`
- `description`
- `maxMembers` 2~50

Response data:
- `chatRoomId`

### 내 채팅방 목록
`GET /api/v1/chat/rooms?cursor=&size=10`

Response:
- 커서 페이지 응답
- 각 항목: `chatRoomId`, `title`, `currentMembers`, `maxMembers`, `unreadCount`, `lastMessage`

## 의논 필요
- 실시간 메시지 WebSocket/STOMP endpoint 최종 경로
- 채팅방 상세/메시지 목록 API
- 참여 신청 승인/거절 API
- 번역 기능 적용 범위

## 실시간 메시지

백엔드 메시지 전송은 REST `POST /chat/rooms/{chatRoomId}/messages`가 아니라
`@MessageMapping("/chat/rooms/{chatRoomId}/messages")` 기반 STOMP 전송입니다.

프론트 기본값:
- SockJS endpoint: `/ws-stomp`
- SEND destination: `/pub/chat/rooms/{chatRoomId}/messages`
- SUBSCRIBE destination: `/sub/chat/rooms/{chatRoomId}`
- CONNECT header: `Authorization: Bearer {USER AccessToken}`

백엔드 설정이 다르면 `.env`에서 아래 값을 지정합니다.

```env
VITE_STOMP_SOCKJS_URL=http://localhost:8080/ws-stomp
VITE_STOMP_SEND_PREFIX=/pub
VITE_STOMP_SUBSCRIBE_PREFIX=/sub
```

EC2 백엔드 연결 시 `VITE_STOMP_SOCKJS_URL`을 생략하면 `VITE_API_BASE_URL + /ws-stomp`를 사용합니다.
백엔드가 다른 WebSocket origin을 쓰는 경우에만 `.env.ec2`에서 `VITE_STOMP_SOCKJS_URL`을 별도로 지정합니다.
