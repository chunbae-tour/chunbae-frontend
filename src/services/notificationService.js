import { apiRequest, getPageContent } from "./apiClient.js";

const DEFAULT_NOTIFICATION_SETTINGS = {
  companion: true,
  support: true,
};
const NOTIFICATION_SETTINGS_STORAGE_KEY = "chunbae_notification_settings";

function readLocalNotificationSettings() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(NOTIFICATION_SETTINGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalNotificationSettings(settings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NOTIFICATION_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

function getNotificationIcon(type) {
  if (String(type).startsWith("CHAT_")) return "💬";
  if (String(type).startsWith("SUPPORT_")) return "🛟";
  if (String(type).includes("PAYMENT")) return "💰";
  return "🔔";
}

export function formatRelativeTime(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const diffMs = Date.now() - parsed.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 2) return "어제";
  return `${parsed.getMonth() + 1}월 ${parsed.getDate()}일`;
}

function pickText(...values) {
  return values.find(value => typeof value === "string" && value.trim())?.trim() || "";
}

function getNotificationVisualType(type, text = "") {
  const target = `${type || ""} ${text}`.toUpperCase();
  if (target.includes("KICK") || text.includes("강퇴") || text.includes("내보내")) return "kicked";
  if (target.includes("REJECT") || target.includes("DENY") || text.includes("거절") || text.includes("반려")) return "rejected";
  if (target.includes("APPROVE") || target.includes("ACCEPT") || text.includes("승인") || text.includes("수락")) return "approved";
  return "system";
}

function getNotificationFilterType(type, referenceType, text = "") {
  const target = `${type || ""} ${referenceType || ""} ${text}`.toUpperCase();
  if (
    target.includes("JOIN")
    || target.includes("COMPANION")
    || target.includes("CHAT_ROOM")
    || text.includes("참여")
    || text.includes("동행")
    || text.includes("채팅방")
  ) {
    return "participation";
  }
  return "system";
}

export function normalizeNotification(notification = {}) {
  const data = notification.data ?? notification.payload ?? {};
  const id = notification.notificationId ?? notification.id;
  const title = notification.title ?? "";
  const message = notification.message ?? notification.text ?? "";
  const createdAt = notification.createdAt ?? notification.time ?? "";
  const type = notification.type;
  const chatRoomId = notification.chatRoomId
    ?? notification.roomId
    ?? notification.chatRoom?.chatRoomId
    ?? data.chatRoomId
    ?? data.roomId
    ?? data.chatRoom?.chatRoomId
    ?? null;
  const postId = notification.postId
    ?? notification.companionPostId
    ?? data.postId
    ?? data.companionPostId
    ?? data.post?.postId
    ?? null;
  const joinRequestId = notification.joinRequestId ?? data.joinRequestId ?? null;
  const referenceId = notification.referenceId ?? notification.targetId ?? data.referenceId ?? data.targetId ?? null;
  const referenceType = notification.referenceType ?? notification.targetType ?? data.referenceType ?? data.targetType;
  const fallbackReferenceType = chatRoomId && String(type || "").startsWith("CHAT_") ? "CHAT_ROOM" : null;
  const resolvedReferenceType = referenceType ?? fallbackReferenceType;
  const targetTitle = pickText(
    notification.targetTitle,
    notification.targetName,
    notification.contextTitle,
    notification.chatRoomTitle,
    notification.postTitle,
    notification.companionPostTitle,
    notification.target?.title,
    notification.target?.name,
    data.targetTitle,
    data.targetName,
    data.contextTitle,
    data.chatRoomTitle,
    data.postTitle,
    data.companionPostTitle,
    data.target?.title,
    data.target?.name,
    data.chatRoom?.title,
    data.post?.title
  );
  const baseText = message || title;
  const displayText = targetTitle && baseText && !baseText.includes(targetTitle)
    ? `[${targetTitle}] ${baseText}`
    : baseText;
  const visualType = getNotificationVisualType(type, `${title} ${message}`);

  return {
    ...notification,
    id,
    notificationId: id,
    title,
    message,
    text: displayText,
    displayMessage: displayText,
    targetTitle,
    targetName: targetTitle,
    time: createdAt,
    timeText: formatRelativeTime(createdAt),
    read: Boolean(notification.isRead ?? notification.read),
    type,
    visualType,
    filterType: getNotificationFilterType(type, resolvedReferenceType, `${title} ${message}`),
    chatRoomId,
    roomId: chatRoomId,
    postId,
    companionPostId: postId,
    joinRequestId,
    referenceId,
    referenceType: resolvedReferenceType,
    icon: notification.icon ?? getNotificationIcon(notification.type),
  };
}

export function getNotificationToastText(notification = {}) {
  const title = notification.title || "새 알림";
  const message = notification.message || notification.text || "";
  return message ? `${title} - ${message}` : title;
}

export async function fetchNotifications({ cursor, size = 20 } = {}) {
  const params = new URLSearchParams({ size: String(size) });
  if (cursor) params.set("cursor", cursor);
  const data = await apiRequest(`/notifications?${params.toString()}`, { auth: true });
  return getPageContent(data).map(normalizeNotification);
}

export async function markNotificationRead(notificationId) {
  await apiRequest(`/notifications/${notificationId}/read`, { method: "PATCH", auth: true });
  return { notificationId };
}

export async function markAllNotificationsRead() {
  await apiRequest("/notifications/read-all", { method: "PATCH", auth: true });
  return true;
}

export async function deleteNotification(notificationId) {
  await apiRequest(`/notifications/${notificationId}`, { method: "DELETE", auth: true });
  return { notificationId };
}

export async function deleteAllNotifications(notificationIds = []) {
  await Promise.all(notificationIds.filter(Boolean).map(deleteNotification));
  return true;
}

export async function fetchNotificationSettings() {
  // TODO: 백엔드 알림 설정 API가 생기면 서버 동기화로 교체합니다.
  return { ...DEFAULT_NOTIFICATION_SETTINGS, ...readLocalNotificationSettings() };
}

export async function updateNotificationSettings(settings) {
  // TODO: 백엔드 알림 설정 API가 생기면 서버 동기화로 교체합니다.
  const nextSettings = { ...DEFAULT_NOTIFICATION_SETTINGS, ...settings };
  saveLocalNotificationSettings(nextSettings);
  return nextSettings;
}
