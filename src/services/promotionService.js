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
  // TODO: 백엔드에 인증 상점 프로모션 조회 API가 생기면 실제 호출로 교체합니다.
  // 후보 필드: promotionId, shopId, shopName, marketName, headline, description, benefit, imageUrl, displayOrder, startAt, endAt, status.
  return [];
}
