/**
 * 춘배투어 사용자 이용 흐름 시연 스크립트
 * 실행: pnpm exec playwright test tests/demo/user-flow.demo.js --headed --project=chromium
 *
 * 녹화 전 체크:
 *  1. 화면 녹화 소프트웨어 준비 (OBS / Win+G)
 *  2. 브라우저 창 크기 375×812 (모바일 뷰)
 *  3. 위 명령어 실행 후 녹화 시작
 */

import { expect, test } from "@playwright/test";

// ── Mock 데이터 ────────────────────────────────────────────
const MOCK = {
  user: { userId: 1, nickname: "춘배", role: "USER", language: "ko" },
  place: {
    placeId: 3, name: "광장시장", category: "전통시장", address: "서울 종로구 창경궁로 88",
    description: "100년 넘는 역사의 서울 대표 전통시장", rating: 4.7, reviewCount: 238,
    lat: 37.5699, lng: 126.9993, imageUrl: null, isLiked: false,
  },
  festival: {
    festivalId: 1, name: "광장시장 빈대떡 축제", region: "서울 종로구",
    startDate: "2026-07-10", endDate: "2026-07-13", progressStatus: "UPCOMING",
  },
  companionPost: {
    postId: 7, type: "동행", title: "광장시장 같이 둘러봐요 🥟", content: "오후 2시에 만나서 빈대떡, 마약김밥 투어해요!",
    placeName: "광장시장", meetingDate: "2026-07-10", maxMembers: 4, currentMembers: 1,
    status: "ACTIVE", writer: { userId: 2, nickname: "여행자" }, createdAt: "2026-06-20T10:00:00",
  },
  chatRooms: [
    { chatRoomId: 1, roomName: "광장시장 같이 둘러봐요 🥟", lastMsg: "반갑습니다! 내일 뵐게요 😊", unread: 1, updatedAt: "2026-06-20T11:00:00" },
  ],
  chatMessages: [
    { messageId: 1, senderId: 2, senderNickname: "여행자", content: "안녕하세요! 신청했어요 😊", createdAt: "2026-06-20T10:30:00" },
    { messageId: 2, senderId: 1, senderNickname: "춘배", content: "환영합니다! 내일 오후 2시에 광장시장 1번 입구에서 만나요", createdAt: "2026-06-20T10:31:00" },
    { messageId: 3, senderId: 2, senderNickname: "여행자", content: "반갑습니다! 내일 뵐게요 😊", createdAt: "2026-06-20T10:32:00" },
  ],
};

function json(data) {
  return { status: 200, contentType: "application/json", body: JSON.stringify({ code: "SUCCESS", message: "OK", data }) };
}

function pause(ms = 1800) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── API Mock 라우터 ────────────────────────────────────────
async function setupMockRoutes(page) {
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;

    // 인증
    if (path === "/api/v1/auth/login" && req.method() === "POST") {
      return route.fulfill(json({
        accessToken: "demo-token",
        userId: 1, nickname: "춘배", role: "USER", language: "ko", email: "demo@chunbae.site",
      }));
    }
    if (path === "/api/v1/auth/logout") return route.fulfill(json(null));
    if (path === "/api/v1/users/me") return route.fulfill(json(MOCK.user));

    // 잔액
    if (path === "/api/v1/yeopjeon/balance") return route.fulfill(json({ balance: 12000 }));

    // 알림
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));

    // 장소
    if (path === "/api/v1/places" || path.startsWith("/api/v1/places?")) {
      return route.fulfill(json({ content: [MOCK.place], hasNext: false, size: 1 }));
    }
    if (path === "/api/v1/places/3") return route.fulfill(json(MOCK.place));
    if (path === "/api/v1/places/3/reviews") return route.fulfill(json({ content: [
      { reviewId: 1, nickname: "방문자", rating: 5, content: "빈대떡이 정말 바삭하고 맛있어요!", createdAt: "2026-06-15" },
    ], hasNext: false, size: 1 }));
    if (path === "/api/v1/places/3/shops") return route.fulfill(json({ content: [
      { shopId: 10, name: "원조 빈대떡집", category: "분식", rating: 4.8 },
    ], hasNext: false, size: 1 }));
    if (path.includes("/wishlist") || path.includes("/wishlists")) return route.fulfill(json({ isLiked: true }));

    // 축제
    if (path.startsWith("/api/v1/festivals")) return route.fulfill(json({ content: [MOCK.festival], hasNext: false, size: 1 }));

    // 커뮤니티
    if (path.startsWith("/api/v1/community/posts")) {
      if (req.method() === "POST") return route.fulfill(json({ postId: 7 }));
      if (path.includes("/companions/7/apply")) return route.fulfill(json({ status: "APPLIED" }));
      return route.fulfill(json({ content: [MOCK.companionPost], hasNext: false, size: 1 }));
    }
    if (path.startsWith("/api/v1/community") && path.includes("/comments")) {
      return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    }

    // 채팅
    if (path === "/api/v1/chat/rooms") return route.fulfill(json({ content: MOCK.chatRooms, hasNext: false, size: 1 }));
    if (path.includes("/chat/rooms/1/messages")) return route.fulfill(json({ content: MOCK.chatMessages, hasNext: false, size: 3 }));

    // QR 결제
    if (path.startsWith("/api/v1/qr")) return route.fulfill(json({ qrToken: "QR-DEMO-TOKEN-2026", expiresAt: "2026-06-20T12:00:00" }));
    if (path === "/api/v1/yeopjeon/qr") return route.fulfill(json({ qrToken: "QR-DEMO-2026", balance: 12000 }));

    // 기본
    return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
  });
}

