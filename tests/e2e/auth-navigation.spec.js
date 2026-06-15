import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "로그인", exact: true })).toBeVisible();
});

test("로그인 화면에서 회원가입 화면으로 이동하고 돌아올 수 있다", async ({ page }) => {
  await page.getByRole("button", { name: "로그인", exact: true }).click();

  await expect(page.getByPlaceholder("이메일")).toBeVisible();
  await expect(page.getByPlaceholder("비밀번호")).toBeVisible();

  await page.getByText("회원가입", { exact: true }).click();
  await expect(page.getByText("춘배투어와 함께 로컬 여행을 시작해보세요.")).toBeVisible();

  await page.getByRole("button", { name: "로그인으로 돌아가기" }).click();
  await expect(page.getByPlaceholder("이메일")).toBeVisible();
});

test("공개 홈에서 서비스 홈으로 진입할 수 있다", async ({ page }) => {
  await page.getByRole("button", { name: "동네 한 바퀴 둘러보기" }).click();

  await expect(page.getByRole("button", { name: "춘배투어 홈으로 이동" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "주요 화면 빠른 이동" })).toBeVisible();
});
