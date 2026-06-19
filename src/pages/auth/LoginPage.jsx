import { useState } from "react";
import { COLORS, S } from "../../constants/colors.js";
import ChunbaeImg from "../../assets/hwangchunbae.png";
import DogMascot from "../../components/auth/DogMascot.jsx";
import { getSocialLoginUrl, login } from "../../services/authService.js";

const ROLE_LOGIN_CONFIG = {
  USER: {
    title: "춘배투어",
    subtitle: "전통시장 · 관광지 · 동행 매칭",
    buttonLabel: "로그인",
    loadingLabel: "로그인 중...",
    background: COLORS.primary,
    showSocial: true,
    showSignup: true,
    badge: null,
  },
  MERCHANT: {
    title: "상인 로그인",
    subtitle: "가게 운영과 QR 결제를 관리합니다.",
    buttonLabel: "상인으로 로그인",
    loadingLabel: "상인 로그인 중...",
    background: "#245f48",
    showSocial: true,
    showSignup: false,
    badge: "MERCHANT",
  },
  ADMIN: {
    title: "관리자 로그인",
    subtitle: "춘배투어 운영자 전용 페이지입니다.",
    buttonLabel: "관리자로 로그인",
    loadingLabel: "관리자 로그인 중...",
    background: "#1f2733",
    showSocial: false,
    showSignup: false,
    badge: "ADMIN",
  },
};

export default function LoginPage({
  onLogin,
  onSignup,
  onPrivacy,
  onHome,
  role = "USER",
  notice = "",
  onNoticeClear,
}) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const normalizedRole = String(role || "USER").toUpperCase();
  const loginConfig = ROLE_LOGIN_CONFIG[normalizedRole] ?? ROLE_LOGIN_CONFIG.USER;
  const visibleError = error || notice;

  const clearAuthFeedback = () => {
    setError("");
    onNoticeClear?.();
  };

  const handleLogin = async () => {
    if (loading) return;
    const normalizedEmail = email.trim();
    const normalizedPassword = pw.trim();
    if (!normalizedEmail || !normalizedPassword) {
      clearAuthFeedback();
      setError("이메일과 비밀번호를 입력해주세요.");
      return;
    }
    if (!normalizedEmail.includes("@")) {
      clearAuthFeedback();
      setError("올바른 이메일 형식이 아닙니다.");
      return;
    }
    clearAuthFeedback();
    setLoading(true);

    try {
      const user = await login({
        role: normalizedRole,
        email: normalizedEmail,
        password: normalizedPassword,
      });
      onLogin(user);
    } catch (err) {
      setError(err.message || "로그인 중 문제가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider) => {
    try {
      clearAuthFeedback();
      window.location.href = getSocialLoginUrl(provider, { role: normalizedRole });
    } catch (err) {
      setError(err.message || "소셜 로그인 URL 설정이 필요합니다.");
    }
  };

  return (
    <div
      className="auth-screen"
      style={{ ...S.screen, overflow: "auto", "--auth-background": loginConfig.background }}
    >
      <div className="auth-login-panel">
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <button
            type="button"
            className="auth-brand-home-button"
            onClick={onHome}
            aria-label="춘배투어 홈으로 이동"
          >
            <img
              src={ChunbaeImg}
              alt="춘배 캐릭터"
              style={{ width: 120, height: 120, objectFit: "contain" }}
            />
          </button>
          {loginConfig.badge && <div className="role-login-badge">{loginConfig.badge}</div>}
          <div style={{ color: COLORS.accent, fontSize: 26, fontWeight: 700 }}>
            {loginConfig.title}
          </div>
          <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginTop: 6 }}>
            {loginConfig.subtitle}
          </div>
        </div>
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            value={email}
            onChange={(e) => {
              clearAuthFeedback();
              setEmail(e.target.value);
            }}
            placeholder="이메일"
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 14,
              padding: "14px 16px",
              color: "#fff",
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          <input
            value={pw}
            onChange={(e) => {
              clearAuthFeedback();
              setPw(e.target.value);
            }}
            type="password"
            placeholder="비밀번호"
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 14,
              padding: "14px 16px",
              color: "#fff",
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          {visibleError && (
            <div style={{ color: "#FF6B6B", fontSize: 14, paddingLeft: 4 }}>{visibleError}</div>
          )}
          <button
            type="button"
            disabled={loading}
            onClick={handleLogin}
            style={{
              width: "100%",
              background: COLORS.accent,
              color: COLORS.primary,
              border: "none",
              borderRadius: 14,
              padding: "14px 0",
              textAlign: "center",
              fontWeight: 700,
              fontSize: 15,
              cursor: loading ? "default" : "pointer",
              marginTop: 4,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? loginConfig.loadingLabel : loginConfig.buttonLabel}
          </button>
        </div>
        {loginConfig.showSocial && (
          <>
            <div
              style={{
                marginTop: 24,
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
              }}
            >
              <div style={{ flex: 1, height: "0.5px", background: "rgba(255,255,255,0.15)" }} />
              <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 14 }}>또는</span>
              <div style={{ flex: 1, height: "0.5px", background: "rgba(255,255,255,0.15)" }} />
            </div>
            <div className="social-login-stack">
              {[
                { icon: "talk", label: "Kakao로 시작하기", provider: "KAKAO", className: "kakao" },
                { icon: "N", label: "Naver로 시작하기", provider: "NAVER", className: "naver" },
              ].map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => handleSocialLogin(s.provider)}
                  className={`social-login-button ${s.className}`}
                >
                  <span className={`social-login-icon ${s.className}`} aria-hidden="true">
                    {s.icon}
                  </span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      {normalizedRole === "USER" && <DogMascot />}
      <div className="auth-login-footer">
        {loginConfig.showSignup ? (
          <>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
              아직 계정이 없으신가요?{" "}
            </span>
            <span
              onClick={onSignup}
              style={{ color: COLORS.accent, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
            >
              회원가입
            </span>
          </>
        ) : (
          <button type="button" className="role-login-home-link" onClick={onHome}>
            춘배투어 홈으로
          </button>
        )}
        <div className="auth-policy-link">
          <button type="button" onClick={onPrivacy}>
            개인정보처리방침
          </button>
        </div>
      </div>
    </div>
  );
}
