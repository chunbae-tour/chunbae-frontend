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
  const monthNumber = festival.monthNumber ?? MONTH_LABEL_TO_NUMBER[festival.month] ?? null;
  const dayNumber = festival.dayNumber ?? Number.parseInt(festival.day, 10) ?? null;

  return {
    ...festival,
    id: festival.festivalId ?? festival.id,
    festivalId: festival.festivalId ?? festival.id,
    name: festival.name ?? "",
    location: festival.location ?? "",
    date: festival.date ?? "",
    dday: festival.dday ?? "",
    month: festival.month ?? "",
    monthNumber,
    day: festival.day ?? "",
    dayNumber,
    color: festival.color ?? "#1A1A2E",
    accentColor: festival.accentColor ?? "#FFB41E",
  };
}

export function getMockFestivals() {
  return MOCK_FESTIVALS.map(normalizeFestival);
}

export async function fetchFestivals() {
  const data = await apiRequest("/search/festivals?size=20");
  return getPageContent(data).map(normalizeFestival);
}

export async function fetchFestivalsByMonth({ month }) {
  const query = month ? `?month=${month}&size=50` : "?size=50";
  const data = await apiRequest(`/search/festivals${query}`);
  return getPageContent(data).map(normalizeFestival);
}
