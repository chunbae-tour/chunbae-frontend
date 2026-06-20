/**
 * 춘배투어 사용자 이용 흐름 시연 스크립트 (두 탭 동시 시연)
 *
 * 실행: pnpm demo
 * 녹화: OBS 또는 Win+G → pnpm demo 실행 → 브라우저 열리면 녹화 시작
 *
 * 왼쪽 탭 = 춘배 (글 작성자, 한국인)
 * 오른쪽 탭 = Alex (동행 참여자, 외국인)
 */

import { expect, test } from "@playwright/test";

// ── 유틸 ──────────────────────────────────────────────────────
function json(data) {
  return { status: 200, contentType: "application/json", body: JSON.stringify({ code: "SUCCESS", message: "OK", data }) };
}
function pause(ms = 1600) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── 사용자 데이터 ─────────────────────────────────────────────
const CHUNBAE = { userId: 1, nickname: "춘배", role: "USER", language: "ko", email: "chunbae@demo.site" };
const ALEX    = { userId: 2, nickname: "Alex", role: "USER", language: "en", email: "alex@demo.site" };

// ── 장소 / 게시글 / 채팅 Mock 데이터 ─────────────────────────
const GYEONGBOK = {
  placeId: 5, name: "경복궁", category: "관광지",
  address: "서울 종로구 사직로 161",
  description: "조선 왕조의 법궁. 근정전, 경회루 등 유서 깊은 문화재가 가득한 서울 대표 관광지입니다.",
  rating: 4.9, reviewCount: 1420, lat: 37.5796, lng: 126.9770, imageUrl: null, isLiked: false,
};

const CREATED_POST = {
  postId: 42, type: "동행",
  title: "경복궁 같이 갈 사람을 모집합니다 🏯",
  content: "혼자 여행하는 것보다 함께하면 더 재밌을 것 같아요! 경복궁 구석구석을 같이 탐험하실 분을 모집합니다. 외국어 가능하신 분도 환영해요 😊",
  placeName: "경복궁", placeId: 5,
  meetingDate: "2026-07-15", maxMembers: 6, currentMembers: 1,
  status: "ACTIVE",
  writer: { userId: CHUNBAE.userId, nickname: CHUNBAE.nickname },
  createdAt: "2026-06-20T10:00:00",
};

const CHAT_ROOM = { chatRoomId: 10, roomName: "경복궁 같이 갈 사람을 모집합니다 🏯", lastMsg: "채팅방이 열렸습니다.", unread: 0, updatedAt: "2026-06-20T10:10:00" };

// 채팅 메시지 (춘배 = ko, Alex = en, 둘 다 번역 ON)
const BASE_MESSAGES = [
  { messageId: 1, senderId: 2, senderNickname: "Alex",  content: "Hi! I applied for the companion trip. Nice to meet you! 😊", originalContent: "Hi! I applied for the companion trip. Nice to meet you! 😊", translatedContent: "안녕하세요! 동행 신청했어요. 반갑습니다! 😊", language: "en", createdAt: "2026-06-20T10:15:00" },
  { messageId: 2, senderId: 1, senderNickname: "춘배", content: "안녕하세요 Alex! 신청해주셔서 감사해요 😊", originalContent: "안녕하세요 Alex! 신청해주셔서 감사해요 😊", translatedContent: "Hello Alex! Thank you for applying! 😊", language: "ko", createdAt: "2026-06-20T10:16:00" },
  { messageId: 3, senderId: 2, senderNickname: "Alex",  content: "What time shall we meet at Gyeongbokgung?", originalContent: "What time shall we meet at Gyeongbokgung?", translatedContent: "경복궁에서 몇 시에 만날까요?", language: "en", createdAt: "2026-06-20T10:17:00" },
  { messageId: 4, senderId: 1, senderNickname: "춘배", content: "오전 10시 정문 앞이 어때요? 인증 사진도 찍고 같이 둘러봐요!", originalContent: "오전 10시 정문 앞이 어때요? 인증 사진도 찍고 같이 둘러봐요!", translatedContent: "How about 10 AM in front of the main gate? Let's take photos and explore together!", language: "ko", createdAt: "2026-06-20T10:18:00" },
  { messageId: 5, senderId: 2, senderNickname: "Alex",  content: "Perfect! 10 AM it is. See you there! 🎉", originalContent: "Perfect! 10 AM it is. See you there! 🎉", translatedContent: "완벽해요! 오전 10시에 봬요! 🎉", language: "en", createdAt: "2026-06-20T10:19:00" },
];

