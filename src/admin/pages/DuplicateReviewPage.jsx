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

  async function getAffectedChartIds(releaseId) {
    try {
      const data = await cmsApi.get(`/chart-entries/?release=${releaseId}&page_size=500`);
      return [...new Set((data?.results || data || []).map(e => e.chart).filter(Boolean))];
    } catch { return []; }
  }

  async function reRankAffectedCharts(chartIds) {
    if (!chartIds.length) return;
    let platformKeys = ["combined"];
    try {
      const pd = await cmsApi.get("/platforms/?active=true&page_size=100");
      platformKeys = ["combined", ...(pd?.results || pd || []).map(p => p.id)];
    } catch {}
    for (const chartId of chartIds) {
      for (const platform of platformKeys) {
        try {
          const d = await cmsApi.get(
            `/chart-entries/?chart=${chartId}&platform=${platform}&ordering=-total_points&page_size=200`
          );
          const entries = d?.results || d || [];
          for (let i = 0; i < entries.length; i++) {
            if (entries[i].rank !== i + 1) {
              await cmsApi.patch(`/chart-entries/${entries[i].id}/`, { rank: i + 1 });
            }
          }
        } catch {}
      }
    }
  }

  async function mergeGroup(group, keeper) {
    const key = groupKey(group);
    setBusy(key);
    setError("");
    try {
      const isRelease = keeper._type === "release";
      // Capture affected chart IDs BEFORE merging while entries still exist
      let affectedChartIds = [];
      if (isRelease) {
        const dupIds = group.filter(r => r.id !== keeper.id).map(r => r.id);
        const results = await Promise.all(dupIds.map(id => getAffectedChartIds(id)));
        affectedChartIds = [...new Set(results.flat())];
      }
      for (const dup of group.filter(r => r.id !== keeper.id)) {
        await callMergeApi(dup, keeper);
      }
      if (affectedChartIds.length) {
        await reRankAffectedCharts(affectedChartIds);
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
      {mergeModal && (() => {
        const { group, pickedKeeper } = mergeModal;
        const isArtist = pickedKeeper._type === "artist";
        const dups = group.filter(r => r.id !== pickedKeeper.id);
        const rLabel = r => isArtist ? (r.name || "") : (r.title || "");
        const rSub   = r => isArtist ? [r.country, r.country_code].filter(Boolean).join(" · ") : (r.artist_display || "");
        const rMeta  = r => isArtist
          ? `${r.release_count ?? 0} release(s)`
          : [r.entry_count && `${r.entry_count} entries`, r.cover_image && "has cover"].filter(Boolean).join(" · ");
        return (
          <div className="cms-modal-backdrop" onClick={() => !busy && setMergeModal(null)}>
            <div className="cms-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
              <div className="cms-modal-head">
                <h3>Confirm merge</h3>
                <button type="button" onClick={() => setMergeModal(null)} disabled={!!busy}>×</button>
              </div>

              {dups.length === 1 ? (
                /* ── 2-record group: side-by-side DELETE / KEEP cards ── */
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "14px 0" }}>
                  {/* DELETE card */}
                  <div style={{ border: "1.5px solid #fca5a5", borderRadius: 10, padding: "12px 14px", background: "#fff5f5", display: "flex", flexDirection: "column", gap: 3 }}>
                    <div style={{ fontSize: 9, fontWeight: 800, color: "#dc2626", textTransform: "uppercase", letterSpacing: ".09em", marginBottom: 2 }}>Delete</div>
                    <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.35 }}>{rLabel(dups[0])}</div>
                    {rSub(dups[0]) && <div style={{ fontSize: 11, color: "#666" }}>{rSub(dups[0])}</div>}
                    {rMeta(dups[0]) && <div style={{ fontSize: 10, color: "#aaa" }}>{rMeta(dups[0])}</div>}
                    <div style={{ fontSize: 10, color: "#ccc" }}>id {dups[0].id}</div>
                    <button
                      type="button"
                      className="cms-btn light"
                      style={{ marginTop: 8, fontSize: 11, padding: "5px 10px" }}
                      disabled={!!busy}
                      onClick={() => setMergeModal(m => ({ ...m, pickedKeeper: dups[0] }))}
                    >⇄ Keep this instead</button>
                  </div>
                  {/* KEEP card */}
                  <div style={{ border: "1.5px solid #86efac", borderRadius: 10, padding: "12px 14px", background: "#f0fdf4", display: "flex", flexDirection: "column", gap: 3 }}>
                    <div style={{ fontSize: 9, fontWeight: 800, color: "#16a34a", textTransform: "uppercase", letterSpacing: ".09em", marginBottom: 2 }}>✓ Keep</div>
                    <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.35 }}>{rLabel(pickedKeeper)}</div>
                    {rSub(pickedKeeper) && <div style={{ fontSize: 11, color: "#666" }}>{rSub(pickedKeeper)}</div>}
                    {rMeta(pickedKeeper) && <div style={{ fontSize: 10, color: "#aaa" }}>{rMeta(pickedKeeper)}</div>}
                    <div style={{ fontSize: 10, color: "#ccc" }}>id {pickedKeeper.id}</div>
                  </div>
                </div>
              ) : (
                /* ── 3+ record group: keeper card + deletions list ── */
                <div style={{ margin: "14px 0 10px" }}>
                  <div style={{ border: "1.5px solid #86efac", borderRadius: 10, padding: "12px 14px", background: "#f0fdf4", marginBottom: 8 }}>
                    <div style={{ fontSize: 9, fontWeight: 800, color: "#16a34a", textTransform: "uppercase", letterSpacing: ".09em", marginBottom: 4 }}>✓ Keep</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{rLabel(pickedKeeper)}</div>
                    {rSub(pickedKeeper) && <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{rSub(pickedKeeper)}</div>}
                    {rMeta(pickedKeeper) && <div style={{ fontSize: 10, color: "#aaa", marginTop: 1 }}>{rMeta(pickedKeeper)}</div>}
                    <div style={{ fontSize: 10, color: "#ccc" }}>id {pickedKeeper.id}</div>
                  </div>
                  <div style={{ border: "1.5px solid #fca5a5", borderRadius: 10, padding: "12px 14px", background: "#fff5f5" }}>
                    <div style={{ fontSize: 9, fontWeight: 800, color: "#dc2626", textTransform: "uppercase", letterSpacing: ".09em", marginBottom: 8 }}>Delete ({dups.length})</div>
                    {dups.map((r, ri) => (
                      <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: ri > 0 ? 8 : 0, marginTop: ri > 0 ? 8 : 0, borderTop: ri > 0 ? "1px solid #fecaca" : "none" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{rLabel(r)}</div>
                          {rSub(r) && <div style={{ fontSize: 11, color: "#888" }}>{rSub(r)}</div>}
                          <div style={{ fontSize: 10, color: "#ccc" }}>id {r.id} · {rMeta(r)}</div>
                        </div>
                        <button
                          type="button"
                          className="cms-btn light"
                          style={{ fontSize: 10, padding: "4px 8px", flexShrink: 0 }}
                          disabled={!!busy}
                          onClick={() => setMergeModal(m => ({ ...m, pickedKeeper: r }))}
                        >⇄ Keep this</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p style={{ fontSize: 12, color: "#888", margin: "0 0 14px" }}>
                {isArtist
                  ? "The deleted artist's releases will be reassigned to the kept artist. Aliases are preserved."
                  : "Monthly chart points are summed into the kept record. Weekly entries on the same chart in the same week are dropped. Certifications are recalculated."}
              </p>
              <div className="cms-actions right">
                <button className="cms-btn light" onClick={() => setMergeModal(null)} disabled={!!busy}>Cancel</button>
                <button className="cms-btn" onClick={() => mergeGroup(group, pickedKeeper)} disabled={!!busy}>
                  {busy === groupKey(group) ? "Merging…" : "Confirm merge"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </section>
  );
}
