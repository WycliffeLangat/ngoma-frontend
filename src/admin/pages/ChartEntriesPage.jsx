import { useEffect, useMemo, useRef, useState } from "react";
import { cmsApi, getResults } from "../api";
import FormModal from "../components/FormModal";

const MOVE_COLOR = { NEW: "#1565C0", up: "#1B7F3A", down: "#C62828", same: "#999" };

function movement(entry) {
  if (!entry.prev_rank) return { label: "NEW", color: MOVE_COLOR.NEW };
  const diff = entry.prev_rank - entry.rank;
  if (diff > 0) return { label: `+${diff}`, color: MOVE_COLOR.up };
  if (diff < 0) return { label: String(diff), color: MOVE_COLOR.down };
  return { label: "=", color: MOVE_COLOR.same };
}

const FIELD_DEFS = [
  { key: "rank",             label: "Rank",             type: "number" },
  { key: "total_points",     label: "Total points",     type: "number" },
  { key: "weeks_on_chart",   label: "Weeks on chart",   type: "number" },
  { key: "peak_rank",        label: "Peak rank",        type: "number" },
  { key: "prev_rank",        label: "Prev rank",        type: "number" },
  { key: "featured_artists", label: "Featured artists", type: "text"   },
  { key: "confidence",       label: "Confidence",       type: "text"   },
  { key: "notes",            label: "Notes",            type: "text"   },
];

const MOVEMENT_OPTIONS = ["", "new", "reentry", "up", "down", "same"];

// Fields shown when editing a release from within chart entries (no artist picker — use Songs/Albums for that)
const RELEASE_FIELDS = [
  { name: "cover_image",      label: "Cover image",       type: "file",     help: "Square image, JPEG or PNG, max 2 MB." },
  { name: "title",            label: "Title" },
  { name: "canonical_title",  label: "Canonical title" },
  { name: "featured_artists", label: "Unlinked featured names", help: "Fallback for featured artists without an Artist record." },
  { name: "release_year",     label: "Release year",      type: "number" },
  { name: "release_date",     label: "Release date",      type: "date" },
  { name: "isrc",             label: "ISRC" },
  { name: "upc",              label: "UPC" },
  { name: "number_of_tracks", label: "Number of tracks",  type: "number" },
  { name: "country",          label: "Country" },
  { name: "country_code",     label: "Country code" },
  { name: "genre",            label: "Genre" },
  { name: "label",            label: "Label" },
  { name: "distributor",      label: "Distributor" },
  { name: "spotify_url",      label: "Spotify URL" },
  { name: "apple_music_url",  label: "Apple Music URL" },
  { name: "boomplay_url",     label: "Boomplay URL" },
  { name: "audiomack_url",    label: "Audiomack URL" },
  { name: "youtube_url",      label: "YouTube URL" },
  { name: "tiktok_url",       label: "TikTok URL" },
  { name: "shazam_url",       label: "Shazam URL" },
  { name: "radio_info",       label: "Radio info",        type: "textarea" },
  { name: "status",           label: "Status" },
];

const ARTIST_FIELDS = [
  { name: "image",            label: "Artist image",      type: "file",     help: "Square image, min 800×800 px. JPEG or PNG." },
  { name: "name",             label: "Artist name" },
  { name: "display_name",     label: "Display name" },
  { name: "aliases",          label: "Aliases JSON",      type: "json" },
  { name: "country",          label: "Country" },
  { name: "country_code",     label: "Country code" },
  { name: "city_region",      label: "City/region" },
  { name: "genre",            label: "Genre" },
  { name: "biography",        label: "Biography",         type: "textarea" },
  { name: "artist_type",      label: "Artist type" },
  { name: "verified",         label: "Verified",          type: "checkbox" },
  { name: "spotify_url",      label: "Spotify URL" },
  { name: "apple_music_url",  label: "Apple Music URL" },
  { name: "youtube_url",      label: "YouTube URL" },
  { name: "boomplay_url",     label: "Boomplay URL" },
  { name: "audiomack_url",    label: "Audiomack URL" },
  { name: "tiktok_url",       label: "TikTok URL" },
  { name: "instagram_url",    label: "Instagram URL" },
  { name: "x_url",            label: "X URL" },
  { name: "website_url",      label: "Website URL" },
  { name: "status",           label: "Status" },
];

