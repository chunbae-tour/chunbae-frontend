import { useMemo, useRef, useState } from "react";
import { S } from "../../constants/colors";
import ChunbaeImg from "../../assets/hwangchunbae.png";
import { completeOauthSignup, getPendingOauthSignup } from "../../services/authService.js";

function formatPhoneNumber(value) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

function getPhoneDigits(value) {
  return value.replace(/\D/g, "");
}

function getBirthParts(value) {
  const [year = "", month = "", day = ""] = String(value || "").split("-");
  return { year, month, day };
}

function isValidBirthdate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export default function OauthSignupPage({ onBack, onDone, onPrivacy, onHome }) {
  const pending = useMemo(() => getPendingOauthSignup(), []);
  const monthInputRef = useRef(null);
  const dayInputRef = useRef(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    birthdate: "",
    nickname: "",
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

  const setPhone = (value) => {
    set("phone", formatPhoneNumber(value));
  };

  const setBirthPart = (key, rawValue) => {
    const limits = { year: 4, month: 2, day: 2 };
    const nextValue = rawValue.replace(/\D/g, "").slice(0, limits[key]);
    const parts = { ...getBirthParts(form.birthdate), [key]: nextValue };
    const birthdate = parts.year || parts.month || parts.day
      ? `${parts.year}${parts.year.length === 4 || parts.month || parts.day ? "-" : ""}${parts.month}${parts.month.length === 2 || parts.day ? "-" : ""}${parts.day}`
      : "";

    set("birthdate", birthdate);

    if (key === "year" && nextValue.length === 4) monthInputRef.current?.focus();
    if (key === "month" && nextValue.length === 2) dayInputRef.current?.focus();
  };

  const padBirthPart = (key) => {
    const parts = getBirthParts(form.birthdate);
    if (!parts[key]) return;
    const nextParts = { ...parts, [key]: parts[key].padStart(key === "year" ? 4 : 2, "0") };
    set("birthdate", `${nextParts.year}-${nextParts.month}-${nextParts.day}`);
  };

  const birthParts = getBirthParts(form.birthdate);

  const validate = () => {
    const nextErrors = {};
    if (!pending?.signupTicket) nextErrors.ticket = "소셜 가입 인증 정보가 없습니다. 다시 로그인해주세요.";
    if (!form.name.trim()) nextErrors.name = "이름을 입력해주세요.";
    if (!/^01[0-9]{8,9}$/.test(getPhoneDigits(form.phone))) nextErrors.phone = "휴대폰 번호 형식을 확인해주세요.";
    if (!isValidBirthdate(form.birthdate)) nextErrors.birthdate = "생년월일을 끝까지 입력해주세요.";
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
        phone: formatPhoneNumber(form.phone),
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
    { key: "nickname", label: "닉네임", type: "text", placeholder: "앱에서 사용할 닉네임" },
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
          <label className="auth-field">
            <span>이름</span>
            <input
              value={form.name}
              onChange={event => set("name", event.target.value)}
              type="text"
              placeholder="실명을 입력해주세요."
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "name-error" : undefined}
            />
            {errors.name && <em id="name-error">{errors.name}</em>}
          </label>

          <label className="auth-field">
            <span>휴대폰 번호</span>
            <input
              value={form.phone}
              onChange={event => setPhone(event.target.value)}
              type="tel"
              inputMode="numeric"
              placeholder="01012345678"
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? "phone-error" : undefined}
            />
            {errors.phone && <em id="phone-error">{errors.phone}</em>}
          </label>

          <fieldset className="auth-field oauth-birth-field">
            <legend>생년월일</legend>
            <div className="oauth-birth-inputs">
              <input
                value={birthParts.year}
                onChange={event => setBirthPart("year", event.target.value)}
                type="text"
                inputMode="numeric"
                placeholder="YYYY"
                maxLength={4}
                aria-label="출생 연도"
                aria-invalid={Boolean(errors.birthdate)}
              />
              <span>년</span>
              <input
                ref={monthInputRef}
                value={birthParts.month}
                onChange={event => setBirthPart("month", event.target.value)}
                onBlur={() => padBirthPart("month")}
                type="text"
                inputMode="numeric"
                placeholder="MM"
                maxLength={2}
                aria-label="출생 월"
                aria-invalid={Boolean(errors.birthdate)}
              />
              <span>월</span>
              <input
                ref={dayInputRef}
                value={birthParts.day}
                onChange={event => setBirthPart("day", event.target.value)}
                onBlur={() => padBirthPart("day")}
                type="text"
                inputMode="numeric"
                placeholder="DD"
                maxLength={2}
                aria-label="출생 일"
                aria-invalid={Boolean(errors.birthdate)}
              />
              <span>일</span>
            </div>
            {errors.birthdate && <em id="birthdate-error">{errors.birthdate}</em>}
          </fieldset>

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
