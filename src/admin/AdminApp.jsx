import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { cmsApi, notifyPublicAppChanged } from "./api";
import LoginPage from "./pages/LoginPage";          // tiny — needed immediately for auth
import NotificationBell from "./components/NotificationBell";
import GlobalSearch from "./components/GlobalSearch";
import "./styles/admin.css";

// All CMS pages are lazy-loaded so they only download when first visited.
// Switching between pages is instant on repeat visits (JS is cached by the browser).
const DashboardPage       = lazy(() => import("./pages/DashboardPage"));
const ResourcePage        = lazy(() => import("./pages/ResourcePage"));
const DuplicateReviewPage = lazy(() => import("./pages/DuplicateReviewPage"));
const UploadsPage         = lazy(() => import("./pages/UploadsPage"));
const ChartEntriesPage    = lazy(() => import("./pages/ChartEntriesPage"));
const ScaffoldPage        = lazy(() => import("./pages/ScaffoldPage"));

const nav = [
  ["dashboard","Dashboard"],["charts","Charts"],["chart-entries","Chart Entries"],["uploads","Uploads"],
  ["songs","Songs"],["albums","Albums"],["duplicate-review","Duplicate Review"],["artists","Artists"],
  ["countries","Countries"],["platforms","Platforms"],["news","News"],["certifications","Certifications"],
  ["certification-rules","Certification Rules"],["methodology","Methodology"],["page-content","Page Content"],
  ["records","Records"],["year-end","Year End"],["analytics","Analytics"],["social-cards","Social Cards"],
  ["media","Media Library"],["submissions","Submissions"],["users","Users & Roles"],["reports","Reports"],
  ["settings","Settings"],["audit","Audit Logs"],["backups","Backups"],
];

const RESOURCE_PAGES = new Set([
  "artists","songs","albums","countries","platforms","news","charts","certifications",
  "certification-rules","methodology","page-content","media","settings","users",
  "reports","audit","backups",
]);

const SCAFFOLDS = {
  records:      ["Highest monthly points","Most #1s","Longest charting","Biggest debut","Manual verification"],
  "year-end":   ["Generate singles","Generate albums","Generate artists","Eligible months","Publish Year End"],
  analytics:    ["Widget visibility","Head-to-head","Platform comparison","Country performance","Trend labels"],
  "social-cards":["Top 10","#1 card","Certification card","Milestone card","Story/square/X formats"],
  submissions:  ["Contact messages","Correction requests","Press releases","New music submissions","Partnerships"],
};

function getInitialPage() {
  const part = window.location.pathname.split("/cms/")[1]?.replace(/^\//, "") || "dashboard";
  return part || "dashboard";
}

function PageLoader() {
  return <div className="cms-empty" style={{ paddingTop: 60 }}>Loading…</div>;
}

function renderPage(page, user, searchJump, setPage) {
  if (page === "dashboard")       return <DashboardPage onNavigate={setPage} />;
  if (page === "chart-entries")   return <ChartEntriesPage />;
  if (page === "uploads")         return <UploadsPage />;
  if (page === "duplicate-review")return <DuplicateReviewPage />;
  if (RESOURCE_PAGES.has(page))   return <ResourcePage type={page} user={user} searchJump={searchJump} />;
  return (
    <ScaffoldPage
      title={nav.find(([k]) => k === page)?.[1] || "CMS Module"}
      items={SCAFFOLDS[page] || ["Model placeholder","API placeholder","CMS navigation"]}
    />
  );
}

export default function AdminApp() {
  const [user,     setUser]     = useState(null);
  const [checking, setChecking] = useState(true);
  const [page,     setPage]     = useState(getInitialPage);
  const [sidebar,  setSidebar]  = useState(false);
  const [searchJump, setSearchJump] = useState(null);
  const [syncState, setSyncState] = useState(null); // null | "syncing" | "done"
  const syncTimerRef = useRef(null);

  useEffect(() => {
    cmsApi.me().then(d => setUser(d.user)).catch(() => setUser(null)).finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.pathname = `/cms/${page === "dashboard" ? "" : page}`;
    window.history.replaceState({}, "", url);
  }, [page]);

  function handleGlobalNavigate(targetPage, term, id) {
    setPage(targetPage);
    setSearchJump({ page: targetPage, term, id, ts: Date.now() });
  }

  const unread = useMemo(() => 0, []);

  if (checking) return <div className="cms-boot">Loading CMS…</div>;
  if (!user)    return <LoginPage onLogin={setUser} />;

  async function signOut() { await cmsApi.logout().catch(() => {}); setUser(null); }

  function handleForcePush() {
    if (syncState === "syncing") return;
    setSyncState("syncing");
    notifyPublicAppChanged();
    clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      setSyncState("done");
      syncTimerRef.current = setTimeout(() => setSyncState(null), 2500);
    }, 800);
  }

  return (
    <div className="cms-shell">
      {sidebar && <div className="cms-sidebar-overlay" onClick={() => setSidebar(false)} />}
      <aside className={`cms-sidebar ${sidebar ? "open" : ""}`}>
        <div className="cms-brand"><b>NGOMA</b><span>Admin CMS</span></div>
        <nav>
          {nav.map(([key, label]) => (
            <button
              key={key}
              className={page === key ? "active" : ""}
              onClick={() => { setPage(key); setSidebar(false); }}
            >{label}</button>
          ))}
        </nav>
      </aside>
      <div className="cms-main">
        <header className="cms-topbar">
          <button className="cms-menu" onClick={() => setSidebar(!sidebar)}>☰</button>
          <div className="cms-global"><GlobalSearch onNavigate={handleGlobalNavigate} /></div>
          <NotificationBell count={unread} />
          <button
            className={`cms-btn small${syncState === "done" ? " cms-sync-done" : ""}`}
            onClick={handleForcePush}
            disabled={syncState === "syncing"}
            title="Force the public app to pull the latest CMS data immediately"
            style={{ whiteSpace: "nowrap" }}
          >
            {syncState === "syncing" ? "Pushing…" : syncState === "done" ? "✓ Pushed!" : "Push to Public"}
          </button>
          <div className="cms-user">
            <span>{user.first_name || user.username}</span>
            <small>{user.role_label}</small>
          </div>
          <button className="cms-btn light small" onClick={signOut}>Logout</button>
        </header>
        <main className="cms-content">
          <Suspense fallback={<PageLoader />}>
            {renderPage(page, user, searchJump, setPage)}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
