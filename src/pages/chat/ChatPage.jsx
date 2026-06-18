import { useEffect, useRef, useState } from "react";
import { COLORS, S } from "../../constants/colors";
import { ConfirmDialog, EmptyState, ErrorState, ReportDialog, SkeletonList } from "../../components/common";
import { getApiErrorHint } from "../../services/apiClient.js";
import { uploadChatAttachments } from "../../services/attachmentService.js";
import {
  addCompanionParticipants,
  approveJoinRequest,
  cancelCompanion,
  createCompanion,
  fetchChatMessages,
  fetchChatMessagesPage,
  fetchChatParticipants,
  fetchChatRoomDetail,
  fetchCompanionDetail,
  fetchJoinRequests,
  fetchMyChatRooms,
  fetchMyJoinRequests,
  endCompanion,
  kickChatParticipant,
  leaveChatRoom,
  markChatRoomRead,
  rejectJoinRequest,
  reportChatParticipant,
  transferChatRoomOwner,
} from "../../services/chatService.js";
import { getStoredAuthSession } from "../../services/authService.js";
import { createCompanionReview, fetchUserCompanionReviews } from "../../services/companionReviewService.js";
import { createChatRealtimeClient } from "../../services/chatRealtimeService.js";
import { REPORT_REASONS } from "../../services/reportService.js";
import { normalizeTranslationLanguage, translateText } from "../../services/translationService.js";

const TRANSLATION_BATCH_SIZE = 5;
const TRANSLATION_REQUEST_DELAY_MS = 1200;
const TRANSLATION_DEFAULT_COOLDOWN_MS = 30000;

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getMessageTimestamp(message = {}) {
  const raw = message.sentAt ?? message.createdAt ?? message.timestamp ?? message.time;
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatChatTime(message = {}) {
  const raw = message.sentAt ?? message.createdAt ?? message.timestamp ?? message.time;
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) return raw || "";

  return new Intl.DateTimeFormat("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(parsed));
}

function formatChatDate(message = {}) {
  const raw = message.sentAt ?? message.createdAt ?? message.timestamp ?? message.time;
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) return "";

  const date = new Date(parsed);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "오늘";
  if (date.toDateString() === yesterday.toDateString()) return "어제";

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatPlainDate(value) {
  if (!value) return "-";
  const parsed = Date.parse(`${value}T00:00:00`);
  if (Number.isNaN(parsed)) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
  }).format(new Date(parsed));
}

function getCompanionStatusLabel(status) {
  return {
    ONGOING: "진행 중",
    ENDED: "종료",
  }[status] ?? (status || "상태 없음");
}

function getJoinRequestStatusLabel(status) {
  return {
    PENDING: "대기",
    APPROVED: "수락",
    REJECTED: "거절",
  }[status] ?? (status || "확인 중");
}

function shouldShowDate(currentMessage, prevMessage) {
  if (!prevMessage) return true;
  
  const currentRaw = currentMessage.sentAt ?? currentMessage.createdAt ?? currentMessage.timestamp ?? currentMessage.time;
  const prevRaw = prevMessage.sentAt ?? prevMessage.createdAt ?? prevMessage.timestamp ?? prevMessage.time;
  
  const currentDate = new Date(Date.parse(currentRaw));
  const prevDate = new Date(Date.parse(prevRaw));
  
  return currentDate.toDateString() !== prevDate.toDateString();
}

function shouldShowProfile(currentMessage, prevMessage, isMine) {
  if (isMine) return false;
  if (!prevMessage) return true;
  
  const prevMine = prevMessage.isMine ?? prevMessage.me ?? false;
  if (prevMine) return true;
  
  const currentSender = currentMessage.senderId ?? currentMessage.senderUserId ?? currentMessage.userId ?? currentMessage.memberId;
  const prevSender = prevMessage.senderId ?? prevMessage.senderUserId ?? prevMessage.userId ?? prevMessage.memberId;
  
  return currentSender !== prevSender;
}

function sortMessages(messages = []) {
  return [...messages].sort((a, b) => getMessageTimestamp(a) - getMessageTimestamp(b));
}

function isSameMessageMinute(firstMessage, secondMessage) {
  if (!firstMessage || !secondMessage) return false;

  const firstDate = new Date(getMessageTimestamp(firstMessage));
  const secondDate = new Date(getMessageTimestamp(secondMessage));

  return firstDate.getFullYear() === secondDate.getFullYear()
    && firstDate.getMonth() === secondDate.getMonth()
    && firstDate.getDate() === secondDate.getDate()
    && firstDate.getHours() === secondDate.getHours()
    && firstDate.getMinutes() === secondDate.getMinutes();
}

function getMessageKey(message = {}) {
  const id = message.messageId ?? message.id;
  if (id && !String(id).startsWith("local-")) return `id:${id}`;
  const sender = message.senderId ?? message.senderUserId ?? message.userId ?? message.memberId ?? message.user ?? "";
  const text = message.content ?? message.text ?? "";
  const timestamp = getMessageTimestamp(message);
  return `fallback:${sender}:${text}:${timestamp}`;
}

function getLocalReplacementKey(message = {}) {
  const text = message.content ?? message.text ?? "";
  const sender = message.senderId ?? message.senderUserId ?? message.userId ?? message.memberId ?? message.user ?? "";
  return `${sender}:${text}`;
}

function mergeMessages(prevMessages = [], nextMessages = []) {
  const merged = new Map();
  const localMessageKeys = new Map();

  prevMessages.forEach((message) => {
    const id = message.messageId ?? message.id;
    if (id && String(id).startsWith("local-")) {
      localMessageKeys.set(getLocalReplacementKey(message), getMessageKey(message));
    }
  });

  [...prevMessages, ...nextMessages].forEach((message) => {
    const replacementKey = getLocalReplacementKey(message);
    const localKey = localMessageKeys.get(replacementKey);
    if (localKey) {
      merged.delete(localKey);
    }
    merged.set(getMessageKey(message), message);
  });
  return sortMessages([...merged.values()]);
}

function isSameUser(a, b) {
  return a != null && b != null && String(a) === String(b);
}

function isImageUrl(value) {
  return /^https?:\/\/\S+$/i.test(String(value || ""));
}

function ChatAvatar({ value, name = "사용자" }) {
  if (isImageUrl(value)) {
    return <img src={value} alt={`${name || "사용자"} 프로필`} />;
  }
  return value || "👤";
}

function getReadReceiptText(message = {}) {
  if (typeof message.unreadCount === "number") {
    if (message.unreadCount <= 0) return "읽음";
    return `${message.unreadCount}명 안읽음`;
  }
  if (typeof message.read === "boolean") return message.read ? "읽음" : "";
  return "";
}

function isSystemMessage(message = {}) {
  return String(message.messageType ?? message.type ?? "").toUpperCase() === "SYSTEM";
}

function getTranslationTargetLanguage(session = {}) {
  const rawLanguage = String(session.language ?? session.locale ?? "ko").trim();
  return normalizeTranslationLanguage(rawLanguage);
}

function isProbablyAlreadyTargetLanguage(content = "", targetLanguage = "KO") {
  const text = String(content || "").trim();
  if (!text) return true;

  const hasHangul = /[가-힣]/.test(text);
  const hasKana = /[\u3040-\u30ff]/.test(text);
  const hasHan = /[\u4e00-\u9fff]/.test(text);
  const hasLatin = /[A-Za-z]/.test(text);

  switch (targetLanguage) {
    case "KO":
      return hasHangul;
    case "JA":
      return hasKana;
    case "ZH_CN":
      return hasHan && !hasHangul && !hasKana;
    case "EN":
      return hasLatin && !hasHangul && !hasKana && !hasHan;
    default:
      return false;
  }
}

function getRoomReadStorageKey(roomId) {
  return `chat:lastReadAt:${roomId}`;
}

function getRoomLastReadAt(roomId) {
  const value = Number(localStorage.getItem(getRoomReadStorageKey(roomId)));
  return Number.isFinite(value) ? value : 0;
}

function setRoomLastReadAt(roomId, timestamp = Date.now()) {
  if (!roomId) return;
  localStorage.setItem(getRoomReadStorageKey(roomId), String(timestamp));
}

function formatRoomLastMessage(message, currentUserId) {
  if (!message) return "";
  const text = message.text ?? message.content ?? "";
  if (!text) return "";
  const senderId = message.senderId ?? message.senderUserId ?? message.userId ?? message.memberId;
  const senderName = isSameUser(senderId, currentUserId) || message.me ? "나" : message.user;
  return senderName ? `${senderName}: ${text}` : text;
}

