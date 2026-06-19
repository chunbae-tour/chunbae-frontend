import { useEffect, useState } from "react";
import { EmptyState, ErrorState, SkeletonList } from "../../components/common";
import { COLORS, S } from "../../constants/colors";
import { getApiErrorHint } from "../../services/apiClient.js";
import {
  createSupportRoom,
  fetchMySupportRooms,
  fetchSupportMessages,
  mergeSupportMessages,
  uploadSupportFile,
} from "../../services/supportService.js";
import { createSupportRealtimeClient } from "../../services/supportRealtimeService.js";

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getRoomLabel(status) {
  const labels = {
    WAITING: "대기",
    IN_PROGRESS: "상담중",
    CLOSED: "종료",
  };
  return labels[status] ?? status ?? "대기";
}

function formatFileSize(value) {
  const size = Number(value);
  if (!Number.isFinite(size) || size <= 0) return "";
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)}KB`;
  return `${(size / 1024 / 1024).toFixed(1)}MB`;
}

function isImageMessage(message) {
  return String(message?.messageType ?? "").toUpperCase() === "IMAGE" && Boolean(message?.fileUrl);
}

function SupportMessageContent({ message, isCustomer }) {
  if (isImageMessage(message)) {
    return (
      <a
        href={message.fileUrl}
        target="_blank"
        rel="noreferrer"
        style={{ display: "block", color: "inherit", textDecoration: "none" }}
      >
        <img
          src={message.fileUrl}
          alt={message.fileName || "상담 이미지"}
          style={{
            display: "block",
            width: "100%",
            maxWidth: 260,
            borderRadius: 10,
            background: "rgba(255,255,255,0.18)",
          }}
        />
        {message.fileName && (
          <span style={{ display: "block", marginTop: 6, fontSize: 12, opacity: 0.72 }}>
            {message.fileName}
          </span>
        )}
      </a>
    );
  }
  if (message.fileUrl) {
    const fileSize = formatFileSize(message.fileSize);
    return (
      <a
        href={message.fileUrl}
        target="_blank"
        rel="noreferrer"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: isCustomer ? "#fff" : COLORS.primary,
          textDecoration: "none",
          fontWeight: 700,
        }}
      >
        <span aria-hidden="true">📎</span>
        <span>{message.fileName || "첨부파일"}</span>
        {fileSize && <span style={{ fontSize: 12, opacity: 0.7 }}>{fileSize}</span>}
      </a>
    );
  }
  return <div style={{ fontSize: 14, lineHeight: 1.45 }}>{message.content || "-"}</div>;
}

export default function SupportPage({ onBack, showToast, user, onLogin }) {
  const [rooms, setRooms] = useState([]);
  const [roomsStatus, setRoomsStatus] = useState("loading");
  const [roomsError, setRoomsError] = useState("");
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesStatus, setMessagesStatus] = useState("idle");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState("idle");
  const [realtimeClient, setRealtimeClient] = useState(null);

  const role = String(user?.role || "USER").toUpperCase();
  const roomId = selectedRoom?.supportRoomId;
  const canSend = selectedRoom?.status !== "CLOSED";

  const loadRooms = () => {
    if (!user) {
      setRooms([]);
      setRoomsStatus("idle");
      return Promise.resolve([]);
    }

    setRoomsStatus("loading");
    setRoomsError("");
    return fetchMySupportRooms({ size: 50 })
      .then((items) => {
        setRooms(items);
        setRoomsStatus(items.length > 0 ? "success" : "empty");
        if (!selectedRoom && items.length > 0) setSelectedRoom(items[0]);
        return items;
      })
      .catch((error) => {
        setRooms([]);
        setRoomsError(getApiErrorHint(error));
        setRoomsStatus("error");
        return [];
      });
  };

  const loadMessages = (room = selectedRoom) => {
    const supportRoomId = room?.supportRoomId;
    if (!supportRoomId) {
      setMessages([]);
      setMessagesStatus("idle");
      return Promise.resolve([]);
    }

    setMessagesStatus("loading");
    return fetchSupportMessages(supportRoomId, { size: 100 })
      .then((items) => {
        setMessages(items);
        setMessagesStatus(items.length > 0 ? "success" : "empty");
        return items;
      })
      .catch((error) => {
        setMessages([]);
        setMessagesStatus("error");
        showToast?.(getApiErrorHint(error));
        return [];
      });
  };

  useEffect(() => {
    loadRooms();
  }, [user?.userId, user?.email]);

  useEffect(() => {
    loadMessages(selectedRoom);
  }, [selectedRoom?.supportRoomId]);

  useEffect(() => {
    if (!roomId) return undefined;

    const client = createSupportRealtimeClient({
      supportRoomId: roomId,
      role,
      onStatus: setRealtimeStatus,
      onMessage: (message) => {
        setMessages((prev) => mergeSupportMessages(prev, [message]));
        setMessagesStatus("success");
      },
      onError: (error) => {
        console.error("Support realtime failed", error);
      },
    });

    setRealtimeClient(client);
    client.connect();

    return () => {
      client.disconnect();
      setRealtimeClient(null);
    };
  }, [roomId, role]);

  useEffect(() => {
    if (!roomId || realtimeStatus === "connected") return undefined;

    const intervalId = window.setInterval(() => {
      loadMessages(selectedRoom);
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, [roomId, realtimeStatus, selectedRoom?.supportRoomId]);

  const handleCreateRoom = async () => {
    const content = input.trim();
    if (!content || sending) return;

    setSending(true);
    try {
      const room = await createSupportRoom({ initialMessage: content });
      setInput("");
      setSelectedRoom(room);
      setMessages([]);
      showToast?.("상담 문의를 접수했습니다.");
      await loadRooms();
      await loadMessages(room);
    } catch (error) {
      showToast?.(getApiErrorHint(error));
      await loadRooms();
    } finally {
      setSending(false);
    }
  };

  const handleSend = () => {
    const content = input.trim();
    if (!content || sending) return;
    if (!selectedRoom) {
      handleCreateRoom();
      return;
    }
    if (!canSend) {
      showToast?.("종료된 상담방에는 메시지를 보낼 수 없습니다.");
      return;
    }
    if (!realtimeClient?.isConnected()) {
      showToast?.("상담 서버에 연결 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    setSending(true);
    try {
      realtimeClient.send({ content });
      setInput("");
    } catch (error) {
      showToast?.(getApiErrorHint(error));
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || uploading) return;
    if (!selectedRoom) {
      showToast?.("먼저 문의 내용을 보내 상담방을 만든 뒤 파일을 첨부해주세요.");
      return;
    }
    if (!canSend) {
      showToast?.("종료된 상담방에는 파일을 보낼 수 없습니다.");
      return;
    }
    if (!realtimeClient?.isConnected()) {
      showToast?.("상담 서버에 연결 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    setUploading(true);
    try {
      const uploaded = await uploadSupportFile(selectedRoom.supportRoomId, file, { role });
      realtimeClient.send({
        messageType: uploaded.contentType?.startsWith("image/") ? "IMAGE" : "FILE",
        content: uploaded.fileName,
        fileUrl: uploaded.fileUrl,
        fileName: uploaded.fileName,
        fileSize: uploaded.fileSize,
      });
      showToast?.("첨부파일을 전송했습니다.");
    } catch (error) {
      showToast?.(getApiErrorHint(error));
    } finally {
      setUploading(false);
    }
  };

  if (!user) {
    return (
      <div style={S.screen}>
        <div
          style={{
            background: COLORS.primary,
            padding: "44px 16px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span onClick={onBack} style={{ color: "#fff", fontSize: 20, cursor: "pointer" }}>
            ←
          </span>
          <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>고객센터</span>
        </div>
        <div style={{ padding: 16 }}>
          <EmptyState
            icon="💬"
            title="로그인이 필요합니다."
            description="상담 문의는 로그인 후 이용할 수 있습니다."
            actionLabel="로그인하기"
            onAction={onLogin}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={S.screen}>
      <div
        style={{
          background: COLORS.primary,
          padding: "44px 16px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span onClick={onBack} style={{ color: "#fff", fontSize: 20, cursor: "pointer" }}>
          ←
        </span>
        <div>
          <div style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>고객센터</div>
          <div style={{ color: "rgba(255,255,255,0.72)", fontSize: 13 }}>
            {realtimeStatus === "connected" ? "실시간 상담 연결됨" : "상담 연결 확인 중"}
          </div>
        </div>
      </div>
      <div style={{ ...S.scrollArea, padding: 16 }}>
        <div
          style={{
            background: "#fff",
            borderRadius: 14,
            padding: 16,
            border: "0.5px solid rgba(0,0,0,0.06)",
            marginBottom: 12,
          }}
        >
          <strong style={{ color: COLORS.primary }}>내 상담방</strong>
          <div
            style={{ display: "flex", gap: 8, overflowX: "auto", marginTop: 12, paddingBottom: 2 }}
          >
            {roomsStatus === "loading" && (
              <div style={{ minWidth: 220 }}>
                <SkeletonList count={1} />
              </div>
            )}
            {roomsStatus === "error" && (
              <ErrorState
                title="상담방을 불러오지 못했습니다."
                description={roomsError}
                onRetry={loadRooms}
              />
            )}
            {(roomsStatus === "empty" || rooms.length === 0) && (
              <span style={{ color: COLORS.textMuted, fontSize: 14 }}>
                아직 상담방이 없습니다. 아래 입력창에서 첫 문의를 남겨주세요.
              </span>
            )}
            {rooms.map((room) => (
              <button
                key={room.supportRoomId}
                type="button"
                onClick={() => setSelectedRoom(room)}
                style={{
                  minWidth: 150,
                  border:
                    selectedRoom?.supportRoomId === room.supportRoomId
                      ? `1.5px solid ${COLORS.primary}`
                      : "1px solid rgba(0,0,0,0.08)",
                  background:
                    selectedRoom?.supportRoomId === room.supportRoomId ? COLORS.greenBg : "#fff",
                  borderRadius: 12,
                  padding: 12,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <strong style={{ display: "block", color: COLORS.primary }}>
                  상담 #{room.supportRoomId}
                </strong>
                <span
                  style={{ display: "block", color: COLORS.textMuted, fontSize: 13, marginTop: 4 }}
                >
                  {getRoomLabel(room.status)}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: 14,
            padding: 16,
            border: "0.5px solid rgba(0,0,0,0.06)",
            minHeight: 360,
          }}
        >
          {!selectedRoom && (
            <EmptyState
              icon="💬"
              title="새 문의를 남겨보세요."
              description="문의 내용을 입력하면 상담방이 생성되고 관리자에게 전달됩니다."
            />
          )}
          {selectedRoom && (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <strong style={{ color: COLORS.primary }}>
                  상담 #{selectedRoom.supportRoomId}
                </strong>
                <span style={{ color: COLORS.textMuted, fontSize: 13 }}>
                  {getRoomLabel(selectedRoom.status)} · {formatDate(selectedRoom.createdAt)}
                </span>
              </div>
              {messagesStatus === "loading" && <SkeletonList count={3} />}
              {messagesStatus === "error" && (
                <ErrorState
                  title="상담 메시지를 불러오지 못했습니다."
                  description="백엔드 연결 상태를 확인해주세요."
                  onRetry={() => loadMessages(selectedRoom)}
                />
              )}
              {messagesStatus === "empty" && (
                <EmptyState
                  icon="메시지"
                  title="아직 메시지가 없습니다."
                  description="아래 입력창에서 문의를 남겨주세요."
                />
              )}
              {messages.map((message) => {
                const isCustomer = message.senderRole === "CUSTOMER";
                return (
                  <div
                    key={
                      message.messageId ??
                      `${message.senderRole}-${message.sentAt}-${message.content}`
                    }
                    style={{
                      display: "flex",
                      justifyContent: isCustomer ? "flex-end" : "flex-start",
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "76%",
                        background: isCustomer ? COLORS.primary : COLORS.bg,
                        color: isCustomer ? "#fff" : COLORS.text,
                        borderRadius: 12,
                        padding: "10px 12px",
                      }}
                    >
                      <div style={{ fontSize: 12, opacity: 0.72, marginBottom: 4 }}>
                        {isCustomer ? "나" : "관리자"} · {formatDate(message.sentAt)}
                      </div>
                      <SupportMessageContent message={message} isCustomer={isCustomer} />
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: 12,
          background: "#fff",
          borderTop: "0.5px solid rgba(0,0,0,0.08)",
        }}
      >
        <label
          title={selectedRoom ? "이미지/파일 첨부" : "상담방 생성 후 첨부할 수 있어요."}
          style={{
            width: 44,
            minWidth: 44,
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: COLORS.primary,
            background: "#fff",
            cursor: !selectedRoom || !canSend || uploading ? "not-allowed" : "pointer",
            opacity: !selectedRoom || !canSend || uploading ? 0.45 : 1,
            fontWeight: 900,
          }}
        >
          📎
          <input
            type="file"
            accept="image/*,.pdf,.txt,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            disabled={!selectedRoom || !canSend || uploading}
            onChange={handleFileUpload}
            style={{ display: "none" }}
          />
        </label>
        <input
          value={input}
          disabled={(Boolean(selectedRoom) && !canSend) || uploading}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && handleSend()}
          placeholder={
            selectedRoom ? "상담 메시지를 입력하세요." : "문의 내용을 입력하면 상담방이 생성됩니다."
          }
          style={{
            flex: 1,
            border: "1px solid rgba(0,0,0,0.1)",
            borderRadius: 12,
            padding: "12px 14px",
            fontSize: 14,
            outline: "none",
          }}
        />
        <button
          type="button"
          disabled={!input.trim() || sending || uploading || (Boolean(selectedRoom) && !canSend)}
          onClick={handleSend}
          style={{
            border: 0,
            borderRadius: 12,
            background: COLORS.primary,
            color: "#fff",
            padding: "0 18px",
            fontWeight: 800,
            opacity: !input.trim() || sending || uploading ? 0.5 : 1,
            cursor: sending || uploading ? "wait" : "pointer",
          }}
        >
          {uploading ? "첨부 중" : selectedRoom ? "전송" : "문의"}
        </button>
      </div>
    </div>
  );
}
