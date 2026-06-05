import { useEffect, useRef, useState } from "react";
import { COLORS, S } from "../../constants/colors";
import { ConfirmDialog, EmptyState, ErrorState, SkeletonList } from "../../components/common";
import { getApiErrorHint, shouldUseMockFallback } from "../../services/apiClient.js";
import { uploadChatAttachments } from "../../services/attachmentService.js";
import {
  fetchChatMessages,
  fetchChatParticipants,
  fetchMyChatRooms,
  getMockChatParticipants,
  getMockChatRooms,
  getMockMessages,
  kickChatParticipant,
  leaveChatRoom,
  markChatRoomRead,
  reportChatMessage,
  reportChatParticipant,
  reportChatRoom,
} from "../../services/chatService.js";
import { getStoredAuthSession } from "../../services/authService.js";
import { LANG_CODE_MAP, translateText } from "../../services/translationService.js";
import { createChatRealtimeClient } from "../../services/chatRealtimeService.js";

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

function sortMessages(messages = []) {
  return [...messages].sort((a, b) => getMessageTimestamp(a) - getMessageTimestamp(b));
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

function getReadReceiptText(message = {}) {
  if (typeof message.unreadCount === "number") {
    if (message.unreadCount <= 0) return "읽음";
    return `${message.unreadCount}명 안읽음`;
  }
  if (typeof message.read === "boolean") return message.read ? "읽음" : "";
  return "";
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

export function ChatListPage({ onChatRoom, showToast }) {
  const [rooms, setRooms] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
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
    }
    setErrorMessage("");
    fetchMyChatRooms({ size: 10 })
      .then(async (data) => {
        const enrichedRooms = await enrichRooms(data);
        setRooms(enrichedRooms);
        setStatus(enrichedRooms.length > 0 ? "success" : "empty");
      })
      .catch((error) => {
        if (!shouldUseMockFallback(error)) {
          if (!silent) {
            setRooms([]);
          }
          setErrorMessage(getApiErrorHint(error));
          if (!silent) {
            setStatus("error");
          }
          return;
        }
        if (!silent) {
          setRooms(getMockChatRooms());
          setStatus("mock");
        }
      });
  };

  useEffect(() => {
    loadRooms();
    const intervalId = window.setInterval(() => {
      loadRooms({ silent: true });
    }, 2000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div style={S.screen} className="web-chat-list-page">
      <div className="web-page-hero" style={{ background: COLORS.primary, padding: "44px 20px 20px" }}>
        <div style={{ color: "#fff", fontSize: 20, fontWeight: 700 }}>💬 동행 채팅</div>
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, marginTop: 4 }}>같이 여행할 친구를 찾아보세요</div>
      </div>
      <div style={S.scrollArea} className="web-detail-scroll">
        <div className="web-chat-list" style={{ padding: "12px 16px" }}>
          <div className="chat-api-note">채팅방은 동행 게시판 모집글에서 방장이 생성합니다.</div>
          {status === "loading" && <SkeletonList count={3} />}
          {status === "mock" && <div className="chat-api-note">채팅 API 연결 전까지 목업 채팅방을 보여줍니다.</div>}
          {status === "error" && (
            <ErrorState
              title="채팅방을 불러오지 못했습니다."
              description={errorMessage || "백엔드 연결 상태를 확인한 뒤 다시 시도해주세요."}
              onRetry={loadRooms}
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
              <button key={c.id} type="button" className="chat-room-row" onClick={() => onChatRoom(c)}>
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
        </div>
      </div>
    </div>
  );
}

export function ChatRoomPage({ room, onBack, showToast, onRequest, lang = "ko" }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [translateOn, setTranslateOn] = useState(false);
  const [translationResults, setTranslationResults] = useState({});
  const [translatingMessages, setTranslatingMessages] = useState({});
  const [attachOpen, setAttachOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [actioning, setActioning] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [participantStatus, setParticipantStatus] = useState("idle");
  const [participantPanelOpen, setParticipantPanelOpen] = useState(false);
  const [roomMenuOpen, setRoomMenuOpen] = useState(false);
  const [profileTarget, setProfileTarget] = useState(null);
  const [messageMenuId, setMessageMenuId] = useState(null);
  const [realtimeStatus, setRealtimeStatus] = useState("idle");
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [kickConfirmTarget, setKickConfirmTarget] = useState(null);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const realtimeClientRef = useRef(null);
  const messagesEndRef = useRef(null);
  const currentUserId = getStoredAuthSession("USER")?.userId;

  const roomId = room?.chatRoomId ?? room?.id;
  const currentRoom = {
    title: room?.title ?? "동행 채팅",
    members: room?.members ?? room?.currentMembers ?? 0,
    maxMembers: room?.maxMembers ?? 0,
    hostId: room?.hostId,
  };
  const displayedMessages = sortMessages(messages);

  const refreshMessages = ({ silent = true } = {}) => {
    if (!roomId) return Promise.resolve([]);

    return fetchChatMessages(roomId)
      .then((data) => {
        setMessages(prev => mergeMessages(prev, data));
        return data;
      })
      .catch((error) => {
        if (!silent) {
          showToast?.(getApiErrorHint(error));
        }
        return [];
      });
  };

  const resolveMessageMine = (message) => {
    if (typeof message.isMine === "boolean") return message.isMine;
    if (typeof message.me === "boolean") return message.me;
    return isSameUser(message.senderId ?? message.senderUserId ?? message.userId ?? message.memberId, currentUserId);
  };

  useEffect(() => {
    let ignore = false;
    fetchChatMessages(roomId).then((data) => {
      if (!ignore) {
        const sortedMessages = sortMessages(data);
        setMessages(sortedMessages.length > 0 ? sortedMessages : getMockMessages());
        const latestTimestamp = getMessageTimestamp(sortedMessages[sortedMessages.length - 1]);
        setRoomLastReadAt(roomId, latestTimestamp || Date.now());
      }
    }).catch((error) => {
      if (ignore) return;
      if (!shouldUseMockFallback(error)) {
        setMessages([]);
        showToast?.(getApiErrorHint(error));
        return;
      }
      setMessages(getMockMessages());
    });
    return () => { ignore = true; };
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return undefined;

    let polling = false;
    const intervalId = window.setInterval(() => {
      if (polling) return;
      polling = true;
      refreshMessages().finally(() => {
        polling = false;
      });
    }, 700);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return undefined;

    const client = createChatRealtimeClient({
      chatRoomId: roomId,
      onStatus: setRealtimeStatus,
      onMessage: (message) => {
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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  useEffect(() => {
    if (!translateOn) return;

    const targetLanguage = LANG_CODE_MAP[lang] ?? "KO";
    const messagesToTranslate = messages.filter((message) => {
      const messageId = message.id ?? message.messageId;
      const content = message.text ?? message.content;
      const cacheKey = `${messageId}:${targetLanguage}`;

      return !resolveMessageMine(message)
        && messageId
        && content
        && !translationResults[cacheKey]
        && !translatingMessages[cacheKey];
    });

    messagesToTranslate.forEach((message) => {
      const messageId = message.id ?? message.messageId;
      const content = message.text ?? message.content;
      const cacheKey = `${messageId}:${targetLanguage}`;

      setTranslatingMessages((prev) => ({ ...prev, [cacheKey]: true }));
      console.info("Translation request", { messageId, targetLanguage, content });
      translateText(content, targetLanguage)
        .then((result) => {
          const translated = result.translatedContent ?? result.translatedText ?? "";
          console.info("Translation response", { messageId, targetLanguage, translated });
          setTranslationResults((prev) => ({ ...prev, [cacheKey]: translated || "번역 결과가 비어 있습니다." }));
        })
        .catch((error) => {
          console.error("Translation failed", error);
          setTranslationResults((prev) => ({ ...prev, [cacheKey]: getApiErrorHint(error) || "번역에 실패했습니다." }));
        })
        .finally(() => {
          setTranslatingMessages((prev) => ({ ...prev, [cacheKey]: false }));
        });
    });
  }, [messages, translateOn, lang, translationResults, translatingMessages]);

  useEffect(() => {
    let ignore = false;
    setParticipantStatus("loading");

    fetchChatParticipants(roomId)
      .then((data) => {
        if (ignore) return;
        setParticipants(data.length > 0 ? data : getMockChatParticipants());
        setParticipantStatus(data.length > 0 ? "success" : "empty");
      })
      .catch((error) => {
        if (ignore) return;
        if (!shouldUseMockFallback(error)) {
          setParticipants([]);
          setParticipantStatus("error");
          return;
        }
        setParticipants(getMockChatParticipants());
        setParticipantStatus("mock");
      });

    return () => { ignore = true; };
  }, [roomId]);

  const send = async () => {
    const content = input.trim();
    if ((!content && pendingAttachments.length === 0) || sending) return;

    setSending(true);
    try {
      let uploadedAttachments = pendingAttachments;

      if (pendingAttachments.length > 0) {
        uploadedAttachments = await uploadChatAttachments(pendingAttachments, { chatRoomId: roomId });
      }

      const attachmentIds = uploadedAttachments.map(item => item.uploadId).filter(Boolean);
      if (!realtimeClientRef.current?.isConnected()) {
        showToast?.("실시간 채팅 서버에 연결되지 않았습니다. WebSocket 설정을 확인해주세요.");
        return;
      }

      realtimeClientRef.current.send({ content, attachmentIds });
      setMessages(prev => [...prev, {
        id: `local-${Date.now()}`,
        userId: currentUserId,
        senderId: currentUserId,
        user: "여행자지수",
        text: content || "첨부파일",
        time: "지금",
        createdAt: new Date().toISOString(),
        me: true,
        attachments: uploadedAttachments,
      }]);
      setInput("");
      setPendingAttachments([]);
      window.setTimeout(() => {
        refreshMessages();
      }, 150);
    } catch (error) {
      if (!shouldUseMockFallback(error)) {
        showToast?.(getApiErrorHint(error));
        return;
      }
      // TODO: WebSocket/STOMP 전환 전까지 API 미연결 환경에서는 mock 메시지로 대화 흐름을 유지합니다.
      setMessages(prev => [...prev, { id: Date.now(), userId: currentUserId, senderId: currentUserId, user: "여행자지수", text: content || "첨부파일", time: "지금", createdAt: new Date().toISOString(), me: true, attachments: pendingAttachments }]);
      setInput("");
      setPendingAttachments([]);
    } finally {
      setSending(false);
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
    showToast?.("첨부 파일을 추가했습니다. 업로드 API 연결 전까지는 화면에서만 표시됩니다.");
  };

  const removeAttachment = (id) => {
    setPendingAttachments(prev => prev.filter(item => item.id !== id));
  };

  const runRoomAction = async ({ key, action, successMessage, mockMessage, afterSuccess }) => {
    if (actioning) return;
    setActioning(key);
    try {
      await action();
      showToast?.(successMessage);
      afterSuccess?.();
    } catch (error) {
      if (!shouldUseMockFallback(error)) {
        showToast?.(getApiErrorHint(error));
        return;
      }
      showToast?.(mockMessage);
      afterSuccess?.();
    } finally {
      setActioning("");
    }
  };

  const handleRoomReport = () => runRoomAction({
    key: "report-room",
    action: () => reportChatRoom({ chatRoomId: roomId }),
    successMessage: "채팅방 신고가 접수되었습니다.",
    mockMessage: "채팅방 신고 API 연결 전 mock 신고로 표시합니다.",
  });

  const handleLeaveRoom = () => runRoomAction({
    key: "leave-room",
    action: () => leaveChatRoom(roomId),
    successMessage: "채팅방에서 나갔습니다.",
    mockMessage: "채팅방 나가기 API 연결 전 mock 처리 후 목록으로 이동합니다.",
    afterSuccess: onBack,
  });

  const confirmLeaveRoom = () => {
    setLeaveConfirmOpen(false);
    handleLeaveRoom();
  };

  const handleMessageReport = (message) => runRoomAction({
    key: `report-message-${message.id}`,
    action: () => reportChatMessage({ chatRoomId: roomId, messageId: message.id }),
    successMessage: "채팅 신고가 접수되었습니다.",
    mockMessage: "채팅 신고 API 연결 전 mock 신고로 표시합니다.",
  });

  const handleProfileReport = (target) => {
    if (!target.userId) {
      showToast?.("사용자 신고는 대상 userId가 연결되면 활성화됩니다.");
      return;
    }
    runRoomAction({
      key: `report-user-${target.userId}`,
      action: () => reportChatParticipant({ userId: target.userId }),
      successMessage: "사용자 신고가 접수되었습니다.",
      mockMessage: "사용자 신고 API 연결 전 mock 신고로 표시합니다.",
    });
  };

  const openParticipantPanel = () => {
    setParticipantPanelOpen(true);
    setRoomMenuOpen(false);
  };

  const openProfile = (target) => {
    setProfileTarget(target);
    setMessageMenuId(null);
  };

  const getMessageProfile = (message) => {
    const userId = message.senderId ?? message.senderUserId ?? message.userId ?? message.memberId;
    const matchedParticipant = participants.find(participant => isSameUser(participant.userId, userId));
    return {
      ...matchedParticipant,
      userId: matchedParticipant?.userId ?? userId,
      nickname: matchedParticipant?.nickname ?? message.user ?? "상대방",
      avatar: matchedParticipant?.avatar ?? "👤",
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
      mockMessage: "상대방 내보내기 API 연결 전 mock 처리입니다.",
      afterSuccess: () => setKickConfirmTarget(null),
    });
  };

  return (
    <div style={S.screen} className="web-chat-room-page">
      <div className="web-page-topbar" style={{ background: COLORS.primary, padding: "44px 16px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <div onClick={onBack} style={{ color: "#fff", fontSize: 14, cursor: "pointer" }}>←</div>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#fff", fontSize: 16, fontWeight: 700 }}>{currentRoom.title}</div>
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>👥 {currentRoom.members}/{currentRoom.maxMembers}명</div>
        </div>
        <div className="chat-room-menu-wrap">
          <button type="button" className="chat-room-menu-button" onClick={() => setRoomMenuOpen(open => !open)} aria-label="채팅방 메뉴">
            ☰
          </button>
          {roomMenuOpen && (
            <div className="chat-room-menu" role="menu">
              <button type="button" onClick={() => { setTranslateOn(!translateOn); setRoomMenuOpen(false); }}>
                번역 {translateOn ? "끄기" : "켜기"}
              </button>
              <button type="button" onClick={openParticipantPanel}>참여자 보기</button>
              <button type="button" onClick={() => { setRoomMenuOpen(false); onRequest?.(); }}>참여 신청 관리</button>
              <button type="button" onClick={openParticipantPanel}>상대방 내보내기</button>
              <button type="button" disabled={Boolean(actioning)} onClick={() => { setRoomMenuOpen(false); handleRoomReport(); }}>채팅방 신고</button>
              <button type="button" className="danger" disabled={Boolean(actioning)} onClick={() => { setRoomMenuOpen(false); setLeaveConfirmOpen(true); }}>채팅방 나가기</button>
            </div>
          )}
        </div>
      </div>
      <div className={`chat-realtime-status ${realtimeStatus}`}>
        {realtimeStatus === "connected" ? "실시간 연결됨" : realtimeStatus === "connecting" ? "실시간 연결 중" : "실시간 연결 확인 필요"}
      </div>
      {participantPanelOpen && (
        <div className="chat-participant-panel">
          <div className="chat-participant-head">
            <strong>참여자</strong>
            <span>
              {participantStatus === "loading" && "불러오는 중"}
              {participantStatus === "mock" && "mock 목록"}
              {participantStatus === "error" && "API 확인 필요"}
              {(participantStatus === "success" || participantStatus === "empty") && `${participants.length}명`}
            </span>
          </div>
          {participantStatus === "error" && (
            <div className="chat-api-note">참여자 목록 API와 권한 응답을 확인하세요.</div>
          )}
          {participants.map((participant) => (
            <div key={participant.userId} className="chat-participant-row">
              <button type="button" className="chat-participant-profile" onClick={() => openProfile(participant)}>
                <b>{participant.avatar}</b>
                <div>
                  <strong>{participant.nickname}</strong>
                  <span>{participant.role === "HOST" ? "방장" : "참여자"} · {participant.language || "언어 미설정"} · 동행지수 {participant.score || "-"}</span>
                </div>
              </button>
              <div>
                <button type="button" onClick={() => handleProfileReport(participant)}>신고</button>
                <button type="button" disabled={participant.role === "HOST" || Boolean(actioning)} onClick={() => setKickConfirmTarget(participant)}>내보내기</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="web-chat-room-body" style={{ ...S.scrollArea, padding: 16 }}>
        {displayedMessages.map(m => {
          const mine = resolveMessageMine(m);
          const readReceiptText = getReadReceiptText(m);
          const messageId = m.messageId ?? m.id;
          const messageProfile = !mine ? getMessageProfile(m) : null;
          return (
          <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", marginBottom: 12 }}>
            {!mine && <button type="button" onClick={() => openProfile(messageProfile)} style={{ width: 32, height: 32, borderRadius: "50%", background: COLORS.bg, border: 0, display: "flex", alignItems: "center", justifyContent: "center", marginRight: 8, fontSize: 14, flexShrink: 0, cursor: "pointer" }}>{messageProfile?.avatar ?? "👤"}</button>}
            <div className={mine ? "chat-message-stack mine" : "chat-message-stack"}>
              {!mine && <button type="button" className="chat-message-sender" onClick={() => openProfile(messageProfile)}>{messageProfile?.nickname ?? m.user}</button>}
              <div className={mine ? "chat-message-line mine" : "chat-message-line"}>
                {mine && (
                  <div className="chat-message-side-meta">
                    {readReceiptText && <span>{readReceiptText}</span>}
                    <span>{formatChatTime(m)}</span>
                  </div>
                )}
                <div className="web-message-bubble" style={{ background: mine ? COLORS.primary : "#fff", color: mine ? "#fff" : COLORS.primary, borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px", padding: "10px 14px", maxWidth: 220, fontSize: 14, border: mine ? "none" : "0.5px solid rgba(0,0,0,0.08)" }}>
                  {m.text}
                  {m.attachments?.length > 0 && (
                    <div className="chat-attachment-preview">
                      {m.attachments.map(file => (
                        <span key={file.id}>{file.type === "image" ? "사진" : "파일"} · {file.name}</span>
                      ))}
                    </div>
                  )}
                </div>
                {!mine && (
                  <div className="chat-message-side-meta">
                    <span>{formatChatTime(m)}</span>
                  </div>
                )}
                {!mine && (
                  <div className="chat-message-action-wrap">
                    <button type="button" className="chat-message-action-button" onClick={() => setMessageMenuId(current => current === messageId ? null : messageId)} aria-label="메시지 더보기">
                      ⋯
                    </button>
                    {messageMenuId === messageId && (
                      <div className="chat-message-menu" role="menu">
                        <button type="button" disabled={Boolean(actioning)} onClick={() => { setMessageMenuId(null); handleMessageReport(m); }}>메시지 신고</button>
                        <button type="button" onClick={() => { setMessageMenuId(null); openProfile(messageProfile); }}>프로필 보기</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {translateOn && !mine && (() => {
                const targetLanguage = LANG_CODE_MAP[lang] ?? "KO";
                const cacheKey = `${m.id ?? m.messageId}:${targetLanguage}`;
                const translated = translationResults[cacheKey];

                return (
                  <div className="chat-translation-preview">
                    번역: {translated || (translatingMessages[cacheKey] ? "번역 중..." : "번역 대기 중...")}
                  </div>
                );
              })()}
            </div>
          </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      <div className="web-chat-input" style={{ padding: "12px 16px 28px", background: "#fff", borderTop: "0.5px solid rgba(0,0,0,0.08)", display: "flex", gap: 10 }}>
        <input ref={imageInputRef} type="file" accept="image/*" multiple hidden onChange={(event) => addLocalAttachments(event, "image")} />
        <input ref={fileInputRef} type="file" multiple hidden onChange={(event) => addLocalAttachments(event, "file")} />
        <div className="chat-attachment-wrap">
          <button type="button" className="chat-attach-button" onClick={() => setAttachOpen(!attachOpen)}>+</button>
          {attachOpen && (
            <div className="chat-attach-menu">
              <button type="button" onClick={() => imageInputRef.current?.click()}>사진</button>
              <button type="button" onClick={() => fileInputRef.current?.click()}>파일</button>
              <button type="button" onClick={() => showToast("지도 공유는 추후 위치/지도 API 연결 예정입니다.")}>지도 공유 예정</button>
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {pendingAttachments.length > 0 && (
            <div className="chat-pending-attachments">
              {pendingAttachments.map(file => (
                <button key={file.id} type="button" onClick={() => removeAttachment(file.id)}>
                  {file.type === "image" ? "사진" : "파일"} · {file.name} ×
                </button>
              ))}
            </div>
          )}
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="메시지를 입력하세요..." style={{ width: "100%", background: COLORS.bg, border: "none", borderRadius: 24, padding: "12px 16px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
        </div>
        <button type="button" onClick={send} disabled={sending} style={{ width: 44, height: 44, background: COLORS.primary, border: 0, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: sending ? "wait" : "pointer", fontSize: 18 }}>{sending ? "..." : "➤"}</button>
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
      {profileTarget && (
        <div className="chat-profile-modal" role="dialog" aria-modal="true">
          <div className="chat-profile-card">
            <button type="button" className="chat-profile-close" onClick={() => setProfileTarget(null)} aria-label="닫기">×</button>
            <div className="chat-profile-avatar">{profileTarget.avatar ?? "👤"}</div>
            <strong>{profileTarget.nickname ?? "상대방"}</strong>
            <span>{profileTarget.role === "HOST" ? "방장" : "참여자"}</span>
            <p>{profileTarget.language || "언어 미설정"} · 동행지수 {profileTarget.score || "-"}</p>
            <button type="button" onClick={() => { handleProfileReport(profileTarget); setProfileTarget(null); }}>사용자 신고하기</button>
          </div>
        </div>
      )}
    </div>
  );
}
