/**
 * 춘배투어 사용자 이용 흐름 시연 스크립트 — 실서버 연결
 *
 * 실행: pnpm demo
 * 녹화: OBS 또는 Win+G 켜고 실행
 *
 * 계정 정보: tests/demo/.env.demo (gitignored)
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { test } from "@playwright/test";

// ── 환경변수 로드 ──────────────────────────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url));
const envLines = readFileSync(resolve(__dir, ".env.demo"), "utf-8").split("\n");
const env = Object.fromEntries(
  envLines.filter((l) => l.includes("=")).map((l) => l.split("=").map((s) => s.trim())),
);

const BASE_URL      = env.DEMO_SITE_URL;
const USER_EMAIL    = env.DEMO_USER_EMAIL;
const USER_PW       = env.DEMO_USER_PASSWORD;
const ALEX_EMAIL    = env.DEMO_ALEX_EMAIL;
const ALEX_PW       = env.DEMO_ALEX_PASSWORD;

function pause(ms = 1800) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── 창 위치 설정 ───────────────────────────────────────────────
// 두 번째 모니터 기준 — 주 모니터가 1920px 너비라고 가정
// 다른 경우 SECOND_MONITOR_LEFT 값 조정
const SECOND_MONITOR_LEFT = 1920;

async function positionWindow(page) {
  try {
    const cdp = await page.context().newCDPSession(page);
    const { windowId } = await cdp.send("Browser.getWindowForTarget");
    // 먼저 두 번째 모니터로 이동
    await cdp.send("Browser.setWindowBounds", {
      windowId,
      bounds: { left: SECOND_MONITOR_LEFT, top: 0, width: 1920, height: 1080 },
    });
    // 최대화
    await cdp.send("Browser.setWindowBounds", {
      windowId,
      bounds: { left: SECOND_MONITOR_LEFT, top: 0, windowState: "maximized" },
    });
  } catch { /* CDP 미지원 무시 */ }
}

// ── 로그인 헬퍼 ───────────────────────────────────────────────
async function loginWithEmail(page, email, password) {
  await page.waitForLoadState("networkidle");
  // 로그인 버튼 — 버튼/링크 모두 대응
  const loginTrigger = page.locator("button, a").filter({ hasText: /^로그인$/ }).first();
  await loginTrigger.waitFor({ timeout: 15000 });
  await loginTrigger.click();
  await pause(1200);

  await page.getByPlaceholder("이메일").fill(email);
  await pause(400);
  await page.getByPlaceholder("비밀번호").fill(password);
  await pause(400);

  // 로그인 제출 버튼 (폼 안의 로그인)
  await page.locator("button[type='submit'], button").filter({ hasText: /^로그인$/ }).last().click();
  await page.waitForLoadState("networkidle");
  await pause(2000);
}

