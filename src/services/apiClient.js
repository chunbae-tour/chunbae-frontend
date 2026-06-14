const TOKEN_KEYS = {
  USER: "userAccessToken",
  MERCHANT: "merchantAccessToken",
  ADMIN: "adminAccessToken",
};
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "").replace(/\/api\/v1$/, "");
const STRICT_API_MODE = import.meta.env.VITE_STRICT_API === "true";

export class ApiClientError extends Error {
  constructor(message, code, status, meta = {}) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
    this.url = meta.url;
    this.method = meta.method;
    this.retryAfter = meta.retryAfter;
    this.payload = meta.payload;
    this.cause = meta.cause;
  }
}
export function getAccessToken(role) {
  if (role && TOKEN_KEYS[role]) return sessionStorage.getItem(TOKEN_KEYS[role]);
  return sessionStorage.getItem(TOKEN_KEYS.USER)
    || sessionStorage.getItem(TOKEN_KEYS.MERCHANT)
    || sessionStorage.getItem(TOKEN_KEYS.ADMIN);
}

export function getPageContent(data) {
  if (Array.isArray(data)) return data;
  return data?.content ?? data?.items ?? data?.list ?? [];
}

export function getApiClientConfig() {
  return {
    baseUrl: API_BASE_URL,
    apiPrefix: "/api/v1",
    tokenKeys: TOKEN_KEYS,
    strictApiMode: STRICT_API_MODE,
  };
}

export function isAuthError(error) {
  return error?.status === 401 || error?.code === "AUTH_REQUIRED" || String(error?.code || "").startsWith("AUTH_");
}

export function getApiErrorHint(error) {
  if (!error) return "";
  if (error.code === "NETWORK_ERROR") return "백엔드 서버 실행 상태, CORS 허용 origin, VITE_API_BASE_URL을 확인하세요.";
  if (error.code === "INVALID_JSON") return "백엔드 응답이 JSON 형식인지 확인하세요.";
  if (error.status === 401) return "로그인이 필요한 기능입니다. 로그인 후 다시 이용해주세요.";
  if (error.status === 403) return "현재 로그인 역할이 해당 API 권한과 맞는지 확인하세요.";
  if (error.status === 404) return "프론트 endpoint와 백엔드 Controller 경로가 일치하는지 확인하세요.";
  if (error.status === 429) return error.retryAfter ? `${error.retryAfter}초 후 다시 시도하세요.` : "요청이 너무 많습니다. 잠시 후 다시 시도하세요.";
  if (error.status >= 500) return "백엔드 서버 로그를 확인하세요.";
  return error.message || "요청을 처리하지 못했습니다.";
}

function buildApiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const versionedPath = /^\/api\/v\d+\//.test(normalizedPath)
    ? normalizedPath
    : `/api/v1${normalizedPath}`;
  return `${API_BASE_URL}${versionedPath}`;
}

export async function apiRequest(path, { method = "GET", auth = false, role, headers = {}, body } = {}) {
  const token = getAccessToken(role);
  const url = buildApiUrl(path);

  if (auth && !token) {
    throw new ApiClientError("로그인이 필요한 기능입니다.", "AUTH_REQUIRED", 401, { method, url });
  }

  let response;
  try {
    response = await fetch(url, {
      method,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body == null ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    throw new ApiClientError("백엔드 서버에 연결하지 못했습니다.", "NETWORK_ERROR", 0, { method, url, cause: error });
  }

  let payload = {};
  try {
    payload = await response.json();
  } catch (error) {
    if (response.status !== 204) {
      throw new ApiClientError("백엔드 응답을 JSON으로 해석하지 못했습니다.", "INVALID_JSON", response.status, {
        method,
        url,
        cause: error,
      });
    }
  }

  if (!response.ok || payload.success === false) {
    throw new ApiClientError(payload.message || "요청을 처리하지 못했습니다.", payload.code, response.status, {
      method,
      url,
      retryAfter: response.headers.get("Retry-After"),
      payload,
    });
  }

  return payload.data ?? payload;
}

export async function apiFormRequest(path, { method = "POST", auth = false, role, headers = {}, formData } = {}) {
  const token = getAccessToken(role);
  const url = buildApiUrl(path);

  if (auth && !token) {
    throw new ApiClientError("로그인이 필요한 기능입니다.", "AUTH_REQUIRED", 401, { method, url });
  }

  let response;
  try {
    response = await fetch(url, {
      method,
      credentials: "include",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: formData,
    });
  } catch (error) {
    throw new ApiClientError("백엔드 서버에 연결하지 못했습니다.", "NETWORK_ERROR", 0, { method, url, cause: error });
  }

  let payload = {};
  try {
    payload = await response.json();
  } catch (error) {
    if (response.status !== 204) {
      throw new ApiClientError("백엔드 응답을 JSON으로 해석하지 못했습니다.", "INVALID_JSON", response.status, {
        method,
        url,
        cause: error,
      });
    }
  }

  if (!response.ok || payload.success === false) {
    throw new ApiClientError(payload.message || "요청을 처리하지 못했습니다.", payload.code, response.status, {
      method,
      url,
      retryAfter: response.headers.get("Retry-After"),
      payload,
    });
  }

  return payload.data ?? payload;
}
