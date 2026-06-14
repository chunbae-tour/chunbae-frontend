import { useEffect, useState } from "react";
import { COLORS, S } from "../../constants/colors";
import { ConfirmDialog, EmptyState, ErrorState, SkeletonBlock, SkeletonList } from "../../components/common";
import { getApiErrorHint } from "../../services/apiClient.js";
import { fetchFestivals, searchFestivals } from "../../services/festivalService.js";
import { fetchFaqs, fetchFaqTranslation } from "../../services/faqService.js";
import { fetchYeopjeonBalance } from "../../services/paymentService.js";
import { deleteAllNotifications, fetchNotifications, fetchNotificationSettings, markAllNotificationsRead, markNotificationRead, updateNotificationSettings } from "../../services/notificationService.js";
import { updateCurrentUserProfile } from "../../services/authService.js";
import YeopjeonImg from "../../assets/yeopjeon-icon.png";
import { getPlaceImageUrl } from "../../constants/placeImages.js";
import { deleteRecentSearch, fetchPopularSearches, fetchRecentSearches, fetchSearchSuggestions, saveSearchKeyword, searchUnifiedPage } from "../../services/searchService.js";
import { fetchUserHomeStats } from "../../services/myService.js";

// ─── 마이페이지 ───────────────────────────────────────────────────────
const NICKNAME_PATTERN = /^[\p{L}\p{N}_-]{2,20}$/u;
const DEFAULT_NOTIFICATION_SETTINGS = {
  payment: false,
  companion: false,
  post: false,
  ad: false,
};

function normalizeProfileLanguage(language) {
  const value = String(language || "ko").trim();
  const normalized = value.toLowerCase().replace("_", "-");
  if (normalized === "ko") return "ko";
  if (normalized === "en") return "en";
  if (normalized === "ja") return "ja";
  if (normalized === "zh" || normalized === "zh-cn") return "zh-CN";
  return "ko";
}

