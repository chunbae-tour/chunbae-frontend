import { apiRequest, getPageContent } from "./apiClient.js";

export const MOCK_ADMIN_DASHBOARD = {
  totalUsers: 1250,
  totalMerchants: 48,
  pendingReports: 5,
  pendingMerchantApplications: 3,
  todayPaymentAmount: 350000,
  newUsersToday: 12,
  newChatRoomsToday: 8,
};

export const MOCK_ADMIN_USERS = [
  { id: 1, nickname: "여행자지수", email: "user@example.com", date: "2025.05.01", status: "정상" },
  { id: 2, nickname: "Emma", email: "emma@example.com", date: "2025.05.03", status: "정상" },
  { id: 3, nickname: "김민준", email: "kim@example.com", date: "2025.04.28", status: "정지" },
];

export const MOCK_ADMIN_REPORTS = [
  { id: 1, type: "게시글 신고", reason: "스팸", reporter: "여행자지수", date: "2025.05.15", status: "미처리" },
  { id: 2, type: "댓글 신고", reason: "욕설/비방", reporter: "Emma", date: "2025.05.14", status: "미처리" },
  { id: 3, type: "유저 신고", reason: "사기", reporter: "김민준", date: "2025.05.10", status: "처리완료" },
];

export const MOCK_MERCHANT_APPLICATIONS = [
  { id: 1, name: "김영호", shopName: "영호네 포장마차", market: "광장시장", date: "2025.05.15", status: "대기" },
  { id: 2, name: "박순희", shopName: "순희네 빈대떡", market: "광장시장", date: "2025.05.14", status: "대기" },
  { id: 3, name: "이민수", shopName: "민수 막걸리", market: "통인시장", date: "2025.05.10", status: "승인" },
];

export const MOCK_ADMIN_CONTENTS = [
  { id: 1, type: "관광지", name: "경복궁", status: "공개", updatedAt: "2025.05.15" },
  { id: 2, type: "전통시장", name: "광장시장", status: "공개", updatedAt: "2025.05.14" },
  { id: 3, type: "관광지", name: "창덕궁", status: "공개", updatedAt: "2025.05.10" },
  { id: 4, type: "전통시장", name: "통인시장", status: "비공개", updatedAt: "2025.05.08" },
  { id: 5, type: "축제", name: "서울빛초롱축제", status: "공개", updatedAt: "2025.05.08" },
];

export function normalizeAdminUser(user = {}) {
  const status = user.status === "SUSPENDED" || user.suspended ? "정지" : "정상";
  return {
    id: user.userId ?? user.id,
    nickname: user.nickname ?? user.name ?? "사용자",
    email: user.email ?? "",
    date: user.joinedAt ?? user.createdAt ?? user.date ?? "",
    status,
  };
}

export function normalizeReport(report = {}) {
  const resolved = ["RESOLVED", "DONE", "CLOSED"].includes(report.status);
  return {
    id: report.reportId ?? report.id,
    type: report.typeLabel ?? report.type ?? "신고",
    reason: report.reason ?? "",
    reporter: report.reporterNickname ?? report.reporter ?? "",
    date: report.createdAt ?? report.date ?? "",
    status: resolved ? "처리완료" : "미처리",
  };
}

export function normalizeMerchantApplication(item = {}) {
  const statusMap = { PENDING: "대기", APPROVED: "승인", REJECTED: "거절" };
  return {
    id: item.applicationId ?? item.id,
    name: item.applicantName ?? item.name ?? item.ownerName ?? "신청자",
    shopName: item.shopName ?? item.storeName ?? "상점",
    market: item.marketName ?? item.market ?? "",
    date: item.createdAt ?? item.date ?? "",
    status: statusMap[item.status] ?? item.status ?? "대기",
  };
}

export function normalizeAdminPlace(place = {}) {
  return {
    id: place.placeId ?? place.id,
    type: place.category ?? place.type ?? "관광지",
    name: place.name ?? "콘텐츠",
    status: place.deleted || place.status === "HIDDEN" ? "비공개" : "공개",
    updatedAt: place.updatedAt ?? place.createdAt ?? "",
  };
}

export function normalizeAdminTraditionalMarket(market = {}) {
  return {
    id: market.marketId ?? market.id,
    type: "전통시장",
    name: market.marketName ?? market.name ?? "전통시장",
    status: market.deleted || market.status === "HIDDEN" ? "비공개" : "공개",
    updatedAt: market.updatedAt ?? market.createdAt ?? "",
    readOnly: true,
    source: "traditional-market",
  };
}

export function normalizeAdminFestival(festival = {}) {
  return {
    id: festival.festivalId ?? festival.id,
    type: "축제",
    name: festival.name ?? festival.title ?? festival.festivalName ?? "축제",
    status: festival.deleted || festival.status === "HIDDEN" || festival.status === "DELETED" ? "비공개" : "공개",
    updatedAt: festival.updatedAt ?? festival.createdAt ?? festival.startDate ?? "",
    readOnly: festival.source && festival.source !== "MANUAL",
    source: "festival",
  };
}

export async function fetchAdminDashboard() {
  const data = await apiRequest("/admin/dashboard", { auth: true, role: "ADMIN" });
  return { ...MOCK_ADMIN_DASHBOARD, ...data };
}

