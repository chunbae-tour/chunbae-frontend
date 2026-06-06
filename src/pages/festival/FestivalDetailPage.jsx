import { useEffect, useState } from "react";
import { ErrorState, SkeletonList } from "../../components/common";
import { COLORS, S } from "../../constants/colors";
import { getApiErrorHint } from "../../services/apiClient.js";
import { fetchFestivalDetail } from "../../services/festivalService.js";

const PROGRESS_LABELS = {
  UPCOMING: "진행 예정",
  IN_PROGRESS: "진행 중",
  ENDED: "종료",
};

export default function FestivalDetailPage({ festival, onBack }) {
  const festivalId = festival?.festivalId ?? festival?.id;
  const [detail, setDetail] = useState(festival);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const loadDetail = async () => {
    if (!festivalId) {
      setStatus("error");
      setErrorMessage("축제 ID를 찾지 못했습니다.");
      return;
    }

    setStatus("loading");
    setErrorMessage("");
    try {
      setDetail(await fetchFestivalDetail(festivalId));
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setErrorMessage(getApiErrorHint(error));
    }
  };

  useEffect(() => {
    loadDetail();
  }, [festivalId]);

  return (
    <div style={S.screen}>
      <div style={{ background: COLORS.primary, padding: "44px 20px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <button type="button" onClick={onBack} aria-label="뒤로 가기" style={{ border: 0, background: "transparent", color: "#fff", fontSize: 22, cursor: "pointer" }}>←</button>
        <strong style={{ color: "#fff", fontSize: 18 }}>축제 상세</strong>
      </div>
      <div style={S.scrollArea}>
        {status === "loading" ? (
          <div style={{ padding: 20 }}><SkeletonList count={4} /></div>
        ) : status === "error" ? (
          <div style={{ padding: 20 }}>
            <ErrorState title="축제 상세 정보를 불러오지 못했습니다." description={errorMessage} onRetry={loadDetail} />
          </div>
        ) : (
          <article style={{ maxWidth: 960, margin: "0 auto", padding: 20 }}>
            {detail.imageUrl && (
              <img src={detail.imageUrl} alt={detail.name} style={{ width: "100%", maxHeight: 420, objectFit: "cover", borderRadius: 8, marginBottom: 20 }} />
            )}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
              <div>
                <span style={{ display: "inline-block", background: "#FFF3D0", color: "#B87800", padding: "5px 10px", borderRadius: 6, fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
                  {PROGRESS_LABELS[detail.progressStatus] ?? detail.progressStatus}
                </span>
                <h1 style={{ color: COLORS.primary, fontSize: 28, margin: 0 }}>{detail.name}</h1>
              </div>
              {detail.relatedUrl && (
                <a href={detail.relatedUrl} target="_blank" rel="noreferrer" style={{ flexShrink: 0, background: COLORS.primary, color: "#fff", borderRadius: 6, padding: "10px 14px", textDecoration: "none", fontWeight: 700 }}>
                  공식 정보
                </a>
              )}
            </div>
            <section style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, padding: 20, marginBottom: 16 }}>
              <dl style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "14px 16px", margin: 0 }}>
                <dt style={{ color: COLORS.textMuted }}>기간</dt>
                <dd style={{ margin: 0, color: COLORS.primary, fontWeight: 600 }}>{detail.startDate} ~ {detail.endDate}</dd>
                <dt style={{ color: COLORS.textMuted }}>지역</dt>
                <dd style={{ margin: 0 }}>{detail.region || "지역 정보 없음"}</dd>
                <dt style={{ color: COLORS.textMuted }}>주소</dt>
                <dd style={{ margin: 0 }}>{detail.address || "주소 정보 없음"}</dd>
              </dl>
            </section>
            <section style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, padding: 20 }}>
              <h2 style={{ color: COLORS.primary, fontSize: 18, margin: "0 0 12px" }}>축제 소개</h2>
              <p style={{ color: COLORS.textSub, lineHeight: 1.7, whiteSpace: "pre-wrap", margin: 0 }}>
                {detail.description || "등록된 축제 소개가 없습니다."}
              </p>
            </section>
          </article>
        )}
      </div>
    </div>
  );
}