// ── API Mock 라우터 ────────────────────────────────────────────
function buildRoutes(page, userInfo, extraRoutes = {}) {
  return page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    const key = `${req.method()} ${path}`;

    if (extraRoutes[key]) return route.fulfill(extraRoutes[key]);

    // 인증
    if (path === "/api/v1/users/auth/login" && req.method() === "POST")
      return route.fulfill(json({ accessToken: `token-${userInfo.nickname}`, ...userInfo }));
    if (["/api/v1/merchants/auth/login", "/api/v1/admin/auth/login"].includes(path) && req.method() === "POST")
      return route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ code: "UNAUTHORIZED", message: "인증 실패" }) });
    if (path.includes("/auth/logout")) return route.fulfill(json(null));

    // 유저
    if (path === "/api/v1/users/me") return route.fulfill(json(userInfo));
    if (path === "/api/v1/yeopjeon/balance") return route.fulfill(json({ balance: 12000 }));
    if (path === "/api/v1/notifications") {
      // 춘배에게만 알림 (Alex 신청)
      const notifs = userInfo.userId === 1 ? [
        { id: 1, type: "COMPANION_APPLY", title: "새 동행 신청이 왔어요!", body: "Alex님이 경복궁 동행에 신청했습니다.", read: false, createdAt: "2026-06-20T10:12:00" },
      ] : [];
      return route.fulfill(json({ content: notifs, hasNext: false, size: notifs.length }));
    }

    // 장소
    if (path === "/api/v1/places/5") return route.fulfill(json({ ...GYEONGBOK, isLiked: userInfo.userId === 1 }));
    if (path.startsWith("/api/v1/places/5/reviews")) return route.fulfill(json({ content: [
      { reviewId: 1, nickname: "관광객A", rating: 5, content: "정말 아름다운 곳이에요! 꼭 가보세요.", createdAt: "2026-06-10" },
      { reviewId: 2, nickname: "여행러버", rating: 5, content: "경회루가 특히 멋있었어요. 일몰 무렵에 가보세요!", createdAt: "2026-06-15" },
    ], hasNext: false, size: 2 }));
    if (path.startsWith("/api/v1/places/5/shops")) return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    if (path.startsWith("/api/v1/places")) return route.fulfill(json({ content: [GYEONGBOK], hasNext: false, size: 1 }));
    if (path.includes("/wishlist") || path === "/api/v1/wishlists") return route.fulfill(json({ isLiked: true }));
    if (path === "/api/v1/users/me/wishlists") return route.fulfill(json({ content: [
      { id: 1, targetType: "PLACE", placeId: 5, placeName: "경복궁", imageUrl: null },
    ], hasNext: false, size: 1 }));

    // 커뮤니티
    if (path.startsWith("/api/v1/community/posts/companions/42/apply") && req.method() === "POST")
      return route.fulfill(json({ status: "APPLIED", companionId: 42, applicantId: userInfo.userId }));
    if (path.startsWith("/api/v1/community/posts/companions/42/accept") && req.method() === "POST")
      return route.fulfill(json({ status: "ACCEPTED" }));
    if (path.startsWith("/api/v1/community/posts/companions/42"))
      return route.fulfill(json({ ...CREATED_POST, currentMembers: userInfo.userId === 2 ? 2 : 1 }));
    if (path.startsWith("/api/v1/community/posts/companions"))
      return route.fulfill(json({ content: [CREATED_POST], hasNext: false, size: 1 }));
    if (path.startsWith("/api/v1/community/posts") && req.method() === "POST")
      return route.fulfill(json({ postId: 42 }));
    if (path.includes("/comments")) return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    if (path.startsWith("/api/v1/community")) return route.fulfill(json({ content: [CREATED_POST], hasNext: false, size: 1 }));

    // 채팅방
    if (path === "/api/v1/chat/rooms") return route.fulfill(json({ content: [CHAT_ROOM], hasNext: false, size: 1 }));
    if (path.includes("/chat/rooms/10/messages") && req.method() === "GET")
      return route.fulfill(json({ content: BASE_MESSAGES, hasNext: false, size: BASE_MESSAGES.length }));
    if (path.includes("/chat/rooms") && path.includes("/messages") && req.method() === "POST")
      return route.fulfill(json({ messageId: Date.now(), content: req.postDataJSON()?.content, createdAt: new Date().toISOString() }));

    // 동행
    if (path.includes("/companion") && req.method() === "POST") return route.fulfill(json({ companionId: 1, status: "ACTIVE" }));
    if (path.includes("/companion") && req.method() === "PATCH") return route.fulfill(json({ status: "ENDED" }));

    // 결제
    if (path === "/api/v1/yeopjeon/qr") return route.fulfill(json({ qrToken: "QR-GYEONGBOK-2026", balance: 12000 }));
    if (path.startsWith("/api/v1/payments/charge")) return route.fulfill(json({ balance: 22000 }));
    if (path.startsWith("/api/v1/payments")) return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
    if (path.startsWith("/api/v1/yeopjeon")) return route.fulfill(json({ content: [], hasNext: false, size: 0 }));

    // 리뷰
    if (path.includes("/reviews") && req.method() === "POST") return route.fulfill(json({ reviewId: 99 }));

    // 축제
    if (path.startsWith("/api/v1/festivals")) return route.fulfill(json({ content: [], hasNext: false, size: 0 }));

    return route.fulfill(json({ content: [], hasNext: false, size: 0 }));
  });
}

