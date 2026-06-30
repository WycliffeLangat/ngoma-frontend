import { useEffect, useMemo, useRef, useState } from "react";
import { cmsApi, getResults, qs, clearCmsCache } from "../api";
import DataTable from "../components/DataTable";
import SearchBar from "../components/SearchBar";
import FormModal from "../components/FormModal";
import StatusBadge from "../components/StatusBadge";
import { fetchAppData } from "../../api/public";
import {
  getAffectedChartScopes,
  reorderAffectedChartScopes,
  rerankAffectedChartScopes,
} from "../chartRankMaintenance";

function normalizeArtistName(value) {
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

function creditedArtistNames(release) {
  const primaryProfiles = (release.primary_artists || [])
    .map((profile) => profile?.public_name || profile?.display_name || profile?.name)
    .filter(Boolean);
  const featuredProfiles = (release.featured_artist_profiles || [])
    .map((profile) => profile?.public_name || profile?.display_name || profile?.name)
    .filter(Boolean);
  const primaryText = splitArtistNames(
    release.primary_artist_credit || release.pa || release.primary_artist ||
    release.a || release.artist_credit || release.artist
  );
  const featuredText = splitArtistNames(
    release.featured_artist_credit || release.fa || release.featured_artists || ""
  );
  return [
    ...(primaryProfiles.length ? primaryProfiles : primaryText),
    ...featuredProfiles,
    ...featuredText,
  ];
}

function forEachPublicCreditEntry(payload, visit) {
  (payload?.releases || []).forEach(visit);
  ["singles", "albums"].forEach((chartType) => {
    const chart = payload?.full?.[chartType] || {};
    Object.values(chart.combined || {}).forEach((rows) => {
      if (Array.isArray(rows)) rows.forEach(visit);
    });
    Object.values(chart.platforms || {}).forEach((months) => {
      Object.values(months || {}).forEach((rows) => {
        if (Array.isArray(rows)) rows.forEach(visit);
      });
    });
  });
}

const WORKFLOW_STATUS_OPTIONS = [
  { value: "draft", label: "Draft — not public" },
  { value: "pending_review", label: "Pending review" },
  { value: "approved", label: "Approved" },
  { value: "published", label: "Published" },
  { value: "rejected", label: "Rejected" },
  { value: "archived", label: "Archived" },
];
const CHART_STATUS_OPTIONS = WORKFLOW_STATUS_OPTIONS.filter(({ value }) => value !== "published");
const RECORD_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft — not public" },
  { value: "inactive", label: "Inactive" },
  { value: "archived", label: "Archived" },
];

