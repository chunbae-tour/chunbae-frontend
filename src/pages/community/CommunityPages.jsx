import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { COLORS, S } from "../../constants/colors.js";
import { EmptyState, ErrorState, ReportDialog, SkeletonList } from "../../components/common";
import { getApiErrorHint } from "../../services/apiClient.js";
import { createChatRoom, fetchMyChatRooms, getCompanionJoinState, getCompanionRoomForPost, registerCompanionChatRoom, submitCompanionJoinRequest } from "../../services/chatService.js";
import { createCommunityComment, createCommunityPost, deleteComment, deleteCommunityPost, fetchCommunityComments, fetchCommunityPostDetail, fetchCommunityPosts, fetchReplies, updateComment, updateCommunityPost, uploadFreePostImage } from "../../services/communityService.js";
import { createReport, REPORT_REASONS } from "../../services/reportService.js";
import { fetchFestivalDetail, searchFestivals } from "../../services/festivalService.js";
import { fetchWishlist } from "../../services/myService.js";
import { fetchPlaceDetail, fetchPlaces, fetchTraditionalMarketDetail } from "../../services/placeService.js";
import { searchPlaces, searchUnifiedPage } from "../../services/searchService.js";
import { getPlaceImageUrl } from "../../constants/placeImages.js";

function getCompanionJoinErrorMessage(error) {
  const code = String(error?.code ?? "").toUpperCase();
  const message = String(error?.message ?? "");

  if (code === "COMPANION_CHAT_ROOM_ID_MISSING") {
    return "이 모집글에 연결된 채팅방 정보를 찾지 못했습니다. 방장이 채팅방을 생성한 뒤 다시 신청해주세요.";
  }
  if (error?.status === 403) {
    return "이 채팅방에는 다시 참여 신청할 수 없습니다. 이전에 내보내졌거나 방장 권한으로 참여가 제한된 상태예요.";
  }
  if (code.includes("KICK") || code.includes("BAN") || code.includes("BLOCK")) {
    return "이전에 내보내진 채팅방이라 다시 참여 신청할 수 없습니다.";
  }
  if (code.includes("ALREADY") || message.includes("이미")) {
    return "이미 참여 신청했거나 참여 중인 채팅방입니다.";
  }

  return getApiErrorHint(error);
}

