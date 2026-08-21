import { API_BASE } from "../api/config.js";

const SESSION_KEY = "ngoma_session_id";

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

// Fire-and-forget pageview/click beacon. Never throws, never awaited by
// callers, never blocks rendering — a tracking failure (or an unreachable
// backend) must be completely silent to the visitor.
export function trackEvent({ eventType, page = "", path = "", label = "" }) {
  if (!API_BASE) return;
  try {
    const payload = JSON.stringify({
      event_type: eventType,
      page,
      path,
      label,
      session_id: getOrCreateSessionId(),
      referrer: typeof document !== "undefined" ? document.referrer || "" : "",
    });
    const url = `${API_BASE}/track/`;
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon(url, blob);
    } else {
      fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true }).catch(() => {});
    }
  } catch {
    // Tracking must never break the app.
  }
}
