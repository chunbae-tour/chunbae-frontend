import { MOCK_PLACES } from "../constants/mockData.js";
import { ApiClientError, apiRequest, getPageContent } from "./apiClient.js";

const DEFAULT_LOCATION = { lat: 37.5796, lng: 126.977 };

const MOCK_PLACE_REVIEWS = [
  { id: 1, user: "여행자A", rating: 5, text: "정말 좋았어요! 꼭 다시 오고 싶네요.", date: "2025.05.10" },
  { id: 2, user: "Emma", rating: 4, text: "Great place! Highly recommended for tourists.", date: "2025.05.08" },
];

const MOCK_NEARBY_STORES = [
  { id: 201, shopId: 201, name: "영호네 포장마차", shopName: "영호네 포장마차", marketName: "광장시장", menu: "녹두 빈대떡", benefit: "춘배투어 손님 막걸리 1잔 할인", verified: true, acceptsYeopjeon: true },
  { id: 205, shopId: 205, name: "순희네 빈대떡", shopName: "순희네 빈대떡", marketName: "광장시장", menu: "빈대떡 세트", benefit: "포장 주문 100엽전 할인", verified: true, acceptsYeopjeon: true },
];

class PlaceApiError extends Error {
  constructor(message, code, status) {
    super(message);
    this.name = "PlaceApiError";
    this.code = code;
    this.status = status;
  }
}

function formatDistance(distanceMeters) {
  if (distanceMeters == null || Number.isNaN(Number(distanceMeters))) return null;
  const meters = Number(distanceMeters);
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export function normalizePlace(place = {}) {
  const id = place.placeId ?? place.id;
  const latitude = place.latitude ?? place.lat ?? null;
  const longitude = place.longitude ?? place.lng ?? null;
  const distanceText = place.distanceText ?? place.dist ?? formatDistance(place.distanceMeters ?? place.distance);
  const targetType = place.targetType ?? "PLACE";

  return {
    ...place,
    id,
    placeId: id,
    targetType,
    latitude,
    longitude,
    lat: latitude,
    lng: longitude,
    name: place.name ?? "",
    type: place.type ?? (targetType === "TRADITIONAL_MARKET" ? "전통시장" : "관광지"),
    dist: distanceText ?? "주변",
    rating: place.rating ?? 0,
    reviews: place.reviewCount ?? place.reviews ?? 0,
    emoji: place.emoji ?? (targetType === "TRADITIONAL_MARKET" ? "🛍️" : "📍"),
    addr: place.address ?? place.addr ?? "",
    hours: place.operatingHours ?? place.hours ?? "",
    desc: place.description ?? place.desc ?? "",
    isLiked: Boolean(place.isLiked),
    imageUrl: place.imageUrl ?? place.thumbnailUrl ?? "",
    imageUrls: place.imageUrls ?? [],
  };
}

function normalizePlaceList(data) {
  if (Array.isArray(data)) return data.map(normalizePlace);

  const list = getPageContent(data?.places || data?.markets ? { content: data.places ?? data.markets } : data);
  return Array.isArray(list) ? list.map(normalizePlace) : [];
}

export function getDefaultLocation() {
  return DEFAULT_LOCATION;
}

export function getMockPlaces() {
  return MOCK_PLACES.map(normalizePlace);
}

export function getMockPlaceReviews() {
  return MOCK_PLACE_REVIEWS;
}

export function getMockNearbyStores() {
  return MOCK_NEARBY_STORES;
}

export async function fetchNearbyPlaces({ lat, lng, radius = 3000, page = 0, size = 20 }) {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    radius: String(radius),
    page: String(page),
    size: String(size),
  });
  const data = await apiRequest(`/places/nearby?${params.toString()}`);
  return normalizePlaceList(data);
}

export async function fetchPlaces({ keyword = "", category = "", cursor, size = 20 } = {}) {
  const params = new URLSearchParams({ size: String(size) });
  if (keyword) params.set("keyword", keyword);
  if (category) params.set("category", category);
  if (cursor) params.set("cursor", cursor);
  const data = await apiRequest(`/places?${params.toString()}`);
  return normalizePlaceList(data);
}

export async function fetchNearbyTraditionalMarkets({ lat, lng, radius = 3000, page = 0, size = 20 }) {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    radius: String(radius),
    page: String(page),
    size: String(size),
  });
  const data = await apiRequest(`/traditional-markets/nearby?${params.toString()}`);
  return normalizePlaceList(data).map(market => ({
    ...market,
    targetType: "TRADITIONAL_MARKET",
    type: "전통시장",
    rating: market.rating ?? 0,
    reviews: market.reviews ?? 0,
  }));
}