// ── 세션 주입 ─────────────────────────────────────────────────
function injectSession(page, userInfo, screen = "home", tab = "home", extra = {}) {
  return page.addInitScript(([u, s, t, e]) => {
    sessionStorage.setItem(`userAccessToken`, u.accessToken ?? `token-${u.nickname}`);
    sessionStorage.setItem("userProfile", JSON.stringify(u));
    sessionStorage.setItem("chunbae_navigation_state", JSON.stringify({
      chunbaeTour: true, appState: "main", screen: s, tab: t, ...e,
    }));
  }, [userInfo, screen, tab, extra]);
}

// ── 화면 전환 ─────────────────────────────────────────────────
async function go(page, screen, tab, extra = {}) {
  await page.evaluate(([s, t, e]) => {
    const cur = JSON.parse(sessionStorage.getItem("chunbae_navigation_state") || "{}");
    sessionStorage.setItem("chunbae_navigation_state", JSON.stringify({ ...cur, chunbaeTour: true, appState: "main", screen: s, tab: t, ...e }));
  }, [screen, tab, extra]);
  await page.reload();
  await pause(2000);
}

// ── 창 크기 나란히 배치 ───────────────────────────────────────
async function positionWindow(page, left) {
  try {
    const cdp = await page.context().newCDPSession(page);
    const { windowId } = await cdp.send("Browser.getWindowForTarget");
    await cdp.send("Browser.setWindowBounds", {
      windowId,
      bounds: { left, top: 40, width: 410, height: 900 },
    });
  } catch { /* CDP 미지원 환경 무시 */ }
}

