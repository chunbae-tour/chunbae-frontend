import { useEffect, useState } from "react";
import { EmptyState, ErrorState, SkeletonList } from "../../components/common";
import { COLORS, S } from "../../constants/colors";
import {
  approveMerchantApplication,
  createAdminPlace,
  deleteAdminPlace,
  fetchAdminContents,
  fetchAdminDashboard,
  fetchAdminReports,
  fetchAdminUsers,
  fetchFestivalsNow,
  fetchMerchantApplications,
  rejectMerchantApplication,
  resolveAdminReport,
  suspendAdminUser,
  syncTouristPlaces,
  syncTraditionalMarkets,
  unsuspendAdminUser,
  updateAdminPlace,
} from "../../services/adminService.js";

function getApiErrorHint(error) {
  return error?.message || "백엔드 연결 상태를 확인한 뒤 다시 시도해주세요.";
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
          {[
            { icon: "👥", label: "유저 관리", key: "adminUsers" },
            { icon: "🏪", label: "상인 신청", key: "adminMerchant", badge: dashboardData.pendingMerchantApplications },
            { icon: "🚨", label: "신고 관리", key: "adminReports" },
            { icon: "📍", label: "콘텐츠 관리", key: "adminContent" },
          ].map((m, i) => (
            <div key={i} onClick={() => onNav(m.key)} style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", borderBottom: i < 3 ? "0.5px solid rgba(0,0,0,0.05)" : "none" }}>
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
    if (user.status === "정상") {
      await suspendAdminUser(user.id).catch(() => {});
      showToast("정지 처리되었습니다.");
      setUsers(prev => prev.map(item => item.id === user.id ? { ...item, status: "정지" } : item));
      return;
    }
    await unsuspendAdminUser(user.id).catch(() => {});
    showToast("정지가 해제되었습니다.");
    setUsers(prev => prev.map(item => item.id === user.id ? { ...item, status: "정상" } : item));
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
    await resolveAdminReport(id, action === "삭제" ? "DELETE" : "DISMISS").catch(() => {});
    showToast(action === "삭제" ? "콘텐츠가 삭제되었습니다." : "신고가 무시되었습니다.");
    setReports(prev => prev.map(r => r.id === id ? { ...r, status: "처리완료" } : r));
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
    if (action === "승인") {
      await approveMerchantApplication(id).catch(() => {});
    } else {
      await rejectMerchantApplication(id).catch(() => {});
    }
    showToast(action === "승인" ? "✅ 상인 신청이 승인되었습니다." : "❌ 상인 신청이 거절되었습니다.");
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: action === "승인" ? "승인" : "거절" } : r));
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
