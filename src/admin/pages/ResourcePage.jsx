import { useEffect, useMemo, useRef, useState } from "react";
import { cmsApi, getResults, qs } from "../api";
import DataTable from "../components/DataTable";
import SearchBar from "../components/SearchBar";
import FormModal from "../components/FormModal";
import StatusBadge from "../components/StatusBadge";

const configs = {
  artists: { title: "Artists", endpoint: "/artists/", search: true, fields: ["name", "display_name", "country", "country_code", "genre", "artist_type", "status"], columns: [{key:"name",label:"Artist"},{key:"country_code",label:"Country"},{key:"genre",label:"Genre"},{key:"total_releases",label:"Releases"},{key:"status",label:"Status"}], form: [{name:"image",label:"Artist image",type:"file",help:"Square image, min 800×800 px. JPEG or PNG, max 2 MB."},{name:"name",label:"Artist name"},{name:"display_name",label:"Display name"},{name:"aliases",label:"Aliases JSON",type:"json"},{name:"country",label:"Country"},{name:"country_code",label:"Country code"},{name:"city_region",label:"City/region"},{name:"genre",label:"Genre"},{name:"biography",label:"Biography",type:"textarea"},{name:"artist_type",label:"Artist type"},{name:"verified",label:"Verified",type:"checkbox"},{name:"spotify_url",label:"Spotify URL"},{name:"apple_music_url",label:"Apple Music URL"},{name:"youtube_url",label:"YouTube URL"},{name:"boomplay_url",label:"Boomplay URL"},{name:"audiomack_url",label:"Audiomack URL"},{name:"tiktok_url",label:"TikTok URL"},{name:"instagram_url",label:"Instagram URL"},{name:"x_url",label:"X URL"},{name:"facebook_url",label:"Facebook URL"},{name:"website_url",label:"Website URL"},{name:"status",label:"Status"}] },
  songs: { title: "Songs", endpoint: "/releases/", params:{chart_type:"singles"}, fields: [], columns: [{key:"title",label:"Song"},{key:"artist_display",label:"Main artist(s)"},{key:"country_code",label:"Country"},{key:"release_year",label:"Year"},{key:"status",label:"Status"}] },
  albums: { title: "Albums", endpoint: "/releases/", params:{chart_type:"albums"}, columns: [{key:"title",label:"Album"},{key:"artist_display",label:"Main artist(s)"},{key:"country_code",label:"Country"},{key:"release_year",label:"Year"},{key:"status",label:"Status"}] },
  countries: { title: "Countries", endpoint: "/countries/", columns: [{key:"name",label:"Country"},{key:"code",label:"Code"},{key:"region",label:"Region"},{key:"active",label:"Active"}], form: [{name:"name",label:"Country"},{name:"code",label:"Code"},{name:"region",label:"Region"},{name:"flag",label:"Flag/Initial"},{name:"display_order",label:"Order",type:"number"},{name:"active",label:"Active",type:"checkbox"}] },
  platforms: { title: "Platforms", endpoint: "/platforms/", columns: [{key:"name",label:"Platform"},{key:"short_name",label:"Short"},{key:"color",label:"Color"},{key:"max_chart_size",label:"Max"},{key:"active",label:"Active"}], form: [{name:"name",label:"Name"},{name:"slug",label:"Slug"},{name:"short_name",label:"Short name"},{name:"color",label:"Color"},{name:"brand_color",label:"Brand color"},{name:"chart_size",label:"Source chart size",type:"number"},{name:"max_chart_size",label:"Max chart size",type:"number"},{name:"points_base",label:"Points base",type:"number"},{name:"points_method",label:"Points method"},{name:"supports_singles",label:"Supports singles",type:"checkbox"},{name:"supports_albums",label:"Supports albums",type:"checkbox"},{name:"display_order",label:"Display order",type:"number"},{name:"active",label:"Active",type:"checkbox"}] },
  news: { title: "News CMS", endpoint: "/news/", imageField: "cover_image", columns: [{key:"title",label:"Headline"},{key:"category",label:"Category"},{key:"author",label:"Author"},{key:"status",label:"Status"},{key:"updated_at",label:"Updated",render:(r)=>new Date(r.updated_at).toLocaleDateString()}], form: [{name:"cover_image",label:"Cover image",type:"file",help:"Article hero image. JPEG or PNG, max 5 MB."},{name:"title",label:"Headline"},{name:"slug",label:"Slug"},{name:"subheadline",label:"Subheadline"},{name:"category",label:"Category",type:"select",options:["chart_news","milestones","new_releases","industry_news","artist_news","awards","certifications","records","interviews","editorials","artist_spotlight","albums","analytics","announcement"].map(v=>({value:v,label:v.replace(/_/g," ")}))},{name:"author",label:"Author"},{name:"excerpt",label:"Excerpt",type:"textarea"},{name:"body",label:"Body",type:"textarea"},{name:"gallery",label:"Gallery JSON",type:"json"},{name:"tags",label:"Tags JSON",type:"json"},{name:"source_links",label:"Source links JSON",type:"json"},{name:"seo_title",label:"SEO title"},{name:"seo_description",label:"SEO description",type:"textarea"},{name:"featured",label:"Featured",type:"checkbox"},{name:"pinned",label:"Pinned",type:"checkbox"},{name:"breaking",label:"Breaking",type:"checkbox"},{name:"is_published",label:"Published",type:"checkbox"},{name:"status",label:"Status"}] },
  charts: { title: "Charts", endpoint: "/charts/", columns: [{key:"label",label:"Month"},{key:"chart_type",label:"Type"},{key:"combined_entries_count",label:"Combined entries"},{key:"status",label:"Status"},{key:"locked",label:"Locked"}], form: [{name:"year",label:"Year",type:"number"},{name:"month",label:"Month",type:"number"},{name:"chart_type",label:"Chart type",type:"select",options:[{value:"singles",label:"Singles"},{value:"albums",label:"Albums"}]},{name:"status",label:"Status"},{name:"is_published",label:"Published",type:"checkbox"},{name:"locked",label:"Locked",type:"checkbox"}] },
  certifications: { title: "Certifications", endpoint: "/certifications/", columns: [{key:"title",label:"Release"},{key:"artist",label:"Artist"},{key:"level",label:"Level"},{key:"total_points",label:"Points"},{key:"is_official",label:"Official"}], form: [{name:"release",label:"Release ID",type:"number"},{name:"level",label:"Level",type:"select",options:[{value:"gold",label:"Gold"},{value:"platinum",label:"Platinum"},{value:"diamond",label:"Diamond"}]},{name:"total_points",label:"Points",type:"number"},{name:"is_official",label:"Official",type:"checkbox"},{name:"is_hidden",label:"Hidden from app",type:"checkbox"},{name:"certification_date",label:"Certification date",type:"date"},{name:"previous_level",label:"Previous level"},{name:"notes",label:"Notes",type:"textarea"}] },
  "certification-rules": { title: "Certification Rules", endpoint: "/certification-rules/", columns: [{key:"label",label:"Level"},{key:"threshold",label:"Points threshold"},{key:"active",label:"Active"},{key:"updated_at",label:"Updated",render:(r)=>new Date(r.updated_at).toLocaleDateString()}], form: [{name:"level",label:"Level",type:"select",options:[{value:"gold",label:"Gold"},{value:"platinum",label:"Platinum"},{value:"diamond",label:"Diamond"}]},{name:"threshold",label:"Points threshold",type:"number"},{name:"active",label:"Active",type:"checkbox"}] },
  methodology: { title: "Methodology", endpoint: "/methodology/", columns: [{key:"version",label:"Version"},{key:"name",label:"Name"},{key:"is_active",label:"Active"},{key:"created_at",label:"Created",render:(r)=>new Date(r.created_at).toLocaleDateString()}], form: [{name:"version",label:"Version"},{name:"name",label:"Name"},{name:"config",label:"Methodology JSON",type:"json"},{name:"is_active",label:"Active",type:"checkbox"}] },
  "page-content": { title: "Page Content", endpoint: "/page-content/", columns: [{key:"page",label:"Page"},{key:"section",label:"Section"},{key:"title",label:"Title"},{key:"is_visible",label:"Visible"},{key:"display_order",label:"Order"}], form: [{name:"page",label:"Page"},{name:"section",label:"Section"},{name:"title",label:"Title"},{name:"content",label:"Content",type:"textarea"},{name:"data",label:"Section data JSON",type:"json"},{name:"is_visible",label:"Visible",type:"checkbox"},{name:"display_order",label:"Display order",type:"number"}] },
  media: { title: "Media Library", endpoint: "/media/", imageField: "file", columns: [{key:"title",label:"Title"},{key:"folder",label:"Folder"},{key:"alt_text",label:"Alt text"},{key:"uploaded_at",label:"Uploaded",render:(r)=>new Date(r.uploaded_at).toLocaleDateString()}], form: [{name:"file",label:"File",type:"file",help:"JPEG, PNG, GIF or SVG. Max 5 MB."},{name:"title",label:"Title"},{name:"folder",label:"Folder"},{name:"alt_text",label:"Alt text"},{name:"usage_notes",label:"Usage notes",type:"textarea"}] },
  settings: { title: "Settings", endpoint: "/settings/", columns: [{key:"key",label:"Key"},{key:"group",label:"Group"},{key:"value",label:"Value",render:(r)=>JSON.stringify(r.value)}], form: [{name:"key",label:"Key"},{name:"group",label:"Group"},{name:"description",label:"Description"},{name:"value",label:"Value JSON",type:"json"}] },
  users: { title: "Users & Roles", endpoint: "/users/", columns: [{key:"username",label:"Username"},{key:"email",label:"Email"},{key:"profile",label:"Role",render:(r)=>r.profile?.role_label || "—"},{key:"is_active",label:"Active"}], form: [{name:"username",label:"Username"},{name:"email",label:"Email"},{name:"first_name",label:"First name"},{name:"last_name",label:"Last name"},{name:"role",label:"Role",type:"select",options:["super_admin","admin","editor","data_editor","news_editor","reviewer","viewer"].map(v=>({value:v,label:v.replace(/_/g," ")}))},{name:"password",label:"Password"}] },
  reports: { title: "Reports", endpoint: "/reports/", columns: [{key:"module",label:"Module"},{key:"issue_type",label:"Issue"},{key:"severity",label:"Severity"},{key:"description",label:"Description"},{key:"status",label:"Status"}], form: [{name:"module",label:"Module"},{name:"issue_type",label:"Issue type"},{name:"severity",label:"Severity"},{name:"description",label:"Description",type:"textarea"},{name:"status",label:"Status"}] },
  audit: { title: "Audit Logs", endpoint: "/audit-logs/", readOnly:true, columns: [{key:"created_at",label:"Time",render:(r)=>new Date(r.created_at).toLocaleString()},{key:"user_name",label:"User"},{key:"action",label:"Action"},{key:"module",label:"Module"},{key:"object_repr",label:"Object"}] },
  backups: { title: "Backups", endpoint: "/backups/", columns: [{key:"status",label:"Status"},{key:"file",label:"File"},{key:"created_at",label:"Created",render:(r)=>new Date(r.created_at).toLocaleString()}], form: [{name:"status",label:"Status"},{name:"notes",label:"Notes",type:"textarea"}] },
};

