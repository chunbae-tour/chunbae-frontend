import { apiFormRequest, apiRequest, getPageContent } from "./apiClient.js";
import { getStoredAuthSession } from "./authService.js";

function getStoredMerchantShopId() {
  const session = getStoredAuthSession("MERCHANT");
  return session?.shopId ?? null;
}

async function resolveMerchantShopId(shopId) {
  if (shopId) return shopId;

  const storedShopId = getStoredMerchantShopId();
  if (storedShopId) return storedShopId;

  const data = await apiRequest("/merchants/me/shops", { auth: true, role: "MERCHANT" });
  const shops = Array.isArray(data) ? data : getPageContent(data);
  const firstShop = shops[0];
  const firstShopId = firstShop?.id ?? firstShop?.shopId;

  if (!firstShopId) {
    throw new Error("상인 가게 정보가 없습니다.");
  }

  return firstShopId;
}

export const MOCK_MERCHANT_SHOP = {
  id: 1,
  name: "영호네 포장마차",
  market: "광장시장",
  address: "광장시장 내 B동 123호",
  operatingHours: "09:00 ~ 22:00",
  holiday: "매주 일요일",
  rating: 4.8,
  reviewCount: 56,
  verified: true,
  status: "ACTIVE",
};

export const MOCK_MERCHANT_WALLET = {
  balance: 150000,
  pendingSettlement: 50000,
  totalEarned: 1500000,
};

export const MOCK_MENUS = [
  { id: 1, name: "빈대떡", nameEn: "Bindaetteok", price: 5000, available: true, desc: "국내산 녹두로 만든 전통 빈대떡" },
  { id: 2, name: "막걸리", nameEn: "Makgeolli", price: 3000, available: true, desc: "직접 담근 전통 막걸리" },
  { id: 3, name: "마약김밥", nameEn: "Mayak Gimbap", price: 3000, available: false, desc: "참기름 가득한 한입 김밥" },
  { id: 4, name: "순대", nameEn: "Sundae", price: 4000, available: true, desc: "당면과 선지로 만든 순대" },
];

export const MOCK_SETTLEMENTS = [
  { id: 1, date: "2025.05.15", amount: 45000, status: "정산완료" },
  { id: 2, date: "2025.05.14", amount: 32000, status: "정산완료" },
  { id: 3, date: "2025.05.13", amount: 58000, status: "정산완료" },
];

export const MOCK_PAYMENT_REQUESTS = [
  {
    id: "pay_req_001",
    customerName: "Emma",
    amount: 1200,
    menuName: "녹두 빈대떡",
    memo: "녹두 빈대떡",
    status: "PENDING_CONFIRM",
    requestedAt: "방금",
  },
  {
    id: "pay_req_002",
    customerName: "여행자지수",
    amount: 900,
    menuName: "떡볶이 세트",
    memo: "덜 맵게 부탁드려요",
    status: "PENDING_CONFIRM",
    requestedAt: "2분 전",
  },
];

export const MOCK_SHOP_NOTICES = [
  { id: 1, title: "오늘 영업 안내", content: "오후 10시까지 정상 영업합니다.", createdAt: "2026.06.01" },
];

export function normalizeMenu(menu = {}) {
  return {
    id: menu.menuId ?? menu.id,
    name: menu.name ?? "메뉴",
    nameEn: menu.nameEn ?? menu.englishName ?? "",
    price: Number(menu.price ?? 0),
    available: menu.available ?? menu.isAvailable ?? menu.status !== "SOLD_OUT",
    desc: menu.description ?? menu.desc ?? "",
    imageUrl: menu.imageUrl,
  };
}

export function normalizeSettlement(item = {}) {
  return {
    id: item.settlementId ?? item.id,
    date: item.createdAt ?? item.requestedAt ?? item.settledAt ?? item.date ?? "",
    amount: Number(item.amount ?? 0),
    status: item.status ?? "정산요청",
  };
}

export function normalizeShopNotice(item = {}) {
  return {
    id: item.noticeId ?? item.id,
    title: item.title ?? item.subject ?? "가게 공지",
    content: item.content ?? item.message ?? item.description ?? "",
    createdAt: item.createdAt ?? item.createdDate ?? item.date ?? "",
  };
}

