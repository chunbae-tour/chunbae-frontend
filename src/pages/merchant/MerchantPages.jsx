import { useEffect, useState } from "react";
import { COLORS, S } from "../../constants/colors";
import { EmptyState, SkeletonList } from "../../components/common";
import {
  addMerchantMenu,
  approveMerchantPaymentRequest,
  deleteMerchantMenu,
  fetchMerchantPaymentRequests,
  fetchMerchantSettlements,
  fetchMerchantShop,
  fetchMerchantWallet,
  MOCK_MENUS as SERVICE_MOCK_MENUS,
  MOCK_MERCHANT_SHOP,
  MOCK_MERCHANT_WALLET,
  MOCK_PAYMENT_REQUESTS,
  MOCK_SETTLEMENTS as SERVICE_MOCK_SETTLEMENTS,
  rejectMerchantPaymentRequest,
  requestMerchantSettlement,
  updateMerchantMenu,
} from "../../services/merchantService.js";

const MOCK_MENUS_INIT = [
  { id: 1, name: "빈대떡", nameEn: "Bindaetteok", price: 5000, available: true, desc: "국내산 녹두로 만든 전통 빈대떡" },
  { id: 2, name: "막걸리", nameEn: "Makgeolli", price: 3000, available: true, desc: "직접 담근 전통 막걸리" },
  { id: 3, name: "마약김밥", nameEn: "Mayak Gimbap", price: 3000, available: false, desc: "참기름 가득한 한입 김밥" },
  { id: 4, name: "순대", nameEn: "Sundae", price: 4000, available: true, desc: "당면과 선지로 만든 순대" },
];

const MOCK_SETTLEMENTS = [
  { id: 1, date: "2025.05.15", amount: 45000, status: "정산완료" },
  { id: 2, date: "2025.05.14", amount: 32000, status: "정산완료" },
  { id: 3, date: "2025.05.13", amount: 58000, status: "정산완료" },
];

