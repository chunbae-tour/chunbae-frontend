function buildKakaoDirectionUrl({ name, lat, lng }) {
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return `https://map.kakao.com/link/to/${encodeURIComponent(name || "목적지")},${lat},${lng}`;
  }
  return `https://map.kakao.com/?q=${encodeURIComponent(name || "목적지")}`;
}

export default function MapPreview({ name, address, latitude, longitude }) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lng);

  if (!hasCoordinates) return null;

  const openDirections = () => {
    window.open(buildKakaoDirectionUrl({ name, lat, lng }), "_blank", "noopener,noreferrer");
  };

  return (
    <div className="map-preview">
      <button type="button" className="map-thumb" onClick={openDirections} aria-label={`${name || "목적지"} 카카오맵으로 열기`}>
        <span className="map-preview-road road-one" />
        <span className="map-preview-road road-two" />
        <span className="map-preview-road road-three" />
        <span className="map-preview-pin" aria-hidden="true">📍</span>
        <span className="map-preview-address">{address || name || "위치 정보"}</span>
      </button>
      <button type="button" className="act-primary" onClick={openDirections}>
        카카오맵으로 길찾기
      </button>
      <p>외부 카카오맵 앱/웹으로 연결돼요.</p>
    </div>
  );
}
