// Public (non-CMS) API helper functions.
//
// These helpers are intentionally uncached. The CMS edits the backend database,
// and the public app should read the latest API response at runtime instead of
// relying on old static/generated frontend data.

import { API_BASE } from "./config.js";

function withCacheBust(path) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}_=${Date.now()}`;
}

async function publicRequest(path, options = {}) {
  const res = await fetch(`${API_BASE}${withCacheBust(path)}`, {
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    throw new Error(options.errorMessage || `Public API request failed (${res.status})`);
  }

  return res.json();
}

// Ping the API to confirm the live backend is reachable.
// Use app-data/revision because it is lightweight and is the same live source
// used to detect CMS changes. This avoids false "chart snapshot" warnings
// when the older /charts/latest/ health-check endpoint is unavailable.
export async function checkApiStatus() {
  await publicRequest("/app-data/revision/", {
    errorMessage: "API unreachable",
  });
  return true;
}

// Returns the full public payload: chart data, artists, releases,
// certifications, news, settings, revision stamp.
export async function fetchAppData(signal) {
  return publicRequest("/app-data/", {
    signal,
    errorMessage: "App data request failed",
  });
}

// Returns the current revision string used to detect CMS changes.
export async function fetchRevision() {
  return publicRequest("/app-data/revision/", {
    errorMessage: "Revision check failed",
  });
}

// Returns an array of news articles.
export async function fetchNews() {
  const data = await publicRequest("/news/?page_size=100", {
    errorMessage: "News fetch failed",
  });
  return Array.isArray(data) ? data : (data.results || []);
}

// Returns an array of certified releases (gold / platinum / diamond).
export async function fetchCertifications() {
  const data = await publicRequest("/certifications/?page_size=200", {
    errorMessage: "Certifications fetch failed",
  });
  return Array.isArray(data) ? data : (data.results || []);
}

// Returns chart entries for a specific month, year, and platform.
export async function fetchChartImageData({ type, month, year, platform }, signal) {
  const params = new URLSearchParams({
    type,
    month: String(month),
    year: String(year),
    platform,
  });
  return publicRequest(`/export/chart-image-data/?${params}`, {
    signal,
    errorMessage: "Live chart unavailable",
  });
}

// Returns detailed metadata and chart history for a single artist.
export async function fetchArtistDetail(slug) {
  return publicRequest(`/app-data/artist/${slug}/`, {
    errorMessage: "Artist not found",
  });
}
