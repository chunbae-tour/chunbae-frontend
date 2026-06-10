import { useCallback, useEffect, useRef, useState } from "react";
import { getGeolocationErrorMessage, requestCurrentPosition } from "../../utils/geolocation.js";
import { getKakaoMapAppKey, loadKakaoMapSdk } from "../../utils/loadKakaoMapSdk.js";

const KAKAO_RENDERABLE_BOUNDS = {
  minLat: 31,
  maxLat: 39.8,
  minLng: 123,
  maxLng: 132.8,
};

function getRenderableCoordinate(latValue, lngValue) {
  const lat = Number(latValue);
  const lng = Number(lngValue);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat === 0 || lng === 0) return null;
  if (
    lat < KAKAO_RENDERABLE_BOUNDS.minLat
    || lat > KAKAO_RENDERABLE_BOUNDS.maxLat
    || lng < KAKAO_RENDERABLE_BOUNDS.minLng
    || lng > KAKAO_RENDERABLE_BOUNDS.maxLng
  ) {
    return null;
  }
  return { lat, lng };
}

function getMapBoundsPayload(map) {
  const bounds = map.getBounds();
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();

  return {
    swLat: sw.getLat(),
    swLng: sw.getLng(),
    neLat: ne.getLat(),
    neLng: ne.getLng(),
    latSpan: Math.abs(ne.getLat() - sw.getLat()),
    lngSpan: Math.abs(ne.getLng() - sw.getLng()),
  };
}

