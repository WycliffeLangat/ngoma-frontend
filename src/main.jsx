import React from "react";
import ReactDOM from "react-dom/client";
import { API_BASE, SHOULD_USE_BUNDLED_FALLBACK } from "./api/config.js";
import { fetchAppData } from "./api/public.js";
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
  if (!isPublicAppPath()) return { ok: false, fallback: true };

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const payload = await fetchAppData(controller.signal);
    if (!payload || typeof payload !== "object" || !payload.full?.singles || !payload.full?.albums) {
      throw new Error("Live app data payload was incomplete.");
    }

    window.__NGOMA_PUBLIC_DATA__ = payload;
    window.__NGOMA_PUBLIC_REVISION__ = String(payload.revision || "");
    const { applyPublicAppData } = await import("./data/liveChartData");
    applyPublicAppData(payload);
    notifyPublicDataReady();
    return { ok: true, payload };
  } catch (error) {
    const message = error?.message || "Live app data is unavailable.";
    console.error(`[ngoma] Live API request failed for ${API_BASE}: ${message}`, error);

    if (SHOULD_USE_BUNDLED_FALLBACK) {
      console.warn("Falling back to bundled data because live app data is unavailable.", error);
      const { loadBundledChartData } = await import("./data/liveChartData");
      const fallbackPayload = await loadBundledChartData();
      window.__NGOMA_PUBLIC_DATA__ = window.__NGOMA_PUBLIC_DATA__ || {};
      window.__NGOMA_PUBLIC_REVISION__ = "";
      notifyPublicDataReady();
      return { ok: false, fallback: true, payload: fallbackPayload };
    }

    return { ok: false, fallback: false, error: message };
  } finally {
    window.clearTimeout(timeout);
  }
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
  // Railway can take longer than six seconds to wake and assemble the full
  // chart payload. Waiting here avoids incorrectly rendering the stale bundled
  // snapshot on Netlify while localhost (through its warm proxy) looks current.
  const publicDataState = await loadPublicAppData({ timeoutMs: 30_000 });
  if (!publicDataState.ok && !publicDataState.fallback && isPublicAppPath()) {
    root.render(
      <div style={{display:"grid",placeItems:"center",height:"100vh",fontFamily:"system-ui, sans-serif",color:"#333",fontSize:16,padding:"24px",textAlign:"center",lineHeight:1.5}}>
        <div>
          <strong>Unable to load live Ngoma Charts data.</strong>
          <div style={{marginTop:8,color:"#666"}}>Please verify the Railway API and the Netlify environment variable configuration.</div>
        </div>
      </div>
    );
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