const configs = {
  artists: { title: "Artists", endpoint: "/artists/", search: true, fields: ["name", "display_name", "country", "country_code", "genre", "artist_type", "status"], columns: [{key:"name",label:"Artist"},{key:"country_code",label:"Country"},{key:"genre",label:"Genre"},{key:"total_releases",label:"Releases"},{key:"status",label:"Status"}], form: [{name:"image",label:"Artist image",type:"file",help:"Square image, min 800×800 px. JPEG or PNG, max 2 MB."},{name:"name",label:"Artist name",help:"The artist's official or commonly credited name."},{name:"display_name",label:"Display name",help:"Optional public-facing spelling. Leave blank to use Artist name."},{name:"slug",label:"Slug",help:"URL-safe identifier. Leave blank and it will be generated from Artist name.",example:"fik-fameica"},{name:"aliases",label:"Aliases JSON",type:"json"},{name:"country",label:"Country"},{name:"country_code",label:"Country code"},{name:"city_region",label:"City/region"},{name:"genre",label:"Genre"},{name:"biography",label:"Biography",type:"textarea"},{name:"artist_type",label:"Artist type"},{name:"verified",label:"Verified",type:"checkbox"},{name:"spotify_url",label:"Spotify URL"},{name:"apple_music_url",label:"Apple Music URL"},{name:"youtube_url",label:"YouTube URL"},{name:"boomplay_url",label:"Boomplay URL"},{name:"audiomack_url",label:"Audiomack URL"},{name:"tiktok_url",label:"TikTok URL"},{name:"instagram_url",label:"Instagram URL"},{name:"x_url",label:"X URL"},{name:"facebook_url",label:"Facebook URL"},{name:"website_url",label:"Website URL"},{name:"status",label:"Status"}] },
  songs: { title: "Songs", endpoint: "/releases/", params:{chart_type:"singles"}, fields: [], columns: [{key:"title",label:"Song"},{key:"artist_display",label:"Main artist(s)"},{key:"country_code",label:"Country"},{key:"release_year",label:"Year"},{key:"status",label:"Status"}] },
  albums: { title: "Albums", endpoint: "/releases/", params:{chart_type:"albums"}, columns: [{key:"title",label:"Album"},{key:"artist_display",label:"Main artist(s)"},{key:"country_code",label:"Country"},{key:"release_year",label:"Year"},{key:"status",label:"Status"}] },
  countries: { title: "Countries", endpoint: "/countries/", columns: [{key:"name",label:"Country"},{key:"code",label:"Code"},{key:"region",label:"Region"},{key:"active",label:"Active"}], form: [{name:"name",label:"Country"},{name:"code",label:"Code"},{name:"region",label:"Region"},{name:"flag",label:"Flag/Initial"},{name:"display_order",label:"Order",type:"number"},{name:"active",label:"Active",type:"checkbox"}] },
  platforms: { title: "Platforms", endpoint: "/platforms/", columns: [{key:"name",label:"Platform"},{key:"short_name",label:"Short"},{key:"color",label:"Color"},{key:"max_chart_size",label:"Max"},{key:"active",label:"Active"}], form: [{name:"name",label:"Name"},{name:"slug",label:"Slug"},{name:"short_name",label:"Short name"},{name:"color",label:"Color"},{name:"brand_color",label:"Brand color"},{name:"chart_size",label:"Source chart size",type:"number"},{name:"max_chart_size",label:"Max chart size",type:"number"},{name:"points_base",label:"Points base",type:"number"},{name:"points_method",label:"Points method"},{name:"supports_singles",label:"Supports singles",type:"checkbox"},{name:"supports_albums",label:"Supports albums",type:"checkbox"},{name:"display_order",label:"Display order",type:"number"},{name:"active",label:"Active",type:"checkbox"}] },
  news: { title: "News CMS", endpoint: "/news/", imageField: "cover_image", columns: [{key:"title",label:"Headline"},{key:"category",label:"Category"},{key:"author",label:"Author"},{key:"status",label:"Status"},{key:"updated_at",label:"Updated",render:(r)=>new Date(r.updated_at).toLocaleDateString()}], form: [{name:"cover_image",label:"Cover image",type:"file",help:"Article hero image. JPEG or PNG, max 5 MB."},{name:"title",label:"Headline"},{name:"slug",label:"Slug"},{name:"subheadline",label:"Subheadline"},{name:"category",label:"Category",type:"select",options:["chart_news","milestones","new_releases","industry_news","artist_news","awards","certifications","records","interviews","editorials","artist_spotlight","albums","analytics","announcement"].map(v=>({value:v,label:v.replace(/_/g," ")}))},{name:"author",label:"Author"},{name:"excerpt",label:"Excerpt",type:"textarea"},{name:"body",label:"Body",type:"textarea"},{name:"gallery",label:"Gallery JSON",type:"json"},{name:"tags",label:"Tags JSON",type:"json"},{name:"source_links",label:"Source links JSON",type:"json"},{name:"seo_title",label:"SEO title"},{name:"seo_description",label:"SEO description",type:"textarea"},{name:"featured",label:"Featured",type:"checkbox"},{name:"pinned",label:"Pinned",type:"checkbox"},{name:"breaking",label:"Breaking",type:"checkbox"},{name:"is_published",label:"Published",type:"checkbox"},{name:"status",label:"Status"}] },
  charts: { title: "Chart Periods", endpoint: "/charts/", columns: [{key:"label",label:"Month"},{key:"chart_type",label:"Type"},{key:"combined_entries_count",label:"Combined entries"},{key:"status",label:"Status"},{key:"locked",label:"History locked"}], form: [{name:"year",label:"Year",type:"number",help:"Four-digit chart year, for example 2026."},{name:"month",label:"Month number",type:"number",help:"Use 1 for January through 12 for December."},{name:"chart_type",label:"Chart type",type:"select",options:[{value:"singles",label:"Singles"},{value:"albums",label:"Albums"}]},{name:"status",label:"Review status",type:"select",options:CHART_STATUS_OPTIONS,help:"Publishing is a separate, protected action after entries are reviewed."}] },
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

const PAGE_SIZE = 50;

export default function ResourcePage({ type, searchJump, user }) {
  const config = configs[type] || configs.artists;
  const permissions = user?.permissions || {};
  const adminOnlyType = ["users", "settings", "backups"].includes(type);
  const editorialType = ["news", "media", "page-content"].includes(type);
  const canEdit = !config.readOnly && !permissions.read_only && (
    adminOnlyType
      ? permissions.can_manage_users
      : editorialType
        ? (permissions.can_manage_news || permissions.can_manage_data)
        : permissions.can_manage_data
  );
  const canPublish = Boolean(permissions.can_publish);
  const canHardDelete = ["admin", "super_admin"].includes(user?.role);
  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [ordering, setOrdering] = useState("");
  const [alphaFilter, setAlphaFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [artistOptions, setArtistOptions] = useState([]);
  const [imageModal, setImageModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [mergeTarget, setMergeTarget] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkDeleteTargets, setBulkDeleteTargets] = useState([]);
  const [bulkMergeTarget, setBulkMergeTarget] = useState(null);
  const [dupGroups, setDupGroups] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [detailRow, setDetailRow] = useState(null);
  const abortRef = useRef(null);
  const keeperSearchTimerRef = useRef(null);
  const flashTimerRef = useRef(null);
  const artistSyncRef = useRef(false);

  function showFlash(msg) {
    setFlash(msg);
    clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setFlash(""), 5000);
  }

  // Apply search term from global search result click
  useEffect(() => {
    if (searchJump && searchJump.page === type && searchJump.term) {
      setSearch(searchJump.term);
    }
  }, [searchJump]);

  // Chart and year-end mirrors pass a canonical record id. Open that record
  // directly so clicking a mirrored row lands in the real edit form.
  useEffect(() => {
    if (!searchJump?.id || searchJump.page !== type) return;
    let active = true;
    cmsApi.get(`${config.endpoint}${searchJump.id}/`)
      .then((record) => {
        if (!active) return;
        setEditing(record);
        setModal(true);
      })
      .catch((err) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [searchJump, type, config.endpoint]);

  const params = useMemo(() => ({
    ...(config.params || {}),
    page,
    page_size: PAGE_SIZE,
    search,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(ordering ? { ordering } : {}),
    ...(alphaFilter ? { starts_with: alphaFilter } : {}),
  }), [config, page, search, statusFilter, ordering, alphaFilter]);
  const formFields = useMemo(() => {
    const baseFields = type === "songs" || type === "albums"
      ? releaseForm(type === "albums" ? "albums" : "singles", artistOptions)
      : (config.form || []);
    return baseFields.map((field) => {
      if (field.name !== "status" || field.type === "select") return field;
      return {
        ...field,
        type: "select",
        options: ["artists", "songs", "albums"].includes(type)
          ? RECORD_STATUS_OPTIONS
          : WORKFLOW_STATUS_OPTIONS,
      };
    });
  }, [type, config, artistOptions]);

  // Used after save/delete to reload without debounce
  async function load() {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true); setError("");
    try {
      const data = await cmsApi.get(`${config.endpoint}${qs(params)}`, { signal: controller.signal });
      setRows(getResults(data));
      setTotalCount(typeof data?.count === "number" ? data.count : null);
    }
    catch(e) { if (e.name !== "AbortError") setError(e.message); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }

  // Reset search and filters when switching resource types
  useEffect(() => {
    setSearch("");
    setStatusFilter("");
    setOrdering("");
    setAlphaFilter("");
    setPage(1);
    setSelectedIds(new Set());
    setBulkDeleteTargets([]);
    setBulkMergeTarget(null);
  }, [type]);
  // Reset to page 1 whenever filters/search change
  useEffect(() => { setPage(1); }, [search, statusFilter, ordering, alphaFilter]);
  // Selection is intentionally page-specific so an invisible row cannot be
  // merged or deleted after the list changes underneath the editor.
  useEffect(() => { setSelectedIds(new Set()); }, [page, search, statusFilter, ordering, alphaFilter]);

  // Debounced load — re-runs when any filter changes; typed search gets 280ms debounce
  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const delay = search ? 280 : 0;
    const timer = setTimeout(async () => {
      setLoading(true); setError("");
      try {
        const data = await cmsApi.get(`${config.endpoint}${qs(params)}`, { signal: controller.signal });
        setRows(getResults(data));
        setTotalCount(typeof data?.count === "number" ? data.count : null);
      }
      catch(e) { if (e.name !== "AbortError") setError(e.message); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, delay);
    return () => clearTimeout(timer);
  }, [type, params]);
  useEffect(() => {
    if (type !== "songs" && type !== "albums") return;
    cmsApi.get("/artists/options/").then(setArtistOptions).catch((e) => setError(e.message));
  }, [type]);

  // Keep Artists exhaustive even when an editor opens this page directly.
  // This includes primary and text-only featured credits from every published
  // release, such as Fik Fameica or JAE5.
  useEffect(() => {
    if (type !== "artists" || !canEdit || artistSyncRef.current) return;
    artistSyncRef.current = true;
    let active = true;
    (async () => {
      const [payload, optionData] = await Promise.all([
        fetchAppData(undefined, 30_000),
        cmsApi.get("/artists/options/"),
      ]);
      const options = Array.isArray(optionData) ? optionData : getResults(optionData);
      const byName = new Map();
      const bySlug = new Map();
      options.forEach((artist) => {
        [artist.public_name, artist.display_name, artist.name, artist.label].forEach((name) => {
          const key = normalizeArtistName(name);
          if (key) byName.set(key, artist);
        });
        if (artist.slug) bySlug.set(artist.slug, artist);
      });

      const credited = new Map();
      forEachPublicCreditEntry(payload, (release) => {
        creditedArtistNames(release).forEach((name) => {
          const key = normalizeArtistName(name);
          if (key && !credited.has(key)) credited.set(key, String(name).trim());
        });
      });

      let created = 0;
      const skipped = [];
      for (const [key, name] of credited) {
        const slug = artistSlug(name);
        if (byName.has(key) || bySlug.has(slug)) continue;
        try {
          const artist = await cmsApi.post("/artists/", {
            name,
            display_name: name,
            slug,
            artist_type: "solo",
            status: "active",
          });
          byName.set(key, artist);
          bySlug.set(slug, artist);
          created += 1;
        } catch (createError) {
          const matches = getResults(await cmsApi.get(
            `/artists/?search=${encodeURIComponent(name)}&page_size=10`
          ));
          const match = matches.find((artist) =>
            [artist.name, artist.display_name, artist.public_name]
              .some((candidate) => normalizeArtistName(candidate) === key) ||
            artist.slug === slug
          );
          if (!match) {
            if (createError?.status === 400) {
              skipped.push(`${name}: ${createError.message}`);
              continue;
            }
            throw createError;
          }
          byName.set(key, match);
          bySlug.set(slug, match);
        }
      }
      if (active && created) {
        clearCmsCache("/artists/");
        await load();
        showFlash(`${created} missing credited artist${created === 1 ? "" : "s"} added to the CMS.`);
      }
      if (active && skipped.length) {
        setError(`Some artist records need attention: ${skipped.slice(0, 3).join(" | ")}`);
      }
    })().catch((syncError) => {
      artistSyncRef.current = false;
      if (active) setError(`Artist completeness check failed: ${syncError.message}`);
    });
    return () => { active = false; };
  }, [type, canEdit]);

  async function save(form) {
    if (!canEdit) throw new Error("Your role has read-only access to this section.");
    setError("");
    if (type === "artists" && !String(form.slug || "").trim() && String(form.name || "").trim()) {
      form = { ...form, slug: artistSlug(form.name) };
    }
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
      // FormModal renders DRF field errors beside the corresponding inputs.
      throw e;
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
    // The API's primary_artist filter already scopes by artist ID, so no name-filter needed.
    if (type === "artists" && savedId && editing?.id) {
      const oldCode = (editing.country_code || "").trim().toUpperCase();
      const newCode = (form.country_code || "").trim().toUpperCase();
      if (newCode && oldCode !== newCode) {
        try {
          const relData = await cmsApi.get(`/releases/?primary_artist=${savedId}&page_size=500`);
          const releases = getResults(relData);
          if (releases.length) {
            const updates = { country_code: newCode };
            if (form.country && form.country.trim()) updates.country = form.country.trim();
            const results = await Promise.allSettled(releases.map(r => cmsApi.patch(`/releases/${r.id}/`, updates)));
            const failed = results.filter(r => r.status === "rejected").length;
            if (failed > 0) {
              showFlash(`Artist saved. Country cascaded to ${releases.length - failed}/${releases.length} releases (${failed} failed).`);
            } else {
              showFlash(`Artist saved. Country cascaded to ${releases.length} release${releases.length !== 1 ? "s" : ""}.`);
            }
          }
        } catch(e) { showFlash(`Artist saved. Country cascade failed: ${e.message}`); }
      }
    }

    setModal(false); setEditing(null); setDetailRow(null); load();
  }

  const isRelease = type === "songs" || type === "albums";
  const isArtist = type === "artists";
  const isActionable = isRelease || isArtist;
  const isCertifications = type === "certifications";
  const selectedRows = rows.filter((row) => selectedIds.has(row.id));

  function recordLabel(row) {
    if (isArtist) return row.display_name || row.name || `Artist #${row.id}`;
    return row.title || `Record #${row.id}`;
  }

  function toggleSelectedRow(row) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(row.id)) next.delete(row.id);
      else next.add(row.id);
      return next;
    });
  }

  function toggleAllRows(visibleRows, shouldSelect) {
    setSelectedIds((current) => {
      const next = new Set(current);
      visibleRows.forEach((row) => {
        if (shouldSelect) next.add(row.id);
        else next.delete(row.id);
      });
      return next;
    });
  }

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
        showFlash("All certification levels are already correct.");
      } else {
        showFlash(`Fixed ${fixed} certification level${fixed !== 1 ? "s" : ""}.`);
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
      if (unofficial.length === 0) { showFlash("No unofficial certifications found."); return; }
      for (const cert of unofficial) {
        await cmsApi.patch(`/certifications/${cert.id}/`, { is_official: true });
      }
      showFlash(`Marked ${unofficial.length} certification${unofficial.length !== 1 ? "s" : ""} as official.`);
      load();
    } catch(e) { setError(e.message); }
    finally { setActionBusy(false); }
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
    const targetName = deleteTarget.title || deleteTarget.name || `id ${deleteTarget.id}`;
    try {
      const isRelease = type === "songs" || type === "albums";
      const affectedScopes = isRelease
        ? await getAffectedChartScopes(deleteTarget.id)
        : [];
      await cmsApi.delete(`${config.endpoint}${deleteTarget.id}/hard_delete/`);
      const rankResult = await reorderAffectedChartScopes(affectedScopes);
      clearCmsCache();
      setDeleteTarget(null);
      showFlash(
        `"${targetName}" deleted.` +
        (rankResult.failedScopes.length ? " Some locked chart ranks could not be refreshed." : "")
      );
      load();
    } catch(e) { setError(e.message); }
    finally { setActionBusy(false); }
  }

  async function hardDeleteSelected() {
    if (!bulkDeleteTargets.length || actionBusy) return;
    setActionBusy(true);
    setError("");
    const targets = [...bulkDeleteTargets];
    const deleted = [];
    const failures = [];
    try {
      const affectedScopes = isRelease
        ? await getAffectedChartScopes(targets.map((target) => target.id))
        : [];
      for (const target of targets) {
        try {
          await cmsApi.delete(`${config.endpoint}${target.id}/hard_delete/`);
          deleted.push(target);
        } catch (deleteError) {
          failures.push({ target, error: deleteError });
        }
      }
      if (!deleted.length) throw failures[0]?.error || new Error("No records were deleted.");

      const rankResult = await reorderAffectedChartScopes(affectedScopes);
      clearCmsCache();
      setBulkDeleteTargets([]);
      setSelectedIds(new Set(failures.map(({ target }) => target.id)));
      showFlash(
        `Deleted ${deleted.length} ${isArtist ? "artist" : isRelease ? "release" : "record"}` +
        `${deleted.length === 1 ? "" : "s"}.` +
        (rankResult.failedScopes.length ? " Some locked chart ranks could not be refreshed." : "")
      );
      await load();
      if (failures.length) {
        setError(
          `${failures.length} record${failures.length === 1 ? "" : "s"} could not be deleted: ` +
          failures.map(({ target, error: failure }) => `${recordLabel(target)} (${failure.message})`).join(" · ")
        );
      }
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setActionBusy(false);
    }
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
    const dupName = isArtist ? (mergeTarget.dup.display_name || mergeTarget.dup.name) : mergeTarget.dup.title;
    const keepName = isArtist ? (mergeTarget.keeper.display_name || mergeTarget.keeper.name) : mergeTarget.keeper.title;
    try {
      const isRelease = type === "songs" || type === "albums";
      const affectedScopes = isRelease
        ? await getAffectedChartScopes(mergeTarget.dup.id)
        : [];
      await callMergeApi(mergeTarget.dup, mergeTarget.keeper);
      const rankResult = await rerankAffectedChartScopes(affectedScopes);
      clearCmsCache();
      setMergeTarget(null);
      setDupGroups(null);
      showFlash(
        `"${dupName}" merged into "${keepName}".` +
        (rankResult.failedScopes.length ? " Some locked chart ranks could not be refreshed." : "")
      );
      load();
    } catch(e) { setError(e.message); }
    finally { setActionBusy(false); }
  }

  async function mergeSelected() {
    if (!bulkMergeTarget?.keeperId || actionBusy) return;
    const selected = bulkMergeTarget.rows;
    const keeper = selected.find((row) => row.id === bulkMergeTarget.keeperId);
    const duplicates = selected.filter((row) => row.id !== bulkMergeTarget.keeperId);
    if (!keeper || !duplicates.length) return;

    setActionBusy(true);
    setError("");
    const merged = [];
    const failures = [];
    try {
      const affectedScopes = isRelease
        ? await getAffectedChartScopes(duplicates.map((row) => row.id))
        : [];
      if (isArtist) {
        await cmsApi.post(`${config.endpoint}${keeper.id}/merge/`, {
          artist_ids: duplicates.map((row) => row.id),
        });
        merged.push(...duplicates);
      } else {
        for (const duplicate of duplicates) {
          try {
            await callMergeApi(duplicate, keeper);
            merged.push(duplicate);
          } catch (mergeError) {
            failures.push({ target: duplicate, error: mergeError });
          }
        }
      }
      if (!merged.length) throw failures[0]?.error || new Error("No records were merged.");

      const rankResult = await rerankAffectedChartScopes(affectedScopes);
      clearCmsCache();
      setBulkMergeTarget(null);
      setDupGroups(null);
      setSelectedIds(new Set(failures.map(({ target }) => target.id)));
      showFlash(
        `Merged ${merged.length} record${merged.length === 1 ? "" : "s"} into "${recordLabel(keeper)}".` +
        (rankResult.failedScopes.length ? " Some locked chart ranks could not be refreshed." : "")
      );
      await load();
      if (failures.length) {
        setError(
          `${failures.length} record${failures.length === 1 ? "" : "s"} could not be merged: ` +
          failures.map(({ target, error: failure }) => `${recordLabel(target)} (${failure.message})`).join(" · ")
        );
      }
    } catch (mergeError) {
      setError(mergeError.message);
    } finally {
      setActionBusy(false);
    }
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
    const keepName = isArtist ? (keeper.display_name || keeper.name) : keeper.title;
    setActionBusy(true);
    try {
      if (isArtist) {
        await cmsApi.post(`${config.endpoint}${keeper.id}/merge/`, {
          artist_ids: dups.map((dup) => dup.id),
        });
      } else {
        for (const dup of dups) {
          await callMergeApi(dup, keeper);
        }
      }
      clearCmsCache();
      showFlash(`Merged ${dups.length} duplicate${dups.length !== 1 ? "s" : ""} into "${keepName}".`);
      loadDuplicates();
      load();
    } catch(e) { setError(e.message); }
    finally { setActionBusy(false); }
  }

  async function saveImage(file) {
    if (!file || !imageModal || !canEdit) return;
    try {
      const fd = new FormData();
      fd.append(imageModal.field, file);
      await cmsApi.patch(`${config.endpoint}${imageModal.id}/`, fd);
      setImageModal(null); load();
    } catch(e) { setError(e.message); }
  }

  const imageField = config.imageField || (type === "artists" ? "image" : (type === "songs" || type === "albums") ? "cover_image" : null);
  const titleKey = type === "artists" ? "name" : "title";

  const actionsColumn = isActionable && canHardDelete ? {
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
          title={isArtist ? "Permanently delete this artist" : "Permanently delete this release and all its chart entries"}
          onClick={() => setDeleteTarget(row)}
        >Delete</button>
      </span>
    ),
  } : null;

  async function runChartAction(row, actionName) {
    if (!canPublish || actionBusy) return;
    const labels = {
      publish: "publish and lock this chart",
      unpublish: "remove this chart from the public site and return it to draft",
      unlock: "unlock this chart for correction",
    };
    if (!window.confirm(`Are you sure you want to ${labels[actionName]}?`)) return;
    setActionBusy(true);
    setError("");
    try {
      await cmsApi.post(`/charts/${row.id}/${actionName}/`, {});
      showFlash(
        actionName === "publish"
          ? `${row.label} published and locked.`
          : actionName === "unpublish"
            ? `${row.label} returned to draft.`
            : `${row.label} unlocked for correction.`
      );
      await load();
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setActionBusy(false);
    }
  }

  const chartActionsColumn = type === "charts" && canPublish ? {
    key: "_workflow",
    label: "Workflow",
    render: (row) => (
      <span style={{ display: "flex", gap: 5 }} onClick={(event) => event.stopPropagation()}>
        {row.is_published ? (
          <button
            className="cms-btn light"
            style={{ fontSize: 11, padding: "2px 9px" }}
            disabled={actionBusy}
            onClick={() => runChartAction(row, "unpublish")}
          >Return to draft</button>
        ) : (
          <button
            className="cms-btn"
            style={{ fontSize: 11, padding: "2px 9px" }}
            disabled={actionBusy}
            onClick={() => runChartAction(row, "publish")}
          >Publish</button>
        )}
        {row.locked && (
          <button
            className="cms-btn light"
            style={{ fontSize: 11, padding: "2px 9px" }}
            disabled={actionBusy}
            onClick={() => runChartAction(row, "unlock")}
          >Unlock</button>
        )}
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
              title={canEdit ? (imgUrl ? "Replace image" : "Add image") : "Image preview"}
              disabled={!canEdit}
              onClick={(e) => {
                e.stopPropagation();
                if (canEdit) setImageModal({ id: row.id, name: row[titleKey], field: imageField, current: imgUrl || null });
              }}
            >
              {imgUrl ? <img src={imgUrl} alt="" /> : <span>+</span>}
            </button>
            {row[col.key] || "—"}
          </span>
        );
      },
    };
  }) : config.columns;

  const finalColumns = [
    ...tableColumns,
    ...(chartActionsColumn ? [chartActionsColumn] : []),
    ...(actionsColumn ? [actionsColumn] : []),
  ];

  return (
    <section>
      <div className="cms-page-head">
        <div><h1>{config.title}</h1><p>Manage {config.title.toLowerCase()} from the CMS.</p></div>
        {canEdit && <button className="cms-btn" onClick={() => { setEditing(null); setModal(true); }}>Add new</button>}
      </div>
      {flash && <div className="cms-alert" style={{ background:"#f0fdf4", color:"#15803d", border:"1px solid #bbf7d0", borderRadius:6, padding:"10px 14px", marginBottom:10 }}>{flash}</div>}
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
        {isActionable && canEdit && (
          <button className="cms-btn light" onClick={dupGroups === null ? loadDuplicates : () => setDupGroups(null)}>
            {dupGroups === null ? "Find duplicates" : "Hide duplicates"}
          </button>
        )}
        {isCertifications && canEdit && (
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
      {isActionable && canHardDelete && selectedRows.length > 0 && (
        <div className="cms-bulk-bar" role="region" aria-label="Bulk actions">
          <strong>{selectedRows.length} selected</strong>
          <span>Select at least two records to merge them into one keeper.</span>
          <div>
            <button
              className="cms-btn light small"
              disabled={selectedRows.length < 2 || actionBusy}
              onClick={() => setBulkMergeTarget({ rows: [...selectedRows], keeperId: null })}
            >
              Merge selected
            </button>
            <button
              className="cms-btn danger small"
              disabled={actionBusy}
              onClick={() => setBulkDeleteTargets([...selectedRows])}
            >
              Delete selected
            </button>
            <button
              className="cms-text-btn"
              disabled={actionBusy}
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </button>
          </div>
        </div>
      )}

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
        <DataTable
          columns={finalColumns}
          rows={rows}
          onRowClick={(row) => setDetailRow(row)}
          selectable={isActionable && canHardDelete}
          selectedIds={selectedIds}
          onToggleRow={toggleSelectedRow}
          onToggleAll={toggleAllRows}
        />
      )}
      {totalCount !== null && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 2px", marginTop:4, borderTop:"1px solid #f0f0f0" }}>
          <span style={{ fontSize:12, color:"#999" }}>
            {totalCount === 0
              ? "No results"
              : rows.length === 0
                ? `Page ${page} — no results (try going back)`
                : `${((page - 1) * PAGE_SIZE + 1).toLocaleString()}–${((page - 1) * PAGE_SIZE + rows.length).toLocaleString()} of ${totalCount.toLocaleString()}`}
          </span>
          {totalCount > PAGE_SIZE && (
            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
              <button
                className="cms-btn light"
                style={{ fontSize:12, padding:"3px 10px" }}
                disabled={page === 1 || loading}
                onClick={() => setPage(p => p - 1)}
              >← Prev</button>
              <span style={{ fontSize:12, color:"#666", minWidth:90, textAlign:"center" }}>
                Page {page} / {Math.max(1, Math.ceil(totalCount / PAGE_SIZE))}
              </span>
              <button
                className="cms-btn light"
                style={{ fontSize:12, padding:"3px 10px" }}
                disabled={rows.length < PAGE_SIZE || loading}
                onClick={() => setPage(p => p + 1)}
              >Next →</button>
            </div>
          )}
        </div>
      )}
      <FormModal open={modal && canEdit} title={`${editing ? "Edit" : "Create"} ${config.title}`} entityId={editing?.id} fields={formFields} initial={editing || defaultInitial(formFields)} onSubmit={save} onClose={() => setModal(false)} />

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
                  {canEdit && !r.locked && (
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
      {bulkDeleteTargets.length > 0 && (
        <div className="cms-modal-backdrop" onClick={() => !actionBusy && setBulkDeleteTargets([])}>
          <div className="cms-modal" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="cms-modal-head">
              <h3>Delete {bulkDeleteTargets.length} records permanently?</h3>
              <button type="button" onClick={() => setBulkDeleteTargets([])} disabled={actionBusy}>×</button>
            </div>
            <div className="cms-bulk-record-list">
              {bulkDeleteTargets.map((row) => (
                <div key={row.id}>
                  <strong>{recordLabel(row)}</strong>
                  <span>{isArtist ? row.country || row.country_code : row.artist_display} · id {row.id}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 13, color: "#c0392b", margin: "12px 0 16px" }}>
              This permanently deletes every selected record
              {isRelease ? " and its chart entries and certifications" : ""}. This cannot be undone.
            </p>
            <div className="cms-actions right">
              <button className="cms-btn light" onClick={() => setBulkDeleteTargets([])} disabled={actionBusy}>Cancel</button>
              <button className="cms-btn danger" onClick={hardDeleteSelected} disabled={actionBusy}>
                {actionBusy ? "Deleting…" : `Delete all ${bulkDeleteTargets.length}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkMergeTarget && (
        <div className="cms-modal-backdrop" onClick={() => !actionBusy && setBulkMergeTarget(null)}>
          <div className="cms-modal" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="cms-modal-head">
              <h3>Merge {bulkMergeTarget.rows.length} selected records</h3>
              <button type="button" onClick={() => setBulkMergeTarget(null)} disabled={actionBusy}>×</button>
            </div>
            <p style={{ fontSize: 13, color: "#666", margin: "10px 0" }}>
              Choose the one record to keep. Every other selected record will be merged into it and removed.
            </p>
            <div className="cms-bulk-keeper-list">
              {bulkMergeTarget.rows.map((row) => {
                const isKeeper = bulkMergeTarget.keeperId === row.id;
                return (
                  <label key={row.id} className={isKeeper ? "selected" : ""}>
                    <input
                      type="radio"
                      name="bulk-merge-keeper"
                      checked={isKeeper}
                      disabled={actionBusy}
                      onChange={() => setBulkMergeTarget((current) => ({ ...current, keeperId: row.id }))}
                    />
                    <span>
                      <strong>{recordLabel(row)}</strong>
                      <small>
                        {isArtist
                          ? `${row.total_releases ?? row.release_count ?? 0} releases`
                          : row.artist_display || "No artist credit"}
                        {" · "}id {row.id}
                      </small>
                    </span>
                    <b>{isKeeper ? "KEEP" : "MERGE"}</b>
                  </label>
                );
              })}
            </div>
            <p style={{ fontSize: 12, color: "#888", margin: "12px 0 0" }}>
              {isArtist
                ? "Releases and aliases move to the keeper."
                : "Monthly chart points are combined, duplicate weekly entries are removed, and certifications are recalculated."}
            </p>
            <div className="cms-actions right">
              <button className="cms-btn light" onClick={() => setBulkMergeTarget(null)} disabled={actionBusy}>Cancel</button>
              <button className="cms-btn" onClick={mergeSelected} disabled={!bulkMergeTarget.keeperId || actionBusy}>
                {actionBusy ? "Merging…" : `Merge ${bulkMergeTarget.rows.length - 1} into keeper`}
              </button>
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
              <strong>"{recordLabel(deleteTarget)}"</strong>
              {!isArtist && deleteTarget.artist_display ? ` by ${deleteTarget.artist_display}` : ""}
            </p>
            <p style={{ fontSize: 13, color: "#c0392b", margin: "0 0 16px" }}>
              This will permanently delete the {isArtist ? "artist" : "release"}
              {isRelease ? " and all its chart entries and certifications" : ""}. This cannot be undone.
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
                      clearTimeout(keeperSearchTimerRef.current);
                      keeperSearchTimerRef.current = setTimeout(() => searchForKeeper(q), 280);
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
  return Object.fromEntries(fields.map((field) => [
    field.name,
    field.defaultValue ??
      (field.type === "ordered-multiselect"
        ? []
        : field.name === "status"
          ? ([WORKFLOW_STATUS_OPTIONS, CHART_STATUS_OPTIONS].includes(field.options) ? "draft" : "active")
          : ""),
  ]));
}
