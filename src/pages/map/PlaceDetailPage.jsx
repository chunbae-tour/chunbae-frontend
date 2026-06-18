import { useEffect, useState } from "react";
import { COLORS, S } from "../../constants/colors";
import { EmptyState, SkeletonList, StarRating } from "../../components/common";
import { getPlaceImageUrl } from "../../constants/placeImages.js";
import {
  addMarketLike,
  addPlaceLike,
  createPlaceReview,
  fetchNearbyPlacesByPlace,
  fetchNearbyStores,
  fetchPlaceRecommendations,
  fetchPlaceReviews,
  fetchTravelSpotDetail,
  normalizePlace,
  removeMarketLike,
  removePlaceLike,
} from "../../services/placeService.js";
import { fetchCompanionPostsByPlace } from "../../services/communityService.js";

const NEARBY_CATEGORY_TABS = [
  { key: "RESTAURANT", label: "맛집" },
  { key: "CAFE", label: "카페" },
  { key: "ACCOMMODATION", label: "숙박" },
];

function splitSentences(text = "", limit = 3) {
  const normalized = String(text).replace(/\s+/g, " ").trim();
  const sentences = (normalized.match(/[^.!?。]+[.!?。]?/g) ?? [])
    .map(item => item.trim())
    .filter(Boolean);

  return sentences.length > 0 ? sentences.slice(0, limit) : [];
}

function formatOperatingHours(hours = "") {
  const raw = String(hours || "").trim();
  if (!raw) return [];

  const normalized = raw
    .replace(/&lt;br\s*\/?&gt;/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\r/g, "\n")
    .replace(/\]\s*\[/g, "]\n[")
    .replace(/\s+-\s+(?=(?:\[[^\]]+\]|\d{1,2}월))/g, "\n")
    .replace(/^\s*-\s*/gm, "");

  return normalized
    .split(/\n+/)
    .flatMap((line) => {
      const items = line.match(/\[[^\]]+\]\s*[^[]+/g);
      return items && items.length > 1 ? items : [line];
    })
    .map(item => item.trim())
    .filter(Boolean)
    .map((item, index) => {
      const bracket = item.match(/^\[([^\]]+)\]\s*(.*)$/);
      if (bracket) {
        return { label: `[${bracket[1].trim()}]`, value: bracket[2].trim() };
      }

      const month = item.match(/^((?:\d{1,2}월(?:~\d{1,2}월)?)(?:\/\d{1,2}월(?:~\d{1,2}월)?)*)\s*(.*)$/);
      if (month) {
        return { label: month[1].trim(), value: month[2].trim() };
      }

      return { label: `시간 ${index + 1}`, value: item };
    })
    .filter(item => item.label || item.value);
}

function getCompanionPeopleText(post = {}) {
  const current = post.currentMembers ?? post.current ?? post.memberCount ?? 0;
  const max = post.maxMembers ?? post.max ?? post.maxPeople ?? 0;
  if (!max) return "모집중";
  return `${current} / ${max}명`;
}

function isCompanionClosed(post = {}) {
  const status = String(post.status ?? "").toUpperCase();
  return status.includes("CLOSED") || status.includes("DONE") || status.includes("마감");
}

function PlaceCompanionSidebarPanel({
  posts,
  status,
  placeName,
  onMore,
  onWrite,
  showToast,
}) {
  const visiblePosts = posts.slice(0, 3);

  return (
    <section className="place-sidebar-companion">
      <div className="place-sidebar-companion-head">
        <strong>👥 이 장소 동행 모집</strong>
        <button type="button" onClick={onMore}>전체보기 &gt;</button>
      </div>
      {status === "loading" && <SkeletonList count={2} />}
      {(status === "empty" || status === "error" || visiblePosts.length === 0) && (
        <div className="place-sidebar-companion-empty">
          <span>👥</span>
          <strong>아직 동행 모집이 없어요</strong>
          <small>{placeName}에서 함께 걸을 첫 모집글을 남겨보세요.</small>
        </div>
      )}
      {status === "success" && visiblePosts.length > 0 && (
        <div className="place-sidebar-companion-list">
          {visiblePosts.map((post) => {
            const closed = isCompanionClosed(post);
            return (
              <button key={post.id} type="button" onClick={() => showToast?.("동행 게시글 상세 이동은 커뮤니티 목록에서 확인해주세요.")}>
                <strong>{post.title}</strong>
                <span>
                  <small>{post.date || post.meetingDate || "일정 협의"}</small>
                  <em className={closed ? "closed" : ""}>{closed ? "마감" : getCompanionPeopleText(post)}</em>
                </span>
              </button>
            );
          })}
        </div>
      )}
      <button type="button" className="place-sidebar-companion-write" onClick={onWrite}>
        동행 모집글 작성하기
      </button>
    </section>
  );
}

