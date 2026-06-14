import { useEffect, useState } from "react";
import { COLORS, S } from "../../constants/colors.js";
import { EmptyState, ErrorState, ReportDialog, SkeletonList } from "../../components/common";
import { getApiErrorHint } from "../../services/apiClient.js";
import { createChatRoom, fetchMyChatRooms, getCompanionJoinState, getCompanionRoomForPost, registerCompanionChatRoom, submitCompanionJoinRequest } from "../../services/chatService.js";
import { createCommunityComment, createCommunityPost, fetchCommunityComments, fetchCommunityPostDetail, fetchCommunityPosts } from "../../services/communityService.js";
import { createReport, REPORT_REASONS } from "../../services/reportService.js";
import { searchPlaces } from "../../services/searchService.js";

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
  if (diffDays < 7) return `${diffDays}일 전`;
  return formatCompactDate(value);
}

function isClosedCompanionPost(post) {
  const status = String(post?.status ?? "").toUpperCase();
  return ["CLOSED", "HIDDEN", "DELETED"].includes(status)
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
  if (post.writerId && user.userId) return String(post.writerId) === String(user.userId);
  return Boolean(post.author && user.nickname && post.author === user.nickname);
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

function ParticipantAvatarStack({ current = 1, max = 4, hostLabel = "방장", detailed = false }) {
  const safeCurrent = Math.max(1, Number(current) || 1);
  const safeMax = Math.max(safeCurrent, Number(max) || 4);
  const visibleSlots = Math.min(safeMax, detailed ? 8 : 4);

  return (
    <div className={`community-participant-stack ${detailed ? "detailed" : ""}`} aria-label={`${safeCurrent}/${safeMax}명 참여 중`}>
      {Array.from({ length: visibleSlots }, (_, index) => {
        const occupied = index < safeCurrent;
        const isHost = index === 0;
        return (
          <span
            key={`${occupied ? "participant" : "empty"}-${index}`}
            className={`${occupied ? "occupied" : "empty"} ${isHost ? "host" : ""}`}
            title={isHost ? hostLabel : occupied ? `참여자 ${index + 1}` : "빈 자리"}
          >
            {occupied ? (isHost ? "방" : "여") : "+"}
          </span>
        );
      })}
      {safeMax > visibleSlots && detailed && <small>+{safeMax - visibleSlots}</small>}
    </div>
  );
}

// ─── 커뮤니티 목록 ────────────────────────────────────────────────────
export function CommunityListPage({ onPost, onWrite, onBack }) {
  const [tab, setTab] = useState("동행");
  const [scope, setScope] = useState("전체");
  const [sort, setSort] = useState("latest");
  const [posts, setPosts] = useState([]);
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

  const loadPosts = () => {
    setStatus("loading");
    setErrorMessage("");
    fetchCommunityPosts()
      .then((data) => {
        setPosts(data);
        setStatus(data.length > 0 ? "success" : "empty");
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

  return (
    <div style={S.screen} className="community-list-screen">
      <div className="community-list-hero">
        <div>
          <button type="button" onClick={onBack} aria-label="뒤로 가기">←</button>
          <span>LOCAL COMPANION</span>
          <h1>같이 걸을 골목 친구를 찾아보세요.</h1>
          <p>동행 모집과 여행 이야기를 한 곳에서 나눠보세요.</p>
        </div>
        <button type="button" onClick={onWrite}>글쓰기</button>
      </div>
      <div className="community-list-tabs">
        {["동행", "자유"].map(t => (
          <button key={t} type="button" onClick={() => { setTab(t); setScope("전체"); setSort("latest"); }} className={tab === t ? "active" : ""}>
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
              onAction={onWrite}
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
          {filtered.map(p => {
            const isCompanionPost = p.type === "동행";
            const closed = isCompanionPost && isClosedCompanionPost(p);
            const dateParts = getMeetingDateParts(p.meetingDate ?? p.date);
            const createdRelative = formatRelativeTime(p.createdAt ?? p.date);

            return (
            <article key={p.id} onClick={() => onPost(p)} className={`community-list-card ${closed ? "closed" : ""}`}>
              <div className={`community-date-block ${closed ? "closed" : ""}`}>
                <small>{dateParts.month}</small>
                <strong>{dateParts.day}</strong>
              </div>
              <div className="community-list-card-body">
                <div className="community-list-card-head">
                  <div>
                    <span className={isCompanionPost ? (closed ? "closed" : "open") : "free"}>
                      {isCompanionPost ? (closed ? "마감" : "모집중") : "자유"}
                    </span>
                    <small className="community-location-label"><LocationIcon />{p.place}</small>
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
                  <span>{createdRelative ? `작성 ${createdRelative}` : "작성일 미정"}</span>
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
        </div>
      </div>
    </div>
  );
}

// ─── 게시글 상세 ──────────────────────────────────────────────────────
export function CommunityPostPage({ post: initialPost, onBack, showToast, user, onChatRoom, onPlaceClick }) {
  const [post, setPost] = useState(initialPost);
  const [comments, setComments] = useState([]);
  const [input, setInput] = useState("");
  const [joinState, setJoinState] = useState("idle");
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [existingRoom, setExistingRoom] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);

  useEffect(() => {
    let ignore = false;
    setPost(initialPost);

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
            icon="💬"
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

  const handlePlaceMap = async () => {
    const placeId = post?.placeId ?? post?.place?.placeId;
    if (!placeId) {
      showToast?.("연결된 관광지 정보를 찾지 못했습니다.");
      return;
    }
    const basePlace = {
      placeId,
      id: placeId,
      name: post.placeName ?? post.place,
    };

    try {
      const results = await searchPlaces({
        query: basePlace.name,
        size: 8,
        track: false,
        source: "community-place-link",
      });
      const matchedPlace = results.find((item) => String(item.placeId ?? item.id) === String(placeId))
        ?? results.find((item) => item.name === basePlace.name);
      onPlaceClick?.({ ...matchedPlace, ...basePlace });
    } catch {
      onPlaceClick?.(basePlace);
    }
  };

  return (
    <div style={S.screen} className="community-detail-screen">
      <div className="community-detail-topbar">
        <button type="button" onClick={onBack}>← 목록으로</button>
        {!isAuthor && <button type="button" onClick={openPostReport}>신고</button>}
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
                <div className="community-author-avatar">{String(post.author || "여").slice(0, 1)}</div>
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
              {!isCompanion && <div className="community-review-write-note">관광지/가게 리뷰 작성은 각 상세 페이지에서만 가능합니다.</div>}
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
                  {goodPoints.map(point => <div key={point}>✅ {point}</div>)}
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
              {comments.map(c => (
                <div key={c.id} className="community-comment-card">
                  <div className="community-comment-head">
                    <div>👤</div>
                    <strong>{c.author}</strong>
                    <span>{formatKoreanDateTime(c.time ?? c.createdAt) || "방금 전"}</span>
                    <button type="button" className="community-comment-report" onClick={() => openCommentReport(c)}>신고</button>
                  </div>
                  <p>{c.text}</p>
                </div>
              ))}
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
                  disabled={!isAuthor && (isClosed || joinState === "pending")}
                >
                  {isAuthor
                    ? existingRoom
                      ? "채팅방으로 이동"
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
                  <div><span>언어</span><strong>{post.language ?? "한국어"}</strong></div>
                  <div><span>작성일</span><strong>{createdDateTimeText}</strong></div>
                </div>
              ) : (
                <div className="community-info-grid">
                  <div><span>댓글</span><strong>{comments.length}</strong></div>
                  <div><span>작성일</span><strong>{createdDateTimeText}</strong></div>
                  <div><span>분류</span><strong>자유 게시판</strong></div>
                  <div><span>장소</span><strong>{post.place}</strong></div>
                </div>
              )}
            </section>

            <section className="community-detail-card community-meeting-card">
              <div className="community-section-title">{isCompanion ? "만나는 곳" : "게시글 안내"}</div>
              {isCompanion ? (
                <div className="community-meeting-place-row">
                  <p className="community-meeting-point"><LocationIcon />{post.meetingPoint ?? `${post.place} 입구`}</p>
                  <button type="button" className="community-map-action" onClick={handlePlaceMap}>
                    <LocationIcon type="map" />
                    지도에서 보기
                  </button>
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
export function CommunityWritePage({ onBack, showToast }) {
  const [type, setType] = useState("동행");
  const [form, setForm] = useState({ title: "", content: "", place: "", placeId: null, region: "", date: "", maxPeople: "4" });
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeResults, setPlaceResults] = useState([]);
  const [placeSearchStatus, setPlaceSearchStatus] = useState("idle");
  const [submitting, setSubmitting] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (type !== "동행") {
      setPlaceResults([]);
      setPlaceSearchStatus("idle");
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
  }, [placeQuery, type]);

  const getPlaceRegion = (place) => {
    const rawRegion = place.region ?? place.addr ?? place.address ?? "";
    return String(rawRegion).trim().split(/\s+/).slice(0, 2).join(" ").slice(0, 50);
  };

  const handleSelectPlace = (place) => {
    const placeName = place.name || place.placeName || "";
    setForm(f => ({
      ...f,
      place: placeName,
      placeId: place.placeId ?? place.id,
      region: getPlaceRegion(place),
    }));
    setPlaceQuery(placeName);
    setPlaceResults([]);
    setPlaceSearchStatus("selected");
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!form.title || !form.content) { showToast("제목과 내용을 입력해주세요."); return; }
    if (type === "동행") {
      if (!form.placeId || !form.place) { showToast("동행할 관광지를 검색해서 선택해주세요."); return; }
      if (!form.date) { showToast("모임 날짜를 선택해주세요."); return; }
    }
    setSubmitting(true);
    try {
      await createCommunityPost({ type, ...form });
    } catch (error) {
      showToast(getApiErrorHint(error));
      return;
    } finally {
      setSubmitting(false);
    }
    showToast("게시글이 등록되었습니다! 🎉");
    setTimeout(onBack, 1200);
  };

  return (
    <div style={S.screen}>
      <div style={{ background: COLORS.primary, padding: "44px 16px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span onClick={onBack} style={{ color: "#fff", fontSize: 20, cursor: "pointer" }}>←</span>
          <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>게시글 작성</span>
        </div>
      </div>
      <div style={{ ...S.scrollArea, padding: 20 }}>
        {/* 게시판 선택 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.textMuted, marginBottom: 10 }}>게시판 선택</div>
          <div style={{ display: "flex", gap: 10 }}>
            {["동행", "자유"].map(t => (
              <div key={t} onClick={() => setType(t)} style={{ flex: 1, background: type === t ? COLORS.primary : "#fff", borderRadius: 12, padding: "12px 0", textAlign: "center", fontWeight: 700, fontSize: 14, cursor: "pointer", color: type === t ? "#fff" : COLORS.textMuted, border: `1.5px solid ${type === t ? COLORS.primary : "rgba(0,0,0,0.08)"}` }}>
                {t === "동행" ? "동행 게시판" : "자유 게시판"}
              </div>
            ))}
          </div>
          <div className="community-write-policy">관광지/가게 리뷰는 각 상세 페이지에서만 작성할 수 있습니다.</div>
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
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.textMuted, marginBottom: 8 }}>관광지</div>
            {type === "동행" ? (
              <div className="community-place-search">
                <input
                  value={placeQuery}
                  onChange={(e) => {
                    setPlaceQuery(e.target.value);
                    setForm(f => ({ ...f, place: "", placeId: null, region: "" }));
                  }}
                  placeholder="관광지 이름을 2자 이상 검색하세요"
                  style={{ width: "100%", background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 12, padding: "12px 16px", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                />
                {form.placeId && (
                  <div className="community-selected-place">
                    <span>선택됨</span>
                    <strong>{form.place}</strong>
                    <button type="button" onClick={() => { set("place", ""); set("placeId", null); setPlaceQuery(""); }}>변경</button>
                  </div>
                )}
                {placeSearchStatus === "loading" && <div className="community-place-search-note">관광지를 검색하는 중입니다.</div>}
                {placeSearchStatus === "too-short" && <div className="community-place-search-note">2자 이상 입력하면 검색 결과가 표시됩니다.</div>}
                {placeSearchStatus === "empty" && <div className="community-place-search-note">검색 결과가 없습니다. 다른 이름으로 검색해보세요.</div>}
                {placeSearchStatus === "error" && <div className="community-place-search-note error">관광지 검색을 불러오지 못했습니다.</div>}
                {placeResults.length > 0 && (
                  <div className="community-place-result-list">
                    {placeResults.map((place) => (
                      <button key={place.placeId ?? place.id} type="button" onClick={() => handleSelectPlace(place)}>
                        <strong>{place.name}</strong>
                        <span>{place.addr || place.address || place.type || "관광지"}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="community-place-disabled">
                자유 게시판 장소 연결은 백엔드 작성 API에 placeId/placeName 필드가 추가되면 연결할 수 있습니다.
              </div>
            )}
          </div>
          {type === "동행" && (
            <>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.textMuted, marginBottom: 8 }}>모임 날짜</div>
                <input type="date" value={form.date} onChange={e => set("date", e.target.value)} style={{ width: "100%", background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 12, padding: "12px 16px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.textMuted, marginBottom: 8 }}>최대 인원</div>
                <select value={form.maxPeople} onChange={e => set("maxPeople", e.target.value)} style={{ width: "100%", background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 12, padding: "12px 16px", fontSize: 14, outline: "none", boxSizing: "border-box" }}>
                  {["2", "3", "4", "5", "6", "7", "8"].map(n => <option key={n} value={n}>{n}명</option>)}
                </select>
              </div>
            </>
          )}
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.textMuted, marginBottom: 8 }}>사진 추가 (0/5)</div>
            <div onClick={() => showToast("사진 업로드 기능 (준비 중)")} style={{ background: "#fff", border: "1.5px dashed rgba(0,0,0,0.15)", borderRadius: 12, padding: "20px 0", textAlign: "center", cursor: "pointer" }}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>📷</div>
              <div style={{ fontSize: 14, color: COLORS.textMuted }}>사진을 추가하세요</div>
            </div>
          </div>
          <div className="community-write-actions">
            <button type="button" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "등록 중..." : "게시글 등록"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
