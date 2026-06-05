import { MOCK_CHATS } from "../constants/mockData.js";
import { apiRequest, getPageContent } from "./apiClient.js";
import { getStoredAuthSession } from "./authService.js";

const DEMO_CHAT_ROOMS_KEY = "chunbae:demo:companionChatRooms";
const DEMO_JOIN_REQUESTS_KEY = "chunbae:demo:companionJoinRequests";

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

function readJsonStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJsonStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getActorKey(user = getStoredAuthSession("USER")) {
  return String(user?.userId ?? user?.email ?? user?.nickname ?? "anonymous");
}

function getActorName(user = getStoredAuthSession("USER")) {
  return user?.nickname ?? user?.email ?? "여행자";
}

function readDemoRooms() {
  return readJsonStorage(DEMO_CHAT_ROOMS_KEY, []);
}

function writeDemoRooms(rooms) {
  writeJsonStorage(DEMO_CHAT_ROOMS_KEY, rooms);
}

function readDemoJoinRequests() {
  return readJsonStorage(DEMO_JOIN_REQUESTS_KEY, []);
}

function writeDemoJoinRequests(requests) {
  writeJsonStorage(DEMO_JOIN_REQUESTS_KEY, requests);
}

function getPostId(postOrId) {
  return typeof postOrId === "object" ? postOrId?.id ?? postOrId?.postId : postOrId;
}

function getDemoRoomById(chatRoomId) {
  return readDemoRooms().find(room => String(room.chatRoomId ?? room.id) === String(chatRoomId));
}

function getDemoRoomByPostId(postId) {
  return readDemoRooms().find(room => String(room.postId) === String(postId));
}

export function getCompanionRoomByPostId(postId) {
  const room = getDemoRoomByPostId(postId);
  return room ? normalizeChatRoom(room) : null;
}

function normalizeDemoRoomForUser(room, user = getStoredAuthSession("USER")) {
  const actorKey = getActorKey(user);
  const approvedMemberKeys = room.approvedMemberKeys ?? [];
  const pendingCount = readDemoJoinRequests().filter(request => (
    String(request.postId) === String(room.postId) && request.status === "PENDING"
  )).length;

  return normalizeChatRoom({
    ...room,
    members: approvedMemberKeys.length || room.members || 1,
    currentMembers: approvedMemberKeys.length || room.currentMembers || 1,
    unread: room.hostKey === actorKey ? pendingCount : room.unread ?? 0,
  });
}

function mergeChatRooms(primaryRooms = [], extraRooms = []) {
  const merged = new Map();
  [...primaryRooms, ...extraRooms].forEach((room) => {
    const key = String(room.chatRoomId ?? room.id);
    if (!key) return;
    merged.set(key, normalizeChatRoom(room));
  });
  return [...merged.values()];
}

function mergeJoinRequests(primaryRequests = [], demoRequests = []) {
  const merged = new Map();
  [...primaryRequests, ...demoRequests].forEach((request) => {
    const key = request.id ? `id:${request.id}` : `name:${request.name}:${request.msg}`;
    if (!merged.has(key)) {
      merged.set(key, request);
      return;
    }
    merged.set(key, { ...request, ...merged.get(key) });
  });
  return [...merged.values()];
}

export function getDemoChatRoomsForCurrentUser(user = getStoredAuthSession("USER")) {
  const actorKey = getActorKey(user);
  return readDemoRooms()
    .filter(room => room.hostKey === actorKey || (room.approvedMemberKeys ?? []).includes(actorKey))
    .map(room => normalizeDemoRoomForUser(room, user));
}

export function registerCompanionChatRoom({ post, room = {}, user = getStoredAuthSession("USER") }) {
  const postId = getPostId(post);
  if (!postId) return normalizeChatRoom(room);

  const hostKey = getActorKey(user);
  const hostName = getActorName(user);
  const roomId = room.chatRoomId ?? room.id ?? `demo-room-${postId}`;
  const rooms = readDemoRooms();
  const existing = rooms.find(item => String(item.postId) === String(postId));
  const nextRoom = {
    ...existing,
    ...room,
    id: roomId,
    chatRoomId: roomId,
    postId,
    title: room.title || post?.title || existing?.title || "동행 채팅",
    description: room.description || post?.content || existing?.description || "",
    maxMembers: room.maxMembers || post?.max || existing?.maxMembers || 4,
    members: existing?.members || 1,
    currentMembers: existing?.currentMembers || 1,
    hostKey,
    hostName,
    approvedMemberKeys: Array.from(new Set([hostKey, ...(existing?.approvedMemberKeys ?? [])])),
    lastMsg: room.lastMsg || existing?.lastMsg || "아직 주고받은 메시지가 없습니다.",
    unread: room.unread ?? existing?.unread ?? 0,
    tags: room.tags ?? [post?.place].filter(Boolean),
    localDemo: true,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };

  writeDemoRooms([
    nextRoom,
    ...rooms.filter(item => String(item.postId) !== String(postId)),
  ]);

  return normalizeDemoRoomForUser(nextRoom, user);
}

