// Single source of truth for the backend API base URL.
// All files in the app that need to call the API should import from here.
//
// Set VITE_API_BASE_URL in your Netlify environment variables:
//   https://your-app.railway.app/api/v1
//
// Falls back to a relative path so local dev with a proxy still works.
export const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  "/api/v1"
).replace(/\/$/, "");

// Resolves a potentially-relative media URL (e.g. /media/releases/x.jpg from Django)
// to an absolute URL using the API origin. Absolute URLs are returned unchanged.
const _apiOrigin = (() => {
  try {
    return API_BASE.startsWith("http") ? new URL(API_BASE).origin : "";
  } catch {
    return "";
  }
})();

export function resolveMediaUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("//")) return url;
  if (url.startsWith("/") && _apiOrigin) return _apiOrigin + url;
  return url;
}
