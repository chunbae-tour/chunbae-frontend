import { useMemo, useState } from "react";
import { COLORS, S } from "../../constants/colors";
import { completeOauthSignup, getPendingOauthSignup } from "../../services/authService.js";

export default function OauthSignupPage({ onBack, onDone, onPrivacy }) {
  const pending = useMemo(() => getPendingOauthSignup(), []);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    birthdate: "",
    nickname: pending?.nickname ?? "",
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const validate = () => {
    const nextErrors = {};
    if (!pending?.signupTicket) nextErrors.ticket = "소셜 가입 인증 정보가 없습니다. 다시 로그인해주세요.";
    if (!form.name.trim()) nextErrors.name = "이름을 입력해주세요.";
    if (!/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/.test(form.phone.trim())) nextErrors.phone = "휴대폰 번호 형식을 확인해주세요.";
    if (!form.birthdate) nextErrors.birthdate = "생년월일을 선택해주세요.";
    if (!form.nickname.trim()) nextErrors.nickname = "닉네임을 입력해주세요.";
    return nextErrors;
  };

  const handleSubmit = async () => {
    if (loading) return;

    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setSubmitError("");
      return;
    }

    setErrors({});
    setSubmitError("");
    setLoading(true);

    try {
      const user = await completeOauthSignup({
        ticket: pending.signupTicket,
        name: form.name.trim(),
        phone: form.phone.trim(),
        birthdate: form.birthdate,
        nickname: form.nickname.trim(),
      });
      onDone(user);
    } catch (error) {
      setSubmitError(error.message || "소셜 가입을 완료하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: "name", label: "이름", type: "text", placeholder: "실명을 입력해주세요." },
    { key: "phone", label: "휴대폰 번호", type: "tel", placeholder: "010-1234-5678" },
    { key: "birthdate", label: "생년월일", type: "date", placeholder: "" },
    { key: "nickname", label: "닉네임", type: "text", placeholder: "앱에서 사용할 닉네임" },
  ];

  return (
    <div style={{ ...S.screen, background: COLORS.primary }}>
      <div style={{ padding: "52px 20px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <span onClick={onBack} style={{ color: "#fff", fontSize: 20, cursor: "pointer" }}>←</span>
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>소셜 회원가입</span>
      </div>
      <div style={{ ...S.scrollArea, padding: "20px 32px" }}>
        <div className="oauth-signup-card">
          <strong>추가 정보를 입력해주세요.</strong>
          <p>처음 로그인한 소셜 계정은 회원 정보를 한 번 더 등록해야 춘배투어를 이용할 수 있습니다.</p>
          {pending?.email && <small>연결 계정 {pending.email}</small>}
          {errors.ticket && <em>{errors.ticket}</em>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {fields.map(field => (
            <div key={field.key}>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, marginBottom: 6, fontWeight: 600 }}>{field.label}</div>
              <input
                value={form[field.key]}
                onChange={event => set(field.key, event.target.value)}
                type={field.type}
                placeholder={field.placeholder}
                style={{ width: "100%", background: "rgba(255,255,255,0.08)", border: `1px solid ${errors[field.key] ? "#FF6B6B" : "rgba(255,255,255,0.12)"}`, borderRadius: 14, padding: "13px 16px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
              />
              {errors[field.key] && <div style={{ color: "#FF6B6B", fontSize: 14, marginTop: 4 }}>{errors[field.key]}</div>}
            </div>
          ))}
          {submitError && <div style={{ color: "#FF6B6B", fontSize: 14 }}>{submitError}</div>}
          <button type="button" disabled={loading || !pending?.signupTicket} onClick={handleSubmit} style={{ width: "100%", background: COLORS.accent, color: COLORS.primary, border: "none", borderRadius: 14, padding: "14px 0", textAlign: "center", fontWeight: 700, fontSize: 15, cursor: loading ? "default" : "pointer", marginTop: 8, opacity: loading || !pending?.signupTicket ? 0.7 : 1 }}>
            {loading ? "가입 완료 중..." : "가입 완료하기"}
          </button>
          <p className="auth-consent-copy">
            가입을 완료하면 춘배투어의 <button type="button" onClick={onPrivacy}>개인정보처리방침</button>을 확인하고 동의한 것으로 간주됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
