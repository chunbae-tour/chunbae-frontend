# 장소/지도 화면 작업 문서

## 관련 화면
- 홈 일부: `src/pages/home/HomePage.jsx`
- 지도: `src/pages/map/MapPage.jsx`
- 장소 상세: `src/pages/map/PlaceDetailPage.jsx`
- 길찾기: `src/pages/map/DirectionPage.jsx`

## API
### 주변 장소 조회
`GET /api/v1/places/nearby`

Query:
- `lat`
- `lng`
- `radius`
- `page` 0부터 시작
- `size` 1~50

### 주변 전통시장 조회
`GET /api/v1/traditional-markets/nearby`

Query:
- `lat`
- `lng`
- `radius`
- `page` 0부터 시작
- `size` 1~50

Response data 후보:
- `markets`
- `page`, `size`, `hasNext`
- `id`, `name`, `address`
- `lat`, `lng`
- `marketType`, `imageUrl`
- `distanceMeters`
- `targetType=TRADITIONAL_MARKET`

### 장소 상세
`GET /api/v1/places/{placeId}`

Response data 후보:
- `placeId`, `name`, `description`, `address`
- `latitude`, `longitude`
- `operatingHours`, `closedDays`, `admissionFee`, `phone`
- `reviewCount`, `likeCount`, `imageUrls`, `isLiked`

### 길찾기
`GET /api/v1/directions`

Query:
- `originLat`, `originLng`, `destLat`, `destLng`

Response:
- `provider`
- `redirectUrl`

## 구현 주의
- 브라우저 위치 권한 거부 시 기본 위치 정책 필요
- 지도 SDK를 쓸지, 목록형 UI만 먼저 붙일지 결정 필요
- 장소 찜 추가/취소 API는 백엔드에 구현되어 있습니다. (`POST/DELETE /api/v1/places/{placeId}/like`)
- 단, 전통시장 찜하기 전용 API(`/traditional-markets/{marketId}/like`)는 백엔드에 없으므로 관광지 찜 API(`/places/...`)로 단일화하여 처리할지 백엔드 협의가 필요합니다.
