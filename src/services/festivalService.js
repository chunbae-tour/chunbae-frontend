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

function toLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getYearEndDateString(date = new Date()) {
  return `${date.getFullYear()}-12-31`;
}

function parseLocalDate(value) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function compareDateValue(a, b) {
  return (a?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b?.getTime() ?? Number.MAX_SAFE_INTEGER);
}

function getFestivalSortBucket(festival = {}, today = new Date()) {
  const startDate = parseLocalDate(festival.startDate);
  const endDate = parseLocalDate(festival.endDate) ?? startDate;
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  if (startDate && startDate >= monthStart && startDate <= monthEnd) {
    return { group: 0, date: startDate };
  }
  if (endDate && endDate >= todayStart && endDate <= monthEnd) {
    return { group: 1, date: endDate };
  }
  if (startDate && startDate >= todayStart) {
    return { group: 2, date: startDate };
  }
  return { group: 3, date: endDate ?? startDate };
}

export function normalizeFestival(festival = {}) {
  const startDate = festival.startDate ?? "";
  const startParts = startDate ? startDate.split("-").map(Number) : [];
  const monthNumber = festival.monthNumber ?? MONTH_LABEL_TO_NUMBER[festival.month] ?? startParts[1] ?? null;
  const dayNumber = festival.dayNumber ?? (Number.parseInt(festival.day, 10) || startParts[2] || null);
  const imageUrl = festival.imageUrl ?? festival.thumbnailUrl ?? "";
  const address = festival.address ?? festival.location ?? "";

  return {
    ...festival,
    id: festival.festivalId ?? festival.id,
    festivalId: festival.festivalId ?? festival.id,
    name: festival.name ?? "",
    imageUrl,
    thumbnailUrl: festival.thumbnailUrl ?? imageUrl,
    address,
    location: address,
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

export async function fetchFestivals() {
  return fetchRemainingYearFestivals();
}

export async function searchFestivals({
  q = "",
  startDate,
  endDate,
  region = "",
  cursor = "",
  size = 100,
  source = "",
} = {}) {
  const params = new URLSearchParams({ size: String(size) });
  if (q) params.set("q", q);
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  if (region) params.set("region", region);
  if (cursor) params.set("cursor", cursor);
  if (source) params.set("source", source);

  const data = await apiRequest(`/api/v1/search/festivals?${params.toString()}`);
  return {
    content: getPageContent(data).map(normalizeFestival),
    nextCursor: data?.nextCursor ?? null,
    hasNext: Boolean(data?.hasNext),
    size: data?.size ?? getPageContent(data).length,
    didYouMean: data?.didYouMean ?? "",
  };
}

export async function fetchRemainingYearFestivals({ today = new Date(), size = 100, maxPages = 12 } = {}) {
  const startDate = toLocalDateString(today);
  const endDate = getYearEndDateString(today);
  const allItems = [];
  let cursor = "";

  for (let page = 0; page < maxPages; page += 1) {
    const data = await searchFestivals({ startDate, endDate, cursor, size });
    allItems.push(...data.content);

    if (!data.hasNext || !data.nextCursor) break;
    cursor = data.nextCursor;
  }

  return allItems.sort((a, b) => {
    const aSort = getFestivalSortBucket(a, today);
    const bSort = getFestivalSortBucket(b, today);
    if (aSort.group !== bSort.group) return aSort.group - bSort.group;
    const dateCompare = compareDateValue(aSort.date, bSort.date);
    if (dateCompare !== 0) return dateCompare;
    return Number(a.festivalId ?? a.id ?? 0) - Number(b.festivalId ?? b.id ?? 0);
  });
}

export async function fetchFestivalDetail(festivalId) {
  const data = await apiRequest(`/festivals/${festivalId}`);
  return normalizeFestival(data);
}

export async function fetchFestivalCalendar({ year, month }) {
  const params = new URLSearchParams({ year: String(year), month: String(month) });
  try {
    const data = await apiRequest(`/calendar?${params.toString()}`);
    return {
      year: data.year ?? year,
      month: data.month ?? month,
      markedDates: Array.isArray(data.markedDates) ? data.markedDates : [],
      events: data.events ?? {},
    };
  } catch (error) {
    if (error?.status === 404) {
      return { year, month, markedDates: [], events: {} };
    }
    throw error;
  }
}

export async function fetchDailyFestivals(date) {
  const params = new URLSearchParams({ date });
  try {
    const data = await apiRequest(`/calendar/daily?${params.toString()}`);
    return {
      date: data.date ?? date,
      events: Array.isArray(data.events) ? data.events.map(normalizeFestival) : [],
    };
  } catch (error) {
    if (error?.status === 404) {
      return { date, events: [] };
    }
    throw error;
  }
}
