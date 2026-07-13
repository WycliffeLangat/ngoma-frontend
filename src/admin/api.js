export { API_BASE } from "../api/config.js";
import { API_BASE } from "../api/config.js";
export const CMS_BASE = `${API_BASE}/cms`;

let csrfToken = null;
function setCsrfToken(token) { if (token) csrfToken = token; }
let publicNotifyTimer = null;
let pendingPublicNotifyStamp = null;

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

export function notifyPublicAppChanged() {
  pendingPublicNotifyStamp = String(Date.now());
  const emit = () => {
    const stamp = pendingPublicNotifyStamp || String(Date.now());
    pendingPublicNotifyStamp = null;
    publicNotifyTimer = null;
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
  };
  clearTimeout(publicNotifyTimer);
  publicNotifyTimer = setTimeout(emit, 400);
}

export function notifyPublicAppChangedNow() {
  clearTimeout(publicNotifyTimer);
  publicNotifyTimer = null;
  pendingPublicNotifyStamp = String(Date.now());
  const stamp = pendingPublicNotifyStamp;
  pendingPublicNotifyStamp = null;
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

const DEFAULT_TIMEOUT_MS = 20_000;
const RETRY_DELAYS_MS = [300, 900]; // two retries, exponential-ish backoff

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// True only for errors that mean the request never reached the server
// (offline, DNS failure, CORS, connection reset, client-side timeout) — the
// raw "Failed to fetch" TypeError. HTTP error responses (4xx/5xx) are real
// answers from the server and must not be retried/rewritten.
function isNetworkFailure(error) {
  return error instanceof TypeError;
}

// In-flight GET de-duplication: if two callers request the same uncached
// path at the same time (common when several CMS pages mount together),
// they share one network round trip instead of firing duplicates.
const _inFlight = new Map(); // path → Promise

function createAbortScope(externalSignal, timeoutMs) {
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = Number.isFinite(timeoutMs) && timeoutMs > 0
    ? setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs)
    : null;
  const abortFromExternal = () => controller.abort(externalSignal?.reason);
  if (externalSignal) {
    if (externalSignal.aborted) abortFromExternal();
    else externalSignal.addEventListener("abort", abortFromExternal, { once: true });
  }
  return {
    controller,
    get timedOut() { return timedOut; },
    cleanup() {
      if (timeoutId) clearTimeout(timeoutId);
      externalSignal?.removeEventListener?.("abort", abortFromExternal);
    },
  };
}

async function rawFetch(path, options, timeoutMs) {
  const { signal: externalSignal, timeoutMs: _ignoredTimeoutMs, ...fetchOptions } = options;
  const abortScope = createAbortScope(externalSignal, timeoutMs);
  try {
    return await fetch(`${CMS_BASE}${path}`, {
      credentials: "include",
      ...fetchOptions,
      signal: abortScope.controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      error.isCallerAbort = Boolean(externalSignal?.aborted && !abortScope.timedOut);
      error.isTimeout = Boolean(abortScope.timedOut);
    }
    throw error;
  } finally {
    abortScope.cleanup();
  }
}

async function request(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const isMutation = ["POST", "PATCH", "PUT", "DELETE"].includes(method);
  const isAuth = path.startsWith("/auth/");
  const timeoutMs = typeof options.timeoutMs === "number" ? options.timeoutMs : DEFAULT_TIMEOUT_MS;

  // Return cached response for non-auth GET requests
  if (!isMutation && !isAuth) {
    const cached = getCached(path);
    if (cached !== null) return cached;
    const pending = _inFlight.get(path);
    if (pending) return pending;
  }

  const headers = options.body instanceof FormData ? {} : { "Content-Type": "application/json" };
  if (isMutation && csrfToken) headers["X-CSRFToken"] = csrfToken;

  const run = async () => {
    let response;
    let attempt = 0;
    // Only idempotent GET requests are safe to retry automatically —
    // retrying a POST/PATCH/DELETE after a network blip could double-submit.
    const maxAttempts = !isMutation ? RETRY_DELAYS_MS.length + 1 : 1;
    for (;;) {
      try {
        response = await rawFetch(path, { ...options, headers: { ...headers, ...(options.headers || {}) } }, timeoutMs);
        break;
      } catch (networkError) {
        if (networkError?.isCallerAbort) throw networkError;
        attempt += 1;
        if (attempt >= maxAttempts || networkError?.isTimeout || !isNetworkFailure(networkError)) {
          const friendly = new Error(
            networkError?.isTimeout || networkError?.name === "AbortError"
              ? "The request timed out. Check your connection and try again."
              : "Unable to reach the server. Check your connection and try again."
          );
          friendly.cause = networkError;
          friendly.isNetworkError = true;
          throw friendly;
        }
        await sleep(RETRY_DELAYS_MS[attempt - 1]);
      }
    }

    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch {
      if (!response.ok) throw new Error(`Server error (${response.status}) — check backend logs`);
    }

    if (!response.ok) {
      const fieldErrors = data && typeof data === "object"
        ? Object.entries(data)
            .filter(([key]) => key !== "detail" && key !== "error")
            .flatMap(([key, value]) => {
              const messages = Array.isArray(value) ? value : [value];
              return messages.filter(Boolean).map((message) => `${key}: ${typeof message === "object" ? JSON.stringify(message) : message}`);
            })
        : [];
      const detail = data?.detail || data?.error || fieldErrors.join(" · ") || `Request failed (${response.status})`;
      const err = new Error(detail);
      err.data = data;
      err.status = response.status;
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
  };

  if (!isMutation && !isAuth) {
    const promise = run().finally(() => _inFlight.delete(path));
    _inFlight.set(path, promise);
    return promise;
  }
  return run();
}

export const cmsApi = {
  get:    (path, options = {}) => request(path, options),
  post:   (path, body = {}, options = {}) => request(path, {
    ...options,
    method: "POST",
    body: body instanceof FormData ? body : JSON.stringify(body),
  }),
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
