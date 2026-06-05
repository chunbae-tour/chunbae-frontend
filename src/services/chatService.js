import { apiRequest, getPageContent } from "./apiClient.js";
import { getStoredAuthSession } from "./authService.js";

class ChatApiError extends Error {
  constructor(message, code, status) {
    super(message);
    this.name = "ChatApiError";
    this.code = code;
    this.status = status;
  }
}

function getPostId(postOrId) {
  return typeof postOrId === "object" ? postOrId?.id ?? postOrId?.postId : postOrId;
}

function normalizeTextKey(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function registerCompanionChatRoom({ post, room = {}, user = getStoredAuthSession("USER") }) {
  const postId = getPostId(post);
  if (!postId) return normalizeChatRoom(room);

  return normalizeChatRoom({
    ...room,
    postId,
    title: room.title || post?.title || "",
    description: room.description || post?.content || "",
    maxMembers: room.maxMembers || post?.max || 0,
    members: room.currentMembers ?? room.members ?? 1,
    currentMembers: room.currentMembers ?? room.members ?? 1,
    lastMsg: room.lastMsg || room.lastMessage || "",
    unread: room.unread ?? room.unreadCount ?? 0,
    tags: room.tags ?? [post?.place].filter(Boolean),
  });
}

export function getCompanionJoinState({ postId, user = getStoredAuthSession("USER") }) {
  return "idle";
}

export async function submitCompanionJoinRequest({ post, user = getStoredAuthSession("USER"), message = "참여 신청합니다." }) {
  const postId = getPostId(post);
  const postTitleKey = normalizeTextKey(post?.title);
  let chatRoomId = post?.chatRoomId ?? post?.roomId ?? post?.chatRoom?.chatRoomId;

  if (!chatRoomId) {
    const rooms = await apiRequest("/chat/rooms?size=50", { auth: true, role: "USER" });
    const list = Array.isArray(rooms) ? rooms : getPageContent(rooms);
    const matchedRoom = list.find((room) => {
      const roomPostId = room.postId ?? room.companionPostId ?? room.post?.id ?? room.post?.postId;
      if (roomPostId && String(roomPostId) === String(postId)) return true;
      return Boolean(postTitleKey && normalizeTextKey(room.title) === postTitleKey);
    });
    chatRoomId = matchedRoom?.chatRoomId ?? matchedRoom?.id;
  }

  if (!chatRoomId) {
    throw new ChatApiError("참여 신청을 보낼 채팅방을 찾지 못했습니다.", "CHAT_ROOM_NOT_FOUND", 404);
  }

  return apiRequest(`/chat/rooms/${chatRoomId}/join-requests`, {
    method: "POST",
    auth: true,
    role: "USER",
    body: { message },
  });
}

export function getCompanionRoomForPost({ postId, user = getStoredAuthSession("USER") }) {
  return null;
}

export function normalizeChatRoom(room = {}) {
  const id = room.chatRoomId ?? room.id;
  const lastMessage = room.lastMessage ?? room.lastMsg ?? room.latestMessage ?? room.recentMessage;
  const lastMessageText = typeof lastMessage === "object" && lastMessage !== null
    ? lastMessage.content ?? lastMessage.text ?? lastMessage.message ?? ""
    : lastMessage;
  const unreadCount = room.unreadCount ?? room.unread;

  return {
    ...room,
    id,
    chatRoomId: id,
    title: room.title ?? "",
    members: room.currentMembers ?? room.members ?? 0,
    maxMembers: room.maxMembers ?? 0,
    lastMsg: lastMessageText ?? "",
    unread: typeof unreadCount === "number" ? unreadCount : null,
    tags: room.tags ?? [],
  };
}

export function normalizeChatMessage(message = {}) {
  const unreadCount = message.unreadCount ?? message.unreadMemberCount ?? message.notReadCount ?? message.unread;

  return {
    ...message,
    id: message.messageId ?? message.id,
    userId: message.senderId ?? message.senderUserId ?? message.userId ?? message.memberId,
    user: message.senderNickname ?? message.user ?? "여행자",
    avatar: message.senderProfileImageUrl ?? message.profileImageUrl ?? message.avatar ?? "👤",
    messageType: message.messageType ?? message.type ?? "TEXT",
    text: message.content ?? message.text ?? "",
    time: message.sentAt ?? message.time ?? "",
    me: message.isMine ?? message.me ?? message.mine ?? null,
    read: message.isRead ?? message.read ?? message.readByMe ?? null,
    unreadCount: typeof unreadCount === "number" ? unreadCount : null,
  };
}

export function normalizeChatParticipant(participant = {}) {
  const userId = participant.userId ?? participant.memberId ?? participant.id;

  return {
    ...participant,
    userId,
    nickname: participant.nickname ?? participant.name ?? "여행자",
    role: participant.role ?? participant.participantRole ?? "MEMBER",
    score: participant.companionScore ?? participant.score ?? 0,
    language: participant.language ?? participant.preferredLanguage ?? "",
    joinedAt: participant.joinedAt ?? participant.createdAt ?? "",
    avatar: participant.avatar ?? "👤",
  };
}

function normalizeChatRoomList(data) {
  if (Array.isArray(data)) return data.map(normalizeChatRoom);

  const list = getPageContent(data?.rooms ? { content: data.rooms } : data);
  return Array.isArray(list) ? list.map(normalizeChatRoom) : [];
}

export async function fetchMyChatRooms({ cursor = "", size = 10 } = {}) {
  const params = new URLSearchParams({ size: String(size) });
  if (cursor) params.set("cursor", cursor);
  const data = await apiRequest(`/chat/rooms?${params.toString()}`, { auth: true, role: "USER" });
  return normalizeChatRoomList(data);
}

export async function createChatRoom({ postId, title, description, maxMembers }) {
  return apiRequest("/chat/rooms", {
    method: "POST",
    auth: true,
    role: "USER",
    body: { postId, title, description, maxMembers },
  });
}

export async function fetchChatMessages(chatRoomId, { cursor = "", size = 30 } = {}) {
  if (!chatRoomId) return [];
  const params = new URLSearchParams({ size: String(size) });
  if (cursor) params.set("cursor", cursor);
  const data = await apiRequest(`/chat/rooms/${chatRoomId}/messages?${params.toString()}`, { auth: true, role: "USER" });
  return getPageContent(data).map(normalizeChatMessage);
}

export async function sendChatMessage({ chatRoomId, content, attachmentIds = [] }) {
  if (!chatRoomId) throw new ChatApiError("채팅방 ID가 없습니다.", "MISSING_CHAT_ROOM_ID", 400);
  // TODO: 메시지 전송 API 확정 필요. WebSocket/STOMP 도입 시 이 함수는 REST fallback 또는 임시 전송용으로 유지합니다.
  const data = await apiRequest(`/chat/rooms/${chatRoomId}/messages`, {
    method: "POST",
    auth: true,
    role: "USER",
    body: { content, attachmentIds },
  });
  return normalizeChatMessage(data);
}

export async function markChatRoomRead(chatRoomId) {
  if (!chatRoomId) return false;
  // TODO: 읽음 처리 endpoint 확정 필요.
  await apiRequest(`/chat/rooms/${chatRoomId}/read`, {
    method: "PATCH",
    auth: true,
    role: "USER",
  });
  return true;
}

export async function leaveChatRoom(chatRoomId) {
  if (!chatRoomId) throw new ChatApiError("채팅방 ID가 없습니다.", "MISSING_CHAT_ROOM_ID", 400);
  await apiRequest(`/chat/rooms/${chatRoomId}/members/me`, {
    method: "DELETE",
    auth: true,
    role: "USER",
  });
  return true;
}

export async function closeChatRoom(chatRoomId) {
  if (!chatRoomId) throw new ChatApiError("채팅방 ID가 없습니다.", "MISSING_CHAT_ROOM_ID", 400);
  await apiRequest(`/chat/rooms/${chatRoomId}/close`, {
    method: "PATCH",
    auth: true,
    role: "USER",
  });
  return true;
}

const DEFAULT_REPORT_REASON = "OTHER";

async function createReport({ targetType, targetId, reason = DEFAULT_REPORT_REASON, description = "" }) {
  return apiRequest("/reports", {
    method: "POST",
    auth: true,
    role: "USER",
    body: {
      targetType,
      targetId,
      reason,
      description,
    },
  });
}

export async function reportChatRoom({ chatRoomId }) {
  if (!chatRoomId) throw new ChatApiError("채팅방 ID가 없습니다.", "MISSING_CHAT_ROOM_ID", 400);
  throw new ChatApiError(
    "현재 신고 API는 채팅방 대상 타입을 지원하지 않습니다. ReportTargetType에 CHAT_ROOM 추가가 필요합니다.",
    "REPORT_TARGET_TYPE_UNSUPPORTED",
    400,
  );
}

export async function reportChatMessage({ chatRoomId, messageId }) {
  if (!chatRoomId || !messageId) throw new ChatApiError("채팅방 또는 메시지 ID가 없습니다.", "MISSING_REPORT_TARGET", 400);
  throw new ChatApiError(
    "현재 신고 API는 채팅 메시지 대상 타입을 지원하지 않습니다. ReportTargetType에 CHAT_MESSAGE 추가가 필요합니다.",
    "REPORT_TARGET_TYPE_UNSUPPORTED",
    400,
  );
}

export async function reportChatParticipant({ userId, reason = DEFAULT_REPORT_REASON, description = "사용자 신고" }) {
  if (!userId) throw new ChatApiError("사용자 ID가 없습니다.", "MISSING_USER_ID", 400);
  await createReport({
    targetType: "USER",
    targetId: userId,
    reason,
    description,
  });
  return true;
}

export async function kickChatParticipant({ chatRoomId, userId }) {
  if (!chatRoomId || !userId) throw new ChatApiError("채팅방 또는 사용자 ID가 없습니다.", "MISSING_KICK_TARGET", 400);
  await apiRequest(`/chat/rooms/${chatRoomId}/members/${userId}`, {
    method: "DELETE",
    auth: true,
    role: "USER",
  });
  return true;
}

export async function fetchChatParticipants(chatRoomId) {
  if (!chatRoomId) return [];
  const data = await apiRequest(`/chat/rooms/${chatRoomId}/members`, { auth: true, role: "USER" });
  return getPageContent(data).map(normalizeChatParticipant);
}

export async function fetchJoinRequests(chatRoomId) {
  if (!chatRoomId) return [];
  const data = await apiRequest(`/chat/rooms/${chatRoomId}/join-requests`, { auth: true, role: "USER" });
  const list = Array.isArray(data) ? data : getPageContent(data);
  return list.map(request => ({
    id: request.joinRequestId ?? request.id,
    name: request.nickname ?? request.name ?? "여행자",
    msg: request.message ?? request.msg ?? "",
    score: request.companionScore ?? request.score ?? 0,
    count: request.companionReviewCount ?? request.count ?? 0,
    avatar: request.avatar ?? "👤",
  }));
}

export async function approveJoinRequest({ chatRoomId, joinRequestId }) {
  return apiRequest(`/chat/rooms/${chatRoomId}/join-requests/${joinRequestId}/approve`, {
    method: "POST",
    auth: true,
    role: "USER",
  });
}

export async function cancelJoinRequest({ chatRoomId, joinRequestId }) {
  await apiRequest(`/chat/rooms/${chatRoomId}/join-requests/${joinRequestId}`, {
    method: "DELETE",
    auth: true,
    role: "USER",
  });
  return true;
}

export async function rejectJoinRequest({ chatRoomId, joinRequestId }) {
  return apiRequest(`/chat/rooms/${chatRoomId}/join-requests/${joinRequestId}/reject`, {
    method: "POST",
    auth: true,
    role: "USER",
  });
}
