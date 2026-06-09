import { apiRequest, getPageContent } from "./apiClient.js";

export function normalizeCertifiedStorePromotion(item = {}) {
  const id = item.promotionId ?? item.adId ?? item.id;
  const shopId = item.shopId ?? item.storeId;

  return {
    ...item,
    id,
    shopId,
    placeId: item.placeId ?? item.marketId,
    adType: item.adType ?? "CERTIFIED_STORE",
    targetType: item.targetType ?? "SHOP",
    status: item.status ?? "ACTIVE",
    displayOrder: item.displayOrder ?? 0,
    shopName: item.shopName ?? item.storeName ?? item.name ?? "춘배인증 상점",
    marketName: item.marketName ?? item.placeName ?? "",
    headline: item.headline ?? item.title ?? "",
    description: item.description ?? item.summary ?? "",
    benefit: item.benefit ?? item.couponLabel ?? "",
    imageUrl: item.imageUrl ?? item.bannerImageUrl ?? "",
    certified: item.certified ?? item.isCertified ?? true,
    acceptsYeopjeon: item.acceptsYeopjeon ?? item.canPayWithYeopjeon ?? true,
    event: item.event ?? null,
  };
}

export async function fetchCertifiedStorePromotions() {
  // TODO: 춘배인증 상점 홍보/추천 API 최종 경로 확정 필요.
  // 후보 필드: promotionId, shopId, shopName, marketName, headline, description, benefit, imageUrl, displayOrder, startAt, endAt, status.
  const data = await apiRequest("/promotions/certified-stores?status=ACTIVE&size=5");
  return getPageContent(data)
    .map(normalizeCertifiedStorePromotion)
    .filter((item) => item.status === "ACTIVE")
    .sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0));
}
