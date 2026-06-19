import { S } from "../../constants/colors";

export default function TabBar({ active, onTab }) {
  const tabs = [
    { key: "home", label: "홈", icon: "🏠" },
    { key: "map", label: "지도", icon: "🗺️" },
    { key: "community", label: "커뮤니티", icon: "👥" },
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
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          className="mobile-tabbar-button"
          style={tabButtonStyle}
          onClick={() => onTab(t.key)}
          aria-current={active === t.key ? "page" : undefined}
        >
          <span style={{ fontSize: 22 }}>{t.icon}</span>
          <span style={S.tabLabel(active === t.key)}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}
