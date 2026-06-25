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

// Splits artist credit string into ALL individual artist names (primary + featured).
// "Artist A ft. Artist B & Artist C" → ["Artist A", "Artist B", "Artist C"]
function allArtistCredits(artistDisplay) {
  return String(artistDisplay || "")
    .split(/\s*(?:\||\bft\.?|\bfeat\.?|\bfeaturing\b|\bx\b|&|,)\s*/i)
    .map(n => n.trim())
    .filter(Boolean);
}

// First segment only — used for artist search on click.
function primaryArtistName(artistDisplay) {
  return allArtistCredits(artistDisplay)[0] || "";
}

// Canonical key for release deduplication when building the Kenya chart.
function releaseEntryKey(e) {
  const title = String(e.title || e.t || "").trim().toLowerCase();
  const artist = primaryArtistName(e.artist_display || e.artist || e.a || "").toLowerCase();
  return `${title}|||${artist}`;
}

const COMBINED = "combined";
const KENYA    = "kenya"; // internal key — displayed as "Kenyan Top Charts"

export default function ChartEntriesPage() {
  const [allCharts, setAllCharts]       = useState([]);
  const [platforms, setPlatforms]       = useState([]);
  const [chartType, setChartType]       = useState("singles"); // "singles" | "albums" | "artists"
  const [selectedYM, setSelectedYM]     = useState("");
  const [platformId, setPlatformId]     = useState(COMBINED);
  const [entries, setEntries]           = useState([]);
  const [kenyanEntries, setKenyanEntries] = useState([]);
  const [kenyanLoading, setKenyanLoading] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [selected, setSelected]         = useState(null);
  const [form, setForm]                 = useState({});
  const [saving, setSaving]             = useState(false);
  const [imageFile, setImageFile]       = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [recalcBusy, setRecalcBusy]     = useState(false);

  // Artists tab state
  const [artistRankings, setArtistRankings] = useState([]);
  const [selectedArtist, setSelectedArtist] = useState(null);

  // Inline edit modals
  const [editRelease, setEditRelease] = useState(null);
  const [editArtist,  setEditArtist]  = useState(null);
  const [editBusy,    setEditBusy]    = useState(false);
  // Incremented after saving an artist so the Kenya effect re-fetches fresh
  // artist country data and recomputes which entries are eligible.
  const [kenyaRevision, setKenyaRevision] = useState(0);

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

  // Reset everything when chart type or month changes
  useEffect(() => {
    setPlatformId(COMBINED);
    setSelected(null);
    setSelectedArtist(null);
    setEntries([]);
    setKenyanEntries([]);
    if (chartType !== "artists") setArtistRankings([]);
  }, [chartType, selectedYM]);

  // Load entries for singles/albums tabs (skips Artists tab and Kenya view)
  useEffect(() => {
    if (chartType === "artists" || !chartId || platformId === KENYA) {
      setEntries([]); return;
    }
    setLoading(true); setError(""); setSelected(null);
    const platformParam = platformId === COMBINED ? "combined" : platformId;
    cmsApi.get(`/chart-entries/?chart=${chartId}&platform=${platformParam}&ordering=rank&page_size=500`)
      .then(d => setEntries(getResults(d)))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [chartType, chartId, platformId]);

  // Build the Kenya chart — identical algorithm to the public Kenyan Top 50, but no limit.
  //
  // Uses the CMS artist database (country_code = KE) as the primary source of truth,
  // exactly as the public page does via getArtistCountry(). Falls back to the
  // country_code / artist_country_code field on the chart entry itself.
  //
  // Steps:
  //  1. Load all KE artists from /artists/?country_code=KE
  //  2. Load all individual platform entries for the selected month/chart in parallel
  //  3. Flag each entry as Kenyan if: artist name matches a KE artist record OR
  //     the entry's own country_code field is KE
  //  4. Aggregate total_points per release across all platforms
  //  5. Sort descending — no 50-entry cap
  useEffect(() => {
    if (chartType === "artists" || platformId !== KENYA || !chartId || !platforms.length) {
      setKenyanEntries([]); return;
    }
    setKenyanLoading(true); setError(""); setSelected(null);

    Promise.all([
      // KE artist name lookup — same source the public page uses
      cmsApi.get("/artists/?country_code=KE&page_size=1000")
        .then(d => getResults(d))
        .catch(() => []),
      // All platform entries for this month's chart
      ...platforms.map(p =>
        cmsApi.get(`/chart-entries/?chart=${chartId}&platform=${p.id}&ordering=rank&page_size=500`)
          .then(d => getResults(d))
          .catch(() => [])
      ),
    ]).then(([allArtists, ...platformArrays]) => {
      // The backend may not support country_code as a filter parameter and can
      // return all artists. Always client-side filter to KE before building the
      // name set — this is the authoritative gate.
      const keArtists = allArtists.filter(
        a => (a.country_code || "").trim().toUpperCase() === "KE"
      );
      const keNames = new Set(
        keArtists.flatMap(a =>
          [a.name, a.display_name, a.public_name, ...(Array.isArray(a.aliases) ? a.aliases : [])]
            .filter(Boolean)
            .map(n => n.trim().toLowerCase())
        )
      );

      function isKenyanEntry(e) {
        // Check the PRIMARY ARTIST's country only — never the release/entry country
        // (entry.country_code can be the release's country, not the artist's, so using
        // it would include non-Kenyan releases published in Kenya).
        //
        // Order of checks (most authoritative first):
        // 1. Live CMS artist database — primary artist name matches a KE artist record.
        // 2. artist_country_code field — explicitly the artist's country at export time.
        const primary = primaryArtistName(e.artist_display || e.artist || "");
        if (primary && keNames.has(primary.toLowerCase())) return true;
        const artistCode = (e.artist_country_code || "").toUpperCase();
        return artistCode === "KE";
      }

      const releaseMap = new Map();
      platformArrays.flat().forEach(e => {
        if (!isKenyanEntry(e)) return;
        const key = releaseEntryKey(e);
        if (!key || key === "|||") return;
        if (releaseMap.has(key)) {
          releaseMap.get(key).total_points += Number(e.total_points) || 0;
          releaseMap.get(key)._platformCount += 1;
        } else {
          releaseMap.set(key, { ...e, total_points: Number(e.total_points) || 0, _platformCount: 1 });
        }
      });

      const sorted = [...releaseMap.values()]
        .sort((a, b) => b.total_points - a.total_points)
        .map((e, i) => ({ ...e, rank: i + 1 }));
      setKenyanEntries(sorted);
    })
    .catch(e => setError(e.message))
    .finally(() => setKenyanLoading(false));
  }, [chartType, chartId, platformId, platforms, kenyaRevision]);

  // Compute cumulative artist rankings from ALL platform entries across ALL months
  // for both singles and albums. Credits ALL artists (primary + featured) on each entry.
  // Formula: 51 − rank per combined entry, summed across every month + chart type.
  useEffect(() => {
    if (chartType !== "artists") { setArtistRankings([]); return; }
    const relevant = allCharts.filter(c => c.chart_type === "singles" || c.chart_type === "albums");
    if (!relevant.length) { setArtistRankings([]); return; }
    setLoading(true); setError(""); setSelectedArtist(null);

    Promise.all(
      relevant.map(c =>
        cmsApi.get(`/chart-entries/?chart=${c.id}&platform=combined&ordering=rank&page_size=500`)
          .then(d => getResults(d))
          .catch(() => [])
      )
    ).then(allArrays => {
      const map = new Map();
      allArrays.flat().forEach(e => {
        const pts = Math.max(0, 51 - (e.rank || 51));
        if (pts === 0) return;
        // Credit every named artist on the entry, including featured artists
        allArtistCredits(e.artist_display || e.artist).forEach(name => {
          if (!name) return;
          const key = name.toLowerCase();
          const song = { title: e.title, rank: e.rank, pts, entryId: e.id, releaseId: e.release, cover: e.cover_image };
          if (map.has(key)) {
            const a = map.get(key);
            a.pts += pts;
            // Avoid duplicate songs for this artist from the same chart entry
            if (!a.songs.some(s => s.entryId === e.id)) a.songs.push(song);
          } else {
            map.set(key, { name, pts, songs: [song] });
          }
        });
      });
      const ranked = [...map.values()]
        .sort((a, b) => b.pts - a.pts)
        .map((a, i) => ({ ...a, rank: i + 1 }));
      setArtistRankings(ranked);
    })
    .catch(e => setError(e.message))
    .finally(() => setLoading(false));
  }, [chartType, allCharts]);

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
    if (!chartId || recalcBusy || isLocked || platformId === KENYA) return;
    setRecalcBusy(true); setError("");
    try {
      const platformParam = platformId === COMBINED ? "combined" : platformId;
      const all = getResults(await cmsApi.get(
        `/chart-entries/?chart=${chartId}&platform=${platformParam}&ordering=-total_points&page_size=500`
      ));
      let changed = 0;
      for (let i = 0; i < all.length; i++) {
        if (all[i].rank !== i + 1) {
          await cmsApi.patch(`/chart-entries/${all[i].id}/`, { rank: i + 1 });
          changed++;
        }
      }
      const updated = getResults(await cmsApi.get(
        `/chart-entries/?chart=${chartId}&platform=${platformParam}&ordering=rank&page_size=500`
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
      const refresh = arr => arr.map(e =>
        e.release === editRelease.id
          ? { ...e, title: updated.title ?? e.title, cover_image: updated.cover_image ?? e.cover_image, artist_display: updated.artist_display ?? e.artist_display }
          : e
      );
      setEntries(refresh);
      setKenyanEntries(refresh);
      if (selected?.release === editRelease.id)
        setSelected(prev => ({ ...prev, title: updated.title ?? prev.title, cover_image: updated.cover_image ?? prev.cover_image }));
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
      // Trigger Kenya effect to re-fetch artist data so country changes
      // are reflected immediately in Kenyan Top Charts.
      setKenyaRevision(k => k + 1);
    } catch(e) { setError(e.message); }
    finally { setEditBusy(false); }
  }

  // ──────────────────────────────────────────────────────────────────────────

  const activePlatform =
    platformId === COMBINED ? { name: "Combined",          color: "#B8860B" } :
    platformId === KENYA    ? { name: "Kenyan Top Charts", color: "#006633" } :
    platforms.find(p => String(p.id) === String(platformId));

  // Entries to display in the table (Kenya view vs regular view)
  const displayEntries = platformId === KENYA ? kenyanEntries : entries;
  const displayLoading = platformId === KENYA ? kenyanLoading : loading;
  // Kenya entries are computed/aggregated — chart entry fields are read-only
  const isKenyaView   = platformId === KENYA;

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

        {chartType !== "artists" && (
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
        )}

        {chartType !== "artists" && !currentChart && selectedYM && (
          <span style={{ fontSize: 12, color: "#C62828", fontWeight: 700 }}>
            No {chartType} chart for this month
          </span>
        )}

        {isLocked && (
          <span style={{ fontSize: 12, color: "#C62828", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
            🔒 Locked — read only
          </span>
        )}

        {chartType !== "artists" && chartId && !isLocked && !isKenyaView && (
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
            {artistRankings.length} artists · cumulative all platforms · singles + albums
          </span>
        )}

        {chartType !== "artists" && chartId && displayEntries.length > 0 && (
          <span style={{ marginLeft: "auto", fontSize: 12, color: "#888" }}>
            {displayEntries.length} entr{displayEntries.length === 1 ? "y" : "ies"}
            {isKenyaView ? " · Kenyan Top Charts (all eligible)" : activePlatform ? ` · ${activePlatform.name}` : ""}
          </span>
        )}
      </div>

      {/* ── Platform pill bar (singles/albums only) ── */}
      {chartType !== "artists" && chartId && (
        <div className="cms-pill-bar" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16, alignItems: "center" }}>
          {pillBtn(COMBINED, "Combined",          "#B8860B")}
          {pillBtn(KENYA,    "Kenyan Top Charts", "#006633")}
          {platforms.map(p =>
            pillBtn(p.id, p.short_name || p.name, p.color || "#555")
          )}
        </div>
      )}

      {/* ── Body ── */}
      {displayLoading || (chartType === "artists" && loading) ? (
        <div className="cms-empty">
          {isKenyaView ? "Building Kenyan Top Charts…" : "Loading…"}
        </div>

      ) : chartType === "artists" ? (
        /* ── Artists computed chart ─────────────────────────────────────── */
        artistRankings.length === 0 ? (
          <div className="cms-empty">{allCharts.length ? "No combined chart entries found." : "Loading chart data…"}</div>
        ) : (
          <div className="cms-entries-layout" style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            <div className="cms-entries-table" style={{ flex: 1, minWidth: 0 }}>
              <div className="cms-table-wrap">
                <table className="cms-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>#</th>
                      <th>Artist</th>
                      <th style={{ width: 100 }}>Pts (all)</th>
                      <th style={{ width: 60 }}>Entries</th>
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
                          <td style={{ fontSize: 13, fontWeight: 600 }}>{artist.pts.toLocaleString()}</td>
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
                    <div style={{ fontSize: 11, color: "#b8860b", fontWeight: 700, marginTop: 2 }}>
                      #{selectedArtist.rank} · {selectedArtist.pts.toLocaleString()} pts cumulative
                    </div>
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

                <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "#5e625c", marginBottom: 8 }}>
                  Chart entries ({selectedArtist.songs.length})
                </div>
                {selectedArtist.songs.sort((a, b) => b.pts - a.pts).map(s => (
                  <div key={s.entryId} style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 8, marginBottom: 8, borderBottom: "1px solid #f0ece5" }}>
                    {s.cover
                      ? <img src={s.cover} alt="" style={{ width: 36, height: 36, borderRadius: 7, objectFit: "cover", flexShrink: 0 }} />
                      : <div style={{ width: 36, height: 36, borderRadius: 7, background: "#f0ece5", display: "grid", placeItems: "center", fontSize: 16, flexShrink: 0 }}>🎵</div>
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{ fontSize: 12, fontWeight: 700, cursor: "pointer", textDecoration: "underline dotted", textUnderlineOffset: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                        onClick={() => s.releaseId && openReleaseEdit(s.releaseId)}
                        title="Edit this release"
                      >{s.title}</div>
                      <div style={{ fontSize: 10, color: "#888" }}>rank #{s.rank} · {s.pts} pts</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )

      ) : (
        /* ── Singles / Albums / Kenya chart entries ───────────────────────── */
        !chartId ? (
          <div className="cms-empty">
            {selectedYM
              ? `No ${chartType} chart found for this month.`
              : "Select a chart month above to view its entries."}
          </div>
        ) : displayEntries.length === 0 && !displayLoading ? (
          <div className="cms-empty">
            {isKenyaView
              ? "No Kenyan entries found for this month. Confirm that primary artists have country code KE set in the Artists section."
              : `No entries for this chart${activePlatform ? ` on ${activePlatform.name}` : ""}.`}
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
                      {!isKenyaView && <th style={{ width: 52 }}>Chg</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {displayEntries.map(entry => {
                      const mv     = movement(entry);
                      const active = selected?.id === entry.id;
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
                          <td style={{ fontSize: 13, color: "#666" }}>{entry.weeks_on_chart ?? "—"}</td>
                          <td style={{ fontSize: 13, color: "#666" }}>{entry.peak_rank ?? "—"}</td>
                          {!isKenyaView && (
                            <td>
                              <span style={{ fontSize: 11, fontWeight: 800, color: mv.color }}>{mv.label}</span>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Entry edit / info panel */}
            {selected && <div className="cms-entries-backdrop" onClick={() => setSelected(null)} />}
            {selected && (
              <div className="cms-entries-panel" style={{ width: 300, flexShrink: 0, background: "#fff", border: "1px solid #E8E1D2", borderRadius: 20, padding: 20, position: "sticky", top: 90 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.2, marginBottom: 4 }}>
                      {selected.release
                        ? clickLink(() => openReleaseEdit(selected.release), selected.title)
                        : selected.title
                      }
                    </div>
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

                {/* Quick-access edit buttons (always available) */}
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

                {/* Kenya chart: read-only summary — chart entry fields don't apply to aggregated entries */}
                {isKenyaView ? (
                  <div>
                    <div style={{ fontSize: 11, color: "#888", lineHeight: 1.6, background: "#f9f7f2", borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
                      Kenyan Top Charts entry — aggregated from {selected._platformCount || "multiple"} platform{selected._platformCount !== 1 ? "s" : ""}.
                      Edit the release or artist record using the buttons above.
                    </div>
                    <div style={{ display: "flex", gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "#aaa", marginBottom: 2 }}>Aggregated pts</div>
                        <div style={{ fontSize: 18, fontWeight: 800 }}>{(selected.total_points || 0).toLocaleString()}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "#aaa", marginBottom: 2 }}>Kenya rank</div>
                        <div style={{ fontSize: 18, fontWeight: 800 }}>#{selected.rank}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            )}
          </div>
        )
      )}

      {/* ── Release edit modal ── */}
      {editRelease && (
        <FormModal
          open
          title="Edit Release"
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
          title="Edit Artist"
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
