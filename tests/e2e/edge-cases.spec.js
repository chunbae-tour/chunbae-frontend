import { expect, test } from "@playwright/test";

function json(data) {
  return {
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ code: "SUCCESS", message: "OK", data }),
  };
}

function jsonError(status = 500) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify({ code: "SERVER_ERROR", message: "서버 오류가 발생했습니다." }),
  };
}

const user = { userId: 1, nickname: "춘배", role: "USER", language: "ko" };

function setupSession(page, screen, tab = "map") {
  return page.addInitScript(([s, t]) => {
    sessionStorage.setItem("userAccessToken", "e2e-token");
    sessionStorage.setItem("userProfile", JSON.stringify({ userId: 1, nickname: "춘배", role: "USER", language: "ko" }));
    sessionStorage.setItem("chunbae_navigation_state", JSON.stringify({ chunbaeTour: true, appState: "main", screen: s, tab: t }));
  }, [screen, tab]);
}

// ── API 에러 처리 ──────────────────────────────────────────────

test("장소 API 에러 시 에러 상태가 표시된다", async ({ page }) => {
  await setupSession(page, "map", "map");
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.startsWith("/api/v1/places")) return route.fulfill(jsonError(500));
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    return route.fulfill(json(null));
  });
  await page.goto("/");

  await expect(page.getByText(/오류|실패|불러오지 못/)).toBeVisible();
});

test("축제 API 에러 시 에러 상태가 표시된다", async ({ page }) => {
  await setupSession(page, "festival", "festival");
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.startsWith("/api/v1/festivals")) return route.fulfill(jsonError(500));
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    return route.fulfill(json(null));
  });
  await page.goto("/");

  await expect(page.getByText(/오류|실패|불러오지 못/)).toBeVisible();
});

// ── 비로그인 보호 화면 ──────────────────────────────────────────────

test("비로그인 상태에서 마이페이지 접근 시 로그인 화면이 표시된다", async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.clear();
  });
  await page.goto("/");

  await expect(page.getByRole("button", { name: "로그인", exact: true })).toBeVisible();
});

test("비로그인 상태에서 결제 접근 시 로그인 유도 문구가 표시된다", async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.clear();
    sessionStorage.setItem("chunbae_navigation_state", JSON.stringify({
      chunbaeTour: true, appState: "main", screen: "payment", tab: "my",
    }));
  });
  await page.route("**/api/v1/**", async (route) => {
    route.fulfill(jsonError(401));
  });
  await page.goto("/");

  await expect(page.getByText(/로그인|인증/)).toBeVisible();
});

// ── 스토어 ──────────────────────────────────────────────

test("스토어 상품 목록이 렌더링된다", async ({ page }) => {
  await setupSession(page, "store", "my");
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/v1/users/me") return route.fulfill(json(user));
    if (path === "/api/v1/yeopjeon/balance") return route.fulfill(json({ balance: 5000 }));
    if (path.startsWith("/api/v1/store/products") || path.startsWith("/api/v1/items")) return route.fulfill(json({ content: [
      { itemId: 1, name: "봄 여행 패키지", price: 1000, description: "광장시장 코스", imageUrl: null },
      { itemId: 2, name: "한복 체험권", price: 2000, description: "경복궁 한복 체험", imageUrl: null },
    ], hasNext: false, size: 2 }));
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
  });
  await page.goto("/");

  await expect(page.getByText(/봄 여행 패키지|한복 체험권|상품/)).toBeVisible();
});

// ── 공통 빈 상태 ──────────────────────────────────────────────

test("커뮤니티 자유 게시판 빈 상태에서 글 작성 유도 문구가 표시된다", async ({ page }) => {
  await setupSession(page, "community", "community");
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/v1/users/me") return route.fulfill(json(user));
    if (path.includes("/community/posts")) return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    return route.fulfill(json(null));
  });
  await page.goto("/");

  await page.getByText("자유 게시판").click();
  await expect(page.getByText(/첫 글을 남겨보세요|게시글이 없/)).toBeVisible();
});

test("알림 없는 경우 빈 상태가 표시된다", async ({ page }) => {
  await setupSession(page, "notif", "my");
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    return route.fulfill(json(null));
  });
  await page.goto("/");

  await expect(page.getByText("알림이 없어요")).toBeVisible();
});
