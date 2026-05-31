import { useEffect, useState } from "react";
import { COLORS, S } from "../../constants/colors";
import { EmptyState, ErrorState, SkeletonBlock, SkeletonList } from "../../components/common";
import YeopjeonImg from "../../assets/yeopjeon-icon.png";
import { getPlaceImageUrl } from "../../constants/placeImages.js";
import { getApiErrorHint } from "../../services/apiClient.js";
import {
  createPaymentRequestKey,
  fetchPaymentHistory,
  fetchYeopjeonBalance,
  isPaymentHistoryPayment,
  requestCharge,
} from "../../services/paymentService.js";

const WON_TO_YEOPJEON_RATE = 10;
const formatWon = (value) => `${value.toLocaleString()}원`;
const formatYeopjeon = (value) => `${value.toLocaleString()} 엽전`;
const toYeopjeon = (won) => Math.floor(won / WON_TO_YEOPJEON_RATE);

export function PayChargePage({ onBack, onDone, showToast }) {
  const [selected, setSelected] = useState(null);
  const [method, setMethod] = useState("카카오페이");
  const [balance, setBalance] = useState(0);
  const [balanceStatus, setBalanceStatus] = useState("loading");
  const [balanceError, setBalanceError] = useState("");
  const [charging, setCharging] = useState(false);
  const [error, setError] = useState("");
  const [lastRequestKey, setLastRequestKey] = useState("");

  const amounts = [
    { won: 5000, best: true },
    { won: 10000 },
    { won: 30000 },
    { won: 50000 },
    { won: 100000 },
  ].map((item) => ({
    ...item,
    value: item.won,
    coinAmount: toYeopjeon(item.won),
    label: formatYeopjeon(toYeopjeon(item.won)),
    price: formatWon(item.won),
  }));
  const methods = [
    { label: "카카오페이", desc: "국내 간편결제", provider: "KakaoPay" },
    { label: "토스페이", desc: "국내 간편결제", provider: "TossPay" },
    { label: "신용카드", desc: "국내 카드 결제", provider: "Card" },
    { label: "해외카드", desc: "외국인 관광객 카드", provider: "Eximbay" },
  ];

  useEffect(() => {
    let ignore = false;

    fetchYeopjeonBalance()
      .then((value) => {
        if (ignore) return;
        setBalance(value);
        setBalanceStatus("success");
      })
      .catch((error) => {
        if (ignore) return;
        setBalanceError(getApiErrorHint(error));
        setBalanceStatus("error");
      });

    return () => { ignore = true; };
  }, []);

  const handleCharge = async () => {
    if (charging) return;
    if (!selected) { showToast("충전할 엽전을 선택해주세요!"); return; }
    setCharging(true);
    setError("");
    const requestKey = createPaymentRequestKey();
    setLastRequestKey(requestKey);

    try {
      const result = await requestCharge({ amount: selected.value, paymentMethod: method, idempotencyKey: requestKey });
      showToast(`충전 요청이 생성되었습니다. 주문번호: ${result.orderUid || "확인 필요"}`);
      setTimeout(onDone, 1500);
    } catch (err) {
      setError(err.message || "충전 요청 중 문제가 발생했습니다.");
    } finally {
      setCharging(false);
    }
  };

  return (
    <div style={S.screen} className="web-payment-page">
      <div className="web-page-topbar" style={{ background: COLORS.primary, padding: "44px 16px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <span onClick={onBack} style={{ color: "#fff", fontSize: 20, cursor: "pointer" }}>←</span>
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8 }}>
          <img src={YeopjeonImg} alt="" style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover" }} />
          엽전 충전
        </span>
      </div>
      <div style={S.scrollArea} className="web-detail-scroll">
        <div className="web-payment-layout">
        <div className="web-payment-balance" style={{ background: COLORS.primary, margin: 16, borderRadius: 16, padding: 20, textAlign: "center" }}>
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, marginBottom: 6 }}>현재 엽전 잔액</div>
          {balanceStatus === "loading" ? (
            <div className="payment-balance-skeleton" aria-label="잔액을 불러오는 중입니다.">
              <SkeletonBlock className="coin" />
              <div>
                <SkeletonBlock className="amount" />
                <SkeletonBlock className="caption" />
              </div>
            </div>
          ) : (
            <>
              <div style={{ color: COLORS.accent, fontSize: 34, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                <img src={YeopjeonImg} alt="" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", boxShadow: "0 10px 26px rgba(255,180,30,0.28)" }} />
                {balance.toLocaleString()}
              </div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginTop: 4 }}>엽전</div>
            </>
          )}
          {balanceStatus === "error" && <div style={{ color: "rgba(255,255,255,0.72)", fontSize: 14, marginTop: 8 }}>{balanceError}</div>}
        </div>
        <div className="web-payment-section" style={{ padding: "0 16px 16px" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.primary, marginBottom: 12 }}>충전 금액 선택</div>
          <div className="payment-rate-note">
            최소 충전은 5,000원부터 가능해요. 1,000원 = 100엽전 기준으로 충전됩니다.
          </div>
          <div className="web-payment-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10 }}>
            {amounts.map(a => (
              <div key={a.value} className="payment-amount-card" onClick={() => setSelected(a)} style={{ background: selected?.value === a.value ? COLORS.primary : "#fff", border: `2px solid ${selected?.value === a.value ? COLORS.primary : "rgba(0,0,0,0.08)"}`, borderRadius: 14, padding: "14px 12px", cursor: "pointer", position: "relative", textAlign: "center" }}>
                {a.best && <span style={{ position: "absolute", top: -8, right: 10, background: COLORS.accent, color: COLORS.primary, fontSize: 14, fontWeight: 700, borderRadius: 20, padding: "2px 8px" }}>BEST</span>}
                <div style={{ fontSize: 16, fontWeight: 700, color: selected?.value === a.value ? COLORS.accent : COLORS.primary }}>{a.price}</div>
                <div style={{ fontSize: 14, color: selected?.value === a.value ? "rgba(255,255,255,0.6)" : COLORS.textMuted, marginTop: 4 }}>{a.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="web-payment-section" style={{ padding: "0 16px 16px" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.primary, marginBottom: 12 }}>결제 수단</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {methods.map(m => (
              <div key={m.label} className={`payment-method-card ${method === m.label ? "active" : ""}`} onClick={() => setMethod(m.label)}>
                <div>
                  <span>{m.label}</span>
                  <small>{m.desc}</small>
                </div>
                <em>{m.provider}</em>
                <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${method === m.label ? COLORS.primary : "#ccc"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {method === m.label && <div style={{ width: 10, height: 10, borderRadius: "50%", background: COLORS.primary }} />}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="web-payment-section web-payment-submit" style={{ padding: "0 16px 32px" }}>
          {selected && (
            <div style={{ background: COLORS.bg, borderRadius: 12, padding: "12px 16px", marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: COLORS.textMuted, marginBottom: 6 }}>
                <span>충전 엽전</span><span style={{ fontWeight: 700, color: COLORS.primary }}>{selected.label}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: COLORS.textMuted }}>
                <span>결제 금액</span><span style={{ fontWeight: 700, color: COLORS.primary }}>{selected.price}</span>
              </div>
              <div className="payment-safety-note">
                <span>중복 결제 방지</span>
                <strong>{lastRequestKey ? `${lastRequestKey.slice(0, 8)}...` : "결제 요청 시 자동 생성"}</strong>
              </div>
            </div>
          )}
          {error && <div style={{ color: "#E24B4A", fontSize: 14, marginBottom: 10 }}>{error}</div>}
          <button type="button" className="payment-primary-action" disabled={charging} onClick={handleCharge} style={{ width: "100%", border: "none", background: COLORS.accent, color: COLORS.primary, borderRadius: 14, padding: "15px 0", textAlign: "center", fontWeight: 700, fontSize: 15, cursor: charging ? "default" : "pointer", opacity: charging ? 0.7 : 1 }}>
            {charging ? "충전 요청 중..." : selected ? `${selected.price} 결제 요청하기` : "충전할 금액을 먼저 선택해주세요"}
          </button>
          <div style={{ fontSize: 14, color: COLORS.textMuted, textAlign: "center", marginTop: 8 }}>PG 결제창 URL은 백엔드 응답 협의 후 연결합니다.</div>
        </div>
        </div>
      </div>
    </div>
  );
}

export function PayHistoryPage({ onBack, onPlaceClick, onShopClick, showToast }) {
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const loadHistory = () => {
    setStatus("loading");
    setErrorMessage("");
    fetchPaymentHistory()
      .then((data) => {
        setHistory(data);
        setStatus(data.length > 0 ? "success" : "empty");
      })
      .catch((error) => {
        setHistory([]);
        setErrorMessage(getApiErrorHint(error));
        setStatus("error");
      });
  };

  useEffect(() => {
    let ignore = false;
    if (!ignore) loadHistory();
    return () => { ignore = true; };
  }, []);

  const findPaidPlace = (historyItem) => {
    if (!isPaymentHistoryPayment(historyItem)) return null;
    return null;
  };

  return (
    <div style={S.screen} className="web-payment-page">
      <div className="web-page-topbar" style={{ background: COLORS.primary, padding: "44px 16px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <span onClick={onBack} style={{ color: "#fff", fontSize: 20, cursor: "pointer" }}>←</span>
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>결제 내역</span>
      </div>
      <div style={{ background: COLORS.primary, padding: "0 16px 20px", textAlign: "center" }}>
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>현재 잔액</div>
        <div style={{ color: COLORS.accent, fontSize: 28, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <img src={YeopjeonImg} alt="" style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover" }} />
          5,000 엽전
        </div>
      </div>
      <div style={S.scrollArea} className="web-detail-scroll">
        <div className="web-history-list" style={{ padding: 16 }}>
          {status === "loading" && <SkeletonList count={4} />}
          {status === "empty" && (
            <EmptyState
              icon="🧾"
              title="결제 내역이 없습니다."
              description="현장에서 QR 결제를 완료하면 거래한 상점과 리뷰 작성入口가 이곳에 표시됩니다."
            />
          )}
          {status === "error" && (
            <ErrorState
              title="결제 내역을 불러오지 못했습니다."
              description={errorMessage || "백엔드 연결 상태를 확인한 뒤 다시 시도해주세요."}
              onRetry={loadHistory}
            />
          )}
          {history.map(h => {
            const paidPlace = findPaidPlace(h);
            const reviewTarget = isPaymentHistoryPayment(h) && h.shopId ? {
              id: h.shopId,
              shopId: h.shopId,
              name: h.shopName || h.desc,
              shopName: h.shopName || h.desc,
              marketName: h.placeName || paidPlace?.name || "연결된 장소",
              placeName: h.placeName || paidPlace?.name,
              place: paidPlace,
              imageUrl: getPlaceImageUrl(paidPlace) || h.imageUrl || h.shopImageUrl,
              reviewIntent: h.reviewWritable !== false,
              paymentHistoryId: h.id,
              reviewWritable: h.reviewWritable ?? true,
              reviewId: h.reviewId ?? null,
              paidDesc: h.desc,
              paidAmount: h.paidAmount,
              acceptsYeopjeon: true,
              certified: true,
            } : null;
            return (
            <div key={h.id} className="payment-history-row" style={{ background: "#fff", borderRadius: 14, padding: "14px 16px", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center", border: "0.5px solid rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: h.type !== "결제" ? COLORS.greenBg : "#FEE8E8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                  {h.type === "충전" ? "🪙" : h.type === "적립" ? "🎁" : "🛍️"}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary }}>{h.desc}</div>
                  <div style={{ fontSize: 14, color: COLORS.textMuted, marginTop: 2 }}>{h.date}</div>
                  {isPaymentHistoryPayment(h) && (
                    <div className="payment-history-shop-block">
                      <span>{h.placeName || paidPlace?.name || "연결된 장소"} · {h.shopName || "결제 상점"}</span>
                      {h.paidAmount && <strong>지불 금액 {h.paidAmount}</strong>}
                      <button
                        type="button"
                        className="payment-history-place-link"
                        onClick={() => reviewTarget ? onShopClick?.(reviewTarget) : showToast?.("상점 상세 연결을 위해 결제 내역의 shopId가 필요합니다.")}
                      >
                        {h.reviewWritable === false ? "작성한 리뷰 보러가기" : "상점 상세에서 리뷰 남기기"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: h.type !== "결제" ? COLORS.green : "#E24B4A" }}>{h.amount}</div>
            </div>
          );})}
        </div>
      </div>
    </div>
  );
}
