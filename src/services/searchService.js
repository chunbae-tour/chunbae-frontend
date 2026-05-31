import { apiRequest, getPageContent } from "./apiClient.js";
import { getMockPlaces, normalizePlace } from "./placeService.js";

function searchMockPlaces(query) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];

  return getMockPlaces().filter((place) => {
    const nameMatched = place.name?.includes(normalizedQuery);
    if (normalizedQuery.length < 2) return nameMatched;
    return nameMatched || [place.type, place.addr].some(value => value?.includes(normalizedQuery));
  });
}

export async function searchPlaces({ query, size = 20 }) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];

  const params = new URLSearchParams({ q: normalizedQuery, size: String(size) });
  const data = await apiRequest(`/search/places?${params.toString()}`);
  return getPageContent(data).map(normalizePlace);
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

export async function saveSearchKeyword(keyword) {
  return apiRequest("/search", {
    method: "POST",
    auth: true,
    role: "USER",
    body: { keyword },
  });
}

export function getMockSearchResults(query) {
  return searchMockPlaces(query);
}
