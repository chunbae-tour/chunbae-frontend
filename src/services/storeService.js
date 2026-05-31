import { apiRequest, getPageContent } from "./apiClient.js";

const MOCK_PRODUCTS = [
  { id: 1, name: "광장시장 투어권", emoji: "🏪", price: 5000, stock: 50, category: "투어권", desc: "광장시장 전문 가이드 투어권. 구매 후 30일 이내 사용 가능합니다.", validDays: 30 },
  { id: 2, name: "경복궁 야간투어권", emoji: "🏯", price: 8000, stock: 30, category: "투어권", desc: "경복궁 야간 개장 특별 투어권. 한복 체험 포함.", validDays: 30 },
  { id: 3, name: "전통시장 할인쿠폰", emoji: "🎟️", price: 3000, stock: 100, category: "쿠폰", desc: "참여 전통시장 전 매장 10% 할인 쿠폰.", validDays: 14 },
  { id: 4, name: "통인시장 도시락 체험권", emoji: "🍱", price: 4000, stock: 0, category: "투어권", desc: "통인시장 엽전 도시락 체험권. 엽전 5개 포함.", validDays: 30 },
];

function normalizeProduct(product = {}) {
  const id = product.productId ?? product.id;
  return {
    ...product,
    id,
    productId: id,
    name: product.name ?? "",
    emoji: product.emoji ?? "🎟️",
    price: product.price ?? product.yeopjeonPrice ?? 0,
    stock: product.stock ?? product.remainingStock ?? 0,
    category: product.categoryName ?? product.category ?? "쿠폰",
    desc: product.description ?? product.desc ?? "",
    validDays: product.validDays ?? product.expireDays ?? 30,
  };
}

export function getMockProducts() {
  return MOCK_PRODUCTS.map(normalizeProduct);
}

export async function fetchStoreProducts({ category, size = 20 } = {}) {
  const params = new URLSearchParams({ size: String(size) });
  if (category && category !== "전체") params.set("category", category);
  const data = await apiRequest(`/store/products?${params.toString()}`);
  return getPageContent(data).map(normalizeProduct);
}

export async function fetchStoreProduct(productId) {
  const data = await apiRequest(`/store/products/${productId}`);
  return normalizeProduct(data);
}

export async function purchaseStoreProduct({ productId, quantity }) {
  return apiRequest("/store/orders", {
    method: "POST",
    auth: true,
    role: "USER",
    body: { productId, quantity },
  });
}
