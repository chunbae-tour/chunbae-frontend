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
import { test, chromium } from "@playwright/test";

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
const SECOND_MONITOR_LEFT = 1920;
const MON_W = 1920;
const MON_H = 1080;

// Chrome launch args로 창 위치 고정 — CDP 불필요
const LAUNCH_OPTS_A = {
  headless: false,
  args: [
    `--window-position=${SECOND_MONITOR_LEFT},0`,
    `--window-size=${MON_W},${MON_H}`,
    "--start-maximized",
  ],
};
const LAUNCH_OPTS_B = {
  headless: false,
  args: [
    `--window-position=${SECOND_MONITOR_LEFT + MON_W / 2},0`,
    `--window-size=${MON_W / 2},${MON_H}`,
  ],
};

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
test("춘배투어 사용자 이용 흐름 시연", async () => {
  test.setTimeout(360_000);

  // 브라우저 2개 따로 실행 — A는 전체화면, B는 오른쪽 절반 위치에서 시작
  const browserA = await chromium.launch(LAUNCH_OPTS_A);
  const browserB = await chromium.launch(LAUNCH_OPTS_B);

  // viewport height = MON_H - 88 : 브라우저 타이틀바(~88px) 제외, 콘텐츠가 화면 밖으로 밀리지 않도록
  const CONTENT_H = MON_H - 88;

  const ctxA = await browserA.newContext({
    viewport: { width: MON_W, height: CONTENT_H },
    geolocation: { latitude: 37.5796, longitude: 126.9770 },
    permissions: ["geolocation"],
    locale: "ko-KR",
  });
  const ctxB = await browserB.newContext({
    viewport: { width: MON_W / 2, height: CONTENT_H },
    geolocation: { latitude: 37.5796, longitude: 126.9770 },
    permissions: ["geolocation"],
    locale: "en-US",
  });

  const pageA = await ctxA.newPage(); // 춘배 (글 작성자)
  let pageB; // Olivia — 채팅방 생성 후 열림

  // ────────────────────────────────────────────────────────────
  // 1 · 홈 화면 (pageA만)
  // ────────────────────────────────────────────────────────────
  await pageA.goto(BASE_URL);
  await pageA.setViewportSize({ width: MON_W, height: CONTENT_H });
  await pageA.bringToFront();
  await pause(2500);

  // ────────────────────────────────────────────────────────────
  // 2 · 춘배 로그인
  // ────────────────────────────────────────────────────────────
  await loginWithEmail(pageA, USER_EMAIL, USER_PW);

  // ────────────────────────────────────────────────────────────
  // 3 · 축제 탭 → 캘린더 → 7월 → 날짜 클릭 → 첫 번째 행사 상세조회
  // ────────────────────────────────────────────────────────────
  const sideNav = pageA.getByRole("navigation", { name: "주요 화면 빠른 이동" });
  await sideNav.getByText("축제").click();
  await pause(2000);

  // 캘린더 탭 클릭
  const calendarTabBtn = pageA.getByRole("button", { name: "캘린더" }).first();
  await calendarTabBtn.waitFor({ timeout: 5000 });
  await calendarTabBtn.click();
  await pause(1800);

  // 7월로 이동
  await pageA.getByRole("button", { name: "다음 달" }).click();
  await pause(1800);

  // 7월 21일 클릭 (muted 아닌 날짜 중 21)
  const day21 = pageA.locator(".festival-calendar-day:not(.muted)").filter({ hasText: /^21/ }).first();
  await day21.waitFor({ timeout: 5000 });
  await day21.click();
  await pause(1500);

  // 오른쪽 패널 첫 번째 행사 카드 클릭 → 상세
  const firstFestCard = pageA.locator(".festival-list-card").first();
  await firstFestCard.waitFor({ timeout: 5000 });
  await firstFestCard.click();
  await pause(2500);

  // ────────────────────────────────────────────────────────────
  // 4 · 지도 탭 이동
  // ────────────────────────────────────────────────────────────
  await sideNav.getByText("지도").click();
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
  await titleInput.fill("경복궁 같이 가실 분 구해요! 외국어 가능하신 분 환영 🏯");
  await pause(800);

  // 내용
  const contentInput = pageA.getByPlaceholder(/내용을 입력|내용/).first();
  await contentInput.fill(
    "경복궁 혼자 가려니까 아쉬워서요 😅 같이 구경하실 분 있으면 좋겠어요! 외국어 되시는 분이면 더 좋고요~ 오전 10시에 정문 앞에서 만나서 천천히 둘러봐요 :)",
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

  // 최대 인원 → 클릭해서 드롭다운 열기 → 잠깐 보여주고 → 5명 선택
  const maxSelect = pageA.locator("select").filter({ has: pageA.locator("option[value='5']") });
  await maxSelect.scrollIntoViewIfNeeded();
  await pause(800);
  await maxSelect.click();   // 드롭다운 열림
  await pause(1200);         // 목록 보이는 시간
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
  await pause(3500);

  // ────────────────────────────────────────────────────────────
  // 9 · 게시글 상세 → 채팅방 생성 클릭
  // ────────────────────────────────────────────────────────────
  const chatCreateBtn = pageA.getByRole("button", { name: /채팅방 생성/ }).first();
  await chatCreateBtn.waitFor({ timeout: 10000 });
  await chatCreateBtn.scrollIntoViewIfNeeded();
  await pause(1000);
  await chatCreateBtn.click();
  await pause(2500);

  // ────────────────────────────────────────────────────────────
  // 10 · Olivia 탭 생성 → 로그인 → 지도 → 경복궁 → 게시글 참여신청
  // ────────────────────────────────────────────────────────────
  // 채팅방 생성 완료 후 pageB 오픈 — 동시에 pageA를 왼쪽 절반으로 (수락 전부터 split)
  pageB = await ctxB.newPage();
  pageB.on("crash", () => console.error("[DEMO] pageB crashed!"));
  pageB.on("close", () => console.error("[DEMO] pageB closed unexpectedly"));
  await pageA.setViewportSize({ width: MON_W / 2, height: CONTENT_H }); // pageA 왼쪽 절반
  await pageB.setViewportSize({ width: MON_W / 2, height: CONTENT_H });
  await pageB.goto(BASE_URL);
  await pageB.bringToFront(); // 오른쪽 절반에 자동으로 등장
  await pause(1000);
  await loginWithEmail(pageB, ALEX_EMAIL, ALEX_PW);

  // 지도 탭
  await pageB.getByRole("navigation", { name: "주요 화면 빠른 이동" }).getByText("지도").click();
  await pause(2500);

  // 960px 너비에서 사이드바 없음 → 목록 보기 전환 후 카드 찾기
  const listViewBtn = pageB.getByRole("button", { name: "목록 보기" });
  if (await listViewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await listViewBtn.click();
    await pause(1500);
  }

  const gyeongbokCardB = pageB.locator(".map-result-card").filter({ hasText: "경복궁" }).first();
  await gyeongbokCardB.waitFor({ timeout: 15000 });
  await gyeongbokCardB.scrollIntoViewIfNeeded();
  await gyeongbokCardB.click();
  await pause(2000);
  await gyeongbokCardB.getByRole("button", { name: "상세 보기" }).click();
  await pause(2500);

  // 이 장소 동행 모집 — 첫 번째(최신) 글 클릭
  const postCard = pageB.locator(".place-sidebar-companion-list button").first();
  await postCard.waitFor({ timeout: 8000 });
  await postCard.click();
  await pause(2500);

  // 참여 신청하기
  const applyBtn = pageB.getByRole("button", { name: "참여 신청하기" });
  if (await applyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await applyBtn.click();
    await pause(2500);
  }

  // ────────────────────────────────────────────────────────────
  // 11 · 춘배 알림 → 참여 신청 도착 클릭 → 채팅방 → 수락
  // ────────────────────────────────────────────────────────────
  await pageA.bringToFront();
  await pause(1500);

  // 🔔 알림 버튼 클릭
  const bellBtn = pageA.getByRole("button", { name: "알림" });
  await bellBtn.waitFor({ timeout: 5000 });
  await bellBtn.click();
  await pause(1800);

  // 알림 목록에서 "참여 신청 도착" 항목 클릭 → 채팅방으로 이동
  const joinNotif = pageA.getByText(/참여 신청 도착/).first();
  await joinNotif.waitFor({ timeout: 5000 });
  await joinNotif.click();
  await pause(2500);

  // 채팅방 관리 패널이 열려있지 않으면 관리 버튼 클릭
  const managePanelOpen = await pageA.locator(".chat-management-tabs").isVisible({ timeout: 2000 }).catch(() => false);
  if (!managePanelOpen) {
    const manageBtn = pageA.locator("button[aria-label='채팅방 관리']");
    if (await manageBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await manageBtn.click();
      await pause(1500);
    }
  }

  // "참여 신청" 탭 클릭
  const requestsTab = pageA.getByRole("button", { name: /참여 신청/ }).first();
  if (await requestsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
    await requestsTab.click();
    await pause(1500);
  }

  // "수락" 버튼 — 이미 수락된 상태면 스킵
  const acceptBtn = pageA.locator(".chat-management-card-actions .primary").first();
  if (await acceptBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    const btnText = await acceptBtn.textContent().catch(() => "");
    if (!btnText?.includes("완료")) {
      await acceptBtn.click();
      await pause(1200);
    }
  }

  // 수락 직후 관리 패널 × 닫기 버튼 클릭
  try {
    const closeBtn = pageA.locator("button[aria-label='채팅방 관리 닫기']");
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click();
    }
  } catch { }
  await pause(1200);

  // ────────────────────────────────────────────────────────────
  // 12 · 채팅 — split screen (춘배 왼쪽 | Olivia 오른쪽)
  // ────────────────────────────────────────────────────────────

  // pageB 살아있는지 확인 — 죽었으면 새로 열어서 재로그인
  if (!pageB || pageB.isClosed()) {
    console.error("[DEMO] pageB was closed — reopening...");
    pageB = await ctxB.newPage();
    pageB.on("crash", () => console.error("[DEMO] pageB crashed!"));
    await pageB.goto(BASE_URL);
    await loginWithEmail(pageB, ALEX_EMAIL, ALEX_PW);
    await pause(1000);
  }

  // pageB(Olivia): 채팅탭 → 첫 번째 채팅방 입장 (= 방금 수락된 방)
  await pageB.bringToFront();
  await pageB.getByRole("navigation", { name: "주요 화면 빠른 이동" }).getByText("채팅").click();
  await pause(2000);
  // 채팅 목록 첫 번째 방 클릭 (수락된 방이 최상단)
  const roomB = pageB.locator(".chat-room-row").first();
  await roomB.waitFor({ timeout: 8000 });
  await roomB.click();
  await pause(2000);

  // Olivia 번역 ON — 채팅방 입장 후
  const transB = pageB.locator("button.chat-translation-button");
  await transB.waitFor({ timeout: 5000 }).catch(() => {});
  if ((await transB.textContent().catch(() => "OFF"))?.includes("OFF")) {
    await transB.click();
    await pause(800);
  }

  // 춘배 번역 ON
  await pageA.bringToFront();
  const transA = pageA.locator("button.chat-translation-button");
  await transA.waitFor({ timeout: 5000 }).catch(() => {});
  if ((await transA.textContent().catch(() => "OFF"))?.includes("OFF")) {
    await transA.click();
    await pause(800);
  }

  // 춘배 메시지 전송
  await pageA.bringToFront();
  const msgInputA = pageA.getByPlaceholder(/메시지를 입력|메시지/).first();
  await msgInputA.waitFor({ timeout: 3000 });
  await msgInputA.fill("신청해주셔서 감사해요! 😊 10시에 정문 앞에서 만나요~");
  await pageA.keyboard.press("Enter");
  await pause(2000);

  // Olivia: 번역 뜰 때까지 대기 후 답장
  await pageB.bringToFront();
  await pause(3500);
  const msgInputB = pageB.getByPlaceholder(/메시지를 입력|메시지/).first();
  await msgInputB.waitFor({ timeout: 3000 });
  await msgInputB.fill("Perfect! 10 AM it is. See you there! 🎉");
  await pageB.keyboard.press("Enter");
  await pause(2000);

  // 춘배 화면 — 번역된 답장 확인
  await pageA.bringToFront();
  await pause(3000);

  // ────────────────────────────────────────────────────────────
  // 13 · 동행 생성 (Alex 닫기 → 관리패널 설정탭 → 날짜 입력 → 생성)
  // ────────────────────────────────────────────────────────────

  // Alex 창 닫기 → 즉시 전체화면 복귀
  await pageB.close();
  await pause(500);
  await pageA.setViewportSize({ width: MON_W, height: CONTENT_H });
  await pageA.bringToFront();
  await pause(1200);

  // 채팅방 관리 패널 열기
  const manageBtn2 = pageA.locator("button[aria-label='채팅방 관리']");
  if (await manageBtn2.isVisible({ timeout: 3000 }).catch(() => false)) {
    await manageBtn2.click();
    await pause(1200);
  }

  // 설정 탭 클릭
  const settingsTab = pageA.getByRole("button", { name: "설정" });
  await settingsTab.waitFor({ timeout: 5000 });
  await settingsTab.click();
  await pause(1000);

  // 시작일: 오늘, 종료일: 내일
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const dayAfter = new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10);

  const startInput = pageA.locator("input[type='date']").first();
  await startInput.waitFor({ timeout: 5000 });
  await startInput.fill(tomorrow);
  await pause(500);
  const endInput = pageA.locator("input[type='date']").last();
  await endInput.fill(dayAfter);
  await pause(800);

  // 동행 생성 버튼 클릭
  const createBtn = pageA.getByRole("button", { name: "동행 생성" }).last();
  await createBtn.waitFor({ timeout: 5000 });
  await createBtn.click();
  await pause(2500);

  // ────────────────────────────────────────────────────────────
  // 14 · 마이페이지 → 스크롤 → 신고내역 → 종료
  // ────────────────────────────────────────────────────────────
  await pageA.bringToFront();
  await pause(1500);

  const nav = pageA.getByRole("navigation", { name: "주요 화면 빠른 이동" });
  await nav.getByText("마이").click();
  await pause(2500);

  // 마이페이지 스크롤 → 메뉴 구경
  await pageA.evaluate(() => window.scrollBy(0, 500));
  await pause(1200);
  await pageA.evaluate(() => window.scrollBy(0, 500));
  await pause(1500);

  // 내 신고 내역 클릭
  const reportBtn = pageA.getByText("내 신고 내역").first();
  await reportBtn.waitFor({ timeout: 5000 });
  await reportBtn.click();
  await pause(2500);

  await browserA.close();
  await browserB.close();
});
