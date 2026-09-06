import { useCallback, useEffect, useState } from "react";
import { cmsApi, getResults, qs } from "../api";
import {
  forgetMergeRules,
  forgetMergeRulesForHistory,
  loadMergeRules,
} from "../mergeRules";

const PAGE_SIZE = 50;

function formatDate(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function typeLabel(value) {
  if (value === "artist") return "Artist";
  if (value === "release") return "Release";
  return value || "Merge";
}

function statusClass(value) {
  if (value === "undone") return "published";
  if (value === "blocked") return "error";
  return "pending-review";
}

function ruleLabel(rule) {
  return `${rule.duplicateLabel || "Duplicate"} -> ${rule.keeperLabel || "Keeper"}`;
}

export default function MergeHistoryPage() {
  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  const [undoTarget, setUndoTarget] = useState(null);
  const [localRules, setLocalRules] = useState(() => loadMergeRules());

  const refreshLocalRules = useCallback(() => setLocalRules(loadMergeRules()), []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await cmsApi.get(`/merge-history/${qs({
        page,
        page_size: PAGE_SIZE,
        ordering: "-created_at",
        status: statusFilter,
        merge_type: typeFilter,
      })}`);
      setRows(getResults(data));
      setTotalCount(Number(data?.count ?? getResults(data).length));
    } catch (loadError) {
      setError(loadError.message || "Could not load merge history.");
      setRows([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, typeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, typeFilter]);

  async function undoMerge(history) {
    if (!history || busy) return;
    setBusy(`undo-${history.id}`);
    setError("");
    setFlash("");
    try {
      await cmsApi.post(`/merge-history/${history.id}/undo/`, {});
      forgetMergeRulesForHistory(history);
      refreshLocalRules();
      setFlash(`Undid merge: ${history.duplicate_label} is separate from ${history.keeper_label}.`);
      setUndoTarget(null);
      await load();
    } catch (undoError) {
      setError(undoError.message || "Could not undo this merge.");
      await load();
    } finally {
      setBusy("");
    }
  }

  function forgetRule(ruleId) {
    forgetMergeRules([ruleId]);
    refreshLocalRules();
  }

  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <section className="cms-resource">
      <div className="cms-resource-head">
        <div>
          <h2>Merge History</h2>
          <p style={{ margin: "4px 0 0", color: "#000000", fontSize: 13 }}>
            Review completed artist and release merges, then undo the ones still marked undoable.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <select
            className="cms-select"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            style={{ fontSize: 13, padding: "4px 10px" }}
          >
            <option value="">All types</option>
            <option value="release">Releases</option>
            <option value="artist">Artists</option>
          </select>
          <select
            className="cms-select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            style={{ fontSize: 13, padding: "4px 10px" }}
          >
            <option value="">All statuses</option>
            <option value="undoable">Undoable</option>
            <option value="undone">Undone</option>
            <option value="blocked">Blocked</option>
          </select>
          <button className="cms-btn light" style={{ fontSize: 12 }} onClick={load} disabled={loading || !!busy}>
            Refresh
          </button>
        </div>
      </div>

      {flash && <div className="cms-alert" style={{ background: "#f0fdf4", color: "#15803d", borderColor: "#bbf7d0" }}>{flash}</div>}
      {error && <div className="cms-alert error">{error}</div>}

      <div className="cms-card" style={{ marginBottom: 16, borderRadius: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15 }}>Saved auto-merge rules</h3>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#000000" }}>
              {localRules.length} rule{localRules.length === 1 ? "" : "s"} stored in this browser.
            </p>
          </div>
          {localRules.length > 0 && (
            <button
              type="button"
              className="cms-btn light"
              style={{ fontSize: 12 }}
              onClick={() => {
                forgetMergeRules(localRules.map((rule) => rule.id));
                refreshLocalRules();
              }}
            >
              Forget all
            </button>
          )}
        </div>
        {localRules.length > 0 && (
          <div className="cms-bulk-record-list" style={{ marginTop: 12, maxHeight: 220 }}>
            {localRules.slice(0, 20).map((rule) => (
              <div key={rule.id}>
                <strong>{ruleLabel(rule)}</strong>
                <span>
                  {typeLabel(rule.kind)} {rule.chartType ? `/ ${rule.chartType}` : ""} · used {rule.useCount || 0}x
                  <button
                    type="button"
                    className="cms-btn light"
                    style={{ marginLeft: 8, fontSize: 10, padding: "3px 8px" }}
                    onClick={() => forgetRule(rule.id)}
                  >
                    Forget
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="cms-empty">Loading merge history...</div>
      ) : rows.length === 0 ? (
        <div className="cms-empty">No merge history found.</div>
      ) : (
        <div className="cms-table-wrap">
          <table className="cms-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Type</th>
                <th>Duplicate</th>
                <th>Keeper</th>
                <th>Status</th>
                <th>Editor</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td data-label="When">{formatDate(row.created_at)}</td>
                  <td data-label="Type">{typeLabel(row.merge_type)}</td>
                  <td data-label="Duplicate">
                    <strong>{row.duplicate_label}</strong>
                    <div style={{ fontSize: 11, color: "#000000" }}>id {row.duplicate_id}</div>
                  </td>
                  <td data-label="Keeper">
                    <strong>{row.keeper_label}</strong>
                    <div style={{ fontSize: 11, color: "#000000" }}>id {row.keeper_id}</div>
                  </td>
                  <td data-label="Status">
                    <span className={`cms-status cms-status-${statusClass(row.status)}`}>{row.status}</span>
                    {row.error && <div style={{ marginTop: 4, fontSize: 11, color: "#9A1F1F" }}>{row.error}</div>}
                  </td>
                  <td data-label="Editor">{row.merged_by_name || "System"}</td>
                  <td data-label="">
                    {row.can_undo ? (
                      <button
                        type="button"
                        className="cms-btn"
                        style={{ fontSize: 11, padding: "4px 10px" }}
                        disabled={!!busy}
                        onClick={() => setUndoTarget(row)}
                      >
                        Undo merge
                      </button>
                    ) : row.undone_at ? (
                      <span style={{ fontSize: 11, color: "#000000" }}>{formatDate(row.undone_at)}</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalCount > PAGE_SIZE && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 2px", marginTop: 4, borderTop: "1px solid #f0f0f0" }}>
          <span style={{ fontSize: 12, color: "#000000" }}>
            Page {page} / {pageCount}
          </span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button className="cms-btn light" style={{ fontSize: 12, padding: "3px 10px" }} disabled={page === 1 || loading} onClick={() => setPage((value) => value - 1)}>Prev</button>
            <button className="cms-btn light" style={{ fontSize: 12, padding: "3px 10px" }} disabled={page >= pageCount || loading} onClick={() => setPage((value) => value + 1)}>Next</button>
          </div>
        </div>
      )}

      {undoTarget && (
        <div className="cms-modal-backdrop" onClick={() => !busy && setUndoTarget(null)}>
          <div className="cms-modal" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="cms-modal-head">
              <h3>Undo merge</h3>
              <button type="button" onClick={() => setUndoTarget(null)} disabled={!!busy}>x</button>
            </div>
            <div className="cms-bulk-record-list">
              <div>
                <strong>Restore</strong>
                <span>{undoTarget.duplicate_label} · id {undoTarget.duplicate_id}</span>
              </div>
              <div>
                <strong>Separate from</strong>
                <span>{undoTarget.keeper_label} · id {undoTarget.keeper_id}</span>
              </div>
            </div>
            <p style={{ fontSize: 13, color: "#000000", margin: "12px 0 4px", lineHeight: 1.5 }}>
              The CMS will recreate the deleted {undoTarget.merge_type}, move stored chart rows back from the snapshot, refresh rankings, and mark this history row as undone.
            </p>
            <div className="cms-actions right">
              <button className="cms-btn light" onClick={() => setUndoTarget(null)} disabled={!!busy}>Cancel</button>
              <button className="cms-btn" onClick={() => undoMerge(undoTarget)} disabled={!!busy}>
                {busy === `undo-${undoTarget.id}` ? "Undoing..." : "Undo merge"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