export function normalizePaymentRequest(item = {}) {
  const menuItems = Array.isArray(item.menuItems) ? item.menuItems : [];
  const menuSummary = menuItems
    .map((menu) => `${menu.name ?? "메뉴"}${menu.quantity ? ` x${menu.quantity}` : ""}`)
    .join(", ");

  return {
    id: item.payRequestId ?? item.paymentRequestId ?? item.requestId ?? item.id,
    shopId: item.shopId ?? item.shop?.id ?? item.shop?.shopId,
    customerName: item.customerName ?? item.nickname ?? item.userName ?? "여행자",
    amount: Number(item.amount ?? item.totalAmount ?? 0),
    menuName: item.menuName ?? item.productName ?? menuSummary,
    memo: item.memo ?? item.description ?? "",
    status: item.status ?? "PENDING_CONFIRM",
    requestedAt: item.requestedAt ?? item.createdAt ?? "",
    expiredAt: item.expiredAt ?? "",
  };
}

export function normalizeShop(data = {}) {
  return {
    ...MOCK_MERCHANT_SHOP,
    ...data,
    id: data.shopId ?? data.id ?? MOCK_MERCHANT_SHOP.id,
    name: data.name ?? data.shopName ?? MOCK_MERCHANT_SHOP.name,
    category: data.category ?? MOCK_MERCHANT_SHOP.category,
    market: data.marketName ?? data.market ?? MOCK_MERCHANT_SHOP.market,
    address: data.address ?? MOCK_MERCHANT_SHOP.address,
    phone: data.phone ?? MOCK_MERCHANT_SHOP.phone,
    description: data.description ?? MOCK_MERCHANT_SHOP.description,
    operatingHours: data.operatingHours ?? MOCK_MERCHANT_SHOP.operatingHours,
    holiday: data.closedDays ?? data.holiday ?? MOCK_MERCHANT_SHOP.holiday,
    rating: Number(data.rating ?? MOCK_MERCHANT_SHOP.rating),
    reviewCount: Number(data.reviewCount ?? MOCK_MERCHANT_SHOP.reviewCount),
    verified: data.verified ?? data.isVerified ?? MOCK_MERCHANT_SHOP.verified,
    status: data.status ?? MOCK_MERCHANT_SHOP.status,
    imageUrls: data.imageUrls ?? data.images ?? [],
    thumbnailUrl: data.thumbnailUrl ?? data.imageUrl,
    notices: Array.isArray(data.notices) ? data.notices.map(normalizeShopNotice) : undefined,
    menus: Array.isArray(data.menus) ? data.menus.map(normalizeMenu) : undefined,
  };
}

export async function fetchMerchantShops() {
  const data = await apiRequest("/merchants/me/shops", { auth: true, role: "MERCHANT" });
  const shops = Array.isArray(data) ? data : getPageContent(data);
  return shops.map(normalizeShop);
}

export async function fetchMerchantShop(shopId) {
  const resolvedShopId = await resolveMerchantShopId(shopId);
  const data = await apiRequest(`/merchants/me/shops/${resolvedShopId}`, { auth: true, role: "MERCHANT" });
  return normalizeShop(data);
}

export async function updateMerchantShop(shopId, payload) {
  const resolvedShopId = await resolveMerchantShopId(shopId);
  const data = await apiRequest(`/merchants/me/shops/${resolvedShopId}`, {
    method: "PATCH",
    auth: true,
    role: "MERCHANT",
    body: {
      shopName: payload.name,
      category: payload.category,
      address: payload.address,
      phone: payload.phone,
      description: payload.description,
      operatingHours: payload.operatingHours,
      closedDays: payload.holiday,
    },
  });
  return normalizeShop(data);
}

export async function uploadMerchantShopImage(shopId, file) {
  const resolvedShopId = await resolveMerchantShopId(shopId);
  const formData = new FormData();
  formData.append("file", file);
  const data = await apiFormRequest(`/merchants/me/shops/${resolvedShopId}/images`, {
    method: "POST",
    auth: true,
    role: "MERCHANT",
    formData,
  });
  return normalizeShop(data);
}

export async function updateMerchantShopStatus(shopId, nextStatus) {
  const resolvedShopId = await resolveMerchantShopId(shopId);
  const data = await apiRequest(`/merchants/me/shops/${resolvedShopId}/status`, {
    method: "PATCH",
    auth: true,
    role: "MERCHANT",
    body: { status: nextStatus },
  });
  return normalizeShop(data);
}

export async function fetchMerchantShopNotices(shopId) {
  const resolvedShopId = await resolveMerchantShopId(shopId);
  const data = await apiRequest(`/merchants/me/shops/${resolvedShopId}/notices`, { auth: true, role: "MERCHANT" });
  return getPageContent(data).map(normalizeShopNotice);
}

