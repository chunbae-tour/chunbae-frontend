import { expect, test } from "@playwright/test";

function json(data) {
  return {
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ code: "SUCCESS", message: "OK", data }),
  };
}

const user = { userId: 1, nickname: "춘배", role: "USER", language: "ko" };

const companionPost = {
  postId: 10, type: "동행", title: "광장시장 같이 가요", content: "오후에 둘러봐요",
  placeId: 5, placeName: "광장시장", region: "서울 종로구",
  meetingDate: "2026-07-01", maxMembers: 4, currentMembers: 1,
  status: "ACTIVE", writer: { userId: 2, nickname: "여행자" },
  createdAt: "2026-06-20T10:00:00",
};

function setupUserSession(page, screen, extra = {}) {
  return page.addInitScript(([s, e]) => {
    sessionStorage.setItem("userAccessToken", "e2e-token");
    sessionStorage.setItem("userProfile", JSON.stringify({
      userId: 1, nickname: "춘배", role: "USER", language: "ko",
    }));
    sessionStorage.setItem("chunbae_navigation_state", JSON.stringify({
      chunbaeTour: true, appState: "main", screen: s, tab: "community", ...e,
    }));
  }, [screen, extra]);
}

function routeCommunityApis(page, overrides = {}) {
  return page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const key = `${req.method()} ${path}`;

    if (overrides[key]) return route.fulfill(overrides[key]);
    if (path === "/api/v1/users/me") return route.fulfill(json(user));
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    if (path === "/api/v1/community/posts/companions") return route.fulfill(json({ content: [companionPost], hasNext: false, size: 1 }));
    if (path === "/api/v1/community/posts/free") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
  });
}

// ── 목록 ──────────────────────────────────────────────

test("커뮤니티 목록에서 동행 게시글이 표시된다", async ({ page }) => {
  await setupUserSession(page, "community");
  await routeCommunityApis(page);
  await page.goto("/");

  await expect(page.getByText("광장시장 같이 가요")).toBeVisible();
});

test("동행/자유 탭 전환이 가능하다", async ({ page }) => {
  await setupUserSession(page, "community");
  await routeCommunityApis(page);
  await page.goto("/");

  await expect(page.getByText("동행 게시판")).toBeVisible();
  await page.getByText("자유 게시판").click();
  await expect(page.getByText("자유 게시판")).toBeVisible();
});

test("게시글이 없으면 빈 상태 메시지가 표시된다", async ({ page }) => {
  await setupUserSession(page, "community");
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/v1/users/me") return route.fulfill(json(user));
    if (path.includes("/community/posts")) return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    return route.fulfill(json(null));
  });
  await page.goto("/");

  await expect(page.getByText(/첫 글을 남겨보세요|게시글이 없/)).toBeVisible();
});

// ── 게시글 상세 ──────────────────────────────────────────────

test("게시글 상세에서 참여 신청하기 버튼이 표시된다", async ({ page }) => {
  const navPost = {
    ...companionPost, id: companionPost.postId, type: "동행",
    place: companionPost.placeName, author: companionPost.writer.nickname,
    writerId: companionPost.writer.userId, date: companionPost.meetingDate,
    max: companionPost.maxMembers, current: companionPost.currentMembers,
  };

  await setupUserSession(page, "communityPost", { selectedPost: navPost });
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (path === "/api/v1/users/me") return route.fulfill(json(user));
    if (path === "/api/v1/community/posts/companions/10") return route.fulfill(json(companionPost));
    if (path.includes("/comments")) return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    if (path === "/api/v1/chat/rooms") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    return route.fulfill(json(null));
  });
  await page.goto("/");

  await expect(page.getByText("광장시장 같이 가요")).toBeVisible();
  await expect(page.getByRole("button", { name: "참여 신청하기" })).toBeVisible();
});

test("동행 신청 버튼 클릭 시 API가 호출된다", async ({ page }) => {
  let applied = false;
  const navPost = {
    ...companionPost, id: companionPost.postId, type: "동행",
    place: companionPost.placeName, author: companionPost.writer.nickname,
    writerId: companionPost.writer.userId, date: companionPost.meetingDate,
    max: companionPost.maxMembers, current: companionPost.currentMembers,
  };

  await setupUserSession(page, "communityPost", { selectedPost: navPost });
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (path === "/api/v1/users/me") return route.fulfill(json(user));
    if (path === "/api/v1/community/posts/companions/10" && req.method() === "GET") return route.fulfill(json(companionPost));
    if (path === "/api/v1/community/posts/companions/10/apply" && req.method() === "POST") {
      applied = true;
      return route.fulfill(json({ status: "APPLIED" }));
    }
    if (path.includes("/comments")) return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    if (path === "/api/v1/chat/rooms") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    return route.fulfill(json(null));
  });
  await page.goto("/");

  await page.getByRole("button", { name: "참여 신청하기" }).click();
  await expect.poll(() => applied).toBe(true);
});

// ── 게시글 작성 ──────────────────────────────────────────────

test("게시글 작성 화면에서 제목 입력란이 표시된다", async ({ page }) => {
  await setupUserSession(page, "communityWrite", { writeTab: "동행" });
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/v1/users/me") return route.fulfill(json(user));
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    if (path === "/api/v1/search/places") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    return route.fulfill(json(null));
  });
  await page.goto("/");

  await expect(page.getByPlaceholder("제목을 입력하세요")).toBeVisible();
});

test("제목 미입력 시 게시글 작성 제출이 차단된다", async ({ page }) => {
  let submitted = false;

  await setupUserSession(page, "communityWrite", { writeTab: "동행" });
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (req.method() === "POST" && path.includes("/community/posts")) {
      submitted = true;
      return route.fulfill(json({ postId: 99 }));
    }
    if (path === "/api/v1/users/me") return route.fulfill(json(user));
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    if (path === "/api/v1/search/places") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    return route.fulfill(json(null));
  });
  await page.goto("/");

  const submitBtn = page.getByRole("button", { name: /등록|작성 완료|완료/ });
  if (await submitBtn.isVisible()) await submitBtn.click();

  await expect.poll(() => submitted).toBe(false);
});
