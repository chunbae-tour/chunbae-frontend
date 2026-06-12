import { useEffect, useMemo, useState } from "react";
import { SkeletonList, StarRating } from "../../components/common/index.jsx";
import YeopjeonImg from "../../assets/brand/yeopjeon-icon.png";
import { getPlaceImageUrl } from "../../constants/placeImages.js";
import { fetchFestivals } from "../../services/festivalService.js";
import { fetchNearbyTravelSpots, getDefaultLocation } from "../../services/placeService.js";
import { fetchCertifiedStorePromotions } from "../../services/promotionService.js";

const QUICK_ACTIONS = [
  { icon: "🗺️", tone: "green", label: "지도", desc: "근처 시장·관광지 찾기", tab: "map" },
  { icon: "👥", tone: "blue", label: "동행", desc: "같이 걸을 여행자 찾기", tab: "community" },
  { image: YeopjeonImg, tone: "yellow", label: "엽전", desc: "충전 & QR 결제", tab: "pay" },
  { icon: "🎉", tone: "pink", label: "축제", desc: "야시장 & 지역 일정", tab: "fest" },
];

const FALLBACK_SHOPS = [
  { id: "mock-shop-1", tag: "강추", tagTone: "green", name: "통인시장 기름떡볶이", location: "통인시장", rating: 4.8, visual: "shop-warm" },
  { id: "mock-shop-2", tag: "전통시장", tagTone: "yellow", name: "광장시장 빈대떡 골목", location: "광장시장", rating: 4.7, visual: "shop-night" },
  { id: "mock-shop-3", tag: "강추", tagTone: "green", name: "망원시장 로컬 간식", location: "망원시장", rating: 4.6, visual: "shop-local" },
];

const FALLBACK_PLACES = [
  { id: "mock-place-1", tag: "관광지", tagTone: "blue", name: "경복궁", location: "종로구", rating: 4.9, visual: "place-palace" },
  { id: "mock-place-2", tag: "전통시장", tagTone: "yellow", name: "통인시장", location: "서촌", rating: 4.6, visual: "place-market" },
  { id: "mock-place-3", tag: "관광지", tagTone: "blue", name: "북촌 한옥마을", location: "종로구", rating: 4.7, visual: "place-hanok" },
];

function getFestivalStatus(festival = {}) {
  const raw = String(festival.dday || festival.progressStatus || "").trim();
  if (!raw || raw === "ONGOING") return "진행 중";
  return raw;
}

function getFestivalMonthDay(festival = {}) {
  const month = String(festival.month || "").replace("월", "") || "--";
  const day = String(festival.day || "").padStart(2, "0") || "--";
  return { month, day };
}

function RecommendationCard({ item, onClick }) {
  return (
    <button type="button" className="home-recommend-card" onClick={onClick}>
      <div className={`home-recommend-visual ${item.visual || ""}`}>
        {item.imageUrl && <img src={item.imageUrl} alt="" />}
      </div>
      <div className="home-recommend-body">
        <span className={`home-recommend-tag ${item.tagTone || "green"}`}>{item.tag}</span>
        <strong>{item.name}</strong>
        <small>{item.location || "위치 확인"} · <span className="star-score">★ {item.rating || 4.7}</span></small>
      </div>
    </button>
  );
}

function RecommendationSection({ title, moreLabel, onMore, items, onItemClick }) {
  return (
    <section className="home-landing-section">
      <div className="home-landing-section-head">
        <h2>{title}</h2>
        <button type="button" onClick={onMore}>{moreLabel}</button>
      </div>
      <div className="home-recommend-scroll">
        {items.map((item) => (
          <RecommendationCard key={item.id ?? item.name} item={item} onClick={() => onItemClick(item)} />
        ))}
      </div>
    </section>
  );
}

