# 프론트엔드 작업 진입점

## 목적
Codex가 프론트 작업을 시작할 때 전체 프로젝트를 무작정 탐색하지 않고,
현재 작업에 필요한 문서와 소스 파일만 선택해서 읽도록 하는 진입 문서입니다.

---

# 현재 프론트 상태

- React + Vite 기반 목업 앱입니다.
- `src/App.jsx`에서 문자열 상태 기반으로 화면을 전환합니다.
- `src/constants/mockData.js`에 목업 데이터가 있습니다.
- 실제 백엔드 API 연동은 화면별로 점진 적용해야 합니다.
- MVP 단계에서는 mock 기반 UI를 유지하면서 API 연결을 추가합니다.

---

# 작업 시작 순서

1. 루트의 `AGENTS.md`를 읽습니다.
2. 이 문서를 읽습니다.
3. 작업 요청에서 어떤 화면인지 파악합니다.
4. `docs/frontend/screen-map.md`에서 해당 화면을 찾습니다.
5. 해당 화면 문서만 읽습니다.
6. 필요한 경우에만 추가 공통 문서를 읽습니다.
7. 필요한 소스 파일만 선택해서 읽습니다.
8. 전체 프로젝트를 무작정 탐색하지 않습니다.

---

# 화면별 문서 매핑

| 작업 키워드 | 읽을 문서 |
|---|---|
| 홈, 메인 | `docs/frontend/screens/home.md` |
| 로그인, 회원가입 | `docs/frontend/screens/auth.md` |
| 장소, 지도, 길찾기 | `docs/frontend/screens/place.md` |
| 결제, 충전, QR | `docs/frontend/screens/payment.md` |
| 채팅 | `docs/frontend/screens/chat.md` |
| 상인 | `docs/frontend/screens/merchant.md` |
| 관리자 | `docs/frontend/screens/admin.md` |

---

# 공통 문서

필요한 경우에만 읽습니다.

| 필요 상황 | 읽을 문서 |
|---|---|
| API 연결 | `docs/frontend/api-contract.md` |
| 인증/로그인 | `docs/frontend/auth-policy.md` |
| 에러 처리 | `docs/frontend/error-handling.md` |
| 라우팅 확인 | `docs/frontend/screen-map.md` |
| 구현 정책 확인 | `docs/frontend/implementation-policy.md` |

---

# 소스 코드 진입점

필요한 파일만 선택해서 읽습니다.

| 목적 | 파일 |
|---|---|
| 앱 시작점 | `src/main.jsx` |
| 앱 전체 흐름 | `src/App.jsx` |
| 목업 데이터 | `src/constants/mockData.js` |
| 색상 시스템 | `src/constants/colors.js` |
| 공통 컴포넌트 | `src/components/common` |

---

# 기본 개발 원칙

- 기존 목업 UI는 최대한 유지합니다.
- `mockData.js`를 한 번에 삭제하지 않습니다.
- API 연동 시 로딩 상태를 구현합니다.
- API 연동 시 빈 데이터 상태를 구현합니다.
- API 연동 시 실패 상태를 구현합니다.
- 아직 없는 API는 mock을 유지하고 TODO로 남깁니다.
- 관련 없는 화면은 수정하지 않습니다.
- 변경 범위를 최소화합니다.
- 디자인을 임의로 변경하지 않습니다.
- API 명세에 없는 필드는 추측하지 않습니다.

---

# 인증 정책

MVP 단계에서는 아래 정책을 사용합니다.

- Access Token만 사용합니다.
- Access Token은 `sessionStorage`에 저장합니다.
- Refresh Token은 아직 구현하지 않습니다.
- 토큰 만료 시 재로그인 방식으로 처리합니다.
- 추후 HttpOnly Cookie 기반 Refresh Token 구조로 확장 예정입니다.

---

# 읽기 제한 규칙

다음 행동은 금지합니다.

- `src` 전체 탐색
- `docs` 전체 탐색
- 관련 없는 페이지 읽기
- 전체 리팩토링
- 관리자/상인 페이지 무단 수정
- 결제 로직 전체 재구성

---

# 작업 전 반드시 수행할 것

수정 전에 아래 내용을 먼저 보고합니다.

1. 읽은 문서 목록
2. 읽은 소스 파일 목록
3. 현재 데이터 흐름 요약
4. 수정 계획 (5줄 이하)

---

# 작업 완료 후 반드시 보고할 것

1. 수정한 파일 목록
2. 추가된 TODO
3. 필요한 백엔드 API
4. 현재 mock 유지 영역
5. 테스트 결과

---

# API가 없는 기능 처리 방식

아직 백엔드 API가 없는 경우:

- mock 데이터 유지
- UI 먼저 구현
- TODO 주석 추가
- 실제 API 연동 위치 표시

예시:

```js
// TODO: 실제 QR 결제 API 연동 필요
