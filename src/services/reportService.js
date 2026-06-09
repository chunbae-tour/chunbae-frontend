import { apiRequest, getPageContent } from "./apiClient.js";

export async function createReport({ targetType, targetId, reason = "OTHER", description = "" }) {
  return apiRequest("/reports", {
    method: "POST",
    auth: true,
    role: "USER",
    body: { targetType, targetId, reason, description },
  });
}

export async function fetchMyReports({ cursor, size = 20 } = {}) {
  const params = new URLSearchParams({ size: String(size) });
  if (cursor) params.set("cursor", cursor);
  const data = await apiRequest(`/reports/me?${params.toString()}`, { auth: true, role: "USER" });
  return getPageContent(data);
}

export async function fetchMyReport(reportId) {
  return apiRequest(`/reports/${reportId}`, { auth: true, role: "USER" });
}
