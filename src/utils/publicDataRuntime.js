const MONTH_NUMBERS = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

export function parseMonthLabel(label = "") {
  const match = String(label).trim().match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (!match) return null;
  const month = MONTH_NUMBERS[match[1].toLowerCase()];
  const year = Number(match[2]);
  return month && Number.isInteger(year) ? { label: String(label).trim(), year, month } : null;
}

export function publishedMonthOptions(payload = {}) {
  const supplied = Array.isArray(payload.month_options) ? payload.month_options : [];
  const parsed = supplied.length
    ? supplied.map((item) => ({
        label: String(item?.label || "").trim(),
        year: Number(item?.year),
        month: Number(item?.month),
      }))
    : (Array.isArray(payload.months) ? payload.months : []).map(parseMonthLabel).filter(Boolean);

  const unique = new Map();
  parsed.forEach((item) => {
    if (
      item.label &&
      Number.isInteger(item.year) &&
      Number.isInteger(item.month) &&
      item.month >= 1 &&
      item.month <= 12
    ) {
      unique.set(`${item.year}-${item.month}`, item);
    }
  });
  return [...unique.values()].sort((left, right) =>
    left.year - right.year || left.month - right.month
  );
}

export function normalizePublicPayload(payload = {}) {
  const monthOptions = publishedMonthOptions(payload);
  const latest = monthOptions.at(-1) || null;
  return {
    ...payload,
    month_options: monthOptions,
    months: monthOptions.map((item) => item.label),
    latest_published_month: latest,
  };
}

export function runtimePublicData() {
  return typeof window !== "undefined" ? (window.__NGOMA_PUBLIC_DATA__ || {}) : {};
}
