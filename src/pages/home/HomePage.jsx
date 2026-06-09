import { useEffect, useState } from "react";
import { SkeletonList, StarRating } from "../../components/common/index.jsx";
import MascotEmpty from "../../assets/brand/mascot-empty.png";
import MascotLoading from "../../assets/brand/mascot-loading.png";
import YeopjeonImg from "../../assets/brand/yeopjeon-icon.png";
import CertifiedMark from "../../assets/brand/chunbae-certified-mark.svg";
import { getPlaceImageUrl } from "../../constants/placeImages.js";
import { getApiErrorHint } from "../../services/apiClient.js";
import { fetchFestivals } from "../../services/festivalService.js";
import { fetchNearbyTravelSpots, getDefaultLocation } from "../../services/placeService.js";
import { fetchCertifiedStorePromotions } from "../../services/promotionService.js";

const QUICK_ACTIONS = [
  { icon: "📍", label: "지도", desc: "근처 시장과 관광지 찾기", tab: "map" },
  { icon: "💬", label: "동행", desc: "같이 걸을 여행자 찾기", tab: "chat" },
  { image: YeopjeonImg, label: "엽전", desc: "충전하고 현장 QR 결제", tab: "pay" },
  { icon: "🎉", label: "축제", desc: "야시장과 지역 일정 보기", tab: "fest" },
];

const COURSE_STEPS = [
  { id: 1, title: "발견", desc: "지금 붐비는 입구와 가까운 골목을 먼저 고릅니다.", icon: "🧭" },
  { id: 2, title: "탐험", desc: "먹자골목과 포차거리 안쪽까지 현지인 코스로 걸어요.", icon: "🥘" },
  { id: 3, title: "기록", desc: "먹거리 포인트와 동행 후기를 남겨 다음 골목 힌트로 씁니다.", icon: "🏷️" },
];

const getPlaceVisualClass = (place) => {
  if (place.name?.includes("광장")) return "is-gwangjang";
  if (place.name?.includes("통인") || place.name?.includes("망원")) return "is-night-market";
  if (place.name?.includes("전주")) return "is-hanok";
  if (place.type === "전통시장") return "is-market";
  if (place.name?.includes("궁")) return "is-palace";
  return "is-local";
};

function StatusNotice({ status, type }) {
  if (status === "loading") {
    return (
      <div className="home-status neutral brand-status">
        <img src={MascotLoading} alt="" />
        <span>{type === "주변 장소" ? "춘배가 근처 장소를 찾는 중이에요!" : "춘배가 축제 소식을 모으고 있어요..."}</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="home-status brand-status">
        <img src={MascotEmpty} alt="" />
        <span>{type} 데이터를 불러오지 못했습니다. 백엔드 연결 상태를 확인해 주세요.</span>
      </div>
    );
  }

  if (status === "empty") {
    return (
      <div className="home-status brand-status">
        <img src={MascotEmpty} alt="" />
        <span>{type} 응답이 비어 있습니다.</span>
      </div>
    );
  }

  return null;
}

function CharacterEmptyState({ title, description }) {
  return (
    <div className="home-empty-state">
      <img src={MascotEmpty} alt="" />
      <strong>{title}</strong>
      <span>{description}</span>
    </div>
  );
}

