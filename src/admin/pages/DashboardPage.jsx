import { useEffect, useState } from "react";
import { cmsApi } from "../api";
import DataTable from "../components/DataTable";

const labels = {
  total_songs: "Total songs", total_albums: "Total albums", total_artists: "Total artists",
  latest_uploaded_chart_month: "Latest chart month", pending_approvals: "Pending approvals",
  missing_artist_countries: "Artists without country", duplicate_artists_detected: "Duplicate artists",
  latest_news_posts: "News posts", recently_edited_data: "Audit events", errors_warnings: "Open reports",
  system_health: "System health", last_backup_date: "Last backup", editors_admins: "Editors/admins",
  unpublished_chart_months: "Unpublished charts", certifications_unofficial: "Unofficial certifications", uploads_awaiting_review: "Uploads awaiting review",
};

const cardMeta = {
  total_songs: { icon: "♪", hint: "Songs in the catalogue", target: "songs" },
  total_albums: { icon: "◉", hint: "Albums in the catalogue", target: "albums" },
  total_artists: { icon: "A", hint: "Artist profiles", target: "artists" },
  latest_uploaded_chart_month: { icon: "↗", hint: "Most recent chart import", target: "uploads" },
  pending_approvals: { icon: "✓", hint: "Items awaiting review", target: "uploads" },
  missing_artist_countries: { icon: "!", hint: "Profiles needing attention", target: "artists" },
  duplicate_artists_detected: { icon: "≋", hint: "Potential duplicate profiles", target: "duplicate-review" },
  latest_news_posts: { icon: "N", hint: "Published and draft stories", target: "news" },
  recently_edited_data: { icon: "↺", hint: "Recent change events", target: "audit" },
  errors_warnings: { icon: "!", hint: "Open quality reports", target: "reports" },
  system_health: { icon: "●", hint: "Publishing and data checks", target: "reports" },
  last_backup_date: { icon: "↧", hint: "Most recent backup", target: "backups" },
  editors_admins: { icon: "U", hint: "People with CMS access", target: "users" },
  unpublished_chart_months: { icon: "○", hint: "Charts not yet public", target: "charts" },
  certifications_unofficial: { icon: "◇", hint: "Certifications to verify", target: "certifications" },
  uploads_awaiting_review: { icon: "↑", hint: "Imports awaiting review", target: "uploads" },
};

// Keys where a non-zero value signals something needs attention
const WARN_IF_NONZERO = new Set([
  "missing_artist_countries", "duplicate_artists_detected",
  "certifications_unofficial", "errors_warnings",
]);

// Exact values returned by the backend (cms_views.py line 106)
// 'ACTION_REQUIRED' → error alerts exist
// 'NEEDS_ATTENTION' → warning alerts exist
// 'OK'             → no alerts

function cardClass(key, value) {
  if (WARN_IF_NONZERO.has(key) && Number(value) > 0) return "warn";
  if (key === "system_health") {
    if (value === "ACTION_REQUIRED") return "danger";
    if (value === "NEEDS_ATTENTION") return "warn";
    if (value === "OK") return "good";
  }
  return "";
}

export default function DashboardPage({ user, onNavigate }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { cmsApi.get("/dashboard/").then(setData).catch((e) => setError(e.message)); }, []);
  if (error) return <div className="cms-alert error">{error}</div>;
  if (!data) return <div className="cms-empty">Loading dashboard...</div>;
  const firstName = user?.first_name || user?.username || "there";
  return (
    <section>
      <div className="cms-page-head cms-dashboard-head">
        <div>
          <span className="cms-eyebrow">Overview</span>
          <h1>Welcome back, {firstName}</h1>
          <p>Here is what needs your attention across Ngoma Charts.</p>
        </div>
        {!user?.permissions?.read_only && (
          <div className="cms-quick-actions" aria-label="Quick actions">
            <button className="cms-btn light" onClick={() => onNavigate?.("chart-entries")}>Manage chart</button>
            <button className="cms-btn" onClick={() => onNavigate?.("uploads")}>Upload chart</button>
          </div>
        )}
      </div>
      <div className="cms-card-grid">
        {Object.entries(data.cards || {}).map(([key, value]) => {
          const cls = cardClass(key, value);
          const meta = cardMeta[key] || { icon: "•", hint: "View details" };
          const interactive = Boolean(meta.target && onNavigate);
          const Card = interactive ? "button" : "div";
          return (
            <Card
              type={interactive ? "button" : undefined}
              className={`cms-stat-card${cls ? ` ${cls}` : ""}${interactive ? " interactive" : ""}`}
              key={key}
              onClick={interactive ? () => onNavigate(meta.target) : undefined}
            >
              <span className="cms-stat-icon" aria-hidden="true">{meta.icon}</span>
              <span className="cms-stat-label">{labels[key] || key}</span>
              <strong>{format(value)}</strong>
              <small>{meta.hint}</small>
            </Card>
          );
        })}
      </div>
      <div className="cms-grid two">
        <div className="cms-card"><div className="cms-card-heading"><div><span className="cms-eyebrow">Needs attention</span><h2>Alerts</h2></div><span className="cms-count-badge">{(data.alerts || []).length}</span></div>{(data.alerts || []).length === 0 && <div className="cms-empty compact">Everything looks good. No open alerts.</div>}{(data.alerts || []).map((a, i) => {
          const isCertAlert = /certif/i.test(a.title || "") || /certif/i.test(a.message || "");
          return (
            <div key={i} className={`cms-alert ${a.level}`}>
              <b>{a.title}</b><br />{a.message}
              {isCertAlert && onNavigate && (
                <div style={{ marginTop: 8 }}>
                  <button className="cms-btn light" style={{ fontSize: 11, padding: "3px 12px" }} onClick={() => onNavigate("certifications")}>
                    Fix in Certifications →
                  </button>
                </div>
              )}
            </div>
          );
        })}</div>
        <div className="cms-card"><div className="cms-card-heading"><div><span className="cms-eyebrow">Current leaders</span><h2>Top performing releases</h2></div></div><DataTable columns={[{key:"release__title",label:"Title"},{key:"release__artist__name",label:"Artist"},{key:"points",label:"Points"}]} rows={data.top_performing || []} /></div>
      </div>
      <div className="cms-card"><div className="cms-card-heading"><div><span className="cms-eyebrow">Audit trail</span><h2>Recent activity</h2></div><button className="cms-text-btn" onClick={() => onNavigate?.("audit")}>View audit log →</button></div><DataTable columns={[{key:"created_at",label:"Time",render:(r)=>new Date(r.created_at).toLocaleString()},{key:"user_name",label:"User"},{key:"action",label:"Action"},{key:"object_repr",label:"Item"}]} rows={data.recent_activity || []} /></div>
    </section>
  );
}
function format(v){
  if(v === null || v === undefined || v === "") return "—";
  if(v === 0) return "0";
  const s = String(v);
  if(/^\d{4}-\d{2}-\d{2}T/.test(s)){
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toLocaleString();
  }
  // Humanise ALL_CAPS_ENUM strings from the backend
  if(/^[A-Z][A-Z0-9_]+$/.test(s)){
    return s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()).toLowerCase()
            .replace(/\b\w/g, c => c.toUpperCase());
  }
  return s;
}
