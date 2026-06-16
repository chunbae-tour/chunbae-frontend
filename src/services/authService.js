import { apiRequest, ApiClientError, getAccessToken, isAuthError } from "./apiClient.js";

const ROLE_CONFIG = {
  USER: {
    tokenKey: "userAccessToken",
    userKey: "userProfile",
  },
  MERCHANT: {
    tokenKey: "merchantAccessToken",
    userKey: "merchantProfile",
  },
  ADMIN: {
    tokenKey: "adminAccessToken",
    userKey: "adminProfile",
  },
};

const ROLE_ENDPOINTS = {
  USER: {
    login: "/users/auth/login",
    signup: "/users/auth/signup",
  },
  MERCHANT: {
    login: "/merchants/auth/login",
  },
  ADMIN: {
    login: "/admin/auth/login",
  },
};

const SOCIAL_CONFIG = {
  KAKAO: {
    loginUrl: import.meta.env.VITE_KAKAO_LOGIN_URL || "",
    clientId: import.meta.env.VITE_KAKAO_REST_API_KEY || "",
    authorizeUrl: "https://kauth.kakao.com/oauth/authorize",
    callbackPath: "/oauth/kakao/callback",
  },
  NAVER: {
    loginUrl: import.meta.env.VITE_NAVER_LOGIN_URL || "",
    clientId: import.meta.env.VITE_NAVER_CLIENT_ID || "",
    authorizeUrl: "https://nid.naver.com/oauth2.0/authorize",
    callbackPath: "/oauth/naver/callback",
  },
};
const PENDING_SOCIAL_AUTH_KEY = "pendingSocialAuth";

function trimInput(value) {
  return String(value ?? "").trim();
}

function normalizePhoneInput(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return trimInput(value);
}

function normalizeRole(role, fallbackRole = "USER") {
  const normalizedRole = String(role || fallbackRole).toUpperCase();
  return ROLE_CONFIG[normalizedRole] ? normalizedRole : fallbackRole;
}

function normalizeAuthData(data, fallbackRole) {
  const nickname = data.nickname
    ?? data.name
    ?? data.username
    ?? (data.email ? String(data.email).split("@")[0] : undefined);

  return {
    accessToken: data.accessToken,
    role: data.role ?? fallbackRole,
    userId: data.userId ?? data.id ?? data.accountId,
    email: data.email,
    nickname: nickname ?? "",
    profileImageUrl: data.profileImageUrl,
    language: data.language,
    companionScore: data.companionScore,
    companionReviewCount: data.companionReviewCount,
    status: data.status,
    createdAt: data.createdAt,
  };
}

function saveSession(authData) {
  const role = String(authData.role || "USER").toUpperCase();
  const config = ROLE_CONFIG[role];

  if (!config || !authData.accessToken) {
    throw new ApiClientError("로그인 응답에 토큰 정보가 없습니다.", "AUTH_TOKEN_MISSING");
  }

  sessionStorage.setItem(config.tokenKey, authData.accessToken);
  sessionStorage.setItem(config.userKey, JSON.stringify(authData));
}

function getSocialCallbackUrl(provider) {
  const normalizedProvider = String(provider || "").toUpperCase();
  const config = SOCIAL_CONFIG[normalizedProvider];
  if (!config) {
    throw new ApiClientError("지원하지 않는 소셜 로그인 제공자입니다.", "SOCIAL_PROVIDER_INVALID");
  }
  return `${window.location.origin}${config.callbackPath}`;
}

function getCallbackParams() {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return new URLSearchParams([...searchParams.entries(), ...hashParams.entries()]);
}

function readSession(role) {
  const normalizedRole = String(role || "").toUpperCase();
  const config = ROLE_CONFIG[normalizedRole];
  if (!config) return null;

  const accessToken = sessionStorage.getItem(config.tokenKey);
  const rawProfile = sessionStorage.getItem(config.userKey);
  if (!accessToken || !rawProfile) return null;

  try {
    const profile = JSON.parse(rawProfile);
    return normalizeAuthData({ ...profile, accessToken }, normalizedRole);
  } catch {
    sessionStorage.removeItem(config.tokenKey);
    sessionStorage.removeItem(config.userKey);
    return null;
  }
}

export function clearAuthSession() {
  Object.values(ROLE_CONFIG).forEach(({ tokenKey, userKey }) => {
    sessionStorage.removeItem(tokenKey);
    sessionStorage.removeItem(userKey);
  });
}

export function getStoredAuthSession(role) {
  if (role) return readSession(role);
  return readSession("USER") || readSession("MERCHANT") || readSession("ADMIN");
}

export function getPendingOauthSignup() {
  try {
    const raw = sessionStorage.getItem("oauthSignupPending");
    return raw ? JSON.parse(raw) : null;
  } catch {
    sessionStorage.removeItem("oauthSignupPending");
    return null;
  }
}

export function clearPendingOauthSignup() {
  sessionStorage.removeItem("oauthSignupPending");
}

