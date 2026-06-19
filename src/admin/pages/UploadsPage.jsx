import { useEffect, useState } from "react";
import { cmsApi, getResults } from "../api";
import DataTable from "../components/DataTable";
import UploadPreviewTable from "../components/UploadPreviewTable";
import StatusBadge from "../components/StatusBadge";

export default function UploadsPage() {
  const [platforms, setPlatforms] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ chart_type: "singles", year: new Date().getFullYear(), month: new Date().getMonth() + 1, platform: "" });
  useEffect(() => { cmsApi.get("/platforms/").then((d)=>setPlatforms(getResults(d))); load(); }, []);
  async function load(){ setUploads(getResults(await cmsApi.get("/chart-uploads/"))); }
  function set(key, value){ setForm((current)=>({ ...current, [key]: value })); }
  async function submit(e){
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const body = new FormData();
      Object.entries(form).forEach(([k,v]) => { if(v !== "") body.append(k, v); });
      if (form.file) body.append("file", form.file);
      const upload = await cmsApi.post("/chart-uploads/", body);
      setSelected(upload); await load();
    } catch(err){ setError(err.message); } finally { setLoading(false); }
  }
  async function action(name){
    if(!selected) return;
    try { const next = await cmsApi.post(`/chart-uploads/${selected.id}/${name}/`); setSelected(next.upload || next); await load(); }
    catch(err){ setError(err.message); }
  }
  return (
    <section>
      <div className="cms-page-head"><div><h1>Chart Upload & Preview</h1><p>Upload CSV/Excel, validate rows, save draft, approve and publish.</p></div></div>
      {error && <div className="cms-alert error">{error}</div>}
      <div className="cms-grid two">
        <form className="cms-card cms-upload-form" onSubmit={submit}>
          <h2>New upload</h2>
          <label><span>Chart type</span><select value={form.chart_type} onChange={(e)=>set("chart_type", e.target.value)}><option value="singles">Singles</option><option value="albums">Albums</option></select></label>
          <label><span>Year</span><input type="number" value={form.year} onChange={(e)=>set("year", e.target.value)} /></label>
          <label><span>Month</span><input type="number" min="1" max="12" value={form.month} onChange={(e)=>set("month", e.target.value)} /></label>
          <label><span>Platform</span><select value={form.platform} onChange={(e)=>set("platform", e.target.value)}><option value="">Combined chart</option>{platforms.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
          <label className="wide"><span>CSV/Excel file</span><input type="file" accept=".csv,.xlsx,.xlsm" onChange={(e)=>set("file", e.target.files?.[0])} /></label>
          <button className="cms-btn full" disabled={loading}>{loading ? "Uploading..." : "Upload and validate"}</button>
          <p className="cms-help">Expected columns can include rank, title, artist, featured_artists, country_code, release_year, points/total_points, platforms, peak and last_month.</p>
        </form>
        <div className="cms-card">
          <h2>Validation summary</h2>
          {selected ? <Summary selected={selected} onAction={action} /> : <p className="cms-help">Upload a file to preview validation warnings here.</p>}
        </div>
      </div>
      {selected && <div className="cms-card"><h2>Preview rows</h2><UploadPreviewTable rows={selected.rows_data || []} /></div>}
      <div className="cms-card"><h2>Import history</h2><DataTable columns={[{key:"created_at",label:"Created",render:r=>new Date(r.created_at).toLocaleString()},{key:"chart_type",label:"Type"},{key:"platform_name",label:"Platform",render:r=>r.platform_name || "Combined"},{key:"row_count",label:"Rows"},{key:"status",label:"Status",render:r=><StatusBadge value={r.status} />}]} rows={uploads} onRowClick={setSelected} /></div>
    </section>
  );
}
function Summary({ selected, onAction }) {
  const summary = selected.validation_summary || {};
  return <div><div className="cms-upload-summary"><div><span>Rows</span><strong>{summary.row_count || selected.row_count || 0}</strong></div><div><span>Errors</span><strong>{summary.error_count || 0}</strong></div><div><span>Warnings</span><strong>{summary.warning_count || 0}</strong></div><div><span>Status</span><StatusBadge value={selected.status} /></div></div>{(summary.errors || []).slice(0,5).map((e,i)=><div className="cms-alert error" key={`e${i}`}>Row {e.row || "—"}: {e.message}</div>)}{(summary.warnings || []).slice(0,5).map((w,i)=><div className="cms-alert warning" key={`w${i}`}>Row {w.row || "—"}: {w.message}</div>)}<div className="cms-actions wrap"><button className="cms-btn light" onClick={()=>onAction("revalidate")}>Re-run validation</button><button className="cms-btn light" onClick={()=>onAction("submit_review")}>Submit review</button><button className="cms-btn light" onClick={()=>onAction("approve")}>Approve</button><button className="cms-btn" disabled={!summary.can_publish} onClick={()=>onAction("publish")}>Publish</button><button className="cms-btn danger" onClick={()=>onAction("rollback")}>Rollback</button></div></div>;
}