// ── 메인 시연 ────────────────────────────────────────────────
test("춘배투어 사용자 이용 흐름 시연", async ({ page }) => {
  test.setTimeout(180_000); // 3분

  await page.setViewportSize({ width: 1280, height: 800 }); // 웹 뷰
  await setupMockRoutes(page);

  // ──────────────────────────────────────────────────────────
  // STEP 1: 홈 화면 — 앱 소개
  // ──────────────────────────────────────────────────────────
  await page.goto("/");
  await pause(2500);

  // ──────────────────────────────────────────────────────────
  // STEP 2: 로그인
  // ──────────────────────────────────────────────────────────
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await pause(1500);

  // 소셜 로그인 버튼 잠깐 보여주기
  await expect(page.getByText("Kakao로 시작하기")).toBeVisible();
  await pause(2000);

  // 이메일 로그인
  await page.getByPlaceholder("이메일").fill("demo@chunbae.site");
  await pause(800);
  await page.getByPlaceholder("비밀번호").fill("demo1234");
  await pause(800);
  await page.getByRole("button", { name: "로그인" }).click();
  await pause(2000);

  // ──────────────────────────────────────────────────────────
  // STEP 3: 지도·검색 탐색
  // ──────────────────────────────────────────────────────────
  await page.addInitScript(() => {});
  // 지도 탭으로 이동
  await page.getByRole("link", { name: /지도|map/i }).click().catch(() =>
    page.locator("[aria-label*='지도'], [href*='map'], nav button").nth(1).click()
  );
  await pause(2000);

  // 검색창 클릭
  const searchInput = page.getByPlaceholder(/지역명 입력|지역|검색/).first();
  if (await searchInput.isVisible()) {
    await searchInput.click();
    await pause(800);
    await searchInput.type("종로구", { delay: 120 });
    await pause(1200);
    await page.keyboard.press("Enter");
    await pause(2000);
  }

  // ──────────────────────────────────────────────────────────
  // STEP 4: 장소 상세 진입
  // ──────────────────────────────────────────────────────────
  // sessionStorage로 장소 상세 직접 이동
  await page.evaluate((place) => {
    const nav = JSON.parse(sessionStorage.getItem("chunbae_navigation_state") || "{}");
    nav.screen = "placeDetail";
    nav.selectedPlaceId = place.placeId;
    nav.selectedPlace = place;
    nav.tab = "map";
    sessionStorage.setItem("chunbae_navigation_state", JSON.stringify(nav));
  }, MOCK.place);
  await page.reload();
  await pause(2500);

  // 찜하기
  const likeBtn = page.getByRole("button", { name: /찜하기|찜|♡|♥/ }).first();
  if (await likeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await likeBtn.click();
    await pause(1500);
  }

  // 리뷰 탭
  const reviewTab = page.getByText("리뷰").first();
  if (await reviewTab.isVisible({ timeout: 2000 }).catch(() => false)) {
    await reviewTab.click();
    await pause(2000);
  }

  // ──────────────────────────────────────────────────────────
  // STEP 5: 커뮤니티 — 동행 게시글 목록
  // ──────────────────────────────────────────────────────────
  await page.evaluate(() => {
    const nav = JSON.parse(sessionStorage.getItem("chunbae_navigation_state") || "{}");
    nav.screen = "community";
    nav.tab = "community";
    sessionStorage.setItem("chunbae_navigation_state", JSON.stringify(nav));
  });
  await page.reload();
  await pause(2500);

  // 게시글 클릭
  const postLink = page.getByText("광장시장 같이 둘러봐요").first();
  if (await postLink.isVisible({ timeout: 3000 }).catch(() => false)) {
    await postLink.click();
    await pause(2500);

    // 참여 신청하기
    const applyBtn = page.getByRole("button", { name: "참여 신청하기" });
    if (await applyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await applyBtn.click();
      await pause(2000);
    }
  }

  // ──────────────────────────────────────────────────────────
  // STEP 6: 채팅방
  // ──────────────────────────────────────────────────────────
  await page.evaluate(() => {
    const nav = JSON.parse(sessionStorage.getItem("chunbae_navigation_state") || "{}");
    nav.screen = "chat";
    nav.tab = "chat";
    sessionStorage.setItem("chunbae_navigation_state", JSON.stringify(nav));
  });
  await page.reload();
  await pause(2000);

  // 채팅방 입장
  const roomLink = page.getByText("광장시장 같이 둘러봐요").first();
  if (await roomLink.isVisible({ timeout: 3000 }).catch(() => false)) {
    await roomLink.click();
    await pause(2500);

    // 메시지 입력
    const msgInput = page.getByPlaceholder(/메시지를 입력|메시지/).first();
    if (await msgInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await msgInput.type("내일 오후 2시에 뵐게요! 😊", { delay: 80 });
      await pause(1000);
      await page.getByRole("button", { name: /전송|보내기/ }).click();
      await pause(1500);
    }
  }

  // ──────────────────────────────────────────────────────────
  // STEP 7: QR 결제
  // ──────────────────────────────────────────────────────────
  await page.evaluate(() => {
    const nav = JSON.parse(sessionStorage.getItem("chunbae_navigation_state") || "{}");
    nav.screen = "qrpay";
    nav.tab = "my";
    sessionStorage.setItem("chunbae_navigation_state", JSON.stringify(nav));
  });
  await page.reload();
  await pause(3000);

  // ──────────────────────────────────────────────────────────
  // STEP 8: 마이페이지 — 잔액 확인
  // ──────────────────────────────────────────────────────────
  await page.evaluate(() => {
    const nav = JSON.parse(sessionStorage.getItem("chunbae_navigation_state") || "{}");
    nav.screen = "my";
    nav.tab = "my";
    sessionStorage.setItem("chunbae_navigation_state", JSON.stringify(nav));
  });
  await page.reload();
  await pause(3000);

  // 충전 버튼
  const chargeBtn = page.getByRole("button", { name: /충전|엽전 충전/ }).first();
  if (await chargeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await chargeBtn.click();
    await pause(2500);
    await page.goBack().catch(() => page.keyboard.press("Escape"));
    await pause(1000);
  }

  // ──────────────────────────────────────────────────────────
  // STEP 9: 축제 탐색
  // ──────────────────────────────────────────────────────────
  await page.evaluate(() => {
    const nav = JSON.parse(sessionStorage.getItem("chunbae_navigation_state") || "{}");
    nav.screen = "festival";
    nav.tab = "festival";
    sessionStorage.setItem("chunbae_navigation_state", JSON.stringify(nav));
  });
  await page.reload();
  await pause(2500);

  // ──────────────────────────────────────────────────────────
  // STEP 10: 홈 복귀 — 마무리
  // ──────────────────────────────────────────────────────────
  await page.evaluate(() => {
    const nav = JSON.parse(sessionStorage.getItem("chunbae_navigation_state") || "{}");
    nav.screen = "home";
    nav.tab = "home";
    sessionStorage.setItem("chunbae_navigation_state", JSON.stringify(nav));
  });
  await page.reload();
  await pause(3000);
});
