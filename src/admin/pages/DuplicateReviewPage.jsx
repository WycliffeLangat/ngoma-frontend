import { useCallback, useEffect, useRef, useState } from "react";
import { cmsApi, qs } from "../api";

const IGNORED_KEY = "cms_dup_ignored_groups";

function loadIgnored() {
  try { return new Set(JSON.parse(localStorage.getItem(IGNORED_KEY) || "[]")); }
  catch { return new Set(); }
}
function saveIgnored(set) {
  localStorage.setItem(IGNORED_KEY, JSON.stringify([...set]));
}
function groupKey(group) {
  return group.map(r => r.id).sort((a, b) => a - b).join(",");
}

export default function DuplicateReviewPage() {
  const [groups, setGroups] = useState(null);          // null = loading
  const [ignored, setIgnored] = useState(loadIgnored);
  const [busy, setBusy] = useState(null);              // group key being processed
  const [done, setDone] = useState(new Set());         // group keys merged this session
  const [error, setError] = useState("");
  const [chartFilter, setChartFilter] = useState("all");
  const [mergeModal, setMergeModal] = useState(null);  // { group, pickedKeeper }
  const mergePickerRef = useRef(null);

  const load = useCallback(async () => {
    setGroups(null);
    setError("");
    try {
      const singles = await cmsApi.get(`/releases/duplicates/${qs({ chart_type: "singles" })}`);
      const albums  = await cmsApi.get(`/releases/duplicates/${qs({ chart_type: "albums" })}`);
      setGroups([...(singles.groups || []), ...(albums.groups || [])]);
    } catch(e) { setError(e.message); setGroups([]); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = (groups || []).filter(g => {
    const key = groupKey(g);
    if (done.has(key) || ignored.has(key)) return false;
    if (chartFilter !== "all" && g[0]?.chart_type !== chartFilter) return false;
    return true;
  });

  function dismiss(group) {
    const key = groupKey(group);
    const next = new Set(ignored);
    next.add(key);
    setIgnored(next);
    saveIgnored(next);
  }

  async function mergeGroup(group, keeper) {
    const key = groupKey(group);
    setBusy(key);
    setError("");
    try {
      const dups = group.filter(r => r.id !== keeper.id);
      for (const dup of dups) {
        await cmsApi.post(`/releases/${dup.id}/merge/`, { into_id: keeper.id });
      }
      setDone(prev => new Set([...prev, key]));
    } catch(e) { setError(e.message); }
    finally { setBusy(null); setMergeModal(null); }
  }

  const ignoredCount = [...(groups || [])].filter(g => ignored.has(groupKey(g))).length;
  const doneCount = done.size;
  const remaining = visible.length;

  return (
    <section className="cms-resource">
      <div className="cms-resource-head">
        <h2>Duplicate Release Review</h2>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: "#666" }}>
            {groups === null ? "Loading…" : `${remaining} remaining · ${doneCount} merged · ${ignoredCount} skipped`}
          </span>
          <select
            className="cms-select"
            value={chartFilter}
            onChange={e => setChartFilter(e.target.value)}
            style={{ fontSize: 13, padding: "4px 10px" }}
          >
            <option value="all">All types</option>
            <option value="singles">Singles only</option>
            <option value="albums">Albums only</option>
          </select>
          {ignoredCount > 0 && (
            <button className="cms-btn light" style={{ fontSize: 12 }} onClick={() => {
              setIgnored(new Set());
              saveIgnored(new Set());
            }}>Reset skipped ({ignoredCount})</button>
          )}
          <button className="cms-btn light" style={{ fontSize: 12 }} onClick={load}>Refresh</button>
        </div>
      </div>

      {error && <div className="cms-error" style={{ margin: "10px 0" }}>{error}</div>}

      {groups === null && <div className="cms-empty">Scanning for duplicates…</div>}

      {groups !== null && remaining === 0 && !error && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#5a9a2f" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
          <strong style={{ fontSize: 18 }}>All duplicates reviewed!</strong>
          <p style={{ color: "#888", fontSize: 14, marginTop: 6 }}>
            {doneCount > 0 ? `${doneCount} group(s) merged this session. ` : ""}
            {ignoredCount > 0 ? `${ignoredCount} group(s) skipped.` : ""}
          </p>
          <button className="cms-btn" style={{ marginTop: 14 }} onClick={load}>Scan again</button>
        </div>
      )}

      {visible.map(group => {
        const key = groupKey(group);
        const isBusy = busy === key;
        const best = group[0]; // sorted by cover image, then entry count

        return (
          <div key={key} style={{
            border: "1px solid #e5e5e5",
            borderRadius: 8,
            marginBottom: 18,
            background: "#fff",
            overflow: "hidden",
          }}>
            {/* Group header */}
            <div style={{
              background: "#f8f8f8",
              borderBottom: "1px solid #e5e5e5",
              padding: "10px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
            }}>
              <div>
                <strong style={{ fontSize: 14 }}>{best.title}</strong>
                <span style={{ fontSize: 12, color: "#888", marginLeft: 8 }}>
                  {best.artist_display} · {best.chart_type} · {group.length} records
                </span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="cms-btn light"
                  style={{ fontSize: 12 }}
                  disabled={isBusy}
                  onClick={() => dismiss(group)}
                >Keep separate</button>
                <button
                  className="cms-btn"
                  style={{ fontSize: 12 }}
                  disabled={isBusy}
                  onClick={() => setMergeModal({ group, pickedKeeper: best })}
                >{isBusy ? "Merging…" : "Merge →"}</button>
              </div>
            </div>

            {/* Releases in this group */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#fafafa", color: "#999", textAlign: "left" }}>
                    <th style={{ padding: "6px 14px", fontWeight: 500 }}></th>
                    <th style={{ padding: "6px 14px", fontWeight: 500 }}>ID</th>
                    <th style={{ padding: "6px 14px", fontWeight: 500 }}>Title</th>
                    <th style={{ padding: "6px 14px", fontWeight: 500 }}>Artist</th>
                    <th style={{ padding: "6px 14px", fontWeight: 500 }}>Chart entries</th>
                    <th style={{ padding: "6px 14px", fontWeight: 500 }}>Cover art</th>
                    <th style={{ padding: "6px 14px", fontWeight: 500 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {group.map((r, ri) => (
                    <tr key={r.id} style={{
                      borderTop: "1px solid #f0f0f0",
                      background: ri === 0 ? "#f9fef4" : "#fff",
                    }}>
                      <td style={{ padding: "7px 14px", color: "#5a9a2f", fontWeight: 600, fontSize: 11 }}>
                        {ri === 0 ? "◀ keep" : ""}
                      </td>
                      <td style={{ padding: "7px 14px", color: "#aaa" }}>{r.id}</td>
                      <td style={{ padding: "7px 14px" }}>{r.title}</td>
                      <td style={{ padding: "7px 14px" }}>{r.artist_display}</td>
                      <td style={{ padding: "7px 14px" }}>{r.entry_count}</td>
                      <td style={{ padding: "7px 14px" }}>{r.cover_image ? "✓" : "—"}</td>
                      <td style={{ padding: "7px 14px", color: r.status === "active" ? "#5a9a2f" : "#999" }}>
                        {r.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: "6px 14px 8px", fontSize: 11, color: "#aaa" }}>
              Suggested keeper: id {best.id} — has {best.entry_count} chart entries
              {best.cover_image ? " + cover art" : ""}. You can change this in the merge dialog.
            </div>
          </div>
        );
      })}

      {/* Merge confirm modal */}
      {mergeModal && (
        <div className="cms-modal-backdrop" onClick={() => !busy && setMergeModal(null)}>
          <div className="cms-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="cms-modal-head">
              <h3>Confirm merge</h3>
              <button type="button" onClick={() => setMergeModal(null)} disabled={!!busy}>×</button>
            </div>

            <p style={{ fontSize: 13, margin: "10px 0 4px" }}>
              <strong>Keep this record:</strong>
            </p>
            <div style={{ background: "#f5fce8", border: "1px solid #b6dca0", borderRadius: 6, padding: "8px 14px", marginBottom: 12 }}>
              <span style={{ fontSize: 13 }}>
                "{mergeModal.pickedKeeper.title}" (id {mergeModal.pickedKeeper.id})
                — {mergeModal.pickedKeeper.artist_display}
                · {mergeModal.pickedKeeper.entry_count} entries
                {mergeModal.pickedKeeper.cover_image ? " · has cover" : ""}
              </span>
            </div>

            <p style={{ fontSize: 13, margin: "0 0 6px" }}>
              <strong>Delete these ({mergeModal.group.length - 1}):</strong>
            </p>
            <div style={{ fontSize: 13, marginBottom: 16 }}>
              {mergeModal.group.filter(r => r.id !== mergeModal.pickedKeeper.id).map(r => (
                <div key={r.id} style={{ color: "#c0392b", padding: "2px 0" }}>
                  id {r.id} — "{r.title}" · {r.entry_count} entries
                  {r.cover_image ? " · has cover" : ""}
                </div>
              ))}
            </div>

            {/* Keeper picker */}
            <details style={{ marginBottom: 14, fontSize: 12 }}>
              <summary style={{ cursor: "pointer", color: "#666", marginBottom: 6 }}>
                Change which record to keep
              </summary>
              <div style={{ border: "1px solid #e5e5e5", borderRadius: 6, overflow: "hidden" }}>
                {mergeModal.group.map((r, ri) => (
                  <button
                    key={r.id}
                    type="button"
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: "8px 12px", fontSize: 12, border: "none",
                      borderBottom: ri < mergeModal.group.length - 1 ? "1px solid #f0f0f0" : "none",
                      background: r.id === mergeModal.pickedKeeper.id ? "#f5fce8" : "transparent",
                      cursor: "pointer",
                    }}
                    onClick={() => setMergeModal(m => ({ ...m, pickedKeeper: r }))}
                  >
                    {r.id === mergeModal.pickedKeeper.id ? "◀ " : "  "}
                    id {r.id} — {r.title} · {r.entry_count} entries
                    {r.cover_image ? " · ✓ cover" : ""}
                  </button>
                ))}
              </div>
            </details>

            <p style={{ fontSize: 12, color: "#888", margin: "0 0 16px" }}>
              All chart entries from the deleted records will move to the keeper.
              Conflicting entries are dropped (not summed). Certifications are recalculated.
            </p>
            <div className="cms-actions right">
              <button className="cms-btn light" onClick={() => setMergeModal(null)} disabled={!!busy}>Cancel</button>
              <button
                className="cms-btn"
                onClick={() => mergeGroup(mergeModal.group, mergeModal.pickedKeeper)}
                disabled={!!busy}
              >
                {busy === groupKey(mergeModal.group) ? "Merging…" : "Confirm merge"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
