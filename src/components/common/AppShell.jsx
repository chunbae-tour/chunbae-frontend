import { useState } from "react";
import { COLORS } from "../../constants/colors.js";
import TabBar from "./TabBar.jsx";
import YeopjeonImg from "../../assets/brand/yeopjeon-icon.png";
import MascotDefault from "../../assets/brand/mascot-default.png";

const NAV_ITEMS = [
  { key: "map", label: "지도", icon: "🗺️" },
  { key: "search", label: "검색", icon: "🔍" },
  { key: "fest", label: "축제", icon: "🎉" },
  { key: "community", label: "커뮤니티", icon: "👥" },
  { key: "chat", label: "채팅", icon: "💬" },
  { key: "store", label: "스토어", icon: "🏪" },
  { key: "my", label: "마이", icon: "👤" },
];

const NAV_KEYS = new Set(NAV_ITEMS.map((item) => item.key));

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

export default function AppShell({ active, screen, onTab, onHome, user, onLogin, showMobileTab, unreadNotificationCount = 0, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const selectedKey = SCREEN_NAV_KEY[screen] || (NAV_KEYS.has(screen) ? screen : active);
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
  const notificationBadgeText = unreadNotificationCount > 99 ? "99+" : String(unreadNotificationCount);
  const openAuthOrTab = (key) => {
    if (!isLoggedIn && ["my", "pay", "notif"].includes(key)) {
      onLogin?.();
      return;
    }
    onTab(key);
  };

  return (
    <div className={`app-shell ${sidebarOpen ? "sidebar-expanded" : "sidebar-collapsed"}`}>
      <aside className="desktop-sidebar">
        <div className="sidebar-head">
          <button type="button" className="sidebar-brand" onClick={onHome || (() => onTab("home"))} aria-label="춘배투어 홈으로 이동">
            <div className="brand-mark">
              <img src={MascotDefault} alt="" />
            </div>
            <div className="sidebar-brand-text">
              <strong>춘배투어</strong>
              <span>ChunBae Tour</span>
            </div>
          </button>
          <button
            type="button"
            className="sidebar-menu-toggle"
            onClick={() => setSidebarOpen(open => !open)}
            aria-label={sidebarOpen ? "사이드 메뉴 접기" : "사이드 메뉴 열기"}
            aria-expanded={sidebarOpen}
          >
            ☰
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="주요 화면" aria-hidden={!sidebarOpen}>
          {NAV_ITEMS.map((item) => {
            const isActive = selectedKey === item.key;

            return (
              <button
                key={item.key}
                type="button"
                className={isActive ? "sidebar-nav-item active" : "sidebar-nav-item"}
                onClick={() => onTab(item.key)}
                title={item.label}
              >
                <span className="sidebar-nav-icon">{item.icon}</span>
                <span className="sidebar-nav-label">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="shell-main">
        <header className="desktop-topbar">
          <div className="topbar-spacer" aria-hidden="true" />
          <div className="topbar-actions">
            {isLoggedIn && (
              <button type="button" className="topbar-yeopjeon" onClick={() => openAuthOrTab("pay")}>
                <span>내 엽전 잔액</span>
                <strong><img src={YeopjeonImg} alt="" /> 잔액 확인</strong>
              </button>
            )}
            <button type="button" className="topbar-notification" onClick={() => openAuthOrTab("notif")} aria-label="알림">
              🔔
              {isLoggedIn && unreadNotificationCount > 0 && <span>{notificationBadgeText}</span>}
            </button>
            <button type="button" className="topbar-user" onClick={() => openAuthOrTab("my")}>
              <span>{user?.nickname || "로그인"}</span>
              <b style={{ background: COLORS.accent }}>👤</b>
            </button>
          </div>
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