function setPendingSocialAuth({ provider, role }) {
  sessionStorage.setItem(PENDING_SOCIAL_AUTH_KEY, JSON.stringify({
    provider,
    role,
    createdAt: Date.now(),
  }));
}

function getPendingSocialAuth(provider) {
  try {
    const raw = sessionStorage.getItem(PENDING_SOCIAL_AUTH_KEY);
    const pending = raw ? JSON.parse(raw) : null;
    if (!pending) return null;
    const normalizedProvider = String(provider || "").toUpperCase();
    if (normalizedProvider && pending.provider !== normalizedProvider) return null;
    return pending;
  } catch {
    sessionStorage.removeItem(PENDING_SOCIAL_AUTH_KEY);
    return null;
  }
}

function clearPendingSocialAuth() {
  sessionStorage.removeItem(PENDING_SOCIAL_AUTH_KEY);
}

function assertSocialRoleMatches(authData, expectedRole) {
  const normalizedExpectedRole = normalizeRole(expectedRole);
  const responseRole = String(authData.role || "").toUpperCase();
  if (!responseRole || responseRole === normalizedExpectedRole) return;

  const roleLabel = normalizedExpectedRole === "MERCHANT" ? "상인" : normalizedExpectedRole === "ADMIN" ? "관리자" : "사용자";
  const error = new ApiClientError(`${roleLabel} 권한이 없는 계정입니다. ${roleLabel} 계정으로 로그인해주세요.`, "AUTH_ROLE_MISMATCH", 403);
  error.expectedRole = normalizedExpectedRole;
  throw error;
}

export function getSocialLoginUrl(provider, { role = "USER" } = {}) {
  const normalizedProvider = String(provider || "").toUpperCase();
  const normalizedRole = normalizeRole(role);
  const config = SOCIAL_CONFIG[normalizedProvider];

  if (!config) {
    throw new ApiClientError("지원하지 않는 소셜 로그인 제공자입니다.", "SOCIAL_PROVIDER_INVALID");
  }

  const redirectUri = getSocialCallbackUrl(normalizedProvider);
  setPendingSocialAuth({ provider: normalizedProvider, role: normalizedRole });

  if (config.loginUrl) {
    return config.loginUrl
      .replace("{redirectUri}", encodeURIComponent(redirectUri))
      .replace("{callbackUrl}", encodeURIComponent(redirectUri))
      .replace("{role}", encodeURIComponent(normalizedRole.toLowerCase()));
  }

  if (!config.clientId) {
    throw new ApiClientError(`${normalizedProvider} 로그인 URL이 설정되지 않았습니다.`, "SOCIAL_LOGIN_URL_MISSING");
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: redirectUri,
  });

  if (normalizedProvider === "NAVER") {
    const state = crypto.randomUUID?.() || String(Date.now());
    sessionStorage.setItem("naverOauthState", state);
    params.set("state", state);
  }

  return `${config.authorizeUrl}?${params.toString()}`;
}

export async function completeSocialLoginFromCallback(provider) {
  const normalizedProvider = String(provider || "").toUpperCase();
  if (!SOCIAL_CONFIG[normalizedProvider]) {
    throw new ApiClientError("지원하지 않는 소셜 로그인 제공자입니다.", "SOCIAL_PROVIDER_INVALID");
  }

  const params = getCallbackParams();
  const error = params.get("error");
  const message = params.get("message") || params.get("error_description");

  if (error) {
    throw new ApiClientError(message || "소셜 로그인이 취소되었거나 실패했습니다.", error);
  }

  const code = params.get("code");
  if (!code) {
    throw new ApiClientError("소셜 로그인 콜백에 인가 코드가 없습니다.", "SOCIAL_CODE_MISSING");
  }

  const pendingSocialAuth = getPendingSocialAuth(normalizedProvider);
  const expectedRole = normalizeRole(pendingSocialAuth?.role);

  if (normalizedProvider === "NAVER") {
    const state = params.get("state");
    const savedState = sessionStorage.getItem("naverOauthState");
    sessionStorage.removeItem("naverOauthState");
    if (savedState && state !== savedState) {
      throw new ApiClientError("네이버 로그인 state 값이 일치하지 않습니다.", "SOCIAL_STATE_MISMATCH");
    }
  }

  const data = await apiRequest(`/users/auth/oauth/${normalizedProvider.toLowerCase()}`, {
    method: "POST",
    body: {
      code,
      redirectUri: getSocialCallbackUrl(normalizedProvider),
    },
  });

  if (data.needSignup) {
    if (expectedRole !== "USER") {
      clearPendingSocialAuth();
      const roleLabel = expectedRole === "MERCHANT" ? "상인" : "관리자";
      const error = new ApiClientError(`${roleLabel} 권한이 없는 소셜 계정입니다. 승인된 ${roleLabel} 계정으로 로그인해주세요.`, "AUTH_ROLE_MISMATCH", 403);
      error.expectedRole = expectedRole;
      throw error;
    }

    sessionStorage.setItem("oauthSignupPending", JSON.stringify({
      provider: normalizedProvider,
      role: expectedRole,
      signupTicket: data.signupTicket,
      email: data.email,
      nickname: data.nickname,
    }));
    clearPendingSocialAuth();
    throw new ApiClientError("신규 소셜 계정입니다. 추가 가입 화면 연동이 필요합니다.", "SOCIAL_SIGNUP_REQUIRED", 409);
  }

  const authData = normalizeAuthData(data, expectedRole);
  clearPendingSocialAuth();
  assertSocialRoleMatches(authData, expectedRole);
  saveSession(authData);
  if (String(authData.role || "USER").toUpperCase() === "USER") {
    try {
      return await fetchCurrentUser();
    } catch {
      return authData;
    }
  }
  return authData;
}

