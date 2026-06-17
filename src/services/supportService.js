import { apiFormRequest, apiRequest, getPageContent } from "./apiClient.js";

export function normalizeSupportRoom(room = {}) {
  return {
    ...room,
    id: room.supportRoomId ?? room.id,
    supportRoomId: room.supportRoomId ?? room.id,
    userId: room.userId ?? null,
    adminId: room.adminId ?? null,
    status: room.status ?? "WAITING",
    summary: room.summary ?? "",
    createdAt: room.createdAt ?? "",
    closedAt: room.closedAt ?? null,
    lastMessage: room.lastMessage ?? null,
  };
}

export function normalizeSupportMessage(message = {}) {
  return {
    ...message,
    id: message.messageId ?? message.id,
    messageId: message.messageId ?? message.id,
    senderId: message.senderId ?? null,
    senderRole: message.senderRole ?? "CUSTOMER",
    messageType: message.messageType ?? "TEXT",
    content: message.content ?? "",
    fileUrl: message.fileUrl ?? "",
    fileName: message.fileName ?? "",
    fileSize: message.fileSize ?? null,
    sentAt: message.sentAt ?? message.createdAt ?? "",
  };
}

export function normalizeSupportFileUpload(file = {}) {
  return {
    fileUrl: file.fileUrl ?? "",
    fileName: file.fileName ?? "",
    fileSize: file.fileSize ?? null,
    contentType: file.contentType ?? "",
  };
}

export function sortSupportMessages(messages = []) {
  return [...messages].sort((a, b) => {
    const aTime = Date.parse(a.sentAt ?? "");
    const bTime = Date.parse(b.sentAt ?? "");
    if (!Number.isNaN(aTime) && !Number.isNaN(bTime) && aTime !== bTime) return aTime - bTime;
    return Number(a.messageId ?? a.id ?? 0) - Number(b.messageId ?? b.id ?? 0);
  });
}

export function mergeSupportMessages(current = [], incoming = []) {
  const byKey = new Map();
  [...current, ...incoming].forEach((message) => {
    const normalized = normalizeSupportMessage(message);
    const key = normalized.messageId ?? `${normalized.senderRole}-${normalized.sentAt}-${normalized.content}`;
    byKey.set(key, normalized);
  });
  return sortSupportMessages([...byKey.values()]);
}

export async function createSupportRoom(payload = {}) {
  const data = await apiRequest("/support/rooms", {
    method: "POST",
    auth: true,
    body: payload,
  });
  return normalizeSupportRoom(data);
}

export async function fetchMySupportRooms({ cursor, size = 20, status } = {}) {
  const params = new URLSearchParams({ size: String(size) });
  if (cursor) params.set("cursor", cursor);
  if (status) params.set("status", status);

  const data = await apiRequest(`/support/rooms/me?${params.toString()}`, { auth: true });
  return getPageContent(data).map(normalizeSupportRoom);
}

export async function fetchSupportMessages(supportRoomId, { cursor, size = 50 } = {}) {
  if (!supportRoomId) return [];

  const params = new URLSearchParams({ size: String(size) });
  if (cursor) params.set("cursor", cursor);

  const data = await apiRequest(`/support/rooms/${supportRoomId}/messages?${params.toString()}`, { auth: true });
  return getPageContent(data).map(normalizeSupportMessage);
}

export async function uploadSupportFile(supportRoomId, file, { role } = {}) {
  const formData = new FormData();
  formData.append("file", file);

  const data = await apiFormRequest(`/support/rooms/${supportRoomId}/files`, {
    method: "POST",
    auth: true,
    role,
    formData,
  });
  return normalizeSupportFileUpload(data);
}