// Extract the primary artist name before any ft./&/x/ separator
function primaryArtistName(artistDisplay) {
  return String(artistDisplay || "")
    .split(/\s+(?:ft\.?|feat\.?|featuring|x|&|,)\s+/i)[0].trim();
}

const COMBINED = "combined";

export default function ChartEntriesPage() {
  const [allCharts, setAllCharts]     = useState([]);
  const [platforms, setPlatforms]     = useState([]);
  const [chartType, setChartType]     = useState("singles"); // "singles" | "albums" | "artists"
  const [selectedYM, setSelectedYM]   = useState("");
  const [platformId, setPlatformId]   = useState(COMBINED);
  const [entries, setEntries]         = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [selected, setSelected]       = useState(null);
  const [form, setForm]               = useState({});
  const [saving, setSaving]           = useState(false);
  const [imageFile, setImageFile]     = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [recalcBusy, setRecalcBusy]   = useState(false);

  // Artists tab state
  const [artistRankings, setArtistRankings] = useState([]);
  const [selectedArtist, setSelectedArtist] = useState(null);

  // Inline edit modals
  const [editRelease, setEditRelease] = useState(null); // { id, data }
  const [editArtist,  setEditArtist]  = useState(null); // { id, data, name }
  const [editBusy,    setEditBusy]    = useState(false);

  const imgInputRef = useRef();

  // Load ALL chart records and platforms once
  useEffect(() => {
    cmsApi.get("/charts/?ordering=-year,-month&page_size=400")
      .then(d => {
        const results = getResults(d);
        setAllCharts(results);
        if (results.length) {
          const first = results[0];
          setSelectedYM(`${first.year}-${String(first.month).padStart(2, "0")}`);
        }
      })
      .catch(e => setError(e.message));
    cmsApi.get("/platforms/?active=true&page_size=100")
      .then(d => setPlatforms(getResults(d)))
      .catch(() => {});
  }, []);

  const uniqueMonths = useMemo(() => {
    const seen = new Set();
    return allCharts.reduce((acc, c) => {
      const key = `${c.year}-${String(c.month).padStart(2, "0")}`;
      if (!seen.has(key)) {
        seen.add(key);
        acc.push({ key, year: c.year, month: c.month, label: c.label || `${c.year}-${c.month}` });
      }
      return acc;
    }, []);
  }, [allCharts]);

  // Exact chart record for singles/albums tab
  const currentChart = useMemo(() => {
    if (!selectedYM || chartType === "artists") return null;
    return allCharts.find(c => {
      const ym = `${c.year}-${String(c.month).padStart(2, "0")}`;
      return ym === selectedYM && c.chart_type === chartType;
    }) || null;
  }, [allCharts, selectedYM, chartType]);

  const chartId  = currentChart ? String(currentChart.id) : "";
  const isLocked = !!currentChart?.locked;

  // Singles chart ID for the selected month — used to compute artist rankings
  const singlesChartId = useMemo(() => {
    if (!selectedYM) return null;
    const c = allCharts.find(ch => {
      const ym = `${ch.year}-${String(ch.month).padStart(2, "0")}`;
      return ym === selectedYM && ch.chart_type === "singles";
    });
    return c ? String(c.id) : null;
  }, [allCharts, selectedYM]);

  // Reset when chart type or month changes
  useEffect(() => {
    setPlatformId(COMBINED);
    setSelected(null);
    setSelectedArtist(null);
    setEntries([]);
    setArtistRankings([]);
  }, [chartType, selectedYM]);

  // Load entries for singles/albums tabs
  useEffect(() => {
    if (chartType === "artists" || !chartId) { setEntries([]); return; }
    setLoading(true); setError(""); setSelected(null);
    const platformParam = platformId === COMBINED ? "combined" : platformId;
    cmsApi.get(`/chart-entries/?chart=${chartId}&platform=${platformParam}&ordering=rank&page_size=200`)
      .then(d => setEntries(getResults(d)))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [chartType, chartId, platformId]);

  // Compute artist rankings from the combined singles chart for the selected month
  // Formula: 51 − rank per song, summed per primary artist
  useEffect(() => {
    if (chartType !== "artists" || !singlesChartId) { setArtistRankings([]); return; }
    setLoading(true); setError(""); setSelectedArtist(null);
    cmsApi.get(`/chart-entries/?chart=${singlesChartId}&platform=combined&ordering=rank&page_size=200`)
      .then(d => {
        const ents = getResults(d);
        const map = new Map();
        ents.forEach(e => {
          const pts = Math.max(0, 51 - (e.rank || 51));
          if (pts === 0) return;
          const primary = primaryArtistName(e.artist_display || e.artist);
          if (!primary) return;
          const key = primary.toLowerCase();
          if (map.has(key)) {
            const a = map.get(key);
            a.pts += pts;
            a.songs.push({ title: e.title, rank: e.rank, pts, entryId: e.id, releaseId: e.release, cover: e.cover_image });
          } else {
            map.set(key, {
              name: primary,
              pts,
              songs: [{ title: e.title, rank: e.rank, pts, entryId: e.id, releaseId: e.release, cover: e.cover_image }],
            });
          }
        });
        const ranked = [...map.values()]
          .sort((a, b) => b.pts - a.pts)
          .map((a, i) => ({ ...a, rank: i + 1 }));
        setArtistRankings(ranked);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [chartType, singlesChartId]);

  const relevantPlatforms = platforms;

  function pickEntry(entry) {
    setSelected(entry);
    setForm({
      rank:             entry.rank,
      total_points:     entry.total_points,
      weeks_on_chart:   entry.weeks_on_chart,
      peak_rank:        entry.peak_rank,
      prev_rank:        entry.prev_rank ?? "",
      featured_artists: entry.featured_artists || "",
      confidence:       entry.confidence || "",
      notes:            entry.notes || "",
      movement_type:    entry.movement_type || entry.movement || "",
      is_new:           !!entry.is_new,
      reentry:          !!entry.reentry,
    });
    setImageFile(null);
    setImagePreview(null);
  }

  function pickImage(file) {
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function save() {
    if (!selected || saving) return;
    setSaving(true); setError("");
    try {
      const payload = {
        rank:             Number(form.rank),
        total_points:     Number(form.total_points),
        weeks_on_chart:   Number(form.weeks_on_chart),
        peak_rank:        Number(form.peak_rank),
        prev_rank:        form.prev_rank !== "" ? Number(form.prev_rank) : null,
        featured_artists: form.featured_artists,
        confidence:       form.confidence,
        notes:            form.notes || null,
        movement_type:    form.movement_type || null,
        is_new:           form.is_new,
        reentry:          form.reentry,
      };
      const updated = await cmsApi.patch(`/chart-entries/${selected.id}/`, payload);

      if (imageFile && selected.release) {
        const fd = new FormData();
        fd.append("cover_image", imageFile);
        const updatedRelease = await cmsApi.patch(`/releases/${selected.release}/`, fd);
        updated.cover_image = updatedRelease?.cover_image || imagePreview;
      }

      setEntries(prev => prev.map(e => e.id === selected.id ? { ...e, ...updated } : e));
      setSelected(prev => ({ ...prev, ...updated }));
      setImageFile(null);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function reRankCurrentChart() {
    if (!chartId || recalcBusy || isLocked) return;
    setRecalcBusy(true); setError("");
    try {
      const platformParam = platformId === COMBINED ? "combined" : platformId;
      const all = getResults(await cmsApi.get(
        `/chart-entries/?chart=${chartId}&platform=${platformParam}&ordering=-total_points&page_size=200`
      ));
      let changed = 0;
      for (let i = 0; i < all.length; i++) {
        if (all[i].rank !== i + 1) {
          await cmsApi.patch(`/chart-entries/${all[i].id}/`, { rank: i + 1 });
          changed++;
        }
      }
      const updated = getResults(await cmsApi.get(
        `/chart-entries/?chart=${chartId}&platform=${platformParam}&ordering=rank&page_size=200`
      ));
      setEntries(updated);
      if (changed === 0) setError("Ranks are already in order — no changes made.");
    } catch(e) { setError(e.message); }
    finally { setRecalcBusy(false); }
  }

  // ── Inline release edit ────────────────────────────────────────────────────

  async function openReleaseEdit(releaseId) {
    if (!releaseId) return;
    setEditBusy(true); setError("");
    try {
      const data = await cmsApi.get(`/releases/${releaseId}/`);
      setEditRelease({ id: releaseId, data });
    } catch(e) { setError(e.message); }
    finally { setEditBusy(false); }
  }

  async function saveRelease(formData) {
    if (!editRelease) return;
    setEditBusy(true); setError("");
    try {
      const hasFile = formData.cover_image instanceof File;
      let updated;
      if (hasFile) {
        const fd = new FormData();
        Object.entries(formData).forEach(([k, v]) => {
          if (v !== undefined && v !== null) fd.append(k, v instanceof File ? v : String(v));
        });
        updated = await cmsApi.patch(`/releases/${editRelease.id}/`, fd);
      } else {
        const { cover_image, ...rest } = formData;
        updated = await cmsApi.patch(`/releases/${editRelease.id}/`, rest);
      }
      // Refresh entry display data for any entries with this release
      setEntries(prev => prev.map(e =>
        e.release === editRelease.id
          ? { ...e, title: updated.title ?? e.title, cover_image: updated.cover_image ?? e.cover_image, artist_display: updated.artist_display ?? e.artist_display }
          : e
      ));
      if (selected?.release === editRelease.id) {
        setSelected(prev => ({ ...prev, title: updated.title ?? prev.title, cover_image: updated.cover_image ?? prev.cover_image }));
      }
      setEditRelease(null);
    } catch(e) { setError(e.message); }
    finally { setEditBusy(false); }
  }

  // ── Inline artist edit ─────────────────────────────────────────────────────

  async function openArtistEdit(artistName) {
    if (!artistName) return;
    setEditBusy(true); setError("");
    try {
      const results = getResults(await cmsApi.get(
        `/artists/?search=${encodeURIComponent(artistName)}&page_size=5`
      ));
      const match = results.find(a =>
        (a.name || "").toLowerCase() === artistName.toLowerCase() ||
        (a.display_name || "").toLowerCase() === artistName.toLowerCase()
      ) || results[0];
      if (match) {
        setEditArtist({ id: match.id, data: match, name: artistName });
      } else {
        setError(`Artist "${artistName}" not found in the database.`);
      }
    } catch(e) { setError(e.message); }
    finally { setEditBusy(false); }
  }

  async function saveArtist(formData) {
    if (!editArtist) return;
    setEditBusy(true); setError("");
    try {
      const hasFile = formData.image instanceof File;
      if (hasFile) {
        const fd = new FormData();
        Object.entries(formData).forEach(([k, v]) => {
          if (v !== undefined && v !== null) fd.append(k, v instanceof File ? v : String(v));
        });
        await cmsApi.patch(`/artists/${editArtist.id}/`, fd);
      } else {
        const { image, ...rest } = formData;
        await cmsApi.patch(`/artists/${editArtist.id}/`, rest);
      }
      setEditArtist(null);
    } catch(e) { setError(e.message); }
    finally { setEditBusy(false); }
  }

  // ──────────────────────────────────────────────────────────────────────────

  const activePlatform = platformId === COMBINED
    ? { name: "Combined", color: "#B8860B" }
    : platforms.find(p => String(p.id) === String(platformId));

  const panelLabel = (label) => (
    <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "#5e625c", display: "block", marginBottom: 5 }}>
      {label}
    </span>
  );

  const pillBtn = (key, label, color) => {
    const active = String(platformId) === String(key);
    return (
      <button
        key={key}
        type="button"
        onClick={() => setPlatformId(String(key))}
        style={{
          border: active ? `2px solid ${color || "#111"}` : "2px solid #E8E1D2",
          borderRadius: 999,
          padding: "4px 14px",
          fontSize: 12,
          fontWeight: 750,
          cursor: "pointer",
          background: active ? (color || "#111") : "#fff",
          color: active ? "#fff" : "#555",
          whiteSpace: "nowrap",
          transition: "all .12s",
        }}
      >{label}</button>
    );
  };

  const clickLink = (onClick, children) => (
    <span
      onClick={e => { e.stopPropagation(); onClick(); }}
      style={{ cursor: editBusy ? "default" : "pointer", textDecoration: "underline dotted", textUnderlineOffset: 3 }}
      title="Click to edit"
    >{children}</span>
  );

  return (
    <section>
      <div className="cms-page-head">
        <div>
          <h1>Chart Entries</h1>
          <p>Browse and edit chart entries by month and platform. Click any title or artist name to edit their full record.</p>
        </div>
      </div>

      {error && <div className="cms-alert error" onClick={() => setError("")} style={{ cursor: "pointer" }}>{error} ×</div>}

      {/* ── Toolbar ── */}
      <div className="cms-toolbar" style={{ flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, background: "#f0ece5", borderRadius: 12, padding: 4 }}>
          {[["singles","Singles"],["albums","Albums"],["artists","Artists"]].map(([t, label]) => (
            <button
              key={t}
              type="button"
              onClick={() => setChartType(t)}
              style={{
                border: 0, borderRadius: 9, padding: "5px 16px", fontSize: 13, fontWeight: 750, cursor: "pointer",
                background: chartType === t ? "#111" : "transparent",
                color:      chartType === t ? "#fff"  : "#666",
              }}
            >{label}</button>
          ))}
        </div>

        <select
          className="cms-select"
          value={selectedYM}
          onChange={e => setSelectedYM(e.target.value)}
          style={{ minWidth: 200 }}
        >
          <option value="">— Select month —</option>
          {uniqueMonths.map(m => (
            <option key={m.key} value={m.key}>{m.label}</option>
          ))}
        </select>

        {chartType !== "artists" && !currentChart && selectedYM && (
          <span style={{ fontSize: 12, color: "#C62828", fontWeight: 700 }}>
            No {chartType} chart for this month
          </span>
        )}

        {chartType === "artists" && !singlesChartId && selectedYM && (
          <span style={{ fontSize: 12, color: "#C62828", fontWeight: 700 }}>
            No singles chart for this month (needed to compute artist rankings)
          </span>
        )}

        {isLocked && (
          <span style={{ fontSize: 12, color: "#C62828", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
            🔒 Locked — read only
          </span>
        )}

        {chartType !== "artists" && chartId && !isLocked && (
          <button
            type="button"
            className="cms-btn light"
            style={{ fontSize: 12 }}
            disabled={recalcBusy}
            onClick={reRankCurrentChart}
            title="Re-rank entries by total points (fixes gaps after a release is deleted or merged)"
          >
            {recalcBusy ? "Recalculating…" : "↻ Recalculate ranks"}
          </button>
        )}

        {chartType === "artists" && artistRankings.length > 0 && (
          <span style={{ fontSize: 12, color: "#888" }}>
            {artistRankings.length} artists · computed from combined singles
          </span>
        )}

        {chartType !== "artists" && chartId && entries.length > 0 && (
          <span style={{ marginLeft: "auto", fontSize: 12, color: "#888" }}>
            {entries.length} entr{entries.length === 1 ? "y" : "ies"}
            {activePlatform ? ` · ${activePlatform.name}` : ""}
          </span>
        )}
      </div>

      {/* ── Platform pill bar (singles/albums only) ── */}
      {chartType !== "artists" && chartId && (
        <div className="cms-pill-bar" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16, alignItems: "center" }}>
          {pillBtn(COMBINED, "Combined", "#B8860B")}
          {relevantPlatforms.map(p =>
            pillBtn(p.id, p.short_name || p.name, p.color || "#555")
          )}
        </div>
      )}

      {/* ── Body ── */}
      {loading ? (
        <div className="cms-empty">Loading…</div>

      ) : chartType === "artists" ? (
        /* ── Artists computed chart ─────────────────────────────────────── */
        !singlesChartId ? (
          <div className="cms-empty">
            {selectedYM ? "No singles chart for this month — artist rankings cannot be computed." : "Select a month above."}
          </div>
        ) : artistRankings.length === 0 ? (
          <div className="cms-empty">No combined chart entries for this month.</div>
        ) : (
          <div className="cms-entries-layout" style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            <div className="cms-entries-table" style={{ flex: 1, minWidth: 0 }}>
              <div className="cms-table-wrap">
                <table className="cms-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>#</th>
                      <th>Artist</th>
                      <th style={{ width: 90 }}>Pts (month)</th>
                      <th style={{ width: 60 }}>Songs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {artistRankings.map(artist => {
                      const active = selectedArtist?.name === artist.name;
                      return (
                        <tr
                          key={artist.name}
                          className="clickable"
                          onClick={() => setSelectedArtist(active ? null : artist)}
                          style={{ background: active ? "#fffaf0" : undefined }}
                        >
                          <td style={{ fontWeight: 800, color: "#aaa", fontSize: 13 }}>{artist.rank}</td>
                          <td style={{ fontWeight: 700, fontSize: 13 }}>{artist.name}</td>
                          <td style={{ fontSize: 13, fontWeight: 600 }}>{artist.pts}</td>
                          <td style={{ fontSize: 13, color: "#666" }}>{artist.songs.length}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Artist detail + edit panel */}
            {selectedArtist && <div className="cms-entries-backdrop" onClick={() => setSelectedArtist(null)} />}
            {selectedArtist && (
              <div className="cms-entries-panel" style={{ width: 300, flexShrink: 0, background: "#fff", border: "1px solid #E8E1D2", borderRadius: 20, padding: 20, position: "sticky", top: 90 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800 }}>{selectedArtist.name}</div>
                    <div style={{ fontSize: 11, color: "#b8860b", fontWeight: 700, marginTop: 2 }}>#{selectedArtist.rank} · {selectedArtist.pts} pts this month</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedArtist(null)}
                    style={{ border: 0, background: "#f1eee7", borderRadius: 8, width: 30, height: 30, fontSize: 18, cursor: "pointer", lineHeight: 1, flexShrink: 0, marginLeft: 8 }}
                  >×</button>
                </div>

                <button
                  type="button"
                  className="cms-btn full"
                  disabled={editBusy}
                  onClick={() => openArtistEdit(selectedArtist.name)}
                  style={{ marginBottom: 16 }}
                >
                  {editBusy ? "Loading…" : "Edit artist record"}
                </button>

                <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "#5e625c", marginBottom: 8 }}>Songs in chart</div>
                {selectedArtist.songs.sort((a, b) => a.rank - b.rank).map(s => (
                  <div key={s.entryId} style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 8, marginBottom: 8, borderBottom: "1px solid #f0ece5" }}>
                    {s.cover
                      ? <img src={s.cover} alt="" style={{ width: 36, height: 36, borderRadius: 7, objectFit: "cover", flexShrink: 0 }} />
                      : <div style={{ width: 36, height: 36, borderRadius: 7, background: "#f0ece5", display: "grid", placeItems: "center", fontSize: 16, flexShrink: 0 }}>🎵</div>
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{ fontSize: 12, fontWeight: 700, cursor: "pointer", textDecoration: "underline dotted", textUnderlineOffset: 3 }}
                        onClick={() => s.releaseId && openReleaseEdit(s.releaseId)}
                        title="Edit this release"
                      >{s.title}</div>
                      <div style={{ fontSize: 10, color: "#888" }}>#{s.rank} · {s.pts} pts</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )

      ) : (
        /* ── Singles / Albums chart entries ─────────────────────────────── */
        !chartId ? (
          <div className="cms-empty">
            {selectedYM
              ? `No ${chartType} chart found for this month.`
              : "Select a chart month above to view its entries."}
          </div>
        ) : (
          <div className="cms-entries-layout" style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>

            {/* Entry table */}
            <div className="cms-entries-table" style={{ flex: 1, minWidth: 0 }}>
              <div className="cms-table-wrap">
                <table className="cms-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>#</th>
                      <th style={{ width: 42 }}></th>
                      <th>Title / Artist</th>
                      <th style={{ width: 80 }}>Points</th>
                      <th style={{ width: 52 }}>Wks</th>
                      <th style={{ width: 52 }}>Peak</th>
                      <th style={{ width: 52 }}>Chg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map(entry => {
                      const mv     = movement(entry);
                      const active = selected?.id === entry.id;
                      const primary = primaryArtistName(entry.artist_display || entry.artist);
                      return (
                        <tr
                          key={entry.id}
                          className="clickable"
                          onClick={() => pickEntry(entry)}
                          style={{ background: active ? "#fffaf0" : undefined }}
                        >
                          <td style={{ fontWeight: 800, color: "#aaa", fontSize: 13 }}>{entry.rank}</td>
                          <td style={{ padding: "8px 10px" }}>
                            {entry.cover_image
                              ? <img src={entry.cover_image} alt="" style={{ width: 36, height: 36, borderRadius: 7, objectFit: "cover", display: "block" }} />
                              : <div style={{ width: 36, height: 36, borderRadius: 7, background: "#f0ece5", display: "grid", placeItems: "center", fontSize: 17 }}>🎵</div>
                            }
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.3 }}>{entry.title}</div>
                            <div style={{ fontSize: 11, color: "#888", marginTop: 1 }}>{entry.artist_display || entry.artist}</div>
                          </td>
                          <td style={{ fontSize: 13, fontWeight: 600 }}>{(entry.total_points || 0).toLocaleString()}</td>
                          <td style={{ fontSize: 13, color: "#666" }}>{entry.weeks_on_chart}</td>
                          <td style={{ fontSize: 13, color: "#666" }}>{entry.peak_rank}</td>
                          <td>
                            <span style={{ fontSize: 11, fontWeight: 800, color: mv.color }}>{mv.label}</span>
                          </td>
                        </tr>
                      );
                    })}
                    {!entries.length && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", color: "#bbb", padding: 36 }}>
                          No entries for this chart{activePlatform ? ` on ${activePlatform.name}` : ""}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Entry edit panel */}
            {selected && <div className="cms-entries-backdrop" onClick={() => setSelected(null)} />}
            {selected && (
              <div className="cms-entries-panel" style={{ width: 300, flexShrink: 0, background: "#fff", border: "1px solid #E8E1D2", borderRadius: 20, padding: 20, position: "sticky", top: 90 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div style={{ minWidth: 0 }}>
                    {/* Clickable title → edit release */}
                    <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.2, marginBottom: 4 }}>
                      {selected.release
                        ? clickLink(() => openReleaseEdit(selected.release), selected.title)
                        : selected.title
                      }
                    </div>
                    {/* Clickable artist → edit artist */}
                    <div style={{ fontSize: 11, color: "#888" }}>
                      {clickLink(() => openArtistEdit(primaryArtistName(selected.artist_display || selected.artist)), selected.artist_display || selected.artist)}
                    </div>
                    {activePlatform?.name && activePlatform.name !== "Combined" && (
                      <div style={{ fontSize: 10, fontWeight: 700, color: activePlatform.color || "#555", marginTop: 3, textTransform: "uppercase", letterSpacing: ".04em" }}>
                        {activePlatform.name}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    style={{ border: 0, background: "#f1eee7", borderRadius: 8, width: 30, height: 30, fontSize: 18, cursor: "pointer", lineHeight: 1, flexShrink: 0, marginLeft: 8 }}
                  >×</button>
                </div>

                {/* Quick-access edit buttons */}
                <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
                  {selected.release && (
                    <button
                      type="button"
                      className="cms-btn light"
                      style={{ flex: 1, fontSize: 11 }}
                      disabled={editBusy}
                      onClick={() => openReleaseEdit(selected.release)}
                    >{editBusy ? "…" : "Edit release"}</button>
                  )}
                  <button
                    type="button"
                    className="cms-btn light"
                    style={{ flex: 1, fontSize: 11 }}
                    disabled={editBusy}
                    onClick={() => openArtistEdit(primaryArtistName(selected.artist_display || selected.artist))}
                  >{editBusy ? "…" : "Edit artist"}</button>
                </div>

                {/* Cover image */}
                <div style={{ marginBottom: 18 }}>
                  {panelLabel("Cover image")}
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <button
                      type="button"
                      title="Click to upload a new cover image"
                      onClick={() => imgInputRef.current?.click()}
                      style={{ width: 70, height: 70, borderRadius: 12, overflow: "hidden", border: "2px dashed #E8E1D2", background: "#faf8f2", cursor: "pointer", padding: 0, flexShrink: 0 }}
                    >
                      {(imagePreview || selected.cover_image)
                        ? <img src={imagePreview || selected.cover_image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        : <span style={{ fontSize: 26, color: "#ccc" }}>+</span>
                      }
                    </button>
                    <div style={{ fontSize: 11, color: "#888", lineHeight: 1.5 }}>
                      {imageFile
                        ? <span style={{ color: "#1B7F3A", fontWeight: 700 }}>✓ {imageFile.name}</span>
                        : "Click thumbnail to replace"
                      }
                    </div>
                    <input
                      ref={imgInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      style={{ display: "none" }}
                      onChange={e => pickImage(e.target.files?.[0])}
                    />
                  </div>
                </div>

                {/* Chart entry fields */}
                {FIELD_DEFS.map(({ key, label, type }) => (
                  <label key={key} style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
                    {panelLabel(label)}
                    <input
                      type={type}
                      value={form[key] ?? ""}
                      disabled={isLocked}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      style={{ border: "1px solid #E8E1D2", borderRadius: 10, padding: "8px 11px", font: "inherit", fontSize: 13, outline: "none", background: isLocked ? "#faf8f2" : "#fff" }}
                    />
                  </label>
                ))}

                {/* Movement type */}
                <label style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
                  {panelLabel("Movement type")}
                  <select
                    value={form.movement_type ?? ""}
                    disabled={isLocked}
                    onChange={e => setForm(f => ({ ...f, movement_type: e.target.value }))}
                    style={{ border: "1px solid #E8E1D2", borderRadius: 10, padding: "8px 11px", font: "inherit", fontSize: 13, outline: "none", background: isLocked ? "#faf8f2" : "#fff" }}
                  >
                    {MOVEMENT_OPTIONS.map(o => (
                      <option key={o} value={o}>{o || "— auto —"}</option>
                    ))}
                  </select>
                </label>

                {/* Boolean flags */}
                <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
                  {[["is_new","New entry"],["reentry","Re-entry"]].map(([key, label]) => (
                    <label key={key} style={{ display: "flex", alignItems: "center", gap: 6, cursor: isLocked ? "default" : "pointer", fontSize: 12, fontWeight: 600, color: "#444" }}>
                      <input
                        type="checkbox"
                        checked={!!form[key]}
                        disabled={isLocked}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                        style={{ width: 15, height: 15, accentColor: "#b8860b" }}
                      />
                      {label}
                    </label>
                  ))}
                </div>

                {isLocked
                  ? <div className="cms-alert" style={{ marginTop: 8, fontSize: 12 }}>This chart is locked. Unlock it first to make changes.</div>
                  : (
                    <button className="cms-btn full" disabled={saving} onClick={save} style={{ marginTop: 6 }}>
                      {saving ? "Saving…" : "Save chart entry"}
                    </button>
                  )
                }
              </div>
            )}
          </div>
        )
      )}

      {/* ── Release edit modal ── */}
      {editRelease && (
        <FormModal
          open
          title={`Edit Release`}
          entityId={editRelease.id}
          fields={RELEASE_FIELDS}
          initial={editRelease.data}
          onSubmit={saveRelease}
          onClose={() => setEditRelease(null)}
        />
      )}

      {/* ── Artist edit modal ── */}
      {editArtist && (
        <FormModal
          open
          title={`Edit Artist`}
          entityId={editArtist.id}
          fields={ARTIST_FIELDS}
          initial={editArtist.data}
          onSubmit={saveArtist}
          onClose={() => setEditArtist(null)}
        />
      )}
    </section>
  );
}
