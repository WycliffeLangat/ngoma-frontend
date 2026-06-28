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
const YearEndPage         = lazy(() => import("./pages/YearEndPage"));
const NAV_GROUPS = [
  {
    label: "Overview",
    items: [["dashboard", "Dashboard"]],
  },
  {
    label: "Chart operations",
    permission: "can_manage_data",
    items: [
      ["charts", "Chart periods"],
      ["chart-entries", "Chart entries"],
      ["uploads", "Imports & uploads"],
      ["year-end", "Year-end charts"],
    ],
  },
  {
    label: "Music library",
    permission: "can_manage_data",
    items: [
      ["artists", "Artists"],
      ["songs", "Songs"],
      ["albums", "Albums"],
      ["duplicate-review", "Duplicate review"],
      ["countries", "Countries"],
      ["platforms", "Platforms"],
    ],
  },
  {
    label: "Public content",
    permission: "can_manage_news",
    items: [
      ["news", "News"],
      ["page-content", "Page content"],
      ["media", "Media library"],
    ],
  },
  {
    label: "Quality & rules",
    permission: "can_manage_data",
    items: [
      ["certifications", "Certifications"],
      ["certification-rules", "Certification rules"],
      ["methodology", "Ranking methodology"],
      ["reports", "Data quality"],
    ],
  },
  {
    label: "Administration",
    items: [
      ["users", "Users & roles", "can_manage_users"],
      ["settings", "Settings", "can_manage_users"],
      ["audit", "Audit log"],
      ["backups", "Backups", "can_manage_users"],
    ],
  },
];

const nav = NAV_GROUPS.flatMap((group) => group.items);
const KNOWN_PAGES = new Set(nav.map(([key]) => key));

const RESOURCE_PAGES = new Set([
  "artists","songs","albums","countries","platforms","news","charts","certifications",
  "certification-rules","methodology","page-content","media","settings","users",
  "reports","audit","backups",
]);

function getInitialPage() {
  const part = window.location.pathname.split("/cms/")[1]?.replace(/^\//, "") || "dashboard";
  return KNOWN_PAGES.has(part) ? part : "dashboard";
}

function PageLoader() {
  return <div className="cms-empty" style={{ paddingTop: 60 }}>Loading…</div>;
}

function renderPage(page, user, searchJump, onNavigate) {
  if (page === "dashboard")       return <DashboardPage onNavigate={onNavigate} />;
  if (page === "chart-entries")   return <ChartEntriesPage user={user} />;
  if (page === "year-end")        return <YearEndPage onNavigate={onNavigate} />;
  if (page === "uploads")         return <UploadsPage user={user} />;
  if (page === "duplicate-review")return <DuplicateReviewPage user={user} />;
  if (RESOURCE_PAGES.has(page))   return <ResourcePage type={page} user={user} searchJump={searchJump} />;
  return <div className="cms-empty">This CMS page is unavailable.</div>;
}

function visibleNavGroups(user) {
  const permissions = user?.permissions || {};
  const readOnly = Boolean(permissions.read_only);
  return NAV_GROUPS.map((group) => {
    const groupAllowed = !group.permission || permissions[group.permission] || readOnly;
    const items = groupAllowed
      ? group.items.filter(([key, , permission]) =>
          (!permission || permissions[permission]) &&
          !(readOnly && key === "duplicate-review")
        )
      : [];
    return { ...group, items };
  }).filter((group) => group.items.length);
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
    if (window.location.pathname !== url.pathname) {
      window.history.pushState({ cmsPage: page }, "", url);
    }
  }, [page]);

  useEffect(() => {
    const onPopState = () => setPage(getInitialPage());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function handleGlobalNavigate(targetPage, term, id) {
    setPage(targetPage);
    setSearchJump({ page: targetPage, term, id, ts: Date.now() });
  }

  const unread = useMemo(() => 0, []);
  const navigation = useMemo(() => visibleNavGroups(user), [user]);

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
        <nav aria-label="CMS navigation">
          {navigation.map((group) => (
            <div className="cms-nav-group" key={group.label}>
              <span className="cms-nav-label">{group.label}</span>
              {group.items.map(([key, label]) => (
                <button
                  key={key}
                  className={page === key ? "active" : ""}
                  onClick={() => { setPage(key); setSidebar(false); }}
                >{label}</button>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <div className="cms-main">
        <header className="cms-topbar">
          <button className="cms-menu" onClick={() => setSidebar(!sidebar)}>☰</button>
          <div className="cms-global"><GlobalSearch onNavigate={handleGlobalNavigate} /></div>
          <NotificationBell count={unread} />
          {!user.permissions?.read_only && (
            <button
              className={`cms-btn small${syncState === "done" ? " cms-sync-done" : ""}`}
              onClick={handleForcePush}
              disabled={syncState === "syncing"}
              title="Ask any open public preview tab to fetch the latest published data"
              style={{ whiteSpace: "nowrap" }}
            >
              {syncState === "syncing" ? "Refreshing…" : syncState === "done" ? "✓ Refreshed" : "Refresh public preview"}
            </button>
          )}
          <div className="cms-user">
            <span>{user.first_name || user.username}</span>
            <small>{user.role_label}</small>
          </div>
          <button className="cms-btn light small" onClick={signOut}>Logout</button>
        </header>
        <main className="cms-content">
          {user.permissions?.read_only && (
            <div className="cms-alert info cms-readonly-banner">
              <strong>Read-only access.</strong> You can review records and reports, but changes and publishing are disabled for your role.
            </div>
          )}
          <Suspense fallback={<PageLoader />}>
            {renderPage(page, user, searchJump, handleGlobalNavigate)}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
