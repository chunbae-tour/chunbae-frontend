import { useEffect, useState } from "react";
import { COLORS, S } from "../../constants/colors";
import { ConfirmDialog, EmptyState, ErrorState, SkeletonBlock, SkeletonList } from "../../components/common";
import { getApiErrorHint, shouldUseMockFallback } from "../../services/apiClient.js";
import { fetchFestivals, getMockFestivals } from "../../services/festivalService.js";
import { fetchYeopjeonBalance } from "../../services/paymentService.js";
import { deleteAllNotifications, fetchNotifications, fetchNotificationSettings, getMockNotificationSettings, getMockNotifications, markAllNotificationsRead, markNotificationRead, updateNotificationSettings } from "../../services/notificationService.js";
import YeopjeonImg from "../../assets/yeopjeon-icon.png";
import { getPlaceImageUrl } from "../../constants/placeImages.js";
import { fetchPopularSearches, fetchSearchSuggestions, getMockSearchResults, saveSearchKeyword, searchPlaces } from "../../services/searchService.js";

// ─── 마이페이지 ───────────────────────────────────────────────────────
export function MyPage({ onTab, showToast, onLogout, onLogin, user, comfortableView = false, onComfortableViewChange = () => {} }) {
  const isLoggedIn = Boolean(user);
  const role = String(user?.role || "USER").toUpperCase();
  const [balance, setBalance] = useState(0);
  const [balanceStatus, setBalanceStatus] = useState("loading");
  const [balanceError, setBalanceError] = useState("");
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const tripSummary = [
    { label: "찜한 골목", value: "4", action: "wishlist" },
    { label: "동행 대기", value: "1", action: "community" },
    { label: "작성 후기", value: "2", action: "myReview" },
  ];

  useEffect(() => {
    if (!isLoggedIn) {
      setBalanceStatus("idle");
      setBalance(0);
      setBalanceError("");
      return undefined;
    }

    let ignore = false;

    fetchYeopjeonBalance()
      .then((value) => {
        if (ignore) return;
        setBalance(value);
        setBalanceStatus("success");
      })
      .catch((error) => {
        if (ignore) return;
        setBalanceStatus("error");
        setBalanceError(getApiErrorHint(error));
      });

    return () => { ignore = true; };
  }, [isLoggedIn]);

  const confirmLogout = () => {
    setLogoutConfirmOpen(false);
    onLogout();
  };

  return (
    <div style={S.screen}>
      <div style={{ background: COLORS.primary, padding: "44px 20px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ color: "#fff", fontSize: 20, fontWeight: 700 }}>👤 마이페이지</div>
        <span style={{ fontSize: 22, cursor: "pointer" }}>⚙️</span>
      </div>
      <div style={S.scrollArea}>
        {!isLoggedIn ? (
          <>
            <div style={{ background: "#fff", padding: 20, display: "flex", gap: 16, alignItems: "center", marginBottom: 8 }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: COLORS.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>👤</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.primary, marginBottom: 4 }}>로그인이 필요합니다</div>
                <div style={{ fontSize: 14, color: COLORS.textMuted, lineHeight: 1.5 }}>찜, 엽전, 이용 내역은 로그인 후 이용할 수 있어요.</div>
                <button type="button" onClick={onLogin} style={{ marginTop: 10, border: 0, background: COLORS.primary, color: "#fff", borderRadius: 20, padding: "7px 14px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>로그인하기</button>
              </div>
            </div>
            <div style={{ background: "#fff", margin: "0 16px 12px", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", fontSize: 14, fontWeight: 700, color: COLORS.textMuted, borderBottom: "0.5px solid rgba(0,0,0,0.05)" }}>서비스</div>
              <button
                type="button"
                className="settings-row comfortable-view-toggle"
                onClick={() => {
                  const next = !comfortableView;
                  onComfortableViewChange(next);
                  showToast(next ? "편한 보기 모드를 켰습니다." : "편한 보기 모드를 껐습니다.");
                }}
                aria-pressed={comfortableView}
              >
                <div>
                  <strong>편한 보기 모드</strong>
                  <span>글씨와 버튼을 크게 보여드려요.</span>
                </div>
                <em className={comfortableView ? "on" : ""}>{comfortableView ? "ON" : "OFF"}</em>
              </button>
              <div onClick={() => onTab("faq")} style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                <span style={{ fontSize: 14 }}>❓ FAQ</span>
                <span style={{ color: COLORS.textMuted }}>›</span>
              </div>
            </div>
          </>
        ) : (
          <>
        <div style={{ background: "#fff", padding: 20, display: "flex", gap: 16, alignItems: "center", marginBottom: 8 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: COLORS.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>👤</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.primary }}>{user?.nickname || user?.email || "사용자"}</div>
              {role === "MERCHANT" && <span style={{ background: COLORS.accent, color: COLORS.primary, fontSize: 14, fontWeight: 700, borderRadius: 6, padding: "2px 8px" }}>🏪 상인</span>}
              {role === "ADMIN" && <span style={{ background: "#E24B4A", color: "#fff", fontSize: 14, fontWeight: 700, borderRadius: 6, padding: "2px 8px" }}>👑 관리자</span>}
            </div>
            <div style={{ fontSize: 14, color: COLORS.textMuted }}>★ 동행 점수 4.7</div>
            <div onClick={() => showToast("프로필 수정 화면으로 이동합니다")} style={{ marginTop: 6, display: "inline-block", fontSize: 14, color: COLORS.primary, border: "1px solid rgba(0,0,0,0.15)", borderRadius: 20, padding: "4px 12px", cursor: "pointer" }}>프로필 수정</div>
          </div>
        </div>
        <div className="my-balance-card" style={{ background: COLORS.primary, margin: "0 16px 12px", borderRadius: 16, padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
            <img src={YeopjeonImg} alt="" style={{ width: 58, height: 58, borderRadius: "50%", objectFit: "cover", boxShadow: "0 8px 22px rgba(255,180,30,0.28)" }} />
            <div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, marginBottom: 4 }}>엽전 잔액</div>
              {balanceStatus === "loading" ? (
                <div className="my-balance-skeleton" aria-label="엽전 잔액을 불러오는 중입니다.">
                  <SkeletonBlock className="amount" />
                  <SkeletonBlock className="caption" />
                </div>
              ) : (
                <div style={{ color: COLORS.accent, fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{balance.toLocaleString()} 엽전</div>
              )}
            </div>
          </div>
          {balanceStatus === "error" && <div style={{ color: "rgba(255,255,255,0.72)", fontSize: 14, marginBottom: 10 }}>{balanceError}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <div className="my-balance-action" onClick={() => onTab("pay")} style={{ flex: 1, background: COLORS.accent, color: COLORS.primary, borderRadius: 10, padding: "8px 0", textAlign: "center", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>엽전 충전</div>
            <div className="my-balance-action" onClick={() => onTab("qrpay")} style={{ flex: 1, background: "rgba(255,255,255,0.1)", color: "#fff", borderRadius: 10, padding: "8px 0", textAlign: "center", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>🪙 QR 현장결제</div>
            <div className="my-balance-action" onClick={() => onTab("payHistory")} style={{ flex: 1, background: "rgba(255,255,255,0.1)", color: "#fff", borderRadius: 10, padding: "8px 0", textAlign: "center", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>이용 내역</div>
          </div>
        </div>
        <div className="my-trip-board">
          <div className="my-section-head">
            <div>
              <span>내 로컬 여행 현황</span>
              <small>찜, 동행, 후기를 한 번에 확인해요.</small>
            </div>
            <button type="button" onClick={() => onTab("notif")}>알림 보기</button>
          </div>
          <div className="my-trip-grid">
            {tripSummary.map(item => (
              <button key={item.label} type="button" onClick={() => onTab(item.action)}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
          <div className="my-next-card">
            <b>다음 추천 행동</b>
            <span>광장시장 동행 신청 결과를 확인하고, 출발 전 엽전 잔액을 충전해두세요.</span>
          </div>
        </div>
        <div style={{ background: "#fff", margin: "0 16px 12px", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", fontSize: 14, fontWeight: 700, color: COLORS.textMuted, borderBottom: "0.5px solid rgba(0,0,0,0.05)" }}>나의 활동</div>
          {[
            { icon: "❤️", label: "찜 목록", tab: "wishlist" },
            { icon: "✍️", label: "내 리뷰", tab: "myReview" },
            { icon: "🧾", label: "이용 내역", tab: "payHistory" },
            { icon: "🎁", label: "보유 아이템", tab: "ownedItems" },
          ].map((m, i) => (
            <div key={i} onClick={() => m.tab ? onTab(m.tab) : showToast("준비 중입니다")} style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", borderBottom: i < 3 ? "0.5px solid rgba(0,0,0,0.05)" : "none" }}>
              <span style={{ fontSize: 14 }}>{m.icon} {m.label}</span>
              <span style={{ color: COLORS.textMuted }}>›</span>
            </div>
          ))}
        </div>
        {/* 상인 전용 메뉴 */}
        {role === "MERCHANT" && (
          <div style={{ background: "#fff", margin: "0 16px 12px", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", fontSize: 14, fontWeight: 700, color: COLORS.textMuted, borderBottom: "0.5px solid rgba(0,0,0,0.05)" }}>🏪 상인 메뉴</div>
            <div onClick={() => onTab("merchant")} style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
              <span style={{ fontSize: 14 }}>🏪 가게 관리</span>
              <span style={{ color: COLORS.textMuted }}>›</span>
            </div>
          </div>
        )}
        {/* 관리자 전용 메뉴 */}
        {role === "ADMIN" && (
          <div style={{ background: "#fff", margin: "0 16px 12px", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", fontSize: 14, fontWeight: 700, color: COLORS.textMuted, borderBottom: "0.5px solid rgba(0,0,0,0.05)" }}>👑 관리자 메뉴</div>
            <div onClick={() => onTab("adminDashboard")} style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
              <span style={{ fontSize: 14 }}>👑 관리자 대시보드</span>
              <span style={{ color: COLORS.textMuted }}>›</span>
            </div>
          </div>
        )}
        <div style={{ background: "#fff", margin: "0 16px 12px", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", fontSize: 14, fontWeight: 700, color: COLORS.textMuted, borderBottom: "0.5px solid rgba(0,0,0,0.05)" }}>서비스</div>
          <button
            type="button"
            className="settings-row comfortable-view-toggle"
            onClick={() => {
              const next = !comfortableView;
              onComfortableViewChange(next);
              showToast(next ? "편한 보기 모드를 켰습니다." : "편한 보기 모드를 껐습니다.");
            }}
            aria-pressed={comfortableView}
          >
            <div>
              <strong>편한 보기 모드</strong>
              <span>글씨와 버튼을 크게 보여드려요.</span>
            </div>
            <em className={comfortableView ? "on" : ""}>{comfortableView ? "ON" : "OFF"}</em>
          </button>
          {[
            { icon: "🔔", label: "알림 설정", tab: "notificationSettings" },
            { icon: "🌐", label: "언어 설정", tab: null },
            { icon: "❓", label: "FAQ", tab: "faq" },
          ].map((m, i) => (
            <div key={i} onClick={() => m.tab ? onTab(m.tab) : showToast(`${m.label}으로 이동합니다`)} style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", borderBottom: i < 2 ? "0.5px solid rgba(0,0,0,0.05)" : "none" }}>
              <span style={{ fontSize: 14 }}>{m.icon} {m.label}</span>
              <span style={{ color: COLORS.textMuted }}>›</span>
            </div>
          ))}
          <div className="danger-service-action" onClick={() => setLogoutConfirmOpen(true)} style={{ padding: "14px 16px", color: "#E24B4A", fontSize: 14, cursor: "pointer" }}>🚪 로그아웃하기</div>
        </div>
          </>
        )}
      </div>
      <ConfirmDialog
        open={logoutConfirmOpen}
        danger
        title="로그아웃할까요?"
        description="다시 이용하려면 로그인이 필요합니다."
        confirmLabel="로그아웃"
        cancelLabel="취소"
        onConfirm={confirmLogout}
        onCancel={() => setLogoutConfirmOpen(false)}
      />
    </div>
  );
}

export function NotificationSettingsPage({ onBack, showToast }) {
  const [settings, setSettings] = useState(getMockNotificationSettings);
  const [status, setStatus] = useState("loading");  const [errorMessage, setErrorMessage] = useState("");
  const items = [
    { key: "payment", title: "결제/엽전 알림", desc: "충전, QR 결제 승인, 잔액 변동" },
    { key: "companion", title: "동행 채팅 알림", desc: "참여 신청, 수락, 채팅 메시지" },
    { key: "post", title: "게시물 알림", desc: "댓글, 좋아요, 내 게시물 반응" },
    { key: "ad", title: "광고/이벤트 알림", desc: "춘배인증 상점 광고와 이벤트 소식" },
  ];

  const loadSettings = () => {
    let ignore = false;
    setStatus("loading");
    setErrorMessage("");
    fetchNotificationSettings()
      .then((data) => {
        if (ignore) return;
        setSettings(data);
        setStatus("success");
      })
      .catch((error) => {
        if (ignore) return;
        setErrorMessage(getApiErrorHint(error));
        setStatus("error");
        showToast?.(getApiErrorHint(error));
      });
    return () => { ignore = true; };
  };

  useEffect(() => {
    return loadSettings();
  }, [showToast]);

  const toggle = async (key) => {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    localStorage.setItem("chunbae_notification_settings", JSON.stringify(next));

    try {
      const saved = await updateNotificationSettings(next);
      setSettings(saved);
      setStatus("success");
    } catch (error) {
      showToast(getApiErrorHint(error));
    }
  };

  return (
    <div style={S.screen} className="notification-settings-page">
      <div style={{ background: COLORS.primary, padding: "44px 16px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <span onClick={onBack} style={{ color: "#fff", fontSize: 20, cursor: "pointer" }}>←</span>
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>알림 설정</span>
      </div>
      <div style={S.scrollArea}>
        <div className="settings-note">
          프론트에서는 카테고리별 토글 UI를 만들 수 있고, 실제 수신 여부 저장과 푸시 발송 제어는 백엔드 사용자 알림 설정 API가 필요합니다.
        </div>
        {status === "loading" && <div style={{ margin: "0 16px 12px" }}><SkeletonList count={2} /></div>}
        {status === "error" && (
          <div style={{ margin: "0 16px 12px" }}>
            <ErrorState
              title="알림 설정을 불러오지 못했습니다."
              description={errorMessage || "백엔드 연결 상태를 확인한 뒤 다시 시도해주세요."}
              onRetry={loadSettings}
            />
          </div>
        )}
        <div className="settings-list">
          {items.map(item => (
            <button key={item.key} type="button" className="settings-row" onClick={() => toggle(item.key)}>
              <div>
                <strong>{item.title}</strong>
                <span>{item.desc}</span>
              </div>
              <em className={settings[item.key] ? "on" : ""}>{settings[item.key] ? "ON" : "OFF"}</em>
            </button>
          ))}
        </div>
        <div className="owned-items-todo">
          TODO: GET/PUT 내 알림 설정 API, 광고/게시물/채팅/결제 카테고리 enum 협의가 필요합니다.
        </div>
      </div>
    </div>
  );
}

export function FAQPage({ onBack }) {
  const [openId, setOpenId] = useState(1);
  const faqs = [
    { id: 1, q: "엽전 QR 결제는 어떻게 하나요?", a: "현장에서 가게 QR을 스캔하고 금액을 입력하면 상인 확인 후 결제가 완료됩니다." },
    { id: 2, q: "리뷰는 어디서 남길 수 있나요?", a: "결제내역에서 거래한 상점 상세로 이동하거나, 장소/상점 상세 페이지에서 리뷰를 남기는 흐름으로 연결됩니다." },
    { id: 3, q: "동행 채팅방은 누가 만들 수 있나요?", a: "동행 게시글 작성자가 게시글 상세에서 채팅방 생성 버튼을 눌러 만들 수 있습니다." },
    { id: 4, q: "춘배인증 광고는 누가 신청하나요?", a: "춘배인증 상점만 광고 요청이 가능하도록 운영하는 방향입니다. 실제 신청/심사 API는 추후 연결됩니다." },
  ];

  return (
    <div style={S.screen} className="faq-page">
      <div style={{ background: COLORS.primary, padding: "44px 16px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <span onClick={onBack} style={{ color: "#fff", fontSize: 20, cursor: "pointer" }}>←</span>
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>FAQ</span>
      </div>
      <div style={S.scrollArea}>
        <div className="faq-intro">
          <strong>춘배투어 도움말</strong>
          <span>자주 묻는 질문을 빠르게 확인하세요.</span>
        </div>
        <div className="faq-list">
          {faqs.map(item => (
            <button key={item.id} type="button" className={openId === item.id ? "open" : ""} onClick={() => setOpenId(openId === item.id ? null : item.id)}>
              <strong>{item.q}</strong>
              {openId === item.id && <span>{item.a}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 축제 페이지 ──────────────────────────────────────────────────────
export function FestivalPage({ onBack, onCalendar }) {
  const [filter, setFilter] = useState("전체");
  const [festivals, setFestivals] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const loadFestivals = () => {
    setStatus("loading");
    setErrorMessage("");
    fetchFestivals()
      .then((data) => {
        setFestivals(data);
        setStatus(data.length > 0 ? "success" : "empty");
      })
      .catch((error) => {
        if (!shouldUseMockFallback(error)) {
          setFestivals([]);
          setErrorMessage(getApiErrorHint(error));
          setStatus("error");
          return;
        }
        setFestivals(getMockFestivals());
        setStatus("mock");
      });
  };

  useEffect(() => {
    let ignore = false;
    if (!ignore) loadFestivals();
    return () => { ignore = true; };
  }, []);

  const filteredFestivals = filter === "전체"
    ? festivals
    : festivals.filter(festival => `${festival.monthNumber}월` === filter);

  return (
    <div style={S.screen}>
      <div style={{ background: COLORS.primary, padding: "44px 20px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span onClick={onBack} style={{ color: "#fff", fontSize: 20, cursor: "pointer" }}>←</span>
            <div style={{ color: "#fff", fontSize: 20, fontWeight: 700 }}>🎉 축제 & 이벤트</div>
          </div>
          <div onClick={onCalendar} style={{ background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 14, fontWeight: 600, borderRadius: 20, padding: "6px 14px", cursor: "pointer" }}>📅 캘린더</div>
        </div>
      </div>
      <div style={S.scrollArea}>
        <div style={{ padding: 16 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {["전체", "6월", "7월"].map(f => (
              <div key={f} onClick={() => setFilter(f)} style={{ padding: "6px 16px", borderRadius: 20, fontSize: 14, fontWeight: 600, cursor: "pointer", background: filter === f ? COLORS.primary : COLORS.bg, color: filter === f ? "#fff" : COLORS.textMuted }}>{f}</div>
            ))}
          </div>
          {status === "loading" && <SkeletonList count={3} />}
          {status === "mock" && (
            <div style={{ background: "#FFF3D0", borderRadius: 12, padding: "10px 14px", color: "#B87800", fontSize: 14, marginBottom: 12 }}>
              축제 API 미확정으로 현재는 목업 데이터를 보여줍니다.
            </div>
          )}
          {status === "error" && (
            <ErrorState
              title="축제 정보를 불러오지 못했습니다."
              description={errorMessage || "백엔드 연결 상태를 확인한 뒤 다시 시도해주세요."}
              onRetry={loadFestivals}
            />
          )}
          {status !== "loading" && status !== "error" && filteredFestivals.length === 0 && (
            <EmptyState
              icon="🎉"
              title="표시할 축제가 없습니다."
              description="다른 월을 선택하거나 캘린더에서 일정을 확인해보세요."
              actionLabel="캘린더 보기"
              onAction={onCalendar}
            />
          )}
          {filteredFestivals.map(f => (
            <div key={f.id} style={{ background: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, display: "flex", gap: 14, alignItems: "center", border: "0.5px solid rgba(0,0,0,0.06)" }}>
              <div style={{ background: f.color, borderRadius: 12, padding: "10px 14px", textAlign: "center", minWidth: 52 }}>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>{f.month}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: f.accentColor, lineHeight: 1 }}>{f.day}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.primary, marginBottom: 4 }}>{f.name}</div>
                <div style={{ fontSize: 14, color: COLORS.textMuted }}>📍 {f.location}</div>
                <div style={{ fontSize: 14, color: COLORS.textMuted }}>📅 {f.date}</div>
              </div>
              <span style={{ background: "#FFF3D0", color: "#B87800", fontSize: 14, fontWeight: 700, borderRadius: 8, padding: "4px 10px" }}>{f.dday}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── AR 카메라 페이지 ─────────────────────────────────────────────────
export function ARPage({ onBack }) {
  return (
    <div style={S.screen}>
      <div style={{ background: "#000", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
        <div onClick={onBack} style={{ position: "absolute", top: 50, left: 20, color: "#fff", fontSize: 14, cursor: "pointer", background: "rgba(255,255,255,0.2)", padding: "8px 14px", borderRadius: 20 }}>← 닫기</div>
        <div style={{ fontSize: 60, marginBottom: 16 }}>📷</div>
        <div style={{ color: "#fff", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>AR 카메라</div>
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, textAlign: "center", padding: "0 40px", lineHeight: 1.6 }}>카메라를 가게에 갖다 대면<br />가게 정보를 확인할 수 있어요</div>
        {/* TODO: Web AR / QR 스캔 연동 */}
        <div style={{ marginTop: 32, background: "rgba(255,180,30,0.15)", border: "1px solid rgba(255,180,30,0.4)", borderRadius: 16, padding: "16px 24px", textAlign: "center" }}>
          <div style={{ color: COLORS.accent, fontWeight: 700, marginBottom: 4 }}>📍 광장시장 — 영호네 포장마차</div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 14 }}>★ 4.8 · 빈대떡 5,000엽전</div>
        </div>
        <div style={{ position: "absolute", bottom: 40, width: 64, height: 64, background: "#fff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, cursor: "pointer" }}>📷</div>
      </div>
    </div>
  );
}

// ─── 알림 페이지 ──────────────────────────────────────────────────────
export function NotificationPage({ onBack }) {
  const [notifications, setNotifications] = useState([]);
  const [status, setStatus] = useState("loading");
  const [markingAll, setMarkingAll] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const loadNotifications = () => {
    setStatus("loading");
    setErrorMessage("");
    fetchNotifications()
      .then((data) => {
        setNotifications(data);
        setStatus(data.length > 0 ? "success" : "empty");
      })
      .catch((error) => {
        if (!shouldUseMockFallback(error)) {
          setNotifications([]);
          setErrorMessage(getApiErrorHint(error));
          setStatus("error");
          return;
        }
        setNotifications(getMockNotifications());
        setStatus("mock");
      });
  };

  useEffect(() => {
    let ignore = false;
    if (!ignore) loadNotifications();
    return () => { ignore = true; };
  }, []);

  const markOne = async (id) => {
    await markNotificationRead(id).catch(() => {});
    setNotifications(notifications.map(x => x.id === id ? { ...x, read: true } : x));
  };

  const markAll = async () => {
    if (markingAll) return;
    setMarkingAll(true);
    await markAllNotificationsRead().catch(() => {});
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    setMarkingAll(false);
  };

  const clearAll = async () => {
    setDeleteConfirmOpen(false);
    try {
      await deleteAllNotifications();
    } catch (error) {
      if (!shouldUseMockFallback(error)) return;
    }
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const getNotificationType = (text = "") => {
    if (text.includes("결제") || text.includes("엽전")) return "payment";
    if (text.includes("참여") || text.includes("채팅")) return "companion";
    if (text.includes("리뷰")) return "review";
    return "general";
  };

  return (
    <div style={S.screen}>
      <div style={{ background: COLORS.primary, padding: "44px 20px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span onClick={onBack} style={{ color: "#fff", cursor: "pointer" }}>←</span>
          <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>알림</span>
        </div>
        <div className="notification-top-actions">
          <button type="button" onClick={markAll} disabled={markingAll}>{markingAll ? "처리 중..." : "전체 읽음"}</button>
          <button type="button" onClick={() => setDeleteConfirmOpen(true)}>전체 삭제</button>
        </div>
      </div>
      <div style={S.scrollArea}>
        <div className="notification-summary">
          <div>
            <span>읽지 않은 알림</span>
            <strong>{unreadCount}개</strong>
          </div>
          <p>QR 결제 승인, 동행 신청, 리뷰 반응을 이곳에서 확인합니다.</p>
        </div>
        {status === "loading" && <div style={{ padding: "0 16px 16px" }}><SkeletonList count={4} /></div>}
        {status === "mock" && <div style={{ margin: 16, background: "#FFF3D0", borderRadius: 12, padding: "10px 14px", color: "#B87800", fontSize: 14 }}>알림 API 미확정으로 현재는 목업 알림입니다.</div>}
        {status === "empty" && (
          <div style={{ padding: "0 16px 16px" }}>
            <EmptyState
              icon="🔔"
              title="새 알림이 없습니다."
              description="동행 신청, QR 결제 승인, 리뷰 반응이 생기면 이곳에 모아 보여드릴게요."
            />
          </div>
        )}
        {status === "error" && (
          <div style={{ padding: "0 16px 16px" }}>
            <ErrorState
              title="알림을 불러오지 못했습니다."
              description={errorMessage || "백엔드 연결 상태를 확인한 뒤 다시 시도해주세요."}
              onRetry={loadNotifications}
            />
          </div>
        )}
        {notifications.map(n => {
          const type = getNotificationType(n.text);
          return (
          <div key={n.id} onClick={() => markOne(n.id)} className={`notification-row ${type} ${n.read ? "read" : ""}`}>
            <span style={{ fontSize: 22 }}>{n.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: COLORS.primary, lineHeight: 1.5, marginBottom: 4 }}>{n.text}</div>
              <div style={{ fontSize: 14, color: COLORS.textMuted }}>{n.time}</div>
            </div>
            {!n.read && <span style={{ width: 8, height: 8, background: COLORS.accent, borderRadius: "50%", marginTop: 6, flexShrink: 0 }} />}
          </div>
        );})}
      </div>
      <ConfirmDialog
        open={deleteConfirmOpen}
        danger
        title="모든 알림을 삭제할까요?"
        description="삭제한 알림은 이 화면에서 사라집니다."
        confirmLabel="전체 삭제"
        cancelLabel="취소"
        onConfirm={clearAll}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  );
}

// ─── 검색 페이지 ──────────────────────────────────────────────────────
const SEARCH_SUGGESTIONS = [
  { label: "광장시장 밤골목", query: "광장시장", meta: "빈대떡 · 포차거리 · 야시장" },
  { label: "통인시장 도시락길", query: "통인시장", meta: "엽전 도시락 · 골목 산책" },
  { label: "궁궐 옆 산책", query: "경복궁", meta: "북촌 · 한옥 골목 · 야간 산책" },
  { label: "창덕궁 후원길", query: "창덕궁", meta: "고즈넉한 산책 · 사진 포인트" },
];
const POPULAR_SEARCH_FALLBACK = ["광장시장", "통인시장", "경복궁", "창덕궁", "먹자골목"];

function readRecentSearches() {
  try {
    return JSON.parse(sessionStorage.getItem("chunbae_recent_searches") || "[]");
  } catch {
    return [];
  }
}

function writeRecentSearch(keyword) {
  const next = [keyword, ...readRecentSearches().filter(item => item !== keyword)].slice(0, 5);
  sessionStorage.setItem("chunbae_recent_searches", JSON.stringify(next));
  return next;
}

export function SearchPage({ onBack, onPlaceClick }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [popularSearches, setPopularSearches] = useState(POPULAR_SEARCH_FALLBACK);
  const [recentSearches, setRecentSearches] = useState(readRecentSearches);
  const [suggestions, setSuggestions] = useState([]);
  // TODO: 검색 API가 확정되면 검색어/필터/정렬/페이지네이션 응답으로 교체합니다.
  const normalizedQuery = query.trim();

  useEffect(() => {
    let ignore = false;

    fetchPopularSearches()
      .then((data) => {
        if (ignore) return;
        const values = data
          .map(item => item.keyword || item.query || item.name || item)
          .filter(Boolean)
          .slice(0, 10);
        setPopularSearches(values.length > 0 ? values : POPULAR_SEARCH_FALLBACK);
      })
      .catch(() => setPopularSearches(POPULAR_SEARCH_FALLBACK));

    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    let ignore = false;

    if (!normalizedQuery) {
      setResults([]);
      setStatus("idle");
      setSuggestions([]);
      return () => { ignore = true; };
    }

    setStatus("loading");
    setErrorMessage("");
    const timer = setTimeout(() => {
      fetchSearchSuggestions(normalizedQuery)
        .then((data) => {
          if (ignore) return;
          const values = (Array.isArray(data) ? data : [])
            .map(item => item.keyword || item.query || item.name || item)
            .filter(Boolean)
            .slice(0, 5);
          setSuggestions(values);
        })
        .catch(() => {
          if (ignore) return;
          setSuggestions(POPULAR_SEARCH_FALLBACK.filter(item => item.includes(normalizedQuery)).slice(0, 5));
        });

      searchPlaces({ query: normalizedQuery })
        .then((data) => {
          if (ignore) return;
          setResults(data);
          setStatus(data.length > 0 ? "success" : "empty");
          setRecentSearches(writeRecentSearch(normalizedQuery));
          saveSearchKeyword(normalizedQuery).catch(() => {});
        })
        .catch((error) => {
          if (ignore) return;
          if (!shouldUseMockFallback(error)) {
            setResults([]);
            setErrorMessage(getApiErrorHint(error));
            setStatus("error");
            return;
          }
          const mockResults = getMockSearchResults(normalizedQuery);
          setResults(mockResults);
          setStatus(mockResults.length > 0 ? "mock" : "empty");
          if (mockResults.length > 0) setRecentSearches(writeRecentSearch(normalizedQuery));
        });
    }, 250);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [normalizedQuery, retryKey]);

  return (
    <div style={S.screen} className="search-local-page">
      <div className="search-local-hero">
        <div className="search-local-top">
          <span onClick={onBack}>←</span>
          <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="광장시장 밤골목, 먹자골목 검색..." />
        </div>
        <div className="search-local-copy">
          <span>LOCAL SEARCH</span>
          <strong>붕어빵 냄새 따라 걷는 골목을 찾아보세요.</strong>
          <p>시장, 궁궐, 산책길을 실제 여행 동선처럼 검색할 수 있게 준비 중입니다.</p>
        </div>
      </div>
      <div style={S.scrollArea}>
        {normalizedQuery === "" ? (
          <div className="search-suggestion-shell">
            <div className="search-section-head">
              <span>춘배 추천 검색</span>
              <small>지금 바로 둘러보기 좋은 로컬 포인트</small>
            </div>
            <div className="search-suggestion-grid">
              {SEARCH_SUGGESTIONS.map(s => (
                <button key={s.label} type="button" onClick={() => setQuery(s.query)}>
                  <strong>{s.label}</strong>
                  <span>{s.meta}</span>
                </button>
              ))}
            </div>
            <div className="search-keyword-board">
              <div>
                <strong>인기 검색어</strong>
                <div>
                  {popularSearches.map((item, index) => (
                    <button key={`${item}-${index}`} type="button" onClick={() => setQuery(item)}>
                      <b>{index + 1}</b>
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <strong>최근 검색어</strong>
                <div>
                  {recentSearches.length === 0 ? (
                    <span className="search-empty-keyword">아직 최근 검색어가 없습니다.</span>
                  ) : recentSearches.map(item => (
                    <button key={item} type="button" onClick={() => setQuery(item)}>
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : status === "loading" ? (
          <div className="search-state-card search-loading-card" aria-label="검색 결과를 불러오는 중입니다.">
            <strong>검색 결과를 찾는 중이에요.</strong>
            <span>잠시만 기다리면 장소 카드가 표시됩니다.</span>
            <SkeletonList count={3} />
          </div>
        ) : status === "error" ? (
          <div className="search-state-card">
            <ErrorState
              title="검색 결과를 불러오지 못했습니다."
              description={errorMessage || "백엔드 연결 상태를 확인한 뒤 다시 시도해주세요."}
              actionLabel="다시 검색"
              onRetry={() => setRetryKey(key => key + 1)}
            />
          </div>
        ) : results.length === 0 ? (
          <div className="search-state-card">
            <EmptyState
              icon="검색"
              title="검색 결과가 없습니다."
              description="장소 이름을 조금 더 정확히 입력하거나 다른 골목 키워드를 검색해보세요."
            />
          </div>
        ) : (
          <div className="search-result-shell">
            <div className="search-section-head">
              <span>{status === "mock" ? "목업 " : ""}검색 결과 {results.length}개</span>
              <small>거리와 분위기를 보고 바로 상세로 들어가세요</small>
            </div>
            {suggestions.length > 0 && (
              <div className="search-suggest-row">
                <span>자동완성</span>
                {suggestions.map(item => (
                  <button key={item} type="button" onClick={() => setQuery(item)}>{item}</button>
                ))}
              </div>
            )}
            {results.map(p => {
              const placeImage = getPlaceImageUrl(p);
              return (
              <div key={p.id} onClick={() => onPlaceClick({ ...p, imageUrl: placeImage })} className="search-result-card">
                <div
                  className={p.type === "전통시장" ? "search-result-thumb market has-image" : "search-result-thumb has-image"}
                  style={{ "--place-card-image": placeImage ? `url("${placeImage}")` : undefined }}
                >
                  {!placeImage && p.emoji}
                </div>
                <div>
                  <strong>{p.name}</strong>
                  <span>{p.type} · {p.dist}</span>
                  <small>{p.type === "전통시장" ? "먹거리 골목 · 야시장 추천" : "산책 코스 · 사진 포인트"}</small>
                </div>
                <button type="button">상세 보기</button>
              </div>
            );})}
          </div>
        )}
      </div>
    </div>
  );
}
