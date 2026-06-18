import { apiRequest, getPageContent } from "./apiClient.js";
import { getProductCategoryCode, getProductCategoryLabel, isProductCategoryCode } from "../constants/productCategories.js";

function normalizeProduct(product = {}) {
  const id = product.productId ?? product.id;
  const categoryCode = getProductCategoryCode(product.category);
  return {
    ...product,
    id,
    productId: id,
    name: product.name ?? "",
    emoji: product.emoji ?? "🎟️",
    price: product.price ?? product.yeopjeonPrice ?? 0,
    stock: product.stock ?? product.remainingStock ?? 0,
    category: categoryCode,
    categoryCode,
    categoryLabel: product.categoryName ?? product.categoryLabel ?? getProductCategoryLabel(product.category),
    imageUrl: product.imageUrl ?? (Array.isArray(product.imageUrls) ? product.imageUrls[0] : ""),
    imageUrls: Array.isArray(product.imageUrls) ? product.imageUrls : [],
    desc: product.description ?? product.desc ?? "",
    validDays: product.validDays ?? product.expireDays ?? 30,
  };
}

function normalizeStoreOrder(order = {}) {
  const id = order.orderId ?? order.id;
  const product = order.product ?? {};
  const productName = order.productName ?? product.name ?? order.name ?? "스토어 상품";
  const quantity = Number(order.quantity ?? 1);
  const totalPrice = Number(order.totalPrice ?? order.totalAmount ?? order.amount ?? order.price ?? 0);

  return {
    ...order,
    id,
    orderId: id,
    productId: order.productId ?? product.productId ?? product.id,
    productName,
    quantity,
    totalPrice,
    status: order.status ?? "",
    orderedAt: order.orderedAt ?? order.createdAt ?? "",
  };
}

export async function fetchStoreProducts({ category, size = 20 } = {}) {
  const params = new URLSearchParams({ size: String(size) });
  if (category && isProductCategoryCode(category)) params.set("category", getProductCategoryCode(category));
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

export async function fetchStoreOrders({ cursor, size = 20 } = {}) {
  const params = new URLSearchParams({ size: String(size) });
  if (cursor) params.set("cursor", cursor);
  const data = await apiRequest(`/store/orders?${params.toString()}`, { auth: true, role: "USER" });
  return getPageContent(data).map(normalizeStoreOrder);
}
