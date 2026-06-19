import { useEffect, useState } from "react";
import { COLORS, S } from "../../constants/colors";
import { EmptyState, ErrorState, SkeletonBlock, SkeletonList } from "../../components/common";
import YeopjeonImg from "../../assets/brand/yeopjeon-icon.png";
import { getPlaceImageUrl } from "../../constants/placeImages.js";
import { getApiErrorHint } from "../../services/apiClient.js";
import {
  createPaymentRequestKey,
  cancelChargeOrder,
  fetchChargeRefundHistory,
  fetchPaymentHistory,
  fetchYeopjeonBalance,
  isPaymentHistoryPayment,
  requestCharge,
  requestPortOnePayment,
  waitForChargeSettlement,
} from "../../services/paymentService.js";

const WON_TO_YEOPJEON_RATE = 10;
const formatWon = (value) => `${value.toLocaleString()}원`;
const formatYeopjeon = (value) => `${value.toLocaleString()}냥`;
const toYeopjeon = (won) => Math.floor(won / WON_TO_YEOPJEON_RATE);
const MIN_CHARGE_AMOUNT = 5000;
const MAX_CHARGE_AMOUNT = 100000;

const PAYMENT_LOGO_BASE = "/assets/payment-logos";
const PAYMENT_METHODS = [
  {
    label: "카카오페이",
    desc: "국내 간편결제",
    provider: "KakaoPay",
    logo: `${PAYMENT_LOGO_BASE}/kakaopay.png`,
    logoAlt: "카카오페이",
    logoTone: "kakao",
    fallback: "pay",
  },
  {
    label: "토스페이",
    desc: "국내 간편결제",
    provider: "TossPay",
    logo: `${PAYMENT_LOGO_BASE}/toss-white.png`,
    logoAlt: "토스페이",
    logoTone: "toss",
    fallback: "toss",
  },
  {
    label: "신용카드",
    desc: "국내 카드 결제",
    provider: "Card",
    logoTone: "card",
    fallback: "💳",
  },
  {
    label: "해외카드",
    desc: "외국인 관광객 카드",
    provider: "Eximbay",
    logo: `${PAYMENT_LOGO_BASE}/eximbay.svg`,
    logoAlt: "Eximbay",
    logoTone: "eximbay",
    fallback: "EX",
  },
];

