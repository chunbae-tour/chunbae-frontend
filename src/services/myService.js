import { apiRequest, getPageContent } from "./apiClient.js";

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

export async function fetchUserHomeStats() {
  // 찜 목록, 리뷰 등을 병렬로 조회하여 카운트 계산
  const [likesData, reviewsData] = await Promise.allSettled([
    apiRequest("/users/me/likes?size=1", { auth: true }),
    apiRequest("/users/me/reviews?size=1", { auth: true }),
  ]);

  // Page 응답에서 totalElements 추출 또는 배열 길이 사용
  const likedPlacesCount = likesData.status === "fulfilled"
    ? (likesData.value?.totalElements ?? likesData.value?.total ?? (Array.isArray(likesData.value) ? likesData.value.length : 0))
    : 0;

  const reviewCount = reviewsData.status === "fulfilled"
    ? (reviewsData.value?.totalElements ?? reviewsData.value?.total ?? (Array.isArray(reviewsData.value) ? reviewsData.value.length : 0))
    : 0;

  return {
    likedPlacesCount,
    companionWaitingCount: 0, // TODO: 동행 대기 API 추가 필요
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
  const data = await apiRequest("/users/me/likes?size=20", { auth: true });
  return getPageContent(data).map(item => {
    const imageUrls = normalizeImageUrls(item.imageUrls);
    const imageUrl = item.imageUrl ?? item.thumbnailUrl ?? imageUrls[0] ?? "";

    return {
      ...item,
      id: item.placeId ?? item.id,
      placeId: item.placeId ?? item.id,
      name: item.name ?? "",
      type: item.category ?? item.type ?? "관광지",
      rating: item.rating ?? 0,
      emoji: item.emoji ?? "📍",
      addr: item.address ?? item.addr ?? "",
      imageUrl,
      thumbnailUrl: item.thumbnailUrl ?? imageUrl,
      imageUrls,
      isLiked: true, // 찜 목록이므로 항상 true
    };
  });
}

export async function removeWishlistItem(placeId) {
  await apiRequest(`/places/${placeId}/like`, { method: "DELETE", auth: true });
  return { placeId };
}

export async function fetchMyReviews() {
  const data = await apiRequest("/users/me/reviews?size=20", { auth: true });
  return getPageContent(data).map(review => ({
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
  return getPageContent(data).map(item => ({
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
