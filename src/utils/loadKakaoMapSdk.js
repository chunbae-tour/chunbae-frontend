let loadPromise = null;

export function getKakaoMapAppKey() {
  return (
    import.meta.env.VITE_KAKAO_MAP_APP_KEY
    || import.meta.env.VITE_KAKAO_MAP_JS_KEY
    || import.meta.env.VITE_KAKAO_MAP_API_KEY
    || ""
  ).trim();
}

export function loadKakaoMapSdk() {
  const appKey = getKakaoMapAppKey();
  if (!appKey) {
    return Promise.reject(new Error("KAKAO_MAP_KEY_MISSING"));
  }

  if (window.kakao?.maps) {
    return new Promise((resolve) => {
      window.kakao.maps.load(() => resolve(window.kakao));
    });
  }

  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false`;
    script.async = true;
    script.onload = () => {
      if (!window.kakao?.maps) {
        reject(new Error("KAKAO_MAP_SDK_LOAD_FAILED"));
        return;
      }
      window.kakao.maps.load(() => resolve(window.kakao));
    };
    script.onerror = () => reject(new Error("KAKAO_MAP_SDK_LOAD_FAILED"));
    document.head.appendChild(script);
  });

  return loadPromise;
}
