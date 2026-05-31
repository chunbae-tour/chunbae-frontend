import { COLORS, S } from "../../constants/colors";

export default function TabBar({ active, onTab, onAR }) {
  const tabs = [
    { key: "home", label: "홈", icon: "🏠" },
    { key: "map", label: "지도", icon: "🗺️" },
    { key: "chat", label: "채팅", icon: "💬" },
    { key: "my", label: "마이", icon: "👤" },
  ];
  const tabButtonStyle = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 3,
    cursor: "pointer",
    padding: "4px 0",
    border: 0,
    background: "transparent",
    fontFamily: "inherit",
  };

  return (
    <div style={S.tabBar}>
      {tabs.slice(0, 2).map((t) => (
        <button key={t.key} type="button" className="mobile-tabbar-button" style={tabButtonStyle} onClick={() => onTab(t.key)} aria-current={active === t.key ? "page" : undefined}>
          <span style={{ fontSize: 22 }}>{t.icon}</span>
          <span style={S.tabLabel(active === t.key)}>{t.label}</span>
        </button>
      ))}
      <button type="button" className="mobile-tabbar-button mobile-tabbar-ar" style={{ ...tabButtonStyle, gap: 0 }} onClick={onAR} aria-label="AR 카메라">
        <div className="mobile-tabbar-ar-mark" style={{ width: 50, height: 50, background: COLORS.accent, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginTop: -22, boxShadow: "0 4px 12px rgba(255,180,30,0.35)" }}>
          <span style={{ fontSize: 22 }}>📷</span>
        </div>
        <span style={{ fontSize: 14, color: COLORS.accent, fontWeight: 700, marginTop: 2 }}>AR</span>
      </button>
      {tabs.slice(2).map((t) => (
        <button key={t.key} type="button" className="mobile-tabbar-button" style={tabButtonStyle} onClick={() => onTab(t.key)} aria-current={active === t.key ? "page" : undefined}>
          <span style={{ fontSize: 22 }}>{t.icon}</span>
          <span style={S.tabLabel(active === t.key)}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}
