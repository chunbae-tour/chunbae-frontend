import { useState } from "react";
import { S } from "../../constants/colors";
import ChunbaeImg from "../../assets/hwangchunbae.png";
import { getSocialLoginUrl, signupAndLogin } from "../../services/authService.js";

export default function SignupPage({ onBack, onDone, onPrivacy, onHome }) {
  const [form, setForm] = useState({ email: "", pw: "", pwConfirm: "", nickname: "" });
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
    const email = form.email.trim();
    const password = form.pw.trim();
    const passwordConfirm = form.pwConfirm.trim();
    const nickname = form.nickname.trim();
    if (!email.includes("@")) nextErrors.email = "올바른 이메일 형식이 아닙니다.";
    if (!/^(?=.*[A-Za-z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(password)) nextErrors.pw = "비밀번호는 영문, 숫자, 특수문자를 포함해 8자 이상이어야 합니다.";
    if (password !== passwordConfirm) nextErrors.pwConfirm = "비밀번호가 일치하지 않습니다.";
    if (nickname.length < 2) nextErrors.nickname = "닉네임은 2자 이상이어야 합니다.";
    if (!consents.privacy) nextErrors.privacy = "개인정보 수집·이용 동의가 필요합니다.";
    return nextErrors;
  };

  const handleSignup = async () => {
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
      const user = await signupAndLogin({
        email: form.email.trim(),
        password: form.pw.trim(),
        nickname: form.nickname.trim(),
      });
      onDone(user);
    } catch (err) {
      setSubmitError(err.message || "회원가입 중 문제가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignup = (provider) => {
    if (!consents.privacy) {
      setErrors(current => ({ ...current, privacy: "개인정보 수집·이용 동의가 필요합니다." }));
      return;
    }
    try {
      window.location.href = getSocialLoginUrl(provider);
    } catch (err) {
      setSubmitError(err.message || "소셜 회원가입 URL 설정이 필요합니다.");
    }
  };

  const fields = [
    { key: "email", label: "이메일", type: "email", placeholder: "example@email.com" },
    { key: "pw", label: "비밀번호", type: "password", placeholder: "영문/숫자/특수문자 포함 8자 이상" },
    { key: "pwConfirm", label: "비밀번호 확인", type: "password", placeholder: "비밀번호 재입력" },
    { key: "nickname", label: "닉네임", type: "text", placeholder: "2자 이상 입력" },
  ];

  return (
    <div className="auth-screen auth-signup-screen" style={{ ...S.screen, overflow: "auto", "--auth-background": "#2d8a5e" }}>
      <main className="auth-signup-panel">
        <button type="button" className="auth-signup-brand-button" onClick={onHome} aria-label="춘배투어 홈으로 이동">
          <img src={ChunbaeImg} alt="춘배 캐릭터" />
        </button>
        <div className="auth-signup-heading">
          <button type="button" className="auth-back-button" onClick={onBack} aria-label="로그인으로 돌아가기">←</button>
          <div>
            <strong>회원가입</strong>
            <span>춘배투어와 함께 로컬 여행을 시작해보세요.</span>
          </div>
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
          <button type="button" className="auth-primary-button" disabled={loading} onClick={handleSignup}>
            {loading ? "가입 및 로그인 중..." : "가입하기"}
          </button>

          <div className="auth-divider"><span>또는</span></div>
          <div className="social-login-stack auth-signup-social">
            {[
              { icon: "talk", label: "Kakao로 시작하기", provider: "KAKAO", className: "kakao" },
              { icon: "N", label: "Naver로 시작하기", provider: "NAVER", className: "naver" },
            ].map(social => (
              <button key={social.label} type="button" onClick={() => handleSocialSignup(social.provider)} className={`social-login-button ${social.className}`}>
                <span className={`social-login-icon ${social.className}`} aria-hidden="true">{social.icon}</span>
                <span>{social.label}</span>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