// ══════════════════════════════════════════════════════════════
// 시연 메인
// ══════════════════════════════════════════════════════════════
test("춘배투어 사용자 이용 흐름 시연", async ({ browser }) => {
  test.setTimeout(360_000);

  // ── 두 컨텍스트 생성 (모바일 뷰 + 위치정보 권한 사전 허용) ──
  const geoOptions = {
    viewport: { width: 390, height: 844 },
    geolocation: { latitude: 37.5796, longitude: 126.9770 }, // 경복궁
    permissions: ["geolocation"],
    locale: "ko-KR",
  };
  const ctxA = await browser.newContext(geoOptions);
  const ctxB = await browser.newContext({ ...geoOptions, locale: "en-US" });
  const pageA = await ctxA.newPage(); // 춘배 (한국인, 글 작성자)
  const pageB = await ctxB.newPage(); // Alex  (외국인, 동행 참여자)

  await buildRoutes(pageA, { ...CHUNBAE, accessToken: "token-chunbae" });
  await buildRoutes(pageB, { ...ALEX,    accessToken: "token-alex" });

  // ────────────────────────────────────────────────────────────
  // 1 · 양쪽 창 나란히 배치 & 홈 화면
  // ────────────────────────────────────────────────────────────
  await pageA.goto("/");
  await pageB.goto("/");
  await positionWindow(pageA, 0);
  await positionWindow(pageB, 420);
  await pause(2500);

  // ────────────────────────────────────────────────────────────
  // 2 · 춘배 로그인 (pageA)
  // ────────────────────────────────────────────────────────────
  await pageA.bringToFront();
  await pageA.getByRole("button", { name: "로그인", exact: true }).click();
  await pause(1000);
  await pageA.getByPlaceholder("이메일").fill("chunbae@demo.site");
  await pageA.getByPlaceholder("비밀번호").fill("demo1234");
  await pageA.getByRole("button", { name: "로그인" }).click();
  await pause(2500);

  // ────────────────────────────────────────────────────────────
  // 3 · 지도 탭 이동 → 경복궁 주변 탐색
  // ────────────────────────────────────────────────────────────
  await go(pageA, "map", "map");

  // 검색창 지역 입력
  const searchInput = pageA.getByPlaceholder(/지역명 입력|지역|검색/).first();
  if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await searchInput.click();
    await searchInput.type("경복궁", { delay: 120 });
    await pause(1000);
    await pageA.keyboard.press("Enter");
    await pause(2500);
  }

  // 장소 카드 클릭 (경복궁)
  const placeCard = pageA.getByText("경복궁").first();
  if (await placeCard.isVisible({ timeout: 3000 }).catch(() => false)) {
    await placeCard.click();
    await pause(2000);
  }

  // ────────────────────────────────────────────────────────────
  // 4 · 경복궁 상세 → 찜하기
  // ────────────────────────────────────────────────────────────
  await go(pageA, "placeDetail", "map", { selectedPlaceId: 5, selectedPlace: GYEONGBOK });

  await pause(1500);
  const likeBtn = pageA.getByRole("button", { name: /찜하기|♡|♥/ }).first();
  if (await likeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await likeBtn.click();
    await pause(2000);
  }

  // ────────────────────────────────────────────────────────────
  // 5 · "이 장소 동행 모집" → 글 작성 화면
  // ────────────────────────────────────────────────────────────
  const companionWriteBtn = pageA.getByText(/동행 모집글 작성하기|동행 모집/).first();
  if (await companionWriteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await companionWriteBtn.click();
    await pause(2000);
  } else {
    await go(pageA, "communityWrite", "community", { writeTab: "동행", prefillPlaceId: 5, prefillPlaceName: "경복궁" });
  }

  // 제목 입력
  const titleInput = pageA.getByPlaceholder("제목을 입력하세요");
  if (await titleInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await titleInput.fill("경복궁 같이 갈 사람을 모집합니다 🏯");
    await pause(800);
  }

  // 내용 입력
  const contentInput = pageA.getByPlaceholder(/내용을 입력|내용/).first();
  if (await contentInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await contentInput.fill("혼자 여행하는 것보다 함께하면 더 재밌을 것 같아요! 경복궁 구석구석을 같이 탐험하실 분을 모집합니다. 외국어 가능하신 분도 환영해요 😊");
    await pause(800);
  }

  // 만나는 곳: 찜한 관광지(경복궁) 선택
  const meetBtn = pageA.getByText(/만나는 곳|찜한 관광지/).first();
  if (await meetBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await meetBtn.click();
    await pause(1500);
    const gyeongbokOption = pageA.getByText("경복궁").first();
    if (await gyeongbokOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await gyeongbokOption.click();
      await pause(1200);
    }
  }

  // 날짜 선택 (캘린더)
  const dateBtn = pageA.getByText(/날짜를 선택|날짜/).first();
  if (await dateBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await dateBtn.click();
    await pause(1500);
    // 7월 15일 선택
    const dateCell = pageA.getByText("15").first();
    if (await dateCell.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dateCell.click();
      await pause(1000);
    }
    const confirmBtn = pageA.getByRole("button", { name: /확인|선택|완료/ }).first();
    if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmBtn.click();
      await pause(1000);
    }
  }

  // 최대 인원 → 6명
  const maxMemberBtn = pageA.getByText(/최대 인원|인원/).first();
  if (await maxMemberBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await maxMemberBtn.click();
    await pause(1200);
    const sixOption = pageA.getByText("6").first();
    if (await sixOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sixOption.click();
      await pause(1000);
    }
  }
  await pause(1500);

  // ────────────────────────────────────────────────────────────
  // 6 · 게시글 등록
  // ────────────────────────────────────────────────────────────
  const submitBtn = pageA.getByRole("button", { name: /등록|작성 완료|완료/ }).first();
  if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await submitBtn.click();
    await pause(2500);
  }

  // 채팅방 생성하기
  const chatCreateBtn = pageA.getByRole("button", { name: /채팅방 생성|채팅방 만들기/ }).first();
  if (await chatCreateBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await chatCreateBtn.click();
    await pause(2000);
  }

  // 작성된 게시글 화면으로 이동 (fallback)
  await go(pageA, "communityPost", "community", {
    selectedPost: { ...CREATED_POST, id: 42, place: "경복궁", author: CHUNBAE.nickname, writerId: CHUNBAE.userId, date: "2026-07-15", max: 6, current: 1 },
  });
  await pause(2000);

  // ────────────────────────────────────────────────────────────
  // 7 · Alex 로그인 (pageB) — 오른쪽 탭
  // ────────────────────────────────────────────────────────────
  await pageB.bringToFront();
  await pageB.getByRole("button", { name: "로그인", exact: true }).click();
  await pause(1000);
  await pageB.getByPlaceholder("이메일").fill("alex@demo.site");
  await pageB.getByPlaceholder("비밀번호").fill("demo1234");
  await pageB.getByRole("button", { name: "로그인" }).click();
  await pause(2500);

  // Alex도 경복궁 → 게시글
  await go(pageB, "placeDetail", "map", { selectedPlaceId: 5, selectedPlace: GYEONGBOK });
  await pause(1500);

  const companionCard = pageB.getByText("경복궁 같이 갈 사람을 모집합니다").first();
  if (await companionCard.isVisible({ timeout: 3000 }).catch(() => false)) {
    await companionCard.click();
    await pause(2000);
  } else {
    await go(pageB, "communityPost", "community", {
      selectedPost: { ...CREATED_POST, id: 42, place: "경복궁", author: CHUNBAE.nickname, writerId: CHUNBAE.userId, date: "2026-07-15", max: 6, current: 1 },
    });
  }

  // 참여 신청하기
  const applyBtn = pageB.getByRole("button", { name: "참여 신청하기" });
  if (await applyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await applyBtn.click();
    await pause(2500);
  }

  // ────────────────────────────────────────────────────────────
  // 8 · 춘배 알림 확인 → 참여 수락 (pageA)
  // ────────────────────────────────────────────────────────────
  await pageA.bringToFront();
  await go(pageA, "notif", "my");

  await expect(pageA.getByText("새 동행 신청이 왔어요!")).toBeVisible({ timeout: 5000 }).catch(() => {});
  await pause(1500);

  const notifItem = pageA.getByText("새 동행 신청이 왔어요!").first();
  if (await notifItem.isVisible({ timeout: 2000 }).catch(() => false)) {
    await notifItem.click();
    await pause(2000);
  }

  const acceptBtn = pageA.getByRole("button", { name: /수락|허락|승인/ }).first();
  if (await acceptBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await acceptBtn.click();
    await pause(2000);
  }

  // ────────────────────────────────────────────────────────────
  // 9 · 채팅 — 춘배(한국어) ↔ Alex(영어) 번역 ON
  // ────────────────────────────────────────────────────────────

  // 춘배 채팅방 입장
  await go(pageA, "chatRoom", "chat", { selectedChatRoomId: 10, selectedChatRoomName: "경복궁 같이 갈 사람을 모집합니다 🏯" });
  // Alex 채팅방 입장
  await pageB.bringToFront();
  await go(pageB, "chatRoom", "chat", { selectedChatRoomId: 10, selectedChatRoomName: "경복궁 같이 갈 사람을 모집합니다 🏯" });

  // Alex 메시지 (영어)
  const alexInput = pageB.getByPlaceholder(/메시지를 입력|메시지/).first();
  if (await alexInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await alexInput.type("Hi! I applied for the companion trip. Nice to meet you! 😊", { delay: 60 });
    await pause(800);
    const alexSend = pageB.getByRole("button", { name: /전송|보내기/ }).first();
    if (await alexSend.isVisible({ timeout: 1000 }).catch(() => false)) await alexSend.click();
    else await pageB.keyboard.press("Enter");
    await pause(1500);
  }

  // 춘배 채팅방 확인 → 한국어 답장
  await pageA.bringToFront();
  await pause(1500);
  const chunbaeInput = pageA.getByPlaceholder(/메시지를 입력|메시지/).first();
  if (await chunbaeInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await chunbaeInput.type("안녕하세요 Alex! 신청해주셔서 감사해요 😊 오전 10시 정문 앞에서 만나요!", { delay: 60 });
    await pause(800);
    const chunbaeSend = pageA.getByRole("button", { name: /전송|보내기/ }).first();
    if (await chunbaeSend.isVisible({ timeout: 1000 }).catch(() => false)) await chunbaeSend.click();
    else await pageA.keyboard.press("Enter");
    await pause(1500);
  }

  // Alex 확인 후 답장
  await pageB.bringToFront();
  await pause(1500);
  if (await alexInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await alexInput.type("Perfect! 10 AM it is. See you there! 🎉", { delay: 60 });
    await pause(800);
    const alexSend2 = pageB.getByRole("button", { name: /전송|보내기/ }).first();
    if (await alexSend2.isVisible({ timeout: 1000 }).catch(() => false)) await alexSend2.click();
    else await pageB.keyboard.press("Enter");
    await pause(2000);
  }

  // ────────────────────────────────────────────────────────────
  // 10 · 춘배 — 동행 생성 → 종료 → 리뷰
  // ────────────────────────────────────────────────────────────
  await pageA.bringToFront();

  const createCompanionBtn = pageA.getByRole("button", { name: /동행 생성|동행 시작/ }).first();
  if (await createCompanionBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await createCompanionBtn.click();
    await pause(2000);
  }

  // 동행 종료
  const endBtn = pageA.getByRole("button", { name: /동행 종료|여행 종료|종료/ }).first();
  if (await endBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await endBtn.click();
    await pause(2000);
  }

  // 리뷰 작성
  const reviewInput = pageA.getByPlaceholder(/리뷰|후기|내용/).first();
  if (await reviewInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await reviewInput.type("Alex와 함께한 경복궁 여행 정말 즐거웠어요! 또 같이 여행하고 싶네요 😊", { delay: 60 });
    await pause(1000);
    const submitReview = pageA.getByRole("button", { name: /등록|제출|완료/ }).first();
    if (await submitReview.isVisible({ timeout: 1000 }).catch(() => false)) {
      await submitReview.click();
      await pause(2000);
    }
  }

  // ────────────────────────────────────────────────────────────
  // 11 · 마이페이지 → 엽전 충전 → 결제
  // ────────────────────────────────────────────────────────────
  await go(pageA, "my", "my");

  const chargeBtn = pageA.getByRole("button", { name: /충전|엽전 충전/ }).first();
  if (await chargeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await chargeBtn.click();
    await pause(2000);

    // 금액 선택 (10,000원)
    const amountBtn = pageA.getByText(/10,000|1만/).first();
    if (await amountBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await amountBtn.click();
      await pause(1000);
    }
    await pageA.keyboard.press("Escape");
    await pause(1000);
  }

  // QR 결제 화면
  await go(pageA, "qrpay", "my");
  await pause(4000);

  // ────────────────────────────────────────────────────────────
  // 12 · 마무리 — 홈 복귀
  // ────────────────────────────────────────────────────────────
  await go(pageA, "home", "home");
  await pause(4000);
});
