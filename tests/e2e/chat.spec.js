import { expect, test } from "@playwright/test";

function json(data) {
  return {
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ code: "SUCCESS", message: "OK", data }),
  };
}

const rooms = [
  { chatRoomId: 1, roomName: "광장시장 동행", lastMsg: "내일 오전 10시 어때요?", unread: 2, updatedAt: "2026-06-20T09:00:00" },
  { chatRoomId: 2, roomName: "경복궁 탐방", lastMsg: "좋아요!", unread: 0, updatedAt: "2026-06-19T18:00:00" },
];

const messages = [
  { messageId: 1, senderId: 2, senderNickname: "여행자", content: "안녕하세요!", createdAt: "2026-06-20T09:00:00" },
  { messageId: 2, senderId: 1, senderNickname: "춘배", content: "반갑습니다", createdAt: "2026-06-20T09:01:00" },
];

function setupChatSession(page, screen = "chat", extra = {}) {
  return page.addInitScript(([s, e]) => {
    sessionStorage.setItem("userAccessToken", "e2e-token");
    sessionStorage.setItem("userProfile", JSON.stringify({ userId: 1, nickname: "춘배", role: "USER", language: "ko" }));
    sessionStorage.setItem("chunbae_navigation_state", JSON.stringify({
      chunbaeTour: true, appState: "main", screen: s, tab: "chat", ...e,
    }));
  }, [screen, extra]);
}

function routeChatApis(page) {
  return page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (path === "/api/v1/chat/rooms") return route.fulfill(json({ content: rooms, hasNext: false, size: 2 }));
    if (path.match(/\/api\/v1\/chat\/rooms\/\d+\/messages/)) return route.fulfill(json({ content: messages, hasNext: false, size: 2 }));
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    return route.fulfill(json(null));
  });
}

test("채팅방 목록이 렌더링된다", async ({ page }) => {
  await setupChatSession(page);
  await routeChatApis(page);
  await page.goto("/");

  await expect(page.getByText("광장시장 동행")).toBeVisible();
  await expect(page.getByText("경복궁 탐방")).toBeVisible();
});

test("마지막 메시지가 채팅방 목록에 표시된다", async ({ page }) => {
  await setupChatSession(page);
  await routeChatApis(page);
  await page.goto("/");

  await expect(page.getByText("내일 오전 10시 어때요?")).toBeVisible();
});

test("참여 중인 채팅방이 없으면 빈 상태가 표시된다", async ({ page }) => {
  await setupChatSession(page);
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/v1/chat/rooms") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    return route.fulfill(json(null));
  });
  await page.goto("/");

  await expect(page.getByText("참여 중인 채팅방이 없습니다.")).toBeVisible();
});

test("채팅방 입장 시 메시지가 표시된다", async ({ page }) => {
  await setupChatSession(page, "chatRoom", { selectedChatRoomId: 1, selectedChatRoomName: "광장시장 동행" });
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/v1/chat/rooms") return route.fulfill(json({ content: rooms, hasNext: false, size: 2 }));
    if (path.includes("/chat/rooms/1/messages")) return route.fulfill(json({ content: messages, hasNext: false, size: 2 }));
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    return route.fulfill(json(null));
  });
  await page.goto("/");

  await expect(page.getByText("안녕하세요!")).toBeVisible();
  await expect(page.getByText("반갑습니다")).toBeVisible();
});

test("메시지 전송 시 API가 호출된다", async ({ page }) => {
  let sent = false;

  await setupChatSession(page, "chatRoom", { selectedChatRoomId: 1, selectedChatRoomName: "광장시장 동행" });
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (path === "/api/v1/chat/rooms") return route.fulfill(json({ content: rooms, hasNext: false, size: 2 }));
    if (path.includes("/chat/rooms/1/messages") && req.method() === "GET") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    if (path.includes("/chat/rooms/1/messages") && req.method() === "POST") {
      sent = true;
      return route.fulfill(json({ messageId: 99, content: "테스트 메시지", createdAt: new Date().toISOString() }));
    }
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    return route.fulfill(json(null));
  });
  await page.goto("/");

  await page.getByPlaceholder(/메시지를 입력|메시지/).fill("테스트 메시지");
  await page.getByRole("button", { name: /전송|보내기/ }).click();

  await expect.poll(() => sent).toBe(true);
});
