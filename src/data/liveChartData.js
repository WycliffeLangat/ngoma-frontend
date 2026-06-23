// How the chart data works — simple version:
//
// 1. BUILD TIME: Netlify runs scripts/generate-chart-data.mjs which fetches the
//    latest chart data from the Railway API and bakes it into chartData.js.
//    This means charts load instantly on every page visit with no waiting.
//
// 2. RUNTIME: When a user opens the app, main.jsx fetches fresh data from the
//    Railway API in the background (25s timeout). If it succeeds, applyPublicAppData()
//    below silently replaces the baked-in data with the latest version.
//    If it fails (Railway cold start, network issue), the baked-in data is used — which
//    is at most a few hours old because Netlify rebuilds on every finalize_month run.
//
// Flow in plain English:
//   User opens site → charts appear instantly (build-time data)
//   → 1-2 seconds later → live data quietly replaces it (if API responds)
//   → every 15 seconds → revision check keeps the data current after CMS edits

import { FULL as BUILT_IN_FULL, MONTHS as BUILT_IN_MONTHS } from "./chartData";

export let FULL = BUILT_IN_FULL;
export let MONTHS = BUILT_IN_MONTHS;

export function applyPublicAppData(payload) {
  if (!payload || typeof payload !== "object") return;
  if (payload.full?.singles && payload.full?.albums) FULL = payload.full;
  if (Array.isArray(payload.months) && payload.months.length) MONTHS = payload.months;
}
