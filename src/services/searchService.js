import { apiRequest, getPageContent } from "./apiClient.js";
import { getMockPlaces, normalizePlace } from "./placeService.js";

// TODO: 백엔드 통합 검색 API가 생기면 이 로컬 보조 카탈로그를 제거하고
// GET /search?q=&type=ALL 응답의 PLACE/SHOP/MENU 결과로 교체합니다.
const LOCAL_SEARCH_CATALOG = [
  {
    targetType: "SHOP",
    id: 9501,
    shopId: 9501,
    name: "춘배다방",
    placeName: "서촌 한옥 골목",
    category: "카페",
    address: "서울특별시 종로구 자하문로 15길 12",
    rating: 4.7,
    reviewCount: 84,
    matchedMenuNames: ["전통차", "약과", "계절 디저트"],
    desc: "전통차, 약과, 계절 디저트를 즐길 수 있는 작은 한옥 카페입니다.",
  },
  {
    targetType: "SHOP",
    id: 201,
    shopId: 201,
    name: "영호네 포장마차",
    placeName: "광장시장",
    category: "한식",
    address: "광장시장 내 B동 123호",
    rating: 4.8,
    reviewCount: 56,
    matchedMenuNames: ["녹두 빈대떡", "막걸리"],
    desc: "광장시장 먹거리 골목의 엽전 결제 가능 가게입니다.",
  },
  {
    targetType: "SHOP",
    id: 205,
    shopId: 205,
    name: "순희네 빈대떡",
    placeName: "광장시장",
    category: "한식",
    address: "광장시장 먹거리 골목",
    rating: 4.6,
    reviewCount: 38,
    matchedMenuNames: ["빈대떡", "빈대떡 세트"],
    desc: "바삭한 빈대떡과 시장 간식을 파는 가게입니다.",
  },
  {
    targetType: "MENU",
    id: "menu-201-bindaetteok",
    menuId: 1,
    name: "녹두 빈대떡",
    shopId: 201,
    shopName: "영호네 포장마차",
    placeName: "광장시장",
    price: 5000,
    category: "메뉴",
    desc: "국내산 녹두로 만든 전통 빈대떡",
  },
  {
    targetType: "MENU",
    id: "menu-205-bindaetteok",
    menuId: 2,
    name: "빈대떡 세트",
    shopId: 205,
    shopName: "순희네 빈대떡",
    placeName: "광장시장",
    price: 6000,
    category: "메뉴",
    desc: "빈대떡과 시장 간식을 함께 즐기는 세트",
  },
  {
    targetType: "MENU",
    id: "menu-9501-tea",
    menuId: 3,
    name: "전통차",
    shopId: 9501,
    shopName: "춘배다방",
    placeName: "서촌 한옥 골목",
    price: 7000,
    category: "메뉴",
    desc: "따뜻한 한옥 카페에서 즐기는 전통차",
  },
];

function searchMockPlaces(query) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];

  return getMockPlaces().filter((place) => {
    const nameMatched = place.name?.includes(normalizedQuery);
    if (normalizedQuery.length < 2) return nameMatched;
    return nameMatched || [place.type, place.addr].some(value => value?.includes(normalizedQuery));
  });
}

function matchesKeyword(item, keyword) {
  const haystack = [
    item.name,
    item.shopName,
    item.placeName,
    item.category,
    item.address,
    item.desc,
    ...(item.matchedMenuNames ?? []),
  ].filter(Boolean).join(" ");
  return haystack.includes(keyword);
}

function normalizeUnifiedPlaceResult(place) {
  return {
    ...place,
    targetType: "PLACE",
    targetLabel: "장소",
    placeId: place.placeId ?? place.id,
    placeName: place.name,
  };
}

function searchLocalCatalog(query) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];
  return LOCAL_SEARCH_CATALOG
    .filter(item => matchesKeyword(item, normalizedQuery))
    .map(item => ({
      ...item,
      targetLabel: item.targetType === "SHOP" ? "가게" : "메뉴",
    }));
}

export async function searchPlaces({ query, size = 20 }) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];

  const params = new URLSearchParams({ q: normalizedQuery, size: String(size) });
  const data = await apiRequest(`/search/places?${params.toString()}`);
  return getPageContent(data).map(normalizePlace);
}

export async function searchUnified({ query, size = 20 }) {
  const places = await searchPlaces({ query, size });
  const placeResults = places.map(normalizeUnifiedPlaceResult);
  const localResults = searchLocalCatalog(query);
  return [...placeResults, ...localResults];
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

export function getMockSearchResults(query) {
  const placeResults = searchMockPlaces(query).map(normalizeUnifiedPlaceResult);
  return [...placeResults, ...searchLocalCatalog(query)];
}
