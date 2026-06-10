import { useState } from "react";
import { COLORS, S } from "../../constants/colors";
import { signupAndLogin } from "../../services/authService.js";

export default function SignupPage({ onBack, onDone, onPrivacy }) {
  const [form, setForm] = useState({ email: "", pw: "", pwConfirm: "", nickname: "" });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.email.includes("@")) e.email = "올바른 이메일 형식이 아닙니다.";
    if (!/^(?=.*[A-Za-z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(form.pw)) e.pw = "비밀번호는 영문, 숫자, 특수문자를 포함해 8자 이상이어야 합니다.";
    if (form.pw !== form.pwConfirm) e.pwConfirm = "비밀번호가 일치하지 않습니다.";
    if (form.nickname.length < 2) e.nickname = "닉네임은 2자 이상이어야 합니다.";
    return e;
  };

  const handleSignup = async () => {
    if (loading) return;
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); setSubmitError(""); return; }
    setErrors({});
    setSubmitError("");
    setLoading(true);

    try {
      const user = await signupAndLogin({
        email: form.email,
        password: form.pw,
        nickname: form.nickname,
      });
      onDone(user);
    } catch (err) {
      setSubmitError(err.message || "회원가입 중 문제가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: "email", label: "이메일", type: "email", placeholder: "example@email.com" },
    { key: "pw", label: "비밀번호", type: "password", placeholder: "영문/숫자/특수문자 포함 8자 이상" },
    { key: "pwConfirm", label: "비밀번호 확인", type: "password", placeholder: "비밀번호 재입력" },
    { key: "nickname", label: "닉네임", type: "text", placeholder: "2자 이상 입력" },
  ];

  return (
    <div style={{ ...S.screen, background: COLORS.primary }}>
      <div style={{ padding: "52px 20px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <span onClick={onBack} style={{ color: "#fff", fontSize: 20, cursor: "pointer" }}>←</span>
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>회원가입</span>
      </div>
      <div style={{ ...S.scrollArea, padding: "20px 32px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {fields.map(f => (
            <div key={f.key}>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, marginBottom: 6, fontWeight: 600 }}>{f.label}</div>
              <input
                value={form[f.key]} onChange={e => set(f.key, e.target.value)}
                type={f.type} placeholder={f.placeholder}
                style={{ width: "100%", background: "rgba(255,255,255,0.08)", border: `1px solid ${errors[f.key] ? "#FF6B6B" : "rgba(255,255,255,0.12)"}`, borderRadius: 14, padding: "13px 16px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
              />
              {errors[f.key] && <div style={{ color: "#FF6B6B", fontSize: 14, marginTop: 4 }}>{errors[f.key]}</div>}
            </div>
          ))}
          {submitError && <div style={{ color: "#FF6B6B", fontSize: 14 }}>{submitError}</div>}
          <button type="button" disabled={loading} onClick={handleSignup} style={{ width: "100%", background: COLORS.accent, color: COLORS.primary, border: "none", borderRadius: 14, padding: "14px 0", textAlign: "center", fontWeight: 700, fontSize: 15, cursor: loading ? "default" : "pointer", marginTop: 8, opacity: loading ? 0.7 : 1 }}>
            {loading ? "가입 및 로그인 중..." : "가입하기"}
          </button>
          <p className="auth-consent-copy">
            가입하면 춘배투어의 <button type="button" onClick={onPrivacy}>개인정보처리방침</button>을 확인하고 동의한 것으로 간주됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
