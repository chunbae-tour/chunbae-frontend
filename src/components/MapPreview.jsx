function buildKakaoDirectionUrl({ name, lat, lng }) {
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return `https://map.kakao.com/link/to/${encodeURIComponent(name || "목적지")},${lat},${lng}`;
  }
  return `https://map.kakao.com/?q=${encodeURIComponent(name || "목적지")}`;
}

function MapPinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21s7-5.1 7-11a7 7 0 0 0-14 0c0 5.9 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.2" />
    </svg>
  );
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
      <button type="button" className="community-static-map map-preview-static-map" onClick={openDirections} aria-label={`${name || "목적지"} 카카오맵으로 열기`}>
        <span className="community-map-road road-one" />
        <span className="community-map-road road-two" />
        <span className="community-map-block block-one" />
        <span className="community-map-block block-two" />
        <span className="community-map-pin" aria-hidden="true"><MapPinIcon /></span>
        <span className="community-map-caption">
          <strong>{address || name || "위치 정보"}</strong>
        </span>
        <span className="community-map-expand">지도 크게 보기 ↗</span>
      </button>
      <button type="button" className="act-primary" onClick={openDirections}>
        카카오맵으로 길찾기
      </button>
      <p>외부 카카오맵 앱/웹으로 연결돼요.</p>
    </div>
  );
}
