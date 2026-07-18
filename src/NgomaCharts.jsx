import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { API_BASE, resolveMediaUrl } from "./api/config.js";
import { artistNameVariants, findArtistProfileInPublicData, getArtistImageUrl, withResolvedArtistImage } from "./utils/artistImages.js";
import {
  fetchNews, fetchCertifications, fetchChartImageData, fetchAppData, fetchRevision,
} from "./api/public.js";
import {
  releaseTitle, normFt, releaseArtist, cleanArtistDisplay,
  formatCreditMembers, profileNames, splitCreditNames,
  artistCreditMembers, formatArtistCredit,
  protectedArtistCreditNames,
  firstFiniteNumber, certificationKey,
  getMonthYearParts, platformToSlug,
  normArtistKey, artistSetKey, entryKey, sameRelease, normalizeRankedRows,
  mv, resolveMovementFromHistory, mapPublicNews,
} from "./utils/chartHelpers.js";
import { normalizePublicPayload, publishedMonthOptions, runtimePublicData } from "./utils/publicDataRuntime.js";
import {
  buildAutomaticCertifications,
  buildAutomaticNews,
  mergeCertifications,
  mergeNews,
} from "./utils/automaticPublicContent.js";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  CartesianGrid,
} from "recharts";
import PremiumChartsPage, { getArtistCountry } from "./components/PremiumChartsPage";
import ArtistAmbientField from "./components/ArtistAmbientField.jsx";
import EntryThumb from "./components/EntryThumb.jsx";

// Persists cover images fetched from the live API so the Kenyan chart
// (which never calls the API directly) can still show artwork.
const coverImageCache = new Map();

import AboutPage from "./pages/AboutPage";
import NewsDetailPage from "./pages/NewsDetailPage";
import NewsPage from "./pages/NewsPage";
import CertificationsPage from "./pages/CertificationsPage";
import YearEndPage from "./pages/YearEndPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import ArtistDetailPage from "./pages/ArtistDetailPage";
import ReleaseDetailPage from "./pages/ReleaseDetailPage";

const PUBLIC_DATA = runtimePublicData();
const MONTH_OPTIONS = publishedMonthOptions(PUBLIC_DATA);
const MONTHS = MONTH_OPTIONS.map((item) => item.label);
const FULL = PUBLIC_DATA.full || {};
const DEFAULT_SINGLES_PLATFORM_KEYS = ["APPLE MUSIC","AUDIOMACK","BOOMPLAY","SPOTIFY","YOUTUBE","SHAZAM"];
const DEFAULT_ALBUM_PLATFORM_KEYS = ["APPLE MUSIC","AUDIOMACK"];
function replaceArray(target, values = []) {
  target.splice(0, target.length, ...values);
}
function replaceObject(target, source = {}) {
  Object.keys(target).forEach((key) => delete target[key]);
  Object.assign(target, source || {});
}
const PROTECTED_ARTIST_CREDIT_NAMES = protectedArtistCreditNames(PUBLIC_DATA.artists || []);
// Ensures cover_image (and artist image) URLs are absolute so they load correctly
// when the frontend is on a different origin (Netlify) from the backend (Railway).
const CMS_ARTISTS_BY_ID = new Map((PUBLIC_DATA.artists || []).map((artist) => [Number(artist.id), artist]));
const versionedMediaUrl = (url, version = "") => {
  const resolved = resolveMediaUrl(url || "");
  if (!resolved || !version) return resolved;
  const separator = resolved.includes("?") ? "&" : "?";
  return `${resolved}${separator}v=${encodeURIComponent(String(version))}`;
};
const normalizeRelease = (release = {}) => {
  const embeddedPrimary = Array.isArray(release.primary_artists) ? release.primary_artists : [];
  const embeddedFeatured = Array.isArray(release.featured_artist_profiles) ? release.featured_artist_profiles : [];
  const embeddedById = new Map(
    [...embeddedPrimary, ...embeddedFeatured]
      .filter((artist) => artist?.id)
      .map((artist) => [Number(artist.id), artist])
  );
  const primaryIds = Array.isArray(release.primary_artist_ids) ? release.primary_artist_ids : [];
  const featuredIds = Array.isArray(release.featured_artist_ids) ? release.featured_artist_ids : [];
  let primaryArtists = primaryIds.length
    ? primaryIds.map((id) => CMS_ARTISTS_BY_ID.get(Number(id)) || embeddedById.get(Number(id))).filter(Boolean)
    : embeddedPrimary.map((artist) => CMS_ARTISTS_BY_ID.get(Number(artist?.id)) || artist);
  const canonicalLead = CMS_ARTISTS_BY_ID.get(Number(release.artist_id));
  if (canonicalLead && (!primaryArtists.length || primaryArtists[0]?.status === "archived")) {
    primaryArtists = [canonicalLead, ...primaryArtists.slice(1)];
  }
  const featuredArtistProfiles = featuredIds.length
    ? featuredIds.map((id) => CMS_ARTISTS_BY_ID.get(Number(id)) || embeddedById.get(Number(id))).filter(Boolean)
    : embeddedFeatured.map((artist) => CMS_ARTISTS_BY_ID.get(Number(artist?.id)) || artist);

  return {
    ...release,
    primary_artists: primaryArtists,
    primary_artist_ids: primaryArtists.length ? primaryArtists.map((artist) => artist.id) : primaryIds,
    featured_artist_profiles: featuredArtistProfiles,
    featured_artist_ids: featuredArtistProfiles.length ? featuredArtistProfiles.map((artist) => artist.id) : featuredIds,
    cover_image: versionedMediaUrl(
      release.cover_image || release.cover_image_url || "",
      release.image_updated_at || release.updated_at || release.modified_at || ""
    ),
  };
};
const normalizeArtist = (artist) => withResolvedArtistImage(artist || {}, { name: artist?.display_name || artist?.public_name || artist?.name, artists: [artist || {}] });
const PUBLIC_RELEASES_BY_ID = new Map((PUBLIC_DATA.releases || []).map((release) => [Number(release.id), normalizeRelease(release)]));
// Fallback index by normalised title — used when chart entries lack release_id.
const PUBLIC_RELEASES_BY_TITLE = new Map();
const releaseTitleKey = (item = {}) => String(item.t || item.title || "").trim().toLowerCase();
const primaryReleaseArtist = (item = {}) =>
  item.primary_artist_credit ||
  item.primary_artist ||
  item.pa ||
  profileNames(item.primary_artists)[0] ||
  item.artist ||
  item.a ||
  "";
const primaryOnlyReleaseKey = (item = {}) => {
  const title = releaseTitleKey(item);
  const artist = normArtistKey(primaryReleaseArtist(item));
  return title && artist ? `${title}|||${artist}` : "";
};
const releaseLookupKey = (release = {}) =>
  entryKey({
    ...release,
    t: release.title || release.t,
    title: release.title || release.t,
    artist_credit: release.artist_credit || release.artist_display || "",
    a: release.a || release.artist || "",
    featured_artists: release.featured_artist_credit || release.featured_artists || release.fa || "",
  });
