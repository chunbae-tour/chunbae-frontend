import { MOCK_PLACES } from "../constants/mockData.js";
import { apiRequest, getPageContent } from "./apiClient.js";

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

export function normalizePlace(place = {}) {
  const id = place.placeId ?? place.id;
  const latitude = place.latitude ?? place.lat ?? null;
  const longitude = place.longitude ?? place.lng ?? null;

  return {
    ...place,
    id,
    placeId: id,
    latitude,
    longitude,
    lat: latitude,
    lng: longitude,
    name: place.name ?? "",
    type: place.type ?? "관광지",
    dist: place.dist ?? place.distanceText ?? "주변",
    rating: place.rating ?? 0,
    reviews: place.reviewCount ?? place.reviews ?? 0,
    emoji: place.emoji ?? "📍",
    addr: place.address ?? place.addr ?? "",
    hours: place.operatingHours ?? place.hours ?? "",
    desc: place.description ?? place.desc ?? "",
    isLiked: Boolean(place.isLiked),
    imageUrls: place.imageUrls ?? [],
  };
}

function normalizePlaceList(data) {
  if (Array.isArray(data)) return data.map(normalizePlace);

  // TODO: /places/nearby 응답이 커서 객체라면 data.items/data.content 중 실제 필드로 확정해 정리합니다.
  const list = getPageContent(data?.places ? { content: data.places } : data);
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

export async function fetchNearbyPlaces({ lat, lng, radius = 3000, size = 20 }) {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    radius: String(radius),
    size: String(size),
  });
  const data = await apiRequest(`/places/nearby?${params.toString()}`);
  return normalizePlaceList(data);
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
