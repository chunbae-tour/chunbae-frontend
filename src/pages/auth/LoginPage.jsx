import { useState } from "react";
import { COLORS, S } from "../../constants/colors.js";
import ChunbaeImg from "../../assets/hwangchunbae.png";
import { getSocialLoginUrl, login } from "../../services/authService.js";

export default function LoginPage({ onLogin, onSignup }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (loading) return;
    if (!email || !pw) { setError("이메일과 비밀번호를 입력해주세요."); return; }
    if (!email.includes("@")) { setError("올바른 이메일 형식이 아닙니다."); return; }
    setError("");
    setLoading(true);

    try {
      const user = await login({ email, password: pw });
      onLogin(user);
    } catch (err) {
      setError(err.message || "로그인 중 문제가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider) => {
    try {
      window.location.href = getSocialLoginUrl(provider);
    } catch (err) {
      setError(err.message || "소셜 로그인 URL 설정이 필요합니다.");
    }
  };

  return (
    <div className="auth-screen" style={{ ...S.screen, background: COLORS.primary }}>
      <div style={{ flex: 1, width: "100%", maxWidth: 460, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <img
            src={ChunbaeImg}
            alt="춘배 캐릭터"
            style={{ width: 120, height: 120, objectFit: "contain", marginBottom: 12 }}
          />
          <div style={{ color: COLORS.accent, fontSize: 26, fontWeight: 700 }}>춘배투어</div>
          <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginTop: 6 }}>전통시장 · 관광지 · 동행 매칭</div>
        </div>
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            value={email}
            onChange={e => { setEmail(e.target.value); }}
            placeholder="이메일"
            style={{ width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: "14px 16px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
          />
          <input
            value={pw}
            onChange={e => { setPw(e.target.value); }}
            type="password"
            placeholder="비밀번호"
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            style={{ width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: "14px 16px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
          />
          {error && <div style={{ color: "#FF6B6B", fontSize: 14, paddingLeft: 4 }}>{error}</div>}
          <button type="button" disabled={loading} onClick={handleLogin} style={{ width: "100%", background: COLORS.accent, color: COLORS.primary, border: "none", borderRadius: 14, padding: "14px 0", textAlign: "center", fontWeight: 700, fontSize: 15, cursor: loading ? "default" : "pointer", marginTop: 4, opacity: loading ? 0.7 : 1 }}>
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </div>
        <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
          <div style={{ flex: 1, height: "0.5px", background: "rgba(255,255,255,0.15)" }} />
          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 14 }}>또는</span>
          <div style={{ flex: 1, height: "0.5px", background: "rgba(255,255,255,0.15)" }} />
        </div>
        <div style={{ marginTop: 20, display: "flex", gap: 12, width: "100%" }}>
          {[{ icon: "🟡", label: "카카오 로그인", provider: "KAKAO" }, { icon: "🟢", label: "네이버 로그인", provider: "NAVER" }].map(s => (
            <div key={s.label} onClick={() => handleSocialLogin(s.provider)} style={{ flex: 1, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 0", textAlign: "center", cursor: "pointer" }}>
              <div style={{ fontSize: 18 }}>{s.icon}</div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ width: "100%", maxWidth: 460, margin: "0 auto", padding: "0 24px 40px", textAlign: "center" }}>
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>아직 계정이 없으신가요? </span>
        <span onClick={onSignup} style={{ color: COLORS.accent, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>회원가입</span>
      </div>
    </div>
  );
}