function parseDateValue(value) {
  if (!value) return null;
  const raw = String(value);
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00` : raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatCompactDate(value) {
  const parsed = parseDateValue(value);
  if (!parsed) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

function formatKoreanDate(value) {
  const parsed = parseDateValue(value);
  if (!parsed) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(parsed);
}

function formatKoreanDateTime(value) {
  const parsed = parseDateValue(value);
  if (!parsed) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function formatRelativeTime(value) {
  const parsed = parseDateValue(value);
  if (!parsed) return "";
  const diffMs = Date.now() - parsed.getTime();
  if (diffMs < 0) return formatCompactDate(value);
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return "방금";
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}일 전`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}개월 전`;
  return `${Math.floor(diffMonths / 12)}년 전`;
}

function toLocalDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addLocalDays(date, days) {
  const next = new Date(date);
  next.setHours(12, 0, 0, 0);
  next.setDate(next.getDate() + days);
  return next;
}

function getUpcomingSaturday(date, nextWeek = false) {
  const daysUntilSaturday = (6 - date.getDay() + 7) % 7;
  return addLocalDays(date, daysUntilSaturday + (nextWeek ? 7 : 0));
}

function formatMeetingDate(value) {
  if (!value) return "날짜를 선택해주세요";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "날짜를 선택해주세요";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);
}

function formatFestivalDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(date);
}

function formatFestivalRange(startDate, endDate) {
  const start = formatFestivalDate(startDate);
  const end = formatFestivalDate(endDate);
  if (start && end) return start === end ? start : `${start} ~ ${end}`;
  return start || end || "";
}

function getCalendarCells(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const currentMonthDays = new Date(year, month + 1, 0).getDate();
  const previousMonthDays = new Date(year, month, 0).getDate();

  return Array.from({ length: 42 }, (_, index) => {
    const dayOffset = index - firstDay + 1;
    if (dayOffset < 1) {
      const day = previousMonthDays + dayOffset;
      return { day, value: toLocalDateValue(new Date(year, month - 1, day)), outside: true };
    }
    if (dayOffset > currentMonthDays) {
      const day = dayOffset - currentMonthDays;
      return { day, value: toLocalDateValue(new Date(year, month + 1, day)), outside: true };
    }
    return { day: dayOffset, value: toLocalDateValue(new Date(year, month, dayOffset)), outside: false };
  });
}

function HanokCalendarModal({ open, value, min, onClose, onConfirm }) {
  const [viewDate, setViewDate] = useState(() => new Date(`${value || min}T12:00:00`));
  const [draftDate, setDraftDate] = useState(value || min);
  const [wheelMode, setWheelMode] = useState(null);
  const wheelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setViewDate(new Date(`${value || min}T12:00:00`));
    setDraftDate(value || min);
    setWheelMode(null);
  }, [open, value, min]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const cells = getCalendarCells(year, month);
  const years = Array.from({ length: 21 }, (_, index) => year - 10 + index);
  const months = Array.from({ length: 12 }, (_, index) => index);

  useEffect(() => {
    if (!wheelMode) return;
    const selected = wheelRef.current?.querySelector("button.selected");
    selected?.scrollIntoView({ block: "center", inline: "nearest" });
  }, [wheelMode, year, month]);

  if (!open) return null;

  const moveMonth = (offset) => {
    setViewDate(new Date(year, month + offset, 1, 12));
    setWheelMode(null);
  };

  const changeYear = (nextYear) => setViewDate(new Date(nextYear, month, 1, 12));
  const changeMonth = (nextMonth) => setViewDate(new Date(year, nextMonth, 1, 12));
  const handleWheel = (event, mode) => {
    event.preventDefault();
    if (mode === "year") changeYear(year + (event.deltaY > 0 ? 1 : -1));
    if (mode === "month") changeMonth((month + (event.deltaY > 0 ? 1 : -1) + 12) % 12);
  };

  return createPortal(
    <div className="hanok-calendar-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="hanok-calendar" role="dialog" aria-modal="true" aria-label="모임 날짜 선택" onMouseDown={(event) => event.stopPropagation()}>
        <div className="hanok-calendar-roof" aria-hidden="true">
          <span className="hanok-roof-ridge" />
          <div className="hanok-roof-tiles">
            {Array.from({ length: 11 }, (_, index) => <i key={index} />)}
          </div>
        </div>
        <header className="hanok-calendar-header">
          <button type="button" aria-label="이전 달" onClick={() => moveMonth(-1)}>?</button>
          <div className="hanok-calendar-period">
            <button type="button" className={wheelMode === "year" ? "active" : ""} onClick={() => setWheelMode(wheelMode === "year" ? null : "year")}>{year}년</button>
            <button type="button" className={wheelMode === "month" ? "active" : ""} onClick={() => setWheelMode(wheelMode === "month" ? null : "month")}>{month + 1}월</button>
          </div>
          <button type="button" aria-label="다음 달" onClick={() => moveMonth(1)}>?</button>
        </header>

        {wheelMode && (
          <div className="hanok-calendar-wheel-panel" onWheel={(event) => handleWheel(event, wheelMode)}>
            <div className="hanok-calendar-wheel-label">{wheelMode === "year" ? "연도 선택" : "월 선택"} · 마우스 휠로 넘겨보세요</div>
            <div ref={wheelRef} className={`hanok-calendar-wheel ${wheelMode}`}>
              {(wheelMode === "year" ? years : months).map(option => {
                const selected = wheelMode === "year" ? option === year : option === month;
                return (
                  <button type="button" key={option} className={selected ? "selected" : ""} onWheel={(event) => handleWheel(event, wheelMode)} onClick={() => wheelMode === "year" ? changeYear(option) : changeMonth(option)}>
                    {wheelMode === "year" ? `${option}년` : `${option + 1}월`}
                  </button>
                );
              })}
            </div>
            <button type="button" className="hanok-wheel-done" onClick={() => setWheelMode(null)}>달력 보기</button>
          </div>
        )}

        <div className="hanok-calendar-body">
          <div className="hanok-calendar-weekdays">
            {["일", "월", "화", "수", "목", "금", "토"].map(day => <span key={day}>{day}</span>)}
          </div>
          <div className="hanok-calendar-days">
            {cells.map(cell => (
              <button
                type="button"
                key={cell.value}
                className={`${cell.outside ? "outside" : ""} ${cell.value === draftDate ? "selected" : ""}`}
                disabled={cell.value < min}
                onClick={() => {
                  setDraftDate(cell.value);
                  if (cell.outside) setViewDate(new Date(`${cell.value}T12:00:00`));
                }}
              >
                {cell.day}
              </button>
            ))}
          </div>
        </div>
        <footer className="hanok-calendar-footer">
          <span>{formatMeetingDate(draftDate)}</span>
          <button type="button" onClick={() => onConfirm(draftDate)}>{new Date(`${draftDate}T12:00:00`).getDate()}일로 선택</button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

function wasCommentEdited(comment) {
  const createdAt = parseDateValue(comment?.time ?? comment?.createdAt);
  const updatedAt = parseDateValue(comment?.updatedAt);
  if (!createdAt || !updatedAt) return false;
  return updatedAt.getTime() - createdAt.getTime() >= 1000;
}

function isClosedCompanionPost(post) {
  const status = String(post?.status ?? "").toUpperCase();
  const parsedMeetingDate = parseDateValue(post?.meetingDate ?? post?.date);
  const meetingDateValue = parsedMeetingDate ? toLocalDateValue(parsedMeetingDate) : "";
  const isPastMeetingDate = Boolean(meetingDateValue) && meetingDateValue < toLocalDateValue(new Date());
  return ["CLOSED", "HIDDEN", "DELETED"].includes(status)
    || isPastMeetingDate
    || (Number(post?.max) > 0 && Number(post?.current) >= Number(post?.max));
}

function getMeetingDateParts(value) {
  const parsed = parseDateValue(value);
  if (!parsed) return { month: "--", day: "--" };
  return {
    month: `${parsed.getMonth() + 1}월`,
    day: String(parsed.getDate()).padStart(2, "0"),
  };
}

function isPostAuthor(post, user) {
  if (!post || !user) return false;
  if (post.isAuthor || post.mine || post.isMine || post.ownedByMe) return true;

  const postUserIds = [
    post.writerId,
    post.authorId,
    post.userId,
    post.accountId,
    post.writer?.userId,
    post.writer?.id,
    post.author?.userId,
    post.author?.id,
  ].filter(value => value != null && value !== "");
  const currentUserIds = [
    user.userId,
    user.id,
    user.accountId,
    user.memberId,
  ].filter(value => value != null && value !== "");

  if (postUserIds.some(postId => currentUserIds.some(userId => String(postId) === String(userId)))) {
    return true;
  }

  const authorName = typeof post.author === "string"
    ? post.author
    : post.author?.nickname ?? post.author?.name ?? post.writer?.nickname ?? post.writer?.name;
  const currentNames = [user.nickname, user.name, user.username].filter(Boolean);
  return Boolean(authorName && currentNames.some(name => String(authorName) === String(name)));
}

function CommunityProfileAvatar({ imageUrl, name = "여행자", className = "" }) {
  const label = String(name || "여").slice(0, 1);
  return (
    <div className={`community-profile-avatar ${className}`}>
      {imageUrl ? <img src={imageUrl} alt={`${name || "작성자"} 프로필`} /> : label}
    </div>
  );
}

function CommunityStatIcon({ type }) {
  if (type === "comments") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21 12a8 8 0 0 1-8 8H6l-4 2 1.4-4.2A8.5 8.5 0 1 1 21 12Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function LocationIcon({ type = "pin" }) {
  if (type === "map") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m3 6 5-2 8 3 5-2v13l-5 2-8-3-5 2V6Z" />
        <path d="M8 4v13M16 7v13" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function CommunityMarkerIcon({ type = "participant" }) {
  if (type === "empty") {
    return (
      <svg className="community-marker-icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v8" />
        <path d="M8 12h8" />
      </svg>
    );
  }

  if (type === "host") {
    return (
      <svg className="community-marker-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 21s6.5-4.8 6.5-10.4A6.5 6.5 0 1 0 5.5 10.6C5.5 16.2 12 21 12 21z" />
        <path d="M8.7 11.6h6.6" />
        <path d="M9.7 14.3h4.6" />
        <path d="M10 9.2h4l-1-2h-2l-1 2z" />
      </svg>
    );
  }

  return (
    <svg className="community-marker-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21s6.5-4.8 6.5-10.4A6.5 6.5 0 1 0 5.5 10.6C5.5 16.2 12 21 12 21z" />
      <circle cx="12" cy="9.3" r="2.1" />
      <path d="M8.7 15.1c.7-2 5.9-2 6.6 0" />
    </svg>
  );
}

function DetailIcon({ type }) {
  if (type === "route") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="6" cy="19" r="2" />
        <circle cx="18" cy="5" r="2" />
        <path d="M6 17v-3a4 4 0 0 1 4-4h4a4 4 0 0 0 4-4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5v.5" />
    </svg>
  );
}

function normalizeCompanionTarget(post = {}) {
  const legacyPlaceId = post.placeId ?? post.place?.placeId ?? null;
  const rawType = post.targetType ?? (legacyPlaceId != null ? "PLACE" : null);
  const type = rawType === "TRADITIONAL_MARKET" ? "MARKET" : rawType;
  return {
    type,
    id: post.targetId ?? legacyPlaceId,
    name: post.targetName ?? post.placeName ?? (typeof post.place === "string" ? post.place : post.place?.name) ?? "",
  };
}

async function fetchCompanionTarget(target) {
  if (!target?.id) return null;
  if (target.type === "MARKET") return fetchTraditionalMarketDetail(target.id);
  if (target.type === "FESTIVAL") return fetchFestivalDetail(target.id);

  const [detail, candidates] = await Promise.all([
    fetchPlaceDetail(target.id),
    target.name
      ? fetchPlaces({ keyword: target.name, size: 10 }).catch(() => [])
      : Promise.resolve([]),
  ]);
  const listPlace = candidates.find((place) => String(place.placeId ?? place.id) === String(target.id))
    ?? candidates.find((place) => place.name === target.name);

  if (!listPlace) return detail;

  return {
    ...listPlace,
    ...detail,
    imageUrl: detail.imageUrl || detail.thumbnailUrl || listPlace.imageUrl || listPlace.thumbnailUrl || "",
    thumbnailUrl: detail.thumbnailUrl || detail.imageUrl || listPlace.thumbnailUrl || listPlace.imageUrl || "",
    imageUrls: detail.imageUrls?.length ? detail.imageUrls : listPlace.imageUrls,
  };
}

function StaticMeetingMap({ name, onOpen }) {
  return (
    <button
      type="button"
      className="community-static-map"
      onClick={onOpen}
      aria-label={`${name || "만나는 곳"} 지도 열기`}
    >
      <span className="community-map-road road-one" />
      <span className="community-map-road road-two" />
      <span className="community-map-block block-one" />
      <span className="community-map-block block-two" />
      <span className="community-map-pin" aria-hidden="true"><LocationIcon /></span>
      <span className="community-map-caption">
        <strong>{name || "만나는 곳"}</strong>
      </span>
      <span className="community-map-expand">지도 크게 보기 ↗</span>
    </button>
  );
}

function ParticipantAvatarStack({ current = 1, max = 4, hostLabel = "방장", detailed = false }) {
  const safeCurrent = Math.max(1, Number(current) || 1);
  const safeMax = Math.max(safeCurrent, Number(max) || 4);
  const visibleSlots = Math.min(safeMax, detailed ? 8 : 4);

  return (
    <div className={`community-participant-stack ${detailed ? "detailed" : ""}`} aria-label={`${safeCurrent}/${safeMax}명 참여 중`}>
      {Array.from({ length: visibleSlots }, (_, index) => {
        const occupied = index < safeCurrent;
        const isHost = index === 0;
        const markerType = !occupied ? "empty" : isHost ? "host" : "participant";
        return (
          <span
            key={`${occupied ? "participant" : "empty"}-${index}`}
            className={`${occupied ? "occupied" : "empty"} ${isHost ? "host" : ""}`}
            title={isHost ? hostLabel : occupied ? `참여자 ${index + 1}` : "빈 자리"}
          >
            <CommunityMarkerIcon type={markerType} />
          </span>
        );
      })}
      {safeMax > visibleSlots && detailed && <small>+{safeMax - visibleSlots}</small>}
    </div>
  );
}

const FREE_POST_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const FREE_POST_IMAGE_MAX_SIZE = 10 * 1024 * 1024;

function createFreePostImagePreview(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// ─── 커뮤니티 목록 ────────────────────────────────────────────────────
export function CommunityListPage({ onPost, onWrite, onBack, initialTab = "동행", onTabChange }) {
  const PAGE_SIZE = 10;
  const [tab, setTab] = useState(initialTab);
  const [scope, setScope] = useState("전체");
  const [sort, setSort] = useState("latest");
  const [posts, setPosts] = useState([]);
  const [boardPages, setBoardPages] = useState({ 동행: 1, 자유: 1 });
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const filtered = posts
    .filter((post) => {
      if (post.type !== tab) return false;
      if (tab !== "동행" || scope === "전체") return true;
      const closed = isClosedCompanionPost(post);
      return scope === "마감" ? closed : !closed;
    })
    .sort((a, b) => {
      if (tab === "동행" && scope !== "마감") {
        const closedOrder = Number(isClosedCompanionPost(a)) - Number(isClosedCompanionPost(b));
        if (closedOrder !== 0) return closedOrder;
      }
      if (sort === "popular") {
        return (Number(b.views) + Number(b.comments)) - (Number(a.views) + Number(a.comments));
      }
      if (sort === "deadline") {
        const closedOrder = Number(isClosedCompanionPost(a)) - Number(isClosedCompanionPost(b));
        if (closedOrder !== 0) return closedOrder;
        return (parseDateValue(a.meetingDate)?.getTime() ?? Number.MAX_SAFE_INTEGER)
          - (parseDateValue(b.meetingDate)?.getTime() ?? Number.MAX_SAFE_INTEGER);
      }
      return (parseDateValue(b.createdAt)?.getTime() ?? 0) - (parseDateValue(a.createdAt)?.getTime() ?? 0);
    });
  const companionCount = posts.filter(p => p.type === "동행").length;
  const freeCount = posts.filter(p => p.type === "자유").length;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(boardPages[tab] ?? 1, totalPages);
  const pagedPosts = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const loadPosts = () => {
    setStatus("loading");
    setErrorMessage("");
    fetchCommunityPosts({ size: 100 })
      .then((data) => {
        const nextPosts = Array.isArray(data) ? data : data.posts ?? [];
        setPosts(nextPosts);
        setStatus(nextPosts.length > 0 ? "success" : "empty");
      })
      .catch((error) => {
        setPosts([]);
        setErrorMessage(getApiErrorHint(error));
        setStatus("error");
      });
  };

  useEffect(() => {
    let ignore = false;
    if (!ignore) loadPosts();
    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    setTab(initialTab);
    setScope("전체");
    setSort("latest");
    setBoardPages(prev => ({ ...prev, [initialTab]: 1 }));
  }, [initialTab]);

  useEffect(() => {
    if ((boardPages[tab] ?? 1) > totalPages) {
      setBoardPages(prev => ({ ...prev, [tab]: totalPages }));
    }
  }, [boardPages, tab, totalPages]);

  const handleTabChange = (nextTab) => {
    setTab(nextTab);
    setScope("전체");
    setSort("latest");
    setBoardPages(prev => ({ ...prev, [nextTab]: 1 }));
    onTabChange?.(nextTab);
  };

  const handlePageChange = (nextPage) => {
    setBoardPages(prev => ({ ...prev, [tab]: nextPage }));
    const scrollTarget = document.querySelector(".community-list-shell");
    scrollTarget?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  return (
    <div style={S.screen} className="community-list-screen">
      <div className="community-list-hero">
        <div>
          <button type="button" onClick={onBack} aria-label="뒤로 가기">←</button>
          <span>LOCAL COMPANION</span>
          <h1>같이 걸을 골목 친구를 찾아보세요.</h1>
          <p>동행 모집과 여행 이야기를 한 곳에서 나눠보세요.</p>
        </div>
        <button type="button" onClick={() => onWrite?.(tab)}>글쓰기</button>
      </div>
      <div className="community-list-tabs">
        {["동행", "자유"].map(t => (
          <button key={t} type="button" onClick={() => handleTabChange(t)} className={tab === t ? "active" : ""}>
            {t === "동행" ? "동행 게시판" : "자유 게시판"}
            <span>{t === "동행" ? companionCount : freeCount}</span>
          </button>
        ))}
      </div>
      <div style={S.scrollArea}>
        <div className="community-list-shell">
          <div className="community-filter-bar">
            <div className="community-scope-row">
              {(tab === "동행" ? ["전체", "모집중", "마감"] : ["전체"]).map(item => (
                <button key={item} type="button" className={scope === item ? "active" : ""} onClick={() => setScope(item)}>
                  {item}
                </button>
              ))}
            </div>
            <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="게시글 정렬">
              <option value="latest">최신순</option>
              {tab === "동행" && <option value="deadline">마감임박순</option>}
              <option value="popular">인기순</option>
            </select>
          </div>
          {status === "loading" && <SkeletonList count={4} />}
          {status === "empty" && (
            <EmptyState
              icon="글"
              title="게시글이 없습니다."
              description="동행 게시판이나 자유 게시판에 첫 글을 남겨보세요."
              actionLabel="글쓰기"
              onAction={() => onWrite?.(tab)}
            />
          )}
          {status === "error" && (
            <ErrorState
              title="게시글을 불러오지 못했습니다."
              description={errorMessage || "백엔드 연결 상태를 확인한 뒤 다시 시도해주세요."}
              onRetry={loadPosts}
            />
          )}
          {status !== "loading" && status !== "error" && filtered.length === 0 && (
            <EmptyState
              icon="검색"
              title="이 조건에 표시할 게시글이 없습니다."
              description="다른 게시판이나 장소 필터를 선택해보세요."
            />
          )}
          <div className="community-card-grid">
          {pagedPosts.map(p => {
            const isCompanionPost = p.type === "동행";
            const closed = isCompanionPost && isClosedCompanionPost(p);
            const dateParts = getMeetingDateParts(p.meetingDate ?? p.date);
            const createdRelative = formatRelativeTime(p.createdAt ?? p.date);

            return (
            <article key={p.id} onClick={() => onPost(p)} className={`community-list-card ${isCompanionPost ? "" : "free-post"} ${closed ? "closed" : ""}`}>
              {isCompanionPost && (
                <div className={`community-date-block ${closed ? "closed" : ""}`}>
                  <small>{dateParts.month}</small>
                  <strong>{dateParts.day}</strong>
                </div>
              )}
              <div className="community-list-card-body">
                <div className="community-list-card-head">
                  <div>
                    {isCompanionPost && (
                      <span className={closed ? "closed" : "open"}>
                        {closed ? "마감" : "모집중"}
                      </span>
                    )}
                    {isCompanionPost && <small className="community-location-label"><LocationIcon />{p.place}</small>}
                  </div>
                  {isCompanionPost && (
                    <div className="community-card-participants">
                      <ParticipantAvatarStack current={p.current} max={p.max} />
                      <strong>{p.current}/{p.max}명</strong>
                    </div>
                  )}
                </div>
                <h2>{p.title}</h2>
                <p className="card-preview">{p.content}</p>
                <div className="community-list-card-foot">
                  {isCompanionPost && <span>{createdRelative ? `작성 ${createdRelative}` : "작성일 미정"}</span>}
                  <span className="community-card-stats">
                    <span><CommunityStatIcon type="comments" />{p.comments}</span>
                    <span><CommunityStatIcon type="views" />{p.views}</span>
                  </span>
                </div>
              </div>
            </article>
            );
          })}
          </div>
          {totalPages > 1 && status !== "loading" && status !== "error" && (
            <nav className="community-pagination" aria-label={`${tab} 게시판 페이지 이동`}>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map(pageNumber => (
                <button
                  key={pageNumber}
                  type="button"
                  className={currentPage === pageNumber ? "active" : ""}
                  onClick={() => handlePageChange(pageNumber)}
                >
                  {pageNumber}
                </button>
              ))}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 게시글 상세 ──────────────────────────────────────────────────────
export function CommunityPostPage({ post: initialPost, onBack, onEdit, onDeleted, showToast, user, onChatRoom, onPlaceClick, onFestivalClick }) {
  const [post, setPost] = useState(initialPost);
  const [comments, setComments] = useState([]);
  const [input, setInput] = useState("");
  const [joinState, setJoinState] = useState("idle");
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [existingRoom, setExistingRoom] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [commentActionId, setCommentActionId] = useState(null);
  const [repliesByComment, setRepliesByComment] = useState({});
  const [loadingRepliesId, setLoadingRepliesId] = useState(null);
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyInput, setReplyInput] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [targetDetail, setTargetDetail] = useState(null);
  const [targetStatus, setTargetStatus] = useState("idle");

  useEffect(() => {
    const resetScroll = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      document.querySelector(".shell-main")?.scrollTo?.({ top: 0, left: 0, behavior: "auto" });
      document.querySelector(".app-shell")?.scrollTo?.({ top: 0, left: 0, behavior: "auto" });
    };

    resetScroll();
    const frame = window.requestAnimationFrame(resetScroll);
    return () => window.cancelAnimationFrame(frame);
  }, [initialPost?.id]);

  useEffect(() => {
    let ignore = false;
    setPost(initialPost);
    setRepliesByComment({});
    setEditingCommentId(null);
    setEditingCommentText("");
    setReplyTarget(null);
    setReplyInput("");

    if (!initialPost?.id) return () => { ignore = true; };

    fetchCommunityPostDetail(initialPost.id, initialPost.type)
      .then((detail) => {
        if (!ignore && detail) setPost(detail);
      })
      .catch((error) => {
        if (!ignore) showToast?.(getApiErrorHint(error));
      });

    return () => { ignore = true; };
  }, [initialPost?.id, initialPost?.type]);

  const targetLookup = normalizeCompanionTarget(post);

  useEffect(() => {
    if (post?.type !== "동행" || !targetLookup.id) return undefined;

    let ignore = false;
    Promise.resolve().then(() => {
      if (ignore) return;
      setTargetDetail(null);
      setTargetStatus("loading");
    });
    fetchCompanionTarget(targetLookup)
      .then((detail) => {
        if (ignore) return;
        setTargetDetail(detail);
        setTargetStatus(detail ? "success" : "empty");
      })
      .catch(() => {
        if (ignore) return;
        setTargetDetail(null);
        setTargetStatus("error");
    });
    return () => { ignore = true; };
  }, [post?.id, post?.type, targetLookup.type, targetLookup.id]);

  useEffect(() => {
    if (!post?.id) {
      setComments([]);
      return undefined;
    }
    let ignore = false;
    let loading = false;

    const loadComments = ({ silent = false } = {}) => {
      if (loading) return;
      loading = true;
      fetchCommunityComments(post.id, post.type)
        .then((data) => {
          if (ignore) return;
          setComments(data);
          setPost(prev => prev ? { ...prev, comments: data.length } : prev);
        })
        .catch(() => {
          if (!ignore && !silent) setComments([]);
        })
        .finally(() => {
          loading = false;
        });
    };

    loadComments();
    const intervalId = window.setInterval(() => {
      loadComments({ silent: true });
    }, 3000);

    return () => {
      ignore = true;
      window.clearInterval(intervalId);
    };
  }, [post?.id, post?.type]);

  useEffect(() => {
    if (!post?.id || post?.type !== "동행" || !user) {
      setJoinState("idle");
      return;
    }
    setJoinState(getCompanionJoinState({ postId: post.id, user }));
  }, [post?.id, post?.type, user?.userId, user?.email, user?.nickname]);

  useEffect(() => {
    if (!post?.id || post?.type !== "동행" || !isPostAuthor(post, user)) {
      setExistingRoom(null);
      return;
    }

    let ignore = false;
    const linkedRoomId = post.chatRoomId ?? post.roomId ?? post.chatRoom?.chatRoomId;
    if (linkedRoomId) {
      setExistingRoom(registerCompanionChatRoom({
        post,
        room: { chatRoomId: linkedRoomId, id: linkedRoomId },
        user,
      }));
      return () => { ignore = true; };
    }

    fetchMyChatRooms({ size: 100 })
      .then((rooms) => {
        if (ignore) return;
        const room = rooms.find((item) => String(item.postId) === String(post.id));
        setExistingRoom(room ? registerCompanionChatRoom({ post, room, user }) : null);
      })
      .catch(() => {
        if (!ignore) setExistingRoom(null);
      });

    return () => { ignore = true; };
  }, [post?.id, post?.type, post?.chatRoomId, post?.roomId, post?.writerId, post?.author, user?.userId, user?.nickname]);

  const sendComment = async () => {
    if (!input.trim()) return;
    let comment;
    try {
      comment = await createCommunityComment({ postId: post?.id, postType: post?.type, text: input });
    } catch (error) {
      showToast?.(getApiErrorHint(error));
      return;
    }
    setComments(prev => [...prev, comment]);
    setPost(prev => prev ? { ...prev, comments: (Number(prev.comments) || comments.length) + 1 } : prev);
    setInput("");
  };

  const isCommentOwner = (comment) => {
    if (!comment || !user) return false;
    return comment.writerId != null && user.userId != null && String(comment.writerId) === String(user.userId);
  };

  const startEditingComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.text);
  };

  const cancelEditingComment = () => {
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  const saveEditedComment = async (comment) => {
    const nextText = editingCommentText.trim();
    if (!nextText || commentActionId) return;
    setCommentActionId(comment.id);
    try {
      await updateComment(post.id, post.type, comment.id, nextText);
      setComments(prev => prev.map(item => item.id === comment.id ? { ...item, text: nextText, updatedAt: new Date().toISOString() } : item));
      setRepliesByComment(prev => Object.fromEntries(
        Object.entries(prev).map(([rootId, replies]) => [
          rootId,
          replies.map(item => item.id === comment.id ? { ...item, text: nextText, updatedAt: new Date().toISOString() } : item),
        ]),
      ));
      cancelEditingComment();
      showToast?.("댓글을 수정했습니다.");
    } catch (error) {
      showToast?.(getApiErrorHint(error));
    } finally {
      setCommentActionId(null);
    }
  };

  const removeComment = async (comment) => {
    if (commentActionId || !window.confirm("댓글을 삭제하시겠습니까?")) return;
    setCommentActionId(comment.id);
    try {
      await deleteComment(post.id, post.type, comment.id);
      setComments(prev => prev.filter(item => item.id !== comment.id));
      setRepliesByComment(prev => {
        const next = { ...prev };
        if (comment.parentCommentId) {
          next[comment.parentCommentId] = (next[comment.parentCommentId] ?? []).filter(item => item.id !== comment.id);
        } else {
          delete next[comment.id];
        }
        return next;
      });
      if (comment.parentCommentId) {
        setComments(prev => prev.map(item => item.id === comment.parentCommentId ? { ...item, replyCount: Math.max(0, item.replyCount - 1) } : item));
      }
      setPost(prev => prev ? { ...prev, comments: Math.max(0, (Number(prev.comments) || comments.length) - 1) } : prev);
      showToast?.("댓글을 삭제했습니다.");
    } catch (error) {
      showToast?.(getApiErrorHint(error));
    } finally {
      setCommentActionId(null);
    }
  };

  const toggleReplies = async (comment) => {
    if (repliesByComment[comment.id]) {
      setRepliesByComment(prev => {
        const next = { ...prev };
        delete next[comment.id];
        return next;
      });
      return;
    }
    setLoadingRepliesId(comment.id);
    try {
      const replies = await fetchReplies(post.id, post.type, comment.id);
      setRepliesByComment(prev => ({ ...prev, [comment.id]: replies }));
    } catch (error) {
      showToast?.(getApiErrorHint(error));
    } finally {
      setLoadingRepliesId(null);
    }
  };

  const openReplyInput = async (comment, rootCommentId = comment.id) => {
    setReplyTarget({
      rootCommentId,
      targetCommentId: comment.id,
      author: comment.author,
      preview: comment.text,
    });
    setReplyInput("");
    if (!repliesByComment[rootCommentId]) {
      setLoadingRepliesId(rootCommentId);
      try {
        const replies = await fetchReplies(post.id, post.type, rootCommentId);
        setRepliesByComment(prev => ({ ...prev, [rootCommentId]: replies }));
      } catch (error) {
        showToast?.(getApiErrorHint(error));
      } finally {
        setLoadingRepliesId(null);
      }
    }
  };

  const sendReply = async () => {
    const text = replyInput.trim();
    if (!text || !replyTarget || sendingReply) return;
    setSendingReply(true);
    try {
      const reply = await createCommunityComment({
        postId: post.id,
        postType: post.type,
        text,
        parentCommentId: replyTarget.rootCommentId,
      });
      setRepliesByComment(prev => ({
        ...prev,
        [replyTarget.rootCommentId]: [...(prev[replyTarget.rootCommentId] ?? []), reply],
      }));
      setComments(prev => prev.map(item => item.id === replyTarget.rootCommentId ? { ...item, replyCount: item.replyCount + 1 } : item));
      setPost(prev => prev ? { ...prev, comments: (Number(prev.comments) || comments.length) + 1 } : prev);
      setReplyTarget(null);
      setReplyInput("");
    } catch (error) {
      showToast?.(getApiErrorHint(error));
    } finally {
      setSendingReply(false);
    }
  };

  const getPostReportTargetType = () => (post?.type === "동행" ? "POST_COMPANION" : "POST_FREE");

  const openPostReport = () => {
    if (!post?.id) {
      showToast?.("신고할 게시글 정보를 찾지 못했습니다.");
      return;
    }
    setReportTarget({
      targetType: getPostReportTargetType(),
      targetId: post.id,
      label: `${post.type} 게시글 "${post.title}"`,
    });
  };

  const handleDeletePost = async () => {
    if (deletingPost || !window.confirm("게시글을 삭제하시겠습니까? 삭제한 게시글은 복구할 수 없습니다.")) return;

    setDeletingPost(true);
    try {
      await deleteCommunityPost(post.id, post.type);
      showToast?.("게시글이 삭제되었습니다.");
      onDeleted?.();
    } catch (error) {
      showToast?.(getApiErrorHint(error));
    } finally {
      setDeletingPost(false);
    }
  };

  const openCommentReport = (comment) => {
    if (!comment?.id) {
      showToast?.("신고할 댓글 정보를 찾지 못했습니다.");
      return;
    }
    setReportTarget({
      targetType: "COMMENT",
      targetId: comment.id,
      label: `${comment.author || "작성자"}님의 댓글`,
    });
  };

  const submitReport = async ({ reason, description }) => {
    if (!reportTarget || reportSubmitting) return;
    setReportSubmitting(true);
    try {
      await createReport({
        targetType: reportTarget.targetType,
        targetId: reportTarget.targetId,
        reason,
        description,
      });
      setReportTarget(null);
      showToast?.("신고가 접수되었습니다.");
    } catch (error) {
      showToast?.(getApiErrorHint(error));
    } finally {
      setReportSubmitting(false);
    }
  };

  if (!post) {
    return (
      <div style={S.screen}>
        <div style={{ background: COLORS.primary, padding: "44px 16px 16px" }}>
          <span onClick={onBack} style={{ color: "#fff", fontSize: 20, cursor: "pointer" }}>←</span>
        </div>
        <div style={{ padding: 24 }}>
          <EmptyState
            icon="??"
            title="게시글을 찾을 수 없습니다."
            description="목록에서 게시글을 다시 선택해주세요."
            actionLabel="목록으로"
            onAction={onBack}
          />
        </div>
      </div>
    );
  }

  const isCompanion = post.type === "동행";
  const isClosed = isCompanion && isClosedCompanionPost(post);
  const isAuthor = isPostAuthor(post, user);
  const routeItems = post.route ?? [post.place, "주변 명소 둘러보기", "시장 먹거리 탐방"];
  const goodPoints = post.goodPoints ?? ["동선을 공유했어요", "여행 팁을 남겼어요", "주변 상권과 함께 보기 좋아요"];
  const meetingDateText = formatKoreanDate(post.meetingDate ?? post.date) || "일정 미정";
  const compactMeetingDateText = formatCompactDate(post.meetingDate ?? post.date) || "일정 미정";
  const createdDateTimeText = formatKoreanDateTime(post.createdAt ?? post.date) || "작성일 미정";
  const createdRelativeText = formatRelativeTime(post.createdAt ?? post.date);
  const companionAction = {
    idle: { label: "참여 신청하기", helper: "방장이 신청을 수락하면 채팅방에 참여할 수 있어요." },
    pending: { label: "승인 대기 중", helper: "참여 신청을 보냈습니다. 수락 알림을 기다려주세요." },
    approved: { label: "채팅방 입장", helper: "참여가 승인되었습니다. 번역 채팅으로 일정을 조율하세요." },
    rejected: { label: "다른 모집 보기", helper: "이번 모집은 어렵지만 다른 골목 동행을 찾아볼 수 있어요." },
  }[joinState];

  const handleCreateChatRoom = async () => {
    if (creatingRoom) return;
    setCreatingRoom(true);
    try {
      const room = await createChatRoom({
        postId: post.id,
        title: post.title,
        description: post.content,
        maxMembers: post.max,
      });
      const registeredRoom = registerCompanionChatRoom({ post, room, user });
      setExistingRoom(registeredRoom);
      showToast("동행 채팅방이 생성되었습니다.");
      onChatRoom?.({
        ...registeredRoom,
        lastMsg: registeredRoom.lastMsg || "동행 채팅방이 열렸습니다.",
      });
    } catch (error) {
      showToast(getApiErrorHint(error) || "채팅방 생성에 실패했습니다.");
    } finally {
      setCreatingRoom(false);
    }
  };

  const handleCompanionAction = () => {
    if (!isCompanion) {
      showToast("장소 상세 연결은 준비 중입니다.");
      return;
    }
    if (!user) {
      showToast("로그인 후 참여 신청을 보낼 수 있습니다.");
      return;
    }
    if (isAuthor) {
      if (existingRoom) {
        onChatRoom?.(existingRoom);
        return;
      }
      handleCreateChatRoom();
      return;
    }
    if (isClosed) {
      showToast("모집이 마감된 동행입니다.");
      return;
    }
    if (joinState === "idle") {
      submitCompanionJoinRequest({
        post,
        user,
        message: `${user?.nickname || user?.email || "여행자"} 님이 동행 참여를 신청했습니다.`,
      })
        .then(() => {
          setJoinState("pending");
          showToast("채팅방 참여 신청을 보냈습니다. 방장 신청 목록에서 확인할 수 있어요.");
        })
        .catch((error) => {
          showToast(getCompanionJoinErrorMessage(error));
        });
      return;
    }
    if (joinState === "pending") {
      showToast("아직 방장 승인을 기다리고 있습니다.");
      return;
    }
    if (joinState === "approved") {
      const room = getCompanionRoomForPost({ postId: post.id, user });
      if (room) {
        onChatRoom?.(room);
        return;
      }
      showToast("승인된 채팅방 정보를 찾지 못했습니다. 채팅 목록을 확인해주세요.");
      return;
    }
    setJoinState("idle");
  };

  const companionTarget = normalizeCompanionTarget(post);
  const rawTargetLatitude = targetDetail?.latitude ?? targetDetail?.lat;
  const rawTargetLongitude = targetDetail?.longitude ?? targetDetail?.lng;
  const targetPosition = {
    lat: rawTargetLatitude == null ? Number.NaN : Number(rawTargetLatitude),
    lng: rawTargetLongitude == null ? Number.NaN : Number(rawTargetLongitude),
  };
  const hasTargetPosition = Number.isFinite(targetPosition.lat) && Number.isFinite(targetPosition.lng);
  const openDirections = () => {
    const name = targetDetail?.name ?? companionTarget.name;
    const url = hasTargetPosition
      ? `https://map.kakao.com/link/to/${encodeURIComponent(name)},${targetPosition.lat},${targetPosition.lng}`
      : `https://map.kakao.com/?q=${encodeURIComponent(name)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };
  const openTargetDetail = () => {
    if (!companionTarget.id) {
      showToast?.("연결된 장소 정보를 찾지 못했습니다.");
      return;
    }
    const detail = targetDetail ?? {
      id: companionTarget.id,
      placeId: companionTarget.id,
      festivalId: companionTarget.id,
      name: companionTarget.name,
      targetType: companionTarget.type === "MARKET" ? "TRADITIONAL_MARKET" : companionTarget.type,
    };
    const detailWithImage = {
      ...detail,
      imageUrl: detail.imageUrl || detail.thumbnailUrl || getPlaceImageUrl(detail),
      thumbnailUrl: detail.thumbnailUrl || detail.imageUrl || getPlaceImageUrl(detail),
    };
    if (companionTarget.type === "FESTIVAL") {
      onFestivalClick?.(detailWithImage);
      return;
    }
    onPlaceClick?.(detailWithImage);
  };

  return (
    <div style={S.screen} className="community-detail-screen">
      <div className="community-detail-topbar">
        <button type="button" onClick={onBack}>← 목록으로</button>
        <div className="community-detail-topbar-actions">
          {isAuthor ? (
            <>
              <button type="button" onClick={() => onEdit?.(post)}>수정</button>
              <button type="button" className="danger" onClick={handleDeletePost} disabled={deletingPost}>
                {deletingPost ? "삭제 중..." : "삭제"}
              </button>
            </>
          ) : (
            <button type="button" onClick={openPostReport}>신고</button>
          )}
        </div>
      </div>

      <div style={S.scrollArea} className="community-detail-scroll">
        <div className="community-detail-layout">
          <article className="community-detail-main">
            <section className="community-detail-card community-detail-article">
              <div className="community-detail-meta">
                <span className={isCompanion ? "type-blue" : "type-green"}>{isCompanion ? "동행" : "자유"}</span>
                <span className="community-location-label"><LocationIcon />{post.place}</span>
                {isCompanion && <span className={`type-status ${isClosed ? "closed" : "open"}`}>{isClosed ? "마감" : "모집중"}</span>}
              </div>
              <h1>{post.title}</h1>
              <div className="community-detail-author">
                <CommunityProfileAvatar imageUrl={post.profileImageUrl} name={post.author} className="community-author-avatar" />
                <div className="community-author-copy">
                  <strong>{post.author}</strong>
                  <span>
                    {isCompanion && <>모임일 {compactMeetingDateText} · </>}
                    작성 {createdRelativeText || createdDateTimeText}
                  </span>
                </div>
                <div className="community-author-stats">
                  <span><CommunityStatIcon type="views" />{post.views}</span>
                  <span><CommunityStatIcon type="comments" />{comments.length}</span>
                </div>
              </div>
              <p className="community-detail-content">{post.content}</p>
              {!isCompanion && post.imageUrls?.length > 0 && (
                <div className="community-detail-images">
                  {post.imageUrls.map((imageUrl, index) => (
                    <img key={`${imageUrl}-${index}`} src={imageUrl} alt={`게시글 첨부 이미지 ${index + 1}`} loading="lazy" />
                  ))}
                </div>
              )}
            </section>

            {isCompanion ? (
              <section className="community-detail-card">
                <div className="community-section-title community-section-title-with-icon">
                  <DetailIcon type="route" />
                  예상 코스
                </div>
                <div className="community-route-web">
                  {routeItems.map((item, index) => (
                    <div key={`${item}-${index}`}>
                      <span>{index + 1}</span>
                      <strong>{item}</strong>
                    </div>
                  ))}
                </div>
                {post.tags?.length > 0 && (
                  <div className="community-tag-row">
                    {post.tags.map(tag => <span key={tag}>#{tag}</span>)}
                  </div>
                )}
              </section>
            ) : (
              <section className="community-detail-card">
                <div className="community-section-title">게시글 포인트</div>
                <div className="community-good-grid">
                  {goodPoints.map(point => <div key={point}>? {point}</div>)}
                </div>
                <div className="community-tip-box">
                  <strong>공유 팁</strong>
                  <p>{post.tip ?? "혼잡한 시간대를 피하면 더 여유롭게 둘러볼 수 있어요."}</p>
                </div>
              </section>
            )}

            <section className="community-detail-card community-comments-section">
              <div className="community-section-title">댓글 {comments.length}</div>
              {comments.length === 0 && (
                <EmptyState
                  icon="댓글"
                  title="아직 댓글이 없습니다."
                  description="첫 댓글로 동행 일정이나 궁금한 점을 남겨보세요."
                />
              )}
              {comments.map(c => {
                const replies = repliesByComment[c.id];
                const isEditing = editingCommentId === c.id;
                return (
                  <div key={c.id} className="community-comment-thread">
                    <div className="community-comment-card">
                      <div className="community-comment-head">
                        <CommunityProfileAvatar imageUrl={c.profileImageUrl} name={c.author} />
                        <strong>{c.author}</strong>
                        <span>{formatRelativeTime(c.time ?? c.createdAt) || "방금"}{wasCommentEdited(c) ? " · 수정됨" : ""}</span>
                        <div className="community-comment-actions">
                          {!c.deleted && <button type="button" onClick={() => openReplyInput(c)}>답글</button>}
                          {!c.deleted && isCommentOwner(c) ? (
                            <>
                              <button type="button" onClick={() => startEditingComment(c)}>수정</button>
                              <button type="button" className="danger" disabled={commentActionId === c.id} onClick={() => removeComment(c)}>삭제</button>
                            </>
                          ) : !c.deleted ? (
                            <button type="button" className="danger" onClick={() => openCommentReport(c)}>신고</button>
                          ) : null}
                        </div>
                      </div>
                      {isEditing ? (
                        <div className="community-comment-edit">
                          <input value={editingCommentText} maxLength={1000} onChange={(e) => setEditingCommentText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveEditedComment(c)} autoFocus />
                          <button type="button" onClick={() => saveEditedComment(c)} disabled={!editingCommentText.trim() || commentActionId === c.id}>저장</button>
                          <button type="button" className="subtle" onClick={cancelEditingComment}>취소</button>
                        </div>
                      ) : (
                        <p>{c.deleted ? "삭제된 댓글입니다." : c.text}</p>
                      )}
                      {c.replyCount > 0 && (
                        <button type="button" className="community-replies-toggle" disabled={loadingRepliesId === c.id} onClick={() => toggleReplies(c)}>
                          {loadingRepliesId === c.id ? "답글 불러오는 중..." : replies ? "답글 접기 ∧" : `답글 ${c.replyCount}개 보기 ?`}
                        </button>
                      )}
                    </div>
                    {replyTarget?.targetCommentId === c.id && (
                      <div className="community-reply-input">
                        <span><strong>{replyTarget.author}</strong>님에게 답글 · {replyTarget.preview}</span>
                        <div>
                          <input value={replyInput} maxLength={1000} onChange={(e) => setReplyInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendReply()} placeholder="답글을 입력하세요..." autoFocus />
                          <button type="button" onClick={sendReply} disabled={!replyInput.trim() || sendingReply}>{sendingReply ? "등록 중" : "등록"}</button>
                          <button type="button" className="subtle" onClick={() => { setReplyTarget(null); setReplyInput(""); }}>취소</button>
                        </div>
                      </div>
                    )}
                    {replies && (
                      <div className="community-replies">
                        {replies.length === 0 && <span className="community-replies-empty">표시할 대댓글이 없습니다.</span>}
                        {replies.map(reply => {
                          const isReplyEditing = editingCommentId === reply.id;
                          return (
                            <div key={reply.id} className="community-reply-thread">
                              <div className="community-comment-card community-reply-card">
                                <div className="community-comment-head">
                                  <CommunityProfileAvatar imageUrl={reply.profileImageUrl} name={reply.author} />
                                  <strong>{reply.author}</strong>
                                  <span>{formatRelativeTime(reply.time ?? reply.createdAt) || "방금"}{wasCommentEdited(reply) ? " · 수정됨" : ""}</span>
                                  <div className="community-comment-actions">
                                    {!reply.deleted && <button type="button" onClick={() => openReplyInput(reply, c.id)}>답글</button>}
                                    {!reply.deleted && isCommentOwner(reply) ? (
                                      <>
                                        <button type="button" onClick={() => startEditingComment(reply)}>수정</button>
                                        <button type="button" className="danger" disabled={commentActionId === reply.id} onClick={() => removeComment(reply)}>삭제</button>
                                      </>
                                    ) : !reply.deleted ? (
                                      <button type="button" className="danger" onClick={() => openCommentReport(reply)}>신고</button>
                                    ) : null}
                                  </div>
                                </div>
                                {isReplyEditing ? (
                                  <div className="community-comment-edit">
                                    <input value={editingCommentText} maxLength={1000} onChange={(e) => setEditingCommentText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveEditedComment(reply)} autoFocus />
                                    <button type="button" onClick={() => saveEditedComment(reply)} disabled={!editingCommentText.trim() || commentActionId === reply.id}>저장</button>
                                    <button type="button" className="subtle" onClick={cancelEditingComment}>취소</button>
                                  </div>
                                ) : (
                                  <p>{reply.deleted ? "삭제된 댓글입니다." : reply.text}</p>
                                )}
                              </div>
                              {replyTarget?.targetCommentId === reply.id && (
                                <div className="community-reply-input community-nested-reply-input">
                                  <span><strong>{replyTarget.author}</strong>님에게 답글 · {replyTarget.preview}</span>
                                  <div>
                                    <input value={replyInput} maxLength={1000} onChange={(e) => setReplyInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendReply()} placeholder="답글을 입력하세요..." autoFocus />
                                    <button type="button" onClick={sendReply} disabled={!replyInput.trim() || sendingReply}>{sendingReply ? "등록 중" : "등록"}</button>
                                    <button type="button" className="subtle" onClick={() => { setReplyTarget(null); setReplyInput(""); }}>취소</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="community-comment-input">
                <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendComment()} placeholder="댓글을 입력하세요..." />
                <button type="button" onClick={sendComment}>등록</button>
              </div>
            </section>
          </article>

          <aside className="community-detail-aside">
            {isCompanion && (
              <section className="community-detail-card community-participant-card">
                <div className="community-section-title-row">
                  <div className="community-section-title">참여자</div>
                  <strong>{post.current} / {post.max}명</strong>
                </div>
                <ParticipantAvatarStack current={post.current} max={post.max} hostLabel={post.author || "방장"} detailed />
                <button
                  type="button"
                  onClick={handleCompanionAction}
                  disabled={isAuthor ? creatingRoom : (isClosed || joinState === "pending")}
                >
                  {isAuthor
                    ? existingRoom
                      ? "채팅방 가기"
                      : (creatingRoom ? "채팅방 생성 중..." : "채팅방 생성")
                    : isClosed ? "모집 마감" : companionAction.label}
                </button>
                <p>{isAuthor
                  ? existingRoom
                    ? "채팅방에서 참여 신청과 동행 일정을 관리할 수 있어요."
                    : "채팅방을 생성하면 참여 신청을 관리할 수 있어요."
                  : companionAction.helper}</p>
              </section>
            )}

            <section className="community-detail-card community-summary-card">
              <div className="community-section-title">{isCompanion ? "모집 정보" : "게시글 요약"}</div>
              {isCompanion ? (
                <div className="community-info-grid">
                  <div><span>모임일</span><strong>{meetingDateText}</strong></div>
                  <div><span>시간</span><strong>{post.meetingTime ?? "시간 협의"}</strong></div>
                </div>
              ) : (
                <div className="community-info-grid">
                  <div><span>댓글</span><strong>{comments.length}</strong></div>
                  <div><span>장소</span><strong>{post.place}</strong></div>
                </div>
              )}
            </section>

            <section className="community-detail-card community-meeting-card">
              <div className="community-section-title">{isCompanion ? "만나는 곳" : "게시글 안내"}</div>
              {isCompanion ? (
                <div className="community-meeting-content">
                  <p className="community-meeting-point"><LocationIcon />{post.meetingPoint ?? `${companionTarget.name || post.place} 입구`}</p>
                  <StaticMeetingMap name={companionTarget.name} onOpen={openDirections} />
                  {targetStatus === "loading" && <p className="community-map-status">위치 정보를 불러오는 중입니다.</p>}
                  {targetStatus === "error" && <p className="community-map-status">좌표를 불러오지 못해 장소명으로 지도를 엽니다.</p>}
                  <div className="community-meeting-actions">
                    <button type="button" className="community-direction-action" onClick={openDirections} disabled={!companionTarget.name}>
                      <DetailIcon type="route" />
                      길찾기
                    </button>
                    <button type="button" className="community-detail-action" onClick={openTargetDetail} disabled={!companionTarget.id}>
                      <DetailIcon type="info" />
                      {companionTarget.type === "FESTIVAL" ? "축제 상세 보기" : companionTarget.type === "MARKET" ? "시장 상세 보기" : "장소 상세 보기"}
                    </button>
                  </div>
                </div>
              ) : (
                <p>장소 리뷰는 관광지/가게 상세 페이지에서 작성하고 확인하는 흐름으로 분리합니다.</p>
              )}
              {!isCompanion && <button type="button" onClick={handleCompanionAction}>관련 장소 보기</button>}
            </section>

            <section className={`community-detail-card community-side-panel ${isCompanion ? "companion-confirmation" : ""}`}>
              <div className="community-section-title community-section-title-with-icon">
                {isCompanion && <DetailIcon type="info" />}
                {isCompanion ? "참여 전 확인" : "자유 게시판 안내"}
              </div>
              {isCompanion ? (
                <div className="community-check-list">
                  <div><span>1</span><p>만나는 시간과 장소를 채팅방에서 한 번 더 확인하세요.</p></div>
                  <div><span>2</span><p>시장 결제나 예약이 필요하면 엽전 잔액을 미리 확인하세요.</p></div>
                  <div><span>3</span><p>초행길이라면 지도 탐색으로 주변 출구를 먼저 봐두면 좋아요.</p></div>
                </div>
              ) : (
                <div className="community-check-list">
                  <div><span>1</span><p>자유 게시판은 여행 질문, 팁, 일정 공유 중심으로 사용합니다.</p></div>
                  <div><span>2</span><p>관광지 리뷰는 상세 페이지에서 거래/방문 맥락과 함께 작성합니다.</p></div>
                  <div><span>3</span><p>동행이 필요하면 동행 게시판에서 모집글을 작성하세요.</p></div>
                </div>
              )}
            </section>
          </aside>
        </div>
      </div>
      <ReportDialog
        open={Boolean(reportTarget)}
        title="신고하기"
        targetLabel={reportTarget?.label}
        reasons={REPORT_REASONS}
        submitting={reportSubmitting}
        onSubmit={submitReport}
        onCancel={() => setReportTarget(null)}
      />
    </div>
  );
}

// ─── 게시글 작성 ──────────────────────────────────────────────────────
export function CommunityWritePage({ post: initialPost, initialType = "동행", onBack, onSaved, showToast }) {
  const isEditing = Boolean(initialPost?.id);
  const todayValue = toLocalDateValue(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [type, setType] = useState(initialPost?.type ?? initialType);
  const [form, setForm] = useState(() => ({
    title: initialPost?.title ?? "",
    content: initialPost?.content ?? "",
    place: initialPost?.place ?? initialPost?.placeName ?? "",
    placeId: initialPost?.placeId ?? null,
    targetType: initialPost?.targetType ?? (initialPost?.placeId ? "PLACE" : null),
    targetId: initialPost?.targetId ?? initialPost?.placeId ?? null,
    targetName: initialPost?.targetName ?? initialPost?.placeName ?? initialPost?.place ?? "",
    region: initialPost?.region ?? "",
    date: initialPost?.meetingDate ?? initialPost?.date ?? "",
    maxPeople: String(initialPost?.maxMembers ?? initialPost?.max ?? 4),
    imageUrls: initialPost?.imageUrls ?? [],
  }));
  const [placeQuery, setPlaceQuery] = useState(initialPost?.place ?? initialPost?.placeName ?? "");
  const [placeSource, setPlaceSource] = useState("search");
  const [placeResults, setPlaceResults] = useState([]);
  const [placeSearchStatus, setPlaceSearchStatus] = useState("idle");
  const [likedPlaces, setLikedPlaces] = useState([]);
  const [festivalResults, setFestivalResults] = useState([]);
  const [marketResults, setMarketResults] = useState([]);
  const [likedStatus, setLikedStatus] = useState("idle");
  const [festivalSearchStatus, setFestivalSearchStatus] = useState("idle");
  const [marketSearchStatus, setMarketSearchStatus] = useState("idle");
  const [submitting, setSubmitting] = useState(false);
  const [pendingImages, setPendingImages] = useState([]);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const existingImageUrls = Array.isArray(form.imageUrls) ? form.imageUrls : [];
  const totalImageCount = existingImageUrls.length + pendingImages.length;
  const quickMeetingDates = [
    { label: "오늘", value: todayValue },
    { label: "내일", value: toLocalDateValue(addLocalDays(new Date(), 1)) },
    { label: "이번 주말", value: toLocalDateValue(getUpcomingSaturday(new Date())) },
    { label: "다음 주말", value: toLocalDateValue(getUpcomingSaturday(new Date(), true)) },
  ];

  useEffect(() => {
    if (type !== "동행" || placeSource !== "search") {
      setPlaceResults([]);
      if (placeSource !== "search") setPlaceSearchStatus("idle");
      return;
    }

    const query = placeQuery.trim();
    if (query.length < 2) {
      setPlaceResults([]);
      setPlaceSearchStatus(query.length > 0 ? "too-short" : "idle");
      return;
    }

    let ignore = false;
    setPlaceSearchStatus("loading");
    const timer = setTimeout(() => {
      searchPlaces({ query, size: 8, track: false, source: "community-place-selector" })
        .then((places) => {
          if (ignore) return;
          setPlaceResults(places);
          setPlaceSearchStatus(places.length > 0 ? "success" : "empty");
        })
        .catch((error) => {
          if (ignore) return;
          setPlaceResults([]);
          setPlaceSearchStatus("error");
          console.error("Failed to search places for companion post", error);
        });
    }, 260);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [placeQuery, placeSource, type]);

  useEffect(() => {
    if (type !== "동행" || placeSource !== "festival") {
      setFestivalResults([]);
      if (placeSource !== "festival") setFestivalSearchStatus("idle");
      return;
    }

    const query = placeQuery.trim();
    if (query.length < 2) {
      setFestivalResults([]);
      setFestivalSearchStatus(query.length > 0 ? "too-short" : "idle");
      return;
    }

    let ignore = false;
    setFestivalSearchStatus("loading");
    const timer = setTimeout(() => {
      searchFestivals({ q: query, size: 8, source: "community-place-selector" })
        .then((page) => {
          if (ignore) return;
          const festivals = page.content ?? [];
          setFestivalResults(festivals);
          setFestivalSearchStatus(festivals.length > 0 ? "success" : "empty");
        })
        .catch((error) => {
          if (ignore) return;
          setFestivalResults([]);
          setFestivalSearchStatus("error");
          console.error("Failed to search festivals for companion post", error);
        });
    }, 260);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [placeQuery, placeSource, type]);

  useEffect(() => {
    if (type !== "동행" || placeSource !== "market") {
      setMarketResults([]);
      if (placeSource !== "market") setMarketSearchStatus("idle");
      return;
    }

    const query = placeQuery.trim();
    if (query.length < 2) {
      setMarketResults([]);
      setMarketSearchStatus(query ? "too-short" : "idle");
      return;
    }

    let ignore = false;
    setMarketSearchStatus("loading");
    const timer = setTimeout(() => {
      searchUnifiedPage({ query, size: 20 })
        .then((page) => {
          if (ignore) return;
          const markets = (page.content ?? [])
            .filter(item => item.targetType === "MARKET" || item.type === "전통시장" || item.marketId != null)
            .slice(0, 8);
          setMarketResults(markets);
          setMarketSearchStatus(markets.length > 0 ? "success" : "empty");
        })
        .catch((error) => {
          if (ignore) return;
          setMarketResults([]);
          setMarketSearchStatus("error");
          console.error("Failed to search markets for companion post", error);
        });
    }, 260);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [placeQuery, placeSource, type]);

  useEffect(() => {
    if (type !== "동행" || placeSource !== "liked") return;

    let ignore = false;
    setLikedStatus("loading");
    fetchWishlist()
      .then((places) => {
        if (ignore) return;
        setLikedPlaces(places);
        setLikedStatus(places.length > 0 ? "success" : "empty");
      })
      .catch((error) => {
        if (ignore) return;
        setLikedPlaces([]);
        setLikedStatus("error");
        console.error("Failed to load liked places for companion post", error);
      });

    return () => {
      ignore = true;
    };
  }, [placeSource, type]);
  const getPlaceRegion = (place) => {
    const rawRegion = place.region ?? place.addr ?? place.address ?? "";
    return String(rawRegion).trim().split(/\s+/).slice(0, 2).join(" ").slice(0, 50);
  };

  const handleSelectPlace = (place, source = "place") => {
    const placeName = place.name || place.placeName || "";
    const isFestival = source === "festival";
    const isMarket = !isFestival && (place.targetType === "MARKET" || place.targetType === "TRADITIONAL_MARKET" || place.marketId != null);
    const targetType = isFestival ? "FESTIVAL" : isMarket ? "MARKET" : "PLACE";
    const targetId = isFestival ? (place.festivalId ?? place.id) : isMarket ? (place.marketId ?? place.id) : (place.placeId ?? place.id);
    setForm(f => ({
      ...f,
      place: placeName,
      placeId: targetType === "PLACE" ? targetId : null,
      targetType,
      targetId,
      targetName: placeName,
      region: getPlaceRegion(place),
      festivalStartDate: isFestival ? (place.startDate ?? "") : "",
      festivalEndDate: isFestival ? (place.endDate ?? "") : "",
    }));
    setPlaceQuery(placeName);
    setPlaceResults([]);
    setFestivalResults([]);
    setMarketResults([]);
    setPlaceSearchStatus("selected");
    setFestivalSearchStatus("selected");
    setMarketSearchStatus("selected");
  };

  const handleTypeChange = (nextType) => {
    if (isEditing) return;
    setType(nextType);
    if (nextType === "자유") {
      setForm(f => ({
        ...f,
        place: "",
        placeId: null,
        targetType: null,
        targetId: null,
        targetName: "",
        region: "",
        date: "",
        festivalStartDate: "",
        festivalEndDate: "",
      }));
      setPlaceQuery("");
      setPlaceResults([]);
      setFestivalResults([]);
      setMarketResults([]);
      setPlaceSearchStatus("idle");
      setFestivalSearchStatus("idle");
      setMarketSearchStatus("idle");
    }
  };

  const handleFreePostImageSelect = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length === 0) return;

    const availableSlots = Math.max(0, 5 - totalImageCount);
    if (availableSlots === 0) {
      showToast("자유게시글 이미지는 최대 5장까지 첨부할 수 있습니다.");
      return;
    }

    const accepted = [];
    for (const file of files.slice(0, availableSlots)) {
      if (!FREE_POST_IMAGE_TYPES.includes(file.type)) {
        showToast("이미지는 JPG, PNG, WebP 파일만 추가할 수 있습니다.");
        continue;
      }
      if (file.size > FREE_POST_IMAGE_MAX_SIZE) {
        showToast("이미지는 장당 10MB 이하만 추가할 수 있습니다.");
        continue;
      }
      try {
        accepted.push({
          id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(16).slice(2)}`,
          file,
          name: file.name,
          previewUrl: await createFreePostImagePreview(file),
        });
      } catch {
        showToast("이미지를 미리보기로 불러오지 못했습니다.");
      }
    }

    if (files.length > availableSlots) {
      showToast("자유게시글 이미지는 최대 5장까지 첨부할 수 있습니다.");
    }

    if (accepted.length > 0) {
      setPendingImages(current => [...current, ...accepted]);
    }
  };

  const removeExistingImage = (imageUrl) => {
    set("imageUrls", existingImageUrls.filter(item => item !== imageUrl));
  };

  const removePendingImage = (imageId) => {
    setPendingImages(current => current.filter(item => item.id !== imageId));
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!form.title || !form.content) { showToast("제목과 내용을 입력해주세요."); return; }
    if (type === "동행") {
      if (!form.place) { showToast("동행할 장소나 축제를 선택해주세요."); return; }
      if (!form.targetType || !form.targetId) { showToast("검색 결과에서 만나는 곳을 다시 선택해주세요."); return; }
      if (!form.date) { showToast("모임 날짜를 선택해주세요."); return; }
      if (form.date < todayValue) { showToast("오늘 이후 날짜를 선택해주세요."); return; }
    }
    setSubmitting(true);
    try {
      const uploadedImageKeys = type === "자유" && pendingImages.length > 0
        ? await Promise.all(pendingImages.map(async (image) => {
            const uploaded = await uploadFreePostImage(image.file);
            if (!uploaded.key) throw new Error("이미지 업로드 응답에 저장 키가 없습니다.");
            return uploaded.key;
          }))
        : [];
      const submitForm = type === "동행"
        ? form
        : {
            title: form.title,
            content: form.content,
            imageUrls: [...existingImageUrls, ...uploadedImageKeys].filter(Boolean).slice(0, 5),
          };
      const responsePost = isEditing
        ? await updateCommunityPost(initialPost.id, type, submitForm)
        : await createCommunityPost({ type, ...submitForm });
      const savedPost = isEditing ? { ...initialPost, ...responsePost } : responsePost;
      showToast(isEditing ? "게시글이 수정되었습니다." : "게시글이 등록되었습니다! ??");
      if (onSaved) {
        onSaved(savedPost);
      } else {
        setTimeout(onBack, 1200);
      }
    } catch (error) {
      showToast(getApiErrorHint(error));
      return;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={S.screen}>
      <div style={{ background: COLORS.primary, padding: "44px 16px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span onClick={onBack} style={{ color: "#fff", fontSize: 20, cursor: "pointer" }}>←</span>
          <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>{isEditing ? "게시글 수정" : "게시글 작성"}</span>
        </div>
      </div>
      <div style={{ ...S.scrollArea, padding: 20 }}>
        {/* 게시판 선택 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.textMuted, marginBottom: 10 }}>게시판 선택</div>
          <div style={{ display: "flex", gap: 10 }}>
            {["동행", "자유"].map(t => (
              <div key={t} onClick={() => handleTypeChange(t)} style={{ flex: 1, background: type === t ? COLORS.primary : "#fff", borderRadius: 12, padding: "12px 0", textAlign: "center", fontWeight: 700, fontSize: 14, cursor: isEditing ? "default" : "pointer", opacity: isEditing && type !== t ? 0.45 : 1, color: type === t ? "#fff" : COLORS.textMuted, border: `1.5px solid ${type === t ? COLORS.primary : "rgba(0,0,0,0.08)"}` }}>
                {t === "동행" ? "동행 게시판" : "자유 게시판"}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.textMuted, marginBottom: 8 }}>제목</div>
            <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="제목을 입력하세요" style={{ width: "100%", background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 12, padding: "12px 16px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.textMuted, marginBottom: 8 }}>내용</div>
            <textarea value={form.content} onChange={e => set("content", e.target.value)} placeholder="내용을 입력하세요" rows={5} style={{ width: "100%", background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 12, padding: "12px 16px", fontSize: 14, outline: "none", resize: "none", boxSizing: "border-box" }} />
          </div>
          {type === "동행" && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.textMuted, marginBottom: 8 }}>만나는 곳</div>
              <div className="community-place-search">
                <div className="community-place-source-tabs" aria-label="장소 선택 방식">
                  {[
                    { key: "search", label: "관광지 검색" },
                    { key: "market", label: "전통시장 검색" },
                    { key: "liked", label: "찜한 관광지" },
                    { key: "festival", label: "축제 검색" },
                  ].map(option => (
                    <button
                      key={option.key}
                      type="button"
                      className={placeSource === option.key ? "active" : ""}
                      onClick={() => {
                        setPlaceSource(option.key);
                        setPlaceResults([]);
                        setFestivalResults([]);
                        setMarketResults([]);
                        setPlaceSearchStatus("idle");
                        setFestivalSearchStatus("idle");
                        setMarketSearchStatus("idle");
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {placeSource !== "liked" && (
                  <input
                    value={placeQuery}
                    onChange={(e) => {
                      setPlaceQuery(e.target.value);
                      setForm(f => ({ ...f, place: "", placeId: null, targetType: null, targetId: null, targetName: "", region: "" }));
                    }}
                    placeholder={placeSource === "festival" ? "축제 이름을 2자 이상 검색하세요" : placeSource === "market" ? "전통시장 이름을 2자 이상 검색하세요" : "관광지 이름을 2자 이상 검색하세요"}
                    style={{ width: "100%", background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 12, padding: "12px 16px", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  />
                )}
                {form.place && (
                  <div className="community-selected-place">
                    <span>선택됨</span>
                    <strong>{form.place}</strong>
                    <button type="button" onClick={() => {
                      setForm(f => ({ ...f, place: "", placeId: null, targetType: null, targetId: null, targetName: "", festivalStartDate: "", festivalEndDate: "" }));
                      setPlaceQuery("");
                      setPlaceResults([]);
                      setFestivalResults([]);
                      setMarketResults([]);
                      setPlaceSearchStatus("idle");
                      setFestivalSearchStatus("idle");
                      setMarketSearchStatus("idle");
                    }}>변경</button>
                    {form.festivalEndDate && (
                      <em className="community-selected-festival-period">
                        축제 기간 {formatFestivalRange(form.festivalStartDate, form.festivalEndDate)}
                      </em>
                    )}
                  </div>
                )}
                {!form.place && (
                <>
                {placeSource === "search" && placeSearchStatus === "loading" && <div className="community-place-search-note">관광지를 검색하는 중입니다.</div>}
                {placeSource === "search" && placeSearchStatus === "too-short" && <div className="community-place-search-note">2자 이상 입력하면 검색 결과가 표시됩니다.</div>}
                {placeSource === "search" && placeSearchStatus === "empty" && <div className="community-place-search-note">검색 결과가 없습니다. 다른 이름으로 검색해보세요.</div>}
                {placeSource === "search" && placeSearchStatus === "error" && <div className="community-place-search-note error">관광지 검색을 불러오지 못했습니다.</div>}
                {placeSource === "festival" && festivalSearchStatus === "loading" && <div className="community-place-search-note">축제를 검색하는 중입니다.</div>}
                {placeSource === "festival" && festivalSearchStatus === "too-short" && <div className="community-place-search-note">2자 이상 입력하면 검색 결과가 표시됩니다.</div>}
                {placeSource === "festival" && festivalSearchStatus === "empty" && <div className="community-place-search-note">검색 결과가 없습니다. 다른 이름으로 검색해보세요.</div>}
                {placeSource === "festival" && festivalSearchStatus === "error" && <div className="community-place-search-note error">축제 검색을 불러오지 못했습니다.</div>}
                {placeSource === "market" && marketSearchStatus === "loading" && <div className="community-place-search-note">전통시장을 검색하는 중입니다.</div>}
                {placeSource === "market" && marketSearchStatus === "too-short" && <div className="community-place-search-note">2자 이상 입력하면 검색 결과가 표시됩니다.</div>}
                {placeSource === "market" && marketSearchStatus === "empty" && <div className="community-place-search-note">검색 결과가 없습니다. 다른 시장 이름으로 검색해보세요.</div>}
                {placeSource === "market" && marketSearchStatus === "error" && <div className="community-place-search-note error">전통시장 검색을 불러오지 못했습니다.</div>}
                {placeSource === "liked" && likedStatus === "loading" && <div className="community-place-search-note">찜한 관광지를 불러오는 중입니다.</div>}
                {placeSource === "liked" && likedStatus === "empty" && <div className="community-place-search-note">아직 찜한 관광지가 없습니다.</div>}
                {placeSource === "liked" && likedStatus === "error" && <div className="community-place-search-note error">찜한 관광지를 불러오지 못했습니다.</div>}
                {placeSource === "search" && placeResults.length > 0 && (
                  <div className="community-place-result-list">
                    {placeResults.map((place) => (
                      <button key={place.placeId ?? place.id} type="button" onClick={() => handleSelectPlace(place)}>
                        <strong>{place.name}</strong>
                        <span>{place.addr || place.address || place.type || "관광지"}</span>
                      </button>
                    ))}
                  </div>
                )}
                {placeSource === "liked" && likedPlaces.length > 0 && (
                  <div className="community-place-result-list">
                    {likedPlaces.map((place) => (
                      <button key={place.placeId ?? place.id} type="button" onClick={() => handleSelectPlace(place)}>
                        <strong>{place.name}</strong>
                        <span>{place.addr || place.address || place.type || "찜한 관광지"}</span>
                      </button>
                    ))}
                  </div>
                )}
                {placeSource === "market" && marketResults.length > 0 && (
                  <div className="community-place-result-list">
                    {marketResults.map((market) => (
                      <button key={market.marketId ?? market.placeId ?? market.id} type="button" onClick={() => handleSelectPlace(market, "market")}>
                        <strong>{market.name}</strong>
                        <span>{market.address || market.location || market.type || "전통시장"}</span>
                      </button>
                    ))}
                  </div>
                )}
                {placeSource === "festival" && festivalResults.length > 0 && (
                  <div className="community-place-result-list">
                    {festivalResults.map((festival) => (
                      <button key={festival.festivalId ?? festival.id} type="button" onClick={() => handleSelectPlace(festival, "festival")}>
                        <strong>{festival.name}</strong>
                        <span>{festival.address || festival.location || festival.date || "축제"}</span>
                      </button>
                    ))}
                  </div>
                )}
                </>
                )}
              </div>
          </div>
          )}
          {type === "동행" && (
            <>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.textMuted, marginBottom: 8 }}>모임 날짜</div>
                <div className="community-date-picker">
                  <div className="community-date-quick-options" aria-label="빠른 날짜 선택">
                    {quickMeetingDates.map(option => (
                      <button
                        key={option.label}
                        type="button"
                        className={form.date === option.value ? "active" : ""}
                        onClick={() => set("date", option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className={`community-date-display ${form.date ? "selected" : ""}`}
                    onClick={() => setCalendarOpen(true)}
                  >
                    <span className="community-date-calendar-icon" aria-hidden="true">▣</span>
                    <span>
                      <small>{form.date ? "선택한 모임 날짜" : "직접 날짜 선택"}</small>
                      <strong>{formatMeetingDate(form.date)}</strong>
                    </span>
                    <em>달력 열기</em>
                  </button>
                  <p className="community-date-help">과거 날짜는 선택할 수 없어요. 참여자가 확인할 수 있도록 확정된 날짜를 선택해주세요.</p>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.textMuted, marginBottom: 8 }}>최대 인원</div>
                <select value={form.maxPeople} onChange={e => set("maxPeople", e.target.value)} style={{ width: "100%", background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 12, padding: "12px 16px", fontSize: 14, outline: "none", boxSizing: "border-box" }}>
                  {["2", "3", "4", "5", "6", "7", "8"].map(n => <option key={n} value={n}>{n}명</option>)}
                </select>
              </div>
            </>
          )}
          {type === "자유" && (
            <div className="community-free-image-field">
              <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.textMuted, marginBottom: 8 }}>사진 추가 ({totalImageCount}/5)</div>
              <label className={totalImageCount >= 5 || submitting ? "disabled" : ""}>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  disabled={totalImageCount >= 5 || submitting}
                  onChange={handleFreePostImageSelect}
                />
                <div>
                  <span>📷</span>
                  <strong>이미지 파일 선택</strong>
                  <small>JPG, PNG, WebP · 장당 10MB · 최대 5장</small>
                </div>
              </label>
              {totalImageCount > 0 && (
                <div className="community-free-image-list">
                  {existingImageUrls.map((imageUrl, index) => (
                    <figure key={`${imageUrl}-${index}`}>
                      <img src={imageUrl} alt={`기존 첨부 이미지 ${index + 1}`} />
                      <button type="button" onClick={() => removeExistingImage(imageUrl)} disabled={submitting}>삭제</button>
                    </figure>
                  ))}
                  {pendingImages.map((image, index) => (
                    <figure key={image.id}>
                      <img src={image.previewUrl} alt={`새 첨부 이미지 ${index + 1}`} />
                      <button type="button" onClick={() => removePendingImage(image.id)} disabled={submitting}>삭제</button>
                    </figure>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="community-write-actions">
            <button type="button" onClick={handleSubmit} disabled={submitting}>
              {submitting ? (isEditing ? "수정 중..." : "등록 중...") : (isEditing ? "수정 완료" : "게시글 등록")}
            </button>
          </div>
        </div>
      </div>
      <HanokCalendarModal
        open={calendarOpen}
        value={form.date}
        min={todayValue}
        onClose={() => setCalendarOpen(false)}
        onConfirm={(date) => {
          set("date", date);
          setCalendarOpen(false);
        }}
      />
    </div>
  );
}
