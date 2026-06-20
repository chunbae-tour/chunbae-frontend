/**
 * 춘배투어 사용자 이용 흐름 시연 스크립트
 * 실행: pnpm demo
 *
 * 녹화 전 체크:
 *  1. 화면 녹화 소프트웨어 준비 (OBS / Win+G)
 *  2. pnpm demo 실행
 *  3. 브라우저 열리면 녹화 시작
 *
 * ※ mock 환경 — 실제 배포 서버 불필요
 */

import { expect, test } from "@playwright/test";

// ── 공통 유틸 ──────────────────────────────────────────────────
function json(data) {
  return { status: 200, contentType: "application/json", body: JSON.stringify({ code: "SUCCESS", message: "OK", data }) };
}
function pause(ms = 1800) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Mock 데이터 ────────────────────────────────────────────────
const PLACE = {
  placeId: 3, name: "광장시장", category: "전통시장",
  address: "서울 종로구 창경궁로 88",
  description: "100년 역사의 서울 대표 전통시장. 빈대떡·마약김밥·순대 등 다양한 먹거리가 가득해요.",
  rating: 4.7, reviewCount: 238, lat: 37.5699, lng: 126.9993, imageUrl: null, isLiked: false,
};

const COMPANION_POST = {
  postId: 7, type: "동행", title: "광장시장 같이 둘러봐요 🥟",
  content: "오후 2시에 만나서 빈대떡, 마약김밥 투어해요! 외국어 가능하신 분 환영 😊",
  placeName: "광장시장", meetingDate: "2026-07-10", maxMembers: 4, currentMembers: 1,
  status: "ACTIVE", writer: { userId: 2, nickname: "여행자" }, createdAt: "2026-06-20T10:00:00",
};

const CHAT_ROOMS = [
  { chatRoomId: 1, roomName: "광장시장 같이 둘러봐요 🥟", lastMsg: "내일 2시에 뵐게요 😊", unread: 1, updatedAt: "2026-06-20T11:00:00" },
];

const CHAT_MESSAGES = [
  { messageId: 1, senderId: 2, senderNickname: "여행자", content: "안녕하세요! 동행 신청했어요 😊", createdAt: "2026-06-20T10:30:00" },
  { messageId: 2, senderId: 1, senderNickname: "춘배", content: "환영합니다! 내일 오후 2시 광장시장 1번 입구에서 만나요 🙌", createdAt: "2026-06-20T10:31:00" },
  { messageId: 3, senderId: 2, senderNickname: "여행자", content: "네! 내일 뵐게요 😊", createdAt: "2026-06-20T10:32:00" },
];

