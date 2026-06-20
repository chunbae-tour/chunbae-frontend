import { expect, test } from "@playwright/test";

function json(data) {
  return {
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ code: "SUCCESS", message: "OK", data }),
  };
}

async function openQRPage(page) {
  await page.addInitScript(() => {
    sessionStorage.setItem("userAccessToken", "e2e-access-token");
    sessionStorage.setItem("userProfile", JSON.stringify({
      userId: 1, nickname: "춘배", role: "USER", language: "ko",
    }));
    sessionStorage.setItem("chunbae_navigation_state", JSON.stringify({
      chunbaeTour: true, appState: "main", screen: "qrpay", tab: "my",
    }));
  });

  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/v1/yeopjeon/balance") return route.fulfill(json({ balance: 2000 }));
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    return route.fulfill(json(null));
  });

  await page.goto("/");
}

test("QR 결제 페이지가 렌더링된다", async ({ page }) => {
  await openQRPage(page);
  await expect(page.getByText(/QR|결제|스캔/)).toBeVisible();
});

test("QR 결제 페이지에 잔액이 표시된다", async ({ page }) => {
  await openQRPage(page);
  await expect(page.getByText("2,000냥")).toBeVisible();
});
