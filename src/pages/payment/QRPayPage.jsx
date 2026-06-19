import { useEffect, useState } from "react";
import { COLORS, S } from "../../constants/colors";
import { SkeletonBlock } from "../../components/common";
import { getApiErrorHint } from "../../services/apiClient.js";
import {
  cancelQrPaymentRequest,
  fetchQrMerchant,
  fetchYeopjeonBalance,
  requestQrPayment,
} from "../../services/paymentService.js";

const QR_FLOW_STEPS = ["QR 스캔", "가게 확인", "결제 요청", "상인 승인"];

export default function QRPayPage({ onBack, showToast }) {
  const [step, setStep] = useState("scan"); // scan | input | waiting | done
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [merchant, setMerchant] = useState(null);
  const [selectedMenuId, setSelectedMenuId] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("IDLE");
  const [payRequestId, setPayRequestId] = useState(null);
  const [balance, setBalance] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [scanning, setScanning] = useState(false);

  const parsed = parseInt(amount.replace(/,/g, "")) || 0;
  const remaining = balance == null ? null : balance - parsed;
  const merchantMenus = Array.isArray(merchant?.menus) ? merchant.menus : [];

  useEffect(() => {
    let ignore = false;

    fetchYeopjeonBalance()
      .then((value) => {
        if (ignore) return;
        setBalance(value);
      })
      .catch((error) => {
        if (ignore) return;
        setBalance(null);
        showToast?.(getApiErrorHint(error));
      });

    return () => {
      ignore = true;
    };
  }, []);

  const handleAmountChange = (val) => {
    const num = val.replace(/[^0-9]/g, "");
    setAmount(num ? parseInt(num).toLocaleString() : "");
  };

  const addAmount = (add) => {
    const cur = parseInt(amount.replace(/,/g, "")) || 0;
    setAmount((cur + add).toLocaleString());
  };

  const handleScan = async () => {
    if (scanning) return;
    setScanning(true);
    try {
      const qrMerchant = await fetchQrMerchant();
      setMerchant(qrMerchant);
      setPaymentStatus("SHOP_FOUND");
      setStep("input");
    } catch (error) {
      showToast?.(getApiErrorHint(error));
    } finally {
      setScanning(false);
    }
  };

  const selectMenu = (menu) => {
    setSelectedMenuId(menu.id ?? menu.name);
    setAmount(menu.price.toLocaleString());
    setMemo(menu.name);
  };

  const handleRequest = async () => {
    if (requesting) return;
    if (parsed === 0) {
      showToast("금액을 입력해주세요!");
      return;
    }
    if (balance == null) {
      showToast("엽전 잔액을 확인한 뒤 다시 시도해 주세요.");
      return;
    }
    if (remaining != null && remaining < 0) {
      showToast("엽전 잔액이 부족해요!");
      return;
    }

    setRequesting(true);
    try {
      const result = await requestQrPayment({ merchantId: merchant?.id, amount: parsed, memo });
      setPayRequestId(result.payRequestId ?? null);
      setPaymentStatus("PENDING_CONFIRM");
      setStep("waiting");
    } catch (err) {
      showToast(err.message || "결제 요청 중 문제가 발생했습니다.");
    } finally {
      setRequesting(false);
    }
  };

  const resetQrFlow = () => {
    setPaymentStatus("CANCELLED");
    setPayRequestId(null);
    setStep("scan");
    setAmount("");
    setMemo("");
    setSelectedMenuId("");
  };

  const handleCancelRequest = async () => {
    if (canceling) return;
    if (!payRequestId) {
      resetQrFlow();
      showToast?.("결제 요청 ID가 없어 화면만 초기화했습니다.");
      return;
    }

    setCanceling(true);
    try {
      await cancelQrPaymentRequest(payRequestId);
      showToast?.("QR 결제 요청을 취소했습니다.");
      resetQrFlow();
    } catch (error) {
      showToast?.(getApiErrorHint(error));
    } finally {
      setCanceling(false);
    }
  };

  // ─── QR 스캔 화면 ─────────────────────────────────────────────────
  if (step === "scan")
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
            <div style={{ color: "#fff", fontSize: 16, fontWeight: 700 }}>QR 결제</div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>
              가게 QR코드를 스캔하세요
            </div>
          </div>
        </div>
        <div
          style={{
            ...S.scrollArea,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
          }}
        >
          <div className="qr-step-strip">
            {QR_FLOW_STEPS.map((label, index) => (
              <span key={label} className={index === 0 ? "active" : ""}>
                {label}
              </span>
            ))}
          </div>
          <div
            style={{
              width: 240,
              height: 240,
              border: `3px solid ${COLORS.accent}`,
              borderRadius: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
              position: "relative",
              background: "rgba(0,0,0,0.03)",
            }}
          >
            {/* 모서리 강조 */}
            {[
              { top: 0, left: 0 },
              { top: 0, right: 0 },
              { bottom: 0, left: 0 },
              { bottom: 0, right: 0 },
            ].map((pos, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  width: 24,
                  height: 24,
                  borderColor: COLORS.primary,
                  borderStyle: "solid",
                  borderWidth: 0,
                  ...Object.fromEntries(Object.entries(pos).map(([k]) => [k, -3])),
                  ...(pos.top !== undefined ? { borderTopWidth: 4 } : { borderBottomWidth: 4 }),
                  ...(pos.left !== undefined ? { borderLeftWidth: 4 } : { borderRightWidth: 4 }),
                  borderRadius: 4,
                }}
              />
            ))}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 52, marginBottom: 8 }}>📷</div>
              <div style={{ fontSize: 14, color: COLORS.textMuted }}>카메라 영역</div>
              <div style={{ fontSize: 14, color: COLORS.textMuted, marginTop: 4 }}>(연동 예정)</div>
            </div>
          </div>
          <div
            style={{
              fontSize: 14,
              color: COLORS.textMuted,
              textAlign: "center",
              marginBottom: 32,
              lineHeight: 1.6,
            }}
          >
            가게에 부착된 QR코드에
            <br />
            카메라를 갖다 대세요
          </div>
          <div
            className="qr-primary-action"
            onClick={handleScan}
            style={{
              background: COLORS.primary,
              color: "#fff",
              borderRadius: 14,
              padding: "14px 40px",
              fontWeight: 700,
              fontSize: 15,
              cursor: scanning ? "wait" : "pointer",
              marginBottom: 12,
              opacity: scanning ? 0.72 : 1,
            }}
          >
            {scanning ? "가게 정보를 확인하는 중..." : "📷 QR 정보 확인"}
          </div>
          {scanning && (
            <div className="qr-scan-skeleton" aria-label="QR 가게 정보를 불러오는 중입니다.">
              <SkeletonBlock className="qr-shop-icon" />
              <div>
                <SkeletonBlock className="qr-shop-line wide" />
                <SkeletonBlock className="qr-shop-line" />
              </div>
            </div>
          )}
          <div style={{ fontSize: 14, color: COLORS.textMuted }}>
            실제 서비스에서는 카메라가 자동으로 인식합니다
          </div>
        </div>
      </div>
    );

  // ─── 금액 입력 화면 ────────────────────────────────────────────────
  if (step === "input")
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
          <span
            onClick={() => setStep("scan")}
            style={{ color: "#fff", fontSize: 20, cursor: "pointer" }}
          >
            ←
          </span>
          <div>
            <div style={{ color: "#fff", fontSize: 16, fontWeight: 700 }}>
              {merchant?.name || "가게 정보"}
            </div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>
              {merchant?.market || "시장"} · QR 결제
            </div>
          </div>
        </div>
        <div style={S.scrollArea}>
          <div className="qr-step-strip">
            {QR_FLOW_STEPS.map((label, index) => (
              <span key={label} className={index <= 1 ? "active" : ""}>
                {label}
              </span>
            ))}
          </div>
          {/* 가게 정보 카드 */}
          <div
            style={{
              background: "#fff",
              margin: 16,
              borderRadius: 16,
              padding: 16,
              display: "flex",
              gap: 14,
              alignItems: "center",
              border: "0.5px solid rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: COLORS.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
              }}
            >
              {merchant?.emoji || "🏪"}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.primary }}>
                  {merchant?.name || "가게 정보"}
                </span>
                {merchant?.verified && (
                  <span
                    style={{
                      fontSize: 14,
                      background: COLORS.greenBg,
                      color: COLORS.green,
                      borderRadius: 4,
                      padding: "1px 6px",
                      fontWeight: 700,
                    }}
                  >
                    ✅ 인증
                  </span>
                )}
              </div>
              <div style={{ fontSize: 14, color: COLORS.textMuted }}>
                {merchant?.market || "시장"} ·{" "}
                <span className="star-score">★ {merchant?.rating ?? "-"}</span>
              </div>
            </div>
          </div>

          {/* 메뉴 선택 */}
          <div style={{ background: "#fff", margin: "0 16px 12px", borderRadius: 16, padding: 20 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary }}>
                  가게 메뉴 선택
                </div>
                <div style={{ fontSize: 14, color: COLORS.textMuted, marginTop: 3 }}>
                  등록된 메뉴가 있으면 선택할 수 있습니다.
                </div>
              </div>
            </div>
            <div className="qr-menu-grid">
              {merchantMenus.length === 0 && (
                <div style={{ gridColumn: "1 / -1", color: COLORS.textMuted, fontSize: 14 }}>
                  등록된 메뉴가 없습니다. 결제 금액을 직접 입력해 주세요.
                </div>
              )}
              {merchantMenus.map((menu) => (
                <button
                  key={menu.id ?? menu.name}
                  type="button"
                  className={`qr-menu-card ${selectedMenuId === (menu.id ?? menu.name) ? "active" : ""}`}
                  onClick={() => selectMenu(menu)}
                >
                  <strong>{menu.name}</strong>
                  <span>{menu.desc}</span>
                  <em>{menu.price.toLocaleString()} 엽전</em>
                </button>
              ))}
            </div>
          </div>

          {/* 금액 입력 */}
          <div style={{ background: "#fff", margin: "0 16px 12px", borderRadius: 16, padding: 20 }}>
            <div
              style={{ fontSize: 14, fontWeight: 700, color: COLORS.textMuted, marginBottom: 14 }}
            >
              결제 금액 입력
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 22, color: COLORS.accent }}>🪙</span>
              <input
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0"
                inputMode="numeric"
                style={{
                  flex: 1,
                  fontSize: 28,
                  fontWeight: 700,
                  color: COLORS.primary,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  textAlign: "right",
                }}
              />
              <span style={{ fontSize: 16, color: COLORS.textMuted, fontWeight: 600 }}>엽전</span>
            </div>
            <div style={{ height: "1px", background: "rgba(0,0,0,0.08)", marginBottom: 14 }} />
            {/* 빠른 금액 추가 버튼 */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[1000, 3000, 5000, 10000].map((n) => (
                <div
                  key={n}
                  className="qr-amount-chip"
                  onClick={() => addAmount(n)}
                  style={{
                    background: COLORS.bg,
                    border: "0.5px solid rgba(0,0,0,0.1)",
                    borderRadius: 20,
                    padding: "6px 14px",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    color: COLORS.primary,
                  }}
                >
                  +{n.toLocaleString()}
                </div>
              ))}
              <div
                className="qr-amount-chip danger"
                onClick={() => setAmount("")}
                style={{
                  background: "#FEE8E8",
                  border: "0.5px solid rgba(0,0,0,0.06)",
                  borderRadius: 20,
                  padding: "6px 14px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  color: "#A32D2D",
                }}
              >
                입력 금액 초기화
              </div>
            </div>
          </div>

          {/* 메모 입력 */}
          <div style={{ background: "#fff", margin: "0 16px 12px", borderRadius: 16, padding: 20 }}>
            <div
              style={{ fontSize: 14, fontWeight: 700, color: COLORS.textMuted, marginBottom: 10 }}
            >
              메모 (선택)
            </div>
            <input
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="예) 빈대떡 1개, 막걸리 1잔"
              style={{
                width: "100%",
                background: COLORS.bg,
                border: "none",
                borderRadius: 10,
                padding: "12px 14px",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
                color: COLORS.primary,
              }}
            />
          </div>

          {/* 결제 요약 */}
          <div
            style={{
              background: COLORS.primary,
              margin: "0 16px 16px",
              borderRadius: 16,
              padding: 20,
            }}
          >
            {[
              ["결제 금액", `🪙 ${parsed.toLocaleString()} 엽전`, COLORS.accent],
              [
                "내 잔액",
                balance == null ? "확인 필요" : `${balance.toLocaleString()} 엽전`,
                "#fff",
              ],
              [
                "결제 후 잔액",
                remaining == null ? "확인 필요" : `${remaining.toLocaleString()} 엽전`,
                remaining != null && remaining < 0 ? "#FF6B6B" : "rgba(255,255,255,0.7)",
              ],
            ].map(([label, value, color]) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 14,
                  color: "rgba(255,255,255,0.6)",
                  marginBottom: 10,
                }}
              >
                <span>{label}</span>
                <span style={{ color, fontWeight: 700 }}>{value}</span>
              </div>
            ))}
            <div
              style={{
                height: "0.5px",
                background: "rgba(255,255,255,0.15)",
                margin: "4px 0 16px",
              }}
            />
            <div
              className="qr-payment-safety-note"
              style={{
                background: "rgba(255,255,255,0.08)",
                borderRadius: 10,
                padding: "10px 14px",
                fontSize: 14,
                color: "rgba(255,255,255,0.5)",
                marginBottom: 14,
                lineHeight: 1.6,
              }}
            >
              💡 결제 요청 후 상인이 승인하면 자동으로 완료됩니다. 승인 대기 중에는 금액이 임시
              보류됩니다.
            </div>
            <div
              className="qr-primary-action"
              onClick={handleRequest}
              style={{
                background:
                  parsed > 0 && remaining != null && remaining >= 0
                    ? COLORS.accent
                    : "rgba(255,255,255,0.15)",
                color:
                  parsed > 0 && remaining != null && remaining >= 0
                    ? COLORS.primary
                    : "rgba(255,255,255,0.3)",
                borderRadius: 12,
                padding: "15px 0",
                textAlign: "center",
                fontWeight: 700,
                fontSize: 15,
                cursor: parsed > 0 && !requesting ? "pointer" : "default",
                opacity: requesting ? 0.7 : 1,
              }}
            >
              {requesting
                ? "상인 확인 요청 중..."
                : `${parsed.toLocaleString()} 엽전 상인 확인 요청`}
            </div>
          </div>
        </div>
      </div>
    );

  // ─── 승인 대기 화면 ────────────────────────────────────────────────
  if (step === "waiting")
    return (
      <div
        style={{
          ...S.screen,
          background: COLORS.primary,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 64, marginBottom: 20, animation: "spin 2s linear infinite" }}>
            ⏳
          </div>
          <div style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            승인 대기 중...
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: 14,
              lineHeight: 1.7,
              marginBottom: 32,
            }}
          >
            상인에게 결제 요청을 보냈어요
            <br />
            상인이 승인하면 자동으로 완료됩니다
          </div>
          <div
            style={{
              background: "rgba(255,180,30,0.12)",
              border: "1px solid rgba(255,180,30,0.25)",
              borderRadius: 16,
              padding: "16px 24px",
              marginBottom: 32,
            }}
          >
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, marginBottom: 4 }}>
              요청 금액
            </div>
            <div style={{ color: COLORS.accent, fontSize: 24, fontWeight: 700 }}>
              🪙 {parsed.toLocaleString()} 엽전
            </div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginTop: 4 }}>
              {merchant?.name}
            </div>
          </div>
          <div className="qr-status-panel">
            <span>상태</span>
            <strong>{paymentStatus}</strong>
            <small>승인 제한 시간 5분 · 만료/거절 시 보류 금액 해제</small>
          </div>
          <div
            className="qr-cancel-action"
            onClick={handleCancelRequest}
            style={{
              color: "rgba(255,255,255,0.4)",
              fontSize: 14,
              cursor: canceling ? "default" : "pointer",
            }}
          >
            {canceling ? "결제 요청 취소 중..." : "결제 요청 취소하고 처음으로 돌아가기"}
          </div>
        </div>
      </div>
    );

  // ─── 결제 완료 화면 ────────────────────────────────────────────────
  return (
    <div
      style={{
        ...S.screen,
        background: COLORS.primary,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ textAlign: "center", padding: 40 }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>✅</div>
        <div style={{ color: "#fff", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
          결제 완료!
        </div>
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, marginBottom: 24 }}>
          상인이 결제를 승인했습니다
        </div>
        <div
          style={{
            background: "rgba(255,255,255,0.06)",
            borderRadius: 16,
            padding: 20,
            marginBottom: 32,
            textAlign: "left",
          }}
        >
          {[
            ["가게", merchant?.name || "가게 정보"],
            ["결제 금액", `🪙 ${parsed.toLocaleString()} 엽전`],
            [
              "결제 후 잔액",
              remaining == null ? "확인 필요" : `${remaining.toLocaleString()} 엽전`,
            ],
            ...(memo ? [["메모", memo]] : []),
          ].map(([k, v]) => (
            <div
              key={k}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 14,
                marginBottom: 8,
              }}
            >
              <span style={{ color: "rgba(255,255,255,0.5)" }}>{k}</span>
              <span style={{ color: "#fff", fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>
        <div
          className="qr-primary-action"
          onClick={onBack}
          style={{
            background: COLORS.accent,
            color: COLORS.primary,
            borderRadius: 14,
            padding: "14px 48px",
            fontWeight: 700,
            fontSize: 15,
            cursor: "pointer",
            display: "inline-block",
          }}
        >
          결제 완료 확인
        </div>
      </div>
    </div>
  );
}
