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

export function getProductCategoryLabel(category) {
  return PRODUCT_CATEGORY_LABELS[category] ?? category ?? "";
}