export async function addMerchantShopNotice(shopId, payload) {
  const resolvedShopId = await resolveMerchantShopId(shopId);
  const data = await apiRequest(`/merchants/me/shops/${resolvedShopId}/notices`, {
    method: "POST",
    auth: true,
    role: "MERCHANT",
    body: {
      title: payload.title,
      content: payload.content,
    },
  });
  return normalizeShopNotice(data);
}

export async function deleteMerchantShopNotice(shopId, noticeId) {
  const resolvedShopId = await resolveMerchantShopId(shopId);
  return apiRequest(`/merchants/me/shops/${resolvedShopId}/notices/${noticeId}`, {
    method: "DELETE",
    auth: true,
    role: "MERCHANT",
  });
}

export async function fetchMerchantWallet(shopId) {
  const resolvedShopId = await resolveMerchantShopId(shopId);
  const data = await apiRequest(`/merchants/me/shops/${resolvedShopId}/wallet`, { auth: true, role: "MERCHANT" });
  return {
    shopId: data.shopId ?? resolvedShopId,
    balance: Number(data.balance ?? data.currentBalance ?? 0),
    pendingSettlement: Number(data.pendingSettlement ?? 0),
    totalEarned: Number(data.totalEarned ?? 0),
  };
}

export async function addMerchantMenu(payload, shopId) {
  const resolvedShopId = await resolveMerchantShopId(shopId);
  const data = await apiRequest(`/merchants/me/shops/${resolvedShopId}/menus`, {
    method: "POST",
    auth: true,
    role: "MERCHANT",
    body: {
      name: payload.name,
      price: Number(payload.price),
      description: payload.desc || "",
      imageUrl: payload.imageUrl || "",
    },
  });
  return normalizeMenu(data);
}

export async function updateMerchantMenu(menuId, payload, shopId) {
  const resolvedShopId = await resolveMerchantShopId(shopId);
  const data = await apiRequest(`/merchants/me/shops/${resolvedShopId}/menus/${menuId}`, {
    method: "PATCH",
    auth: true,
    role: "MERCHANT",
    body: {
      name: payload.name,
      price: payload.price == null ? undefined : Number(payload.price),
      description: payload.desc ?? payload.description,
      imageUrl: payload.imageUrl,
      isAvailable: payload.available ?? payload.isAvailable,
    },
  });
  return normalizeMenu(data);
}

export async function deleteMerchantMenu(menuId, shopId) {
  const resolvedShopId = await resolveMerchantShopId(shopId);
  return apiRequest(`/merchants/me/shops/${resolvedShopId}/menus/${menuId}`, {
    method: "DELETE",
    auth: true,
    role: "MERCHANT",
  });
}

export async function fetchMerchantSettlements(shopId) {
  const resolvedShopId = await resolveMerchantShopId(shopId);
  const data = await apiRequest(`/merchants/me/shops/${resolvedShopId}/settlements?size=20`, { auth: true, role: "MERCHANT" });
  return getPageContent(data).map(normalizeSettlement);
}

export async function requestMerchantSettlement(amount, shopId) {
  const resolvedShopId = await resolveMerchantShopId(shopId);
  return apiRequest(`/merchants/me/shops/${resolvedShopId}/settlements`, {
    method: "POST",
    auth: true,
    role: "MERCHANT",
    body: amount == null ? undefined : { amount: Number(amount) },
  });
}

export async function fetchMerchantPaymentRequests(shopId) {
  const data = await apiRequest("/merchants/me/qr-payments/pending", { auth: true, role: "MERCHANT" });
  const list = Array.isArray(data) ? data : getPageContent(data);
  const normalized = list.map(normalizePaymentRequest);
  if (!shopId) return normalized;
  return normalized.filter((item) => !item.shopId || String(item.shopId) === String(shopId));
}

export async function approveMerchantPaymentRequest(requestId) {
  return apiRequest(`/payments/qr/${requestId}/confirm`, {
    method: "PATCH",
    auth: true,
    role: "MERCHANT",
    body: { action: "APPROVE" },
  });
}

export async function rejectMerchantPaymentRequest(requestId, rejectReason = "상인 거절") {
  return apiRequest(`/payments/qr/${requestId}/confirm`, {
    method: "PATCH",
    auth: true,
    role: "MERCHANT",
    body: { action: "REJECT", rejectReason },
  });
}