export function ChatListPage({ onChatRoom, onLogin, showToast, compact = false, selectedRoomId = null }) {
  const [rooms, setRooms] = useState([]);
  const [myJoinRequests, setMyJoinRequests] = useState([]);
  const [myJoinRequestStatus, setMyJoinRequestStatus] = useState("idle");
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [loginRequired, setLoginRequired] = useState(false);
  const currentUserId = getStoredAuthSession("USER")?.userId;

  const enrichRooms = async (baseRooms) => {
    return Promise.all(baseRooms.map(async (room) => {
      if (room.lastMsg && typeof room.unread === "number") return room;

      try {
        const messages = sortMessages(await fetchChatMessages(room.chatRoomId ?? room.id, { size: 30 }));
        const lastMessage = messages[messages.length - 1];
        const lastReadAt = getRoomLastReadAt(room.chatRoomId ?? room.id);
        const derivedUnread = messages.filter((message) => {
          const senderId = message.senderId ?? message.senderUserId ?? message.userId ?? message.memberId;
          return getMessageTimestamp(message) > lastReadAt && !isSameUser(senderId, currentUserId);
        }).length;

        return {
          ...room,
          lastMsg: room.lastMsg || formatRoomLastMessage(lastMessage, currentUserId),
          unread: typeof room.unread === "number" ? room.unread : derivedUnread,
        };
      } catch {
        return room;
      }
    }));
  };

  const loadRooms = ({ silent = false } = {}) => {
    if (!silent) {
      setStatus("loading");
      setErrorMessage("");
      setLoginRequired(false);
    }
    fetchMyChatRooms({ size: 10 })
      .then(async (data) => {
        const enrichedRooms = await enrichRooms(data);
        setRooms(enrichedRooms);
        setErrorMessage("");
        setLoginRequired(false);
        setStatus(enrichedRooms.length > 0 ? "success" : "empty");
      })
      .catch((error) => {
        const requiresLogin = error?.status === 401;
        if (!silent) {
          setRooms([]);
          setStatus("error");
        }
        setLoginRequired(requiresLogin);
        setErrorMessage(
          requiresLogin
            ? "로그인 후에 채팅을 이용하실 수 있습니다."
            : getApiErrorHint(error),
        );
      });
  };

  const loadMyJoinRequests = () => {
    setMyJoinRequestStatus((current) => current === "idle" ? "loading" : current);
    return fetchMyJoinRequests({ size: 100 })
      .then((data) => {
        const pendingRequests = (data.content ?? []).filter((request) => String(request.status).toUpperCase() === "PENDING");
        setMyJoinRequests(pendingRequests);
        setMyJoinRequestStatus(pendingRequests.length > 0 ? "success" : "empty");
      })
      .catch(() => {
        setMyJoinRequestStatus("error");
      });
  };

  useEffect(() => {
    loadRooms();
    loadMyJoinRequests();

    const intervalId = window.setInterval(() => {
      loadRooms({ silent: true });
      loadMyJoinRequests();
    }, 2000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div style={compact ? undefined : S.screen} className={compact ? "web-chat-list-page is-compact" : "web-chat-list-page"}>
      {!compact && <div className="web-page-hero" style={{ background: COLORS.primary, padding: "44px 20px 20px" }}>
        <div style={{ color: "#fff", fontSize: 20, fontWeight: 700 }}>💬 동행 채팅</div>
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, marginTop: 4 }}>같이 여행할 친구를 찾아보세요</div>
      </div>}
      {compact && (
        <div className="chat-workspace-list-head">
          <div>
            <strong>동행 채팅</strong>
            <span>참여 중인 채팅방</span>
          </div>
          <em>{rooms.length}</em>
        </div>
      )}
      <div style={S.scrollArea} className="web-detail-scroll">
        <div className="web-chat-list" style={{ padding: "12px 16px" }}>
          {!compact && <div className="chat-api-note">채팅방은 동행 게시판 모집글에서 방장이 생성합니다.</div>}
          {status === "loading" && <SkeletonList count={3} />}
          {status === "error" && (
            <ErrorState
              title={loginRequired ? "로그인이 필요합니다." : "채팅방을 불러오지 못했습니다."}
              description={errorMessage || "백엔드 연결 상태를 확인한 뒤 다시 시도해주세요."}
              actionLabel={loginRequired ? "로그인" : "다시 시도"}
              onRetry={loginRequired ? onLogin : loadRooms}
            />
          )}
          {status === "empty" && (
            <EmptyState
              icon="💬"
              title="참여 중인 채팅방이 없습니다."
              description="동행 게시판에서 모집글을 확인하고 참여 신청을 보내보세요."
            />
          )}
          {status !== "loading" && (
            <div className="chat-room-list">
            {rooms.map(c => (
              <button
                key={c.id}
                type="button"
                className={String(selectedRoomId) === String(c.chatRoomId ?? c.id) ? "chat-room-row active" : "chat-room-row"}
                onClick={() => onChatRoom(c)}
              >
                <div>
                  <div className="chat-room-title-line">
                    <strong>{c.title}</strong>
                    {c.unread > 0 && <em>{c.unread}개 새 메시지</em>}
                  </div>
                  <span className={c.lastMsg ? "chat-room-last-message" : "chat-room-last-message empty"}>
                    {c.lastMsg || "아직 주고받은 메시지가 없습니다."}
                  </span>
                </div>
                <div className="chat-room-meta">
                  <small>👥 {c.members}/{c.maxMembers}</small>
                </div>
              </button>
            ))}
            </div>
          )}
          {myJoinRequestStatus !== "loading" && myJoinRequests.length > 0 && (
            <section className="chat-my-join-requests" aria-label="내 참여 신청">
              <div>
                <strong>내 참여 신청</strong>
                <span>대기 {myJoinRequests.length}건</span>
              </div>
              {myJoinRequests.map(request => (
                <button
                  key={request.joinRequestId ?? request.id}
                  type="button"
                  className="chat-my-join-request-row"
                  onClick={() => request.chatRoomId && onChatRoom({
                    chatRoomId: request.chatRoomId,
                    id: request.chatRoomId,
                    title: request.chatRoomTitle,
                  })}
                >
                  <span>{request.chatRoomTitle || "삭제된 채팅방"}</span>
                  <em className={`status-${String(request.status).toLowerCase()}`}>
                    {getJoinRequestStatusLabel(request.status)}
                  </em>
                </button>
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export function ChatWorkspacePage({ selectedRoom, onSelectRoom, onLogin, showToast }) {
  const selectedRoomId = selectedRoom?.chatRoomId ?? selectedRoom?.id;

  const handleRoomSelect = (room) => {
    onSelectRoom?.(room);
  };

  return (
    <div className={`chat-workspace-page${selectedRoom ? " has-selected-room" : ""}`}>
      <aside className="chat-workspace-sidebar">
        <ChatListPage
          compact
          selectedRoomId={selectedRoomId}
          onChatRoom={handleRoomSelect}
          onLogin={onLogin}
          showToast={showToast}
        />
      </aside>
      <section className="chat-workspace-detail">
        {selectedRoom ? (
          <>
            <button type="button" className="chat-workspace-mobile-back" onClick={() => onSelectRoom?.(null)}>
              ← 채팅 목록
            </button>
            <ChatRoomPage
              key={selectedRoomId}
              embedded
              room={selectedRoom}
              showToast={showToast}
              onBack={() => onSelectRoom?.(null)}
            />
          </>
        ) : (
          <div className="chat-workspace-empty">
            <span>💬</span>
            <strong>채팅방을 선택해주세요</strong>
            <p>왼쪽 목록에서 대화를 선택하면 바로 이어서 채팅할 수 있어요.</p>
          </div>
        )}
      </section>
    </div>
  );
}

export function ChatRoomPage({ room, onBack, showToast, embedded = false }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [olderCursor, setOlderCursor] = useState(null);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [actioning, setActioning] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [participantStatus, setParticipantStatus] = useState("idle");
  const [roomDetail, setRoomDetail] = useState(null);
  const [companionDetail, setCompanionDetail] = useState(null);
  const [companionStatus, setCompanionStatus] = useState("idle");
  const [managementPanelOpen, setManagementPanelOpen] = useState(false);
  const [managementTab, setManagementTab] = useState("participants");
  const [joinRequests, setJoinRequests] = useState([]);
  const [joinRequestStatus, setJoinRequestStatus] = useState("idle");
  const [joinRequestActioningId, setJoinRequestActioningId] = useState(null);
  const [profileTarget, setProfileTarget] = useState(null);
  const [profileReviews, setProfileReviews] = useState([]);
  const [profileReviewStatus, setProfileReviewStatus] = useState("idle");
  const [messageMenuId, setMessageMenuId] = useState(null);
  const [realtimeStatus, setRealtimeStatus] = useState("idle");
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [companionCancelConfirmOpen, setCompanionCancelConfirmOpen] = useState(false);
  const [kickConfirmTarget, setKickConfirmTarget] = useState(null);
  const [ownerTransferTarget, setOwnerTransferTarget] = useState(null);
  const [tripStartDate, setTripStartDate] = useState("");
  const [tripEndDate, setTripEndDate] = useState("");
  const [reportTarget, setReportTarget] = useState(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewScore, setReviewScore] = useState(5);
  const [reviewContent, setReviewContent] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewedUserIds, setReviewedUserIds] = useState(() => new Set());
  const [translationEnabled, setTranslationEnabled] = useState(false);
  const [translatedMessages, setTranslatedMessages] = useState({});
  const [translationErrors, setTranslationErrors] = useState({});
  const [translationSkippedMessages, setTranslationSkippedMessages] = useState({});
  const [translationNotice, setTranslationNotice] = useState("");
  const [translationCooldownUntil, setTranslationCooldownUntil] = useState(0);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const realtimeClientRef = useRef(null);
  const messageScrollRef = useRef(null);
  const messagesEndRef = useRef(null);
  const initialMessageScrollRef = useRef(false);
  const shouldAutoScrollRef = useRef(true);
  const translationPendingRef = useRef(new Set());
  const currentUserSession = getStoredAuthSession("USER");
  const currentUserId = currentUserSession?.userId;

  const roomId = room?.chatRoomId ?? room?.id;
  const activeRoom = roomDetail ?? room;
  const currentRoom = {
    title: activeRoom?.title ?? "동행 채팅",
    members: activeRoom?.membersCount ?? activeRoom?.members ?? activeRoom?.currentMembers ?? 0,
    maxMembers: activeRoom?.maxMembers ?? 0,
    hostId: activeRoom?.hostId ?? activeRoom?.ownerId,
  };
  const translationTargetLanguage = getTranslationTargetLanguage(currentUserSession);
  const resolveMessageMine = (message) => {
    if (typeof message.isMine === "boolean") return message.isMine;
    if (typeof message.me === "boolean") return message.me;
    return isSameUser(message.senderId ?? message.senderUserId ?? message.userId ?? message.memberId, currentUserId);
  };
  const displayedMessages = sortMessages(messages);
  const recentTranslationMessages = displayedMessages
    .filter((message) => {
      if (isSystemMessage(message) || resolveMessageMine(message)) return false;
      const content = message.content ?? message.text ?? "";
      return content && !isProbablyAlreadyTargetLanguage(content, translationTargetLanguage);
    })
    .slice(-TRANSLATION_BATCH_SIZE);
  const recentTranslationKeys = new Set(recentTranslationMessages.map(getMessageKey));
  const isCurrentUserHost = isSameUser(currentRoom.hostId, currentUserId)
    || participants.some(participant => isSameUser(participant.userId, currentUserId) && String(participant.role || "").toUpperCase() === "HOST");
  const companionParticipantIds = participants
    .map(participant => participant.userId)
    .filter(userId => userId && !isSameUser(userId, currentUserId));
  const companionEndedCount = companionDetail?.participants?.filter(participant => participant.endedAt).length ?? 0;
  const companionTotalCount = companionDetail?.participants?.length ?? 0;
  const hasOtherActiveParticipants = participants.some(participant => (
    !isSameUser(participant.userId, currentUserId)
    && !["MEMBER_LEFT", "MEMBER_KICKED"].includes(participant.memberState)
  ));
  const hasReviewedParticipant = (userId) => reviewedUserIds.has(String(userId));

  const loadCompanionDetail = ({ silent = true } = {}) => {
    if (!roomId) return Promise.resolve(null);
    if (!silent) setCompanionStatus("loading");
    return fetchCompanionDetail(roomId)
      .then((detail) => {
        setCompanionDetail(detail);
        setCompanionStatus(detail ? "success" : "empty");
        return detail;
      })
      .catch((error) => {
        setCompanionStatus("error");
        throw error;
      });
  };

  const isMessageListNearBottom = () => {
    const node = messageScrollRef.current;
    if (!node) return true;
    return node.scrollHeight - node.scrollTop - node.clientHeight < 120;
  };

  const scrollToLatestMessage = () => {
    const node = messageScrollRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
      return;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  };

  const loadJoinRequests = () => {
    if (!roomId) return Promise.resolve([]);
    setJoinRequestStatus("loading");

    return fetchJoinRequests(roomId)
      .then((data) => {
        setJoinRequests(data);
        setJoinRequestStatus(data.length > 0 ? "success" : "empty");
        return data;
      })
      .catch((error) => {
        setJoinRequests([]);
        setJoinRequestStatus("error");
        showToast?.(getApiErrorHint(error));
        return [];
      });
  };

  const refreshMessages = ({ silent = true, forceScroll = false } = {}) => {
    if (!roomId) return Promise.resolve([]);

    shouldAutoScrollRef.current = forceScroll || isMessageListNearBottom();

    return fetchChatMessagesPage(roomId, { size: 50 })
      .then((page) => {
        setMessages(prev => mergeMessages(prev, page.messages));
        return page.messages;
      })
      .catch((error) => {
        if (!silent) {
          showToast?.(getApiErrorHint(error));
        }
        return [];
      });
  };

  useEffect(() => {
    setTranslatedMessages({});
    setTranslationErrors({});
    setTranslationSkippedMessages({});
    translationPendingRef.current.clear();
  }, [translationTargetLanguage]);

  useEffect(() => {
    let ignore = false;
    setManagementPanelOpen(Boolean(room?.openManagementTab));
    setManagementTab(room?.openManagementTab ?? "participants");
    setJoinRequests([]);
    setJoinRequestStatus("idle");
    setRoomDetail(null);
    setCompanionDetail(null);
    setCompanionStatus("loading");
    setMessages([]);
    setOlderCursor(null);
    setHasOlderMessages(false);
    initialMessageScrollRef.current = false;
    shouldAutoScrollRef.current = true;

    fetchChatRoomDetail(roomId)
      .then((detail) => {
        if (ignore) return;
        setRoomDetail(detail);
        if (Array.isArray(detail.members) && detail.members.length > 0) {
          setParticipants(detail.members);
          setParticipantStatus("success");
        }
      })
      .catch(() => {
        if (!ignore) {
          setRoomDetail(null);
        }
      });

    fetchCompanionDetail(roomId)
      .then((detail) => {
        if (ignore) return;
        setCompanionDetail(detail);
        setCompanionStatus(detail ? "success" : "empty");
      })
      .catch(() => {
        if (!ignore) setCompanionStatus("error");
      });

    fetchChatMessagesPage(roomId, { size: 50 }).then((page) => {
      if (!ignore) {
        const sortedMessages = sortMessages(page.messages);
        setMessages(sortedMessages);
        setOlderCursor(page.nextCursor);
        setHasOlderMessages(page.hasNext);
        const latestTimestamp = getMessageTimestamp(sortedMessages[sortedMessages.length - 1]);
        setRoomLastReadAt(roomId, latestTimestamp || Date.now());
      }
    }).catch((error) => {
      if (ignore) return;
      setMessages([]);
      showToast?.(getApiErrorHint(error));
    });
    return () => { ignore = true; };
  }, [roomId, room?.openManagementTab, room?.managementRequestKey]);

  useEffect(() => {
    if (!isCurrentUserHost || joinRequestStatus !== "idle") return;
    loadJoinRequests();
  }, [isCurrentUserHost, joinRequestStatus]);

  useEffect(() => {
    if (!roomId || realtimeStatus === "connected") return undefined;

    let polling = false;
    const intervalId = window.setInterval(() => {
      if (polling) return;
      polling = true;
      refreshMessages().finally(() => {
        polling = false;
      });
    }, 3000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [roomId, realtimeStatus]);

  useEffect(() => {
    if (!roomId) return undefined;

    const client = createChatRealtimeClient({
      chatRoomId: roomId,
      onStatus: setRealtimeStatus,
      onMessage: (message) => {
        const senderId = message.senderId ?? message.senderUserId ?? message.userId ?? message.memberId;
        shouldAutoScrollRef.current = isSameUser(senderId, currentUserId) || isMessageListNearBottom();
        setMessages(prev => mergeMessages(prev, [message]));
      },
      onError: (error) => {
        console.error("Chat realtime failed", error);
      },
    });

    realtimeClientRef.current = client;
    client.connect();

    return () => {
      client.disconnect();
      if (realtimeClientRef.current === client) {
        realtimeClientRef.current = null;
      }
    };
  }, [roomId]);

  useEffect(() => {
    markChatRoomRead(roomId).catch(() => {
      // TODO: 읽음 처리 API 확정 전까지 화면 진입은 막지 않습니다.
    });
    setRoomLastReadAt(roomId);
  }, [roomId]);

  useEffect(() => {
    if (!messages.length) return;
    if (!initialMessageScrollRef.current || shouldAutoScrollRef.current) {
      window.requestAnimationFrame(() => {
        scrollToLatestMessage();
        initialMessageScrollRef.current = true;
      });
    }
  }, [messages.length]);

  useEffect(() => {
    if (!translationEnabled) return undefined;
    if (translationCooldownUntil && Date.now() < translationCooldownUntil) return undefined;

    let cancelled = false;
    const skippedKeys = [];
    const targets = recentTranslationMessages
      .filter((message) => {
        const key = getMessageKey(message);
        const content = message.content ?? message.text ?? "";
        if (!content || translationSkippedMessages[key]) return false;
        if (isProbablyAlreadyTargetLanguage(content, translationTargetLanguage)) {
          skippedKeys.push(key);
          return false;
        }
        return !translatedMessages[key] && !translationErrors[key] && !translationPendingRef.current.has(key);
      });

    if (skippedKeys.length > 0) {
      setTranslationSkippedMessages((prev) => {
        let changed = false;
        const next = { ...prev };
        skippedKeys.forEach((key) => {
          if (!next[key]) {
            next[key] = true;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }

    if (targets.length === 0) return undefined;

    const translateSequentially = async () => {
      for (const message of targets) {
        if (cancelled) break;
        const key = getMessageKey(message);
        const content = message.content ?? message.text ?? "";
        translationPendingRef.current.add(key);
        try {
          const result = await translateText(content, translationTargetLanguage);
          const translated = result?.translatedContent ?? result?.translatedText ?? result?.content ?? "";
          if (!cancelled) {
            setTranslatedMessages(prev => ({ ...prev, [key]: translated || content }));
          }
        } catch (error) {
          if (!cancelled) {
            if (error?.status === 429) {
              const retryAfterSeconds = Number(error.retryAfter);
              const waitMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
                ? retryAfterSeconds * 1000
                : TRANSLATION_DEFAULT_COOLDOWN_MS;
              setTranslationCooldownUntil(Date.now() + waitMs);
              setTranslationNotice(`번역 요청이 많아 잠시 쉬고 있어요. ${Math.ceil(waitMs / 1000)}초 후 다시 시도해주세요.`);
              break;
            }
            setTranslationErrors(prev => ({ ...prev, [key]: getApiErrorHint(error) || "번역을 불러오지 못했습니다." }));
          }
        } finally {
          translationPendingRef.current.delete(key);
        }
        if (!cancelled) {
          await wait(TRANSLATION_REQUEST_DELAY_MS);
        }
      }
    };

    translateSequentially();
    return () => {
      cancelled = true;
    };
  }, [translationEnabled, messages, translationTargetLanguage, translationCooldownUntil]);

  useEffect(() => {
    if (!translationEnabled || !translationCooldownUntil) return undefined;
    const remainingMs = translationCooldownUntil - Date.now();
    if (remainingMs <= 0) {
      setTranslationCooldownUntil(0);
      setTranslationNotice("");
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setTranslationCooldownUntil(0);
      setTranslationNotice("");
    }, remainingMs);

    return () => window.clearTimeout(timeoutId);
  }, [translationEnabled, translationCooldownUntil]);

  useEffect(() => {
    let ignore = false;
    setParticipantStatus("loading");

    fetchChatParticipants(roomId)
      .then((data) => {
        if (ignore) return;
        setParticipants(data);
        setParticipantStatus(data.length > 0 ? "success" : "empty");
      })
      .catch((error) => {
        if (ignore) return;
        setParticipants([]);
        setParticipantStatus("error");
      });

    return () => { ignore = true; };
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return undefined;
    let ignore = false;
    const refreshRoomState = () => {
      Promise.allSettled([fetchChatRoomDetail(roomId), fetchChatParticipants(roomId), fetchCompanionDetail(roomId)])
        .then(([detailResult, participantsResult, companionResult]) => {
          if (ignore) return;
          if (detailResult.status === "fulfilled") {
            setRoomDetail(detailResult.value);
          }
          if (participantsResult.status === "fulfilled") {
            setParticipants(participantsResult.value);
            setParticipantStatus(participantsResult.value.length > 0 ? "success" : "empty");
          }
          if (companionResult.status === "fulfilled") {
            setCompanionDetail(companionResult.value);
            setCompanionStatus(companionResult.value ? "success" : "empty");
          }
        });
    };
    const intervalId = window.setInterval(refreshRoomState, 3000);
    return () => {
      ignore = true;
      window.clearInterval(intervalId);
    };
  }, [roomId]);

  const send = async () => {
    const content = input.trim();
    if ((!content && pendingAttachments.length === 0) || sending) return;

    setSending(true);
    shouldAutoScrollRef.current = true;
    try {
      if (!realtimeClientRef.current?.isConnected()) {
        showToast?.("채팅 서버 연결이 끊겼습니다. 잠시 후 다시 시도해주세요.");
        return;
      }

      let uploadedAttachments = [];
      if (pendingAttachments.length > 0) {
        uploadedAttachments = await uploadChatAttachments(pendingAttachments, { chatRoomId: roomId });
      }

      if (uploadedAttachments.length === 0) {
        realtimeClientRef.current.send({ content, messageType: "TEXT" });
      } else {
        uploadedAttachments.forEach((file, index) => {
          realtimeClientRef.current.send({
            content: index === 0 ? content : "",
            messageType: file.messageType,
            fileUrl: file.fileUrl,
            fileName: file.fileName,
            fileSize: file.fileSize,
          });
        });
      }

      shouldAutoScrollRef.current = true;
      setInput("");
      setPendingAttachments([]);
    } catch (error) {
      showToast?.(getApiErrorHint(error));
      return;
    } finally {
      setSending(false);
    }
  };

  const loadOlderMessages = async () => {
    if (!roomId || !olderCursor || loadingOlder) return;
    const node = messageScrollRef.current;
    const previousScrollHeight = node?.scrollHeight ?? 0;
    const previousScrollTop = node?.scrollTop ?? 0;
    shouldAutoScrollRef.current = false;
    setLoadingOlder(true);

    try {
      const page = await fetchChatMessagesPage(roomId, { cursor: olderCursor, size: 50 });
      setMessages(prev => mergeMessages(page.messages, prev));
      setOlderCursor(page.nextCursor);
      setHasOlderMessages(page.hasNext);
      window.requestAnimationFrame(() => {
        if (!node) return;
        const heightDiff = node.scrollHeight - previousScrollHeight;
        node.scrollTop = previousScrollTop + heightDiff;
      });
    } catch (error) {
      showToast?.(getApiErrorHint(error));
    } finally {
      setLoadingOlder(false);
    }
  };

  const addLocalAttachments = (event, type) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setPendingAttachments(prev => [
      ...prev,
      ...files.map(file => ({
        id: `${type}-${file.name}-${file.lastModified}`,
        type,
        name: file.name,
        size: file.size,
        file,
        uploadId: null,
      })),
    ]);
    setAttachOpen(false);
    event.target.value = "";
    showToast?.("첨부 파일을 추가했습니다.");
  };

  const removeAttachment = (id) => {
    setPendingAttachments(prev => prev.filter(item => item.id !== id));
  };

  const runRoomAction = async ({ key, action, successMessage, afterSuccess }) => {
    if (actioning) return;
    setActioning(key);
    try {
      await action();
      showToast?.(successMessage);
      await afterSuccess?.();
    } catch (error) {
      showToast?.(getApiErrorHint(error));
    } finally {
      setActioning("");
    }
  };

  const handleRoomReport = () => {
    showToast?.("채팅방 신고는 백엔드 ReportTargetType에 CHAT_ROOM 추가 후 연결할 수 있습니다.");
  };

  const handleLeaveRoom = () => runRoomAction({
    key: "leave-room",
    action: () => leaveChatRoom(roomId),
    successMessage: "채팅방에서 나갔습니다.",
    afterSuccess: onBack,
  });

  const handleCreateCompanion = () => {
    if (!tripStartDate || !tripEndDate) {
      setManagementPanelOpen(true);
      setManagementTab("settings");
      showToast?.("설정에서 동행 여행 시작일과 종료일을 입력해주세요.");
      return;
    }
    if (tripEndDate < tripStartDate) {
      showToast?.("동행 종료일은 시작일보다 빠를 수 없습니다.");
      return;
    }
    runRoomAction({
      key: "companion-create",
      action: () => createCompanion(roomId, {
        participantUserIds: companionParticipantIds,
        tripStartDate,
        tripEndDate,
      }),
      successMessage: "동행을 생성했습니다.",
      afterSuccess: () => loadCompanionDetail(),
    });
  };

  const handleAddCompanion = () => {
    if (companionParticipantIds.length === 0) {
      showToast?.("추가할 참여자가 없습니다.");
      return;
    }
    runRoomAction({
      key: "companion-add",
      action: () => addCompanionParticipants(roomId, companionParticipantIds),
      successMessage: "동행 참여자를 추가했습니다.",
      afterSuccess: () => loadCompanionDetail(),
    });
  };

  const handleEndCompanion = () => runRoomAction({
    key: "companion-end",
    action: () => endCompanion(roomId),
    successMessage: "동행을 종료했습니다. 참여자 리뷰를 남길 수 있습니다.",
    afterSuccess: () => loadCompanionDetail(),
  });

  const handleCancelCompanion = () => runRoomAction({
    key: "companion-cancel",
    action: () => cancelCompanion(roomId),
    successMessage: "진행 중인 동행을 취소했습니다.",
    afterSuccess: () => {
      setCompanionCancelConfirmOpen(false);
      return loadCompanionDetail();
    },
  });

  const handleTransferOwner = (participant) => {
    if (!participant?.userId) return;
    runRoomAction({
      key: `owner-transfer-${participant.userId}`,
      action: () => transferChatRoomOwner({ chatRoomId: roomId, newOwnerId: participant.userId }),
      successMessage: `${participant.nickname} 님에게 방장을 위임했습니다.`,
      afterSuccess: () => {
        setOwnerTransferTarget(null);
        Promise.all([fetchChatRoomDetail(roomId), fetchChatParticipants(roomId)])
          .then(([detail, nextParticipants]) => {
            setRoomDetail(detail);
            setParticipants(nextParticipants);
            setParticipantStatus(nextParticipants.length > 0 ? "success" : "empty");
          })
          .catch(() => {});
      },
    });
  };

  const confirmLeaveRoom = () => {
    setLeaveConfirmOpen(false);
    handleLeaveRoom();
  };

  const handleMessageReport = (message) => {
    const messageProfile = getMessageProfile(message);
    if (!messageProfile.userId) {
      showToast?.("메시지 작성자 정보를 찾지 못해 신고할 수 없습니다.");
      return;
    }
    if (resolveMessageMine(message)) {
      showToast?.("내가 보낸 메시지는 신고할 수 없습니다.");
      return;
    }
    const text = message.content ?? message.text ?? "";
    const messageId = message.messageId ?? message.id;
    const roomTitle = currentRoom?.title || room?.title || "채팅방";
    const context = [
      `채팅방: ${roomTitle}`,
      messageId ? `메시지 ID: ${messageId}` : null,
      text ? `메시지 내용: ${text}` : null,
    ].filter(Boolean).join("\n");
    setReportTarget({
      userId: messageProfile.userId,
      label: `${messageProfile.nickname || "상대방"}님의 메시지`,
      initialDescription: context.slice(0, 500),
    });
  };

  const handleProfileReport = (target) => {
    if (!target.userId) {
      showToast?.("사용자 신고는 대상 userId가 연결되면 활성화됩니다.");
      return;
    }
    setReportTarget({
      userId: target.userId,
      label: `${target.nickname || "상대방"} 사용자`,
    });
  };

  const openCompanionReview = (participant) => {
    if (!participant?.userId || isSameUser(participant.userId, currentUserId)) {
      showToast?.("리뷰를 남길 참여자 정보를 찾지 못했습니다.");
      return;
    }
    if (hasReviewedParticipant(participant.userId)) {
      showToast?.("이미 동행 리뷰를 남긴 참여자입니다.");
      return;
    }
    setReviewTarget(participant);
    setReviewScore(5);
    setReviewContent("");
  };

  const submitCompanionReview = async () => {
    if (!reviewTarget || reviewSubmitting) return;
    setReviewSubmitting(true);
    try {
      await createCompanionReview({
        chatRoomId: Number(roomId),
        targetUserId: Number(reviewTarget.userId),
        score: reviewScore,
        content: reviewContent.trim(),
      });
      showToast?.(`${reviewTarget.nickname || "참여자"} 님에게 동행 리뷰를 남겼습니다.`);
      setReviewedUserIds(prev => new Set(prev).add(String(reviewTarget.userId)));
      setReviewTarget(null);
      setReviewContent("");
      setReviewScore(5);
    } catch (error) {
      if (error?.status === 403) {
        showToast?.("동행 종료 후 함께한 참여자에게만 리뷰를 남길 수 있습니다.");
      } else {
        showToast?.(getApiErrorHint(error));
      }
    } finally {
      setReviewSubmitting(false);
    }
  };

  const submitUserReport = async ({ reason, description }) => {
    if (!reportTarget || reportSubmitting) return;
    setReportSubmitting(true);
    try {
      await reportChatParticipant({
        userId: reportTarget.userId,
        reason,
        description,
      });
      setReportTarget(null);
      setProfileTarget(null);
      showToast?.("사용자 신고가 접수되었습니다.");
    } catch (error) {
      showToast?.(getApiErrorHint(error));
    } finally {
      setReportSubmitting(false);
    }
  };

  const openManagementPanel = (tab = "participants") => {
    setManagementTab(tab);
    setManagementPanelOpen(true);
  };

  const openProfile = (target) => {
    setProfileTarget(target);
    setMessageMenuId(null);
    setProfileReviews([]);
    setProfileReviewStatus(target?.userId ? "loading" : "empty");
    if (!target?.userId) return;

    fetchUserCompanionReviews(target.userId, { size: 3 })
      .then((items) => {
        setProfileReviews(items);
        setProfileReviewStatus(items.length > 0 ? "success" : "empty");
        const alreadyReviewedByMe = items.some((item) => (
          isSameUser(item.reviewerId ?? item.writerId ?? item.userId, currentUserId)
          || (currentUserSession?.nickname && item.reviewerNickname === currentUserSession.nickname)
        ));
        if (alreadyReviewedByMe) {
          setReviewedUserIds(prev => new Set(prev).add(String(target.userId)));
        }
      })
      .catch(() => {
        setProfileReviews([]);
        setProfileReviewStatus("error");
      });
  };

  const getMessageProfile = (message) => {
    const userId = message.senderId ?? message.senderUserId ?? message.userId ?? message.memberId;
    const matchedParticipant = participants.find(participant => isSameUser(participant.userId, userId));
    return {
      ...matchedParticipant,
      userId: matchedParticipant?.userId ?? userId,
      nickname: matchedParticipant?.nickname ?? message.user ?? "상대방",
      profileImageUrl: matchedParticipant?.profileImageUrl ?? message.profileImageUrl ?? message.senderProfileImageUrl ?? "",
      avatar: matchedParticipant?.profileImageUrl ?? message.profileImageUrl ?? message.senderProfileImageUrl ?? matchedParticipant?.avatar ?? message.avatar ?? "👤",
      language: matchedParticipant?.language,
      score: matchedParticipant?.score,
      role: matchedParticipant?.role,
    };
  };

  const handleKick = (participant) => {
    if (!participant?.userId) {
      showToast?.("상대방 내보내기는 참여자 userId가 필요합니다.");
      return;
    }
    if (participant.role === "HOST") {
      showToast?.("방장은 내보낼 수 없습니다.");
      return;
    }

    runRoomAction({
      key: `kick-${participant.userId}`,
      action: () => kickChatParticipant({ chatRoomId: roomId, userId: participant.userId }),
      successMessage: `${participant.nickname} 님을 채팅방에서 내보냈습니다.`,
      afterSuccess: () => setKickConfirmTarget(null),
    });
  };

  const handleToggleTranslation = () => {
    setTranslationEnabled((enabled) => {
      const nextEnabled = !enabled;
      if (nextEnabled) {
        setTranslationErrors({});
        setTranslationCooldownUntil(0);
        setTranslationNotice("최근 상대 메시지부터 조금씩 번역합니다.");
      } else {
        setTranslationNotice("");
      }
      return nextEnabled;
    });
  };

  const handleJoinRequest = async (requestId, action) => {
    if (joinRequestActioningId) return;
    setJoinRequestActioningId(requestId);
    try {
      if (action === "approve") {
        await approveJoinRequest({ chatRoomId: roomId, joinRequestId: requestId });
      } else {
        await rejectJoinRequest({ chatRoomId: roomId, joinRequestId: requestId });
      }
      setJoinRequests((prev) => prev.map((request) => (
        request.id === requestId
          ? { ...request, status: action === "approve" ? "APPROVED" : "REJECTED" }
          : request
      )));
      showToast?.(action === "approve" ? "참여 신청을 수락했습니다." : "참여 신청을 거절했습니다.");
      if (action === "approve") {
        fetchChatParticipants(roomId)
          .then((data) => {
            setParticipants(data);
            setParticipantStatus(data.length > 0 ? "success" : "empty");
          })
          .catch(() => {});
      }
    } catch (error) {
      showToast?.(getApiErrorHint(error));
    } finally {
      setJoinRequestActioningId(null);
    }
  };

  const pendingJoinRequestCount = joinRequests.filter(request => request.status === "PENDING").length;
  const realtimeLabel = realtimeStatus === "connected"
    ? "실시간 채팅 연결됨"
    : realtimeStatus === "connecting"
      ? "실시간 채팅 연결 중"
      : "실시간 채팅 연결 끊김";

  return (
    <div
      style={embedded ? undefined : S.screen}
      className={`${embedded ? "web-chat-room-page is-embedded" : "web-chat-room-page"}${managementPanelOpen ? " management-open" : ""}`}
    >
      <div className="web-page-topbar" style={{ background: COLORS.primary, padding: "44px 16px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        {!embedded && <div onClick={onBack} style={{ color: "#fff", fontSize: 14, cursor: "pointer" }}>←</div>}
        <div style={{ flex: 1 }}>
          <div className="chat-room-title-line">
            <div style={{ color: "#fff", fontSize: 16, fontWeight: 700 }}>{currentRoom.title}</div>
            {isCurrentUserHost && (
              <div className="chat-companion-actions" aria-label="동행 관리">
                <button type="button" disabled={Boolean(actioning)} onClick={handleCreateCompanion}>동행 생성</button>
                <button type="button" disabled={Boolean(actioning)} onClick={handleAddCompanion}>동행 추가</button>
                <button type="button" disabled={Boolean(actioning)} onClick={handleEndCompanion}>동행 종료</button>
              </div>
            )}
          </div>
          <div className="chat-room-member-line">
            <span>👥 {currentRoom.members}/{currentRoom.maxMembers}명</span>
            <span className={`chat-realtime-indicator ${realtimeStatus}`} aria-label={realtimeLabel} title={realtimeLabel} />
          </div>
        </div>
        <div className="chat-room-header-actions">
          <button
            type="button"
            className={`chat-translation-button${translationEnabled ? " active" : ""}`}
            onClick={handleToggleTranslation}
            aria-pressed={translationEnabled}
          >
            번역 {translationEnabled ? "ON" : "OFF"}
          </button>
          <div className="chat-room-menu-wrap">
            <button
              type="button"
              className="chat-room-menu-button"
              onClick={() => setManagementPanelOpen(open => !open)}
              aria-label="채팅방 관리"
              aria-expanded={managementPanelOpen}
            >
              ☰
            </button>
          </div>
        </div>
      </div>
      {translationEnabled && translationNotice && (
        <div className="chat-translation-notice">
          {translationNotice}
        </div>
      )}
      <div ref={messageScrollRef} className="web-chat-room-body" style={{ ...S.scrollArea, padding: "20px 12px" }}>
        {displayedMessages.length === 0 && (
          <EmptyState
            icon="💬"
            title="아직 채팅 기록이 없습니다."
            description="참여자가 승인되면 이 방에서 메시지를 주고받을 수 있어요."
          />
        )}
        {displayedMessages.length > 0 && hasOlderMessages && (
          <div className="chat-history-loader">
            <button type="button" disabled={loadingOlder} onClick={loadOlderMessages}>
              {loadingOlder ? "불러오는 중..." : "이전 메시지 보기"}
            </button>
          </div>
        )}
        {displayedMessages.map((m, index) => {
          if (isSystemMessage(m)) {
            return (
              <div key={getMessageKey(m)} className="chat-system-message">
                <span>{m.text ?? m.content ?? "채팅방 알림입니다."}</span>
              </div>
            );
          }
          const mine = resolveMessageMine(m);
          const readReceiptText = getReadReceiptText(m);
          const messageId = m.messageId ?? m.id;
          const messageKey = getMessageKey(m);
          const messageProfile = !mine ? getMessageProfile(m) : null;
          const translatedText = translatedMessages[messageKey];
          const translationFailed = translationErrors[messageKey];
          const translationSkipped = translationSkippedMessages[messageKey];
          const translationErrorText = typeof translationFailed === "string" ? translationFailed : "번역을 불러오지 못했습니다.";
          
          const prevMessage = index > 0 ? displayedMessages[index - 1] : null;
          const nextMessage = displayedMessages[index + 1] ?? null;
          const showDate = shouldShowDate(m, prevMessage);
          const showProfile = shouldShowProfile(m, prevMessage, mine);
          const showTime = !nextMessage
            || resolveMessageMine(nextMessage) !== mine
            || !isSameMessageMinute(m, nextMessage);
          
          return (
          <div key={messageKey}>
            {showDate && (
              <div className="chat-date-divider">
                <span>{formatChatDate(m)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", marginBottom: showProfile || showTime ? 12 : 4, alignItems: "flex-end" }}>
              {!mine && (
                <div style={{ width: 32, height: 32, marginRight: 6, flexShrink: 0 }}>
                  {showProfile && (
                    <button 
                      type="button" 
                      className="chat-message-avatar"
                      onClick={() => openProfile(messageProfile)} 
                      style={{ 
                        width: 32, 
                        height: 32, 
                        borderRadius: "50%", 
                        background: COLORS.bg, 
                        border: 0, 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center", 
                        fontSize: 15, 
                        cursor: "pointer" 
                      }}
                    >
                      <ChatAvatar value={messageProfile?.avatar} name={messageProfile?.nickname} />
                    </button>
                  )}
                </div>
              )}
              <div className={mine ? "chat-message-stack mine" : "chat-message-stack"} style={{ maxWidth: "80%", minWidth: 0 }}>
                {!mine && showProfile && (
                  <button 
                    type="button" 
                    className="chat-message-sender" 
                    onClick={() => openProfile(messageProfile)}
                    style={{ 
                      fontSize: 13, 
                      fontWeight: 700, 
                      color: COLORS.textMuted, 
                      marginBottom: 4, 
                      border: 0, 
                      background: "transparent", 
                      padding: "0 4px", 
                      cursor: "pointer",
                      textAlign: "left"
                    }}
                  >
                    {messageProfile?.nickname ?? m.user}
                  </button>
                )}
                <div className="chat-message-line" style={{ display: "flex", alignItems: "flex-end", gap: 4, flexDirection: "row" }}>
                  {mine && showTime && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, fontSize: 10, color: COLORS.textMuted, whiteSpace: "nowrap", minWidth: 45 }}>
                      {readReceiptText && <span style={{ fontSize: 10 }}>{readReceiptText}</span>}
                      <span>{formatChatTime(m)}</span>
                    </div>
                  )}
                  <div 
                    className="web-message-bubble" 
                    style={{ 
                      background: mine ? COLORS.primary : "#fff", 
                      color: mine ? "#fff" : COLORS.textPrimary, 
                      borderRadius: mine ? "18px 18px 4px 18px" : "18px 18px 18px 4px", 
                      padding: m.attachments?.some(file => file.previewType === "image") ? 8 : "11px 15px",
                      fontSize: 15, 
                      lineHeight: 1.5,
                      border: mine ? "none" : "1px solid rgba(0,0,0,0.06)",
                      wordBreak: "break-word",
                      maxWidth: m.attachments?.some(file => file.previewType === "image") ? 292 : "100%",
                      width: "fit-content",
                      boxShadow: mine ? "none" : "0 1px 2px rgba(0,0,0,0.04)"
                    }}
                  >
                    {m.attachments?.length > 0 && (
                      <div className="chat-attachment-preview" style={{ display: "grid", gap: 8 }}>
                        {m.attachments.map(file => (
                          file.previewType === "image" && file.url ? (
                            <a
                              key={file.id}
                              href={file.url}
                              target="_blank"
                              rel="noreferrer"
                              style={{ display: "block", color: "inherit", textDecoration: "none" }}
                            >
                              <img
                                src={file.url}
                                alt={file.name}
                                style={{
                                  display: "block",
                                  width: 260,
                                  maxWidth: "100%",
                                  maxHeight: 190,
                                  objectFit: "cover",
                                  borderRadius: 12,
                                  background: "rgba(0,0,0,0.08)",
                                }}
                              />
                            </a>
                          ) : (
                            <a
                              key={file.id}
                              href={file.url || undefined}
                              target="_blank"
                              rel="noreferrer"
                              download={file.name}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                color: "inherit",
                                textDecoration: "none",
                                fontSize: 13,
                                opacity: 0.95,
                              }}
                            >
                              <span aria-hidden="true">📎</span>
                              <span>{file.name}</span>
                            </a>
                          )
                        ))}
                      </div>
                    )}
                    {(m.text ?? m.content) && (
                      <div
                        style={{
                          marginTop: m.attachments?.length > 0 ? 8 : 0,
                          padding: m.attachments?.some(file => file.previewType === "image") ? "0 4px 2px" : 0,
                        }}
                      >
                        {m.text ?? m.content ?? ""}
                      </div>
                    )}
                  </div>
                  {!mine && showTime && (
                    <div style={{ fontSize: 10, color: COLORS.textMuted, whiteSpace: "nowrap", minWidth: 40 }}>
                      <span>{formatChatTime(m)}</span>
                    </div>
                  )}
                  {!mine && (
                    <div className="chat-message-action-wrap">
                      <button 
                        type="button" 
                        className="chat-message-action-button" 
                        onClick={() => setMessageMenuId(current => current === messageId ? null : messageId)} 
                        aria-label="메시지 더보기"
                        style={{
                          width: 28,
                          height: 28,
                          border: "1px solid rgba(0,0,0,0.1)",
                          borderRadius: "50%",
                          background: "#fff",
                          color: COLORS.textMuted,
                          fontSize: 16,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                      >
                        ⋯
                      </button>
                      {messageMenuId === messageId && (
                        <div className="chat-message-menu" role="menu">
                          <button type="button" onClick={() => { setMessageMenuId(null); openProfile(messageProfile); }}>프로필 보기</button>
                          {!hasReviewedParticipant(messageProfile.userId) && (
                            <button type="button" disabled={reviewSubmitting} onClick={() => { setMessageMenuId(null); openCompanionReview(messageProfile); }}>동행 리뷰</button>
                          )}
                          <button type="button" className="danger" disabled={Boolean(actioning)} onClick={() => { setMessageMenuId(null); handleMessageReport(m); }}>메시지 신고</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {!mine && translationEnabled && recentTranslationKeys.has(messageKey) && !translationSkipped && (
                  <div className={`chat-message-translation ${translationFailed ? "error" : ""}`} style={{ marginTop: 4, fontSize: 13 }}>
                    {translatedText || (translationFailed ? translationErrorText : "번역 대기 중...")}
                  </div>
                )}
              </div>
            </div>
          </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      <div className="web-chat-input" style={{ 
        padding: "12px 12px 28px", 
        background: "#f8f8f8", 
        borderTop: "1px solid rgba(0,0,0,0.08)", 
        display: "flex", 
        gap: 8, 
        alignItems: "flex-end" 
      }}>
        <input ref={imageInputRef} type="file" accept="image/*" multiple hidden onChange={(event) => addLocalAttachments(event, "image")} />
        <input ref={fileInputRef} type="file" multiple hidden onChange={(event) => addLocalAttachments(event, "file")} />
        <div className="chat-attachment-wrap" style={{ position: "relative" }}>
          <button 
            type="button" 
            className="chat-attach-button" 
            onClick={() => setAttachOpen(!attachOpen)}
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: "1px solid rgba(0,0,0,0.1)",
              background: "#fff",
              color: COLORS.primary,
              fontSize: 24,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1
            }}
          >
            +
          </button>
          {attachOpen && (
            <div className="chat-attach-menu" style={{
              position: "absolute",
              bottom: "calc(100% + 8px)",
              left: 0,
              background: "#fff",
              border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: 12,
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              overflow: "hidden",
              minWidth: 140
            }}>
              <button 
                type="button" 
                onClick={() => { imageInputRef.current?.click(); setAttachOpen(false); }}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: 0,
                  background: "transparent",
                  textAlign: "left",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                📷 사진
              </button>
              <button 
                type="button" 
                onClick={() => { fileInputRef.current?.click(); setAttachOpen(false); }}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: 0,
                  borderTop: "1px solid rgba(0,0,0,0.05)",
                  background: "transparent",
                  textAlign: "left",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                📎 파일
              </button>
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {pendingAttachments.length > 0 && (
            <div className="chat-pending-attachments" style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginBottom: 8
            }}>
              {pendingAttachments.map(file => (
                <button 
                  key={file.id} 
                  type="button" 
                  onClick={() => removeAttachment(file.id)}
                  style={{
                    padding: "6px 10px",
                    background: "#fff",
                    border: "1px solid rgba(0,0,0,0.1)",
                    borderRadius: 16,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6
                  }}
                >
                  {file.type === "image" ? "📷" : "📎"} {file.name} ×
                </button>
              ))}
            </div>
          )}
          <input 
            value={input} 
            onChange={e => setInput(e.target.value)} 
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()} 
            placeholder="메시지를 입력하세요..." 
            style={{ 
              width: "100%", 
              background: "#fff", 
              border: "1px solid rgba(0,0,0,0.1)", 
              borderRadius: 20, 
              padding: "11px 16px", 
              fontSize: 15, 
              outline: "none", 
              boxSizing: "border-box",
              fontFamily: "inherit",
              fontWeight: 500,
              lineHeight: 1.4
            }} 
          />
        </div>
        <button 
          type="button" 
          onClick={send} 
          disabled={sending || (!input.trim() && pendingAttachments.length === 0)} 
          style={{ 
            width: 40, 
            height: 40, 
            background: (sending || (!input.trim() && pendingAttachments.length === 0)) ? COLORS.bg : COLORS.primary, 
            border: 0, 
            borderRadius: "50%", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            cursor: (sending || (!input.trim() && pendingAttachments.length === 0)) ? "not-allowed" : "pointer", 
            fontSize: 18,
            color: "#fff",
            transition: "all 0.2s"
          }}
        >
          {sending ? "⋯" : "➤"}
        </button>
      </div>
      <ConfirmDialog
        open={leaveConfirmOpen}
        danger
        title="채팅방에서 나갈까요?"
        description="나간 뒤에는 이 채팅방의 새 메시지를 받을 수 없습니다."
        confirmLabel="채팅방 나가기"
        cancelLabel="계속 머무르기"
        onConfirm={confirmLeaveRoom}
        onCancel={() => setLeaveConfirmOpen(false)}
      />
      <ConfirmDialog
        open={Boolean(kickConfirmTarget)}
        danger
        title="참여자를 내보낼까요?"
        description={`${kickConfirmTarget?.nickname || "선택한 참여자"} 님은 이 채팅방에서 나가게 됩니다.`}
        confirmLabel="내보내기"
        cancelLabel="취소"
        onConfirm={() => handleKick(kickConfirmTarget)}
        onCancel={() => setKickConfirmTarget(null)}
      />
      <ConfirmDialog
        open={Boolean(ownerTransferTarget)}
        title="방장을 위임할까요?"
        description={`${ownerTransferTarget?.nickname || "선택한 참여자"} 님이 새 방장이 됩니다. 위임 후에는 일반 참여자로 전환됩니다.`}
        confirmLabel="방장 위임"
        cancelLabel="취소"
        onConfirm={() => handleTransferOwner(ownerTransferTarget)}
        onCancel={() => setOwnerTransferTarget(null)}
      />
      <ConfirmDialog
        open={companionCancelConfirmOpen}
        danger
        title="진행 중인 동행을 취소할까요?"
        description="동행과 참여자 정보가 삭제되며 되돌릴 수 없습니다. 취소 후 같은 채팅방에서 새 동행을 생성할 수 있습니다."
        confirmLabel="동행 취소"
        cancelLabel="계속 유지"
        onConfirm={handleCancelCompanion}
        onCancel={() => setCompanionCancelConfirmOpen(false)}
      />
      {profileTarget && (
        <div className="chat-profile-modal" role="dialog" aria-modal="true">
          <div className="chat-profile-card">
            <button type="button" className="chat-profile-close" onClick={() => setProfileTarget(null)} aria-label="닫기">×</button>
            <div className="chat-profile-avatar">
              <ChatAvatar value={profileTarget.profileImageUrl || profileTarget.avatar} name={profileTarget.nickname} />
            </div>
            <strong>{profileTarget.nickname ?? "상대방"}</strong>
            <span>{profileTarget.role === "HOST" ? "방장" : "참여자"}</span>
            <p>{profileTarget.language || "언어 미설정"} · 동행지수 {profileTarget.score || "-"}</p>
            <div className="chat-profile-reviews">
              <div className="chat-profile-reviews-title">동행 리뷰</div>
              {profileReviewStatus === "loading" && <span>리뷰를 불러오는 중입니다.</span>}
              {profileReviewStatus === "empty" && <span>아직 받은 동행 리뷰가 없습니다.</span>}
              {profileReviewStatus === "error" && <span>동행 리뷰를 불러오지 못했습니다.</span>}
              {profileReviewStatus === "success" && profileReviews.map((review) => (
                <div key={review.id ?? `${review.reviewerNickname}-${review.createdAt}`} className="chat-profile-review-item">
                  <strong><span className="star-score">★ {review.score}</span> · {review.reviewerNickname}</strong>
                  <span>{review.content || "내용 없는 리뷰입니다."}</span>
                </div>
              ))}
            </div>
            <div className="chat-profile-actions">
              {!isSameUser(profileTarget.userId, currentUserId) && !hasReviewedParticipant(profileTarget.userId) && (
                <button type="button" disabled={reviewSubmitting} onClick={() => { openCompanionReview(profileTarget); setProfileTarget(null); }}>동행 리뷰 남기기</button>
              )}
              <button type="button" className="danger" onClick={() => { handleProfileReport(profileTarget); setProfileTarget(null); }}>사용자 신고하기</button>
            </div>
          </div>
        </div>
      )}
      <aside className={`chat-management-panel${managementPanelOpen ? " open" : ""}`} aria-hidden={!managementPanelOpen}>
        <div className="chat-management-head">
          <strong>채팅방 관리</strong>
          <button type="button" onClick={() => setManagementPanelOpen(false)} aria-label="채팅방 관리 닫기">×</button>
        </div>
        <div className={`chat-management-tabs${isCurrentUserHost ? "" : " two-tabs"}`} role="tablist">
          <button type="button" className={managementTab === "participants" ? "active" : ""} onClick={() => openManagementPanel("participants")}>참여자</button>
          {isCurrentUserHost && (
            <button type="button" className={managementTab === "requests" ? "active" : ""} onClick={() => openManagementPanel("requests")}>
              참여 신청
              {pendingJoinRequestCount > 0 && <span>{pendingJoinRequestCount}</span>}
            </button>
          )}
          <button type="button" className={managementTab === "settings" ? "active" : ""} onClick={() => openManagementPanel("settings")}>설정</button>
        </div>
        <div className="chat-management-content">
          {managementTab === "participants" && (
            <>
              <div className="chat-management-section-head">
                <strong>참여자</strong>
                <span>
                  {participantStatus === "loading" && "불러오는 중"}
                  {participantStatus === "error" && "확인 필요"}
                  {(participantStatus === "success" || participantStatus === "empty") && `${participants.length}명`}
                </span>
              </div>
              {participantStatus === "error" && <div className="chat-api-note">참여자 목록을 불러오지 못했습니다.</div>}
              {participants.map((participant) => (
                <div key={participant.userId} className="chat-management-card">
                  <button type="button" className="chat-participant-profile" onClick={() => openProfile(participant)}>
                    <b><ChatAvatar value={participant.profileImageUrl || participant.avatar} name={participant.nickname} /></b>
                    <div>
                      <strong>
                        {participant.nickname}
                        {participant.role === "HOST" && <em>호스트</em>}
                      </strong>
                      <span>{participant.language || "언어 미설정"} · 동행지수 {participant.score || "-"}</span>
                    </div>
                  </button>
                  {!isSameUser(participant.userId, currentUserId) && (
                    <div className="chat-management-card-actions">
                      {!hasReviewedParticipant(participant.userId) && (
                        <button type="button" disabled={reviewSubmitting} onClick={() => openCompanionReview(participant)}>리뷰</button>
                      )}
                      {isCurrentUserHost && (
                        <>
                          <button type="button" className="primary" disabled={participant.role === "HOST" || Boolean(actioning)} onClick={() => setOwnerTransferTarget(participant)}>방장 위임</button>
                          <button type="button" className="danger" disabled={participant.role === "HOST" || Boolean(actioning)} onClick={() => setKickConfirmTarget(participant)}>내보내기</button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
          {managementTab === "requests" && isCurrentUserHost && (
            <>
              <div className="chat-management-section-head">
                <strong>참여 신청</strong>
                <button type="button" onClick={loadJoinRequests}>새로고침</button>
              </div>
              {joinRequestStatus === "loading" && <SkeletonList count={2} />}
              {joinRequestStatus === "error" && <ErrorState title="신청 목록을 불러오지 못했습니다." onRetry={loadJoinRequests} />}
              {joinRequestStatus !== "loading" && joinRequestStatus !== "error" && joinRequests.length === 0 && (
                <EmptyState icon="👥" title="신청 목록이 없어요" description="새로운 참여 신청이 오면 이곳에서 확인할 수 있어요." />
              )}
              {joinRequests.map((request) => (
                <div key={request.id} className="chat-management-card join-request">
                  <div className="chat-join-request-profile">
                    <b>
                      {request.profileImageUrl
                        ? <img src={request.profileImageUrl} alt="" />
                        : request.avatar}
                    </b>
                    <div>
                      <strong>{request.name}</strong>
                      <span>동행지수 {request.score || "-"} · {formatChatTime(request)}</span>
                    </div>
                  </div>
                  {request.msg && <p>{request.msg}</p>}
                  {request.status === "PENDING" ? (
                    <div className="chat-management-card-actions">
                      <button type="button" disabled={joinRequestActioningId === request.id} onClick={() => handleJoinRequest(request.id, "reject")}>거절</button>
                      <button type="button" className="primary" disabled={joinRequestActioningId === request.id} onClick={() => handleJoinRequest(request.id, "approve")}>수락</button>
                    </div>
                  ) : (
                    <div className={`chat-join-request-result ${request.status.toLowerCase()}`}>
                      {request.status === "APPROVED" ? "수락 완료" : "거절됨"}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
          {managementTab === "settings" && (
            <div className="chat-management-settings">
              <div className="chat-companion-detail-card">
                <div>
                  <strong>현재 동행</strong>
                  <span className={`chat-companion-status status-${String(companionDetail?.status || "empty").toLowerCase()}`}>
                    {companionStatus === "loading"
                      ? "조회 중"
                      : companionDetail
                        ? getCompanionStatusLabel(companionDetail.status)
                        : "생성 전"}
                  </span>
                </div>
                {companionDetail ? (
                  <>
                    <dl>
                      <div>
                        <dt>여행 기간</dt>
                        <dd>{formatPlainDate(companionDetail.tripStartDate)} ~ {formatPlainDate(companionDetail.tripEndDate)}</dd>
                      </div>
                      <div>
                        <dt>참여 종료</dt>
                        <dd>{companionEndedCount} / {companionTotalCount}명</dd>
                      </div>
                    </dl>
                    {companionDetail.endedAt && <small>동행 종료: {formatChatTime({ sentAt: companionDetail.endedAt })}</small>}
                  </>
                ) : (
                  <small>동행을 생성하면 여행 기간과 참여자 종료 상태가 여기에 표시됩니다.</small>
                )}
              </div>
              {isCurrentUserHost && (
                <div className="chat-companion-settings">
                  <strong>동행 여행 기간</strong>
                  <label>
                    시작일
                    <input type="date" value={tripStartDate} onChange={(event) => setTripStartDate(event.target.value)} />
                  </label>
                  <label>
                    종료일
                    <input type="date" min={tripStartDate || undefined} value={tripEndDate} onChange={(event) => setTripEndDate(event.target.value)} />
                  </label>
                  <button type="button" disabled={Boolean(actioning)} onClick={handleCreateCompanion}>동행 생성</button>
                  <button type="button" className="danger" disabled={Boolean(actioning)} onClick={() => setCompanionCancelConfirmOpen(true)}>진행 중인 동행 취소</button>
                </div>
              )}
              <button type="button" disabled={Boolean(actioning)} onClick={handleRoomReport}>채팅방 신고</button>
              <button
                type="button"
                className="danger"
                disabled={Boolean(actioning) || (isCurrentUserHost && hasOtherActiveParticipants)}
                onClick={() => setLeaveConfirmOpen(true)}
                title={isCurrentUserHost && hasOtherActiveParticipants ? "다른 참여자에게 방장을 위임한 후 나갈 수 있습니다." : undefined}
              >
                {isCurrentUserHost && hasOtherActiveParticipants ? "방장 위임 후 나가기" : "채팅방 나가기"}
              </button>
            </div>
          )}
        </div>
      </aside>
      {reviewTarget && (
        <div className="chat-profile-modal" role="dialog" aria-modal="true">
          <div className="chat-companion-review-card">
            <button type="button" className="chat-profile-close" onClick={() => setReviewTarget(null)} aria-label="닫기">×</button>
            <strong>{reviewTarget.nickname || "참여자"} 동행 리뷰</strong>
            <p>함께한 동행 경험을 1~5점으로 남겨주세요.</p>
            <div className="chat-companion-review-stars" aria-label="동행 리뷰 점수">
              {[1, 2, 3, 4, 5].map(score => (
                <button
                  key={score}
                  type="button"
                  className={score <= reviewScore ? "active" : ""}
                  onClick={() => setReviewScore(score)}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              value={reviewContent}
              maxLength={1000}
              onChange={(event) => setReviewContent(event.target.value)}
              placeholder="좋았던 점이나 다음 동행자를 위한 참고 내용을 적어주세요."
            />
            <button type="button" disabled={reviewSubmitting} onClick={submitCompanionReview}>
              {reviewSubmitting ? "등록 중..." : "리뷰 등록"}
            </button>
          </div>
        </div>
      )}
      <ReportDialog
        open={Boolean(reportTarget)}
        title="사용자 신고"
        targetLabel={reportTarget?.label}
        reasons={REPORT_REASONS}
        initialDescription={reportTarget?.initialDescription}
        submitting={reportSubmitting}
        onSubmit={submitUserReport}
        onCancel={() => setReportTarget(null)}
      />
    </div>
  );
}
