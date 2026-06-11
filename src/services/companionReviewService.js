import { apiRequest, getPageContent } from "./apiClient.js";

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

export async function fetchUserCompanionReviews(userId, { cursor, size = 10 } = {}) {
  const params = new URLSearchParams({ size: String(size) });
  if (cursor) params.set("cursor", cursor);
  const data = await apiRequest(`/users/${userId}/companion-reviews?${params.toString()}`, {
    auth: true,
    role: "USER",
  });

  return getPageContent(data).map((item = {}) => ({
    ...item,
    id: item.reviewId ?? item.id,
    reviewerNickname: item.reviewerNickname ?? item.writerNickname ?? item.nickname ?? "동행자",
    score: item.score ?? item.rating ?? 0,
    content: item.content ?? item.comment ?? "",
    createdAt: item.createdAt ?? "",
  }));
}
