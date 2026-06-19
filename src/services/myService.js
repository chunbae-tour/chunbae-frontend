import { apiRequest, getPageContent } from "./apiClient.js";
import { fetchMyJoinRequests } from "./chatService.js";

function normalizeImageUrls(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value !== "string" || !value.trim()) return [];

  const trimmed = value.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch {
    // imageUrls가 JSON 배열 문자열이 아닌 경우 아래 콤마 분리로 처리합니다.
  }

  return trimmed
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);
}

const LIKE_TARGET_TYPES = ["PLACE", "MARKET", "FESTIVAL"];
const LIKE_TARGET_META = {
  PLACE: { label: "관광지", emoji: "📍" },
  MARKET: { label: "전통시장", emoji: "🛍️" },
  FESTIVAL: { label: "축제", emoji: "🎉" },
};

async function fetchLikesByType(type, { size = 50 } = {}) {
  const params = new URLSearchParams({ type, size: String(size) });
  return apiRequest(`/users/me/likes?${params.toString()}`, { auth: true });
}

function normalizeLikeTarget(item = {}, targetType = "PLACE") {
  const normalizedType = item.targetType ?? item.likeTargetType ?? targetType;
  const type = normalizedType === "TRADITIONAL_MARKET" ? "MARKET" : normalizedType;
  const imageUrls = normalizeImageUrls(item.imageUrls);
  const imageUrl = item.imageUrl ?? item.thumbnailUrl ?? imageUrls[0] ?? "";
  const id = item.placeId ?? item.marketId ?? item.festivalId ?? item.targetId ?? item.id;
  const meta = LIKE_TARGET_META[type] ?? LIKE_TARGET_META.PLACE;

  return {
    ...item,
    id,
    placeId: type === "PLACE" ? id : item.placeId,
    marketId: type === "MARKET" ? id : item.marketId,
    festivalId: type === "FESTIVAL" ? id : item.festivalId,
    targetId: item.targetId ?? id,
    targetType: type,
    wishlistKey: `${type}:${id}`,
    name: item.name ?? item.title ?? "",
    typeLabel: meta.label,
    type:
      type === "MARKET"
        ? "전통시장"
        : type === "FESTIVAL"
          ? "축제"
          : (item.category ?? item.type ?? "관광지"),
    rating: item.rating ?? 0,
    emoji: item.emoji ?? meta.emoji,
    addr: item.address ?? item.addr ?? item.location ?? item.region ?? "",
    dist: item.distanceText ?? item.dist ?? "저장됨",
    imageUrl,
    thumbnailUrl: item.thumbnailUrl ?? imageUrl,
    imageUrls,
    isLiked: true,
  };
}

export async function fetchUserHomeStats() {
  // 찜 목록, 리뷰 등을 병렬로 조회하여 카운트 계산
  const [likesResults, reviewsData, joinRequestsData] = await Promise.all([
    Promise.allSettled(LIKE_TARGET_TYPES.map((type) => fetchLikesByType(type, { size: 1 }))),
    apiRequest("/users/me/reviews?size=1", { auth: true })
      .then((value) => ({ status: "fulfilled", value }))
      .catch((reason) => ({ status: "rejected", reason })),
    fetchMyJoinRequests({ size: 100 })
      .then((value) => ({ status: "fulfilled", value }))
      .catch((reason) => ({ status: "rejected", reason })),
  ]);

  // Page 응답에서 totalElements 추출 또는 배열 길이 사용
  const likedPlacesCount = likesResults.reduce((sum, result) => {
    if (result.status !== "fulfilled") return sum;
    return (
      sum +
      (result.value?.totalElements ??
        result.value?.total ??
        (Array.isArray(result.value) ? result.value.length : 0))
    );
  }, 0);

  const reviewCount =
    reviewsData.status === "fulfilled"
      ? (reviewsData.value?.totalElements ??
        reviewsData.value?.total ??
        (Array.isArray(reviewsData.value) ? reviewsData.value.length : 0))
      : 0;

  const companionWaitingCount =
    joinRequestsData.status === "fulfilled"
      ? joinRequestsData.value.content.filter(
          (request) => String(request.status).toUpperCase() === "PENDING",
        ).length
      : 0;

  return {
    likedPlacesCount,
    companionWaitingCount,
    reviewCount,
  };
}

