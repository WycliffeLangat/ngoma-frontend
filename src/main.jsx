import React from "react";
import ReactDOM from "react-dom/client";
import { API_BASE, API_CONFIGURED } from "./api/config.js";
import { fetchAppDataWithFallback } from "./api/public.js";
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

async function loadPublicAppData({ timeoutMs = 4000 } = {}) {
  if (!isPublicAppPath()) return { ok: true };
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
    const result = await fetchAppDataWithFallback(controller.signal, { timeoutMs });
    const payload = normalizePublicPayload(result.payload);
    if (
      !payload ||
      typeof payload !== "object" ||
      !payload.full?.singles ||
      !payload.full?.albums ||
      !payload.months.length ||
      !payload.latest_published_month
    ) {
      throw new Error("Live app data payload was incomplete.");
    }

    window.__NGOMA_PUBLIC_DATA__ = payload;
    window.__NGOMA_PUBLIC_REVISION__ = String(payload.revision || "");
    window.__NGOMA_PUBLIC_DATA_STALE__ = Boolean(result.stale);
    if (result.stale) {
      console.warn(`[ngoma] Using cached app data because the live request failed: ${result.errorMessage}`);
    }
    notifyPublicDataReady();
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
            ? "Set VITE_API_BASE to the Django API base URL, then rebuild the frontend."
            : `The frontend could not reach ${API_BASE}. Please try again after the backend is available.`}
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
