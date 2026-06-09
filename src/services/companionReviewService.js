import { apiRequest } from "./apiClient.js";

export async function createCompanionReview(payload) {
  return apiRequest("/companion-reviews", {
    method: "POST",
    auth: true,
    role: "USER",
    body: payload,
  });
}

export async function fetchCompanionScore(userId) {
  const data = await apiRequest(`/users/${userId}/companion-score`, {
    auth: true,
    role: "USER",
  });
  return {
    userId: data.userId ?? userId,
    score: data.score ?? 0,
    reviewCount: data.reviewCount ?? 0,
  };
}