export function PayChargePage({ onBack, onDone, showToast }) {
  const [selected, setSelected] = useState(null);
  const [method, setMethod] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [isDirectInput, setIsDirectInput] = useState(false);
  const [balance, setBalance] = useState(0);
  const [balanceStatus, setBalanceStatus] = useState("loading");
  const [balanceError, setBalanceError] = useState("");
  const [charging, setCharging] = useState(false);
  const [error, setError] = useState("");
  const [lastRequestKey, setLastRequestKey] = useState("");
  const [settlementMessage, setSettlementMessage] = useState("");

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
    label: `+${formatYeopjeon(toYeopjeon(item.won))} 충전`,
    price: formatWon(item.won),
  }));

  const customAmountValue = Number(customAmount);
  const customAmountError =
    isDirectInput && customAmount
      ? customAmountValue < MIN_CHARGE_AMOUNT || customAmountValue > MAX_CHARGE_AMOUNT
        ? "충전 금액은 5,000원부터 100,000원까지 가능해요."
        : customAmountValue % 1000 !== 0
          ? "1,000원 단위로 입력해주세요."
          : ""
      : "";
  const canPay = Boolean(selected && method && !customAmountError && !charging);
  const flowSteps = [
    { label: "금액 선택", done: Boolean(selected), active: !selected },
    {
      label: "결제 수단 선택",
      done: Boolean(selected && method),
      active: Boolean(selected && !method),
    },
    { label: "결제하기", done: false, active: Boolean(selected && method) },
  ];

  const handleSelectMethod = (nextMethod) => {
    if (!selected) {
      showToast("충전할 금액을 먼저 선택해주세요!");
      return;
    }
    if (customAmountError) {
      showToast(customAmountError);
      return;
    }
    setMethod(nextMethod);
  };

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

    return () => {
      ignore = true;
    };
  }, []);

  const handleCharge = async () => {
    if (charging) return;
    if (!selected) {
      showToast("충전할 금액을 선택해주세요!");
      return;
    }
    if (customAmountError) {
      showToast(customAmountError);
      return;
    }
    if (!method) {
      showToast("결제 수단을 선택해주세요!");
      return;
    }
    setCharging(true);
    setError("");
    setSettlementMessage("");
    const requestKey = createPaymentRequestKey();
    setLastRequestKey(requestKey);

    try {
      const result = await requestCharge({
        amount: selected.value,
        paymentMethod: method,
        idempotencyKey: requestKey,
      });
      const paymentResult = await requestPortOnePayment(result);
      console.info("PortOne payment result", paymentResult);
      setSettlementMessage("결제는 승인되었습니다. 백엔드 충전 반영을 확인하는 중입니다.");
      const settlement = await waitForChargeSettlement({
        orderUid: result.orderUid,
        previousBalance: balanceStatus === "success" ? balance : null,
      });

      if (settlement.balance != null) {
        setBalance(settlement.balance);
        setBalanceStatus("success");
      }

      if (settlement.status === "completed" || settlement.status === "balance-updated") {
        showToast(`${formatYeopjeon(selected.coinAmount)} 충전이 반영되었습니다.`);
        setTimeout(onDone, 900);
        return;
      }

      setError(
        "결제는 승인됐지만 잔액 반영을 아직 확인하지 못했습니다. 잠시 후 이용 내역을 확인해주세요.",
      );
    } catch (err) {
      console.error("Charge payment failed", err);
      setError(err.message || "결제 요청 중 문제가 발생했습니다.");
    } finally {
      setSettlementMessage("");
      setCharging(false);
    }
  };

  return (
    <div style={S.screen} className="web-payment-page">
      <div
        className="web-page-topbar payment-charge-topbar"
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
        <span
          style={{
            color: "#fff",
            fontSize: 18,
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <img
            src={YeopjeonImg}
            alt=""
            style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover" }}
          />
          엽전 충전
        </span>
      </div>
      <div style={S.scrollArea} className="web-detail-scroll payment-charge-scroll">
        <div className="web-payment-layout">
          <div className="web-payment-side">
            <div
              className="web-payment-balance"
              style={{
                background: COLORS.primary,
                margin: 16,
                borderRadius: 16,
                padding: 20,
                textAlign: "center",
              }}
            >
              <div style={{ color: "rgba(255,255,255,0.72)", fontSize: 14, marginBottom: 6 }}>
                현재 잔액
              </div>
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
                  <div
                    style={{
                      color: COLORS.accent,
                      fontSize: 34,
                      fontWeight: 800,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 12,
                    }}
                  >
                    <img
                      src={YeopjeonImg}
                      alt=""
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        objectFit: "cover",
                        boxShadow: "0 10px 26px rgba(255,180,30,0.28)",
                      }}
                    />
                    {balance.toLocaleString()}
                  </div>
                  <div className="payment-balance-unit">냥</div>
                </>
              )}
              {balanceStatus === "error" && (
                <div style={{ color: "rgba(255,255,255,0.72)", fontSize: 14, marginTop: 8 }}>
                  {balanceError}
                </div>
              )}
            </div>
            <div className="charge-flow-summary">
              <div className="charge-flow-title">충전 진행 순서</div>
              {flowSteps.map((step, index) => (
                <div
                  key={step.label}
                  className={`flow-step ${step.done ? "done" : ""} ${step.active ? "active" : ""}`}
                >
                  <span className="flow-num">{step.done ? "✓" : index + 1}</span>
                  <span>{step.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div
            className="web-payment-section web-payment-amount-section"
            style={{ padding: "0 16px 16px" }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.primary, marginBottom: 12 }}>
              충전 금액 선택
            </div>
            <div className="payment-rate-note">
              <span aria-hidden="true">ⓘ</span>
              <span>결제 금액은 원화 기준이며, 10원 결제 시 1냥으로 충전됩니다.</span>
            </div>
            <div
              className="web-payment-grid"
              style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 10 }}
            >
              {amounts.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  className={`payment-amount-card ${selected?.value === a.value && !isDirectInput ? "selected" : ""}`}
                  onClick={() => {
                    setIsDirectInput(false);
                    setCustomAmount("");
                    setSelected(a);
                  }}
                >
                  {a.best && <span className="payment-best-badge">BEST</span>}
                  <span className="amount-won">{a.price}</span>
                  <span className="amount-coin">{a.label}</span>
                </button>
              ))}
              <button
                type="button"
                className={`payment-amount-card direct-input ${isDirectInput ? "selected" : ""}`}
                onClick={() => {
                  setIsDirectInput(true);
                  const nextValue =
                    customAmountValue >= MIN_CHARGE_AMOUNT ? customAmountValue : MIN_CHARGE_AMOUNT;
                  setCustomAmount(String(nextValue));
                  setSelected({
                    value: nextValue,
                    coinAmount: toYeopjeon(nextValue),
                    label: `+${formatYeopjeon(toYeopjeon(nextValue))} 충전`,
                    price: formatWon(nextValue),
                    custom: true,
                  });
                }}
              >
                <span className="direct-input-icon">✎</span>
                <span className="amount-won">직접 입력</span>
                <span className="amount-coin">1,000원 단위</span>
              </button>
            </div>
            {isDirectInput && (
              <div className="payment-direct-input-box">
                <label htmlFor="charge-custom-amount">직접 입력 금액</label>
                <div className="payment-direct-input-row">
                  <input
                    id="charge-custom-amount"
                    type="number"
                    min={MIN_CHARGE_AMOUNT}
                    max={MAX_CHARGE_AMOUNT}
                    step="1000"
                    value={customAmount}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      setCustomAmount(event.target.value);
                      setSelected(
                        Number.isFinite(value) && value > 0
                          ? {
                              value,
                              coinAmount: toYeopjeon(value),
                              label: `+${formatYeopjeon(toYeopjeon(value))} 충전`,
                              price: formatWon(value),
                              custom: true,
                            }
                          : null,
                      );
                    }}
                    placeholder="예) 20000"
                  />
                  <span>원</span>
                </div>
                <p className={customAmountError ? "invalid" : ""}>
                  {customAmountError ||
                    `${formatYeopjeon(toYeopjeon(customAmountValue || 0))} 충전 예정`}
                </p>
              </div>
            )}
          </div>
          <div
            className="web-payment-section web-payment-method-section"
            style={{ padding: "0 16px 16px" }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.primary, marginBottom: 12 }}>
              결제 수단
            </div>
            {!selected && (
              <div className="payment-step-note">
                금액을 먼저 선택하면 결제 수단을 고를 수 있어요.
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.label}
                  type="button"
                  className={`payment-method-card ${method === m.label ? "active selected" : ""} ${!selected || customAmountError ? "locked" : ""}`}
                  aria-disabled={!selected || Boolean(customAmountError)}
                  onClick={() => handleSelectMethod(m.label)}
                >
                  <span className={`pay-logo ${m.logoTone}`}>
                    {m.logo ? (
                      <img
                        src={m.logo}
                        alt={m.logoAlt}
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    ) : null}
                    <span className="pay-logo-fallback">{m.fallback}</span>
                  </span>
                  <div>
                    <span className="pay-name">{m.label}</span>
                    <small>{m.desc}</small>
                  </div>
                  <div className="payment-radio-dot" aria-hidden="true">
                    {method === m.label && <div />}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div
            className="web-payment-section web-payment-submit payment-summary-card"
            style={{ padding: "0 16px 32px" }}
          >
            {selected && (
              <div
                style={{
                  background: COLORS.bg,
                  borderRadius: 12,
                  padding: "12px 16px",
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 14,
                    color: COLORS.textMuted,
                    marginBottom: 6,
                  }}
                >
                  <span>충전 예정</span>
                  <span style={{ fontWeight: 700, color: COLORS.primary }}>
                    {formatYeopjeon(selected.coinAmount)}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 14,
                    color: COLORS.textMuted,
                  }}
                >
                  <span>결제 금액</span>
                  <span style={{ fontWeight: 700, color: COLORS.primary }}>{selected.price}</span>
                </div>
                <div className="payment-safety-note">
                  <span>중복 결제 방지</span>
                  <strong>
                    {lastRequestKey ? `${lastRequestKey.slice(0, 8)}...` : "결제 요청 시 자동 생성"}
                  </strong>
                </div>
              </div>
            )}
            {error && (
              <div style={{ color: "#E24B4A", fontSize: 14, marginBottom: 10 }}>{error}</div>
            )}
            {settlementMessage && (
              <div
                style={{ color: COLORS.primary, fontSize: 14, marginBottom: 10, fontWeight: 700 }}
              >
                {settlementMessage}
              </div>
            )}
            <div
              style={{
                fontSize: 13,
                color: COLORS.textMuted,
                textAlign: "center",
                marginTop: 10,
                lineHeight: 1.5,
              }}
            >
              결제 완료 후 잔액 반영까지 잠시 걸릴 수 있습니다.
            </div>
          </div>
        </div>
      </div>
      <div className="payment-bottom-cta">
        <div className="payment-bottom-copy">
          <strong>
            {selected ? `${selected.price} 충전하기` : "충전할 금액을 먼저 선택해주세요"}
          </strong>
          <span>
            {selected
              ? `${formatYeopjeon(selected.coinAmount)}이 충전돼요${method ? ` · ${method}` : " · 결제 수단을 선택해주세요"}`
              : "금액과 결제 수단을 선택하면 결제를 진행할 수 있어요."}
          </span>
        </div>
        <button
          type="button"
          className={`payment-primary-action payment-bottom-button ${!canPay ? "disabled" : ""}`}
          disabled={!canPay}
          onClick={handleCharge}
        >
          {charging
            ? settlementMessage
              ? "충전 반영 확인 중..."
              : "결제창 여는 중..."
            : "결제하기"}
        </button>
      </div>
    </div>
  );
}

