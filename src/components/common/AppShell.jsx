import { useState } from "react";
import { COLORS } from "../../constants/colors.js";
import TabBar from "./TabBar.jsx";
import YeopjeonImg from "../../assets/brand/yeopjeon-icon.png";
import MascotDefault from "../../assets/brand/mascot-default.png";
import { LANG_CODE_MAP } from "../../services/translationService.js";

const LANGUAGES = [
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "zh-CN", label: "中文", flag: "🇨🇳" },
];

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

export default function AppShell({ active, screen, onTab, onAR, onHome, user, onLogin, showMobileTab, children, lang, onLangChange }) {
  const selectedKey = screen === "place" || screen === "direction" ? "map" : screen;
  const hideFaqFloating = [
    "chatroom",
    "qrpay",
    "ar",
    "pay",
    "payHistory",
    "merchant",
    "merchantMenu",
    "merchantSettlement",
    "faq",
    "login",
    "signup",
  ].includes(screen);
  const [langOpen, setLangOpen] = useState(false);
  const currentLang = LANGUAGES.find((l) => l.code === (lang || "ko"));
  const isLoggedIn = Boolean(user);
  const openAuthOrTab = (key) => {
    if (!isLoggedIn && ["my", "pay", "notif"].includes(key)) {
      onLogin?.();
      return;
    }
    onTab(key);
  };

  return (
    <div className="app-shell">
      <aside className="desktop-sidebar">
        <button type="button" className="sidebar-brand" onClick={onHome || (() => onTab("home"))} aria-label="춘배투어 홈으로 이동">
          <div className="brand-mark">
            <img src={MascotDefault} alt="" />
          </div>
          <div>
            <strong>춘배투어</strong>
            <span>ChunBae Tour</span>
          </div>
        </button>

        <nav className="sidebar-nav" aria-label="주요 화면">
          {NAV_ITEMS.map((item) => {
            const isActive = selectedKey === item.key || active === item.key;

            return (
              <button
                key={item.key}
                type="button"
                className={isActive ? "sidebar-nav-item active" : "sidebar-nav-item"}
                onClick={() => onTab(item.key)}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        <button type="button" className="sidebar-ar-button" onClick={onAR}>
          <span>📷</span>
          AR 카메라
        </button>
      </aside>

      <main className="shell-main">
        <header className="desktop-topbar">
          <div className="topbar-spacer" aria-hidden="true" />
          <div className="topbar-actions">
            <div className="topbar-lang-wrap">
              <button
                type="button"
                className="topbar-lang-btn"
                onClick={() => setLangOpen((v) => !v)}
                aria-label="언어 선택"
              >
                {currentLang.flag} {currentLang.label}
                <span className="topbar-lang-caret">{langOpen ? "▲" : "▼"}</span>
              </button>
              {langOpen && (
                <div className="topbar-lang-dropdown">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      className={l.code === (lang || "ko") ? "active" : ""}
                      onClick={() => { onLangChange?.(l.code); setLangOpen(false); }}
                    >
                      {l.flag} {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {isLoggedIn && (
              <button type="button" className="topbar-yeopjeon" onClick={() => openAuthOrTab("pay")}>
                <span>내 엽전 잔액</span>
                <strong><img src={YeopjeonImg} alt="" /> 잔액 확인</strong>
              </button>
            )}
            <button type="button" className="topbar-notification" onClick={() => openAuthOrTab("notif")} aria-label="알림">
              🔔
              {isLoggedIn && <span />}
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
            <TabBar active={active} onTab={onTab} onAR={onAR} />
          </div>
        )}
      </main>
    </div>
  );
}
