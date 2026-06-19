import { useEffect, useState } from "react";
import MapPreview from "../../components/MapPreview.jsx";
import { ErrorState, SkeletonList } from "../../components/common";
import { S } from "../../constants/colors";
import { getApiErrorHint } from "../../services/apiClient.js";
import {
  addFestivalLike,
  fetchFestivalDetail,
  removeFestivalLike,
} from "../../services/festivalService.js";
import { getFestivalProgress } from "../../utils/festivalProgress.js";

const PROGRESS_LABELS = {
  UPCOMING: "예정",
  IN_PROGRESS: "진행 중",
  ENDED: "종료",
};

function ExternalLinkIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 3h7v7" />
      <path d="M10 14 21 3" />
      <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
    </svg>
  );
}

function getFestivalStatus(detail = {}) {
  return String(detail.progressStatus ?? detail.dday ?? "")
    .trim()
    .toUpperCase()
    .replace(/-/g, "_");
}

export default function FestivalDetailPage({ festival, onBack }) {
  const festivalId = festival?.festivalId ?? festival?.id;
  const [detail, setDetail] = useState(festival);
  const [status, setStatus] = useState(festival ? "success" : "loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [liked, setLiked] = useState(Boolean(festival?.isLiked ?? festival?.liked));
  const [likeSaving, setLikeSaving] = useState(false);

  const loadDetail = async () => {
    if (!festivalId) {
      setStatus("error");
      setErrorMessage("축제 ID를 찾지 못했습니다.");
      return;
    }

    setStatus("loading");
    setErrorMessage("");
    try {
      const nextDetail = await fetchFestivalDetail(festivalId);
      setDetail(nextDetail);
      setLiked(Boolean(nextDetail?.isLiked ?? nextDetail?.liked));
      setStatus("success");
      setErrorMessage("");
    } catch (error) {
      if (festival) {
        setDetail(festival);
        setStatus("success");
        setErrorMessage(getApiErrorHint(error));
        return;
      }
      setStatus("error");
      setErrorMessage(getApiErrorHint(error));
    }
  };

  useEffect(() => {
    loadDetail();
  }, [festivalId]);

  const handleToggleLike = async () => {
    if (!festivalId || likeSaving) return;

    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeSaving(true);
    setErrorMessage("");

    try {
      if (nextLiked) {
        await addFestivalLike(festivalId);
      } else {
        await removeFestivalLike(festivalId);
      }
    } catch (error) {
      setLiked(!nextLiked);
      setErrorMessage(getApiErrorHint(error));
    } finally {
      setLikeSaving(false);
    }
  };

  const progressStatus = getFestivalStatus(detail);
  const progress = getFestivalProgress(detail?.startDate, detail?.endDate, progressStatus);
  const heroStyle = detail?.imageUrl
    ? { "--festival-hero-image": `url(${JSON.stringify(detail.imageUrl)})` }
    : {};

  return (
    <div style={S.screen} className="festival-detail-page">
      <div className="festival-detail-topbar">
        <button type="button" onClick={onBack} aria-label="뒤로 가기">
          ←
        </button>
        <strong>축제 상세</strong>
      </div>
      <div style={S.scrollArea}>
        {status === "loading" ? (
          <div className="festival-detail-loading">
            <SkeletonList count={4} />
          </div>
        ) : status === "error" ? (
          <div className="festival-detail-loading">
            <ErrorState
              title="축제 상세 정보를 불러오지 못했습니다."
              description={errorMessage}
              onRetry={loadDetail}
            />
          </div>
        ) : (
          <article className="festival-detail-layout">
            {errorMessage && (
              <div className="festival-detail-warning">
                최신 상세 정보는 불러오지 못해 목록에서 받은 정보를 표시합니다. {errorMessage}
              </div>
            )}

            <section
              className={`festival-detail-hero ${detail?.imageUrl ? "has-image" : ""}`}
              style={heroStyle}
            >
              <span className={`festival-hero-status ${String(progressStatus).toLowerCase()}`}>
                {PROGRESS_LABELS[progressStatus] ?? progressStatus}
              </span>
              <button
                type="button"
                className={`festival-hero-like ${liked ? "liked" : ""}`}
                onClick={handleToggleLike}
                disabled={likeSaving}
                aria-label={liked ? "축제 찜 해제" : "축제 찜하기"}
              >
                {liked ? "♥" : "♡"}
              </button>
            </section>

            <header className="festival-detail-title-row">
              <div>
                <span>{detail?.region || "지역 정보 없음"}</span>
                <h1>{detail?.name}</h1>
              </div>
              {detail?.relatedUrl && (
                <a
                  className="festival-official-btn"
                  href={detail.relatedUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  공식 정보 <ExternalLinkIcon />
                </a>
              )}
            </header>

            <section className="festival-info-card">
              <div className="festival-progress-head">
                <strong>행사 진행 상황</strong>
                <span>{progress.label}</span>
              </div>
              <div
                className="festival-progress-bar"
                aria-label={`행사 진행률 ${progress.percent}%`}
              >
                <i
                  className={progress.isEnded ? "ended" : ""}
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <div className="festival-progress-dates">
                <span>{detail?.startDate || "시작일 미정"} 시작</span>
                <span>{detail?.endDate || "종료일 미정"} 종료</span>
              </div>
              <dl className="festival-info-list">
                <div>
                  <dt>지역</dt>
                  <dd>{detail?.region || "지역 정보 없음"}</dd>
                </div>
                <div>
                  <dt>주소</dt>
                  <dd>{detail?.address || "주소 정보 없음"}</dd>
                </div>
              </dl>
            </section>

            <section className="festival-detail-card">
              <h2>축제 소개</h2>
              <p>{detail?.description || "등록된 축제 소개가 없습니다."}</p>
            </section>

            {(detail?.latitude != null || detail?.lat != null) &&
              (detail?.longitude != null || detail?.lng != null) && (
                <section className="festival-detail-card festival-location-card">
                  <h2>위치</h2>
                  <MapPreview
                    name={detail?.name}
                    address={detail?.address}
                    latitude={detail?.latitude ?? detail?.lat}
                    longitude={detail?.longitude ?? detail?.lng}
                  />
                </section>
              )}
          </article>
        )}
      </div>
    </div>
  );
}
