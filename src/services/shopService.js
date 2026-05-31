import { apiRequest } from "./apiClient.js";
import { getMockCertifiedStorePromotions } from "./promotionService.js";

const MOCK_SHOP_REVIEWS = {
  201: [
    { id: "shop_review_201_001", user: "Emma", rating: 5, text: "QR payment was easy and the owner was kind.", date: "2026.05.12" },
    { id: "shop_review_201_002", user: "여행자지수", rating: 4, text: "빈대떡이 바삭하고 시장 분위기가 좋아요.", date: "2026.05.10" },
  ],
  202: [
    { id: "shop_review_202_001", user: "Mina", rating: 5, text: "떡볶이 맵기 설명이 친절해서 좋았어요.", date: "2026.05.09" },
  ],
  203: [
    { id: "shop_review_203_001", user: "Leo", rating: 4, text: "호떡 냄새 따라갔다가 좋은 가게를 찾았어요.", date: "2026.05.08" },
  ],
  204: [
    { id: "shop_review_204_001", user: "여행자지수", rating: 5, text: "엽전 도시락 체험이 재밌었고 리뷰 작성도 쉬웠어요.", date: "2026.05.08" },
  ],
  205: [
    { id: "shop_review_205_001", user: "Noah", rating: 5, text: "따뜻한 빈대떡을 바로 먹을 수 있어서 좋았습니다.", date: "2026.05.20" },
  ],
};

function getShopId(shop) {
  return shop?.shopId ?? shop?.id;
}

function normalizeShop(shop = {}) {
  const shopId = getShopId(shop);
  const shopName = shop.shopName || shop.name || "춘배인증 상점";
  const marketName = shop.marketName || shop.placeName || shop.place?.name || "연결된 장소";

  return {
    ...shop,
    id: shopId,
    shopId,
    name: shopName,
    shopName,
    marketName,
    placeName: shop.placeName || marketName,
    menu: shop.menu || shop.mainMenu || "대표 메뉴 준비 중",
    benefit: shop.benefit || shop.event?.label || "현장 혜택 확인",
    acceptsYeopjeon: shop.acceptsYeopjeon ?? true,
    certified: shop.certified ?? shop.verified ?? true,
    reviewWritable: shop.reviewWritable ?? false,
    reviewId: shop.reviewId ?? null,
  };
}

export function getMockShopDetail(shop = {}) {
  const shopId = getShopId(shop);
  const promotion = getMockCertifiedStorePromotions().find(item => String(item.shopId) === String(shopId));
  return normalizeShop({
    ...promotion,
    ...shop,
    description: shop.description || promotion?.description,
    headline: shop.headline || promotion?.headline,
    imageUrl: shop.imageUrl || promotion?.imageUrl,
  });
}

export async function fetchShopDetail(shopId) {
  // TODO: 상점 상세 API 확정 필요. 현재 예상 경로로 연결 준비 후 실패 시 mock으로 대체합니다.
  const data = await apiRequest(`/shops/${shopId}`);
  return normalizeShop(data);
}

export function getMockShopReviews(shopId) {
  return MOCK_SHOP_REVIEWS[shopId] || [];
}

export async function fetchShopReviews(shopId) {
  // TODO: 상점 리뷰 조회 API 확정 필요. 결제한 사용자 리뷰 작성 가능 여부는 백엔드 응답에 포함되어야 합니다.
  const data = await apiRequest(`/shops/${shopId}/reviews?size=10`);
  return Array.isArray(data) ? data : data?.content || [];
}

export async function createShopReview({ shopId, paymentHistoryId, rating, content }) {
  // TODO: 리뷰 작성 API 확정 필요. paymentHistoryId로 실제 결제 기반 작성 권한을 검증해야 합니다.
  return apiRequest(`/shops/${shopId}/reviews`, {
    method: "POST",
    auth: true,
    role: "USER",
    body: { paymentHistoryId, rating, content },
  });
}
