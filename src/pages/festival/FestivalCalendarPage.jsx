import { useEffect, useState } from "react";
import { COLORS, S } from "../../constants/colors";
import { EmptyState, ErrorState } from "../../components/common";
import { getApiErrorHint, shouldUseMockFallback } from "../../services/apiClient.js";
import { fetchFestivalsByMonth, getMockFestivals } from "../../services/festivalService.js";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

export default function FestivalCalendarPage({ onBack }) {
  const [year, setYear] = useState(2025);
  const [month, setMonth] = useState(6);
  const [selectedDay, setSelectedDay] = useState(1);
  const [festivals, setFestivals] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const loadMonthFestivals = () => {
    setStatus("loading");
    setErrorMessage("");

    fetchFestivalsByMonth({ year, month })
      .then((data) => {
        setFestivals(data);
        setStatus(data.length > 0 ? "success" : "empty");
      })
      .catch((error) => {
        if (!shouldUseMockFallback(error)) {
          setFestivals([]);
          setErrorMessage(getApiErrorHint(error));
          setStatus("error");
          return;
        }
        setFestivals(getMockFestivals().filter(festival => !festival.monthNumber || festival.monthNumber === month));
        setStatus("mock");
      });
  };

  useEffect(() => {
    let ignore = false;
    if (!ignore) loadMonthFestivals();
    return () => { ignore = true; };
  }, [year, month]);

  // 해당 월 첫날 요일, 마지막 날
  const firstDay = new Date(year, month - 1, 1).getDay();
  const lastDate = new Date(year, month, 0).getDate();

  // TODO: 축제 캘린더 API가 확정되면 날짜별 응답으로 교체합니다.
  const festByDay = {};
  festivals.forEach(f => {
    const start = f.dayNumber;
    if (!start) return;
    for (let d = start; d <= start + 14 && d <= lastDate; d++) {
      if (!festByDay[d]) festByDay[d] = [];
      festByDay[d].push(f);
    }
  });

  const selectedFests = festByDay[selectedDay] || [];

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const dotColors = ["#E24B4A", "#1D9E75", "#378ADD"];

  return (
    <div style={S.screen}>
      <div style={{ background: COLORS.primary, padding: "44px 16px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span onClick={onBack} style={{ color: "#fff", fontSize: 20, cursor: "pointer" }}>←</span>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span onClick={prevMonth} style={{ color: "#fff", fontSize: 20, cursor: "pointer" }}>‹</span>
          <span style={{ color: "#fff", fontSize: 16, fontWeight: 700 }}>{year}년 {month}월</span>
          <span onClick={nextMonth} style={{ color: "#fff", fontSize: 20, cursor: "pointer" }}>›</span>
        </div>
        <div style={{ width: 20 }} />
      </div>

      <div style={S.scrollArea}>
        {/* 캘린더 헤더 */}
        <div style={{ background: "#fff", padding: "12px 16px 0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 8 }}>
            {DAYS.map((d, i) => (
              <div key={d} style={{ textAlign: "center", fontSize: 14, fontWeight: 700, color: i === 0 ? "#E24B4A" : i === 6 ? "#378ADD" : COLORS.textMuted, padding: "4px 0" }}>{d}</div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px 0", paddingBottom: 12 }}>
            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: lastDate }).map((_, i) => {
              const day = i + 1;
              const hasFest = festByDay[day]?.length > 0;
              const isSelected = selectedDay === day;
              const isToday = day === 17 && month === 5;
              return (
                <div key={day} onClick={() => setSelectedDay(day)} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "4px 2px", cursor: "pointer" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: isSelected ? COLORS.primary : isToday ? COLORS.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 14, fontWeight: isSelected || isToday ? 700 : 400, color: isSelected ? "#fff" : isToday ? COLORS.primary : (i % 7 === 0 - firstDay % 7 ? "#E24B4A" : COLORS.primary) }}>{day}</span>
                  </div>
                  {hasFest && (
                    <div style={{ display: "flex", gap: 2, marginTop: 2 }}>
                      {festByDay[day].slice(0, 3).map((_, fi) => (
                        <div key={fi} style={{ width: 5, height: 5, borderRadius: "50%", background: dotColors[fi % 3] }} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* TODO: 축제 목록/상세/기간별 조회 API 연동 */}
        <div style={{ margin: "12px 16px", background: "#FFF3D0", borderRadius: 12, padding: "10px 14px", display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 16 }}>ℹ️</span>
          <span style={{ fontSize: 14, color: "#B87800" }}>
            {status === "loading" ? "축제 캘린더를 불러오는 중입니다." : "축제 API 미확정 — 현재 목업 데이터"}
          </span>
        </div>

        {/* 선택한 날 축제 목록 */}
        <div style={{ padding: "0 16px 16px" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.primary, marginBottom: 12 }}>
            {month}월 {selectedDay}일 행사 {selectedFests.length > 0 ? `(${selectedFests.length}건)` : ""}
          </div>
          {status === "error" ? (
            <ErrorState
              title="축제 캘린더를 불러오지 못했습니다."
              description={errorMessage || "백엔드 연결 상태를 확인한 뒤 다시 시도해주세요."}
              onRetry={loadMonthFestivals}
            />
          ) : selectedFests.length === 0 ? (
            <EmptyState
              icon="📅"
              title="이 날은 행사가 없어요."
              description="다른 날짜를 눌러 진행 예정인 축제와 이벤트를 확인해보세요."
            />
          ) : (
            selectedFests.map(f => (
              <div key={f.id} style={{ background: "#fff", borderRadius: 16, padding: 16, marginBottom: 10, display: "flex", gap: 14, alignItems: "center", border: "0.5px solid rgba(0,0,0,0.06)" }}>
                <div style={{ background: f.color, borderRadius: 12, padding: "10px 14px", textAlign: "center", minWidth: 52 }}>
                  <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>{f.month}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: f.accentColor, lineHeight: 1 }}>{f.day}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.primary, marginBottom: 4 }}>{f.name}</div>
                  <div style={{ fontSize: 14, color: COLORS.textMuted }}>📍 {f.location} · {f.date}</div>
                </div>
                <span style={{ background: "#FFF3D0", color: "#B87800", fontSize: 14, fontWeight: 700, borderRadius: 8, padding: "4px 10px" }}>{f.dday}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
