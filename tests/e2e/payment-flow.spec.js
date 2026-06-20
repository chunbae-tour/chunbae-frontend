import { expect, test } from "@playwright/test";

function json(data) {
  return {
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ code: "SUCCESS", message: "OK", data }),
  };
}

async function openChargePage(page) {
  await page.addInitScript(() => {
    sessionStorage.setItem("userAccessToken", "e2e-access-token");
    sessionStorage.setItem("userProfile", JSON.stringify({
      userId: 1, nickname: "춘배", role: "USER", language: "ko",
    }));
    sessionStorage.setItem("chunbae_navigation_state", JSON.stringify({
      chunbaeTour: true, appState: "main", screen: "pay", tab: "my",
    }));
  });

  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/v1/yeopjeon/balance") return route.fulfill(json({ balance: 1000 }));
    return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
  });

  await page.goto("/");
  await expect(page.locator(".web-payment-amount-section")).toBeVisible();
}

test("금액 미선택 시 결제 수단 클릭하면 toast가 표시된다", async ({ page }) => {
  await openChargePage(page);

  await page.getByText("카카오페이").click();
  await expect(page.getByText("충전할 금액을 먼저 선택해주세요!")).toBeVisible();
});

test("금액 선택 후 결제 수단이 활성화되고 선택 가능하다", async ({ page }) => {
  await openChargePage(page);

  await page.getByText("5,000원").click();
  await page.getByText("카카오페이").click();

  const card = page.locator(".payment-method-card", { hasText: "카카오페이" });
  await expect(card).toHaveClass(/selected/);
});

test("결제 수단 선택 시 다른 수단으로 변경 가능하다", async ({ page }) => {
  await openChargePage(page);

  await page.getByText("10,000원").click();
  await page.getByText("카카오페이").click();
  await page.getByText("토스페이").click();

  await expect(page.locator(".payment-method-card.selected", { hasText: "토스페이" })).toBeVisible();
  await expect(page.locator(".payment-method-card.selected", { hasText: "카카오페이" })).not.toBeVisible();
});

test("직접 입력 금액이 1,000원 단위가 아니면 경고 메시지가 표시된다", async ({ page }) => {
  await openChargePage(page);

  await page.locator(".amount-direct-btn, button", { hasText: "직접 입력" }).click();
  const input = page.locator("input[type='number'], input[placeholder*='금액']").last();
  await input.fill("1500");
  await input.blur();

  await expect(page.getByText("1,000원 단위로 입력해주세요.")).toBeVisible();
});
