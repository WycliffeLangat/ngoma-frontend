export { API_BASE } from "../api/config.js";
import { API_BASE } from "../api/config.js";
export const CMS_BASE = `${API_BASE}/cms`;

let csrfToken = null;
function setCsrfToken(token) { if (token) csrfToken = token; }

// ── GET response cache ────────────────────────────────────────────────────────
// Caches successful GET responses for 60 seconds.
//
// Invalidation is TARGETED: a mutation against /artists/1/ only clears
// cache entries whose path starts with "/artists/" — it does NOT flush
// /chart-entries/, /releases/, or any other resource. This means:
//
//   - Saving an artist → only the artist list is re-fetched. The Kenya
//     chart's platform entry caches survive and are served instantly.
//   - Editing a chart entry → only chart-entry caches are cleared.
//     The artist list cache (2000 artists) stays warm.
//   - A full wipe (clearCmsCache() with no arg) is reserved for operations
//     that touch multiple resources at once (re-rank, merge, delete).
const _getCache = new Map(); // path → { data, ts }
const GET_CACHE_TTL = 60_000; // 60 seconds — safe because invalidation is targeted

function getCached(path) {
  const entry = _getCache.get(path);
  if (entry && Date.now() - entry.ts < GET_CACHE_TTL) return entry.data;
  _getCache.delete(path);
  return null;
}

function setCached(path, data) {
  _getCache.set(path, { data, ts: Date.now() });
}

// Clears cache entries whose path starts with `prefix`, or the entire
// cache if prefix is omitted.
export function clearCmsCache(prefix) {
  if (!prefix) { _getCache.clear(); return; }
  for (const key of _getCache.keys()) {
    if (key.startsWith(prefix)) _getCache.delete(key);
  }
}

// Extract the first path segment so mutations only invalidate their own resource.
// "/artists/1/"       → "/artists/"
// "/chart-entries/5/" → "/chart-entries/"
// "/auth/login/"      → "/auth/"  (not cached anyway)
function mutationPrefix(path) {
  const m = path.match(/^(\/[^/?]+\/)/);
  return m ? m[1] : null;
}

function notifyPublicAppChanged() {
  const stamp = String(Date.now());
  try {
    window.localStorage.setItem("ngoma-cms-revision", stamp);
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent("ngoma-cms-change", { detail: { stamp } }));
  } catch {}
  try {
    const channel = new BroadcastChannel("ngoma-cms-sync");
    channel.postMessage({ type: "cms-change", stamp });
    channel.close();
  } catch {}
}
// ─────────────────────────────────────────────────────────────────────────────

async function fetchCsrfToken() {
  try {
    const res = await fetch(`${CMS_BASE}/csrf/`, { credentials: "include" });
    const data = await res.json();
    setCsrfToken(data?.csrfToken);
  } catch {}
}

async function request(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const isMutation = ["POST", "PATCH", "PUT", "DELETE"].includes(method);
  const isAuth = path.startsWith("/auth/");

  // Return cached response for non-auth GET requests
  if (!isMutation && !isAuth) {
    const cached = getCached(path);
    if (cached !== null) return cached;
  }

  const headers = options.body instanceof FormData ? {} : { "Content-Type": "application/json" };
  if (isMutation && csrfToken) headers["X-CSRFToken"] = csrfToken;

  const response = await fetch(`${CMS_BASE}${path}`, {
    credentials: "include",
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });

  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch {
    if (!response.ok) throw new Error(`Server error (${response.status}) — check backend logs`);
  }

  if (!response.ok) {
    const detail = data?.detail || data?.error || `Request failed (${response.status})`;
    const err = new Error(detail);
    err.data = data;
    throw err;
  }

  // Cache successful GET responses; targeted-invalidate on mutations.
  if (!isMutation && !isAuth) {
    setCached(path, data);
  } else if (isMutation) {
    clearCmsCache(mutationPrefix(path)); // only flush the affected resource
    // Tell any open public app tab to refetch/reload immediately after a CMS save.
    notifyPublicAppChanged();
  }

  return data;
}

export const cmsApi = {
  get:    (path, options = {}) => request(path, options),
  post:   (path, body = {})   => request(path, { method: "POST",   body: body instanceof FormData ? body : JSON.stringify(body) }),
  patch:  (path, body = {})   => request(path, { method: "PATCH",  body: body instanceof FormData ? body : JSON.stringify(body) }),
  put:    (path, body = {})   => request(path, { method: "PUT",    body: JSON.stringify(body) }),
  delete: (path)              => request(path, { method: "DELETE" }),
  login: async (username, password) => {
    const data = await request("/auth/login/", { method: "POST", body: JSON.stringify({ username, password }) });
    setCsrfToken(data?.csrfToken);
    return data;
  },
  logout: () => request("/auth/logout/", { method: "POST", body: JSON.stringify({}) }),
  me: async () => {
    const [data] = await Promise.all([
      request("/auth/me/"),
      csrfToken ? Promise.resolve() : fetchCsrfToken(),
    ]);
    return data;
  },
};

export function getResults(payload) {
  if (Array.isArray(payload)) return payload;
  return payload?.results || [];
}

export function qs(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") q.set(key, value);
  });
  const value = q.toString();
  return value ? `?${value}` : "";
}
