import { useEffect, useMemo, useState } from "react";
import { cmsApi } from "./api";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ResourcePage from "./pages/ResourcePage";
import UploadsPage from "./pages/UploadsPage";
import ScaffoldPage from "./pages/ScaffoldPage";
import NotificationBell from "./components/NotificationBell";
import "./styles/admin.css";

const nav = [
  ["dashboard", "Dashboard"], ["charts", "Charts"], ["uploads", "Uploads"], ["songs", "Songs"], ["albums", "Albums"], ["artists", "Artists"], ["countries", "Countries"], ["platforms", "Platforms"], ["news", "News"], ["certifications", "Certifications"], ["certification-rules", "Certification Rules"], ["methodology", "Methodology"], ["page-content", "Page Content"], ["records", "Records"], ["year-end", "Year End"], ["analytics", "Analytics"], ["social-cards", "Social Cards"], ["media", "Media Library"], ["submissions", "Submissions"], ["users", "Users & Roles"], ["reports", "Reports"], ["settings", "Settings"], ["audit", "Audit Logs"], ["backups", "Backups"],
];

export default function AdminApp() {
  const [user, setUser] = useState(null), [checking, setChecking] = useState(true), [page, setPage] = useState(getInitialPage()), [sidebar, setSidebar] = useState(false), [globalSearch, setGlobalSearch] = useState(""), [searchResults, setSearchResults] = useState([]);
  useEffect(() => { cmsApi.me().then((d)=>setUser(d.user)).catch(()=>setUser(null)).finally(()=>setChecking(false)); }, []);
  useEffect(() => { const url = new URL(window.location.href); url.pathname = `/cms/${page === "dashboard" ? "" : page}`; window.history.replaceState({}, "", url); }, [page]);
  useEffect(() => { if(!globalSearch.trim()) { setSearchResults([]); return; } const t=setTimeout(()=>cmsApi.get(`/search/?q=${encodeURIComponent(globalSearch)}`).then((d)=>setSearchResults(d.results || [])).catch(()=>{}), 250); return ()=>clearTimeout(t); }, [globalSearch]);
  const unread = useMemo(()=>0, []);
  if (checking) return <div className="cms-boot">Loading CMS...</div>;
  if (!user) return <LoginPage onLogin={setUser} />;
  async function signOut(){ await cmsApi.logout().catch(()=>{}); setUser(null); }
  return (
    <div className="cms-shell">
      <aside className={`cms-sidebar ${sidebar ? "open" : ""}`}><div className="cms-brand"><b>NGOMA</b><span>Admin CMS</span></div><nav>{nav.map(([key,label])=><button key={key} className={page===key?"active":""} onClick={()=>{setPage(key);setSidebar(false);}}>{label}</button>)}</nav></aside>
      <div className="cms-main">
        <header className="cms-topbar"><button className="cms-menu" onClick={()=>setSidebar(!sidebar)}>☰</button><div className="cms-global"><input value={globalSearch} onChange={(e)=>setGlobalSearch(e.target.value)} placeholder="Search songs, artists, news, charts..." />{searchResults.length>0 && <div className="cms-search-pop">{searchResults.map((r,i)=><button key={i} onClick={()=>{setGlobalSearch(""); setPage(r.type === "artist" ? "artists" : r.type === "news" ? "news" : "songs");}}><b>{r.title}</b><span>{r.type} · {r.subtitle}</span></button>)}</div>}</div><NotificationBell count={unread} /><div className="cms-user"><span>{user.first_name || user.username}</span><small>{user.role_label}</small></div><button className="cms-btn light small" onClick={signOut}>Logout</button></header>
        <main className="cms-content">{renderPage(page, user)}</main>
      </div>
    </div>
  );
}
function getInitialPage(){ const part = window.location.pathname.split("/cms/")[1]?.replace(/^\//, "") || "dashboard"; return part || "dashboard"; }
function renderPage(page, user){
  if(page === "dashboard") return <DashboardPage />;
  if(page === "uploads") return <UploadsPage />;
  if(["artists","songs","albums","countries","platforms","news","charts","certifications","certification-rules","methodology","page-content","media","settings","users","reports","audit","backups"].includes(page)) return <ResourcePage type={page} user={user} />;
  const scaffolds = {
    "records": ["Highest monthly points", "Most #1s", "Longest charting", "Biggest debut", "Manual verification"],
    "year-end": ["Generate singles", "Generate albums", "Generate artists", "Eligible months", "Publish Year End"],
    "analytics": ["Widget visibility", "Head-to-head", "Platform comparison", "Country performance", "Trend labels"],
    "social-cards": ["Top 10", "#1 card", "Certification card", "Milestone card", "Story/square/X formats"],
    "submissions": ["Contact messages", "Correction requests", "Press releases", "New music submissions", "Partnerships"],
  };
  return <ScaffoldPage title={nav.find(([k])=>k===page)?.[1] || "CMS Module"} items={scaffolds[page] || ["Model placeholder", "API placeholder", "CMS navigation"]} />;
}
