import { MOCK_CHATS } from "../constants/mockData.js";
import { apiRequest, getPageContent } from "./apiClient.js";

const MOCK_MESSAGES = [
  { id: 1, user: "Emma", text: "Hello! I'm excited about this tour!", time: "10:02", me: false },
  { id: 2, user: "여행자지수", text: "반가워요! 내일 오전 10시에 광장시장 입구에서 만나요 😊", time: "10:05", me: true },
  { id: 3, user: "Kim", text: "저도 참가할게요!", time: "10:08", me: false },
];

const MOCK_JOIN_REQUESTS = [
  { id: 1, name: "Emma", msg: "같이 가고 싶어요!", score: 4.7, count: 13, avatar: "🧑‍🦰" },
  { id: 2, name: "김민준", msg: "처음 가봐요 ㅎㅎ", score: 4.2, count: 5, avatar: "👦" },
  { id: 3, name: "박서연", msg: "광장시장 자주 가요!", score: 4.9, count: 21, avatar: "👩" },
];

const MOCK_PARTICIPANTS = [
  { userId: 11, nickname: "여행자지수", role: "HOST", companionScore: 4.8, language: "한국어", joinedAt: "방장" },
  { userId: 12, nickname: "Emma", role: "MEMBER", companionScore: 4.7, language: "English", joinedAt: "10:02 참여" },
  { userId: 13, nickname: "Kim", role: "MEMBER", companionScore: 4.3, language: "한국어", joinedAt: "10:08 참여" },
];

class ChatApiError extends Error {
  constructor(message, code, status) {
    super(message);
    this.name = "ChatApiError";
    this.code = code;
    this.status = status;
  }
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

export function getMockChatRooms() {
  return MOCK_CHATS.map(normalizeChatRoom);
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

export async function reportChatRoom({ chatRoomId, reason = "USER_REPORT" }) {
  if (!chatRoomId) throw new ChatApiError("채팅방 ID가 없습니다.", "MISSING_CHAT_ROOM_ID", 400);
  // TODO: 신고 사유 enum/본문 필드 확정 필요.
  await apiRequest(`/chat/rooms/${chatRoomId}/reports`, {
    method: "POST",
    auth: true,
    role: "USER",
    body: { reason },
  });
  return true;
}

export async function reportChatMessage({ chatRoomId, messageId, reason = "USER_REPORT" }) {
  if (!chatRoomId || !messageId) throw new ChatApiError("채팅방 또는 메시지 ID가 없습니다.", "MISSING_REPORT_TARGET", 400);
  // TODO: 채팅 메시지 신고 endpoint 확정 필요.
  await apiRequest(`/chat/rooms/${chatRoomId}/messages/${messageId}/reports`, {
    method: "POST",
    auth: true,
    role: "USER",
    body: { reason },
  });
  return true;
}

export async function reportChatParticipant({ userId, reason = "USER_REPORT" }) {
  if (!userId) throw new ChatApiError("사용자 ID가 없습니다.", "MISSING_USER_ID", 400);
  // TODO: 사용자 신고 endpoint와 신고 사유 enum 확정 필요.
  await apiRequest(`/users/${userId}/reports`, {
    method: "POST",
    auth: true,
    role: "USER",
    body: { reason },
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
  const data = await apiRequest(`/chat/rooms/${chatRoomId}`, { auth: true, role: "USER" });
  return getPageContent(data.members ?? data).map(normalizeChatParticipant);
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

export async function rejectJoinRequest({ chatRoomId, joinRequestId, reason }) {
  return apiRequest(`/chat/rooms/${chatRoomId}/join-requests/${joinRequestId}/reject`, {
    method: "POST",
    auth: true,
    role: "USER",
    body: { reason },
  });
}

export function getMockMessages() {
  return MOCK_MESSAGES;
}

export function getMockChatParticipants() {
  return MOCK_PARTICIPANTS.map(normalizeChatParticipant);
}

export function getMockJoinRequests() {
  return MOCK_JOIN_REQUESTS;
}
