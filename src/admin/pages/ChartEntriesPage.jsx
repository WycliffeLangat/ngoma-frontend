import { useEffect, useMemo, useRef, useState } from "react";
import { cmsApi, getResults } from "../api";
import FormModal from "../components/FormModal";
import { fetchAppData } from "../../api/public";
import { buildArtistMonthMirror } from "../../utils/publicChartMirror";
import { harmonizeChartData } from "../chartRankMaintenance";

const MOVE_COLOR = { NEW: "#1565C0", up: "#1B7F3A", down: "#C62828", same: "#999" };

function movement(entry) {
  if (!entry.prev_rank) return { label: "NEW", color: MOVE_COLOR.NEW };
  const diff = entry.prev_rank - entry.rank;
  if (diff > 0) return { label: `+${diff}`, color: MOVE_COLOR.up };
  if (diff < 0) return { label: String(diff), color: MOVE_COLOR.down };
  return { label: "=", color: MOVE_COLOR.same };
}

const FIELD_DEFS = [
  { key: "rank",             label: "Rank (calculated)", type: "number", calculated: true },
  { key: "total_points",     label: "Total points",     type: "number" },
  { key: "weeks_on_chart",   label: "Weeks on chart",   type: "number" },
  { key: "peak_rank",        label: "Peak rank (calculated)", type: "number", calculated: true },
  { key: "prev_rank",        label: "Last month (calculated)", type: "number", calculated: true },
  { key: "featured_artists", label: "Featured artists", type: "text"   },
  { key: "confidence",       label: "Confidence",       type: "text"   },
  { key: "notes",            label: "Notes",            type: "text"   },
];

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
  { name: "slug",             label: "Slug",              help: "URL-safe identifier, for example fik-fameica." },
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

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

function artistSlug(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "artist";
}

function splitArtistNames(value) {
  return String(value || "")
    .split(/\s*(?:\||\bft\.?|\bfeat\.?|\bfeaturing\b|\bx\b|&|,)\s*/i)
    .map((name) => name.trim())
    .filter(Boolean);
}

const COMBINED = "combined";

function appendQuery(path, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  const value = query.toString();
  return value ? `${path}${path.includes("?") ? "&" : "?"}${value}` : path;
}

async function fetchAllCmsResults(path, pageSize = 500) {
  const rows = [];
  for (let page = 1; ; page += 1) {
    const payload = await cmsApi.get(appendQuery(path, { page, page_size: pageSize }));
    const results = getResults(payload);
    rows.push(...results);
    if (Array.isArray(payload) || !payload?.next || results.length === 0) break;
  }
  return rows;
}

