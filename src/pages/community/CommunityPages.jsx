import { useEffect, useState } from "react";
import { COLORS, S } from "../../constants/colors.js";
import { EmptyState, ErrorState, SkeletonList } from "../../components/common";
import { getApiErrorHint, shouldUseMockFallback } from "../../services/apiClient.js";
import { createChatRoom, getCompanionJoinState, getCompanionRoomForPost, registerCompanionChatRoom, submitCompanionJoinRequest } from "../../services/chatService.js";
import { createCommunityComment, createCommunityPost, fetchCommunityComments, fetchCommunityPosts, getMockCommunityComments, getMockCommunityPosts } from "../../services/communityService.js";

// ─── 커뮤니티 목록 ────────────────────────────────────────────────────
export function CommunityListPage({ onPost, onWrite, onBack }) {
  const [tab, setTab] = useState("동행");
  const [scope, setScope] = useState("전체");
  const [posts, setPosts] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const filtered = posts.filter(p => p.type === tab && (scope === "전체" || p.place?.includes(scope)));
  const companionCount = posts.filter(p => p.type === "동행").length;
  const freeCount = posts.filter(p => p.type === "자유").length;

  const loadPosts = () => {
    setStatus("loading");
    setErrorMessage("");
    fetchCommunityPosts()
      .then((data) => {
        if (data.length === 0) {
          setPosts(getMockCommunityPosts());
          setStatus("mock");
          return;
        }
        setPosts(data);
        setStatus("success");
      })
      .catch((error) => {
        if (!shouldUseMockFallback(error)) {
          setPosts([]);
          setErrorMessage(getApiErrorHint(error));
          setStatus("error");
          return;
        }
        setPosts(getMockCommunityPosts());
        setStatus("mock");
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
          <button type="button" onClick={onBack}>←</button>
          <span>LOCAL COMPANION</span>
          <h1>오늘 같이 걸을 골목 친구를 찾아보세요.</h1>
          <p>동행 모집, 여행 후기, 장소 팁을 한 곳에서 보고 바로 채팅으로 이어갈 수 있게 정리했습니다.</p>
        </div>
        <button type="button" onClick={onWrite}>글쓰기</button>
      </div>
      <div className="community-list-tabs">
        {["동행", "자유"].map(t => (
          <button key={t} type="button" onClick={() => setTab(t)} className={tab === t ? "active" : ""}>
            {t === "동행" ? "동행 게시판" : "자유 게시판"}
            <span>{t === "동행" ? companionCount : freeCount}</span>
          </button>
        ))}
      </div>
      <div style={S.scrollArea}>
        <div className="community-list-shell">
          <div className="community-scope-row">
            {["전체", "광장시장", "경복궁", "통인시장"].map(item => (
              <button key={item} type="button" className={scope === item ? "active" : ""} onClick={() => setScope(item)}>
                {item}
              </button>
            ))}
          </div>
          {status === "loading" && <SkeletonList count={4} />}
          {status === "mock" && <div className="community-list-state warning">커뮤니티 API 미확정으로 현재는 목업 게시글입니다.</div>}
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
          {filtered.map(p => (
            <article key={p.id} onClick={() => onPost(p)} className="community-list-card">
              <div className="community-list-card-head">
                <div>
                  <span className={p.type === "동행" ? "blue" : "green"}>{p.type === "동행" ? p.status ?? "모집중" : "자유"}</span>
                  <small>📍 {p.place}</small>
                </div>
                {p.type === "동행" && <strong>{p.current}/{p.max}명</strong>}
              </div>
              <h2>{p.title}</h2>
              <p>{p.content}</p>
              <div className="community-list-card-foot">
                <span>{p.author} · {p.date}</span>
                <span>💬 {p.comments} · 👁 {p.views}</span>
              </div>
            </article>
          ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 게시글 상세 ──────────────────────────────────────────────────────
export function CommunityPostPage({ post, onBack, showToast, user, onChatRoom }) {
  const [comments, setComments] = useState([]);
  const [input, setInput] = useState("");
  const [joinState, setJoinState] = useState("idle");
  const [creatingRoom, setCreatingRoom] = useState(false);

  useEffect(() => {
    let ignore = false;
    fetchCommunityComments(post?.id, post?.type)
      .then((data) => {
        if (!ignore) setComments(data);
      })
      .catch(() => {
        if (!ignore) setComments(getMockCommunityComments());
      });
    return () => { ignore = true; };
  }, [post?.id, post?.type]);

  useEffect(() => {
    if (!post?.id || post?.type !== "동행" || !user) {
      setJoinState("idle");
      return;
    }
    setJoinState(getCompanionJoinState({ postId: post.id, user }));
  }, [post?.id, post?.type, user?.userId, user?.email, user?.nickname]);

  const sendComment = async () => {
    if (!input.trim()) return;
    let comment;
    try {
      comment = await createCommunityComment({ postId: post?.id, postType: post?.type, text: input });
    } catch {
      comment = { id: Date.now(), author: "여행자지수", text: input, time: "방금", postId: post?.id };
    }
    setComments([...comments, comment]);
    setInput("");
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
  const isAuthor = isCompanion && (
    String(post.writerId ?? post.authorId ?? post.userId ?? "") === String(user?.userId ?? "no-user")
    || post.author === (user?.nickname || "여행자지수")
  );
  const routeItems = post.route ?? [post.place, "주변 명소 둘러보기", "시장 먹거리 탐방"];
  const goodPoints = post.goodPoints ?? ["동선을 공유했어요", "여행 팁을 남겼어요", "주변 상권과 함께 보기 좋아요"];
  const companionAction = {
    idle: { label: "채팅방 참여 신청", helper: "방장이 수락하면 채팅방에 입장할 수 있어요." },
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
      showToast("동행 채팅방이 생성되었습니다.");
      onChatRoom?.({
        ...registeredRoom,
        lastMsg: registeredRoom.lastMsg || "동행 채팅방이 열렸습니다.",
      });
    } catch (error) {
      if (!shouldUseMockFallback(error)) {
        showToast(getApiErrorHint(error));
        setCreatingRoom(false);
        return;
      }
      const mockRoom = {
        id: `mock-room-${post.id}`,
        chatRoomId: `mock-room-${post.id}`,
        title: post.title,
        members: post.current || 1,
        maxMembers: post.max || 4,
        lastMsg: "동행 채팅방이 열렸습니다.",
        unread: 0,
        tags: [post.place].filter(Boolean),
      };
      const registeredRoom = registerCompanionChatRoom({ post, room: mockRoom, user });
      showToast("채팅방 API 연결 전 데모 채팅방으로 이동합니다.");
      onChatRoom?.(registeredRoom);
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
      handleCreateChatRoom();
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
          showToast("채팅방 참여 신청을 보냈습니다.");
        })
        .catch((error) => {
          showToast(getApiErrorHint(error));
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

  return (
    <div style={S.screen} className="community-detail-screen">
      <div className="community-detail-topbar">
        <button type="button" onClick={onBack}>← 목록으로</button>
        <button type="button" onClick={() => showToast("수정/삭제/신고")}>⋯</button>
      </div>

      <div style={S.scrollArea} className="community-detail-scroll">
        <div className="community-detail-layout">
          <article className="community-detail-main">
            <section className="community-detail-card community-detail-article">
              <div className="community-detail-meta">
                <span className={isCompanion ? "type-blue" : "type-green"}>{isCompanion ? "동행" : "자유"}</span>
                <span>📍 {post.place}</span>
                {isCompanion && <span className="type-yellow">{post.status ?? "모집중"}</span>}
              </div>
              <h1>{post.title}</h1>
              <div className="community-detail-author">
                <div>👤</div>
                <span>{post.author}</span>
                <span>{post.date}</span>
                <span>조회 {post.views}</span>
              </div>
              <p className="community-detail-content">{post.content}</p>
              {!isCompanion && <div className="community-review-write-note">관광지/가게 리뷰 작성은 각 상세 페이지에서만 가능합니다.</div>}
            </section>

            {isCompanion ? (
              <section className="community-detail-card">
                <div className="community-section-title">예상 코스</div>
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
                    <span>{c.time}</span>
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
            <section className="community-detail-card community-summary-card">
              <div className="community-section-title">{isCompanion ? "모집 정보" : "게시글 요약"}</div>
              {isCompanion ? (
                <div className="community-info-grid">
                  <div><span>일정</span><strong>{post.date}</strong></div>
                  <div><span>시간</span><strong>{post.meetingTime ?? "시간 협의"}</strong></div>
                  <div><span>인원</span><strong>{post.current}/{post.max}명</strong></div>
                  <div><span>언어</span><strong>{post.language ?? "한국어"}</strong></div>
                </div>
              ) : (
                <div className="community-info-grid">
                  <div><span>댓글</span><strong>{post.comments}</strong></div>
                  <div><span>작성일</span><strong>{post.date}</strong></div>
                  <div><span>분류</span><strong>자유 게시판</strong></div>
                  <div><span>장소</span><strong>{post.place}</strong></div>
                </div>
              )}
            </section>

            <section className="community-detail-card community-meeting-card">
              <div className="community-section-title">{isCompanion ? "만나는 곳" : "게시글 안내"}</div>
              <p>{isCompanion ? `📍 ${post.meetingPoint ?? `${post.place} 입구`}` : "장소 리뷰는 관광지/가게 상세 페이지에서 작성하고 확인하는 흐름으로 분리합니다."}</p>
              {/* TODO: 동행 모집글 상세 API와 참여 신청 API가 확정되면 postId 기반 실제 요청으로 교체합니다. */}
              {isCompanion && (
                <div className={`community-join-status ${joinState}`}>
                  <strong>{isAuthor ? "방장 권한" : companionAction.label}</strong>
                  <span>{isAuthor ? "게시글 작성자는 직접 채팅방을 생성한 뒤 참여 신청을 관리합니다." : companionAction.helper}</span>
                </div>
              )}
              <button type="button" onClick={handleCompanionAction}>
                {isCompanion ? (isAuthor ? (creatingRoom ? "채팅방 생성 중..." : "채팅방 생성") : companionAction.label) : "관련 장소 보기"}
              </button>
              {isCompanion && (
                <button type="button" className="community-sub-action" onClick={() => showToast("신고 API 연결 전까지 mock 안내만 표시합니다.")}>
                  신고하기
                </button>
              )}
            </section>

            <section className="community-detail-card community-side-panel">
              <div className="community-section-title">{isCompanion ? "참여 전 확인" : "자유 게시판 안내"}</div>
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

            <section className="community-detail-card community-stats-card">
              <div><strong>{post.comments}</strong><span>댓글</span></div>
              <div><strong>{post.views}</strong><span>조회</span></div>
              <div><strong>{isCompanion ? `${post.current}/${post.max}` : post.rating ?? 5}</strong><span>{isCompanion ? "참여" : "평점"}</span></div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

// ─── 게시글 작성 ──────────────────────────────────────────────────────
export function CommunityWritePage({ onBack, showToast }) {
  const [type, setType] = useState("동행");
  const [form, setForm] = useState({ title: "", content: "", place: "", date: "", maxPeople: "4" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.title || !form.content) { showToast("제목과 내용을 입력해주세요."); return; }
    try {
      await createCommunityPost({ type, ...form });
    } catch {
      // TODO: API 연결 실패 시 현재는 화면 시연을 위해 mock 등록 완료 흐름을 유지합니다.
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
        <div onClick={handleSubmit} style={{ background: COLORS.accent, color: COLORS.primary, fontSize: 14, fontWeight: 700, borderRadius: 20, padding: "6px 16px", cursor: "pointer" }}>등록</div>
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
            <select value={form.place} onChange={e => set("place", e.target.value)} style={{ width: "100%", background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 12, padding: "12px 16px", fontSize: 14, outline: "none", boxSizing: "border-box" }}>
              <option value="">관광지 선택</option>
              {["광장시장", "경복궁", "창덕궁", "통인시장"].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
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
        </div>
      </div>
    </div>
  );
}
