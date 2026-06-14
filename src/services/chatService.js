import { apiRequest, getPageContent } from "./apiClient.js";
import { getStoredAuthSession } from "./authService.js";
import { createReport } from "./reportService.js";

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
  let chatRoomId = post?.chatRoomId ?? post?.roomId ?? post?.chatRoom?.chatRoomId;

  if (!chatRoomId) {
    throw new ChatApiError(
      "이 모집글에 연결된 채팅방 정보를 찾지 못했습니다. 동행 게시글 응답에 chatRoomId가 필요합니다.",
      "COMPANION_CHAT_ROOM_ID_MISSING",
      409,
    );
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

export function normalizeChatRoomDetail(room = {}) {
  const normalizedRoom = normalizeChatRoom(room);
  const members = Array.isArray(room.members) ? room.members.map(normalizeChatParticipant) : [];

  return {
    ...normalizedRoom,
    postId: room.postId,
    description: room.description ?? "",
    ownerId: room.ownerId ?? room.hostId,
    hostId: room.ownerId ?? room.hostId,
    myMemberState: room.myMemberState,
    members,
    currentMembers: room.currentMembers ?? members.length ?? normalizedRoom.members,
    membersCount: room.currentMembers ?? members.length ?? normalizedRoom.members,
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
  const memberState = participant.memberState ?? participant.state ?? "";
  const role = memberState === "OWNER_ACTIVE"
    ? "HOST"
    : participant.role ?? participant.participantRole ?? "MEMBER";

  return {
    ...participant,
    userId,
    nickname: participant.nickname ?? participant.name ?? "여행자",
    role,
    memberState,
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

export async function fetchChatRoomDetail(chatRoomId) {
  if (!chatRoomId) throw new ChatApiError("채팅방 ID가 없습니다.", "MISSING_CHAT_ROOM_ID", 400);
  const data = await apiRequest(`/chat/rooms/${chatRoomId}`, { auth: true, role: "USER" });
  return normalizeChatRoomDetail(data);
}

export async function fetchChatMessagesPage(chatRoomId, { cursor = "", size = 30 } = {}) {
  if (!chatRoomId) return { messages: [], nextCursor: null, hasNext: false };
  const params = new URLSearchParams({ size: String(size) });
  if (cursor) params.set("cursor", cursor);
  const data = await apiRequest(`/chat/rooms/${chatRoomId}/messages?${params.toString()}`, { auth: true, role: "USER" });
  const messages = getPageContent(data).map(normalizeChatMessage);
  return {
    messages,
    nextCursor: data?.nextCursor ?? data?.cursor ?? null,
    hasNext: Boolean(data?.hasNext),
  };
}

export async function fetchChatMessages(chatRoomId, options = {}) {
  if (!chatRoomId) return [];
  const page = await fetchChatMessagesPage(chatRoomId, options);
  return page.messages;
}

export async function sendChatMessage({ chatRoomId, content, attachmentIds = [] }) {
  if (!chatRoomId) throw new ChatApiError("채팅방 ID가 없습니다.", "MISSING_CHAT_ROOM_ID", 400);
  void content;
  void attachmentIds;
  throw new ChatApiError(
    "채팅 메시지 전송은 STOMP /pub/chat/rooms/{chatRoomId}/messages 로만 지원됩니다.",
    "CHAT_REST_SEND_UNSUPPORTED",
    501
  );
}

export async function markChatRoomRead(chatRoomId) {
  if (!chatRoomId) return false;
  // 백엔드에 읽음 처리 REST endpoint가 아직 없어, 프론트 로컬 읽음 시각만 갱신합니다.
  // 실제 unreadCount/읽음 수 동기화는 백엔드 API가 추가되면 이 함수에서 연결합니다.
  return false;
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

export async function transferChatRoomOwner({ chatRoomId, newOwnerId }) {
  if (!chatRoomId || !newOwnerId) {
    throw new ChatApiError("채팅방 또는 새 방장 ID가 없습니다.", "MISSING_OWNER_TRANSFER_TARGET", 400);
  }
  await apiRequest(`/chat/rooms/${chatRoomId}/owner`, {
    method: "PATCH",
    auth: true,
    role: "USER",
    body: { newOwnerId },
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

export async function createCompanion(chatRoomId, { participantUserIds = [], tripStartDate, tripEndDate } = {}) {
  if (!chatRoomId) throw new ChatApiError("채팅방 ID가 없습니다.", "MISSING_CHAT_ROOM_ID", 400);
  if (!tripStartDate || !tripEndDate) {
    throw new ChatApiError("동행 여행 기간을 입력해주세요.", "MISSING_COMPANION_TRIP_DATES", 400);
  }
  return apiRequest(`/chat/rooms/${chatRoomId}/companion`, {
    method: "POST",
    auth: true,
    role: "USER",
    body: { participantUserIds, tripStartDate, tripEndDate },
  });
}

export async function cancelCompanion(chatRoomId) {
  if (!chatRoomId) throw new ChatApiError("채팅방 ID가 없습니다.", "MISSING_CHAT_ROOM_ID", 400);
  await apiRequest(`/chat/rooms/${chatRoomId}/companion`, {
    method: "DELETE",
    auth: true,
    role: "USER",
  });
  return true;
}

export async function addCompanionParticipants(chatRoomId, userIds = []) {
  if (!chatRoomId) throw new ChatApiError("채팅방 ID가 없습니다.", "MISSING_CHAT_ROOM_ID", 400);
  return apiRequest(`/chat/rooms/${chatRoomId}/companion/participants`, {
    method: "POST",
    auth: true,
    role: "USER",
    body: { userIds },
  });
}

export async function endCompanion(chatRoomId) {
  if (!chatRoomId) throw new ChatApiError("채팅방 ID가 없습니다.", "MISSING_CHAT_ROOM_ID", 400);
  return apiRequest(`/chat/rooms/${chatRoomId}/companion/end`, {
    method: "PATCH",
    auth: true,
    role: "USER",
  });
}

const DEFAULT_REPORT_REASON = "OTHER";

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

export async function reportChatParticipant({ userId, reason = DEFAULT_REPORT_REASON, description = "" }) {
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
  return list.map(request => {
    const applicant = request.applicant ?? request.writer ?? {};
    return {
      id: request.joinRequestId ?? request.id,
      userId: applicant.userId ?? request.userId,
      name: applicant.nickname ?? request.nickname ?? request.name ?? "여행자",
      msg: request.message ?? request.msg ?? "",
      score: applicant.companionScore ?? request.companionScore ?? request.score ?? 0,
      profileImageUrl: applicant.profileImageUrl ?? request.profileImageUrl ?? null,
      avatar: applicant.profileImageUrl ?? request.profileImageUrl ?? request.avatar ?? "👤",
      status: request.status ?? "PENDING",
      createdAt: request.createdAt ?? "",
    };
  });
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