// ── API Mock 라우터 ────────────────────────────────────────────
async function setupMockRoutes(page) {
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;

    // 인증
    if (path === "/api/v1/users/auth/login" && req.method() === "POST")
      return route.fulfill(json({ accessToken: "demo-token", userId: 1, nickname: "춘배", role: "USER", language: "ko", email: "demo@chunbae.site" }));
    if (["/api/v1/merchants/auth/login", "/api/v1/admin/auth/login"].includes(path) && req.method() === "POST")
      return route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ code: "UNAUTHORIZED", message: "인증 실패" }) });
    if (path.includes("/auth/logout")) return route.fulfill(json(null));

    // 유저
    if (path === "/api/v1/users/me") return route.fulfill(json({ userId: 1, nickname: "춘배", role: "USER", language: "ko" }));

    // 잔액
    if (path === "/api/v1/yeopjeon/balance") return route.fulfill(json({ balance: 12000 }));

    // 알림
    if (path === "/api/v1/notifications") return route.fulfill(json({ content: [], hasNext: false, size: 0 }));

    // 장소
    if (path === "/api/v1/places/3") return route.fulfill(json(PLACE));
    if (path.startsWith("/api/v1/places/3/reviews")) return route.fulfill(json({ content: [
      { reviewId: 1, nickname: "방문자", rating: 5, content: "빈대떡이 정말 바삭하고 맛있어요!", createdAt: "2026-06-15" },
      { reviewId: 2, nickname: "여행러버", rating: 4, content: "마약김밥 중독성 있어요 또 오고 싶어요", createdAt: "2026-06-18" },
    ], hasNext: false, size: 2 }));
    if (path.startsWith("/api/v1/places/3/shops")) return route.fulfill(json({ content: [
      { shopId: 10, name: "원조 빈대떡집", category: "분식", rating: 4.8 },
      { shopId: 11, name: "마약김밥 본점", category: "분식", rating: 4.9 },
    ], hasNext: false, size: 2 }));
    if (path.startsWith("/api/v1/places")) return route.fulfill(json({ content: [PLACE], hasNext: false, size: 1 }));
    if (path.includes("/wishlist") || path.includes("/wishlists")) return route.fulfill(json({ isLiked: true }));

    // 축제
    if (path.startsWith("/api/v1/festivals/1")) return route.fulfill(json({ festivalId: 1, name: "광장시장 빈대떡 축제", region: "서울 종로구", startDate: "2026-07-10", endDate: "2026-07-13", progressStatus: "UPCOMING" }));
    if (path.startsWith("/api/v1/festivals")) return route.fulfill(json({ content: [
      { festivalId: 1, name: "광장시장 빈대떡 축제", region: "서울 종로구", startDate: "2026-07-10", endDate: "2026-07-13", progressStatus: "UPCOMING" },
      { festivalId: 2, name: "인사동 문화축제", region: "서울 종로구", startDate: "2026-06-15", endDate: "2026-06-25", progressStatus: "IN_PROGRESS" },
    ], hasNext: false, size: 2 }));

    // 커뮤니티
    if (path.startsWith("/api/v1/community/posts/companions/7/apply") && req.method() === "POST")
      return route.fulfill(json({ status: "APPLIED" }));
    if (path.startsWith("/api/v1/community/posts/companions/7"))
      return route.fulfill(json(COMPANION_POST));
    if (path.startsWith("/api/v1/community/posts/companions"))
      return route.fulfill(json({ content: [COMPANION_POST], hasNext: false, size: 1 }));
    if (path.includes("/comments")) return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    if (path.startsWith("/api/v1/community/posts")) {
      if (req.method() === "POST") return route.fulfill(json({ postId: 99 }));
      return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    }

    // 채팅
    if (path === "/api/v1/chat/rooms") return route.fulfill(json({ content: CHAT_ROOMS, hasNext: false, size: 1 }));
    if (path.includes("/chat/rooms/") && path.includes("/messages") && req.method() === "GET")
      return route.fulfill(json({ content: CHAT_MESSAGES, hasNext: false, size: 3 }));
    if (path.includes("/chat/rooms/") && path.includes("/messages") && req.method() === "POST")
      return route.fulfill(json({ messageId: 99, content: "내일 오후 2시에 뵐게요! 😊", createdAt: new Date().toISOString() }));

    // QR / 결제
    if (path === "/api/v1/yeopjeon/qr" || path.includes("/qr")) return route.fulfill(json({ qrToken: "QR-CHUNBAE-2026", balance: 12000, expiresAt: "2026-06-20T13:00:00" }));
    if (path.startsWith("/api/v1/payments")) return route.fulfill(json({ content: [], hasNext: false, size: 0 }));

    // 기본
    return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
  });
}

// ── 화면 전환 헬퍼 ────────────────────────────────────────────
async function goToScreen(page, screen, tab, extra = {}) {
  await page.evaluate(([s, t, e]) => {
    const existing = JSON.parse(sessionStorage.getItem("chunbae_navigation_state") || "{}");
    sessionStorage.setItem("chunbae_navigation_state", JSON.stringify({ ...existing, screen: s, tab: t, ...e }));
  }, [screen, tab, extra]);
  await page.reload();
  await pause(2200);
}