export default function ChartEntriesPage({ user }) {
  const canEdit = Boolean(user?.permissions?.can_manage_data) && !user?.permissions?.read_only;
  const [allCharts, setAllCharts]       = useState([]);
  const [platforms, setPlatforms]       = useState([]);
  const [chartType, setChartType]       = useState("singles"); // "singles" | "albums" | "artists"
  const [selectedYM, setSelectedYM]     = useState("");
  const [platformId, setPlatformId]     = useState(COMBINED);
  const [entries, setEntries]           = useState([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [selected, setSelected]         = useState(null);
  const [form, setForm]                 = useState({});
  const [saving, setSaving]             = useState(false);
  const [imageFile, setImageFile]       = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [recalcBusy, setRecalcBusy]     = useState(false);
  const [publicPayload, setPublicPayload] = useState(null);
  const [publicLoading, setPublicLoading] = useState(true);
  const [publicError, setPublicError] = useState("");

  // Artists tab state
  const [artistRankings, setArtistRankings] = useState([]);
  const [selectedArtist, setSelectedArtist] = useState(null);

  // Inline edit modals
  const [editRelease, setEditRelease] = useState(null);
  const [editArtist,  setEditArtist]  = useState(null);
  const [editBusy,    setEditBusy]    = useState(false);
  const [reconcileBusy, setReconcileBusy] = useState(false);
  const imgInputRef = useRef();
  const reconciliationRef = useRef("");

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
    loadPublicPayload();
  }, []);

  async function loadPublicPayload() {
    setPublicLoading(true);
    setPublicError("");
    try {
      const payload = await fetchAppData(undefined, 30_000);
      if (!payload?.full?.singles || !payload?.full?.albums || !payload?.months?.length) {
        throw new Error("The public chart payload is incomplete.");
      }
      setPublicPayload(payload);
    } catch (e) {
      setPublicError(e.message || "Unable to load public chart entries.");
    } finally {
      setPublicLoading(false);
    }
  }

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
  const selectedMonthLabel = useMemo(() => {
    const [year, month] = selectedYM.split("-").map(Number);
    return year && month
      ? new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })
      : "";
  }, [selectedYM]);
  const platformName = useMemo(() => {
    if (platformId === COMBINED) return "Combined";
    if (platformId === "kenyan") return "Kenyan";
    const platform = platforms.find(p => String(p.id) === String(platformId));
    return platform?.name || platform?.short_name || "";
  }, [platformId, platforms]);
  const availablePlatformNames = useMemo(() => {
    if (chartType !== "artists") return null;
    if (!publicPayload) return null;
    const source = {
      ...(publicPayload.full?.singles?.platforms || {}),
      ...(publicPayload.full?.albums?.platforms || {}),
    };
    return new Set(Object.keys(source).map(name => name.toLowerCase()));
  }, [publicPayload, chartType]);
  const visiblePlatforms = useMemo(() => platforms.filter((platform) => {
    if (!availablePlatformNames) return true;
    return [platform.name, platform.short_name]
      .some((name) => availablePlatformNames.has(String(name || "").toLowerCase()));
  }), [platforms, availablePlatformNames]);

  // The CMS can contain a newer draft chart than the latest published public
  // month. Artist rows are derived from the public payload, so always start on
  // its latest available month instead of leaving the Artists tab empty.
  useEffect(() => {
    if (chartType !== "artists") return;
    const publishedMonths = publicPayload?.months || [];
    if (!publishedMonths.length || publishedMonths.includes(selectedMonthLabel)) return;
    const latest = publishedMonths[publishedMonths.length - 1];
    const parsed = new Date(`${latest} 1`);
    if (!Number.isNaN(parsed.getTime())) {
      setSelectedYM(`${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`);
    }
  }, [chartType, publicPayload, selectedMonthLabel]);

  // Reset everything when chart type or month changes
  useEffect(() => {
    setPlatformId(COMBINED);
    setSelected(null);
    setSelectedArtist(null);
    setEntries([]);
    if (chartType !== "artists") setArtistRankings([]);
  }, [chartType, selectedYM]);

  // Load entries for singles/albums tabs (skips Artists tab)
  useEffect(() => {
    if (chartType === "artists" || !chartId) {
      setEntries([]); return;
    }
    setLoading(true); setError(""); setSelected(null);
    const platformParam = platformId === COMBINED ? "combined" : platformId;
    const endpoint = platformId === "kenyan"
      ? `/regional-chart-entries/?chart=${chartId}&region=KE&ordering=rank`
      : `/chart-entries/?chart=${chartId}&platform=${platformParam}&ordering=rank`;
    fetchAllCmsResults(endpoint)
      .then(setEntries)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [chartType, chartId, platformId]);

  // Mirror the public monthly Artist Top 50 from singles + albums platform rows.
  useEffect(() => {
    if (chartType !== "artists") { setArtistRankings([]); return; }
    if (!publicPayload || !selectedMonthLabel) { setArtistRankings([]); return; }
    setLoading(true); setError(""); setSelectedArtist(null);

    try {
      setArtistRankings(
        buildArtistMonthMirror(publicPayload, selectedMonthLabel, platformName)
          .map((artist) => ({
            ...artist,
            pts: artist.points,
            songs: artist.releases.map((entry) => ({
              title: entry.t || entry.title,
              rank: Number(entry.r ?? entry.rank),
              pts: Number(entry.p ?? entry.pts ?? entry.total_points) || 0,
              entryId: `${entry.sourceChartType}-${entry.sourcePlatform}-${entry.id}`,
              releaseId: entry.release_id,
              cover: entry.cover_image,
            })),
          }))
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [chartType, publicPayload, selectedMonthLabel, platformName]);

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
    if (!selected || saving || platformId === "kenyan") return;
    setSaving(true); setError("");
    try {
      const payload = {
        total_points:     Number(form.total_points),
        weeks_on_chart:   Number(form.weeks_on_chart),
        featured_artists: form.featured_artists,
        confidence:       form.confidence,
        notes:            form.notes || null,
      };
      const updated = await cmsApi.patch(`/chart-entries/${selected.id}/`, payload);

      if (imageFile && selected.release) {
        const fd = new FormData();
        fd.append("cover_image", imageFile);
        const updatedRelease = await cmsApi.patch(`/releases/${selected.release}/`, fd);
        updated.cover_image = updatedRelease?.cover_image || imagePreview;
      }

      const platformParam = platformId === COMBINED ? "combined" : platformId;
      const endpoint = platformId === "kenyan"
        ? `/regional-chart-entries/?chart=${chartId}&region=KE&ordering=rank`
        : `/chart-entries/?chart=${chartId}&platform=${platformParam}&ordering=rank`;
      setEntries(await fetchAllCmsResults(endpoint));
      const fresh = await fetchAppData().catch(() => null);
      if (fresh) setPublicPayload(fresh);
      setSelected(null);
      setImageFile(null);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function reRankCurrentChart() {
    if (!chartId || recalcBusy || isLocked) return;
    setRecalcBusy(true); setError("");
    try {
      const result = await harmonizeChartData({ chartIds: [Number(chartId)] });
      const platformParam = platformId === COMBINED ? "combined" : platformId;
      const endpoint = `/chart-entries/?chart=${chartId}&platform=${platformParam}&ordering=rank`;
      setEntries(await fetchAllCmsResults(endpoint));
      const fresh = await fetchAppData().catch(() => null);
      if (fresh) setPublicPayload(fresh);
      setSelected(null);
      if (!result.rank_changes && !result.history_changes && !result.certifications_changed) {
        setError("Chart history is already fully harmonized — no changes made.");
      }
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
      if (selected?.release === editRelease.id)
        setSelected(prev => ({ ...prev, title: updated.title ?? prev.title, cover_image: updated.cover_image ?? prev.cover_image }));
      setEditRelease(null);
      const fresh = await fetchAppData().catch(() => null);
      if (fresh) setPublicPayload(fresh);
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
      let match = results.find(a =>
        (a.name || "").toLowerCase() === artistName.toLowerCase() ||
        (a.display_name || "").toLowerCase() === artistName.toLowerCase()
      ) || results[0];
      if (!match) {
        try {
          match = await cmsApi.post("/artists/", {
            name: artistName,
            display_name: artistName,
            slug: artistSlug(artistName),
            artist_type: "solo",
            status: "active",
          });
        } catch (createError) {
          const retry = getResults(await cmsApi.get(
            `/artists/?search=${encodeURIComponent(artistName)}&page_size=5`
          ));
          match = retry.find((artist) =>
            [artist.name, artist.display_name, artist.public_name]
              .some((name) => normalizeName(name) === normalizeName(artistName))
          );
          if (!match) throw createError;
        }
      }
      setEditArtist({ id: match.id, data: match, name: artistName });
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

      // Cascade country change to every song/album where this artist is the
      // primary artist — keeps release.country_code (and country name) in sync so
      // the release detail and chart eligibility are consistent across the system.
      const oldCode = (editArtist.data?.country_code || "").toUpperCase();
      const newCode = (formData.country_code || "").toUpperCase();
      if (newCode && oldCode !== newCode) {
        try {
          const artistName = primaryArtistName(editArtist.data?.name || "").toLowerCase();
          const relData = await cmsApi.get(`/releases/?primary_artist=${editArtist.id}&page_size=500`);
          const releases = getResults(relData).filter(r =>
            primaryArtistName(r.artist_display || r.primary_artist || "").toLowerCase() === artistName
          );
          const updates = { country_code: newCode };
          if (formData.country && formData.country.trim()) updates.country = formData.country.trim();
          await Promise.all(releases.map(r => cmsApi.patch(`/releases/${r.id}/`, updates)));
        } catch { /* best-effort */ }
      }

      setEditArtist(null);
      const fresh = await fetchAppData().catch(() => null);
      if (fresh) setPublicPayload(fresh);
    } catch(e) { setError(e.message); }
    finally { setEditBusy(false); }
  }

  const missingArtistRecords = artistRankings.filter((artist) => !artist.profile?.id);

  async function reconcileMissingArtists() {
    if (reconcileBusy) return;
    setReconcileBusy(true); setError("");
    try {
      // Public songs/albums already originate from Release records. Reconcile
      // only their artist credits, keyed by the exact release_id, so releases
      // with the same title can never be merged accidentally.
      const rowsByRelease = new Map();
      (artistRankings || []).forEach((artist) => {
        (artist.releases || []).forEach((entry) => {
          if (entry.release_id) rowsByRelease.set(Number(entry.release_id), entry);
        });
      });
      const rows = [...rowsByRelease.values()];

      const primaryNamesFor = (row) => {
        const structured = (row.primary_artists || [])
          .map((profile) => profile?.public_name || profile?.display_name || profile?.name)
          .filter(Boolean);
        return structured.length
          ? structured
          : splitArtistNames(row.primary_artist_credit || row.pa || row.primary_artist || row.a || row.artist_credit || row.artist);
      };
      const featuredNamesFor = (row) => {
        const structured = (row.featured_artist_profiles || [])
          .map((profile) => profile?.public_name || profile?.display_name || profile?.name)
          .filter(Boolean);
        const textNames = splitArtistNames(row.featured_artist_credit || row.fa || row.featured_artists || "");
        return [...new Map([...structured, ...textNames].map((name) => [normalizeName(name), name])).values()];
      };

      const artistNames = new Map();
      rows.forEach((row) => {
        [...primaryNamesFor(row), ...featuredNamesFor(row)].forEach((name) => {
          const key = normalizeName(name);
          if (key && !artistNames.has(key)) artistNames.set(key, String(name).trim());
        });
      });
      // Also register credits from every published release, not only artists
      // currently visible in this month. This makes historical and text-only
      // featured artists searchable throughout the CMS.
      (publicPayload?.releases || []).forEach((release) => {
        [...primaryNamesFor(release), ...featuredNamesFor(release)].forEach((name) => {
          const key = normalizeName(name);
          if (key && !artistNames.has(key)) artistNames.set(key, String(name).trim());
        });
      });

      const artistLookup = new Map();
      const artistOptions = await cmsApi.get("/artists/options/").catch(() => []);
      (Array.isArray(artistOptions) ? artistOptions : getResults(artistOptions)).forEach((item) => {
        const name = item.public_name || item.display_name || item.name || item.label;
        const key = normalizeName(name);
        if (key) artistLookup.set(key, { ...item, id: item.id || item.value, name });
      });
      for (const [key, rawName] of artistNames) {
        let record = artistLookup.get(key) || null;
        if (!record) {
          try {
            record = await cmsApi.post("/artists/", {
              name: rawName,
              display_name: rawName,
              slug: artistSlug(rawName),
              artist_type: "solo",
              status: "active",
            });
          } catch (createError) {
            // A simultaneous reconciliation may have created it between the
            // search and POST. Resolve that race without surfacing a false 400.
            const retry = getResults(await cmsApi.get(`/artists/?search=${encodeURIComponent(rawName)}&page_size=10`));
            record = retry.find((item) =>
              [item.name, item.display_name, item.public_name].some((name) => normalizeName(name) === key)
            );
            if (!record) throw createError;
          }
        }
        artistLookup.set(key, record);
      }

      // Artist creation is intentionally completed before any release reads.
      // A stale or deleted release must never prevent a credited name from
      // appearing in the CMS Artists database/search.
      const releaseRecords = new Map();
      for (const row of rows) {
        const releaseId = Number(row.release_id);
        if (!releaseId) continue;
        try {
          releaseRecords.set(releaseId, await cmsApi.get(`/releases/${releaseId}/`));
        } catch {
          // Merged/deleted records are explicitly allowed to stay absent.
        }
      }
      const existingRows = rows.filter((row) => releaseRecords.has(Number(row.release_id)));

      for (const row of existingRows) {
        const releaseId = Number(row.release_id);
        const release = releaseRecords.get(releaseId);
        const primaryIds = [
          ...(release.primary_artist_ids || []),
          ...(release.primary_artists || []).map((profile) => profile.id),
          release.artist,
        ].map(Number).filter(Boolean);
        const desiredFeaturedIds = featuredNamesFor(row)
          .map((name) => artistLookup.get(normalizeName(name))?.id)
          .filter((id) => id !== undefined && id !== null && id !== "")
          .map(Number);
        const existingFeaturedIds = [
          ...(release.featured_artist_ids || []),
          ...(release.featured_artist_profiles || []).map((profile) => profile.id),
        ].map(Number).filter(Boolean);
        const primarySet = new Set(primaryIds);
        const nextFeaturedIds = [...new Set([...existingFeaturedIds, ...desiredFeaturedIds])]
          .filter((id) => !primarySet.has(id));
        const currentKey = [...new Set(existingFeaturedIds)].sort((a, b) => a - b).join(",");
        const nextKey = [...nextFeaturedIds].sort((a, b) => a - b).join(",");
        if (nextKey !== currentKey) {
          try {
            await cmsApi.patch(`/releases/${releaseId}/`, { featured_artist_ids: nextFeaturedIds });
          } catch {
            // The Artist records already exist at this point. Keep processing
            // other releases and let a later sync retry this individual link.
          }
        }
      }

      const fresh = await fetchAppData();
      setPublicPayload(fresh);
    } catch (e) {
      setError(e.message);
    } finally {
      setReconcileBusy(false);
    }
  }

  // Reconcile automatically when opening the Artists chart. This makes the
  // CMS exhaustive without requiring an editor to notice and press a repair
  // button first (for example, Fik Fameica as a text-only featured credit).
  useEffect(() => {
    if (chartType !== "artists" || reconcileBusy || !artistRankings.length) return;
    const key = `${publicPayload?.revision || "live"}|${selectedMonthLabel}|${platformName}|${artistRankings.map((artist) => artist.name.toLowerCase()).sort().join(",")}`;
    if (reconciliationRef.current === key) return;
    reconciliationRef.current = key;
    reconcileMissingArtists();
  }, [chartType, publicPayload?.revision, selectedMonthLabel, platformName, reconcileBusy, artistRankings.length]);

  // ──────────────────────────────────────────────────────────────────────────

  const activePlatform =
    platformId === COMBINED ? { name: "Combined", color: "#B8860B" } :
    platformId === "kenyan" ? { name: "Kenyan", color: "#006600" } :
    platforms.find(p => String(p.id) === String(platformId));
  const isRegionalScope = platformId === "kenyan";

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

  const clickLink = (onClick, children) => canEdit ? (
    <span
      onClick={e => { e.stopPropagation(); onClick(); }}
      style={{ cursor: editBusy ? "default" : "pointer", textDecoration: "underline dotted", textUnderlineOffset: 3 }}
      title="Click to edit"
    >{children}</span>
  ) : children;

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

        {isLocked && (
          <span style={{ fontSize: 12, color: "#C62828", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
            🔒 Locked — read only
          </span>
        )}

        {canEdit && chartType !== "artists" && chartId && platformId !== "kenyan" && !isLocked && (
          <button
            type="button"
            className="cms-btn light"
            style={{ fontSize: 12 }}
            disabled={recalcBusy}
            onClick={reRankCurrentChart}
            title="Recalculate ranks, movement, last month, peaks, certifications, analytics, and year-end data across every month"
          >
            {recalcBusy ? "Harmonizing…" : "↻ Harmonize all months"}
          </button>
        )}

        {canEdit && chartType === "artists" && artistRankings.length > 0 && (
          <span style={{ fontSize: 12, color: "#888" }}>
            {artistRankings.length} artists · {platformName.toLowerCase()} · singles + albums
          </span>
        )}
        {chartType === "artists" && artistRankings.length > 0 && (
          <button type="button" className="cms-btn light small" onClick={reconcileMissingArtists} disabled={reconcileBusy}>
            {reconcileBusy
              ? "Syncing artist records…"
              : missingArtistRecords.length
                ? `Sync artists (${missingArtistRecords.length} missing)`
                : "Sync artist records"}
          </button>
        )}

        {chartType !== "artists" && chartId && entries.length > 0 && (
          <span style={{ marginLeft: "auto", fontSize: 12, color: "#888" }}>
            {entries.length} entr{entries.length === 1 ? "y" : "ies"}
            {activePlatform ? ` · ${activePlatform.name}` : ""}
          </span>
        )}
      </div>

      {/* Platform pills mirror the live public payload. */}
      {(chartType === "artists" || chartId) && (
        <div className="cms-pill-bar" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16, alignItems: "center" }}>
          {pillBtn(COMBINED, "Combined", "#B8860B")}
          {pillBtn("kenyan", chartType === "artists" ? "Kenyan Artists" : (chartType === "albums" ? "Kenyan Albums" : "Kenyan Singles"), "#006600")}
          {visiblePlatforms.map(p =>
            pillBtn(p.id, p.short_name || p.name, p.color || "#555")
          )}
        </div>
      )}

      {/* ── Body ── */}
      {loading || (chartType === "artists" && publicLoading) ? (
        <div className="cms-empty">Loading…</div>

      ) : chartType === "artists" ? (
        /* ── Artists computed chart ─────────────────────────────────────── */
        publicError ? (
          <div className="cms-alert error">
            <strong>Artist chart could not be loaded.</strong>
            <div style={{ marginTop: 5 }}>{publicError}</div>
            <button type="button" className="cms-btn light small" onClick={loadPublicPayload} style={{ marginTop: 10 }}>
              Retry live chart
            </button>
          </div>
        ) : artistRankings.length === 0 ? (
          <div className="cms-empty">No artist entries are available for {selectedMonthLabel || "the selected month"} on {platformName}.</div>
        ) : (
          <div className="cms-entries-layout" style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            <div className="cms-entries-table" style={{ flex: 1, minWidth: 0 }}>
              <div className="cms-table-wrap">
                <table className="cms-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>#</th>
                      <th style={{ width: 42 }}></th>
                      <th>Artist</th>
                      <th style={{ width: 100 }}>Pts (all)</th>
                      <th style={{ width: 60 }}>Entries</th>
                      {canEdit && <th style={{ width: 74 }}>Edit</th>}
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
                          <td style={{ padding: "8px 6px" }}>
                            {artist.image
                              ? <img src={artist.image} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover", display: "block" }} />
                              : <span className="cms-chart-image cms-chart-image-empty" style={{ width: 36, height: 36 }}>{artist.name.charAt(0)}</span>}
                          </td>
                          <td style={{ fontWeight: 700, fontSize: 13 }}>{artist.name}</td>
                          <td style={{ fontSize: 13, fontWeight: 600 }}>{artist.pts.toLocaleString()}</td>
                          <td style={{ fontSize: 13, color: "#666" }}>{artist.songs.length}</td>
                          {canEdit && <td>
                            <button
                              type="button"
                              className="cms-btn light small"
                              disabled={editBusy}
                              onClick={(event) => {
                                event.stopPropagation();
                                openArtistEdit(artist.name);
                              }}
                            >
                              Edit
                            </button>
                          </td>}
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
                    <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.2 }}>{selectedArtist.name}</div>
                    <div style={{ fontSize: 12, color: "#b8860b", fontWeight: 700, marginTop: 2 }}>
                      #{selectedArtist.rank} · {selectedArtist.pts.toLocaleString()} pts cumulative
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedArtist(null)}
                    style={{ border: 0, background: "#f1eee7", borderRadius: 8, width: 30, height: 30, fontSize: 18, cursor: "pointer", lineHeight: 1, flexShrink: 0, marginLeft: 8 }}
                  >×</button>
                </div>

                {canEdit && <button
                  type="button"
                  className="cms-btn full"
                  disabled={editBusy}
                  onClick={() => openArtistEdit(selectedArtist.name)}
                  style={{ marginBottom: 16 }}
                >
                  {editBusy ? "Loading…" : "Edit artist record"}
                </button>}

                <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "#5e625c", marginBottom: 8 }}>
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
                        style={{ fontSize: 13, fontWeight: 700, cursor: "pointer", textDecoration: "underline dotted", textUnderlineOffset: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                        onClick={() => canEdit && s.releaseId && openReleaseEdit(s.releaseId)}
                        title={canEdit ? "Edit this release" : undefined}
                      >{s.title}</div>
                      <div style={{ fontSize: 11, color: "#888" }}>rank #{s.rank} · {s.pts} pts</div>
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
        ) : entries.length === 0 && !loading ? (
          <div className="cms-empty">
            {`No entries for this chart${activePlatform ? ` on ${activePlatform.name}` : ""}.`}
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
                          <td>
                            <span style={{ fontSize: 11, fontWeight: 800, color: mv.color }}>{mv.label}</span>
                          </td>
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
                    <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.2, marginBottom: 4 }}>
                      {selected.release
                        ? clickLink(() => openReleaseEdit(selected.release), selected.title)
                        : selected.title
                      }
                    </div>
                    <div style={{ fontSize: 13, color: "#888" }}>
                      {clickLink(() => openArtistEdit(primaryArtistName(selected.artist_display || selected.artist)), selected.artist_display || selected.artist)}
                    </div>
                    {activePlatform?.name && activePlatform.name !== "Combined" && (
                      <div style={{ fontSize: 11, fontWeight: 700, color: activePlatform.color || "#555", marginTop: 3, textTransform: "uppercase", letterSpacing: ".04em" }}>
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
                {canEdit && <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
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
                </div>}

                <>
                    {/* Cover image */}
                    <div style={{ marginBottom: 18 }}>
                      {panelLabel("Cover image")}
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <button
                          type="button"
                          title="Click to upload a new cover image"
                          onClick={() => canEdit && imgInputRef.current?.click()}
                          disabled={!canEdit || isRegionalScope}
                          style={{ width: 70, height: 70, borderRadius: 12, overflow: "hidden", border: "2px dashed #E8E1D2", background: "#faf8f2", cursor: isRegionalScope ? "default" : "pointer", padding: 0, flexShrink: 0 }}
                        >
                          {(imagePreview || selected.cover_image)
                            ? <img src={imagePreview || selected.cover_image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                            : <span style={{ fontSize: 26, color: "#ccc" }}>+</span>
                          }
                        </button>
                        <div style={{ fontSize: 12, color: "#888", lineHeight: 1.5 }}>
                          {imageFile
                            ? <span style={{ color: "#1B7F3A", fontWeight: 700 }}>✓ {imageFile.name}</span>
                            : isRegionalScope ? "Edit release metadata from the button above" : "Click thumbnail to replace"
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
                    {FIELD_DEFS.map(({ key, label, type, calculated }) => (
                      <label key={key} style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
                        {panelLabel(label)}
                        <input
                          type={type}
                          value={form[key] ?? ""}
                          disabled={isLocked || calculated || isRegionalScope}
                          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                          style={{ border: "1px solid #E8E1D2", borderRadius: 10, padding: "8px 11px", font: "inherit", fontSize: 14, outline: "none", background: isLocked || calculated || isRegionalScope ? "#faf8f2" : "#fff" }}
                        />
                      </label>
                    ))}

                    <div className="cms-alert info" style={{ marginBottom: 14, fontSize: 12 }}>
                      {isRegionalScope
                        ? "Regional chart rows are derived from the complete source pool. Edit release or artist metadata directly; ranks update during harmonization."
                        : "Rank, movement, last month, and peak are recalculated from the complete chart history whenever this entry is saved."}
                    </div>

                    {!canEdit
                      ? <div className="cms-alert info" style={{ marginTop: 8, fontSize: 12 }}>Your role can review this entry but cannot change it.</div>
                      : isRegionalScope
                      ? <div className="cms-alert info" style={{ marginTop: 8, fontSize: 12 }}>Use the release and artist edit buttons for regional chart metadata.</div>
                      : isLocked
                      ? <div className="cms-alert" style={{ marginTop: 8, fontSize: 12 }}>This chart is locked. Unlock it first to make changes.</div>
                      : (
                        <button className="cms-btn full" disabled={saving} onClick={save} style={{ marginTop: 6 }}>
                          {saving ? "Saving…" : "Save chart entry"}
                        </button>
                      )
                    }
                </>
              </div>
            )}
          </div>
        )
      )}

      {/* ── Release edit modal ── */}
      {canEdit && editRelease && (
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
      {canEdit && editArtist && (
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
