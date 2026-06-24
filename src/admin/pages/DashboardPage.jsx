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

// Keys where a non-zero value signals something needs attention
const WARN_IF_NONZERO = new Set([
  "missing_artist_countries", "duplicate_artists_detected",
  "certifications_unofficial", "errors_warnings",
]);

const HEALTH_OK = new Set(["ok", "OK", "healthy", "HEALTHY", "good", "GOOD"]);

function cardClass(key, value) {
  if (WARN_IF_NONZERO.has(key) && Number(value) > 0) return "warn";
  if (key === "system_health" && value && !HEALTH_OK.has(String(value))) return "warn";
  if (key === "system_health" && HEALTH_OK.has(String(value))) return "good";
  return "";
}

export default function DashboardPage({ onNavigate }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { cmsApi.get("/dashboard/").then(setData).catch((e) => setError(e.message)); }, []);
  if (error) return <div className="cms-alert error">{error}</div>;
  if (!data) return <div className="cms-empty">Loading dashboard...</div>;
  return (
    <section>
      <div className="cms-page-head"><div><h1>Dashboard</h1><p>The control room for Ngoma Charts.</p></div></div>
      <div className="cms-card-grid">
        {Object.entries(data.cards || {}).map(([key, value]) => {
          const cls = cardClass(key, value);
          return (
            <div className={`cms-stat-card${cls ? ` ${cls}` : ""}`} key={key}>
              <span>{labels[key] || key}</span>
              <strong>{format(value)}</strong>
            </div>
          );
        })}
      </div>
      <div className="cms-grid two">
        <div className="cms-card"><h2>Alerts</h2>{(data.alerts || []).map((a, i) => {
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
        <div className="cms-card"><h2>Top performing releases</h2><DataTable columns={[{key:"release__title",label:"Title"},{key:"release__artist__name",label:"Artist"},{key:"points",label:"Points"}]} rows={data.top_performing || []} /></div>
      </div>
      <div className="cms-card"><h2>Recent activity</h2><DataTable columns={[{key:"created_at",label:"Time",render:(r)=>new Date(r.created_at).toLocaleString()},{key:"user_name",label:"User"},{key:"action",label:"Action"},{key:"object_repr",label:"Item"}]} rows={data.recent_activity || []} /></div>
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
