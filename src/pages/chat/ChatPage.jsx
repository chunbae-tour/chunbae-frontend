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
  sendChatMessage,
} from "../../services/chatService.js";
import { LANG_CODE_MAP, translateText } from "../../services/translationService.js";

export function ChatListPage({ onChatRoom, showToast }) {
  const [rooms, setRooms] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const loadRooms = () => {
    setStatus("loading");
    setErrorMessage("");
    fetchMyChatRooms({ size: 10 })
      .then((data) => {
        setRooms(data);
        setStatus(data.length > 0 ? "success" : "empty");
      })
      .catch((error) => {
        if (!shouldUseMockFallback(error)) {
          setRooms([]);
          setErrorMessage(getApiErrorHint(error));
          setStatus("error");
          return;
        }
        setRooms(getMockChatRooms());
        setStatus("mock");
      });
  };

  useEffect(() => {
    let ignore = false;
    if (!ignore) loadRooms();
    return () => { ignore = true; };
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
                  <strong>{c.title}</strong>
                  <span>{c.lastMsg}</span>
                </div>
                <div className="chat-room-meta">
                  {c.unread > 0 && <em>{c.unread}</em>}
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
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [kickConfirmTarget, setKickConfirmTarget] = useState(null);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const roomId = room?.chatRoomId ?? room?.id;
  const currentRoom = {
    title: room?.title ?? "동행 채팅",
    members: room?.members ?? room?.currentMembers ?? 0,
    maxMembers: room?.maxMembers ?? 0,
    hostId: room?.hostId,
  };

  useEffect(() => {
    let ignore = false;
    fetchChatMessages(roomId).then((data) => {
      if (!ignore) setMessages(data.length > 0 ? data : getMockMessages());
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
    markChatRoomRead(roomId).catch(() => {
      // TODO: 읽음 처리 API 확정 전까지 화면 진입은 막지 않습니다.
    });
  }, [roomId]);

  useEffect(() => {
    if (!translateOn) return;

    const targetLanguage = LANG_CODE_MAP[lang] ?? "KO";
    const messagesToTranslate = messages.filter((message) => {
      const messageId = message.id ?? message.messageId;
      const content = message.text ?? message.content;
      const cacheKey = `${messageId}:${targetLanguage}`;

      return !message.me
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
      const message = await sendChatMessage({ chatRoomId: roomId, content, attachmentIds });
      setMessages(prev => [...prev, { ...message, text: message.text || content || "첨부파일", attachments: uploadedAttachments, me: true, read: false }]);
      setInput("");
      setPendingAttachments([]);
    } catch (error) {
      if (!shouldUseMockFallback(error)) {
        showToast?.(getApiErrorHint(error));
        return;
      }
      // TODO: WebSocket/STOMP 전환 전까지 API 미연결 환경에서는 mock 메시지로 대화 흐름을 유지합니다.
      setMessages(prev => [...prev, { id: Date.now(), user: "여행자지수", text: content || "첨부파일", time: "지금", me: true, read: false, attachments: pendingAttachments }]);
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
        <div onClick={() => showToast("참여 신청 목록으로 이동합니다")} style={{ color: COLORS.accent, fontSize: 14, cursor: "pointer", background: "rgba(255,234,54,0.16)", padding: "6px 12px", borderRadius: 20 }}>신청 {currentRoom.members}</div>
      </div>
      <div className="chat-room-tools">
        <button type="button" className={translateOn ? "active" : ""} onClick={() => setTranslateOn(!translateOn)}>
          번역 {translateOn ? "ON" : "OFF"}
        </button>
        <button type="button" className={participantPanelOpen ? "active" : ""} onClick={() => setParticipantPanelOpen(!participantPanelOpen)}>참여자 {participants.length || currentRoom.members}명</button>
        <button type="button" onClick={() => onRequest?.()}>신청 관리</button>
        <button type="button" disabled={Boolean(actioning)} onClick={() => setParticipantPanelOpen(true)}>상대방 내보내기</button>
        <button type="button" disabled={Boolean(actioning)} onClick={handleRoomReport}>채팅방 신고</button>
        <button type="button" disabled={Boolean(actioning)} onClick={() => setLeaveConfirmOpen(true)}>채팅방 나가기</button>
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
              <div>
                <b>{participant.avatar}</b>
                <div>
                  <strong>{participant.nickname}</strong>
                  <span>{participant.role === "HOST" ? "방장" : "참여자"} · {participant.language || "언어 미설정"} · 동행지수 {participant.score || "-"}</span>
                </div>
              </div>
              <div>
                <button type="button" onClick={() => handleProfileReport(participant)}>신고</button>
                <button type="button" disabled={participant.role === "HOST" || Boolean(actioning)} onClick={() => setKickConfirmTarget(participant)}>내보내기</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="web-chat-room-body" style={{ ...S.scrollArea, padding: 16 }}>
        {messages.map(m => (
          <div key={m.id} style={{ display: "flex", justifyContent: m.me ? "flex-end" : "flex-start", marginBottom: 12 }}>
            {!m.me && <button type="button" onClick={() => handleProfileReport(m)} style={{ width: 32, height: 32, borderRadius: "50%", background: COLORS.bg, border: 0, display: "flex", alignItems: "center", justifyContent: "center", marginRight: 8, fontSize: 14, flexShrink: 0, cursor: "pointer" }}>👤</button>}
            <div>
              {!m.me && <div style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 3 }}>{m.user}</div>}
              <div className="web-message-bubble" style={{ background: m.me ? COLORS.primary : "#fff", color: m.me ? "#fff" : COLORS.primary, borderRadius: m.me ? "16px 16px 4px 16px" : "16px 16px 16px 4px", padding: "10px 14px", maxWidth: 220, fontSize: 14, border: m.me ? "none" : "0.5px solid rgba(0,0,0,0.08)" }}>
                {m.text}
                {m.attachments?.length > 0 && (
                  <div className="chat-attachment-preview">
                    {m.attachments.map(file => (
                      <span key={file.id}>{file.type === "image" ? "사진" : "파일"} · {file.name}</span>
                    ))}
                  </div>
                )}
              </div>
              {translateOn && !m.me && (() => {
                const targetLanguage = LANG_CODE_MAP[lang] ?? "KO";
                const cacheKey = `${m.id ?? m.messageId}:${targetLanguage}`;
                const translated = translationResults[cacheKey];

                return (
                  <div className="chat-translation-preview">
                    번역: {translated || (translatingMessages[cacheKey] ? "번역 중..." : "번역 대기 중...")}
                  </div>
                );
              })()}
              <div style={{ fontSize: 14, color: COLORS.textMuted, marginTop: 3, textAlign: m.me ? "right" : "left" }}>{m.time}</div>
              {m.me && <div className="chat-read-state">{m.read ? "읽음" : "안읽음"}</div>}
              {!m.me && <button type="button" className="chat-message-report" disabled={Boolean(actioning)} onClick={() => handleMessageReport(m)}>채팅 신고</button>}
            </div>
          </div>
        ))}
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
    </div>
  );
}
