import { useEffect, useState } from "react";
import { EmptyState, ErrorState, SkeletonList } from "../../components/common";
import { COLORS, S } from "../../constants/colors";
import { getApiErrorHint } from "../../services/apiClient.js";
import { fetchDailyFestivals, fetchFestivalCalendar } from "../../services/festivalService.js";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const DOT_COLORS = ["#E24B4A", "#1D9E75", "#378ADD"];
const PROGRESS_LABELS = {
  UPCOMING: "예정",
  IN_PROGRESS: "진행 중",
  ENDED: "종료",
};

function toDateParam(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function FestivalCalendarPage({ onBack, onFestival }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [calendarEvents, setCalendarEvents] = useState({});
  const [festivals, setFestivals] = useState([]);
  const [status, setStatus] = useState("loading");
  const [dailyStatus, setDailyStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const loadMonthFestivals = async () => {
    setStatus("loading");
    setErrorMessage("");
    try {
      const data = await fetchFestivalCalendar({ year, month });
      setCalendarEvents(data.events);
      setStatus(data.markedDates.length > 0 ? "success" : "empty");
    } catch (error) {
      setCalendarEvents({});
      setErrorMessage(getApiErrorHint(error));
      setStatus("error");
    }
  };

  useEffect(() => {
    const lastDate = new Date(year, month, 0).getDate();
    setSelectedDay(day => Math.min(day, lastDate));
    loadMonthFestivals();
  }, [year, month]);

  const selectedDate = toDateParam(year, month, selectedDay);

  const loadDailyFestivals = async () => {
    setDailyStatus("loading");
    setErrorMessage("");
    try {
      const data = await fetchDailyFestivals(selectedDate);
      setFestivals(data.events);
      setDailyStatus(data.events.length > 0 ? "success" : "empty");
    } catch (error) {
      setFestivals([]);
      setErrorMessage(getApiErrorHint(error));
      setDailyStatus("error");
    }
  };

  useEffect(() => {
    loadDailyFestivals();
  }, [selectedDate]);

  const firstDay = new Date(year, month - 1, 1).getDay();
  const lastDate = new Date(year, month, 0).getDate();
  const festByDay = {};

  Object.entries(calendarEvents).forEach(([date, events]) => {
    festByDay[Number(date.slice(-2))] = Array.isArray(events) ? events : [];
  });

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(value => value - 1);
      return;
    }
    setMonth(value => value - 1);
  };

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(value => value + 1);
      return;
    }
    setMonth(value => value + 1);
  };

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
        <div style={{ background: "#fff", padding: "12px 16px 0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 8 }}>
            {DAYS.map((day, index) => (
              <div key={day} style={{ textAlign: "center", fontSize: 14, fontWeight: 700, color: index === 0 ? "#E24B4A" : index === 6 ? "#378ADD" : COLORS.textMuted, padding: "4px 0" }}>{day}</div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px 0", paddingBottom: 12 }}>
            {Array.from({ length: firstDay }).map((_, index) => <div key={`empty-${index}`} />)}
            {Array.from({ length: lastDate }).map((_, index) => {
              const day = index + 1;
              const hasFest = festByDay[day]?.length > 0;
              const isSelected = selectedDay === day;
              const isToday = day === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear();
              const weekday = (firstDay + index) % 7;
              const defaultColor = weekday === 0 ? "#E24B4A" : weekday === 6 ? "#378ADD" : COLORS.primary;

              return (
                <div key={day} onClick={() => setSelectedDay(day)} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "4px 2px", cursor: "pointer" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: isSelected ? COLORS.primary : isToday ? COLORS.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 14, fontWeight: isSelected || isToday ? 700 : 400, color: isSelected ? "#fff" : isToday ? COLORS.primary : defaultColor }}>{day}</span>
                  </div>
                  {hasFest && (
                    <div style={{ display: "flex", gap: 2, marginTop: 2 }}>
                      {festByDay[day].slice(0, 3).map((event, eventIndex) => (
                        <div key={`${event.festivalId}-${eventIndex}`} style={{ width: 5, height: 5, borderRadius: "50%", background: DOT_COLORS[eventIndex % DOT_COLORS.length] }} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ padding: "12px 16px 16px" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.primary, marginBottom: 12 }}>
            {month}월 {selectedDay}일 행사 {festivals.length > 0 ? `(${festivals.length}건)` : ""}
          </div>
          {status === "error" && (
            <div style={{ background: "#FFF3D0", color: "#B87800", borderRadius: 8, padding: "10px 12px", marginBottom: 12, fontSize: 14 }}>
              월별 축제 표시를 불러오지 못했습니다. 날짜별 축제 목록은 계속 확인할 수 있습니다.
            </div>
          )}
          {dailyStatus === "loading" ? (
            <SkeletonList count={3} />
          ) : dailyStatus === "error" ? (
            <ErrorState
              title="선택한 날짜의 축제를 불러오지 못했습니다."
              description={errorMessage || "잠시 후 다시 시도해주세요."}
              onRetry={loadDailyFestivals}
            />
          ) : festivals.length === 0 ? (
            <EmptyState
              icon="📅"
              title="이 날은 행사가 없어요."
              description="다른 날짜를 눌러 진행 예정인 축제와 이벤트를 확인해보세요."
            />
          ) : (
            festivals.map(festival => (
              <button type="button" onClick={() => onFestival?.(festival)} key={festival.id} style={{ width: "100%", background: "#fff", borderRadius: 16, padding: 16, marginBottom: 10, display: "flex", gap: 14, alignItems: "center", border: "0.5px solid rgba(0,0,0,0.06)", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
                <div style={{ background: festival.color, borderRadius: 12, padding: "10px 14px", textAlign: "center", minWidth: 52 }}>
                  <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>{festival.month}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: festival.accentColor, lineHeight: 1 }}>{festival.day}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.primary, marginBottom: 4 }}>{festival.name}</div>
                  <div style={{ fontSize: 14, color: COLORS.textMuted }}>📍 {festival.location || "장소 미정"} · {festival.date}</div>
                </div>
                <span style={{ background: "#FFF3D0", color: "#B87800", fontSize: 14, fontWeight: 700, borderRadius: 8, padding: "4px 10px", whiteSpace: "nowrap" }}>{PROGRESS_LABELS[festival.dday] ?? festival.dday}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
