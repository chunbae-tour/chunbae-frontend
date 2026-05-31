import { apiRequest, getPageContent } from "./apiClient.js";

const MOCK_CERTIFIED_PROMOTIONS = [
  {
    id: "promo_001",
    adType: "CERTIFIED_STORE",
    status: "ACTIVE",
    displayOrder: 1,
    shopId: 201,
    placeId: 2,
    targetType: "SHOP",
    shopName: "영호네 포장마차",
    marketName: "광장시장",
    headline: "빈대떡 냄새 따라오면 만나는 골목집",
    description: "녹두 빈대떡과 막걸리 세트를 엽전으로 바로 결제할 수 있어요.",
    benefit: "춘배투어 손님 막걸리 1잔 할인",
    menu: "녹두 빈대떡",
    distanceText: "도보 8분",
    openText: "오늘 23:00까지",
    imageTone: "bindaetteok",
    certified: true,
    acceptsYeopjeon: true,
    event: { type: "COUPON", label: "막걸리 1잔 할인", expiresAt: "2026-06-30" },
  },
  {
    id: "promo_002",
    adType: "CERTIFIED_STORE",
    status: "ACTIVE",
    displayOrder: 2,
    shopId: 202,
    placeId: 2,
    targetType: "SHOP",
    shopName: "순희네 분식",
    marketName: "광장시장",
    headline: "떡볶이와 순대가 같이 나오는 시장 간식 코스",
    description: "외국어 메뉴판과 QR 엽전 결제를 준비한 춘배인증 상점입니다.",
    benefit: "떡볶이 세트 100엽전 쿠폰",
    menu: "떡볶이 세트",
    distanceText: "도보 12분",
    openText: "저녁 피크 전 추천",
    imageTone: "tteokbokki",
    certified: true,
    acceptsYeopjeon: true,
    event: { type: "COUPON", label: "100엽전 쿠폰", expiresAt: "2026-06-15" },
  },
  {
    id: "promo_003",
    adType: "CERTIFIED_STORE",
    status: "ACTIVE",
    displayOrder: 3,
    shopId: 203,
    placeId: 4,
    targetType: "SHOP",
    shopName: "서촌 호떡방앗간",
    marketName: "통인시장",
    headline: "엽전 도시락 뒤에 들르기 좋은 달콤한 마무리",
    description: "뜨거운 꿀호떡을 들고 서촌 골목을 천천히 걸어보세요.",
    benefit: "호떡 2개 구매 시 스탬프 적립",
    menu: "꿀호떡",
    distanceText: "도보 5분",
    openText: "오후 간식 추천",
    imageTone: "hotteok",
    certified: true,
    acceptsYeopjeon: true,
    event: { type: "STAMP", label: "스탬프 적립", expiresAt: "2026-07-01" },
  },
];

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

export function getMockCertifiedStorePromotions() {
  return MOCK_CERTIFIED_PROMOTIONS.map(normalizeCertifiedStorePromotion);
}
