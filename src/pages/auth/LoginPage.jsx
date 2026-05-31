import { useState } from "react";
import { COLORS, S } from "../../constants/colors.js";
import ChunbaeImg from "../../assets/hwangchunbae.png";
import { getDummyAccounts, login } from "../../services/authService.js";

const LOGIN_ROLES = [
  { key: "USER", label: "일반" },
  { key: "MERCHANT", label: "상인" },
  { key: "ADMIN", label: "관리자" },
];

export default function LoginPage({ onLogin, onSignup }) {
  const [role, setRole] = useState("USER");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const dummyAccounts = getDummyAccounts();

  const handleLogin = async () => {
    if (loading) return;
    if (!email || !pw) { setError("이메일과 비밀번호를 입력해주세요."); return; }
    if (!email.includes("@")) { setError("올바른 이메일 형식이 아닙니다."); return; }
    setError("");
    setLoading(true);

    try {
      const user = await login({ role, email, password: pw });
      onLogin(user);
    } catch (err) {
      setError(err.message || "로그인 중 문제가 발생했습니다.");
    } finally {
      setLoading(false);
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, background: "rgba(255,255,255,0.06)", borderRadius: 14, padding: 4 }}>
            {LOGIN_ROLES.map(r => (
              <button
                key={r.key}
                type="button"
                onClick={() => { setRole(r.key); setError(""); }}
                style={{ border: "none", borderRadius: 10, padding: "10px 0", background: role === r.key ? COLORS.accent : "transparent", color: role === r.key ? COLORS.primary : "rgba(255,255,255,0.65)", fontWeight: 700, cursor: "pointer" }}
              >
                {r.label}
              </button>
            ))}
          </div>
          <input
            value={email} onChange={e => setEmail(e.target.value)}
            placeholder="이메일"
            style={{ width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: "14px 16px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
          />
          <input
            value={pw} onChange={e => setPw(e.target.value)}
            type="password" placeholder="비밀번호"
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
          {[{ icon: "🟡", label: "카카오 로그인" }, { icon: "🟢", label: "네이버 로그인" }].map(s => (
            <div key={s.label} onClick={() => setError("소셜 로그인 API는 아직 준비 중입니다.")} style={{ flex: 1, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 0", textAlign: "center", cursor: "pointer" }}>
              <div style={{ fontSize: 18 }}>{s.icon}</div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ width: "100%", maxWidth: 460, margin: "0 auto", padding: "0 24px 40px", textAlign: "center" }}>
        {/* 더미 계정 안내 */}
        <div style={{ margin: "0 0 20px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: 14, textAlign: "left" }}>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: 700, marginBottom: 10 }}>🧪 테스트 계정</div>
          {dummyAccounts.map(a => (
            <div key={a.email} onClick={() => { setRole(a.role); setEmail(a.email); setPw(a.password); setError(""); }} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: a.email !== dummyAccounts[dummyAccounts.length - 1].email ? "0.5px solid rgba(255,255,255,0.08)" : "none", cursor: "pointer" }}>
              <div>
                <span style={{ fontSize: 14, background: a.role === "ADMIN" ? "#E24B4A" : a.role === "MERCHANT" ? COLORS.accent : COLORS.green, color: a.role === "MERCHANT" ? COLORS.primary : "#fff", borderRadius: 4, padding: "1px 6px", fontWeight: 700, marginRight: 6 }}>{a.roleLabel}</span>
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>{a.email}</span>
              </div>
              <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 14 }}>탭해서 입력</span>
            </div>
          ))}
        </div>
        {role === "USER" && (
          <>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>아직 계정이 없으신가요? </span>
            <span onClick={onSignup} style={{ color: COLORS.accent, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>회원가입</span>
          </>
        )}
      </div>
    </div>
  );
}
