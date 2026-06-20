import { expect, test } from "@playwright/test";

function json(data) {
  return {
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ code: "SUCCESS", message: "OK", data }),
  };
}

const place = {
  placeId: 1, name: "광화문", category: "관광지", address: "서울 종로구", lat: 37.576, lng: 126.976,
  description: "조선의 법궁 앞 광장", rating: 4.8, reviewCount: 120, imageUrl: null, isLiked: false,
};

const reviews = [
  { reviewId: 1, userId: 2, nickname: "여행자", rating: 5, content: "정말 아름다워요", createdAt: "2026-06-01" },
  { reviewId: 2, userId: 3, nickname: "관광객", rating: 4, content: "넓고 쾌적해요", createdAt: "2026-06-10" },
];

const shops = [
  { shopId: 10, name: "광화문 분식", category: "분식", rating: 4.2 },
];

function setupPlaceDetailSession(page) {
  return page.addInitScript(() => {
    sessionStorage.setItem("userAccessToken", "e2e-token");
    sessionStorage.setItem("userProfile", JSON.stringify({ userId: 1, nickname: "춘배", role: "USER", language: "ko" }));
    sessionStorage.setItem("chunbae_navigation_state", JSON.stringify({
      chunbaeTour: true, appState: "main", screen: "placeDetail", tab: "map",
      selectedPlaceId: 1,
    }));
  });
}

function routePlaceApis(page) {
  return page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (path === "/api/v1/places/1") return route.fulfill(json(place));
    if (path === "/api/v1/places/1/reviews") return route.fulfill(json({ content: reviews, hasNext: false, size: 2 }));
    if (path === "/api/v1/places/1/shops") return route.fulfill(json({ content: shops, hasNext: false, size: 1 }));
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    return route.fulfill(json(null));
  });
}

test("장소 상세에서 이름과 설명이 표시된다", async ({ page }) => {
  await setupPlaceDetailSession(page);
  await routePlaceApis(page);
  await page.goto("/");

  await expect(page.getByText("광화문")).toBeVisible();
  await expect(page.getByText("조선의 법궁 앞 광장")).toBeVisible();
});

test("장소 리뷰 탭에서 리뷰 목록이 표시된다", async ({ page }) => {
  await setupPlaceDetailSession(page);
  await routePlaceApis(page);
  await page.goto("/");

  await page.getByText("리뷰").click();
  await expect(page.getByText("정말 아름다워요")).toBeVisible();
  await expect(page.getByText("넓고 쾌적해요")).toBeVisible();
});

test("연결된 상점 목록이 표시된다", async ({ page }) => {
  await setupPlaceDetailSession(page);
  await routePlaceApis(page);
  await page.goto("/");

  await expect(page.getByText("광화문 분식")).toBeVisible();
});

test("찜하기 클릭 시 API가 호출된다", async ({ page }) => {
  let toggled = false;

  await setupPlaceDetailSession(page);
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (path === "/api/v1/places/1") return route.fulfill(json(place));
    if (path === "/api/v1/places/1/reviews") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    if (path === "/api/v1/places/1/shops") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    if ((path === "/api/v1/wishlists" || path === "/api/v1/places/1/wishlist") && (req.method() === "POST" || req.method() === "DELETE")) {
      toggled = true;
      return route.fulfill(json({ isLiked: true }));
    }
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    return route.fulfill(json(null));
  });
  await page.goto("/");

  await page.getByRole("button", { name: /찜하기|찜|♡|♥/ }).click();
  await expect.poll(() => toggled).toBe(true);
  await expect(page.getByText(/찜 목록에 추가/)).toBeVisible();
});

// ── 검색 ──────────────────────────────────────────────

test("지역명 검색 시 API가 호출된다", async ({ page }) => {
  let searched = false;

  await page.addInitScript(() => {
    sessionStorage.setItem("userAccessToken", "e2e-token");
    sessionStorage.setItem("userProfile", JSON.stringify({ userId: 1, nickname: "춘배", role: "USER", language: "ko" }));
    sessionStorage.setItem("chunbae_navigation_state", JSON.stringify({ chunbaeTour: true, appState: "main", screen: "map", tab: "map" }));
  });
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    if (path.startsWith("/api/v1/places") && url.searchParams.get("keyword")) {
      searched = true;
      return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    }
    if (path.startsWith("/api/v1/places")) return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    return route.fulfill(json(null));
  });
  await page.goto("/");

  await page.getByPlaceholder(/지역명 입력|지역|검색/).fill("종로구");
  await page.keyboard.press("Enter");

  await expect.poll(() => searched).toBe(true);
});
