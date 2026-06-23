// Public (non-CMS) API helper functions.
//
// Each function maps to one backend endpoint. Components call these instead
// of writing fetch() directly, so the URL and error-handling logic lives
// in one place.
//
// All functions throw on non-OK responses so callers can catch cleanly.

import { API_BASE } from "./config.js";

// Ping the API to confirm the live backend is reachable.
export async function checkApiStatus() {
  const res = await fetch(`${API_BASE}/charts/latest/?chart_type=singles&platform=combined`);
  if (!res.ok) throw new Error(`API unreachable (${res.status})`);
  return true;
}

// Returns the full public payload: chart data, artists, releases,
// certifications, news, settings, revision stamp.
export async function fetchAppData(signal) {
  const res = await fetch(`${API_BASE}/app-data/`, {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" },
    signal,
  });
  if (!res.ok) throw new Error(`App data request failed (${res.status})`);
  return res.json();
}

// Returns the current revision string used to detect CMS changes.
export async function fetchRevision() {
  const res = await fetch(`${API_BASE}/app-data/revision/`, {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" },
  });
  if (!res.ok) throw new Error(`Revision check failed (${res.status})`);
  return res.json();
}

// Returns an array of news articles.
export async function fetchNews() {
  const res = await fetch(`${API_BASE}/news/?page_size=100`, { cache: "no-store" });
  if (!res.ok) throw new Error(`News fetch failed (${res.status})`);
  const data = await res.json();
  return Array.isArray(data) ? data : (data.results || []);
}

// Returns an array of certified releases (gold / platinum / diamond).
export async function fetchCertifications() {
  const res = await fetch(`${API_BASE}/certifications/?page_size=200`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Certifications fetch failed (${res.status})`);
  const data = await res.json();
  return Array.isArray(data) ? data : (data.results || []);
}

// Returns chart entries for a specific month, year, and platform.
// Pass an AbortSignal to cancel in-flight requests when the user switches months.
export async function fetchChartImageData({ type, month, year, platform }, signal) {
  const params = new URLSearchParams({
    type,
    month: String(month),
    year: String(year),
    platform,
  });
  const res = await fetch(`${API_BASE}/export/chart-image-data/?${params}`, { signal });
  if (!res.ok) throw new Error("Live chart unavailable");
  return res.json();
}

// Returns detailed metadata and chart history for a single artist.
export async function fetchArtistDetail(slug) {
  const res = await fetch(`${API_BASE}/app-data/artist/${slug}/`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Artist not found (${res.status})`);
  return res.json();
}
