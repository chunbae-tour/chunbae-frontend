import { getMockPlaces } from "./placeService.js";
import { apiRequest, getPageContent } from "./apiClient.js";

const MOCK_MY_REVIEWS = [
  { id: 1, place: "광장시장", emoji: "🛍️", rating: 5, text: "정말 맛있었어요! 빈대떡 강추!", date: "2025.05.10", likes: 12 },
  { id: 2, place: "경복궁", emoji: "🏯", rating: 4, text: "역사적인 장소라 분위기가 너무 좋았어요.", date: "2025.04.28", likes: 7 },
  { id: 3, place: "통인시장", emoji: "🐟", rating: 5, text: "엽전 도시락 체험 강추! 외국인 친구들이 너무 좋아했어요.", date: "2025.04.15", likes: 23 },
];

const MOCK_OWNED_ITEMS = [
  { id: 1, name: "빈대떡 세트 1,000엽전 쿠폰", shop: "순희네 빈대떡", market: "광장시장", expires: "2026.06.30", status: "사용 가능" },
  { id: 2, name: "호떡 1개 교환권", shop: "서촌 호떡방앗간", market: "통인시장", expires: "2026.06.12", status: "사용 가능" },
  { id: 3, name: "엽전 도시락 할인권", shop: "도시락 카페", market: "통인시장", expires: "2026.05.31", status: "곧 만료" },
];

export async function fetchWishlist() {
  const data = await apiRequest("/users/me/likes?size=20", { auth: true });
  return getPageContent(data).map(item => ({
    ...item,
    id: item.placeId ?? item.id,
    placeId: item.placeId ?? item.id,
    name: item.name ?? "",
    type: item.category ?? item.type ?? "관광지",
    rating: item.rating ?? 0,
    emoji: item.emoji ?? "📍",
    addr: item.address ?? item.addr ?? "",
  }));
}

export async function removeWishlistItem(placeId) {
  await apiRequest(`/places/${placeId}/like`, { method: "DELETE", auth: true });
  return { placeId };
}

export async function fetchMyReviews() {
  const data = await apiRequest("/users/me/reviews?size=20", { auth: true });
  return getPageContent(data).map(review => ({
    id: review.reviewId ?? review.id,
    place: review.placeName ?? review.place ?? "",
    emoji: review.emoji ?? "📍",
    rating: review.rating ?? 0,
    text: review.content ?? review.text ?? "",
    date: review.createdAt ?? review.date ?? "",
    likes: review.likeCount ?? review.likes ?? 0,
  }));
}

export async function fetchOwnedItems() {
  // TODO: 보유 아이템 API 경로/응답 확정 필요. 현재는 사용자 보유 상품 후보 경로로 연결 준비합니다.
  const data = await apiRequest("/users/me/items?size=20", { auth: true });
  return getPageContent(data).map(item => ({
    ...item,
    id: item.ownedItemId ?? item.itemId ?? item.id,
    name: item.name ?? item.productName ?? item.title ?? "",
    shop: item.shopName ?? item.shop ?? "",
    market: item.marketName ?? item.market ?? "",
    expires: item.expiresAt ?? item.expireAt ?? item.expires ?? "",
    status: item.statusLabel ?? item.status ?? "사용 가능",
  }));
}

export function getMockWishlist() {
  return getMockPlaces().slice(0, 3);
}

export function getMockMyReviews() {
  return MOCK_MY_REVIEWS;
}

export function getMockOwnedItems() {
  return MOCK_OWNED_ITEMS;
}
