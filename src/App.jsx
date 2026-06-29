import "./styles/ngomaTheme.css";
import { lazy, Suspense } from "react";

// Lazy-load both apps so the browser only downloads the code it actually needs.
// Public visitors never download any CMS JS; CMS users never download the full
// public chart bundle until they navigate to the public page.
const NgomaCharts = lazy(() => import("./NgomaCharts"));
const AdminApp    = lazy(() => import("./admin/AdminApp"));

function isCmsPath() {
  const p = window.location.pathname.toLowerCase();
  return p.startsWith("/cms") || p.startsWith("/admin-cms") || p.startsWith("/admin");
}

function Spinner({ label }) {
  return (
    <div style={{
      display: "grid", placeItems: "center", height: "100vh",
      fontFamily: "system-ui, sans-serif", color: "#999", fontSize: 14,
    }}>
      {label}
    </div>
  );
}

export default function App() {
  const cms = isCmsPath();
  return (
    <Suspense fallback={<Spinner label={cms ? "Loading CMS…" : "Loading…"} />}>
      {cms ? <AdminApp /> : <NgomaCharts />}
    </Suspense>
  );
}
