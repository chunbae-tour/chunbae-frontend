import { apiRequest, getPageContent } from "./apiClient.js";
import { normalizePlace } from "./placeService.js";

export async function fetchPopularRecommendations({ size = 20 } = {}) {
  const data = await apiRequest(`/recommend/popular?size=${size}`);
  return getPageContent(data).map(normalizePlace);
}

export async function fetchNearbyRecommendations({ lat, lng, radius = 3000, size = 20 } = {}) {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    radius: String(radius),
    size: String(size),
  });
  const data = await apiRequest(`/recommend/nearby?${params.toString()}`);
  return getPageContent(data).map(normalizePlace);
}

export async function fetchCategoryRecommendations({ category, size = 20 } = {}) {
  const params = new URLSearchParams({ size: String(size) });
  if (category) params.set("category", category);
  const data = await apiRequest(`/recommend/category?${params.toString()}`);
  return getPageContent(data).map(normalizePlace);
}
