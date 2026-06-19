import { useEffect, useState } from "react";
import { KakaoMap } from "../../components/map";
import { COLORS, S } from "../../constants/colors";
import {
  fetchDirectionLink,
  getDefaultLocation,
  normalizePlace,
} from "../../services/placeService.js";

export default function DirectionPage({ place, onBack }) {
  const [direction, setDirection] = useState(null);
  const destination = place ? normalizePlace(place) : null;
  const destLat = destination?.lat;
  const destLng = destination?.lng;

  const fallbackDestLat = destLat || 37.5704;
  const fallbackDestLng = destLng || 126.9831;
  const fallbackKakaoUrl = `https://map.kakao.com/link/to/${encodeURIComponent(destination?.name || "목적지")},${fallbackDestLat},${fallbackDestLng}`;

  useEffect(() => {
    let ignore = false;

    const loadDirection = async (origin) => {
      if (destLat == null || destLng == null) {
        return;
      }

      try {
        const result = await fetchDirectionLink({
          originLat: origin.lat,
          originLng: origin.lng,
          destLat,
          destLng,
        });
        if (ignore) return;
        setDirection(result);
      } catch {
        // API 링크를 불러오지 못해도 기본 카카오맵 URL을 사용합니다.
      }
    };

    if (!navigator.geolocation) {
      loadDirection(getDefaultLocation());
      return () => {
        ignore = true;
      };
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => loadDirection({ lat: coords.latitude, lng: coords.longitude }),
      () => loadDirection(getDefaultLocation()),
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 },
    );

    return () => {
      ignore = true;
    };
  }, [destLat, destLng]);

  const openMap = () => {
    const url = direction?.redirectUrl || fallbackKakaoUrl;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div style={S.screen}>
      <div
        style={{
          background: COLORS.primary,
          padding: "44px 16px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span onClick={onBack} style={{ color: "#fff", fontSize: 20, cursor: "pointer" }}>
          ←
        </span>
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>길찾기</span>
      </div>

      <div style={S.scrollArea}>
        {/* 출발 / 도착 */}
        <div
          style={{ background: "#fff", padding: 20, borderBottom: "0.5px solid rgba(0,0,0,0.06)" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: COLORS.green,
                  border: `2px solid ${COLORS.green}`,
                }}
              />
              <div style={{ width: 1.5, height: 28, background: "rgba(0,0,0,0.12)" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: COLORS.red }} />
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
              <div
                style={{
                  background: COLORS.bg,
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: 14,
                  color: COLORS.textMuted,
                }}
              >
                📍 내 현재 위치
              </div>
              <div
                style={{
                  background: COLORS.bg,
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: 14,
                  fontWeight: 700,
                  color: COLORS.primary,
                }}
              >
                {destination?.name || "목적지"}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 14, color: COLORS.textMuted }}>
            📍 {destination?.addr || "목적지 주소 정보 없음"}
          </div>
        </div>

        <div className="direction-map-panel">
          <KakaoMap
            center={{ lat: fallbackDestLat, lng: fallbackDestLng }}
            markers={destination ? [destination] : []}
            level={4}
            style={{ height: 200 }}
          />
        </div>

        <div style={{ padding: 16 }}>
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 20,
              border: "0.5px solid rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                fontSize: 14,
                color: COLORS.textMuted,
                textAlign: "center",
                marginBottom: 16,
              }}
            >
              상세 소요시간과 경로는 카카오맵에서 확인할 수 있습니다.
            </div>
            <button
              type="button"
              onClick={openMap}
              style={{
                width: "100%",
                border: 0,
                background: "#FEE500",
                borderRadius: 14,
                padding: "15px 0",
                textAlign: "center",
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
                color: "#1A1A2E",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <span aria-hidden="true">🗺️</span> 카카오맵으로 길찾기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
