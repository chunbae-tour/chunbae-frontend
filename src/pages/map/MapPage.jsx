import { useEffect, useState } from "react";
import { KakaoMap } from "../../components/map";
import { S } from "../../constants/colors";
import { EmptyState, ErrorState, SkeletonList, StarRating } from "../../components/common";
import { getPlaceImageUrl } from "../../constants/placeImages.js";
import { getApiErrorHint, shouldUseMockFallback } from "../../services/apiClient.js";
import { fetchNearbyTravelSpots, getDefaultLocation, getMockPlaces } from "../../services/placeService.js";
import {
  getGeolocationErrorMessage,
  getGeolocationSupport,
  requestCurrentPosition,
} from "../../utils/geolocation.js";

const MAP_FILTERS = ["전체", "관광지", "전통시장"];
const ALLEY_TAGS = ["먹자골목", "야시장", "포차거리", "붕어빵 포인트"];
const MAP_HIGHLIGHTS = [
  { label: "오늘 문 연 골목", value: "4곳" },
  { label: "야시장 포인트", value: "2곳" },
  { label: "평균 체류", value: "70분" },
];

const getPlaceMeta = (place) => {
  if (place.type === "전통시장") {
    return {
      mood: "먹거리 4곳",
      time: "70~90분",
      status: "저녁 방문 추천",
    };
  }

  return {
    mood: "산책 코스",
    time: "45~60분",
    status: "낮 산책 추천",
  };
};

