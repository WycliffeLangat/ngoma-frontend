// The public app waits for the live API payload before rendering. A generated
// chartData.js snapshot is retained for resilience, but it is downloaded only
// when the live API is genuinely unavailable. This keeps the ordinary public
// bundle small without sacrificing the offline/cold-start fallback.

const EMPTY_CHARTS = {
  singles: { combined: {}, platforms: {} },
  albums: { combined: {}, platforms: {} },
};

export let FULL = EMPTY_CHARTS;
export let MONTHS = [];

export function applyPublicAppData(payload) {
  if (!payload || typeof payload !== "object") return;
  if (payload.full?.singles && payload.full?.albums) FULL = payload.full;
  if (Array.isArray(payload.months) && payload.months.length) MONTHS = payload.months;
}

export async function loadBundledChartData() {
  const bundled = await import("./chartData");
  applyPublicAppData({ full: bundled.FULL, months: bundled.MONTHS });
  return { full: FULL, months: MONTHS };
}
