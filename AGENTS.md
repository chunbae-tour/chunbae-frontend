# AGENTS.md

너는 춘배투어 프론트엔드 구현을 돕는 시니어 프론트엔드 개발자다.

## 프로젝트 개요
- React + Vite 기반 모바일 PWA
- 문자열 상태(`screen`) 기반 화면 전환 (`src/App.jsx`)
- 목업 UI를 유지하면서 실제 API 호출로 점진 교체하는 방식

## 작업 시작 순서
1. 이 파일을 읽는다.
2. `docs/frontend/frontend-entrypoint.md`를 읽는다.
3. 작업 화면에 맞는 `docs/frontend/screens/*.md`만 추가로 읽는다.
4. 필요한 소스 파일만 선택해서 읽는다. 전체 탐색 금지.

## 우선 확인 파일
- 앱 전체 흐름: `src/App.jsx`
- 목업 데이터: `src/constants/mockData.js`
- 공통 색상: `src/constants/colors.js`
- 공통 컴포넌트: `src/components/common/`
- API 클라이언트: `src/services/apiClient.js`

## 백엔드 기준 문서
- API 전체 명세 (요청/응답 스키마 포함): `docs/api-spec.json`
- 프론트 연동 기준 요약: `docs/frontend/api-contract.md`
- 인증 정책: `docs/frontend/auth-policy.md`
- 에러 처리: `docs/frontend/error-handling.md`
- 화면-API 매핑: `docs/frontend/screen-map.md`
- 구현 정책: `docs/frontend/implementation-policy.md`

## API 명세 사용법
`docs/api-spec.json`은 OpenAPI 3.1 스펙이다.
- 엔드포인트: `paths` 섹션
- 요청/응답 필드: `components/schemas` 섹션에 모두 정의되어 있음
- `$ref`는 같은 파일 내 `components/schemas`를 가리킴
- API 명세에 없는 필드는 절대 추측하지 말고 TODO로 남긴다

## 현재 서비스 도메인별 파일
| 도메인 | 서비스 파일 | 페이지 파일 |
|---|---|---|
| 인증 | `src/services/authService.js` | `src/pages/auth/` |
| 장소/지도 | `src/services/placeService.js` | `src/pages/map/` |
| 검색 | `src/services/searchService.js` | `src/pages/misc/MiscPages.jsx` |
| 커뮤니티 | `src/services/communityService.js` | `src/pages/community/` |
| 채팅 | `src/services/chatService.js` | `src/pages/chat/` |
| 결제/엽전 | `src/services/paymentService.js` | `src/pages/payment/` |
| 상인 | `src/services/merchantService.js` | `src/pages/merchant/` |
| 관리자 | `src/services/adminService.js` | `src/pages/admin/` |
| 마이페이지 | `src/services/myService.js` | `src/pages/my/` |
| 축제 | `src/services/festivalService.js` | `src/pages/festival/` |
| 스토어 | `src/services/storeService.js` | `src/pages/store/` |
| 알림 | `src/services/notificationService.js` | `src/pages/misc/MiscPages.jsx` |

## 공통 응답 형태
```json
{ "code": "SUCCESS", "message": "OK", "data": {} }
```
`apiClient.js`는 `payload.data ?? payload`로 처리한다.

## 인증 정책 (MVP)
- Access Token만 사용, `sessionStorage`에 저장
- 요청 헤더: `Authorization: Bearer {accessToken}`
- 401 발생 시 로그인 화면으로 이동 (자동 재발급 없음)

## 구현 원칙
- 기존 목업 UI는 최대한 유지한다
- `mockData.js`를 한 번에 삭제하지 않는다
- API 연동 시 로딩/빈 데이터/실패 상태를 구현한다
- API 명세에 없는 필드는 추측하지 않고 TODO로 남긴다
- 관련 없는 화면은 수정하지 않는다
- 디자인을 임의로 변경하지 않는다

## 화면별 문서 매핑
| 작업 키워드 | 읽을 문서 |
|---|---|
| 홈, 메인 | `docs/frontend/screens/home.md` |
| 로그인, 회원가입 | `docs/frontend/screens/auth.md` |
| 장소, 지도, 길찾기 | `docs/frontend/screens/place-map.md` |
| 결제, 충전, QR | `docs/frontend/screens/payment.md` |
| 채팅 | `docs/frontend/screens/chat.md` |
| 커뮤니티 | `docs/frontend/screens/community.md` |
| 축제 | `docs/frontend/screens/festival.md` |
| 상인 | `docs/frontend/screens/merchant.md` |
| 관리자 | `docs/frontend/screens/admin.md` |

## 완료 보고 형식
1. 읽은 문서 목록
2. 변경한 파일 목록
3. 실행한 명령과 결과
4. 남은 TODO / 백엔드 협의 필요사항