import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cmsApi, notifyPublicAppChangedNow } from "./api";
import LoginPage from "./pages/LoginPage";          // tiny — needed immediately for auth
import NotificationBell from "./components/NotificationBell";
import GlobalSearch from "./components/GlobalSearch";
import NgomaMark from "../components/NgomaMark.jsx";
import { buildDashboardAudit, mergeDashboardAudit, sanitizeDashboardAttention } from "./dataQualityAudit";
import "./styles/admin.css";

// All CMS pages are lazy-loaded so they only download when first visited.
// Switching between pages is instant on repeat visits (JS is cached by the browser).
const DashboardPage       = lazy(() => import("./pages/DashboardPage"));
const ResourcePage        = lazy(() => import("./pages/ResourcePage"));
const DuplicateReviewPage = lazy(() => import("./pages/DuplicateReviewPage"));
const UploadsPage         = lazy(() => import("./pages/UploadsPage"));
const ChartEntriesPage    = lazy(() => import("./pages/ChartEntriesPage"));
const YearEndPage         = lazy(() => import("./pages/YearEndPage"));
const PosterGeneratorPage = lazy(() => import("./pages/PosterGeneratorPage"));
const SpotlightGeneratorPage = lazy(() => import("./pages/SpotlightGeneratorPage"));
const NewsCardPage        = lazy(() => import("./pages/NewsCardPage"));
const AnalyticsRecordPage = lazy(() => import("./pages/AnalyticsRecordPage"));
const CertificationCardPage = lazy(() => import("./pages/CertificationCardPage"));
const PlatformBreakdownPosterPage = lazy(() => import("./pages/PlatformBreakdownPosterPage"));
const CrossPlatformPosterPage = lazy(() => import("./pages/CrossPlatformPosterPage"));
const MoversPosterPage = lazy(() => import("./pages/MoversPosterPage"));
const HallOfFamePosterPage = lazy(() => import("./pages/HallOfFamePosterPage"));
const HeadToHeadPosterPage = lazy(() => import("./pages/HeadToHeadPosterPage"));
const HelpCenterPage      = lazy(() => import("./pages/HelpCenterPage"));
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
      ["poster", "Social poster generator"],
      ["spotlight", "Spotlight card generator"],
      ["analytics-record", "Analytics record cards"],
      ["certification-card", "Certification card generator"],
      ["platform-breakdown-poster", "Platform & country breakdown poster"],
      ["cross-platform-poster", "Cross-platform poster"],
      ["movers-poster", "Movers & shakers poster"],
      ["hall-of-fame-poster", "Hall of Fame poster"],
      ["head-to-head-poster", "Head-to-head poster"],
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
      ["news-card", "News card generator"],
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
  {
    label: "Support",
    items: [["help", "Help Center"]],
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
  const part = window.location.pathname
    .replace(/^\/(?:cms|admin-cms|admin)\/?/i, "")
    .split("/")[0] || "dashboard";
  return KNOWN_PAGES.has(part) ? part : "dashboard";
}

function getPageLabel(page) {
  return nav.find(([key]) => key === page)?.[1] || "Dashboard";
}