export function PayHistoryPage({ onBack, onShopClick, showToast }) {
  const [activeHistoryTab, setActiveHistoryTab] = useState("yeopjeon");
  const [history, setHistory] = useState([]);
  const [chargeRefundHistory, setChargeRefundHistory] = useState([]);
  const [balance, setBalance] = useState(0);
  const [balanceStatus, setBalanceStatus] = useState("loading");
  const [balanceError, setBalanceError] = useState("");
  const [status, setStatus] = useState("loading");
  const [chargeRefundStatus, setChargeRefundStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [chargeRefundErrorMessage, setChargeRefundErrorMessage] = useState("");
  const [cancelingOrderId, setCancelingOrderId] = useState(null);

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

  const loadChargeRefundHistory = () => {
    setChargeRefundStatus("loading");
    setChargeRefundErrorMessage("");
    fetchChargeRefundHistory()
      .then((data) => {
        setChargeRefundHistory(data);
        setChargeRefundStatus(data.length > 0 ? "success" : "empty");
      })
      .catch((error) => {
        setChargeRefundHistory([]);
        setChargeRefundErrorMessage(getApiErrorHint(error));
        setChargeRefundStatus("error");
      });
  };

  const loadBalance = () => {
    setBalanceStatus("loading");
    setBalanceError("");
    fetchYeopjeonBalance()
      .then((value) => {
        setBalance(value);
        setBalanceStatus("success");
      })
      .catch((error) => {
        setBalance(0);
        setBalanceError(getApiErrorHint(error));
        setBalanceStatus("error");
      });
  };

  useEffect(() => {
    let ignore = false;
    if (!ignore) {
      loadHistory();
      loadBalance();
    }
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (activeHistoryTab !== "chargeRefund" || chargeRefundStatus !== "idle") return;
    loadChargeRefundHistory();
  }, [activeHistoryTab, chargeRefundStatus]);

  const findPaidPlace = (historyItem) => {
    if (!isPaymentHistoryPayment(historyItem)) return null;
    return null;
  };

  const handleCancelChargeOrder = async (item) => {
    const orderId = item.orderUid ?? item.id;
    if (!orderId) {
      showToast?.("취소할 주문번호를 찾을 수 없습니다.");
      return;
    }
    if (!window.confirm("아직 완료되지 않은 충전 주문을 취소할까요?")) return;

    setCancelingOrderId(orderId);
    try {
      await cancelChargeOrder(orderId);
      showToast?.("충전 주문을 취소했습니다.");
      loadChargeRefundHistory();
      loadBalance();
    } catch (error) {
      showToast?.(getApiErrorHint(error));
    } finally {
      setCancelingOrderId(null);
    }
  };

  return (
    <div style={S.screen} className="web-payment-page">
      <div
        className="web-page-topbar payment-history-topbar"
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
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>이용 내역</span>
      </div>
      <div
        className="payment-history-balance-card"
        style={{ background: COLORS.primary, padding: "0 16px 20px", textAlign: "center" }}
      >
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>현재 잔액</div>
        {balanceStatus === "loading" ? (
          <div
            className="payment-history-balance-skeleton"
            aria-label="현재 잔액을 불러오는 중입니다."
          >
            <SkeletonBlock className="coin" />
            <SkeletonBlock className="amount" />
          </div>
        ) : (
          <div
            style={{
              color: COLORS.accent,
              fontSize: 28,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <img
              src={YeopjeonImg}
              alt=""
              style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover" }}
            />
            {balance.toLocaleString()}냥
          </div>
        )}
        {balanceStatus === "error" && (
          <div style={{ color: "rgba(255,255,255,0.72)", fontSize: 13, marginTop: 6 }}>
            {balanceError || "현재 잔액을 불러오지 못했습니다."}
          </div>
        )}
      </div>
      <div style={S.scrollArea} className="web-detail-scroll">
        <div className="payment-history-content">
          <div
            className="payment-history-tabs"
            style={{ display: "flex", gap: 8, padding: "16px 16px 0" }}
          >
            {[
              { key: "yeopjeon", label: "엽전 내역" },
              { key: "chargeRefund", label: "충전/환불 내역" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveHistoryTab(tab.key)}
                style={{
                  flex: 1,
                  border:
                    activeHistoryTab === tab.key
                      ? `1px solid ${COLORS.primary}`
                      : "1px solid rgba(0,0,0,0.08)",
                  background: activeHistoryTab === tab.key ? COLORS.primary : "#fff",
                  color: activeHistoryTab === tab.key ? "#fff" : COLORS.primary,
                  borderRadius: 12,
                  padding: "10px 12px",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="web-history-list payment-history-list" style={{ padding: 16 }}>
            {activeHistoryTab === "yeopjeon" && (
              <>
                {status === "loading" && <SkeletonList count={4} />}
                {status === "empty" && (
                  <EmptyState
                    icon="🧾"
                    title="엽전 내역이 없습니다."
                    description="충전, 현장결제, 환불처럼 엽전 잔액이 바뀌면 이곳에 표시됩니다."
                  />
                )}
                {status === "error" && (
                  <ErrorState
                    title="엽전 내역을 불러오지 못했습니다."
                    description={errorMessage || "백엔드 연결 상태를 확인한 뒤 다시 시도해주세요."}
                    onRetry={loadHistory}
                  />
                )}
                {history.map((h) => {
                  const paidPlace = findPaidPlace(h);
                  const reviewTarget =
                    isPaymentHistoryPayment(h) && h.shopId
                      ? {
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
                        }
                      : null;
                  return (
                    <div
                      key={h.id}
                      className="payment-history-row"
                      style={{
                        background: "#fff",
                        borderRadius: 14,
                        padding: "14px 16px",
                        marginBottom: 10,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        border: "0.5px solid rgba(0,0,0,0.06)",
                      }}
                    >
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 12,
                            background: h.type !== "결제" ? COLORS.greenBg : "#FEE8E8",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 18,
                          }}
                        >
                          {h.type === "충전" ? "🪙" : h.type === "적립" ? "🎁" : "🛍️"}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary }}>
                            {h.desc}
                          </div>
                          <div style={{ fontSize: 14, color: COLORS.textMuted, marginTop: 2 }}>
                            {h.date}
                          </div>
                          {isPaymentHistoryPayment(h) && (
                            <div className="payment-history-shop-block">
                              <span>
                                {h.placeName || paidPlace?.name || "연결된 장소"} ·{" "}
                                {h.shopName || "결제 상점"}
                              </span>
                              {h.paidAmount && <strong>지불 금액 {h.paidAmount}</strong>}
                              <button
                                type="button"
                                className="payment-history-place-link"
                                onClick={() =>
                                  reviewTarget
                                    ? onShopClick?.(reviewTarget)
                                    : showToast?.(
                                        "상점 상세 연결을 위해 결제 내역의 shopId가 필요합니다.",
                                      )
                                }
                              >
                                {h.reviewWritable === false
                                  ? "작성한 리뷰 보러가기"
                                  : "상점 상세에서 리뷰 남기기"}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: h.type !== "결제" ? COLORS.green : "#E24B4A",
                        }}
                      >
                        {h.amount}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
            {activeHistoryTab === "chargeRefund" && (
              <>
                {chargeRefundStatus === "loading" && <SkeletonList count={4} />}
                {chargeRefundStatus === "empty" && (
                  <EmptyState
                    icon="💳"
                    title="충전/환불 내역이 없습니다."
                    description="엽전 충전 결제와 환불 상태가 이곳에 표시됩니다."
                  />
                )}
                {chargeRefundStatus === "error" && (
                  <ErrorState
                    title="충전/환불 내역을 불러오지 못했습니다."
                    description={
                      chargeRefundErrorMessage || "백엔드 연결 상태를 확인한 뒤 다시 시도해주세요."
                    }
                    onRetry={loadChargeRefundHistory}
                  />
                )}
                {chargeRefundHistory.map((item) => (
                  <div
                    key={item.id}
                    className="payment-history-row"
                    style={{
                      background: "#fff",
                      borderRadius: 14,
                      padding: "14px 16px",
                      marginBottom: 10,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      border: "0.5px solid rgba(0,0,0,0.06)",
                    }}
                  >
                    <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          background: item.status === "COMPLETED" ? COLORS.greenBg : "#FFF3D0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 18,
                        }}
                      >
                        {item.status === "REFUNDED" || item.status === "CANCELLED" ? "↩" : "💳"}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: 14, color: COLORS.textMuted, marginTop: 2 }}>
                          {item.date}
                        </div>
                        <div className="payment-order-meta">
                          <span>{item.paymentMethodLabel}</span>
                          <span>주문번호 {item.orderUid || "확인 필요"}</span>
                        </div>
                        {item.status === "PENDING" && (
                          <button
                            type="button"
                            className="payment-history-place-link"
                            disabled={cancelingOrderId === item.orderUid}
                            onClick={() => handleCancelChargeOrder(item)}
                          >
                            {cancelingOrderId === item.orderUid ? "취소 중..." : "충전 주문 취소"}
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: item.status === "FAILED" ? "#E24B4A" : COLORS.primary,
                        }}
                      >
                        {item.amount}
                      </div>
                      <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4 }}>
                        {item.statusLabel}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
