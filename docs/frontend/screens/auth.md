# 인증 화면 작업 문서

## 관련 화면
- 로그인: `src/pages/auth/LoginPage.jsx`
- 회원가입: `src/pages/auth/SignupPage.jsx`

## API
- `POST /api/v1/users/auth/signup`
- `POST /api/v1/users/auth/login`
- `POST /api/v1/merchants/auth/login`
- `POST /api/v1/admin/auth/login`
- `POST /api/v1/auth/reissue`
- `POST /api/v1/auth/logout`
- `GET /api/v1/users/me`

## 요청 필드
회원가입: `email`, `password`, `nickname`
로그인: `email`, `password`

## 응답 필드
로그인/재발급: `accessToken`, `role`
내 정보: `userId`, `email`, `nickname`, `profileImageUrl`, `language`, `companionScore`, `companionReviewCount`

## 의논 필요
- 가입 성공 후 자동 로그인 여부
- 로그인 화면을 역할별로 나눌지, 탭으로 합칠지
- Access Token 저장 위치
