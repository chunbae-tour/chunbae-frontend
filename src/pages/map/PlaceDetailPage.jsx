import { useEffect, useState } from "react";
import { COLORS, S } from "../../constants/colors";
import { EmptyState, SkeletonList, StarRating } from "../../components/common";
import { getPlaceImageUrl } from "../../constants/placeImages.js";
import { fetchNearbyStores, fetchPlaceDetail, fetchPlaceReviews, getMockNearbyStores, getMockPlaceReviews, normalizePlace } from "../../services/placeService.js";

const FOOD_POINTS = ["빈대떡", "떡볶이", "순대", "호떡"];
const ROUTE_STEPS = ["정문 입구", "먹자골목", "포차거리", "간식 스탬프"];
const COMPANION_PREVIEWS = [
  { id: 1, title: "광장시장 먹거리 골목 같이 도실 분!", meta: "오늘 19:00 · 2/4명", status: "모집중" },
  { id: 2, title: "사진 찍으며 천천히 걷는 시장 산책", meta: "주말 오전 · 1/3명", status: "신규" },
];
const STORE_MENU_PREVIEWS = ["빈대떡 세트", "떡볶이·순대", "호떡", "전통차"];

export default function PlaceDetailPage({ place, onBack, showToast, onDirection, onQrPay, onShopClick }) {
  const [detail, setDetail] = useState(place ? normalizePlace(place) : null);
  const [liked, setLiked] = useState(Boolean(place?.isLiked));
  const [tab, setTab] = useState(place?.reviewIntent ? "리뷰" : "소개");
  const [status, setStatus] = useState(place ? "success" : "loading");
  const [error, setError] = useState("");
  const [reviews, setReviews] = useState([]);
  const [nearbyStores, setNearbyStores] = useState([]);
  const [reviewFormOpen, setReviewFormOpen] = useState(Boolean(place?.reviewIntent));
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewPhotoName, setReviewPhotoName] = useState("");

  useEffect(() => {
    let ignore = false;
    const placeId = place?.placeId ?? place?.id;
    setTab(place?.reviewIntent ? "리뷰" : "소개");
    setReviewFormOpen(Boolean(place?.reviewIntent));

    if (!placeId) {
      setStatus("empty");
      return undefined;
    }

    setStatus(detail ? "success" : "loading");
    setError("");

    fetchPlaceDetail(placeId)
      .then((data) => {
        if (ignore) return;
        setDetail(data);
        setLiked(Boolean(data.isLiked));
        setStatus("success");
      })
      .catch((err) => {
        if (ignore) return;
        setError(err.message || "장소 상세 정보를 불러오지 못했습니다.");
        setStatus(detail ? "error" : "empty");
      });

    return () => { ignore = true; };
  }, [place?.id, place?.placeId]);

  useEffect(() => {
    let ignore = false;
    const placeId = place?.placeId ?? place?.id;

    if (!placeId) {
      setReviews([]);
      setNearbyStores([]);
      return undefined;
    }

    Promise.all([fetchPlaceReviews(placeId), fetchNearbyStores(placeId)])
      .then(([reviewData, storeData]) => {
        if (ignore) return;
        setReviews(reviewData);
        setNearbyStores(storeData);
      })
      .catch(() => {
        if (ignore) return;
        setReviews(getMockPlaceReviews());
        setNearbyStores(getMockNearbyStores());
      });

    return () => { ignore = true; };
  }, [place?.id, place?.placeId]);

  const currentPlace = detail;
  const heroImage = getPlaceImageUrl(currentPlace) || getPlaceImageUrl(place);
  const isMarket = currentPlace?.type === "전통시장";
  const submitReview = () => {
    if (!reviewText.trim()) {
      showToast("후기 내용을 입력해주세요.");
      return;
    }

    // TODO: POST /places/{placeId}/reviews 연동 시 rating/content/imageFiles를 FormData 또는 명세 필드에 맞춰 전송합니다.
    setReviews(prev => [
      {
        id: Date.now(),
        user: "여행자지수",
        rating: reviewRating,
        text: reviewText,
        date: "방금",
      },
      ...prev,
    ]);
    setReviewText("");
    setReviewPhotoName("");
    setReviewFormOpen(false);
    showToast("리뷰가 mock으로 등록되었습니다.");
  };
  const primaryActions = currentPlace ? [
    {
      label: "길찾기",
      desc: "골목 입구까지",
      icon: "📍",
      tone: "primary",
      onClick: onDirection,
    },
    {
      label: liked ? "찜 해제" : "찜하기",
      desc: liked ? "저장됨" : "다시 보기",
      icon: liked ? "❤️" : "🤍",
      tone: "light",
      onClick: () => setLiked(!liked),
    },
    {
      label: "리뷰 작성",
      desc: "별점과 사진",
      icon: "✍️",
      tone: "light",
      onClick: () => {
        setTab("리뷰");
        setReviewFormOpen(true);
        showToast("리뷰 작성은 API 연결 전까지 mock 화면으로 유지합니다.");
      },
    },
    {
      label: "동행 모집",
      desc: "같이 갈 사람",
      icon: "💬",
      tone: "light",
      onClick: () => showToast("이 장소의 동행 모집글 목록으로 연결 예정입니다."),
    },
    {
      label: isMarket ? "현장 QR" : "인증 상점",
      desc: isMarket ? "가게 QR 스캔" : "근처 상점",
      icon: isMarket ? "🪙" : "🏪",
      tone: "accent",
      onClick: () => isMarket ? showToast("현장에서 가게 QR을 스캔하면 결제를 시작할 수 있어요.") : showToast("주변 인증 상점 영역으로 이동합니다."),
    },
  ] : [];

  return (
    <div style={S.screen} className="web-place-detail">
      <div className="web-page-topbar" style={{ background: COLORS.primary, padding: "44px 16px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div onClick={onBack} style={{ color: "#fff", fontSize: 14, cursor: "pointer" }}>← 뒤로</div>
        {/* TODO: 찜 등록/취소 API 확정 시 로컬 상태 대신 실제 요청으로 교체합니다. */}
        <div onClick={() => setLiked(!liked)} style={{ fontSize: 22, cursor: "pointer" }}>{liked ? "❤️" : "🤍"}</div>
      </div>
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
        <div
          className="web-place-visual place-night-visual"
          style={{ "--place-hero-image": heroImage ? `url("${heroImage}")` : undefined, height: 200, background: "#F0EBE0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 80 }}
        >
          <div className="place-visual-overlay">
            <span className="place-price-tag">지금 방문하기 좋은 골목</span>
            <strong>{currentPlace.name}</strong>
            <p>{currentPlace.type === "전통시장" ? "먹거리 골목과 포차 불빛을 따라 걷는 로컬 탐험 코스" : "주변 시장과 함께 묶어 걷기 좋은 로컬 산책 포인트"}</p>
          </div>
        </div>
        <div className="web-place-content" style={{ padding: 20 }}>
          {status === "error" && (
            <div style={{ background: "#FFF3D0", borderRadius: 12, padding: "10px 12px", color: "#8A5A00", fontSize: 14, marginBottom: 12 }}>
              {error} 전달받은 장소 정보로 표시합니다.
            </div>
          )}
          <div className="web-detail-title" style={{ fontSize: 22, fontWeight: 700, color: COLORS.primary, marginBottom: 6 }}>{currentPlace.name}</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: 14, background: COLORS.greenBg, color: COLORS.green, borderRadius: 6, padding: "2px 8px", fontWeight: 600 }}>{currentPlace.type}</span>
            <StarRating rating={currentPlace.rating} />
            <span style={{ fontSize: 14, color: COLORS.textMuted }}>리뷰 {currentPlace.reviews}개</span>
          </div>
          <div style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 2 }}>📍 {currentPlace.addr || "주소 정보 없음"}</div>
          <div style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 20 }}>🕐 {currentPlace.hours || "운영시간 정보 없음"}</div>
          <div className="place-live-summary">
            <div><span>현재 분위기</span><strong>{currentPlace.type === "전통시장" ? "먹거리 골목 인기" : "산책 코스 추천"}</strong></div>
            <div><span>예상 체류</span><strong>{currentPlace.type === "전통시장" ? "70~90분" : "45~60분"}</strong></div>
            <div><span>거리</span><strong>{currentPlace.dist}</strong></div>
            <div><span>리뷰</span><strong>{currentPlace.reviews}개</strong></div>
          </div>
          <div className="place-action-panel">
            <div className="place-action-head">
              <span>이 장소에서 바로 할 일</span>
              <small>탐색부터 결제까지 이어지는 핵심 기능</small>
            </div>
            <div className="place-action-grid">
              {primaryActions.map(action => (
                <button key={action.label} type="button" className={`place-action-card ${action.tone}`} onClick={action.onClick}>
                  <span>{action.icon}</span>
                  <strong>{action.label}</strong>
                  <small>{action.desc}</small>
                </button>
              ))}
            </div>
          </div>
          <div className="web-action-row" style={{ display: "flex", gap: 10, marginBottom: 24 }}>
            <div onClick={() => showToast("신고 API 연결 전까지 접수 화면은 mock으로 유지합니다.")} style={{ flex: 1, background: COLORS.primary, color: "#fff", borderRadius: 12, padding: "12px 0", textAlign: "center", fontWeight: 700, cursor: "pointer" }}>🚩 정보 신고</div>
            <div onClick={() => showToast("공유 링크가 복사되었습니다!")} style={{ flex: 1, background: COLORS.bg, color: COLORS.primary, borderRadius: 12, padding: "12px 0", textAlign: "center", fontWeight: 700, cursor: "pointer", border: "0.5px solid rgba(0,0,0,0.1)" }}>🔗 공유</div>
          </div>

          {/* 소개 / 리뷰 탭 */}
          <div style={{ display: "flex", borderBottom: "1px solid rgba(0,0,0,0.08)", marginBottom: 20 }}>
            {["소개", "리뷰"].map(t => (
              <div key={t} onClick={() => setTab(t)} style={{ flex: 1, textAlign: "center", padding: "10px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", color: tab === t ? COLORS.primary : COLORS.textMuted, borderBottom: tab === t ? `2px solid ${COLORS.primary}` : "none" }}>{t}</div>
            ))}
          </div>

          {tab === "소개" ? (
            <div>
              <p style={{ fontSize: 14, color: COLORS.textSub, lineHeight: 1.7 }}>{currentPlace.desc || "장소 소개가 아직 준비되지 않았습니다."}</p>
              <div className="place-explore-panel">
                <div>
                  <span className="place-panel-kicker">먹거리 포인트</span>
                  <div className="place-food-grid">
                    {FOOD_POINTS.map((food) => <span key={food}>{food}</span>)}
                  </div>
                </div>
                <div>
                  <span className="place-panel-kicker">현지인 코스</span>
                  <div className="place-route-strip">
                    {ROUTE_STEPS.map((step, index) => (
                      <div key={step}>
                        <b>{index + 1}</b>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
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
                {/* TODO: 장소 주변 상점 API가 확정되면 mock 목록을 실제 응답으로 교체합니다. */}
                <div className="web-store-list" style={{ display: "flex", gap: 10 }}>
                  {nearbyStores.length === 0 ? (
                    <EmptyState
                      icon="상점"
                      title="표시할 주변 상점이 없습니다."
                      description="주변 인증 상점 API가 연결되면 이곳에 상점 목록이 표시됩니다."
                    />
                  ) : nearbyStores.map((store, index) => (
                    <button
                      key={store.id}
                      type="button"
                      className="place-nearby-store-card"
                      onClick={() => onShopClick?.({ ...store, imageUrl: heroImage, place: currentPlace, placeName: currentPlace.name, marketName: store.marketName || currentPlace.name })}
                    >
                      🏪 {store.name}<br />
                      <span style={{ fontSize: 14, color: COLORS.textMuted }}>{STORE_MENU_PREVIEWS[index % STORE_MENU_PREVIEWS.length]}</span><br />
                      {store.verified && <span style={{ fontSize: 14, color: COLORS.green }}>✅ 인증 상점</span>}
                    </button>
                  ))}
                </div>
              </div>
              <div className="place-companion-panel">
                <div className="place-action-head">
                  <span>이 장소 동행 모집</span>
                  <small>채팅방 참여 신청 흐름 연결 예정</small>
                </div>
                {/* TODO: /community/posts/companions API에서 placeId 기반 모집글 조회가 가능해지면 mock을 교체합니다. */}
                <div className="place-companion-list">
                  {COMPANION_PREVIEWS.map(item => (
                    <button key={item.id} type="button" onClick={() => showToast("동행 모집글 상세로 연결 예정입니다.")}>
                      <span>{item.status}</span>
                      <strong>{item.title}</strong>
                      <small>{item.meta}</small>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div>
              {/* TODO: POST /places/{placeId}/reviews API 연동 */}
              {place?.reviewIntent && (
                <div className="place-review-intent">
                  <span>결제내역에서 이동했습니다.</span>
                  <strong>{place.shopName || currentPlace.name} · {place.paidAmount || "결제 금액 확인 중"}</strong>
                  <small>방문한 상점의 후기를 남길 수 있게 실제 리뷰 작성 API 연결이 필요합니다.</small>
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
                    <button type="button" onClick={submitReview}>등록</button>
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
                  <div style={{ color: COLORS.accent, fontSize: 14, marginBottom: 4 }}>{"★".repeat(r.rating)}</div>
                  <div style={{ fontSize: 14, color: COLORS.textSub }}>{r.text}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
      </div>
      )}
    </div>
  );
}
