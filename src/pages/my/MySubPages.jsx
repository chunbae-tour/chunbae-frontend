import { useEffect, useState } from "react";
import { COLORS, S } from "../../constants/colors.js";
import { EmptyState, ErrorState, SkeletonList } from "../../components/common";
import { getApiErrorHint } from "../../services/apiClient.js";
import { fetchMyReviews, fetchOwnedItemQr, fetchOwnedItems, fetchWishlist, removeWishlistItem } from "../../services/myService.js";

function isRoleDeniedError(error) {
  return error?.status === 403;
}

// ─── 찜 목록 ─────────────────────────────────────────────────────────
export function WishlistPage({ onBack, onPlaceClick }) {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const loadWishlist = () => {
    setStatus("loading");
    setErrorMessage("");
    fetchWishlist()
      .then((data) => {
        setItems(data);
        setStatus(data.length > 0 ? "success" : "empty");
      })
      .catch((error) => {
        setItems([]);
        if (isRoleDeniedError(error)) {
          setStatus("empty");
          return;
        }
        setErrorMessage(getApiErrorHint(error));
        setStatus("error");
      });
  };

  useEffect(() => {
    let ignore = false;
    if (!ignore) loadWishlist();
    return () => { ignore = true; };
  }, []);

  const removeLike = async (id) => {
    try {
      await removeWishlistItem(id);
    } catch {
      // TODO: 찜 취소 API 연결 실패 시 현재 화면 상태만 갱신합니다.
    }
    setItems(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div style={S.screen}>
      <div style={{ background: COLORS.primary, padding: "44px 16px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <span onClick={onBack} style={{ color: "#fff", fontSize: 20, cursor: "pointer" }}>←</span>
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>❤️ 찜 목록</span>
      </div>
      <div style={S.scrollArea}>
        {status === "loading" ? (
          <div style={{ padding: 16 }}><SkeletonList count={3} /></div>
        ) : status === "error" ? (
          <div style={{ padding: 16 }}>
            <ErrorState
              title="찜 목록을 불러오지 못했습니다."
              description={errorMessage || "백엔드 연결 상태를 확인한 뒤 다시 시도해주세요."}
              onRetry={loadWishlist}
            />
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: 16 }}>
            <EmptyState
              icon="♡"
              title="찜한 장소가 없어요."
              description="마음에 드는 시장과 관광지를 발견하면 찜해두고 나중에 다시 볼 수 있습니다."
            />
          </div>
        ) : (
          <div style={{ padding: 16 }}>
            {items.map(p => (
              <div key={p.id} style={{ background: "#fff", borderRadius: 16, padding: 16, marginBottom: 10, display: "flex", gap: 14, alignItems: "center", border: "0.5px solid rgba(0,0,0,0.06)" }}>
                <div onClick={() => onPlaceClick(p)} style={{ fontSize: 36, width: 60, height: 60, background: COLORS.bg, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>{p.emoji}</div>
                <div style={{ flex: 1, cursor: "pointer" }} onClick={() => onPlaceClick(p)}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.primary, marginBottom: 4 }}>{p.name}</div>
                  <div style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 4 }}>{p.addr}</div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <span style={{ fontSize: 14, color: COLORS.textMuted }}>📍 {p.dist}</span>
                    <span style={{ color: COLORS.accent, fontSize: 14, fontWeight: 700 }}>★ {p.rating}</span>
                  </div>
                </div>
                <div onClick={() => removeLike(p.id)} style={{ fontSize: 22, cursor: "pointer" }}>❤️</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 내 리뷰 목록 ─────────────────────────────────────────────────────
export function MyReviewPage({ onBack, showToast }) {
  const [reviews, setReviews] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const loadReviews = () => {
    setStatus("loading");
    setErrorMessage("");
    fetchMyReviews()
      .then((data) => {
        setReviews(data);
        setStatus(data.length > 0 ? "success" : "empty");
      })
      .catch((error) => {
        setReviews([]);
        setErrorMessage(getApiErrorHint(error));
        setStatus("error");
      });
  };

  useEffect(() => {
    let ignore = false;
    if (!ignore) loadReviews();
    return () => { ignore = true; };
  }, []);

  return (
    <div style={S.screen}>
      <div style={{ background: COLORS.primary, padding: "44px 16px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <span onClick={onBack} style={{ color: "#fff", fontSize: 20, cursor: "pointer" }}>←</span>
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>✍️ 내 리뷰</span>
      </div>
      <div style={S.scrollArea}>
        <div style={{ padding: 16 }}>
          {status === "loading" && <SkeletonList count={3} />}
          {status === "empty" && (
            <EmptyState
              icon="✎"
              title="작성한 리뷰가 없습니다."
              description="결제내역에서 방문한 상점 상세로 이동하면 리뷰를 남길 수 있습니다."
            />
          )}
          {status === "error" && (
            <ErrorState
              title="내 리뷰를 불러오지 못했습니다."
              description={errorMessage || "백엔드 연결 상태를 확인한 뒤 다시 시도해주세요."}
              onRetry={loadReviews}
            />
          )}
          {reviews.map(r => (
            <div key={r.id} style={{ background: "#fff", borderRadius: 16, padding: 16, marginBottom: 10, border: "0.5px solid rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 28, width: 44, height: 44, background: COLORS.bg, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>{r.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary }}>{r.place}</div>
                  <div style={{ color: COLORS.accent, fontSize: 14 }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <span onClick={() => showToast("리뷰 수정")} style={{ fontSize: 18, cursor: "pointer" }}>✏️</span>
                  <span onClick={() => showToast("리뷰 삭제")} style={{ fontSize: 18, cursor: "pointer" }}>🗑️</span>
                </div>
              </div>
              <p style={{ fontSize: 14, color: COLORS.textSub, lineHeight: 1.6, marginBottom: 10 }}>{r.text}</p>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: COLORS.textMuted }}>
                <span>{r.date}</span>
                <span>❤️ {r.likes}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 보유 아이템 ─────────────────────────────────────────────────────
export function OwnedItemsPage({ onBack, showToast }) {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [qrState, setQrState] = useState({
    status: "idle",
    item: null,
    qr: null,
    errorMessage: "",
  });

  const loadOwnedItems = () => {
    setStatus("loading");
    setErrorMessage("");
    fetchOwnedItems()
      .then((data) => {
        setItems(data);
        setStatus(data.length > 0 ? "success" : "empty");
      })
      .catch((error) => {
        setItems([]);
        if (isRoleDeniedError(error)) {
          setStatus("empty");
          return;
        }
        setErrorMessage(getApiErrorHint(error));
        setStatus("error");
      });
  };

  useEffect(() => {
    let ignore = false;
    if (!ignore) loadOwnedItems();
    return () => { ignore = true; };
  }, []);

  const handleIssueQr = async (item) => {
    const itemId = item.itemId ?? item.id;
    setQrState({ status: "loading", item, qr: null, errorMessage: "" });

    try {
      const qr = await fetchOwnedItemQr(itemId);
      setQrState({ status: "success", item, qr, errorMessage: "" });
    } catch (error) {
      setQrState({
        status: "error",
        item,
        qr: null,
        errorMessage: getApiErrorHint(error) || error.message || "아이템 QR을 발급하지 못했습니다.",
      });
    }
  };

  const closeQrDialog = () => {
    setQrState({ status: "idle", item: null, qr: null, errorMessage: "" });
  };

  return (
    <div style={S.screen} className="owned-items-page">
      <div style={{ background: COLORS.primary, padding: "44px 16px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <span onClick={onBack} style={{ color: "#fff", fontSize: 20, cursor: "pointer" }}>←</span>
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>🎁 보유 아이템</span>
      </div>
      <div style={S.scrollArea}>
        <div className="owned-items-summary">
          <strong>내가 가진 상점 아이템</strong>
          <span>사용하기를 누른 뒤 발급된 코드를 상인에게 보여주세요.</span>
        </div>
        {status === "loading" && <div style={{ padding: "0 16px 16px" }}><SkeletonList count={3} /></div>}
        {status === "empty" && (
          <div style={{ padding: "0 16px 16px" }}>
            <EmptyState
              icon="🎁"
              title="보유 중인 아이템이 없습니다."
              description="상점 쿠폰과 교환권을 받으면 이곳에서 사용할 수 있습니다."
            />
          </div>
        )}
        {status === "error" && (
          <div style={{ padding: "0 16px 16px" }}>
            <ErrorState
              title="보유 아이템을 불러오지 못했습니다."
              description={errorMessage || "백엔드 연결 상태를 확인한 뒤 다시 시도해주세요."}
              onRetry={loadOwnedItems}
            />
          </div>
        )}
        <div className="owned-items-list">
          {items.map(item => (
            <article key={item.id} className="owned-item-card">
              <div>
                <span className={item.status === "곧 만료" ? "soon" : ""}>{item.status}</span>
                <h3>{item.name}</h3>
                <p>{item.market} · {item.shop}</p>
                <small>만료일 {item.expires}</small>
              </div>
              <button
                type="button"
                onClick={() => handleIssueQr(item)}
                disabled={qrState.status === "loading" && (qrState.item?.id === item.id)}
              >
                {qrState.status === "loading" && qrState.item?.id === item.id ? "발급 중" : "사용하기"}
              </button>
            </article>
          ))}
        </div>
        {qrState.item && (
          <div className="confirm-dialog-backdrop" role="presentation" onMouseDown={closeQrDialog}>
            <div className="confirm-dialog owned-item-qr-dialog" role="dialog" aria-modal="true" aria-labelledby="owned-item-qr-title" onMouseDown={(event) => event.stopPropagation()}>
              <strong id="owned-item-qr-title">아이템 사용 코드</strong>
              <p>{qrState.item.name} 사용을 위해 상인에게 아래 코드를 보여주세요.</p>
              {qrState.status === "loading" && <div className="owned-item-qr-token">QR 코드 발급 중...</div>}
              {qrState.status === "error" && (
                <div className="owned-item-qr-error">
                  {qrState.errorMessage || "아이템 QR을 발급하지 못했습니다."}
                </div>
              )}
              {qrState.status === "success" && (
                <>
                  <div className="owned-item-qr-token">{qrState.qr?.token || "토큰 없음"}</div>
                  {qrState.qr?.expiresAt && <small>만료 시각 {qrState.qr.expiresAt}</small>}
                </>
              )}
              <div className="confirm-dialog-actions">
                <button type="button" className="secondary" onClick={closeQrDialog}>닫기</button>
                {qrState.status === "error" && (
                  <button type="button" className="primary" onClick={() => handleIssueQr(qrState.item)}>다시 발급</button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
