import { expect, test } from "@playwright/test";

const post = {
  postId: 77,
  title: "덕수궁 같이 걸어요",
  content: "오후에 천천히 둘러봐요.",
  placeId: 10,
  placeName: "덕수궁",
  region: "서울 중구",
  meetingDate: "2026-06-28",
  maxMembers: 4,
  currentMembers: 1,
  status: "ACTIVE",
  writer: { userId: 1, nickname: "춘배" },
  createdAt: "2026-06-15T12:00:00",
};

function json(data, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify({ code: "SUCCESS", message: "OK", data }),
  };
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript((selectedPost) => {
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
      screen: "communityPost",
      tab: "community",
      selectedPost: {
        ...selectedPost,
        id: selectedPost.postId,
        type: "동행",
        place: selectedPost.placeName,
        author: selectedPost.writer.nickname,
        writerId: selectedPost.writer.userId,
        date: selectedPost.meetingDate,
        max: selectedPost.maxMembers,
        current: selectedPost.currentMembers,
      },
    }));
  }, post);
});

test("작성자는 동행 게시글을 수정할 수 있다", async ({ page }) => {
  let updateBody;

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;

    if (path === "/api/v1/users/me") return route.fulfill(json({ userId: 1, nickname: "춘배", role: "USER" }));
    if (path === "/api/v1/community/posts/companions/77" && request.method() === "GET") return route.fulfill(json(post));
    if (path === "/api/v1/community/posts/companions/77/comments") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    if (path === "/api/v1/chat/rooms") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    if (path === "/api/v1/search/places") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    if (path === "/api/v1/community/posts/companions/77" && request.method() === "PUT") {
      updateBody = request.postDataJSON();
      return route.fulfill(json({ ...post, ...updateBody, postId: 77 }));
    }
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    return route.fulfill(json(null));
  });

  await page.goto("/");
  await page.getByRole("button", { name: "수정", exact: true }).click();

  await expect(page.getByText("게시글 수정", { exact: true })).toBeVisible();
  await page.getByPlaceholder("제목을 입력하세요").fill("수정된 동행 제목");
  await page.getByRole("button", { name: "수정 완료" }).click();

  await expect.poll(() => updateBody).toMatchObject({
    title: "수정된 동행 제목",
    placeId: 10,
    placeName: "덕수궁",
    meetingDate: "2026-06-28",
    maxMembers: 4,
  });
  await expect(page.getByRole("heading", { name: "수정된 동행 제목" })).toBeVisible();
});

test("작성자는 동행 게시글을 삭제하고 목록으로 돌아간다", async ({ page }) => {
  let deleteCalled = false;

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;

    if (path === "/api/v1/users/me") return route.fulfill(json({ userId: 1, nickname: "춘배", role: "USER" }));
    if (path === "/api/v1/community/posts/companions/77" && request.method() === "GET") return route.fulfill(json(post));
    if (path === "/api/v1/community/posts/companions/77" && request.method() === "DELETE") {
      deleteCalled = true;
      return route.fulfill(json("게시글이 삭제되었습니다."));
    }
    if (path.includes("/comments")) return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    if (path === "/api/v1/chat/rooms") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    if (path === "/api/v1/community/posts/companions" || path === "/api/v1/community/posts/free") {
      return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    }
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    return route.fulfill(json(null));
  });

  page.once("dialog", dialog => dialog.accept());
  await page.goto("/");
  await page.getByRole("button", { name: "삭제", exact: true }).click();

  await expect.poll(() => deleteCalled).toBe(true);
  await expect(page.getByText("같이 걸을 골목 친구를 찾아보세요.")).toBeVisible();
});
