import { useCallback, useEffect, useRef, useState } from "react";
import { KakaoMap } from "../../components/map";
import { S } from "../../constants/colors";
import { EmptyState, ErrorState, SkeletonList, StarRating } from "../../components/common";
import { getPlaceImageUrl } from "../../constants/placeImages.js";
import { getApiErrorHint } from "../../services/apiClient.js";
import { fetchMapMarkers, fetchNearbyTravelSpotsWithLikes, fetchPlaces, fetchRegionByCoordinate, getDefaultLocation } from "../../services/placeService.js";
import {
  getGeolocationErrorMessage,
  getGeolocationSupport,
  requestCurrentPosition,
} from "../../utils/geolocation.js";

const CATEGORY_FILTERS = [
  { label: "전체", value: "" },
  { label: "관광지", value: "TOURIST_SPOT" },
  { label: "전통시장", value: "TRADITIONAL_MARKET" },
];
const FAVORITE_FILTER = "찜한 장소";
const MAP_FILTERS = [...CATEGORY_FILTERS.map(({ label }) => label), FAVORITE_FILTER];
const REGION_FILTERS = ["전체", "서울", "경기", "인천", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "부산", "대구", "광주", "대전", "울산", "제주"];
const REGION_QUERY_ALIASES = {
  서울: "서울특별시",
  경기: "경기도",
  인천: "인천광역시",
  강원: "강원",
  충북: "충청북도",
  충남: "충청남도",
  전북: "전북",
  전남: "전라남도",
  경북: "경상북도",
  경남: "경상남도",
  부산: "부산광역시",
  대구: "대구광역시",
  광주: "광주광역시",
  대전: "대전광역시",
  울산: "울산광역시",
  제주: "제주",
};
const PLACE_FILTER_PAGE_SIZE = 50;
const MAX_MAP_SPAN_DEGREES = 2;
const MARKER_REQUEST_MIN_INTERVAL_MS = 1200;
const MARKER_RATE_LIMIT_COOLDOWN_MS = 5000;

function filterPlacesByType(items, filter) {
  if (filter === FAVORITE_FILTER) return items.filter((place) => place.isLiked);
  return filter === "전체" ? items : items.filter((place) => place.type === filter);
}

function getCategoryFilterValue(filter) {
  return CATEGORY_FILTERS.find((item) => item.label === filter)?.value ?? "";
}

function normalizeRegionFilter(region) {
  const value = String(region ?? "").trim();
  return value || "전체";
}

function getRegionQueryValue(region) {
  const normalizedRegion = normalizeRegionFilter(region);
  if (normalizedRegion === "전체") return "";
  return REGION_QUERY_ALIASES[normalizedRegion] ?? normalizedRegion;
}

function hasMarkerCoordinate(place) {
  return Number.isFinite(Number(place?.lat ?? place?.latitude))
    && Number.isFinite(Number(place?.lng ?? place?.longitude));
}

function getMarkerIdentity(place) {
  const type = place?.targetType ?? place?.type ?? "PLACE";
  return `${type}:${place?.placeId ?? place?.id ?? place?.name}`;
}

function mergeMarkerSources(...sources) {
  const merged = new Map();
  sources.flat().forEach((place) => {
    if (!place || !hasMarkerCoordinate(place)) return;
    const key = getMarkerIdentity(place);
    if (!merged.has(key)) {
      merged.set(key, place);
    }
  });
  return Array.from(merged.values());
}

function getMarkerBoundsKey(bounds) {
  return [
    bounds.swLat,
    bounds.swLng,
    bounds.neLat,
    bounds.neLng,
  ].map((value) => Number(value).toFixed(4)).join("|");
}

