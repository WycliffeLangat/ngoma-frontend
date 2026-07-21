// Public (non-CMS) API helper functions.
//
// These helpers prefer live backend data. The large /app-data/ payload is also
// persisted after successful reads so chart views can fall back to recent data
// instead of hard-failing during a temporary backend/network blip.

import { API_BASE, API_CONFIGURED } from "./config.js";

function withCacheBust(path) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}_=${Date.now()}`;
}

const RETRY_DELAYS_MS = [300, 900]; // two retries for transient network blips
const APP_DATA_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const APP_DATA_CACHE_PREFIX = "ngoma:app-data:v1:";
const APP_DATA_IDB_NAME = "ngoma-public-cache";
const APP_DATA_IDB_STORE = "app-data";
const APP_DATA_IDB_VERSION = 1;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isNetworkFailure(error) {
  return error instanceof TypeError;
}

function appDataCacheKey() {
  return `${APP_DATA_CACHE_PREFIX}${API_BASE || "unconfigured"}`;
}

function browserStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage || null;
  } catch {
    return null;
  }
}

function hasUsableAppData(payload) {
  return Boolean(payload?.full?.singles && payload?.full?.albums);
}

function validateCachedAppData(cached, { maxAgeMs = APP_DATA_CACHE_MAX_AGE_MS } = {}) {
  const storedAt = Number(cached?.storedAt);
  const ageMs = Date.now() - storedAt;
  if (!Number.isFinite(storedAt) || ageMs < 0) return null;
  if (Number.isFinite(maxAgeMs) && maxAgeMs > 0 && ageMs > maxAgeMs) return null;
  if (!hasUsableAppData(cached?.payload)) return null;
  return { payload: cached.payload, storedAt, ageMs };
}

export function readCachedAppData({ maxAgeMs = APP_DATA_CACHE_MAX_AGE_MS } = {}) {
  const storage = browserStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(appDataCacheKey());
    if (!raw) return null;
    return validateCachedAppData(JSON.parse(raw), { maxAgeMs });
  } catch {
    return null;
  }
}

function openCacheDb() {
  if (typeof window === "undefined" || !window.indexedDB) return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = window.indexedDB.open(APP_DATA_IDB_NAME, APP_DATA_IDB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(APP_DATA_IDB_STORE)) {
        db.createObjectStore(APP_DATA_IDB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

function idbRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readIndexedDbAppData({ maxAgeMs = APP_DATA_CACHE_MAX_AGE_MS } = {}) {
  const db = await openCacheDb();
  if (!db) return null;
  try {
    const transaction = db.transaction(APP_DATA_IDB_STORE, "readonly");
    const record = await idbRequest(transaction.objectStore(APP_DATA_IDB_STORE).get(appDataCacheKey()));
    return validateCachedAppData(record, { maxAgeMs });
  } catch {
    return null;
  } finally {
    db.close();
  }
}

async function writeIndexedDbAppData(record) {
  const db = await openCacheDb();
  if (!db) return;
  try {
    const transaction = db.transaction(APP_DATA_IDB_STORE, "readwrite");
    await idbRequest(transaction.objectStore(APP_DATA_IDB_STORE).put(record, appDataCacheKey()));
  } catch {
    // IndexedDB can be unavailable in private browsing or blocked by policy.
  } finally {
    db.close();
  }
}

export async function readCachedAppDataAsync({ maxAgeMs = APP_DATA_CACHE_MAX_AGE_MS } = {}) {
  return readCachedAppData({ maxAgeMs }) || await readIndexedDbAppData({ maxAgeMs });
}

async function writeCachedAppData(payload) {
  if (!hasUsableAppData(payload)) return;
  const record = {
    storedAt: Date.now(),
    payload,
  };
  const storage = browserStorage();
  if (storage) {
    try {
      storage.setItem(appDataCacheKey(), JSON.stringify(record));
    } catch {
      // Browser storage is often too small for the full app payload.
    }
  }
  await writeIndexedDbAppData(record);
}

function createAbortScope(externalSignal, timeoutMs) {
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = typeof window !== "undefined" && Number.isFinite(timeoutMs) && timeoutMs > 0
    ? window.setTimeout(() => {
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
      if (timeoutId) window.clearTimeout(timeoutId);
      externalSignal?.removeEventListener?.("abort", abortFromExternal);
    },
  };
}

// In-flight de-duplication: several CMS pages independently call
// fetchAppData()/etc. on mount around the same time. Sharing one promise per
// path avoids firing duplicate large requests without caching (staleness-free).
const _inFlight = new Map(); // path (without signal) → Promise

async function publicRequest(path, options = {}) {
  if (!API_CONFIGURED) {
    throw new Error("VITE_API_BASE is not configured.");
  }
  // Requests with a caller-supplied AbortSignal (page-navigation cancellation)
  // aren't safe to share across callers, so only dedupe signal-less calls.
  const dedupeKey = !options.signal ? path : null;
  if (dedupeKey) {
    const pending = _inFlight.get(dedupeKey);
    if (pending) return pending;
  }

  const run = async () => {
    const timeoutMs = typeof options.timeoutMs === "number" ? options.timeoutMs : 6000;
    let attempt = 0;
    for (;;) {
      const abortScope = createAbortScope(options.signal, timeoutMs);
      try {
        const res = await fetch(`${API_BASE}${withCacheBust(path)}`, {
          cache: "no-store",
          headers: options.headers || {},
          ...options,
          signal: abortScope.controller.signal,
        });

        if (!res.ok) {
          throw new Error(options.errorMessage || `Public API request failed (${res.status})`);
        }

        return await res.json();
      } catch (error) {
        if (error?.name === "AbortError") {
          if (options.signal?.aborted && !abortScope.timedOut) throw error;
          throw new Error(options.errorMessage || "Public API request timed out");
        }
        attempt += 1;
        if (attempt > RETRY_DELAYS_MS.length || !isNetworkFailure(error)) {
          if (isNetworkFailure(error)) {
            throw new Error(options.errorMessage || "Unable to reach the server. Check your connection and try again.");
          }
          throw error;
        }
        await sleep(RETRY_DELAYS_MS[attempt - 1]);
      } finally {
        abortScope.cleanup();
      }
    }
  };

  if (dedupeKey) {
    const promise = run().finally(() => _inFlight.delete(dedupeKey));
    _inFlight.set(dedupeKey, promise);
    return promise;
  }
  return run();
}

// Ping the API to confirm the live backend is reachable.
// Use app-data/revision because it is lightweight and is the same live source
// used to detect CMS changes. This avoids false availability warnings
// when the older /charts/latest/ health-check endpoint is unavailable.
export async function checkApiStatus() {
  await publicRequest("/app-data/revision/", {
    errorMessage: "API unreachable",
  });
  return true;
}

// Returns the full public payload: chart data, artists, releases,
// certifications, news, settings, revision stamp.
export async function fetchAppData(signal, timeoutMs = 30_000) {
  const payload = await publicRequest("/app-data/", {
    signal,
    timeoutMs,
    errorMessage: "App data request failed",
  });
  await writeCachedAppData(payload);
  return payload;
}

export async function fetchAppDataWithFallback(signal, options = {}) {
  const timeoutMs = typeof options.timeoutMs === "number" ? options.timeoutMs : 30_000;
  const maxAgeMs = typeof options.maxAgeMs === "number" ? options.maxAgeMs : APP_DATA_CACHE_MAX_AGE_MS;
  try {
    return {
      payload: await fetchAppData(signal, timeoutMs),
      source: "live",
      stale: false,
      errorMessage: "",
      ageMs: 0,
      storedAt: Date.now(),
    };
  } catch (error) {
    const cached = await readCachedAppDataAsync({ maxAgeMs });
    if (cached) {
      return {
        ...cached,
        source: "cache",
        stale: true,
        errorMessage: error?.message || "Live app data request failed",
      };
    }
    throw error;
  }
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
