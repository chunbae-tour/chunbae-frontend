import { useEffect, useState } from "react";
import { KakaoMap } from "../../components/map";
import { COLORS, S } from "../../constants/colors";
import { EmptyState, ErrorState } from "../../components/common";
import { getApiErrorHint } from "../../services/apiClient.js";
import { fetchDirectionLink, getDefaultLocation, normalizePlace } from "../../services/placeService.js";

export default function DirectionPage({ place, onBack }) {
  const [mode, setMode] = useState("transit");
  const [direction, setDirection] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
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
        setStatus("empty");
        setError("목적지 좌표 정보가 없습니다.");
        return;
      }

      setStatus("loading");
      setError("");

      try {
        const result = await fetchDirectionLink({
          originLat: origin.lat,
          originLng: origin.lng,
          destLat,
          destLng,
        });
        if (ignore) return;
        setDirection(result);
        setStatus(result.redirectUrl ? "success" : "empty");
      } catch (err) {
        if (ignore) return;
        setError(getApiErrorHint(err) || err.message || "길찾기 링크를 불러오지 못했습니다.");
        setStatus("error");
      }
    };

    if (!navigator.geolocation) {
      loadDirection(getDefaultLocation());
      return () => { ignore = true; };
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => loadDirection({ lat: coords.latitude, lng: coords.longitude }),
      () => loadDirection(getDefaultLocation()),
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 },
    );

    return () => { ignore = true; };
  }, [destLat, destLng]);

  const openMap = () => {
    const url = direction?.redirectUrl || fallbackKakaoUrl;
    window.open(url, "_blank");
  };

  // TODO: 이동수단별 소요시간/경로 요약 API가 확정되면 mock 요약을 실제 응답으로 교체합니다.
  const modes = [
    { key: "transit", label: "대중교통", icon: "🚌", time: "약 23분", desc: "지하철 1호선 → 도보 5분" },
    { key: "walk",    label: "도보",    icon: "🚶", time: "약 41분", desc: "도보 이동 3.2km" },
    { key: "car",     label: "자동차",  icon: "🚗", time: "약 15분", desc: "경복궁길 경유" },
  ];

  return (
    <div style={S.screen}>
      <div style={{ background: COLORS.primary, padding: "44px 16px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <span onClick={onBack} style={{ color: "#fff", fontSize: 20, cursor: "pointer" }}>←</span>
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>길찾기</span>
      </div>

      <div style={S.scrollArea}>
        {/* 출발 / 도착 */}
        <div style={{ background: "#fff", padding: 20, borderBottom: "0.5px solid rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: COLORS.green, border: `2px solid ${COLORS.green}` }} />
              <div style={{ width: 1.5, height: 28, background: "rgba(0,0,0,0.12)" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: COLORS.red }} />
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ background: COLORS.bg, borderRadius: 10, padding: "10px 14px", fontSize: 14, color: COLORS.textMuted }}>📍 내 현재 위치</div>
              <div style={{ background: COLORS.bg, borderRadius: 10, padding: "10px 14px", fontSize: 14, fontWeight: 700, color: COLORS.primary }}>{destination?.name || "목적지"}</div>
            </div>
          </div>
          <div style={{ fontSize: 14, color: COLORS.textMuted }}>📍 {destination?.addr || "목적지 주소 정보 없음"}</div>
        </div>

        <div className="direction-map-panel">
          <KakaoMap
            center={{ lat: fallbackDestLat, lng: fallbackDestLng }}
            markers={destination ? [destination] : []}
            level={4}
            style={{ height: 200 }}
          />
          <button type="button" className="direction-map-open" onClick={openMap}>
            🗺️ 카카오맵으로 열기
          </button>
        </div>

        {/* 이동수단 선택 */}
        <div style={{ padding: 16 }}>
          {status === "loading" && (
            <div style={{ background: "#fff", borderRadius: 14, padding: 14, color: COLORS.textMuted, fontSize: 14, marginBottom: 12 }}>
              길찾기 링크를 준비하는 중입니다.
            </div>
          )}
          {status === "error" && (
            <ErrorState
              title="길찾기 API 연결을 확인해주세요."
              description={`${error} 기본 카카오맵 링크로 연결할 수 있습니다.`}
              actionLabel="카카오맵으로 열기"
              onRetry={openMap}
            />
          )}
          {status === "empty" && (
            <EmptyState
              icon="길"
              title={destLat == null || destLng == null ? "목적지 좌표 정보가 없습니다." : "길찾기 링크가 없습니다."}
              description="기본 카카오맵 링크로 목적지를 열 수 있습니다."
              actionLabel="카카오맵으로 열기"
              onAction={openMap}
            />
          )}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {modes.map(m => (
              <div key={m.key} onClick={() => setMode(m.key)} style={{ flex: 1, background: mode === m.key ? COLORS.primary : "#fff", borderRadius: 12, padding: "10px 0", textAlign: "center", cursor: "pointer", border: `1.5px solid ${mode === m.key ? COLORS.primary : "rgba(0,0,0,0.08)"}` }}>
                <div style={{ fontSize: 20 }}>{m.icon}</div>
                <div style={{ fontSize: 14, color: mode === m.key ? "#fff" : COLORS.textMuted, fontWeight: 600, marginTop: 4 }}>{m.label}</div>
              </div>
            ))}
          </div>

          {/* 경로 요약 */}
          {modes.filter(m2 => m2.key === mode).map(m => (
            <div key={m.key} style={{ background: "#fff", borderRadius: 16, padding: 20, border: "0.5px solid rgba(0,0,0,0.06)", marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: COLORS.primary }}>{m.time}</span>
                <span style={{ fontSize: 14, background: COLORS.greenBg, color: COLORS.green, borderRadius: 20, padding: "4px 12px", fontWeight: 700 }}>최적경로</span>
              </div>
              <div style={{ fontSize: 14, color: COLORS.textMuted }}>{m.desc}</div>
            </div>
          ))}

          {/* 카카오맵 연결 버튼 */}
          <div onClick={openMap} style={{ background: "#FEE500", borderRadius: 14, padding: "15px 0", textAlign: "center", fontWeight: 700, fontSize: 15, cursor: "pointer", color: "#1A1A2E", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <span>🗺️</span> {direction?.provider ? `${direction.provider}으로 길찾기` : "카카오맵으로 길찾기"}
          </div>
          <div style={{ fontSize: 14, color: COLORS.textMuted, textAlign: "center", marginTop: 8 }}>카카오맵 앱에서 상세 경로를 확인하세요</div>
        </div>
      </div>
    </div>
  );
}