// ── 시연 메인 ─────────────────────────────────────────────────
test("춘배투어 사용자 이용 흐름 시연", async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await setupMockRoutes(page);

  // ────────────────────────────────────────────────────────────
  // STEP 1 · 홈 화면 감상
  // ────────────────────────────────────────────────────────────
  await page.goto("/");
  await pause(3000);

  // ────────────────────────────────────────────────────────────
  // STEP 2 · 로그인 (소셜 버튼 → 이메일 로그인)
  // ────────────────────────────────────────────────────────────
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await pause(2000);

  // 소셜 버튼 잠깐 보여주기
  await expect(page.getByText("Kakao로 시작하기")).toBeVisible();
  await pause(2500);

  // 이메일 로그인
  await page.getByPlaceholder("이메일").fill("demo@chunbae.site");
  await pause(600);
  await page.getByPlaceholder("비밀번호").fill("demo1234");
  await pause(600);
  await page.getByRole("button", { name: "로그인" }).click();
  await pause(3000);

  // ────────────────────────────────────────────────────────────
  // STEP 3 · 지도·검색 탐색
  // ────────────────────────────────────────────────────────────
  await goToScreen(page, "map", "map");

  // 검색창 입력
  const searchInput = page.getByPlaceholder(/지역명 입력|지역|검색/).first();
  if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await searchInput.click();
    await pause(500);
    await searchInput.type("종로구", { delay: 130 });
    await pause(1500);
    await page.keyboard.press("Enter");
    await pause(2500);
  }

  // ────────────────────────────────────────────────────────────
  // STEP 4 · 광장시장 상세 (찜하기 + 리뷰)
  // ────────────────────────────────────────────────────────────
  await goToScreen(page, "placeDetail", "map", { selectedPlaceId: 3, selectedPlace: PLACE });

  // 찜하기
  const likeBtn = page.getByRole("button", { name: /찜하기|찜|♡|♥/ }).first();
  if (await likeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await likeBtn.click();
    await pause(1500);
  }

  // 리뷰 탭 클릭
  const reviewTab = page.getByText("리뷰").first();
  if (await reviewTab.isVisible({ timeout: 2000 }).catch(() => false)) {
    await reviewTab.click();
    await pause(2500);
  }

  // ────────────────────────────────────────────────────────────
  // STEP 5 · 커뮤니티 동행 게시글 목록
  // ────────────────────────────────────────────────────────────
  await goToScreen(page, "community", "community");

  // 게시글 제목 보이는지 확인 후 클릭
  const postItem = page.getByText("광장시장 같이 둘러봐요").first();
  if (await postItem.isVisible({ timeout: 3000 }).catch(() => false)) {
    await pause(1500);
    await postItem.click();
    await pause(2500);
  }

  // ────────────────────────────────────────────────────────────
  // STEP 6 · 동행 게시글 상세 · 참여 신청
  // ────────────────────────────────────────────────────────────
  const navPost = { ...COMPANION_POST, id: 7, place: "광장시장", author: "여행자", writerId: 2, date: "2026-07-10", max: 4, current: 1 };
  await goToScreen(page, "communityPost", "community", { selectedPost: navPost });

  await expect(page.getByText("광장시장 같이 둘러봐요").first()).toBeVisible({ timeout: 5000 }).catch(() => {});
  await pause(2000);

  const applyBtn = page.getByRole("button", { name: "참여 신청하기" });
  if (await applyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await applyBtn.click();
    await pause(2500);
  }

  // ────────────────────────────────────────────────────────────
  // STEP 7 · 채팅방 목록 → 채팅방 입장 → 메시지 전송
  // ────────────────────────────────────────────────────────────
  await goToScreen(page, "chat", "chat");

  const roomItem = page.getByText("광장시장 같이 둘러봐요").first();
  if (await roomItem.isVisible({ timeout: 3000 }).catch(() => false)) {
    await pause(1500);
    await roomItem.click();
    await pause(2500);

    const msgInput = page.getByPlaceholder(/메시지를 입력|메시지/).first();
    if (await msgInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await msgInput.type("내일 오후 2시에 뵐게요! 😊", { delay: 80 });
      await pause(1000);
      const sendBtn = page.getByRole("button", { name: /전송|보내기/ });
      if (await sendBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await sendBtn.click();
      } else {
        await page.keyboard.press("Enter");
      }
      await pause(2000);
    }
  }

  // ────────────────────────────────────────────────────────────
  // STEP 8 · 엽전 QR 결제 화면
  // ────────────────────────────────────────────────────────────
  await goToScreen(page, "qrpay", "my");
  await pause(3000);

  // ────────────────────────────────────────────────────────────
  // STEP 9 · 마이페이지 (잔액 확인 + 충전)
  // ────────────────────────────────────────────────────────────
  await goToScreen(page, "my", "my");

  const chargeBtn = page.getByRole("button", { name: /충전|엽전 충전/ }).first();
  if (await chargeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await pause(1000);
    await chargeBtn.click();
    await pause(2500);
    await page.keyboard.press("Escape");
    await pause(1000);
  }

  // ────────────────────────────────────────────────────────────
  // STEP 10 · 축제 탐색
  // ────────────────────────────────────────────────────────────
  await goToScreen(page, "festival", "festival");
  await pause(3000);

  // ────────────────────────────────────────────────────────────
  // STEP 11 · 홈 복귀 (마무리)
  // ────────────────────────────────────────────────────────────
  await goToScreen(page, "home", "home");
  await pause(4000);
});
