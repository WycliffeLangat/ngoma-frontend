import { useEffect, useState } from "react";
import { cmsApi, getResults } from "../api";
import DataTable from "../components/DataTable";
import UploadPreviewTable from "../components/UploadPreviewTable";
import StatusBadge from "../components/StatusBadge";

export default function UploadsPage({ user }) {
  const canManageData = Boolean(user?.permissions?.can_manage_data) && !user?.permissions?.read_only;
  const canPublish = Boolean(user?.permissions?.can_publish);
  const [platforms, setPlatforms] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    chart_type: "singles",
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    platform: "",
  });

  useEffect(() => {
    cmsApi.get("/platforms/").then((data) => setPlatforms(getResults(data)));
    load();
  }, []);

  async function load() {
    setUploads(getResults(await cmsApi.get("/chart-uploads/")));
  }

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (!canManageData) return;
    setError("");
    setLoading(true);
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value !== "" && key !== "file") body.append(key, value);
      });
      if (form.file) body.append("file", form.file);
      const upload = await cmsApi.post("/chart-uploads/", body);
      setSelected(upload);
      await load();
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setLoading(false);
    }
  }

  async function runAction(name) {
    if (!selected || !canManageData) return;
    if (["approve", "publish", "rollback"].includes(name) && !canPublish) {
      setError("Your role is not allowed to perform this publishing action.");
      return;
    }
    try {
      const next = await cmsApi.post(`/chart-uploads/${selected.id}/${name}/`);
      setSelected(next.upload || next);
      await load();
    } catch (actionError) {
      setError(actionError.message);
    }
  }

  return (
    <section>
      <div className="cms-page-head">
        <div>
          <h1>Imports & Uploads</h1>
          <p>Upload, validate, review and publish chart files through a guided workflow.</p>
        </div>
      </div>
      {error && <div className="cms-alert error">{error}</div>}
      <div className="cms-grid two">
        {canManageData ? (
          <form className="cms-card cms-upload-form" onSubmit={submit}>
            <h2>New chart file</h2>
            <label><span>Chart type</span><select value={form.chart_type} onChange={(event) => set("chart_type", event.target.value)}><option value="singles">Singles</option><option value="albums">Albums</option></select></label>
            <label><span>Year</span><input required type="number" min="1900" max="2200" value={form.year} onChange={(event) => set("year", event.target.value)} /></label>
            <label><span>Month</span><input required type="number" min="1" max="12" value={form.month} onChange={(event) => set("month", event.target.value)} /></label>
            <label><span>Platform</span><select value={form.platform} onChange={(event) => set("platform", event.target.value)}><option value="">Combined chart</option>{platforms.map((platform) => <option value={platform.id} key={platform.id}>{platform.name}</option>)}</select></label>
            <label className="wide"><span>CSV or Excel file</span><input required type="file" accept=".csv,.xlsx,.xlsm" onChange={(event) => set("file", event.target.files?.[0])} /></label>
            <button className="cms-btn full" disabled={loading}>{loading ? "Uploading…" : "Upload and validate"}</button>
            <p className="cms-help">Include rank, title and artist. Optional columns include featured artists, country code, release year, points, platforms, peak and last month.</p>
          </form>
        ) : (
          <div className="cms-card">
            <h2>New chart file</h2>
            <p className="cms-help">Your role can review import history and validation results, but cannot upload or change chart files.</p>
          </div>
        )}
        <div className="cms-card">
          <h2>Validation summary</h2>
          {selected
            ? <Summary selected={selected} onAction={runAction} canManageData={canManageData} canPublish={canPublish} />
            : <p className="cms-help">Select an import below to review its errors and warnings.</p>}
        </div>
      </div>
      {selected && <div className="cms-card"><h2>Preview rows</h2><UploadPreviewTable rows={selected.rows_data || []} /></div>}
      <div className="cms-card">
        <h2>Import history</h2>
        <DataTable
          columns={[
            { key: "created_at", label: "Created", render: (row) => new Date(row.created_at).toLocaleString() },
            { key: "chart_type", label: "Type" },
            { key: "platform_name", label: "Platform", render: (row) => row.platform_name || "Combined" },
            { key: "row_count", label: "Rows" },
            { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> },
          ]}
          rows={uploads}
          onRowClick={setSelected}
        />
      </div>
    </section>
  );
}

function Summary({ selected, onAction, canManageData, canPublish }) {
  const summary = selected.validation_summary || {};
  return (
    <div>
      <div className="cms-upload-summary">
        <div><span>Rows</span><strong>{summary.row_count || selected.row_count || 0}</strong></div>
        <div><span>Errors</span><strong>{summary.error_count || 0}</strong></div>
        <div><span>Warnings</span><strong>{summary.warning_count || 0}</strong></div>
        <div><span>Status</span><StatusBadge value={selected.status} /></div>
      </div>
      {(summary.errors || []).slice(0, 5).map((error, index) => <div className="cms-alert error" key={`e${index}`}>Row {error.row || "—"}: {error.message}</div>)}
      {(summary.warnings || []).slice(0, 5).map((warning, index) => <div className="cms-alert warning" key={`w${index}`}>Row {warning.row || "—"}: {warning.message}</div>)}
      {canManageData && (
        <div className="cms-actions wrap">
          <button className="cms-btn light" onClick={() => onAction("revalidate")}>Re-run validation</button>
          <button className="cms-btn light" onClick={() => onAction("submit_review")}>Submit for review</button>
          {canPublish && (
            <>
              <button className="cms-btn light" onClick={() => onAction("approve")}>Approve</button>
              <button className="cms-btn" disabled={!summary.can_publish} onClick={() => onAction("publish")}>Publish</button>
              <button className="cms-btn danger" onClick={() => onAction("rollback")}>Rollback</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
