import { useEffect, useState } from "react";
import { cmsApi, getResults } from "../api";
import DataTable from "../components/DataTable";
import UploadPreviewTable from "../components/UploadPreviewTable";
import StatusBadge from "../components/StatusBadge";
import ConfirmDialog from "../components/ConfirmDialog";

const RAW_WEEKLY = "weekly";
const FINAL_CHART = "final";
const UPLOAD_PROCESSING_TIMEOUT_MS = 5 * 60_000;

export default function UploadsPage({ user, searchJump }) {
  const canManageData = Boolean(user?.permissions?.can_manage_data) && !user?.permissions?.read_only;
  const canPublish = Boolean(user?.permissions?.can_publish);
  const [uploadKind, setUploadKind] = useState(RAW_WEEKLY);
  const [platforms, setPlatforms] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [selected, setSelected] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [form, setForm] = useState({
    chart_type: "singles",
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    week: 1,
    platform: "",
    file: null,
  });

  useEffect(() => {
    cmsApi.get("/platforms/").then((data) => setPlatforms(getResults(data))).catch(() => {});
  }, []);

  useEffect(() => {
    setSelected(null);
    setError("");
    load(uploadKind);
  }, [uploadKind]);

  // Jump straight to the specific upload a dashboard alert flagged, so
  // clicking "Fix" opens that upload's validation summary directly.
  useEffect(() => {
    if (!searchJump || searchJump.page !== "uploads" || !searchJump.id) return;
    if (uploadKind !== FINAL_CHART) {
      setUploadKind(FINAL_CHART);
      return;
    }
    cmsApi.get(`/chart-uploads/${searchJump.id}/`)
      .then((upload) => setSelected({ ...upload, _uploadKind: FINAL_CHART }))
      .catch((jumpError) => setError(jumpError.message));
  }, [searchJump, uploadKind]);

  async function load(kind = uploadKind) {
    const endpoint = kind === RAW_WEEKLY ? "/weekly-uploads/" : "/chart-uploads/";
    try {
      const data = getResults(await cmsApi.get(endpoint));
      setUploads(data.map((item) => ({ ...item, _uploadKind: kind })));
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (!canManageData || !form.file) return;
    setError("");
    setLoading(true);
    try {
      const body = new FormData();
      const fields = uploadKind === RAW_WEEKLY
        ? ["chart_type", "year", "month", "week"]
        : ["chart_type", "year", "month", "platform"];
      fields.forEach((key) => {
        if (form[key] !== "") body.append(key, form[key]);
      });
      body.append("file", form.file);
      const endpoint = uploadKind === RAW_WEEKLY ? "/weekly-uploads/" : "/chart-uploads/";
      const upload = await cmsApi.post(endpoint, body, {
        timeoutMs: UPLOAD_PROCESSING_TIMEOUT_MS,
      });
      setSelected({ ...upload, _uploadKind: uploadKind });
      await load(uploadKind);
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setLoading(false);
    }
  }

  async function runAction(name) {
    if (!selected || selected._uploadKind !== FINAL_CHART || !canManageData || actionBusy) return;
    if (["approve", "publish", "rollback"].includes(name) && !canPublish) {
      setError("Your role is not allowed to perform this publishing action.");
      return;
    }
    setActionBusy(true);
    try {
      const next = await cmsApi.post(
        `/chart-uploads/${selected.id}/${name}/`,
        {},
        {
          timeoutMs:
            name === "publish"
              ? UPLOAD_PROCESSING_TIMEOUT_MS
              : undefined,
        },
      );
      setSelected({ ...(next.upload || next), _uploadKind: FINAL_CHART });
      await load(FINAL_CHART);
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setActionBusy(false);
    }
  }

  async function deleteUpload() {
    if (!deleteTarget || !canManageData || actionBusy) return;
    setError("");
    setActionBusy(true);
    const kind = deleteTarget._uploadKind === RAW_WEEKLY ? RAW_WEEKLY : FINAL_CHART;
    const endpoint = kind === RAW_WEEKLY
      ? `/weekly-uploads/${deleteTarget.id}/`
      : `/chart-uploads/${deleteTarget.id}/`;
    try {
      await cmsApi.delete(endpoint);
      if (selected?.id === deleteTarget.id && selected?._uploadKind === kind) {
        setSelected(null);
      }
      setDeleteTarget(null);
      await load(kind);
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setActionBusy(false);
    }
  }

  const isWeekly = uploadKind === RAW_WEEKLY;

  return (
    <section>
      <div className="cms-page-head">
        <div>
          <span className="cms-eyebrow">Chart operations</span>
          <h1>Imports & uploads</h1>
          <p>Bring raw weekly platform rankings into the monthly chart workflow.</p>
        </div>
      </div>

      <div className="cms-upload-mode" role="tablist" aria-label="Upload type">
        <button
          type="button"
          role="tab"
          aria-selected={isWeekly}
          className={`cms-upload-mode-btn${isWeekly ? " active" : ""}`}
          onClick={() => setUploadKind(RAW_WEEKLY)}
        >
          <strong>Raw weekly rankings</strong>
          <span>Recommended for weekly platform files</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={!isWeekly}
          className={`cms-upload-mode-btn${!isWeekly ? " active" : ""}`}
          onClick={() => setUploadKind(FINAL_CHART)}
        >
          <strong>Final chart replacement</strong>
          <span>Advanced: replace an already ranked chart</span>
        </button>
      </div>

      {isWeekly && (
        <div className="cms-alert info cms-upload-guidance">
          <strong>Use your raw weekly workbook as-is.</strong>
          <span>
            The first row should contain platform columns such as Apple Music, Audiomack,
            Boomplay, Spotify, YouTube and Shazam. Each column is read from #1 downward;
            you do not need to select one platform.
          </span>
        </div>
      )}

      {error && <div className="cms-alert error" role="alert">{error}</div>}
      <div className="cms-grid two">
        {canManageData ? (
          <form className="cms-card cms-upload-form" onSubmit={submit}>
            <div className="cms-card-heading wide">
              <div>
                <span className="cms-eyebrow">{isWeekly ? "Weekly source data" : "Advanced import"}</span>
                <h2>{isWeekly ? "Upload weekly rankings" : "Replace a final chart"}</h2>
              </div>
            </div>
            <label>
              <span>Chart type</span>
              <select value={form.chart_type} onChange={(event) => set("chart_type", event.target.value)}>
                <option value="singles">Singles</option>
                <option value="albums">Albums</option>
              </select>
            </label>
            <label>
              <span>Year</span>
              <input required type="number" min="1900" max="2200" value={form.year} onChange={(event) => set("year", event.target.value)} />
            </label>
            <label>
              <span>Month</span>
              <select value={form.month} onChange={(event) => set("month", event.target.value)}>
                {Array.from({ length: 12 }, (_, index) => (
                  <option value={index + 1} key={index + 1}>
                    {new Date(2000, index, 1).toLocaleString(undefined, { month: "long" })}
                  </option>
                ))}
              </select>
            </label>
            {isWeekly ? (
              <label>
                <span>Week of month</span>
                <select value={form.week} onChange={(event) => set("week", event.target.value)}>
                  {[1, 2, 3, 4, 5].map((week) => <option value={week} key={week}>Week {week}</option>)}
                </select>
              </label>
            ) : (
              <label>
                <span>Chart scope</span>
                <select value={form.platform} onChange={(event) => set("platform", event.target.value)}>
                  <option value="">Combined chart</option>
                  {platforms.map((platform) => <option value={platform.id} key={platform.id}>{platform.name}</option>)}
                </select>
                <small>Choose a platform only when the file is one finalized platform chart.</small>
              </label>
            )}
            <label className="wide cms-file-drop">
              <span>{isWeekly ? "Raw weekly Excel workbook" : "Final chart CSV or Excel file"}</span>
              <input
                key={uploadKind}
                required
                type="file"
                accept={isWeekly ? ".xlsx,.xlsm" : ".csv,.xlsx,.xlsm"}
                onChange={(event) => set("file", event.target.files?.[0] || null)}
              />
              <small>
                {isWeekly
                  ? "XLSX or XLSM with one column per platform."
                  : "Include rank, title and artist. This replaces the selected final chart."}
              </small>
            </label>
            <button className="cms-btn full" disabled={loading || !form.file}>
              {loading ? "Processing workbook…" : isWeekly ? "Process Week" : "Upload and validate"}
            </button>
          </form>
        ) : (
          <div className="cms-card">
            <h2>New chart file</h2>
            <p className="cms-help">Your role can review import history, but cannot upload or change chart files.</p>
          </div>
        )}

        <div className="cms-card">
          <div className="cms-card-heading">
            <div>
              <span className="cms-eyebrow">Current selection</span>
              <h2>{isWeekly ? "Processing result" : "Validation summary"}</h2>
            </div>
          </div>
          {selected ? (
            selected._uploadKind === RAW_WEEKLY
              ? <WeeklySummary selected={selected} />
              : <FinalSummary selected={selected} onAction={runAction} canManageData={canManageData} canPublish={canPublish} />
          ) : (
            <div className="cms-empty compact">
              {isWeekly ? "Process a workbook or select a previous week below." : "Select an import to review its validation."}
            </div>
          )}
        </div>
      </div>

      {selected?._uploadKind === FINAL_CHART && (
        <div className="cms-card"><h2>Preview rows</h2><UploadPreviewTable rows={selected.rows_data || []} /></div>
      )}

      <div className="cms-card">
        <div className="cms-card-heading">
          <div>
            <span className="cms-eyebrow">History</span>
            <h2>{isWeekly ? "Weekly imports" : "Final chart imports"}</h2>
          </div>
        </div>
        <DataTable
          columns={isWeekly ? [
            { key: "uploaded_at", label: "Uploaded", render: (row) => new Date(row.uploaded_at).toLocaleString() },
            { key: "chart_type", label: "Type" },
            { key: "week", label: "Period", render: (row) => `${monthName(row.month)} ${row.year} · Week ${row.week}` },
            { key: "original_filename", label: "File" },
            { key: "entries_processed", label: "Entries" },
            { key: "processed", label: "Status", render: (row) => <StatusBadge value={row.processed ? "published" : "error"} /> },
            { key: "actions", label: "Actions", render: (row) => canManageData ? (
              <button
                type="button"
                className="cms-btn danger small"
                onClick={(event) => {
                  event.stopPropagation();
                  setDeleteTarget(row);
                }}
                disabled={actionBusy}
              >
                Delete
              </button>
            ) : "—" },
          ] : [
            { key: "created_at", label: "Created", render: (row) => new Date(row.created_at).toLocaleString() },
            { key: "chart_type", label: "Type" },
            { key: "platform_name", label: "Scope", render: (row) => row.platform_name || "Combined" },
            { key: "row_count", label: "Rows" },
            { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> },
            { key: "actions", label: "Actions", render: (row) => canManageData ? (
              <button
                type="button"
                className="cms-btn danger small"
                onClick={(event) => {
                  event.stopPropagation();
                  setDeleteTarget(row);
                }}
                disabled={actionBusy}
              >
                Delete
              </button>
            ) : "—" },
          ]}
          rows={uploads}
          onRowClick={setSelected}
        />
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete import"
        message={deleteTarget
          ? `Delete this ${deleteTarget._uploadKind === RAW_WEEKLY ? "weekly import" : "chart upload"}? This cannot be undone.`
          : ""}
        confirmLabel={actionBusy ? "Deleting…" : "Delete"}
        onCancel={() => {
          if (!actionBusy) setDeleteTarget(null);
        }}
        onConfirm={deleteUpload}
      />
    </section>
  );
}

function WeeklySummary({ selected }) {
  const failed = !selected.processed || String(selected.processing_notes || "").startsWith("Error:");
  return (
    <div>
      <div className="cms-upload-summary">
        <div><span>Month</span><strong>{monthName(selected.month)}</strong></div>
        <div><span>Week</span><strong>{selected.week}</strong></div>
        <div><span>Entries</span><strong>{selected.entries_processed || 0}</strong></div>
        <div><span>Duplicates removed</span><strong>{selected.duplicates_dropped || 0}</strong></div>
      </div>
      <div className={`cms-alert ${failed ? "error" : "info"}`}>
        <strong>{failed ? "Processing failed" : "Week processed successfully"}</strong><br />
        {failed
          ? selected.processing_notes
          : "Platform entries were normalized and the month-to-date chart was rebuilt automatically."}
      </div>
    </div>
  );
}

function FinalSummary({ selected, onAction, canManageData, canPublish }) {
  const summary = selected.validation_summary || {};
  return (
    <div>
      <div className="cms-upload-summary">
        <div><span>Rows</span><strong>{summary.row_count || selected.row_count || 0}</strong></div>
        <div><span>Errors</span><strong>{summary.error_count || 0}</strong></div>
        <div><span>Warnings</span><strong>{summary.warning_count || 0}</strong></div>
        <div><span>Status</span><StatusBadge value={selected.status} /></div>
      </div>
      {(summary.errors || []).slice(0, 5).map((item, index) => <div className="cms-alert error" key={`e${index}`}>Row {item.row || "—"}: {item.message}</div>)}
      {(summary.warnings || []).slice(0, 5).map((item, index) => <div className="cms-alert warning" key={`w${index}`}>Row {item.row || "—"}: {item.message}</div>)}
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

function monthName(month) {
  return new Date(2000, Number(month || 1) - 1, 1).toLocaleString(undefined, { month: "short" });
}