export async function fetchUserHome() {
  const data = await apiRequest("/users/me/home", { auth: true, role: "USER" });
  return {
    profile: data.profile ?? null,
    wallet: data.wallet ?? null,
    balance: Number(data.wallet?.balance ?? 0),
  };
}

export async function fetchWishlist() {
  const results = await Promise.allSettled(
    LIKE_TARGET_TYPES.map((type) =>
      fetchLikesByType(type, { size: 50 }).then((data) => ({ type, data })),
    ),
  );
  const fulfilled = results
    .filter((result) => result.status === "fulfilled")
    .flatMap((result) =>
      getPageContent(result.value.data).map((item) => normalizeLikeTarget(item, result.value.type)),
    );

  if (fulfilled.length === 0 && results.every((result) => result.status === "rejected")) {
    throw results[0]?.reason;
  }

  return fulfilled
    .filter((item) => item.id != null)
    .sort((a, b) => {
      const aTime = new Date(a.createdAt ?? a.likedAt ?? 0).getTime();
      const bTime = new Date(b.createdAt ?? b.likedAt ?? 0).getTime();
      return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
    });
}

export async function removeWishlistItem(itemOrId) {
  const item = typeof itemOrId === "object" ? itemOrId : { id: itemOrId, targetType: "PLACE" };
  const targetType =
    item.targetType === "TRADITIONAL_MARKET" ? "MARKET" : (item.targetType ?? "PLACE");
  const targetId = item.placeId ?? item.marketId ?? item.festivalId ?? item.targetId ?? item.id;

  if (targetId == null) {
    throw new Error("찜 대상 식별자가 없습니다.");
  }

  if (targetType === "MARKET") {
    await apiRequest(`/traditional-markets/${targetId}/like`, { method: "DELETE", auth: true });
  } else if (targetType === "FESTIVAL") {
    await apiRequest(`/festivals/${targetId}/like`, { method: "DELETE", auth: true });
  } else {
    await apiRequest(`/places/${targetId}/like`, { method: "DELETE", auth: true });
  }

  return { targetId, targetType };
}

export async function fetchMyReviews() {
  const data = await apiRequest("/users/me/reviews?size=20", { auth: true });
  return getPageContent(data).map((review) => ({
    id: review.reviewId ?? review.id,
    place: review.placeName ?? review.place ?? "",
    emoji: review.emoji ?? "📍",
    rating: review.rating ?? 0,
    text: review.content ?? review.text ?? "",
    date: review.createdAt ?? review.date ?? "",
    likes: review.likeCount ?? review.likes ?? 0,
  }));
}

export async function fetchOwnedItems() {
  const data = await apiRequest("/users/me/items?size=20", { auth: true });
  return getPageContent(data).map((item) => ({
    ...item,
    id: item.ownedItemId ?? item.itemId ?? item.id,
    itemId: item.itemId ?? item.ownedItemId ?? item.id,
    name: item.name ?? item.productName ?? item.title ?? "",
    shop: item.shopName ?? item.shop ?? "",
    market: item.marketName ?? item.market ?? "",
    expires: item.expiresAt ?? item.expireAt ?? item.expires ?? "",
    status: item.statusLabel ?? item.status ?? "사용 가능",
  }));
}

export async function fetchOwnedItemQr(itemId) {
  if (!itemId) {
    throw new Error("아이템 식별자가 없습니다.");
  }

  const data = await apiRequest(`/users/me/items/${itemId}/qr`, { auth: true, role: "USER" });
  return {
    token: data.token ?? "",
    expiresAt: data.expiresAt ?? "",
  };
}
