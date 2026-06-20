import { expect, test } from "@playwright/test";

function json(data) {
  return {
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ code: "SUCCESS", message: "OK", data }),
  };
}

const profile = { userId: 1, nickname: "춘배", role: "USER", email: "test@chunbae.site", language: "ko" };

test.beforeEach(async ({ page }) => {
  await page.addInitScript((p) => {
    sessionStorage.setItem("userAccessToken", "e2e-access-token");
    sessionStorage.setItem("userProfile", JSON.stringify(p));
    sessionStorage.setItem("chunbae_navigation_state", JSON.stringify({
      chunbaeTour: true, appState: "main", screen: "my", tab: "my",
    }));
  }, profile);

  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/v1/users/me") return route.fulfill(json(profile));
    if (path === "/api/v1/yeopjeon/balance") return route.fulfill(json({ balance: 300 }));
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
  });

  await page.goto("/");
});

test("마이페이지에서 닉네임과 엽전 잔액이 표시된다", async ({ page }) => {
  await expect(page.getByText("춘배")).toBeVisible();
  await expect(page.getByText("300냥")).toBeVisible();
});

test("마이페이지에서 보유 아이템 메뉴로 이동할 수 있다", async ({ page }) => {
  await page.addInitScript(() => {});

  await page.route("**/api/v1/items**", async (route) => {
    route.fulfill(json({ content: [], hasNext: false, size: 0 }));
  });

  const itemMenu = page.getByRole("button", { name: /보유 아이템|아이템/ });
  await expect(itemMenu).toBeVisible();
  await itemMenu.click();

  await expect(page.getByText(/보유|아이템/)).toBeVisible();
});

test("마이페이지에서 엽전 충전 버튼이 있다", async ({ page }) => {
  await expect(page.getByRole("button", { name: /충전/ })).toBeVisible();
});
