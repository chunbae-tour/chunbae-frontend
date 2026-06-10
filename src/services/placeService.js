import { ApiClientError, apiRequest, getPageContent } from "./apiClient.js";

const DEFAULT_LOCATION = { lat: 37.5796, lng: 126.977 };

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

function normalizeImageUrls(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value !== "string" || !value.trim()) return [];

  const trimmed = value.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch {
    // 백엔드가 JSON 문자열이 아닌 단일 URL/콤마 문자열로 내려주는 경우도 방어합니다.
  }

  return trimmed
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);
}

function normalizeCoordinate(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function normalizePlace(place = {}) {
  const id = place.placeId ?? place.id;
  const latitude = normalizeCoordinate(place.latitude ?? place.lat);
  const longitude = normalizeCoordinate(place.longitude ?? place.lng);
  const distanceText = place.distanceText ?? place.dist ?? formatDistance(place.distanceMeters ?? place.distance);
  const category = place.category ?? place.categoryName;
  const targetType = place.targetType ?? (category === "TRADITIONAL_MARKET" ? "TRADITIONAL_MARKET" : "PLACE");
  const isMarket = targetType === "TRADITIONAL_MARKET" || category === "TRADITIONAL_MARKET";
  const imageUrls = normalizeImageUrls(place.imageUrls);
  const imageUrl = place.imageUrl ?? place.thumbnailUrl ?? imageUrls[0] ?? "";
  const name = place.name ?? place.placeName ?? "";
  const address = place.address ?? place.addr ?? place.roadAddressName ?? place.addressName ?? "";
  const description = place.description ?? place.desc ?? place.categoryName ?? "";
  const rawType = place.type;
  const displayType = rawType && !["TOURIST_SPOT", "TRADITIONAL_MARKET"].includes(rawType)
    ? rawType
    : isMarket
      ? "전통시장"
      : "관광지";

  return {
    ...place,
    id,
    placeId: id,
    targetType,
    latitude,
    longitude,
    lat: latitude,
    lng: longitude,
    name,
    type: displayType,
    dist: distanceText ?? "주변",
    rating: place.rating ?? 0,
    reviews: place.reviewCount ?? place.reviews ?? 0,
    emoji: place.emoji ?? (isMarket ? "🛍️" : "📍"),
    addr: address,
    hours: place.operatingHours ?? place.hours ?? "",
    desc: description,
    isLiked: Boolean(place.isLiked),
    placeUrl: place.placeUrl,
    externalUrl: place.externalUrl ?? place.placeUrl,
    imageUrl,
    thumbnailUrl: place.thumbnailUrl ?? imageUrl,
    imageUrls,
  };
}

function getPlaceItems(data) {
  if (Array.isArray(data)) return data;

  return data?.markers
    ?? data?.places
    ?? data?.markets
    ?? data?.content
    ?? data?.items
    ?? data?.list
    ?? [];
}

function normalizePlaceList(data) {
  const list = getPlaceItems(data);
  return Array.isArray(list) ? list.map(normalizePlace) : [];
}

export function getDefaultLocation() {
  return DEFAULT_LOCATION;
}

export async function fetchMapMarkers({ swLat, swLng, neLat, neLng }) {
  const params = new URLSearchParams({
    swLat: String(swLat),
    swLng: String(swLng),
    neLat: String(neLat),
    neLng: String(neLng),
  });
  const data = await apiRequest(`/places/map-markers?${params.toString()}`);

  return {
    markers: normalizePlaceList(data),
    truncated: Boolean(data?.truncated),
    limit: data?.limit ?? 500,
  };
}

export async function fetchNearbyPlaces({ lat, lng, radius = 3000, cursor, cursorDistance, size = 20 }) {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    radius: String(radius),
    size: String(size),
  });
  if (cursor != null && cursorDistance != null) {
    params.set("cursor", String(cursor));
    params.set("cursorDistance", String(cursorDistance));
  }
  const data = await apiRequest(`/places/nearby?${params.toString()}`);
  return normalizePlaceList(data);
}

export async function fetchPlaces({ keyword = "", category = "", region = "", cursor, cursorRating, size = 20 } = {}) {
  const params = new URLSearchParams({ size: String(size) });
  if (keyword) params.set("keyword", keyword);
  if (category) params.set("category", category);
  if (region) params.set("region", region);
  if (cursor != null && cursorRating != null) {
    params.set("cursor", String(cursor));
    params.set("cursorRating", String(cursorRating));
  }
  const data = await apiRequest(`/places?${params.toString()}`);
  return normalizePlaceList(data);
}

export async function geocodeAddress(query) {
  const normalizedQuery = String(query || "").trim();
  if (normalizedQuery.length < 2) {
    throw new ApiClientError("주소는 2자 이상 입력해주세요.", "GEOCODING_QUERY_TOO_SHORT", 400);
  }

  const params = new URLSearchParams({ query: normalizedQuery });
  const data = await apiRequest(`/places/geocoding?${params.toString()}`);
  return {
    addressName: data.addressName ?? normalizedQuery,
    lat: normalizeCoordinate(data.lat),
    lng: normalizeCoordinate(data.lng),
  };
}

export async function fetchRegionByCoordinate({ lat, lng }) {
  const latitude = normalizeCoordinate(lat);
  const longitude = normalizeCoordinate(lng);
  if (latitude == null || longitude == null) {
    throw new ApiClientError("지역 조회에 필요한 좌표가 부족합니다.", "REGION_COORDS_MISSING", 400);
  }

  const params = new URLSearchParams({
    lat: String(latitude),
    lng: String(longitude),
  });
  const data = await apiRequest(`/places/region?${params.toString()}`);
  return {
    depth1: data.depth1 ?? "",
    depth2: data.depth2 ?? "",
    depth3: data.depth3 ?? "",
    fullAddress: data.fullAddress ?? [data.depth1, data.depth2, data.depth3].filter(Boolean).join(" "),
  };
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

export async function fetchNearbyTravelSpots({ lat, lng, radius = 3000, cursor, cursorDistance, page, size = 20 }) {
  void page;
  const [placesResult, marketsResult] = await Promise.allSettled([
    fetchNearbyPlaces({ lat, lng, radius, cursor, cursorDistance, size }),
    fetchNearbyTraditionalMarkets({ lat, lng, radius, page: 0, size }),
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

export async function fetchNearbyTravelSpotsWithLikes({ lat, lng, radius = 3000, cursor, cursorDistance, page, size = 20 }) {
  // 장소 목록과 찜 목록을 병렬로 가져오기
  const [spotsResult, likesResult] = await Promise.allSettled([
    fetchNearbyTravelSpots({ lat, lng, radius, cursor, cursorDistance, page, size }),
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

  const data = await apiRequest(`/places/${placeId}/nearby-shops?limit=5`);
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

export async function fetchNearbyPlacesByPlace(placeId, { category = "RESTAURANT", radius = 1000, size = 10 } = {}) {
  if (!placeId) return [];
  void size;

  const params = new URLSearchParams({ category, radius: String(radius) });
  const data = await apiRequest(`/places/${placeId}/nearby-places?${params.toString()}`);
  return normalizePlaceList(Array.isArray(data?.items) ? data.items : getPageContent(data));
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
