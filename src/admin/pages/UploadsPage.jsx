import { useEffect, useState } from "react";
import { CMS_BASE, cmsApi, getResults } from "../api";
import DataTable from "../components/DataTable";
import UploadPreviewTable from "../components/UploadPreviewTable";
import StatusBadge from "../components/StatusBadge";
import ConfirmDialog from "../components/ConfirmDialog";
import ErrorHelpLink from "../components/ErrorHelpLink";

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
  const [workbookModal, setWorkbookModal] = useState(null);
  const [workbookBusy, setWorkbookBusy] = useState("");
  const [jobs, setJobs] = useState([]);
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
    loadJobs();
    const timer = window.setInterval(() => {
      if (jobs.some((job) => ["queued", "running"].includes(job.status))) loadJobs();
    }, 4000);
    return () => window.clearInterval(timer);
  }, [jobs]);

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

  async function loadJobs() {
    try {
      const data = getResults(await cmsApi.get("/chart-jobs/?page_size=8"));
      setJobs(data);
    } catch {
      // Job status is helpful, not required for the upload workflow.
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
      await loadJobs();
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
      await loadJobs();
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
      await loadJobs();
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setActionBusy(false);
    }
  }

  function uploadEndpoint(upload = selected) {
    return upload?._uploadKind === RAW_WEEKLY ? "/weekly-uploads/" : "/chart-uploads/";
  }

  async function openWorkbook(upload = selected) {
    if (!upload || workbookBusy) return;
    setError("");
    setWorkbookBusy(`open-${upload._uploadKind}-${upload.id}`);
    try {
      const data = await cmsApi.get(`${uploadEndpoint(upload)}${upload.id}/workbook/`);
      setWorkbookModal({
        upload,
        filename: data.filename || upload.original_filename || "workbook.xlsx",
        sheets: normaliseWorkbookSheets(data.sheets || []),
        activeSheet: 0,
      });
    } catch (workbookError) {
      setError(workbookError.message);
    } finally {
      setWorkbookBusy("");
    }
  }

  async function saveWorkbook() {
    if (!workbookModal || !canManageData || workbookBusy) return;
    const { upload, filename, sheets } = workbookModal;
    setError("");
    setWorkbookBusy("save");
    try {
      const result = await cmsApi.patch(`${uploadEndpoint(upload)}${upload.id}/workbook/`, {
        filename,
        sheets,
      });
      const nextUpload = { ...(result.upload || upload), _uploadKind: upload._uploadKind };
      setSelected(nextUpload);
      setWorkbookModal((current) => current ? {
        ...current,
        upload: nextUpload,
        filename: result.workbook?.filename || filename,
        sheets: normaliseWorkbookSheets(result.workbook?.sheets || sheets),
      } : null);
      await load(upload._uploadKind);
      await loadJobs();
    } catch (workbookError) {
      setError(workbookError.message);
    } finally {
      setWorkbookBusy("");
    }
  }

  async function downloadWorkbook(upload = selected) {
    if (!upload || workbookBusy) return;
    setError("");
    setWorkbookBusy(`download-${upload._uploadKind}-${upload.id}`);
    try {
      const response = await fetch(`${CMS_BASE}${uploadEndpoint(upload)}${upload.id}/download/`, {
        credentials: "include",
      });
      if (!response.ok) {
        let message = `Download failed (${response.status})`;
        try {
          const data = await response.json();
          message = data.detail || data.error || message;
        } catch {}
        throw new Error(message);
      }
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const match = disposition.match(/filename="?([^"]+)"?/i);
      const filename = match?.[1] || upload.original_filename || "workbook.xlsx";
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(downloadError.message);
    } finally {
      setWorkbookBusy("");
    }
  }

  function renderUploadActions(row) {
    const busy = Boolean(actionBusy || workbookBusy);
    if (!row.workbook_available && !canManageData) return "—";
    return (
      <div className="cms-row-actions">
        <button
          type="button"
          className="cms-btn light small"
          onClick={(event) => {
            event.stopPropagation();
            openWorkbook(row);
          }}
          disabled={busy || !row.workbook_available}
        >
          View
        </button>
        <button
          type="button"
          className="cms-btn light small"
          onClick={(event) => {
            event.stopPropagation();
            downloadWorkbook(row);
          }}
          disabled={busy || !row.workbook_available}
        >
          Download
        </button>
        {canManageData ? (
          <button
            type="button"
            className="cms-btn danger small"
            onClick={(event) => {
              event.stopPropagation();
              setDeleteTarget(row);
            }}
            disabled={busy}
          >
            Delete
          </button>
        ) : null}
      </div>
    );
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

      {jobs.length > 0 && (
        <div className="cms-card cms-job-panel">
          <div className="cms-card-heading">
            <div>
              <span className="cms-eyebrow">Background calculations</span>
              <h2>Calculation jobs</h2>
            </div>
            <button type="button" className="cms-btn light small" onClick={loadJobs}>Refresh</button>
          </div>
          <div className="cms-job-list">
            {jobs.map((job) => (
              <div className="cms-job-row" key={job.id}>
                <div>
                  <strong>{jobLabel(job)}</strong>
                  <span>{job.created_at ? new Date(job.created_at).toLocaleString() : ""}</span>
                </div>
                <StatusBadge value={job.status === "succeeded" ? "published" : job.status === "failed" ? "error" : "pending_review"} />
              </div>
            ))}
          </div>
        </div>
      )}

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

      {error && (
        <div className="cms-alert error" role="alert">
          <ErrorHelpLink message={error}>{error}</ErrorHelpLink>
        </div>
      )}
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
              {loading ? "Uploading workbook..." : isWeekly ? "Queue Week" : "Upload and validate"}
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
              ? <WeeklySummary
                  selected={selected}
                  canManageData={canManageData}
                  workbookBusy={workbookBusy}
                  onViewWorkbook={() => openWorkbook(selected)}
                  onDownloadWorkbook={() => downloadWorkbook(selected)}
                />
              : <FinalSummary
                  selected={selected}
                  onAction={runAction}
                  canManageData={canManageData}
                  canPublish={canPublish}
                  workbookBusy={workbookBusy}
                  onViewWorkbook={() => openWorkbook(selected)}
                  onDownloadWorkbook={() => downloadWorkbook(selected)}
                />
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
            { key: "processed", label: "Status", render: (row) => <StatusBadge value={weeklyStatus(row)} /> },
            { key: "actions", label: "Actions", render: renderUploadActions },
          ] : [
            { key: "created_at", label: "Created", render: (row) => new Date(row.created_at).toLocaleString() },
            { key: "chart_type", label: "Type" },
            { key: "platform_name", label: "Scope", render: (row) => row.platform_name || "Combined" },
            { key: "row_count", label: "Rows" },
            { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> },
            { key: "actions", label: "Actions", render: renderUploadActions },
          ]}
          rows={uploads}
          onRowClick={setSelected}
        />
      </div>

      {workbookModal && (
        <WorkbookModal
          workbook={workbookModal}
          canEdit={canManageData}
          busy={workbookBusy}
          onClose={() => {
            if (!workbookBusy) setWorkbookModal(null);
          }}
          onSave={saveWorkbook}
          onChange={setWorkbookModal}
        />
      )}

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