const entryPrimaryFallbackKey = (entry = {}) => {
  const fallback = primaryOnlyReleaseKey(entry);
  return fallback && entryKey(entry) === fallback ? fallback : "";
};
const rememberReleaseTitle = (release) => {
  const key = releaseTitleKey(release);
  if (!key) return;
  const existing = PUBLIC_RELEASES_BY_TITLE.get(key);
  if (existing && Number(existing.id) !== Number(release.id)) {
    PUBLIC_RELEASES_BY_TITLE.set(key, null);
    return;
  }
  if (!PUBLIC_RELEASES_BY_TITLE.has(key)) PUBLIC_RELEASES_BY_TITLE.set(key, release);
};
const releaseMatchesEntryCredit = (release, entry) => {
  if (!release) return false;
  const releaseKey = releaseLookupKey(release);
  const key = entryKey(entry);
  const fallbackKey = entryPrimaryFallbackKey(entry);
  return releaseKey === key || (fallbackKey && releaseKey === fallbackKey);
};
// Bounded edit distance — walks off early past `max` so a long mismatched
// pair (e.g. a query word against an unrelated field) doesn't cost a full O(n*m) pass.
const boundedLevenshtein = (a, b, max) => {
  if (a === b) return 0;
  const al = a.length, bl = b.length;
  if (Math.abs(al - bl) > max) return max + 1;
  if (!al) return bl;
  if (!bl) return al;
  let prev = new Array(bl + 1);
  for (let j = 0; j <= bl; j++) prev[j] = j;
  for (let i = 1; i <= al; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[bl];
};
// Score one query token against one text token: exact/prefix/substring first,
// falling back to typo-tolerant edit distance scaled to the token's length.
const fuzzyTokenScore = (word, q) => {
  if (!word || !q) return 0;
  if (word === q) return 100;
  if (word.startsWith(q)) return 88;
  if (word.includes(q)) return 74;
  // Typo tolerance only kicks in past 3 characters — below that, a single
  // edit distance is too large a fraction of the token and just adds noise.
  if (q.length <= 3) return 0;
  const maxDist = q.length <= 6 ? 1 : q.length <= 9 ? 2 : 3;
  const dist = boundedLevenshtein(word, q, maxDist);
  if (dist > maxDist) return 0;
  return 60 - dist * 14;
};
// Explorative + typo-tolerant match: query tokens each need a decent match
// against some word in the (already-lowercased) search text; score sums the
// best per-token matches so closer/more-complete matches rank higher.
const fuzzyMatchScore = (searchText, query) => {
  if (!searchText || !query) return 0;
  if (searchText.includes(query)) return 100 + query.length;
  const words = searchText.split(/\s+/).filter(Boolean);
  const qTokens = query.split(/\s+/).filter(Boolean);
  let total = 0;
  for (const qt of qTokens) {
    let best = 0;
    for (const w of words) {
      const s = fuzzyTokenScore(w, qt);
      if (s > best) best = s;
      if (best === 100) break;
    }
    if (best === 0) return 0;
    total += best;
  }
  return total / qTokens.length;
};
const lookupReleaseForEntry = (entry = {}) => {
  const id = Number(entry.release_id || entry.releaseId || entry.release || entry.release_pk);
  if (Number.isFinite(id) && id > 0) {
    const byId = PUBLIC_RELEASES_BY_ID.get(id);
    if (byId) return byId;
  }
  const exact = PUBLIC_RELEASES_BY_KEY.get(entryKey(entry));
  if (exact) return exact;
  const fallbackKey = entryPrimaryFallbackKey(entry);
  if (fallbackKey) {
    const fallback = PUBLIC_RELEASES_BY_KEY.get(fallbackKey);
    if (fallback) return fallback;
  }
  const titleFallback = PUBLIC_RELEASES_BY_TITLE.get(releaseTitleKey(entry));
  return releaseMatchesEntryCredit(titleFallback, entry) ? titleFallback : null;
};
(PUBLIC_DATA.releases || []).forEach((release) => rememberReleaseTitle(normalizeRelease(release)));
const PUBLIC_ARTISTS_BY_NAME = new Map();
(PUBLIC_DATA.artists || []).forEach((artist) => {
  const normalizedArtist = normalizeArtist(artist);
  artistNameVariants(artist).forEach((name) => {
    const key = String(name || "").trim().toLowerCase();
    if (key && !PUBLIC_ARTISTS_BY_NAME.has(key)) PUBLIC_ARTISTS_BY_NAME.set(key, normalizedArtist);
    const normalizedKey = normArtistKey(key);
    if (normalizedKey && !PUBLIC_ARTISTS_BY_NAME.has(normalizedKey)) PUBLIC_ARTISTS_BY_NAME.set(normalizedKey, normalizedArtist);
  });
});
const publicArtistForName = (name = "") => {
  const key = String(name || "").trim().toLowerCase();
  if (!key) return null;
  return (
    PUBLIC_ARTISTS_BY_NAME.get(key) ||
    PUBLIC_ARTISTS_BY_NAME.get(normArtistKey(key)) ||
    findArtistProfileInPublicData(name) ||
    null
  );
};
const publicArtistCreditMembers = (entry = {}) =>
  artistCreditMembers(entry, PROTECTED_ARTIST_CREDIT_NAMES);
const publicArtistChartCreditMembers = (entry = {}) => {
  const structuredKeys = new Set(
    [
      ...profileNames(entry.primary_artists),
      ...profileNames(entry.featured_artist_profiles),
    ].map(normArtistKey).filter(Boolean)
  );

  return publicArtistCreditMembers(entry).filter((artistName) => {
    const key = normArtistKey(artistName);
    if (!key) return false;
    return structuredKeys.has(key) || Boolean(publicArtistForName(artistName));
  });
};
const SITE_SETTINGS = PUBLIC_DATA.settings || {};
const settingValue = (key, fallback = {}) => SITE_SETTINGS[key] ?? fallback;
const siteNameSetting = settingValue("site_name", {});
const SITE_NAME = typeof siteNameSetting === "string" ? siteNameSetting : (siteNameSetting.name || "Ngoma Charts");
const THEME_SETTING = settingValue("theme", {});
const SOCIAL_LINKS = settingValue("social_links", {});
const FOOTER_SETTING = settingValue("footer", {});
const DEFAULT_CHART_SETTING = settingValue("default_chart", {});
const MAINTENANCE_SETTING = settingValue("maintenance_mode", {});
const PUBLIC_METHODOLOGY = (PUBLIC_DATA.methodology || [])[0] || null;

// ===== Full Top-50 dataset supplied by the Django public API =====
const CURRENT_MONTH = PUBLIC_DATA.latest_published_month?.label || MONTHS[MONTHS.length - 1];
const DATA_PERIOD = `${MONTHS[0]} – ${CURRENT_MONTH}`;
const latestPublishedMonthLabel = () => MONTHS[MONTHS.length - 1] || CURRENT_MONTH;
const PUBLIC_PLATFORMS = PUBLIC_DATA.platforms || [];
const chartPlatformKeys = (chartType) => Object.keys(FULL?.[chartType]?.platforms || {}).map((name) => name.toUpperCase());
const availablePlatformKeys = (chartType, supportField, defaults) => {
  const dataKeys = chartPlatformKeys(chartType);
  const dataKeySet = new Set(dataKeys);
  const metadataKeys = PUBLIC_PLATFORMS
    .filter((item) => Boolean(item?.[supportField]) || dataKeySet.has(String(item?.name || "").toUpperCase()))
    .map((item) => String(item.name || "").toUpperCase())
    .filter(Boolean);
  return [...new Set([
    ...metadataKeys,
    ...defaults.filter((name) => dataKeySet.has(name)),
    ...dataKeys,
  ])];
};
const S_PLATS = ["Combined", ...availablePlatformKeys("singles", "supports_singles", DEFAULT_SINGLES_PLATFORM_KEYS)];
const A_PLATS = ["Combined", ...availablePlatformKeys("albums", "supports_albums", DEFAULT_ALBUM_PLATFORM_KEYS)];
const KENYAN_CHART = "Kenyan";
const PLAT_LABEL = PUBLIC_PLATFORMS.reduce((result, item) => ({...result, [item.name.toUpperCase()]: item.name}), {"APPLE MUSIC":"Apple Music","AUDIOMACK":"Audiomack","BOOMPLAY":"Boomplay","SPOTIFY":"Spotify","YOUTUBE":"YouTube","SHAZAM":"Shazam"});
const PC = PUBLIC_PLATFORMS.reduce((result, item) => ({...result, [item.name]: item.brand_color || item.color, [item.name.toUpperCase()]: item.brand_color || item.color}), {"Apple Music":"#FC3C44","APPLE MUSIC":"#FC3C44","Audiomack":"#F68B1F","AUDIOMACK":"#F68B1F","Boomplay":"#00FFFF","BOOMPLAY":"#00FFFF","Spotify":"#1DB954","SPOTIFY":"#1DB954","YouTube":"#FF0000","YOUTUBE":"#FF0000","Shazam":"#0088FF","SHAZAM":"#0088FF"});
const GOLD=THEME_SETTING.primary || "#B8860B"; const SILVER="#8C8C8C"; const BRONZE="#CD7F32";
// Distinct from SILVER (used for #2 rank medals elsewhere) so the Platinum
// certification badge can read as a brighter silver-white on its own.
const PLATINUM_SILVER="#A9AFB5";
const MEDALS=[GOLD,SILVER,BRONZE];
const SYSTEM_SANS = "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const F = SYSTEM_SANS;
const SF = SYSTEM_SANS;
const CC = [GOLD,"#E53935","#2DB04A","#1565C0","#7B1FA2","#E65100","#00897B","#37474F","#AD1457","#558B2F"];
const VO = [{l:"Top 10",c:10},{l:"Top 20",c:20},{l:"Top 50",c:50}];
const CERTIFICATION_DEFAULT_THRESHOLDS = { diamond: 600, platinum: 400, gold: 200 };
const certificationThresholds = Object.fromEntries((PUBLIC_DATA.certification_rules || []).map((item) => [item.level, Number(item.threshold)]));
const CERTIFICATION_LEVELS = [
  { level: "diamond", label: "Diamond", icon: "💎", pts: certificationThresholds.diamond || CERTIFICATION_DEFAULT_THRESHOLDS.diamond, color: "#7B1FA2" },
  { level: "platinum", label: "Platinum", icon: "🎵", pts: certificationThresholds.platinum || CERTIFICATION_DEFAULT_THRESHOLDS.platinum, color: PLATINUM_SILVER, iconFilter: "grayscale(1) brightness(1.7)" },
  { level: "gold", label: "Gold", icon: "📀", pts: certificationThresholds.gold || CERTIFICATION_DEFAULT_THRESHOLDS.gold, color: GOLD },
];
function refreshCertificationThresholds() {
  replaceObject(
    certificationThresholds,
    Object.fromEntries((PUBLIC_DATA.certification_rules || []).map((item) => [item.level, Number(item.threshold)]))
  );
  CERTIFICATION_LEVELS.forEach((item) => {
    item.pts = certificationThresholds[item.level] || CERTIFICATION_DEFAULT_THRESHOLDS[item.level];
  });
}
// Lower index = higher tier. A release keeps one Certification row per
// threshold it has ever crossed (see recalculate_certifications on the
// backend), so anywhere a release's "current" level is shown must pick the
// highest-ranked row, never just whichever one the API happened to list last.
const CERTIFICATION_LEVEL_RANK = Object.fromEntries(CERTIFICATION_LEVELS.map((l, i) => [l.level, i]));
const getCertificationLevel = (totalPts = 0) => {
  const points = Number(totalPts) || 0;
  return CERTIFICATION_LEVELS.find((item) => points >= item.pts)?.level || null;
};

const certificationMetaForLevel = (level) => CERTIFICATION_LEVELS.find((item) => item.level === level) || null;
const COUNTRY_ACCENTS = {
  BB:"#00267F",CA:"#D80621",CD:"#007FFF",CI:"#F77F00",CL:"#D52B1E",DE:"#FFCE00",FR:"#0055A4",GB:"#012169",
  GH:"#CE1126",IN:"#FF9933",JM:"#009B3A",KE:"#006600",KR:"#CD2E3A",NG:"#008751",
  NO:"#BA0C2F",PR:"#ED0000",RW:"#00A1DE",SE:"#006AA7",TZ:"#1EB53A",UG:"#D90000",US:"#3C3B6E",ZA:"#007749",ZW:"#319208",
};
const CountryBadge = ({ artist, item, compact = false, style = {} }) => {
  const country = getArtistCountry(item || { artist });
  const accent = COUNTRY_ACCENTS[country.code] || "#69716B";
  return (
    <span
      title={`${country.country}${country.code ? ` (${country.code})` : ""}`}
      style={{
        display:"inline-flex",alignItems:"center",justifyContent:"center",gap:"6px",
        minWidth:compact?"28px":"36px",height:compact?"28px":"30px",padding:"0 7px",
        borderRadius:compact?"9px":"999px",background:`${accent}12`,border:`1px solid ${accent}45`,
        color:accent,fontFamily:F,fontSize:compact?"9px":"10px",fontWeight:850,whiteSpace:"nowrap",...style,
      }}
    >
      <span style={{fontSize:compact?"9px":"10px",letterSpacing:"0.8px",lineHeight:1}}>{country.code || "—"}</span>
    </span>
  );
};

// Helpers — return entries from FULL with proper month-to-month chart history
const monthIndex = m => MONTHS.indexOf(m);

// Precise CMS release lookup keyed by title + full artist set. Primary-only
// fallback is kept only for releases that do not introduce additional artists.
const PUBLIC_RELEASES_BY_KEY = new Map();
const rememberReleaseLookup = (release) => {
  const fullKey = releaseLookupKey(release);
  if (fullKey && fullKey !== "|||" && !PUBLIC_RELEASES_BY_KEY.has(fullKey)) PUBLIC_RELEASES_BY_KEY.set(fullKey, release);
  const primKey = primaryOnlyReleaseKey(release);
  // Primary-only fallback is safe only for releases whose full credit is also
  // primary-only. It must not collapse a same-title collaboration/remix into
  // the solo version.
  if (primKey && primKey !== fullKey) return;
  if (primKey && primKey !== "|||" && !PUBLIC_RELEASES_BY_KEY.has(primKey)) PUBLIC_RELEASES_BY_KEY.set(primKey, release);
};
(PUBLIC_DATA.releases || []).forEach((release) => {
  const nr = normalizeRelease(release);
  rememberReleaseLookup(nr);
});

// Rebuilds all module-scope release/artist lookup maps from fresh CMS data so that
// cover images and other CMS-managed fields are visible without a page reload.
function rebuildPublicLookups(freshData) {
  const releases = freshData.releases || [];
  const artists = freshData.artists || [];

  CMS_ARTISTS_BY_ID.clear();
  artists.forEach((artist) => CMS_ARTISTS_BY_ID.set(Number(artist.id), artist));

  PUBLIC_RELEASES_BY_ID.clear();
  releases.forEach((release) => PUBLIC_RELEASES_BY_ID.set(Number(release.id), normalizeRelease(release)));

  PUBLIC_RELEASES_BY_TITLE.clear();
  releases.forEach((release) => rememberReleaseTitle(normalizeRelease(release)));

  PUBLIC_ARTISTS_BY_NAME.clear();
  artists.forEach((artist) => {
    const normalizedArtist = normalizeArtist(artist);
    artistNameVariants(artist).forEach((name) => {
      const k = String(name || "").trim().toLowerCase();
      if (k && !PUBLIC_ARTISTS_BY_NAME.has(k)) PUBLIC_ARTISTS_BY_NAME.set(k, normalizedArtist);
      const normalizedKey = normArtistKey(k);
      if (normalizedKey && !PUBLIC_ARTISTS_BY_NAME.has(normalizedKey)) PUBLIC_ARTISTS_BY_NAME.set(normalizedKey, normalizedArtist);
    });
  });

  PUBLIC_RELEASES_BY_KEY.clear();
  releases.forEach((release) => {
    const nr = normalizeRelease(release);
    rememberReleaseLookup(nr);
  });
}

const rawCombined = (ct, m) => normalizeRankedRows(FULL?.[ct]?.combined?.[m] || []);
const rawPlatform = (ct, pl, m) => normalizeRankedRows((FULL?.[ct]?.platforms?.[pl] || {})[m] || []);
const rawKenyanCombined = (ct, m) => normalizeRankedRows((FULL?.[ct]?.regions || {}).KE?.[m] || []);
const rawKenyanArtists = (m) => normalizeRankedRows((FULL?.artists?.regions || {}).KE?.[m] || []);
const combinedEntryCache = new Map();
const kenyanEntryCache = new Map();
const platformEntryCache = new Map();

// Last revision we synced from the server — used by the focus handler to skip
// the expensive fetchAppData() call when nothing has changed since page load.
// Seeded from PUBLIC_DATA so the first focus after a fresh page load is a no-op
// unless a CMS change happened between the server render and the user switching tabs.
let _syncedRevision = PUBLIC_DATA.revision || null;
const rawPlatformIndexCache = new Map();

const getRawPlatformIndex = (ct, pl, m) => {
  const cacheKey = `${ct}|${pl}|${m}`;
  if (!rawPlatformIndexCache.has(cacheKey)) {
    const index = new Map();
    rawPlatform(ct, pl, m).forEach((entry) => {
      const key = entryKey(entry);
      if (!index.has(key)) index.set(key, entry);
    });
    rawPlatformIndexCache.set(cacheKey, index);
  }
  return rawPlatformIndexCache.get(cacheKey);
};

// Builds the "charted in an earlier month" / "charted last month" key sets for
// a given chart + month straight from the synced FULL history. New = never
// appeared in any earlier month; RE = appeared in an earlier month but was
// absent from the immediately preceding month. Used to classify movement
// consistently regardless of what any other data source (e.g. the live
// chart-image endpoint) reports, so the rule applies automatically to every
// future month as soon as it is published.
function historyKeysForMonth(ct, plat, currentMonth) {
  const currentIndex = monthIndex(currentMonth);
  if (currentIndex < 0) return null;
  const getRaw = plat === "Combined"
    ? (monthLabel) => rawCombined(ct, monthLabel)
    : (monthLabel) => rawPlatform(ct, plat, monthLabel);
  const priorKeys = new Set();
  const priorFallbackKeys = new Set();
  const priorIds = new Set();
  let previousKeys = new Set();
  let previousFallbackKeys = new Set();
  let previousIds = new Set();
  let previousRanksByKey = new Map();
  let previousRanksByFallback = new Map();
  let previousRanksById = new Map();
  let currentKeys = new Set();
  let currentFallbackKeys = new Set();
  let currentIds = new Set();
  const appearanceCountsByKey = new Map();
  const appearanceCountsByFallback = new Map();
  const appearanceCountsById = new Map();
  const incrementCount = (map, key) => {
    if (!key) return;
    map.set(key, (map.get(key) || 0) + 1);
  };
  MONTHS.slice(0, currentIndex + 1).forEach((monthLabel, offset) => {
    const monthEntries = getRaw(monthLabel).filter((item) => Number(item.r) <= 50).slice(0, 50);
    const seenThisMonth = new Set();
    monthEntries.forEach((item) => {
      const key = entryKey(item);
      const fallbackKey = movementFallbackKey(item);
      const id = extractReleaseId(item);
      const identity = id ? `id:${id}` : `key:${key}`;
      if (seenThisMonth.has(identity)) return;
      seenThisMonth.add(identity);
      incrementCount(appearanceCountsByKey, key);
      incrementCount(appearanceCountsByFallback, fallbackKey);
      incrementCount(appearanceCountsById, id);
    });
    if (offset < currentIndex) {
      monthEntries.forEach((item) => {
        priorKeys.add(entryKey(item));
        priorFallbackKeys.add(movementFallbackKey(item));
        const id = extractReleaseId(item);
        if (id) priorIds.add(id);
      });
    }
    if (offset === currentIndex - 1) {
      previousKeys = new Set(monthEntries.map(entryKey));
      previousFallbackKeys = new Set(monthEntries.map(movementFallbackKey));
      previousIds = new Set(monthEntries.map(extractReleaseId).filter(Boolean));
      previousRanksByKey = new Map(monthEntries.map((item) => [entryKey(item), Number(item.r)]));
      previousRanksByFallback = new Map(monthEntries.map((item) => [movementFallbackKey(item), Number(item.r)]));
      previousRanksById = new Map(
        monthEntries
          .map((item) => [extractReleaseId(item), Number(item.r)])
          .filter(([id]) => Boolean(id))
      );
    }
    if (offset === currentIndex) {
      currentKeys = new Set(monthEntries.map(entryKey));
      currentFallbackKeys = new Set(monthEntries.map(movementFallbackKey));
      currentIds = new Set(monthEntries.map(extractReleaseId).filter(Boolean));
    }
  });
  return {
    priorKeys,
    priorFallbackKeys,
    priorIds,
    previousKeys,
    previousFallbackKeys,
    previousIds,
    previousRanksByKey,
    previousRanksByFallback,
    previousRanksById,
    currentKeys,
    currentFallbackKeys,
    currentIds,
    appearanceCountsByKey,
    appearanceCountsByFallback,
    appearanceCountsById,
  };
}

// Matches a live chart-image-data entry against history derived from the
// synced FULL bundle. release_id is preferred when both sides have it since
// it is immune to artist-credit text formatting differences between the two
// API endpoints; entryKey is the fallback.
function matchesHistory(entry, releaseId, keySet, idSet) {
  if (releaseId && idSet.has(releaseId)) return true;
  return keySet.has(entry);
}

function extractReleaseId(item) {
  const candidates = [item?.release_id, item?.releaseId, item?.release, item?.release_pk];
  for (const value of candidates) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function positiveChartCount(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function movementFallbackKey(item) {
  const title = String(item?.t || item?.title || "").trim().toLowerCase();
  const artist = normArtistKey(item?.pa || item?.primary_artist || item?.a || item?.artist || item?.artist_credit || "");
  return `${title}|||${artist}`;
}

// Canonical movement identity for cross-month matching.
// release_id is stable across artist-credit formatting changes, so prefer it.
function movementIdentity(item) {
  const id = Number(item?.release_id);
  if (Number.isFinite(id) && id > 0) return `id:${id}`;
  return `key:${entryKey(item)}`;
}

function enrichChartEntries(entries, getRawEntries, currentMonth, totalPlatforms) {
  const currentIndex = monthIndex(currentMonth);
  const historyMonths = currentIndex >= 0 ? MONTHS.slice(0, currentIndex + 1) : [];
  const historyByMonth = historyMonths.map((monthLabel) =>
    getRawEntries(monthLabel).filter((item) => Number(item.r) <= 50).slice(0, 50)
  );
  const previousEntries = currentIndex > 0 ? historyByMonth[currentIndex - 1] : [];
  const previousByKey = new Map();
  const previousByIdentity = new Map();
  previousEntries.forEach((item) => {
    const key = entryKey(item);
    if (!previousByKey.has(key)) previousByKey.set(key, item);
    const identity = movementIdentity(item);
    if (!previousByIdentity.has(identity)) previousByIdentity.set(identity, item);
  });
  const earlierKeys = new Set();
  const earlierIdentities = new Set();
  const historyStats = new Map();

  historyByMonth.forEach((monthEntries, monthOffset) => {
    const seenThisMonth = new Set();
    monthEntries.forEach((item) => {
      const key = entryKey(item);
      const identity = movementIdentity(item);
      if (monthOffset < currentIndex) {
        earlierKeys.add(key);
        earlierIdentities.add(identity);
      }

      const rank = Number(item.r);
      const stats = historyStats.get(identity) || { peakRank: Number.POSITIVE_INFINITY, months: 0 };
      if (Number.isFinite(rank)) stats.peakRank = Math.min(stats.peakRank, rank);
      if (!seenThisMonth.has(identity)) {
        stats.months += 1;
        seenThisMonth.add(identity);
      }
      historyStats.set(identity, stats);
    });
  });

  return entries.map((e) => {
    const key = entryKey(e);
    const identity = movementIdentity(e);
    const previousEntry = previousByIdentity.get(identity) || previousByKey.get(key);
    const appearedBefore = earlierIdentities.has(identity) || earlierKeys.has(key);
    const stats = historyStats.get(identity) || {};
    const peakRank = stats.peakRank;
    const monthsOnChart = stats.months || 0;

    const platformCount = e.pl
      ? Number(String(e.pl).split("/")[0]) || undefined
      : undefined;

    const releaseDetails = lookupReleaseForEntry(e) || {};
    const primaryArtists = releaseDetails.primary_artists?.length
      ? releaseDetails.primary_artists
      : (e.primary_artists || []);
    const featuredProfiles = releaseDetails.featured_artist_profiles?.length
      ? releaseDetails.featured_artist_profiles
      : (e.featured_artist_profiles || []);
    const primaryArtist = cleanArtistDisplay(String(
      releaseDetails.primary_artist_credit ||
      releaseDetails.primary_artist ||
      e.pa ||
      e.a ||
      ""
    ).trim());
    const featuredArtists = String(
      releaseDetails.featured_artist_credit ||
      releaseDetails.featured_artists ||
      e.fa ||
      ""
    ).trim();
    const artistCredit = cleanArtistDisplay(
      releaseDetails.artist_credit || e.artist_credit || formatArtistCredit(
        primaryArtist, featuredArtists, primaryArtists, featuredProfiles
      )
    );
    const releaseTitleValue = releaseDetails.title || e.t;

    return {
      ...e,
      ...releaseDetails,
      id: e.id,
      release_id: e.release_id || releaseDetails.id,
      rank: e.r,
      r: e.r,
      title: releaseTitleValue,
      t: releaseTitleValue,
      artist: artistCredit,
      artist_credit: artistCredit,
      a: artistCredit,
      primary_artist: primaryArtist,
      primary_artist_credit: primaryArtist,
      pa: primaryArtist,
      featured_artists: featuredArtists,
      fa: featuredArtists,
      primary_artists: primaryArtists,
      featured_artist_profiles: featuredProfiles,
      pts: e.p,
      rawPts: e.rp ?? null,
      plat: e.pl || (platformCount ? `${platformCount}/${totalPlatforms}` : ""),
      prev: previousEntry ? previousEntry.r : null,
      last_month: previousEntry ? previousEntry.r : "—",
      first: false,
      is_new: !appearedBefore,
      reentry: !previousEntry && appearedBefore,
      movement: previousEntry ? undefined : appearedBefore ? "reentry" : "new",
      peak_rank: peakRank === 999 ? e.r : peakRank,
      weeks_on_chart: e.w ?? "—",
      months_on_chart: monthsOnChart || "—",
      times_on_chart: monthsOnChart || "—",
      platform_count: platformCount,
      platform_max: e.pl ? Number(String(e.pl).split("/")[1]) || totalPlatforms : totalPlatforms,
      release_year: releaseDetails.release_year ?? e.y ?? null,
      confidence: releaseDetails.confidence || e.c || "",
      country: primaryArtists[0]?.country || releaseDetails.country || e.co || "",
      country_code: primaryArtists[0]?.country_code || releaseDetails.country_code || e.cc || "",
      artist_country: primaryArtists[0]?.country || releaseDetails.country || e.co || "",
      artist_country_code: primaryArtists[0]?.country_code || releaseDetails.country_code || e.cc || "",
      cover_image: releaseDetails.cover_image || resolveMediaUrl(e.cover_image || ""),
    };
  });
}

const getCombined = (ct, m) => {
  const cacheKey = `${ct}|${m}`;
  if (!combinedEntryCache.has(cacheKey)) {
    combinedEntryCache.set(
      cacheKey,
      enrichChartEntries(rawCombined(ct, m), (monthLabel) => rawCombined(ct, monthLabel), m, ct === "albums" ? A_PLATS.length - 1 : S_PLATS.length - 1)
    );
  }
  return combinedEntryCache.get(cacheKey);
};

const getKenyanCombined = (ct, m) => {
  const cacheKey = `${ct}|${m}`;
  if (!kenyanEntryCache.has(cacheKey)) {
    kenyanEntryCache.set(
      cacheKey,
      enrichChartEntries(rawKenyanCombined(ct, m), (monthLabel) => rawKenyanCombined(ct, monthLabel), m, ct === "albums" ? A_PLATS.length - 1 : S_PLATS.length - 1)
    );
  }
  return kenyanEntryCache.get(cacheKey);
};

const getPlatform = (ct, pl, m) => {
  const cacheKey = `${ct}|${pl}|${m}`;
  if (!platformEntryCache.has(cacheKey)) {
    platformEntryCache.set(
      cacheKey,
      enrichChartEntries(rawPlatform(ct, pl, m), (monthLabel) => rawPlatform(ct, pl, monthLabel), m, 1)
    );
  }
  return platformEntryCache.get(cacheKey);
};

const top50Only = (rows = []) => rows.filter((entry) => Number(entry.rank ?? entry.r) <= 50).slice(0, 50);
const artistTop50Points = (entry = {}) => {
  const rank = Number(entry.rank ?? entry.r);
  if (!Number.isFinite(rank) || rank < 1 || rank > 50) return 0;
  return Number(entry.pts ?? entry.p ?? entry.total_points) || 0;
};

const getArtistSourceCombined = (chartType, monthLabel) => {
  if (chartType === "artists") {
    return getArtistPlatformSource("Combined", monthLabel);
  }
  return getCombined(chartType, monthLabel);
};

const defaultComparisonKey = (chartType, index, monthLabel = latestPublishedMonthLabel()) => {
  const entry = getCombined(chartType, monthLabel)[index];
  return entry ? `${entry.title} — ${entry.artist}` : "";
};

const comparisonDefaultKeys = (chartType, throughMonth = latestPublishedMonthLabel()) => {
  const cutoffIndex = Math.max(0, monthIndex(throughMonth));
  const includedMonths = MONTHS.slice(0, cutoffIndex + 1);
  const groups = new Map();

  includedMonths.forEach((monthLabel) => {
    getArtistSourceCombined(chartType, monthLabel).forEach((entry) => {
      const key = `${entry.title} — ${entry.artist}`;
      const current = groups.get(key) || {
        key,
        title: entry.title,
        artist: entry.artist,
        months: new Set(),
        totalPts: 0,
        peak: Number.POSITIVE_INFINITY,
      };
      current.months.add(monthLabel);
      current.totalPts += chartType === "artists" ? artistTop50Points(entry) : Number(entry.pts) || 0;
      current.peak = Math.min(current.peak, Number(entry.rank) || Number.POSITIVE_INFINITY);
      groups.set(key, current);
    });
  });

  return [...groups.values()]
    .sort((a, b) => b.months.size - a.months.size || b.totalPts - a.totalPts || a.peak - b.peak || a.title.localeCompare(b.title))
    .map((entry) => entry.key);
};

const buildCombinedYearEnd = (chartType) => {
  const releases = new Map();

  MONTHS.forEach((monthLabel) => {
    getArtistSourceCombined(chartType, monthLabel).forEach((entry) => {
      const key = entryKey(entry);
      const current = releases.get(key) || {
        t: entry.title,
        a: entry.artist,
        primary_artist: entry.primary_artist,
        featured_artists: entry.featured_artists,
        release_year: entry.release_year,
        confidence: entry.confidence,
        country_code: entry.country_code,
        cover_image: entry.cover_image || "",
        totalPts: 0,
        months: 0,
        best: Number.POSITIVE_INFINITY,
      };

      if (!current.cover_image && entry.cover_image) current.cover_image = entry.cover_image;
      current.totalPts += chartType === "artists" ? artistTop50Points(entry) : Number(entry.pts) || 0;
      current.months += 1;
      current.best = Math.min(current.best, Number(entry.rank) || Number.POSITIVE_INFINITY);
      releases.set(key, current);
    });
  });

  return [...releases.values()].sort((a, b) =>
    b.totalPts - a.totalPts || a.best - b.best || a.t.localeCompare(b.t)
  );
};

// Platform- and window-aware release totals for the Year-End page's All
// Time / Best of Year toggle. Unlike buildCombinedYearEnd (which always
// aggregates every published month for certification math), this takes an
// explicit months window and platform so the display can switch between
// full history and a rolling last-12-months slice without touching
// certification totals.
const buildYearEndReleaseRows = (chartType, months, platform = "Combined") => {
  const releases = new Map();

  months.forEach((monthLabel) => {
    const source = platform === "Combined" ? getCombined(chartType, monthLabel) : getPlatform(chartType, platform, monthLabel);
    source.forEach((entry) => {
      const key = entryKey(entry);
      const current = releases.get(key) || {
        t: entry.title,
        a: entry.artist,
        primary_artist: entry.primary_artist,
        featured_artists: entry.featured_artists,
        release_year: entry.release_year,
        confidence: entry.confidence,
        country_code: entry.country_code,
        cover_image: entry.cover_image || "",
        totalPts: 0,
        months: 0,
        best: Number.POSITIVE_INFINITY,
      };

      if (!current.cover_image && entry.cover_image) current.cover_image = entry.cover_image;
      current.totalPts += Number(entry.pts) || 0;
      current.months += 1;
      current.best = Math.min(current.best, Number(entry.rank) || Number.POSITIVE_INFINITY);
      releases.set(key, current);
    });
  });

  return [...releases.values()].sort((a, b) =>
    b.totalPts - a.totalPts || a.best - b.best || a.t.localeCompare(b.t)
  );
};

// Artists counterpart to buildYearEndReleaseRows — platform- and
// window-aware, aggregating credited artist names across the given months.
const buildYearEndArtistRows = (months, platform = "Combined") => {
  const artistMap = new Map();

  months.forEach((monthLabel) => {
    getArtistPlatformSource(platform, monthLabel).forEach((entry) => {
      publicArtistChartCreditMembers(entry).forEach((artistName) => {
        const key = artistName.toLowerCase();
        const current = artistMap.get(key) || {
          t: artistName,
          a: "",
          primary_artist: artistName,
          totalPts: 0,
          entriesSet: new Set(),
          best: Number.POSITIVE_INFINITY,
          monthsSet: new Set(),
        };
        current.totalPts += artistTop50Points(entry);
        const releaseIdentity = entry.release_id ? `id:${entry.release_id}` : entryKey(entry);
        current.entriesSet.add(`${entry.sourceChartType || entry.type || "release"}|${releaseIdentity}`);
        current.best = Math.min(current.best, Number(entry.rank ?? entry.r) || Number.POSITIVE_INFINITY);
        current.monthsSet.add(monthLabel);
        artistMap.set(key, current);
      });
    });
  });

  return [...artistMap.values()]
    .map(({ monthsSet, entriesSet, t, ...rest }) => {
      const artistProfile = publicArtistForName(t) || {};
      const artistImage = getArtistImageUrl(
        { ...artistProfile, title: t, artist_profile: artistProfile },
        { name: t, artists: [artistProfile] }
      );
      return {
        ...rest,
        t,
        months: monthsSet.size,
        entries: entriesSet.size,
        artist_profile: artistProfile,
        image: artistImage,
        cover_image: artistImage,
      };
    })
    .sort((a, b) => b.totalPts - a.totalPts || a.best - b.best || a.t.localeCompare(b.t));
};

const combinedArtistsCache = new Map();
const buildCombinedArtists = (chartType, throughMonth = latestPublishedMonthLabel()) => {
  const cacheKey = `${chartType}|${throughMonth}`;
  if (combinedArtistsCache.has(cacheKey)) return combinedArtistsCache.get(cacheKey);

  const cutoffIndex = Math.max(0, monthIndex(throughMonth));
  const includedMonths = MONTHS.slice(0, cutoffIndex + 1);
  const artistMap = new Map();
  const cumulativeTotals = new Map();
  const previousRanks = new Map();

  includedMonths.forEach((monthLabel, monthOffset) => {
    getArtistSourceCombined(chartType, monthLabel).forEach((entry) => {
      publicArtistChartCreditMembers(entry).forEach((artistName) => {
        const key = artistName.toLowerCase();
        const current = artistMap.get(key) || {
          n: artistName,
          p: 0,
          m: 0,
          t: 0,
          placements: 0,
          rank: Number.POSITIVE_INFINITY,
          prevRank: null,
          pk: Number.POSITIVE_INFINITY,
          mp: {},
          rh: {},
          months: new Set(),
          titles: new Set(),
        };

        const points = chartType === "artists" ? artistTop50Points(entry) : Number(entry.pts) || 0;
        current.p += points;
        current.placements += 1;
        current.mp[monthLabel] = (current.mp[monthLabel] || 0) + points;
        current.months.add(monthLabel);
        const releaseIdentity = entry.release_id ? `id:${entry.release_id}` : entryKey(entry);
        current.titles.add(`${entry.sourceChartType || chartType}|${releaseIdentity}`);
        artistMap.set(key, current);
        cumulativeTotals.set(key, (cumulativeTotals.get(key) || 0) + points);
      });
    });

    [...cumulativeTotals.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .forEach(([key], index) => {
        const artist = artistMap.get(key);
        if (!artist) return;
        const rank = index + 1;
        artist.rh[monthLabel] = rank;
        artist.pk = Math.min(artist.pk, rank);
        if (monthOffset === includedMonths.length - 2) previousRanks.set(key, rank);
        if (monthOffset === includedMonths.length - 1) artist.rank = rank;
      });
  });

  const result = [...artistMap.entries()]
    .map(([key, { months, titles, placements, ...artist }]) => ({
      ...artist,
      m: months.size,
      t: placements,
      unique_releases: titles.size,
      prevRank: previousRanks.get(key) || null,
      pk: Number.isFinite(artist.pk) ? artist.pk : "—",
    }))
    .sort((a, b) => a.rank - b.rank || b.p - a.p || a.n.localeCompare(b.n));
  combinedArtistsCache.set(cacheKey, result);
  return result;
};


const ARTIST_PLATS = S_PLATS.filter((platform) => platform !== "Combined");
const artistPlatformSourceCache = new Map();
const artistChartCache = new Map();

const getArtistPlatformSource = (platform = "Combined", monthLabel = latestPublishedMonthLabel()) => {
  const cacheKey = `${platform}|${monthLabel}`;
  if (artistPlatformSourceCache.has(cacheKey)) return artistPlatformSourceCache.get(cacheKey);

  const rows = [];
  const addArtistSourceRows = (chartType, sourcePlatform, releaseType, sourceRows) => {
    top50Only(sourceRows).forEach((entry) => {
      rows.push({
        ...entry,
        sourceChartType: chartType,
        sourcePlatform,
        type: releaseType,
      });
    });
  };
  const addPlatformTop50 = (chartType, sourcePlatform, releaseType) => {
    addArtistSourceRows(chartType, sourcePlatform, releaseType, getPlatform(chartType, sourcePlatform, monthLabel));
  };

  if (platform === KENYAN_CHART) {
    addArtistSourceRows("singles", KENYAN_CHART, "single", getKenyanCombined("singles", monthLabel));
    addArtistSourceRows("albums", KENYAN_CHART, "album", getKenyanCombined("albums", monthLabel));
  } else if (platform === "Combined") {
    addArtistSourceRows("singles", "Combined", "single", getCombined("singles", monthLabel));
    addArtistSourceRows("albums", "Combined", "album", getCombined("albums", monthLabel));
  } else {
    addPlatformTop50("singles", platform, "single");
    if (A_PLATS.includes(platform)) {
      addPlatformTop50("albums", platform, "album");
    }
  }

  artistPlatformSourceCache.set(cacheKey, rows);
  return rows;
};

const getArtistPlatformHits = (artistName = "", monthLabel = latestPublishedMonthLabel()) => {
  const normalized = String(artistName || "").trim().toLowerCase();
  if (!normalized) return [];
  return ARTIST_PLATS.filter((platform) =>
    getArtistPlatformSource(platform, monthLabel).some((entry) =>
      publicArtistChartCreditMembers(entry).some((member) => member.toLowerCase() === normalized)
    )
  );
};

const embeddedArtistProfileForName = (artistName = "", entries = []) => {
  const wanted = normArtistKey(artistName);
  if (!wanted) return null;

  let fallback = null;
  for (const entry of entries) {
    const candidates = [
      entry?.artist_profile,
      entry?.artistProfile,
      ...(Array.isArray(entry?.primary_artists) ? entry.primary_artists : []),
      ...(Array.isArray(entry?.featured_artist_profiles) ? entry.featured_artist_profiles : []),
    ].filter((candidate) => candidate && typeof candidate === "object");

    for (const candidate of candidates) {
      const names = artistNameVariants(candidate);
      if (!names.some((name) => normArtistKey(name) === wanted)) continue;
      if (getArtistImageUrl(candidate, { name: artistName, artists: [candidate] })) return candidate;
      fallback ||= candidate;
    }
  }
  return fallback;
};

const aggregateArtistsForMonth = (monthLabel = latestPublishedMonthLabel(), platform = "Combined") => {
  const artistMap = new Map();
  const kenyanOnly = platform === KENYAN_CHART;

  getArtistPlatformSource(platform, monthLabel).forEach((entry) => {
    publicArtistChartCreditMembers(entry).forEach((artistName) => {
      const key = artistName.toLowerCase();
      const country = getArtistCountry({ artist: artistName });
      if (
        kenyanOnly &&
        (
          String(country.listedCountry || "").trim().toLowerCase() !== "kenya" ||
          String(country.listedCode || "").trim().toUpperCase() !== "KE"
        )
      ) return;
      const current = artistMap.get(key) || {
        n: artistName,
        p: 0,
        entries: new Set(),
        releases: [],
        country,
      };
      const releaseIdentity = entry.release_id ? `id:${entry.release_id}` : entryKey(entry);
      const releaseKey = `${entry.sourceChartType || entry.type || "release"}|${releaseIdentity}`;
      current.p += artistTop50Points(entry);
      current.entries.add(releaseKey);
      current.releases.push(entry);
      artistMap.set(key, current);
    });
  });

  return [...artistMap.entries()]
    .map(([key, artist]) => ({
      key,
      ...artist,
      entryCount: artist.entries.size,
    }))
    .sort((a, b) => b.p - a.p || b.entryCount - a.entryCount || a.n.localeCompare(b.n));
};

const buildArtistChart = (monthLabel = latestPublishedMonthLabel(), platform = "Combined") => {
  const cacheKey = `${platform}|${monthLabel}`;
  if (artistChartCache.has(cacheKey)) return artistChartCache.get(cacheKey);

  if (platform === KENYAN_CHART) {
    const backendRows = rawKenyanArtists(monthLabel);
    if (backendRows.length) {
      const result = backendRows.slice(0, 50).map((entry) => {
        const artistName = entry.t || entry.title || entry.pa || "";
        const artistProfile =
          publicArtistForName(artistName) ||
          entry.primary_artists?.[0] ||
          {};
        const country = getArtistCountry({
          artist: artistName,
          country: entry.co,
          country_code: entry.cc,
          primary_artists: entry.primary_artists,
        });
        const movementType = String(entry.movement || "").toLowerCase();
        return {
          rank: Number(entry.r ?? entry.rank),
          title: artistName,
          artist: "",
          primary_artist: artistName,
          featured_artists: "",
          pts: Number(entry.p) || 0,
          rawPts: Number(entry.rp) || 0,
          points_source: "Full Kenyan singles + albums platform candidate pool",
          plat: "",
          prev: entry.prev_rank ?? null,
          last_month: entry.last_month ?? entry.prev_rank ?? "—",
          is_new: movementType === "new",
          reentry: movementType === "re-entry" || movementType === "reentry",
          movement: entry.movement,
          peak_rank: entry.peak_rank,
          weeks_on_chart: "—",
          months_on_chart: "—",
          times_on_chart: "—",
          platform_count: null,
          platform_max: null,
          release_year: null,
          confidence: "",
          country: country.country || country.listedCountry || "",
          country_code: country.code || country.listedCode || "",
          artist_country: country.country || country.listedCountry || "",
          artist_country_code: country.code || country.listedCode || "",
          entries_count: Number(entry.entries_count) || 0,
          releases: [],
          is_artist_entry: true,
          type: "artist",
          artist_profile: artistProfile,
          image: getArtistImageUrl(
            { ...artistProfile, title: artistName, artist_profile: artistProfile },
            { name: artistName, artists: [artistProfile] }
          ),
          aliases: artistProfile.aliases || [],
          city_region: artistProfile.city_region || "",
          genre: artistProfile.genre || "",
          biography: artistProfile.biography || "",
          artist_type: artistProfile.artist_type || "",
          verified: Boolean(artistProfile.verified),
          social_links: artistProfile.social_links || {},
        };
      });
      artistChartCache.set(cacheKey, result);
      return result;
    }
  }

  const currentIndex = monthIndex(monthLabel);
  const historyMonths = currentIndex >= 0 ? MONTHS.slice(0, currentIndex + 1) : [];
  const currentRows = aggregateArtistsForMonth(monthLabel, platform);
  const previousMonth = currentIndex > 0 ? MONTHS[currentIndex - 1] : null;
  const previousRows = previousMonth ? aggregateArtistsForMonth(previousMonth, platform) : [];
  const previousRankByKey = new Map(previousRows.map((artist, index) => [artist.key, index + 1]));

  const history = new Map();
  historyMonths.forEach((historyMonth) => {
    aggregateArtistsForMonth(historyMonth, platform).forEach((artist, index) => {
      const stats = history.get(artist.key) || {
        peak: Number.POSITIVE_INFINITY,
        months: 0,
        points: 0,
        name: artist.n,
      };
      stats.peak = Math.min(stats.peak, index + 1);
      stats.months += 1;
      stats.points += Number(artist.p) || 0;
      history.set(artist.key, stats);
    });
  });

  const earlierKeys = new Set();
  historyMonths.slice(0, -1).forEach((historyMonth) => {
    aggregateArtistsForMonth(historyMonth, platform).forEach((artist) => earlierKeys.add(artist.key));
  });

  const result = currentRows.slice(0, 50).map((artist, index) => {
    const rank = index + 1;
    const previousRank = previousRankByKey.get(artist.key) || null;
    const appearedBefore = earlierKeys.has(artist.key);
    const stats = history.get(artist.key) || {};
    const platformHits = platform === "Combined" ? getArtistPlatformHits(artist.n, monthLabel) : [platform];
    const country = artist.country || getArtistCountry({ artist: artist.n });
    // Live app-data is authoritative. When it is temporarily unavailable, use
    // the same CMS artist profiles embedded in the API chart entries rather
    // than falling back to a song/album cover or an initials tile.
    const artistProfile =
      publicArtistForName(artist.n) ||
      embeddedArtistProfileForName(artist.n, artist.releases) ||
      {};
    const artistImage = getArtistImageUrl({ ...artistProfile, title: artist.n, artist_profile: artistProfile }, { name: artist.n });
    return {
      rank,
      title: artist.n,
      artist: "",
      primary_artist: artist.n,
      featured_artists: "",
      pts: artist.p,
      rawPts: null,
      points_source: platform === "Combined"
        ? "Combined Singles Top 50 + Combined Albums Top 50"
        : `${platform} Top 50 Singles + supported Albums`,
      plat: platform === "Combined" ? `${platformHits.length}/${ARTIST_PLATS.length}` : "",
      prev: previousRank,
      last_month: previousRank || "—",
      is_new: !appearedBefore,
      reentry: !previousRank && appearedBefore,
      movement: previousRank ? undefined : appearedBefore ? "reentry" : "new",
      peak_rank: Number.isFinite(stats.peak) ? stats.peak : rank,
      weeks_on_chart: "—",
      months_on_chart: stats.months || 1,
      times_on_chart: stats.months || 1,
      platform_count: platform === "Combined" ? platformHits.length : null,
      platform_max: platform === "Combined" ? ARTIST_PLATS.length : null,
      release_year: null,
      confidence: "",
      country: country.country || "",
      country_code: country.code || "",
      artist_country: country.country || "",
      artist_country_code: country.code || "",
      entries_count: platform === "Combined" ? artist.entryCount : null,
      releases: artist.releases,
      is_artist_entry: true,
      type: "artist",
      artist_profile: artistProfile,
      image: artistImage,
      aliases: artistProfile.aliases || [],
      city_region: artistProfile.city_region || "",
      genre: artistProfile.genre || "",
      biography: artistProfile.biography || "",
      artist_type: artistProfile.artist_type || "",
      verified: Boolean(artistProfile.verified),
      social_links: artistProfile.social_links || {},
    };
  });

  artistChartCache.set(cacheKey, result);
  return result;
};

const buildArtistYearEndRows = () => buildCombinedArtists("artists", CURRENT_MONTH).slice(0, 50).map((artist) => {
  const country = getArtistCountry({ artist: artist.n });
  const artistProfile = publicArtistForName(artist.n) || {};
  const artistImage = getArtistImageUrl(
    { ...artistProfile, title: artist.n, artist_profile: artistProfile },
    { name: artist.n, artists: [artistProfile] }
  );
  return {
    t: artist.n,
    a: "",
    primary_artist: artist.n,
    totalPts: Number(artist.p) || 0,
    months: artist.m,
    entries: artist.t,
    best: artist.pk,
    country_code: country.code || "",
    country: country.country || "",
    type: "artist",
    is_artist_entry: true,
    artist_profile: artistProfile,
    image: artistImage,
    cover_image: artistImage,
  };
});

const buildCombinedTrending = (chartType) => {
  const latestMonth = MONTHS[MONTHS.length - 1];
  const previousMonth = MONTHS[MONTHS.length - 2];
  const earlierMonths = MONTHS.slice(0, -2);
  const latestRows = getCombined(chartType, latestMonth);
  const previousRows = getCombined(chartType, previousMonth);
  const previousMap = new Map(previousRows.map((entry) => [entryKey(entry), entry]));
  const earlierMaps = earlierMonths.map((monthLabel) =>
    new Map(getCombined(chartType, monthLabel).map((entry) => [entryKey(entry), entry]))
  );

  const rising = latestRows
    .map((entry) => {
      const key = entryKey(entry);
      const previous = previousMap.get(key);
      if (!previous || Number(previous.rank) <= Number(entry.rank)) return null;

      const earlierRanks = earlierMaps.map((map) => map.get(key)?.rank ?? null);
      const rankTrend = [...earlierRanks, previous.rank, entry.rank];
      const chartedRanks = rankTrend.filter((rank) => Number.isFinite(Number(rank))).map(Number);
      const consecutive = chartedRanks.length >= 3 && chartedRanks.every((rank, index) => index === 0 || rank < chartedRanks[index - 1]);

      return {
        t: entry.title,
        a: entry.artist,
        fromRank: Number(previous.rank),
        decRank: Number(entry.rank),
        places: Number(previous.rank) - Number(entry.rank),
        trend: rankTrend,
        consecutive,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.places - a.places || Number(b.consecutive) - Number(a.consecutive) || a.decRank - b.decRank)
    .slice(0, 8);

  const previousKeys = new Set([
    ...previousRows.map(entryKey),
    ...earlierMaps.flatMap((map) => [...map.keys()]),
  ]);
  const debuts = latestRows
    .filter((entry) => !previousKeys.has(entryKey(entry)) && Number(entry.rank) <= 15)
    .map((entry) => ({
      t: entry.title,
      a: entry.artist,
      decRank: Number(entry.rank),
      trend: [...earlierMonths.map(() => null), null, Number(entry.rank)],
    }));

  return { rising, debuts };
};

const COMBINED_YEAR_END = {
  singles: buildCombinedYearEnd("singles"),
  albums: buildCombinedYearEnd("albums"),
};
const COMBINED_ARTISTS = {
  singles: buildCombinedArtists("singles"),
  albums: buildCombinedArtists("albums"),
  artists: buildCombinedArtists("artists"),
};
const COMBINED_TRENDING = {
  singles: buildCombinedTrending("singles"),
  albums: buildCombinedTrending("albums"),
};

function refreshPlatformLookups() {
  replaceObject(
    PLAT_LABEL,
    PUBLIC_PLATFORMS.reduce((result, item) => ({...result, [item.name.toUpperCase()]: item.name}), {
      "APPLE MUSIC":"Apple Music",
      "AUDIOMACK":"Audiomack",
      "BOOMPLAY":"Boomplay",
      "SPOTIFY":"Spotify",
      "YOUTUBE":"YouTube",
      "SHAZAM":"Shazam",
    })
  );
  replaceObject(
    PC,
    PUBLIC_PLATFORMS.reduce((result, item) => ({
      ...result,
      [item.name]: item.brand_color || item.color,
      [item.name.toUpperCase()]: item.brand_color || item.color,
    }), {
      "Apple Music":"#FC3C44",
      "APPLE MUSIC":"#FC3C44",
      "Audiomack":"#F68B1F",
      "AUDIOMACK":"#F68B1F",
      "Boomplay":"#00FFFF",
      "BOOMPLAY":"#00FFFF",
      "Spotify":"#1DB954",
      "SPOTIFY":"#1DB954",
      "YouTube":"#FF0000",
      "YOUTUBE":"#FF0000",
      "Shazam":"#0088FF",
      "SHAZAM":"#0088FF",
    })
  );
}

function clearDerivedPublicCaches() {
  coverImageCache.clear();
  combinedEntryCache.clear();
  kenyanEntryCache.clear();
  platformEntryCache.clear();
  rawPlatformIndexCache.clear();
  combinedArtistsCache.clear();
  artistPlatformSourceCache.clear();
  artistChartCache.clear();
}

function rebuildPublicSummaries() {
  COMBINED_YEAR_END.singles = buildCombinedYearEnd("singles");
  COMBINED_YEAR_END.albums = buildCombinedYearEnd("albums");
  COMBINED_ARTISTS.singles = buildCombinedArtists("singles");
  COMBINED_ARTISTS.albums = buildCombinedArtists("albums");
  COMBINED_ARTISTS.artists = buildCombinedArtists("artists");
  COMBINED_TRENDING.singles = buildCombinedTrending("singles");
  COMBINED_TRENDING.albums = buildCombinedTrending("albums");
}

function applyRuntimePublicData(rawPayload) {
  const freshData = normalizePublicPayload(rawPayload);
  const monthOptions = publishedMonthOptions(freshData);

  replaceArray(MONTH_OPTIONS, monthOptions);
  replaceArray(MONTHS, monthOptions.map((item) => item.label));
  replaceObject(FULL, freshData.full || {});
  replaceArray(PUBLIC_PLATFORMS, freshData.platforms || []);
  replaceObject(SITE_SETTINGS, freshData.settings || {});
  replaceArray(PROTECTED_ARTIST_CREDIT_NAMES, protectedArtistCreditNames(freshData.artists || []));
  replaceArray(S_PLATS, ["Combined", ...availablePlatformKeys("singles", "supports_singles", DEFAULT_SINGLES_PLATFORM_KEYS)]);
  replaceArray(A_PLATS, ["Combined", ...availablePlatformKeys("albums", "supports_albums", DEFAULT_ALBUM_PLATFORM_KEYS)]);
  replaceArray(ARTIST_PLATS, S_PLATS.filter((platform) => platform !== "Combined"));
  refreshPlatformLookups();

  replaceObject(PUBLIC_DATA, {
    ...freshData,
    full: FULL,
    month_options: MONTH_OPTIONS,
    months: MONTHS,
    platforms: PUBLIC_PLATFORMS,
    settings: SITE_SETTINGS,
  });
  refreshCertificationThresholds();
  rebuildPublicLookups(PUBLIC_DATA);
  clearDerivedPublicCaches();
  rebuildPublicSummaries();

  if (typeof window !== "undefined") {
    window.__NGOMA_PUBLIC_DATA__ = PUBLIC_DATA;
    window.__NGOMA_PUBLIC_REVISION__ = String(PUBLIC_DATA.revision || "");
    window.__NGOMA_PUBLIC_DATA_STALE__ = false;
    window.dispatchEvent(new Event("ngoma-public-data-ready"));
  }

  return PUBLIC_DATA;
}

function AnalyticsDeepSection({ label, isMobile, children }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isMobile) return <>{children}</>;

  return (
    <details
      className="ngoma-mobile-collapsible"
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary>{label}<span className="anl-chev">›</span></summary>
      {isOpen && <div className="ngoma-mobile-collapsible-body">{children}</div>}
    </details>
  );
}

// Movement badge (mv imported from chartHelpers)


const MvBadge=({e})=>{
  const m=mv(e);
  if(m.t==="new")return <span style={{background:"#1A1A1A",color:"#FFF",padding:"1.5px 4px",borderRadius:"2px",fontSize:"7px",letterSpacing:"1px",fontWeight:800}}>NEW</span>;
  if(m.t==="reentry")return <span style={{background:"#1565C0",color:"#FFF",padding:"1.5px 4px",borderRadius:"2px",fontSize:"7px",letterSpacing:"1px",fontWeight:800}}>RE</span>;
  if(m.t==="up")return <span style={{color:"#2DB04A",fontSize:"9px",fontWeight:700}}>{"▲"+m.v}</span>;
  if(m.t==="down")return <span style={{color:"#E53935",fontSize:"9px",fontWeight:700}}>{"▼"+m.v}</span>;
  return <span style={{color:"#DEDEDE",fontSize:"9px"}}>{"—"}</span>;
};

const RecordIcon = ({ label = "", size = 30, muted = false }) => {
  const key = String(label).toLowerCase();
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: { color: muted ? "rgba(184,134,11,0.13)" : GOLD, display: "block" },
  };

  if (key.includes("#1") || key.includes("months at")) {
    return (
      <svg {...common}>
        <path d="M4 18h16" />
        <path d="M5 16 4 7l5 3 3-6 3 6 5-3-1 9H5Z" />
      </svg>
    );
  }

  if (key.includes("score")) {
    return (
      <svg {...common}>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="m7 15 3-4 3 2 5-7" />
      </svg>
    );
  }

  if (key.includes("climb")) {
    return (
      <svg {...common}>
        <path d="M4 17 17 4" />
        <path d="M9 4h8v8" />
        <path d="M4 17l4 3 2-5" />
      </svg>
    );
  }

  if (key.includes("coverage")) {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="M4 12h16" />
        <path d="M12 4c2.2 2.3 3.2 5 3.2 8s-1 5.7-3.2 8" />
        <path d="M12 4c-2.2 2.3-3.2 5-3.2 8s1 5.7 3.2 8" />
      </svg>
    );
  }

  if (key.includes("longevity")) {
    return (
      <svg {...common}>
        <path d="M7 4h10" />
        <path d="M7 20h10" />
        <path d="M8 4c0 4 3.2 5.4 4 8-0.8 2.6-4 4-4 8" />
        <path d="M16 4c0 4-3.2 5.4-4 8 0.8 2.6 4 4 4 8" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M10 18V6l8-2v10" />
      <circle cx="7" cy="18" r="3" />
      <circle cx="15" cy="14" r="3" />
    </svg>
  );
};

const NEWS=[];

const mapPublicCertifications = (items = []) => items.map((c) => ({
  ...c,
  t: c.title || "",
  a: c.artist || "",
  totalPts: Number(c.total_points) || 0,
  level: c.level || getCertificationLevel(c.total_points),
  country_code: c.country_code || "",
  chart_type: c.chart_type || "singles",
})).filter((c) => c.level && c.is_hidden !== true);

// Defined at module scope so React does not recreate it on every render.
const CertificationTag = ({ cert, compact = true, style = {} }) => {
  if (!cert) return null;
  const certificationLabel = `${cert.label} certified · ${Number(cert.totalPts || 0).toLocaleString()} points`;
  if (compact) return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: "15px", lineHeight: 1, verticalAlign: "middle",
        position: "relative", top: "1px",
        ...style,
      }}
      title={certificationLabel}
      aria-label={certificationLabel}
    >
      <span aria-hidden="true" style={cert.iconFilter ? { filter: cert.iconFilter } : undefined}>{cert.icon}</span>
    </span>
  );
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: "fit-content", maxWidth: "100%", minWidth: "24px", minHeight: "24px",
        padding: "3px 5px", borderRadius: "999px",
        background: `${cert.color}14`, border: `1px solid ${cert.color}40`,
        color: cert.color, fontFamily: F, fontSize: "26px", lineHeight: 1.1,
        whiteSpace: "nowrap", verticalAlign: "middle", ...style,
      }}
      title={certificationLabel}
      aria-label={certificationLabel}
    >
      <span aria-hidden="true" style={cert.iconFilter ? { filter: cert.iconFilter } : undefined}>{cert.icon}</span>
    </span>
  );
};

