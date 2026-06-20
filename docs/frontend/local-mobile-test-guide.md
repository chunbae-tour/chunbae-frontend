# Local And Mobile Test Guide

백엔드 연결 전후에 같은 기준으로 테스트하기 위한 짧은 실행 가이드입니다.

## 1. Local Browser

1. `.env`를 만들고 아래 값을 설정합니다.

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_STRICT_API=false
```

2. 프론트 dev 서버를 실행합니다.

```bash
corepack pnpm dev
```

3. PC 브라우저에서 `http://localhost:5173`로 접속합니다.

## 2. Mobile Device

실제 휴대폰에서 모바일 반응형 UI를 확인하려면 dev 서버를 외부 접속 가능하게 열어야 합니다.

```bash
corepack pnpm dev -- --host 0.0.0.0
```

휴대폰 브라우저에서 아래 주소로 접속합니다.

```text
http://<PC IPv4 주소>:5173
```

예시:

```text
http://192.168.0.23:5173
```

PC가 유선 랜이고 휴대폰이 Wi-Fi여도 같은 공유기/네트워크 대역이면 접속 가능합니다.

## 3. Strict API Mode

백엔드 API 연결만 검증할 때는 mock fallback을 끄고 테스트합니다.

```env
VITE_STRICT_API=true
```

변경 후 dev 서버를 재시작하고 브라우저의 `sessionStorage`를 비운 뒤 다시 로그인합니다.

확인할 것:

- API 경로가 404인지
- CORS 오류인지
- Authorization 헤더가 붙는지
- 응답 JSON 필드가 프론트 정규화 함수에서 읽히는지
- mock fallback이 발생하지 않고 실제 오류가 화면에 표시되는지

## 4. Common Issues

| 증상 | 먼저 확인할 것 |
|---|---|
| 휴대폰에서 접속 불가 | Vite `--host 0.0.0.0`, PC IPv4 주소, Windows 방화벽, 같은 네트워크 여부 |
| 모든 API가 404 | `.env`의 `VITE_API_BASE_URL`에 `/api/v1`을 중복으로 붙였는지 확인 |
| 로그인 후에도 mock처럼 보임 | `sessionStorage`에 이전 mock 토큰/프로필이 남아있는지 확인 |
| strict mode인데 mock 데이터가 보임 | dev 서버 재시작 여부와 `.env` 파일 위치 확인 |
| PC에서는 되는데 휴대폰에서 API 실패 | 백엔드 CORS 허용 origin에 휴대폰 접속 URL 또는 네트워크 접근 설정이 필요한지 확인 |

## 5. Recommended Test Order

1. `VITE_STRICT_API=false`로 UI 흐름을 먼저 확인합니다.
2. USER 로그인과 홈/검색/장소 상세를 확인합니다.
3. 엽전 잔액, 결제내역, 상점 상세, 리뷰 작성 플로우를 확인합니다.
4. 커뮤니티 글 상세에서 채팅방 생성 플로우를 확인합니다.
5. 채팅방 메시지/첨부/읽음/신고/나가기 동작을 확인합니다.
6. 알림 목록, 전체 읽음, 전체 삭제, 알림 설정을 확인합니다.
7. `VITE_STRICT_API=true`로 바꾼 뒤 같은 순서를 반복합니다.