function WeeklySummary({ selected, canManageData, workbookBusy, onViewWorkbook, onDownloadWorkbook }) {
  const notes = String(selected.processing_notes || "");
  const queued = !selected.processed && /queued|background|processing/i.test(notes);
  const failed = !selected.processed && !queued || notes.startsWith("Error:");
  return (
    <div>
      <div className="cms-upload-summary">
        <div><span>Month</span><strong>{monthName(selected.month)}</strong></div>
        <div><span>Week</span><strong>{selected.week}</strong></div>
        <div><span>Entries</span><strong>{selected.entries_processed || 0}</strong></div>
        <div><span>Duplicates removed</span><strong>{selected.duplicates_dropped || 0}</strong></div>
      </div>
      <div className={`cms-alert ${failed ? "error" : "info"}`}>
        <strong>{failed ? "Processing failed" : queued ? "Calculation queued" : "Week processed successfully"}</strong><br />
        {failed || queued
          ? selected.processing_notes
          : "Platform entries were normalized and the month-to-date chart was rebuilt automatically."}
      </div>
      <div className="cms-actions wrap">
        <button className="cms-btn light" onClick={onViewWorkbook} disabled={!!workbookBusy || !selected.workbook_available}>
          {canManageData ? "View / edit workbook" : "View workbook"}
        </button>
        <button className="cms-btn light" onClick={onDownloadWorkbook} disabled={!!workbookBusy || !selected.workbook_available}>
          Download workbook
        </button>
      </div>
    </div>
  );
}

