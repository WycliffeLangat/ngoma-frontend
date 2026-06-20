import { FULL as STATIC_FULL, MONTHS as STATIC_MONTHS } from "./chartData";

export let FULL = STATIC_FULL;
export let MONTHS = STATIC_MONTHS;

export function applyPublicAppData(payload) {
  if (!payload || typeof payload !== "object") return;
  if (payload.full?.singles && payload.full?.albums) FULL = payload.full;
  if (Array.isArray(payload.months) && payload.months.length) MONTHS = payload.months;
}
