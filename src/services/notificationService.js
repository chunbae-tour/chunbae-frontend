import { apiRequest, getPageContent } from "./apiClient.js";

const DEFAULT_NOTIFICATION_SETTINGS = {
  payment: true,
  companion: true,
  post: true,
  ad: false,
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

function formatNotificationTime(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function normalizeNotification(notification = {}) {
  const id = notification.notificationId ?? notification.id;
  const title = notification.title ?? "";
  const message = notification.message ?? notification.text ?? "";
  const createdAt = notification.createdAt ?? notification.time ?? "";
  const type = notification.type;
  const fallbackReferenceType = String(type || "").startsWith("CHAT_") ? "CHAT_ROOM" : null;
  return {
    ...notification,
    id,
    notificationId: id,
    title,
    message,
    text: message || title,
    time: createdAt,
    timeText: formatNotificationTime(createdAt),
    read: Boolean(notification.isRead ?? notification.read),
    type,
    referenceId: notification.referenceId ?? notification.targetId ?? notification.chatRoomId ?? notification.roomId ?? null,
    referenceType: notification.referenceType ?? notification.targetType ?? fallbackReferenceType,
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
