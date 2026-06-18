import { useEffect, useState } from "react";
import { COLORS } from "../../constants/colors.js";
import TabBar from "./TabBar.jsx";
import YeopjeonImg from "../../assets/brand/yeopjeon-icon.png";
import MascotDefault from "../../assets/brand/mascot-default.png";
import { fetchYeopjeonBalance } from "../../services/paymentService.js";

const NAV_ITEMS = [
  { key: "home", label: "홈", icon: "🏠" },
  { key: "map", label: "지도", icon: "🗺️" },
  { key: "search", label: "검색", icon: "🔍" },
  { key: "fest", label: "축제", icon: "🎉" },
  { key: "community", label: "커뮤니티", icon: "👥" },
  { key: "chat", label: "채팅", icon: "💬" },
  { key: "store", label: "스토어", icon: "🏪" },
  { key: "my", label: "마이", icon: "👤" },
];

const NAV_KEYS = new Set(NAV_ITEMS.map((item) => item.key));

function AdminShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 19 6v5c0 4.7-2.7 8-7 10-4.3-2-7-5.3-7-10V6l7-3Z" />
      <path d="m12 7 1.2 2.4 2.8.4-2 2 .5 2.8-2.5-1.3-2.5 1.3.5-2.8-2-2 2.8-.4L12 7Z" />
    </svg>
  );
}

const SCREEN_NAV_KEY = {
  place: "map",
  direction: "map",
  festCalendar: "fest",
  festDetail: "fest",
  communityPost: "community",
  communityWrite: "community",
  chatroom: "chat",
  chatRequest: "chat",
  storeProduct: "store",
  storeShop: "store",
  wishlist: "my",
  myReview: "my",
  ownedItems: "my",
  notificationSettings: "my",
  pay: "my",
  payHistory: "my",
  qrpay: "my",
  merchant: "my",
  merchantMenu: "my",
  merchantSettlement: "my",
  merchantApply: "my",
};

