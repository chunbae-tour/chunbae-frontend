import { expect, test } from "@playwright/test";

function json(data) {
  return {
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ code: "SUCCESS", message: "OK", data }),
  };
}

const notifs = [
  { id: 1, type: "COMPANION_ACCEPT", title: "동행 신청이 수락되었습니다.", body: "광장시장 동행", read: false, createdAt: "2026-06-20T09:00:00" },
  { id: 2, type: "SYSTEM", title: "앱 공지", body: "서버 점검 안내", read: true, createdAt: "2026-06-19T12:00:00" },
];

function setupNotifSession(page) {
  return page.addInitScript(() => {
    sessionStorage.setItem("userAccessToken", "e2e-token");
    sessionStorage.setItem("userProfile", JSON.stringify({ userId: 1, nickname: "춘배", role: "USER", language: "ko" }));
    sessionStorage.setItem("chunbae_navigation_state", JSON.stringify({
      chunbaeTour: true, appState: "main", screen: "notif", tab: "my",
    }));
  });
}

test("알림 목록이 렌더링된다", async ({ page }) => {
  await setupNotifSession(page);
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: notifs, hasNext: false, size: 2 }));
    return route.fulfill(json(null));
  });
  await page.goto("/");

  await expect(page.getByText("동행 신청이 수락되었습니다.")).toBeVisible();
  await expect(page.getByText("앱 공지")).toBeVisible();
});

test("알림이 없으면 빈 상태 메시지가 표시된다", async ({ page }) => {
  await setupNotifSession(page);
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    return route.fulfill(json(null));
  });
  await page.goto("/");

  await expect(page.getByText("알림이 없어요")).toBeVisible();
});

test("안 읽은 알림 탭 클릭 시 필터링된다", async ({ page }) => {
  await setupNotifSession(page);
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: notifs, hasNext: false, size: 2 }));
    return route.fulfill(json(null));
  });
  await page.goto("/");

  await page.getByText("안 읽은 알림").click();
  await expect(page.getByText("동행 신청이 수락되었습니다.")).toBeVisible();
});

test("알림 클릭 시 읽음 처리 API가 호출된다", async ({ page }) => {
  let marked = false;

  await setupNotifSession(page);
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: notifs, hasNext: false, size: 2 }));
    if (path === "/api/v1/notifications/1/read" && req.method() === "PATCH") {
      marked = true;
      return route.fulfill(json(null));
    }
    return route.fulfill(json(null));
  });
  await page.goto("/");

  await page.getByText("동행 신청이 수락되었습니다.").click();
  await expect.poll(() => marked).toBe(true);
});
