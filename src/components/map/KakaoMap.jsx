import { useCallback, useEffect, useRef, useState } from "react";
import { getGeolocationErrorMessage, requestCurrentPosition } from "../../utils/geolocation.js";
import { getKakaoMapAppKey, loadKakaoMapSdk } from "../../utils/loadKakaoMapSdk.js";

export default function KakaoMap({
  center,
  currentPosition,
  markers = [],
  selectedMarkerId,
  onMarkerClick,
  onCurrentPositionChange,
  onMapClick,
  pickLocationMode = false,
  showLocateButton = false,
  level = 5,
  className = "",
  style,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerInstancesRef = useRef([]);
  const currentPositionOverlayRef = useRef(null);
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

        const lat = center?.lat ?? 37.5796;
        const lng = center?.lng ?? 126.977;
        const map = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(lat, lng),
          level,
        });

        mapRef.current = map;
        setStatus("ready");
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
    mapRef.current.setCenter(new kakao.maps.LatLng(center.lat, center.lng));
  }, [center?.lat, center?.lng, status]);

  useEffect(() => {
    if (status !== "ready" || !mapRef.current) return;

    const { kakao } = window;
    markerInstancesRef.current.forEach((marker) => marker.setMap(null));
    markerInstancesRef.current = [];

    const validMarkers = markers.filter((place) => place.lat != null && place.lng != null);
    validMarkers.forEach((place) => {
      const marker = new kakao.maps.Marker({
        map: mapRef.current,
        position: new kakao.maps.LatLng(place.lat, place.lng),
      });
      kakao.maps.event.addListener(marker, "click", () => onMarkerClick?.(place));
      markerInstancesRef.current.push(marker);
    });

    const bounds = new kakao.maps.LatLngBounds();
    let hasBounds = false;

    if (currentPosition?.lat != null && currentPosition?.lng != null) {
      bounds.extend(new kakao.maps.LatLng(currentPosition.lat, currentPosition.lng));
      hasBounds = true;
    }

    validMarkers.forEach((place) => {
      bounds.extend(new kakao.maps.LatLng(place.lat, place.lng));
      hasBounds = true;
    });

    if (hasBounds && validMarkers.length > 0) {
      mapRef.current.setBounds(bounds);
    }
  }, [markers, currentPosition?.lat, currentPosition?.lng, status, onMarkerClick]);

  useEffect(() => {
    if (status !== "ready" || !mapRef.current) return undefined;

    const { kakao } = window;

    if (currentPositionOverlayRef.current) {
      currentPositionOverlayRef.current.circle.setMap(null);
      currentPositionOverlayRef.current.marker.setMap(null);
      currentPositionOverlayRef.current = null;
    }

    if (currentPosition?.lat == null || currentPosition?.lng == null) return undefined;

    const position = new kakao.maps.LatLng(currentPosition.lat, currentPosition.lng);
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
    if (place?.lat == null || place?.lng == null) return;

    mapRef.current.panTo(new window.kakao.maps.LatLng(place.lat, place.lng));
  }, [selectedMarkerId, markers, status]);

  useEffect(() => {
    if (status !== "ready" || !mapRef.current) return undefined;

    const map = mapRef.current;
    const handleResize = () => map.relayout();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [status]);

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