export default function AppShell({ active, screen, onTab, onHome, user, onLogin, showMobileTab, unreadNotificationCount = 0, onNotificationIntent, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [topbarBalance, setTopbarBalance] = useState(null);
  const [topbarBalanceStatus, setTopbarBalanceStatus] = useState("idle");
  const selectedKey = String(screen || "").startsWith("admin") ? "adminDashboard" : SCREEN_NAV_KEY[screen] || (NAV_KEYS.has(screen) ? screen : active);
  const hideFaqFloating = [
    "chatroom",
    "qrpay",
    "pay",
    "payHistory",
    "merchant",
    "merchantMenu",
    "merchantSettlement",
    "faq",
    "login",
    "signup",
  ].includes(screen);
  const isLoggedIn = Boolean(user);
  const isAdmin = String(user?.role || "").toUpperCase() === "ADMIN";
  const topbarUserLabel = user?.nickname || (isLoggedIn ? "마이" : "로그인");
  const notificationBadgeText = unreadNotificationCount > 99 ? "99+" : String(unreadNotificationCount);

  useEffect(() => {
    if (!isLoggedIn || isAdmin) {
      setTopbarBalance(null);
      setTopbarBalanceStatus("idle");
      return undefined;
    }

    let ignore = false;
    setTopbarBalanceStatus("loading");

    fetchYeopjeonBalance()
      .then((balance) => {
        if (ignore) return;
        setTopbarBalance(balance);
        setTopbarBalanceStatus("success");
      })
      .catch(() => {
        if (ignore) return;
        setTopbarBalance(null);
        setTopbarBalanceStatus("error");
      });

    return () => {
      ignore = true;
    };
  }, [isLoggedIn, isAdmin, screen]);
  const openAuthOrTab = (key) => {
    if (!isLoggedIn && ["my", "pay", "notif"].includes(key)) {
      onLogin?.();
      return;
    }
    if (key === "notif") {
      onNotificationIntent?.();
    }
    onTab(key);
  };
  const goHome = () => {
    setSidebarOpen(false);
    (onHome || (() => onTab("home")))();
  };
  const goTab = (key) => {
    setSidebarOpen(false);
    onTab(key);
  };

  return (
    <div className={`app-shell ${sidebarOpen ? "sidebar-expanded" : "sidebar-collapsed"}`}>
      <aside className="desktop-nav-rail" aria-label="빠른 메뉴">
        <button
          type="button"
          className="desktop-rail-menu"
          onClick={() => setSidebarOpen(open => !open)}
          aria-label={sidebarOpen ? "전체 메뉴 닫기" : "전체 메뉴 열기"}
          aria-expanded={sidebarOpen}
        >
          ☰
        </button>
        <nav className="desktop-rail-nav" aria-label="주요 화면 빠른 이동">
          {NAV_ITEMS.map((item) => {
            const isActive = selectedKey === item.key;

            return (
              <button
                key={item.key}
                type="button"
                className={isActive ? "desktop-rail-item active" : "desktop-rail-item"}
                onClick={() => goTab(item.key)}
                title={item.label}
              >
                <span className="desktop-rail-icon">{item.icon}</span>
                <span className="desktop-rail-label">{item.label}</span>
              </button>
            );
          })}
          {isAdmin && (
            <>
              <div className="desktop-rail-divider" />
              <button
                type="button"
                className={selectedKey === "adminDashboard" ? "desktop-rail-item admin active" : "desktop-rail-item admin"}
                onClick={() => goTab("adminDashboard")}
                title="관리자"
              >
                <span className="desktop-rail-icon admin-shield-icon"><AdminShieldIcon /></span>
                <span className="desktop-rail-label">관리자</span>
              </button>
            </>
          )}
        </nav>
      </aside>
      {sidebarOpen && (
        <button
          type="button"
          className="desktop-sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-label="사이드 메뉴 닫기"
        />
      )}
      <aside className="desktop-sidebar">
        <div className="sidebar-head">
          <strong>메뉴</strong>
          <button
            type="button"
            className="sidebar-close-button"
            onClick={() => setSidebarOpen(false)}
            aria-label="사이드 메뉴 닫기"
            aria-expanded={sidebarOpen}
          >
            ×
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="주요 화면">
          {NAV_ITEMS.map((item) => {
            const isActive = selectedKey === item.key;

            return (
              <button
                key={item.key}
                type="button"
                className={isActive ? "sidebar-nav-item active" : "sidebar-nav-item"}
                onClick={() => goTab(item.key)}
                title={item.label}
              >
                <span className="sidebar-nav-icon">{item.icon}</span>
                <span className="sidebar-nav-label">{item.label}</span>
              </button>
            );
          })}
          {isAdmin && (
            <>
              <div className="sidebar-admin-divider" />
              <button
                type="button"
                className={selectedKey === "adminDashboard" ? "sidebar-nav-item admin active" : "sidebar-nav-item admin"}
                onClick={() => goTab("adminDashboard")}
                title="관리자"
              >
                <span className="sidebar-nav-icon admin-shield-icon"><AdminShieldIcon /></span>
                <span className="sidebar-nav-label">관리자</span>
              </button>
            </>
          )}
        </nav>
      </aside>

      <main className="shell-main">
        <header className="desktop-topbar">
          <div className="topbar-brand-row">
            <button type="button" className="topbar-brand" onClick={goHome} aria-label="춘배투어 홈으로 이동">
              <div className="brand-mark">
                <img src={MascotDefault} alt="" />
              </div>
              <div className="sidebar-brand-text">
                <strong>춘배투어</strong>
                <span>ChunBae Tour</span>
              </div>
            </button>
          </div>
          {!isAdmin && (
            <div className="topbar-actions">
              {isLoggedIn && (
                <button type="button" className="topbar-yeopjeon" onClick={() => openAuthOrTab("pay")}>
                  <span>내 엽전 잔액</span>
                  <strong>
                    <img src={YeopjeonImg} alt="" />
                    {topbarBalanceStatus === "success" ? `${topbarBalance.toLocaleString()}냥` : "잔액 확인"}
                  </strong>
                </button>
              )}
              <button type="button" className="topbar-notification" onClick={() => openAuthOrTab("notif")} aria-label="알림">
                🔔
                {isLoggedIn && unreadNotificationCount > 0 && <span>{notificationBadgeText}</span>}
              </button>
              <button type="button" className="topbar-user" onClick={() => openAuthOrTab("my")}>
                <span>{topbarUserLabel}</span>
                <b style={{ background: COLORS.accent }}>👤</b>
              </button>
            </div>
          )}
        </header>

        <div className="shell-content">{children}</div>
        {!hideFaqFloating && (
          <button type="button" className="faq-floating-button" onClick={() => onTab("faq")} aria-label="FAQ 도움말">
            FAQ
          </button>
        )}

        {showMobileTab && (
          <div className="mobile-tabbar-shell">
            <TabBar active={active} onTab={onTab} />
          </div>
        )}
      </main>
    </div>
  );
}
