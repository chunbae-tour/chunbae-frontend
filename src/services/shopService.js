import { ApiClientError, apiRequest } from "./apiClient.js";

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
  // TODO: 백엔드 상점 리뷰 조회 API가 생기면 실제 호출로 교체합니다.
  void shopId;
  return [];
}

export async function createShopReview({ shopId, paymentHistoryId, rating, content }) {
  // TODO: 백엔드 상점 리뷰 작성 API가 생기면 실제 호출로 교체합니다.
  throw new ApiClientError(
    "상점 리뷰 API가 아직 백엔드에 없습니다. 결제 기반 상점 리뷰 작성은 백엔드 협의가 필요합니다.",
    "SHOP_REVIEW_API_MISSING",
    501,
    { shopId, paymentHistoryId, rating, content }
  );
}