export async function fetchNearbyTravelSpots({ lat, lng, radius = 3000, page = 0, size = 20 }) {
  const [placesResult, marketsResult] = await Promise.allSettled([
    fetchNearbyPlaces({ lat, lng, radius, page, size }),
    fetchNearbyTraditionalMarkets({ lat, lng, radius, page, size }),
  ]);

  if (placesResult.status === "rejected" && marketsResult.status === "rejected") {
    throw placesResult.reason;
  }

  const places = placesResult.status === "fulfilled" ? placesResult.value : [];
  const markets = marketsResult.status === "fulfilled" ? marketsResult.value : [];

  return [...places, ...markets]
    .sort((a, b) => {
      const aDistance = Number(a.distanceMeters ?? a.distance ?? Number.POSITIVE_INFINITY);
      const bDistance = Number(b.distanceMeters ?? b.distance ?? Number.POSITIVE_INFINITY);
      if (aDistance !== bDistance) return aDistance - bDistance;
      return String(a.name).localeCompare(String(b.name), "ko");
    })
    .slice(0, size);
}

export async function fetchNearbyTravelSpotsWithLikes({ lat, lng, radius = 3000, page = 0, size = 20 }) {
  // 장소 목록과 찜 목록을 병렬로 가져오기
  const [spotsResult, likesResult] = await Promise.allSettled([
    fetchNearbyTravelSpots({ lat, lng, radius, page, size }),
    apiRequest("/users/me/likes?size=100", { auth: true }).catch(() => ({ content: [] })),
  ]);

  const spots = spotsResult.status === "fulfilled" ? spotsResult.value : [];

  if (likesResult.status === "fulfilled") {
    const likedPlaceIds = new Set(
      getPageContent(likesResult.value).map(item => item.placeId ?? item.id)
    );

    return spots.map(spot => ({
      ...spot,
      isLiked: likedPlaceIds.has(spot.placeId ?? spot.id),
    }));
  }

  return spots;
}

export async function fetchPlaceDetail(placeId) {
  if (!placeId) {
    throw new PlaceApiError("장소 식별자가 없습니다.", "PLACE_ID_MISSING");
  }

  const data = await apiRequest(`/places/${placeId}`);
  return normalizePlace(data);
}

export async function fetchPlaceReviews(placeId) {
  if (!placeId) return [];

  const data = await apiRequest(`/places/${placeId}/reviews?size=10`);
  return getPageContent(data).map(review => ({
    id: review.reviewId ?? review.id,
    user: review.nickname ?? review.user ?? "여행자",
    rating: review.rating ?? 0,
    text: review.content ?? review.text ?? "",
    date: review.createdAt ?? review.date ?? "",
  }));
}

export async function fetchNearbyStores(placeId) {
  if (!placeId) return [];

  const data = await apiRequest(`/places/${placeId}/nearby-shops?radius=1000`);
  return (Array.isArray(data) ? data : getPageContent(data)).map(shop => ({
    ...shop,
    id: shop.shopId ?? shop.id,
    name: shop.name ?? shop.shopName ?? "",
    shopName: shop.shopName ?? shop.name ?? "",
    marketName: shop.marketName ?? shop.market ?? "",
    menu: shop.menu ?? shop.mainMenu ?? "",
    benefit: shop.benefit ?? "",
    acceptsYeopjeon: Boolean(shop.acceptsYeopjeon ?? shop.qrPayEnabled),
    verified: Boolean(shop.isCertified ?? shop.verified),
  }));
}

export async function fetchNearbyPlacesByPlace(placeId, { radius = 1000, size = 10 } = {}) {
  if (!placeId) return [];

  const params = new URLSearchParams({ radius: String(radius), size: String(size) });
  const data = await apiRequest(`/places/${placeId}/nearby-places?${params.toString()}`);
  return normalizePlaceList(data);
}

export async function fetchPlaceRecommendations(placeId, { size = 10 } = {}) {
  if (!placeId) return [];

  const data = await apiRequest(`/places/${placeId}/recommend?size=${size}`);
  return normalizePlaceList(data);
}

export async function addPlaceLike(placeId) {
  await apiRequest(`/places/${placeId}/like`, { method: "POST", auth: true });
}

export async function removePlaceLike(placeId) {
  await apiRequest(`/places/${placeId}/like`, { method: "DELETE", auth: true });
}

export async function addMarketLike(marketId) {
  void marketId;
  throw new ApiClientError("전통시장 찜 API는 현재 OpenAPI 명세에 없습니다.", "MARKET_LIKE_API_MISSING", 501);
}

export async function removeMarketLike(marketId) {
  void marketId;
  throw new ApiClientError("전통시장 찜 API는 현재 OpenAPI 명세에 없습니다.", "MARKET_LIKE_API_MISSING", 501);
}

export async function fetchDirectionLink({ originLat, originLng, destLat, destLng }) {
  if (originLat == null || originLng == null || destLat == null || destLng == null) {
    throw new PlaceApiError("길찾기에 필요한 좌표가 부족합니다.", "DIRECTION_COORDS_MISSING");
  }

  const params = new URLSearchParams({
    originLat: String(originLat),
    originLng: String(originLng),
    destLat: String(destLat),
    destLng: String(destLng),
  });
  const data = await apiRequest(`/directions?${params.toString()}`);

  return {
    provider: data.provider,
    redirectUrl: data.redirectUrl,
  };
}
