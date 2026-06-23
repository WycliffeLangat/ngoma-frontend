import { useEffect, useMemo, useRef, useState } from "react";
import { cmsApi, getResults, qs } from "../api";
import DataTable from "../components/DataTable";
import SearchBar from "../components/SearchBar";
import FormModal from "../components/FormModal";

const configs = {
  artists: { title: "Artists", endpoint: "/artists/", search: true, fields: ["name", "display_name", "country", "country_code", "genre", "artist_type", "status"], columns: [{key:"name",label:"Artist"},{key:"country_code",label:"Country"},{key:"genre",label:"Genre"},{key:"total_releases",label:"Releases"},{key:"status",label:"Status"}], form: [{name:"image",label:"Artist image",type:"file",help:"Square image, min 800×800 px. JPEG or PNG, max 2 MB."},{name:"name",label:"Artist name"},{name:"display_name",label:"Display name"},{name:"aliases",label:"Aliases JSON",type:"json"},{name:"country",label:"Country"},{name:"country_code",label:"Country code"},{name:"city_region",label:"City/region"},{name:"genre",label:"Genre"},{name:"biography",label:"Biography",type:"textarea"},{name:"artist_type",label:"Artist type"},{name:"verified",label:"Verified",type:"checkbox"},{name:"spotify_url",label:"Spotify URL"},{name:"apple_music_url",label:"Apple Music URL"},{name:"youtube_url",label:"YouTube URL"},{name:"boomplay_url",label:"Boomplay URL"},{name:"audiomack_url",label:"Audiomack URL"},{name:"tiktok_url",label:"TikTok URL"},{name:"instagram_url",label:"Instagram URL"},{name:"x_url",label:"X URL"},{name:"facebook_url",label:"Facebook URL"},{name:"website_url",label:"Website URL"},{name:"status",label:"Status"}] },
  songs: { title: "Songs", endpoint: "/releases/", params:{chart_type:"singles"}, fields: [], columns: [{key:"title",label:"Song"},{key:"artist_display",label:"Main artist(s)"},{key:"country_code",label:"Country"},{key:"release_year",label:"Year"},{key:"status",label:"Status"}] },
  albums: { title: "Albums", endpoint: "/releases/", params:{chart_type:"albums"}, columns: [{key:"title",label:"Album"},{key:"artist_display",label:"Main artist(s)"},{key:"country_code",label:"Country"},{key:"release_year",label:"Year"},{key:"status",label:"Status"}] },
  countries: { title: "Countries", endpoint: "/countries/", columns: [{key:"name",label:"Country"},{key:"code",label:"Code"},{key:"region",label:"Region"},{key:"active",label:"Active"}], form: [{name:"name",label:"Country"},{name:"code",label:"Code"},{name:"region",label:"Region"},{name:"flag",label:"Flag/Initial"},{name:"display_order",label:"Order",type:"number"},{name:"active",label:"Active",type:"checkbox"}] },
  platforms: { title: "Platforms", endpoint: "/platforms/", columns: [{key:"name",label:"Platform"},{key:"short_name",label:"Short"},{key:"color",label:"Color"},{key:"max_chart_size",label:"Max"},{key:"active",label:"Active"}], form: [{name:"name",label:"Name"},{name:"slug",label:"Slug"},{name:"short_name",label:"Short name"},{name:"color",label:"Color"},{name:"brand_color",label:"Brand color"},{name:"chart_size",label:"Source chart size",type:"number"},{name:"max_chart_size",label:"Max chart size",type:"number"},{name:"points_base",label:"Points base",type:"number"},{name:"points_method",label:"Points method"},{name:"supports_singles",label:"Supports singles",type:"checkbox"},{name:"supports_albums",label:"Supports albums",type:"checkbox"},{name:"display_order",label:"Display order",type:"number"},{name:"active",label:"Active",type:"checkbox"}] },
  news: { title: "News CMS", endpoint: "/news/", columns: [{key:"title",label:"Headline"},{key:"category",label:"Category"},{key:"author",label:"Author"},{key:"status",label:"Status"},{key:"updated_at",label:"Updated",render:(r)=>new Date(r.updated_at).toLocaleDateString()}], form: [{name:"title",label:"Headline"},{name:"slug",label:"Slug"},{name:"subheadline",label:"Subheadline"},{name:"category",label:"Category",type:"select",options:["chart_news","milestones","new_releases","industry_news","artist_news","awards","certifications","records","interviews","editorials","artist_spotlight","albums","analytics","announcement"].map(v=>({value:v,label:v.replace(/_/g," ")}))},{name:"author",label:"Author"},{name:"excerpt",label:"Excerpt",type:"textarea"},{name:"body",label:"Body",type:"textarea"},{name:"gallery",label:"Gallery JSON",type:"json"},{name:"tags",label:"Tags JSON",type:"json"},{name:"source_links",label:"Source links JSON",type:"json"},{name:"seo_title",label:"SEO title"},{name:"seo_description",label:"SEO description",type:"textarea"},{name:"featured",label:"Featured",type:"checkbox"},{name:"pinned",label:"Pinned",type:"checkbox"},{name:"breaking",label:"Breaking",type:"checkbox"},{name:"is_published",label:"Published",type:"checkbox"},{name:"status",label:"Status"}] },
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
  }), [config, search, statusFilter, ordering]);
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
  useEffect(() => { setSearch(""); setStatusFilter(""); setOrdering(""); }, [type]);

  // Debounced search: instant for navigation (empty search), 280ms for typed queries
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
  }, [type, search]);
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
        setModal(false); setEditing(null); load();
        setError(`Record saved, but image upload failed: ${e.message}`);
        return;
      }
    }

    setModal(false); setEditing(null); load();
  }

  const isRelease = type === "songs" || type === "albums";
  const isArtist = type === "artists";
  const isActionable = isRelease || isArtist;

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
      await cmsApi.delete(`${config.endpoint}${deleteTarget.id}/hard_delete/`);
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
      await callMergeApi(mergeTarget.dup, mergeTarget.keeper);
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
        <SearchBar value={search} onChange={setSearch} placeholder={`Search ${config.title.toLowerCase()}…`} />
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
      </div>

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
        <DataTable columns={finalColumns} rows={rows} onRowClick={config.readOnly ? null : (row) => { setEditing(row); setModal(true); }} />
      )}
      <FormModal open={modal} title={`${editing ? "Edit" : "Create"} ${config.title}`} entityId={editing?.id} fields={formFields} initial={editing || defaultInitial(formFields)} onSubmit={save} onClose={() => setModal(false)} />
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
      {mergeTarget && (
        <div className="cms-modal-backdrop" onClick={() => !actionBusy && setMergeTarget(null)}>
          <div className="cms-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="cms-modal-head">
              <h3>Merge release</h3>
              <button type="button" onClick={() => setMergeTarget(null)} disabled={actionBusy}>×</button>
            </div>
            <p style={{ fontSize: 13, margin: "8px 0 14px" }}>
              <strong>Merging:</strong> "{mergeTarget.dup.title}" (id {mergeTarget.dup.id})
              <br /><span style={{ color: "#888" }}>Monthly chart points will be summed into the kept record. Weekly entries on the same chart in the same week are dropped. This record will be permanently deleted.</span>
            </p>
            {mergeTarget.keeper ? (
              <div style={{ background: "#f5fce8", border: "1px solid #b6dca0", borderRadius: 6, padding: "10px 14px", marginBottom: 14 }}>
                <strong style={{ fontSize: 13 }}>Keep:</strong>{" "}
                <span style={{ fontSize: 13 }}>{mergeTarget.keeper.title} (id {mergeTarget.keeper.id}) — {mergeTarget.keeper.artist_display}</span>
                <button className="cms-btn light" style={{ fontSize: 11, marginLeft: 10 }} onClick={() => setMergeTarget(t => ({ ...t, keeper: null }))}>Change</button>
              </div>
            ) : (
              <>
                <input
                  className="cms-search-input"
                  placeholder="Search for the record to keep…"
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
                  <div style={{ border: "1px solid #e5e5e5", borderRadius: 6, marginBottom: 14, maxHeight: 180, overflowY: "auto" }}>
                    {mergeTarget.keeperResults.map(r => (
                      <button
                        key={r.id}
                        type="button"
                        style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", fontSize: 13, border: "none", borderBottom: "1px solid #f0f0f0", background: "transparent", cursor: "pointer" }}
                        onClick={() => setMergeTarget(t => ({ ...t, keeper: r, keeperSearch: r.title, keeperResults: [] }))}
                      >
                        <strong>{r.title}</strong> — {r.artist_display}
                        <span style={{ fontSize: 11, color: "#aaa", marginLeft: 8 }}>id {r.id}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
            <div className="cms-actions right">
              <button className="cms-btn light" onClick={() => setMergeTarget(null)} disabled={actionBusy}>Cancel</button>
              <button className="cms-btn" onClick={doMerge} disabled={!mergeTarget.keeper || actionBusy}>
                {actionBusy ? "Merging…" : "Merge and delete duplicate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function defaultInitial(fields = []) {
  return Object.fromEntries(fields.map((f) => [f.name, f.type === "ordered-multiselect" ? [] : (f.name === "status" ? "active" : "")]));
}