function releaseForm(chartType, artistOptions){ return [{name:"cover_image",label:"Cover image",type:"file",help:"Square image, min 1000×1000 px. JPEG or PNG, max 2 MB."},{name:"title",label:"Title"},{name:"primary_artist_ids",label:"Main artists (ordered)",type:"ordered-multiselect",options:artistOptions,help:"The first artist is the lead. Two artists display with &, while three or more use commas and & before the last."},{name:"featured_artist_ids",label:"Featuring (ordered)",type:"ordered-multiselect",options:artistOptions,help:"Featured artists display after ft and may include more than one artist."},{name:"chart_type",label:"Chart type",type:"select",options:[{value:chartType,label:chartType}]},{name:"canonical_title",label:"Canonical title"},{name:"featured_artists",label:"Unlinked featured names",help:"Fallback for a featured artist who does not yet have an Artist record."},{name:"credited_artists",label:"Other credited artists / notes"},{name:"songwriters",label:"Songwriters",type:"tags"},{name:"producers",label:"Producers",type:"tags"},{name:"release_year",label:"Release year",type:"number"},{name:"release_date",label:"Release date",type:"date"},{name:"isrc",label:"ISRC"},{name:"upc",label:"UPC"},{name:"number_of_tracks",label:"Number of tracks",type:"number"},{name:"country",label:"Country"},{name:"country_code",label:"Country code"},{name:"genre",label:"Genre"},{name:"label",label:"Label"},{name:"distributor",label:"Distributor"},{name:"spotify_url",label:"Spotify URL"},{name:"apple_music_url",label:"Apple Music URL"},{name:"boomplay_url",label:"Boomplay URL"},{name:"audiomack_url",label:"Audiomack URL"},{name:"youtube_url",label:"YouTube URL"},{name:"tiktok_url",label:"TikTok URL"},{name:"shazam_url",label:"Shazam URL"},{name:"radio_info",label:"Radio info",type:"textarea"},{name:"status",label:"Status"}]; }

