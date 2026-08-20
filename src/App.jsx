import "./styles/ngomaTheme.css";
import { lazy, Suspense } from "react";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage.jsx";
import StartupSplash from "./components/StartupSplash.jsx";

// Lazy-load both apps so the browser only downloads the code it actually needs.
// Public visitors never download any CMS JS; CMS users never download the full
// public chart bundle until they navigate to the public page.
const NgomaCharts = lazy(() => import("./NgomaCharts"));
const AdminApp    = lazy(() => import("./admin/AdminApp"));

function isCmsPath() {
  const p = window.location.pathname.toLowerCase();
  return p.startsWith("/cms") || p.startsWith("/admin-cms") || p.startsWith("/admin");
}

export default function App() {
  const path = window.location.pathname.toLowerCase();
  if (path === "/privacy" || path === "/privacy-policy") {
    return <PrivacyPolicyPage />;
  }

  const cms = isCmsPath();
  return (
    <Suspense fallback={<StartupSplash label={cms ? "Loading CMS…" : null} />}>
      {cms ? <AdminApp /> : <NgomaCharts />}
    </Suspense>
  );
}
