import { apiRequest, getPageContent } from "./apiClient.js";
import { normalizePlace } from "./placeService.js";

function normalizeUnifiedPlaceResult(place) {
  return {
    ...place,
    targetType: "PLACE",
    targetLabel: "장소",
    placeId: place.placeId ?? place.id,
    placeName: place.name,
  };
}

function normalizeTargetType(item = {}) {
  const rawType = String(item.targetType ?? item.resultType ?? item.type ?? item.categoryType ?? "").toUpperCase();
  if (["PLACE", "TOURIST_SPOT", "TRADITIONAL_MARKET"].includes(rawType)) return "PLACE";
  if (["SHOP", "STORE", "MERCHANT_SHOP"].includes(rawType)) return "SHOP";
  if (["MENU", "PRODUCT", "SHOP_MENU"].includes(rawType)) return "MENU";
  if (item.menuId || item.price != null) return "MENU";
  if (item.shopId || item.shopName) return "SHOP";
  return "PLACE";
}

function normalizeUnifiedSearchResult(item = {}) {
  const targetType = normalizeTargetType(item);

  if (targetType === "PLACE") {
    return normalizeUnifiedPlaceResult(normalizePlace({
      ...item,
      id: item.placeId ?? item.id,
      name: item.placeName ?? item.name,
      type: item.placeType ?? item.category ?? item.type,
      dist: item.distanceText ?? item.dist,
    }));
  }

  if (targetType === "MENU") {
    return {
      ...item,
      targetType: "MENU",
      targetLabel: "메뉴",
      id: item.id ?? item.menuId,
      menuId: item.menuId ?? item.id,
      name: item.menuName ?? item.name,
      shopId: item.shopId ?? item.storeId,
      shopName: item.shopName ?? item.storeName ?? item.shop?.name,
      placeName: item.placeName ?? item.marketName ?? item.place?.name,
      category: item.category ?? "메뉴",
      desc: item.description ?? item.desc,
    };
  }

  return {
    ...item,
    targetType: "SHOP",
    targetLabel: "가게",
    id: item.shopId ?? item.storeId ?? item.id,
    shopId: item.shopId ?? item.storeId ?? item.id,
    name: item.shopName ?? item.storeName ?? item.name,
    shopName: item.shopName ?? item.storeName ?? item.name,
    placeName: item.placeName ?? item.marketName ?? item.place?.name,
    category: item.category ?? item.shopCategory,
    desc: item.description ?? item.desc,
    matchedMenuNames: item.matchedMenuNames ?? item.menus ?? item.menuNames ?? [],
  };
}

function getUnifiedSearchContent(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;

  const grouped = [
    ...(data?.places ?? []).map(item => ({ ...item, targetType: item.targetType ?? "PLACE" })),
    ...(data?.shops ?? []).map(item => ({ ...item, targetType: item.targetType ?? "SHOP" })),
    ...(data?.menus ?? []).map(item => ({ ...item, targetType: item.targetType ?? "MENU" })),
  ];
  if (grouped.length > 0) return grouped;

  return getPageContent(data);
}

function getUnifiedSearchPage(data) {
  const content = getUnifiedSearchContent(data).map(normalizeUnifiedSearchResult);
  return {
    content,
    nextCursor: data?.nextCursor ?? data?.cursor ?? null,
    hasNext: Boolean(data?.hasNext),
    size: data?.size ?? content.length,
  };
}

export async function searchPlaces({ query, size = 20 }) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];

  const params = new URLSearchParams({ q: normalizedQuery, size: String(size) });
  const data = await apiRequest(`/search/places?${params.toString()}`);
  return getPageContent(data).map(normalizePlace);
}

export async function searchUnifiedPage({ query, cursor, size = 50 }) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return {
      content: [],
      nextCursor: null,
      hasNext: false,
      size: 0,
    };
  }

  const params = new URLSearchParams({
    q: normalizedQuery,
    type: "ALL",
    size: String(size),
  });
  if (cursor) params.set("cursor", cursor);

  const data = await apiRequest(`/search?${params.toString()}`);
  return getUnifiedSearchPage(data);
}

export async function searchUnified({ query, size = 50 }) {
  const page = await searchUnifiedPage({ query, size });
  return page.content;
}

export async function fetchSearchSuggestions(query) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];

  return apiRequest(`/search/suggest?q=${encodeURIComponent(normalizedQuery)}`);
}

export async function fetchPopularSearches() {
  const data = await apiRequest("/search/popular");
  return Array.isArray(data) ? data : getPageContent(data);
}

export async function fetchRecentSearches() {
  const data = await apiRequest("/search/recent", { auth: true, role: "USER" });
  return Array.isArray(data) ? data : getPageContent(data);
}

export async function saveSearchKeyword(keyword) {
  return apiRequest("/search", {
    method: "POST",
    auth: true,
    role: "USER",
    body: { keyword },
  });
}

export async function deleteRecentSearch(keyword) {
  const query = keyword ? `?keyword=${encodeURIComponent(keyword)}` : "";
  return apiRequest(`/search/recent${query}`, {
    method: "DELETE",
    auth: true,
    role: "USER",
  });
}