function getUserInitials(user) {
  const name = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.username || "Admin";
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function countOpenAlerts(alerts = []) {
  return (alerts || []).reduce((total, alert) => {
    const count = Number(alert.total || alert.details?.length || 1);
    return total + (Number.isFinite(count) && count > 0 ? count : 1);
  }, 0);
}

async function fetchDashboardAlertCount() {
  const [summary, insights] = await Promise.all([
    cmsApi.get("/dashboard/", { skipCache: true }),
    cmsApi.get("/dashboard/insights/", { skipCache: true }),
  ]);
  const baseData = sanitizeDashboardAttention({ ...summary, ...insights, cards: { ...summary.cards, ...insights.cards } });
  try {
    const audit = await buildDashboardAudit(cmsApi);
    return countOpenAlerts(mergeDashboardAudit(baseData, audit).alerts || []);
  } catch {
    return countOpenAlerts(baseData.alerts || []);
  }
}

function PageLoader() {
  return <div className="cms-empty" style={{ paddingTop: 60 }}>Loading…</div>;
}

function renderPage(page, user, searchJump, onNavigate) {
  if (page === "dashboard")       return <DashboardPage user={user} onNavigate={onNavigate} searchJump={searchJump} />;
  if (page === "chart-entries")   return <ChartEntriesPage user={user} searchJump={searchJump} />;
  if (page === "year-end")        return <YearEndPage onNavigate={onNavigate} />;
  if (page === "poster")          return <PosterGeneratorPage />;
  if (page === "spotlight")       return <SpotlightGeneratorPage />;
  if (page === "news-card")       return <NewsCardPage />;
  if (page === "analytics-record")return <AnalyticsRecordPage />;
  if (page === "certification-card") return <CertificationCardPage />;
  if (page === "platform-breakdown-poster") return <PlatformBreakdownPosterPage />;
  if (page === "cross-platform-poster") return <CrossPlatformPosterPage />;
  if (page === "movers-poster") return <MoversPosterPage />;
  if (page === "hall-of-fame-poster") return <HallOfFamePosterPage />;
  if (page === "head-to-head-poster") return <HeadToHeadPosterPage />;
  if (page === "uploads")         return <UploadsPage user={user} searchJump={searchJump} />;
  if (page === "duplicate-review")return <DuplicateReviewPage user={user} />;
  if (page === "help")            return <HelpCenterPage />;
  if (RESOURCE_PAGES.has(page))   return <ResourcePage type={page} user={user} searchJump={searchJump} onNavigate={onNavigate} />;
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
  const [alertCount, setAlertCount] = useState(0);
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

  function handleGlobalNavigate(targetPage, term, id, context = {}) {
    setPage(targetPage);
    setSearchJump({ page: targetPage, term, id, ...context, ts: Date.now() });
  }

  const refreshAlertCount = useCallback(async (isActive = () => true) => {
    try {
      const count = await fetchDashboardAlertCount();
      if (isActive()) setAlertCount(count);
    } catch {
      if (isActive()) setAlertCount(0);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setAlertCount(0);
      return undefined;
    }
    let active = true;
    const isActive = () => active;
    const refresh = () => refreshAlertCount(isActive);
    refresh();
    window.addEventListener("ngoma-cms-change", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.removeEventListener("ngoma-cms-change", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [refreshAlertCount, user]);

  const unread = alertCount;
  const navigation = useMemo(() => visibleNavGroups(user), [user]);
  const pageLabel = getPageLabel(page);

  if (checking) return <div className="cms-boot">Loading CMS…</div>;
  if (!user)    return <LoginPage onLogin={setUser} />;

  async function signOut() { await cmsApi.logout().catch(() => {}); setUser(null); }

  function handleForcePush() {
    if (syncState === "syncing") return;
    setSyncState("syncing");
    notifyPublicAppChangedNow();
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
        <div className="cms-brand">
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"6px",flex:1,minWidth:0}}>
            <NgomaMark size={30} inkColor="#FFF" />
            <span style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"2px",minWidth:0}}>
              <strong style={{fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",fontSize:"14px",fontWeight:950,letterSpacing:"-.02em",color:"#fff"}}>Ngoma Charts</strong>
              <small style={{fontSize:"10px",letterSpacing:".09em",textTransform:"uppercase",color:"#908f86"}}>Admin workspace</small>
            </span>
          </div>
          <button
            type="button"
            className="cms-sidebar-close"
            onClick={() => setSidebar(false)}
            aria-label="Close navigation"
          >×</button>
        </div>
        <nav aria-label="CMS navigation">
          {navigation.map((group) => (
            <div className="cms-nav-group" key={group.label}>
              <span className="cms-nav-label">{group.label}</span>
              {group.items.map(([key, label]) => (
                <button
                  key={key}
                  className={page === key ? "active" : ""}
                  aria-current={page === key ? "page" : undefined}
                  onClick={() => { setPage(key); setSidebar(false); }}
                ><span className="cms-nav-dot" aria-hidden="true" />{label}</button>
              ))}
            </div>
          ))}
        </nav>
        <div className="cms-sidebar-footer">
          <a href="/" target="_blank" rel="noreferrer">
            <span aria-hidden="true">↗</span>
            View public site
          </a>
          <small>Ngoma Charts CMS</small>
        </div>
      </aside>
      <div className="cms-main">
        <header className="cms-topbar">
          <button
            className="cms-menu"
            onClick={() => setSidebar(!sidebar)}
            aria-label="Open navigation"
            aria-expanded={sidebar}
          >☰</button>
          <div className="cms-page-context">
            <small>Workspace</small>
            <strong>{pageLabel}</strong>
          </div>
          <div className="cms-global"><GlobalSearch onNavigate={handleGlobalNavigate} /></div>
          <NotificationBell count={unread} onClick={() => handleGlobalNavigate("dashboard", "", null)} />
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
            <b aria-hidden="true">{getUserInitials(user)}</b>
            <span>
              <strong>{user.first_name || user.username}</strong>
              <small>{user.role_label}</small>
            </span>
          </div>
          <button className="cms-btn light small cms-logout" onClick={signOut}>Sign out</button>
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