export async function fetchAdminUsers({ keyword = "", status = "" } = {}) {
  const params = new URLSearchParams({ size: "20" });
  if (keyword) params.set("keyword", keyword);
  if (status && status !== "전체") params.set("status", status === "정지" ? "SUSPENDED" : "ACTIVE");
  const data = await apiRequest(`/admin/users?${params.toString()}`, { auth: true, role: "ADMIN" });
  return getPageContent(data).map(normalizeAdminUser);
}

export async function suspendAdminUser(userId, reason = "관리자 처리") {
  return apiRequest(`/admin/users/${userId}/suspensions`, {
    method: "POST",
    auth: true,
    role: "ADMIN",
    body: { reason, durationDays: 7 },
  });
}

export async function unsuspendAdminUser(userId) {
  return apiRequest(`/admin/users/${userId}/suspensions`, {
    method: "DELETE",
    auth: true,
    role: "ADMIN",
  });
}

export async function fetchAdminReports(status = "미처리") {
  const apiStatus = status === "처리완료" ? "RESOLVED" : "PENDING";
  const data = await apiRequest(`/admin/reports?status=${apiStatus}&size=20`, { auth: true, role: "ADMIN" });
  return getPageContent(data).map(normalizeReport);
}

export async function resolveAdminReport(reportId, action) {
  return apiRequest(`/admin/reports/${reportId}/resolve`, {
    method: "POST",
    auth: true,
    role: "ADMIN",
    body: { action, adminNote: "" },
  });
}

export async function fetchMerchantApplications(status = "") {
  const params = new URLSearchParams({ size: "20" });
  if (status) params.set("status", status);
  const data = await apiRequest(`/admin/merchant-applications?${params.toString()}`, { auth: true, role: "ADMIN" });
  return getPageContent(data).map(normalizeMerchantApplication);
}

export async function approveMerchantApplication(applicationId) {
  return apiRequest(`/admin/merchant-applications/${applicationId}/approve`, {
    method: "PATCH",
    auth: true,
    role: "ADMIN",
  });
}

export async function rejectMerchantApplication(applicationId, rejectReason = "관리자 거절") {
  return apiRequest(`/admin/merchant-applications/${applicationId}/reject`, {
    method: "PATCH",
    auth: true,
    role: "ADMIN",
    body: { rejectReason },
  });
}

async function fetchAdminTraditionalMarkets({ keyword = "", size = 100, maxItems = 2000 } = {}) {
  const markets = [];
  let cursor = null;
  let hasNext = true;

  while (hasNext && markets.length < maxItems) {
    const params = new URLSearchParams({
      q: keyword || "시장",
      type: "TRADITIONAL_MARKET",
      size: String(size),
    });
    if (cursor) params.set("cursor", cursor);

    const data = await apiRequest(`/search?${params.toString()}`);
    const pageItems = getPageContent(data);
    markets.push(...pageItems.map(normalizeAdminTraditionalMarket));
    cursor = data?.nextCursor ?? data?.cursor ?? null;
    hasNext = Boolean(data?.hasNext && cursor);
  }

  return markets;
}

export async function fetchAdminFestivals({ size = 100, maxItems = 1000 } = {}) {
  const festivals = [];
  let cursor = null;
  let hasNext = true;

  while (hasNext && festivals.length < maxItems) {
    const params = new URLSearchParams({ size: String(size) });
    if (cursor) params.set("cursor", cursor);

    const data = await apiRequest(`/admin/festivals?${params.toString()}`, { auth: true, role: "ADMIN" });
    const pageItems = getPageContent(data);
    festivals.push(...pageItems.map(normalizeAdminFestival));
    cursor = data?.nextCursor ?? data?.cursor ?? null;
    hasNext = Boolean(data?.hasNext && cursor);
  }

  return festivals;
}

export async function fetchAdminContents({ keyword = "", category = "" } = {}) {
  if (category === "축제") {
    return fetchAdminFestivals();
  }

  const places = await fetchAdminPlaces({ keyword, category });

  if (category === "전체" || !category) {
    try {
      const festivals = await fetchAdminFestivals();
      return [...places, ...festivals];
    } catch {
      return places;
    }
  }

  return places;
}

export async function fetchAdminPlaces({ keyword = "", category = "" } = {}) {
  if (category === "전통시장") {
    return fetchAdminTraditionalMarkets({ keyword });
  }

  const params = new URLSearchParams({ size: "20" });
  if (keyword) params.set("keyword", keyword);
  if (category && category !== "전체") params.set("category", category);
  const data = await apiRequest(`/admin/places?${params.toString()}`, { auth: true, role: "ADMIN" });
  const places = getPageContent(data).map(normalizeAdminPlace);

  if (category === "전체" || !category) {
    try {
      const markets = await fetchAdminTraditionalMarkets({ keyword });
      return [...places, ...markets];
    } catch {
      return places;
    }
  }

  return places;
}

export async function deleteAdminPlace(placeId) {
  return apiRequest(`/admin/places/${placeId}`, {
    method: "DELETE",
    auth: true,
    role: "ADMIN",
  });
}

export async function syncTouristPlaces() {
  return apiRequest("/admin/places/sync", {
    method: "POST",
    auth: true,
    role: "ADMIN",
  });
}

export async function syncTraditionalMarkets() {
  return apiRequest("/admin/traditional-markets/sync", {
    method: "POST",
    auth: true,
    role: "ADMIN",
  });
}

export async function fetchFestivalsNow() {
  return apiRequest("/admin/festivals/fetch", {
    method: "POST",
    auth: true,
    role: "ADMIN",
  });
}
