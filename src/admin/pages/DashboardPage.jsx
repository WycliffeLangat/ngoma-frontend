import { useEffect, useState } from "react";
import { cmsApi } from "../api";
import DataTable from "../components/DataTable";

const labels = {
  total_songs: "Total songs", total_albums: "Total albums", total_artists: "Total artists",
  latest_uploaded_chart_month: "Latest chart month", pending_approvals: "Pending approvals",
  missing_artist_countries: "Missing countries", duplicate_artists_detected: "Duplicate artists",
  latest_news_posts: "News posts", recently_edited_data: "Audit events", errors_warnings: "Open reports",
  system_health: "System health", last_backup_date: "Last backup", editors_admins: "Editors/admins",
  unpublished_chart_months: "Unpublished charts", certifications_unofficial: "Unofficial certs", uploads_awaiting_review: "Uploads awaiting review",
};

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { cmsApi.get("/dashboard/").then(setData).catch((e) => setError(e.message)); }, []);
  if (error) return <div className="cms-alert error">{error}</div>;
  if (!data) return <div className="cms-empty">Loading dashboard...</div>;
  return (
    <section>
      <div className="cms-page-head"><div><h1>Dashboard</h1><p>The control room for Ngoma Charts.</p></div></div>
      <div className="cms-card-grid">
        {Object.entries(data.cards || {}).map(([key, value]) => <div className="cms-stat-card" key={key}><span>{labels[key] || key}</span><strong>{format(value)}</strong></div>)}
      </div>
      <div className="cms-grid two">
        <div className="cms-card"><h2>Alerts</h2>{(data.alerts || []).map((a, i) => <div key={i} className={`cms-alert ${a.level}`}><b>{a.title}</b><br />{a.message}</div>)}</div>
        <div className="cms-card"><h2>Top performing releases</h2><DataTable columns={[{key:"release__title",label:"Title"},{key:"release__artist__name",label:"Artist"},{key:"points",label:"Points"}]} rows={data.top_performing || []} /></div>
      </div>
      <div className="cms-card"><h2>Recent activity</h2><DataTable columns={[{key:"created_at",label:"Time",render:(r)=>new Date(r.created_at).toLocaleString()},{key:"user_name",label:"User"},{key:"action",label:"Action"},{key:"object_repr",label:"Item"}]} rows={data.recent_activity || []} /></div>
    </section>
  );
}
function format(v){ if(!v) return v===0?"0":"—"; if(String(v).includes("T")) return new Date(v).toLocaleString(); return String(v); }