export function getCompanionJoinState({ postId, user = getStoredAuthSession("USER") }) {
  const actorKey = getActorKey(user);
  const room = getDemoRoomByPostId(postId);
  if (room?.hostKey === actorKey || (room?.approvedMemberKeys ?? []).includes(actorKey)) return "approved";

  const request = readDemoJoinRequests().find(item => (
    String(item.postId) === String(postId) && item.actorKey === actorKey
  ));
  if (!request) return "idle";
  if (request.status === "APPROVED") return "approved";
  if (request.status === "REJECTED") return "rejected";
  return "pending";
}

export function requestCompanionJoin({ post, user = getStoredAuthSession("USER"), message = "참여 신청합니다." }) {
  const postId = getPostId(post);
  if (!postId) throw new ChatApiError("게시글 ID가 없습니다.", "MISSING_POST_ID", 400);

  const actorKey = getActorKey(user);
  const actorName = getActorName(user);
  const requests = readDemoJoinRequests();
  const existing = requests.find(item => String(item.postId) === String(postId) && item.actorKey === actorKey);
  const nextRequest = {
    ...existing,
    id: existing?.id ?? `demo-join-${postId}-${actorKey}`,
    joinRequestId: existing?.joinRequestId ?? `demo-join-${postId}-${actorKey}`,
    postId,
    actorKey,
    userId: user?.userId,
    name: actorName,
    nickname: actorName,
    msg: message,
    message,
    score: user?.companionScore ?? 4.7,
    count: user?.companionReviewCount ?? 0,
    avatar: "👤",
    status: existing?.status === "APPROVED" ? "APPROVED" : "PENDING",
    requestedAt: existing?.requestedAt ?? new Date().toISOString(),
  };

  writeDemoJoinRequests([
    nextRequest,
    ...requests.filter(item => !(String(item.postId) === String(postId) && item.actorKey === actorKey)),
  ]);

  return nextRequest;
}

export async function submitCompanionJoinRequest({ post, user = getStoredAuthSession("USER"), message = "참여 신청합니다." }) {
  const postId = getPostId(post);
  const room = getDemoRoomByPostId(postId);

  if (room?.chatRoomId && !String(room.chatRoomId).startsWith("demo-room-")) {
    try {
      await apiRequest(`/chat/rooms/${room.chatRoomId}/join-requests`, {
        method: "POST",
        auth: true,
        role: "USER",
        body: { message },
      });
    } catch {
      // 백엔드 참여 신청 API가 실패해도 로컬 시연 흐름은 유지합니다.
    }
  }

  return requestCompanionJoin({ post, user, message });
}

export function getCompanionRoomForPost({ postId, user = getStoredAuthSession("USER") }) {
  const room = getDemoRoomByPostId(postId);
  if (!room) return null;
  const actorKey = getActorKey(user);
  if (room.hostKey !== actorKey && !(room.approvedMemberKeys ?? []).includes(actorKey)) return null;
  return normalizeDemoRoomForUser(room, user);
}

function getDemoJoinRequestsForRoom(chatRoomId) {
  const room = getDemoRoomById(chatRoomId);
  if (!room?.postId) return [];

  return readDemoJoinRequests()
    .filter(request => String(request.postId) === String(room.postId) && request.status === "PENDING")
    .map(request => ({
      id: request.joinRequestId ?? request.id,
      name: request.nickname ?? request.name ?? "여행자",
      msg: request.message ?? request.msg ?? "",
      score: request.score ?? 0,
      count: request.count ?? 0,
      avatar: request.avatar ?? "👤",
      localDemo: true,
    }));
}

