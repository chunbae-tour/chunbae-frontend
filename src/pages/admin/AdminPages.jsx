import { useEffect, useState } from "react";
import { EmptyState, ErrorState, SkeletonList } from "../../components/common";
import { COLORS, S } from "../../constants/colors";
import {
  approveAd,
  approveCertification,
  approveRefund,
  approveSettlement,
  approveMerchantApplication,
  assignAdminSupportRoom,
  cancelCertification,
  closeAdminSupportRoom,
  createAdminBanner,
  createAdminFaq,
  createAdminFestival,
  createAdminPlace,
  createAdminProduct,
  deleteAdminBanner,
  deleteAdminFaq,
  deleteAdminFestival,
  deleteAdminPlace,
  deleteAdminProduct,
  fetchAdminAds,
  fetchAdminBanners,
  fetchAdminCertifications,
  fetchAdminContents,
  fetchAdminDashboard,
  fetchAdminFaqs,
  fetchAdminFestivals,
  fetchAdminProducts,
  fetchAdminReports,
  fetchAdminRefunds,
  fetchAdminSettlements,
  fetchAdminShopDetail,
  fetchAdminSupportMessages,
  fetchAdminSupportRooms,
  fetchAdminUsers,
  fetchFestivalsNow,
  fetchMerchantApplications,
  rejectAd,
  rejectCertification,
  rejectRefund,
  rejectSettlement,
  rejectMerchantApplication,
  resolveAdminReport,
  suspendAdminUser,
  syncTouristPlaces,
  syncTraditionalMarkets,
  unsuspendAdminUser,
  updateAdminBanner,
  updateAdminFaq,
  updateAdminFestival,
  updateAdminPlace,
  updateAdminProduct,
  updateAdminShop,
  updateAdminShopPlace,
  updateAdminShopStatus,
} from "../../services/adminService.js";

function getApiErrorHint(error) {
  return error?.message || "백엔드 연결 상태를 확인한 뒤 다시 시도해주세요.";
}

