import { apiRequest, getPageContent } from "./apiClient.js";

export const REPORT_REASONS = [
  { value: "SPAM", label: "스팸/도배" },
  { value: "OBSCENE", label: "음란/성적 콘텐츠" },
  { value: "ILLEGAL", label: "불법 정보" },
  { value: "HARASSMENT", label: "욕설/혐오/괴롭힘" },
  { value: "MISINFORMATION", label: "허위 정보" },
  { value: "OTHER", label: "기타" },
];

export function getReportReasonLabel(reason) {
  return REPORT_REASONS.find(item => item.value === reason)?.label ?? "기타";
}

export async function createReport({ targetType, targetId, reason = "OTHER", description = "" }) {
  return apiRequest("/reports", {
    method: "POST",
    auth: true,
    role: "USER",
    body: {
      targetType,
      targetId,
      reason,
      description: String(description || "").trim(),
    },
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
