// The Django API is the only chart-data source. An explicit environment value
// is required in every environment so a deployment can never silently point at
// stale, same-origin, or bundled data.
const runtimeEnv = import.meta.env || {};
const hasNetlifyApiProxy =
  typeof window !== "undefined" &&
  /(^|\.)netlify\.app$/i.test(window.location.hostname);
const configuredApiBase = String(
  (hasNetlifyApiProxy ? "/api/v1" : "") ||
  runtimeEnv.VITE_API_BASE ||
  runtimeEnv.VITE_API_BASE_URL ||
  ""
).trim();

export const API_BASE = configuredApiBase.replace(/\/$/, "");
export const API_CONFIGURED = Boolean(API_BASE);

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
