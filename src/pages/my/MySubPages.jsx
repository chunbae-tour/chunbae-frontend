import { useEffect, useState } from "react";
import { COLORS, S } from "../../constants/colors.js";
import { EmptyState, ErrorState, SkeletonList } from "../../components/common";
import { getApiErrorHint } from "../../services/apiClient.js";
import { fetchMyReviews, fetchOwnedItemQr, fetchOwnedItems, fetchWishlist, removeWishlistItem } from "../../services/myService.js";
import { fetchMyReport, fetchMyReportsPage } from "../../services/reportService.js";

function isRoleDeniedError(error) {
  return error?.status === 403;
}

function formatKoreanDateTime(value) {
  if (!value) return "-";
  const normalized = String(value).replace(/(\.\d{3})\d+/, "$1");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatReportDate(value) {
  return formatKoreanDateTime(value);
}

function getReportStatusStyle(status) {
  if (status === "RESOLVED") return { background: "#E6F6EE", color: COLORS.primary };
  if (status === "DISMISSED") return { background: "#F1F2F4", color: COLORS.textMuted };
  return { background: "#FFF3CF", color: "#A36300" };
}

const WISHLIST_FILTERS = [
  { value: "ALL", label: "전체" },
  { value: "PLACE", label: "관광지" },
  { value: "MARKET", label: "전통시장" },
  { value: "FESTIVAL", label: "축제" },
];

// ─── 찜 목록 ─────────────────────────────────────────────────────────
export function WishlistPage({ onBack, onPlaceClick, onFestivalClick }) {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [activeType, setActiveType] = useState("ALL");
  const [removingKey, setRemovingKey] = useState("");

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

  const visibleItems = activeType === "ALL"
    ? items
    : items.filter((item) => item.targetType === activeType);

  const getItemKey = (item) => item.wishlistKey ?? `${item.targetType ?? "PLACE"}:${item.id}`;

  const removeLike = async (item) => {
    const itemKey = getItemKey(item);
    setRemovingKey(itemKey);
    setErrorMessage("");
    try {
      await removeWishlistItem(item);
      setItems(prev => prev.filter(p => getItemKey(p) !== itemKey));
    } catch (error) {
      setErrorMessage(getApiErrorHint(error) || "찜 취소에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setRemovingKey("");
    }
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
              description="마음에 드는 시장, 관광지, 축제를 발견하면 찜해두고 나중에 다시 볼 수 있습니다."
            />
          </div>
        ) : (
          <div style={{ padding: 16 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              {WISHLIST_FILTERS.map((filter) => {
                const count = filter.value === "ALL"
                  ? items.length
                  : items.filter((item) => item.targetType === filter.value).length;
                const active = activeType === filter.value;
                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setActiveType(filter.value)}
                    style={{
                      border: active ? `1px solid ${COLORS.primary}` : "0.5px solid rgba(0,0,0,0.08)",
                      background: active ? COLORS.primary : "#fff",
                      color: active ? "#fff" : COLORS.textSub,
                      borderRadius: 999,
                      padding: "8px 12px",
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    {filter.label} {count}
                  </button>
                );
              })}
            </div>
            {errorMessage && (
              <div style={{ background: "#FFF0F0", border: "1px solid rgba(226,75,74,0.18)", color: "#A32D2D", borderRadius: 12, padding: 12, fontSize: 13, marginBottom: 12 }}>
                {errorMessage}
              </div>
            )}
            {visibleItems.length === 0 ? (
              <EmptyState
                icon="♡"
                title={`${WISHLIST_FILTERS.find((filter) => filter.value === activeType)?.label ?? "선택한 항목"} 찜이 없어요.`}
                description="다른 카테고리를 선택하거나 상세 페이지에서 마음에 드는 항목을 찜해보세요."
              />
            ) : visibleItems.map(p => {
              const itemKey = getItemKey(p);
              const canOpenDetail = p.targetType !== "FESTIVAL" || Boolean(onFestivalClick);
              const openDetail = () => {
                if (p.targetType === "FESTIVAL") {
                  onFestivalClick?.(p);
                  return;
                }
                onPlaceClick?.(p);
              };
              return (
              <div key={itemKey} style={{ background: "#fff", borderRadius: 16, padding: 16, marginBottom: 10, display: "flex", gap: 14, alignItems: "center", border: "0.5px solid rgba(0,0,0,0.06)" }}>
                <div
                  onClick={() => canOpenDetail && openDetail()}
                  style={{ fontSize: 34, width: 60, height: 60, background: COLORS.bg, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", cursor: canOpenDetail ? "pointer" : "default", flexShrink: 0 }}
                >
                  {p.emoji}
                </div>
                <div style={{ flex: 1, cursor: canOpenDetail ? "pointer" : "default" }} onClick={() => canOpenDetail && openDetail()}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: COLORS.primary }}>{p.name}</div>
                    <span style={{ background: "#E1F5EE", color: "#0F6E56", borderRadius: 999, padding: "3px 8px", fontSize: 11, fontWeight: 800 }}>
                      {p.typeLabel}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 4 }}>{p.addr || "위치 정보 없음"}</div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <span style={{ fontSize: 14, color: COLORS.textMuted }}>📍 {p.dist}</span>
                    <span style={{ color: "#E8A020", fontSize: 14, fontWeight: 700 }}>★ {p.rating}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeLike(p)}
                  disabled={removingKey === itemKey}
                  aria-label={`${p.name} 찜 취소`}
                  style={{
                    border: 0,
                    background: "transparent",
                    fontSize: 22,
                    cursor: removingKey === itemKey ? "default" : "pointer",
                    opacity: removingKey === itemKey ? 0.45 : 1,
                    padding: 6,
                  }}
                >
                  {removingKey === itemKey ? "…" : "❤️"}
                </button>
              </div>
            );})}
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
                  <div style={{ color: "#E8A020", fontSize: 14 }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <span onClick={() => showToast("리뷰 수정")} style={{ fontSize: 18, cursor: "pointer" }}>✏️</span>
                  <span onClick={() => showToast("리뷰 삭제")} style={{ fontSize: 18, cursor: "pointer" }}>🗑️</span>
                </div>
              </div>
              <p style={{ fontSize: 14, color: COLORS.textSub, lineHeight: 1.6, marginBottom: 10 }}>{r.text}</p>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: COLORS.textMuted }}>
                <span>{formatKoreanDateTime(r.date)}</span>
                <span>❤️ {r.likes}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 내 신고 내역 ───────────────────────────────────────────────────
export function MyReportsPage({ onBack }) {
  const [reports, setReports] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [nextCursor, setNextCursor] = useState(null);
  const [hasNext, setHasNext] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailStatus, setDetailStatus] = useState("idle");
  const [detailError, setDetailError] = useState("");

  const loadReports = ({ cursor = null, append = false } = {}) => {
    if (append) setLoadingMore(true);
    else {
      setStatus("loading");
      setErrorMessage("");
      setSelectedReportId(null);
      setDetail(null);
      setDetailStatus("idle");
    }

    fetchMyReportsPage({ cursor, size: 20 })
      .then((page) => {
        const nextReports = append ? [...reports, ...page.content] : page.content;
        setReports(nextReports);
        setNextCursor(page.nextCursor);
        setHasNext(page.hasNext);
        setStatus(nextReports.length > 0 ? "success" : "empty");
      })
      .catch((error) => {
        if (!append) setReports([]);
        setErrorMessage(getApiErrorHint(error));
        setStatus("error");
      })
      .finally(() => {
        setLoadingMore(false);
      });
  };

  useEffect(() => {
    let ignore = false;
    if (!ignore) loadReports();
    return () => { ignore = true; };
  }, []);

  const openDetail = async (report) => {
    const reportId = report.reportId ?? report.id;
    if (!reportId) return;
    if (selectedReportId === reportId) {
      setSelectedReportId(null);
      setDetail(null);
      setDetailStatus("idle");
      return;
    }

    setSelectedReportId(reportId);
    setDetail(report);
    setDetailStatus("loading");
    setDetailError("");

    try {
      const data = await fetchMyReport(reportId);
      setDetail(data);
      setDetailStatus("success");
    } catch (error) {
      setDetailStatus("error");
      setDetailError(getApiErrorHint(error));
    }
  };

  return (
    <div style={S.screen}>
      <div style={{ background: COLORS.primary, padding: "44px 16px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <span onClick={onBack} style={{ color: "#fff", fontSize: 20, cursor: "pointer" }}>←</span>
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>🚩 내 신고 내역</span>
      </div>
      <div style={S.scrollArea}>
        {status === "loading" ? (
          <div style={{ padding: 16 }}><SkeletonList count={4} /></div>
        ) : status === "error" ? (
          <div style={{ padding: 16 }}>
            <ErrorState
              title="신고 내역을 불러오지 못했습니다."
              description={errorMessage || "백엔드 연결 상태를 확인한 뒤 다시 시도해주세요."}
              onRetry={() => loadReports()}
            />
          </div>
        ) : reports.length === 0 ? (
          <div style={{ padding: 16 }}>
            <EmptyState
              icon="🚩"
              title="접수한 신고가 없습니다."
              description="게시글, 댓글, 사용자 신고를 접수하면 이곳에서 처리 상태를 확인할 수 있습니다."
            />
          </div>
        ) : (
          <div style={{ padding: 16 }}>
            <div style={{ background: "#FFF7DC", border: "1px solid rgba(255,180,30,0.35)", borderRadius: 14, padding: 14, marginBottom: 12, color: "#8A4B00", fontSize: 14, lineHeight: 1.5 }}>
              내가 접수한 신고와 처리 상태를 확인할 수 있습니다. 항목을 누르면 접수 내용을 펼쳐볼 수 있어요.
            </div>
            {reports.map((report) => {
              const statusStyle = getReportStatusStyle(report.status);
              const isOpen = selectedReportId === (report.reportId ?? report.id);
              return (
                <article
                  key={report.reportId ?? report.id}
                  onClick={() => openDetail(report)}
                  style={{
                    background: "#fff",
                    border: "0.5px solid rgba(0,0,0,0.06)",
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 10,
                    cursor: "pointer",
                    boxShadow: isOpen ? "0 10px 28px rgba(0,0,0,0.07)" : "none",
                  }}
                >
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ width: 46, height: 46, borderRadius: 14, background: "#FFF0F0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>🚩</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 6 }}>
                        <strong style={{ fontSize: 15, color: COLORS.primary }}>{report.targetLabel}</strong>
                        <span style={{ ...statusStyle, borderRadius: 999, padding: "4px 9px", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" }}>
                          {report.statusLabel}
                        </span>
                      </div>
                      <div style={{ fontSize: 14, color: COLORS.textSub, marginBottom: 5 }}>
                        사유: {report.reasonLabel}
                      </div>
                      <div style={{ fontSize: 13, color: COLORS.textMuted }}>
                        신고번호 {report.reportId} · 접수일 {formatReportDate(report.createdAt)}
                      </div>
                    </div>
                  </div>

                  {isOpen && (
                    <div style={{ marginTop: 14, borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: 14 }}>
                      {detailStatus === "loading" && <div style={{ fontSize: 14, color: COLORS.textMuted }}>상세 내역을 확인하는 중입니다...</div>}
                      {detailStatus === "error" && (
                        <div style={{ fontSize: 14, color: "#E24B4A" }}>{detailError || "상세 내역을 불러오지 못했습니다."}</div>
                      )}
                      {detail && detailStatus !== "loading" && (
                        <div style={{ display: "grid", gap: 8, fontSize: 14, color: COLORS.textSub, lineHeight: 1.5 }}>
                          <div><b style={{ color: COLORS.textMain }}>신고 대상</b> {detail.targetLabel}</div>
                          <div><b style={{ color: COLORS.textMain }}>대상 ID</b> {detail.targetId ?? "-"}</div>
                          <div><b style={{ color: COLORS.textMain }}>처리 상태</b> {detail.statusLabel}</div>
                          <div>
                            <b style={{ color: COLORS.textMain }}>신고 내용</b>
                            <p style={{ margin: "6px 0 0", color: COLORS.textSub }}>
                              {detail.description || "추가로 입력한 내용이 없습니다."}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
            {hasNext && (
              <button
                type="button"
                onClick={() => loadReports({ cursor: nextCursor, append: true })}
                disabled={loadingMore}
                style={{
                  width: "100%",
                  border: 0,
                  borderRadius: 14,
                  background: COLORS.primary,
                  color: "#fff",
                  padding: "13px 0",
                  fontWeight: 800,
                  cursor: loadingMore ? "default" : "pointer",
                  opacity: loadingMore ? 0.65 : 1,
                }}
              >
                {loadingMore ? "불러오는 중..." : "더 보기"}
              </button>
            )}
          </div>
        )}
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
