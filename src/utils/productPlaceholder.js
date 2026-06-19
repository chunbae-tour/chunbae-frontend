const PRODUCT_PLACEHOLDERS = {
  ADMISSION_TICKET: {
    icon: "castle",
    gradient: "linear-gradient(135deg, #EAF3DE 0%, #C0DD97 100%)",
    color: "#3B6D11",
  },
  TOUR_PASS: {
    icon: "map",
    gradient: "linear-gradient(135deg, #E6F1FB 0%, #B5D4F4 100%)",
    color: "#185FA5",
  },
  EXPERIENCE: {
    icon: "hanger",
    gradient: "linear-gradient(135deg, #FBEAF0 0%, #ED93B1 100%)",
    color: "#993556",
  },
  DISCOUNT_COUPON: {
    icon: "ticket",
    gradient: "linear-gradient(135deg, #FAEEDA 0%, #FAC775 100%)",
    color: "#854F0B",
  },
  LOCAL_PRODUCT: {
    icon: "gift",
    gradient: "linear-gradient(135deg, #FAECE7 0%, #F0997B 100%)",
    color: "#712B13",
  },
};

const DEFAULT_PRODUCT_PLACEHOLDER = PRODUCT_PLACEHOLDERS.LOCAL_PRODUCT;

export function getPlaceholderByCategory(category) {
  if (!category) return DEFAULT_PRODUCT_PLACEHOLDER;
  const categoryCode = typeof category === "object" ? (category.code ?? category.value) : category;
  return PRODUCT_PLACEHOLDERS[String(categoryCode).toUpperCase()] ?? DEFAULT_PRODUCT_PLACEHOLDER;
}