// ══════════════════════════════════════════════════════════════
// 시연 메인
// ══════════════════════════════════════════════════════════════
test("춘배투어 사용자 이용 흐름 시연", async ({ browser }) => {
  test.setTimeout(360_000);

  const ctxA = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    geolocation: { latitude: 37.5796, longitude: 126.9770 },
    permissions: ["geolocation"],
    locale: "ko-KR",
  });
  const ctxB = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    geolocation: { latitude: 37.5796, longitude: 126.9770 },
    permissions: ["geolocation"],
    locale: "en-US",
  });

  const pageA = await ctxA.newPage(); // 춘배 (글 작성자)
  const pageB = await ctxB.newPage(); // Alex (동행 참여자)

  // ────────────────────────────────────────────────────────────
  // 1 · 홈 화면
  // ────────────────────────────────────────────────────────────
  await pageA.goto(BASE_URL);
  await pageB.goto(BASE_URL);
  await positionWindow(pageA);
  await positionWindow(pageB);
  await pageA.bringToFront();
  await pause(2500);

  // ────────────────────────────────────────────────────────────
  // 2 · 춘배 로그인
  // ────────────────────────────────────────────────────────────
  await loginWithEmail(pageA, USER_EMAIL, USER_PW);

  // ────────────────────────────────────────────────────────────
  // 3 · 지도 탭 → 경복궁 검색
  // ────────────────────────────────────────────────────────────
  await pageA.getByRole("navigation", { name: "주요 화면 빠른 이동" }).getByText("지도").click();
  await pause(2500);

  // ────────────────────────────────────────────────────────────
  // 4 · 주변 골목 포인트 → 경복궁 카드 클릭 (마커 이동)
  // ────────────────────────────────────────────────────────────

  // 경복궁 카드가 보일 때까지 스크롤
  const gyeongbokCard = pageA.locator(".map-result-card").filter({ hasText: "경복궁" }).first();
  await gyeongbokCard.waitFor({ timeout: 10000 });
  await gyeongbokCard.scrollIntoViewIfNeeded();
  await pause(1000);

  // 카드 클릭 → 지도 마커 이동
  await gyeongbokCard.click();
  await pause(2500);

  // 상세 보기 버튼 클릭
  await gyeongbokCard.getByRole("button", { name: "상세 보기" }).click();
  await pause(2500);

  // ────────────────────────────────────────────────────────────
  // 5 · 찜하기 버튼 클릭
  // ────────────────────────────────────────────────────────────
  const likeBtn = pageA.getByRole("button", { name: /찜하기|♡/ }).first();
  if (await likeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await likeBtn.click();
    await pause(2000);
  }

  // 스크롤 내려서 "동행 모집글 작성하기" 버튼 보이게
  const writeBtn = pageA.getByRole("button", { name: /동행 모집글 작성하기/ }).first();
  await writeBtn.waitFor({ timeout: 5000 });
  await writeBtn.scrollIntoViewIfNeeded();
  await pause(1500);

  // ────────────────────────────────────────────────────────────
  // 6 · 동행 모집글 작성하기 클릭
  // ────────────────────────────────────────────────────────────
  await writeBtn.click();
  await pause(2500);

  // ────────────────────────────────────────────────────────────
  // 7 · 동행 글 작성
  // ────────────────────────────────────────────────────────────

  // 제목
  const titleInput = pageA.getByPlaceholder("제목을 입력하세요");
  await titleInput.waitFor({ timeout: 5000 });
  await titleInput.fill("경복궁 같이 갈 사람을 모집합니다 🏯");
  await pause(800);

  // 내용
  const contentInput = pageA.getByPlaceholder(/내용을 입력|내용/).first();
  await contentInput.fill(
    "혼자 여행하는 것보다 함께하면 훨씬 재밌을 것 같아요! 경복궁 구석구석을 같이 탐험하실 분을 모집합니다. 외국어 가능하신 분도 환영해요 😊 오전 10시 정문 앞에서 만나서 천천히 둘러봐요!",
  );
  await pause(1000);

  // 만나는 곳 → 찜한 관광지 탭 클릭
  const likedTab = pageA.locator(".community-place-source-tabs button").filter({ hasText: "찜한 관광지" });
  await likedTab.scrollIntoViewIfNeeded();
  await likedTab.click();
  await pause(2000);

  // 찜한 관광지 목록에서 경복궁 클릭
  const likedPlace = pageA.locator(".community-place-result-list button").filter({ hasText: "경복궁" }).first();
  await likedPlace.waitFor({ timeout: 5000 });
  await likedPlace.click();
  await pause(1000);

  // 모임 날짜 → 퀵버튼 "오늘" 클릭 (오늘 = 20일)
  const todayBtn = pageA.locator(".community-date-quick-options button").filter({ hasText: "오늘" });
  await todayBtn.scrollIntoViewIfNeeded();
  await pause(800);
  await todayBtn.click();
  await pause(1200);

  // 최대 인원 select → 5명 선택 (스크롤 후 보이게)
  const maxSelect = pageA.locator("select").filter({ has: pageA.locator("option[value='5']") });
  await maxSelect.scrollIntoViewIfNeeded();
  await pause(800);
  await maxSelect.selectOption("5");
  await pause(1000);

  // ────────────────────────────────────────────────────────────
  // 8 · 게시글 등록 버튼 스크롤 후 클릭
  // ────────────────────────────────────────────────────────────
  const submitBtn = pageA.getByRole("button", { name: "게시글 등록" });
  await submitBtn.waitFor({ timeout: 5000 });
  await submitBtn.scrollIntoViewIfNeeded();
  await pause(1200);
  await submitBtn.click();
  await pause(3000);

  const chatCreateBtn = pageA.getByRole("button", { name: /채팅방 생성/ }).first();
  if (await chatCreateBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await chatCreateBtn.click();
    await pause(2000);
  }

  // ────────────────────────────────────────────────────────────
  // 9 · Alex 로그인 (pageB 탭으로 전환)
  // ────────────────────────────────────────────────────────────
  await pageB.bringToFront();
  await pause(1000);
  await loginWithEmail(pageB, ALEX_EMAIL, ALEX_PW);

  // Alex도 지도 → 경복궁 검색
  await pageB.getByRole("navigation", { name: "주요 화면 빠른 이동" }).getByText("지도").click();
  await pause(2000);

  const gyeongbokCardB = pageB.locator(".map-result-card").filter({ hasText: "경복궁" }).first();
  await gyeongbokCardB.waitFor({ timeout: 10000 });
  await gyeongbokCardB.scrollIntoViewIfNeeded();
  await gyeongbokCardB.click();
  await pause(2000);
  await gyeongbokCardB.getByRole("button", { name: "상세 보기" }).click();
  await pause(2500);

  // 이 장소 동행 모집 카드에서 활성화된 게시글 클릭
  const postCard = pageB.getByText("경복궁 같이 갈 사람을 모집합니다").first();
  if (await postCard.isVisible({ timeout: 5000 }).catch(() => false)) {
    await postCard.click();
    await pause(2500);
  }

  // 참여 신청하기
  const applyBtn = pageB.getByRole("button", { name: "참여 신청하기" });
  if (await applyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await applyBtn.click();
    await pause(2500);
  }

  // ────────────────────────────────────────────────────────────
  // 10 · 춘배 알림 → 수락 (pageA 탭)
  // ────────────────────────────────────────────────────────────
  await pageA.bringToFront();
  await pause(1500);

  // 알림 버튼 클릭
  const notifBtn = pageA.getByRole("button", { name: /알림/ }).first();
  if (await notifBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await notifBtn.click();
    await pause(2000);
  }

  const acceptBtn = pageA.getByRole("button", { name: /수락|허락|승인/ }).first();
  if (await acceptBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await acceptBtn.click();
    await pause(2000);
  }

  // ────────────────────────────────────────────────────────────
  // 11 · 채팅 — 춘배(한국어) ↔ Alex(영어)
  // ────────────────────────────────────────────────────────────
  // 춘배 채팅방 입장
  await pageA.getByRole("navigation", { name: "주요 화면 빠른 이동" }).getByText("채팅").click();
  await pause(2000);

  const roomA = pageA.getByText("경복궁 같이 갈 사람을 모집합니다").first();
  if (await roomA.isVisible({ timeout: 3000 }).catch(() => false)) {
    await roomA.click();
    await pause(2000);
  }

  const msgA = pageA.getByPlaceholder(/메시지를 입력|메시지/).first();
  if (await msgA.isVisible({ timeout: 2000 }).catch(() => false)) {
    await msgA.type("안녕하세요 Alex! 신청해주셔서 감사해요 😊 오전 10시 정문 앞에서 만나요!", { delay: 60 });
    await pageA.keyboard.press("Enter");
    await pause(2000);
  }

  // Alex 채팅방 입장
  await pageB.bringToFront();
  await pageB.getByRole("navigation", { name: "주요 화면 빠른 이동" }).getByText("채팅").click();
  await pause(2000);

  const roomB = pageB.getByText("경복궁 같이 갈 사람을 모집합니다").first();
  if (await roomB.isVisible({ timeout: 3000 }).catch(() => false)) {
    await roomB.click();
    await pause(2000);
  }

  const msgB = pageB.getByPlaceholder(/메시지를 입력|메시지/).first();
  if (await msgB.isVisible({ timeout: 2000 }).catch(() => false)) {
    await msgB.type("Perfect! 10 AM it is. See you there! 🎉", { delay: 60 });
    await pageB.keyboard.press("Enter");
    await pause(2000);
  }

  // ────────────────────────────────────────────────────────────
  // 12 · 마이페이지 → QR 결제 화면 (마무리)
  // ────────────────────────────────────────────────────────────
  await pageA.bringToFront();
  const nav = pageA.getByRole("navigation", { name: "주요 화면 빠른 이동" });
  await nav.getByText("마이").click();
  await pause(3000);

  await nav.getByText("지도").click();
  await pause(3000);
});
