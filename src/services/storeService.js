import { apiRequest, getPageContent } from "./apiClient.js";

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
