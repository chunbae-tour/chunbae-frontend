const DEFAULT_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0,
};

export function getGeolocationSupport() {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return {
      ok: false,
      code: "UNSUPPORTED",
      message: "이 브라우저에서는 위치 기능을 사용할 수 없습니다.",
    };
  }

  if (typeof window !== "undefined" && !window.isSecureContext) {
    return {
      ok: false,
      code: "INSECURE",
      message:
        "http://192.168... 주소로 접속하면 휴대폰에서 위치 권한 창이 뜨지 않습니다. HTTPS로 접속해주세요. (PC에서 pnpm dev:mobile 실행 후 https://본인IP:5173)",
    };
  }

  return { ok: true };
}

export function getGeolocationErrorMessage(error) {
  const code = error?.message || error?.code || "UNKNOWN";

  if (code === "INSECURE" || code === "UNSUPPORTED") {
    return getGeolocationSupport().message || "위치를 사용할 수 없습니다.";
  }
  if (code === "PERMISSION_DENIED") {
    return "위치 권한이 거부되었습니다. 브라우저 설정에서 이 사이트의 위치를 허용해주세요.";
  }
  if (code === "POSITION_UNAVAILABLE") {
    return "현재 위치를 확인하지 못했습니다. GPS 또는 Wi-Fi 위치를 켠 뒤 다시 시도해주세요.";
  }
  if (code === "TIMEOUT") {
    return "위치 요청 시간이 초과되었습니다. 다시 시도해주세요.";
  }

  return "위치를 가져오지 못했습니다.";
}

export function requestCurrentPosition(options = {}) {
  const support = getGeolocationSupport();
  if (!support.ok) {
    return Promise.reject(new Error(support.code));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (err) => {
        if (err.code === 1) reject(new Error("PERMISSION_DENIED"));
        else if (err.code === 2) reject(new Error("POSITION_UNAVAILABLE"));
        else if (err.code === 3) reject(new Error("TIMEOUT"));
        else reject(new Error("UNKNOWN"));
      },
      { ...DEFAULT_OPTIONS, ...options },
    );
  });
}