export default function KakaoMap({
  center,
  currentPosition,
  markers = [],
  selectedMarkerId,
  onMarkerClick,
  onCurrentPositionChange,
  onMapClick,
  onViewportChange,
  pickLocationMode = false,
  showLocateButton = false,
  fitMarkers = true,
  level = 5,
  className = "",
  style,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerInstancesRef = useRef([]);
  const currentPositionOverlayRef = useRef(null);
  const viewportTimerRef = useRef(null);
  const [status, setStatus] = useState(() => (getKakaoMapAppKey() ? "loading" : "no-key"));
  const [errorMessage, setErrorMessage] = useState("");
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState("");

  useEffect(() => {
    if (!getKakaoMapAppKey()) {
      setStatus("no-key");
      return undefined;
    }

    let cancelled = false;
    setStatus("loading");

    loadKakaoMapSdk()
      .then((kakao) => {
        if (cancelled || !containerRef.current) return;

        const initialCenter = getRenderableCoordinate(center?.lat, center?.lng) ?? { lat: 37.5796, lng: 126.977 };
        const { lat, lng } = initialCenter;
        const map = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(lat, lng),
          level,
        });

        mapRef.current = map;
        setStatus("ready");

        requestAnimationFrame(() => {
          map.relayout();
          map.setCenter(new kakao.maps.LatLng(lat, lng));
        });
        window.setTimeout(() => {
          map.relayout();
          map.setCenter(new kakao.maps.LatLng(lat, lng));
        }, 120);
      })
      .catch((error) => {
        if (cancelled) return;
        setStatus("error");
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        setErrorMessage(
          error.message === "KAKAO_MAP_KEY_MISSING"
            ? ".env에 VITE_KAKAO_MAP_APP_KEY를 추가한 뒤 dev 서버를 재시작해주세요."
            : `카카오맵을 불러오지 못했습니다. JavaScript 키(REST 키 아님)와 플랫폼 도메인 등록을 확인해주세요.${origin ? ` 현재 접속: ${origin}` : ""}`,
        );
      });

    return () => {
      cancelled = true;
    };
  }, [level]);

  useEffect(() => {
    if (status !== "ready" || !mapRef.current || !center) return;
    const { kakao } = window;
    const nextCenter = getRenderableCoordinate(center.lat, center.lng);
    if (!nextCenter) return;
    mapRef.current.setCenter(new kakao.maps.LatLng(nextCenter.lat, nextCenter.lng));
  }, [center?.lat, center?.lng, status]);

  useEffect(() => {
    if (status !== "ready" || !mapRef.current) return;

    const { kakao } = window;
    markerInstancesRef.current.forEach((marker) => marker.setMap(null));
    markerInstancesRef.current = [];

    const validMarkers = markers
      .map((place) => ({
        place,
        coordinate: getRenderableCoordinate(place.lat, place.lng),
      }))
      .filter((item) => item.coordinate);

    validMarkers.forEach(({ place, coordinate }) => {
      const marker = new kakao.maps.Marker({
        map: mapRef.current,
        position: new kakao.maps.LatLng(coordinate.lat, coordinate.lng),
      });
      kakao.maps.event.addListener(marker, "click", () => onMarkerClick?.(place));
      markerInstancesRef.current.push(marker);
    });

    const bounds = new kakao.maps.LatLngBounds();
    let hasBounds = false;

    const currentCoordinate = getRenderableCoordinate(currentPosition?.lat, currentPosition?.lng);
    if (currentCoordinate) {
      bounds.extend(new kakao.maps.LatLng(currentCoordinate.lat, currentCoordinate.lng));
      hasBounds = true;
    }

    validMarkers.forEach(({ coordinate }) => {
      bounds.extend(new kakao.maps.LatLng(coordinate.lat, coordinate.lng));
      hasBounds = true;
    });

    if (fitMarkers && hasBounds && validMarkers.length > 0) {
      mapRef.current.setBounds(bounds);
      if (mapRef.current.getLevel() > 8) {
        mapRef.current.setLevel(8);
      }
    }
  }, [markers, currentPosition?.lat, currentPosition?.lng, status, onMarkerClick, fitMarkers]);

  useEffect(() => {
    if (status !== "ready" || !mapRef.current) return undefined;

    const { kakao } = window;

    if (currentPositionOverlayRef.current) {
      currentPositionOverlayRef.current.circle.setMap(null);
      currentPositionOverlayRef.current.marker.setMap(null);
      currentPositionOverlayRef.current = null;
    }

    const currentCoordinate = getRenderableCoordinate(currentPosition?.lat, currentPosition?.lng);
    if (!currentCoordinate) return undefined;

    const position = new kakao.maps.LatLng(currentCoordinate.lat, currentCoordinate.lng);
    const circle = new kakao.maps.Circle({
      center: position,
      radius: 45,
      strokeWeight: 2,
      strokeColor: "#2563eb",
      strokeOpacity: 0.9,
      strokeStyle: "solid",
      fillColor: "#3b82f6",
      fillOpacity: 0.25,
    });
    circle.setMap(mapRef.current);

    const marker = new kakao.maps.Marker({
      position,
      zIndex: 3,
    });
    marker.setMap(mapRef.current);

    currentPositionOverlayRef.current = { circle, marker };

    return () => {
      circle.setMap(null);
      marker.setMap(null);
      currentPositionOverlayRef.current = null;
    };
  }, [currentPosition?.lat, currentPosition?.lng, status]);

  useEffect(() => {
    if (status !== "ready" || !mapRef.current || selectedMarkerId == null) return;

    const place = markers.find((item) => item.id === selectedMarkerId || item.placeId === selectedMarkerId);
    const coordinate = getRenderableCoordinate(place?.lat, place?.lng);
    if (!coordinate) return;

    mapRef.current.panTo(new window.kakao.maps.LatLng(coordinate.lat, coordinate.lng));
  }, [selectedMarkerId, markers, status]);

  useEffect(() => {
    if (status !== "ready" || !mapRef.current) return undefined;

    const map = mapRef.current;
    const handleResize = () => map.relayout();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [status]);

  useEffect(() => {
    if (status !== "ready" || !mapRef.current || !onViewportChange) return undefined;

    const { kakao } = window;
    const map = mapRef.current;
    const emitViewport = () => {
      window.clearTimeout(viewportTimerRef.current);
      viewportTimerRef.current = window.setTimeout(() => {
        onViewportChange(getMapBoundsPayload(map));
      }, 300);
    };

    kakao.maps.event.addListener(map, "idle", emitViewport);
    emitViewport();

    return () => {
      window.clearTimeout(viewportTimerRef.current);
      kakao.maps.event.removeListener(map, "idle", emitViewport);
    };
  }, [status, onViewportChange]);

  useEffect(() => {
    if (status !== "ready" || !mapRef.current || !onMapClick) return undefined;

    const { kakao } = window;
    const handler = (mouseEvent) => {
      const latLng = mouseEvent.latLng;
      onMapClick({
        lat: latLng.getLat(),
        lng: latLng.getLng(),
      });
    };

    kakao.maps.event.addListener(mapRef.current, "click", handler);
    return () => kakao.maps.event.removeListener(mapRef.current, "click", handler);
  }, [status, onMapClick]);

  const handleLocate = useCallback(async () => {
    setLocating(true);
    setLocateError("");

    try {
      const next = await requestCurrentPosition();
      onCurrentPositionChange?.(next);

      if (mapRef.current && status === "ready") {
        const { kakao } = window;
        const latLng = new kakao.maps.LatLng(next.lat, next.lng);
        mapRef.current.panTo(latLng);
        mapRef.current.setLevel(3);
      }
    } catch (error) {
      setLocateError(getGeolocationErrorMessage(error));
    } finally {
      setLocating(false);
    }
  }, [onCurrentPositionChange, status]);

  if (status === "no-key") {
    return (
      <div className={`kakao-map-shell kakao-map-shell--fallback ${className}`} style={style}>
        <p>카카오맵 JavaScript 키가 필요합니다.</p>
        <small>VITE_KAKAO_MAP_APP_KEY를 .env에 추가한 뒤 dev 서버를 재시작해주세요.</small>
      </div>
    );
  }

  return (
    <div className={`kakao-map-shell ${pickLocationMode ? "is-pick-mode" : ""} ${className}`} style={style}>
      {pickLocationMode && <div className="kakao-map-pick-hint">지도를 탭하면 그 위치를 내 위치로 표시합니다.</div>}
      <div ref={containerRef} className="kakao-map-canvas" />
      {status === "loading" && <div className="kakao-map-overlay">지도를 불러오는 중...</div>}
      {status === "error" && (
        <div className="kakao-map-overlay kakao-map-overlay--error">
          <div>{errorMessage}</div>
          <small>
            카카오 개발자 콘솔 → 앱 → 플랫폼(Web)에 위 접속 주소를 등록하고, 앱 키의 JavaScript 키를 사용하세요.
          </small>
        </div>
      )}
      {showLocateButton && status === "ready" && (
        <button
          type="button"
          className="map-locate-button"
          onClick={handleLocate}
          disabled={locating}
          aria-label="내 위치로 이동"
          title="내 위치로 이동"
        >
          {locating ? "…" : "◎"}
        </button>
      )}
      {locateError && status === "ready" && (
        <div className="map-locate-toast" role="status">{locateError}</div>
      )}
    </div>
  );
}
