import { apiRequest, getPageContent } from "./apiClient.js";

export async function fetchFaqs({ category, size = 50 } = {}) {
  const params = new URLSearchParams({ size: String(size) });
  if (category) params.set("category", category);

  const data = await apiRequest(`/faqs?${params.toString()}`);
  return getPageContent(data).map((item) => ({
    id: item.faqId ?? item.id,
    q: item.question ?? item.q ?? "",
    a: item.answer ?? item.a ?? "",
    category: item.category ?? "",
  }));
}

export async function fetchFaqTranslation(faqId, targetLanguage) {
  const params = new URLSearchParams({ targetLanguage });
  const data = await apiRequest(`/faqs/${faqId}/translation?${params.toString()}`, {
    auth: true,
    role: "USER",
  });

  return {
    faqId: data.faqId ?? faqId,
    targetLanguage: data.targetLanguage ?? targetLanguage,
    question: data.question ?? data.translatedQuestion ?? "",
    answer: data.answer ?? data.translatedAnswer ?? "",
  };
}
