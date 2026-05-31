import { apiRequest, getPageContent } from "./apiClient.js";
import { getStoredAuthSession } from "./authService.js";

function getMerchantShopId() {
  const session = getStoredAuthSession("MERCHANT");
  return session?.shopId ?? 1; // 로그인 응답에 포함된 shopId 혹은 기본값 1 적용
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
    date: item.requestedAt ?? item.settledAt ?? item.date ?? "",
    amount: Number(item.amount ?? 0),
    status: item.status ?? "정산요청",
  };
}

export function normalizePaymentRequest(item = {}) {
  return {
    id: item.paymentRequestId ?? item.requestId ?? item.id,
    customerName: item.customerName ?? item.nickname ?? item.userName ?? "여행자",
    amount: Number(item.amount ?? 0),
    menuName: item.menuName ?? item.productName ?? "",
    memo: item.memo ?? item.description ?? "",
    status: item.status ?? "PENDING_CONFIRM",
    requestedAt: item.requestedAt ?? item.createdAt ?? "",
  };
}

export async function fetchMerchantShop() {
  const shopId = getMerchantShopId();
  const data = await apiRequest(`/merchants/me/shops/${shopId}`, { auth: true, role: "MERCHANT" });
  return {
    ...MOCK_MERCHANT_SHOP,
    ...data,
    id: data.shopId ?? data.id ?? MOCK_MERCHANT_SHOP.id,
    name: data.name ?? data.shopName ?? MOCK_MERCHANT_SHOP.name,
    market: data.marketName ?? data.market ?? MOCK_MERCHANT_SHOP.market,
    address: data.address ?? MOCK_MERCHANT_SHOP.address,
    operatingHours: data.operatingHours ?? MOCK_MERCHANT_SHOP.operatingHours,
    holiday: data.holiday ?? MOCK_MERCHANT_SHOP.holiday,
    rating: Number(data.rating ?? MOCK_MERCHANT_SHOP.rating),
    reviewCount: Number(data.reviewCount ?? MOCK_MERCHANT_SHOP.reviewCount),
    verified: data.verified ?? data.isVerified ?? MOCK_MERCHANT_SHOP.verified,
    menus: Array.isArray(data.menus) ? data.menus.map(normalizeMenu) : undefined,
  };
}

export async function fetchMerchantWallet() {
  const data = await apiRequest("/merchants/me/shop/wallet", { auth: true, role: "MERCHANT" });
  return {
    balance: Number(data.balance ?? data.currentBalance ?? 0),
    pendingSettlement: Number(data.pendingSettlement ?? 0),
    totalEarned: Number(data.totalEarned ?? 0),
  };
}

export async function addMerchantMenu(payload) {
  const shopId = getMerchantShopId();
  const data = await apiRequest(`/merchants/me/shops/${shopId}/menus`, {
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

export async function updateMerchantMenu(menuId, payload) {
  const shopId = getMerchantShopId();
  const data = await apiRequest(`/merchants/me/shops/${shopId}/menus/${menuId}`, {
    method: "PATCH",
    auth: true,
    role: "MERCHANT",
    body: payload,
  });
  return normalizeMenu(data);
}

export async function deleteMerchantMenu(menuId) {
  const shopId = getMerchantShopId();
  return apiRequest(`/merchants/me/shops/${shopId}/menus/${menuId}`, {
    method: "DELETE",
    auth: true,
    role: "MERCHANT",
  });
}

export async function fetchMerchantSettlements() {
  const shopId = getMerchantShopId();
  const data = await apiRequest(`/merchants/me/shops/${shopId}/settlements?size=20`, { auth: true, role: "MERCHANT" });
  return getPageContent(data).map(normalizeSettlement);
}

export async function requestMerchantSettlement(amount) {
  const shopId = getMerchantShopId();
  return apiRequest(`/merchants/me/shops/${shopId}/settlements`, {
    method: "POST",
    auth: true,
    role: "MERCHANT",
    body: { amount: Number(amount) },
  });
}

export async function fetchMerchantPaymentRequests() {
  // TODO: 상인 QR 결제 승인 대기 목록 API 확정 시 endpoint/mapping을 백엔드 명세에 맞춰 고정합니다.
  const data = await apiRequest("/merchants/me/shop/payment-requests?status=PENDING_CONFIRM&size=10", { auth: true, role: "MERCHANT" });
  return getPageContent(data).map(normalizePaymentRequest);
}

export async function approveMerchantPaymentRequest(requestId) {
  // 백엔드 API 규격에 맞춰 PATCH /api/v1/payments/qr/{payRequestId}/confirm 로 수정
  return apiRequest(`/payments/qr/${requestId}/confirm`, {
    method: "PATCH",
    auth: true,
    role: "MERCHANT",
    body: {},
  });
}

export async function rejectMerchantPaymentRequest(requestId) {
  // TODO: QR 결제 거절 API 확정 필요. 현재는 예상 endpoint로 분리해두고 실패 시 화면에서 mock 처리합니다.
  return apiRequest(`/merchants/me/shop/payment-requests/${requestId}/reject`, {
    method: "POST",
    auth: true,
    role: "MERCHANT",
  });
}
