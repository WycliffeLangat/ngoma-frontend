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

async function loadPublicAppData() {
  if (!isPublicAppPath()) return;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 25000);
  try {
    const payload = await fetchAppData(controller.signal);
    window.__NGOMA_PUBLIC_DATA__ = payload;
    window.__NGOMA_PUBLIC_REVISION__ = String(payload.revision || "");
    applyPublicAppData(payload);
  } catch (error) {
    console.warn("Using bundled chart fallback because live app data is unavailable.", error);
  } finally {
    window.clearTimeout(timeout);
  }
}

function watchForCmsChanges() {
  if (!isPublicAppPath()) return;

  let knownRevision = String(window.__NGOMA_PUBLIC_REVISION__ || "");
  let checking = false;

  const checkRevision = async () => {
    if (checking || document.hidden) return;
    checking = true;
    try {
      const payload = await fetchRevision();
      const nextRevision = String(payload.revision || "");
      if (!nextRevision) return;
      if (!knownRevision) {
        knownRevision = nextRevision;
        return;
      }
      if (nextRevision !== knownRevision) window.location.reload();
    } catch {
      // A temporary API outage must not interrupt the public app.
    } finally {
      checking = false;
    }
  };

  const onStorage = (event) => {
    if (event.key === "ngoma-cms-revision") window.location.reload();
  };
  const onVisibilityChange = () => {
    if (!document.hidden) checkRevision();
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener("focus", checkRevision);
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.setInterval(checkRevision, 15000);
}

async function start() {
  await loadPublicAppData();
  const { default: App } = await import("./App.jsx");
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  watchForCmsChanges();
}

start();