const PUBLIC_PAGE_ROUTES = {
  charts: "/charts",
  analytics: "/analytics",
  "year-end": "/year-end",
  certifications: "/certifications",
  news: "/news",
  about: "/about",
};
const PUBLIC_PAGE_TITLES = {
  charts: "Charts",
  analytics: "Analytics",
  "year-end": "All Time Charts",
  certifications: "Certifications",
  news: "News",
  about: "About",
};
function publicPageFromPath() {
  if (typeof window === "undefined") return "charts";
  const segment = window.location.pathname.split("/").filter(Boolean)[0] || "charts";
  return Object.prototype.hasOwnProperty.call(PUBLIC_PAGE_ROUTES, segment) ? segment : "charts";
}

export default function NgomaCharts(){
  const [page,setPage]=useState(publicPageFromPath);
  const [theme,setTheme]=useState(()=>{
    if(typeof window==="undefined") return "light";
    try {
      return window.localStorage.getItem("ngoma-theme")==="dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });
  const [ct,setCt]=useState(["singles","albums"].includes(DEFAULT_CHART_SETTING.chart_type) ? DEFAULT_CHART_SETTING.chart_type : "singles");
  const [month,setMonth]=useState(CURRENT_MONTH);
  const [plat,setPlat]=useState("Combined");
  const [vc,setVc]=useState(10);
  const [hr,setHr]=useState(null);
  const [srch,setSrch]=useState("");
  const [sOpen,setSOpen]=useState(false);
  const [sActiveIdx,setSActiveIdx]=useState(-1);
  const [mNav,setMNav]=useState(false);
  const [moreOpen,setMoreOpen]=useState(false);
  const [selA,setSelA]=useState(null);
  const [selR,setSelR]=useState(null);
  const [selNews,setSelNews]=useState(null);
  const [cmpA1,setCmpA1]=useState("");
  const [cmpA2,setCmpA2]=useState("");
  const [cmpS1,setCmpS1]=useState(() => comparisonDefaultKeys("singles", CURRENT_MONTH)[0] || defaultComparisonKey("singles", 0));
  const [cmpS2,setCmpS2]=useState(() => comparisonDefaultKeys("singles", CURRENT_MONTH)[1] || defaultComparisonKey("singles", 1));
  const [anMonth,setAnMonth]=useState(CURRENT_MONTH);
  const [artistMonth,setArtistMonth]=useState(CURRENT_MONTH);
  const [rankJourneyView,setRankJourneyView]=useState("table");
  const [viewModes,setViewModes]=useState({});
  const [loaded,setLd]=useState(false);
  const [dataRevision, setDataRevision] = useState(() => String(PUBLIC_DATA.revision || ""));
  const [liveStatus, setLiveStatus] = useState("checking"); // "checking" | "live" | "degraded" | "syncing"
  const [apiChecked, setApiChecked] = useState(false); // true once the API ping has resolved
  const [liveChartEntries, setLiveChartEntries] = useState([]);
  const [liveChartMeta, setLiveChartMeta] = useState(null);
  const [liveChartLoading, setLiveChartLoading] = useState(false);
  const [liveNews, setLiveNews] = useState(() => PUBLIC_DATA.news?.length ? mapPublicNews(PUBLIC_DATA.news) : null);
  const [liveCerts, setLiveCerts] = useState(() => PUBLIC_DATA.certifications?.length ? mapPublicCertifications(PUBLIC_DATA.certifications) : null);
  const [openRecord, setOpenRecord] = useState(null);
  const [expandedYearEndRows, setExpandedYearEndRows] = useState({});
  const [yearEndMode, setYearEndMode] = useState("alltime"); // "alltime" | "bestofyear"
  const [yearEndPlat, setYearEndPlat] = useState("Combined");
  const [expandedArtistRows, setExpandedArtistRows] = useState({});
  const [expandedTrendingRows, setExpandedTrendingRows] = useState({});
  const detailOpenRef = useRef(false);
  const detailReturnScrollRef = useRef(0);
  const publicHeaderRef = useRef(null);
  const publicDataSyncRef = useRef(null);
  const [publicHeaderHeight, setPublicHeaderHeight] = useState(0);
  const isDark = theme === "dark";
  const themeColors = isDark
    ? {
        page: "#050505",
        surface: "#0F1110",
        elevated: "#151815",
        text: "#F6F3EA",
        muted: "#B8BDB8",
        border: "#2B302B",
        active: "rgba(184,134,11,0.22)",
        hover: "#1A1F1A",
      }
    : {
        page: THEME_SETTING.background || "#FFFFFF",
        surface: THEME_SETTING.cards || "#FFFFFF",
        elevated: THEME_SETTING.cards || "#FFFFFF",
        text: "#1A1A1A",
        muted: "#6B6B6B",
        border: "#E5E0D4",
        active: "#F1E3BF",
        hover: "#FAF5EA",
      };

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.ngomaTheme = theme;
    document.body.dataset.ngomaTheme = theme;
    try {
      if (typeof window !== "undefined") window.localStorage.setItem("ngoma-theme", theme);
    } catch {
      // Theme still works for the current session if storage is unavailable.
    }
  }, [theme]);

  useEffect(() => {
    const header = publicHeaderRef.current;
    if (!header) return undefined;

    const updateHeaderHeight = () => {
      setPublicHeaderHeight(Math.ceil(header.getBoundingClientRect().height));
    };

    updateHeaderHeight();
    const observer = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(updateHeaderHeight)
      : null;
    observer?.observe(header);
    window.addEventListener("resize", updateHeaderHeight);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateHeaderHeight);
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const pageTitle = PUBLIC_PAGE_TITLES[page] || "Charts";
    document.title = `${pageTitle} | ${SITE_NAME}`;
    const description = `Explore ${pageTitle.toLowerCase()} from ${SITE_NAME}, Kenya's multi-platform music chart authority.`;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", description);
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", `${window.location.origin}${PUBLIC_PAGE_ROUTES[page] || "/charts"}`);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogTitle) ogTitle.setAttribute("content", document.title);
    if (ogDescription) ogDescription.setAttribute("content", description);
  }, [page]);

  useEffect(() => {
    const onPopState = () => {
      if (window.history.state?.ngomaDetail) return;
      setPage(publicPageFromPath());
      setSelA(null);
      setSelR(null);
      setSelNews(null);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const toggleYearEndRow = (rowKey) => {
    setExpandedYearEndRows((current) => ({
      ...current,
      [rowKey]: !current[rowKey],
    }));
  };

  const toggleArtistRow = (rowKey) => {
    setExpandedArtistRows((current) => (current[rowKey] ? {} : { [rowKey]: true }));
  };

  const toggleTrendingRow = (rowKey) => {
    setExpandedTrendingRows((current) => ({
      ...current,
      [rowKey]: !current[rowKey],
    }));
  };

  const isArtists = ct === "artists";
  const isSingles = ct === "singles";
  const isAlbums = ct === "albums";
  const releaseCt = isAlbums ? "albums" : "singles";
  const platList = isArtists
    ? ["Combined", KENYAN_CHART, ...S_PLATS.slice(1)]
    : (isSingles ? ["Combined", KENYAN_CHART, ...S_PLATS.slice(1)] : ["Combined", KENYAN_CHART, ...A_PLATS.slice(1)]);
  const platListKey = platList.join("|");
  const tp = isArtists ? ARTIST_PLATS.length : (isSingles ? S_PLATS.length - 1 : A_PLATS.length - 1);
  const yearEndPlatOptions = isArtists ? ["Combined", ...ARTIST_PLATS] : (isSingles ? S_PLATS : A_PLATS);
  const yearEndPlatOptionsKey = yearEndPlatOptions.join("|");

  useEffect(() => {
    if (!platList.includes(plat)) setPlat("Combined");
  }, [plat, platListKey, dataRevision]);

  useEffect(() => {
    if (!yearEndPlatOptions.includes(yearEndPlat)) setYearEndPlat("Combined");
  }, [yearEndPlat, yearEndPlatOptionsKey, dataRevision]);

  const applyFreshPublicData = useCallback((payload) => {
    const previousLatest = latestPublishedMonthLabel();
    const freshData = applyRuntimePublicData(payload);
    const nextRevision = String(freshData.revision || Date.now());
    const nextLatest = latestPublishedMonthLabel();
    const keepValidMonth = (current) => (
      !MONTHS.includes(current) || current === previousLatest ? nextLatest : current
    );

    _syncedRevision = nextRevision;
    setMonth(keepValidMonth);
    setAnMonth(keepValidMonth);
    setArtistMonth(keepValidMonth);
    setLiveNews(freshData.news?.length ? mapPublicNews(freshData.news) : null);
    setLiveCerts(mapPublicCertifications(freshData.certifications || []));
    setLiveChartEntries([]);
    setLiveChartMeta(null);
    setDataRevision(`${nextRevision}:${Date.now()}`);
    setLiveStatus("live");
    setApiChecked(true);
    return nextRevision;
  }, []);

  const syncLatestPublicData = useCallback((forcePayload = false) => {
    if (typeof document !== "undefined" && document.hidden) return Promise.resolve(false);
    if (publicDataSyncRef.current) return publicDataSyncRef.current;

    const run = fetchRevision()
      .then((rev) => {
        const latest = String(rev?.revision || rev?.stamp || rev || "");
        const staleStartupData = Boolean(window.__NGOMA_PUBLIC_DATA_STALE__);
        setApiChecked(true);

        if (!latest) {
          setLiveStatus("degraded");
          return false;
        }
        if (latest === _syncedRevision && !forcePayload && !staleStartupData) {
          setLiveStatus("live");
          return false;
        }

        setLiveStatus("syncing");
        return fetchAppData(undefined, 30_000).then((payload) => {
          applyFreshPublicData(payload);
          return true;
        });
      })
      .catch(() => {
        setApiChecked(true);
        setLiveStatus("degraded");
        return false;
      });

    publicDataSyncRef.current = run.finally(() => {
      publicDataSyncRef.current = null;
    });
    return publicDataSyncRef.current;
  }, [applyFreshPublicData]);

  useEffect(() => {
    setLiveStatus("checking");
    syncLatestPublicData(Boolean(window.__NGOMA_PUBLIC_DATA_STALE__));
  }, [syncLatestPublicData]);

  // Three-layer sync — keeps the Kenyan Top 50 current whenever artist country
  // data changes in the CMS, without requiring a page reload:
  //
  //  1. storage event  — api.js writes "ngoma-cms-revision" to localStorage on every
  //                      CMS mutation; other tabs on the same origin receive this event
  //                      instantly, so an artist country change propagates in < 1 s.
  //  2. focus event    — catches the case where the user switches back to this tab
  //                      after making CMS edits (no localStorage cross-tab needed).
  //  3. 15 s poll      — fallback for same-tab scenarios or any other data change.
  //
  // All three paths call doRevisionSync, which:
  //   - skips when the tab is hidden (interval fires in the background)
  //   - fetches the lightweight revision endpoint first
  //   - if revision changed: fetches app-data and rebuilds the module-level
  //     chart indexes in place
  useEffect(() => {
    const doRevisionSync = () => {
      if (document.hidden) return; // tab is backgrounded — skip; focus event handles return
      fetchRevision()
        .then(rev => {
          const latest = String(rev?.revision || rev?.stamp || rev || "");
          if (!latest || latest === _syncedRevision) return;
          _syncedRevision = latest;
          syncLatestPublicData(true);
        })
        .catch(() => {});
    };

    // CMS mutation path: debounce multi-step saves, ask the lightweight
    // revision endpoint whether public data changed, then swap app-data once.
    // Debounced 150 ms because CMS saves often fire several mutation events.
    // The handler below updates runtime data in place; it does not reload the document.
    let _cmsTimer = null;
    let _cmsChannel = null;
    const onCmsChange = () => {
      clearTimeout(_cmsTimer);
      _cmsTimer = setTimeout(() => {
        if (document.hidden) return;
        fetchRevision()
          .then(rev => {
            const latest = String(rev?.revision || rev?.stamp || rev || "");
            if (!latest || latest === _syncedRevision) return;
            _syncedRevision = latest;
            syncLatestPublicData(true);
          })
          .catch(() => {});
      }, 150);
    };

    const onStorageChange = (e) => {
      if (e.key === "ngoma-cms-revision") onCmsChange();
    };
    const onVisibilityChange = () => {
      if (!document.hidden) syncLatestPublicData(Boolean(window.__NGOMA_PUBLIC_DATA_STALE__));
    };

    try {
      _cmsChannel = new BroadcastChannel("ngoma-cms-sync");
      _cmsChannel.onmessage = (event) => {
        if (event?.data?.type === "cms-change") onCmsChange();
      };
    } catch {}

    window.addEventListener("focus", doRevisionSync);
    window.addEventListener("online", doRevisionSync);
    window.addEventListener("storage", onStorageChange);
    window.addEventListener("ngoma-cms-change", onCmsChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    const pollId = setInterval(() => syncLatestPublicData(Boolean(window.__NGOMA_PUBLIC_DATA_STALE__)), 15_000);
    return () => {
      window.removeEventListener("focus", doRevisionSync);
      window.removeEventListener("online", doRevisionSync);
      window.removeEventListener("storage", onStorageChange);
      window.removeEventListener("ngoma-cms-change", onCmsChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearInterval(pollId);
      clearTimeout(_cmsTimer);
      if (_cmsChannel) _cmsChannel.close();
    };
  }, [syncLatestPublicData]);

  useEffect(() => {
    fetchNews()
      .then((items) => setLiveNews(mapPublicNews(items)))
      .catch(() => setLiveNews(null));
  }, []);

  useEffect(() => {
    fetchCertifications()
      .then((items) => setLiveCerts(mapPublicCertifications(items)))
      .catch(() => setLiveCerts(null));
  }, []);

  useEffect(() => {
    setLiveChartEntries([]);
    setLiveChartMeta(null);
    setLiveChartLoading(false);

    if (isArtists || plat === KENYAN_CHART) return;

    const { monthNumber, year } = getMonthYearParts(month);
    if (!monthNumber || !year) return;

    const controller = new AbortController();
    setLiveChartLoading(true);

    fetchChartImageData(
      { type: releaseCt, month: monthNumber, year, platform: platformToSlug(plat) },
      controller.signal
    )
      .then((chartResponse) => {
        const movementHistory = historyKeysForMonth(releaseCt, plat, month);
        const entries = normalizeRankedRows((chartResponse.entries || []).map((entry) => {
          const movementType = String(entry.movement || "").toLowerCase();
          const fallbackIsNew = movementType === "new";
          const fallbackIsReentry = movementType === "reentry" || movementType === "re-entry" || movementType === "re";
          const movementEntry = {
            t: entry.title,
            title: entry.title,
            artist_credit: entry.artist_credit || entry.artist_display || entry.artist || "",
            a: entry.artist_credit || entry.artist || "",
            primary_artist_credit: entry.primary_artist_credit || entry.primary_artist || "",
            primary_artist: entry.primary_artist || "",
            featured_artists: entry.featured_artist_credit || entry.featured_artists || "",
            primary_artists: entry.primary_artists || [],
            featured_artist_profiles: entry.featured_artist_profiles || [],
          };
          const movementKey = entryKey(movementEntry);
          const movementReleaseId = extractReleaseId(entry);
          const fallbackKey = movementFallbackKey({
            title: entry.title,
            primary_artist: entry.primary_artist_credit || entry.primary_artist || entry.artist || "",
          });
          const safeFallbackKey = entryPrimaryFallbackKey(movementEntry) ? fallbackKey : "";
          const linkedRelease = lookupReleaseForEntry({
            ...entry,
            t: entry.title,
            title: entry.title,
            release_id: movementReleaseId || entry.release_id,
            artist_credit: entry.artist_credit || entry.artist_display || entry.artist || "",
            a: entry.artist_credit || entry.artist || "",
            primary_artist_credit: entry.primary_artist_credit || entry.primary_artist || "",
            primary_artist: entry.primary_artist || "",
            featured_artists: entry.featured_artist_credit || entry.featured_artists || "",
          }) || null;
          const resolvedReleaseId = movementReleaseId || extractReleaseId(linkedRelease);
          const matchedPrior = movementHistory
            ? (
                matchesHistory(movementKey, resolvedReleaseId, movementHistory.priorKeys, movementHistory.priorIds) ||
                (safeFallbackKey && movementHistory.priorFallbackKeys.has(safeFallbackKey))
              )
            : false;
          const matchedPrevious = movementHistory
            ? (
                matchesHistory(movementKey, resolvedReleaseId, movementHistory.previousKeys, movementHistory.previousIds) ||
                (safeFallbackKey && movementHistory.previousFallbackKeys.has(safeFallbackKey))
              )
            : false;
          const previousRankFromHistory = movementHistory
            ? (
                movementHistory.previousRanksById.get(resolvedReleaseId) ||
                movementHistory.previousRanksByKey.get(movementKey) ||
                (safeFallbackKey && movementHistory.previousRanksByFallback.get(safeFallbackKey)) ||
                null
              )
            : null;
          const resolvedMovement = resolveMovementFromHistory({
            historyAvailable: Boolean(movementHistory),
            appearedBefore: matchedPrior,
            appearedPreviousMonth: matchedPrevious,
            previousRank: previousRankFromHistory,
            backendPrevRank: entry.prev_rank,
            backendLastMonth: entry.last_month,
            backendMovement: entry.movement,
          });
          const matchedCurrent = movementHistory
            ? (
                matchesHistory(movementKey, resolvedReleaseId, movementHistory.currentKeys, movementHistory.currentIds) ||
                (safeFallbackKey && movementHistory.currentFallbackKeys.has(safeFallbackKey))
              )
            : false;
          const backendChartCount = positiveChartCount(entry.months_on_chart ?? entry.times_on_chart ?? entry.chart_appearances);
          const historyChartCount = movementHistory
            ? (
                movementHistory.appearanceCountsById.get(resolvedReleaseId) ||
                movementHistory.appearanceCountsByKey.get(movementKey) ||
                (safeFallbackKey && movementHistory.appearanceCountsByFallback.get(safeFallbackKey)) ||
                0
              )
            : 0;
          const timesOnChart = backendChartCount || (movementHistory ? historyChartCount + (matchedCurrent ? 0 : 1) : 1);

          const displayPoints = entry.total_points || 0;

          return {
            ...entry,
            rank: entry.rank,
            title: entry.title,
            artist: cleanArtistDisplay(entry.artist_credit || formatArtistCredit(entry.primary_artist || entry.artist, entry.featured_artists, entry.primary_artists, entry.featured_artist_profiles)),
            artist_credit: cleanArtistDisplay(entry.artist_credit || formatArtistCredit(entry.primary_artist || entry.artist, entry.featured_artists, entry.primary_artists, entry.featured_artist_profiles)),
            primary_artist: cleanArtistDisplay(entry.primary_artist_credit || entry.primary_artist || entry.artist),
            featured_artists: entry.featured_artists || "",
            pts: displayPoints,
            rawPts: entry.raw_total_points ?? null,
            plat: entry.platform_count ? `${entry.platform_count}/${entry.platform_max || tp}` : "",
            prev: resolvedMovement.prev,
            first: false,
            is_new: movementHistory ? resolvedMovement.isNew : fallbackIsNew,
            reentry: movementHistory ? resolvedMovement.reentry : fallbackIsReentry,
            movement: resolvedMovement.movement,
            last_month: resolvedMovement.lastMonth,
            peak_rank: entry.peak_rank,
            weeks_on_chart: entry.weeks_on_chart,
            months_on_chart: timesOnChart,
            times_on_chart: timesOnChart,
            platform_count: entry.platform_count,
            platform_max: entry.platform_max,
            release_year: entry.release_year,
            confidence: entry.confidence,
            country: entry.artist_country || entry.country || "",
            country_code: entry.artist_country_code || entry.country_code || "",
            artist_country: entry.artist_country || entry.country || "",
            artist_country_code: entry.artist_country_code || entry.country_code || "",
          };
        }));

        // CMS release records are authoritative for editable metadata and media.
        // Preserve chart-calculation fields from the chart endpoint.
        const enrichedEntries = entries.map((e) => {
          const rel = lookupReleaseForEntry(e) || {};
          const primaryArtists = rel.primary_artists?.length ? rel.primary_artists : (e.primary_artists || []);
          const featuredProfiles = rel.featured_artist_profiles?.length ? rel.featured_artist_profiles : (e.featured_artist_profiles || []);
          const primaryArtist = cleanArtistDisplay(
            rel.primary_artist_credit || rel.primary_artist || e.primary_artist || ""
          );
          const featuredArtists = rel.featured_artist_credit || rel.featured_artists || e.featured_artists || "";
          const artistCredit = cleanArtistDisplay(
            rel.artist_credit ||
            formatArtistCredit(primaryArtist, featuredArtists, primaryArtists, featuredProfiles) ||
            e.artist_credit ||
            e.artist ||
            ""
          );
          return {
            ...e,
            ...rel,
            id: e.id,
            release_id: e.release_id || rel.id,
            rank: e.rank,
            r: e.rank,
            pts: e.pts,
            total_points: e.total_points,
            rawPts: e.rawPts,
            plat: e.plat,
            prev: e.prev,
            last_month: e.last_month,
            peak_rank: e.peak_rank,
            weeks_on_chart: e.weeks_on_chart,
            months_on_chart: e.months_on_chart,
            times_on_chart: e.times_on_chart,
            movement: e.movement,
            is_new: e.is_new,
            reentry: e.reentry,
            platform_count: e.platform_count,
            platform_max: e.platform_max,
            title: rel.title || e.title,
            t: rel.title || e.title,
            artist: artistCredit,
            artist_credit: artistCredit,
            a: artistCredit,
            primary_artist: primaryArtist,
            primary_artist_credit: primaryArtist,
            pa: primaryArtist,
            featured_artists: featuredArtists,
            fa: featuredArtists,
            primary_artists: primaryArtists,
            featured_artist_profiles: featuredProfiles,
            cover_image: rel.cover_image || resolveMediaUrl(e.cover_image || ""),
          };
        });
        enrichedEntries.forEach((e) => {
          if (e.cover_image) coverImageCache.set(entryKey(e), e.cover_image);
        });
        setLiveChartEntries(enrichedEntries);
        setLiveChartMeta(chartResponse);
        setLiveStatus("live");
      })
      .catch((error) => {
        if (error.name === "AbortError") return;
        setLiveChartEntries([]);
        setLiveChartMeta(null);
        setLiveStatus("degraded");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLiveChartLoading(false);
      });

    return () => controller.abort();
  }, [releaseCt, month, plat, tp, isArtists, dataRevision]);
  useEffect(()=>{setTimeout(()=>setLd(true),100);},[]);

  const [vw,setVw]=useState(typeof window!=="undefined"?window.innerWidth:1200);
  useEffect(()=>{const h=()=>setVw(window.innerWidth);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);
  // Phones and portrait tablets share the compact navigation/card layout.
  // Wider tablets keep the desktop table where it has enough room.
  const isMobile=vw<900;
  // iPad-landscape-ish band that still gets the full desktop layout structure
  // but benefits from slightly less density than a large desktop viewport.
  // Matches the existing tablet-tuning CSS band in mobilePremiumFixes.css.
  const isTablet=vw>=900&&vw<1100;
  const PAD=isMobile?"clamp(20px, 5vw, 28px)":"28px";
  const PAGE_MAX="1240px";
  const pageFrame=(extra={})=>({maxWidth:PAGE_MAX,width:"100%",margin:"0 auto",boxSizing:"border-box",minWidth:0,...extra});
  const responsiveStack=(desktop="row")=>({flexDirection:isMobile?"column":desktop,alignItems:isMobile?"stretch":"center"});
  useEffect(()=>{const h=e=>{if(e.key==="Escape"){setSOpen(false);setSrch("");setSActiveIdx(-1);}};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);},[]);
  useEffect(() => {
    detailOpenRef.current = Boolean(selA || selR);
  }, [selA, selR]);
  useEffect(() => {
    const handlePopState = () => {
      if (!detailOpenRef.current) return;
      detailOpenRef.current = false;
      setSelA(null);
      setSelR(null);
      requestAnimationFrame(() => window.scrollTo({ top: detailReturnScrollRef.current, behavior: "auto" }));
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

const getData = () => {
  if (isArtists) return buildArtistChart(month, plat);
  if (plat === KENYAN_CHART) {
    const kenyan = getKenyanCombined(releaseCt, month);
    if (!coverImageCache.size) return kenyan;
    return kenyan.map((e) => {
      if (e.cover_image) return e;
      const img = coverImageCache.get(entryKey(e));
      return img ? { ...e, cover_image: img } : e;
    });
  }
  return plat === "Combined" ? getCombined(releaseCt, month) : getPlatform(releaseCt, plat, month);
};

const appDataEntries = getData();

const sourceData = liveChartEntries.length ? liveChartEntries : appDataEntries;
const data = sourceData.filter((entry) => Number(entry.rank) <= 50).slice(0, 50);

const display = data.slice(0, Math.min(vc, data.length));

const top = data[0];

  const themeToggle = (extraStyle={}) => {
    const trackW = isMobile ? 46 : 40;
    const trackH = isMobile ? 26 : 22;
    const knob = trackH - 4;
    return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      className="ngoma-theme-toggle"
      style={{
        position:"relative",
        display:"inline-block",
        flexShrink:0,
        width:`${trackW}px`,
        height:`${trackH}px`,
        border:`1px solid ${themeColors.border}`,
        borderRadius:"999px",
        background:isDark?"#3A413A":"#E7E4DA",
        cursor:"pointer",
        padding:0,
        transition:"background 0.2s ease",
        ...extraStyle,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position:"absolute",
          top:"1px",
          left:"1px",
          width:`${knob}px`,
          height:`${knob}px`,
          borderRadius:"50%",
          background:isDark?"#F6F3EA":"#1A1A1A",
          transform:`translateX(${isDark?trackW-trackH:0}px)`,
          transition:"transform 0.2s ease",
        }}
      />
    </button>
    );
  };

  // Deduplicated search indices — best rank/month + full release metadata merged in
  const songSearchIndex=useMemo(()=>{
    const map=new Map();
    MONTHS.forEach(m=>{
      getCombined("singles",m).forEach(e=>{
        const k=`${String(e.title||"").trim().toLowerCase()}|||${String(e.artist||"").trim().toLowerCase()}`;
        const rel=lookupReleaseForEntry(e)||{};
        const ex=map.get(k); const rank=Number(e.rank);
        if(!ex){
          const merged={...rel,...e,_type:"single",_months:1,_bestRank:rank,_bestMonth:m};
          merged._searchText=[merged.title,merged.artist,rel.featured_artists,rel.isrc,rel.upc,rel.label,rel.canonical_title,rel.songwriters,rel.producers,rel.distributor].filter(Boolean).join(" ").toLowerCase();
          map.set(k,merged);
        } else { ex._months++; if(rank<ex._bestRank){ex._bestRank=rank;ex._bestMonth=m;} }
      });
    });
    // Also add releases from PUBLIC_DATA not yet in chart (ISRC/UPC lookup utility)
    (PUBLIC_DATA.releases||[]).filter(r=>r.chart_type==="singles").forEach(r=>{
      const k=`${String(r.title||"").trim().toLowerCase()}|||${String(r.primary_artist||r.artist||"").trim().toLowerCase()}`;
      if(!map.has(k)){
        const merged={...r,title:r.title,artist:r.primary_artist||r.artist||"",_type:"single",_months:0,_bestRank:999,_bestMonth:latestPublishedMonthLabel()};
        merged._searchText=[r.title,r.primary_artist,r.artist,r.featured_artists,r.isrc,r.upc,r.label,r.canonical_title,r.songwriters,r.producers].filter(Boolean).join(" ").toLowerCase();
        map.set(k,merged);
      }
    });
    return [...map.values()].sort((a,b)=>a._bestRank-b._bestRank);
  },[dataRevision]);
  const albumSearchIndex=useMemo(()=>{
    const map=new Map();
    MONTHS.forEach(m=>{
      getCombined("albums",m).forEach(e=>{
        const k=`${String(e.title||"").trim().toLowerCase()}|||${String(e.artist||"").trim().toLowerCase()}`;
        const rel=lookupReleaseForEntry(e)||{};
        const ex=map.get(k); const rank=Number(e.rank);
        if(!ex){
          const merged={...rel,...e,_type:"album",_months:1,_bestRank:rank,_bestMonth:m};
          merged._searchText=[merged.title,merged.artist,rel.featured_artists,rel.isrc,rel.upc,rel.label,rel.canonical_title,rel.songwriters,rel.producers,rel.distributor].filter(Boolean).join(" ").toLowerCase();
          map.set(k,merged);
        } else { ex._months++; if(rank<ex._bestRank){ex._bestRank=rank;ex._bestMonth=m;} }
      });
    });
    (PUBLIC_DATA.releases||[]).filter(r=>r.chart_type==="albums").forEach(r=>{
      const k=`${String(r.title||"").trim().toLowerCase()}|||${String(r.primary_artist||r.artist||"").trim().toLowerCase()}`;
      if(!map.has(k)){
        const merged={...r,title:r.title,artist:r.primary_artist||r.artist||"",_type:"album",_months:0,_bestRank:999,_bestMonth:latestPublishedMonthLabel()};
        merged._searchText=[r.title,r.primary_artist,r.artist,r.featured_artists,r.isrc,r.upc,r.label,r.canonical_title].filter(Boolean).join(" ").toLowerCase();
        map.set(k,merged);
      }
    });
    return [...map.values()].sort((a,b)=>a._bestRank-b._bestRank);
  },[dataRevision]);
  const sResults=useMemo(()=>{
    const q=srch.trim().toLowerCase();
    if(q.length<2) return null;
    const scoreRank=(list,minScore=1)=>list
      .map(e=>({e,score:fuzzyMatchScore(e._searchText||"",q)}))
      .filter(x=>x.score>=minScore)
      .sort((a,b)=>b.score-a.score||(a.e._bestRank||999)-(b.e._bestRank||999))
      .map(x=>x.e);
    const songs=scoreRank(songSearchIndex).slice(0,8);
    const albums=scoreRank(albumSearchIndex).slice(0,6);
    const artists=(PUBLIC_DATA.artists||[])
      .map(a=>{
        const text=[...artistNameVariants(a),a.genre,a.city_region,a.country].filter(Boolean).join(" ").toLowerCase();
        const exactCode=(a.country_code||"").toLowerCase()===q?100:0;
        return {a,score:Math.max(fuzzyMatchScore(text,q),exactCode)};
      })
      .filter(x=>x.score>=1)
      .sort((x,y)=>y.score-x.score)
      .map(x=>x.a)
      .slice(0,6);
    const newsItems=(liveNews||NEWS)
      .map(n=>({n,score:fuzzyMatchScore([n.title,n.excerpt,n.body,n.cat].filter(Boolean).join(" ").toLowerCase(),q)}))
      .filter(x=>x.score>=1)
      .sort((x,y)=>y.score-x.score)
      .map(x=>x.n)
      .slice(0,4);
    // A release can have one raw cert row per threshold it has ever crossed
    // (Gold, then later Platinum) — keep only the highest-ranked row per
    // release so search never lists the same song twice at two levels.
    const matchedCerts=(liveCerts||[])
      .map(c=>({c,score:fuzzyMatchScore([c.t,c.a,c.level].filter(Boolean).map(String).join(" ").toLowerCase(),q)}))
      .filter(x=>x.score>=1)
      .sort((x,y)=>y.score-x.score)
      .map(x=>x.c);
    const certsByKey=new Map();
    matchedCerts.forEach(c=>{
      const key=`${c.chart_type==="albums"?"albums":"singles"}|||${certificationKey(c.t,c.a)}`;
      const existing=certsByKey.get(key);
      if(!existing||(CERTIFICATION_LEVEL_RANK[c.level]??99)<(CERTIFICATION_LEVEL_RANK[existing.level]??99)){
        certsByKey.set(key,c);
      }
    });
    const certs=Array.from(certsByKey.values()).slice(0,4);
    return {songs,albums,artists,news:newsItems,certs};
  },[srch,songSearchIndex,albumSearchIndex,liveNews,liveCerts,dataRevision]);
  const sFlatResults=useMemo(()=>{
    if(!sResults) return [];
    return [
      ...sResults.songs.map(e=>({...e,_kind:"song"})),
      ...sResults.albums.map(e=>({...e,_kind:"album"})),
      ...sResults.artists.map(a=>({...a,_kind:"artist"})),
      ...sResults.news.map(n=>({...n,_kind:"news"})),
      ...sResults.certs.map(c=>({...c,_kind:"cert"})),
    ];
  },[sResults]);

  // Every credited artist receives the release's full chart contribution from Top 50 source rows.
  const artistCutoffMonth = page === "analytics" ? anMonth : artistMonth;
  const artists = buildCombinedArtists(ct, artistCutoffMonth);
  useEffect(() => {
    if (!artists.length) return;
    const defaults = [...artists].sort((a, b) => b.m - a.m || b.p - a.p || a.rank - b.rank || a.n.localeCompare(b.n));
    const first = artists.some((item) => item.n === cmpA1) ? cmpA1 : defaults[0]?.n;
    const second = artists.some((item) => item.n === cmpA2) && cmpA2 !== first ? cmpA2 : (defaults.find((item) => item.n !== first) || defaults[0])?.n;
    if (first && first !== cmpA1) setCmpA1(first);
    if (second && second !== cmpA2) setCmpA2(second);
  }, [ct, artistCutoffMonth, artists, cmpA1, cmpA2]);
  const prepareDetailNavigation = () => {
    if (!detailOpenRef.current) {
      detailReturnScrollRef.current = window.scrollY || 0;
      window.history.pushState({ ...(window.history.state || {}), ngomaDetail: true }, "");
      detailOpenRef.current = true;
    }
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
  };
  const closeDetails = () => {
    if (window.history.state?.ngomaDetail) {
      window.history.back();
      return;
    }
    detailOpenRef.current = false;
    setSelA(null);
    setSelR(null);
    requestAnimationFrame(() => window.scrollTo({ top: detailReturnScrollRef.current, behavior: "auto" }));
  };
  const openArtistDetails = (name) => {
    const requestedName = String(name || "").trim();
    const allCurrentArtists = buildCombinedArtists("artists", CURRENT_MONTH);
    const resolvedName = allCurrentArtists.find((item) => item.n.toLowerCase() === requestedName.toLowerCase())?.n
      || publicArtistCreditMembers({ artist: requestedName })[0]
      || requestedName;
    const cumulativeProfile = allCurrentArtists.find((item) => item.n === resolvedName);
    if (!cumulativeProfile) {
      if (!requestedName) return;
      // Artist is not in the cross-platform combined chart (e.g., Kenyan-only artists, or
      // removed from the Kenyan chart after a country change). Open a profile-only panel
      // using the CMS record — same fallback pattern as the search result handler.
      const cmsArtist = publicArtistForName(requestedName);
      setSelR(null);
      setSelA({
        n: (cmsArtist && (cmsArtist.display_name || cmsArtist.name)) || requestedName,
        rh: {}, mp: {}, pk: "—", rank: "—", p: 0, m: 0, t: 0, prevRank: null,
        artist_profile: cmsArtist || {},
        image: getArtistImageUrl(cmsArtist || { title: requestedName }, { name: requestedName, isArtist: true }),
      });
      prepareDetailNavigation();
      return;
    }
    const monthlyRanks = {};
    MONTHS.forEach((monthLabel) => {
      const index = aggregateArtistsForMonth(monthLabel, "Combined")
        .findIndex((artist) => normArtistKey(artist.n) === normArtistKey(resolvedName));
      if (index >= 0 && index < 50) monthlyRanks[monthLabel] = index + 1;
    });
    const rankedMonths = Object.values(monthlyRanks);
    const profile = {
      ...cumulativeProfile,
      rank: monthlyRanks[CURRENT_MONTH] || "â€”",
      pk: rankedMonths.length ? Math.min(...rankedMonths) : "â€”",
      rh: monthlyRanks,
    };
    setPlat("Combined");
    setSelR(null);
    setSelA(profile);
    prepareDetailNavigation();
  };
  const closeSearch=()=>{setSOpen(false);setSrch("");setSActiveIdx(-1);};
  const selectSearchResult=(item)=>{
    closeSearch();
    if(item._kind==="song"){
      setPage("charts"); setMonth(item._bestMonth||CURRENT_MONTH);
      openReleaseDetails(item,"single");
    } else if(item._kind==="album"){
      setPage("charts"); setMonth(item._bestMonth||CURRENT_MONTH);
      openReleaseDetails(item,"album");
    } else if(item._kind==="artist"){
      // Try chart-based artist detail; fall back to profile-only panel for non-chart artists
      const chartEntry=buildCombinedArtists("artists",CURRENT_MONTH).find(a=>a.n.toLowerCase()===String(item.name||"").toLowerCase());
      if(chartEntry){
        openArtistDetails(item.name);
      } else {
        setSelR(null);
        setSelA({n:item.name||item.display_name||"",rh:{},mp:{},pk:"—",rank:"—",p:0,m:0,t:0,prevRank:null});
        prepareDetailNavigation();
      }
    } else if(item._kind==="news"){
      navTo("news"); setSelNews(item);
    } else if(item._kind==="cert"){
      // Open the song's release detail if it's in chart history; otherwise go to certifications page
      const entry=songSearchIndex.find(e=>String(e.title||"").toLowerCase()===String(item.t||"").toLowerCase()&&String(e.artist||"").toLowerCase()===String(item.a||"").toLowerCase())
        ||albumSearchIndex.find(e=>String(e.title||"").toLowerCase()===String(item.t||"").toLowerCase()&&String(e.artist||"").toLowerCase()===String(item.a||"").toLowerCase());
      if(entry){ setPage("charts"); setMonth(entry._bestMonth||CURRENT_MONTH); openReleaseDetails(entry,entry._type==="album"?"album":"single"); }
      else { navTo("certifications"); }
    }
  };
  const openReleaseDetails = (entry = {}, type = isSingles ? "single" : "album") => {
    if (entry?.is_artist_entry || String(type || entry.type || "").toLowerCase().includes("artist")) {
      openArtistDetails(entry.title || entry.primary_artist || entry.artist || entry.n);
      return;
    }
    const normalizedType = String(type || entry.type || "single").toLowerCase().includes("album") ? "album" : "single";
    const displayArtist = releaseArtist(entry);
    const primaryArtist = entry.primary_artist || entry.pa || publicArtistCreditMembers({ artist: displayArtist })[0] || displayArtist;
    setCt(normalizedType === "album" ? "albums" : "singles");
    setPlat("Combined");
    setSelA(null);
    setSelR({
      ...entry,
      title: releaseTitle(entry),
      artist: displayArtist,
      primary_artist: primaryArtist,
      type: normalizedType,
    });
    prepareDetailNavigation();
  };
  const artistTrendFor=(artist={})=>{
    if(!artist.prevRank) return {symbol:"NEW",color:"#1565C0",label:"New",shortLabel:"New"};
    const delta=Number(artist.prevRank)-Number(artist.rank);
    if(delta>0) return {symbol:"↑",color:"#2DB04A",label:`Up ${delta}`,shortLabel:"Up"};
    if(delta<0) return {symbol:"↓",color:"#C0392B",label:`Down ${Math.abs(delta)}`,shortLabel:"Down"};
    return {symbol:"–",color:"#9AA19A",label:"No change",shortLabel:"No change"};
  };

  const chartTypeLabel = isArtists ? "Artists" : (isSingles ? "Singles" : "Albums");
  const releaseLabel = isArtists ? "Artists" : (isSingles ? "Songs" : "Albums");
  const releaseLabelLower = isArtists ? "artists" : (isSingles ? "songs" : "albums");
  const releaseSingularLower = isArtists ? "artist" : (isSingles ? "song" : "album");
  const platformKeysFor = (chartType = releaseCt) => chartType === "artists" ? ARTIST_PLATS : (chartType === "singles" ? S_PLATS : A_PLATS).filter((platform) => platform !== "Combined");
  const currentPlatformKeys = platformKeysFor(ct);
  const analyticsRowsFor = (targetMonth, targetPlatform = "Combined") => isArtists
    ? buildArtistChart(targetMonth, targetPlatform)
    : (targetPlatform === "Combined" ? getCombined(releaseCt, targetMonth) : getPlatform(releaseCt, targetPlatform, targetMonth));
  const analyticsActive = page === "analytics";
  const analysisMonths = analyticsActive ? MONTHS.slice(0, Math.max(0, monthIndex(anMonth)) + 1) : MONTHS;
  // Records & Milestones now renders as a section inside the Analytics page
  // rather than its own route, so it shares the Analytics page's active flag.
  const recordsActive = page === "analytics";
  const recordsCoverageTargetFor = (chartType = releaseCt) => chartType === "artists" ? ARTIST_PLATS.length : platformKeysFor(chartType).length;
  const currentRecordsCoverageTarget = recordsCoverageTargetFor(ct);
  const recordsTop50RowsFor = (chartType, targetMonth) => (
    chartType === "artists"
      ? buildArtistChart(targetMonth, "Combined")
      : getCombined(chartType, targetMonth)
  )
    .filter((entry) => Number(entry.rank ?? entry.r) >= 1 && Number(entry.rank ?? entry.r) <= 50)
    .slice(0, 50);

  const recordsPlatformHitsFor = (chartType, targetMonth, title, artist, releaseId) => {
    if (chartType === "artists") {
      const artistName = title || artist;
      return ARTIST_PLATS.filter((platform) =>
        buildArtistChart(targetMonth, platform)
          .filter((entry) => Number(entry.rank) <= 50)
          .slice(0, 50)
          .some((entry) => normArtistKey(entry.title) === normArtistKey(artistName))
      );
    }
    const wantedKey = entryKey({ title, artist });
    return platformKeysFor(chartType).filter((platform) =>
      rawPlatform(chartType, platform, targetMonth)
        .filter((entry) => Number(entry.r) >= 1 && Number(entry.r) <= 50)
        .slice(0, 50)
        .some((entry) =>
          (Number(releaseId) && Number(entry.release_id) === Number(releaseId)) ||
          entryKey(entry) === wantedKey
        )
    );
  };

  const platformHitsFor = (chartType, targetMonth, title, artist) => {
    if (chartType === "artists") {
      const artistName = title || artist;
      return platformKeysFor("artists").filter((platform) =>
        buildArtistChart(targetMonth, platform).some((entry) => String(entry.title || "").toLowerCase() === String(artistName || "").toLowerCase())
      );
    }
    return platformKeysFor(chartType).filter((platform) =>
      getRawPlatformIndex(chartType, platform, targetMonth).has(entryKey({ title, artist }))
    );
  };

  const crossPlatformRows = analyticsActive ? analyticsRowsFor(anMonth)
    .map((entry) => {
      const hits = platformHitsFor(ct, anMonth, entry.title, entry.primary_artist || entry.artist);
      const fallbackCount = Number(String(entry.plat || "").split("/")[0]) || 0;
      const fallbackHits = hits.length ? hits : currentPlatformKeys.slice(0, fallbackCount);
      const count = fallbackHits.length || fallbackCount;
      return {
        ...entry,
        t: entry.title,
        a: entry.artist,
        plats: fallbackHits,
        count,
      };
    })
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count || Number(b.pts || 0) - Number(a.pts || 0)) : [];

  const coverageBucket = crossPlatformRows.reduce((acc, entry) => {
    acc[entry.count] = (acc[entry.count] || 0) + 1;
    return acc;
  }, {});

  const coverageData = Object.entries(coverageBucket)
    .map(([count, value]) => ({ name: `${count} platform${Number(count) === 1 ? "" : "s"}`, value, count: Number(count) }))
    .sort((a, b) => b.count - a.count);

  const platOnes = analyticsActive ? currentPlatformKeys
    .map((platform) => {
      if (isArtists) {
        const entry = buildArtistChart(anMonth, platform)[0];
        return entry ? [platform, { t: entry.title, a: entry.artist, primary_artist: entry.primary_artist, featured_artists: "", p: entry.pts, is_artist_entry: true, type: "artist" }] : null;
      }
      const entry = rawPlatform(releaseCt, platform, anMonth)[0];
      return entry ? [platform, { t: entry.t, a: entry.artist_credit || formatArtistCredit(entry.a, entry.fa, entry.primary_artists, entry.featured_artist_profiles), primary_artist: entry.primary_artist_credit || entry.a, featured_artists: entry.fa || "", p: entry.p }] : null;
    })
    .filter(Boolean) : [];

  const platTotalsData = analyticsActive ? currentPlatformKeys
    .map((platform) => {
      const entries = isArtists
        ? buildArtistChart(anMonth, platform).length
        : (() => {
            const platformIndex = getRawPlatformIndex(releaseCt, platform, anMonth);
            return getCombined(releaseCt, anMonth).filter((entry) => platformIndex.has(entryKey(entry))).length;
          })();
      return {
        platform: PLAT_LABEL[platform] || platform,
        entries,
        color: PC[platform] || "#888",
      };
    })
    .filter((entry) => entry.entries > 0) : [];

  const uniquePlatformData = analyticsActive ? (() => {
    const top50RowsByPlatform = new Map(
      currentPlatformKeys.map((platform) => [
        platform,
        isArtists
          ? buildArtistChart(anMonth, platform).slice(0, 50).map((entry) => ({ ...entry, t: entry.title, a: entry.primary_artist || entry.title, p: entry.pts, r: entry.rank }))
          : rawPlatform(releaseCt, platform, anMonth)
              .filter((entry) => Number(entry.r) <= 50)
              .slice(0, 50),
      ])
    );
    const top50IndexesByPlatform = new Map(
      currentPlatformKeys.map((platform) => {
        const index = new Map();
        (top50RowsByPlatform.get(platform) || []).forEach((entry) => {
          const key = entryKey(entry);
          if (!index.has(key)) index.set(key, entry);
        });
        return [platform, index];
      })
    );

    return currentPlatformKeys.map((platform) => {
      const otherIndexes = currentPlatformKeys
        .filter((item) => item !== platform)
        .map((item) => top50IndexesByPlatform.get(item));
      const uniqueEntries = (top50RowsByPlatform.get(platform) || [])
        .filter((entry) => !otherIndexes.some((index) => index?.has(entryKey(entry))))
        .map((entry) => ({
          title: entry.t || entry.title,
          artist: isArtists ? (entry.artist || "") : (entry.artist_credit || formatArtistCredit(entry.a, entry.fa, entry.primary_artists, entry.featured_artist_profiles)),
          primary_artist: entry.a || entry.primary_artist || entry.t || entry.title,
          featured_artists: entry.fa || entry.featured_artists || "",
          rank: entry.r || entry.rank,
          pts: entry.p || entry.pts,
          cover_image: entry.cover_image || entry.image || entry.c || "",
          is_artist_entry: isArtists,
        }));
      return {
        platform,
        label: PLAT_LABEL[platform] || platform,
        count: uniqueEntries.length,
        color: PC[platform] || "#888",
        entries: uniqueEntries.slice(0, 6),
      };
    });
  })() : [];

  const topCountryData = analyticsActive ? (() => {
    const countryMap = new Map();
    analyticsRowsFor(anMonth).forEach((entry) => {
      const country = getArtistCountry(entry);
      const code = country.code || "—";
      const current = countryMap.get(code) || {
        code,
        country: country.country || code,
        entries: 0,
        points: 0,
        color: COUNTRY_ACCENTS[code] || GOLD,
      };
      current.entries += 1;
      current.points += Number(entry.pts) || 0;
      countryMap.set(code, current);
    });
    return [...countryMap.values()]
      .sort((a, b) => b.entries - a.entries || b.points - a.points || a.code.localeCompare(b.code))
      .slice(0, 5);
  })() : [];

  const featureAnalytics = analyticsActive ? (() => {
    const releaseMap = new Map();
    const artistMap = new Map();
    const monthly = analysisMonths.map((monthLabel) => {
      let entries = 0;
      let points = 0;
      analyticsRowsFor(monthLabel).forEach((entry) => {
        const featuredArtists = isArtists ? [] : String(entry.featured_artists || entry.fa || "").split(/\s*,\s*|\s*&\s*/).map((item) => item.trim()).filter(Boolean);
        if (!featuredArtists.length) return;
        entries += 1;
        points += Number(entry.pts) || 0;
        const key = entryKey(entry);
        const release = releaseMap.get(key) || {
          title: entry.title,
          artist: entry.artist,
          primary_artist: entry.primary_artist,
          featured_artists: entry.featured_artists,
          entries: 0,
          points: 0,
          peak: Number.POSITIVE_INFINITY,
          months: new Set(),
        };
        release.entries += 1;
        release.points += Number(entry.pts) || 0;
        release.peak = Math.min(release.peak, Number(entry.rank) || Number.POSITIVE_INFINITY);
        release.months.add(monthLabel);
        releaseMap.set(key, release);
        featuredArtists.forEach((artistName) => {
          const artistKey = artistName.toLowerCase();
          const artist = artistMap.get(artistKey) || { name: artistName, points: 0, credits: 0, releases: new Set() };
          artist.points += Number(entry.pts) || 0;
          artist.credits += 1;
          artist.releases.add(key);
          artistMap.set(artistKey, artist);
        });
      });
      return { month: monthLabel.split(" ")[0].slice(0, 3), entries, points };
    });
    return {
      monthly,
      releases: [...releaseMap.values()]
        .map((item) => ({ ...item, months: item.months.size, peak: Number.isFinite(item.peak) ? item.peak : null }))
        .sort((a, b) => b.points - a.points || a.peak - b.peak)
        .slice(0, 8),
      artists: [...artistMap.values()]
        .map((item) => ({ ...item, releases: item.releases.size }))
        .sort((a, b) => b.points - a.points || b.credits - a.credits || a.name.localeCompare(b.name))
        .slice(0, 8),
    };
  })() : { monthly: [], releases: [], artists: [] };

  const buildMovementData = (chartType, targetMonth) => {
    const currentIndex = monthIndex(targetMonth);
    const currentRows = chartType === "artists" ? buildArtistChart(targetMonth, "Combined") : getCombined(chartType, targetMonth);
    const previousMonth = currentIndex > 0 ? MONTHS[currentIndex - 1] : null;
    const previousRows = previousMonth ? (chartType === "artists" ? buildArtistChart(previousMonth, "Combined") : getCombined(chartType, previousMonth)) : [];

    const moves = currentRows
      .map((entry) => {
        const previous = previousRows.find((item) => entryKey(item) === entryKey(entry));
        if (!previous) return null;
        const from = Number(previous.rank);
        const to = Number(entry.rank);
        if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) return null;
        return {
          t: entry.title,
          a: entry.artist,
          from,
          to,
          delta: from - to,
          cover_image: entry.cover_image || entry.image || "",
          is_artist_entry: entry.is_artist_entry,
          type: entry.type,
        };
      })
      .filter(Boolean);

    const newEntries = currentRows.filter((entry) => entry.is_new);
    const reEntries = currentRows.filter((entry) => entry.reentry);

    return {
      new: newEntries.length,
      ret: reEntries.length,
      debut: newEntries.length,
      newEntries,
      reEntries,
      risers: moves.filter((entry) => entry.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 5),
      fallers: moves.filter((entry) => entry.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 5),
    };
  };

  // Movement data for the current analytics month and selected chart type
  const mvData = analyticsActive
    ? buildMovementData(ct, anMonth)
    : { new: 0, ret: 0, debut: 0, newEntries: [], reEntries: [], risers: [], fallers: [] };

  const num = (value) => {
    const parsed = Number(String(value ?? 0).replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const trackedPeriodLabel = "across all tracked months";
  const monthCountLabel = `${MONTHS.length} ${MONTHS.length === 1 ? "month" : "months"}`;

  const releaseGroupsFor = (chartType) => {
    const groups = new Map();
    MONTHS.forEach((m) => {
      recordsTop50RowsFor(chartType, m).forEach((entry) => {
        const key = entryKey(entry);
        if (!groups.has(key)) {
          groups.set(key, {
            key,
            title: entry.title,
            artist: entry.artist,
            cover_image: entry.cover_image || entry.image || "",
            totalPoints: 0,
            months: new Set(),
            numberOneMonths: new Set(),
            rows: [],
            fullCoverageMonths: new Set(),
          });
        }

        const group = groups.get(key);
        const points = num(entry.pts);
        const rank = num(entry.rank);
        const hits = recordsPlatformHitsFor(chartType, m, entry.title, entry.primary_artist || entry.artist, entry.release_id);
        const platformCount = hits.length;

        group.totalPoints += points;
        group.months.add(m);
        group.rows.push({ ...entry, month: m, points, rank, platformCount });
        if (rank === 1) group.numberOneMonths.add(m);
        if (platformCount >= recordsCoverageTargetFor(chartType)) group.fullCoverageMonths.add(m);
      });
    });
    return [...groups.values()];
  };

  const biggestClimbFor = (chartType) => {
    let best = null;
    MONTHS.forEach((m, index) => {
      if (index === 0) return;
      const previousMonth = MONTHS[index - 1];
      const previousRows = recordsTop50RowsFor(chartType, previousMonth);
      recordsTop50RowsFor(chartType, m).forEach((entry) => {
        const previous = previousRows.find((item) => entryKey(item) === entryKey(entry));
        if (!previous) return;
        const from = num(previous.rank);
        const to = num(entry.rank);
        const delta = from - to;
        if (delta > 0 && (!best || delta > best.delta)) {
          best = { ...entry, from, to, delta, month: m };
        }
      });
    });
    return best;
  };

  // Eligible pool for the record boxes that don't pin to a single release/artist
  // (Total Charted X) — set inside the IIFE below and exposed via ctx so the
  // Records & Milestones section can rotate the box's art through every entry
  // in the pool instead of showing it empty.
  let currentRecordsPool = [];
  const currentRecords = recordsActive ? (() => {
    if (isArtists) {
      const artistGroups = releaseGroupsFor("artists").map((group) => ({
        ...group,
        entryCount: group.rows.reduce(
          (sum, row) => sum + (num(row.entries_count) || 1),
          0
        ),
        peak: group.rows.reduce(
          (best, row) => Math.min(best, num(row.rank) || Number.POSITIVE_INFINITY),
          Number.POSITIVE_INFINITY
        ),
      }));
      currentRecordsPool = artistGroups.map((group) => ({ ...group, is_artist_entry: true }));
      const highestPoints = [...artistGroups].sort((a, b) => b.totalPoints - a.totalPoints || a.title.localeCompare(b.title))[0];
      const mostMonths = [...artistGroups].sort((a, b) => b.months.size - a.months.size || b.totalPoints - a.totalPoints)[0];
      const mostEntries = [...artistGroups].sort((a, b) => b.entryCount - a.entryCount || b.totalPoints - a.totalPoints)[0];
      const bestPeak = [...artistGroups].sort((a, b) => a.peak - b.peak || b.totalPoints - a.totalPoints)[0];
      const biggestClimb = biggestClimbFor("artists");
      return [
        { label: "Highest Artist Points", displayLabel: "Highest Artist Points", value: highestPoints?.title || "—", displaySub: highestPoints ? `${highestPoints.totalPoints.toLocaleString()} pts from public Top 50s` : "No artist data found", certificationEntry: highestPoints ? { title: highestPoints.title, is_artist_entry: true } : null },
        { label: "Most Months Active", displayLabel: "Most Months Active", value: mostMonths?.title || "—", displaySub: mostMonths ? `${mostMonths.months.size} ${mostMonths.months.size === 1 ? "month" : "months"} in the Top 50` : "No artist data found", certificationEntry: mostMonths ? { title: mostMonths.title, is_artist_entry: true } : null },
        { label: "Most Chart Entries", displayLabel: "Most Chart Entries", value: mostEntries?.title || "—", displaySub: mostEntries ? `${mostEntries.entryCount} credited Top-50 release placements` : "No artist data found", certificationEntry: mostEntries ? { title: mostEntries.title, is_artist_entry: true } : null },
        { label: "Best Artist Rank", displayLabel: "Best Artist Rank", value: bestPeak?.title || "—", displaySub: bestPeak ? `Peak public artist rank #${bestPeak.peak}` : "No artist data found", certificationEntry: bestPeak ? { title: bestPeak.title, is_artist_entry: true } : null },
        { label: "Biggest Artist Climb", displayLabel: "Biggest Artist Climb", value: biggestClimb?.title || "—", displaySub: biggestClimb ? `#${biggestClimb.from} → #${biggestClimb.to}` : "No monthly Top-50 climb found", climbDelta: biggestClimb?.delta || null, certificationEntry: biggestClimb ? { title: biggestClimb.title, is_artist_entry: true, cover_image: biggestClimb.cover_image || biggestClimb.image || "" } : null },
        { label: "Total Charted Artists", displayLabel: "Total Charted Artists", value: artistGroups.length, displaySub: `artists appearing in a public Top 50`, isTotalCount: true },
      ];
    }
    const groups = releaseGroupsFor(releaseCt);
    currentRecordsPool = groups;
    const highestPoints = [...groups]
      .sort((a, b) => b.totalPoints - a.totalPoints || a.title.localeCompare(b.title))[0];
    const biggestClimb = biggestClimbFor(releaseCt);
    const mostNumberOnes = [...groups]
      .filter((group) => group.numberOneMonths.size > 0)
      .sort((a, b) => b.numberOneMonths.size - a.numberOneMonths.size || b.totalPoints - a.totalPoints)[0];
    const longestRun = [...groups]
      .sort((a, b) => b.months.size - a.months.size || b.totalPoints - a.totalPoints)[0];
    const fullCoverageCount = groups.filter((group) => group.fullCoverageMonths.size > 0).length;

    return [
      {
        label: "Most Months at #1",
        displayLabel: "Most Months at #1",
        value: mostNumberOnes?.title || "—",
        displaySub: mostNumberOnes
          ? `${mostNumberOnes.artist} · No. 1 for ${mostNumberOnes.numberOneMonths.size} ${mostNumberOnes.numberOneMonths.size === 1 ? "month" : "months"} ${trackedPeriodLabel}`
          : `No #1 ${releaseLabelLower} found`,
        certificationEntry: mostNumberOnes ? { title: mostNumberOnes.title, artist: mostNumberOnes.artist, cover_image: mostNumberOnes.cover_image || "" } : null,
      },
      {
        label: "Highest Points Score",
        displayLabel: "Highest Points Score",
        value: highestPoints?.title || "—",
        displaySub: highestPoints
          ? `${highestPoints.artist} · ${highestPoints.totalPoints.toLocaleString()} pts`
          : `No ${releaseLabelLower} found`,
        certificationEntry: highestPoints ? { title: highestPoints.title, artist: highestPoints.artist, cover_image: highestPoints.cover_image || "" } : null,
      },
      {
        label: "Biggest Monthly Climb",
        displayLabel: "Biggest Monthly Climb",
        value: biggestClimb?.title || "—",
        displaySub: biggestClimb
          ? `${biggestClimb.artist} · #${biggestClimb.from} → #${biggestClimb.to}`
          : `No monthly climb found`,
        climbDelta: biggestClimb?.delta || null,
        certificationEntry: biggestClimb,
      },
      {
        label: "Perfect Coverage Club",
        displayLabel: "Perfect Coverage Club",
        value: `${fullCoverageCount} ${releaseLabelLower}`,
        displaySub: `${currentRecordsCoverageTarget}/${currentRecordsCoverageTarget} platform coverage`,
        isCoverage: true,
      },
      {
        label: "Chart Longevity",
        displayLabel: "Chart Longevity",
        value: longestRun?.title || "—",
        displaySub: longestRun
          ? `${longestRun.artist} · ${longestRun.months.size === MONTHS.length ? `Charted all ${monthCountLabel}` : `Charted ${longestRun.months.size} ${longestRun.months.size === 1 ? "month" : "months"}`}`
          : `No ${releaseLabelLower} found`,
        certificationEntry: longestRun ? { title: longestRun.title, artist: longestRun.artist, cover_image: longestRun.cover_image || "" } : null,
      },
      {
        label: `Total Charted ${releaseLabel}`,
        displayLabel: `Total Charted ${releaseLabel}`,
        value: groups.length,
        displaySub: `charted ${trackedPeriodLabel}`,
        isTotalCount: true,
      },
    ];
  })() : [];

  const fullCoverageClub = useMemo(() => {
    if (!recordsActive) return [];
    const seen = new Map();
    MONTHS.forEach((m) => {
      recordsTop50RowsFor(ct, m).forEach((entry) => {
        const hits = recordsPlatformHitsFor(ct, m, entry.title, entry.primary_artist || entry.artist, entry.release_id);
        const count = hits.length;
        if (count >= currentRecordsCoverageTarget) {
          const key = entryKey(entry);
          if (!seen.has(key)) seen.set(key, { title: entry.title, artist: entry.artist, month: m, pts: entry.pts });
        }
      });
    });
    return [...seen.values()].sort((a, b) => num(b.pts) - num(a.pts));
  }, [ct, currentRecordsCoverageTarget, recordsActive, isArtists, dataRevision]);

  const navTo=p=>{
    const nextPage=PUBLIC_PAGE_ROUTES[p]?p:"charts";
    const nextPath=PUBLIC_PAGE_ROUTES[nextPage];
    if(window.location.pathname!==nextPath){
      window.history.pushState({page:nextPage},"",nextPath);
    }
    setPage(nextPage);setSelA(null);setSelR(null);setSelNews(null);setMNav(false);setMoreOpen(false);
  };
  const navItems=["charts","analytics","year-end","certifications","news","about"];
  const primaryNavItems=["charts","analytics","year-end","certifications"];
  const moreNavItems=navItems.filter((item)=>!primaryNavItems.includes(item));
  const navLabel=t=>t==="year-end"?"All Time":t;
  const card=(extra={})=>({background:"#FFF",borderRadius:"14px",border:"1px solid #EFEDE7",padding:isMobile?"18px":"22px",boxSizing:"border-box",maxWidth:"100%",boxShadow:"0 1px 3px rgba(0,0,0,0.02),0 8px 24px rgba(0,0,0,0.02)",...extra});
  const TXT = {
    kicker: isMobile ? "9px" : "10.5px",
    pageTitle: isMobile ? "24px" : "24px",
    lead: isMobile ? "12px" : "11px",
    section: isMobile ? "10.5px" : "10px",
    rowTitle: isMobile ? "15px" : "15px",
    rowMeta: isMobile ? "12px" : "12px",
    cardTitle: isMobile ? "15px" : "15px",
    cardMeta: isMobile ? "12px" : "12px",
    metric: isMobile ? "16px" : "16px",
    micro: "10px",
    note: isMobile ? "11px" : "11px",
    body: isMobile ? "13px" : "12px",
  };
  const secLbl=(c=GOLD)=>({fontFamily:F,fontSize:TXT.section,fontWeight:800,letterSpacing:isMobile?"2px":"2.4px",textTransform:"uppercase",color:c,marginBottom:"14px",display:"flex",alignItems:"center",gap:"7px",lineHeight:1.35});
  const SecMark=({c=GOLD})=><span style={{display:"inline-block",width:"14px",height:"2px",background:c,borderRadius:"1px"}}/>;


  const latestMonth = MONTHS[MONTHS.length - 1] || month;
  const latestMonthName = latestMonth.split(" ")[0] || "Latest";
  const latestMonthShort = latestMonthName.slice(0, 3);
  const latestTrendMonths = MONTHS.slice(-3);
  const trendMonthShort = (label = "") => String(label).split(" ")[0].slice(0, 3);
  const trendLabelText = latestTrendMonths.map(trendMonthShort).join(" / ");
  const currentTrending = isArtists ? { rising: [], debuts: [] } : (isSingles ? COMBINED_TRENDING.singles : COMBINED_TRENDING.albums);
  const formulaLabel = "Movement compares each release's Combined chart rank with the previous month";
  const getTrendPoints = (trend = []) => {
    const rawValues = Array.isArray(trend)
      ? trend.map((value) => Number.isFinite(Number(value)) ? Number(value) : null)
      : [];
    const lastValues = rawValues.slice(-latestTrendMonths.length);

    while (lastValues.length < latestTrendMonths.length) lastValues.unshift(null);

    return latestTrendMonths.map((trendMonth, index) => ({
      month: trendMonth,
      label: trendMonthShort(trendMonth),
      rank: lastValues[index],
    }));
  };
  const uniqueByMomentumIdentity = (rows = []) => [
    ...new Map(
      rows.map((row, index) => [
        `${String(row.t || "").trim().toLowerCase()}|${String(row.a || "").trim().toLowerCase()}|${row.decRank ?? index}`,
        row,
      ])
    ).values(),
  ];
  const openMomentumRelease = (row) => openReleaseDetails(row, isSingles ? "single" : "album");
  const TrendBars = ({ trend = [], height = 58, compact = false }) => {
    const bars = getTrendPoints(trend);

    return (
      <div style={{display:"flex",alignItems:"flex-end",gap:compact?"3px":"6px",height,justifyContent:compact?"flex-end":"center"}}>
        {bars.map((bar, index) => (
          <div key={`${bar.month}-${index}`} title={`${bar.month}: ${bar.rank ? `#${bar.rank}` : "not charted"}`} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:compact?"2px":"4px"}}>
            <div
              style={{
                width:compact?"7px":"28px",
                height:bar.rank ? Math.max(compact?3:4, ((51 - bar.rank) / 50) * (compact ? 24 : 54)) + "px" : compact?"3px":"4px",
                background:bar.rank ? (index === bars.length - 1 ? "#2DB04A" : "#CDE8D2") : "#E7EAE7",
                borderRadius:compact?"1px":"3px",
                transition:"height 0.5s",
              }}
            />
            {!compact && <span style={{fontFamily:F,fontSize:"8px",color:"#7C8A80"}}>{bar.label}</span>}
          </div>
        ))}
      </div>
    );
  };

  const Tog=({sm})=>(
    <div
      style={{
        display:"flex",
        gap:sm?"5px":"6px",
        padding:sm?"3px":"4px",
        borderRadius:"999px",
        background:isDark?"#181C18":"#F2F2F2",
        border:"1px solid "+(isDark?"#2F352F":"rgba(0,0,0,0.10)"),
        boxSizing:"border-box",
        overflow:"hidden",
        maxWidth:"100%",
      }}
    >
      {["singles","albums","artists"].map(t=><button
        key={t}
        onClick={()=>{setCt(t);setPlat("Combined");}}
        style={{
          padding:sm?"7px 14px":"8px 18px",
          background:ct===t?GOLD:(isDark?"transparent":"#FFF"),
          border:"1px solid "+(ct===t?GOLD:(isDark?"transparent":"rgba(0,0,0,0.14)")),
          borderRadius:"999px",
          color:ct===t?"#111":(isDark?"#B8BDB8":"#111"),
          cursor:"pointer",
          fontSize:sm?"10px":"11px",
          fontWeight:900,
          letterSpacing:"1.5px",
          textTransform:"uppercase",
          fontFamily:F,
          lineHeight:1,
          boxShadow:ct===t?"0 2px 8px rgba(184,134,11,0.20)":"none",
          transition:"all .16s ease",
        }}
      >{t}</button>)}
    </div>
  );

  const setViewMode = (key, value) => setViewModes((current) => ({ ...current, [key]: value }));
  const viewMode = (key, fallback = "graph") => viewModes[key] || fallback;
  const ViewToggle = ({ id, value = viewMode(id), onChange = (next) => setViewMode(id, next) }) => (
    <div style={{display:"flex",padding:"3px",borderRadius:"999px",background:isDark?"#181C18":"#F2F2EE",border:"1px solid "+(isDark?"#2F352F":"#E3E0D8"),flexShrink:0}}>
      {["table","graph"].map((mode)=>{
        const active = value === mode;
        return (
          <button
            key={mode}
            type="button"
            onClick={()=>onChange(mode)}
            style={{
              border:0,
              borderRadius:"999px",
              background:active?(isDark?"#363C33":"#1A1A1A"):"transparent",
              color:active?"#FFF":(isDark?"#B8BDB8":"#59645D"),
              padding:"7px 12px",
              fontFamily:F,
              fontSize:"9.5px",
              fontWeight:900,
              letterSpacing:"1px",
              textTransform:"uppercase",
              cursor:"pointer",
            }}
          >
            {mode}
          </button>
        );
      })}
    </div>
  );

  // === ANALYTICS COMPUTATIONS — all from full Top-50 data ===
  const top10sData=analyticsActive?analyticsRowsFor(anMonth).slice(0,10).map(e=>({...e,name:e.title.length>16?e.title.slice(0,14)+"…":e.title,title:e.title,artist:e.artist,pts:e.pts})):[];
  const monthlyComp=analyticsActive?analysisMonths.map(m=>{
    const rows=analyticsRowsFor(m);
    return {
      month:m.split(" ")[0].slice(0,3),
      singles:getCombined("singles",m).length,
      albums:getCombined("albums",m).length,
      new:rows.filter(entry=>entry.is_new).length,
      debut:rows.filter(entry=>entry.is_new&&Number(entry.rank)<=10).length,
    };
  }):[];

  const topArtistTrajectoryArtists = analyticsActive ? artists.slice(0,3) : [];
  const topArtistsLine=analyticsActive?analysisMonths.map(m=>{
    const obj={month:m.split(" ")[0].slice(0,3)};
    topArtistTrajectoryArtists.forEach(a=>{
      obj[a.n]=a.mp[m]||0;
    });
    return obj;
  }):[];

  const cmp1=artists.find(x=>x.n===cmpA1)||{n:cmpA1,p:0,m:0,t:0,pk:"-",mp:{}};
  const cmp2=artists.find(x=>x.n===cmpA2)||{n:cmpA2,p:0,m:0,t:0,pk:"-",mp:{}};

  // === SONG / ALBUM COMPARISON ===
  const PLATS_FOR = currentPlatformKeys;
  // Unique titles for the current chart type, with their artist
  const allTitles=useMemo(()=>{
    if(!analyticsActive)return [];
    const map={};
    analysisMonths.forEach(m=>analyticsRowsFor(m).forEach(e=>{const k=e.title+" — "+e.artist;if(!map[k])map[k]={key:k,title:e.title,artist:e.artist,primary_artist:e.primary_artist||e.artist,featured_artists:e.featured_artists||"",is_artist_entry:e.is_artist_entry,eKey:entryKey(e)};}));
    return Object.values(map).sort((a,b)=>a.title.localeCompare(b.title));
  },[analyticsActive,ct,anMonth,dataRevision]);
  // Build a full profile for a song key
  const songProfile=(key)=>{
    const meta=allTitles.find(t=>t.key===key);
    if(!meta)return null;
    const {title,artist,primary_artist,is_artist_entry,eKey:releaseKey}=meta;
    const prof={title,artist,primary_artist,is_artist_entry,cover_image:"",monthly:{},platforms:{},totalPts:0,peak:999,months:0,debutMonth:null,bestCov:0,avgRank:0};
    let rankSum=0,rankCount=0;
    analysisMonths.forEach(m=>{
      const e=analyticsRowsFor(m).find(x=>entryKey(x)===releaseKey);
      if(e){
        prof.monthly[m]={rank:e.rank,pts:e.pts,cov:e.plat};
        prof.totalPts+=Number(e.pts)||0; prof.months+=1;
        if(e.rank<prof.peak)prof.peak=e.rank;
        if(!prof.debutMonth)prof.debutMonth=m;
        if(!prof.cover_image)prof.cover_image=e.cover_image||e.image||"";
        const covNum=parseInt((e.plat||"0/0").split("/")[0],10)||0;
        if(covNum>prof.bestCov)prof.bestCov=covNum;
        rankSum+=e.rank; rankCount+=1;
      }
    });
    prof.avgRank=rankCount?Math.round(rankSum/rankCount):0;
    PLATS_FOR.forEach(pl=>{
      let best=null;
      analysisMonths.forEach(m=>{const pe=isArtists ? buildArtistChart(m,pl).find(x=>entryKey(x)===releaseKey) : getRawPlatformIndex(releaseCt,pl,m).get(releaseKey);if(pe&&((pe.r||pe.rank)&&(best===null||Number(pe.r||pe.rank)<best)))best=Number(pe.r||pe.rank);});
      if(best!==null)prof.platforms[pl]=best;
    });
    prof.platformCount=Object.keys(prof.platforms).length;
    // weeks-equivalent: number of (platform×month) chart appearances
    let appearances=0;
    PLATS_FOR.forEach(pl=>analysisMonths.forEach(m=>{if(isArtists ? buildArtistChart(m,pl).some(x=>entryKey(x)===releaseKey) : getRawPlatformIndex(releaseCt,pl,m).has(releaseKey))appearances+=1;}));
    prof.appearances=appearances;
    // #1 count on combined
    prof.numberOnes=Object.values(prof.monthly).filter(x=>x.rank===1).length;
    return prof;
  };
  // Default song selections to the current month's #1 and #2
  useEffect(()=>{
    if(!analyticsActive)return;
    const cd=analyticsRowsFor(anMonth);
    if(cd[0])setCmpS1(cd[0].title+" — "+cd[0].artist);
    if(cd[1])setCmpS2(cd[1].title+" — "+cd[1].artist);
  },[analyticsActive,ct,anMonth,dataRevision]);
  useEffect(()=>{
    if(!analyticsActive||!allTitles.length)return;
    const available = new Set(allTitles.map((item) => item.key));
    const defaults = comparisonDefaultKeys(ct, anMonth).filter((key) => available.has(key));
    if(defaults[0])setCmpS1(defaults[0]);
    if(defaults[1]||defaults[0])setCmpS2(defaults[1]||defaults[0]);
  },[analyticsActive,ct,anMonth,allTitles,dataRevision]);
  const [sp1,sp2]=useMemo(()=>{
    if(!analyticsActive)return [null,null];
    return [
      songProfile(cmpS1)||songProfile(allTitles[0]?.key),
      songProfile(cmpS2)||songProfile(allTitles[1]?.key),
    ];
  },[analyticsActive,ct,cmpS1,cmpS2,allTitles,dataRevision]);
  const songMonthlyData=analyticsActive?analysisMonths.map(m=>({month:m.split(" ")[0].slice(0,3),A:sp1?.monthly[m]?.pts||0,B:sp2?.monthly[m]?.pts||0})):[];
  const songRankData=analyticsActive?analysisMonths.map(m=>({month:m.split(" ")[0].slice(0,3),A:sp1?.monthly[m]?.rank||null,B:sp2?.monthly[m]?.rank||null})):[];

  // All-time totals used for certification math (never affected by the
  // Year-End page's All Time / Best of Year toggle below).
  const yearEndRaw=isArtists?buildArtistYearEndRows():(isSingles?COMBINED_YEAR_END.singles:COMBINED_YEAR_END.albums);
  const yearEnd=coverImageCache.size?yearEndRaw.map(e=>{if(e.cover_image)return e;const img=coverImageCache.get(entryKey(e));return img?{...e,cover_image:img}:e;}):yearEndRaw;

  // Year-End page's own display list — switches between the full published
  // history ("All Time") and a rolling last-12-months window ("Best of
  // Year"), scoped to the selected platform (or Combined).
  const yearEndActive = page === "year-end";
  const yearEndMonths = yearEndMode === "bestofyear" ? MONTHS.slice(-12) : MONTHS;
  const yearEndDisplayRaw = yearEndActive
    ? (isArtists
        ? buildYearEndArtistRows(yearEndMonths, yearEndPlat)
        : buildYearEndReleaseRows(releaseCt, yearEndMonths, yearEndPlat))
    : [];
  const yearEndDisplay = coverImageCache.size
    ? yearEndDisplayRaw.map(e=>{if(e.cover_image)return e;const img=coverImageCache.get(entryKey(e));return img?{...e,cover_image:img}:e;})
    : yearEndDisplayRaw;
  const yearEndPeriodLabel = yearEndMode === "bestofyear"
    ? `${yearEndMonths[0] || CURRENT_MONTH} – ${yearEndMonths[yearEndMonths.length - 1] || CURRENT_MONTH} (last 12 months)`
    : DATA_PERIOD;

  const tracked=analyticsRowsFor(analyticsActive?anMonth:CURRENT_MONTH).slice(0,5).map(entry=>entry.title);
  const rankJourneyStartIndex=tracked.reduce((earliest,title)=>{
    const idx=analysisMonths.findIndex(m=>analyticsRowsFor(m).some(e=>e.title===title));
    return idx>=0?Math.min(earliest,idx):earliest;
  },analysisMonths.length);
  const rankJourneyMonths=rankJourneyStartIndex<analysisMonths.length?analysisMonths.slice(rankJourneyStartIndex):analysisMonths;

  const automaticCerts = useMemo(() => buildAutomaticCertifications({
    singles: COMBINED_YEAR_END.singles,
    albums: COMBINED_YEAR_END.albums,
  }, CERTIFICATION_LEVELS), [dataRevision]);
  const certIcons=CERTIFICATION_LEVELS.reduce((acc, item) => {
    acc[item.level] = item.icon;
    return acc;
  }, {});
  const certColors=CERTIFICATION_LEVELS.reduce((acc, item) => {
    acc[item.level] = item.color;
    return acc;
  }, {});
  // Certification level and cumulative points follow the published Combined
  // Top 50 history. Live CMS rows supply editorial metadata when available,
  // while automatic rows keep public badges current as soon as points change.
  const normalizedLiveCerts = useMemo(() => {
    const mergedCerts = mergeCertifications(automaticCerts, liveCerts || [], CERTIFICATION_LEVELS);
    return mergedCerts.map((cert) => {
      const meta = certificationMetaForLevel(cert.level);
      if (!meta) return null;
      return { ...cert, ...meta, totalPts: Number(cert.totalPts) || 0 };
    }).filter(Boolean);
  }, [automaticCerts, liveCerts]);

  // Collapse the raw certification rows down to one per release — the
  // highest level it has reached — before anything downstream reads them,
  // so the Charts badges, the news matcher, and the Certifications page can
  // never disagree about which level a release is currently at.
  const dedupedLiveCerts = useMemo(() => {
    const bucket = new Map();
    normalizedLiveCerts.forEach((cert) => {
      const key = `${cert.chart_type === "albums" ? "albums" : "singles"}|||${certificationKey(cert.t, cert.a)}`;
      const existing = bucket.get(key);
      if (!existing || (CERTIFICATION_LEVEL_RANK[cert.level] ?? 99) < (CERTIFICATION_LEVEL_RANK[existing.level] ?? 99)) {
        bucket.set(key, cert);
      }
    });
    return Array.from(bucket.values());
  }, [normalizedLiveCerts]);

  const certificationLookup = useMemo(() => {
    const result = { singles: new Map(), albums: new Map() };
    (dedupedLiveCerts || []).forEach((cert) => {
      const bucket = cert.chart_type === "albums" ? "albums" : "singles";
      result[bucket].set(certificationKey(cert.t, cert.a), cert);
    });
    return result;
  }, [dedupedLiveCerts]);

  // A certification tag is shown ONLY when the release has met the cumulative
  // Combined Top-50 threshold (51 − rank, summed across all months). The
  // certificationLookup is the single source of truth for this — entries
  // not present there have not reached a certification level.
  const getCertificationForEntry = (entry = {}, fallbackType) => {
    const type = String(fallbackType || entry.type || (isSingles ? "single" : "album")).toLowerCase();
    const bucket = type.includes("album") ? "albums" : "singles";
    const title = releaseTitle(entry);
    const artist = releaseArtist(entry);
    return certificationLookup[bucket]?.get(certificationKey(title, artist)) || null;
  };
  const allCertifiedReleases = useMemo(() => {
    return (dedupedLiveCerts || []).map((cert) => ({
      ...cert,
      type: cert.chart_type === "albums" ? "album" : "single",
    })).sort((a, b) => b.totalPts - a.totalPts);
  }, [dedupedLiveCerts]);
  const publicNews = useMemo(() => {
    const monthLabel = latestPublishedMonthLabel();
    const automaticNews = buildAutomaticNews({
      latestMonth: monthLabel,
      singlesRows: getCombined("singles", monthLabel),
      albumsRows: getCombined("albums", monthLabel),
      certifications: allCertifiedReleases,
      levels: CERTIFICATION_LEVELS,
      generatedAt: PUBLIC_DATA.generated_at || PUBLIC_DATA.revision || "",
      siteName: SITE_NAME,
    });
    return mergeNews(liveNews || [], automaticNews);
  }, [allCertifiedReleases, liveNews, dataRevision]);

  const getCertificationsForNews = (news = {}, limit = 3) => {
    const text = `${news.title || ""} ${news.excerpt || ""} ${news.body || ""}`.toLowerCase();
    if (!text.trim()) return [];

    const seen = new Set();
    return allCertifiedReleases.filter((cert) => {
      const key = certificationKey(cert.t, cert.a);
      if (seen.has(key)) return false;
      const title = String(cert.t || "").toLowerCase();
      const artist = String(cert.a || "").toLowerCase();
      const matches = title && text.includes(title) || (artist && title && text.includes(artist) && text.includes(title));
      if (matches) seen.add(key);
      return matches;
    }).slice(0, limit);
  };


  // Hall of Fame: #1 each month for singles, albums, and artists.
  const hof=MONTHS.flatMap(m=>{
    const s=getCombined("singles",m)[0];
    const a=getCombined("albums",m)[0];
    const artist=buildArtistChart(m,"Combined")[0];
    return [
      s?{...s,month:m,type:"single"}:null,
      a?{...a,month:m,type:"album"}:null,
      artist?{...artist,month:m,type:"artist",is_artist_entry:true}:null,
    ];
  }).filter(Boolean);

  const releaseJourney=r=>{
    if(!r)return [];
    return MONTHS.map(m=>{
      const sc=getCombined(releaseCt,m).find(e=>sameRelease(e,r));
      const platforms=(isSingles?S_PLATS:A_PLATS).filter((platform)=>platform!=="Combined");
      const entries=platforms.map(pl=>{const d=getPlatform(releaseCt,pl,m).find(e=>sameRelease(e,r));return d?{platform:PLAT_LABEL[pl]||pl,rank:d.rank,pts:d.pts}:null;}).filter(Boolean);
      return {month:m,combined:sc||null,platforms:entries};
    });
  };

  const allArtistNames=[...new Set(artists.map(a=>a.n))].sort();
  const selectedArtistEntries = selA ? MONTHS.flatMap((monthLabel) =>
    getArtistSourceCombined("artists", monthLabel)
      .filter((entry) => publicArtistChartCreditMembers(entry).some((name) => normArtistKey(name) === normArtistKey(selA.n)))
      .map((entry) => ({
        ...entry,
        month: monthLabel,
        chart_type: entry.sourceChartType || entry.chart_type || entry.type,
        pts: artistTop50Points(entry),
      }))
  ) : [];
  const artistDetailEntryKey = (entry) => {
    const releaseIdentity = entry.release_id ? `id:${entry.release_id}` : entryKey(entry);
    return `${entry.sourceChartType || entry.chart_type || entry.type || "release"}|${releaseIdentity}`;
  };
  const selectedArtistReleases = selA ? [...new Map(selectedArtistEntries.map((entry) => [artistDetailEntryKey(entry), entry])).values()] : [];
  const selectedArtistEntryGroups = selA ? [...selectedArtistEntries.reduce((map, entry) => {
    const key = artistDetailEntryKey(entry);
    const current = map.get(key) || {
      title: entry.title,
      artist: entry.artist,
      primary_artist: entry.primary_artist,
      featured_artists: entry.featured_artists,
      chart_type: entry.sourceChartType || entry.chart_type || entry.type,
      totalPoints: 0,
      peak: Number.POSITIVE_INFINITY,
      rows: [],
    };
    current.totalPoints += Number(entry.pts) || 0;
    current.peak = Math.min(current.peak, Number(entry.rank) || Number.POSITIVE_INFINITY);
    current.rows.push(entry);
    map.set(key, current);
    return map;
  }, new Map()).values()].sort((a, b) => b.totalPoints - a.totalPoints || a.peak - b.peak || a.title.localeCompare(b.title)) : [];
  const selectedArtistRankData = selA ? MONTHS.map((monthLabel) => ({
    month: monthLabel.split(" ")[0].slice(0, 3),
    rank: selA.rh?.[monthLabel] || null,
    points: selectedArtistEntries
      .filter((entry) => entry.month === monthLabel)
      .reduce((sum, entry) => sum + (Number(entry.pts) || 0), 0),
  })) : [];

  const pageContext = {
    A_PLATS,
    API_BASE,
    ARTIST_PLATS,
    AnalyticsDeepSection,
    BRONZE,
    Bar,
    BarChart,
    CC,
    CERTIFICATION_LEVELS,
    CartesianGrid,
    Cell,
    CertificationTag,
    CountryBadge,
    DATA_PERIOD,
    F,
    GOLD,
    Legend,
    Line,
    LineChart,
    MEDALS,
    MONTHS,
    NEWS: publicNews,
    PAD,
    PAGE_MAX,
    PC,
    PUBLIC_PLATFORMS,
    PUBLIC_METHODOLOGY,
    PLATS_FOR,
    PLAT_LABEL,
    Pie,
    PieChart,
    RecordIcon,
    ResponsiveContainer,
    SF,
    S_PLATS,
    SILVER,
    SITE_NAME,
    SecMark,
    TXT,
    Tog,
    Tooltip,
    TrendBars,
    VO,
    ViewToggle,
    XAxis,
    YAxis,
    allArtistNames,
    allTitles,
    anMonth,
    analyticsRowsFor,
    artistMonth,
    artistTrendFor,
    artists,
    card,
    certColors,
    certIcons,
    certs: dedupedLiveCerts.filter(c => c.chart_type === ct),
    chartTypeLabel,
    closeDetails,
    cmp1,
    cmp2,
    cmpA1,
    cmpA2,
    cmpS1,
    cmpS2,
    coverageData,
    crossPlatformRows,
    ct,
    currentPlatformKeys,
    currentRecords,
    currentRecordsPool,
    currentTrending,
    data,
    display,
    expandedArtistRows,
    expandedTrendingRows,
    expandedYearEndRows,
    featureAnalytics,
    formulaLabel,
    fullCoverageClub,
    getArtistCountry,
    getArtistImageUrl,
    getCertificationForEntry,
    getCombined,
    getChartHistory: plat === KENYAN_CHART ? getKenyanCombined : getCombined,
    hof,
    isDark,
    isMobile,
    isTablet,
    isArtists,
    isAlbums,
    isSingles,
    releaseCt,
    latestMonth,
    latestMonthName,
    latestMonthShort,
    liveChartLoading,
    liveChartMeta,
    liveStatus,
    loaded,
    month,
    monthIndex,
    mvData,
    navTo,
    openArtistDetails,
    openMomentumRelease,
    openRecord,
    openReleaseDetails,
    plat,
    platList,
    platOnes,
    platTotalsData,
    rankJourneyMonths,
    rankJourneyView,
    releaseJourney,
    releaseLabel,
    releaseLabelLower,
    secLbl,
    selA,
    selNews,
    selR,
    selectedArtistEntries,
    selectedArtistEntryGroups,
    selectedArtistRankData,
    selectedArtistReleases,
    setAnMonth,
    setArtistMonth,
    setCmpA1,
    setCmpA2,
    setCmpS1,
    setCmpS2,
    setCt,
    setMonth,
    setOpenRecord,
    setPlat,
    setRankJourneyView,
    setSelA,
    setSelNews,
    setSelR,
    setVc,
    songMonthlyData,
    songRankData,
    sp1,
    sp2,
    toggleArtistRow,
    toggleTrendingRow,
    toggleYearEndRow,
    top,
    top10sData,
    topArtistTrajectoryArtists,
    topArtistsLine,
    topCountryData,
    tp,
    tracked,
    trendLabelText,
    uniqueByMomentumIdentity,
    uniquePlatformData,
    vc,
    viewMode,
    yearEnd,
    yearEndDisplay,
    yearEndMode,
    setYearEndMode,
    yearEndPlat,
    setYearEndPlat,
    yearEndPlatOptions,
    yearEndPeriodLabel
  };

  const managedSections = [
    ...(PUBLIC_DATA.page_content?.[page] || []),
    ...(page === "charts" ? (PUBLIC_DATA.page_content?.home || []) : []),
  ];
  const liveIndicatorIsLive = liveStatus === "live";
  const liveIndicatorLabel = liveIndicatorIsLive
    ? "Live data connected"
    : liveStatus === "syncing"
      ? "Checking for live data"
      : "Live data not connected; showing loaded data";
  const liveIndicator = apiChecked ? (
    <span
      title={liveIndicatorLabel}
      aria-label={liveIndicatorLabel}
      role="status"
      style={{
        display:"inline-block",
        width:"8px",height:"8px",borderRadius:"50%",
        background:liveIndicatorIsLive?"#2DB04A":"#9AA19A",
        flexShrink:0,
      }}
    />
  ) : null;

  return(
    <div className="ngoma-app-shell" data-theme={theme} style={{fontFamily:SF,background:themeColors.page,color:themeColors.text,minHeight:"100vh",width:"100%",overflowX:"clip",isolation:"isolate"}}>
      {/* EXPERIMENT: living artist-portrait backdrop, mounted once so it shows
          through every page's transparent gaps rather than being hero-only. */}
      <ArtistAmbientField theme={theme} isMobile={isMobile} isTablet={isTablet} />
      <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;600;700;800;900&family=Instrument+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
      <style>{`
        html, body, #root{max-width:100%;overflow-x:hidden;}
        *, *::before, *::after{box-sizing:border-box;}
        img, svg, canvas, video{max-width:100%;}
        button, input, select, textarea{max-width:100%;}
        footer button:not([data-keep-share-card="true"]){display:none !important;}
        footer .share-card-button, footer [data-share-card]:not([data-keep-share-card="true"]), footer [aria-label*="Share"]{display:none !important;}
        button[data-stray-share-hidden="true"]{display:none !important;visibility:hidden !important;pointer-events:none !important;}
        .ngoma-mobile-text-safe{min-width:0;overflow-wrap:anywhere;}
        .ngoma-analytics-chart-scroll{max-width:100%;overflow-x:auto;overflow-y:hidden;padding-bottom:4px;}
        .ngoma-analytics-chart-inner{min-width:0;}
        .ngoma-analytics-metric-label{color:#59645D !important;}
        .ngoma-analytics-muted{color:#59645D !important;}
        .ngoma-analytics-page > *{content-visibility:auto;contain-intrinsic-size:auto 320px;}
        .ngoma-mobile-collapsible{margin:0 0 24px;}
        .ngoma-mobile-collapsible > summary{display:none;}
        @media (max-width: 860px){
          .anl-2col{grid-template-columns:1fr !important;}
        }
        @media (max-width: 640px){
          .anl-grid-2{grid-template-columns:1fr !important;}
          .anl-2col{grid-template-columns:1fr !important;}
          .anl-grid-3{grid-template-columns:1fr !important;}
          .anl-grid-4{grid-template-columns:1fr 1fr !important;}
          .podium-grid{grid-template-columns:1fr !important;}
          .race-card{min-width:100% !important;}
          .ngoma-artist-row{grid-template-columns:34px 34px minmax(0,1fr) 82px !important;gap:9px !important;padding:13px 8px !important;}
          .ngoma-artist-pts-label{display:none !important;}
          .ngoma-mobile-center-frame{padding-left:clamp(20px,5vw,28px) !important;padding-right:clamp(20px,5vw,28px) !important;}
          .ngoma-analytics-chart-scroll{margin-left:-2px;margin-right:-2px;padding-bottom:8px;}
          .ngoma-analytics-chart-inner{min-width:520px;}
          .ngoma-analytics-wide-chart{min-width:620px;}
          .ngoma-mobile-collapsible{background:#fff;border:1px solid #ECEAE3;border-radius:16px;box-shadow:0 2px 10px rgba(0,0,0,0.05);overflow:hidden;margin-bottom:12px !important;}
          .ngoma-mobile-collapsible > summary{display:flex;align-items:center;justify-content:space-between;gap:10px;list-style:none;padding:17px 18px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13.5px;font-weight:800;letter-spacing:-0.1px;color:#1A1A1A;cursor:pointer;user-select:none;-webkit-user-select:none;}
          .ngoma-mobile-collapsible > summary::-webkit-details-marker{display:none;}
          .ngoma-mobile-collapsible > summary .anl-chev{font-size:20px;font-weight:300;color:#B8860B;transition:transform 0.22s ease;flex-shrink:0;line-height:1;display:inline-block;}
          .ngoma-mobile-collapsible[open] > summary{border-bottom:1px solid #F0EDE6;background:#FAFAF8;}
          .ngoma-mobile-collapsible[open] > summary .anl-chev{transform:rotate(90deg);}
          .ngoma-mobile-collapsible-body{padding:0 0 4px;}
          .ngoma-mobile-collapsible-body > div{border:none !important;box-shadow:none !important;margin-bottom:0 !important;border-radius:0 !important;}
        }
        html[data-ngoma-theme="dark"] .ngoma-mobile-collapsible{background:#0f1110 !important;border-color:#2b302b !important;}
        html[data-ngoma-theme="dark"] .ngoma-mobile-collapsible > summary{color:#f6f3ea !important;}
        html[data-ngoma-theme="dark"] .ngoma-mobile-collapsible[open] > summary{background:#131716 !important;border-bottom-color:#2b302b !important;}
        ::-webkit-scrollbar{height:5px;width:5px;}
        ::-webkit-scrollbar-thumb{background:#D8D2C4;border-radius:3px;}
        * { -webkit-tap-highlight-color: transparent; }
        .ngoma-title-link:hover{ color:#B8860B !important; text-decoration: underline; text-underline-offset: 2px; }
        .ngoma-artist-link:hover{ color:#B8860B !important; text-decoration: underline; text-underline-offset: 2px; }
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:none;}}
      `}</style>

      {MAINTENANCE_SETTING.enabled&&<div role="status" style={{padding:"11px 18px",background:MAINTENANCE_SETTING.background || "#FFF3CD",color:MAINTENANCE_SETTING.color || "#5F4700",fontFamily:F,fontSize:"12px",fontWeight:800,textAlign:"center",borderBottom:`1px solid ${GOLD}55`}}>{MAINTENANCE_SETTING.message || `${SITE_NAME} is currently undergoing maintenance.`}</div>}

      {/* HEADER */}
      <header ref={publicHeaderRef} style={{background:themeColors.surface,borderBottom:`3px solid ${themeColors.text}`,position:"fixed",top:0,left:0,right:0,width:"100%",zIndex:90,boxShadow:isDark?"0 8px 24px rgba(0,0,0,0.34)":"0 8px 24px rgba(31,36,31,0.10)"}}>
        <div style={{background:"#1A1A1A",color:"#FFF"}}>
          <div style={{...pageFrame({display:"flex",justifyContent:"flex-end",alignItems:"center",gap:"18px",padding:isMobile?"6px 16px":"5px 28px"}),fontFamily:F,fontSize:isMobile?"8px":"9.5px",letterSpacing:isMobile?"1px":"2px",textTransform:"uppercase"}}>
            <span style={{color:"rgba(255,255,255,0.68)",fontSize:isMobile?"8px":"9.5px",letterSpacing:isMobile?"0.5px":"1px",fontFamily:"inherit",whiteSpace:"nowrap"}}>
              {new Date().toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short",year:"numeric"})}
            </span>
            {liveIndicator}
          </div>
        </div>
          <div style={{...pageFrame({display:"flex",justifyContent:"space-between",alignItems:"center",padding:isMobile?"14px 16px":"18px 28px 22px"}),columnGap:isMobile?"16px":"60px",rowGap:"16px",flexWrap:"wrap"}}>
          <div onClick={()=>navTo("charts")} style={{display:"flex",alignItems:"center",gap:"14px",cursor:"pointer"}}>
            <svg width={isMobile?"24":"32"} height={isMobile?"26":"34"} viewBox="0 0 22 24" style={{flexShrink:0}}>
              <rect x="0" y="15" width="3.5" height="9" fill={themeColors.text} rx="0.5"/>
              <rect x="5.5" y="10" width="3.5" height="14" fill={themeColors.text} rx="0.5"/>
              <rect x="11" y="5" width="3.5" height="19" fill={GOLD} rx="0.5"/>
              <rect x="16.5" y="0" width="3.5" height="24" fill={themeColors.text} rx="0.5"/>
            </svg>
            <div style={{display:"flex",flexDirection:"column",lineHeight:1,cursor:"pointer"}}>
              <span
                style={{
                  fontFamily:F,
                  fontSize:isMobile?"20px":"28px",
                  fontWeight:950,
                  letterSpacing:isMobile?"2px":"4px",
                  color:themeColors.text,
                  textTransform:"uppercase",
                }}
              >
                <span style={{color:GOLD,fontWeight:950}}>{SITE_NAME}</span>
              </span>
              <span
                style={{
                  marginTop:"4px",
                  fontFamily:F,
                  fontSize:isMobile?"9.5px":"13px",
                  fontWeight:900,
                  letterSpacing:isMobile?"1.4px":"2.2px",
                  color:themeColors.muted,
                  textTransform:"uppercase",
                  whiteSpace:"nowrap",
                }}
              >
                Music ranking intelligence
              </span>
            </div>
          </div>
          {isMobile ? (
            <>
              <button
                onClick={()=>setMNav(o=>!o)}
                aria-label="Toggle menu"
                aria-expanded={mNav}
                style={{display:"flex",flexDirection:"column",justifyContent:"center",gap:"4px",width:"42px",height:"38px",border:`1px solid ${themeColors.border}`,borderRadius:"11px",background:themeColors.elevated,cursor:"pointer",padding:"0 10px",flexShrink:0,marginLeft:"auto"}}
              >
                <span style={{display:"block",height:"2px",background:themeColors.text,borderRadius:"2px",transition:"all .2s",transform:mNav?"translateY(6px) rotate(45deg)":"none"}}/>
                <span style={{display:"block",height:"2px",background:themeColors.text,borderRadius:"2px",opacity:mNav?0:1,transition:"opacity .2s"}}/>
                <span style={{display:"block",height:"2px",background:themeColors.text,borderRadius:"2px",transition:"all .2s",transform:mNav?"translateY(-6px) rotate(-45deg)":"none"}}/>
              </button>
              {mNav&&(
                <div style={{width:"100%",display:"flex",flexDirection:"column",gap:"2px",marginTop:"8px",borderTop:`1px solid ${themeColors.border}`,paddingTop:"10px"}}>
                  <span onClick={()=>{setMNav(false);setSOpen(true);}} style={{display:"flex",alignItems:"center",gap:"9px",cursor:"pointer",padding:"13px 14px",borderRadius:"12px",fontFamily:F,fontSize:"13px",fontWeight:600,letterSpacing:"1px",textTransform:"uppercase",color:themeColors.muted}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    Search
                  </span>
                  {navItems.map(t=>(
                    <span key={t} onClick={()=>navTo(t)} style={{cursor:"pointer",padding:"13px 14px",borderRadius:"12px",fontFamily:F,fontSize:"13px",fontWeight:page===t?800:600,letterSpacing:"1px",textTransform:"uppercase",color:page===t?themeColors.text:themeColors.muted,background:page===t?themeColors.active:"transparent",border:page===t?"1px solid #D4B65E":"1px solid transparent"}}>{navLabel(t)}</span>
                  ))}
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"10px",marginTop:"8px",padding:"6px 14px"}}>
                    <span style={{fontFamily:F,fontSize:"13px",fontWeight:600,letterSpacing:"1px",textTransform:"uppercase",color:themeColors.muted}}>Dark Mode</span>
                    {themeToggle()}
                  </div>
                </div>
              )}
            </>
          ) : (
            <nav style={{display:"flex",gap:"14px",fontFamily:F,fontSize:"11px",fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",alignItems:"center",flexShrink:0,position:"relative"}}>
              {primaryNavItems.map(t=>(
                <span key={t} onClick={()=>navTo(t)} style={{color:page===t?themeColors.text:themeColors.muted,cursor:"pointer",whiteSpace:"nowrap",padding:"6px 12px",borderRadius:"20px",background:page===t?themeColors.active:"transparent",fontWeight:page===t?800:700,transition:"all 0.15s",border:page===t?"1px solid #D4B65E":"1px solid transparent"}}
                  onMouseEnter={e=>{if(page!==t)e.currentTarget.style.color=themeColors.text;}}
                  onMouseLeave={e=>{if(page!==t)e.currentTarget.style.color=themeColors.muted;}}
                >{navLabel(t)}</span>
              ))}
              <div style={{position:"relative"}}>
                <button
                  type="button"
                  onClick={()=>setMoreOpen((open)=>!open)}
                  aria-haspopup="menu"
                  aria-expanded={moreOpen}
                  style={{
                    cursor:"pointer",
                    color:moreNavItems.includes(page)?themeColors.text:themeColors.muted,
                    whiteSpace:"nowrap",
                    padding:"6px 12px",
                    borderRadius:"20px",
                    background:moreNavItems.includes(page)?themeColors.active:"transparent",
                    fontFamily:F,
                    fontSize:"11px",
                    fontWeight:moreNavItems.includes(page)?800:700,
                    letterSpacing:"1.5px",
                    textTransform:"uppercase",
                    border:moreNavItems.includes(page)?"1px solid #D4B65E":"1px solid transparent",
                    display:"inline-flex",
                    alignItems:"center",
                    gap:"6px",
                  }}
                  onMouseEnter={e=>{e.currentTarget.style.color=themeColors.text;e.currentTarget.style.background=moreNavItems.includes(page)?themeColors.active:themeColors.hover;}}
                  onMouseLeave={e=>{e.currentTarget.style.color=moreNavItems.includes(page)?themeColors.text:themeColors.muted;e.currentTarget.style.background=moreNavItems.includes(page)?themeColors.active:"transparent";}}
                >More <span style={{fontSize:"10px",lineHeight:1}}>{moreOpen?"▴":"▾"}</span></button>
                {moreOpen&&(
                  <div role="menu" style={{position:"absolute",right:0,top:"calc(100% + 10px)",minWidth:"176px",padding:"8px",borderRadius:"14px",background:themeColors.elevated,border:`1px solid ${themeColors.border}`,boxShadow:isDark?"0 18px 35px rgba(0,0,0,0.36)":"0 18px 35px rgba(31,36,31,0.14)",zIndex:80}}>
                    {moreNavItems.map(t=>(
                      <button key={t} type="button" role="menuitem" onClick={()=>navTo(t)} style={{display:"flex",width:"100%",alignItems:"center",justifyContent:"space-between",border:0,borderRadius:"10px",background:page===t?themeColors.active:"transparent",color:page===t?themeColors.text:themeColors.muted,padding:"10px 11px",fontFamily:F,fontSize:"11px",fontWeight:page===t?850:750,letterSpacing:"1.1px",textTransform:"uppercase",cursor:"pointer",textAlign:"left"}}
                        onMouseEnter={e=>{e.currentTarget.style.color=themeColors.text;e.currentTarget.style.background=page===t?themeColors.active:themeColors.hover;}}
                        onMouseLeave={e=>{e.currentTarget.style.color=page===t?themeColors.text:themeColors.muted;e.currentTarget.style.background=page===t?themeColors.active:"transparent";}}
                      >{navLabel(t)}<span aria-hidden="true" style={{color:GOLD}}>›</span></button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={()=>setSOpen(true)}
                aria-label="Search"
                title="Search"
                style={{
                  display:"inline-flex",alignItems:"center",justifyContent:"center",
                  width:"30px",height:"30px",borderRadius:"999px",
                  background:themeColors.elevated,
                  border:`1px solid ${themeColors.border}`,
                  boxShadow:isDark?"0 0 0 1px rgba(255,255,255,0.02)":"0 4px 14px rgba(0,0,0,0.035)",
                  cursor:"pointer",flexShrink:0,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={themeColors.text} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </button>
              {themeToggle()}
            </nav>
          )}
        </div>
      </header>
      <div aria-hidden="true" style={{height:`${publicHeaderHeight}px`,flexShrink:0}} />

      {/* SEARCH */}
      {sOpen&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.52)",zIndex:100,display:"flex",justifyContent:"center",paddingTop:isMobile?"12px":"70px"}} onClick={closeSearch}>
          <div onClick={e=>e.stopPropagation()} style={{background:isDark?"#1a1e1a":"#FFF",borderRadius:"16px",width:isMobile?"calc(100vw - 20px)":"600px",maxWidth:"100%",maxHeight:"80vh",overflow:"hidden",boxShadow:"0 24px 64px rgba(0,0,0,0.28)",boxSizing:"border-box",display:"flex",flexDirection:"column"}}>
            {/* Input row */}
            <div style={{padding:"14px 18px",borderBottom:`1px solid ${isDark?"#2b302b":"#EBEBEB"}`,display:"flex",alignItems:"center",gap:"10px",flexShrink:0}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isDark?"#888":"#AAA"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                value={srch}
                onChange={e=>{setSrch(e.target.value);setSActiveIdx(-1);}}
                onKeyDown={e=>{
                  if(e.key==="ArrowDown"){e.preventDefault();setSActiveIdx(i=>Math.min(i+1,sFlatResults.length-1));}
                  else if(e.key==="ArrowUp"){e.preventDefault();setSActiveIdx(i=>Math.max(i-1,0));}
                  else if(e.key==="Enter"&&sActiveIdx>=0){e.preventDefault();selectSearchResult(sFlatResults[sActiveIdx]);}
                }}
                placeholder="Search songs, albums, artists, news…"
                autoFocus
                style={{flex:1,border:"none",outline:"none",fontSize:"16px",fontFamily:SF,background:"transparent",color:isDark?"#F6F3EA":"#1A1A1A"}}
              />
              {srch&&<button type="button" onClick={()=>{setSrch("");setSActiveIdx(-1);}} style={{border:"none",background:"none",cursor:"pointer",color:isDark?"#666":"#CCC",fontSize:"18px",lineHeight:1,padding:"0 2px"}}>×</button>}
              <button type="button" onClick={closeSearch} style={{border:`1px solid ${isDark?"#333":"#E0E0E0"}`,borderRadius:"7px",background:"none",cursor:"pointer",color:isDark?"#888":"#999",fontFamily:F,fontSize:"10px",fontWeight:700,letterSpacing:"1px",padding:"4px 8px",whiteSpace:"nowrap"}}>ESC</button>
            </div>
            {/* Results */}
            <div style={{overflowY:"auto",flex:1}}>
              {/* Empty / hint states */}
              {!sResults&&<div style={{padding:"28px 20px",textAlign:"center",color:isDark?"#555":"#CCC",fontFamily:F,fontSize:"13px"}}>Search songs, albums, artists and news</div>}
              {sResults&&sFlatResults.length===0&&<div style={{padding:"28px 20px",textAlign:"center",color:isDark?"#666":"#BBB",fontFamily:F,fontSize:"13px"}}>No results for "{srch}"</div>}
              {/* Songs */}
              {sResults&&sResults.songs.length>0&&(
                <>
                  <div style={{padding:"8px 18px 4px",fontSize:"9px",fontWeight:800,letterSpacing:"1.2px",textTransform:"uppercase",color:isDark?"#5a7abf":"#2d7dd2",background:isDark?"#0e1115":"#F8F9FC",borderBottom:`1px solid ${isDark?"#1c2320":"#F0F0F0"}`}}>Songs</div>
                  {sResults.songs.map((e,i)=>{
                    const flatIdx=i;
                    const cert=dedupedLiveCerts?dedupedLiveCerts.find(c=>String(c.t||"").toLowerCase()===String(e.title||"").toLowerCase()&&String(c.a||"").toLowerCase()===String(e.artist||"").toLowerCase()):null;
                    const certMeta=cert?certificationMetaForLevel(cert.level):null;
                    return(
                      <button key={`s-${i}`} type="button"
                        onMouseEnter={()=>setSActiveIdx(flatIdx)}
                        onClick={()=>selectSearchResult(e)}
                        style={{display:"flex",alignItems:"center",gap:"12px",width:"100%",textAlign:"left",padding:"10px 18px",border:"none",borderBottom:`1px solid ${isDark?"#1c2320":"#F8F8F5"}`,cursor:"pointer",background:flatIdx===sActiveIdx?(isDark?"#1a2518":"#F0F7FF"):(isDark?"transparent":"transparent")}}>
                        <EntryThumb item={e} name={e.artist} size={34} radius="8px" accent={GOLD} />
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:"13px",fontWeight:700,color:isDark?"#F6F3EA":"#1A1A1A",display:"flex",alignItems:"center",gap:"5px",overflow:"hidden"}}>
                            <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.title}</span>
                            {certMeta&&<span title={`${certMeta.label} certified`} style={{fontSize:"12px",flexShrink:0}}><span style={certMeta.iconFilter?{filter:certMeta.iconFilter}:{}}>{certMeta.icon}</span></span>}
                          </div>
                          <div style={{fontSize:"11px",color:isDark?"#7a8a7a":"#888",marginTop:"1px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.artist}</div>
                        </div>
                        <div style={{textAlign:"right",flexShrink:0,fontFamily:F}}>
                          <div style={{fontSize:"11px",fontWeight:700,color:GOLD}}>#{e._bestRank}</div>
                          <div style={{fontSize:"10px",color:isDark?"#666":"#BBB"}}>{e._months} mo</div>
                        </div>
                      </button>
                    );
                  })}
                </>
              )}
              {/* Albums */}
              {sResults&&sResults.albums.length>0&&(
                <>
                  <div style={{padding:"8px 18px 4px",fontSize:"9px",fontWeight:800,letterSpacing:"1.2px",textTransform:"uppercase",color:isDark?"#3a9a6a":"#1a8a5a",background:isDark?"#0e1115":"#F8F9FC",borderBottom:`1px solid ${isDark?"#1c2320":"#F0F0F0"}`}}>Albums</div>
                  {sResults.albums.map((e,i)=>{
                    const flatIdx=sResults.songs.length+i;
                    return(
                      <button key={`a-${i}`} type="button"
                        onMouseEnter={()=>setSActiveIdx(flatIdx)}
                        onClick={()=>selectSearchResult(e)}
                        style={{display:"flex",alignItems:"center",gap:"12px",width:"100%",textAlign:"left",padding:"10px 18px",border:"none",borderBottom:`1px solid ${isDark?"#1c2320":"#F8F8F5"}`,cursor:"pointer",background:flatIdx===sActiveIdx?(isDark?"#1a2518":"#F0F7FF"):"transparent"}}>
                        <EntryThumb item={e} name={e.artist} size={34} radius="8px" accent="#1a8a5a" />
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:"13px",fontWeight:700,color:isDark?"#F6F3EA":"#1A1A1A",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.title}</div>
                          <div style={{fontSize:"11px",color:isDark?"#7a8a7a":"#888",marginTop:"1px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.artist}</div>
                        </div>
                        <div style={{textAlign:"right",flexShrink:0,fontFamily:F}}>
                          <div style={{fontSize:"11px",fontWeight:700,color:GOLD}}>#{e._bestRank}</div>
                          <div style={{fontSize:"10px",color:isDark?"#666":"#BBB"}}>{e._months} mo</div>
                        </div>
                      </button>
                    );
                  })}
                </>
              )}
              {/* Artists */}
              {sResults&&sResults.artists.length>0&&(
                <>
                  <div style={{padding:"8px 18px 4px",fontSize:"9px",fontWeight:800,letterSpacing:"1.2px",textTransform:"uppercase",color:"#7c5cbf",background:isDark?"#0e1115":"#F8F9FC",borderBottom:`1px solid ${isDark?"#1c2320":"#F0F0F0"}`}}>Artists</div>
                  {sResults.artists.map((a,i)=>{
                    const flatIdx=sResults.songs.length+sResults.albums.length+i;
                    const accent=COUNTRY_ACCENTS[a.country_code]||"#69716B";
                    return(
                      <button key={`ar-${i}`} type="button"
                        onMouseEnter={()=>setSActiveIdx(flatIdx)}
                        onClick={()=>selectSearchResult({...a,_kind:"artist"})}
                        style={{display:"flex",alignItems:"center",gap:"12px",width:"100%",textAlign:"left",padding:"10px 18px",border:"none",borderBottom:`1px solid ${isDark?"#1c2320":"#F8F8F5"}`,cursor:"pointer",background:flatIdx===sActiveIdx?(isDark?"#1a2518":"#F0F7FF"):"transparent"}}>
                        {a.image?<img src={a.image} alt={a.name} style={{width:34,height:34,borderRadius:"50%",objectFit:"cover",flexShrink:0,border:`1px solid ${isDark?"#333":"#EEE"}`}}/>:<div style={{width:34,height:34,borderRadius:"50%",background:isDark?"#222":"#F0EDE7",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px",fontWeight:800,color:isDark?"#666":"#CCC"}}>{String(a.name||"").charAt(0)}</div>}
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:"13px",fontWeight:700,color:isDark?"#F6F3EA":"#1A1A1A",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.display_name||a.name}</div>
                          <div style={{fontSize:"11px",color:isDark?"#7a8a7a":"#888",marginTop:"1px"}}>{a.genre||""}{a.genre&&a.country?" · ":""}{a.country||""}</div>
                        </div>
                        {a.country_code&&<span style={{fontSize:"9px",fontWeight:800,letterSpacing:"0.8px",color:accent,border:`1px solid ${accent}55`,borderRadius:"6px",padding:"2px 6px",flexShrink:0,background:`${accent}12`}}>{a.country_code}</span>}
                      </button>
                    );
                  })}
                </>
              )}
              {/* News */}
              {sResults&&sResults.news.length>0&&(
                <>
                  <div style={{padding:"8px 18px 4px",fontSize:"9px",fontWeight:800,letterSpacing:"1.2px",textTransform:"uppercase",color:"#c05c00",background:isDark?"#0e1115":"#F8F9FC",borderBottom:`1px solid ${isDark?"#1c2320":"#F0F0F0"}`}}>News</div>
                  {sResults.news.map((n,i)=>{
                    const flatIdx=sResults.songs.length+sResults.albums.length+sResults.artists.length+i;
                    return(
                      <button key={`n-${i}`} type="button"
                        onMouseEnter={()=>setSActiveIdx(flatIdx)}
                        onClick={()=>selectSearchResult({...n,_kind:"news"})}
                        style={{display:"flex",alignItems:"center",gap:"12px",width:"100%",textAlign:"left",padding:"10px 18px",border:"none",borderBottom:`1px solid ${isDark?"#1c2320":"#F8F8F5"}`,cursor:"pointer",background:flatIdx===sActiveIdx?(isDark?"#1a2518":"#F0F7FF"):"transparent"}}>
                        <EntryThumb item={n} name={n.title} size={34} radius="8px" accent="#c05c00" />
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:"13px",fontWeight:700,color:isDark?"#F6F3EA":"#1A1A1A",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.title}</div>
                          <div style={{fontSize:"11px",color:isDark?"#7a8a7a":"#888",marginTop:"1px"}}><span style={{color:"#c05c00",fontWeight:700}}>{n.cat}</span>{n.date?" · "+n.date:""}</div>
                        </div>
                      </button>
                    );
                  })}
                </>
              )}
              {/* Certifications */}
              {sResults&&sResults.certs.length>0&&(
                <>
                  <div style={{padding:"8px 18px 4px",fontSize:"9px",fontWeight:800,letterSpacing:"1.2px",textTransform:"uppercase",color:"#b7980f",background:isDark?"#0e1115":"#F8F9FC",borderBottom:`1px solid ${isDark?"#1c2320":"#F0F0F0"}`}}>Certifications</div>
                  {sResults.certs.map((c,i)=>{
                    const flatIdx=sResults.songs.length+sResults.albums.length+sResults.artists.length+sResults.news.length+i;
                    const certMeta=certificationMetaForLevel(c.level);
                    return(
                      <button key={`c-${i}`} type="button"
                        onMouseEnter={()=>setSActiveIdx(flatIdx)}
                        onClick={()=>selectSearchResult({...c,_kind:"cert"})}
                        style={{display:"flex",alignItems:"center",gap:"12px",width:"100%",textAlign:"left",padding:"10px 18px",border:"none",borderBottom:`1px solid ${isDark?"#1c2320":"#F8F8F5"}`,cursor:"pointer",background:flatIdx===sActiveIdx?(isDark?"#1a2518":"#F0F7FF"):"transparent"}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:"13px",fontWeight:700,color:isDark?"#F6F3EA":"#1A1A1A",display:"flex",alignItems:"center",gap:"6px",overflow:"hidden"}}>
                            {certMeta&&<span style={certMeta.iconFilter?{filter:certMeta.iconFilter,fontSize:"12px"}:{fontSize:"12px"}}>{certMeta.icon}</span>}
                            <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.t}</span>
                          </div>
                          <div style={{fontSize:"11px",color:isDark?"#7a8a7a":"#888",marginTop:"1px"}}>{c.a}{certMeta?" · "+certMeta.label+" Certified":""}</div>
                        </div>
                        <div style={{fontSize:"11px",fontWeight:700,color:GOLD,flexShrink:0,fontFamily:F}}>{Number(c.totalPts||0).toLocaleString()} pts</div>
                      </button>
                    );
                  })}
                </>
              )}
              {/* Footer keyboard hint */}
              {sResults&&sFlatResults.length>0&&(
                <div style={{padding:"8px 18px",fontSize:"10px",color:isDark?"#444":"#CCC",fontFamily:F,borderTop:`1px solid ${isDark?"#1c2320":"#F0F0F0"}`,textAlign:"right"}}>
                  ↑↓ navigate &nbsp;·&nbsp; Enter select &nbsp;·&nbsp; Esc close
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <main style={pageFrame({padding:isMobile?"0 4px":0,overflow:"hidden"})}>
      {managedSections.map((section)=><section key={section.id || section.section} style={{margin:isMobile?"14px 18px":"18px 28px",padding:isMobile?"16px":"20px",border:`1px solid ${GOLD}33`,borderRadius:"14px",background:themeColors.elevated}}>
        {section.title&&<h2 style={{margin:"0 0 8px",fontFamily:SF,fontSize:isMobile?"19px":"23px",color:themeColors.text}}>{section.title}</h2>}
        {section.content&&<div style={{fontFamily:F,fontSize:"13px",lineHeight:1.75,color:themeColors.muted,whiteSpace:"pre-wrap"}}>{section.content}</div>}
        {section.data?.image&&<img src={section.data.image} alt={section.data.alt || section.title || ""} style={{display:"block",marginTop:"12px",maxHeight:"360px",borderRadius:"10px",objectFit:"cover"}} />}
        {section.data?.cta_url&&<a href={section.data.cta_url} style={{display:"inline-flex",marginTop:"12px",padding:"9px 14px",borderRadius:"999px",background:GOLD,color:"#FFF",fontFamily:F,fontSize:"11px",fontWeight:850,textDecoration:"none"}}>{section.data.cta_label || "Learn more"}</a>}
      </section>)}
      {/* RELEASE DETAIL */}
      {selR && <ReleaseDetailPage ctx={pageContext} />}

      {/* ARTIST PROFILE */}
      {selA && !selR && <ArtistDetailPage ctx={pageContext} />}

      {/* CHARTS PAGE */}
      {page === "charts" && !selA && !selR && (
        <PremiumChartsPage
          isMobile={isMobile}
          isTablet={isTablet}
          loaded={loaded}
          F={F}
          SF={SF}
          GOLD={GOLD}
          MEDALS={MEDALS}
          MONTHS={MONTHS}
          VO={VO}
          PC={PC}
          PLAT_LABEL={PLAT_LABEL}
          ct={ct}
          setCt={setCt}
          month={month}
          setMonth={setMonth}
          plat={plat}
          setPlat={setPlat}
          platList={platList}
          vc={vc}
          setVc={setVc}
          data={data}
          display={display}
          top={top}
          tp={tp}
          isSingles={isSingles}
          artists={artists}
          setSelA={setSelA}
          setSelR={setSelR}
          onOpenArtist={openArtistDetails}
          onOpenRelease={openReleaseDetails}
          getCombined={plat === KENYAN_CHART ? getKenyanCombined : getCombined}
          liveChartLoading={liveChartLoading}
          liveChartMeta={liveChartMeta}
          liveStatus={liveStatus}
          pageMax={PAGE_MAX}
          certificationForEntry={getCertificationForEntry}
          CertificationTag={CertificationTag}
        />
      )}

      {/* ANALYTICS PAGE (includes Records & Milestones section) */}
      {page === "analytics" && !selA && !selR && <AnalyticsPage ctx={pageContext} />}

      {/* YEAR-END PAGE */}
      {page === "year-end" && !selA && !selR && <YearEndPage ctx={pageContext} />}

      {/* CERTIFICATIONS PAGE */}
      {page === "certifications" && !selA && !selR && <CertificationsPage ctx={pageContext} />}

      {/* NEWS PAGE */}
      {page === "news" && !selNews && !selA && !selR && <NewsPage ctx={pageContext} />}
      {page === "news" && selNews && !selA && !selR && <NewsDetailPage ctx={pageContext} />}

      {/* ABOUT PAGE */}
      {page === "about" && !selA && !selR && <AboutPage ctx={pageContext} />}

      </main>

      {/* FOOTER */}
      <footer style={{padding:isMobile?"32px 18px 36px":"22px 28px",borderTop:"3px solid #1A1A1A",background:"#1A1A1A",fontFamily:F,boxSizing:"border-box",overflow:"hidden"}}>
        <div style={{...pageFrame(),display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:isMobile?"18px":"14px",flexDirection:isMobile?"column":"row",textAlign:isMobile?"center":"left"}}>
          <div onClick={()=>navTo("charts")} style={{display:"flex",alignItems:"center",gap:"9px",cursor:"pointer"}}>
            <svg width="16" height="18" viewBox="0 0 22 24" style={{flexShrink:0}}>
              <rect x="0" y="15" width="3.5" height="9" fill="#FFF" rx="0.5"/>
              <rect x="5.5" y="10" width="3.5" height="14" fill="#FFF" rx="0.5"/>
              <rect x="11" y="5" width="3.5" height="19" fill={GOLD} rx="0.5"/>
              <rect x="16.5" y="0" width="3.5" height="24" fill="#FFF" rx="0.5"/>
            </svg>
            <span style={{fontFamily:F,fontSize:isMobile?"12px":"11px",fontWeight:800,letterSpacing:"2.5px",color:GOLD,textTransform:"uppercase"}}>{SITE_NAME}</span>
          </div>
          <div style={{display:"flex",gap:isMobile?"10px":"14px",alignItems:"center",justifyContent:"center"}}>
            {[
              {label:"Facebook", href:SOCIAL_LINKS.facebook || "https://www.facebook.com/ngomacharts", bg:"#1877F2", color:"#FFF",
               path:"M14 8.5h2V5.8h-2.4C11.5 5.8 10.5 7 10.5 9v1.5H8.7V13h1.8v6h2.6v-6h2l.3-2.5h-2.3V9.1c0-.4.2-.6.7-.6Z"},
              {label:"X", href:SOCIAL_LINKS.x || "https://x.com/Ngoma_Charts", bg:"#000", color:"#FFF", border:"1px solid rgba(255,255,255,0.18)",
               path:"M16.8 5h2.2l-4.8 5.5L20 19h-4.4l-3.5-4.6L8 19H5.8l5.1-5.9L5 5h4.5l3.1 4.2L16.8 5Zm-.8 12.6h1.2L9.1 6.3H7.8L16 17.6Z"},
              {label:"Instagram", href:SOCIAL_LINKS.instagram || "https://www.instagram.com/ngoma_charts/", bg:"linear-gradient(135deg,#F58529 0%,#DD2A7B 45%,#8134AF 72%,#515BD4 100%)", color:"#FFF",
               path:"M12 7.3A4.7 4.7 0 1012 16.7 4.7 4.7 0 0012 7.3Zm0 7.7a3 3 0 110-6 3 3 0 010 6Zm4.9-7.9a1.1 1.1 0 11-2.2 0 1.1 1.1 0 012.2 0ZM16.5 5h-9A2.5 2.5 0 005 7.5v9A2.5 2.5 0 007.5 19h9a2.5 2.5 0 002.5-2.5v-9A2.5 2.5 0 0016.5 5Z"},
            ].map(s=>(
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                 style={{display:"flex",alignItems:"center",justifyContent:"center",width:isMobile?"44px":"38px",height:isMobile?"44px":"38px",borderRadius:"50%",color:s.color,transition:"transform .2s, box-shadow .2s, background .2s",background:s.bg,border:s.border||"1px solid transparent",boxShadow:"0 8px 18px rgba(0,0,0,0.16)"}}
                 onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px) scale(1.04)";e.currentTarget.style.boxShadow="0 12px 26px rgba(0,0,0,0.24)";}}
                 onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 8px 18px rgba(0,0,0,0.16)";}}>
                {s.label==="Instagram"?(
                  <svg width={isMobile?"22":"20"} height={isMobile?"22":"20"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="5" width="14" height="14" rx="4.2" />
                    <circle cx="12" cy="12" r="3.2" />
                    <circle cx="16.4" cy="7.6" r="1" fill="currentColor" stroke="none" />
                  </svg>
                ):(
                  <svg width={isMobile?"22":"20"} height={isMobile?"22":"20"} viewBox="0 0 24 24" fill="currentColor"><path d={s.path}/></svg>
                )}
              </a>
            ))}
          </div>
        </div>
        <div
          style={{
            ...pageFrame(),
            marginTop: "8px",
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            gap: isMobile ? "4px" : "10px",
            alignItems: "center",
            justifyContent: isMobile ? "center" : "flex-start",
            textAlign: isMobile ? "center" : "left",
            fontSize: "8px",
            color: "rgba(255,255,255,0.38)",
            letterSpacing: "1px",
            textTransform: "uppercase",
          }}
        >
          <span>{FOOTER_SETTING.text || `© ${new Date().getFullYear()} ${SITE_NAME}`}</span>
        </div>
      </footer>
    </div>
  );
}
