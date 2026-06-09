import { apiRequest } from "./apiClient.js";

function getShopId(shop) {
  return shop?.shopId ?? shop?.id;
}

function normalizeShop(shop = {}) {
  const shopId = getShopId(shop);
  const shopName = shop.shopName || shop.name || "춘배인증 상점";
  const marketName = shop.marketName || shop.placeName || shop.place?.name || "연결된 장소";
  const rawMenus = shop.menus ?? shop.menuResponses ?? shop.menuList ?? shop.shopMenus ?? [];
  const menus = Array.isArray(rawMenus) ? rawMenus.map(menu => ({
    id: menu.menuId ?? menu.id,
    name: menu.name ?? menu.menuName ?? "메뉴",
    price: Number(menu.price ?? 0),
    description: menu.description ?? menu.desc ?? "",
    available: menu.available ?? menu.isAvailable ?? menu.status !== "SOLD_OUT",
    imageUrl: menu.imageUrl ?? menu.thumbnailUrl ?? "",
  })) : [];
  const rawNotices = shop.notices ?? shop.noticeResponses ?? shop.noticeList ?? shop.shopNotices ?? [];
  const notices = Array.isArray(rawNotices) ? rawNotices.map(notice => ({
    id: notice.noticeId ?? notice.id,
    title: notice.title ?? notice.subject ?? "가게 공지",
    content: notice.content ?? notice.message ?? "",
    createdAt: notice.createdAt ?? notice.createdDate ?? notice.date ?? "",
  })) : [];
  const mainMenu = shop.menu || shop.mainMenu || shop.representativeMenu || menus.find(menu => menu.available !== false)?.name || "";

  return {
    ...shop,
    id: shopId,
    shopId,
    name: shopName,
    shopName,
    marketName,
    placeName: shop.placeName || marketName,
    menu: mainMenu,
    menus,
    notices,
    benefit: shop.benefit || shop.event?.label || "현장 혜택 확인",
    acceptsYeopjeon: shop.acceptsYeopjeon ?? true,
    certified: shop.certified ?? shop.verified ?? true,
    reviewWritable: shop.reviewWritable ?? false,
    reviewId: shop.reviewId ?? null,
  };
}

export async function fetchShopDetail(shopId) {
  const data = await apiRequest(`/shops/${shopId}`);
  return normalizeShop(data);
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
