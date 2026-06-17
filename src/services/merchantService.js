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

function formatMerchantDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function normalizeShopNotice(item = {}) {
  const createdAt = item.createdAt ?? item.createdDate ?? item.date ?? "";
  return {
    id: item.noticeId ?? item.id,
    title: item.title ?? item.subject ?? "가게 공지",
    content: item.content ?? item.message ?? item.description ?? "",
    createdAt,
    createdAtLabel: formatMerchantDateTime(createdAt),
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
    ...data,
    id: data.shopId ?? data.id,
    name: data.name ?? data.shopName ?? "",
    category: data.category ?? "",
    market: data.marketName ?? data.market ?? "",
    address: data.address ?? "",
    phone: data.phone ?? "",
    description: data.description ?? "",
    operatingHours: data.operatingHours ?? "",
    holiday: data.closedDays ?? data.holiday ?? "",
    rating: Number(data.rating ?? 0),
    reviewCount: Number(data.reviewCount ?? 0),
    verified: data.verified ?? data.isVerified ?? data.isCertified ?? false,
    status: data.status ?? "",
    imageUrls: data.imageUrls ?? data.images ?? [],
    thumbnailUrl: data.thumbnailUrl ?? data.imageUrl,
    notices: Array.isArray(data.notices) ? data.notices.map(normalizeShopNotice) : undefined,
    menus: Array.isArray(data.menus) ? data.menus.map(normalizeMenu) : undefined,
  };
}

export function normalizeShopImageUpload(data = {}) {
  return normalizeShopImage(data);
}

export function normalizeShopImage(item = {}) {
  const imageId = item.imageId ?? item.id ?? item.objectKey ?? item.imageUrl ?? item.url;
  const imageUrl = item.imageUrl ?? item.url ?? item.fileUrl ?? item.thumbnailUrl ?? "";
  const type = item.type ?? "GALLERY";
  return {
    ...item,
    id: imageId,
    imageId,
    type,
    imageUrl,
    url: imageUrl,
    objectKey: item.objectKey ?? item.key ?? "",
    sortOrder: Number(item.sortOrder ?? 0),
    isPrimary: Boolean(item.isPrimary ?? item.primary ?? type === "PROFILE"),
    createdAt: item.createdAt ?? "",
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

export async function fetchMerchantMenus(shopId) {
  const resolvedShopId = await resolveMerchantShopId(shopId);
  const data = await apiRequest(`/merchants/me/shops/${resolvedShopId}/menus`, { auth: true, role: "MERCHANT" });
  const menus = Array.isArray(data) ? data : getPageContent(data);
  return menus.map(normalizeMenu);
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

export async function uploadMerchantShopImage(shopId, file, type = "GALLERY") {
  const resolvedShopId = await resolveMerchantShopId(shopId);
  if (!file) {
    throw new Error("업로드할 가게 사진을 선택해주세요.");
  }

  const formData = new FormData();
  formData.append("type", type);
  formData.append("file", file);

  const data = await apiFormRequest(`/merchants/me/shops/${resolvedShopId}/images`, {
    method: "POST",
    auth: true,
    role: "MERCHANT",
    formData,
  });

  return normalizeShopImageUpload(data);
}

export async function fetchMerchantShopImages(shopId) {
  const resolvedShopId = await resolveMerchantShopId(shopId);
  const data = await apiRequest(`/merchants/me/shops/${resolvedShopId}/images`, { auth: true, role: "MERCHANT" });
  const images = Array.isArray(data) ? data : getPageContent(data);
  return images.map(normalizeShopImage);
}

export async function deleteMerchantShopImage(shopId, imageId) {
  const resolvedShopId = await resolveMerchantShopId(shopId);
  return apiRequest(`/merchants/me/shops/${resolvedShopId}/images/${imageId}`, {
    method: "DELETE",
    auth: true,
    role: "MERCHANT",
  });
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

export async function applyMerchant(payload) {
  return apiRequest("/merchants/apply", {
    method: "POST",
    auth: true,
    role: "USER",
    body: payload,
  });
}

export async function fetchMerchantHome() {
  const data = await apiRequest("/merchants/me/home", { auth: true, role: "MERCHANT" });
  return {
    todaySalesAmount: Number(data.todaySalesAmount ?? 0),
    todaySalesDate: data.todaySalesDate ?? "",
    recentPayments: data.recentPayments ?? [],
  };
}

export async function updateShopAccount(shopId, payload) {
  const resolvedShopId = await resolveMerchantShopId(shopId);
  return apiRequest(`/merchants/me/shops/${resolvedShopId}/account`, {
    method: "PUT",
    auth: true,
    role: "MERCHANT",
    body: payload,
  });
}

export async function fetchShopQrCode(shopId) {
  const resolvedShopId = await resolveMerchantShopId(shopId);
  const data = await apiRequest(`/merchants/me/shops/${resolvedShopId}/qr`, { auth: true, role: "MERCHANT" });
  return {
    shopId: data.shopId ?? resolvedShopId,
    shopName: data.shopName ?? "",
    qrPayload: data.qrPayload ?? "",
  };
}

export async function reissueShopQrCode(shopId) {
  const resolvedShopId = await resolveMerchantShopId(shopId);
  const data = await apiRequest(`/merchants/me/shops/${resolvedShopId}/qr/reissue`, {
    method: "POST",
    auth: true,
    role: "MERCHANT",
  });
  return {
    shopId: data.shopId ?? resolvedShopId,
    shopName: data.shopName ?? "",
    qrPayload: data.qrPayload ?? "",
  };
}

export async function useCustomerItemByToken({ shopId, token }) {
  const resolvedShopId = await resolveMerchantShopId(shopId);
  const data = await apiRequest("/merchants/me/shop/items/use", {
    method: "POST",
    auth: true,
    role: "MERCHANT",
    body: {
      shopId: Number(resolvedShopId),
      token,
    },
  });

  return {
    itemId: data.itemId,
    productId: data.productId,
    productName: data.productName ?? "",
    status: data.status ?? "",
    usedAt: data.usedAt ?? "",
    usedShopId: data.usedShopId ?? resolvedShopId,
  };
}

export async function requestMerchantAd({ shopId, adType = "BANNER", startDate, endDate }) {
  const resolvedShopId = await resolveMerchantShopId(shopId);
  return apiRequest("/merchants/me/ads", {
    method: "POST",
    auth: true,
    role: "MERCHANT",
    body: { shopId: resolvedShopId, adType, startDate, endDate },
  });
}

export async function extendMerchantAd(adId, extensionDays) {
  return apiRequest(`/merchants/me/ads/${adId}/extend`, {
    method: "POST",
    auth: true,
    role: "MERCHANT",
    body: { extensionDays: Number(extensionDays) },
  });
}
