// Single source of truth for the backend API base URL.
//
// Production fallback is set to the current Railway backend so the public
// Netlify app does not accidentally call its own /api/v1 route and fall back
// to chart snapshots when VITE_API_BASE_URL is missing in a deploy context.
//
// You can still override this in Netlify with:
// VITE_API_BASE_URL=https://web-production-0f6b5.up.railway.app/api/v1

const DEFAULT_PRODUCTION_API_BASE = "https://web-production-0f6b5.up.railway.app/api/v1";

export const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  DEFAULT_PRODUCTION_API_BASE
).replace(/\/$/, "");

const _apiOrigin = (() => {
  try {
    return API_BASE.startsWith("http") ? new URL(API_BASE).origin : "";
  } catch {
    return "";
  }
})();

// Resolves a potentially-relative media URL, for example /media/releases/x.jpg,
// to an absolute URL using the API origin. Absolute URLs are returned unchanged.
export function resolveMediaUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("//")) return url;
  if (url.startsWith("/") && _apiOrigin) return _apiOrigin + url;
  return url;
}
