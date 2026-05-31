export const COLORS = {
  primary: "#2F7D5A",
  accent: "#FFEA36",
  bg: "#F8F9FA",
  white: "#FFFFFF",
  textMuted: "#9CA3AF",
  textSub: "#4B5563",
  green: "#2F7D5A",
  greenBg: "#ECFDF5",
  red: "#FF6B35",
};

export const S = {
  app: {
    width: "100%",
    background: COLORS.bg,
    minHeight: "100vh",
    fontFamily: "'Noto Sans KR', -apple-system, sans-serif",
    position: "relative",
    overflowX: "hidden",
  },
  screen: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    overflow: "hidden",
  },
  scrollArea: {
    flex: 1,
    overflowY: "auto",
    paddingBottom: 80,
  },
  tabBar: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    background: "#FFFFFF",
    borderTop: "0.5px solid rgba(0,0,0,0.08)",
    display: "flex",
    padding: "8px 0 20px",
    zIndex: 100,
  },
  tabLabel: (active) => ({
    fontSize: 11,
    color: active ? COLORS.primary : "#ccc",
    fontWeight: 600,
  }),
};
