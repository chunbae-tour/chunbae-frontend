import { expect, test } from "@playwright/test";

function json(data) {
  return {
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ code: "SUCCESS", message: "OK", data }),
  };
}

test("홈은 진행 중 축제만 세고 상태를 한국어로 표시한다", async ({ page }) => {
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
      screen: "home",
      tab: "home",
    }));
  });

  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;

    if (path === "/api/v1/search/festivals") {
      return route.fulfill(json({
        content: [
          {
            festivalId: 1,
            name: "진행 중인 축제",
            address: "서울",
            startDate: "2026-06-01",
            endDate: "2026-06-30",
            progressStatus: "IN_PROGRESS",
          },
          {
            festivalId: 2,
            name: "예정된 축제",
            address: "부산",
            startDate: "2026-07-01",
            endDate: "2026-07-15",
            progressStatus: "UPCOMING",
          },
        ],
        nextCursor: null,
        hasNext: false,
        size: 2,
      }));
    }

    return route.fulfill(json({ content: [], nextCursor: null, hasNext: false, size: 0 }));
  });

  await page.goto("/");

  const stats = page.locator(".home-landing-stats");
  await expect(stats.getByText("1개", { exact: true })).toBeVisible();
  await expect(stats.getByText("진행 중 축제 수", { exact: true })).toBeVisible();
  await expect(stats.getByText("등록 시장 수", { exact: true })).toHaveCount(0);
  await expect(stats.getByText("동행 완료 수", { exact: true })).toHaveCount(0);

  const schedule = page.locator(".home-festival-schedule");
  await expect(schedule.getByText("진행 중인 축제", { exact: true })).toBeVisible();
  await expect(schedule.getByText("진행 중", { exact: true })).toBeVisible();
  await expect(schedule.getByText("예정된 축제", { exact: true })).toHaveCount(0);
  await expect(schedule.getByText("IN_PROGRESS", { exact: true })).toHaveCount(0);
});
