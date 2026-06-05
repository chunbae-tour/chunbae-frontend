import { useEffect, useState } from "react";
import { COLORS, S } from "../../constants/colors";
import { ConfirmDialog, EmptyState, ErrorState, SkeletonList } from "../../components/common";
import { getApiErrorHint } from "../../services/apiClient.js";
import { approveJoinRequest, fetchJoinRequests, rejectJoinRequest } from "../../services/chatService.js";

export default function ChatRequestPage({ room, onBack, showToast }) {
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [actioningId, setActioningId] = useState(null);
  const [rejectConfirmTarget, setRejectConfirmTarget] = useState(null);
  const roomId = room?.chatRoomId ?? room?.id;

  const loadRequests = () => {
    setStatus("loading");
    setErrorMessage("");

    fetchJoinRequests(roomId)
      .then((data) => {
        setRequests(data.length > 0 ? data : []);
        setStatus(data.length > 0 ? "success" : "empty");
      })
      .catch((error) => {
        setRequests([]);
        setErrorMessage(getApiErrorHint(error));
        setStatus("error");
      });
  };

  useEffect(() => {
    let ignore = false;
    if (!ignore) loadRequests();
    return () => { ignore = true; };
  }, [roomId]);

  const handle = async (id, action) => {
    if (actioningId) return;
    setActioningId(id);
    try {
      if (action === "수락") {
        await approveJoinRequest({ chatRoomId: roomId, joinRequestId: id });
      } else {
        await rejectJoinRequest({ chatRoomId: roomId, joinRequestId: id, reason: "HOST_REJECTED" });
      }
    } catch (error) {
      showToast?.(getApiErrorHint(error));
      setActioningId(null);
      return;
    }
    showToast(action === "수락" ? "✅ 참여 신청을 수락했습니다!" : "❌ 참여 신청을 거절했습니다.");
    setRequests(prev => prev.filter(r => r.id !== id));
    setRejectConfirmTarget(null);
    setActioningId(null);
  };

  return (
    <div style={S.screen}>
      <div style={{ background: COLORS.primary, padding: "44px 16px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <span onClick={onBack} style={{ color: "#fff", fontSize: 20, cursor: "pointer" }}>←</span>
        <div>
          <div style={{ color: "#fff", fontSize: 16, fontWeight: 700 }}>참여 신청 목록</div>
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>{room?.title}</div>
        </div>
      </div>
      <div style={S.scrollArea}>
        {status === "loading" ? (
          <div style={{ padding: 16 }}><SkeletonList count={3} /></div>
        ) : status === "error" ? (
          <div style={{ padding: 16 }}>
            <ErrorState
              title="참여 신청을 불러오지 못했습니다."
              description={errorMessage || "백엔드 연결 상태를 확인한 뒤 다시 시도해주세요."}
              onRetry={loadRequests}
            />
          </div>
        ) : requests.length === 0 ? (
          <div style={{ padding: 16 }}>
            <EmptyState
              icon="👥"
              title="신청 목록이 없어요."
              description="새로운 참여 신청이 오면 이곳에서 수락하거나 거절할 수 있습니다."
            />
          </div>
        ) : (
          <div style={{ padding: 16 }}>
            {requests.map(r => (
              <div key={r.id} style={{ background: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, border: "0.5px solid rgba(0,0,0,0.06)" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: COLORS.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{r.avatar}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.primary }}>{r.name}</div>
                    <div style={{ fontSize: 14, color: COLORS.accent }}>★ {r.score} · 동행 {r.count}회</div>
                  </div>
                </div>
                <div style={{ background: COLORS.bg, borderRadius: 10, padding: "10px 14px", fontSize: 14, color: COLORS.textSub, marginBottom: 12 }}>
                  "{r.msg}"
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" disabled={actioningId === r.id} onClick={() => setRejectConfirmTarget(r)} style={{ flex: 1, background: "#fff", border: "1.5px solid rgba(0,0,0,0.1)", borderRadius: 12, padding: "10px 0", textAlign: "center", fontWeight: 700, fontSize: 14, cursor: actioningId === r.id ? "wait" : "pointer", color: COLORS.textMuted }}>거절</button>
                  <button type="button" disabled={actioningId === r.id} onClick={() => handle(r.id, "수락")} style={{ flex: 2, background: COLORS.primary, border: 0, borderRadius: 12, padding: "10px 0", textAlign: "center", fontWeight: 700, fontSize: 14, cursor: actioningId === r.id ? "wait" : "pointer", color: "#fff" }}>{actioningId === r.id ? "처리 중" : "수락"}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <ConfirmDialog
        open={Boolean(rejectConfirmTarget)}
        danger
        title="참여 신청을 거절할까요?"
        description={`${rejectConfirmTarget?.name || "신청자"} 님에게는 이 동행 채팅방 참여가 승인되지 않습니다.`}
        confirmLabel="신청 거절"
        cancelLabel="취소"
        onConfirm={() => handle(rejectConfirmTarget.id, "거절")}
        onCancel={() => setRejectConfirmTarget(null)}
      />
    </div>
  );
}

