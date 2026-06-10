import { useCallback, useEffect, useRef, useState } from "react";
import { KakaoMap } from "../../components/map";
import { S } from "../../constants/colors";
import { EmptyState, ErrorState, SkeletonList, StarRating } from "../../components/common";
import { getPlaceImageUrl } from "../../constants/placeImages.js";
import { getApiErrorHint } from "../../services/apiClient.js";
import { fetchMapMarkers, fetchNearbyTravelSpotsWithLikes, fetchRegionByCoordinate, getDefaultLocation } from "../../services/placeService.js";
import {
  getGeolocationErrorMessage,
  getGeolocationSupport,
  requestCurrentPosition,
} from "../../utils/geolocation.js";

const MAP_FILTERS = ["전체", "관광지", "전통시장"];
const MAX_MAP_SPAN_DEGREES = 2;

function filterPlacesByType(items, filter) {
  return filter === "전체" ? items : items.filter((place) => place.type === filter);
}

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
  const [regionInfo, setRegionInfo] = useState(null);
  const [requestingLocation, setRequestingLocation] = useState(false);
  const [pickLocationMode, setPickLocationMode] = useState(false);
  const [mapMarkers, setMapMarkers] = useState([]);
  const [markerStatus, setMarkerStatus] = useState("idle");
  const [markerNotice, setMarkerNotice] = useState("");
  const markerRequestSeq = useRef(0);
  const filtered = filterPlacesByType(places, filter);
  const filteredMarkers = filterPlacesByType(mapMarkers, filter);
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
      const [spotsResult, regionResult] = await Promise.allSettled([
        fetchNearbyTravelSpotsWithLikes({ ...location, size: 20 }),
        fetchRegionByCoordinate(location),
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

  const loadMapMarkers = useCallback(async (bounds) => {
    if (!bounds) return;

    if (bounds.latSpan > MAX_MAP_SPAN_DEGREES || bounds.lngSpan > MAX_MAP_SPAN_DEGREES) {
      markerRequestSeq.current += 1;
      setMapMarkers([]);
      setSelectedPlace(null);
      setMarkerStatus("wide");
      setMarkerNotice("지도를 확대해 주세요. 넓은 범위에서는 마커 조회를 잠시 멈춥니다.");
      return;
    }

    setMarkerStatus("loading");
    setMarkerNotice("");
    const requestSeq = markerRequestSeq.current + 1;
    markerRequestSeq.current = requestSeq;

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
      setMapMarkers([]);
      setSelectedPlace(null);
      setMarkerStatus("error");
      setMarkerNotice(getApiErrorHint(err));
    }
  }, []);

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
  }, [filter]);

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

      {markerNotice && (
        <div className={`map-state-card ${markerStatus === "wide" || markerNotice.includes("많아") ? "warning" : "error"}`}>
          {markerNotice}
        </div>
      )}

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
          <span>주변 골목 포인트 ({filtered.length}개)</span>
          <small>{regionInfo?.fullAddress ? `${regionInfo.fullAddress} 기준` : "거리 · 운영시간 · 리뷰를 보고 바로 들어가세요."}</small>
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
