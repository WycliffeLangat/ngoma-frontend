// Single source of truth for the backend API base URL.
//
// In production, we prefer an explicit backend URL so the deployed app does not
// fall back to a same-origin /api/v1 path or bundled chart snapshots when the
// environment variable is missing. Local development uses Vite's /api/v1 proxy;
// set VITE_API_BASE_URL to point at a local Django server when needed.
//
// You can override this in Netlify/Vercel with:
// VITE_API_BASE_URL=https://web-production-0f6b5.up.railway.app/api/v1

const DEFAULT_DEVELOPMENT_API_BASE = "/api/v1";
const DEFAULT_PRODUCTION_API_BASE = "https://web-production-0f6b5.up.railway.app/api/v1";

const resolvedApiBase = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  (import.meta.env.PROD ? DEFAULT_PRODUCTION_API_BASE : DEFAULT_DEVELOPMENT_API_BASE)
).replace(/\/$/, "");

export const API_BASE = resolvedApiBase;
export const SHOULD_USE_BUNDLED_FALLBACK = import.meta.env.DEV || String(import.meta.env.VITE_ALLOW_BUNDLED_FALLBACK || "").toLowerCase() === "true";

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
  if (url.startsWith("/")) return url;
  return url;
}