export default function HomePage({ onPlaceClick, onShopClick, onFestClick, onTab, onSignup, user }) {
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [nearbyStatus, setNearbyStatus] = useState("loading");
  const [festivals, setFestivals] = useState([]);
  const [festivalStatus, setFestivalStatus] = useState("loading");
  const [promotions, setPromotions] = useState([]);
  const isLoggedIn = Boolean(user);

  useEffect(() => {
    let ignore = false;

    const loadNearbyPlaces = async ({ lat, lng }) => {
      setNearbyStatus("loading");
      try {
        const places = await fetchNearbyTravelSpots({ lat, lng, size: 10 });
        if (ignore) return;
        setNearbyPlaces(places);
        setNearbyStatus(places.length > 0 ? "success" : "empty");
      } catch {
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

    fetchCertifiedStorePromotions()
      .then((items) => {
        if (ignore) return;
        setPromotions(items);
      })
      .catch(() => {
        if (ignore) return;
        setPromotions([]);
      });

    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadFestivals = async () => {
      setFestivalStatus("loading");
      try {
        const items = await fetchFestivals();
        if (ignore) return;
        setFestivals(items);
        setFestivalStatus(items.length > 0 ? "success" : "empty");
      } catch {
        if (ignore) return;
        setFestivals([]);
        setFestivalStatus("error");
      }
    };

    loadFestivals();
    return () => { ignore = true; };
  }, []);

  const shopRecommendations = useMemo(() => {
    if (promotions.length === 0) return FALLBACK_SHOPS;

    return promotions.slice(0, 8).map((shop) => ({
      ...shop,
      tag: "강추",
      tagTone: "green",
      name: shop.shopName,
      location: shop.marketName || "춘배인증 상점",
      rating: shop.rating || 4.8,
      visual: "shop-warm",
    }));
  }, [promotions]);

  const placeRecommendations = useMemo(() => {
    if (nearbyPlaces.length === 0) return FALLBACK_PLACES;

    return nearbyPlaces.slice(0, 8).map((place) => ({
      ...place,
      tag: place.type === "전통시장" ? "전통시장" : "관광지",
      tagTone: place.type === "전통시장" ? "yellow" : "blue",
      name: place.name,
      location: place.addr || place.address || place.dist,
      rating: place.rating || 4.6,
      imageUrl: getPlaceImageUrl(place),
      visual: place.type === "전통시장" ? "place-market" : "place-palace",
    }));
  }, [nearbyPlaces]);

  const stats = [
    { label: "등록 시장 수", value: `${Math.max(nearbyPlaces.filter(place => place.type === "전통시장").length, 128)}+` },
    { label: "동행 완료 수", value: "340+" },
    { label: "진행 중 축제 수", value: `${Math.max(festivals.length, 12)}개` },
  ];

  const handlePrimaryCta = () => {
    if (isLoggedIn) {
      onTab("map");
      return;
    }
    onSignup?.();
  };

  const handleShopClick = (item) => {
    if (item.shopId) {
      onShopClick?.({
        ...item,
        id: item.shopId,
        name: item.name,
        placeName: item.location,
      });
      return;
    }
    onTab("store");
  };

  const handlePlaceClick = (item) => {
    if (String(item.id || "").startsWith("mock-")) {
      onTab("map");
      return;
    }
    onPlaceClick?.({ ...item, imageUrl: item.imageUrl || getPlaceImageUrl(item) });
  };

  return (
    <div className="home-page home-landing">
      <section className="home-landing-hero">
        <div className="home-landing-hero-copy">
          <span className="home-landing-badge">춘배투어 · 전통시장 여행 플랫폼</span>
          <h1>전통시장을 <mark>춘배</mark>와 함께 여행해요</h1>
          <p>동행 찾기, 엽전 결제, 지역 축제까지 전통시장 여행의 모든 것</p>
          <div className="home-landing-actions">
            <button type="button" className="primary" onClick={handlePrimaryCta}>
              {isLoggedIn ? "내 여행 시작하기" : "지금 시작하기"}
            </button>
            <button type="button" className="ghost" onClick={() => onTab("map")}>둘러보기</button>
          </div>
        </div>
        <div className="home-landing-stats">
          {stats.map((stat) => (
            <div key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="home-landing-search" aria-label="검색">
        <button type="button" className="home-landing-search-field" onClick={() => onTab("search")}>
          <span>🔍</span>
          <strong>시장, 가게, 골목 키워드 검색</strong>
        </button>
        <button type="button" className="home-location-button" onClick={() => onTab("map")} aria-label="현재 위치 기반 검색">
          📍
        </button>
      </section>

      <section className="home-landing-section">
        <div className="home-landing-section-head">
          <h2>주요 기능</h2>
          <span>춘배투어에서 바로 할 수 있어요</span>
        </div>
        <div className="home-feature-grid">
          {QUICK_ACTIONS.map((action) => (
            <button key={action.tab} type="button" className={`home-feature-card ${action.tone}`} onClick={() => onTab(action.tab)}>
              <span>{action.image ? <img src={action.image} alt="" /> : action.icon}</span>
              <strong>{action.label}</strong>
              <small>{action.desc}</small>
            </button>
          ))}
        </div>
      </section>

      <RecommendationSection
        title="🎯 춘배 추천 가게"
        moreLabel="더보기 >"
        onMore={() => onTab("store")}
        items={shopRecommendations}
        onItemClick={handleShopClick}
      />

      <RecommendationSection
        title="춘배 추천 관광지"
        moreLabel="더보기 >"
        onMore={() => onTab("map")}
        items={placeRecommendations}
        onItemClick={handlePlaceClick}
      />

      <section className="home-landing-section">
        <div className="home-landing-section-head">
          <h2>진행 중인 축제 일정</h2>
          <button type="button" onClick={() => onTab("fest")}>전체 보기 &gt;</button>
        </div>
        {festivalStatus === "loading" && <SkeletonList count={3} />}
        {festivalStatus === "error" && <div className="home-landing-empty">축제 일정을 불러오지 못했습니다.</div>}
        {festivalStatus === "empty" && <div className="home-landing-empty">진행 중인 축제 일정이 아직 없습니다.</div>}
        {festivalStatus === "success" && (
          <div className="home-festival-schedule">
            {festivals.slice(0, 4).map((festival) => {
              const { month, day } = getFestivalMonthDay(festival);
              return (
                <button key={festival.id} type="button" className="home-festival-schedule-card" onClick={() => onFestClick(festival)}>
                  <div className="home-festival-date-block">
                    <span>{month}월</span>
                    <strong>{day}</strong>
                  </div>
                  <div>
                    <strong>{festival.name}</strong>
                    <small>{festival.location || festival.address || "위치 확인"}</small>
                  </div>
                  <em>{getFestivalStatus(festival)}</em>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {!isLoggedIn && (
        <section className="home-signup-banner">
          <span>무료 회원가입</span>
          <strong>엽전 500냥 받고 첫 여행 시작하기</strong>
          <p>가입하면 바로 엽전이 지급돼요</p>
          <button type="button" onClick={onSignup}>가입하기 →</button>
        </section>
      )}
    </div>
  );
}
