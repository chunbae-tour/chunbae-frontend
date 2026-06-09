import { MOCK_NOTIFICATIONS } from "../constants/mockData.js";
import { apiRequest, getPageContent } from "./apiClient.js";

const DEFAULT_NOTIFICATION_SETTINGS = {
  payment: true,
  companion: true,
  post: true,
  ad: false,
};

function normalizeNotification(notification = {}) {
  return {
    ...notification,
    id: notification.notificationId ?? notification.id,
    text: notification.message ?? notification.text ?? notification.title ?? "",
    time: notification.createdAt ?? notification.time ?? "",
    read: Boolean(notification.isRead ?? notification.read),
    icon: notification.icon ?? "🔔",
  };
}

export async function fetchNotifications() {
  const data = await apiRequest("/notifications?size=20", { auth: true });
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
  // TODO: 알림 설정 API 경로/카테고리 enum 확정 필요.
  const data = await apiRequest("/users/me/notification-settings", { auth: true });
  return { ...DEFAULT_NOTIFICATION_SETTINGS, ...data };
}

export async function updateNotificationSettings(settings) {
  // TODO: 알림 설정 저장 API 경로/카테고리 enum 확정 필요.
  const data = await apiRequest("/users/me/notification-settings", {
    method: "PUT",
    auth: true,
    body: settings,
  });
  return { ...DEFAULT_NOTIFICATION_SETTINGS, ...data };
}

export function getMockNotifications() {
  return MOCK_NOTIFICATIONS.map(normalizeNotification);
}

export function getMockNotificationSettings() {
  try {
    return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(localStorage.getItem("chunbae_notification_settings") || "{}") };
  } catch {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}
