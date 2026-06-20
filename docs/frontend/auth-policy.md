# 인증/토큰/CORS 정책

## 권한별 로그인 정책
- USER, MERCHANT, ADMIN 로그인 화면은 분리한다.
- 각 권한별 페이지도 분리한다.
- 사용자가 다른 권한 페이지에 접근하면 해당 권한 로그인 화면으로 이동시킨다.

## 역할별 로그인 endpoint
- USER: `/api/v1/users/auth/login`
- MERCHANT: `/api/v1/merchants/auth/login`
- ADMIN: `/api/v1/admin/auth/login`

## MVP 토큰 저장 정책
MVP에서는 Refresh Token을 사용하지 않는다.

- Access Token만 사용한다.
- Access Token은 `sessionStorage`에 저장한다.
- API 요청 시 `Authorization: Bearer {accessToken}` 헤더를 붙인다.
- 브라우저를 닫거나 세션이 만료되면 다시 로그인한다.
- 토큰 만료 또는 401 응답 발생 시 자동 재발급을 시도하지 않고 로그인 화면으로 이동한다.

## 프론트 API 클라이언트 기본 정책
- 로그인 성공 응답에서 Access Token을 받아 `sessionStorage`에 저장한다.
- 로그아웃 시 `sessionStorage`의 Access Token과 사용자 정보를 삭제한다.
- 인증이 필요한 API 요청 전에 Access Token이 없으면 해당 권한 로그인 화면으로 이동한다.
- USER, MERCHANT, ADMIN 토큰/사용자 정보는 충돌하지 않도록 key를 분리한다.
  - 예: `userAccessToken`, `merchantAccessToken`, `adminAccessToken`

## 회원가입 후 자동 로그인
- 회원가입 성공 후 프론트가 같은 이메일/비밀번호로 로그인 API를 자동 호출한다.
- 자동 로그인에 성공하면 Access Token을 `sessionStorage`에 저장하고 해당 권한 홈으로 이동한다.
- 자동 로그인 실패 시 로그인 화면으로 이동하고 안내 메시지를 보여준다.

## 추후 보안 고도화 고려사항
아래 항목은 MVP 이후 검토한다.

- Refresh Token을 HttpOnly Cookie로 저장
- `/api/v1/auth/reissue` 또는 권한별 reissue endpoint 추가
- Access Token을 `sessionStorage`가 아니라 메모리에만 저장
- axios/fetch에서 쿠키 전송 옵션 사용
  - fetch: `credentials: "include"`
  - axios: `withCredentials: true`
- 로그아웃 시 서버에서 Refresh Token 폐기

## 백엔드에 당장 필요한 구현
MVP 기준으로 백엔드는 로그인 성공 시 Access Token만 JSON body로 내려주면 된다.

예시:

```json
{
  "accessToken": "eyJ...",
  "role": "USER",
  "userId": 1,
  "nickname": "춘배"
}
```

Refresh Token, HttpOnly Cookie, token reissue는 지금 당장 필수 구현이 아니다.
