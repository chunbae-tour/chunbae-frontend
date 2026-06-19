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
  return REPORT_REASONS.find((item) => item.value === reason)?.label ?? "기타";
}

export function getReportTargetLabel(targetType) {
  return (
    {
      POST_COMPANION: "동행 게시글",
      POST_FREE: "자유 게시글",
      COMMENT: "댓글",
      USER: "사용자",
      MERCHANT: "상인",
    }[targetType] ?? "신고 대상"
  );
}

export function getReportStatusLabel(status) {
  return (
    {
      PENDING: "접수됨",
      RESOLVED: "처리 완료",
      DISMISSED: "기각",
    }[status] ?? "상태 확인 중"
  );
}

function getReportTargetDetail(report = {}) {
  const target = report.target ?? {};
  return (
    report.targetTitle ??
    report.targetName ??
    report.targetNickname ??
    report.targetEmail ??
    target.title ??
    target.name ??
    target.nickname ??
    target.email ??
    ""
  );
}

export function normalizeMyReport(report = {}) {
  const reason = report.reason ?? "OTHER";
  const targetType = report.targetType ?? "";
  const targetId = report.targetId;
  const targetDetail = getReportTargetDetail(report);
  const targetBaseLabel = getReportTargetLabel(targetType);
  const status = report.status ?? "";

  return {
    id: report.reportId ?? report.id,
    reportId: report.reportId ?? report.id,
    targetType,
    targetId,
    targetDetail,
    targetLabel: targetDetail
      ? `${targetBaseLabel} · ${targetDetail}`
      : targetId
        ? `${targetBaseLabel} #${targetId}`
        : targetBaseLabel,
    reason,
    reasonLabel: getReportReasonLabel(reason),
    description: report.description ?? "",
    status,
    statusLabel: getReportStatusLabel(status),
    createdAt: report.createdAt ?? "",
  };
}

export async function createReport({ targetType, targetId, reason = "OTHER", description = "" }) {
  return apiRequest("/reports", {
    method: "POST",
    auth: true,
    body: {
      targetType,
      targetId,
      reason,
      description: String(description || "").trim(),
    },
  });
}

export async function fetchMyReports({ cursor, size = 20 } = {}) {
  const page = await fetchMyReportsPage({ cursor, size });
  return page.content;
}

export async function fetchMyReportsPage({ cursor, size = 20 } = {}) {
  const params = new URLSearchParams({ size: String(size) });
  if (cursor) params.set("cursor", cursor);
  const data = await apiRequest(`/reports/me?${params.toString()}`, { auth: true });
  return {
    content: getPageContent(data).map(normalizeMyReport),
    nextCursor: data?.nextCursor ?? null,
    hasNext: Boolean(data?.hasNext),
    size: data?.size ?? getPageContent(data).length,
  };
}

export async function fetchMyReport(reportId) {
  const data = await apiRequest(`/reports/${reportId}`, { auth: true });
  return normalizeMyReport(data);
}
