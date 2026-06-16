export const PRODUCT_CATEGORIES = [
  { value: "ADMISSION_TICKET", label: "입장권" },
  { value: "TOUR_PASS", label: "투어 패스" },
  { value: "EXPERIENCE", label: "체험" },
  { value: "DISCOUNT_COUPON", label: "할인·교환권" },
  { value: "LOCAL_PRODUCT", label: "지역 상품" },
];

export const PRODUCT_CATEGORY_LABELS = Object.fromEntries(
  PRODUCT_CATEGORIES.map(({ value, label }) => [value, label]),
);

export const PRODUCT_CATEGORY_CODES = new Set(PRODUCT_CATEGORIES.map(({ value }) => value));

export function getProductCategoryCode(category) {
  if (!category) return "";
  if (typeof category === "object") return category.code ?? category.value ?? "";
  return String(category);
}

export function getProductCategoryLabel(category) {
  if (!category) return "";
  if (typeof category === "object") {
    const code = getProductCategoryCode(category);
    return category.label ?? category.displayName ?? PRODUCT_CATEGORY_LABELS[code] ?? code;
  }
  return PRODUCT_CATEGORY_LABELS[category] ?? category ?? "";
}

export function isProductCategoryCode(category) {
  return PRODUCT_CATEGORY_CODES.has(getProductCategoryCode(category));
}
