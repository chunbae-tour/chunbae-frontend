import { expect, test } from "@playwright/test";

const rooms = [
  {
    chatRoomId: 101,
    title: "또 들어올 수 있나 보자",
    currentMembers: 2,
    maxMembers: 4,
    status: "OPEN",
    lastMessage: { content: "마지막 메시지", senderNickname: "테스트", sentAt: "2026-06-15T12:00:00" },
    unreadCount: 1,
  },
  {
    chatRoomId: 102,
    title: "같이 동행하실 분 구해요",
    currentMembers: 1,
    maxMembers: 2,
    status: "OPEN",
    lastMessage: { content: "안녕하세요", senderNickname: "춘배", sentAt: "2026-06-15T11:00:00" },
    unreadCount: 0,
  },
];

function json(data) {
  return {
    status: 200,
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
      screen: "chat",
      tab: "chat",
      selectedRoom: null,
    }));
  });

  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;

    if (path === "/api/v1/users/me") {
      await route.fulfill(json({ userId: 1, nickname: "춘배", role: "USER", language: "ko" }));
      return;
    }
    if (path === "/api/v1/chat/rooms") {
      await route.fulfill(json({ content: rooms, nextCursor: null, hasNext: false, size: rooms.length }));
      return;
    }
    if (path === "/api/v1/chat/rooms/101") {
      await route.fulfill(json({ ...rooms[0], ownerId: 1, myMemberState: "OWNER_ACTIVE", members: [] }));
      return;
    }
    if (path.endsWith("/messages")) {
      await route.fulfill(json({ content: [], nextCursor: null, hasNext: false, size: 0 }));
      return;
    }
    if (path.endsWith("/members") || path.endsWith("/join-requests")) {
      await route.fulfill(json([]));
      return;
    }
    if (path === "/api/v1/notifications") {
      await route.fulfill(json({ content: [], nextCursor: null, hasNext: false, size: 0 }));
      return;
    }

    await route.fulfill(json(null));
  });
});

test("채팅방을 선택하면 목록을 유지한 채 오른쪽에 대화가 열린다", async ({ page }) => {
  await page.goto("/");

  const sidebar = page.locator(".chat-workspace-sidebar");
  const detail = page.locator(".chat-workspace-detail");

  await expect(sidebar.getByText(rooms[0].title, { exact: true })).toBeVisible();
  await expect(detail.getByText("채팅방을 선택해주세요")).toBeVisible();

  await sidebar.getByText(rooms[0].title, { exact: true }).click();

  await expect(sidebar.getByText(rooms[1].title, { exact: true })).toBeVisible();
  await expect(detail.getByText(rooms[0].title, { exact: true })).toBeVisible();
});