export default function HomePage({ onPlaceClick, onShopClick, onFestClick, onTab, user }) {
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [nearbyStatus, setNearbyStatus] = useState("loading");
  const [festivals, setFestivals] = useState([]);
  const [festivalStatus, setFestivalStatus] = useState("loading");
  const [promotions, setPromotions] = useState([]);
  const [promotionIndex, setPromotionIndex] = useState(0);
  const [promotionStatus, setPromotionStatus] = useState("loading");
  const [promotionErrorMessage, setPromotionErrorMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    const loadNearbyPlaces = async ({ lat, lng }) => {
      setNearbyStatus("loading");

      try {
        const places = await fetchNearbyTravelSpots({ lat, lng, size: 10 });
        if (ignore) return;

        setNearbyPlaces(places.length > 0 ? places : []);
        setNearbyStatus(places.length > 0 ? "success" : "empty");
      } catch (error) {
        if (ignore) return;
        setNearbyPlaces([]);
        setNearbyStatus("error");
      }
    };

    if (!navigator.geolocation) {
      loadNearbyPlaces(getDefaultLocation());
      return () => { ignore = true; };
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => loadNearbyPlaces({ lat: coords.latitude, lng: coords.longitude }),
      () => loadNearbyPlaces(getDefaultLocation()),
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 },
    );

    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    let ignore = false;
    setPromotionStatus("loading");

    fetchCertifiedStorePromotions()
      .then((items) => {
        if (ignore) return;
        setPromotions(items);
        setPromotionStatus(items.length > 0 ? "success" : "empty");
      })
      .catch((error) => {
        if (ignore) return;
        setPromotions([]);
        setPromotionErrorMessage(getApiErrorHint(error));
        setPromotionStatus("error");
      });

    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    if (promotions.length <= 1) return undefined;

    const timer = setInterval(() => {
      setPromotionIndex((current) => (current + 1) % promotions.length);
    }, 4500);

    return () => clearInterval(timer);
  }, [promotions.length]);

  const activePromotion = promotions[promotionIndex] ?? promotions[0];
  const openActivePromotion = () => {
    if (!activePromotion) {
      onTab("map");
      return;
    }

    onShopClick?.({
      ...activePromotion,
      id: activePromotion.shopId,
      name: activePromotion.shopName,
      imageUrl: activePromotion.imageUrl || activePromotion.thumbnailUrl,
      placeName: activePromotion.marketName || activePromotion.placeName,
    });
  };

  useEffect(() => {
    let ignore = false;

    const loadFestivals = async () => {
      setFestivalStatus("loading");

      try {
        const items = await fetchFestivals();
        if (ignore) return;

        setFestivals(items);
        setFestivalStatus(items.length > 0 ? "success" : "empty");
      } catch (error) {
        if (ignore) return;
        setFestivals([]);
        setFestivalStatus("error");
      }
    };

    loadFestivals();

    return () => { ignore = true; };
  }, []);

  return (
    <div className="home-page">
      <section className="home-search-strip">
        {/* TODO: 광고 검색 API가 확정되면 광고/이벤트/장소 통합 검색 응답으로 연결합니다. */}
        <button type="button" className="home-ad-top-search" onClick={() => onTab("search")}>
          🔍 광고 가게, 이벤트, 골목 키워드 검색
        </button>
      </section>

      <section className="home-hero">
        <div className="home-hero-inner">
          <div className="home-hero-copy">
            <div className="home-hero-ad-area">
              <button type="button" className="home-hero-main-ad" onClick={openActivePromotion}>
                <span>{promotionStatus === "error" ? "광고 API 확인 필요" : "춘배인증 광고"}</span>
                <strong>
                  {promotionStatus === "error"
                    ? "광고 데이터를 불러오지 못했어요"
                    : activePromotion?.shopName ?? "등록된 인증 광고가 없습니다"}
                </strong>
                <p>
                  {promotionStatus === "error"
                    ? promotionErrorMessage
                    : activePromotion?.headline ?? "인증 가게 광고가 등록되면 이곳에 표시됩니다."}
                </p>
                {activePromotion?.benefit && <em>{activePromotion.benefit}</em>}
                <small>
                  <img src={CertifiedMark} alt="" />
                  {promotionStatus === "error"
                    ? "백엔드 연결 상태 확인"
                    : activePromotion?.marketName
                      ? `${activePromotion.marketName} · 현장 QR 가능`
                      : "실제 광고 응답 대기"}
                </small>
              </button>
              {promotions.length > 1 && (
              <div className="home-hero-promo-control">
                <div className="home-hero-promo-dots" aria-label="메인 광고 넘기기">
                  {promotions.map((promotion, index) => (
                    <button
                      key={promotion.id}
                      type="button"
                      className={index === promotionIndex ? "active" : ""}
                      onClick={() => setPromotionIndex(index)}
                      aria-label={`${promotion.shopName} 광고 보기`}
                    />
                  ))}
                </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="home-main-grid">
        <main className="home-column">
          <section className="home-panel home-quick-panel home-core-panel">
            <div className="home-section-head">
              <h2>주요 기능</h2>
            </div>
            <div className="home-quick-grid">
              {QUICK_ACTIONS.map((action) => (
                <button key={action.tab} type="button" className="home-quick-item" onClick={() => onTab(action.tab)}>
                  <span>{action.image ? <img src={action.image} alt="" /> : action.icon}</span>
                  <strong>{action.label}</strong>
                  <small>{action.desc}</small>
                </button>
              ))}
            </div>
          </section>

          <section className="home-panel home-course-panel home-recommend-panel">
            <div className="home-course-hero">
              <div>
                <span className="home-course-kicker">오늘의 추천</span>
                <h2>오늘 걷기 좋은 로컬 코스</h2>
                <p>장소, 먹거리, 동행으로 이어지는 오늘의 대표 코스만 먼저 보여드릴게요.</p>
              </div>
              <img src={MascotEmpty} alt="" />
            </div>
            <button type="button" className="home-feature-route-card" onClick={() => onTab("map")}>
              <span className="home-price-tag">오늘 19:00 추천</span>
              <div>
                <strong>근처 골목 탐험</strong>
                <p>시장 입구 → 먹거리 골목 → 산책 포인트 → 쉬어가는 장소</p>
              </div>
              <ul>
                <li>도보 1.2km</li>
                <li>예상 90분</li>
                <li>리뷰 428</li>
              </ul>
              <span className="home-route-cta">현지인 코스 따라가기</span>
            </button>
            <div className="home-route-list is-featured-route">
              {COURSE_STEPS.map((step) => (
                <div key={step.id}>
                  <span>{step.icon}</span>
                  <strong>{step.title}</strong>
                  <small>{step.desc}</small>
                </div>
              ))}
            </div>
            <div className="home-course-actions">
              <button type="button" onClick={() => onTab("map")}>지도에서 보기</button>
              <button type="button" onClick={() => onTab("chat")}>같이 걸을 동행</button>
            </div>
          </section>

          <section className="home-panel home-nearby-panel">
            <div className="home-section-head">
              <h2>추천 장소</h2>
              <button type="button" className="home-section-more" onClick={() => onTab("map")}>시장 지도 보기</button>
            </div>
            <StatusNotice status={nearbyStatus} type="주변 장소" />
            {nearbyStatus === "loading" ? (
              <div className="home-place-grid">
                <SkeletonList count={4} variant="card" />
              </div>
            ) : nearbyPlaces.length === 0 ? (
              <CharacterEmptyState title="춘배가 시장을 찾고 있어요" description="잠시 후 주변 장소를 다시 확인해 주세요." />
            ) : (
              <div className="home-place-grid">
                {nearbyPlaces.slice(0, 5).map((place) => (
                <button key={place.id} type="button" className="home-place-card" onClick={() => onPlaceClick({ ...place, imageUrl: getPlaceImageUrl(place) })}>
                  <div className={`home-place-image ${getPlaceVisualClass(place)}`}>
                    {getPlaceImageUrl(place) && <img src={getPlaceImageUrl(place)} alt="" />}
                    <small>{place.type}</small>
                  </div>
                  <div className="home-place-body">
                    <div className="home-place-title">{place.name}</div>
                    <div className="home-service-meta">
                      <span>평균 {place.dist}</span>
                      <span>리뷰 {place.reviews}</span>
                    </div>
                    <div className="home-card-meta">
                      <span>{place.dist}</span>
                      <StarRating rating={place.rating} />
                    </div>
                  </div>
                </button>
                ))}
              </div>
            )}
          </section>
        </main>

        <aside className="home-aside">
          <section className="home-panel">            <div className="home-section-head">
              <h2>🎉 밤에 더 좋은 골목 일정</h2>
              <button type="button" className="home-section-more" onClick={() => onTab("fest")}>야시장 일정</button>
            </div>
            <StatusNotice status={festivalStatus} type="축제" />
            {festivalStatus === "loading" ? (
              <SkeletonList count={3} />
            ) : festivals.length === 0 ? (
              <CharacterEmptyState title="아직 축제 소식이 없어요" description="춘배가 새 일정을 찾으면 바로 알려드릴게요." />
            ) : (
              <div className="home-festival-list">
                {festivals.slice(0, 3).map((festival) => (
                <button key={festival.id} type="button" className="home-festival-card" onClick={() => onFestClick(festival)}>
                  <div className="home-festival-image" style={{ background: festival.color }}>
                    <span>🎏</span>
                  </div>
                  <div className="home-date-badge" style={{ background: festival.color }}>
                    <small>{festival.month}</small>
                    <strong style={{ color: festival.accentColor }}>{festival.day}</strong>
                  </div>
                  <div>
                    <div className="home-festival-title">{festival.name}</div>
                    <div className="home-card-meta">
                      <span>📍 {festival.location}</span>
                      <span>{festival.date}</span>
                    </div>
                  </div>
                  <span className="home-dday">{festival.dday}</span>
                </button>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