// ─── 상인 가게 관리 ───────────────────────────────────────────────────
export function MerchantShopPage({ onBack, showToast, onMenuManage, onSettlement }) {
  const [shop, setShop] = useState(MOCK_MERCHANT_SHOP);
  const [wallet, setWallet] = useState(MOCK_MERCHANT_WALLET);
  const [paymentRequests, setPaymentRequests] = useState([]);
  const [status, setStatus] = useState("loading");
  const [requestStatus, setRequestStatus] = useState("loading");

  useEffect(() => {
    let ignore = false;

    Promise.allSettled([fetchMerchantShop(), fetchMerchantWallet(), fetchMerchantPaymentRequests()])
      .then(([shopResult, walletResult, requestResult]) => {
        if (ignore) return;
        setShop(shopResult.status === "fulfilled" ? shopResult.value : MOCK_MERCHANT_SHOP);
        setWallet(walletResult.status === "fulfilled" ? walletResult.value : MOCK_MERCHANT_WALLET);
        setPaymentRequests(requestResult.status === "fulfilled" && requestResult.value.length > 0 ? requestResult.value : MOCK_PAYMENT_REQUESTS);
        setStatus(shopResult.status === "fulfilled" || walletResult.status === "fulfilled" ? "success" : "mock");
        setRequestStatus(requestResult.status === "fulfilled" ? (requestResult.value.length > 0 ? "success" : "empty") : "mock");
      });

    return () => { ignore = true; };
  }, []);

  const handleSettlementRequest = async () => {
    try {
      await requestMerchantSettlement(wallet.pendingSettlement || wallet.balance);
      showToast("정산 신청이 완료되었습니다!");
    } catch {
      showToast("정산 신청 API 연결 전이라 mock으로 처리했습니다.");
    }
  };

  const handlePaymentRequest = async (requestId, action) => {
    const nextStatus = action === "approve" ? "APPROVED" : "REJECTED";
    const apiCall = action === "approve" ? approveMerchantPaymentRequest : rejectMerchantPaymentRequest;
    await apiCall(requestId).catch(() => {});
    setPaymentRequests(prev => prev.map(item => item.id === requestId ? { ...item, status: nextStatus } : item));
    showToast(action === "approve" ? "결제 요청을 승인했습니다." : "결제 요청을 거절했습니다.");
  };

  return (
    <div style={S.screen}>
      <div style={{ background: COLORS.primary, padding: "44px 20px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <span onClick={onBack} style={{ color: "#fff", fontSize: 20, cursor: "pointer" }}>←</span>
        <div style={{ color: "#fff", fontSize: 20, fontWeight: 700 }}>🏪 가게 관리</div>
      </div>
      <div style={S.scrollArea}>
        <div style={{ height: 160, background: COLORS.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 64, borderBottom: "0.5px solid rgba(0,0,0,0.06)" }}>🍳</div>
        <div style={{ background: "#fff", padding: 20, marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.primary, marginBottom: 4 }}>
                {shop.name}
                {shop.verified && <span style={{ fontSize: 14, background: COLORS.greenBg, color: COLORS.green, borderRadius: 6, padding: "2px 8px", marginLeft: 8 }}>✅ 인증</span>}
              </div>
              <div style={{ color: COLORS.accent, fontSize: 14 }}>★ {shop.rating} · 리뷰 {shop.reviewCount}개</div>
            </div>
            <div onClick={() => showToast("기본 정보 수정")} style={{ fontSize: 14, color: COLORS.primary, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 20, padding: "6px 14px", cursor: "pointer" }}>수정</div>
          </div>
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            {status === "mock" && <div style={{ color: "#B87800", fontSize: 14, marginBottom: 2 }}>상인 API 연결 전 mock 정보입니다.</div>}
            {[["📍 주소", shop.address], ["🕐 영업시간", shop.operatingHours], ["📅 휴무", shop.holiday]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", gap: 8, fontSize: 14 }}>
                <span style={{ color: COLORS.textMuted, minWidth: 74 }}>{k}</span>
                <span style={{ color: COLORS.primary }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="merchant-payment-panel">
          <div className="merchant-section-head">
            <div>
              <span>QR 결제 승인</span>
              <small>상인이 승인하면 사용자 결제가 완료됩니다.</small>
            </div>
            <strong>{paymentRequests.filter(item => item.status === "PENDING_CONFIRM").length}건 대기</strong>
          </div>
          {requestStatus === "mock" && <div className="merchant-api-note">QR 승인 API 미확정으로 현재는 mock 요청입니다.</div>}
          {paymentRequests.length === 0 ? (
            <EmptyState
              icon="QR"
              title="대기 중인 결제 요청이 없습니다."
              description="사용자가 현장에서 QR을 스캔하고 금액을 입력하면 승인 요청이 이곳에 표시됩니다."
            />
          ) : paymentRequests.map(request => (
            <div key={request.id} className={`merchant-payment-request ${request.status !== "PENDING_CONFIRM" ? "done" : ""}`}>
              <div>
                <strong>{request.menuName || "QR 결제 요청"}</strong>
                <span>{request.customerName} · {request.requestedAt}</span>
                {request.memo && <small>{request.memo}</small>}
              </div>
              <em>🪙 {request.amount.toLocaleString()}</em>
              {request.status === "PENDING_CONFIRM" ? (
                <div className="merchant-payment-actions">
                  <button type="button" onClick={() => handlePaymentRequest(request.id, "reject")}>거절</button>
                  <button type="button" onClick={() => handlePaymentRequest(request.id, "approve")}>승인</button>
                </div>
              ) : (
                <span className="merchant-payment-status">{request.status === "APPROVED" ? "승인 완료" : "거절됨"}</span>
              )}
            </div>
          ))}
        </div>

        {/* 메뉴 관리 바로가기 */}
        <div onClick={onMenuManage} style={{ background: "#fff", margin: "0 0 8px", padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#FFF3D0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🍽️</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.primary }}>메뉴 관리</div>
              <div style={{ fontSize: 14, color: COLORS.textMuted, marginTop: 2 }}>{(shop.menus || SERVICE_MOCK_MENUS).length}개 메뉴 등록됨</div>
            </div>
          </div>
          <span style={{ color: COLORS.textMuted, fontSize: 18 }}>›</span>
        </div>

        {/* 정산 내역 바로가기 */}
        <div onClick={onSettlement} style={{ background: "#fff", margin: "0 0 8px", padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: COLORS.greenBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>💰</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.primary }}>정산 내역</div>
              <div style={{ fontSize: 14, color: COLORS.textMuted, marginTop: 2 }}>정산 대기 {wallet.pendingSettlement.toLocaleString()} 엽전</div>
            </div>
          </div>
          <span style={{ color: COLORS.textMuted, fontSize: 18 }}>›</span>
        </div>

        {/* 엽전 현황 */}
        <div style={{ background: COLORS.primary, margin: "8px 16px 16px", borderRadius: 16, padding: 20 }}>
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, marginBottom: 6 }}>💰 엽전 잔액</div>
          <div style={{ color: COLORS.accent, fontSize: 28, fontWeight: 700, marginBottom: 14 }}>🪙 {wallet.balance.toLocaleString()} 엽전</div>
          <div onClick={handleSettlementRequest} style={{ background: COLORS.accent, color: COLORS.primary, borderRadius: 10, padding: "12px 0", textAlign: "center", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>정산 신청하기</div>
        </div>
      </div>
    </div>
  );
}

// ─── 메뉴 관리 (별도 화면) ────────────────────────────────────────────
export function MerchantMenuPage({ onBack, showToast }) {
  const [menus, setMenus] = useState(SERVICE_MOCK_MENUS);
  const [status, setStatus] = useState("loading");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", nameEn: "", price: "", desc: "" });

  useEffect(() => {
    let ignore = false;

    fetchMerchantShop()
      .then((shop) => {
        if (ignore) return;
        setMenus(shop.menus?.length ? shop.menus : SERVICE_MOCK_MENUS);
        setStatus(shop.menus?.length ? "success" : "mock");
      })
      .catch(() => {
        if (ignore) return;
        setMenus(SERVICE_MOCK_MENUS);
        setStatus("mock");
      });

    return () => { ignore = true; };
  }, []);

  const toggleMenu = async (id) => {
    const menu = menus.find((item) => item.id === id);
    setMenus(prev => prev.map(m => m.id === id ? { ...m, available: !m.available } : m));
    if (!menu) return;
    await updateMerchantMenu(id, { available: !menu.available }).catch(() => {});
  };

  const handleAdd = () => {
    if (!form.name || !form.price) { showToast("메뉴명과 가격을 입력해주세요."); return; }
    const draft = { id: Date.now(), name: form.name, nameEn: form.nameEn, price: Number(form.price), desc: form.desc, available: true };
    addMerchantMenu(draft)
      .then((created) => setMenus(prev => [...prev, created]))
      .catch(() => setMenus(prev => [...prev, draft]));
    setForm({ name: "", nameEn: "", price: "", desc: "" });
    setShowAddForm(false);
    showToast(status === "success" ? "메뉴가 추가되었습니다!" : "메뉴가 mock으로 추가되었습니다.");
  };

  const handleDelete = async (id) => {
    await deleteMerchantMenu(id).catch(() => {});
    setMenus(prev => prev.filter(m => m.id !== id));
    showToast("메뉴가 삭제되었습니다.");
  };

  return (
    <div style={S.screen}>
      <div style={{ background: COLORS.primary, padding: "44px 20px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span onClick={onBack} style={{ color: "#fff", fontSize: 20, cursor: "pointer" }}>←</span>
          <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>🍽️ 메뉴 관리</span>
        </div>
        <div onClick={() => { setShowAddForm(true); setEditingId(null); setForm({ name: "", nameEn: "", price: "", desc: "" }); }}
          style={{ background: COLORS.accent, color: COLORS.primary, fontSize: 14, fontWeight: 700, borderRadius: 20, padding: "6px 16px", cursor: "pointer" }}>
          + 메뉴 추가
        </div>
      </div>

      <div style={S.scrollArea}>
        {/* 메뉴 추가 폼 */}
        {showAddForm && (
          <div style={{ background: "#fff", margin: 16, borderRadius: 16, padding: 20, border: `2px solid ${COLORS.accent}` }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary, marginBottom: 14 }}>새 메뉴 추가</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { key: "name", label: "메뉴명 *", placeholder: "예) 빈대떡" },
                { key: "nameEn", label: "영문명", placeholder: "예) Bindaetteok" },
                { key: "price", label: "가격 (엽전) *", placeholder: "예) 5000", type: "number" },
                { key: "desc", label: "설명", placeholder: "메뉴 설명을 입력하세요" },
              ].map(f => (
                <div key={f.key}>
                  <div style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 4 }}>{f.label}</div>
                  <input
                    value={form[f.key]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    type={f.type || "text"}
                    placeholder={f.placeholder}
                    style={{ width: "100%", background: COLORS.bg, border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <div onClick={() => setShowAddForm(false)} style={{ flex: 1, background: COLORS.bg, borderRadius: 10, padding: "10px 0", textAlign: "center", fontWeight: 700, fontSize: 14, cursor: "pointer", color: COLORS.textMuted }}>취소</div>
                <div onClick={handleAdd} style={{ flex: 2, background: COLORS.accent, color: COLORS.primary, borderRadius: 10, padding: "10px 0", textAlign: "center", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>추가하기</div>
              </div>
            </div>
          </div>
        )}

        {/* 메뉴 목록 */}
        <div style={{ padding: "8px 16px 16px" }}>
          <div style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 10 }}>총 {menus.length}개 메뉴</div>
          {status === "loading" && <SkeletonList count={3} />}
          {status === "mock" && <div style={{ background: "#FFF3D0", borderRadius: 12, padding: "10px 14px", color: "#B87800", fontSize: 14, marginBottom: 10 }}>메뉴 API 연결 전 mock 메뉴입니다.</div>}
          {status !== "loading" && menus.length === 0 && (
            <EmptyState
              icon="메뉴"
              title="등록된 메뉴가 없습니다."
              description="대표 메뉴를 추가하면 사용자 QR 결제 화면에서 선택할 수 있습니다."
              actionLabel="메뉴 추가"
              onAction={() => setShowAddForm(true)}
            />
          )}
          {menus.map(m => (
            <div key={m.id} style={{ background: "#fff", borderRadius: 16, padding: 16, marginBottom: 10, border: "0.5px solid rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.primary }}>{m.name}</span>
                    {m.nameEn && <span style={{ fontSize: 14, color: COLORS.textMuted }}>{m.nameEn}</span>}
                  </div>
                  {m.desc && <div style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 6 }}>{m.desc}</div>}
                  <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.accent }}>🪙 {m.price.toLocaleString()} 엽전</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                  <div onClick={() => toggleMenu(m.id)} style={{ width: 48, height: 26, borderRadius: 13, background: m.available ? COLORS.green : "#ccc", position: "relative", cursor: "pointer" }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: m.available ? 25 : 3, transition: "left 0.2s" }} />
                  </div>
                  <span style={{ fontSize: 14, color: m.available ? COLORS.green : COLORS.textMuted, fontWeight: 600 }}>{m.available ? "판매중" : "판매중지"}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, borderTop: "0.5px solid rgba(0,0,0,0.06)", paddingTop: 10 }}>
                <div onClick={() => showToast("메뉴 수정 (준비 중)")} style={{ flex: 1, background: COLORS.bg, borderRadius: 8, padding: "7px 0", textAlign: "center", fontSize: 14, fontWeight: 600, cursor: "pointer", color: COLORS.primary }}>✏️ 수정</div>
                <div onClick={() => handleDelete(m.id)} style={{ flex: 1, background: "#FEE8E8", borderRadius: 8, padding: "7px 0", textAlign: "center", fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#A32D2D" }}>🗑️ 삭제</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 정산 내역 ────────────────────────────────────────────────────────
export function MerchantSettlementPage({ onBack }) {
  const [settlements, setSettlements] = useState(SERVICE_MOCK_SETTLEMENTS);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let ignore = false;

    fetchMerchantSettlements()
      .then((data) => {
        if (ignore) return;
        setSettlements(data);
        setStatus(data.length > 0 ? "success" : "empty");
      })
      .catch(() => {
        if (ignore) return;
        setSettlements(SERVICE_MOCK_SETTLEMENTS);
        setStatus("mock");
      });

    return () => { ignore = true; };
  }, []);

  const totalAmount = settlements.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div style={S.screen}>
      <div style={{ background: COLORS.primary, padding: "44px 16px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <span onClick={onBack} style={{ color: "#fff", fontSize: 20, cursor: "pointer" }}>←</span>
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>정산 내역</span>
      </div>
      <div style={{ background: COLORS.primary, padding: "0 16px 20px", textAlign: "center" }}>
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>총 정산액</div>
        <div style={{ color: COLORS.accent, fontSize: 28, fontWeight: 700 }}>🪙 {totalAmount.toLocaleString()} 엽전</div>
      </div>
      <div style={S.scrollArea}>
        <div style={{ padding: 16 }}>
          {status === "loading" && <SkeletonList count={3} />}
          {status === "mock" && <div style={{ background: "#FFF3D0", borderRadius: 12, padding: "10px 14px", color: "#B87800", fontSize: 14, marginBottom: 10 }}>정산 API 연결 전 mock 내역입니다.</div>}
          {status === "empty" && (
            <EmptyState
              icon="정산"
              title="정산 내역이 없습니다."
              description="QR 결제 매출이 쌓이면 정산 요청과 처리 내역이 이곳에 표시됩니다."
            />
          )}
          {settlements.map(s => (
            <div key={s.id} style={{ background: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center", border: "0.5px solid rgba(0,0,0,0.06)" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary, marginBottom: 4 }}>{s.date} 정산</div>
                <span style={{ background: COLORS.greenBg, color: COLORS.green, fontSize: 14, fontWeight: 700, borderRadius: 6, padding: "2px 8px" }}>{s.status}</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.green }}>+{s.amount.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
