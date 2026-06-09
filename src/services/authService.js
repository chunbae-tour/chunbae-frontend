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

const DUMMY_ACCOUNTS = [
  { email: "user@test.com",     password: "Pa$$w0rd1!", nickname: "여행자지수",   role: "USER",     roleLabel: "일반회원" },
  { email: "friend@test.com",   password: "Pa$$w0rd1!", nickname: "친구여행자",   role: "USER",     roleLabel: "일반회원" },
  { email: "merchant@test.com", password: "Pa$$w0rd1!", nickname: "영호네포장마차", role: "MERCHANT", roleLabel: "상인" },
  { email: "admin@test.com",    password: "Pa$$w0rd1!", nickname: "관리자",       role: "ADMIN",    roleLabel: "관리자" },
];

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

export function isMockAuthSession(session) {
  return String(session?.accessToken || "").startsWith("mock-");
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

export function getDummyAccounts() {
  return DUMMY_ACCOUNTS;
}

async function loginWithRole({ role, email, password }) {
  const normalizedRole = String(role).toUpperCase();
  const config = ROLE_CONFIG[normalizedRole];

  if (!config) {
    throw new ApiClientError("지원하지 않는 로그인 유형입니다.", "AUTH_ROLE_INVALID");
  }

  try {
    const data = await apiRequest(ROLE_ENDPOINTS[normalizedRole].login, {
      method: "POST",
      body: { email, password },
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
  } catch (error) {
    const matched = DUMMY_ACCOUNTS.find(
      account => account.role === normalizedRole && account.email === email && account.password === password,
    );

    // TODO: 백엔드 API 연결 전 로컬 시연용 mock fallback입니다. 실제 배포 전 제거합니다.
    if (matched && (!error.status || error.status === 404 || error.status === 429)) {
      const authData = normalizeAuthData({
        accessToken: `mock-${normalizedRole.toLowerCase()}-access-token`,
        role: normalizedRole,
        email: matched.email,
        nickname: matched.nickname,
      }, normalizedRole);
      saveSession(authData);
      return authData;
    }

    throw error;
  }
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
  let usedMockSignup = false;

  try {
    await apiRequest(ROLE_ENDPOINTS.USER.signup, {
      method: "POST",
      body: { email, password, nickname },
    });
  } catch (error) {
    // TODO: 회원가입 API 연결 전 로컬 시연용 mock fallback입니다. 실제 배포 전 제거합니다.
    if (error.status && error.status !== 404) {
      throw error;
    }
    usedMockSignup = true;
  }

  try {
    const authData = await login({ role: "USER", email, password });
    if (authData.nickname) return authData;

    const fallbackAuthData = normalizeAuthData({ ...authData, nickname }, "USER");
    saveSession(fallbackAuthData);
    return fallbackAuthData;
  } catch (error) {
    if (!usedMockSignup || (error.status && error.status !== 404)) {
      throw error;
    }

    // TODO: 회원가입/로그인 API 연결 전 로컬 시연용 mock fallback입니다. 실제 배포 전 제거합니다.
    const authData = normalizeAuthData({
      accessToken: "mock-user-access-token",
      role: "USER",
      email,
      nickname,
    }, "USER");
    saveSession(authData);
    return authData;
  }
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