function AdminHeader({ title, onBack, right }) {
  return (
    <div style={{ background: COLORS.primary, padding: "44px 16px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span onClick={onBack} style={{ color: "#fff", fontSize: 20, cursor: "pointer" }}>←</span>
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>{title}</span>
      </div>
      {right}
    </div>
  );
}

function AdminShell({ title, onBack, children }) {
  return (
    <div style={S.screen}>
      <AdminHeader title={title} onBack={onBack} />
      <div style={S.scrollArea}>{children}</div>
    </div>
  );
}

function AdminButton({ children, onClick, tone = "primary", disabled = false, style }) {
  const colorMap = {
    primary: { background: COLORS.primary, color: "#fff", border: "none" },
    subtle: { background: COLORS.bg, color: COLORS.primary, border: "none" },
    danger: { background: "#FEE8E8", color: "#A32D2D", border: "none" },
    ghost: { background: "#fff", color: COLORS.primary, border: "1px solid rgba(47,133,95,0.2)" },
    accent: { background: COLORS.accent, color: COLORS.primary, border: "none" },
  };
  const picked = colorMap[tone] ?? colorMap.primary;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        ...picked,
        borderRadius: 10,
        padding: "8px 12px",
        fontSize: 14,
        fontWeight: 700,
        fontFamily: "inherit",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function AdminCard({ children, style }) {
  return (
    <div style={{ background: "#fff", margin: "10px 16px 0", borderRadius: 14, padding: 16, border: "0.5px solid rgba(0,0,0,0.06)", ...style }}>
      {children}
    </div>
  );
}

function AdminStatusBadge({ status }) {
  const normalized = String(status || "대기");
  const isSuccess = ["APPROVED", "RESOLVED", "COMPLETED", "ACTIVE", "공개", "승인", "처리완료"].includes(normalized);
  const isDanger = ["REJECTED", "DELETED", "HIDDEN", "SUSPENDED", "CANCELLED", "거절", "비공개", "정지"].includes(normalized);
  const bg = isSuccess ? COLORS.greenBg : isDanger ? "#FEE8E8" : "#FFF3D0";
  const color = isSuccess ? COLORS.green : isDanger ? "#A32D2D" : "#B87800";
  return <span style={{ fontSize: 13, background: bg, color, borderRadius: 6, padding: "2px 8px", fontWeight: 700 }}>{normalized}</span>;
}

function formatDate(value) {
  if (!value) return "-";
  return String(value).replace("T", " ").slice(0, 16);
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function promptReason(message, fallback) {
  const value = window.prompt(message, fallback);
  if (value === null) return null;
  return value.trim() || fallback;
}

function getItemId(item, keys) {
  for (const key of keys) {
    if (item?.[key] != null) return item[key];
  }
  return null;
}

function AdminLoadState({ status, errorMessage, emptyTitle, emptyDescription, onRetry }) {
  if (status === "loading") return <div style={{ margin: 16 }}><SkeletonList count={4} /></div>;
  if (status === "error") {
    return (
      <div style={{ margin: 16 }}>
        <ErrorState title="목록을 불러오지 못했습니다." description={errorMessage} onRetry={onRetry} />
      </div>
    );
  }
  if (status === "empty") {
    return (
      <div style={{ margin: 16 }}>
        <EmptyState icon="📋" title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }
  return null;
}

function useAdminList(loader) {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const load = () => {
    let ignore = false;
    setStatus("loading");
    setErrorMessage("");
    loader()
      .then((data) => {
        if (ignore) return;
        const nextItems = Array.isArray(data) ? data : [];
        setItems(nextItems);
        setStatus(nextItems.length > 0 ? "success" : "empty");
      })
      .catch((error) => {
        if (ignore) return;
        setItems([]);
        setErrorMessage(getApiErrorHint(error));
        setStatus("error");
      });
    return () => { ignore = true; };
  };

  useEffect(() => load(), []);

  return { items, setItems, status, errorMessage, reload: load };
}

// ─── 관리자 대시보드 ──────────────────────────────────────────────────
export function AdminDashboardPage({ onBack, onNav }) {
  const [dashboard, setDashboard] = useState(null);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const loadDashboard = () => {
    let ignore = false;
    setStatus("loading");
    setErrorMessage("");

    fetchAdminDashboard()
      .then((data) => {
        if (ignore) return;
        setDashboard(data ?? {});
        setStatus("success");
      })
      .catch((error) => {
        if (ignore) return;
        setDashboard(null);
        setErrorMessage(getApiErrorHint(error));
        setStatus("error");
      });

    return () => { ignore = true; };
  };

  useEffect(() => {
    return loadDashboard();
  }, []);

  const dashboardData = dashboard ?? {};
  const stats = [
    { label: "전체 회원", value: Number(dashboardData.totalUsers || 0).toLocaleString(), icon: "👥" },
    { label: "전체 가게", value: Number(dashboardData.totalShops || 0).toLocaleString(), icon: "🏪" },
    { label: "인증 대기", value: Number(dashboardData.pendingCertifications || 0).toLocaleString(), icon: "✅", alert: Number(dashboardData.pendingCertifications || 0) > 0 },
    { label: "상인 신청 대기", value: Number(dashboardData.pendingMerchantApplications || 0).toLocaleString(), icon: "📋", alert: Number(dashboardData.pendingMerchantApplications || 0) > 0 },
  ];
  const summaryRows = [
    ["👤 오늘 신규 가입", `${Number(dashboardData.newUsersToday || 0).toLocaleString()}명`],
    ["⛔ 정지 회원", `${Number(dashboardData.suspendedUsers || 0).toLocaleString()}명`],
    ["📍 등록 관광지", `${Number(dashboardData.totalPlaces || 0).toLocaleString()}개`],
    ["🖼️ 활성 배너", `${Number(dashboardData.activeBanners || 0).toLocaleString()} / ${Number(dashboardData.totalBanners || 0).toLocaleString()}개`],
  ];
  const quickMenus = [
    { icon: "👥", label: "유저 관리", key: "adminUsers" },
    { icon: "🏪", label: "상인 신청", key: "adminMerchant", badge: dashboardData.pendingMerchantApplications },
    { icon: "🚨", label: "신고 관리", key: "adminReports" },
    { icon: "📍", label: "콘텐츠 관리", key: "adminContent" },
    { icon: "🎉", label: "축제 관리", key: "adminFestivals" },
    { icon: "💸", label: "환불 관리", key: "adminRefunds" },
    { icon: "💰", label: "정산 관리", key: "adminSettlements" },
    { icon: "📣", label: "광고 신청", key: "adminAds" },
    { icon: "✅", label: "가게 인증", key: "adminCertifications", badge: dashboardData.pendingCertifications },
    { icon: "💬", label: "상담 관리", key: "adminSupport" },
    { icon: "🖼️", label: "배너 관리", key: "adminBanners" },
    { icon: "❔", label: "FAQ 관리", key: "adminFaqs" },
    { icon: "🎁", label: "상품 관리", key: "adminProducts" },
    { icon: "🏬", label: "가게 도구", key: "adminShops" },
  ];

  return (
    <div style={S.screen}>
      <div style={{ background: COLORS.primary, padding: "44px 20px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ color: COLORS.accent, fontSize: 14, fontWeight: 700, marginBottom: 4 }}>👑 관리자</div>
          <div style={{ color: "#fff", fontSize: 20, fontWeight: 700 }}>춘배투어 대시보드</div>
        </div>
        <div onClick={onBack} style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, cursor: "pointer" }}>← 나가기</div>
      </div>
      <div style={S.scrollArea}>
        {/* 통계 카드 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10, padding: 16, paddingBottom: 0 }}>
          {status === "loading" && (
            <div style={{ gridColumn: "1 / -1" }}>
              <SkeletonList count={4} />
            </div>
          )}
          {status === "error" && (
            <div style={{ gridColumn: "1 / -1" }}>
              <ErrorState
                title="관리자 대시보드를 불러오지 못했습니다."
                description={errorMessage || "백엔드 연결 상태를 확인한 뒤 다시 시도해주세요."}
                onRetry={loadDashboard}
              />
            </div>
          )}
          {status === "success" && stats.map(s => (
            <div key={s.label} style={{ background: "#fff", borderRadius: 16, padding: 16, border: s.alert ? `2px solid #E24B4A` : "0.5px solid rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: s.alert ? "#E24B4A" : COLORS.primary }}>{s.value}</div>
              <div style={{ fontSize: 14, color: COLORS.textMuted, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {status === "success" && (
          <div style={{ background: "#fff", margin: 16, borderRadius: 16, padding: 16, border: "0.5px solid rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary, marginBottom: 12 }}>📊 운영 현황</div>
            {summaryRows.map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "0.5px solid rgba(0,0,0,0.05)" }}>
                <span style={{ fontSize: 14, color: COLORS.textMuted }}>{k}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary }}>{v}</span>
              </div>
            ))}
          </div>
        )}

        {/* 빠른 메뉴 */}
        <div style={{ background: "#fff", margin: "0 16px 16px", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", fontSize: 14, fontWeight: 700, color: COLORS.textMuted, borderBottom: "0.5px solid rgba(0,0,0,0.05)" }}>빠른 메뉴</div>
          {quickMenus.map((m, i) => (
            <div key={m.key} onClick={() => onNav(m.key)} style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", borderBottom: i < quickMenus.length - 1 ? "0.5px solid rgba(0,0,0,0.05)" : "none" }}>
              <span style={{ fontSize: 14 }}>{m.icon} {m.label}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {m.badge && <span style={{ background: "#E24B4A", color: "#fff", fontSize: 14, fontWeight: 700, borderRadius: 20, padding: "2px 8px" }}>🔴{m.badge}</span>}
                <span style={{ color: COLORS.textMuted }}>›</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 유저 관리 ────────────────────────────────────────────────────────
export function AdminUsersPage({ onBack, showToast }) {
  const [filter, setFilter] = useState("전체");
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let ignore = false;
    const timer = setTimeout(() => {
      setStatus("loading");
      setErrorMessage("");
      fetchAdminUsers({ keyword: query, status: filter })
        .then((data) => {
          if (ignore) return;
          setUsers(data);
          setStatus(data.length > 0 ? "success" : "empty");
        })
        .catch((error) => {
          if (ignore) return;
          setUsers([]);
          setErrorMessage(error?.message || "유저 목록을 불러오지 못했습니다.");
          setStatus("error");
        });
    }, 250);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [filter, query]);

  const filtered = users.filter(u => (filter === "전체" || u.status === filter) && (u.nickname.includes(query) || u.email.includes(query)));

  const toggleSuspension = async (user) => {
    try {
      if (user.status === "정상") {
        const reason = promptReason("정지 사유를 입력해주세요.", "관리자 처리");
        if (reason === null) return;
        await suspendAdminUser(user.id, reason);
        showToast("정지 처리되었습니다.");
        setUsers(prev => prev.map(item => item.id === user.id ? { ...item, status: "정지" } : item));
        return;
      }
      await unsuspendAdminUser(user.id);
      showToast("정지가 해제되었습니다.");
      setUsers(prev => prev.map(item => item.id === user.id ? { ...item, status: "정상" } : item));
    } catch (error) {
      showToast(getApiErrorHint(error));
    }
  };

  return (
    <div style={S.screen}>
      <div style={{ background: COLORS.primary, padding: "44px 16px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <span onClick={onBack} style={{ color: "#fff", fontSize: 20, cursor: "pointer" }}>←</span>
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>유저 관리</span>
      </div>
      <div style={{ padding: 16, background: "#fff", borderBottom: "0.5px solid rgba(0,0,0,0.06)" }}>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="🔍 이메일/닉네임 검색" style={{ width: "100%", background: COLORS.bg, border: "none", borderRadius: 12, padding: "10px 14px", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 10 }} />
        <div style={{ display: "flex", gap: 8 }}>
          {["전체", "정상", "정지"].map(f => (
            <div key={f} onClick={() => setFilter(f)} style={{ padding: "6px 14px", borderRadius: 20, fontSize: 14, fontWeight: 600, cursor: "pointer", background: filter === f ? COLORS.primary : COLORS.bg, color: filter === f ? "#fff" : COLORS.textMuted }}>{f}</div>
          ))}
        </div>
      </div>
      <div style={S.scrollArea}>
        {status === "loading" && <div style={{ margin: 16 }}><SkeletonList count={4} /></div>}
        {status === "error" && (
          <div style={{ margin: 16 }}>
            <ErrorState title="유저 목록을 불러오지 못했습니다." description={errorMessage} />
          </div>
        )}
        {status === "empty" && (
          <div style={{ margin: 16 }}>
            <EmptyState icon="👤" title="표시할 유저가 없습니다." description="검색어 또는 상태 필터를 바꿔 다시 확인해보세요." />
          </div>
        )}
        {filtered.map(u => (
          <div key={u.id} style={{ background: "#fff", margin: "10px 16px 0", borderRadius: 14, padding: 16, border: "0.5px solid rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.primary }}>{u.nickname}</span>
              <span style={{ fontSize: 14, background: u.status === "정상" ? COLORS.greenBg : "#FEE8E8", color: u.status === "정상" ? COLORS.green : "#A32D2D", borderRadius: 6, padding: "2px 8px", fontWeight: 700 }}>{u.status}</span>
            </div>
            <div style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 10 }}>{u.email} · 가입 {u.date}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <div onClick={() => showToast("유저 상세 정보")} style={{ flex: 1, background: COLORS.bg, borderRadius: 10, padding: "8px 0", textAlign: "center", fontSize: 14, fontWeight: 700, cursor: "pointer", color: COLORS.primary }}>상세</div>
              <div onClick={() => toggleSuspension(u)} style={{ flex: 1, background: u.status === "정상" ? "#FEE8E8" : COLORS.greenBg, borderRadius: 10, padding: "8px 0", textAlign: "center", fontSize: 14, fontWeight: 700, cursor: "pointer", color: u.status === "정상" ? "#A32D2D" : COLORS.green }}>
                {u.status === "정상" ? "정지처리" : "정지해제"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 신고 관리 ────────────────────────────────────────────────────────
export function AdminReportsPage({ onBack, showToast }) {
  const [tab, setTab] = useState("미처리");
  const [reports, setReports] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let ignore = false;
    setStatus("loading");
    setErrorMessage("");

    fetchAdminReports(tab)
      .then((data) => {
        if (ignore) return;
        setReports(data);
        setStatus(data.length > 0 ? "success" : "empty");
      })
      .catch((error) => {
        if (ignore) return;
        setReports([]);
        setErrorMessage(error?.message || "신고 목록을 불러오지 못했습니다.");
        setStatus("error");
      });

    return () => { ignore = true; };
  }, [tab]);

  const handle = async (id, action) => {
    try {
      await resolveAdminReport(id, action === "삭제" ? "DELETE" : "DISMISS");
      showToast(action === "삭제" ? "콘텐츠가 삭제되었습니다." : "신고가 무시되었습니다.");
      setReports(prev => prev.map(r => r.id === id ? { ...r, status: "처리완료" } : r));
    } catch (error) {
      showToast(getApiErrorHint(error));
    }
  };

  const filtered = reports.filter(r => r.status === tab);

  return (
    <div style={S.screen}>
      <div style={{ background: COLORS.primary, padding: "44px 16px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <span onClick={onBack} style={{ color: "#fff", fontSize: 20, cursor: "pointer" }}>←</span>
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>신고 관리</span>
      </div>
      <div style={{ display: "flex", background: "#fff", borderBottom: "0.5px solid rgba(0,0,0,0.06)" }}>
        {["미처리", "처리완료"].map(t => (
          <div key={t} onClick={() => setTab(t)} style={{ flex: 1, textAlign: "center", padding: "14px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", color: tab === t ? COLORS.primary : COLORS.textMuted, borderBottom: tab === t ? `2px solid ${COLORS.primary}` : "none" }}>
            {t} {t === "미처리" && <span style={{ background: "#E24B4A", color: "#fff", fontSize: 14, borderRadius: 20, padding: "1px 6px", marginLeft: 4 }}>{reports.filter(r => r.status === "미처리").length}</span>}
          </div>
        ))}
      </div>
      <div style={S.scrollArea}>
        {status === "loading" && <div style={{ margin: 16 }}><SkeletonList count={4} /></div>}
        {status === "error" && (
          <div style={{ margin: 16 }}>
            <ErrorState title="신고 목록을 불러오지 못했습니다." description={errorMessage} />
          </div>
        )}
        {status === "empty" && (
          <div style={{ margin: 16 }}>
            <EmptyState icon="🚨" title="표시할 신고가 없습니다." description="현재 필터에 해당하는 신고가 없습니다." />
          </div>
        )}
        {filtered.map(r => (
          <div key={r.id} style={{ background: "#fff", margin: "10px 16px 0", borderRadius: 14, padding: 16, border: "0.5px solid rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary }}>🚨 {r.type}</span>
              <span style={{ fontSize: 14, color: COLORS.textMuted }}>{r.date}</span>
            </div>
            <div style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 6 }}>사유: {r.reason} · 신고자: {r.reporter}</div>
            {r.status === "미처리" && (
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <div onClick={() => showToast("상세 보기")} style={{ flex: 1, background: COLORS.bg, borderRadius: 10, padding: "8px 0", textAlign: "center", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>상세보기</div>
                <div onClick={() => handle(r.id, "삭제")} style={{ flex: 1, background: "#FEE8E8", borderRadius: 10, padding: "8px 0", textAlign: "center", fontSize: 14, fontWeight: 700, cursor: "pointer", color: "#A32D2D" }}>삭제</div>
                <div onClick={() => handle(r.id, "무시")} style={{ flex: 1, background: COLORS.bg, borderRadius: 10, padding: "8px 0", textAlign: "center", fontSize: 14, fontWeight: 700, cursor: "pointer", color: COLORS.textMuted }}>무시</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 콘텐츠 관리 ─────────────────────────────────────────────────────
const EMPTY_PLACE_FORM = {
  name: "",
  category: "TOURIST_SPOT",
  description: "",
  address: "",
  lat: "",
  lng: "",
  thumbnailUrl: "",
  imageUrls: "",
  operatingHours: "",
  closedDays: "",
  phone: "",
  admissionFee: "",
  tags: "",
};

const PLACE_UPDATE_FIELDS = ["name", "description", "address", "operatingHours", "closedDays", "phone", "admissionFee", "tags"];

function optionalPlaceFields(form, fields) {
  return Object.fromEntries(fields
    .filter((field) => String(form[field] ?? "").trim())
    .map((field) => [field, String(form[field]).trim()]));
}

export function AdminContentPage({ onBack, showToast }) {
  const [contents, setContents] = useState([]);
  const [filter, setFilter] = useState("전체");
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [syncingPlaces, setSyncingPlaces] = useState(false);
  const [syncingMarkets, setSyncingMarkets] = useState(false);
  const [syncingFestivals, setSyncingFestivals] = useState(false);
  const [placeFormMode, setPlaceFormMode] = useState(null);
  const [editingPlaceId, setEditingPlaceId] = useState(null);
  const [placeForm, setPlaceForm] = useState(EMPTY_PLACE_FORM);
  const [savingPlace, setSavingPlace] = useState(false);

  const loadContents = () => {
    setStatus("loading");
    setErrorMessage("");
    return fetchAdminContents({ category: filter })
      .then((data) => {
        setContents(data);
        setStatus(data.length > 0 ? "success" : "empty");
      })
      .catch((error) => {
        setContents([]);
        setErrorMessage(error?.message || "관리자 콘텐츠 목록을 불러오지 못했습니다.");
        setStatus("error");
      });
  };

  useEffect(() => {
    let ignore = false;

    setStatus("loading");
    setErrorMessage("");
    fetchAdminContents({ category: filter })
      .then((data) => {
        if (ignore) return;
        setContents(data);
        setStatus(data.length > 0 ? "success" : "empty");
      })
      .catch((error) => {
        if (ignore) return;
        setContents([]);
        setErrorMessage(error?.message || "관리자 콘텐츠 목록을 불러오지 못했습니다.");
        setStatus("error");
      });

    return () => { ignore = true; };
  }, [filter]);

  const handleTouristPlaceSync = async () => {
    if (syncingPlaces) return;

    setSyncingPlaces(true);
    try {
      const result = await syncTouristPlaces();
      showToast(`관광지 수집 완료 · 수신 ${result.fetched ?? 0} · 신규 ${result.created ?? 0} · 갱신 ${result.updated ?? 0} · 제외 ${result.skipped ?? 0}`);
      if (filter !== "전체" && filter !== "관광지") {
        setFilter("관광지");
      } else {
        await loadContents();
      }
    } catch {
      showToast("관광지 수집에 실패했습니다. 관리자 권한, 관광공사 API 키, 백엔드 로그를 확인해주세요.");
    } finally {
      setSyncingPlaces(false);
    }
  };

  const handleTraditionalMarketSync = async () => {
    if (syncingMarkets) return;

    setSyncingMarkets(true);
    try {
      await syncTraditionalMarkets();
      showToast("전통시장 데이터를 동기화했습니다.");
      await loadContents();
      if (filter !== "전체" && filter !== "전통시장") {
        setFilter("전통시장");
      }
    } catch {
      showToast("전통시장 동기화에 실패했습니다. 관리자 권한과 백엔드 상태를 확인해주세요.");
    } finally {
      setSyncingMarkets(false);
    }
  };

  const handleFestivalFetch = async () => {
    if (syncingFestivals) return;

    setSyncingFestivals(true);
    try {
      await fetchFestivalsNow();
      showToast("축제 데이터를 수집했습니다.");
      await loadContents();
      if (filter !== "전체" && filter !== "축제") {
        setFilter("축제");
      }
    } catch {
      showToast("축제 수집에 실패했습니다. 관리자 권한, 공공데이터 키, 백엔드 로그를 확인해주세요.");
    } finally {
      setSyncingFestivals(false);
    }
  };

  const openCreatePlace = () => {
    setEditingPlaceId(null);
    setPlaceForm(EMPTY_PLACE_FORM);
    setPlaceFormMode("create");
  };

  const openEditPlace = (place) => {
    if (place.source !== "place") {
      showToast("이 화면에서는 관광지만 수정할 수 있습니다.");
      return;
    }
    setEditingPlaceId(place.id);
    setPlaceForm({ ...EMPTY_PLACE_FORM, name: place.name, address: place.address });
    setPlaceFormMode("edit");
  };

  const resetPlaceForm = () => {
    setPlaceFormMode(null);
    setEditingPlaceId(null);
    setPlaceForm(EMPTY_PLACE_FORM);
  };

  const closePlaceForm = () => {
    if (savingPlace) return;
    resetPlaceForm();
  };

  const savePlace = async () => {
    if (savingPlace) return;

    setSavingPlace(true);
    try {
      if (placeFormMode === "create") {
        if (!placeForm.name.trim() || !placeForm.address.trim() || placeForm.lat === "" || placeForm.lng === "") {
          showToast("이름, 주소, 위도, 경도는 필수입니다.");
          return;
        }
        await createAdminPlace({
          name: placeForm.name.trim(),
          category: placeForm.category,
          address: placeForm.address.trim(),
          lat: Number(placeForm.lat),
          lng: Number(placeForm.lng),
          ...optionalPlaceFields(placeForm, [
            "description", "thumbnailUrl", "imageUrls", "operatingHours",
            "closedDays", "phone", "admissionFee", "tags",
          ]),
        });
        showToast("관광지를 등록했습니다.");
      } else {
        const body = optionalPlaceFields(placeForm, PLACE_UPDATE_FIELDS);
        if (Object.keys(body).length === 0) {
          showToast("수정할 값을 입력해주세요.");
          return;
        }
        await updateAdminPlace(editingPlaceId, body);
        showToast("관광지를 수정했습니다.");
      }
      resetPlaceForm();
      await loadContents();
    } catch (error) {
      showToast(error?.message || "관광지 저장에 실패했습니다.");
    } finally {
      setSavingPlace(false);
    }
  };

  const removePlace = async (place) => {
    if (place.source !== "place") {
      showToast("이 화면에서는 관광지만 삭제할 수 있습니다.");
      return;
    }
    try {
      await deleteAdminPlace(place.id);
      setContents(prev => prev.filter(item => item.id !== place.id));
      showToast("관광지를 삭제했습니다.");
    } catch (error) {
      showToast(error?.message || "관광지 삭제에 실패했습니다.");
    }
  };

  const filtered = filter === "전체" ? contents : contents.filter(c => c.type === filter);

  return (
    <div style={S.screen}>
      <div style={{ background: COLORS.primary, padding: "44px 16px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <span onClick={onBack} style={{ color: "#fff", fontSize: 20, cursor: "pointer" }}>←</span>
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>콘텐츠 관리</span>
      </div>
      <div style={{ display: "flex", gap: 8, padding: "12px 16px", background: "#fff", borderBottom: "0.5px solid rgba(0,0,0,0.06)" }}>
        {["전체", "관광지", "전통시장", "축제"].map(f => (
          <div key={f} onClick={() => setFilter(f)} style={{ padding: "6px 16px", borderRadius: 20, fontSize: 14, fontWeight: 600, cursor: "pointer", background: filter === f ? COLORS.primary : COLORS.bg, color: filter === f ? "#fff" : COLORS.textMuted }}>{f}</div>
        ))}
      </div>
      <div style={S.scrollArea}>
        <div style={{ padding: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginBottom: 16 }}>
            <button type="button" onClick={openCreatePlace} style={{ border: 0, background: COLORS.accent, color: COLORS.primary, borderRadius: 12, padding: "12px 0", textAlign: "center", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>+ 관광지 등록</button>
            <button type="button" disabled={syncingPlaces} onClick={handleTouristPlaceSync} style={{ border: "1px solid rgba(47,133,95,0.2)", background: syncingPlaces ? "#F7F5F0" : COLORS.greenBg, color: syncingPlaces ? COLORS.textMuted : COLORS.green, borderRadius: 12, padding: "12px 0", textAlign: "center", fontWeight: 700, cursor: syncingPlaces ? "wait" : "pointer", fontFamily: "inherit" }}>
              {syncingPlaces ? "관광지 수집 중..." : "관광지 데이터 수집"}
            </button>
            <button type="button" disabled={syncingMarkets} onClick={handleTraditionalMarketSync} style={{ border: "1px solid rgba(47,133,95,0.2)", background: syncingMarkets ? "#F7F5F0" : COLORS.greenBg, color: syncingMarkets ? COLORS.textMuted : COLORS.green, borderRadius: 12, padding: "12px 0", textAlign: "center", fontWeight: 700, cursor: syncingMarkets ? "wait" : "pointer", fontFamily: "inherit" }}>
              {syncingMarkets ? "전통시장 동기화 중..." : "전통시장 데이터 동기화"}
            </button>
            <button type="button" disabled={syncingFestivals} onClick={handleFestivalFetch} style={{ border: "1px solid rgba(47,133,95,0.2)", background: syncingFestivals ? "#F7F5F0" : COLORS.greenBg, color: syncingFestivals ? COLORS.textMuted : COLORS.green, borderRadius: 12, padding: "12px 0", textAlign: "center", fontWeight: 700, cursor: syncingFestivals ? "wait" : "pointer", fontFamily: "inherit" }}>
              {syncingFestivals ? "축제 수집 중..." : "축제 데이터 수집"}
            </button>
          </div>
          {status === "loading" && <SkeletonList count={4} />}
          {status === "error" && <ErrorState title="콘텐츠 목록을 불러오지 못했습니다." description={errorMessage} onRetry={loadContents} />}
          {status === "empty" && (
            <EmptyState icon="📍" title="표시할 콘텐츠가 없습니다." description="카테고리 필터를 바꾸거나 새 콘텐츠를 추가해보세요." />
          )}
          {filtered.map(c => (
            <div key={c.id} style={{ background: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, border: "0.5px solid rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, background: c.type === "관광지" ? "#FEE8E8" : c.type === "축제" ? "#FFF3D0" : COLORS.greenBg, color: c.type === "관광지" ? "#A32D2D" : c.type === "축제" ? "#B87800" : COLORS.green, borderRadius: 6, padding: "2px 8px", fontWeight: 700 }}>{c.type}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.primary }}>{c.name}</span>
                </div>
                <span style={{ borderRadius: 999, background: c.status === "공개" ? COLORS.greenBg : COLORS.bg, color: c.status === "공개" ? COLORS.green : COLORS.textMuted, padding: "5px 10px", fontSize: 13, fontWeight: 700 }}>{c.status}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ fontSize: 14, color: c.status === "공개" ? COLORS.green : COLORS.textMuted, fontWeight: 600 }}>{c.status}</span>
                  <span style={{ fontSize: 14, color: COLORS.textMuted }}>· {c.updatedAt}</span>
                  {c.readOnly && <span style={{ fontSize: 14, color: COLORS.textMuted }}>· 외부 수집 데이터</span>}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" onClick={() => openEditPlace(c)} aria-label="관광지 수정" style={{ border: 0, background: "transparent", fontSize: 18, cursor: c.source === "place" ? "pointer" : "not-allowed", opacity: c.source === "place" ? 1 : 0.45 }}>✏️</button>
                  <button type="button" onClick={() => removePlace(c)} aria-label="관광지 삭제" style={{ border: 0, background: "transparent", fontSize: 18, cursor: c.source === "place" ? "pointer" : "not-allowed", opacity: c.source === "place" ? 1 : 0.45 }}>🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {placeFormMode && (
        <div className="admin-place-modal-backdrop" onClick={closePlaceForm}>
          <div className="admin-place-modal" onClick={(event) => event.stopPropagation()}>
            <div className="admin-place-modal-head">
              <strong>{placeFormMode === "create" ? "관광지 등록" : "관광지 수정"}</strong>
              <button type="button" onClick={closePlaceForm} aria-label="닫기">×</button>
            </div>
            <div className="admin-place-form-grid">
              <label>이름<input value={placeForm.name} onChange={(event) => setPlaceForm(prev => ({ ...prev, name: event.target.value }))} /></label>
              <label className="wide">주소<input value={placeForm.address} onChange={(event) => setPlaceForm(prev => ({ ...prev, address: event.target.value }))} /></label>
              {placeFormMode === "create" && (
                <>
                  <label>위도<input type="number" step="any" value={placeForm.lat} onChange={(event) => setPlaceForm(prev => ({ ...prev, lat: event.target.value }))} /></label>
                  <label>경도<input type="number" step="any" value={placeForm.lng} onChange={(event) => setPlaceForm(prev => ({ ...prev, lng: event.target.value }))} /></label>
                  <label className="wide">썸네일 URL<input value={placeForm.thumbnailUrl} onChange={(event) => setPlaceForm(prev => ({ ...prev, thumbnailUrl: event.target.value }))} /></label>
                  <label className="wide">이미지 URL JSON 배열<input placeholder='["https://..."]' value={placeForm.imageUrls} onChange={(event) => setPlaceForm(prev => ({ ...prev, imageUrls: event.target.value }))} /></label>
                </>
              )}
              <label className="wide">소개<textarea value={placeForm.description} onChange={(event) => setPlaceForm(prev => ({ ...prev, description: event.target.value }))} /></label>
              <label>운영시간<input value={placeForm.operatingHours} onChange={(event) => setPlaceForm(prev => ({ ...prev, operatingHours: event.target.value }))} /></label>
              <label>휴무일<input value={placeForm.closedDays} onChange={(event) => setPlaceForm(prev => ({ ...prev, closedDays: event.target.value }))} /></label>
              <label>연락처<input value={placeForm.phone} onChange={(event) => setPlaceForm(prev => ({ ...prev, phone: event.target.value }))} /></label>
              <label>입장료<input value={placeForm.admissionFee} onChange={(event) => setPlaceForm(prev => ({ ...prev, admissionFee: event.target.value }))} /></label>
              <label className="wide">태그 JSON 배열<input placeholder='["궁궐","서울"]' value={placeForm.tags} onChange={(event) => setPlaceForm(prev => ({ ...prev, tags: event.target.value }))} /></label>
            </div>
            {placeFormMode === "edit" && <p className="admin-place-form-note">수정 API가 허용하는 필드만 표시합니다. 입력한 값만 부분 수정됩니다.</p>}
            <div className="admin-place-modal-actions">
              <button type="button" onClick={closePlaceForm}>취소</button>
              <button type="button" disabled={savingPlace} onClick={savePlace}>{savingPlace ? "저장 중..." : "저장"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export function AdminMerchantPage({ onBack, showToast }) {
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let ignore = false;
    setStatus("loading");
    setErrorMessage("");

    fetchMerchantApplications()
      .then((data) => {
        if (ignore) return;
        setRequests(data);
        setStatus(data.length > 0 ? "success" : "empty");
      })
      .catch((error) => {
        if (ignore) return;
        setRequests([]);
        setErrorMessage(error?.message || "상인 신청 목록을 불러오지 못했습니다.");
        setStatus("error");
      });

    return () => { ignore = true; };
  }, []);

  const handle = async (id, action) => {
    try {
      if (action === "승인") {
        await approveMerchantApplication(id);
      } else {
        const rejectReason = promptReason("거절 사유를 입력해주세요.", "관리자 거절");
        if (rejectReason === null) return;
        await rejectMerchantApplication(id, rejectReason);
      }
      showToast(action === "승인" ? "✅ 상인 신청이 승인되었습니다." : "❌ 상인 신청이 거절되었습니다.");
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: action === "승인" ? "승인" : "거절" } : r));
    } catch (error) {
      showToast(getApiErrorHint(error));
    }
  };

  return (
    <div style={S.screen}>
      <div style={{ background: COLORS.primary, padding: "44px 16px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <span onClick={onBack} style={{ color: "#fff", fontSize: 20, cursor: "pointer" }}>←</span>
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>상인 신청 관리</span>
      </div>
      <div style={S.scrollArea}>
        {status === "loading" && <div style={{ margin: 16 }}><SkeletonList count={4} /></div>}
        {status === "error" && (
          <div style={{ margin: 16 }}>
            <ErrorState title="상인 신청 목록을 불러오지 못했습니다." description={errorMessage} />
          </div>
        )}
        {status === "empty" && (
          <div style={{ margin: 16 }}>
            <EmptyState icon="🏪" title="표시할 상인 신청이 없습니다." description="새 신청이 들어오면 이곳에서 승인 또는 거절할 수 있습니다." />
          </div>
        )}
        {requests.map(r => (
          <div key={r.id} style={{ background: "#fff", margin: "10px 16px 0", borderRadius: 14, padding: 16, border: "0.5px solid rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.primary }}>{r.shopName}</span>
              <span style={{ fontSize: 14, background: r.status === "대기" ? "#FFF3D0" : r.status === "승인" ? COLORS.greenBg : "#FEE8E8", color: r.status === "대기" ? "#B87800" : r.status === "승인" ? COLORS.green : "#A32D2D", borderRadius: 6, padding: "2px 8px", fontWeight: 700 }}>{r.status}</span>
            </div>
            <div style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 6 }}>신청자: {r.name} · {r.market} · {r.date}</div>
            {r.status === "대기" && (
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <div onClick={() => handle(r.id, "거절")} style={{ flex: 1, background: "#FEE8E8", borderRadius: 10, padding: "8px 0", textAlign: "center", fontSize: 14, fontWeight: 700, cursor: "pointer", color: "#A32D2D" }}>거절</div>
                <div onClick={() => handle(r.id, "승인")} style={{ flex: 2, background: COLORS.primary, borderRadius: 10, padding: "8px 0", textAlign: "center", fontSize: 14, fontWeight: 700, cursor: "pointer", color: "#fff" }}>승인</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminRefundsPage({ onBack, showToast }) {
  const { items, setItems, status, errorMessage, reload } = useAdminList(() => fetchAdminRefunds({ size: 100 }));

  const handleDecision = async (refund, decision) => {
    const refundId = getItemId(refund, ["refundId", "id"]);
    if (!refundId) return showToast("환불 ID를 찾을 수 없습니다.");

    try {
      if (decision === "approve") {
        await approveRefund(refundId);
        showToast("환불을 승인했습니다.");
        setItems(prev => prev.map(item => getItemId(item, ["refundId", "id"]) === refundId ? { ...item, status: "APPROVED" } : item));
        return;
      }
      const reason = promptReason("환불 거절 사유를 입력해주세요.", "환불 조건 미충족");
      if (reason === null) return;
      await rejectRefund(refundId, reason);
      showToast("환불을 거절했습니다.");
      setItems(prev => prev.map(item => getItemId(item, ["refundId", "id"]) === refundId ? { ...item, status: "REJECTED", rejectReason: reason } : item));
    } catch (error) {
      showToast(getApiErrorHint(error));
    }
  };

  return (
    <AdminShell title="환불 관리" onBack={onBack}>
      <AdminLoadState status={status} errorMessage={errorMessage} emptyTitle="환불 요청이 없습니다." emptyDescription="사용자의 환불 요청이 들어오면 이곳에서 승인 또는 거절할 수 있습니다." onRetry={reload} />
      {status === "success" && items.map((refund) => {
        const refundId = getItemId(refund, ["refundId", "id"]);
        return (
          <AdminCard key={refundId}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <strong style={{ color: COLORS.primary }}>환불 #{refundId}</strong>
              <AdminStatusBadge status={refund.status} />
            </div>
            <div style={{ marginTop: 8, color: COLORS.textMuted, fontSize: 14 }}>
              주문 {refund.paymentOrderId ?? "-"} · 사용자 {refund.userId ?? "-"} · {formatDate(refund.createdAt)}
            </div>
            <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: COLORS.primary }}>{formatNumber(refund.amount)} 엽전</div>
            {(refund.reason || refund.rejectReason) && <div style={{ marginTop: 8, fontSize: 14, color: COLORS.textMuted }}>{refund.reason || refund.rejectReason}</div>}
            {refund.status === "PENDING" && (
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <AdminButton tone="danger" onClick={() => handleDecision(refund, "reject")} style={{ flex: 1 }}>거절</AdminButton>
                <AdminButton onClick={() => handleDecision(refund, "approve")} style={{ flex: 2 }}>승인</AdminButton>
              </div>
            )}
          </AdminCard>
        );
      })}
    </AdminShell>
  );
}

export function AdminSettlementsPage({ onBack, showToast }) {
  const { items, setItems, status, errorMessage, reload } = useAdminList(() => fetchAdminSettlements({ size: 100 }));

  const handleDecision = async (settlement, decision) => {
    const settlementId = getItemId(settlement, ["settlementId", "id"]);
    if (!settlementId) return showToast("정산 ID를 찾을 수 없습니다.");

    try {
      if (decision === "approve") {
        await approveSettlement(settlementId);
        showToast("정산을 승인했습니다.");
        setItems(prev => prev.map(item => getItemId(item, ["settlementId", "id"]) === settlementId ? { ...item, status: "APPROVED" } : item));
        return;
      }
      const reason = promptReason("정산 거절 사유를 입력해주세요.", "정산 조건 미충족");
      if (reason === null) return;
      await rejectSettlement(settlementId, reason);
      showToast("정산을 거절했습니다.");
      setItems(prev => prev.map(item => getItemId(item, ["settlementId", "id"]) === settlementId ? { ...item, status: "REJECTED", rejectReason: reason } : item));
    } catch (error) {
      showToast(getApiErrorHint(error));
    }
  };

  return (
    <AdminShell title="정산 관리" onBack={onBack}>
      <AdminLoadState status={status} errorMessage={errorMessage} emptyTitle="정산 요청이 없습니다." emptyDescription="상인 정산 신청이 들어오면 이곳에서 처리할 수 있습니다." onRetry={reload} />
      {status === "success" && items.map((settlement) => {
        const settlementId = getItemId(settlement, ["settlementId", "id"]);
        return (
          <AdminCard key={settlementId}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <strong style={{ color: COLORS.primary }}>정산 #{settlementId}</strong>
              <AdminStatusBadge status={settlement.status} />
            </div>
            <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: COLORS.primary }}>{formatNumber(settlement.amount)} 엽전</div>
            <div style={{ marginTop: 8, color: COLORS.textMuted, fontSize: 14 }}>
              가게 {settlement.shopId ?? "-"} · {settlement.bankName ?? "-"} {settlement.accountNumber ?? ""} · {settlement.accountHolder ?? "-"}
            </div>
            <div style={{ marginTop: 4, color: COLORS.textMuted, fontSize: 14 }}>{formatDate(settlement.createdAt)}</div>
            {settlement.rejectReason && <div style={{ marginTop: 8, fontSize: 14, color: "#A32D2D" }}>{settlement.rejectReason}</div>}
            {settlement.status === "PENDING" && (
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <AdminButton tone="danger" onClick={() => handleDecision(settlement, "reject")} style={{ flex: 1 }}>거절</AdminButton>
                <AdminButton onClick={() => handleDecision(settlement, "approve")} style={{ flex: 2 }}>승인</AdminButton>
              </div>
            )}
          </AdminCard>
        );
      })}
    </AdminShell>
  );
}

export function AdminAdsPage({ onBack, showToast }) {
  const { items, setItems, status, errorMessage, reload } = useAdminList(() => fetchAdminAds({ size: 100 }));

  const handleDecision = async (ad, decision) => {
    const adId = getItemId(ad, ["applicationId", "adId", "id"]);
    if (!adId) return showToast("광고 신청 ID를 찾을 수 없습니다.");

    try {
      if (decision === "approve") {
        await approveAd(adId);
        showToast("광고를 승인했습니다.");
        setItems(prev => prev.map(item => getItemId(item, ["applicationId", "adId", "id"]) === adId ? { ...item, status: "APPROVED" } : item));
        return;
      }
      const reason = promptReason("광고 거절 사유를 입력해주세요.", "광고 조건 미충족");
      if (reason === null) return;
      await rejectAd(adId, reason);
      showToast("광고를 거절했습니다.");
      setItems(prev => prev.map(item => getItemId(item, ["applicationId", "adId", "id"]) === adId ? { ...item, status: "REJECTED", rejectReason: reason } : item));
    } catch (error) {
      showToast(getApiErrorHint(error));
    }
  };

  return (
    <AdminShell title="광고 신청 관리" onBack={onBack}>
      <AdminLoadState status={status} errorMessage={errorMessage} emptyTitle="광고 신청이 없습니다." emptyDescription="상인의 광고 신청이 들어오면 이곳에서 승인 또는 거절할 수 있습니다." onRetry={reload} />
      {status === "success" && items.map((ad) => {
        const adId = getItemId(ad, ["applicationId", "adId", "id"]);
        return (
          <AdminCard key={adId}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <strong style={{ color: COLORS.primary }}>광고 #{adId}</strong>
              <AdminStatusBadge status={ad.status} />
            </div>
            <div style={{ marginTop: 8, color: COLORS.textMuted, fontSize: 14 }}>
              가게 {ad.shopId ?? "-"} · {ad.adType ?? "BANNER"} · {ad.startDate ?? "-"} ~ {ad.endDate ?? "-"}
            </div>
            <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: COLORS.primary }}>{formatNumber(ad.cost)} 엽전</div>
            {ad.rejectReason && <div style={{ marginTop: 8, fontSize: 14, color: "#A32D2D" }}>{ad.rejectReason}</div>}
            {ad.status === "PENDING" && (
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <AdminButton tone="danger" onClick={() => handleDecision(ad, "reject")} style={{ flex: 1 }}>거절</AdminButton>
                <AdminButton onClick={() => handleDecision(ad, "approve")} style={{ flex: 2 }}>승인</AdminButton>
              </div>
            )}
          </AdminCard>
        );
      })}
    </AdminShell>
  );
}

export function AdminCertificationsPage({ onBack, showToast }) {
  const { items, setItems, status, errorMessage, reload } = useAdminList(() => fetchAdminCertifications({ size: 100 }));

  const handleCertification = async (certification, action) => {
    const certificationId = getItemId(certification, ["certificationId", "id"]);
    if (!certificationId) return showToast("인증 신청 ID를 찾을 수 없습니다.");

    try {
      if (action === "approve") {
        await approveCertification(certificationId);
        showToast("인증을 승인했습니다.");
        setItems(prev => prev.map(item => getItemId(item, ["certificationId", "id"]) === certificationId ? { ...item, status: "APPROVED" } : item));
        return;
      }
      const reason = promptReason(action === "cancel" ? "인증 취소 사유를 입력해주세요." : "인증 거절 사유를 입력해주세요.", action === "cancel" ? "관리자 인증 취소" : "인증 조건 미충족");
      if (reason === null) return;
      if (action === "cancel") {
        await cancelCertification(certificationId, reason);
        showToast("인증을 취소했습니다.");
        setItems(prev => prev.map(item => getItemId(item, ["certificationId", "id"]) === certificationId ? { ...item, status: "CANCELLED" } : item));
        return;
      }
      await rejectCertification(certificationId, reason);
      showToast("인증을 거절했습니다.");
      setItems(prev => prev.map(item => getItemId(item, ["certificationId", "id"]) === certificationId ? { ...item, status: "REJECTED" } : item));
    } catch (error) {
      showToast(getApiErrorHint(error));
    }
  };

  return (
    <AdminShell title="가게 인증 관리" onBack={onBack}>
      <AdminLoadState status={status} errorMessage={errorMessage} emptyTitle="인증 신청이 없습니다." emptyDescription="가게 인증 신청이 들어오면 이곳에서 처리할 수 있습니다." onRetry={reload} />
      {status === "success" && items.map((certification) => {
        const certificationId = getItemId(certification, ["certificationId", "id"]);
        return (
          <AdminCard key={certificationId}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <strong style={{ color: COLORS.primary }}>인증 #{certificationId}</strong>
              <AdminStatusBadge status={certification.status} />
            </div>
            <div style={{ marginTop: 8, color: COLORS.textMuted, fontSize: 14 }}>
              가게 {certification.shopId ?? "-"} · 신청 {formatDate(certification.submittedAt)} · 처리 {formatDate(certification.processedAt)}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              {certification.status === "PENDING" && (
                <>
                  <AdminButton tone="danger" onClick={() => handleCertification(certification, "reject")} style={{ flex: 1 }}>거절</AdminButton>
                  <AdminButton onClick={() => handleCertification(certification, "approve")} style={{ flex: 2 }}>승인</AdminButton>
                </>
              )}
              {certification.status === "APPROVED" && <AdminButton tone="danger" onClick={() => handleCertification(certification, "cancel")} style={{ flex: 1 }}>인증 취소</AdminButton>}
            </div>
          </AdminCard>
        );
      })}
    </AdminShell>
  );
}

export function AdminSupportPage({ onBack, showToast }) {
  const { items: rooms, status, errorMessage, reload } = useAdminList(() => fetchAdminSupportRooms({ size: 100 }));
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesStatus, setMessagesStatus] = useState("idle");

  const loadMessages = async (room) => {
    setSelectedRoom(room);
    setMessagesStatus("loading");
    try {
      const data = await fetchAdminSupportMessages(room.supportRoomId, { size: 100 });
      setMessages(data);
      setMessagesStatus(data.length > 0 ? "success" : "empty");
    } catch (error) {
      setMessages([]);
      setMessagesStatus("error");
      showToast(getApiErrorHint(error));
    }
  };

  const handleAssign = async (room) => {
    try {
      await assignAdminSupportRoom(room.supportRoomId);
      showToast("상담방을 배정했습니다.");
      reload();
    } catch (error) {
      showToast(getApiErrorHint(error));
    }
  };

  const handleClose = async (room) => {
    const summary = promptReason("상담 종료 요약을 입력해주세요.", "관리자 상담 종료");
    if (summary === null) return;
    try {
      await closeAdminSupportRoom(room.supportRoomId, summary);
      showToast("상담을 종료했습니다.");
      reload();
    } catch (error) {
      showToast(getApiErrorHint(error));
    }
  };

  return (
    <AdminShell title="상담 관리" onBack={onBack}>
      <AdminLoadState status={status} errorMessage={errorMessage} emptyTitle="상담방이 없습니다." emptyDescription="고객센터 상담방이 생성되면 이곳에서 확인할 수 있습니다." onRetry={reload} />
      {status === "success" && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 0.9fr) minmax(0, 1.1fr)", gap: 12, padding: "0 16px 16px" }}>
          <div>
            {rooms.map((room) => (
              <div key={room.supportRoomId} onClick={() => loadMessages(room)} style={{ background: selectedRoom?.supportRoomId === room.supportRoomId ? COLORS.greenBg : "#fff", borderRadius: 14, padding: 14, marginTop: 10, border: "0.5px solid rgba(0,0,0,0.06)", cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <strong style={{ color: COLORS.primary }}>상담 #{room.supportRoomId}</strong>
                  <AdminStatusBadge status={room.status} />
                </div>
                <div style={{ marginTop: 6, fontSize: 14, color: COLORS.textMuted }}>{room.userNickname ?? `사용자 ${room.userId ?? "-"}`}</div>
                <div style={{ marginTop: 6, fontSize: 14, color: COLORS.textMuted }}>{room.lastMessage?.content ?? "아직 메시지가 없습니다."}</div>
              </div>
            ))}
          </div>
          <div style={{ background: "#fff", borderRadius: 14, padding: 16, marginTop: 10, border: "0.5px solid rgba(0,0,0,0.06)", minHeight: 320 }}>
            {!selectedRoom && <EmptyState icon="💬" title="상담방을 선택해주세요." description="왼쪽 목록에서 상담방을 누르면 메시지를 확인할 수 있습니다." />}
            {selectedRoom && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <strong style={{ color: COLORS.primary }}>상담 #{selectedRoom.supportRoomId}</strong>
                  <div style={{ display: "flex", gap: 8 }}>
                    <AdminButton tone="ghost" onClick={() => handleAssign(selectedRoom)}>배정</AdminButton>
                    <AdminButton tone="danger" onClick={() => handleClose(selectedRoom)}>종료</AdminButton>
                  </div>
                </div>
                {messagesStatus === "loading" && <SkeletonList count={3} />}
                {messagesStatus === "empty" && <EmptyState icon="💬" title="상담 메시지가 없습니다." description="상담 메시지가 생기면 이곳에 표시됩니다." />}
                {messagesStatus === "error" && <ErrorState title="메시지를 불러오지 못했습니다." description="상담 메시지 조회 API 상태를 확인해주세요." />}
                {messagesStatus === "success" && messages.map((message) => (
                  <div key={message.messageId} style={{ padding: "10px 0", borderBottom: "0.5px solid rgba(0,0,0,0.05)" }}>
                    <div style={{ fontSize: 13, color: COLORS.textMuted }}>{message.senderRole ?? "UNKNOWN"} · {formatDate(message.sentAt)}</div>
                    <div style={{ marginTop: 4, color: COLORS.text }}>{message.content || message.fileUrl || "-"}</div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  );
}

const EMPTY_BANNER_FORM = {
  title: "",
  imageUrl: "",
  linkUrl: "",
  priority: "0",
  startDate: "",
  endDate: "",
};

export function AdminBannersPage({ onBack, showToast }) {
  const { items, status, errorMessage, reload } = useAdminList(() => fetchAdminBanners({ size: 100 }));
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_BANNER_FORM);
  const isEditing = editingId != null;

  const startCreate = () => {
    setEditingId(null);
    setForm(EMPTY_BANNER_FORM);
  };

  const startEdit = (banner) => {
    setEditingId(banner.id);
    setForm({
      title: banner.title ?? "",
      imageUrl: banner.imageUrl ?? "",
      linkUrl: banner.linkUrl ?? "",
      priority: String(banner.priority ?? 0),
      startDate: banner.startDate ?? "",
      endDate: banner.endDate ?? "",
    });
  };

  const save = async () => {
    if (!form.title.trim() || !form.imageUrl.trim()) {
      showToast("배너 제목과 이미지 URL은 필수입니다.");
      return;
    }
    const payload = {
      title: form.title.trim(),
      imageUrl: form.imageUrl.trim(),
      priority: Number(form.priority || 0),
      ...(form.linkUrl.trim() ? { linkUrl: form.linkUrl.trim() } : {}),
      ...(form.startDate ? { startDate: form.startDate } : {}),
      ...(form.endDate ? { endDate: form.endDate } : {}),
    };
    try {
      if (isEditing) await updateAdminBanner(editingId, payload);
      else await createAdminBanner(payload);
      showToast(isEditing ? "배너를 수정했습니다." : "배너를 등록했습니다.");
      startCreate();
      reload();
    } catch (error) {
      showToast(getApiErrorHint(error));
    }
  };

  const remove = async (bannerId) => {
    try {
      await deleteAdminBanner(bannerId);
      showToast("배너를 삭제했습니다.");
      reload();
    } catch (error) {
      showToast(getApiErrorHint(error));
    }
  };

  return (
    <AdminShell title="배너 관리" onBack={onBack}>
      <AdminCard>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <input placeholder="제목" value={form.title} onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))} style={adminInputStyle} />
          <input placeholder="우선순위" type="number" value={form.priority} onChange={(e) => setForm(prev => ({ ...prev, priority: e.target.value }))} style={adminInputStyle} />
          <input placeholder="이미지 URL" value={form.imageUrl} onChange={(e) => setForm(prev => ({ ...prev, imageUrl: e.target.value }))} style={{ ...adminInputStyle, gridColumn: "1 / -1" }} />
          <input placeholder="링크 URL" value={form.linkUrl} onChange={(e) => setForm(prev => ({ ...prev, linkUrl: e.target.value }))} style={{ ...adminInputStyle, gridColumn: "1 / -1" }} />
          <input type="date" value={form.startDate} onChange={(e) => setForm(prev => ({ ...prev, startDate: e.target.value }))} style={adminInputStyle} />
          <input type="date" value={form.endDate} onChange={(e) => setForm(prev => ({ ...prev, endDate: e.target.value }))} style={adminInputStyle} />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {isEditing && <AdminButton tone="subtle" onClick={startCreate} style={{ flex: 1 }}>새 등록으로 전환</AdminButton>}
          <AdminButton onClick={save} style={{ flex: 2 }}>{isEditing ? "수정 저장" : "배너 등록"}</AdminButton>
        </div>
      </AdminCard>
      <AdminLoadState status={status} errorMessage={errorMessage} emptyTitle="등록된 배너가 없습니다." emptyDescription="운영 배너를 등록하면 이곳에 표시됩니다." onRetry={reload} />
      {status === "success" && items.map((banner) => (
        <AdminCard key={banner.id}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <strong style={{ color: COLORS.primary }}>{banner.title}</strong>
            <AdminStatusBadge status={banner.status} />
          </div>
          <div style={{ marginTop: 8, color: COLORS.textMuted, fontSize: 14 }}>우선순위 {banner.priority ?? 0} · {banner.startDate ?? "-"} ~ {banner.endDate ?? "-"}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <AdminButton tone="subtle" onClick={() => startEdit(banner)} style={{ flex: 1 }}>수정</AdminButton>
            <AdminButton tone="danger" onClick={() => remove(banner.id)} style={{ flex: 1 }}>삭제</AdminButton>
          </div>
        </AdminCard>
      ))}
    </AdminShell>
  );
}

const adminInputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid rgba(0,0,0,0.1)",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  fontFamily: "inherit",
  outline: "none",
};

const EMPTY_FAQ_FORM = { question: "", answer: "", category: "GENERAL" };

export function AdminFaqsPage({ onBack, showToast }) {
  const { items, status, errorMessage, reload } = useAdminList(() => fetchAdminFaqs({ size: 100 }));
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FAQ_FORM);
  const isEditing = editingId != null;

  const reset = () => {
    setEditingId(null);
    setForm(EMPTY_FAQ_FORM);
  };

  const edit = (faq) => {
    setEditingId(faq.faqId ?? faq.id);
    setForm({ question: faq.question ?? "", answer: faq.answer ?? "", category: faq.category ?? "GENERAL" });
  };

  const save = async () => {
    if (!form.question.trim() || !form.answer.trim() || !form.category.trim()) {
      showToast("질문, 답변, 카테고리는 필수입니다.");
      return;
    }
    try {
      if (isEditing) await updateAdminFaq(editingId, form);
      else await createAdminFaq(form);
      showToast(isEditing ? "FAQ를 수정했습니다." : "FAQ를 등록했습니다.");
      reset();
      reload();
    } catch (error) {
      showToast(getApiErrorHint(error));
    }
  };

  const remove = async (faqId) => {
    try {
      await deleteAdminFaq(faqId);
      showToast("FAQ를 삭제했습니다.");
      reload();
    } catch (error) {
      showToast(getApiErrorHint(error));
    }
  };

  return (
    <AdminShell title="FAQ 관리" onBack={onBack}>
      <AdminCard>
        <input placeholder="카테고리" value={form.category} onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))} style={adminInputStyle} />
        <input placeholder="질문" value={form.question} onChange={(e) => setForm(prev => ({ ...prev, question: e.target.value }))} style={{ ...adminInputStyle, marginTop: 8 }} />
        <textarea placeholder="답변" value={form.answer} onChange={(e) => setForm(prev => ({ ...prev, answer: e.target.value }))} style={{ ...adminInputStyle, marginTop: 8, minHeight: 90, resize: "vertical" }} />
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {isEditing && <AdminButton tone="subtle" onClick={reset} style={{ flex: 1 }}>새 등록으로 전환</AdminButton>}
          <AdminButton onClick={save} style={{ flex: 2 }}>{isEditing ? "수정 저장" : "FAQ 등록"}</AdminButton>
        </div>
      </AdminCard>
      <AdminLoadState status={status} errorMessage={errorMessage} emptyTitle="등록된 FAQ가 없습니다." emptyDescription="FAQ를 등록하면 이곳에 표시됩니다." onRetry={reload} />
      {status === "success" && items.map((faq) => {
        const faqId = faq.faqId ?? faq.id;
        return (
          <AdminCard key={faqId}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <strong style={{ color: COLORS.primary }}>{faq.question}</strong>
              <AdminStatusBadge status={faq.isActive === false ? "HIDDEN" : "ACTIVE"} />
            </div>
            <div style={{ marginTop: 8, color: COLORS.textMuted, fontSize: 14 }}>{faq.category} · {formatDate(faq.updatedAt ?? faq.createdAt)}</div>
            <div style={{ marginTop: 8, color: COLORS.text }}>{faq.answer}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <AdminButton tone="subtle" onClick={() => edit(faq)} style={{ flex: 1 }}>수정</AdminButton>
              <AdminButton tone="danger" onClick={() => remove(faqId)} style={{ flex: 1 }}>삭제</AdminButton>
            </div>
          </AdminCard>
        );
      })}
    </AdminShell>
  );
}

const EMPTY_PRODUCT_FORM = {
  name: "",
  description: "",
  category: "COUPON",
  price: "",
  originalPrice: "",
  stock: "",
  imageUrls: "",
  merchantName: "",
  validityDays: "",
  maxPerPerson: "1",
  status: "ON_SALE",
};

function parseImageUrlsInput(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("[")) {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : undefined;
  }
  return trimmed.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);
}

export function AdminProductsPage({ onBack, showToast }) {
  const { items, status, errorMessage, reload } = useAdminList(() => fetchAdminProducts({ size: 100 }));
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_PRODUCT_FORM);
  const isEditing = editingId != null;

  const reset = () => {
    setEditingId(null);
    setForm(EMPTY_PRODUCT_FORM);
  };

  const edit = (product) => {
    const productId = product.productId ?? product.id;
    setEditingId(productId);
    setForm({
      name: product.name ?? "",
      description: product.description ?? "",
      category: product.category ?? "COUPON",
      price: String(product.price ?? ""),
      originalPrice: String(product.originalPrice ?? ""),
      stock: String(product.stock ?? ""),
      imageUrls: Array.isArray(product.imageUrls) ? JSON.stringify(product.imageUrls) : product.imageUrls ?? "",
      merchantName: product.merchantName ?? "",
      validityDays: String(product.validityDays ?? ""),
      maxPerPerson: String(product.maxPerPerson ?? "1"),
      status: product.status ?? "ON_SALE",
    });
  };

  const save = async () => {
    if (!form.name.trim() || !form.category.trim() || !form.price || !form.stock || !form.maxPerPerson) {
      showToast("상품명, 카테고리, 가격, 재고, 1인 제한 수량은 필수입니다.");
      return;
    }
    let imageUrls;
    try {
      imageUrls = parseImageUrlsInput(form.imageUrls);
    } catch {
      showToast("이미지 URL은 JSON 배열 또는 쉼표/줄바꿈 목록으로 입력해주세요.");
      return;
    }
    const payload = {
      name: form.name.trim(),
      category: form.category.trim(),
      price: Number(form.price),
      stock: Number(form.stock),
      maxPerPerson: Number(form.maxPerPerson),
      ...(form.description.trim() ? { description: form.description.trim() } : {}),
      ...(form.originalPrice ? { originalPrice: Number(form.originalPrice) } : {}),
      ...(imageUrls ? { imageUrls } : {}),
      ...(form.merchantName.trim() ? { merchantName: form.merchantName.trim() } : {}),
      ...(form.validityDays ? { validityDays: Number(form.validityDays) } : {}),
      ...(isEditing ? { status: form.status } : {}),
    };
    try {
      if (isEditing) await updateAdminProduct(editingId, payload);
      else await createAdminProduct(payload);
      showToast(isEditing ? "상품을 수정했습니다." : "상품을 등록했습니다.");
      reset();
      reload();
    } catch (error) {
      showToast(getApiErrorHint(error));
    }
  };

  const remove = async (productId) => {
    try {
      await deleteAdminProduct(productId);
      showToast("상품을 숨김 처리했습니다.");
      reload();
    } catch (error) {
      showToast(getApiErrorHint(error));
    }
  };

  return (
    <AdminShell title="상품 관리" onBack={onBack}>
      <AdminCard style={{ background: "#FFF7D7" }}>
        <div style={{ fontSize: 14, color: "#8A4B00", fontWeight: 700 }}>
          관리자 상품 목록 전용 API가 없어 현재 공개 상품 목록 기준으로 표시합니다. 숨김 처리된 상품까지 보려면 백엔드 관리자 목록 API가 필요합니다.
        </div>
      </AdminCard>
      <AdminCard>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <input placeholder="상품명" value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))} style={adminInputStyle} />
          <input placeholder="카테고리" value={form.category} onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))} style={adminInputStyle} />
          <input placeholder="가격" type="number" value={form.price} onChange={(e) => setForm(prev => ({ ...prev, price: e.target.value }))} style={adminInputStyle} />
          <input placeholder="원가" type="number" value={form.originalPrice} onChange={(e) => setForm(prev => ({ ...prev, originalPrice: e.target.value }))} style={adminInputStyle} />
          <input placeholder="재고" type="number" value={form.stock} onChange={(e) => setForm(prev => ({ ...prev, stock: e.target.value }))} style={adminInputStyle} />
          <input placeholder="1인 제한 수량" type="number" value={form.maxPerPerson} onChange={(e) => setForm(prev => ({ ...prev, maxPerPerson: e.target.value }))} style={adminInputStyle} />
          <input placeholder="유효일수" type="number" value={form.validityDays} onChange={(e) => setForm(prev => ({ ...prev, validityDays: e.target.value }))} style={adminInputStyle} />
          <input placeholder="상인명" value={form.merchantName} onChange={(e) => setForm(prev => ({ ...prev, merchantName: e.target.value }))} style={adminInputStyle} />
          {isEditing && (
            <select value={form.status} onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))} style={adminInputStyle}>
              <option value="ON_SALE">ON_SALE</option>
              <option value="HIDDEN">HIDDEN</option>
              <option value="SOLD_OUT">SOLD_OUT</option>
            </select>
          )}
          <input placeholder="이미지 URL JSON 또는 문자열" value={form.imageUrls} onChange={(e) => setForm(prev => ({ ...prev, imageUrls: e.target.value }))} style={{ ...adminInputStyle, gridColumn: "1 / -1" }} />
          <textarea placeholder="상품 설명" value={form.description} onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))} style={{ ...adminInputStyle, gridColumn: "1 / -1", minHeight: 80, resize: "vertical" }} />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {isEditing && <AdminButton tone="subtle" onClick={reset} style={{ flex: 1 }}>새 등록으로 전환</AdminButton>}
          <AdminButton onClick={save} style={{ flex: 2 }}>{isEditing ? "수정 저장" : "상품 등록"}</AdminButton>
        </div>
      </AdminCard>
      <AdminLoadState status={status} errorMessage={errorMessage} emptyTitle="표시할 상품이 없습니다." emptyDescription="상품을 등록하면 이곳에 표시됩니다." onRetry={reload} />
      {status === "success" && items.map((product) => {
        const productId = product.productId ?? product.id;
        return (
          <AdminCard key={productId}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <strong style={{ color: COLORS.primary }}>{product.name}</strong>
              <AdminStatusBadge status={product.status ?? "ACTIVE"} />
            </div>
            <div style={{ marginTop: 8, color: COLORS.textMuted, fontSize: 14 }}>{product.category} · 재고 {formatNumber(product.stock)} · 판매 {formatNumber(product.soldCount)}</div>
            <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: COLORS.primary }}>{formatNumber(product.price)} 엽전</div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <AdminButton tone="subtle" onClick={() => edit(product)} style={{ flex: 1 }}>수정</AdminButton>
              <AdminButton tone="danger" onClick={() => remove(productId)} style={{ flex: 1 }}>숨김</AdminButton>
            </div>
          </AdminCard>
        );
      })}
    </AdminShell>
  );
}

const EMPTY_FESTIVAL_FORM = {
  name: "",
  description: "",
  region: "",
  address: "",
  startDate: "",
  endDate: "",
  imageUrl: "",
  relatedUrl: "",
  status: "ACTIVE",
};

export function AdminFestivalsPage({ onBack, showToast }) {
  const { items, status, errorMessage, reload } = useAdminList(() => fetchAdminFestivals({ size: 100 }));
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FESTIVAL_FORM);
  const isEditing = editingId != null;

  const reset = () => {
    setEditingId(null);
    setForm(EMPTY_FESTIVAL_FORM);
  };

  const edit = (festival) => {
    const festivalId = festival.festivalId ?? festival.id;
    setEditingId(festivalId);
    setForm({
      name: festival.name ?? "",
      description: festival.description ?? "",
      region: festival.region ?? "",
      address: festival.address ?? "",
      startDate: festival.startDate ?? "",
      endDate: festival.endDate ?? "",
      imageUrl: festival.imageUrl ?? "",
      relatedUrl: festival.relatedUrl ?? "",
      status: festival.status ?? "ACTIVE",
    });
  };

  const save = async () => {
    if (!form.name.trim() || !form.region.trim() || !form.address.trim() || !form.startDate || !form.endDate) {
      showToast("축제명, 지역, 주소, 시작일, 종료일은 필수입니다.");
      return;
    }
    const payload = {
      name: form.name.trim(),
      region: form.region.trim(),
      address: form.address.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
      ...(form.description.trim() ? { description: form.description.trim() } : {}),
      ...(form.imageUrl.trim() ? { imageUrl: form.imageUrl.trim() } : {}),
      ...(form.relatedUrl.trim() ? { relatedUrl: form.relatedUrl.trim() } : {}),
      ...(isEditing ? { status: form.status } : {}),
    };
    try {
      if (isEditing) await updateAdminFestival(editingId, payload);
      else await createAdminFestival(payload);
      showToast(isEditing ? "축제를 수정했습니다." : "축제를 등록했습니다.");
      reset();
      reload();
    } catch (error) {
      showToast(getApiErrorHint(error));
    }
  };

  const remove = async (festivalId) => {
    try {
      await deleteAdminFestival(festivalId);
      showToast("축제를 삭제했습니다.");
      reload();
    } catch (error) {
      showToast(getApiErrorHint(error));
    }
  };

  return (
    <AdminShell title="축제 관리" onBack={onBack}>
      <AdminCard>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <input placeholder="축제명" value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))} style={adminInputStyle} />
          <input placeholder="지역" value={form.region} onChange={(e) => setForm(prev => ({ ...prev, region: e.target.value }))} style={adminInputStyle} />
          <input placeholder="주소" value={form.address} onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))} style={{ ...adminInputStyle, gridColumn: "1 / -1" }} />
          <input type="date" value={form.startDate} onChange={(e) => setForm(prev => ({ ...prev, startDate: e.target.value }))} style={adminInputStyle} />
          <input type="date" value={form.endDate} onChange={(e) => setForm(prev => ({ ...prev, endDate: e.target.value }))} style={adminInputStyle} />
          <input placeholder="이미지 URL" value={form.imageUrl} onChange={(e) => setForm(prev => ({ ...prev, imageUrl: e.target.value }))} style={{ ...adminInputStyle, gridColumn: "1 / -1" }} />
          <input placeholder="관련 URL" value={form.relatedUrl} onChange={(e) => setForm(prev => ({ ...prev, relatedUrl: e.target.value }))} style={{ ...adminInputStyle, gridColumn: "1 / -1" }} />
          {isEditing && (
            <select value={form.status} onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))} style={adminInputStyle}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="HIDDEN">HIDDEN</option>
              <option value="DELETED">DELETED</option>
            </select>
          )}
          <textarea placeholder="축제 설명" value={form.description} onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))} style={{ ...adminInputStyle, gridColumn: "1 / -1", minHeight: 80, resize: "vertical" }} />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {isEditing && <AdminButton tone="subtle" onClick={reset} style={{ flex: 1 }}>새 등록으로 전환</AdminButton>}
          <AdminButton onClick={save} style={{ flex: 2 }}>{isEditing ? "수정 저장" : "축제 등록"}</AdminButton>
        </div>
      </AdminCard>
      <AdminLoadState status={status} errorMessage={errorMessage} emptyTitle="등록된 축제가 없습니다." emptyDescription="축제를 등록하거나 데이터를 수집하면 이곳에 표시됩니다." onRetry={reload} />
      {status === "success" && items.map((festival) => {
        const festivalId = festival.festivalId ?? festival.id;
        return (
          <AdminCard key={festivalId}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <strong style={{ color: COLORS.primary }}>{festival.name}</strong>
              <AdminStatusBadge status={festival.status} />
            </div>
            <div style={{ marginTop: 8, color: COLORS.textMuted, fontSize: 14 }}>{festival.region ?? "-"} · {festival.startDate ?? "-"} ~ {festival.endDate ?? "-"}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <AdminButton tone="subtle" onClick={() => edit(festival)} style={{ flex: 1 }}>수정</AdminButton>
              <AdminButton tone="danger" onClick={() => remove(festivalId)} style={{ flex: 1 }}>삭제</AdminButton>
            </div>
          </AdminCard>
        );
      })}
    </AdminShell>
  );
}

export function AdminShopsPage({ onBack, showToast }) {
  const [shopId, setShopId] = useState("");
  const [shop, setShop] = useState(null);
  const [status, setStatus] = useState("idle");
  const [form, setForm] = useState({ status: "ACTIVE", description: "", phone: "", operatingHours: "", placeId: "" });

  const loadShop = async () => {
    if (!shopId) {
      showToast("조회할 가게 ID를 입력해주세요.");
      return;
    }
    setStatus("loading");
    try {
      const data = await fetchAdminShopDetail(shopId);
      setShop(data);
      setForm({
        status: data.status ?? "ACTIVE",
        description: data.description ?? "",
        phone: data.phone ?? "",
        operatingHours: data.operatingHours ?? "",
        placeId: data.placeId != null ? String(data.placeId) : "",
      });
      setStatus("success");
    } catch (error) {
      setShop(null);
      setStatus("error");
      showToast(getApiErrorHint(error));
    }
  };

  const saveBasic = async () => {
    if (!shop?.id && !shopId) return showToast("가게를 먼저 조회해주세요.");
    const targetId = shop?.id ?? shopId;
    const body = {
      ...(form.description.trim() ? { description: form.description.trim() } : {}),
      ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
      ...(form.operatingHours.trim() ? { operatingHours: form.operatingHours.trim() } : {}),
    };
    if (Object.keys(body).length === 0) {
      showToast("수정할 값을 입력해주세요.");
      return;
    }
    try {
      const updated = await updateAdminShop(targetId, body);
      setShop(updated);
      showToast("가게 정보를 수정했습니다.");
    } catch (error) {
      showToast(getApiErrorHint(error));
    }
  };

  const saveStatus = async () => {
    if (!shop?.id && !shopId) return showToast("가게를 먼저 조회해주세요.");
    try {
      await updateAdminShopStatus(shop?.id ?? shopId, form.status);
      setShop(prev => prev ? { ...prev, status: form.status } : prev);
      showToast("가게 상태를 변경했습니다.");
    } catch (error) {
      showToast(getApiErrorHint(error));
    }
  };

  const savePlace = async () => {
    if (!shop?.id && !shopId) return showToast("가게를 먼저 조회해주세요.");
    try {
      await updateAdminShopPlace(shop?.id ?? shopId, form.placeId ? Number(form.placeId) : null);
      setShop(prev => prev ? { ...prev, placeId: form.placeId ? Number(form.placeId) : null } : prev);
      showToast(form.placeId ? "가게와 장소를 연결했습니다." : "가게 장소 연결을 해제했습니다.");
    } catch (error) {
      showToast(getApiErrorHint(error));
    }
  };

  return (
    <AdminShell title="가게 도구" onBack={onBack}>
      <AdminCard style={{ background: "#FFF7D7" }}>
        <div style={{ fontSize: 14, color: "#8A4B00", fontWeight: 700 }}>
          관리자 가게 목록 API는 OpenAPI 명세에 없습니다. 현재는 shopId를 입력해 단건 조회/수정/상태 변경/장소 연결만 할 수 있습니다.
        </div>
      </AdminCard>
      <AdminCard>
        <div style={{ display: "flex", gap: 8 }}>
          <input placeholder="가게 ID" type="number" value={shopId} onChange={(e) => setShopId(e.target.value)} style={{ ...adminInputStyle, flex: 1 }} />
          <AdminButton onClick={loadShop}>조회</AdminButton>
        </div>
      </AdminCard>
      {status === "loading" && <div style={{ margin: 16 }}><SkeletonList count={2} /></div>}
      {status === "error" && <div style={{ margin: 16 }}><ErrorState title="가게를 불러오지 못했습니다." description="shopId와 관리자 권한을 확인해주세요." onRetry={loadShop} /></div>}
      {shop && (
        <AdminCard>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <strong style={{ color: COLORS.primary }}>{shop.shopName ?? shop.name ?? `가게 ${shop.id}`}</strong>
            <AdminStatusBadge status={shop.status} />
          </div>
          <div style={{ marginTop: 8, color: COLORS.textMuted, fontSize: 14 }}>{shop.category ?? "-"} · {shop.address ?? "-"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
            <select value={form.status} onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))} style={adminInputStyle}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
            <AdminButton onClick={saveStatus}>상태 저장</AdminButton>
            <input placeholder="연결할 placeId, 비우면 해제" value={form.placeId} onChange={(e) => setForm(prev => ({ ...prev, placeId: e.target.value }))} style={adminInputStyle} />
            <AdminButton onClick={savePlace}>장소 연결 저장</AdminButton>
            <input placeholder="전화번호" value={form.phone} onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))} style={adminInputStyle} />
            <input placeholder="운영시간" value={form.operatingHours} onChange={(e) => setForm(prev => ({ ...prev, operatingHours: e.target.value }))} style={adminInputStyle} />
            <textarea placeholder="가게 소개" value={form.description} onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))} style={{ ...adminInputStyle, gridColumn: "1 / -1", minHeight: 90, resize: "vertical" }} />
          </div>
          <AdminButton onClick={saveBasic} style={{ width: "100%", marginTop: 10 }}>기본 정보 저장</AdminButton>
        </AdminCard>
      )}
    </AdminShell>
  );
}
