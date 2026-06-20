import { expect, test } from "@playwright/test";

function json(data) {
  return {
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ code: "SUCCESS", message: "OK", data }),
  };
}

const festivals = [
  { festivalId: 1, name: "광장시장 봄 축제", region: "서울 종로구", startDate: "2026-07-01", endDate: "2026-07-05", progressStatus: "IN_PROGRESS", imageUrl: null },
  { festivalId: 2, name: "전주 한지 축제", region: "전북 전주시", startDate: "2026-08-01", endDate: "2026-08-03", progressStatus: "UPCOMING", imageUrl: null },
];

function setupFestivalSession(page, screen = "festival") {
  return page.addInitScript((s) => {
    sessionStorage.setItem("userAccessToken", "e2e-token");
    sessionStorage.setItem("userProfile", JSON.stringify({ userId: 1, nickname: "춘배", role: "USER", language: "ko" }));
    sessionStorage.setItem("chunbae_navigation_state", JSON.stringify({ chunbaeTour: true, appState: "main", screen: s, tab: "festival" }));
  }, screen);
}

function routeFestivalApis(page) {
  return page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.startsWith("/api/v1/festivals/1")) return route.fulfill(json(festivals[0]));
    if (path.startsWith("/api/v1/festivals")) return route.fulfill(json({ content: festivals, hasNext: false, size: 2 }));
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    return route.fulfill(json(null));
  });
}

test("축제 목록이 렌더링된다", async ({ page }) => {
  await setupFestivalSession(page);
  await routeFestivalApis(page);
  await page.goto("/");

  await expect(page.getByText("광장시장 봄 축제")).toBeVisible();
  await expect(page.getByText("전주 한지 축제")).toBeVisible();
});

test("진행 중 축제에 진행 중 뱃지가 표시된다", async ({ page }) => {
  await setupFestivalSession(page);
  await routeFestivalApis(page);
  await page.goto("/");

  await expect(page.getByText("진행 중")).toBeVisible();
});

test("예정 축제에 예정 뱃지가 표시된다", async ({ page }) => {
  await setupFestivalSession(page);
  await routeFestivalApis(page);
  await page.goto("/");

  await expect(page.getByText("예정")).toBeVisible();
});

test("축제 상세 진입 시 날짜 정보가 표시된다", async ({ page }) => {
  await setupFestivalSession(page, "festivalDetail");
  await page.addInitScript(() => {
    const nav = JSON.parse(sessionStorage.getItem("chunbae_navigation_state"));
    nav.selectedFestivalId = 1;
    sessionStorage.setItem("chunbae_navigation_state", JSON.stringify(nav));
  });
  await routeFestivalApis(page);
  await page.goto("/");

  await expect(page.getByText("2026-07-01")).toBeVisible();
});