// Resources that support status filtering and ordering in the CMS toolbar
const STATUS_TYPES    = new Set(["songs", "albums", "artists"]);
// Resources that show the A–Z alphabet bar
const ALPHA_TYPES     = new Set(["artists", "songs", "albums", "news", "countries"]);
const ALPHABET        = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const ORDERING_OPTIONS = {
  songs:   [["","Default"],["title","Title A–Z"],["-title","Title Z–A"],["-release_year","Newest first"],["release_year","Oldest first"],["-updated_at","Recently updated"]],
  albums:  [["","Default"],["title","Title A–Z"],["-title","Title Z–A"],["-release_year","Newest first"],["release_year","Oldest first"],["-updated_at","Recently updated"]],
  artists: [["","Default"],["name","Name A–Z"],["-name","Name Z–A"],["country","Country A–Z"],["-updated_at","Recently updated"]],
};

export default function ResourcePage({ type, searchJump }) {
  const config = configs[type] || configs.artists;
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");   // "" = all, "active", "archived"
  const [ordering, setOrdering] = useState("");
  const [alphaFilter, setAlphaFilter] = useState("");     // "" = all, "A"–"Z"
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [artistOptions, setArtistOptions] = useState([]);
  const [imageModal, setImageModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);   // release to hard-delete
  const [mergeTarget, setMergeTarget] = useState(null);     // { dup, keeperSearch, keeperResults, keeper }
  const [dupGroups, setDupGroups] = useState(null);         // null=hidden, []=loading, [...]=groups
  const [actionBusy, setActionBusy] = useState(false);
  const [detailRow, setDetailRow] = useState(null);
  const abortRef = useRef(null);

  // Apply search term from global search result click
  useEffect(() => {
    if (searchJump && searchJump.page === type && searchJump.term) {
      setSearch(searchJump.term);
    }
  }, [searchJump]);

  const params = useMemo(() => ({
    ...(config.params || {}),
    search,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(ordering ? { ordering } : {}),
    ...(alphaFilter ? { starts_with: alphaFilter } : {}),
  }), [config, search, statusFilter, ordering, alphaFilter]);
  const formFields = useMemo(() => type === "songs" || type === "albums" ? releaseForm(type === "albums" ? "albums" : "singles", artistOptions) : (config.form || []), [type, config, artistOptions]);

  // Used after save/delete to reload without debounce
  async function load() {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true); setError("");
    try { setRows(getResults(await cmsApi.get(`${config.endpoint}${qs(params)}`, { signal: controller.signal }))); }
    catch(e) { if (e.name !== "AbortError") setError(e.message); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }

  // Reset search and filters when switching resource types
  useEffect(() => { setSearch(""); setStatusFilter(""); setOrdering(""); setAlphaFilter(""); }, [type]);

  // Debounced load — re-runs when any filter changes; typed search gets 280ms debounce
  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const delay = search ? 280 : 0;
    const timer = setTimeout(async () => {
      setLoading(true); setError("");
      try { setRows(getResults(await cmsApi.get(`${config.endpoint}${qs(params)}`, { signal: controller.signal }))); }
      catch(e) { if (e.name !== "AbortError") setError(e.message); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, delay);
    return () => clearTimeout(timer);
  }, [type, params]);
  useEffect(() => {
    if (type !== "songs" && type !== "albums") return;
    cmsApi.get("/artists/options/").then(setArtistOptions).catch((e) => setError(e.message));
  }, [type]);

  async function save(form) {
    setError("");
    const fileFieldNames = new Set(formFields.filter(f => f.type === "file").map(f => f.name));
    const fileEntries = Object.entries(form).filter(([, v]) => v instanceof File);
    const jsonForm = Object.fromEntries(
      Object.entries(form).filter(([k, v]) => {
        if (v instanceof File) return false;
        // Exclude all string values for file fields — DRF ImageField rejects plain strings
        // (including empty string ""), which causes a 500. null is still allowed through
        // so the user can explicitly clear an image.
        if (fileFieldNames.has(k) && typeof v === "string") return false;
        return true;
      })
    );

    // Step 1: save all non-file fields as JSON
    let savedId = editing?.id;
    try {
      if (savedId) {
        await cmsApi.patch(`${config.endpoint}${savedId}/`, jsonForm);
      } else {
        const created = await cmsApi.post(config.endpoint, jsonForm);
        savedId = created?.id;
      }
    } catch(e) {
      // DRF returns field-level errors as {field: [msg, ...]} — flatten them for display
      if (e.data && typeof e.data === "object" && !e.data.detail && !e.data.error) {
        const lines = Object.entries(e.data).map(([field, msgs]) =>
          `${field}: ${Array.isArray(msgs) ? msgs.join(", ") : msgs}`
        );
        setError(lines.join(" | "));
      } else {
        setError(e.message);
      }
      return;
    }

    // Step 2: upload any files separately as multipart
    if (fileEntries.length > 0 && savedId) {
      try {
        const fd = new FormData();
        fileEntries.forEach(([key, file]) => fd.append(key, file));
        await cmsApi.patch(`${config.endpoint}${savedId}/`, fd);
      } catch(e) {
        // Record was saved in Step 1 — close modal and reload, but surface the image error
        setModal(false); setEditing(null); setDetailRow(null); load();
        setError(`Record saved, but image upload failed: ${e.message}`);
        return;
      }
    }

    // Step 3: if an existing artist's country changed, cascade country_code (and country
    // name) to all releases where this artist is the primary artist — best-effort.
    if (type === "artists" && savedId && editing?.id) {
      const oldCode = (editing.country_code || "").trim().toUpperCase();
      const newCode = (form.country_code || "").trim().toUpperCase();
      if (newCode && oldCode !== newCode) {
        try {
          const artistName = (editing.name || "").trim().toLowerCase();
          // Extract primary (first) artist from display strings like "A & B" or "A, B"
          const primaryOf = s => String(s || "").split(/\s*[,&]\s*/)[0].trim().toLowerCase();
          const relData = await cmsApi.get(`/releases/?primary_artist=${savedId}&page_size=500`);
          const releases = getResults(relData).filter(r =>
            primaryOf(r.artist_display || r.primary_artist || "") === artistName
          );
          const updates = { country_code: newCode };
          if (form.country && form.country.trim()) updates.country = form.country.trim();
          await Promise.all(releases.map(r => cmsApi.patch(`/releases/${r.id}/`, updates)));
        } catch { /* best-effort — artist was saved regardless */ }
      }
    }

    setModal(false); setEditing(null); setDetailRow(null); load();
  }

  const isRelease = type === "songs" || type === "albums";
  const isArtist = type === "artists";
  const isActionable = isRelease || isArtist;
  const isCertifications = type === "certifications";

  // Canonical thresholds: Diamond ≥600, Platinum ≥400, Gold ≥200
  function correctCertLevel(points) {
    const p = Number(points) || 0;
    if (p >= 600) return "diamond";
    if (p >= 400) return "platinum";
    if (p >= 200) return "gold";
    return null;
  }

  async function recalcCertLevels() {
    if (actionBusy) return;
    setActionBusy(true);
    setError("");
    try {
      const all = getResults(await cmsApi.get("/certifications/?page_size=2000"));
      let fixed = 0;
      for (const cert of all) {
        const correct = correctCertLevel(cert.total_points);
        if (correct && cert.level !== correct) {
          await cmsApi.patch(`/certifications/${cert.id}/`, { level: correct });
          fixed++;
        }
      }
      if (fixed === 0) {
        setError("All certification levels are already correct.");
      } else {
        setError(`Fixed ${fixed} certification level${fixed !== 1 ? "s" : ""} — refresh the dashboard to clear the alert.`);
        load();
      }
    } catch(e) { setError(e.message); }
    finally { setActionBusy(false); }
  }

  async function markAllOfficial() {
    if (actionBusy) return;
    if (!window.confirm("Mark all non-official certifications as official? This makes them fully public.")) return;
    setActionBusy(true);
    setError("");
    try {
      const all = getResults(await cmsApi.get("/certifications/?page_size=2000"));
      const unofficial = all.filter(c => !c.is_official);
      if (unofficial.length === 0) { setError("No unofficial certifications found."); return; }
      for (const cert of unofficial) {
        await cmsApi.patch(`/certifications/${cert.id}/`, { is_official: true });
      }
      setError(`Marked ${unofficial.length} certification${unofficial.length !== 1 ? "s" : ""} as official — refresh the dashboard to clear the alert.`);
      load();
    } catch(e) { setError(e.message); }
    finally { setActionBusy(false); }
  }

  // Returns chart IDs that contain entries for the given release.
  // Called BEFORE delete/merge while the entries still exist.
  async function getAffectedChartIds(releaseId) {
    try {
      const data = await cmsApi.get(`/chart-entries/?release=${releaseId}&page_size=500`);
      return [...new Set(getResults(data).map(e => e.chart).filter(Boolean))];
    } catch { return []; }
  }

  // Re-ranks all entries in chartIds by total_points DESC for every platform
  // (combined + each active platform) to close rank gaps after delete/merge.
  async function reRankAffectedCharts(chartIds) {
    if (!chartIds.length) return;
    let platformKeys = ["combined"];
    try {
      const pd = await cmsApi.get("/platforms/?active=true&page_size=100");
      platformKeys = ["combined", ...getResults(pd).map(p => p.id)];
    } catch {}
    for (const chartId of chartIds) {
      for (const platform of platformKeys) {
        try {
          const entries = getResults(await cmsApi.get(
            `/chart-entries/?chart=${chartId}&platform=${platform}&ordering=-total_points&page_size=200`
          ));
          for (let i = 0; i < entries.length; i++) {
            if (entries[i].rank !== i + 1) {
              await cmsApi.patch(`/chart-entries/${entries[i].id}/`, { rank: i + 1 });
            }
          }
        } catch {}
      }
    }
  }

  // Artist merge API:   POST /artists/{KEEPER}/merge/  { artist_ids: [dup] }
  // Release merge API:  POST /releases/{DUP}/merge/   { into_id: keeper }
  async function callMergeApi(dupRow, keeperRow) {
    if (isArtist) {
      await cmsApi.post(`${config.endpoint}${keeperRow.id}/merge/`, { artist_ids: [dupRow.id] });
    } else {
      await cmsApi.post(`${config.endpoint}${dupRow.id}/merge/`, { into_id: keeperRow.id });
    }
  }

  async function hardDelete() {
    if (!deleteTarget || actionBusy) return;
    setActionBusy(true);
    try {
      const isRelease = type === "songs" || type === "albums";
      const affectedChartIds = isRelease
        ? await getAffectedChartIds(deleteTarget.id)
        : [];
      await cmsApi.delete(`${config.endpoint}${deleteTarget.id}/hard_delete/`);
      if (affectedChartIds.length) {
        await reRankAffectedCharts(affectedChartIds);
      }
      setDeleteTarget(null);
      load();
    } catch(e) { setError(e.message); }
    finally { setActionBusy(false); }
  }

  async function searchForKeeper(q) {
    if (!q.trim()) { setMergeTarget(t => ({ ...t, keeperResults: [] })); return; }
    try {
      const results = getResults(await cmsApi.get(
        `${config.endpoint}${qs({ ...config.params, search: q, page_size: 8 })}`
      ));
      setMergeTarget(t => ({
        ...t,
        keeperResults: results.filter(r => r.id !== t.dup.id),
      }));
    } catch {}
  }

  async function doMerge() {
    if (!mergeTarget?.keeper || actionBusy) return;
    setActionBusy(true);
    try {
      const isRelease = type === "songs" || type === "albums";
      const affectedChartIds = isRelease
        ? await getAffectedChartIds(mergeTarget.dup.id)
        : [];
      await callMergeApi(mergeTarget.dup, mergeTarget.keeper);
      if (affectedChartIds.length) {
        await reRankAffectedCharts(affectedChartIds);
      }
      setMergeTarget(null);
      setDupGroups(null);
      load();
    } catch(e) { setError(e.message); }
    finally { setActionBusy(false); }
  }

  async function loadDuplicates() {
    setDupGroups([]);
    try {
      const data = await cmsApi.get(`${config.endpoint}duplicates/${qs(config.params || {})}`);
      setDupGroups(data.groups || []);
    } catch(e) { setError(e.message); setDupGroups(null); }
  }

  async function mergeEntireGroup(group) {
    if (actionBusy) return;
    const keeper = group[0];
    const dups = group.slice(1);
    setActionBusy(true);
    try {
      for (const dup of dups) {
        await callMergeApi(dup, keeper);
      }
      loadDuplicates();
      load();
    } catch(e) { setError(e.message); }
    finally { setActionBusy(false); }
  }

  async function saveImage(file) {
    if (!file || !imageModal) return;
    try {
      const fd = new FormData();
      fd.append(imageModal.field, file);
      await cmsApi.patch(`${config.endpoint}${imageModal.id}/`, fd);
      setImageModal(null); load();
    } catch(e) { setError(e.message); }
  }

  const imageField = config.imageField || (type === "artists" ? "image" : (type === "songs" || type === "albums") ? "cover_image" : null);
  const titleKey = type === "artists" ? "name" : "title";

  const actionsColumn = isActionable ? {
    key: "_actions",
    label: "",
    render: (row) => (
      <span style={{ display: "flex", gap: "5px" }} onClick={e => e.stopPropagation()}>
        <button
          className="cms-btn light"
          style={{ fontSize: "11px", padding: "2px 9px" }}
          title="Merge this into another record"
          onClick={() => setMergeTarget({ dup: row, keeperSearch: "", keeperResults: [], keeper: null })}
        >Merge</button>
        <button
          className="cms-btn danger"
          style={{ fontSize: "11px", padding: "2px 9px" }}
          title="Permanently delete this release and all its chart entries"
          onClick={() => setDeleteTarget(row)}
        >Delete</button>
      </span>
    ),
  } : null;

  const tableColumns = imageField ? config.columns.map((col) => {
    if (col.key !== titleKey) return col;
    return {
      ...col,
      render: (row) => {
        const imgUrl = row[imageField];
        return (
          <span style={{display:"flex",alignItems:"center",gap:"9px"}}>
            <button
              type="button"
              className={"cms-img-thumb" + (imgUrl ? " has-img" : "")}
              title={imgUrl ? "Replace image" : "Add image"}
              onClick={(e) => { e.stopPropagation(); setImageModal({ id: row.id, name: row[titleKey], field: imageField, current: imgUrl || null }); }}
            >
              {imgUrl ? <img src={imgUrl} alt="" /> : <span>+</span>}
            </button>
            {row[col.key] || "—"}
          </span>
        );
      },
    };
  }) : config.columns;

  const finalColumns = actionsColumn ? [...tableColumns, actionsColumn] : tableColumns;

  return (
    <section>
      <div className="cms-page-head">
        <div><h1>{config.title}</h1><p>Manage {config.title.toLowerCase()} from the CMS.</p></div>
        {!config.readOnly && <button className="cms-btn" onClick={() => { setEditing(null); setModal(true); }}>Add new</button>}
      </div>
      {error && <div className="cms-alert error">{error}</div>}
      <div className="cms-toolbar">
        <SearchBar value={search} onChange={v => setSearch(v)} placeholder={`Search ${config.title.toLowerCase()}…`} />
        {STATUS_TYPES.has(type) && (
          <select
            className="cms-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            title="Filter by status"
            style={{ fontSize: 13, padding: "4px 8px" }}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        )}
        {ORDERING_OPTIONS[type] && (
          <select
            className="cms-select"
            value={ordering}
            onChange={e => setOrdering(e.target.value)}
            title="Sort order"
            style={{ fontSize: 13, padding: "4px 8px" }}
          >
            {ORDERING_OPTIONS[type].map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        )}
        {isActionable && (
          <button className="cms-btn light" onClick={dupGroups === null ? loadDuplicates : () => setDupGroups(null)}>
            {dupGroups === null ? "Find duplicates" : "Hide duplicates"}
          </button>
        )}
        {isCertifications && (
          <>
            <button
              className="cms-btn light"
              disabled={actionBusy}
              title="Recalculate every certification's level from its total points (💎 ≥600, 🎵 ≥400, 📀 ≥200)"
              onClick={recalcCertLevels}
            >
              {actionBusy ? "Fixing…" : "Recalculate levels"}
            </button>
            <button
              className="cms-btn light"
              disabled={actionBusy}
              title="Mark all unofficial certifications as is_official=true"
              onClick={markAllOfficial}
            >
              Mark all official
            </button>
          </>
        )}
      </div>

      {/* A–Z alphabet bar */}
      {ALPHA_TYPES.has(type) && (
        <div className="cms-alpha-bar" style={{ background: "#f7f5f0", border: "1px solid #e8e0cc", borderRadius: 8, padding: "8px 12px", margin: "0 0 12px", display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: ".05em", marginRight: 4 }}>A–Z:</span>
          <button
            type="button"
            style={{ minWidth: 40, height: 28, padding: "0 10px", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", background: !alphaFilter ? "#b8860b" : "#fff", color: !alphaFilter ? "#fff" : "#555", boxShadow: !alphaFilter ? "0 1px 4px rgba(184,134,11,.35)" : "0 1px 2px rgba(0,0,0,.08)" }}
            onClick={() => setAlphaFilter("")}
          >All</button>
          {ALPHABET.map(letter => (
            <button
              key={letter}
              type="button"
              style={{ width: 28, height: 28, border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", background: alphaFilter === letter ? "#b8860b" : "#fff", color: alphaFilter === letter ? "#fff" : "#555", boxShadow: alphaFilter === letter ? "0 1px 4px rgba(184,134,11,.35)" : "0 1px 2px rgba(0,0,0,.08)" }}
              onClick={() => setAlphaFilter(alphaFilter === letter ? "" : letter)}
            >{letter}</button>
          ))}
          {(alphaFilter || search) && (
            <span style={{ marginLeft: 6, fontSize: 11, color: "#b8860b", fontWeight: 600 }}>
              {alphaFilter && search ? `${alphaFilter}… + "${search}"` : alphaFilter ? `Showing: ${alphaFilter}` : `"${search}"`}
              {alphaFilter && (
                <button type="button" onClick={() => setAlphaFilter("")} style={{ border: "none", background: "none", color: "#b8860b", cursor: "pointer", fontSize: 12, padding: "0 0 0 6px", fontWeight: 700 }}>✕ letter</button>
              )}
            </span>
          )}
        </div>
      )}

      {/* Duplicates panel */}
      {isActionable && dupGroups !== null && (
        <div style={{ border: "1px solid #e2c97e", borderRadius: 8, margin: "12px 0", padding: "14px 18px", background: "#fffdf4" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <strong style={{ fontSize: 13 }}>
              {dupGroups.length === 0 ? "No duplicates found" : `${dupGroups.length} duplicate group(s)`}
            </strong>
            <button className="cms-btn light" style={{ fontSize: 11 }} onClick={loadDuplicates}>Refresh</button>
          </div>
          {dupGroups.map((group, gi) => {
            const label = isArtist
              ? `${group[0]?.name} (${group[0]?.release_count ?? 0} releases)`
              : `${group[0]?.title} — ${group[0]?.artist_display} (${group[0]?.chart_type})`;
            return (
              <div key={gi} style={{ borderTop: "1px solid #f0e4b4", paddingTop: 8, marginTop: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: "#666" }}><strong>{label}</strong></span>
                  <button
                    className="cms-btn"
                    style={{ fontSize: 11, padding: "2px 12px" }}
                    disabled={actionBusy}
                    onClick={() => mergeEntireGroup(group)}
                  >Merge all → keep best</button>
                </div>
                <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ color: "#999", textAlign: "left" }}>
                      <th style={{ padding: "2px 6px" }}>ID</th>
                      <th style={{ padding: "2px 6px" }}>{isArtist ? "Name" : "Title"}</th>
                      {!isArtist && <th style={{ padding: "2px 6px" }}>Artist</th>}
                      <th style={{ padding: "2px 6px" }}>{isArtist ? "Releases" : "Entries"}</th>
                      {!isArtist && <th style={{ padding: "2px 6px" }}>Img</th>}
                      <th style={{ padding: "2px 6px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.map((r, ri) => (
                      <tr key={r.id} style={{ background: ri === 0 ? "#f5fce8" : "transparent" }}>
                        <td style={{ padding: "2px 6px", color: "#888" }}>{r.id}</td>
                        <td style={{ padding: "2px 6px" }}>
                          {isArtist ? r.name : r.title}
                          {ri === 0 && <span style={{ color: "#5a9a2f", fontSize: 10, marginLeft: 4 }}>◀ keep</span>}
                        </td>
                        {!isArtist && <td style={{ padding: "2px 6px" }}>{r.artist_display}</td>}
                        <td style={{ padding: "2px 6px" }}>{isArtist ? r.release_count : r.entry_count}</td>
                        {!isArtist && <td style={{ padding: "2px 6px" }}>{r.cover_image ? "✓" : "—"}</td>}
                        <td style={{ padding: "2px 6px" }}>
                          {ri > 0 && (
                            <button
                              className="cms-btn danger"
                              style={{ fontSize: 10, padding: "1px 7px" }}
                              disabled={actionBusy}
                              onClick={() => setMergeTarget({ dup: r, keeperSearch: "", keeperResults: [], keeper: group[0] })}
                            >Merge into #{group[0].id}</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {loading ? <div className="cms-empty">Loading...</div> : (
        <DataTable columns={finalColumns} rows={rows} onRowClick={(row) => setDetailRow(row)} />
      )}
      <FormModal open={modal} title={`${editing ? "Edit" : "Create"} ${config.title}`} entityId={editing?.id} fields={formFields} initial={editing || defaultInitial(formFields)} onSubmit={save} onClose={() => setModal(false)} />

      {/* Detail panel */}
      {detailRow && (() => {
        const r = detailRow;
        const statBox = (label, value) => (
          <div key={label} style={{ background: "#f8f8f8", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{value ?? "—"}</div>
            <div style={{ fontSize: 10, color: "#888", marginTop: 2, textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</div>
          </div>
        );
        const metaRow = (label, value) => value ? (
          <div key={label} style={{ display: "flex", gap: 8, padding: "5px 0", borderBottom: "1px solid #f5f5f5", fontSize: 12 }}>
            <span style={{ color: "#aaa", minWidth: 110, flexShrink: 0 }}>{label}</span>
            <span style={{ color: "#333", fontWeight: 500, wordBreak: "break-word" }}>{value}</span>
          </div>
        ) : null;
        const linkPill = (href, label) => href ? (
          <a key={label} href={href} target="_blank" rel="noreferrer"
            style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "1px solid #ddd", color: "#444", textDecoration: "none", background: "#fafafa" }}>
            {label} ↗
          </a>
        ) : null;

        return (
          <div className="cms-modal-backdrop" onClick={() => setDetailRow(null)}>
            <div className="cms-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 680, width: "95vw" }}>
              {/* Header */}
              <div className="cms-modal-head">
                <h3 style={{ fontSize: 15 }}>
                  {isRelease ? r.title : isArtist ? (r.display_name || r.name) : String(r[config.columns[0]?.key] || "Detail")}
                </h3>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {!config.readOnly && (
                    <button className="cms-btn light" style={{ fontSize: 12, padding: "4px 12px" }}
                      onClick={() => { setDetailRow(null); setEditing(r); setModal(true); }}>
                      Edit
                    </button>
                  )}
                  <button type="button" onClick={() => setDetailRow(null)} style={{ fontSize: 20, lineHeight: 1 }}>×</button>
                </div>
              </div>

              <div style={{ overflowY: "auto", maxHeight: "74vh", padding: "2px 0" }}>
                {isRelease ? (
                  <>
                    {/* Identity row */}
                    <div style={{ display: "flex", gap: 16, marginBottom: 18 }}>
                      {r.cover_image
                        ? <img src={r.cover_image} alt="" style={{ width: 96, height: 96, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                        : <div style={{ width: 96, height: 96, borderRadius: 8, background: "#f0f0f0", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>{type === "albums" ? "💿" : "🎵"}</div>
                      }
                      <div>
                        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{r.title}</div>
                        <div style={{ fontSize: 13, color: "#555", marginBottom: 8 }}>{r.artist_credit || r.artist_display}</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                          <StatusBadge value={r.status} />
                          <span style={{ fontSize: 11, color: "#aaa" }}>{r.chart_type} · id {r.id}</span>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
                      {statBox("Total Points", r.total_points?.toLocaleString() ?? 0)}
                      {statBox("Peak Rank", r.peak_rank ? `#${r.peak_rank}` : "—")}
                      {statBox("Months on Chart", r.months_on_chart ?? 0)}
                      {statBox("Chart Entries", r.entry_count ?? "—")}
                    </div>

                    {/* Certifications */}
                    {r.certifications?.length > 0 && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
                        <span style={{ fontSize: 11, color: "#888" }}>Certifications:</span>
                        {r.certifications.map((c, i) => {
                          const lvl = typeof c === "string" ? c : c.level;
                          const colors = { gold: ["#fef9e7","#b8860b"], platinum: ["#f4f4f4","#777"], diamond: ["#eef6ff","#1d6fa4"] };
                          const [bg, fg] = colors[lvl] || ["#f0f0f0","#555"];
                          return <span key={i} style={{ fontSize: 11, fontWeight: 700, background: bg, color: fg, border: `1px solid ${fg}`, borderRadius: 4, padding: "2px 9px", textTransform: "capitalize" }}>{lvl}</span>;
                        })}
                      </div>
                    )}

                    {/* Metadata */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px", marginBottom: 14 }}>
                      {metaRow("ISRC", r.isrc)}
                      {metaRow("UPC", r.upc)}
                      {metaRow("Label", r.label)}
                      {metaRow("Distributor", r.distributor)}
                      {metaRow("Year", r.release_year)}
                      {metaRow("Genre", r.genre)}
                      {metaRow("Country", [r.country, r.country_code].filter(Boolean).join(" · "))}
                      {metaRow("Canonical title", r.canonical_title)}
                      {metaRow("Songwriters", Array.isArray(r.songwriters) ? r.songwriters.join(", ") : r.songwriters)}
                      {metaRow("Producers", Array.isArray(r.producers) ? r.producers.join(", ") : r.producers)}
                    </div>

                    {/* Streaming links */}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {[["spotify_url","Spotify"],["apple_music_url","Apple Music"],["youtube_url","YouTube"],["boomplay_url","Boomplay"],["audiomack_url","Audiomack"],["tiktok_url","TikTok"],["shazam_url","Shazam"]].map(([k,l]) => linkPill(r[k],l))}
                    </div>
                  </>
                ) : isArtist ? (
                  <>
                    {/* Identity row */}
                    <div style={{ display: "flex", gap: 16, marginBottom: 18 }}>
                      {r.image
                        ? <img src={r.image} alt="" style={{ width: 96, height: 96, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                        : <div style={{ width: 96, height: 96, borderRadius: "50%", background: "#f0f0f0", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>👤</div>
                      }
                      <div>
                        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 2 }}>{r.display_name || r.name}</div>
                        {r.display_name && r.display_name !== r.name && <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>aka {r.name}</div>}
                        <div style={{ fontSize: 13, color: "#555", marginBottom: 8 }}>
                          {[r.country, r.genre, r.artist_type].filter(Boolean).join(" · ")}
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                          <StatusBadge value={r.status} />
                          {r.verified && <span style={{ fontSize: 11, background: "#e8f4fd", color: "#1d6fa4", borderRadius: 4, padding: "2px 7px", fontWeight: 600 }}>✓ Verified</span>}
                          <span style={{ fontSize: 11, color: "#aaa" }}>id {r.id}</span>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
                      {statBox("Total Points", r.total_points?.toLocaleString() ?? 0)}
                      {statBox("Peak Rank", r.peak_rank ? `#${r.peak_rank}` : "—")}
                      {statBox("Months on Chart", r.months_on_chart ?? 0)}
                      {statBox("Total Releases", r.total_releases ?? 0)}
                    </div>

                    {/* Bio */}
                    {r.biography && (
                      <div style={{ fontSize: 13, color: "#555", lineHeight: 1.6, background: "#f9f9f9", borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
                        {r.biography}
                      </div>
                    )}

                    {/* Metadata */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px", marginBottom: 14 }}>
                      {metaRow("City / Region", r.city_region)}
                      {metaRow("Aliases", (r.aliases || []).join(", "))}
                    </div>

                    {/* Social links */}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {[["spotify_url","Spotify"],["apple_music_url","Apple Music"],["youtube_url","YouTube"],["boomplay_url","Boomplay"],["audiomack_url","Audiomack"],["tiktok_url","TikTok"],["instagram_url","Instagram"],["x_url","X"],["facebook_url","Facebook"],["website_url","Website"]].map(([k,l]) => linkPill(r[k],l))}
                    </div>
                  </>
                ) : (
                  /* Generic: show all columns + extra fields */
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
                    {config.columns.map(col => {
                      const val = col.render ? null : r[col.key];
                      return metaRow(col.label, val !== undefined && val !== null && val !== "" ? String(val) : null);
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
      {imageModal && (
        <div className="cms-modal-backdrop" onClick={() => setImageModal(null)}>
          <div className="cms-modal cms-img-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cms-modal-head">
              <h3>{imageModal.current ? "Replace" : "Add"} image</h3>
              <button type="button" onClick={() => setImageModal(null)}>×</button>
            </div>
            <p className="cms-img-modal-name">{imageModal.name}</p>
            {imageModal.current && (
              <img src={imageModal.current} alt="Current" className="cms-img-modal-preview" />
            )}
            <label style={{display:"flex",flexDirection:"column",gap:"7px",margin:"14px 0 0"}}>
              <span>Choose new image</span>
              <input type="file" accept="image/*" onChange={(e) => { if (e.target.files[0]) saveImage(e.target.files[0]); }} />
            </label>
            <div className="cms-actions right" style={{marginTop:"18px"}}>
              <button type="button" className="cms-btn light" onClick={() => setImageModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {/* Delete confirm modal */}
      {deleteTarget && (
        <div className="cms-modal-backdrop" onClick={() => !actionBusy && setDeleteTarget(null)}>
          <div className="cms-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="cms-modal-head">
              <h3>Delete permanently?</h3>
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={actionBusy}>×</button>
            </div>
            <p style={{ margin: "10px 0 4px", fontSize: 14 }}>
              <strong>"{deleteTarget.title}"</strong> by {deleteTarget.artist_display}
            </p>
            <p style={{ fontSize: 13, color: "#c0392b", margin: "0 0 16px" }}>
              This will permanently delete the release and all its chart entries and certifications. This cannot be undone.
            </p>
            <div className="cms-actions right">
              <button className="cms-btn light" onClick={() => setDeleteTarget(null)} disabled={actionBusy}>Cancel</button>
              <button className="cms-btn danger" onClick={hardDelete} disabled={actionBusy}>
                {actionBusy ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Merge modal */}
      {mergeTarget && (() => {
        const isArtistType = type === "artists";
        const rLabel = r => isArtistType ? (r.name || "") : (r.title || "");
        const rSub   = r => isArtistType ? [r.country, r.country_code].filter(Boolean).join(" · ") : (r.artist_display || "");
        const rMeta  = r => isArtistType ? `${r.total_releases ?? 0} release(s)` : [r.release_year, r.isrc].filter(Boolean).join(" · ");
        const typeLabel = isArtistType ? "artist" : type === "albums" ? "album" : "song";
        const { dup, keeper } = mergeTarget;
        return (
          <div className="cms-modal-backdrop" onClick={() => !actionBusy && setMergeTarget(null)}>
            <div className="cms-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
              <div className="cms-modal-head">
                <h3>Merge {typeLabel}</h3>
                <button type="button" onClick={() => setMergeTarget(null)} disabled={actionBusy}>×</button>
              </div>

              {keeper ? (
                /* ── Both records known: show DELETE / KEEP comparison ── */
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "14px 0" }}>
                    {/* DELETE card */}
                    <div style={{ border: "1.5px solid #fca5a5", borderRadius: 10, padding: "12px 14px", background: "#fff5f5", display: "flex", flexDirection: "column", gap: 3 }}>
                      <div style={{ fontSize: 9, fontWeight: 800, color: "#dc2626", textTransform: "uppercase", letterSpacing: ".09em", marginBottom: 2 }}>Delete</div>
                      <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.35 }}>{rLabel(dup)}</div>
                      {rSub(dup) && <div style={{ fontSize: 11, color: "#666" }}>{rSub(dup)}</div>}
                      {rMeta(dup) && <div style={{ fontSize: 10, color: "#aaa" }}>{rMeta(dup)}</div>}
                      <div style={{ fontSize: 10, color: "#ccc" }}>id {dup.id}</div>
                      <button
                        type="button"
                        className="cms-btn light"
                        style={{ marginTop: 8, fontSize: 11, padding: "5px 10px" }}
                        disabled={actionBusy}
                        onClick={() => setMergeTarget(t => ({ ...t, dup: t.keeper, keeper: t.dup }))}
                      >⇄ Keep this instead</button>
                    </div>
                    {/* KEEP card */}
                    <div style={{ border: "1.5px solid #86efac", borderRadius: 10, padding: "12px 14px", background: "#f0fdf4", display: "flex", flexDirection: "column", gap: 3 }}>
                      <div style={{ fontSize: 9, fontWeight: 800, color: "#16a34a", textTransform: "uppercase", letterSpacing: ".09em", marginBottom: 2 }}>✓ Keep</div>
                      <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.35 }}>{rLabel(keeper)}</div>
                      {rSub(keeper) && <div style={{ fontSize: 11, color: "#666" }}>{rSub(keeper)}</div>}
                      {rMeta(keeper) && <div style={{ fontSize: 10, color: "#aaa" }}>{rMeta(keeper)}</div>}
                      <div style={{ fontSize: 10, color: "#ccc" }}>id {keeper.id}</div>
                      <button
                        type="button"
                        className="cms-btn light"
                        style={{ marginTop: 8, fontSize: 11, padding: "5px 10px" }}
                        disabled={actionBusy}
                        onClick={() => setMergeTarget(t => ({ ...t, keeper: null, keeperSearch: "", keeperResults: [] }))}
                      >Change keeper…</button>
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: "#888", margin: "0 0 14px" }}>
                    {isArtistType
                      ? "The deleted artist's releases move to the kept artist. Aliases are preserved."
                      : "Monthly chart points are summed into the kept record. Weekly entries on the same chart in the same week are dropped. Certifications are recalculated."}
                  </p>
                </>
              ) : (
                /* ── Keeper not yet chosen: show search ── */
                <>
                  <p style={{ fontSize: 13, margin: "10px 0 12px", color: "#555" }}>
                    <strong>Record to delete:</strong> {rLabel(dup)}{" "}
                    <span style={{ fontSize: 11, color: "#aaa" }}>id {dup.id}</span>
                  </p>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".07em", color: "#666", marginBottom: 6 }}>
                    Search for the {typeLabel} to keep
                  </label>
                  <input
                    className="cms-search"
                    placeholder={`Search ${typeLabel}s…`}
                    style={{ width: "100%", boxSizing: "border-box", marginBottom: 8 }}
                    value={mergeTarget.keeperSearch}
                    autoFocus
                    onChange={e => {
                      const q = e.target.value;
                      setMergeTarget(t => ({ ...t, keeperSearch: q, keeperResults: [] }));
                      searchForKeeper(q);
                    }}
                  />
                  {mergeTarget.keeperResults.length > 0 && (
                    <div style={{ border: "1px solid #e5e5e5", borderRadius: 8, marginBottom: 14, maxHeight: 200, overflowY: "auto" }}>
                      {mergeTarget.keeperResults.map(r => (
                        <button
                          key={r.id}
                          type="button"
                          style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "9px 12px", fontSize: 13, border: "none", borderBottom: "1px solid #f0f0f0", background: "transparent", cursor: "pointer" }}
                          onClick={() => setMergeTarget(t => ({ ...t, keeper: r, keeperSearch: rLabel(r), keeperResults: [] }))}
                        >
                          <span style={{ fontWeight: 700, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rLabel(r)}</span>
                          {rSub(r) && <span style={{ fontSize: 11, color: "#777", flexShrink: 0 }}>{rSub(r)}</span>}
                          <span style={{ fontSize: 10, color: "#ccc", flexShrink: 0 }}>id {r.id}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              <div className="cms-actions right">
                <button className="cms-btn light" onClick={() => setMergeTarget(null)} disabled={actionBusy}>Cancel</button>
                <button className="cms-btn" onClick={doMerge} disabled={!keeper || actionBusy}>
                  {actionBusy ? "Merging…" : `Delete "${rLabel(dup)}" →`}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </section>
  );
}

function defaultInitial(fields = []) {
  return Object.fromEntries(fields.map((f) => [f.name, f.type === "ordered-multiselect" ? [] : (f.name === "status" ? "active" : "")]));
}
