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
  address: "서울 종로구 창경궁로 88", phone: "02-1234-5678",
  description: "바삭한 빈대떡 전문점", operatingHours: "09:00-18:00",
  holiday: "일요일", status: "ACTIVE", rating: 4.5, reviewCount: 32,
  imageUrls: [], menus: [], notices: [],
};

function setupMerchantSession(page, screen, extra = {}) {
  return page.addInitScript(([s, e]) => {
    sessionStorage.setItem("userAccessToken", "e2e-merchant-token");
    sessionStorage.setItem("userProfile", JSON.stringify({
      userId: 2, nickname: "상인춘배", role: "MERCHANT", language: "ko", shopId: 1,
    }));
    sessionStorage.setItem("chunbae_navigation_state", JSON.stringify({
      chunbaeTour: true, appState: "main", screen: s, tab: "my", ...e,
    }));
  }, [screen, extra]);
}

function routeMerchantApis(page, overrides = {}) {
  return page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;

    if (overrides[`${req.method()} ${path}`]) return route.fulfill(overrides[`${req.method()} ${path}`]);

    if (path === "/api/v1/merchants/me/shops") return route.fulfill(json([shop]));
    if (path === `/api/v1/merchants/me/shops/1`) return route.fulfill(json(shop));
    if (path === "/api/v1/merchants/me/shops/1/menus") return route.fulfill(json([
      { menuId: 10, name: "빈대떡", price: 8000, available: true, desc: "" },
      { menuId: 11, name: "막걸리", price: 5000, available: true, desc: "" },
    ]));
    if (path === "/api/v1/merchants/me/shops/1/settlements") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    if (path === "/api/v1/merchants/me/shops/1/wallet") return route.fulfill(json({ balance: 50000, pendingSettlement: 50000, totalEarned: 120000 }));
    if (path === "/api/v1/merchants/me/qr-payments/pending") return route.fulfill(json([]));
    if (path === "/api/v1/merchants/me/shops/1/notices") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    if (path === "/api/v1/merchants/me/home") return route.fulfill(json({ todaySalesAmount: 0, todaySalesDate: "", recentPayments: [] }));
    return route.fulfill(json(null));
  });
}

// ── 가게 관리 홈 ──────────────────────────────────────────────

test("상인 홈에서 가게 이름과 상태가 표시된다", async ({ page }) => {
  await setupMerchantSession(page, "merchant");
  await routeMerchantApis(page);
  await page.goto("/");

  await expect(page.getByText("춘배 빈대떡")).toBeVisible();
  await expect(page.getByText("영업중")).toBeVisible();
});

test("가게 상태가 ACTIVE면 영업중으로 표시된다", async ({ page }) => {
  await setupMerchantSession(page, "merchant");
  await routeMerchantApis(page);
  await page.goto("/");

  await expect(page.getByText("영업중")).toBeVisible();
});

// ── 메뉴 관리 ──────────────────────────────────────────────

test("메뉴 목록이 렌더링된다", async ({ page }) => {
  await setupMerchantSession(page, "merchantMenu");
  await routeMerchantApis(page);
  await page.goto("/");

  await expect(page.getByText("빈대떡")).toBeVisible();
  await expect(page.getByText("막걸리")).toBeVisible();
  await expect(page.getByText("8,000원")).toBeVisible();
});

test("메뉴명 미입력 시 추가 불가 toast가 표시된다", async ({ page }) => {
  await setupMerchantSession(page, "merchantMenu");
  await routeMerchantApis(page);
  await page.goto("/");

  await page.getByText("+ 메뉴 추가").click();
  await page.getByRole("button", { name: "추가하기" }).click();

  await expect(page.getByText("메뉴명과 가격을 입력해주세요.")).toBeVisible();
});

test("메뉴 추가 폼 제출 시 API가 호출된다", async ({ page }) => {
  let addBody;

  await setupMerchantSession(page, "merchantMenu");
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;

    if (path === "/api/v1/merchants/me/shops") return route.fulfill(json([shop]));
    if (path === "/api/v1/merchants/me/shops/1/menus" && req.method() === "GET") return route.fulfill(json([]));
    if (path === "/api/v1/merchants/me/shops/1/menus" && req.method() === "POST") {
      addBody = req.postDataJSON();
      return route.fulfill(json({ menuId: 99, name: addBody.name, price: addBody.price, available: true }));
    }
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    return route.fulfill(json(null));
  });

  await page.goto("/");
  await page.getByText("+ 메뉴 추가").click();
  await page.getByPlaceholder("예) 빈대떡").fill("두부김치");
  await page.locator("input[type='number'], input[placeholder*='가격']").fill("9000");
  await page.getByRole("button", { name: "추가하기" }).click();

  await expect.poll(() => addBody).toMatchObject({ name: "두부김치", price: 9000 });
});

// ── 정산 ──────────────────────────────────────────────

test("정산 페이지에서 정산 가능 금액이 표시된다", async ({ page }) => {
  await setupMerchantSession(page, "merchantSettlement");
  await routeMerchantApis(page);
  await page.goto("/");

  await expect(page.getByText("정산 가능 금액")).toBeVisible();
  await expect(page.getByText(/50,000/)).toBeVisible();
});

test("정산 가능 금액이 없으면 정산 요청 버튼이 비활성화된다", async ({ page }) => {
  await setupMerchantSession(page, "merchantSettlement");
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/v1/merchants/me/shops") return route.fulfill(json([shop]));
    if (path === "/api/v1/merchants/me/shops/1/settlements") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    if (path === "/api/v1/merchants/me/shops/1/wallet") return route.fulfill(json({ balance: 0, pendingSettlement: 0, totalEarned: 0 }));
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    return route.fulfill(json(null));
  });
  await page.goto("/");

  const btn = page.getByRole("button", { name: /정산 요청/ });
  await expect(btn).toBeDisabled();
});

// ── QR 결제 승인 ──────────────────────────────────────────────

test("대기 중인 결제 요청이 없으면 빈 상태가 표시된다", async ({ page }) => {
  await setupMerchantSession(page, "merchant");
  await routeMerchantApis(page);
  await page.goto("/");

  await expect(page.getByText("대기 중인 결제 요청이 없습니다.")).toBeVisible();
});

test("결제 요청 승인 시 API가 호출된다", async ({ page }) => {
  let approved = false;
  const payRequest = {
    payRequestId: 55, shopId: 1, customerName: "여행자", amount: 8000,
    menuName: "빈대떡", status: "PENDING_CONFIRM", requestedAt: "2026-06-20T10:00:00",
  };

  await setupMerchantSession(page, "merchant");
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;

    if (path === "/api/v1/merchants/me/shops") return route.fulfill(json([shop]));
    if (path === `/api/v1/merchants/me/shops/1`) return route.fulfill(json(shop));
    if (path === "/api/v1/merchants/me/qr-payments/pending") return route.fulfill(json([payRequest]));
    if (path === "/api/v1/payments/qr/55/confirm" && req.method() === "PATCH") {
      approved = true;
      return route.fulfill(json({ status: "APPROVED" }));
    }
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    if (path === "/api/v1/merchants/me/home") return route.fulfill(json({ todaySalesAmount: 0, todaySalesDate: "", recentPayments: [] }));
    return route.fulfill(json(null));
  });

  await page.goto("/");
  await expect(page.getByText("빈대떡")).toBeVisible();
  await page.getByRole("button", { name: /승인/ }).click();

  await expect.poll(() => approved).toBe(true);
});