function getDemoParticipantsForRoom(chatRoomId) {
  const room = getDemoRoomById(chatRoomId);
  if (!room) return [];

  const approvedRequests = readDemoJoinRequests().filter(request => (
    String(request.postId) === String(room.postId) && request.status === "APPROVED"
  ));

  return [
    {
      userId: room.hostKey,
      nickname: room.hostName || "방장",
      role: "HOST",
      companionScore: 4.8,
      language: "한국어",
      joinedAt: "방장",
    },
    ...approvedRequests.map(request => ({
      userId: request.userId ?? request.actorKey,
      nickname: request.nickname ?? request.name ?? "여행자",
      role: "MEMBER",
      companionScore: request.score ?? 0,
      companionReviewCount: request.count ?? 0,
      language: "한국어",
      joinedAt: request.approvedAt ?? request.requestedAt ?? "",
    })),
  ].map(normalizeChatParticipant);
}

function approveDemoJoinRequest({ chatRoomId, joinRequestId }) {
  const room = getDemoRoomById(chatRoomId);
  if (!room) return false;

  const requests = readDemoJoinRequests();
  const target = requests.find(request => String(request.joinRequestId ?? request.id) === String(joinRequestId));
  if (!target) return false;

  const rooms = readDemoRooms();
  const approvedMemberKeys = Array.from(new Set([...(room.approvedMemberKeys ?? []), target.actorKey]));
  writeDemoRooms(rooms.map(item => (
    String(item.chatRoomId ?? item.id) === String(chatRoomId)
      ? { ...item, approvedMemberKeys, members: approvedMemberKeys.length, currentMembers: approvedMemberKeys.length }
      : item
  )));
  writeDemoJoinRequests(requests.map(request => (
    String(request.joinRequestId ?? request.id) === String(joinRequestId)
      ? { ...request, status: "APPROVED", approvedAt: new Date().toISOString() }
      : request
  )));
  return true;
}

function rejectDemoJoinRequest({ joinRequestId, reason }) {
  const requests = readDemoJoinRequests();
  const target = requests.find(request => String(request.joinRequestId ?? request.id) === String(joinRequestId));
  if (!target) return false;

  writeDemoJoinRequests(requests.map(request => (
    String(request.joinRequestId ?? request.id) === String(joinRequestId)
      ? { ...request, status: "REJECTED", reason, rejectedAt: new Date().toISOString() }
      : request
  )));
  return true;
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
  const demoRooms = getDemoChatRoomsForCurrentUser();

  try {
    const data = await apiRequest(`/chat/rooms?${params.toString()}`, { auth: true, role: "USER" });
    return mergeChatRooms(normalizeChatRoomList(data), demoRooms);
  } catch (error) {
    if (demoRooms.length > 0) return demoRooms;
    throw error;
  }
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
  const demoParticipants = getDemoParticipantsForRoom(chatRoomId);
  if (demoParticipants.length > 0) return demoParticipants;
  const data = await apiRequest(`/chat/rooms/${chatRoomId}`, { auth: true, role: "USER" });
  return getPageContent(data.members ?? data).map(normalizeChatParticipant);
}

export async function fetchJoinRequests(chatRoomId) {
  if (!chatRoomId) return [];
  const demoRequests = getDemoJoinRequestsForRoom(chatRoomId);

  try {
    const data = await apiRequest(`/chat/rooms/${chatRoomId}/join-requests`, { auth: true, role: "USER" });
    const list = Array.isArray(data) ? data : getPageContent(data);
    const apiRequests = list.map(request => ({
        id: request.joinRequestId ?? request.id,
        name: request.nickname ?? request.name ?? "여행자",
        msg: request.message ?? request.msg ?? "",
        score: request.companionScore ?? request.score ?? 0,
        count: request.companionReviewCount ?? request.count ?? 0,
        avatar: request.avatar ?? "👤",
      }));
    return mergeJoinRequests(apiRequests, demoRequests);
  } catch (error) {
    if (demoRequests.length > 0) return demoRequests;
    throw error;
  }
}

export async function approveJoinRequest({ chatRoomId, joinRequestId }) {
  if (approveDemoJoinRequest({ chatRoomId, joinRequestId })) {
    return true;
  }
  return apiRequest(`/chat/rooms/${chatRoomId}/join-requests/${joinRequestId}/approve`, {
    method: "POST",
    auth: true,
    role: "USER",
  });
}

export async function rejectJoinRequest({ chatRoomId, joinRequestId, reason }) {
  if (rejectDemoJoinRequest({ joinRequestId, reason })) {
    return true;
  }
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