export default function MapPage({ onPlaceClick }) {
  const [filter, setFilter] = useState("전체");
  const [places, setPlaces] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [mapCenter, setMapCenter] = useState(getDefaultLocation);
  const [userLocation, setUserLocation] = useState(null);
  const [locationHint, setLocationHint] = useState("");
  const [regionInfo, setRegionInfo] = useState(null);
  const [regionFilter, setRegionFilter] = useState("전체");
  const [regionInput, setRegionInput] = useState("");
  const [requestingLocation, setRequestingLocation] = useState(false);
  const [pickLocationMode, setPickLocationMode] = useState(false);
  const [mapMarkers, setMapMarkers] = useState([]);
  const [markerStatus, setMarkerStatus] = useState("idle");
  const [markerNotice, setMarkerNotice] = useState("");
  const markerRequestSeq = useRef(0);
  const markerRequestTimer = useRef(null);
  const markerLastBoundsKey = useRef("");
  const markerLastRequestAt = useRef(0);
  const markerRateLimitedUntil = useRef(0);
  const markerPendingBounds = useRef(null);
  const filtered = filterPlacesByType(places, filter);
  const markerSource = filter === "찜한 장소"
    ? places
    : mergeMarkerSources(mapMarkers, places);
  const filteredMarkers = filterPlacesByType(markerSource, filter);
  const accessOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const isSecureAccess = typeof window !== "undefined" ? window.isSecureContext : true;
  const activeCategory = getCategoryFilterValue(filter);
  const activeFilterLabels = [
    regionFilter !== "전체" ? `지역 ${regionFilter}` : "",
    activeCategory ? filter : "",
    filter === FAVORITE_FILTER ? FAVORITE_FILTER : "",
  ].filter(Boolean);

  const applyLocation = (location) => {
    setUserLocation(location);
    setMapCenter(location);
  };

  const loadPlaces = async (location = getDefaultLocation(), region = regionFilter, nextFilter = filter) => {
    applyLocation(location);
    setStatus("loading");
    setError("");

    try {
      const normalizedRegion = normalizeRegionFilter(region);
      const selectedRegion = getRegionQueryValue(normalizedRegion);
      const selectedCategory = getCategoryFilterValue(nextFilter);
      const shouldUsePlaceSearch = Boolean(selectedRegion || selectedCategory);
      const [spotsResult, regionResult] = await Promise.allSettled([
        shouldUsePlaceSearch
          ? fetchPlaces({ region: selectedRegion, category: selectedCategory, size: PLACE_FILTER_PAGE_SIZE })
          : fetchNearbyTravelSpotsWithLikes({ ...location, size: 20 }),
        selectedRegion ? Promise.resolve({ fullAddress: `${normalizedRegion} 지역` }) : fetchRegionByCoordinate(location),
      ]);
      if (regionResult.status === "fulfilled") {
        setRegionInfo(regionResult.value);
      } else {
        setRegionInfo(null);
      }
      if (spotsResult.status === "rejected") {
        throw spotsResult.reason;
      }

      const result = spotsResult.value;
      setPlaces(result);
      setStatus(result.length > 0 ? "success" : "empty");
    } catch (err) {
      setPlaces([]);
      setError(getApiErrorHint(err));
      setStatus("error");
    }
  };

  const handleCategoryFilterClick = (nextFilter) => {
    setFilter(nextFilter);
    loadPlaces(mapCenter, regionFilter, nextFilter);
  };

  const applyRegionFilter = (region = regionInput) => {
    const normalizedRegion = normalizeRegionFilter(region);
    setRegionFilter(normalizedRegion);
    setRegionInput(normalizedRegion === "전체" ? "" : normalizedRegion);
    loadPlaces(mapCenter, normalizedRegion, filter);
  };

  const resetPlaceFilters = () => {
    setFilter("전체");
    setRegionFilter("전체");
    setRegionInput("");
    loadPlaces(mapCenter, "전체", "전체");
  };

  const executeMapMarkerLoad = useCallback(async (bounds, boundsKey) => {
    setMarkerStatus("loading");
    setMarkerNotice("");
    const requestSeq = markerRequestSeq.current + 1;
    markerRequestSeq.current = requestSeq;
    markerLastRequestAt.current = Date.now();
    markerLastBoundsKey.current = boundsKey;

    try {
      const result = await fetchMapMarkers(bounds);
      if (requestSeq !== markerRequestSeq.current) return;
      setMapMarkers(result.markers);
      setMarkerStatus(result.markers.length > 0 ? "success" : "empty");
      setMarkerNotice(
        result.truncated
          ? `관광지가 너무 많아 ${result.limit.toLocaleString()}개만 표시됩니다. 지도를 더 확대해 주세요.`
          : "",
      );
    } catch (err) {
      if (requestSeq !== markerRequestSeq.current) return;
      markerLastBoundsKey.current = "";
      if (err?.status === 429 || err?.code === "TOO_MANY_REQUESTS") {
        markerRateLimitedUntil.current = Date.now() + MARKER_RATE_LIMIT_COOLDOWN_MS;
        setMarkerStatus("error");
        setMarkerNotice("지도를 빠르게 움직여 마커 요청이 잠시 제한되었습니다. 잠시 후 다시 움직여주세요.");
        return;
      }
      setMapMarkers([]);
      setSelectedPlace(null);
      setMarkerStatus("error");
      setMarkerNotice(getApiErrorHint(err));
    }
  }, []);

  const loadMapMarkers = useCallback((bounds) => {
    if (!bounds) return;

    if (bounds.latSpan > MAX_MAP_SPAN_DEGREES || bounds.lngSpan > MAX_MAP_SPAN_DEGREES) {
      window.clearTimeout(markerRequestTimer.current);
      markerPendingBounds.current = null;
      markerRequestSeq.current += 1;
      markerLastBoundsKey.current = "";
      setMapMarkers([]);
      setSelectedPlace(null);
      setMarkerStatus("wide");
      setMarkerNotice("지도를 확대해 주세요. 넓은 범위에서는 마커 조회를 잠시 멈춥니다.");
      return;
    }

    const now = Date.now();
    if (now < markerRateLimitedUntil.current) {
      setMarkerStatus("error");
      setMarkerNotice("마커 요청이 잠시 제한되었습니다. 몇 초 뒤 다시 지도를 움직여주세요.");
      return;
    }

    const boundsKey = getMarkerBoundsKey(bounds);
    if (boundsKey === markerLastBoundsKey.current) {
      return;
    }

    const remainingWait = MARKER_REQUEST_MIN_INTERVAL_MS - (now - markerLastRequestAt.current);
    window.clearTimeout(markerRequestTimer.current);

    if (remainingWait > 0) {
      markerPendingBounds.current = { bounds, boundsKey };
      markerRequestTimer.current = window.setTimeout(() => {
        const pending = markerPendingBounds.current;
        markerPendingBounds.current = null;
        if (!pending) return;
        executeMapMarkerLoad(pending.bounds, pending.boundsKey);
      }, remainingWait);
      return;
    }

    executeMapMarkerLoad(bounds, boundsKey);
  }, [executeMapMarkerLoad]);

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

  useEffect(() => {
    setSelectedPlace(null);
  }, [filter, regionFilter]);

  useEffect(() => () => {
    window.clearTimeout(markerRequestTimer.current);
  }, []);

  return (
    <div style={S.screen} className="map-explorer-page">
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
          markers={filteredMarkers}
          selectedMarkerId={selectedPlace?.id ?? selectedPlace?.placeId}
          onMarkerClick={setSelectedPlace}
          onViewportChange={loadMapMarkers}
          fitMarkers={false}
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
              <em>📍 {selectedPlace.dist || "지도 안"}</em>
              <em className="star-score">★ {selectedPlace.rating}</em>
              <em>리뷰 {selectedPlace.reviews}</em>
            </div>
            <div className="map-popover-actions">
              <button type="button" onClick={() => onPlaceClick(selectedPlace)}>상세 보기</button>
              <button type="button" className="ghost" onClick={() => onPlaceClick(selectedPlace)}>상세에서 길찾기</button>
            </div>
          </div>
        )}
      </div>

      {markerNotice && (
        <div className={`map-state-card ${markerStatus === "wide" || markerNotice.includes("많아") ? "warning" : "error"}`}>
          {markerNotice}
        </div>
      )}

      <section className="map-filter-panel" aria-label="관광지 검색 필터">
        <div className="map-filter-section">
          <span className="map-filter-label">카테고리</span>
          <div className="map-filter-row">
            {MAP_FILTERS.map(f => (
              <button
                key={f}
                type="button"
                onClick={() => handleCategoryFilterClick(f)}
                className={filter === f ? "active" : ""}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="map-filter-section">
          <span className="map-filter-label">지역</span>
          <form
            className="map-region-filter-form"
            onSubmit={(event) => {
              event.preventDefault();
              applyRegionFilter();
            }}
          >
            <input
              value={regionInput}
              onChange={(event) => setRegionInput(event.target.value)}
              placeholder="지역명 입력 (예: 종로구, 완주)"
              aria-label="지역명 입력"
            />
            <button type="submit" className="map-region-submit">적용</button>
            <button type="button" className="map-filter-reset" onClick={resetPlaceFilters}>초기화</button>
          </form>
          <div className="map-region-filter-row" aria-label="지역 빠른 필터">
            {REGION_FILTERS.map(region => (
              <button
                key={region}
                type="button"
                className={regionFilter === region ? "active" : ""}
                onClick={() => applyRegionFilter(region)}
              >
                {region}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 장소 목록 */}
      <div style={S.scrollArea}>
        <div className="map-list-head">
          <span>주변 골목 포인트 ({filtered.length}개)</span>
          <small>
            {activeFilterLabels.length > 0
              ? `${activeFilterLabels.join(" · ")} 필터 적용 중`
              : regionInfo?.fullAddress
                ? `${regionInfo.fullAddress} 기준`
                : "거리 · 운영시간 · 리뷰를 보고 바로 들어가세요."}
          </small>
        </div>
        {status === "loading" && <div className="map-result-grid"><SkeletonList count={4} /></div>}
        {status === "error" && (
          <ErrorState
            title="주변 장소를 불러오지 못했습니다."
            description={error || "백엔드 연결 상태를 확인한 뒤 다시 시도해주세요."}
            onRetry={() => loadPlaces(getDefaultLocation())}
          />
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
        {status === "success" && filtered.length === 0 && (
          <EmptyState
            icon={filter === "찜한 장소" ? "♥" : "지도"}
            title={filter === "찜한 장소" ? "찜한 장소가 없습니다." : "이 필터에 표시할 장소가 없습니다."}
            description={filter === "찜한 장소" ? "관광지 상세에서 마음에 드는 장소를 찜하면 여기에서 모아볼 수 있어요." : "다른 필터를 선택하거나 위치를 다시 확인해보세요."}
          />
        )}
        <div className="map-result-grid">
          {filtered.map(p => (
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
                <div className="map-result-foot">
                  <span>📍 {p.dist}</span>
                  <StarRating rating={p.rating} />
                  <span>리뷰 {p.reviews}</span>
                </div>
              </div>
              <button type="button">골목 보기</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