export default function PlaceDetailPage({ place, onBack, showToast, onDirection, onQrPay, onShopClick, onLikeChange, onCompanionMore, onCompanionWrite }) {
  const [detail, setDetail] = useState(place ? normalizePlace(place) : null);
  const [liked, setLiked] = useState(Boolean(place?.isLiked));
  const [likeLoading, setLikeLoading] = useState(false);
  const [tab, setTab] = useState(place?.reviewIntent ? "리뷰" : "소개");
  const [status, setStatus] = useState(place ? "success" : "loading");
  const [error, setError] = useState("");
  const [reviews, setReviews] = useState([]);
  const [nearbyStores, setNearbyStores] = useState([]);
  const [reviewFormOpen, setReviewFormOpen] = useState(Boolean(place?.reviewIntent));
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewPhotoName, setReviewPhotoName] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [nearbyCategory, setNearbyCategory] = useState("RESTAURANT");
  const [nearbyCategoryPlaces, setNearbyCategoryPlaces] = useState([]);
  const [nearbyCategoryStatus, setNearbyCategoryStatus] = useState("idle");
  const [companionPosts, setCompanionPosts] = useState([]);
  const [companionStatus, setCompanionStatus] = useState("idle");
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);

  useEffect(() => {
    let ignore = false;
    const placeId = place?.placeId ?? place?.id;
    const incomingDetail = place ? normalizePlace(place) : null;
    setTab(place?.reviewIntent ? "리뷰" : "소개");
    setReviewFormOpen(Boolean(place?.reviewIntent));
    setDescriptionExpanded(false);
    setDetail(incomingDetail);
    setLiked(Boolean(incomingDetail?.isLiked));

    if (!placeId) {
      setStatus("empty");
      return undefined;
    }

    setStatus(incomingDetail ? "success" : "loading");
    setError("");

    fetchTravelSpotDetail(incomingDetail ?? placeId)
      .then((data) => {
        if (ignore) return;
        setDetail(data);
        setLiked(Boolean(data.isLiked));
        setStatus("success");
      })
      .catch((err) => {
        if (ignore) return;
        setError(err.message || "장소 상세 정보를 불러오지 못했습니다.");
        setStatus(incomingDetail ? "error" : "empty");
      });

    return () => { ignore = true; };
  }, [place?.id, place?.placeId]);

  useEffect(() => {
    let ignore = false;
    const placeId = place?.placeId ?? place?.id;

    if (!placeId) {
      setReviews([]);
      setNearbyStores([]);
      setRecommendations([]);
      return undefined;
    }

    Promise.allSettled([
      fetchPlaceReviews(placeId),
      fetchNearbyStores(placeId),
      fetchPlaceRecommendations(placeId, { size: 5 }),
    ])
      .then(([reviewResult, storeResult, recommendResult]) => {
        if (ignore) return;
        setReviews(reviewResult.status === "fulfilled" ? reviewResult.value : []);
        setNearbyStores(storeResult.status === "fulfilled" ? storeResult.value : []);
        setRecommendations(recommendResult.status === "fulfilled" ? recommendResult.value : []);
      });

    return () => { ignore = true; };
  }, [place?.id, place?.placeId]);

  useEffect(() => {
    let ignore = false;
    const placeId = place?.placeId ?? place?.id;

    if (!placeId) {
      setNearbyCategoryPlaces([]);
      setNearbyCategoryStatus("idle");
      return undefined;
    }

    setNearbyCategoryStatus("loading");
    fetchNearbyPlacesByPlace(placeId, { category: nearbyCategory, radius: 1000, size: 10 })
      .then((items) => {
        if (ignore) return;
        setNearbyCategoryPlaces(items);
        setNearbyCategoryStatus(items.length > 0 ? "success" : "empty");
      })
      .catch(() => {
        if (ignore) return;
        setNearbyCategoryPlaces([]);
        setNearbyCategoryStatus("error");
      });

    return () => { ignore = true; };
  }, [place?.id, place?.placeId, nearbyCategory]);

  useEffect(() => {
    let ignore = false;
    const targetPlace = detail ?? (place ? normalizePlace(place) : null);

    if (!targetPlace?.placeId && !targetPlace?.id && !targetPlace?.name) {
      setCompanionPosts([]);
      setCompanionStatus("idle");
      return undefined;
    }

    setCompanionStatus("loading");
    fetchCompanionPostsByPlace(targetPlace)
      .then((items) => {
        if (ignore) return;
        setCompanionPosts(items);
        setCompanionStatus(items.length > 0 ? "success" : "empty");
      })
      .catch(() => {
        if (ignore) return;
        setCompanionPosts([]);
        setCompanionStatus("error");
      });

    return () => { ignore = true; };
  }, [detail?.placeId, detail?.id, detail?.name, place?.placeId, place?.id]);

  const currentPlace = detail;
  const heroImage = getPlaceImageUrl(currentPlace) || getPlaceImageUrl(place);
  const isMarket = currentPlace?.type === "전통시장";
  const descriptionHighlights = splitSentences(currentPlace?.desc, 2);
  const operatingHourLines = formatOperatingHours(currentPlace?.hours);

  const handleToggleLike = async () => {
    if (likeLoading) return;
    const placeId = currentPlace?.placeId ?? currentPlace?.id;
    const isMarketType = currentPlace?.targetType === "TRADITIONAL_MARKET" || isMarket;
    const next = !liked;
    setLiked(next); // 낙관적 업데이트
    setLikeLoading(true);
    try {
      if (isMarketType) {
        if (next) {
          await addMarketLike(placeId);
        } else {
          await removeMarketLike(placeId);
        }
      } else {
        if (next) {
          await addPlaceLike(placeId);
        } else {
          await removePlaceLike(placeId);
        }
      }
      // 찜 상태 변경을 부모에 알림
      onLikeChange?.(placeId, next);
      showToast?.(next ? "찜 목록에 추가되었습니다." : "찜 목록에서 제거되었습니다.");
    } catch (err) {
      setLiked(!next); // 실패 시 롤백
      showToast?.(err.message || "찜 처리에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLikeLoading(false);
    }
  };
  const submitReview = async () => {
    if (reviewSubmitting) return;
    const content = reviewText.trim();
    const placeId = currentPlace?.placeId ?? currentPlace?.id;

    if (!content) {
      showToast?.("후기 내용을 입력해주세요.");
      return;
    }
    if (content.length > 500) {
      showToast?.("후기는 500자 이내로 입력해주세요.");
      return;
    }
    if (!placeId) {
      showToast?.("리뷰를 남길 장소 정보를 찾지 못했습니다.");
      return;
    }

    setReviewSubmitting(true);
    try {
      const savedReview = await createPlaceReview(placeId, {
        rating: reviewRating,
        content,
        imageUrls: [],
      });
      setReviews(prev => [savedReview, ...prev.filter(item => String(item.id) !== String(savedReview.id))]);
      setDetail(prev => prev
        ? {
            ...prev,
            reviews: (Number(prev.reviews) || 0) + 1,
            reviewCount: (Number(prev.reviewCount) || 0) + 1,
          }
        : prev);
      setReviewText("");
      setReviewPhotoName("");
      setReviewRating(5);
      setReviewFormOpen(false);
      showToast?.("리뷰가 등록되었습니다.");
    } catch (err) {
      showToast?.(err.message || "리뷰 등록에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setReviewSubmitting(false);
    }
  };
  const primaryActions = currentPlace ? [
    {
      label: "길찾기",
      desc: "골목 입구까지",
      icon: "📍",
      tone: "path",
      onClick: onDirection,
    },
    {
      label: liked ? "찜 해제" : "찜하기",
      desc: liked ? "저장됨" : "다시 보기",
      icon: liked ? "❤️" : "🤍",
      tone: "like",
      onClick: handleToggleLike,
      disabled: likeLoading,
    },
    {
      label: "리뷰 작성",
      desc: "별점과 사진",
      icon: "✍️",
      tone: "review",
      onClick: () => {
        setTab("리뷰");
        setReviewFormOpen(true);
      },
    },
    {
      label: "동행 모집",
      desc: "같이 갈 사람",
      icon: "💬",
      tone: "companion",
      onClick: onCompanionWrite || (() => showToast("동행 모집글 작성 화면으로 연결 예정입니다.")),
    },
  ] : [];

  return (
    <div style={S.screen} className="web-place-detail">
      {status === "loading" && (
        <div style={{ padding: 24 }}>
          <SkeletonList count={4} />
        </div>
      )}
      {status === "empty" && (
        <div style={{ flex: 1, display: "grid", placeItems: "center", padding: 24 }}>
          <EmptyState
            icon="📍"
            title="장소 정보를 찾을 수 없습니다."
            description="목록에서 장소를 다시 선택해주세요."
            actionLabel="뒤로가기"
            onAction={onBack}
          />
        </div>
      )}
      {currentPlace && status !== "loading" && status !== "empty" && (
      <div style={S.scrollArea} className="web-detail-scroll">
        <div className="web-place-layout">
        <aside className="place-detail-sidebar">
          <button
            type="button"
            className="web-place-visual place-night-visual"
            style={{ "--place-hero-image": heroImage ? `url("${heroImage}")` : undefined, height: 200, background: "#F0EBE0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 80 }}
            onClick={() => heroImage && setImageModalOpen(true)}
            disabled={!heroImage}
            aria-label={`${currentPlace.name} 대표 이미지 크게 보기`}
          >
            {heroImage && <span ></span>}
          </button>
          <div className="place-sidebar-summary">
            <h1>{currentPlace.name}</h1>
            <div className="place-sidebar-rating">
              <span>{currentPlace.type || "관광지"}</span>
              <StarRating rating={currentPlace.rating} />
            </div>
            <p>📍 {currentPlace.addr || "주소 정보 없음"}</p>
            <div className="place-sidebar-info-grid">
              <div>
                <span>분류</span>
                <strong>{currentPlace.type || "관광지"}</strong>
              </div>
              <div>
                <span>운영</span>
                <strong>{operatingHourLines.length > 0 ? `${operatingHourLines.length}개` : "정보 없음"}</strong>
              </div>
              <button type="button" onClick={onDirection}>길찾기</button>
            </div>
          </div>
          <PlaceCompanionSidebarPanel
            posts={companionPosts}
            status={companionStatus}
            placeName={currentPlace.name}
            onMore={onCompanionMore || (() => showToast?.("동행 게시판에서 전체 모집글을 확인해주세요."))}
            onWrite={onCompanionWrite || (() => showToast?.("동행 모집글 작성 화면으로 연결 예정입니다."))}
            showToast={showToast}
          />
        </aside>
        <div className="web-place-content" style={{ padding: 20 }}>
          <div className="place-content-topbar">
            <div>
              <button type="button" onClick={onBack}>← 뒤로</button>
            </div>
            <div className="place-tab-group" role="tablist" aria-label="장소 상세 탭">
              {["소개", "리뷰"].map(t => (
                <button key={t} type="button" onClick={() => setTab(t)} className={tab === t ? "active" : ""}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="place-action-panel">
            <div className="place-action-head">
              <span>이 장소에서 바로 할 일</span>
            </div>
            <div className="place-action-grid">
              {primaryActions.map(action => (
                <button key={action.label} type="button" className={`place-action-card ${action.tone}`} onClick={action.onClick} disabled={action.disabled}>
                  <span>{action.icon}</span>
                  <strong>{action.label}</strong>
                  <small>{action.desc}</small>
                </button>
              ))}
            </div>
          </div>
          {tab === "소개" ? (
            <div>
              <section className="place-readable-section">
                <div className="place-section-title">
                  <strong>관광지 소개</strong>
                </div>
                {descriptionHighlights.length > 0 && (
                  <div className="place-highlight-grid">
                    {descriptionHighlights.map((sentence, index) => (
                      <div key={`${sentence}-${index}`}>
                        <span>{index + 1}</span>
                        <strong>{sentence}</strong>
                      </div>
                    ))}
                  </div>
                )}
                {descriptionExpanded && <p>{currentPlace.desc || "장소 소개가 아직 준비되지 않았습니다."}</p>}
                {currentPlace.desc && (
                  <button type="button" className="place-description-toggle" onClick={() => setDescriptionExpanded(open => !open)}>
                    {descriptionExpanded ? "접기 ↑" : "전체 보기 ↓"}
                  </button>
                )}
              </section>
              <section className="place-readable-section">
                <div className="place-section-title">
                  <strong>입장·운영 시간</strong>
                </div>
                {operatingHourLines.length === 0 ? (
                  <div className="place-hour-empty">운영시간 정보가 아직 없습니다.</div>
                ) : (
                  <div className="place-hour-table">
                    {operatingHourLines.map((line, index) => (
                      <div key={`${line.label}-${line.value}-${index}`} className="place-hour-row">
                        <span>{line.label}</span>
                        <strong>{line.value || "운영시간 확인 필요"}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </section>
              {recommendations.length > 0 && (
              <div className="place-explore-panel">
                <div className="place-action-head">
                  <span>함께 가기 좋은 곳</span>
                </div>
                <div className="place-recommendation-grid">
                  {recommendations.map((item, index) => (
                    <div key={item.placeId ?? item.id ?? `${item.name}-${index}`} className="place-mini-place-card">
                      <strong>{item.name}</strong>
                      <span>{item.type} · {item.dist || "근처"}</span>
                      <small>{item.addr || item.desc || "상세 정보는 장소 목록에서 확인하세요."}</small>
                    </div>
                  ))}
                </div>
              </div>
              )}
              {nearbyCategoryStatus !== "idle" && (
              <div className="place-explore-panel">
                <div className="place-action-head">
                  <span>주변 맛집·카페·숙박</span>
                </div>
                <div className="place-category-tabs">
                  {NEARBY_CATEGORY_TABS.map((category) => (
                    <button
                      key={category.key}
                      type="button"
                      className={nearbyCategory === category.key ? "active" : ""}
                      onClick={() => setNearbyCategory(category.key)}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>
                {nearbyCategoryStatus === "loading" && <SkeletonList count={2} />}
                {nearbyCategoryStatus === "success" && nearbyCategoryPlaces.length > 0 && (
                  <div className="place-external-list">
                    {nearbyCategoryPlaces.map((item) => (
                      <div key={item.id ?? item.placeId ?? `${item.name}-${item.addr}`} className="place-external-card">
                        <strong>{item.name}</strong>
                        <span>{item.addr || "주소 정보 없음"}</span>
                        <small>{item.dist || item.type || "주변 장소"}</small>
                      </div>
                    ))}
                  </div>
                )}
                {nearbyCategoryStatus === "empty" && (
                  <div className="place-nearby-empty">
                    선택한 분류의 주변 장소가 아직 없습니다.
                  </div>
                )}
                {nearbyCategoryStatus === "error" && (
                  <div className="place-nearby-empty error">
                    주변 장소를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
                  </div>
                )}
              </div>
              )}
              {(isMarket || nearbyStores.length > 0) && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.primary, marginBottom: 12 }}>주변 인증 상점</div>
                {isMarket && (
                  <div className="place-pay-flow">
                    <div>
                      <span>엽전 결제 준비</span>
                      <strong>현장에서 가게 QR을 스캔하면 금액 입력과 상인 승인 후 결제가 완료됩니다.</strong>
                    </div>
                    <button type="button" onClick={() => showToast("현장 QR 스캔 화면은 가게 QR을 촬영할 때 사용합니다.")}>현장 QR 안내</button>
                  </div>
                )}
                <div className="web-store-list" style={{ display: "flex", gap: 10 }}>
                  {nearbyStores.map((store, index) => (
                    <button
                      key={store.id}
                      type="button"
                      className="place-nearby-store-card"
                      onClick={() => onShopClick?.({ ...store, imageUrl: heroImage, place: currentPlace, placeName: currentPlace.name, marketName: store.marketName || currentPlace.name })}
                    >
                      🏪 {store.name}<br />
                      <span style={{ fontSize: 14, color: COLORS.textMuted }}>{store.menu || store.description || "상점 정보"}</span><br />
                      {store.verified && <span style={{ fontSize: 14, color: COLORS.green }}>✅ 인증 상점</span>}
                    </button>
                  ))}
                </div>
              </div>
              )}
            </div>
          ) : (
            <div>
              {place?.reviewIntent && (
                <div className="place-review-intent">
                  <span>결제내역에서 이동했습니다.</span>
                  <strong>{place.shopName || currentPlace.name} · {place.paidAmount || "결제 금액 확인 중"}</strong>
                  <small>방문한 장소의 별점과 후기를 남길 수 있어요.</small>
                </div>
              )}
              <button type="button" className="place-review-open-button" onClick={() => setReviewFormOpen(!reviewFormOpen)}>
                {reviewFormOpen ? "작성창 접기" : place?.reviewIntent ? "결제한 상점 리뷰 남기기" : "이 장소 후기 남기기"}
              </button>
              {reviewFormOpen && (
                <div className="place-review-form">
                  <div className="place-review-stars" aria-label="별점 선택">
                    {[1, 2, 3, 4, 5].map(score => (
                      <button key={score} type="button" className={score <= reviewRating ? "active" : ""} onClick={() => setReviewRating(score)}>
                        ★
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={reviewText}
                    onChange={(event) => setReviewText(event.target.value)}
                    placeholder={place?.reviewIntent ? "방문한 상점과 결제 경험을 남겨주세요." : "이 장소에서 좋았던 점을 남겨주세요."}
                  />
                  <div className="place-review-form-actions">
                    <label>
                      사진 첨부
                      <input type="file" accept="image/*" onChange={(event) => setReviewPhotoName(event.target.files?.[0]?.name || "")} />
                    </label>
                    <span>{reviewPhotoName || "선택된 사진 없음"}</span>
                    <button type="button" onClick={submitReview} disabled={reviewSubmitting}>
                      {reviewSubmitting ? "등록 중..." : "등록"}
                    </button>
                  </div>
                </div>
              )}
              {reviews.length === 0 ? (
                <EmptyState
                  icon="후기"
                  title="아직 리뷰가 없습니다."
                  description="방문 후 첫 후기를 남겨보세요."
                />
              ) : reviews.map((r) => (
                <div key={r.id} className="web-review-card" style={{ background: "#fff", borderRadius: 12, padding: 14, marginBottom: 10, border: "0.5px solid rgba(0,0,0,0.06)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{r.user}</span>
                    <span style={{ fontSize: 14, color: COLORS.textMuted }}>{r.date}</span>
                  </div>
                  <div style={{ color: "#E8A020", fontSize: 14, marginBottom: 4 }}>{"★".repeat(r.rating)}</div>
                  <div style={{ fontSize: 14, color: COLORS.textSub }}>{r.text}</div>
                </div>
              ))}
            </div>
          )}
          <div className="web-action-row" style={{ display: "flex", gap: 10, marginTop: 24 }}>
            <div onClick={() => showToast("장소 정보 신고 API가 아직 연결되지 않았습니다.")} style={{ flex: 1, background: COLORS.primary, color: "#fff", borderRadius: 12, padding: "12px 0", textAlign: "center", fontWeight: 700, cursor: "pointer" }}>🚩 정보 신고</div>
            <div onClick={() => showToast("공유 링크가 복사되었습니다!")} style={{ flex: 1, background: COLORS.bg, color: COLORS.primary, borderRadius: 12, padding: "12px 0", textAlign: "center", fontWeight: 700, cursor: "pointer", border: "0.5px solid rgba(0,0,0,0.1)" }}>🔗 공유</div>
          </div>
        </div>
        </div>
      </div>
      )}
      {imageModalOpen && heroImage && (
        <div className="place-image-modal" role="dialog" aria-modal="true" aria-label={`${currentPlace?.name || "장소"} 대표 이미지`} onMouseDown={() => setImageModalOpen(false)}>
          <div className="place-image-modal-content" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setImageModalOpen(false)} aria-label="이미지 닫기">×</button>
            <img src={heroImage} alt={`${currentPlace?.name || "장소"} 대표 이미지`} />
          </div>
        </div>
      )}
    </div>
  );
}
