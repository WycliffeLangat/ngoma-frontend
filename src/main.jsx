import React from "react";
import ReactDOM from "react-dom/client";
import { applyPublicAppData } from "./data/liveChartData";
import { API_BASE } from "./api/config.js";
import { fetchAppData, fetchRevision } from "./api/public.js";
import "./index.css";
import "./styles/mobilePremiumFixes.css";

function isPublicAppPath() {
  const path = window.location.pathname.toLowerCase();
  return !path.startsWith("/cms") && !path.startsWith("/admin-cms");
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
    applyPublicAppData(payload);
    notifyPublicDataReady();
    return { ok: true, payload };
  } catch (error) {
    console.warn("Falling back to bundled data because live app data is unavailable.", error);
    window.__NGOMA_PUBLIC_DATA__ = window.__NGOMA_PUBLIC_DATA__ || {};
    window.__NGOMA_PUBLIC_REVISION__ = "";
    notifyPublicDataReady();
    return { ok: false, fallback: true };
  } finally {
    window.clearTimeout(timeout);
  }
}

function watchForCmsChanges() {
  if (!isPublicAppPath()) return;

  let knownRevision = String(window.__NGOMA_PUBLIC_REVISION__ || "");
  let checking = false;
  let reloadQueued = false;

  const reloadPublicApp = () => {
    if (reloadQueued) return;
    reloadQueued = true;
    window.setTimeout(() => window.location.reload(), 150);
  };

  const checkRevision = async ({ allowHidden = false } = {}) => {
    if (checking || (!allowHidden && document.hidden)) return;
    checking = true;
    try {
      const payload = await fetchRevision();
      const nextRevision = String(payload.revision || "");
      if (!nextRevision) return;
      if (!knownRevision) {
        knownRevision = nextRevision;
        return;
      }
      if (nextRevision !== knownRevision) reloadPublicApp();
    } catch {
      // A temporary API outage must not interrupt the public app.
    } finally {
      checking = false;
    }
  };

  const onCmsSignal = () => checkRevision({ allowHidden: true });
  const onStorage = (event) => {
    if (event.key === "ngoma-cms-revision") onCmsSignal();
  };
  const onVisibilityChange = () => {
    if (!document.hidden) checkRevision();
  };

  let channel = null;
  try {
    channel = new BroadcastChannel("ngoma-cms-sync");
    channel.onmessage = (event) => {
      if (event?.data?.type === "cms-change") onCmsSignal();
    };
  } catch {
    channel = null;
  }

  window.addEventListener("storage", onStorage);
  window.addEventListener("ngoma-cms-change", onCmsSignal);
  window.addEventListener("focus", checkRevision);
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.setInterval(checkRevision, 10000);
}

async function start() {
  const root = ReactDOM.createRoot(document.getElementById("root"));
  const { default: App } = await import("./App.jsx");
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  void loadPublicAppData({ timeoutMs: 4000 });
  watchForCmsChanges();
}

start();
