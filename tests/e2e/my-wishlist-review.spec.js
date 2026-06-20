import { expect, test } from "@playwright/test";

function json(data) {
  return {
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ code: "SUCCESS", message: "OK", data }),
  };
}

const user = { userId: 1, nickname: "춘배", role: "USER", language: "ko" };

function setupMySession(page, screen) {
  return page.addInitScript((s) => {
    sessionStorage.setItem("userAccessToken", "e2e-token");
    sessionStorage.setItem("userProfile", JSON.stringify({ userId: 1, nickname: "춘배", role: "USER", language: "ko" }));
    sessionStorage.setItem("chunbae_navigation_state", JSON.stringify({ chunbaeTour: true, appState: "main", screen: s, tab: "my" }));
  }, screen);
}

function routeBaseApis(page) {
  return page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;

    if (path === "/api/v1/users/me") return route.fulfill(json(user));
    if (path === "/api/v1/yeopjeon/balance") return route.fulfill(json({ balance: 1000 }));
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    if (path === "/api/v1/users/me/wishlists") return route.fulfill(json({ content: [
      { id: 10, targetType: "PLACE", placeId: 5, placeName: "광화문", imageUrl: null },
    ], hasNext: false, size: 1 }));
    if (path === "/api/v1/users/me/reviews") return route.fulfill(json({ content: [
      { reviewId: 20, shopName: "빈대떡집", rating: 5, content: "맛있어요", createdAt: "2026-06-01" },
    ], hasNext: false, size: 1 }));
    return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
  });
}

// ── 위시리스트 ──────────────────────────────────────────────

test("위시리스트 목록이 렌더링된다", async ({ page }) => {
  await setupMySession(page, "myWishlist");
  await routeBaseApis(page);
  await page.goto("/");

  await expect(page.getByText("광화문")).toBeVisible();
});

test("위시리스트가 비어 있으면 빈 상태가 표시된다", async ({ page }) => {
  await setupMySession(page, "myWishlist");
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/v1/users/me") return route.fulfill(json(user));
    if (path === "/api/v1/users/me/wishlists") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    return route.fulfill(json(null));
  });
  await page.goto("/");

  await expect(page.getByText(/찜한 항목이 없|위시리스트가 비어/)).toBeVisible();
});

// ── 내 리뷰 ──────────────────────────────────────────────

test("내 리뷰 목록이 렌더링된다", async ({ page }) => {
  await setupMySession(page, "myReviews");
  await routeBaseApis(page);
  await page.goto("/");

  await expect(page.getByText("빈대떡집")).toBeVisible();
  await expect(page.getByText("맛있어요")).toBeVisible();
});

test("작성한 리뷰가 없으면 빈 상태가 표시된다", async ({ page }) => {
  await setupMySession(page, "myReviews");
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/v1/users/me") return route.fulfill(json(user));
    if (path === "/api/v1/users/me/reviews") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    return route.fulfill(json(null));
  });
  await page.goto("/");

  await expect(page.getByText("작성한 리뷰가 없습니다.")).toBeVisible();
});

// ── 프로필 수정 ──────────────────────────────────────────────

test("프로필 수정 화면에서 닉네임 입력란이 표시된다", async ({ page }) => {
  await setupMySession(page, "myProfileEdit");
  await routeBaseApis(page);
  await page.goto("/");

  await expect(page.getByPlaceholder(/닉네임/)).toBeVisible();
});

test("닉네임 변경 시 저장 API가 호출된다", async ({ page }) => {
  let saved = false;

  await setupMySession(page, "myProfileEdit");
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (path === "/api/v1/users/me" && req.method() === "GET") return route.fulfill(json(user));
    if (path === "/api/v1/users/me" && (req.method() === "PUT" || req.method() === "PATCH")) {
      saved = true;
      return route.fulfill(json({ ...user, nickname: "새닉네임" }));
    }
    if (path === "/api/v1/yeopjeon/balance") return route.fulfill(json({ balance: 1000 }));
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    return route.fulfill(json(null));
  });
  await page.goto("/");

  const input = page.getByPlaceholder(/닉네임/);
  await input.fill("새닉네임");
  await page.getByRole("button", { name: /저장|완료|확인/ }).click();

  await expect.poll(() => saved).toBe(true);
});