function FinalSummary({ selected, onAction, canManageData, canPublish, workbookBusy, onViewWorkbook, onDownloadWorkbook }) {
  const summary = selected.validation_summary || {};
  return (
    <div>
      <div className="cms-upload-summary">
        <div><span>Rows</span><strong>{summary.row_count || selected.row_count || 0}</strong></div>
        <div><span>Errors</span><strong>{summary.error_count || 0}</strong></div>
        <div><span>Warnings</span><strong>{summary.warning_count || 0}</strong></div>
        <div><span>Status</span><StatusBadge value={selected.status} /></div>
      </div>
      {(summary.errors || []).slice(0, 5).map((item, index) => (
        <div className="cms-alert error" key={`e${index}`}>
          <ErrorHelpLink message={item.message}>Row {item.row || "—"}: {item.message}</ErrorHelpLink>
        </div>
      ))}
      {(summary.warnings || []).slice(0, 5).map((item, index) => (
        <div className="cms-alert warning" key={`w${index}`}>
          <ErrorHelpLink message={item.message}>Row {item.row || "—"}: {item.message}</ErrorHelpLink>
        </div>
      ))}
      {selected.queued && selected.job && (
        <div className="cms-alert info">
          <strong>Calculation queued</strong><br />
          Publishing will finish in the background. Watch Calculation jobs for progress.
        </div>
      )}
      <div className="cms-actions wrap">
        <button className="cms-btn light" onClick={onViewWorkbook} disabled={!!workbookBusy || !selected.workbook_available}>
          {canManageData ? "View / edit workbook" : "View workbook"}
        </button>
        <button className="cms-btn light" onClick={onDownloadWorkbook} disabled={!!workbookBusy || !selected.workbook_available}>
          Download workbook
        </button>
      </div>
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

function normaliseWorkbookSheets(sheets) {
  const source = Array.isArray(sheets) && sheets.length ? sheets : [{ name: "Sheet 1", rows: [[]] }];
  return source.map((sheet, index) => ({
    name: sheet?.name || `Sheet ${index + 1}`,
    rows: Array.isArray(sheet?.rows) && sheet.rows.length
      ? sheet.rows.map((row) => Array.isArray(row) ? row.map((cell) => cell ?? "") : [])
      : [[]],
  }));
}

function workbookWidth(rows) {
  return Math.max(4, ...rows.map((row) => row.length), 1);
}

function WorkbookModal({ workbook, canEdit, busy, onClose, onSave, onChange }) {
  const activeIndex = Math.min(workbook.activeSheet || 0, workbook.sheets.length - 1);
  const activeSheet = workbook.sheets[activeIndex] || workbook.sheets[0];
  const rows = activeSheet?.rows || [[]];
  const width = workbookWidth(rows);
  const saveBusy = busy === "save";

  const updateSheet = (updater) => {
    onChange((current) => {
      if (!current) return current;
      const sheets = current.sheets.map((sheet, index) =>
        index === activeIndex ? updater(sheet) : sheet
      );
      return { ...current, sheets };
    });
  };

  const updateCell = (rowIndex, colIndex, value) => {
    updateSheet((sheet) => {
      const nextRows = sheet.rows.map((row) => [...row]);
      while (nextRows.length <= rowIndex) nextRows.push([]);
      while (nextRows[rowIndex].length <= colIndex) nextRows[rowIndex].push("");
      nextRows[rowIndex][colIndex] = value;
      return { ...sheet, rows: nextRows };
    });
  };

  const addRow = () => updateSheet((sheet) => ({
    ...sheet,
    rows: [...sheet.rows, Array.from({ length: width }, () => "")],
  }));

  const addColumn = () => updateSheet((sheet) => ({
    ...sheet,
    rows: sheet.rows.map((row) => [...row, ""]),
  }));

  return (
    <div className="cms-modal-backdrop" onClick={onClose}>
      <div className="cms-modal cms-workbook-modal" onClick={(event) => event.stopPropagation()}>
        <div className="cms-modal-head">
          <div>
            <h3>{workbook.filename || "Workbook"}</h3>
            <div className="cms-workbook-meta">{workbook.upload?._uploadKind === RAW_WEEKLY ? "Weekly import" : "Final chart import"}</div>
          </div>
          <button type="button" onClick={onClose} disabled={!!busy}>×</button>
        </div>

        <div className="cms-workbook-tabs">
          {workbook.sheets.map((sheet, index) => (
            <button
              type="button"
              key={`${sheet.name}-${index}`}
              className={index === activeIndex ? "active" : ""}
              onClick={() => onChange((current) => ({ ...current, activeSheet: index }))}
            >
              {sheet.name}
            </button>
          ))}
        </div>

        <div className="cms-workbook-toolbar">
          <input
            value={workbook.filename || ""}
            disabled={!canEdit || !!busy}
            onChange={(event) => onChange((current) => ({ ...current, filename: event.target.value }))}
          />
          {canEdit && (
            <>
              <button type="button" className="cms-btn light small" disabled={!!busy} onClick={addRow}>Add row</button>
              <button type="button" className="cms-btn light small" disabled={!!busy} onClick={addColumn}>Add column</button>
            </>
          )}
        </div>

        <div className="cms-workbook-grid-wrap">
          <table className="cms-workbook-grid">
            <thead>
              <tr>
                <th></th>
                {Array.from({ length: width }, (_, colIndex) => (
                  <th key={colIndex}>{excelColumnName(colIndex)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  <th>{rowIndex + 1}</th>
                  {Array.from({ length: width }, (_, colIndex) => (
                    <td key={colIndex}>
                      <input
                        value={row[colIndex] ?? ""}
                        disabled={!canEdit || !!busy}
                        onChange={(event) => updateCell(rowIndex, colIndex, event.target.value)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="cms-actions right">
          <button className="cms-btn light" onClick={onClose} disabled={!!busy}>Close</button>
          {canEdit && (
            <button className="cms-btn" onClick={onSave} disabled={!!busy}>
              {saveBusy ? "Saving..." : "Save workbook"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function excelColumnName(index) {
  let value = index + 1;
  let label = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    value = Math.floor((value - 1) / 26);
  }
  return label;
}

function monthName(month) {
  return new Date(2000, Number(month || 1) - 1, 1).toLocaleString(undefined, { month: "short" });
}

function weeklyStatus(row) {
  if (row.processed) return "published";
  if (String(row.processing_notes || "").startsWith("Error:")) return "error";
  return "pending_review";
}

function jobLabel(job) {
  const labels = {
    process_weekly_upload: "Process weekly upload",
    rebuild_month: "Rebuild monthly chart",
    publish_chart_upload: "Publish chart upload",
    harmonize_chart_history: "Harmonize chart history",
  };
  return labels[job.job_type] || job.job_type || "Chart job";
}
