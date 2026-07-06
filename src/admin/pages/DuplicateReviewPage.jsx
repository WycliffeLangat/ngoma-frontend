import { useCallback, useEffect, useRef, useState } from "react";
import { cmsApi, getResults, qs } from "../api";
import {
  getAffectedChartScopes,
  rerankAffectedChartScopes,
} from "../chartRankMaintenance";

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
  const releaseCount = r.release_count ?? r.total_releases ?? 0;
  return { ...r, release_count: releaseCount, _type: "artist", _label: r.name, _sub: `${releaseCount} release(s)`, _count: releaseCount };
}
function normaliseRelease(r, chartType) {
  const entryCount = r.entry_count ?? 0;
  return { ...r, entry_count: entryCount, _type: "release", _chartType: chartType, _label: r.title, _sub: `${r.artist_display || r.artist_name || "Unknown artist"} · ${r.chart_type || chartType} · ${entryCount} entries`, _count: entryCount };
}

function foldText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/æ/gi, "ae")
    .replace(/œ/gi, "oe")
    .replace(/ø/gi, "o")
    .replace(/ß/gi, "ss")
    .replace(/[đð]/gi, "d")
    .replace(/ł/gi, "l")
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function foldTokenOrder(value) {
  const normalized = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .toLowerCase()
    .match(/[a-z0-9]+/g) || [];
  return normalized.sort().join("");
}

function foldReleaseTitle(value) {
  return foldText(
    String(value || "")
      .replace(/\s*[\[(]\s*(?:feat|ft|featuring|remix|remaster(?:ed)?|live|acoustic|radio\s*edit|version)[^\])]*[\])]/gi, "")
      .replace(/\s+(?:feat|ft|featuring)\b.*$/i, "")
  );
}

function editDistance(left, right) {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= right.length; j += 1) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1)
      );
    }
    previous = current;
  }
  return previous[right.length];
}

function isConservativeNearMatch(left, right) {
  if (!left || !right || left === right || left[0] !== right[0]) return false;
  const minLength = Math.min(left.length, right.length);
  if (minLength < 5 || Math.abs(left.length - right.length) > 2) return false;
  // A single-character edit is the only distance conservative enough to trust as
  // "same title, minor typo/transcription difference" rather than two genuinely
  // different titles that happen to share a template, e.g. "Make Them Cry" vs
  // "Make Them Pay" (edit distance 2) or "Somebody Loves Me" vs "...Loves U".
  return editDistance(left, right) <= 1;
}

const SERIES_MARKER_WORDS = new Set([
  "i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x",
  "xi", "xii", "xiii", "xiv", "xv", "xvi", "xvii", "xviii", "xix", "xx",
]);

// A release title differing only by a sequel/series number ("Vol. 1" vs
// "Vol. 2", "Culture II" vs "Culture III", "...2025" vs "...2026") is a
// different release, not a duplicate, even at edit distance 1.
function seriesMarkerSignature(value) {
  const words = String(value || "").toLowerCase().match(/[a-z0-9]+/g) || [];
  return words.filter((word) => /^\d+$/.test(word) || SERIES_MARKER_WORDS.has(word)).join(",");
}

async function fetchAll(endpoint, params = {}) {
  const rows = [];
  const pageSize = 500;
  for (let page = 1; page <= 250; page += 1) {
    const data = await cmsApi.get(`${endpoint}${qs({ ...params, page, page_size: pageSize })}`);
    const batch = getResults(data);
    rows.push(...batch);
    const total = Number(data?.count || 0);
    if (
      Array.isArray(data) ||
      batch.length === 0 ||
      (total > 0 && rows.length >= total) ||
      (!total && batch.length < pageSize)
    ) break;
  }
  return rows;
}

function expandedCandidateGroups(rows, kind) {
  const records = rows.filter((row) => row?.id && row.status !== "archived");
  const parent = new Map(records.map((row) => [row.id, row.id]));
  const find = (id) => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root);
    while (parent.get(id) !== id) {
      const next = parent.get(id);
      parent.set(id, root);
      id = next;
    }
    return root;
  };
  const union = (left, right) => {
    const a = find(left);
    const b = find(right);
    if (a !== b) parent.set(b, a);
  };

  const canonicalFor = (row) => kind === "artist" ? foldText(row.name) : foldReleaseTitle(row.title);
  const exactBuckets = new Map();
  records.forEach((row) => {
    const variants = kind === "artist"
      ? [row.name, row.display_name, ...(Array.isArray(row.aliases) ? row.aliases : [])]
          .flatMap((value) => [foldText(value), foldTokenOrder(value)])
      : [foldReleaseTitle(row.title)];
    [...new Set(variants.filter(Boolean))].forEach((key) => {
      const existing = exactBuckets.get(key);
      if (existing) union(row.id, existing);
      else exactBuckets.set(key, row.id);
    });
  });

  // Conservative fuzzy pass catches small spelling/transcription differences.
  // Bucketing by first character keeps the scan responsive for thousands of rows.
  const fuzzyBuckets = new Map();
  records.forEach((row) => {
    const canonical = canonicalFor(row);
    if (!canonical) return;
    const bucketKey = canonical[0];
    if (!fuzzyBuckets.has(bucketKey)) fuzzyBuckets.set(bucketKey, []);
    fuzzyBuckets.get(bucketKey).push({ row, canonical });
  });
  fuzzyBuckets.forEach((bucket) => {
    for (let left = 0; left < bucket.length; left += 1) {
      for (let right = left + 1; right < bucket.length; right += 1) {
        const rowLeft = bucket[left].row;
        const rowRight = bucket[right].row;
        if (
          kind === "release" &&
          seriesMarkerSignature(rowLeft.title) !== seriesMarkerSignature(rowRight.title)
        ) continue;
        if (isConservativeNearMatch(bucket[left].canonical, bucket[right].canonical)) {
          union(rowLeft.id, rowRight.id);
        }
      }
    }
  });

  const groups = new Map();
  records.forEach((row) => {
    const root = find(row.id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(row);
  });
  return [...groups.values()].filter((group) => group.length > 1);
}

