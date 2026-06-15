import { expect, test } from "@playwright/test";

function json(data, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify({ code: "SUCCESS", message: "OK", data }),
  };
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
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
      screen: "communityWrite",
      tab: "community",
      selectedPost: null,
    }));
  });

  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/v1/users/me") return route.fulfill(json({ userId: 1, nickname: "춘배", role: "USER" }));
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
  });
});

test("한옥 캘린더에서 연도와 월을 휠 방식으로 선택한다", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: /직접 날짜 선택/ }).click();

  const calendar = page.getByRole("dialog", { name: "모임 날짜 선택" });
  await expect(calendar).toBeVisible();
  await expect(calendar.getByRole("button", { name: "2026년" })).toBeVisible();
  await expect(calendar.getByRole("button", { name: "6월" })).toBeVisible();

  await calendar.getByRole("button", { name: "2026년" }).click();
  await expect(calendar.getByText(/연도 선택/)).toBeVisible();
  await calendar.locator(".hanok-calendar-wheel").dispatchEvent("wheel", { deltaY: 120 });
  await expect(calendar.locator(".hanok-calendar-wheel .selected")).toHaveText("2027년");
  await page.screenshot({ path: testInfo.outputPath("hanok-calendar-year-wheel.png"), fullPage: false });

  await calendar.getByRole("button", { name: "달력 보기" }).click();
  await calendar.getByRole("button", { name: "6월" }).click();
  await expect(calendar.getByText(/월 선택/)).toBeVisible();
  await calendar.locator(".hanok-calendar-wheel").dispatchEvent("wheel", { deltaY: 120 });
  await expect(calendar.locator(".hanok-calendar-wheel .selected")).toHaveText("7월");
  await calendar.getByRole("button", { name: "달력 보기" }).click();
  await page.screenshot({ path: testInfo.outputPath("hanok-calendar.png"), fullPage: false });
});
