const DAY_MS = 86400000;

function parseLocalDate(value) {
  if (!value) return null;
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function getFestivalProgress(startDate, endDate, progressStatus) {
  const status = String(progressStatus || "").toUpperCase();
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate) ?? start;
  const today = startOfToday();

  if (!start || !end) {
    return {
      elapsedDays: 0,
      percent: status === "ENDED" ? 100 : 0,
      label: "기간 정보 확인 중",
      isEnded: status === "ENDED",
      isUpcoming: status === "UPCOMING",
    };
  }

  if (status === "ENDED" || today > end) {
    return {
      elapsedDays: Math.max(1, Math.floor((end - start) / DAY_MS) + 1),
      percent: 100,
      label: "종료",
      isEnded: true,
      isUpcoming: false,
    };
  }

  if (status === "UPCOMING" || today < start) {
    const dday = Math.max(0, Math.ceil((start - today) / DAY_MS));
    return {
      elapsedDays: 0,
      percent: 0,
      label: dday === 0 ? "오늘 시작" : `D-${dday}`,
      isEnded: false,
      isUpcoming: true,
    };
  }

  const totalDays = Math.max(1, (end - start) / DAY_MS);
  const elapsedDays = Math.max(0, Math.min(totalDays, (today - start) / DAY_MS));
  const percent = Math.round((elapsedDays / totalDays) * 100);

  return {
    elapsedDays: Math.floor(elapsedDays) + 1,
    percent,
    label: `${Math.floor(elapsedDays) + 1}일째 · ${percent}%`,
    isEnded: false,
    isUpcoming: false,
  };
}
