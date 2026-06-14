import { useMemo, useState } from "react";
import { S } from "../../constants/colors";
import { completeOauthSignup, getPendingOauthSignup } from "../../services/authService.js";

export default function OauthSignupPage({ onBack, onDone, onPrivacy }) {
  const pending = useMemo(() => getPendingOauthSignup(), []);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    birthdate: "",
    nickname: pending?.nickname ?? "",
  });
  const [consents, setConsents] = useState({ privacy: false, marketing: false });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (key, value) => {
    setForm(current => ({ ...current, [key]: value }));
    if (errors[key]) {
      setErrors(current => ({ ...current, [key]: undefined }));
    }
  };

  const validate = () => {
    const nextErrors = {};
    if (!pending?.signupTicket) nextErrors.ticket = "소셜 가입 인증 정보가 없습니다. 다시 로그인해주세요.";
    if (!form.name.trim()) nextErrors.name = "이름을 입력해주세요.";
    if (!/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/.test(form.phone.trim())) nextErrors.phone = "휴대폰 번호 형식을 확인해주세요.";
    if (!form.birthdate) nextErrors.birthdate = "생년월일을 선택해주세요.";
    if (!form.nickname.trim()) nextErrors.nickname = "닉네임을 입력해주세요.";
    if (!consents.privacy) nextErrors.privacy = "개인정보 수집·이용 동의가 필요합니다.";
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
    <div className="auth-screen auth-signup-screen" style={{ ...S.screen, overflow: "auto", "--auth-background": "#2d8a5e" }}>
      <main className="auth-signup-panel">
        <div className="auth-signup-heading">
          <button type="button" className="auth-back-button" onClick={onBack} aria-label="로그인으로 돌아가기">←</button>
          <div>
            <strong>소셜 회원가입</strong>
            <span>추가 정보를 입력하면 바로 여행을 시작할 수 있어요.</span>
          </div>
        </div>

        <div className="oauth-signup-card">
          <strong>연결된 계정을 확인했어요.</strong>
          <p>처음 로그인한 소셜 계정은 회원 정보를 한 번 더 등록해야 합니다.</p>
          {pending?.email && <small>연결 계정 {pending.email}</small>}
          {errors.ticket && <em>{errors.ticket}</em>}
        </div>

        <div className="auth-signup-form">
          {fields.map(field => (
            <label key={field.key} className="auth-field">
              <span>{field.label}</span>
              <input
                value={form[field.key]}
                onChange={event => set(field.key, event.target.value)}
                type={field.type}
                placeholder={field.placeholder}
                aria-invalid={Boolean(errors[field.key])}
                aria-describedby={errors[field.key] ? `${field.key}-error` : undefined}
              />
              {errors[field.key] && <em id={`${field.key}-error`}>{errors[field.key]}</em>}
            </label>
          ))}

          <div className="auth-consent-box">
            <label className={errors.privacy ? "auth-consent-row error" : "auth-consent-row"}>
              <input
                type="checkbox"
                checked={consents.privacy}
                onChange={event => {
                  setConsents(current => ({ ...current, privacy: event.target.checked }));
                  setErrors(current => ({ ...current, privacy: undefined }));
                }}
              />
              <span><b>필수</b> 개인정보 수집·이용에 동의합니다.</span>
              <button type="button" onClick={onPrivacy}>내용 보기</button>
            </label>
            {errors.privacy && <em>{errors.privacy}</em>}
            <label className="auth-consent-row">
              <input
                type="checkbox"
                checked={consents.marketing}
                onChange={event => setConsents(current => ({ ...current, marketing: event.target.checked }))}
              />
              <span><i>선택</i> 여행 소식 및 혜택 안내에 동의합니다.</span>
            </label>
          </div>

          {submitError && <div className="auth-submit-error" role="alert">{submitError}</div>}
          <button type="button" className="auth-primary-button" disabled={loading || !pending?.signupTicket} onClick={handleSubmit}>
            {loading ? "가입 완료 중..." : "가입 완료하기"}
          </button>
        </div>
      </main>
    </div>
  );
}
