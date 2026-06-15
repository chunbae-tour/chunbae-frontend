import { useEffect, useState } from "react";
import { EmptyState, ErrorState, SkeletonList } from "../../components/common";
import { COLORS, S } from "../../constants/colors";
import { getApiErrorHint } from "../../services/apiClient.js";
import { fetchDailyFestivals, fetchFestivalCalendar } from "../../services/festivalService.js";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const PROGRESS_LABELS = {
  UPCOMING: "예정",
  IN_PROGRESS: "진행 중",
  ENDED: "종료",
};

function getFestivalStatus(festival = {}) {
  return festival.progressStatus ?? festival.dday ?? "";
}

function getFestivalDotColor(festival = {}) {
  const categoryText = `${festival.category ?? ""} ${festival.name ?? ""}`.toLowerCase();
  if (categoryText.includes("museum") || categoryText.includes("exhibition") || categoryText.includes("박물관") || categoryText.includes("전시")) {
    return "#E8A020";
  }
  return getFestivalStatus(festival) === "UPCOMING" ? "#185FA5" : "#2C6E49";
}

function toDateParam(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
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
  const prevLastDate = new Date(year, month - 1, 0).getDate();
  const festByDay = {};

  Object.entries(calendarEvents).forEach(([date, events]) => {
    festByDay[Number(date.slice(-2))] = Array.isArray(events) ? events : [];
  });

  const calendarCells = Array.from({ length: 42 }, (_, index) => {
    const currentDay = index - firstDay + 1;
    if (currentDay < 1) {
      const date = new Date(year, month - 2, 1);
      return {
        day: prevLastDate + currentDay,
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        monthOffset: -1,
      };
    }
    if (currentDay > lastDate) {
      const date = new Date(year, month, 1);
      return {
        day: currentDay - lastDate,
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        monthOffset: 1,
      };
    }
    return { day: currentDay, month, year, monthOffset: 0 };
  });

  const selectCalendarDay = (cell) => {
    setSelectedDay(cell.day);
    if (cell.monthOffset === 0) return;
    setYear(cell.year);
    setMonth(cell.month);
  };

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
    <div style={S.screen} className="festival-page">
      <div className="festival-page-header festival-calendar-header" style={{ background: COLORS.primary, padding: "44px 16px 0" }}>
        <div className="festival-calendar-month-nav">
          <span onClick={onBack} style={{ color: "#fff", fontSize: 20, cursor: "pointer" }}>←</span>
          <div>
            <button type="button" onClick={prevMonth} aria-label="이전 달">‹</button>
            <strong>{year}년 {month}월</strong>
            <button type="button" onClick={nextMonth} aria-label="다음 달">›</button>
          </div>
          <span />
        </div>
        <div className="festival-view-tabs">
          <button type="button" onClick={onBack}>목록</button>
          <button type="button" className="active">캘린더</button>
        </div>
      </div>

      <div style={S.scrollArea}>
        <div className="festival-calendar-layout">
          <section className="festival-hanok-calendar">
            <div className="festival-hanok-roof" aria-hidden="true">
              <span />
              <div>{Array.from({ length: 14 }).map((_, index) => <i key={index} />)}</div>
            </div>
            <div className="festival-hanok-body">
              <div className="festival-calendar-grid">
                <div className="festival-calendar-weekdays">
                  {DAYS.map((day, index) => (
                    <div key={day} className={index === 0 ? "sunday" : index === 6 ? "saturday" : ""}>{day}</div>
                  ))}
                </div>

                <div className="festival-calendar-days">
                  {calendarCells.map((cell, index) => {
                    const dayEvents = cell.monthOffset === 0 ? festByDay[cell.day] ?? [] : [];
                    const hasFest = dayEvents.length > 0;
                    const isSelected = cell.monthOffset === 0 && selectedDay === cell.day;
                    const isToday = cell.day === today.getDate() && cell.month === today.getMonth() + 1 && cell.year === today.getFullYear();
                    const weekday = index % 7;
                    const defaultColor = weekday === 0 ? "#E24B4A" : weekday === 6 ? "#378ADD" : COLORS.primary;

                    return (
                      <button
                        type="button"
                        key={`${cell.year}-${cell.month}-${cell.day}`}
                        onClick={() => selectCalendarDay(cell)}
                        className={`festival-calendar-day${isSelected ? " selected" : ""}${isToday ? " today" : ""}${cell.monthOffset !== 0 ? " muted" : ""}`}
                      >
                        <span className="festival-calendar-day-number" style={{ color: !isSelected && !isToday ? defaultColor : undefined }}>{cell.day}</span>
                        {hasFest && (
                          <div className="festival-calendar-dots">
                            {dayEvents.slice(0, 4).map((event, eventIndex) => (
                              <i key={`${event.festivalId ?? event.id ?? cell.day}-${eventIndex}`} style={{ background: getFestivalDotColor(event) }} />
                            ))}
                            {dayEvents.length > 4 && <small>+{dayEvents.length - 4}</small>}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className="festival-daily-panel">
          <div className="festival-daily-title">
            <strong>{month}월 {selectedDay}일 행사</strong>
            <span>{festivals.length}건</span>
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
              title="이 날 예정된 행사가 없어요."
              description="다른 날짜를 눌러 진행 예정인 축제와 이벤트를 확인해보세요."
            />
          ) : (
            festivals.map(festival => {
              const progressStatus = getFestivalStatus(festival);
              return (
              <button type="button" onClick={() => onFestival?.(festival)} key={festival.id} className="festival-list-card">
                <div className="festival-card-copy">
                  <strong>{festival.name}</strong>
                  <span className="festival-location-line"><LocationIcon />{festival.location || "장소 미정"} · {festival.date}</span>
                </div>
                <span className={`festival-status-badge ${String(progressStatus).toLowerCase()}`}>{PROGRESS_LABELS[progressStatus] ?? progressStatus}</span>
                <span className="festival-card-chevron" aria-hidden="true">›</span>
              </button>
            )})
          )}
          </section>
        </div>
      </div>
    </div>
  );
}
