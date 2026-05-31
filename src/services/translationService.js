import { apiRequest } from "./apiClient.js";

/**
 * POST /api/v1/translations
 * USER 전용 — Google Cloud Translation API 키가 설정되어야 동작합니다.
 * API 키 미설정 시 백엔드에서 COMMON_007 에러를 반환합니다.
 *
 * @param {string} content - 번역할 텍스트
 * @param {string} targetLanguage - 대상 언어 코드 (예: "en", "ja", "zh")
 * @returns {Promise<{ translatedText: string }>}
 */
export async function translateText(content, targetLanguage) {
  return apiRequest("/translations", {
    method: "POST",
    auth: true,
    body: { content, targetLanguage },
  });
}

/**
 * 언어 코드 → Google Cloud Translation 언어 코드 매핑
 * 백엔드 LanguageCode enum 기준: KO, EN, JA, ZH_CN
 */
export const LANG_CODE_MAP = {
  ko: "ko",
  en: "en",
  ja: "ja",
  "zh-CN": "zh-CN",
};
