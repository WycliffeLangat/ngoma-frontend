import { API_BASE } from "../api/config.js";

const SESSION_KEY = "ngoma_session_id";
const SCROLL_THRESHOLDS = [25, 50, 75, 90, 100];

function safeLocation() {
  return typeof window !== "undefined" ? window.location : null;
}

function safeNavigator() {
  return typeof navigator !== "undefined" ? navigator : {};
}

function clamp(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function truncate(value, limit) {
  return String(value || "").slice(0, limit);
}

function getSearchParams() {
  try {
    const location = safeLocation();
    return new URLSearchParams(location?.search || "");
  } catch {
    return new URLSearchParams();
  }
}

function referrerDomain(referrer) {
  try {
    return referrer ? new URL(referrer).hostname.replace(/^www\./i, "") : "";
  } catch {
    return "";
  }
}

function browserFromUserAgent(userAgent) {
  const ua = String(userAgent || "");
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\//.test(ua)) return "Opera";
  if (/SamsungBrowser\//.test(ua)) return "Samsung Internet";
  if (/Chrome\//.test(ua) && !/Chromium\//.test(ua)) return "Chrome";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Safari\//.test(ua) && /Version\//.test(ua)) return "Safari";
  return "";
}

function osFromUserAgent(userAgent) {
  const ua = String(userAgent || "");
  if (/Windows NT/.test(ua)) return "Windows";
  if (/Android/.test(ua)) return "Android";
  if (/(iPhone|iPad|iPod)/.test(ua)) return "iOS";
  if (/Mac OS X/.test(ua)) return "macOS";
  if (/Linux/.test(ua)) return "Linux";
  return "";
}

function deviceType(userAgent, width) {
  const ua = String(userAgent || "");
  if (/(iPad|Tablet)/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone|iPod/i.test(ua)) return "mobile";
  if (Number(width) > 0 && Number(width) <= 760) return "mobile";
  return "desktop";
}

function navigationLoadMs() {
  try {
    const nav = performance.getEntriesByType?.("navigation")?.[0];
    if (nav?.loadEventEnd && nav.startTime !== undefined) {
      return clamp(nav.loadEventEnd - nav.startTime, 0, 600000);
    }
    if (performance.timing?.loadEventEnd && performance.timing?.navigationStart) {
      return clamp(performance.timing.loadEventEnd - performance.timing.navigationStart, 0, 600000);
    }
  } catch {}
  return null;
}

function scrollDepthPercent() {
  try {
    const doc = document.documentElement;
    const body = document.body;
    const scrollTop = window.scrollY || doc.scrollTop || body.scrollTop || 0;
    const viewport = window.innerHeight || doc.clientHeight || 1;
    const fullHeight = Math.max(
      body.scrollHeight,
      doc.scrollHeight,
      body.offsetHeight,
      doc.offsetHeight,
      body.clientHeight,
      doc.clientHeight
    );
    if (fullHeight <= viewport) return 100;
    return clamp(((scrollTop + viewport) / fullHeight) * 100, 0, 100);
  } catch {
    return null;
  }
}

function trackingContext(extra = {}) {
  const nav = safeNavigator();
  const location = safeLocation();
  const search = getSearchParams();
  const userAgent = nav.userAgent || "";
  const connection = nav.connection || nav.mozConnection || nav.webkitConnection || {};
  const referrer = typeof document !== "undefined" ? document.referrer || "" : "";
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : null;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : null;
  const screenWidth = typeof screen !== "undefined" ? screen.width : null;
  const screenHeight = typeof screen !== "undefined" ? screen.height : null;
  const pixelRatio = typeof window !== "undefined" && Number.isFinite(window.devicePixelRatio)
    ? Number(window.devicePixelRatio.toFixed(2))
    : null;

  const timezone = typeof Intl !== "undefined"
    ? Intl.DateTimeFormat().resolvedOptions().timeZone || ""
    : "";

  return {
    path: truncate(extra.path || `${location?.pathname || ""}${location?.search || ""}`, 255),
    title: truncate(typeof document !== "undefined" ? document.title : "", 160),
    search: truncate(location?.search || "", 500),
    referrer,
    referrer_domain: referrerDomain(referrer),
    utm_source: truncate(search.get("utm_source"), 120),
    utm_medium: truncate(search.get("utm_medium"), 120),
    utm_campaign: truncate(search.get("utm_campaign"), 160),
    utm_term: truncate(search.get("utm_term"), 160),
    utm_content: truncate(search.get("utm_content"), 160),
    language: truncate(nav.language || "", 40),
    timezone: truncate(timezone, 80),
    device_type: deviceType(userAgent, viewportWidth),
    browser: truncate(browserFromUserAgent(userAgent), 80),
    os: truncate(osFromUserAgent(userAgent), 80),
    platform: truncate(nav.platform || "", 80),
    viewport_width: clamp(viewportWidth, 0, 10000),
    viewport_height: clamp(viewportHeight, 0, 10000),
    screen_width: clamp(screenWidth, 0, 20000),
    screen_height: clamp(screenHeight, 0, 20000),
    pixel_ratio: pixelRatio,
    color_depth: typeof screen !== "undefined" ? clamp(screen.colorDepth, 0, 128) : null,
    connection_type: truncate(connection.type || "", 40),
    effective_connection_type: truncate(connection.effectiveType || "", 40),
    downlink_mbps: Number.isFinite(connection.downlink) ? Number(connection.downlink) : null,
    save_data: typeof connection.saveData === "boolean" ? connection.saveData : null,
    page_load_ms: navigationLoadMs(),
    scroll_depth: scrollDepthPercent(),
    engagement_time_ms: clamp(extra.engagementTimeMs, 0, 24 * 60 * 60 * 1000),
    metadata: extra.metadata && typeof extra.metadata === "object" ? extra.metadata : undefined,
  };
}

// A random id stored in localStorage (no cookies, no consent banner) used as
// a rough unique-visitor proxy for the CMS Website Analytics page.
export function getOrCreateSessionId() {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

// Fire-and-forget analytics beacon. It never blocks rendering and never throws.
export function trackEvent({
  eventType,
  page = "",
  path = "",
  label = "",
  value = null,
  scrollDepth = null,
  engagementTimeMs = null,
  metadata = null,
} = {}) {
  if (!API_BASE) return;
  try {
    const nav = safeNavigator();
    const context = trackingContext({ path, engagementTimeMs, metadata });
    const payload = JSON.stringify({
      event_type: eventType,
      page,
      path: context.path,
      label,
      value,
      session_id: getOrCreateSessionId(),
      ...context,
      scroll_depth: scrollDepth ?? context.scroll_depth,
    });
    const url = `${API_BASE}/track/`;
    if (nav.sendBeacon && typeof Blob !== "undefined") {
      const blob = new Blob([payload], { type: "application/json" });
      nav.sendBeacon(url, blob);
    } else {
      fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true }).catch(() => {});
    }
  } catch {
    // Tracking must never break the app.
  }
}

export function startPageAnalytics({ page = "", path = "" } = {}) {
  if (typeof window === "undefined" || typeof document === "undefined") return () => {};

  const startedAt = Date.now();
  const hit = new Set();
  let maxDepth = scrollDepthPercent() || 0;
  let engagementSent = false;

  const sendDepth = (depth) => {
    const threshold = SCROLL_THRESHOLDS.find((item) => depth >= item && !hit.has(item));
    if (!threshold) return;
    hit.add(threshold);
    trackEvent({
      eventType: "scroll_depth",
      page,
      path,
      label: `scroll_${threshold}`,
      value: threshold,
      scrollDepth: threshold,
      engagementTimeMs: Date.now() - startedAt,
    });
  };

  const onScroll = () => {
    maxDepth = Math.max(maxDepth, scrollDepthPercent() || 0);
    sendDepth(maxDepth);
  };

  const sendEngagement = () => {
    if (engagementSent) return;
    engagementSent = true;
    trackEvent({
      eventType: "engagement",
      page,
      path,
      label: "page_engagement",
      value: maxDepth,
      scrollDepth: maxDepth,
      engagementTimeMs: Date.now() - startedAt,
    });
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") sendEngagement();
  };

  trackEvent({ eventType: "pageview", page, path });
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  window.addEventListener("pagehide", sendEngagement);
  document.addEventListener("visibilitychange", onVisibilityChange);
  onScroll();

  return () => {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
    window.removeEventListener("pagehide", sendEngagement);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    sendEngagement();
  };
}
