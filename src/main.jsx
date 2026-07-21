import React from "react";
import ReactDOM from "react-dom/client";
import { API_BASE, API_CONFIGURED } from "./api/config.js";
import { fetchAppDataWithFallback, readCachedAppDataAsync } from "./api/public.js";
import { normalizePublicPayload } from "./utils/publicDataRuntime.js";
import "./index.css";
import "./styles/mobilePremiumFixes.css";

function isPublicAppPath() {
  const path = window.location.pathname.toLowerCase();
  return !path.startsWith("/cms") &&
    !path.startsWith("/admin-cms") &&
    !path.startsWith("/admin");
}

function notifyPublicDataReady() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("ngoma-public-data-ready"));
  }
}

function completePublicPayload(rawPayload) {
  const payload = normalizePublicPayload(rawPayload || {});
  return (
    payload &&
    typeof payload === "object" &&
    payload.full?.singles &&
    payload.full?.albums &&
    payload.months?.length &&
    payload.latest_published_month
  ) ? payload : null;
}

function applyPublicPayload(payload, { stale = false } = {}) {
  window.__NGOMA_PUBLIC_DATA__ = payload;
  window.__NGOMA_PUBLIC_REVISION__ = String(payload.revision || "");
  window.__NGOMA_PUBLIC_DATA_STALE__ = Boolean(stale);
  notifyPublicDataReady();
}

async function readStartupSnapshot() {
  const candidates = [
    window.__NGOMA_PUBLIC_DATA__,
    window.__NGOMA_STATIC_PUBLIC_DATA__,
  ];

  const inlineSnapshot = document.getElementById("ngoma-public-data-snapshot")?.textContent;
  if (inlineSnapshot) {
    try {
      candidates.push(JSON.parse(inlineSnapshot));
    } catch {
      console.warn("[ngoma] Ignoring invalid inline public data snapshot.");
    }
  }

  for (const candidate of candidates) {
    const payload = completePublicPayload(candidate);
    if (payload) return { payload, stale: Boolean(candidate !== window.__NGOMA_PUBLIC_DATA__), source: "snapshot" };
  }

  const cached = await readCachedAppDataAsync({ maxAgeMs: Number.POSITIVE_INFINITY });
  const cachedPayload = completePublicPayload(cached?.payload);
  return cachedPayload
    ? { ...cached, payload: cachedPayload, stale: true, source: "cache" }
    : null;
}

async function loadPublicAppData({ timeoutMs = 4000 } = {}) {
  if (!isPublicAppPath()) return { ok: true };

  const snapshot = await readStartupSnapshot();
  if (snapshot) {
    applyPublicPayload(snapshot.payload, { stale: snapshot.stale });
    if (snapshot.source === "cache") {
      console.warn("[ngoma] Starting from cached public app data while live data refreshes in the background.");
    }
    return { ok: true, payload: snapshot.payload, stale: snapshot.stale, source: snapshot.source };
  }

  if (!API_CONFIGURED) {
    return {
      ok: false,
      type: "configuration",
      error: "VITE_API_BASE is not configured.",
    };
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const result = await fetchAppDataWithFallback(controller.signal, {
      timeoutMs,
      maxAgeMs: Number.POSITIVE_INFINITY,
    });
    const payload = completePublicPayload(result.payload);
    if (!payload) {
      throw new Error("Live app data payload was incomplete.");
    }

    applyPublicPayload(payload, { stale: result.stale });
    if (result.stale) {
      console.warn(`[ngoma] Using cached app data because the live request failed: ${result.errorMessage}`);
    }
    return { ok: true, payload, stale: result.stale };
  } catch (error) {
    const message = error?.message || "The backend API is unavailable.";
    console.error(`[ngoma] Backend API request failed for ${API_BASE}: ${message}`, error);
    return { ok: false, type: "network", error: message };
  } finally {
    window.clearTimeout(timeout);
  }
}

function PublicStartupError({ state }) {
  const configurationError = state.type === "configuration";
  return (
    <div style={{display:"grid",placeItems:"center",minHeight:"100vh",fontFamily:"system-ui, sans-serif",color:"#252820",padding:"24px",textAlign:"center",lineHeight:1.5,background:"#f7f5ef"}}>
      <div style={{maxWidth:560,background:"#fff",border:"1px solid #ded9cc",borderRadius:16,padding:"28px",boxShadow:"0 14px 40px rgba(0,0,0,.08)"}}>
        <strong style={{display:"block",fontSize:20}}>
          {configurationError ? "Ngoma Charts backend is not configured." : "Unable to load Ngoma Charts data."}
        </strong>
        <div style={{marginTop:10,color:"#60645b",fontSize:14}}>
          {configurationError
            ? "Set VITE_API_BASE to the Django API base URL, or ship a public data snapshot with the frontend."
            : `The frontend could not reach ${API_BASE}, and no cached or bundled public data snapshot was available.`}
        </div>
        {!configurationError && (
          <button type="button" onClick={() => window.location.reload()} style={{marginTop:18,border:0,borderRadius:999,padding:"10px 18px",background:"#1d4f35",color:"#fff",fontWeight:700,cursor:"pointer"}}>
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

async function start() {
  const root = ReactDOM.createRoot(document.getElementById("root"));
  // NgomaCharts builds CMS lookup maps when its module loads. Hydrate first so
  // a refreshed page starts with current CMS data instead of stale snapshots.
  if (isPublicAppPath()) {
    root.render(
      <div style={{display:"grid",placeItems:"center",height:"100vh",fontFamily:"system-ui, sans-serif",color:"#777",fontSize:14}}>
        Loading Ngoma Charts…
      </div>
    );
  }
  // The public application module is loaded only after the backend payload is
  // ready because its chart indexes are built at module initialization.
  const publicDataState = await loadPublicAppData({ timeoutMs: 30_000 });
  if (!publicDataState.ok && isPublicAppPath()) {
    root.render(<PublicStartupError state={publicDataState} />);
    return;
  }

  const { default: App } = await import("./App.jsx");
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

}

start();