function consolidateGroups(groups) {
  const parent = new Map();
  const records = new Map();
  const recordKey = (row) => `${row._type}:${row.id}`;
  const find = (key) => {
    if (!parent.has(key)) parent.set(key, key);
    let root = key;
    while (parent.get(root) !== root) root = parent.get(root);
    while (parent.get(key) !== key) {
      const next = parent.get(key);
      parent.set(key, root);
      key = next;
    }
    return root;
  };
  const union = (left, right) => {
    const a = find(left);
    const b = find(right);
    if (a !== b) parent.set(b, a);
  };

  groups.forEach((group) => {
    const keys = group.map(recordKey);
    group.forEach((row) => {
      const key = recordKey(row);
      records.set(key, { ...(records.get(key) || {}), ...row });
      find(key);
    });
    keys.slice(1).forEach((key) => union(keys[0], key));
  });

  const combined = new Map();
  records.forEach((row, key) => {
    const root = find(key);
    if (!combined.has(root)) combined.set(root, []);
    combined.get(root).push(row);
  });
  return [...combined.values()]
    .filter((group) => group.length > 1)
    .map((group) => group.sort((left, right) =>
      Number(right._count || 0) - Number(left._count || 0) ||
      Number(Boolean(right.cover_image)) - Number(Boolean(left.cover_image)) ||
      Number(left.id) - Number(right.id)
    ))
    .sort((left, right) =>
      right.length - left.length ||
      String(left[0]?._label || "").localeCompare(String(right[0]?._label || ""))
    );
}

export default function DuplicateReviewPage() {
  const scanStartedRef = useRef(false);
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
      const [singles, albums, artists, allSingles, allAlbums, allArtists] = await Promise.all([
        cmsApi.get(`/releases/duplicates/${qs({ chart_type: "singles" })}`),
        cmsApi.get(`/releases/duplicates/${qs({ chart_type: "albums" })}`),
        cmsApi.get(`/artists/duplicates/`),
        fetchAll("/releases/", { chart_type: "singles" }),
        fetchAll("/releases/", { chart_type: "albums" }),
        fetchAll("/artists/"),
      ]);
      const serverGroups = [
        ...(singles.groups || []).map(g => g.map(r => normaliseRelease(r, "singles"))),
        ...(albums.groups  || []).map(g => g.map(r => normaliseRelease(r, "albums"))),
        ...(artists.groups || []).map(g => g.map(r => normaliseArtist(r))),
      ];
      const expandedGroups = [
        ...expandedCandidateGroups(allSingles, "release").map(g => g.map(r => normaliseRelease(r, "singles"))),
        ...expandedCandidateGroups(allAlbums, "release").map(g => g.map(r => normaliseRelease(r, "albums"))),
        ...expandedCandidateGroups(allArtists, "artist").map(g => g.map(r => normaliseArtist(r))),
      ];
      setGroups(consolidateGroups([...serverGroups, ...expandedGroups]));
    } catch(e) { setError(e.message); setGroups([]); }
  }, []);

  useEffect(() => {
    if (scanStartedRef.current) return;
    scanStartedRef.current = true;
    load();
  }, [load]);

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
      const isRelease = keeper._type === "release";
      const duplicates = group.filter(r => r.id !== keeper.id);
      // Capture affected scopes BEFORE merging while entries still exist.
      const affectedScopes = isRelease
        ? await getAffectedChartScopes(duplicates.map((dup) => dup.id))
        : [];
      if (keeper._type === "artist") {
        await cmsApi.post(`/artists/${keeper.id}/merge/`, {
          artist_ids: duplicates.map((dup) => dup.id),
        });
      } else {
        for (const dup of duplicates) {
          await callMergeApi(dup, keeper);
        }
      }
      const rankResult = await rerankAffectedChartScopes(affectedScopes);
      if (rankResult.failedScopes.length) {
        setError("Merge completed, but some locked chart ranks could not be refreshed.");
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
        <div>
          <h2>Duplicate Review</h2>
          <p style={{ margin: "4px 0 0", color: "#777", fontSize: 13 }}>
            Reviews exact and near matches across case, spacing, punctuation, accents, aliases, and small spelling differences.
          </p>
        </div>
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