export default function MapPage({ onPlaceClick }) {
  const [filter, setFilter] = useState("전체");
  const [places, setPlaces] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [mapCenter, setMapCenter] = useState(getDefaultLocation);
  const [userLocation, setUserLocation] = useState(null);
  const [locationHint, setLocationHint] = useState("");
  const [requestingLocation, setRequestingLocation] = useState(false);
  const [pickLocationMode, setPickLocationMode] = useState(false);
  const filtered = filter === "전체" ? places : places.filter(p => p.type === filter);
  const accessOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const isSecureAccess = typeof window !== "undefined" ? window.isSecureContext : true;

  const applyLocation = (location) => {
    setUserLocation(location);
    setMapCenter(location);
  };

  const loadPlaces = async (location = getDefaultLocation()) => {
    applyLocation(location);
    setStatus("loading");
    setError("");

    try {
      const result = await fetchNearbyTravelSpots({ ...location, size: 20 });
      setPlaces(result);
      setStatus(result.length > 0 ? "success" : "empty");
    } catch (err) {
      if (!shouldUseMockFallback(err)) {
        setPlaces([]);
        setError(getApiErrorHint(err));
        setStatus("error");
        return;
      }
      setPlaces(getMockPlaces());
      setError(err.message || "주변 장소를 불러오지 못했습니다.");
      setStatus("mock");
    }
  };

  const requestUserLocation = async () => {
    setRequestingLocation(true);
    setLocationHint("");

    try {
      const location = await requestCurrentPosition();
      await loadPlaces(location);
    } catch (error) {
      setLocationHint(getGeolocationErrorMessage(error));
      if (!userLocation) {
        await loadPlaces(getDefaultLocation());
      }
    } finally {
      setRequestingLocation(false);
    }
  };

  useEffect(() => {
    const support = getGeolocationSupport();
    if (!support.ok) {
      setLocationHint(support.message);
      loadPlaces(getDefaultLocation());
      return undefined;
    }

    setLocationHint("내 위치를 지도에 표시하려면 아래 버튼을 눌러 위치 사용을 허용해주세요.");
    loadPlaces(getDefaultLocation());
    return undefined;
  }, []);

  return (
    <div style={S.screen} className="map-explorer-page">
      <div className="map-explorer-hero">
        <div className="map-hero-copy">
          <span className="map-hero-kicker">LOCAL ALLEY MAP</span>
          <h1>오늘은 어느 시장 골목으로 들어갈까요?</h1>
          <p>광장시장 밤골목부터 궁궐 옆 산책길까지, 지금 걷기 좋은 로컬 포인트를 모았습니다.</p>
          <div className="map-hero-actions">
            <button type="button">지금 열린 골목 보기</button>
            <button type="button" className="secondary">근처 시장 보기</button>
          </div>
        </div>
        <div className="map-hero-panel">
          <div className="map-search-chip">🔍 광장시장, 먹자골목, 야시장 검색...</div>
          <div className="map-highlight-grid">
            {MAP_HIGHLIGHTS.map(item => (
              <div key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {!userLocation && (
        <div className="map-location-banner" role="status">
          <p>{locationHint || "내 위치를 사용하려면 위치 권한이 필요합니다."}</p>
          <small className="map-location-origin">
            현재 접속: {accessOrigin || "알 수 없음"}
            {!isSecureAccess ? " (http 접속 — 휴대폰 GPS 권한 창이 안 뜰 수 있음)" : ""}
          </small>
          {getGeolocationSupport().ok ? (
            <button type="button" onClick={requestUserLocation} disabled={requestingLocation}>
              {requestingLocation ? "위치 확인 중..." : "위치 사용 허용"}
            </button>
          ) : (
            <small>
              PC에서 `npm install` 후 `pnpm dev:mobile` 실행 → 휴대폰 주소창에{" "}
              <strong>https://본인IP:5173</strong> 입력 (http 아님). 인증 경고 화면이 안 보이면 아래 「지도 탭」을 쓰세요.
            </small>
          )}
          <button
            type="button"
            className="map-location-pick"
            onClick={() => setPickLocationMode((value) => !value)}
          >
            {pickLocationMode ? "지도 탭 모드 끄기" : "지도 탭해서 위치 지정 (GPS 대체)"}
          </button>
        </div>
      )}

      <div className="map-night-board map-night-board--live">
        <KakaoMap
          className="map-kakao-container"
          center={mapCenter}
          currentPosition={userLocation}
          markers={filtered}
          selectedMarkerId={selectedPlace?.id ?? selectedPlace?.placeId}
          onMarkerClick={setSelectedPlace}
          pickLocationMode={pickLocationMode}
          onMapClick={
            pickLocationMode
              ? (location) => {
                  setPickLocationMode(false);
                  loadPlaces(location);
                }
              : undefined
          }
          showLocateButton
          onCurrentPositionChange={(location) => {
            applyLocation(location);
            loadPlaces(location);
          }}
        />
        {selectedPlace && (
          <div className="map-place-popover">
            <button type="button" onClick={() => setSelectedPlace(null)}>×</button>
            <span>{selectedPlace.type}</span>
            <strong>{selectedPlace.name}</strong>
            <small>{selectedPlace.addr}</small>
            <div>
              <em>📍 {selectedPlace.dist}</em>
              <em>★ {selectedPlace.rating}</em>
              <em>리뷰 {selectedPlace.reviews}</em>
            </div>
            <div className="map-popover-actions">
              <button type="button" onClick={() => onPlaceClick(selectedPlace)}>상세 보기</button>
              <button type="button" className="ghost" onClick={() => onPlaceClick(selectedPlace)}>상세에서 길찾기</button>
            </div>
          </div>
        )}
      </div>

      <div className="map-alley-tags">
        {ALLEY_TAGS.map(tag => <span key={tag}>{tag}</span>)}
      </div>

      {/* 카테고리 필터 */}
      <div className="map-filter-row">
        {MAP_FILTERS.map(f => (
          <div key={f} onClick={() => setFilter(f)} className={filter === f ? "active" : ""}>
            {f}
          </div>
        ))}
      </div>

      {/* 장소 목록 */}
      <div style={S.scrollArea}>
        <div className="map-list-head">
          <span>{status === "mock" ? "기본 추천 골목" : "주변 골목 포인트"} ({filtered.length}개)</span>
          <small>거리 · 운영시간 · 리뷰를 보고 바로 들어가세요.</small>
        </div>
        {status === "loading" && <div className="map-result-grid"><SkeletonList count={4} /></div>}
        {status === "error" && (
          <ErrorState
            title="주변 장소를 불러오지 못했습니다."
            description={error || "백엔드 연결 상태를 확인한 뒤 다시 시도해주세요."}
            onRetry={() => loadPlaces(getDefaultLocation())}
          />
        )}
        {status === "mock" && (
          <div className="map-state-card warning">
            {error} API 연결 전까지 목업 장소를 보여줍니다.
          </div>
        )}
        {status === "empty" && (
          <EmptyState
            icon="지도"
            title="주변 장소 응답이 비어 있습니다."
            description="위치나 검색 반경을 조정하면 더 많은 장소를 찾을 수 있습니다."
            actionLabel="기본 위치로 다시 조회"
            onAction={() => loadPlaces(getDefaultLocation())}
          />
        )}
        <div className="map-result-grid">
          {filtered.map(p => {
            const meta = getPlaceMeta(p);
            return (
              <div key={p.id} className="map-result-card" onClick={() => onPlaceClick({ ...p, imageUrl: getPlaceImageUrl(p) })}>
                <div
                  className={p.type === "전통시장" ? "map-result-thumb market has-image" : "map-result-thumb has-image"}
                  style={{ "--place-card-image": getPlaceImageUrl(p) ? `url("${getPlaceImageUrl(p)}")` : undefined }}
                >
                  {!getPlaceImageUrl(p) && <span>{p.emoji}</span>}
                </div>
                <div className="map-result-body">
                  <div className="map-result-title">
                    <span>{p.name}</span>
                    <small className={p.type === "관광지" ? "palace" : ""}>{p.type}</small>
                  </div>
                  <p>{p.addr}</p>
                  <div className="map-service-meta">
                    <span>{meta.mood}</span>
                    <span>{meta.time}</span>
                    <span>{meta.status}</span>
                  </div>
                  <div className="map-result-foot">
                    <span>📍 {p.dist}</span>
                    <StarRating rating={p.rating} />
                    <span>리뷰 {p.reviews}</span>
                  </div>
                </div>
                <button type="button">골목 보기</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
