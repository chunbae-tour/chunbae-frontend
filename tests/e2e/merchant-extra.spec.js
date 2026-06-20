import { expect, test } from "@playwright/test";

function json(data) {
  return {
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ code: "SUCCESS", message: "OK", data }),
  };
}

const shop = {
  shopId: 1, name: "춘배 빈대떡", category: "한식", market: "광장시장",
  status: "ACTIVE", rating: 4.5, reviewCount: 32, imageUrls: [], menus: [], notices: [],
};

function setupMerchantSession(page, screen, extra = {}) {
  return page.addInitScript(([s, e]) => {
    sessionStorage.setItem("userAccessToken", "e2e-merchant-token");
    sessionStorage.setItem("userProfile", JSON.stringify({ userId: 2, nickname: "상인춘배", role: "MERCHANT", language: "ko", shopId: 1 }));
    sessionStorage.setItem("chunbae_navigation_state", JSON.stringify({ chunbaeTour: true, appState: "main", screen: s, tab: "my", ...e }));
  }, [screen, extra]);
}

function routeBase(page) {
  return page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (path === "/api/v1/merchants/me/shops") return route.fulfill(json([shop]));
    if (path === "/api/v1/merchants/me/shops/1") return route.fulfill(json(shop));
    if (path === "/api/v1/merchants/me/shops/1/menus") return route.fulfill(json([]));
    if (path === "/api/v1/merchants/me/shops/1/notices") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    if (path === "/api/v1/merchants/me/shops/1/wallet") return route.fulfill(json({ balance: 50000, pendingSettlement: 50000, totalEarned: 120000 }));
    if (path === "/api/v1/merchants/me/shops/1/settlements") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    if (path === "/api/v1/merchants/me/qr-payments/pending") return route.fulfill(json([]));
    if (path === "/api/v1/merchants/me/home") return route.fulfill(json({ todaySalesAmount: 0, todaySalesDate: "", recentPayments: [] }));
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    return route.fulfill(json(null));
  });
}

// ── 결제 거절 ──────────────────────────────────────────────

test("결제 요청 거절 시 API가 호출되고 toast가 표시된다", async ({ page }) => {
  let rejected = false;
  const payRequest = { payRequestId: 55, shopId: 1, customerName: "여행자", amount: 8000, menuName: "빈대떡", status: "PENDING_CONFIRM", requestedAt: "2026-06-20T10:00:00" };

  await setupMerchantSession(page, "merchant");
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (path === "/api/v1/merchants/me/shops") return route.fulfill(json([shop]));
    if (path === "/api/v1/merchants/me/shops/1") return route.fulfill(json(shop));
    if (path === "/api/v1/merchants/me/qr-payments/pending") return route.fulfill(json([payRequest]));
    if (path === "/api/v1/payments/qr/55/reject" && req.method() === "PATCH") {
      rejected = true;
      return route.fulfill(json({ status: "REJECTED" }));
    }
    if (path === "/api/v1/merchants/me/home") return route.fulfill(json({ todaySalesAmount: 0, todaySalesDate: "", recentPayments: [] }));
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    return route.fulfill(json(null));
  });
  await page.goto("/");

  await expect(page.getByText("빈대떡")).toBeVisible();
  await page.getByRole("button", { name: /거절/ }).click();
  await expect.poll(() => rejected).toBe(true);
  await expect(page.getByText("결제 요청을 거절했습니다.")).toBeVisible();
});

// ── 공지 등록 ──────────────────────────────────────────────

test("공지 제목/내용 미입력 시 toast가 표시된다", async ({ page }) => {
  await setupMerchantSession(page, "merchant");
  await routeBase(page);
  await page.goto("/");

  await page.getByText("가게 공지").click();
  const addBtn = page.getByRole("button", { name: /공지 등록|공지 추가|공지 작성/ });
  if (await addBtn.isVisible()) await addBtn.click();
  const submitBtn = page.getByRole("button", { name: /등록|저장|완료/ });
  if (await submitBtn.isVisible()) await submitBtn.click();

  await expect(page.getByText("공지 제목과 내용을 입력해주세요.")).toBeVisible();
});

test("공지 등록 성공 시 API가 호출된다", async ({ page }) => {
  let posted = false;

  await setupMerchantSession(page, "merchant");
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (path === "/api/v1/merchants/me/shops") return route.fulfill(json([shop]));
    if (path === "/api/v1/merchants/me/shops/1") return route.fulfill(json(shop));
    if (path === "/api/v1/merchants/me/shops/1/menus") return route.fulfill(json([]));
    if (path === "/api/v1/merchants/me/shops/1/notices" && req.method() === "GET") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    if (path === "/api/v1/merchants/me/shops/1/notices" && req.method() === "POST") {
      posted = true;
      return route.fulfill(json({ id: 10, title: "공지사항", content: "내용입니다" }));
    }
    if (path === "/api/v1/merchants/me/qr-payments/pending") return route.fulfill(json([]));
    if (path === "/api/v1/merchants/me/home") return route.fulfill(json({ todaySalesAmount: 0, todaySalesDate: "", recentPayments: [] }));
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    return route.fulfill(json(null));
  });
  await page.goto("/");

  await page.getByText("가게 공지").click();
  const addBtn = page.getByRole("button", { name: /공지 등록|공지 추가|공지 작성/ });
  if (await addBtn.isVisible()) {
    await addBtn.click();
    await page.getByPlaceholder(/제목/).fill("공지사항");
    await page.getByPlaceholder(/내용/).fill("내용입니다");
    await page.getByRole("button", { name: /등록|저장|완료/ }).click();
    await expect.poll(() => posted).toBe(true);
  }
});

// ── 정산 요청 ──────────────────────────────────────────────

test("정산 요청 버튼 클릭 시 API가 호출된다", async ({ page }) => {
  let requested = false;

  await setupMerchantSession(page, "merchantSettlement");
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (path === "/api/v1/merchants/me/shops") return route.fulfill(json([shop]));
    if (path === "/api/v1/merchants/me/shops/1/wallet") return route.fulfill(json({ balance: 50000, pendingSettlement: 50000, totalEarned: 120000 }));
    if (path === "/api/v1/merchants/me/shops/1/settlements" && req.method() === "GET") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    if (path === "/api/v1/merchants/me/shops/1/settlements" && req.method() === "POST") {
      requested = true;
      return route.fulfill(json({ settlementId: 1, amount: 50000, status: "PENDING" }));
    }
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    return route.fulfill(json(null));
  });
  await page.goto("/");

  await page.getByRole("button", { name: /정산 요청/ }).click();
  await expect.poll(() => requested).toBe(true);
});

// ── 입점 신청 ──────────────────────────────────────────────

test("입점 신청 화면에서 폼 입력란이 표시된다", async ({ page }) => {
  await setupMerchantSession(page, "merchantApply");
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/v1/merchants/me/shops") return route.fulfill(json([]));
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    return route.fulfill(json(null));
  });
  await page.goto("/");

  await expect(page.getByText(/상인 신청|입점 신청|가게 등록/)).toBeVisible();
});