export function MyPage({ onTab, showToast, onLogout, onLogin, onProfileUpdate = () => {}, user, comfortableView = false, onComfortableViewChange = () => {} }) {
  const isLoggedIn = Boolean(user);
  const role = String(user?.role || "USER").toUpperCase();
  const [balance, setBalance] = useState(0);
  const [balanceStatus, setBalanceStatus] = useState("loading");
  const [balanceError, setBalanceError] = useState("");
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ nickname: "", language: "ko", profileImageUrl: "" });
  const [profileError, setProfileError] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [homeStats, setHomeStats] = useState({ likedPlacesCount: 0, companionWaitingCount: 0, reviewCount: 0 });
  const [homeStatsStatus, setHomeStatsStatus] = useState("loading");
  const companionCompletedCount = user?.companionCompletedCount ?? user?.companionReviewCount ?? 0;
  const travelerLevel = user?.travelerLevel || "새내기 여행자";

  const tripSummary = [
    { icon: "❤️", label: "찜한 골목", value: homeStatsStatus === "loading" ? "-" : homeStats.likedPlacesCount, action: "wishlist" },
    { icon: "🧭", label: "동행 대기", value: homeStatsStatus === "loading" ? "-" : homeStats.companionWaitingCount, action: "community" },
    { icon: "✍️", label: "작성 후기", value: homeStatsStatus === "loading" ? "-" : homeStats.reviewCount, action: "myReview" },
  ];
  const activityMenus = [
    { icon: "❤️", label: "찜 목록", tab: "wishlist", count: homeStats.likedPlacesCount },
    { icon: "✍️", label: "내 리뷰", tab: "myReview", count: homeStats.reviewCount },
    { icon: "🚩", label: "내 신고 내역", tab: "myReports" },
    { icon: "🧾", label: "이용 내역", tab: "payHistory" },
    { icon: "🎁", label: "보유 아이템", tab: "ownedItems" },
  ];
  const serviceMenus = [
    { icon: "🔔", label: "알림 설정", tab: "notificationSettings" },
    { icon: "🌐", label: "언어 설정", tab: null },
    { icon: "💬", label: "고객센터 문의", tab: "support" },
    { icon: "❓", label: "FAQ", tab: "faq" },
  ];

  useEffect(() => {
    if (!isLoggedIn) {
      setBalanceStatus("idle");
      setBalance(0);
      setBalanceError("");
      setHomeStatsStatus("idle");
      setHomeStats({ likedPlacesCount: 0, companionWaitingCount: 0, reviewCount: 0 });
      return undefined;
    }

    let ignore = false;

    // 엽전 잔액 조회
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

    // 홈 통계 조회
    setHomeStatsStatus("loading");
    fetchUserHomeStats()
      .then((stats) => {
        if (ignore) return;
        setHomeStats(stats);
        setHomeStatsStatus("success");
      })
      .catch((error) => {
        if (ignore) return;
        console.error("홈 통계 조회 실패:", error);
        setHomeStatsStatus("error");
      });

    return () => { ignore = true; };
  }, [isLoggedIn]);

  const confirmLogout = () => {
    setLogoutConfirmOpen(false);
    onLogout();
  };

  const openProfileEditor = () => {
    setProfileForm({
      nickname: user?.nickname || "",
      language: normalizeProfileLanguage(user?.language),
      profileImageUrl: user?.profileImageUrl || "",
    });
    setProfileError("");
    setProfileModalOpen(true);
  };

  const saveProfile = async () => {
    const nickname = profileForm.nickname.trim();
    const profileImageUrl = profileForm.profileImageUrl.trim();

    if (!NICKNAME_PATTERN.test(nickname)) {
      setProfileError("닉네임은 2~20자의 한글, 영문, 숫자, _, -만 사용할 수 있습니다.");
      return;
    }

    if (profileImageUrl && !/^https?:\/\/\S+$/i.test(profileImageUrl)) {
      setProfileError("프로필 이미지는 http 또는 https URL만 입력할 수 있습니다.");
      return;
    }

    setProfileSaving(true);
    setProfileError("");

    try {
      const updatedUser = await updateCurrentUserProfile({
        nickname,
        language: profileForm.language || "ko",
        profileImageUrl: profileImageUrl || undefined,
      });
      onProfileUpdate(updatedUser);
      setProfileModalOpen(false);
      showToast("프로필을 수정했습니다.");
    } catch (error) {
      setProfileError(getApiErrorHint(error));
    } finally {
      setProfileSaving(false);
    }
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
        <div className="my-profile-card">
          <div className="my-profile-avatar">
            {user?.profileImageUrl ? <img src={user.profileImageUrl} alt={`${user?.nickname || "사용자"} 프로필`} /> : "👤"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.primary }}>{user?.nickname || user?.email || "사용자"}</div>
              {role === "MERCHANT" && <span style={{ background: COLORS.accent, color: COLORS.primary, fontSize: 14, fontWeight: 700, borderRadius: 6, padding: "2px 8px" }}>🏪 상인</span>}
              {role === "ADMIN" && <span style={{ background: "#E24B4A", color: "#fff", fontSize: 14, fontWeight: 700, borderRadius: 6, padding: "2px 8px" }}>👑 관리자</span>}
            </div>
            <div className="my-traveler-level">{travelerLevel}</div>
            <div style={{ fontSize: 14, color: COLORS.textMuted }}>
              동행 점수 {user?.companionScore ? `★ ${user.companionScore}` : "아직 없음"} · 동행 {companionCompletedCount}회 완료
            </div>
            <button type="button" onClick={openProfileEditor} style={{ marginTop: 6, display: "inline-block", fontSize: 14, color: COLORS.primary, border: "1px solid rgba(0,0,0,0.15)", background: "#fff", borderRadius: 20, padding: "4px 12px", cursor: "pointer" }}>프로필 수정</button>
          </div>
        </div>
        <div className="my-balance-card">
          <div className="my-certified-badge">춘배 인증</div>
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
                <div style={{ color: "#ffd369", fontSize: 26, fontWeight: 800, lineHeight: 1 }}>🪙 {balance.toLocaleString()} 엽전</div>
              )}
              <div className="my-balance-subtext">충전 후 전통시장에서 QR 결제 가능</div>
            </div>
          </div>
          {balanceStatus === "error" && <div style={{ color: "rgba(255,255,255,0.72)", fontSize: 14, marginBottom: 10 }}>{balanceError}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="my-balance-action primary" onClick={() => onTab("pay")}><strong>엽전 충전</strong><span>잔액 채우기</span></button>
            <button type="button" className="my-balance-action" onClick={() => onTab("qrpay")}><strong>QR 결제</strong><span>현장 결제</span></button>
            <button type="button" className="my-balance-action" onClick={() => onTab("payHistory")}><strong>이용 내역</strong><span>충전·결제 확인</span></button>
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
                <em>{item.icon}</em>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
          <div className="my-next-card">
            <i aria-hidden="true">⌖</i>
            <div>
              <b>다음 추천 행동</b>
              <span>찜한 장소를 방문하거나<br />동행 게시판에서 여행 친구를 찾아보세요.</span>
            </div>
          </div>
        </div>
        <div className="my-menu-card">
          <div className="my-menu-head">나의 활동</div>
          {activityMenus.map((m, i) => (
            <div key={i} className="my-menu-row" onClick={() => m.tab ? onTab(m.tab) : showToast("준비 중입니다")}>
              <span>{m.icon} {m.label}</span>
              <div>
                {typeof m.count === "number" && homeStatsStatus !== "loading" && <b>{m.count}</b>}
                <span>›</span>
              </div>
            </div>
          ))}
        </div>
        {/* 상인 신청 버튼 (일반 유저만) */}
        {role === "USER" && (
          <div className="my-menu-card">
            <div className="my-menu-head">상인 서비스</div>
            <div className="my-menu-row" onClick={() => onTab("merchantApply")}>
              <span>🏪 상인 신청</span>
              <div><span>›</span></div>
            </div>
          </div>
        )}
        {/* 상인 전용 메뉴 */}
        {role === "MERCHANT" && (
          <div className="my-menu-card">
            <div className="my-menu-head">🏪 상인 메뉴</div>
            <div className="my-menu-row" onClick={() => onTab("merchant")}>
              <span>🏪 가게 관리</span>
              <div><span>›</span></div>
            </div>
          </div>
        )}
        {/* 관리자 전용 메뉴 */}
        {role === "ADMIN" && (
          <div className="my-menu-card">
            <div className="my-menu-head">👑 관리자 메뉴</div>
            <div className="my-menu-row" onClick={() => onTab("adminDashboard")}>
              <span>👑 관리자 대시보드</span>
              <div><span>›</span></div>
            </div>
          </div>
        )}
        <div className="my-menu-card">
          <div className="my-menu-head">서비스</div>
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
          {serviceMenus.map((m, i) => (
            <div key={i} className="my-menu-row" onClick={() => m.tab ? onTab(m.tab) : showToast(`${m.label}으로 이동합니다`)}>
              <span>{m.icon} {m.label}</span>
              <div><span>›</span></div>
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
      {profileModalOpen && (
        <div className="confirm-dialog-backdrop" role="presentation" onMouseDown={() => !profileSaving && setProfileModalOpen(false)}>
          <div className="confirm-dialog profile-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-edit-title" onMouseDown={(event) => event.stopPropagation()}>
            <strong id="profile-edit-title">프로필 수정</strong>
            <p>마이페이지와 채팅에 표시되는 정보를 바꿀 수 있어요.</p>
            <label className="profile-edit-field">
              <span>닉네임</span>
              <input
                value={profileForm.nickname}
                maxLength={20}
                onChange={(event) => setProfileForm(prev => ({ ...prev, nickname: event.target.value }))}
                placeholder="닉네임"
              />
            </label>
            <label className="profile-edit-field">
              <span>기본 언어</span>
              <select
                value={profileForm.language}
                onChange={(event) => setProfileForm(prev => ({ ...prev, language: event.target.value }))}
              >
                <option value="ko">한국어</option>
                <option value="en">English</option>
                <option value="ja">日本語</option>
                <option value="zh-CN">中文</option>
              </select>
            </label>
            <label className="profile-edit-field">
              <span>프로필 이미지 URL</span>
              <input
                value={profileForm.profileImageUrl}
                onChange={(event) => setProfileForm(prev => ({ ...prev, profileImageUrl: event.target.value }))}
                placeholder="https://..."
              />
            </label>
            {profileError && <div className="profile-edit-error">{profileError}</div>}
            <div className="confirm-dialog-actions">
              <button type="button" className="secondary" disabled={profileSaving} onClick={() => setProfileModalOpen(false)}>취소</button>
              <button type="button" className="primary" disabled={profileSaving} onClick={saveProfile}>{profileSaving ? "저장 중" : "저장"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function NotificationSettingsPage({ onBack, showToast }) {
  const [settings, setSettings] = useState(DEFAULT_NOTIFICATION_SETTINGS);
  const [status, setStatus] = useState("loading");  const [errorMessage, setErrorMessage] = useState("");
  const [browserPermission, setBrowserPermission] = useState(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    return window.Notification.permission;
  });
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

    try {
      const saved = await updateNotificationSettings(next);
      setSettings(saved);
      setStatus("success");
    } catch (error) {
      showToast(getApiErrorHint(error));
    }
  };
  const requestBrowserNotificationPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      showToast?.("이 브라우저는 시스템 알림을 지원하지 않습니다.");
      return;
    }

    const result = await window.Notification.requestPermission();
    setBrowserPermission(result);
    showToast?.(result === "granted" ? "브라우저 알림을 켰습니다." : "브라우저 알림 권한이 허용되지 않았습니다.");
  };

  return (
    <div style={S.screen} className="notification-settings-page">
      <div style={{ background: COLORS.primary, padding: "44px 16px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <span onClick={onBack} style={{ color: "#fff", fontSize: 20, cursor: "pointer" }}>←</span>
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>알림 설정</span>
      </div>
      <div style={S.scrollArea}>
        <div className="settings-note">
          알림 목록은 서버와 연결되어 있고, 카테고리별 수신 설정은 백엔드 API가 준비될 때까지 이 기기에 저장됩니다.
        </div>
        <div className="settings-list">
          <button
            type="button"
            className="settings-row"
            onClick={requestBrowserNotificationPermission}
            disabled={browserPermission === "unsupported" || browserPermission === "granted"}
          >
            <div>
              <strong>브라우저 알림 권한</strong>
              <span>
                {browserPermission === "granted"
                  ? "앱을 열어둔 상태에서 새 알림을 시스템 알림으로 받을 수 있어요."
                  : browserPermission === "unsupported"
                    ? "현재 브라우저에서는 시스템 알림을 사용할 수 없어요."
                    : "앱이 백그라운드에 있을 때 알림을 표시하려면 권한이 필요해요."}
              </span>
            </div>
            <em className={browserPermission === "granted" ? "on" : ""}>
              {browserPermission === "granted" ? "허용됨" : browserPermission === "denied" ? "차단됨" : "허용하기"}
            </em>
          </button>
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
  const [faqs, setFaqs] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [translationLanguage, setTranslationLanguage] = useState("EN");
  const [translations, setTranslations] = useState({});
  const [translationLoadingId, setTranslationLoadingId] = useState(null);

  const loadTranslation = async (faqId) => {
    setTranslationLoadingId(faqId);
    try {
      const data = await fetchFaqTranslation(faqId, translationLanguage);
      setTranslations(prev => ({ ...prev, [faqId]: data }));
    } catch (error) {
      setTranslations(prev => ({
        ...prev,
        [faqId]: { error: getApiErrorHint(error) || "번역을 불러오지 못했습니다." },
      }));
    } finally {
      setTranslationLoadingId(null);
    }
  };
  const loadFaqs = () => {
    setStatus("loading");
    setErrorMessage("");
    fetchFaqs()
      .then((items) => {
        setFaqs(items);
        setOpenId(items[0]?.id ?? null);
        setStatus(items.length > 0 ? "success" : "empty");
      })
      .catch((error) => {
        setFaqs([]);
        setOpenId(null);
        setErrorMessage(getApiErrorHint(error));
        setStatus("error");
      });
  };

  useEffect(() => {
    let ignore = false;
    fetchFaqs()
      .then((items) => {
        if (ignore) return;
        setFaqs(items);
        setOpenId(items[0]?.id ?? null);
        setStatus(items.length > 0 ? "success" : "empty");
      })
      .catch((error) => {
        if (ignore) return;
        setFaqs([]);
        setOpenId(null);
        setErrorMessage(getApiErrorHint(error));
        setStatus("error");
      });

    return () => { ignore = true; };
  }, []);

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
        {status === "loading" && <SkeletonList count={4} />}
        {status === "empty" && (
          <EmptyState icon="FAQ" title="등록된 FAQ가 없습니다." description="관리자가 FAQ를 등록하면 이곳에 표시됩니다." />
        )}
        {status === "error" && (
          <ErrorState
            title="FAQ를 불러오지 못했습니다."
            description={errorMessage || "백엔드 연결 상태를 확인한 뒤 다시 시도해주세요."}
            onRetry={loadFaqs}
          />
        )}
        <div className="faq-list">
          {faqs.map(item => (
            <div key={item.id} className={`faq-card ${openId === item.id ? "open" : ""}`}>
              <button type="button" onClick={() => setOpenId(openId === item.id ? null : item.id)}>
                <strong>{item.q}</strong>
                {openId === item.id && <span>{item.a}</span>}
              </button>
              {openId === item.id && (
                <div className="faq-translation-panel">
                  <select value={translationLanguage} onChange={(event) => setTranslationLanguage(event.target.value)}>
                    <option value="EN">English</option>
                    <option value="JA">日本語</option>
                    <option value="ZH_CN">中文</option>
                    <option value="KO">한국어</option>
                  </select>
                  <button type="button" onClick={() => loadTranslation(item.id)} disabled={translationLoadingId === item.id}>
                    {translationLoadingId === item.id ? "번역 중" : "번역 보기"}
                  </button>
                  {translations[item.id]?.error && <p className="faq-translation-error">{translations[item.id].error}</p>}
                  {translations[item.id]?.answer && (
                    <div className="faq-translation-result">
                      <strong>{translations[item.id].question || item.q}</strong>
                      <span>{translations[item.id].answer}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 축제 페이지 ──────────────────────────────────────────────────────
function parseFestivalDate(value) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getMonthRange(year, month) {
  return {
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 0),
  };
}

function festivalOverlapsMonth(festival, year, month, today) {
  const startDate = parseFestivalDate(festival.startDate);
  const endDate = parseFestivalDate(festival.endDate) ?? startDate;
  if (!startDate || !endDate) return false;

  const { start, end } = getMonthRange(year, month);
  const effectiveStart = year === today.getFullYear() && month === today.getMonth() + 1
    ? new Date(today.getFullYear(), today.getMonth(), today.getDate())
    : start;

  return startDate <= end && endDate >= effectiveStart;
}

const FESTIVAL_PROGRESS_LABELS = {
  IN_PROGRESS: "진행 중",
  UPCOMING: "예정",
  ENDED: "종료",
};

const FESTIVAL_REGIONS = [
  "서울특별시",
  "부산광역시",
  "대구광역시",
  "인천광역시",
  "광주광역시",
  "대전광역시",
  "울산광역시",
  "세종특별자치시",
  "경기도",
  "강원특별자치도",
  "충청북도",
  "충청남도",
  "전북특별자치도",
  "전라남도",
  "경상북도",
  "경상남도",
  "제주특별자치도",
];

const FESTIVAL_REGION_ALIASES = {
  서울: "서울특별시",
  부산: "부산광역시",
  대구: "대구광역시",
  인천: "인천광역시",
  광주: "광주광역시",
  대전: "대전광역시",
  울산: "울산광역시",
  세종: "세종특별자치시",
  경기: "경기도",
  강원: "강원특별자치도",
  강원도: "강원특별자치도",
  충북: "충청북도",
  충남: "충청남도",
  전북: "전북특별자치도",
  전라북도: "전북특별자치도",
  전남: "전라남도",
  경북: "경상북도",
  경남: "경상남도",
  제주: "제주특별자치도",
  제주도: "제주특별자치도",
};

function resolveFestivalRegion(value = "") {
  return FESTIVAL_REGIONS.includes(value) ? value : FESTIVAL_REGION_ALIASES[value] ?? "";
}

function getFestivalProgressStatus(festival = {}) {
  return festival.progressStatus ?? festival.dday ?? "";
}

function isFestivalEnded(festival = {}, today = new Date()) {
  if (getFestivalProgressStatus(festival) === "ENDED") return true;

  const endDate = parseFestivalDate(festival.endDate);
  if (!endDate) return false;

  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return endDate < todayStart;
}

export function FestivalPage({ onBack, onCalendar, onFestival }) {
  const [filter, setFilter] = useState("전체");
  const [festivals, setFestivals] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearchQuery, setActiveSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [activeRegion, setActiveRegion] = useState("");
  const [didYouMean, setDidYouMean] = useState("");
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  const loadFestivals = () => {
    setStatus("loading");
    setErrorMessage("");
    setDidYouMean("");
    fetchFestivals()
      .then((data) => {
        setFestivals(data);
        setStatus(data.length > 0 ? "success" : "empty");
      })
      .catch((error) => {
        setFestivals([]);
        setErrorMessage(getApiErrorHint(error));
        setStatus("error");
      });
  };

  const runFestivalSearch = (query = searchQuery, region = selectedRegion) => {
    const normalizedQuery = query.trim();
    const exactRegionQuery = resolveFestivalRegion(normalizedQuery);
    const normalizedRegion = region || exactRegionQuery;
    const keyword = exactRegionQuery ? "" : normalizedQuery;

    if (!keyword && !normalizedRegion) {
      setActiveSearchQuery("");
      setActiveRegion("");
      loadFestivals();
      return;
    }

    setSearchQuery(normalizedQuery);
    setSelectedRegion(normalizedRegion);
    setActiveSearchQuery(keyword);
    setActiveRegion(normalizedRegion);
    setFilter("전체");
    setStatus("loading");
    setErrorMessage("");
    setDidYouMean("");
    searchFestivals({ q: keyword, region: normalizedRegion, size: 100, source: "festival-list" })
      .then((data) => {
        setFestivals(data.content);
        setDidYouMean(data.didYouMean || "");
        setStatus(data.content.length > 0 ? "success" : "empty");
      })
      .catch((error) => {
        setFestivals([]);
        setErrorMessage(getApiErrorHint(error));
        setStatus("error");
      });
  };

  const clearFestivalSearch = () => {
    setSearchQuery("");
    setActiveSearchQuery("");
    setSelectedRegion("");
    setActiveRegion("");
    loadFestivals();
  };

  useEffect(() => {
    let ignore = false;
    if (!ignore) loadFestivals();
    return () => { ignore = true; };
  }, []);

  const selectedMonth = Number.parseInt(filter, 10);
  const activeFestivals = festivals.filter(festival => !isFestivalEnded(festival, today));
  const filteredFestivals = filter === "전체"
    ? activeFestivals
    : activeFestivals.filter(festival => festivalOverlapsMonth(festival, currentYear, selectedMonth, today));
  const monthFilters = [
    "전체",
    ...Array.from({ length: 12 - currentMonth + 1 }, (_, index) => `${currentMonth + index}월`),
  ];

  return (
    <div style={S.screen} className="festival-page">
      <div className="festival-page-header" style={{ background: COLORS.primary, padding: "44px 20px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span onClick={onBack} style={{ color: "#fff", fontSize: 20, cursor: "pointer" }}>←</span>
            <div style={{ color: "#fff", fontSize: 20, fontWeight: 700 }}>🎉 축제 & 이벤트</div>
          </div>
        </div>
        <div className="festival-view-tabs">
          <button type="button" className="active">목록</button>
          <button type="button" onClick={onCalendar}>캘린더</button>
        </div>
      </div>
      <div style={S.scrollArea}>
        <div className="festival-list-content">
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.primary }}>올해 남은 축제 일정</div>
            <div style={{ fontSize: 14, color: COLORS.textMuted, marginTop: 4 }}>오늘부터 12월 31일까지 열리는 축제를 월별로 확인해보세요.</div>
          </div>
          <form className="festival-search-form" onSubmit={(event) => { event.preventDefault(); runFestivalSearch(); }}>
            <span aria-hidden="true">⌕</span>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="축제명이나 지역을 검색하세요"
              aria-label="축제 검색"
            />
            {searchQuery && <button type="button" className="festival-search-clear" onClick={clearFestivalSearch} aria-label="축제 검색어 지우기">×</button>}
            <button type="submit" className="festival-search-submit">검색</button>
          </form>
          <div className="festival-region-filter">
            <label htmlFor="festival-region">지역</label>
            <select
              id="festival-region"
              value={selectedRegion}
              onChange={(event) => {
                const nextRegion = event.target.value;
                setSelectedRegion(nextRegion);
                runFestivalSearch(searchQuery, nextRegion);
              }}
            >
              <option value="">전체 지역</option>
              {FESTIVAL_REGIONS.map(region => <option key={region} value={region}>{region}</option>)}
            </select>
          </div>
          {didYouMean && didYouMean !== activeSearchQuery && (
            <button type="button" className="festival-search-suggestion" onClick={() => runFestivalSearch(didYouMean)}>
              혹시 <strong>{didYouMean}</strong>을 찾으셨나요?
            </button>
          )}
          {(activeSearchQuery || activeRegion) && (
            <div className="festival-search-summary">
              <span>
                {activeSearchQuery && <strong>{activeSearchQuery}</strong>}
                {activeSearchQuery && activeRegion && " · "}
                {activeRegion && <strong>{activeRegion}</strong>}
                {" "}검색 결과
              </span>
              <button type="button" onClick={clearFestivalSearch}>전체 일정 보기</button>
            </div>
          )}
          <div className="festival-month-filters">
            {monthFilters.map(f => (
              <button type="button" key={f} onClick={() => setFilter(f)} className={filter === f ? "active" : ""}>{f}</button>
            ))}
          </div>
          {status === "loading" && <SkeletonList count={3} />}
          {status === "error" && (
            <ErrorState
              title="축제 정보를 불러오지 못했습니다."
              description={errorMessage || "백엔드 연결 상태를 확인한 뒤 다시 시도해주세요."}
              onRetry={loadFestivals}
            />
          )}
          {status !== "loading" && status !== "error" && filteredFestivals.length === 0 && (
            <EmptyState
              icon={activeSearchQuery || activeRegion ? "⌕" : "🎉"}
              title={activeSearchQuery || activeRegion ? "검색 결과가 없습니다." : "표시할 축제가 없습니다."}
              description={activeSearchQuery || activeRegion ? "다른 축제명이나 지역으로 검색해보세요." : "올해 남은 축제 일정이 없거나 선택한 월에 표시할 축제가 없습니다."}
              actionLabel="캘린더 보기"
              onAction={onCalendar}
            />
          )}
          {filteredFestivals.map(f => {
            const progressStatus = getFestivalProgressStatus(f);
            return (
            <button type="button" onClick={() => onFestival?.(f)} key={f.id} className="festival-list-card">
              <div className="festival-date-block">
                <span>{f.month}</span>
                <strong>{f.day}</strong>
              </div>
              <div className="festival-card-copy">
                <strong>{f.name}</strong>
                <span>📍 {f.location}</span>
                <span>📅 {f.date}</span>
              </div>
              <span className={`festival-status-badge ${String(progressStatus).toLowerCase()}`}>
                {FESTIVAL_PROGRESS_LABELS[progressStatus] ?? progressStatus}
              </span>
              <span className="festival-card-chevron" aria-hidden="true">›</span>
            </button>
          )})}
        </div>
      </div>
    </div>
  );
}

// ─── 알림 페이지 ──────────────────────────────────────────────────────
const NOTIFICATION_FILTER_TABS = [
  { key: "all", label: "전체" },
  { key: "unread", label: "안 읽은 알림" },
  { key: "participation", label: "참여" },
  { key: "system", label: "시스템" },
];

const NOTIFICATION_TYPE_META = {
  approved: { icon: "✓", label: "참여 신청 승인" },
  rejected: { icon: "×", label: "참여 신청 거절" },
  kicked: { icon: "−", label: "채팅방 강퇴" },
  system: { icon: "i", label: "시스템 알림" },
};

export function NotificationPage({ onBack, onNotificationClick, onUnreadCountChange }) {
  const [notifications, setNotifications] = useState([]);
  const [status, setStatus] = useState("loading");
  const [markingAll, setMarkingAll] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");

  const syncNotifications = (items) => {
    setNotifications(items);
    onUnreadCountChange?.(items.filter(item => !item.read).length);
  };

  const loadNotifications = () => {
    setStatus("loading");
    setErrorMessage("");
    fetchNotifications({ size: 20 })
      .then((data) => {
        syncNotifications(data);
        setStatus(data.length > 0 ? "success" : "empty");
      })
      .catch((error) => {
        syncNotifications([]);
        setErrorMessage(getApiErrorHint(error));
        setStatus("error");
      });
  };

  useEffect(() => {
    let ignore = false;
    if (!ignore) loadNotifications();
    return () => { ignore = true; };
  }, []);

  const markOne = async (notification) => {
    if (!notification) return;
    if (notification.id) {
      await markNotificationRead(notification.id).catch(() => {});
    }
    const nextNotification = { ...notification, read: true };
    syncNotifications(notifications.map(x => {
      const isTarget = notification.id ? x.id === notification.id : x === notification;
      return isTarget ? nextNotification : x;
    }));
    onNotificationClick?.(nextNotification);
  };

  const markAll = async () => {
    if (markingAll) return;
    setMarkingAll(true);
    await markAllNotificationsRead().catch(() => {});
    syncNotifications(notifications.map(n => ({ ...n, read: true })));
    setMarkingAll(false);
  };

  const clearAll = async () => {
    setDeleteConfirmOpen(false);
    try {
      await deleteAllNotifications(notifications.map(item => item.id));
    } catch (error) {
      return;
    }
    syncNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const filteredNotifications = notifications.filter((notification) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "unread") return !notification.read;
    return (notification.filterType || "system") === activeFilter;
  });
  const isFilteredEmpty = status === "success" && filteredNotifications.length === 0;

  return (
    <div style={S.screen}>
      <div style={{ background: COLORS.primary, padding: "44px 20px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span onClick={onBack} style={{ color: "#fff", cursor: "pointer" }}>←</span>
          <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>알림</span>
        </div>
        <div className="notification-top-actions">
          <button type="button" className="notification-read-action" onClick={markAll} disabled={markingAll || unreadCount === 0}>{markingAll ? "처리 중..." : "전체 읽음"}</button>
          <button type="button" className="notification-delete-action" onClick={() => setDeleteConfirmOpen(true)} disabled={notifications.length === 0}>전체 삭제</button>
        </div>
      </div>
      <div style={S.scrollArea}>
        <div className="notification-filter-tabs" role="tablist" aria-label="알림 필터">
          {NOTIFICATION_FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeFilter === tab.key}
              className={activeFilter === tab.key ? "active" : ""}
              onClick={() => setActiveFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {status === "loading" && <div style={{ padding: "0 16px 16px" }}><SkeletonList count={4} /></div>}
        {status === "empty" && (
          <div style={{ padding: "0 16px 16px" }}>
            <EmptyState
              icon="🔕"
              title="알림이 없어요"
              description="QR 결제 승인, 동행 신청, 리뷰 반응을 이곳에서 확인해요"
            />
          </div>
        )}
        {isFilteredEmpty && (
          <div style={{ padding: "0 16px 16px" }}>
            <EmptyState
              icon="🔕"
              title="해당 알림이 없어요"
              description="다른 필터를 선택하면 남아 있는 알림을 확인할 수 있어요."
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
        {status === "success" && filteredNotifications.map((n, index) => {
          const visualType = NOTIFICATION_TYPE_META[n.visualType] ? n.visualType : "system";
          const meta = NOTIFICATION_TYPE_META[visualType];
          return (
          <button key={n.id ?? `${n.type || "notification"}-${n.time || index}`} type="button" onClick={() => markOne(n)} className={`notification-row ${n.read ? "read" : "unread"} ${visualType}`}>
            <span className={`notification-type-icon ${visualType}`} aria-label={meta.label}>{meta.icon}</span>
            <div className="notification-row-content">
              {n.title && <div className="notification-title">{n.title}</div>}
              <div className="notification-message">{n.displayMessage || n.text}</div>
              <div className="notification-time">{n.timeText || n.time}</div>
            </div>
            {!n.read && <span className="notification-unread-dot" />}
          </button>
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
const SEARCH_RESULT_TABS = [
  { key: "ALL", label: "전체" },
  { key: "PLACE", label: "장소" },
  { key: "SHOP", label: "가게" },
  { key: "MENU", label: "메뉴" },
];
const SEARCH_PAGE_SIZE = 50;

function readRecentSearches() {
  try {
    return JSON.parse(sessionStorage.getItem("chunbae_recent_searches") || "[]");
  } catch {
    return [];
  }
}

function writeRecentSearch(keyword) {
  const next = [keyword, ...readRecentSearches().filter(item => item !== keyword)].slice(0, 10);
  sessionStorage.setItem("chunbae_recent_searches", JSON.stringify(next));
  return next;
}

function replaceRecentSearches(keywords) {
  const next = keywords.filter(Boolean).slice(0, 10);
  sessionStorage.setItem("chunbae_recent_searches", JSON.stringify(next));
  return next;
}

function removeRecentSearch(keyword) {
  return replaceRecentSearches(readRecentSearches().filter(item => item !== keyword));
}

function clearRecentSearches() {
  return replaceRecentSearches([]);
}

export function SearchPage({ onBack, onPlaceClick, onShopClick }) {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [results, setResults] = useState([]);
  const [activeResultType, setActiveResultType] = useState("ALL");
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasNextResults, setHasNextResults] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState("");
  const [popularSearches, setPopularSearches] = useState([]);
  const [recentSearches, setRecentSearches] = useState(readRecentSearches);
  const [suggestions, setSuggestions] = useState([]);
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const draftQuery = query.trim();
  const normalizedQuery = submittedQuery.trim();
  const resultCounts = SEARCH_RESULT_TABS.reduce((acc, tab) => {
    acc[tab.key] = tab.key === "ALL" ? results.length : results.filter(item => item.targetType === tab.key).length;
    return acc;
  }, {});
  const visibleResults = activeResultType === "ALL" ? results : results.filter(item => item.targetType === activeResultType);

  useEffect(() => {
    let ignore = false;

    fetchPopularSearches()
      .then((data) => {
        if (ignore) return;
        const values = data
          .map(item => item.keyword || item.query || item.name || item)
          .filter(Boolean)
          .slice(0, 10);
        setPopularSearches(values);
      })
      .catch(() => setPopularSearches([]));

    fetchRecentSearches()
      .then((data) => {
        if (ignore) return;
        const values = (Array.isArray(data) ? data : [])
          .map(item => item.keyword || item.query || item.name || item)
          .filter(Boolean);
        setRecentSearches(replaceRecentSearches(values));
      })
      .catch(() => {});

    return () => { ignore = true; };
  }, []);

  const handleDeleteRecentSearch = (keyword) => {
    setRecentSearches(removeRecentSearch(keyword));
    deleteRecentSearch(keyword).catch(() => {});
  };

  const handleClearRecentSearches = () => {
    setRecentSearches(clearRecentSearches());
    deleteRecentSearch().catch(() => {});
  };

  const submitSearch = (keyword = query) => {
    const nextQuery = keyword.trim();
    if (!nextQuery) {
      setQuery("");
      setSubmittedQuery("");
      setResults([]);
      setSuggestions([]);
      setIsSuggestOpen(false);
      setStatus("idle");
      setErrorMessage("");
      setNextCursor(null);
      setHasNextResults(false);
      setLoadMoreError("");
      return;
    }
    setQuery(nextQuery);
    setSubmittedQuery(nextQuery);
    setSuggestions([]);
    setIsSuggestOpen(false);
    setActiveResultType("ALL");
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    submitSearch();
  };

  useEffect(() => {
    let ignore = false;

    if (!draftQuery || draftQuery === normalizedQuery) {
      setSuggestions([]);
      setIsSuggestOpen(false);
      return () => { ignore = true; };
    }

    const timer = setTimeout(() => {
      fetchSearchSuggestions(draftQuery)
        .then((data) => {
          if (ignore) return;
          const values = (Array.isArray(data) ? data : [])
            .map(item => item.keyword || item.query || item.name || item)
            .filter(Boolean)
            .slice(0, 5);
          setSuggestions(values);
          setIsSuggestOpen(values.length > 0);
        })
        .catch(() => {
          if (ignore) return;
          setSuggestions([]);
          setIsSuggestOpen(false);
        });
    }, 250);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [draftQuery, normalizedQuery]);

  useEffect(() => {
    let ignore = false;

    if (!normalizedQuery) {
      setResults([]);
      setStatus("idle");
      setNextCursor(null);
      setHasNextResults(false);
      setLoadMoreError("");
      return () => { ignore = true; };
    }

    setStatus("loading");
    setErrorMessage("");
    setNextCursor(null);
    setHasNextResults(false);
    setLoadMoreError("");
    searchUnifiedPage({ query: normalizedQuery, size: SEARCH_PAGE_SIZE })
      .then((page) => {
        if (ignore) return;
        setResults(page.content);
        setNextCursor(page.nextCursor);
        setHasNextResults(page.hasNext);
        setStatus(page.content.length > 0 ? "success" : "empty");
        setActiveResultType("ALL");
        setRecentSearches(writeRecentSearch(normalizedQuery));
        saveSearchKeyword(normalizedQuery).catch(() => {});
      })
      .catch((error) => {
        if (ignore) return;
        setResults([]);
        setNextCursor(null);
        setHasNextResults(false);
        setErrorMessage(getApiErrorHint(error));
        setStatus("error");
      });

    return () => {
      ignore = true;
    };
  }, [normalizedQuery, retryKey]);

  const handleLoadMoreResults = () => {
    if (!normalizedQuery || !hasNextResults || isLoadingMore) return;

    setIsLoadingMore(true);
    setLoadMoreError("");
    searchUnifiedPage({
      query: normalizedQuery,
      cursor: nextCursor,
      size: SEARCH_PAGE_SIZE,
    })
      .then((page) => {
        setResults(current => {
          const seen = new Set(current.map(item => `${item.targetType}-${item.id}`));
          const merged = [...current];
          page.content.forEach((item) => {
            const key = `${item.targetType}-${item.id}`;
            if (!seen.has(key)) {
              seen.add(key);
              merged.push(item);
            }
          });
          return merged;
        });
        setNextCursor(page.nextCursor);
        setHasNextResults(page.hasNext);
      })
      .catch((error) => {
        setLoadMoreError(getApiErrorHint(error) || "다음 검색 결과를 불러오지 못했습니다.");
      })
      .finally(() => setIsLoadingMore(false));
  };

  const handleSearchResultClick = (item) => {
    if (item.targetType === "SHOP" || item.targetType === "MENU") {
      onShopClick?.({
        id: item.shopId ?? item.id,
        shopId: item.shopId ?? item.id,
        name: item.shopName ?? item.name,
        shopName: item.shopName ?? item.name,
        marketName: item.placeName,
        rating: item.rating,
        reviewCount: item.reviewCount,
        desc: item.desc,
      });
      return;
    }

    const placeImage = getPlaceImageUrl(item);
    onPlaceClick({ ...item, imageUrl: placeImage });
  };

  const getResultMeta = (item) => {
    if (item.targetType === "MENU") {
      return `${item.shopName} · ${item.placeName}${item.price ? ` · ${item.price.toLocaleString()}원` : ""}`;
    }
    if (item.targetType === "SHOP") {
      const menuText = item.matchedMenuNames?.length ? ` · 대표 ${item.matchedMenuNames.slice(0, 2).join(", ")}` : "";
      return `${item.placeName ?? "연결 장소"} · ${item.category ?? "가게"}${menuText}`;
    }
    return `${item.type} · ${item.dist}`;
  };

  const getResultDescription = (item) => {
    if (item.targetType === "MENU") return item.desc || "이 메뉴를 파는 가게로 이동합니다.";
    if (item.targetType === "SHOP") return item.desc || "가게 상세와 엽전 결제 정보를 확인하세요.";
    return item.type === "전통시장" ? "먹거리 골목 · 야시장 추천" : "산책 코스 · 사진 포인트";
  };

  return (
    <div style={S.screen} className="search-local-page">
      <div className="search-local-hero">
        <form className="search-local-top" onSubmit={handleSearchSubmit}>
          <span onClick={onBack}>←</span>
          <div className="search-input-panel">
            <input
              autoFocus
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                setIsSuggestOpen(true);
              }}
              onFocus={() => {
                if (draftQuery && draftQuery !== normalizedQuery && suggestions.length > 0) {
                  setIsSuggestOpen(true);
                }
              }}
              placeholder="장소, 가게, 메뉴를 검색해보세요"
            />
            {isSuggestOpen && draftQuery && draftQuery !== normalizedQuery && suggestions.length > 0 && (
              <div className="search-hero-suggest-row">
                {suggestions.map(item => (
                  <button key={item} type="button" onClick={() => submitSearch(item)}>
                    <span>추천</span>
                    <strong>{item}</strong>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="submit">검색</button>
        </form>
        <div className="search-local-copy">
          <span>LOCAL SEARCH</span>
          <strong>붕어빵 냄새 따라 걷는 골목을 찾아보세요.</strong>
          <p>시장, 궁궐, 산책길을 실제 여행 동선처럼 검색할 수 있게 준비 중입니다.</p>
        </div>
      </div>
      <div style={S.scrollArea}>
        {normalizedQuery === "" ? (
          <div className="search-suggestion-shell">
            <div className="search-keyword-board">
              <div>
                <strong>인기 검색어</strong>
                <div>
                  {popularSearches.length === 0 ? (
                    <span className="search-empty-keyword">아직 인기 검색어가 없습니다.</span>
                  ) : popularSearches.map((item, index) => (
                    <button key={`${item}-${index}`} type="button" onClick={() => submitSearch(item)}>
                      <b>{index + 1}</b>
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="search-recent-head">
                  <strong>최근 검색어</strong>
                  {recentSearches.length > 0 && (
                    <button type="button" onClick={handleClearRecentSearches}>전체 삭제</button>
                  )}
                </div>
                <div>
                  {recentSearches.length === 0 ? (
                    <span className="search-empty-keyword">아직 최근 검색어가 없습니다.</span>
                  ) : recentSearches.map(item => (
                    <span key={item} className="search-recent-chip">
                      <button type="button" onClick={() => submitSearch(item)}>{item}</button>
                      <button type="button" aria-label={`${item} 최근 검색어 삭제`} onClick={() => handleDeleteRecentSearch(item)}>×</button>
                    </span>
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
              <span>검색 결과 {results.length}개</span>
              <small>거리와 분위기를 보고 바로 상세로 들어가세요</small>
            </div>
            <div className="search-result-tabs" role="tablist" aria-label="검색 결과 유형">
              {SEARCH_RESULT_TABS.map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  className={activeResultType === tab.key ? "active" : ""}
                  role="tab"
                  aria-selected={activeResultType === tab.key}
                  onClick={() => setActiveResultType(tab.key)}
                  disabled={resultCounts[tab.key] === 0}
                >
                  {tab.label}
                  <b>{resultCounts[tab.key]}</b>
                </button>
              ))}
            </div>
            {visibleResults.map(p => {
              const placeImage = getPlaceImageUrl(p);
              return (
              <div key={`${p.targetType}-${p.id}`} onClick={() => handleSearchResultClick(p)} className={`search-result-card ${p.targetType?.toLowerCase() || "place"}`}>
                <div
                  className={p.type === "전통시장" ? "search-result-thumb market has-image" : "search-result-thumb has-image"}
                  style={{ "--place-card-image": p.targetType === "PLACE" && placeImage ? `url("${placeImage}")` : undefined }}
                >
                  {p.targetType === "SHOP" ? "가게" : p.targetType === "MENU" ? "메뉴" : !placeImage && p.emoji}
                </div>
                <div>
                  <em>{p.targetLabel ?? "장소"}</em>
                  <strong>{p.name}</strong>
                  <span>{getResultMeta(p)}</span>
                  <small>{getResultDescription(p)}</small>
                </div>
                <button type="button">{p.targetType === "PLACE" ? "장소 보기" : "가게 보기"}</button>
              </div>
            );})}
            {hasNextResults && activeResultType === "ALL" && (
              <div className="search-result-more">
                {loadMoreError && <span>{loadMoreError}</span>}
                <button type="button" onClick={handleLoadMoreResults} disabled={isLoadingMore}>
                  {isLoadingMore ? "불러오는 중..." : "더 보기"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
