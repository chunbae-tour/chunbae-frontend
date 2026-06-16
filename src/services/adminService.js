import { ApiClientError, apiRequest, getPageContent } from "./apiClient.js";
import { getProductCategoryCode, isProductCategoryCode } from "../constants/productCategories.js";

export function normalizeAdminUser(user = {}) {
  const status = user.status === "SUSPENDED" || user.suspended ? "정지" : "정상";
  return {
    id: user.userId ?? user.id,
    nickname: user.nickname ?? user.name ?? "사용자",
    email: user.email ?? "",
    date: user.joinedAt ?? user.createdAt ?? user.date ?? "",
    role: user.role ?? "USER",
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
  const category = place.category ?? "TOURIST_SPOT";
  return {
    id: place.placeId ?? place.id,
    type: category === "TRADITIONAL_MARKET" ? "전통시장" : "관광지",
    category,
    name: place.name ?? "콘텐츠",
    status: place.deleted || place.status === "HIDDEN" || place.status === "DELETED" ? "비공개" : "공개",
    updatedAt: place.updatedAt ?? place.createdAt ?? "",
    address: place.address ?? "",
    source: "place",
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
  return apiRequest("/admin/dashboard", { auth: true, role: "ADMIN" });
}

export async function fetchAdminUsers({ keyword = "", status = "", role = "" } = {}) {
  const params = new URLSearchParams({ size: "20" });
  if (keyword) params.set("keyword", keyword);
  if (status && status !== "전체") params.set("status", status === "정지" ? "SUSPENDED" : "ACTIVE");
  if (role && role !== "전체") params.set("role", role);
  const data = await apiRequest(`/admin/users?${params.toString()}`, { auth: true, role: "ADMIN" });
  return getPageContent(data).map(normalizeAdminUser);
}

export async function fetchAdminUserDetail(userId) {
  return apiRequest(`/admin/users/${userId}`, {
    auth: true,
    role: "ADMIN",
  });
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

export async function fetchAdminReportDetail(reportId) {
  return apiRequest(`/admin/reports/${reportId}`, {
    auth: true,
    role: "ADMIN",
  });
}

export async function resolveAdminReport(reportId, action) {
  return apiRequest(`/admin/reports/${reportId}/resolve`, {
    method: "POST",
    auth: true,
    role: "ADMIN",
    body: { action, adminNote: "" },
  });
}

export async function resolveMerchantAdminReport(reportId, payload) {
  return apiRequest(`/admin/reports/${reportId}/resolve/merchant`, {
    method: "POST",
    auth: true,
    role: "ADMIN",
    body: payload,
  });
}

export async function fetchMerchantApplications(status = "") {
  const params = new URLSearchParams({ size: "20" });
  if (status) params.set("status", status);
  const data = await apiRequest(`/admin/merchant-applications?${params.toString()}`, { auth: true, role: "ADMIN" });
  return getPageContent(data).map(normalizeMerchantApplication);
}

export async function fetchMerchantApplicationDetail(applicationId) {
  return apiRequest(`/admin/merchant-applications/${applicationId}`, {
    auth: true,
    role: "ADMIN",
  });
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
      size: String(size),
      category: "TRADITIONAL_MARKET",
    });
    if (keyword) params.set("keyword", keyword);
    if (cursor) params.set("cursor", cursor);

    const data = await apiRequest(`/admin/places?${params.toString()}`, { auth: true, role: "ADMIN" });
    const pageItems = getPageContent(data);
    markets.push(...pageItems.map((item) => normalizeAdminPlace({
      ...item,
      category: item.category ?? "TRADITIONAL_MARKET",
    })));
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

export async function updateAdminFestival(festivalId, payload) {
  return apiRequest(`/admin/festivals/${festivalId}`, {
    method: "PUT",
    auth: true,
    role: "ADMIN",
    body: payload,
  });
}

export async function createAdminFestival(payload) {
  return apiRequest("/admin/festivals", {
    method: "POST",
    auth: true,
    role: "ADMIN",
    body: payload,
  });
}

export async function deleteAdminFestival(festivalId) {
  return apiRequest(`/admin/festivals/${festivalId}`, {
    method: "DELETE",
    auth: true,
    role: "ADMIN",
  });
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

  const places = [];
  let cursor = "";
  let hasNext = true;

  while (hasNext && places.length < 2000) {
    const params = new URLSearchParams({ size: "100" });
    if (keyword) params.set("keyword", keyword);
    if (category === "관광지") params.set("category", "TOURIST_SPOT");
    if (cursor) params.set("cursor", cursor);

    const data = await apiRequest(`/admin/places?${params.toString()}`, { auth: true, role: "ADMIN" });
    places.push(...getPageContent(data).map(normalizeAdminPlace));
    cursor = data?.nextCursor ?? "";
    hasNext = Boolean(data?.hasNext && cursor);
  }

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

export async function createAdminPlace(body) {
  return apiRequest("/admin/places", {
    method: "POST",
    auth: true,
    role: "ADMIN",
    body,
  });
}

export async function updateAdminPlace(placeId, body) {
  return apiRequest(`/admin/places/${placeId}`, {
    method: "PATCH",
    auth: true,
    role: "ADMIN",
    body,
  });
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

export async function fetchAdminSettlements({ cursor, size = 20 } = {}) {
  const params = new URLSearchParams({ size: String(size) });
  if (cursor) params.set("cursor", cursor);
  const data = await apiRequest(`/admin/settlements?${params.toString()}`, {
    auth: true,
    role: "ADMIN",
  });
  return getPageContent(data);
}

export async function approveSettlement(settlementId) {
  return apiRequest(`/admin/settlements/${settlementId}/approve`, {
    method: "PATCH",
    auth: true,
    role: "ADMIN",
  });
}

export async function rejectSettlement(settlementId, rejectReason) {
  return apiRequest(`/admin/settlements/${settlementId}/reject`, {
    method: "PATCH",
    auth: true,
    role: "ADMIN",
    body: { reason: rejectReason },
  });
}

export async function fetchAdminRefunds({ cursor, size = 20 } = {}) {
  const params = new URLSearchParams({ size: String(size) });
  if (cursor) params.set("cursor", cursor);
  const data = await apiRequest(`/admin/refunds?${params.toString()}`, {
    auth: true,
    role: "ADMIN",
  });
  return getPageContent(data);
}

export async function approveRefund(refundId) {
  return apiRequest(`/admin/refunds/${refundId}/approve`, {
    method: "PATCH",
    auth: true,
    role: "ADMIN",
  });
}

export async function rejectRefund(refundId, rejectReason) {
  return apiRequest(`/admin/refunds/${refundId}/reject`, {
    method: "PATCH",
    auth: true,
    role: "ADMIN",
    body: { reason: rejectReason },
  });
}

export async function createAdminProduct(payload) {
  return apiRequest("/admin/store/products", {
    method: "POST",
    auth: true,
    role: "ADMIN",
    body: payload,
  });
}

export async function updateAdminProduct(productId, payload) {
  return apiRequest(`/admin/store/products/${productId}`, {
    method: "PATCH",
    auth: true,
    role: "ADMIN",
    body: payload,
  });
}

export async function deleteAdminProduct(productId) {
  return apiRequest(`/admin/store/products/${productId}`, {
    method: "DELETE",
    auth: true,
    role: "ADMIN",
  });
}

export async function fetchAdminProducts({ category, cursor, size = 100 } = {}) {
  const params = new URLSearchParams({ size: String(size) });
  if (category && isProductCategoryCode(category)) params.set("category", getProductCategoryCode(category));
  if (cursor) params.set("cursor", cursor);
  const data = await apiRequest(`/admin/store/products?${params.toString()}`, {
    auth: true,
    role: "ADMIN",
  });
  return getPageContent(data);
}

export async function fetchAdminBanners({ size = 20 } = {}) {
  const params = new URLSearchParams({ size: String(size) });
  const data = await apiRequest(`/admin/banners?${params.toString()}`, {
    auth: true,
    role: "ADMIN",
  });
  return getPageContent(data);
}

export async function createAdminBanner(payload) {
  return apiRequest("/admin/banners", {
    method: "POST",
    auth: true,
    role: "ADMIN",
    body: payload,
  });
}

export async function updateAdminBanner(bannerId, payload) {
  return apiRequest(`/admin/banners/${bannerId}`, {
    method: "PATCH",
    auth: true,
    role: "ADMIN",
    body: payload,
  });
}

export async function deleteAdminBanner(bannerId) {
  return apiRequest(`/admin/banners/${bannerId}`, {
    method: "DELETE",
    auth: true,
    role: "ADMIN",
  });
}

export async function fetchAdminAds({ cursor, size = 20 } = {}) {
  const params = new URLSearchParams({ size: String(size) });
  if (cursor) params.set("cursor", cursor);
  const data = await apiRequest(`/admin/ads?${params.toString()}`, {
    auth: true,
    role: "ADMIN",
  });
  return getPageContent(data);
}

export async function fetchAdminAd(adId) {
  return apiRequest(`/admin/ads/${adId}`, {
    auth: true,
    role: "ADMIN",
  });
}

export async function approveAd(adId) {
  return apiRequest(`/admin/ads/${adId}/approve`, {
    method: "PATCH",
    auth: true,
    role: "ADMIN",
  });
}

export async function rejectAd(adId, rejectReason) {
  return apiRequest(`/admin/ads/${adId}/reject`, {
    method: "PATCH",
    auth: true,
    role: "ADMIN",
    body: { reason: rejectReason },
  });
}

export async function fetchAdminShops({ cursor, size = 20 } = {}) {
  void cursor;
  void size;
  throw new ApiClientError("관리자 가게 목록 API는 현재 OpenAPI 명세에 없습니다.", "ADMIN_SHOP_LIST_API_MISSING", 501);
}

export async function fetchAdminShopDetail(shopId) {
  return apiRequest(`/admin/shops/${shopId}`, {
    auth: true,
    role: "ADMIN",
  });
}

export async function updateAdminShop(shopId, payload) {
  return apiRequest(`/admin/shops/${shopId}`, {
    method: "PATCH",
    auth: true,
    role: "ADMIN",
    body: payload,
  });
}

export async function updateAdminShopStatus(shopId, status) {
  return apiRequest(`/admin/shops/${shopId}/status`, {
    method: "PATCH",
    auth: true,
    role: "ADMIN",
    body: { status },
  });
}

export async function updateAdminShopPlace(shopId, placeId) {
  return apiRequest(`/admin/shops/${shopId}/place`, {
    method: "PATCH",
    auth: true,
    role: "ADMIN",
    body: { placeId },
  });
}

export async function updateAdminShopMarket(shopId, traditionalMarketId) {
  return apiRequest(`/admin/shops/${shopId}/market`, {
    method: "PATCH",
    auth: true,
    role: "ADMIN",
    body: { traditionalMarketId },
  });
}

export async function fetchAdminCertifications({ cursor, size = 20 } = {}) {
  const params = new URLSearchParams({ size: String(size) });
  if (cursor) params.set("cursor", cursor);
  const data = await apiRequest(`/admin/shop-certifications?${params.toString()}`, {
    auth: true,
    role: "ADMIN",
  });
  return getPageContent(data);
}

export async function fetchAdminCertificationDetail(certificationId) {
  return apiRequest(`/admin/shop-certifications/${certificationId}`, {
    auth: true,
    role: "ADMIN",
  });
}

export async function approveCertification(certificationId) {
  return apiRequest(`/admin/shop-certifications/${certificationId}/approve`, {
    method: "PATCH",
    auth: true,
    role: "ADMIN",
  });
}

export async function rejectCertification(certificationId, rejectReason) {
  return apiRequest(`/admin/shop-certifications/${certificationId}/reject`, {
    method: "PATCH",
    auth: true,
    role: "ADMIN",
    body: { reason: rejectReason },
  });
}

export async function cancelCertification(certificationId, reason = "관리자 인증 취소") {
  return apiRequest(`/admin/shop-certifications/${certificationId}/cancel`, {
    method: "PATCH",
    auth: true,
    role: "ADMIN",
    body: { reason },
  });
}

export async function fetchAdminSupportRooms({ cursor, size = 20 } = {}) {
  const params = new URLSearchParams({ size: String(size) });
  if (cursor) params.set("cursor", cursor);
  const data = await apiRequest(`/admin/support/rooms?${params.toString()}`, {
    auth: true,
    role: "ADMIN",
  });
  return getPageContent(data);
}

export async function fetchAdminSupportMessages(supportRoomId, { cursor, size = 50 } = {}) {
  const params = new URLSearchParams({ size: String(size) });
  if (cursor) params.set("cursor", cursor);
  const data = await apiRequest(`/admin/support/rooms/${supportRoomId}/messages?${params.toString()}`, {
    auth: true,
    role: "ADMIN",
  });
  return getPageContent(data);
}

export async function sendAdminSupportMessage(supportRoomId, message) {
  void supportRoomId;
  void message;
  throw new ApiClientError("상담 메시지 전송 API는 현재 OpenAPI 명세에 없습니다.", "SUPPORT_MESSAGE_API_MISSING", 501);
}

export async function closeAdminSupportRoom(supportRoomId, summary = "") {
  return apiRequest(`/admin/support/rooms/${supportRoomId}/close`, {
    method: "POST",
    auth: true,
    role: "ADMIN",
    body: { summary },
  });
}

export async function assignAdminSupportRoom(supportRoomId) {
  return apiRequest(`/admin/support/rooms/${supportRoomId}/assign`, {
    method: "POST",
    auth: true,
    role: "ADMIN",
  });
}

export async function createSupportRoom(payload) {
  return apiRequest("/support/rooms", {
    method: "POST",
    auth: true,
    body: payload,
  });
}

export async function fetchMySupportRooms({ cursor, size = 20 } = {}) {
  const params = new URLSearchParams({ size: String(size) });
  if (cursor) params.set("cursor", cursor);
  const data = await apiRequest(`/support/rooms/me?${params.toString()}`, { auth: true });
  return getPageContent(data);
}

export async function fetchSupportMessages(supportRoomId, { cursor, size = 50 } = {}) {
  const params = new URLSearchParams({ size: String(size) });
  if (cursor) params.set("cursor", cursor);
  const data = await apiRequest(`/support/rooms/${supportRoomId}/messages?${params.toString()}`, { auth: true });
  return getPageContent(data);
}

export async function fetchFaqs() {
  const data = await apiRequest("/faqs");
  return getPageContent(data);
}

export async function fetchAdminFaqs({ size = 20 } = {}) {
  const data = await apiRequest(`/admin/faqs?size=${size}`, {
    auth: true,
    role: "ADMIN",
  });
  return getPageContent(data);
}

export async function createAdminFaq(payload) {
  return apiRequest("/admin/faqs", {
    method: "POST",
    auth: true,
    role: "ADMIN",
    body: payload,
  });
}

export async function updateAdminFaq(faqId, payload) {
  return apiRequest(`/admin/faqs/${faqId}`, {
    method: "PATCH",
    auth: true,
    role: "ADMIN",
    body: payload,
  });
}

export async function deleteAdminFaq(faqId) {
  return apiRequest(`/admin/faqs/${faqId}`, {
    method: "DELETE",
    auth: true,
    role: "ADMIN",
  });
}
