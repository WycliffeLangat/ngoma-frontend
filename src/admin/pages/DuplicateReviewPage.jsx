import { useCallback, useEffect, useState } from "react";
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
  return group.map(r => `${r._type}:${r.id}`).sort().join(",");
}
// Normalise artist/release rows into a uniform shape for the review UI
function normaliseArtist(r) {
  return { ...r, _type: "artist", _label: r.name, _sub: `${r.release_count ?? 0} release(s)`, _count: r.release_count ?? 0 };
}
function normaliseRelease(r, chartType) {
  return { ...r, _type: "release", _chartType: chartType, _label: r.title, _sub: `${r.artist_display} · ${r.chart_type} · ${r.entry_count} entries`, _count: r.entry_count ?? 0 };
}

export default function DuplicateReviewPage() {
  const [groups, setGroups] = useState(null);
  const [ignored, setIgnored] = useState(loadIgnored);
  const [busy, setBusy] = useState(null);
  const [done, setDone] = useState(new Set());
  const [error, setError] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [mergeModal, setMergeModal] = useState(null);

  const load = useCallback(async () => {
    setGroups(null);
    setError("");
    try {
      const [singles, albums, artists] = await Promise.all([
        cmsApi.get(`/releases/duplicates/${qs({ chart_type: "singles" })}`),
        cmsApi.get(`/releases/duplicates/${qs({ chart_type: "albums" })}`),
        cmsApi.get(`/artists/duplicates/`),
      ]);
      const allGroups = [
        ...(singles.groups || []).map(g => g.map(r => normaliseRelease(r, "singles"))),
        ...(albums.groups  || []).map(g => g.map(r => normaliseRelease(r, "albums"))),
        ...(artists.groups || []).map(g => g.map(r => normaliseArtist(r))),
      ];
      setGroups(allGroups);
    } catch(e) { setError(e.message); setGroups([]); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = (groups || []).filter(g => {
    const key = groupKey(g);
    if (done.has(key) || ignored.has(key)) return false;
    if (typeFilter !== "all") {
      if (typeFilter === "artists" && g[0]?._type !== "artist") return false;
      if (typeFilter === "singles" && g[0]?._chartType !== "singles") return false;
      if (typeFilter === "albums"  && g[0]?._chartType !== "albums")  return false;
    }
    return true;
  });

  function dismiss(group) {
    const key = groupKey(group);
    const next = new Set(ignored); next.add(key);
    setIgnored(next); saveIgnored(next);
  }

  // Artist: POST /artists/{KEEPER}/merge/ { artist_ids: [dup] }
  // Release: POST /releases/{DUP}/merge/ { into_id: keeper }
  async function callMergeApi(dup, keeper) {
    if (dup._type === "artist") {
      await cmsApi.post(`/artists/${keeper.id}/merge/`, { artist_ids: [dup.id] });
    } else {
      await cmsApi.post(`/releases/${dup.id}/merge/`, { into_id: keeper.id });
    }
  }

  async function mergeGroup(group, keeper) {
    const key = groupKey(group);
    setBusy(key);
    setError("");
    try {
      for (const dup of group.filter(r => r.id !== keeper.id)) {
        await callMergeApi(dup, keeper);
      }
      setDone(prev => new Set([...prev, key]));
    } catch(e) { setError(e.message); }
    finally { setBusy(null); setMergeModal(null); }
  }

  const ignoredCount = (groups || []).filter(g => ignored.has(groupKey(g))).length;
  const doneCount = done.size;

  const counts = {
    singles: (groups || []).filter(g => g[0]?._chartType === "singles").length,
    albums:  (groups || []).filter(g => g[0]?._chartType === "albums").length,
    artists: (groups || []).filter(g => g[0]?._type === "artist").length,
  };

  return (
    <section className="cms-resource">
      <div className="cms-resource-head">
        <h2>Duplicate Review</h2>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: "#666" }}>
            {groups === null ? "Scanning…" : `${visible.length} remaining · ${doneCount} merged · ${ignoredCount} skipped`}
          </span>
          <select
            className="cms-select"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            style={{ fontSize: 13, padding: "4px 10px" }}
          >
            <option value="all">All types ({(groups || []).length})</option>
            <option value="singles">Singles ({counts.singles})</option>
            <option value="albums">Albums ({counts.albums})</option>
            <option value="artists">Artists ({counts.artists})</option>
          </select>
          {ignoredCount > 0 && (
            <button className="cms-btn light" style={{ fontSize: 12 }} onClick={() => {
              const next = new Set(); setIgnored(next); saveIgnored(next);
            }}>Reset skipped ({ignoredCount})</button>
          )}
          <button className="cms-btn light" style={{ fontSize: 12 }} onClick={load}>Refresh</button>
        </div>
      </div>

      {error && <div className="cms-error" style={{ margin: "10px 0" }}>{error}</div>}
      {groups === null && <div className="cms-empty">Scanning for duplicates across songs, albums, and artists…</div>}

      {groups !== null && visible.length === 0 && !error && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#5a9a2f" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
          <strong style={{ fontSize: 18 }}>All reviewed!</strong>
          <p style={{ color: "#888", fontSize: 14, marginTop: 6 }}>
            {doneCount > 0 ? `${doneCount} group(s) merged. ` : ""}
            {ignoredCount > 0 ? `${ignoredCount} skipped.` : "No duplicates found."}
          </p>
          <button className="cms-btn" style={{ marginTop: 14 }} onClick={load}>Scan again</button>
        </div>
      )}

      {visible.map(group => {
        const key = groupKey(group);
        const isBusy = busy === key;
        const best = group[0];
        const isArtist = best._type === "artist";

        return (
          <div key={key} style={{ border: "1px solid #e5e5e5", borderRadius: 8, marginBottom: 18, background: "#fff", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ background: "#f8f8f8", borderBottom: "1px solid #e5e5e5", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 600, color: isArtist ? "#7c5cbf" : "#5a7abf", textTransform: "uppercase", letterSpacing: ".06em", marginRight: 8 }}>
                  {isArtist ? "Artist" : best._chartType}
                </span>
                <strong style={{ fontSize: 14 }}>{best._label}</strong>
                <span style={{ fontSize: 12, color: "#888", marginLeft: 8 }}>{best._sub}</span>
                <span style={{ fontSize: 11, color: "#bbb", marginLeft: 8 }}>{group.length} records</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="cms-btn light" style={{ fontSize: 12 }} disabled={isBusy} onClick={() => dismiss(group)}>Keep separate</button>
                <button className="cms-btn" style={{ fontSize: 12 }} disabled={isBusy} onClick={() => setMergeModal({ group, pickedKeeper: best })}>
                  {isBusy ? "Merging…" : "Merge →"}
                </button>
              </div>
            </div>

            {/* Records table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#fafafa", color: "#999", textAlign: "left" }}>
                    <th style={{ padding: "6px 14px", fontWeight: 500, width: 40 }}></th>
                    <th style={{ padding: "6px 14px", fontWeight: 500 }}>ID</th>
                    <th style={{ padding: "6px 14px", fontWeight: 500 }}>{isArtist ? "Name" : "Title"}</th>
                    {!isArtist && <th style={{ padding: "6px 14px", fontWeight: 500 }}>Artist</th>}
                    <th style={{ padding: "6px 14px", fontWeight: 500 }}>{isArtist ? "Releases" : "Entries"}</th>
                    {!isArtist && <th style={{ padding: "6px 14px", fontWeight: 500 }}>Cover</th>}
                    {isArtist && <th style={{ padding: "6px 14px", fontWeight: 500 }}>Country</th>}
                  </tr>
                </thead>
                <tbody>
                  {group.map((r, ri) => (
                    <tr key={r.id} style={{ borderTop: "1px solid #f0f0f0", background: ri === 0 ? "#f9fef4" : "#fff" }}>
                      <td style={{ padding: "7px 14px", color: "#5a9a2f", fontWeight: 600, fontSize: 11 }}>{ri === 0 ? "◀ keep" : ""}</td>
                      <td style={{ padding: "7px 14px", color: "#aaa" }}>{r.id}</td>
                      <td style={{ padding: "7px 14px" }}>{isArtist ? r.name : r.title}</td>
                      {!isArtist && <td style={{ padding: "7px 14px" }}>{r.artist_display}</td>}
                      <td style={{ padding: "7px 14px" }}>{isArtist ? r.release_count : r.entry_count}</td>
                      {!isArtist && <td style={{ padding: "7px 14px" }}>{r.cover_image ? "✓" : "—"}</td>}
                      {isArtist && <td style={{ padding: "7px 14px", color: "#888" }}>{r.country_code || "—"}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: "5px 14px 8px", fontSize: 11, color: "#aaa" }}>
              Suggested keeper: id {best.id}
              {!isArtist && ` — ${best.entry_count} chart entries${best.cover_image ? " + cover art" : ""}`}
              {isArtist && ` — ${best.release_count} release(s)`}
              . You can change this in the merge dialog.
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
            {(() => {
              const { group, pickedKeeper } = mergeModal;
              const isArtist = pickedKeeper._type === "artist";
              const dups = group.filter(r => r.id !== pickedKeeper.id);
              return (
                <>
                  <p style={{ fontSize: 13, margin: "10px 0 4px" }}><strong>Keep:</strong></p>
                  <div style={{ background: "#f5fce8", border: "1px solid #b6dca0", borderRadius: 6, padding: "8px 14px", marginBottom: 12, fontSize: 13 }}>
                    {isArtist ? pickedKeeper.name : pickedKeeper.title} (id {pickedKeeper.id})
                    {isArtist ? ` — ${pickedKeeper.release_count} release(s)` : ` — ${pickedKeeper.artist_display} · ${pickedKeeper.entry_count} entries${pickedKeeper.cover_image ? " · has cover" : ""}`}
                  </div>

                  <p style={{ fontSize: 13, margin: "0 0 6px" }}><strong>Delete ({dups.length}):</strong></p>
                  <div style={{ fontSize: 13, marginBottom: 14 }}>
                    {dups.map(r => (
                      <div key={r.id} style={{ color: "#c0392b", padding: "2px 0" }}>
                        id {r.id} — {isArtist ? r.name : `"${r.title}"`}
                        {isArtist ? ` · ${r.release_count} release(s)` : ` · ${r.entry_count} entries`}
                      </div>
                    ))}
                  </div>

                  <details style={{ marginBottom: 14, fontSize: 12 }}>
                    <summary style={{ cursor: "pointer", color: "#666", marginBottom: 6 }}>Change which record to keep</summary>
                    <div style={{ border: "1px solid #e5e5e5", borderRadius: 6, overflow: "hidden" }}>
                      {group.map((r, ri) => (
                        <button key={r.id} type="button"
                          style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", fontSize: 12, border: "none", borderBottom: ri < group.length - 1 ? "1px solid #f0f0f0" : "none", background: r.id === pickedKeeper.id ? "#f5fce8" : "transparent", cursor: "pointer" }}
                          onClick={() => setMergeModal(m => ({ ...m, pickedKeeper: r }))}
                        >
                          {r.id === pickedKeeper.id ? "◀ " : "  "}
                          id {r.id} — {isArtist ? r.name : r.title}
                          {isArtist ? ` · ${r.release_count} releases` : ` · ${r.entry_count} entries${r.cover_image ? " · ✓ cover" : ""}`}
                        </button>
                      ))}
                    </div>
                  </details>

                  <p style={{ fontSize: 12, color: "#888", margin: "0 0 16px" }}>
                    {isArtist
                      ? "The deleted artist's releases will be reassigned to the kept artist. Aliases are preserved."
                      : "Monthly chart points are summed into the kept record. Weekly entries on the same chart in the same week are dropped (a song can only appear once per weekly chart). Certifications are recalculated."}
                  </p>
                  <div className="cms-actions right">
                    <button className="cms-btn light" onClick={() => setMergeModal(null)} disabled={!!busy}>Cancel</button>
                    <button className="cms-btn" onClick={() => mergeGroup(group, pickedKeeper)} disabled={!!busy}>
                      {busy === groupKey(group) ? "Merging…" : "Confirm merge"}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </section>
  );
}
