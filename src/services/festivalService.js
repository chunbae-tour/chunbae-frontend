import { MOCK_FESTIVALS } from "../constants/mockData.js";
import { apiRequest, getPageContent } from "./apiClient.js";

const MONTH_LABEL_TO_NUMBER = {
  JAN: 1,
  FEB: 2,
  MAR: 3,
  APR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AUG: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DEC: 12,
};

export function normalizeFestival(festival = {}) {
  const startDate = festival.startDate ?? "";
  const startParts = startDate ? startDate.split("-").map(Number) : [];
  const monthNumber = festival.monthNumber ?? MONTH_LABEL_TO_NUMBER[festival.month] ?? startParts[1] ?? null;
  const dayNumber = festival.dayNumber ?? (Number.parseInt(festival.day, 10) || startParts[2] || null);

  return {
    ...festival,
    id: festival.festivalId ?? festival.id,
    festivalId: festival.festivalId ?? festival.id,
    name: festival.name ?? "",
    location: festival.location ?? festival.address ?? "",
    date: festival.date ?? (startDate && festival.endDate ? `${startDate} ~ ${festival.endDate}` : startDate),
    dday: festival.dday ?? festival.progressStatus ?? "",
    month: festival.month ?? (monthNumber ? `${monthNumber}월` : ""),
    monthNumber,
    day: festival.day ?? (dayNumber ? String(dayNumber) : ""),
    dayNumber,
    color: festival.color ?? "#1A1A2E",
    accentColor: festival.accentColor ?? "#FFB41E",
  };
}

export function getMockFestivals() {
  return MOCK_FESTIVALS.map(normalizeFestival);
}

export async function fetchFestivals() {
  const data = await apiRequest("/festivals?size=20");
  return getPageContent(data).map(normalizeFestival);
}

export async function fetchFestivalDetail(festivalId) {
  const data = await apiRequest(`/festivals/${festivalId}`);
  return normalizeFestival(data);
}

export async function fetchFestivalCalendar({ year, month }) {
  const params = new URLSearchParams({ year: String(year), month: String(month) });
  const data = await apiRequest(`/calendar?${params.toString()}`);
  return {
    year: data.year,
    month: data.month,
    markedDates: Array.isArray(data.markedDates) ? data.markedDates : [],
    events: data.events ?? {},
  };
}

export async function fetchDailyFestivals(date) {
  const params = new URLSearchParams({ date });
  const data = await apiRequest(`/calendar/daily?${params.toString()}`);
  return {
    date: data.date ?? date,
    events: Array.isArray(data.events) ? data.events.map(normalizeFestival) : [],
  };
}
