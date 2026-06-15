import { expect, test } from "@playwright/test";

function json(data) {
  return {
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ code: "SUCCESS", message: "OK", data }),
  };
}

async function openPaymentScreen(page, screen) {
  await page.addInitScript((targetScreen) => {
    sessionStorage.setItem("userAccessToken", "e2e-access-token");
    sessionStorage.setItem("userProfile", JSON.stringify({
      userId: 1,
      nickname: "춘배",
      role: "USER",
      language: "ko",
    }));
    sessionStorage.setItem("chunbae_navigation_state", JSON.stringify({
      chunbaeTour: true,
      appState: "main",
      screen: targetScreen,
      tab: "my",
    }));
  }, screen);

  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/v1/yeopjeon/balance") return route.fulfill(json({ balance: 50 }));
    if (path === "/api/v1/yeopjeon/histories") {
      return route.fulfill(json({
        content: [{
          id: 1,
          type: "CHARGE",
          amount: 50,
          description: "첫 충전",
          createdAt: "2026-06-15T10:00:00",
        }],
        hasNext: false,
        nextCursor: null,
        size: 1,
      }));
    }
    return route.fulfill(json({ content: [], hasNext: false, nextCursor: null, size: 0 }));
  });

  await page.goto("/");
}

test("충전 페이지는 잔액 단위를 냥으로 표시하고 섹션을 정돈한다", async ({ page }) => {
  await openPaymentScreen(page, "pay");

  await expect(page.getByText("50", { exact: true })).toBeVisible();
  await expect(page.getByText("냥", { exact: true })).toBeVisible();
  await expect(page.getByText("500냥", { exact: true })).toBeVisible();

  const balance = await page.locator(".web-payment-balance").boundingBox();
  const amounts = await page.locator(".web-payment-amount-section").boundingBox();
  const summary = await page.locator(".web-payment-submit").boundingBox();

  expect(balance.x).toBeLessThan(amounts.x);
  expect(amounts.x).toBeLessThan(summary.x);
});

test("이용 내역은 냥 단위와 제한된 콘텐츠 폭을 사용한다", async ({ page }) => {
  await openPaymentScreen(page, "payHistory");

  await expect(page.getByText("50냥", { exact: true })).toBeVisible();
  await expect(page.getByText("+50냥", { exact: true })).toBeVisible();

  const balanceCard = await page.locator(".payment-history-balance-card").boundingBox();
  const content = await page.locator(".payment-history-content").boundingBox();

  expect(content.width).toBeLessThanOrEqual(balanceCard.width);
  expect(Math.abs((content.x + content.width / 2) - (balanceCard.x + balanceCard.width / 2))).toBeLessThan(2);
});

test("충전 페이지는 모바일에서 한 열로 자연스럽게 쌓인다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPaymentScreen(page, "pay");

  const balance = await page.locator(".web-payment-balance").boundingBox();
  const amounts = await page.locator(".web-payment-amount-section").boundingBox();
  const methods = await page.locator(".web-payment-method-section").boundingBox();
  const summary = await page.locator(".web-payment-submit").boundingBox();

  expect(balance.y).toBeLessThan(amounts.y);
  expect(amounts.y).toBeLessThan(methods.y);
  expect(methods.y).toBeLessThan(summary.y);
});
