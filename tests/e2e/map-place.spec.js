import { expect, test } from "@playwright/test";

function json(data) {
  return {
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ code: "SUCCESS", message: "OK", data }),
  };
}

const places = [
  { placeId: 1, name: "광화문", category: "관광지", address: "서울 종로구", lat: 37.576, lng: 126.976, imageUrl: null },
  { placeId: 2, name: "경복궁", category: "관광지", address: "서울 종로구", lat: 37.579, lng: 126.977, imageUrl: null },
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("userAccessToken", "e2e-access-token");
    sessionStorage.setItem("userProfile", JSON.stringify({
      userId: 1, nickname: "춘배", role: "USER", language: "ko",
    }));
    sessionStorage.setItem("chunbae_navigation_state", JSON.stringify({
      chunbaeTour: true, appState: "main", screen: "map", tab: "map",
    }));
  });

  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.startsWith("/api/v1/places")) return route.fulfill(json({ content: places, hasNext: false, size: 2 }));
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
  });

  await page.goto("/");
});

test("지도 화면에서 장소 목록이 표시된다", async ({ page }) => {
  await expect(page.getByText("광화문")).toBeVisible();
  await expect(page.getByText("경복궁")).toBeVisible();
});

test("장소 클릭 시 상세 화면으로 이동한다", async ({ page }) => {
  await page.route("**/api/v1/places/1**", async (route) => {
    route.fulfill(json({ ...places[0], description: "조선의 법궁", rating: 4.8, reviewCount: 120 }));
  });

  await page.getByText("광화문").first().click();
  await expect(page.getByText(/광화문|상세/)).toBeVisible();
});

test("검색창이 렌더링된다", async ({ page }) => {
  await expect(page.getByPlaceholder(/장소|검색/)).toBeVisible();
});