export async function fetchCurrentUser() {
  const accessToken = getAccessToken("USER");
  if (!accessToken) {
    throw new ApiClientError("로그인이 필요한 기능입니다.", "AUTH_REQUIRED", 401);
  }

  const data = await apiRequest("/users/me", { auth: true, role: "USER" });
  const authData = normalizeAuthData({ ...data, accessToken, role: "USER" }, "USER");
  saveSession(authData);
  return authData;
}

export async function updateCurrentUserProfile({ nickname, language, profileImageUrl }) {
  const accessToken = getAccessToken("USER");
  const body = {};
  if (nickname !== undefined) body.nickname = nickname;
  if (language !== undefined) body.language = language;
  if (profileImageUrl !== undefined) body.profileImageUrl = profileImageUrl;

  const data = await apiRequest("/users/me", {
    method: "PATCH",
    auth: true,
    role: "USER",
    body,
  });

  const authData = normalizeAuthData({ ...data, accessToken, role: "USER" }, "USER");
  saveSession(authData);
  return authData;
}

export function shouldClearSessionForError(error) {
  return isAuthError(error);
}

async function loginWithRole({ role, email, password }) {
  const normalizedRole = String(role).toUpperCase();
  const config = ROLE_CONFIG[normalizedRole];
  const normalizedEmail = trimInput(email);
  const normalizedPassword = trimInput(password);

  if (!config) {
    throw new ApiClientError("지원하지 않는 로그인 유형입니다.", "AUTH_ROLE_INVALID");
  }

  const data = await apiRequest(ROLE_ENDPOINTS[normalizedRole].login, {
    method: "POST",
    body: { email: normalizedEmail, password: normalizedPassword },
  });
  const authData = normalizeAuthData(data, normalizedRole);
  saveSession(authData);
  if (String(authData.role || normalizedRole).toUpperCase() === "USER") {
    try {
      return await fetchCurrentUser();
    } catch {
      return authData;
    }
  }
  return authData;
}

export async function login({ role, email, password }) {
  if (role) {
    return loginWithRole({ role, email, password });
  }

  let lastAuthError = null;
  for (const candidateRole of ["USER", "MERCHANT", "ADMIN"]) {
    try {
      return await loginWithRole({ role: candidateRole, email, password });
    } catch (error) {
      if (!error.status || error.status >= 500 || error.status === 429) {
        throw error;
      }
      lastAuthError = error;
    }
  }

  throw new ApiClientError(
    "이메일 또는 비밀번호를 확인해주세요.",
    lastAuthError?.code || "AUTH_LOGIN_FAILED",
    lastAuthError?.status || 401,
  );
}

export async function signupAndLogin({ email, password, nickname }) {
  const normalizedEmail = trimInput(email);
  const normalizedPassword = trimInput(password);
  const normalizedNickname = trimInput(nickname);

  await apiRequest(ROLE_ENDPOINTS.USER.signup, {
    method: "POST",
    body: { email: normalizedEmail, password: normalizedPassword, nickname: normalizedNickname },
  });

  const authData = await login({ role: "USER", email: normalizedEmail, password: normalizedPassword });
  if (authData.nickname) return authData;

  const fallbackAuthData = normalizeAuthData({ ...authData, nickname: normalizedNickname }, "USER");
  saveSession(fallbackAuthData);
  return fallbackAuthData;
}

export async function completeOauthSignup({ ticket, name, phone, birthdate, nickname }) {
  const data = await apiRequest("/users/auth/oauth/signup", {
    method: "POST",
    body: {
      ticket: trimInput(ticket),
      name: trimInput(name),
      phone: normalizePhoneInput(phone),
      birthdate: trimInput(birthdate),
      nickname: trimInput(nickname),
    },
  });

  clearPendingOauthSignup();

  const authData = normalizeAuthData(data, "USER");
  saveSession(authData);
  if (String(authData.role || "USER").toUpperCase() === "USER") {
    try {
      return await fetchCurrentUser();
    } catch {
      return authData;
    }
  }
  return authData;
}

export async function reissueToken() {
  const data = await apiRequest("/auth/reissue", { method: "POST" });
  const authData = normalizeAuthData(data, data.role);
  saveSession(authData);
  return authData;
}

export async function logout() {
  await apiRequest("/auth/logout", { method: "POST" });
  clearAuthSession();
}

export async function deleteUser() {
  return apiRequest("/users/me", {
    method: "DELETE",
    auth: true,
    role: "USER",
  });
}
