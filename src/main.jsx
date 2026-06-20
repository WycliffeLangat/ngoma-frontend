import React from "react";
import ReactDOM from "react-dom/client";
import { applyPublicAppData } from "./data/liveChartData";
import "./index.css";
import "./styles/mobilePremiumFixes.css";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || "/api/v1").replace(/\/$/, "");

async function loadPublicAppData() {
  const path = window.location.pathname.toLowerCase();
  if (path.startsWith("/cms") || path.startsWith("/admin-cms")) return;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${API_BASE}/app-data/`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`App data request failed (${response.status})`);
    const payload = await response.json();
    window.__NGOMA_PUBLIC_DATA__ = payload;
    applyPublicAppData(payload);
  } catch (error) {
    console.warn("Using bundled chart fallback because live app data is unavailable.", error);
  } finally {
    window.clearTimeout(timeout);
  }
}

async function start() {
  await loadPublicAppData();
  const { default: App } = await import("./App.jsx");
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

start();
