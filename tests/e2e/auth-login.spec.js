import { expect, test } from "@playwright/test";

function json(data, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify({ code: "SUCCESS", message: "OK", data }),
  };
}

function jsonError(message, status = 401) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify({ code: "UNAUTHORIZED", message }),
  };
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page.getByPlaceholder("이메일")).toBeVisible();
});

test("로그인 성공 시 홈 화면으로 이동한다", async ({ page }) => {
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/v1/auth/login") return route.fulfill(json({
      accessToken: "mock-token",
      user: { userId: 1, nickname: "춘배", role: "USER", language: "ko" },
    }));
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    return route.fulfill(json(null));
  });

  await page.getByPlaceholder("이메일").fill("test@chunbae.site");
  await page.getByPlaceholder("비밀번호").fill("password123");
  await page.getByRole("button", { name: "로그인" }).click();

  await expect(page.getByRole("navigation", { name: "주요 화면 빠른 이동" })).toBeVisible();
});

test("잘못된 비밀번호로 로그인 시 에러 메시지가 표시된다", async ({ page }) => {
  await page.route("**/api/v1/auth/login", async (route) => {
    route.fulfill(jsonError("이메일 또는 비밀번호가 올바르지 않습니다."));
  });

  await page.getByPlaceholder("이메일").fill("test@chunbae.site");
  await page.getByPlaceholder("비밀번호").fill("wrongpassword");
  await page.getByRole("button", { name: "로그인" }).click();

  await expect(page.getByText(/올바르지 않습니다|로그인 중 문제/)).toBeVisible();
});

test("카카오/네이버 소셜 로그인 버튼이 표시된다", async ({ page }) => {
  await expect(page.getByText("Kakao로 시작하기")).toBeVisible();
  await expect(page.getByText("Naver로 시작하기")).toBeVisible();
});

test("로그아웃 시 공개 홈으로 복귀한다", async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("userAccessToken", "e2e-token");
    sessionStorage.setItem("userProfile", JSON.stringify({
      userId: 1, nickname: "춘배", role: "USER", language: "ko",
    }));
    sessionStorage.setItem("chunbae_navigation_state", JSON.stringify({
      chunbaeTour: true, appState: "main", screen: "my", tab: "my",
    }));
  });

  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/v1/users/me") return route.fulfill(json({ userId: 1, nickname: "춘배", role: "USER" }));
    if (path === "/api/v1/yeopjeon/balance") return route.fulfill(json({ balance: 0 }));
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    if (path === "/api/v1/auth/logout") return route.fulfill(json(null));
    return route.fulfill(json(null));
  });

  await page.goto("/");
  await page.getByText("로그아웃하기").click();
  await page.getByRole("button", { name: "로그아웃" }).click();

  await expect(page.getByRole("button", { name: "로그인", exact: true })).toBeVisible();
});
