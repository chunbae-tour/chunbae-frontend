import { useEffect, useState } from "react";
import { EmptyState, SkeletonList } from "../../components/common";
import { COLORS, S } from "../../constants/colors";
import {
  approveMerchantApplication,
  deleteAdminPlace,
  fetchAdminDashboard,
  fetchAdminPlaces,
  fetchAdminReports,
  fetchAdminUsers,
  fetchMerchantApplications,
  MOCK_ADMIN_DASHBOARD,
  MOCK_ADMIN_CONTENTS,
  MOCK_ADMIN_REPORTS,
  MOCK_ADMIN_USERS,
  MOCK_MERCHANT_APPLICATIONS,
  rejectMerchantApplication,
  resolveAdminReport,
  suspendAdminUser,
  syncTraditionalMarkets,
  unsuspendAdminUser,
} from "../../services/adminService.js";

// ─── 관리자 대시보드 ──────────────────────────────────────────────────
export function AdminDashboardPage({ onBack, onNav }) {
  const [dashboard, setDashboard] = useState(MOCK_ADMIN_DASHBOARD);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let ignore = false;

    fetchAdminDashboard()
      .then((data) => {
        if (ignore) return;
        setDashboard(data);
        setStatus("success");
      })
      .catch(() => {
        if (ignore) return;
        setDashboard(MOCK_ADMIN_DASHBOARD);
        setStatus("mock");
      });

    return () => { ignore = true; };
  }, []);

  const stats = [
    { label: "전체 회원", value: Number(dashboard.totalUsers || 0).toLocaleString(), icon: "👥" },
    { label: "전체 상인", value: Number(dashboard.totalMerchants || 0).toLocaleString(), icon: "🏪" },
    { label: "미처리 신고", value: Number(dashboard.pendingReports || 0).toLocaleString(), icon: "🚨", alert: true },
    { label: "상인 신청 대기", value: Number(dashboard.pendingMerchantApplications || 0).toLocaleString(), icon: "📋", alert: true },
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
          {/* TODO: GET /admin/dashboard API 연동 */}
          {status === "mock" && (
            <div style={{ gridColumn: "1 / -1", background: "#FFF3D0", borderRadius: 12, padding: "10px 14px", color: "#B87800", fontSize: 14 }}>
              관리자 API 연결 전 mock 대시보드입니다.
            </div>
          )}
          {stats.map(s => (
            <div key={s.label} style={{ background: "#fff", borderRadius: 16, padding: 16, border: s.alert ? `2px solid #E24B4A` : "0.5px solid rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: s.alert ? "#E24B4A" : COLORS.primary }}>{s.value}</div>
              <div style={{ fontSize: 14, color: COLORS.textMuted, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* 오늘 현황 */}
        <div style={{ background: "#fff", margin: 16, borderRadius: 16, padding: 16, border: "0.5px solid rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary, marginBottom: 12 }}>📊 오늘 현황</div>
          {[
            ["💰 오늘 결제", `${Number(dashboard.todayPaymentAmount || 0).toLocaleString()} 엽전`],
            ["👤 신규 가입", `${Number(dashboard.newUsersToday || 0).toLocaleString()}명`],
            ["💬 새 채팅방", `${Number(dashboard.newChatRoomsToday || 0).toLocaleString()}개`],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "0.5px solid rgba(0,0,0,0.05)" }}>
              <span style={{ fontSize: 14, color: COLORS.textMuted }}>{k}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary }}>{v}</span>
            </div>
          ))}
        </div>

        {/* 빠른 메뉴 */}
        <div style={{ background: "#fff", margin: "0 16px 16px", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", fontSize: 14, fontWeight: 700, color: COLORS.textMuted, borderBottom: "0.5px solid rgba(0,0,0,0.05)" }}>빠른 메뉴</div>
          {[
            { icon: "👥", label: "유저 관리", key: "adminUsers" },
            { icon: "🏪", label: "상인 신청", key: "adminMerchant", badge: dashboard.pendingMerchantApplications },
            { icon: "🚨", label: "신고 관리", key: "adminReports", badge: dashboard.pendingReports },
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
  const [users, setUsers] = useState(MOCK_ADMIN_USERS);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let ignore = false;
    const timer = setTimeout(() => {
      fetchAdminUsers({ keyword: query, status: filter })
        .then((data) => {
          if (ignore) return;
          setUsers(data);
          setStatus(data.length > 0 ? "success" : "empty");
        })
        .catch(() => {
          if (ignore) return;
          setUsers(MOCK_ADMIN_USERS);
          setStatus("mock");
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
        {status === "mock" && <div style={{ background: "#FFF3D0", margin: 16, borderRadius: 12, padding: "10px 14px", color: "#B87800", fontSize: 14 }}>유저 관리 API 연결 전 mock 목록입니다.</div>}
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
  const [reports, setReports] = useState(MOCK_ADMIN_REPORTS);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let ignore = false;

    fetchAdminReports(tab)
      .then((data) => {
        if (ignore) return;
        setReports(data);
        setStatus(data.length > 0 ? "success" : "empty");
      })
      .catch(() => {
        if (ignore) return;
        setReports(MOCK_ADMIN_REPORTS);
        setStatus("mock");
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
        {status === "mock" && <div style={{ background: "#FFF3D0", margin: 16, borderRadius: 12, padding: "10px 14px", color: "#B87800", fontSize: 14 }}>신고 API 연결 전 mock 목록입니다.</div>}
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
export function AdminContentPage({ onBack, showToast }) {
  const [contents, setContents] = useState(MOCK_ADMIN_CONTENTS);
  const [filter, setFilter] = useState("전체");
  const [status, setStatus] = useState("loading");
  const [syncingMarkets, setSyncingMarkets] = useState(false);

  const loadContents = () => {
    setStatus("loading");
    return fetchAdminPlaces({ category: filter })
      .then((data) => {
        setContents(data);
        setStatus(data.length > 0 ? "success" : "empty");
      })
      .catch(() => {
        setContents(MOCK_ADMIN_CONTENTS);
        setStatus("mock");
      });
  };

  useEffect(() => {
    let ignore = false;

    setStatus("loading");
    fetchAdminPlaces({ category: filter })
      .then((data) => {
        if (ignore) return;
        setContents(data);
        setStatus(data.length > 0 ? "success" : "empty");
      })
      .catch(() => {
        if (ignore) return;
        setContents(MOCK_ADMIN_CONTENTS);
        setStatus("mock");
      });

    return () => { ignore = true; };
  }, [filter]);

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

  const toggle = (id) => {
    // TODO: 공개/비공개 전환 API가 별도로 확정되면 DELETE 대신 PATCH/PUT로 연결합니다.
    setContents(prev => prev.map(c => {
      if (c.id !== id) return c;
      if (c.readOnly) {
        showToast("전통시장 동기화 데이터는 현재 읽기 전용입니다.");
        return c;
      }
      return { ...c, status: c.status === "공개" ? "비공개" : "공개" };
    }));
  };

  const filtered = filter === "전체" ? contents : contents.filter(c => c.type === filter);

  return (
    <div style={S.screen}>
      <div style={{ background: COLORS.primary, padding: "44px 16px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <span onClick={onBack} style={{ color: "#fff", fontSize: 20, cursor: "pointer" }}>←</span>
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>콘텐츠 관리</span>
      </div>
      <div style={{ display: "flex", gap: 8, padding: "12px 16px", background: "#fff", borderBottom: "0.5px solid rgba(0,0,0,0.06)" }}>
        {["전체", "관광지", "전통시장"].map(f => (
          <div key={f} onClick={() => setFilter(f)} style={{ padding: "6px 16px", borderRadius: 20, fontSize: 14, fontWeight: 600, cursor: "pointer", background: filter === f ? COLORS.primary : COLORS.bg, color: filter === f ? "#fff" : COLORS.textMuted }}>{f}</div>
        ))}
      </div>
      <div style={S.scrollArea}>
        <div style={{ padding: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginBottom: 16 }}>
            <button type="button" onClick={() => showToast("관광지/시장 추가 (준비 중)")} style={{ border: 0, background: COLORS.accent, color: COLORS.primary, borderRadius: 12, padding: "12px 0", textAlign: "center", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>+ 새 콘텐츠 추가</button>
            <button type="button" disabled={syncingMarkets} onClick={handleTraditionalMarketSync} style={{ border: "1px solid rgba(47,133,95,0.2)", background: syncingMarkets ? "#F7F5F0" : COLORS.greenBg, color: syncingMarkets ? COLORS.textMuted : COLORS.green, borderRadius: 12, padding: "12px 0", textAlign: "center", fontWeight: 700, cursor: syncingMarkets ? "wait" : "pointer", fontFamily: "inherit" }}>
              {syncingMarkets ? "전통시장 동기화 중..." : "전통시장 데이터 동기화"}
            </button>
          </div>
          {status === "loading" && <SkeletonList count={4} />}
          {status === "mock" && <div style={{ background: "#FFF3D0", borderRadius: 12, padding: "10px 14px", color: "#B87800", fontSize: 14, marginBottom: 10 }}>관리자 콘텐츠 API 연결 전 mock 목록입니다.</div>}
          {status === "empty" && (
            <EmptyState icon="📍" title="표시할 콘텐츠가 없습니다." description="카테고리 필터를 바꾸거나 새 콘텐츠를 추가해보세요." />
          )}
          {filtered.map(c => (
            <div key={c.id} style={{ background: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, border: "0.5px solid rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, background: c.type === "관광지" ? "#FEE8E8" : COLORS.greenBg, color: c.type === "관광지" ? "#A32D2D" : COLORS.green, borderRadius: 6, padding: "2px 8px", fontWeight: 700 }}>{c.type}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.primary }}>{c.name}</span>
                </div>
                <div onClick={() => toggle(c.id)} style={{ width: 48, height: 26, borderRadius: 13, background: c.status === "공개" ? COLORS.green : "#ccc", position: "relative", cursor: c.readOnly ? "not-allowed" : "pointer", opacity: c.readOnly ? 0.7 : 1 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: c.status === "공개" ? 25 : 3, transition: "left 0.2s" }} />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ fontSize: 14, color: c.status === "공개" ? COLORS.green : COLORS.textMuted, fontWeight: 600 }}>{c.status}</span>
                  <span style={{ fontSize: 14, color: COLORS.textMuted }}>· {c.updatedAt}</span>
                  {c.readOnly && <span style={{ fontSize: 14, color: COLORS.textMuted }}>· 동기화 데이터</span>}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <span onClick={() => showToast(c.readOnly ? "전통시장 동기화 데이터 수정 API가 필요합니다." : "콘텐츠 수정")} style={{ fontSize: 18, cursor: "pointer", opacity: c.readOnly ? 0.55 : 1 }}>✏️</span>
                  <span onClick={async () => {
                    if (c.readOnly) {
                      showToast("전통시장 동기화 데이터 삭제 API가 필요합니다.");
                      return;
                    }
                    await deleteAdminPlace(c.id).catch(() => {});
                    setContents(prev => prev.filter(x => x.id !== c.id));
                    showToast("삭제되었습니다.");
                  }} style={{ fontSize: 18, cursor: "pointer", opacity: c.readOnly ? 0.55 : 1 }}>🗑️</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
export function AdminMerchantPage({ onBack, showToast }) {
  const [requests, setRequests] = useState(MOCK_MERCHANT_APPLICATIONS);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let ignore = false;

    fetchMerchantApplications()
      .then((data) => {
        if (ignore) return;
        setRequests(data);
        setStatus(data.length > 0 ? "success" : "empty");
      })
      .catch(() => {
        if (ignore) return;
        setRequests(MOCK_MERCHANT_APPLICATIONS);
        setStatus("mock");
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
        {status === "mock" && <div style={{ background: "#FFF3D0", margin: 16, borderRadius: 12, padding: "10px 14px", color: "#B87800", fontSize: 14 }}>상인 신청 API 연결 전 mock 목록입니다.</div>}
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
