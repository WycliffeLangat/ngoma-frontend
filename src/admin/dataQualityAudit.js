import { getResults } from "./api.js";
import {
  foldText,
  foldTokenOrder,
  mergeRuleKeysForRow,
} from "./mergeRules.js";
import { fetchAppDataWithFallback } from "../api/public.js";
import { normalizePublicPayload } from "../utils/publicDataRuntime.js";

const PAGE_SIZE = 500;
const MAX_ALERT_DETAILS = 14;
const PUBLIC_PAYLOAD_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const FINAL_STATUSES = new Set(["approved", "published", "complete", "completed", "processed", "archived"]);
const OPEN_REPORT_STATUSES = new Set(["open", "new", "todo", "pending", "in_progress", "needs_attention"]);
const RELEASE_TYPES = ["singles", "albums"];
const CERT_LEVELS = ["gold", "platinum", "diamond"];
const ATTENTION_CARD_KEYS = [
  "missing_artist_countries",
  "duplicate_artists_detected",
  "errors_warnings",
  "data_audit_findings",
  "critical_data_issues",
  "incomplete_metadata",
  "missing_media_assets",
  "invalid_urls_detected",
  "questionable_countries",
  "chart_uploads_needed",
];
const BACKEND_ALERTS_SUPERSEDED_BY_AUDIT = new Map([
  ["possible-duplicate-artists", ["Artists"]],
  ["artist-profile-completeness", ["Artists"]],
  ["release-metadata-completeness", ["Songs", "Albums"]],
  ["country-settings-incomplete", ["Countries"]],
]);
const INTENTIONAL_COUNTRY_PLACEHOLDERS = new Set(["unknown"]);
const TECHNICAL_ALERT_PATTERN = /\b(isrc|upc|url|urls|link|links|source links?|source_links|gallery urls?|catalogue codes?|catalog codes?|spotify|apple music|youtube|boomplay|audiomack|tiktok|shazam|instagram|facebook|website)\b/i;
// Modules with no "made the Top 50 chart" concept — Alerts & Needs Attention
// only surfaces issues tied to charted releases/artists/certifications, so
// these are dropped entirely rather than scoped.
const NON_CHART_ALERT_MODULES = new Set(["news", "page_content", "media", "platforms", "certification_rules", "backups", "users"]);

const RESOURCE_REQUESTS = [
  { key: "artists", label: "Artists", path: "/artists/" },
  { key: "songs", label: "Songs", path: "/releases/", params: { chart_type: "singles" } },
  { key: "albums", label: "Albums", path: "/releases/", params: { chart_type: "albums" } },
  { key: "countries", label: "Countries", path: "/countries/" },
  { key: "platforms", label: "Platforms", path: "/platforms/" },
  { key: "charts", label: "Chart periods", path: "/charts/" },
  { key: "chartUploads", label: "Chart uploads", path: "/chart-uploads/" },
  { key: "weeklyUploads", label: "Weekly uploads", path: "/weekly-uploads/" },
  { key: "certifications", label: "Certifications", path: "/certifications/" },
  { key: "certificationRules", label: "Certification rules", path: "/certification-rules/" },
  { key: "news", label: "News", path: "/news/" },
  { key: "pageContent", label: "Page content", path: "/page-content/" },
  { key: "media", label: "Media", path: "/media/" },
  { key: "reports", label: "Reports", path: "/reports/" },
  { key: "backups", label: "Backups", path: "/backups/", pageSize: 100 },
];

const SOCIAL_URL_FIELDS = [
  ["spotify_url", "Spotify", /(^|\.)spotify\.com$/i],
  ["apple_music_url", "Apple Music", /(^|\.)music\.apple\.com$|(^|\.)itunes\.apple\.com$/i],
  ["youtube_url", "YouTube", /(^|\.)youtube\.com$|(^|\.)youtu\.be$|(^|\.)music\.youtube\.com$/i],
  ["boomplay_url", "Boomplay", /(^|\.)boomplay\.com$/i],
  ["audiomack_url", "Audiomack", /(^|\.)audiomack\.com$/i],
  ["tiktok_url", "TikTok", /(^|\.)tiktok\.com$/i],
  ["instagram_url", "Instagram", /(^|\.)instagram\.com$/i],
  ["x_url", "X", /(^|\.)x\.com$|(^|\.)twitter\.com$/i],
  ["facebook_url", "Facebook", /(^|\.)facebook\.com$/i],
  ["shazam_url", "Shazam", /(^|\.)shazam\.com$/i],
  ["website_url", "Website", null],
];

const QUESTIONABLE_COUNTRY = /\b(unknown|unsure|tbd|tba|n\/a|none|null|various|global|international)\b|\?/i;
const GENERIC_ARTIST_COUNTRY_EXEMPTIONS = new Set(["various artists"]);

function appendQuery(path, params = {}) {
  const [base, rawQuery = ""] = String(path).split("?");
  const query = new URLSearchParams(rawQuery);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  const value = query.toString();
  return value ? `${base}?${value}` : base;
}

async function fetchAllCmsResults(api, request) {
  const pageSize = request.pageSize || PAGE_SIZE;
  const first = await api.get(appendQuery(request.path, {
    ...(request.params || {}),
    page: 1,
    page_size: pageSize,
  }), { timeoutMs: 30_000 });
  const rows = getResults(first);
  if (Array.isArray(first) || !first?.next || rows.length < pageSize) return rows;

  const totalPages = typeof first.count === "number" ? Math.ceil(first.count / pageSize) : null;
  if (!totalPages || totalPages <= 1) return rows;

  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      api.get(appendQuery(request.path, {
        ...(request.params || {}),
        page: index + 2,
        page_size: pageSize,
      }), { timeoutMs: 30_000 }).then(getResults)
    )
  );
  rest.forEach((page) => rows.push(...page));
  return rows;
}

export async function buildDashboardAudit(api, options = {}) {
  const settled = await Promise.allSettled([
    ...RESOURCE_REQUESTS.map((request) => fetchAllCmsResults(api, request)),
    options.publicPayload
      ? Promise.resolve({ payload: options.publicPayload, source: "provided", stale: false })
      : fetchAppDataWithFallback(undefined, {
          timeoutMs: options.publicPayloadTimeoutMs || 15_000,
          maxAgeMs: options.publicPayloadMaxAgeMs || PUBLIC_PAYLOAD_CACHE_MAX_AGE_MS,
        }),
  ]);
  const records = {};
  const loadWarnings = [];

  RESOURCE_REQUESTS.forEach((request, index) => {
    const result = settled[index];
    if (result.status === "fulfilled") {
      records[request.key] = result.value;
    } else {
      records[request.key] = [];
      loadWarnings.push(`${request.label}: ${result.reason?.message || "unavailable"}`);
    }
  });

  const publicResult = settled[RESOURCE_REQUESTS.length];
  const publicPayload = publicResult?.status === "fulfilled" ? publicResult.value?.payload : null;
  if (publicResult?.status === "rejected") {
    loadWarnings.push(`Public Top 50 releases: ${publicResult.reason?.message || "unavailable"}; release audit skipped`);
  } else if (publicResult?.value?.stale) {
    loadWarnings.push("Public Top 50 releases: using cached public chart data");
  }

  return {
    ...auditCmsRecords(records, {
      ...options,
      publicPayload,
      publicReleasesOnly: options.publicReleasesOnly !== false,
    }),
    loadWarnings,
  };
}

export function mergeDashboardAudit(data, audit) {
  if (!audit) return data;
  const cleanData = sanitizeDashboardAttention(data || {});
  const scopedBaseAlerts = filterAlertsForChartScope(cleanData.alerts || [], {
    publicReleaseScope: audit.publicReleaseScope,
    chartedArtistScope: audit.chartedArtistScope,
    certScopeIds: audit.certScopeIds,
  });
  const baseAlerts = filterBackendAlertsResolvedByAudit(scopedBaseAlerts, audit);
  const alerts = mergeAlerts(baseAlerts, sanitizeAlerts(audit.alerts || []));
  const mergedCards = buildVisibleAttentionCards(cleanData.cards || {}, audit.cards || {}, alerts);
  return {
    ...cleanData,
    cards: mergedCards,
    alerts,
    auditCoverage: audit.coverage,
    auditSummary: audit.summary,
    auditLoadWarnings: audit.loadWarnings || [],
  };
}

export function sanitizeDashboardAttention(data = {}) {
  const cards = { ...(data.cards || {}) };
  delete cards.invalid_urls_detected;
  return {
    ...data,
    cards,
    alerts: sanitizeAlerts(data.alerts || []),
  };
}

function sanitizeAlerts(alerts = []) {
  return (alerts || []).map(sanitizeAlert).filter(Boolean);
}

function sanitizeAlert(alert = {}) {
  if (NON_CHART_ALERT_MODULES.has(String(alert.module || "").toLowerCase())) return null;
  const text = `${alert.id || ""} ${alert.title || ""} ${alert.category || ""} ${alert.message || ""}`;
  if (isTechnicalAlertText(text)) return null;
  const hasDetails = Array.isArray(alert.details);
  if (!hasDetails) return alert;
  const details = alert.details.filter((detail) =>
    !isTechnicalAlertText(`${detail.problem || ""} ${detail.field || ""}`)
  );
  if (!details.length && alert.details.length) return null;
  if (details.length === alert.details.length) return alert;
  return {
    ...alert,
    details,
    total: details.length,
    message: `${details.length} visible alert detail${details.length === 1 ? "" : "s"} need attention.`,
  };
}

function isTechnicalAlertText(text = "") {
  return TECHNICAL_ALERT_PATTERN.test(String(text || ""));
}

function filterBackendAlertsResolvedByAudit(alerts, audit) {
  const certificationAuditReliable = !(audit?.loadWarnings || []).some((warning) =>
    /^Certifications:|^Certification rules:/i.test(String(warning || ""))
  );
  return alerts.filter((alert) => {
    if (certificationAuditReliable && isBackendCertificationThresholdAlert(alert)) return false;
    return !isBackendAlertSupersededByAudit(alert, audit);
  });
}

function isBackendCertificationThresholdAlert(alert = {}) {
  const id = String(alert.id || "").toLowerCase();
  const title = String(alert.title || "").toLowerCase();
  return id === "certifications-below-threshold" ||
    (title.includes("certification") && title.includes("threshold") && (title.includes("below") || title.includes("fall")));
}

function isBackendAlertSupersededByAudit(alert = {}, audit = {}) {
  const labels = BACKEND_ALERTS_SUPERSEDED_BY_AUDIT.get(String(alert.id || "").toLowerCase());
  return Boolean(labels && auditResourcesReliable(audit, labels));
}

function auditResourcesReliable(audit = {}, labels = []) {
  const warnings = audit.loadWarnings || [];
  return labels.every((label) =>
    !warnings.some((warning) => String(warning || "").startsWith(`${label}:`))
  );
}

function buildVisibleAttentionCards(baseCards = {}, auditCards = {}, alerts = []) {
  const cards = { ...baseCards, ...auditCards };
  ATTENTION_CARD_KEYS.forEach((key) => delete cards[key]);
  const counts = {
    missing_artist_countries: 0,
    duplicate_artists_detected: 0,
    errors_warnings: 0,
    data_audit_findings: 0,
    critical_data_issues: 0,
    incomplete_metadata: 0,
    missing_media_assets: 0,
    invalid_urls_detected: 0,
    questionable_countries: 0,
    chart_uploads_needed: 0,
  };

  alerts.forEach((alert) => {
    const count = alertDetailCount(alert);
    if (!count) return;
    counts.data_audit_findings += count;
    if (alert.level === "error") counts.critical_data_issues += count;
    attentionBucketsForAlert(alert).forEach((key) => {
      counts[key] += count;
    });
  });

  Object.entries(counts).forEach(([key, value]) => {
    if (value > 0) cards[key] = value;
  });
  const hasError = alerts.some((alert) => alert.level === "error");
  const hasWarning = alerts.some((alert) => alert.level === "warning");
  cards.system_health = hasError ? "ACTION_REQUIRED" : (hasWarning ? "NEEDS_ATTENTION" : "OK");
  delete cards.invalid_urls_detected;
  return cards;
}

function attentionBucketsForAlert(alert = {}) {
  const id = String(alert.id || "").toLowerCase();
  const text = `${id} ${alert.title || ""} ${alert.category || ""}`.toLowerCase();
  const keys = [];
  if (id.includes("duplicate")) keys.push("duplicate_artists_detected");
  if (id.includes("open-quality-reports")) keys.push("errors_warnings");
  if (/upload|chart-period|chart-type-pair/.test(id)) keys.push("chart_uploads_needed");
  if (/cover-missing|image-missing|media/.test(id)) keys.push("missing_media_assets");
  if (/country/.test(text)) keys.push("questionable_countries");
  if (/artist.*country|artists-missing-country/.test(id)) keys.push("missing_artist_countries");
  if (/details|incomplete|featured|compound|date|json|certification|verification/.test(id)) keys.push("incomplete_metadata");
  return keys;
}

function alertDetailCount(alert = {}) {
  return Number(alert.total || alert.details?.length || 0) || 0;
}

function mergeAlerts(baseAlerts, auditAlerts) {
  const byId = new Map();
  const add = (alert) => {
    const id = alert.id || `${alert.module || "alert"}-${alert.title}`;
    const current = byId.get(id);
    if (!current) {
      byId.set(id, { ...alert, details: [...(alert.details || [])] });
      return;
    }
    current.level = higherLevel(current.level, alert.level);
    current.details = mergeDetails(current.details || [], alert.details || []);
    if (alert.message && !String(current.message || "").includes(alert.message)) {
      current.message = [current.message, alert.message].filter(Boolean).join(" ");
    }
  };
  baseAlerts.forEach(add);
  auditAlerts.forEach(add);
  return [...byId.values()].sort((a, b) => severityRank(a.level) - severityRank(b.level));
}

function mergeDetails(left, right) {
  const seen = new Set();
  return [...left, ...right].filter((detail) => {
    const key = `${detail.id ?? ""}|${detail.label || ""}|${detail.problem || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Alerts & Needs Attention only covers releases, artists, and certifications
// that are actually on a Top 50 chart (combined, regional/Kenyan, or
// platform) — everything else in these modules (catalogue-wide issues for
// entries that never charted) is dropped, not just de-emphasized.
function filterAlertsForChartScope(alerts, chartScope) {
  const { publicReleaseScope, chartedArtistScope, certScopeIds } = chartScope || {};
  if (!publicReleaseScope?.enabled) return alerts;
  const nounByKind = {
    release: "public Top 50 release",
    artist: "Top 50 charted artist",
    certification: "Top 50 charted certification",
  };
  return alerts
    .map((alert) => {
      const kind = chartAlertEntityKind(alert);
      if (!kind || !Array.isArray(alert.details)) return alert;
      const details = alert.details.filter((detail) => {
        if (kind === "release") return detailMatchesPublicReleaseScope(detail, publicReleaseScope);
        if (kind === "artist") return chartedArtistScope?.ids?.has(Number(detail.id));
        return certScopeIds?.has(Number(detail.id));
      });
      if (!details.length) return null;
      if (details.length === alert.details.length) return alert;
      return {
        ...alert,
        details,
        total: details.length,
        message: `${details.length} ${plural(nounByKind[kind], details.length)} need attention.`,
      };
    })
    .filter(Boolean);
}

function chartAlertEntityKind(alert = {}) {
  const id = String(alert.id || "").toLowerCase();
  const module = String(alert.module || "").toLowerCase();
  const page = String(alert.page || "").toLowerCase();
  if (id.includes("duplicate")) return null;
  if (module === "releases" || page === "songs" || page === "albums" || /^audit-(song|album)-/.test(id) || /^releases?[-_]/.test(id)) {
    return "release";
  }
  if (module === "artists" || page === "artists" || /^audit-artist-/.test(id) || /^artists?[-_]/.test(id)) {
    return "artist";
  }
  if (module === "certifications" || page === "certifications" || /^audit-certification-(?!rule)/.test(id) || /^certifications?[-_](?!rule)/.test(id)) {
    return "certification";
  }
  return null;
}

function detailMatchesPublicReleaseScope(detail = {}, scope) {
  if (!scope?.hasEntries) return false;
  const id = Number(detail.release_id ?? detail.release ?? detail.id);
  if (Number.isFinite(id) && id > 0) {
    if (scope.idsByType?.singles?.has(id) || scope.idsByType?.albums?.has(id)) return true;
  }
  const key = releaseLookupKey(detail);
  return Boolean(key && (scope.keysByType?.singles?.has(key) || scope.keysByType?.albums?.has(key)));
}

function higherLevel(a, b) {
  return severityRank(a) <= severityRank(b) ? a : b;
}

function severityRank(level) {
  if (level === "error") return 0;
  if (level === "warning") return 1;
  return 2;
}

export function auditCmsRecords(records, options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const buckets = new Map();
  const summary = {
    totalFindings: 0,
    criticalFindings: 0,
    invalidUrls: 0,
    missingMedia: 0,
    questionableCountries: 0,
    chartUploadsNeeded: 0,
    incompleteMetadata: 0,
  };

  const countryContext = buildCountryContext(records.countries || []);
  const artistById = new Map((records.artists || []).map((artist) => [Number(artist.id), artist]));
  const artistByName = buildArtistNameIndex(records.artists || []);
  const releases = [...(records.songs || []), ...(records.albums || [])];
  const releaseById = new Map(releases.map((release) => [Number(release.id), release]));
  const certRules = buildCertificationRules(records.certificationRules || []);
  const publicReleasesOnly = Boolean(options.publicReleasesOnly);
  const publicReleaseScope = buildPublicReleaseScope(options.publicPayload, publicReleasesOnly);
  const chartedArtistScope = buildChartedArtistScope(releases, publicReleaseScope);

  const ctx = {
    now,
    buckets,
    summary,
    countryContext,
    artistById,
    artistByName,
    releaseById,
    certRules,
    publicReleasesOnly,
    publicReleaseScope,
    chartedArtistScope,
    certScopeIds: new Set(),
  };

  auditArtists(records.artists || [], ctx);
  auditReleases(records.songs || [], "singles", ctx);
  auditReleases(records.albums || [], "albums", ctx);
  auditCountries(records.countries || [], records, ctx);
  auditPlatforms(records.platforms || [], ctx);
  auditCharts(records.charts || [], records.chartUploads || [], ctx);
  auditUploads(records.chartUploads || [], records.weeklyUploads || [], ctx);
  auditCertifications(records.certifications || [], ctx);
  auditCertificationRules(records.certificationRules || [], ctx);
  auditNews(records.news || [], ctx);
  auditPageContent(records.pageContent || [], ctx);
  auditMedia(records.media || [], ctx);
  auditReports(records.reports || [], ctx);
  auditBackups(records.backups || [], ctx);

  const alerts = finalizeAlerts(buckets);
  const recordCount = Object.values(records).reduce((total, rows) => total + (Array.isArray(rows) ? rows.length : 0), 0);
  const moduleCount = Object.values(records).filter((rows) => Array.isArray(rows) && rows.length).length;
  summary.totalFindings = alerts.reduce((total, alert) => total + (alert.total || alert.details?.length || 0), 0);
  summary.criticalFindings = alerts
    .filter((alert) => alert.level === "error")
    .reduce((total, alert) => total + (alert.total || alert.details?.length || 0), 0);

  return {
    alerts,
    cards: buildCards(summary),
    coverage: {
      recordCount,
      moduleCount,
      checkedAt: now.toISOString(),
      releaseAuditScope: publicReleasesOnly ? "public-top-50" : "catalog",
      publicTop50Releases: publicReleaseScope.releaseCount || 0,
    },
    summary,
    publicReleaseScope,
    chartedArtistScope,
    certScopeIds: ctx.certScopeIds,
  };
}

function pushIssue(ctx, id, meta, detail, metrics = []) {
  const bucket = ctx.buckets.get(id) || {
    id,
    title: meta.title,
    module: meta.module,
    page: meta.page,
    level: meta.level || "warning",
    category: meta.category,
    noun: meta.noun || "record",
    messageTail: meta.messageTail || "need attention.",
    details: [],
  };
  bucket.details.push(detail);
  bucket.level = higherLevel(bucket.level, meta.level || "warning");
  ctx.buckets.set(id, bucket);
  metrics.forEach((metric) => {
    ctx.summary[metric] = (ctx.summary[metric] || 0) + 1;
  });
}

function finalizeAlerts(buckets) {
  return [...buckets.values()]
    .map((bucket) => {
      const total = bucket.details.length;
      const hidden = Math.max(0, total - MAX_ALERT_DETAILS);
      const details = bucket.details.slice(0, MAX_ALERT_DETAILS);
      return {
        id: bucket.id,
        title: bucket.title,
        module: bucket.module,
        page: bucket.page,
        level: bucket.level,
        category: bucket.category,
        total,
        message: `${total} ${plural(bucket.noun, total)} ${bucket.messageTail}${hidden ? ` Showing first ${MAX_ALERT_DETAILS}; ${hidden} more remain in the CMS section.` : ""}`,
        details,
      };
    })
    .sort((a, b) => severityRank(a.level) - severityRank(b.level) || b.total - a.total || a.title.localeCompare(b.title));
}

function buildCards(summary) {
  const cards = {
    data_audit_findings: summary.totalFindings,
    critical_data_issues: summary.criticalFindings,
    incomplete_metadata: summary.incompleteMetadata,
    missing_media_assets: summary.missingMedia,
    invalid_urls_detected: summary.invalidUrls,
    questionable_countries: summary.questionableCountries,
    chart_uploads_needed: summary.chartUploadsNeeded,
  };
  return Object.fromEntries(Object.entries(cards).filter(([, value]) => Number(value) > 0));
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
  return editDistance(left, right) <= 1;
}

const SERIES_MARKER_WORDS = new Set([
  "i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x",
  "xi", "xii", "xiii", "xiv", "xv", "xvi", "xvii", "xviii", "xix", "xx",
]);
const GENERIC_RELEASE_TITLE_WORDS = new Set([
  "acoustic", "bonus", "clean", "deluxe", "edit", "ep", "explicit", "extended",
  "instrumental", "live", "mix", "radio", "remaster", "remastered", "remix",
  "single", "sped", "slowed", "version", "versions", "vol", "volume",
]);

function seriesMarkerSignature(value) {
  const words = String(value || "").toLowerCase().match(/[a-z0-9]+/g) || [];
  return words.filter((word) => /^\d+$/.test(word) || SERIES_MARKER_WORDS.has(word)).join(",");
}

function normalizedIdentifier(value) {
  return String(value || "").replace(/[^a-z0-9]/gi, "").toUpperCase();
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function strictReleaseTitleKey(row = {}) {
  return foldText(releaseTitleValue(row));
}

function hasMeaningfulReleaseTitle(row = {}) {
  const words = String(releaseTitleValue(row) || "").toLowerCase().match(/[a-z0-9]+/g) || [];
  const meaningful = words.filter((word) => !GENERIC_RELEASE_TITLE_WORDS.has(word)).join("");
  return meaningful.length >= 3;
}

function duplicateKeysForAudit(row, kind, chartType = "") {
  if (kind === "artist") return mergeRuleKeysForRow(row, { kind: "artist" });
  const title = strictReleaseTitleKey(row);
  const artists = releaseArtistComparisonKeys(row);
  if (!title || !artists.length || !hasMeaningfulReleaseTitle(row)) return [];
  return unique(artists.map((artist) => `release:${chartType}:${title}:${artist}`));
}

function effectiveReleaseCountry(release, leadArtist) {
  return {
    ...release,
    country: release?.country || leadArtist?.country || "",
    country_code: release?.country_code || leadArtist?.country_code || "",
  };
}

function duplicateRows(group) {
  return Array.isArray(group) ? group : (group?.rows || []);
}

function duplicateSignals(group) {
  return Array.isArray(group) ? [] : [...(group?.signals || [])].filter(Boolean);
}

function buildDeepDuplicateGroups(rows, kind, { chartType = "" } = {}) {
  const records = (rows || []).filter((row) => row?.id && normalizedStatus(row) !== "archived");
  const parent = new Map(records.map((row) => [Number(row.id), Number(row.id)]));
  const byId = new Map(records.map((row) => [Number(row.id), row]));
  const edges = [];
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
  const union = (left, right, signal) => {
    const leftId = Number(left?.id ?? left);
    const rightId = Number(right?.id ?? right);
    if (!parent.has(leftId) || !parent.has(rightId) || leftId === rightId) return;
    const a = find(leftId);
    const b = find(rightId);
    if (a !== b) parent.set(b, a);
    edges.push({ leftId, rightId, signal });
  };
  const addBucketKey = (buckets, key, row, signal) => {
    if (!key) return;
    const previous = buckets.get(key);
    if (previous) union(previous, row, signal);
    else buckets.set(key, row);
  };

  const exactBuckets = new Map();
  records.forEach((row) => {
    if (kind === "artist") {
      duplicateKeysForAudit(row, "artist").forEach((key) =>
        addBucketKey(exactBuckets, key, row, "same normalized artist name, display name, public name, or alias")
      );
      const slug = foldText(row.slug);
      if (slug) addBucketKey(exactBuckets, `artist-slug:${slug}`, row, "same artist slug");
      return;
    }

    duplicateKeysForAudit(row, "release", chartType).forEach((key) =>
      addBucketKey(exactBuckets, key, row, "same normalized title and artist credit")
    );
  });

  const fuzzyBuckets = new Map();
  if (kind === "artist") {
    return groupedDuplicateResults(records, parent, edges, byId);
  }
  records.forEach((row) => {
    const canonical = strictReleaseTitleKey(row);
    if (!canonical || !hasMeaningfulReleaseTitle(row)) return;
    const artistKeys = releaseArtistComparisonKeys(row);
    if (!artistKeys.length) return;
    artistKeys.forEach((artistKey) => {
      const bucketKey = `${artistKey}|${canonical[0]}`;
      if (!fuzzyBuckets.has(bucketKey)) fuzzyBuckets.set(bucketKey, []);
      fuzzyBuckets.get(bucketKey).push({ row, canonical });
    });
  });
  fuzzyBuckets.forEach((bucket) => {
    for (let left = 0; left < bucket.length; left += 1) {
      for (let right = left + 1; right < bucket.length; right += 1) {
        const leftRow = bucket[left].row;
        const rightRow = bucket[right].row;
        if (
          kind === "release" &&
          seriesMarkerSignature(leftRow.title || leftRow.canonical_title) !==
            seriesMarkerSignature(rightRow.title || rightRow.canonical_title)
        ) continue;
        if (isConservativeNearMatch(bucket[left].canonical, bucket[right].canonical)) {
          union(
            leftRow,
            rightRow,
            kind === "artist"
              ? "near artist-name spelling match"
              : "near title spelling match for the same artist credit"
          );
        }
      }
    }
  });

  return groupedDuplicateResults(records, parent, edges, byId);
}

function groupedDuplicateResults(records, parent, edges, byId) {
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
  const groups = new Map();
  records.forEach((row) => {
    const root = find(Number(row.id));
    if (!groups.has(root)) groups.set(root, { rows: [], signals: new Set() });
    groups.get(root).rows.push(row);
  });
  edges.forEach((edge) => {
    const root = find(edge.leftId);
    if (groups.has(root) && byId.has(edge.leftId) && byId.has(edge.rightId)) {
      groups.get(root).signals.add(edge.signal);
    }
  });

  return [...groups.values()]
    .filter((group) => group.rows.length > 1)
    .map((group) => ({
      rows: group.rows.sort((left, right) =>
        Number(right.entry_count || right.release_count || right.total_releases || 0) -
          Number(left.entry_count || left.release_count || left.total_releases || 0) ||
        Number(Boolean(right.cover_image || right.image)) - Number(Boolean(left.cover_image || left.image)) ||
        Number(left.id) - Number(right.id)
      ),
      signals: group.signals,
    }))
    .sort((left, right) =>
      right.rows.length - left.rows.length ||
      String(duplicateRows(left)[0]?.title || duplicateRows(left)[0]?.name || "").localeCompare(
        String(duplicateRows(right)[0]?.title || duplicateRows(right)[0]?.name || "")
      )
    );
}

function releaseArtistComparisonKeys(row = {}) {
  const fromIds = releaseArtistIds(row).map(String).sort().join("+");
  const profileName = profileLabel(Array.isArray(row.primary_artists) ? row.primary_artists[0] : null);
  const textKey = foldTokenOrder(
    row.artist_display ||
    row.artist_credit ||
    row.artist_name ||
    row.primary_artist ||
    row.a ||
    row.pa ||
    profileName ||
    ""
  );
  return unique([fromIds ? `ids:${fromIds}` : "", textKey ? `credit:${textKey}` : ""]);
}

function emptyTypeSets() {
  return Object.fromEntries(RELEASE_TYPES.map((type) => [type, new Set()]));
}

function buildPublicReleaseScope(payload, enabled) {
  const scope = {
    enabled: Boolean(enabled),
    hasPayload: Boolean(payload),
    hasEntries: false,
    idsByType: emptyTypeSets(),
    keysByType: emptyTypeSets(),
    releaseTokens: new Set(),
    releaseCount: 0,
  };
  if (!enabled || !payload) return scope;

  const normalizedPayload = normalizePublicPayload(payload);
  const addRow = (type, row, index) => {
    const chartType = normalizeChartType(type);
    const rank = Number(row?.r ?? row?.rank ?? index + 1);
    if (!Number.isFinite(rank) || rank < 1 || rank > 50) return;
    const releaseId = Number(row?.release_id ?? row?.releaseId ?? row?.release?.id);
    const key = releaseLookupKey(row);
    if (Number.isFinite(releaseId) && releaseId > 0) {
      scope.idsByType[chartType].add(releaseId);
      scope.releaseTokens.add(`${chartType}|id:${releaseId}`);
      scope.hasEntries = true;
    }
    if (key) {
      scope.keysByType[chartType].add(key);
      if (!Number.isFinite(releaseId) || releaseId <= 0) scope.releaseTokens.add(`${chartType}|key:${key}`);
      scope.hasEntries = true;
    }
  };
  const walkRows = (type, value) => {
    if (Array.isArray(value)) {
      value.forEach((row, index) => addRow(type, row, index));
      return;
    }
    if (value && typeof value === "object") {
      Object.values(value).forEach((child) => walkRows(type, child));
    }
  };

  RELEASE_TYPES.forEach((type) => {
    const chart = normalizedPayload.full?.[type] || {};
    walkRows(type, chart.combined);
    walkRows(type, chart.platforms);
    walkRows(type, chart.regions);
  });
  scope.releaseCount = scope.releaseTokens.size;
  return scope;
}

function buildChartedArtistScope(releases, publicReleaseScope) {
  const scope = { ids: new Set(), names: new Set() };
  if (!publicReleaseScope?.enabled) return scope;
  releases.forEach((release) => {
    if (!releaseMatchesPublicScope(release, release.chart_type, publicReleaseScope)) return;
    releaseArtistIds(release).forEach((id) => scope.ids.add(Number(id)));
    [
      release.artist_display,
      release.artist_credit,
      release.artist_name,
      release.primary_artist,
      release.a,
      release.pa,
    ].forEach((value) => {
      const key = normalizeName(value);
      if (key) scope.names.add(key);
    });
  });
  return scope;
}

function normalizeChartType(value, fallback = "singles") {
  const raw = String(value || fallback).trim().toLowerCase();
  return raw.includes("album") ? "albums" : "singles";
}

function releaseMatchesPublicScope(release, chartType, scope) {
  if (!scope?.enabled) return true;
  if (!scope.hasEntries) return false;
  const type = normalizeChartType(chartType || release?.chart_type);
  const releaseId = Number(release?.id ?? release?.release_id ?? release?.release);
  if (Number.isFinite(releaseId) && releaseId > 0 && scope.idsByType?.[type]?.has(releaseId)) return true;
  const key = releaseLookupKey(release);
  return Boolean(key && scope.keysByType?.[type]?.has(key));
}

function artistMatchesPublicReleaseScope(artist, ctx) {
  if (!ctx.publicReleasesOnly) return true;
  if (!ctx.publicReleaseScope?.hasEntries) return false;
  const id = Number(artist?.id);
  if (Number.isFinite(id) && ctx.chartedArtistScope?.ids?.has(id)) return true;
  return [artist?.name, artist?.display_name, artist?.public_name]
    .some((value) => ctx.chartedArtistScope?.names?.has(normalizeName(value)));
}

function recordMatchesPublicAuditScope(row, ctx) {
  if (!ctx.publicReleasesOnly) return true;
  if (hasValue(row?.title)) return releaseMatchesPublicScope(row, row.chart_type, ctx.publicReleaseScope);
  return artistMatchesPublicReleaseScope(row, ctx);
}

function certificationMatchesPublicScope(cert, release, ctx) {
  if (!ctx.publicReleasesOnly) return true;
  if (release) return releaseMatchesPublicScope(release, release.chart_type || cert.chart_type, ctx.publicReleaseScope);
  return releaseMatchesPublicScope({
    id: cert.release_id ?? cert.release,
    release_id: cert.release_id ?? cert.release,
    title: cert.title || cert.t || cert.release_title,
    artist_display: cert.artist || cert.a || cert.release_artist || cert.artist_display,
    chart_type: cert.chart_type,
  }, cert.chart_type, ctx.publicReleaseScope);
}

function auditArtists(artists, ctx) {
  const duplicateGroups = buildDeepDuplicateGroups(artists, "artist");
  pushDuplicateIssues(ctx, duplicateGroups, {
    id: "audit-artist-duplicate-name",
    title: "Possible duplicate artists",
    module: "artists",
    page: "duplicate-review",
    category: "Duplicates",
    noun: "artist candidate group",
    messageTail: "may be duplicate artist records and should be reviewed in Duplicate Review.",
    labelFor: (group) => group.map(artistLabel).join(" / "),
  });

  artists.forEach((artist) => {
    if (!artistMatchesPublicReleaseScope(artist, ctx)) return;
    const status = normalizedStatus(artist);
    const label = artistLabel(artist);
    const inactive = ["archived", "inactive"].includes(status);
    if (inactive) return;

    const missing = missingFields(artist, [
      ["name", "artist name"],
      ["slug", "slug"],
      ["status", "status"],
    ]);
    if (missing.length) {
      pushIssue(ctx, "audit-artist-details-incomplete", {
        title: "Artist detail sections incomplete",
        module: "artists",
        page: "artists",
        category: "Artists",
        noun: "artist profile",
        messageTail: "have incomplete detail fields.",
      }, { id: artist.id, label, problem: `Missing: ${missing.join(", ")}` }, ["incompleteMetadata"]);
    }

    const countryProblem = genericArtistCountryExempt(artist) ? "" : countryProblemFor(artist, ctx.countryContext);
    if (countryProblem) {
      pushIssue(ctx, "audit-artist-country-questionable", {
        title: "Artist countries need verification",
        module: "artists",
        page: "artists",
        category: "Countries",
        noun: "artist profile",
        messageTail: "have missing, partial, invalid, or questionable country data.",
      }, { id: artist.id, label, problem: countryProblem }, ["questionableCountries"]);
    }

    const aliasesProblem = jsonProblem(artist.aliases, "aliases");
    if (aliasesProblem) {
      pushIssue(ctx, "audit-artist-json-invalid", {
        title: "Artist JSON fields are invalid",
        module: "artists",
        page: "artists",
        category: "Details",
        noun: "artist profile",
        messageTail: "have JSON fields that need correction.",
      }, { id: artist.id, label, problem: aliasesProblem }, ["incompleteMetadata"]);
    }
  });
}

function auditReleases(releases, chartType, ctx) {
  const page = chartType === "albums" ? "albums" : "songs";
  const releaseName = chartType === "albums" ? "album" : "song";
  const duplicateGroups = buildDeepDuplicateGroups(releases, "release", { chartType });
  pushDuplicateIssues(ctx, duplicateGroups, {
    id: `audit-${releaseName}-duplicate-title`,
    title: `Possible duplicate ${releaseName}s`,
    module: "releases",
    page: "duplicate-review",
    category: "Duplicates",
    noun: `${releaseName} candidate group`,
    messageTail: `may be duplicate ${releaseName} records and should be reviewed in Duplicate Review.`,
    labelFor: (group) => group.map(releaseLabel).join(" / "),
  });

  releases.forEach((release) => {
    if (!releaseMatchesPublicScope(release, chartType, ctx.publicReleaseScope)) return;
    const status = normalizedStatus(release);
    if (["archived", "inactive"].includes(status)) return;
    const label = releaseLabel(release);
    const leadArtist = firstLeadArtist(release, ctx.artistById);
    const releaseForCompleteness = effectiveReleaseCountry(release, leadArtist);

    if (!hasMedia(release.cover_image || release.cover_image_url || release.image || release.artwork)) {
      pushIssue(ctx, `audit-${releaseName}-cover-missing`, {
        title: `${capitalize(releaseName)} cover images missing`,
        module: "releases",
        page,
        category: "Media",
        noun: releaseName,
        messageTail: "are missing cover artwork.",
      }, { id: release.id, label, problem: "Missing cover image" }, ["missingMedia"]);
    }

    const required = [
      ["title", "title"],
      ["status", "status"],
    ];
    if (!hasValue(releaseForCompleteness.country)) required.push(["country", "country"]);
    if (!hasValue(releaseForCompleteness.country_code)) required.push(["country_code", "country code"]);
    if (!releaseHasPrimaryArtist(release)) required.push(["primary_artist_ids", "main artists"]);
    const missing = missingFields(releaseForCompleteness, required);
    if (missing.length) {
      pushIssue(ctx, `audit-${releaseName}-details-incomplete`, {
        title: `${capitalize(releaseName)} detail sections incomplete`,
        module: "releases",
        page,
        category: "Details",
        noun: releaseName,
        messageTail: "have incomplete release details.",
      }, { id: release.id, label, problem: `Missing: ${missing.join(", ")}` }, ["incompleteMetadata"]);
    }

    const countryProblem = countryProblemFor(releaseForCompleteness, ctx.countryContext);
    const leadCode = normalizeCode(leadArtist?.country_code);
    const releaseCode = normalizeCode(release.country_code);
    const artistMismatch = leadCode && releaseCode && leadCode !== releaseCode
      ? `Release country code ${releaseCode} does not match lead artist ${artistLabel(leadArtist)} (${leadCode})`
      : "";
    if (countryProblem || artistMismatch) {
      pushIssue(ctx, `audit-${releaseName}-country-questionable`, {
        title: `${capitalize(releaseName)} countries need verification`,
        module: "releases",
        page,
        category: "Countries",
        noun: releaseName,
        messageTail: "have missing, partial, invalid, mismatched, or questionable country data.",
      }, { id: release.id, label, problem: [countryProblem, artistMismatch].filter(Boolean).join("; ") }, ["questionableCountries"]);
    }

    const yearProblem = releaseDateProblem(release, ctx.now);
    if (yearProblem) {
      pushIssue(ctx, `audit-${releaseName}-date-questionable`, {
        title: `${capitalize(releaseName)} release dates need review`,
        module: "releases",
        page,
        category: "Details",
        noun: releaseName,
        messageTail: "have invalid or inconsistent release dates.",
      }, { id: release.id, label, problem: yearProblem }, ["incompleteMetadata"]);
    }

    if (hasValue(release.featured_artists) && !releaseHasFeaturedArtistLinks(release)) {
      pushIssue(ctx, `audit-${releaseName}-featured-unlinked`, {
        title: `${capitalize(releaseName)} featuring artists are unlinked`,
        module: "releases",
        page,
        category: "Artists",
        noun: releaseName,
        messageTail: "use text-only featured credits that should be linked to artist records.",
      }, { id: release.id, label, problem: `Unlinked featuring names: ${stringValue(release.featured_artists)}` }, ["incompleteMetadata"]);
    }

    const compoundProblem = compoundArtistCreditProblem(release, ctx);
    if (compoundProblem) {
      pushIssue(ctx, `audit-${releaseName}-compound-artist-unlinked`, {
        title: `${capitalize(releaseName)}s may split a registered duo/group act`,
        module: "releases",
        page,
        level: "error",
        category: "Artists",
        noun: releaseName,
        messageTail: "credit a compound name as free text that exactly matches a single registered artist — link that one artist record instead so the chart doesn't split it into separate members.",
      }, { id: release.id, label, problem: compoundProblem }, ["incompleteMetadata"]);
    }

  });
}

function auditCountries(countries, records, ctx) {
  const codeGroups = new Map();
  countries.forEach((country) => {
    const label = country.name || country.code || `Country #${country.id}`;
    const normalizedLabel = normalizeCountryName(label);
    if (INTENTIONAL_COUNTRY_PLACEHOLDERS.has(normalizedLabel)) return;
    const code = normalizeCode(country.code);
    if (code) addGroup(codeGroups, code, country);
    const missing = missingFields(country, [
      ["name", "country name"],
      ["code", "country code"],
      ["region", "region"],
    ]);
    if (!code && !hasValue(country.flag)) missing.push("flag/initial");
    if (missing.length) {
      pushIssue(ctx, "audit-country-details-incomplete", {
        title: "Country settings incomplete",
        module: "countries",
        page: "countries",
        category: "Countries",
        noun: "country",
        messageTail: "have incomplete settings.",
      }, { id: country.id, label, problem: `Missing: ${missing.join(", ")}` }, ["incompleteMetadata"]);
    }
    if (code && !/^[A-Z]{2}$/.test(code)) {
      pushIssue(ctx, "audit-country-code-invalid", {
        title: "Country codes are invalid",
        module: "countries",
        page: "countries",
        category: "Countries",
        noun: "country",
        messageTail: "have country codes that are not ISO-style two-letter codes.",
      }, { id: country.id, label, problem: `Invalid code: ${country.code}` }, ["questionableCountries"]);
    }
  });

  pushDuplicateIssues(ctx, codeGroups, {
    id: "audit-country-code-duplicate",
    title: "Duplicate country codes",
    module: "countries",
    page: "countries",
    category: "Countries",
    noun: "country code",
    messageTail: "are assigned to multiple countries.",
    labelFor: (group) => group.map((country) => country.name || country.code).join(" / "),
  });

  const activeByCode = new Map(countries.map((country) => [normalizeCode(country.code), country]));
  [...(records.artists || []), ...(records.songs || []), ...(records.albums || [])]
    .filter((row) => recordMatchesPublicAuditScope(row, ctx))
    .forEach((row) => {
    const code = normalizeCode(row.country_code);
    const country = activeByCode.get(code);
    if (country && country.active === false) {
      const isRelease = hasValue(row.title);
      pushIssue(ctx, "audit-inactive-country-in-use", {
        title: "Inactive countries are in use",
        module: "countries",
        page: isRelease ? (row.chart_type === "albums" ? "albums" : "songs") : "artists",
        category: "Countries",
        noun: "record",
        messageTail: "reference countries marked inactive.",
      }, { id: row.id, label: isRelease ? releaseLabel(row) : artistLabel(row), problem: `${country.name || code} is inactive` }, ["questionableCountries"]);
    }
  });
}

function auditPlatforms(platforms, ctx) {
  const slugGroups = new Map();
  const nameGroups = new Map();
  const orderGroups = new Map();
  platforms.forEach((platform) => {
    const label = platform.name || platform.short_name || `Platform #${platform.id}`;
    addGroup(nameGroups, normalizeName(platform.name || platform.short_name), platform);
    if (platform.slug) addGroup(slugGroups, normalizeName(platform.slug), platform);
    if (hasValue(platform.display_order)) addGroup(orderGroups, String(platform.display_order), platform);
    const missing = missingFields(platform, [
      ["name", "name"],
      ["slug", "slug"],
      ["short_name", "short name"],
      ["color", "color"],
      ["brand_color", "brand color"],
      ["max_chart_size", "max chart size"],
      ["points_base", "points base"],
      ["points_method", "points method"],
      ["display_order", "display order"],
    ]);
    if (missing.length) {
      pushIssue(ctx, "audit-platform-details-incomplete", {
        title: "Platform settings incomplete",
        module: "platforms",
        page: "platforms",
        category: "Platforms",
        noun: "platform",
        messageTail: "have incomplete scoring or display settings.",
      }, { id: platform.id, label, problem: `Missing: ${missing.join(", ")}` }, ["incompleteMetadata"]);
    }
    if (platform.active !== false && !platform.supports_singles && !platform.supports_albums) {
      pushIssue(ctx, "audit-platform-support-missing", {
        title: "Platforms support no chart type",
        module: "platforms",
        page: "platforms",
        category: "Platforms",
        noun: "platform",
        messageTail: "are active in the CMS but do not support singles or albums.",
      }, { id: platform.id, label, problem: "Supports neither singles nor albums" }, ["incompleteMetadata"]);
    }
    [["color", platform.color], ["brand color", platform.brand_color]].forEach(([field, value]) => {
      if (hasValue(value) && !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(value).trim())) {
        pushIssue(ctx, "audit-platform-color-invalid", {
          title: "Platform colors are invalid",
          module: "platforms",
          page: "platforms",
          category: "Platforms",
          noun: "platform color",
          messageTail: "are not valid hex colors.",
        }, { id: platform.id, label, problem: `${field}: ${value}` }, ["incompleteMetadata"]);
      }
    });
  });

  pushDuplicateIssues(ctx, nameGroups, {
    id: "audit-platform-name-duplicate",
    title: "Duplicate platform names",
    module: "platforms",
    page: "platforms",
    category: "Platforms",
    noun: "platform name",
    messageTail: "are repeated.",
    labelFor: (group) => group.map((platform) => platform.name || platform.short_name).join(" / "),
  });
  pushDuplicateIssues(ctx, slugGroups, {
    id: "audit-platform-slug-duplicate",
    title: "Duplicate platform slugs",
    module: "platforms",
    page: "platforms",
    category: "Platforms",
    noun: "platform slug",
    messageTail: "are repeated.",
    labelFor: (group) => group.map((platform) => platform.slug || platform.name).join(" / "),
  });
  pushDuplicateIssues(ctx, orderGroups, {
    id: "audit-platform-order-duplicate",
    title: "Platform display order duplicates",
    module: "platforms",
    page: "platforms",
    category: "Platforms",
    noun: "display order",
    messageTail: "are used by multiple platforms.",
    labelFor: (group) => group.map((platform) => platform.name || platform.short_name).join(" / "),
  });
}

function auditCharts(charts, uploads, ctx) {
  const periodGroups = new Map();
  const periodsByType = new Map(RELEASE_TYPES.map((type) => [type, new Set()]));
  charts.forEach((chart) => {
    const label = chartLabel(chart);
    const type = String(chart.chart_type || "").toLowerCase();
    const key = chartPeriodKey(chart);
    if (type && key) {
      addGroup(periodGroups, `${type}|${key}`, chart);
      periodsByType.get(type)?.add(key);
    }
    const missing = missingFields(chart, [
      ["year", "year"],
      ["month", "month"],
      ["chart_type", "chart type"],
      ["status", "status"],
    ]);
    const invalid = [];
    if (!validYear(chart.year, ctx.now)) invalid.push(`invalid year: ${chart.year || "blank"}`);
    if (!validMonth(chart.month)) invalid.push(`invalid month: ${chart.month || "blank"}`);
    if (!RELEASE_TYPES.includes(type)) invalid.push(`invalid chart type: ${chart.chart_type || "blank"}`);
    if (missing.length || invalid.length) {
      pushIssue(ctx, "audit-chart-period-invalid", {
        title: "Chart periods have invalid setup",
        module: "charts",
        page: "charts",
        category: "Chart periods",
        noun: "chart period",
        messageTail: "have missing or invalid period fields.",
      }, { id: chart.id, label, problem: [...missing.map((item) => `missing ${item}`), ...invalid].join("; ") }, ["incompleteMetadata"]);
    }
    const status = normalizedStatus(chart);
    if (status && !["published", "approved"].includes(status)) {
      pushIssue(ctx, "audit-chart-period-not-ready", {
        title: "Chart periods are not publish-ready",
        module: "charts",
        page: "charts",
        category: "Chart periods",
        noun: "chart period",
        messageTail: "are still draft, pending, rejected, or archived.",
      }, { id: chart.id, label, problem: `Status: ${status}` }, ["incompleteMetadata"]);
    }
    const entryCount = Number(chart.combined_entries_count ?? chart.entries_count ?? chart.row_count);
    if (!Number.isFinite(entryCount) || entryCount <= 0 || entryCount < 50) {
      pushIssue(ctx, "audit-chart-period-entry-count", {
        title: "Chart periods need entries",
        module: "charts",
        page: "chart-entries",
        category: "Chart entries",
        noun: "chart period",
        messageTail: "have missing or incomplete combined chart entries.",
      }, { id: chart.id, label, problem: Number.isFinite(entryCount) ? `${entryCount} combined entries` : "No combined entry count" }, ["chartUploadsNeeded"]);
    }
  });

  pushDuplicateIssues(ctx, periodGroups, {
    id: "audit-chart-period-duplicate",
    title: "Duplicate chart periods",
    module: "charts",
    page: "charts",
    category: "Chart periods",
    noun: "chart period",
    messageTail: "are duplicated for the same month and chart type.",
    labelFor: (group) => group.map(chartLabel).join(" / "),
  });

  const expected = expectedChartPeriod(ctx.now);
  RELEASE_TYPES.forEach((type) => {
    if (!periodsByType.get(type)?.has(expected.key)) {
      pushIssue(ctx, "audit-chart-upload-needed", {
        title: "New monthly chart data may need upload",
        module: "charts",
        page: "uploads",
        level: "error",
        category: "Uploads",
        noun: "chart type",
        messageTail: `are missing the expected ${expected.label} chart period.`,
      }, { label: `${capitalize(type)} - ${expected.label}`, problem: "No chart period found for expected latest month" }, ["chartUploadsNeeded"]);
    }
  });

  const allPeriodKeys = new Set([...periodsByType.get("singles"), ...periodsByType.get("albums")]);
  allPeriodKeys.forEach((key) => {
    const missingTypes = RELEASE_TYPES.filter((type) => !periodsByType.get(type)?.has(key));
    if (missingTypes.length && !isFuturePeriodKey(key, ctx.now)) {
      pushIssue(ctx, "audit-chart-type-pair-missing", {
        title: "Singles/albums chart coverage is uneven",
        module: "charts",
        page: "charts",
        category: "Chart periods",
        noun: "chart month",
        messageTail: "are missing either singles or albums coverage.",
      }, { label: key, problem: `Missing: ${missingTypes.join(", ")}` }, ["chartUploadsNeeded"]);
    }
  });

  const uploadsByTypePeriod = new Set((uploads || []).map((upload) => `${String(upload.chart_type || "").toLowerCase()}|${periodKey(upload.year, upload.month)}`));
  RELEASE_TYPES.forEach((type) => {
    if (periodsByType.get(type)?.has(expected.key) && !uploadsByTypePeriod.has(`${type}|${expected.key}`)) {
      pushIssue(ctx, "audit-chart-upload-record-missing", {
        title: "Latest chart period has no upload record",
        module: "chart_uploads",
        page: "uploads",
        category: "Uploads",
        noun: "chart period",
        messageTail: "exist without a matching final chart upload history record.",
      }, { label: `${capitalize(type)} - ${expected.label}`, problem: "No final chart upload record found" }, ["chartUploadsNeeded"]);
    }
  });
}

function auditUploads(chartUploads, weeklyUploads, ctx) {
  chartUploads.forEach((upload) => {
    const label = uploadLabel(upload);
    const status = normalizedStatus(upload);
    const summary = upload.validation_summary || {};
    if (status && !FINAL_STATUSES.has(status)) {
      pushIssue(ctx, "audit-upload-awaiting-action", {
        title: "Chart uploads awaiting action",
        module: "chart_uploads",
        page: "uploads",
        category: "Uploads",
        noun: "upload",
        messageTail: "need review, approval, publishing, or rollback.",
      }, { id: upload.id, label, problem: `Status: ${status}` }, ["chartUploadsNeeded"]);
    }
    const errorCount = Number(summary.error_count || 0);
    const warningCount = Number(summary.warning_count || 0);
    if (errorCount > 0) {
      pushIssue(ctx, "audit-upload-validation-errors", {
        title: "Upload validation errors",
        module: "chart_uploads",
        page: "uploads",
        level: "error",
        category: "Uploads",
        noun: "upload",
        messageTail: "contain validation errors.",
      }, { id: upload.id, label, problem: `${errorCount} validation errors` }, ["chartUploadsNeeded"]);
    }
    if (warningCount > 0) {
      pushIssue(ctx, "audit-upload-validation-warnings", {
        title: "Upload validation warnings",
        module: "chart_uploads",
        page: "uploads",
        category: "Uploads",
        noun: "upload",
        messageTail: "contain validation warnings.",
      }, { id: upload.id, label, problem: `${warningCount} validation warnings` }, ["chartUploadsNeeded"]);
    }
    if (!Number(upload.row_count || summary.row_count || 0)) {
      pushIssue(ctx, "audit-upload-empty", {
        title: "Chart uploads have no rows",
        module: "chart_uploads",
        page: "uploads",
        level: "error",
        category: "Uploads",
        noun: "upload",
        messageTail: "have no processed rows.",
      }, { id: upload.id, label, problem: "Row count is zero or missing" }, ["chartUploadsNeeded"]);
    }
  });

  weeklyUploads.forEach((upload) => {
    const label = `Week ${upload.week || "?"} ${monthLabel(upload.month, upload.year)} ${upload.chart_type || ""}`.trim();
    if (upload.processed === false || /^error:/i.test(String(upload.processing_notes || ""))) {
      pushIssue(ctx, "audit-weekly-upload-failed", {
        title: "Weekly uploads failed processing",
        module: "chart_uploads",
        page: "uploads",
        level: "error",
        category: "Uploads",
        noun: "weekly upload",
        messageTail: "failed processing and need cleanup.",
      }, { id: upload.id, label, problem: upload.processing_notes || "Not processed" }, ["chartUploadsNeeded"]);
    }
  });
}

function auditCertifications(certifications, ctx) {
  const duplicateGroups = new Map();
  certifications.forEach((cert) => {
    const releaseId = Number(cert.release_id ?? cert.release);
    const release = ctx.releaseById.get(releaseId);
    if (!certificationMatchesPublicScope(cert, release, ctx)) return;
    if (Number.isFinite(Number(cert.id))) ctx.certScopeIds.add(Number(cert.id));
    const label = certLabel(cert, release);
    const level = String(cert.level || "").toLowerCase();
    if (releaseId && level) addGroup(duplicateGroups, `${releaseId}|${level}`, cert);
    const missing = missingFields(cert, [
      ["release", "release"],
      ["level", "level"],
      ["total_points", "points"],
    ]);
    if (missing.length || !CERT_LEVELS.includes(level)) {
      pushIssue(ctx, "audit-certification-details-incomplete", {
        title: "Certification records incomplete",
        module: "certifications",
        page: "certifications",
        category: "Certifications",
        noun: "certification",
        messageTail: "have missing or invalid core fields.",
      }, { id: cert.id, label, problem: [...missing.map((item) => `missing ${item}`), !CERT_LEVELS.includes(level) ? `invalid level: ${cert.level || "blank"}` : ""].filter(Boolean).join("; ") }, ["incompleteMetadata"]);
    }
    const threshold = ctx.certRules.get(level);
    const points = Number(String(cert.total_points ?? cert.totalPts ?? cert.points ?? "").replace(/,/g, ""));
    if (!booleanValue(cert.is_hidden) && threshold && Number.isFinite(points) && points < threshold) {
      pushIssue(ctx, "audit-certification-below-threshold", {
        title: "Certifications below threshold",
        module: "certifications",
        page: "certifications",
        level: "error",
        category: "Certifications",
        noun: "certification",
        messageTail: "do not meet the active points threshold.",
      }, { id: cert.id, label, problem: `${points} points is below ${level} threshold ${threshold}` }, ["incompleteMetadata"]);
    }
  });

  pushDuplicateIssues(ctx, duplicateGroups, {
    id: "audit-certification-duplicate",
    title: "Duplicate certifications",
    module: "certifications",
    page: "certifications",
    category: "Certifications",
    noun: "certification group",
    messageTail: "repeat the same release and level.",
    labelFor: (group) => group.map((cert) => certLabel(cert, ctx.releaseById.get(Number(cert.release_id ?? cert.release)))).join(" / "),
  });
}

function auditCertificationRules(rules, ctx) {
  const activeRules = rules.filter((rule) => rule.active !== false);
  const byLevel = new Map();
  activeRules.forEach((rule) => {
    const level = String(rule.level || "").toLowerCase();
    if (level) addGroup(byLevel, level, rule);
    const threshold = Number(rule.threshold);
    if (!CERT_LEVELS.includes(level) || !Number.isFinite(threshold) || threshold <= 0) {
      pushIssue(ctx, "audit-certification-rule-invalid", {
        title: "Certification rules invalid",
        module: "certification_rules",
        page: "certification-rules",
        level: "error",
        category: "Certifications",
        noun: "certification rule",
        messageTail: "have invalid levels or thresholds.",
      }, { id: rule.id, label: rule.label || rule.level || `Rule #${rule.id}`, problem: `Level: ${rule.level || "blank"}, threshold: ${rule.threshold || "blank"}` }, ["incompleteMetadata"]);
    }
  });
  CERT_LEVELS.forEach((level) => {
    if (!byLevel.has(level)) {
      pushIssue(ctx, "audit-certification-rule-missing", {
        title: "Active certification rules missing",
        module: "certification_rules",
        page: "certification-rules",
        level: "error",
        category: "Certifications",
        noun: "certification level",
        messageTail: "do not have active threshold rules.",
      }, { label: capitalize(level), problem: "Missing active rule" }, ["incompleteMetadata"]);
    }
  });
  pushDuplicateIssues(ctx, byLevel, {
    id: "audit-certification-rule-duplicate",
    title: "Duplicate active certification rules",
    module: "certification_rules",
    page: "certification-rules",
    category: "Certifications",
    noun: "certification level",
    messageTail: "have more than one active rule.",
    labelFor: (group) => group.map((rule) => rule.label || rule.level || `Rule #${rule.id}`).join(" / "),
  });

  const thresholds = CERT_LEVELS.map((level) => [level, ctx.certRules.get(level)]).filter(([, value]) => Number.isFinite(value));
  thresholds.forEach(([level, threshold], index) => {
    const previous = thresholds[index - 1];
    if (previous && threshold <= previous[1]) {
      pushIssue(ctx, "audit-certification-rule-order", {
        title: "Certification thresholds are not increasing",
        module: "certification_rules",
        page: "certification-rules",
        level: "error",
        category: "Certifications",
        noun: "certification rule",
        messageTail: "break the expected gold to platinum to diamond order.",
      }, { label: capitalize(level), problem: `${threshold} is not above ${previous[0]} threshold ${previous[1]}` }, ["incompleteMetadata"]);
    }
  });
}

function auditNews(news, ctx) {
  news.forEach((article) => {
    const label = article.title || `News #${article.id}`;
    const status = normalizedStatus(article);
    const published = article.is_published || status === "published";
    if (published) {
      const missing = missingFields(article, [
        ["cover_image", "cover image"],
        ["title", "headline"],
        ["slug", "slug"],
        ["category", "category"],
        ["author", "author"],
        ["excerpt", "excerpt"],
        ["body", "body"],
        ["seo_title", "SEO title"],
        ["seo_description", "SEO description"],
      ]);
      if (missing.length) {
        pushIssue(ctx, "audit-news-published-incomplete", {
          title: "Published news incomplete",
          module: "news",
          page: "news",
          category: "News",
          noun: "article",
          messageTail: "are published but have missing editorial, media, or SEO fields.",
        }, { id: article.id, label, problem: `Missing: ${missing.join(", ")}` }, ["incompleteMetadata", ...(missing.includes("cover image") ? ["missingMedia"] : [])]);
      }
    }
    if (article.is_published && status && status !== "published") {
      pushIssue(ctx, "audit-news-status-mismatch", {
        title: "News publication flags conflict",
        module: "news",
        page: "news",
        category: "News",
        noun: "article",
        messageTail: "have conflicting status and published flags.",
      }, { id: article.id, label, problem: `is_published=true but status=${status}` }, ["incompleteMetadata"]);
    }
    if ((article.pinned || article.featured || article.breaking) && !published) {
      pushIssue(ctx, "audit-news-highlight-unpublished", {
        title: "Highlighted news is not published",
        module: "news",
        page: "news",
        category: "News",
        noun: "article",
        messageTail: "are featured, pinned, or breaking but not published.",
      }, { id: article.id, label, problem: "Highlighted article is not public" }, ["incompleteMetadata"]);
    }
    const scheduled = parseDate(article.scheduled_for);
    if (scheduled && scheduled < ctx.now && !published) {
      pushIssue(ctx, "audit-news-scheduled-overdue", {
        title: "Scheduled news is overdue",
        module: "news",
        page: "news",
        category: "News",
        noun: "article",
        messageTail: "are scheduled in the past but are not published.",
      }, { id: article.id, label, problem: `Scheduled for ${scheduled.toLocaleString()}` }, ["incompleteMetadata"]);
    }
  });
}

function auditPageContent(rows, ctx) {
  const duplicateGroups = new Map();
  rows.forEach((row) => {
    const label = [row.page, row.section].filter(Boolean).join(" / ") || `Page content #${row.id}`;
    addGroup(duplicateGroups, `${normalizeName(row.page)}|${normalizeName(row.section)}`, row);
    if (row.is_visible) {
      const missing = missingFields(row, [
        ["page", "page"],
        ["section", "section"],
        ["title", "title"],
        ["content", "content"],
        ["display_order", "display order"],
      ]);
      if (missing.length) {
        pushIssue(ctx, "audit-page-content-visible-empty", {
          title: "Visible page content incomplete",
          module: "page_content",
          page: "page-content",
          category: "Page content",
          noun: "content block",
          messageTail: "are visible but incomplete.",
        }, { id: row.id, label, problem: `Missing: ${missing.join(", ")}` }, ["incompleteMetadata"]);
      }
    }
    const dataProblem = jsonProblem(row.data, "section data");
    if (dataProblem) {
      pushIssue(ctx, "audit-page-content-json-invalid", {
        title: "Page content JSON invalid",
        module: "page_content",
        page: "page-content",
        category: "Page content",
        noun: "content block",
        messageTail: "have invalid section data JSON.",
      }, { id: row.id, label, problem: dataProblem }, ["incompleteMetadata"]);
    }
  });
  pushDuplicateIssues(ctx, duplicateGroups, {
    id: "audit-page-content-duplicate",
    title: "Duplicate page content sections",
    module: "page_content",
    page: "page-content",
    category: "Page content",
    noun: "content section",
    messageTail: "repeat the same page and section.",
    labelFor: (group) => group.map((row) => [row.page, row.section].filter(Boolean).join(" / ") || `#${row.id}`).join(" / "),
  });
}

function auditMedia(media, ctx) {
  media.forEach((item) => {
    const label = item.title || item.file || `Media #${item.id}`;
    const missing = missingFields(item, [
      ["file", "file"],
      ["title", "title"],
      ["folder", "folder"],
      ["alt_text", "alt text"],
      ["usage_notes", "usage notes"],
    ]);
    if (missing.length) {
      pushIssue(ctx, "audit-media-details-incomplete", {
        title: "Media library metadata incomplete",
        module: "media",
        page: "media",
        category: "Media",
        noun: "media asset",
        messageTail: "have incomplete file, alt text, folder, or usage metadata.",
      }, { id: item.id, label, problem: `Missing: ${missing.join(", ")}` }, ["incompleteMetadata", ...(missing.includes("file") ? ["missingMedia"] : [])]);
    }
  });
}

function auditReports(reports, ctx) {
  reports.forEach((report) => {
    const status = normalizedStatus(report);
    if (OPEN_REPORT_STATUSES.has(status)) {
      const severity = String(report.severity || "").toLowerCase();
      pushIssue(ctx, "audit-open-quality-reports", {
        title: "Open data quality reports",
        module: "reports",
        page: "reports",
        level: ["critical", "high", "error"].includes(severity) ? "error" : "warning",
        category: "Reports",
        noun: "quality report",
        messageTail: "are still open.",
      }, { id: report.id, label: report.description || report.issue_type || `Report #${report.id}`, problem: `${report.module || "CMS"} / ${report.issue_type || "Issue"} / ${severity || "severity unset"}` }, ["incompleteMetadata"]);
    }
  });
}

function auditBackups(backups, ctx) {
  if (!backups.length) {
    pushIssue(ctx, "audit-backup-missing", {
      title: "No CMS backups found",
      module: "backups",
      page: "backups",
      level: "error",
      category: "Backups",
      noun: "backup schedule",
      messageTail: "need attention because no backup history is available.",
    }, { label: "Backups", problem: "No backup records found" }, ["incompleteMetadata"]);
    return;
  }
  const latest = [...backups].sort((a, b) => Number(parseDate(b.created_at)) - Number(parseDate(a.created_at)))[0];
  const label = latest.file || `Backup #${latest.id}`;
  const status = normalizedStatus(latest);
  if (["failed", "error", "rejected"].includes(status)) {
    pushIssue(ctx, "audit-backup-latest-failed", {
      title: "Latest backup failed",
      module: "backups",
      page: "backups",
      level: "error",
      category: "Backups",
      noun: "backup",
      messageTail: "need attention because the latest backup failed.",
    }, { id: latest.id, label, problem: `Status: ${status}` }, ["incompleteMetadata"]);
  }
  const created = parseDate(latest.created_at);
  if (!created || ctx.now - created > 7 * 24 * 60 * 60 * 1000) {
    pushIssue(ctx, "audit-backup-stale", {
      title: "CMS backup is stale",
      module: "backups",
      page: "backups",
      category: "Backups",
      noun: "backup",
      messageTail: "are older than seven days or missing timestamps.",
    }, { id: latest.id, label, problem: created ? `Latest backup: ${created.toLocaleString()}` : "Missing created timestamp" }, ["incompleteMetadata"]);
  }
}

function auditUrlFields(ctx, row, fields, meta) {
  fields.forEach(([field, name, hostPattern]) => {
    const value = row[field];
    if (!hasValue(value)) return;
    const problem = urlProblem(value, hostPattern, name);
    if (!problem) return;
    pushIssue(ctx, meta.alertId, {
      title: meta.title,
      module: meta.module,
      page: meta.page,
      category: meta.category,
      noun: meta.noun,
      messageTail: "are invalid, insecure, or point to the wrong platform.",
    }, { id: row.id, label: meta.label, problem: `${name}: ${problem}` }, ["invalidUrls"]);
  });
}

function auditJsonUrls(ctx, row, field, meta) {
  const parsed = parseMaybeJson(row[field]);
  if (parsed.error) {
    pushIssue(ctx, `${meta.alertId}-json`, {
      title: meta.title,
      module: meta.module,
      page: meta.page,
      category: meta.category,
      noun: meta.noun,
      messageTail: "cannot be checked because their JSON is invalid.",
    }, { id: row.id, label: meta.label, problem: parsed.error }, ["invalidUrls"]);
    return;
  }
  extractUrls(parsed.value).forEach((url) => {
    const problem = urlProblem(url, null, "URL");
    if (problem) {
      pushIssue(ctx, meta.alertId, {
        title: meta.title,
        module: meta.module,
        page: meta.page,
        category: meta.category,
        noun: meta.noun,
        messageTail: "are invalid or insecure.",
      }, { id: row.id, label: meta.label, problem: `${url}: ${problem}` }, ["invalidUrls"]);
    }
  });
}

function pushDuplicateIssues(ctx, groups, meta) {
  for (const group of groups.values()) {
    const rows = duplicateRows(group);
    if (rows.length < 2) continue;
    const signals = duplicateSignals(group);
    pushIssue(ctx, meta.id, {
      title: meta.title,
      module: meta.module,
      page: meta.page,
      category: meta.category,
      noun: meta.noun,
      messageTail: meta.messageTail,
    }, {
      id: rows[0]?.id,
      label: meta.labelFor(rows),
      problem: signals.length
        ? `${rows.length} records matched: ${signals.slice(0, 4).join("; ")}`
        : `${rows.length} records share the same key`,
    }, ["incompleteMetadata"]);
  }
}

// Detects a "typed-not-linked" duo/group act: raw credit text that would be
// split into separate chart-credited members (see splitCreditNames in
// utils/chartHelpers.js) but exactly matches an existing single Artist
// record's name — i.e. the act is already registered as one entity, it just
// needs to be linked instead of retyped as free text. Left unlinked, chart
// aggregation keeps re-deriving the split members every rebuild, so deleting
// or merging the accidental standalone member (e.g. "Dorcas" out of
// "Vestine & Dorcas") never sticks.
const SPLITTABLE_CREDIT = /[,&]|\bft\.?\b|\bfeat\.?\b|\bfeaturing\b/i;

function buildArtistNameIndex(artists) {
  const index = new Map();
  artists.forEach((artist) => {
    [artist.name, artist.display_name, artist.public_name].forEach((value) => {
      const key = normalizeName(value);
      if (key) index.set(key, artist);
    });
  });
  return index;
}

function compoundArtistCreditProblem(release, ctx) {
  if (!ctx.artistByName.size) return "";
  const linkedIds = new Set([
    ...releaseArtistIds(release),
    ...(Array.isArray(release.featured_artist_ids)
      ? release.featured_artist_ids.map((id) => Number(id)).filter(Boolean)
      : []),
    ...(Array.isArray(release.featured_artist_profiles)
      ? release.featured_artist_profiles.map((artist) => Number(artist?.id)).filter(Boolean)
      : []),
  ]);
  const candidates = [
    release.artist_display, release.artist_credit, release.a, release.artist,
    release.artist_name, release.primary_artist, release.pa,
    release.featured_artist_credit, release.featured_artists, release.fa,
  ];
  const matches = [];
  new Set(candidates.filter(hasValue).map(stringValue)).forEach((text) => {
    if (!SPLITTABLE_CREDIT.test(text)) return;
    const artist = ctx.artistByName.get(normalizeName(text));
    if (artist && !linkedIds.has(Number(artist.id))) {
      matches.push(`"${text}" matches artist record "${artistLabel(artist)}" (id ${artist.id})`);
    }
  });
  return matches.join("; ");
}

function buildCountryContext(countries) {
  const byCode = new Map();
  const byName = new Map();
  countries.forEach((country) => {
    const code = normalizeCode(country.code);
    if (code) byCode.set(code, country);
    const name = normalizeCountryName(country.name);
    if (name) byName.set(name, country);
  });
  [
    ["usa", "US"], ["u s a", "US"], ["america", "US"], ["united states", "US"],
    ["uk", "GB"], ["u k", "GB"], ["britain", "GB"], ["united kingdom", "GB"],
    ["south korea", "KR"], ["korea", "KR"], ["tanzania", "TZ"],
  ].forEach(([alias, code]) => {
    const country = byCode.get(code);
    if (country) byName.set(normalizeCountryName(alias), country);
  });
  return { byCode, byName };
}

function buildCertificationRules(rules) {
  const result = new Map();
  rules.forEach((rule) => {
    if (rule.active === false) return;
    const level = String(rule.level || "").toLowerCase();
    const threshold = Number(rule.threshold);
    if (CERT_LEVELS.includes(level) && Number.isFinite(threshold) && threshold > 0 && !result.has(level)) {
      result.set(level, threshold);
    }
  });
  return result;
}

function genericArtistCountryExempt(artist) {
  return [artist?.name, artist?.display_name, artist?.public_name, artistLabel(artist)]
    .filter(hasValue)
    .some((value) => GENERIC_ARTIST_COUNTRY_EXEMPTIONS.has(normalizeName(value)));
}

function countryProblemFor(row, countryContext) {
  const country = stringValue(row.country);
  const code = normalizeCode(row.country_code);
  const problems = [];
  if (!country && !code) problems.push("Missing country and country code");
  else if (!country) problems.push(`Missing country name for code ${code}`);
  else if (!code) problems.push(`Missing country code for ${country}`);
  if (country && QUESTIONABLE_COUNTRY.test(country)) problems.push(`Country value looks unsure: ${country}`);
  if (code && !/^[A-Z]{2}$/.test(code)) {
    problems.push(`Country code is not two letters: ${row.country_code}`);
  } else if (code && countryContext.byCode.size && !countryContext.byCode.has(code)) {
    problems.push(`Country code ${code} is not configured in Countries`);
  }
  if (country && code && countryContext.byCode.has(code)) {
    const configured = countryContext.byCode.get(code);
    const configuredName = normalizeCountryName(configured.name);
    const currentName = normalizeCountryName(country);
    const alias = countryContext.byName.get(currentName);
    if (configuredName && currentName && configuredName !== currentName && normalizeCode(alias?.code) !== code) {
      problems.push(`Country/code mismatch: ${country} is paired with ${code} (${configured.name})`);
    }
  }
  return problems.join("; ");
}

function urlProblem(value, hostPattern, expectedName) {
  const raw = stringValue(value);
  if (!raw) return "";
  if (!/^https?:\/\//i.test(raw)) return "missing http:// or https://";
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return "not a valid URL";
  }
  if (!["http:", "https:"].includes(parsed.protocol)) return "unsupported URL protocol";
  if (parsed.protocol === "http:") return "uses insecure http";
  if (hostPattern && !hostPattern.test(parsed.hostname)) return `does not look like a ${expectedName} URL`;
  return "";
}

function mediaUrlProblem(value) {
  const raw = stringValue(value);
  if (!raw || raw.startsWith("/") || /^data:/i.test(raw)) return "";
  if (/^https?:\/\//i.test(raw)) return urlProblem(raw, null, "media");
  return "file value is neither a relative media path nor a valid URL";
}

function jsonProblem(value, label) {
  const parsed = parseMaybeJson(value);
  return parsed.error ? `${label}: ${parsed.error}` : "";
}

function parseMaybeJson(value) {
  if (!hasValue(value)) return { value: null };
  if (typeof value === "object") return { value };
  try {
    return { value: JSON.parse(String(value)) };
  } catch (error) {
    return { error: error.message || "invalid JSON" };
  }
}

function extractUrls(value) {
  const urls = [];
  const visit = (item) => {
    if (!item) return;
    if (typeof item === "string") {
      urls.push(item);
      return;
    }
    if (Array.isArray(item)) {
      item.forEach(visit);
      return;
    }
    if (typeof item === "object") {
      ["url", "href", "src", "image", "cover_image"].forEach((key) => {
        if (hasValue(item[key])) urls.push(String(item[key]));
      });
      Object.values(item).forEach((child) => {
        if (typeof child === "object") visit(child);
      });
    }
  };
  visit(value);
  return urls.filter(Boolean);
}

function releaseDateProblem(release, now) {
  const problems = [];
  const year = Number(release.release_year);
  const date = parseDate(release.release_date);
  if (hasValue(release.release_year) && (!Number.isInteger(year) || !validYear(year, now))) {
    problems.push(`Invalid release year: ${release.release_year}`);
  }
  if (hasValue(release.release_date) && !date) problems.push(`Invalid release date: ${release.release_date}`);
  if (date && Number.isInteger(year) && date.getFullYear() !== year) {
    problems.push(`Release year ${year} does not match date ${date.getFullYear()}`);
  }
  return problems.join("; ");
}

function expectedChartPeriod(now) {
  const date = new Date(now);
  const lag = date.getDate() <= 7 ? 2 : 1;
  return periodFromDate(new Date(date.getFullYear(), date.getMonth() - lag, 1));
}

function periodFromDate(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return { year, month, key: periodKey(year, month), label: monthLabel(month, year) };
}

function periodKey(year, month) {
  const y = Number(year);
  const m = Number(month);
  if (!Number.isInteger(y) || !Number.isInteger(m)) return "";
  return `${y}-${String(m).padStart(2, "0")}`;
}

function chartPeriodKey(chart) {
  return periodKey(chart.year, chart.month);
}

function isFuturePeriodKey(key, now) {
  const current = periodKey(now.getFullYear(), now.getMonth() + 1);
  return key > current;
}

function monthLabel(month, year) {
  const m = Number(month);
  const y = Number(year);
  if (!Number.isInteger(m) || !Number.isInteger(y)) return [month, year].filter(Boolean).join(" ");
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function validYear(value, now) {
  const year = Number(value);
  return Number.isInteger(year) && year >= 1950 && year <= now.getFullYear() + 1;
}

function validMonth(value) {
  const month = Number(value);
  return Number.isInteger(month) && month >= 1 && month <= 12;
}

function hasValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function hasNumber(value) {
  return Number.isFinite(Number(value));
}

function hasMedia(value) {
  const raw = stringValue(value);
  return Boolean(raw && !/placeholder|default|missing|no[-_ ]?image/i.test(raw));
}

function stringValue(value) {
  return String(value ?? "").trim();
}

function booleanValue(value) {
  if (value === true || value === 1) return true;
  if (typeof value === "string") return /^(true|1|yes)$/i.test(value.trim());
  return false;
}

function missingFields(row, fields) {
  return fields.filter(([field]) => !hasValue(row[field])).map(([, label]) => label);
}

function normalizedStatus(row) {
  return String(row.status || row.state || "").trim().toLowerCase();
}

function normalizeName(value) {
  return stringValue(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeCountryName(value) {
  return normalizeName(value).replace(/^the\s+/, "");
}

function normalizeCode(value) {
  return stringValue(value).toUpperCase();
}

function profileLabel(profile) {
  return profile?.display_name || profile?.public_name || profile?.name || profile?.artist_name || "";
}

function releaseTitleValue(row = {}) {
  return row.title || row.t || row.canonical_title || row.release_title || row.name || "";
}

function releaseArtistValue(row = {}) {
  return (
    row.artist_display ||
    row.artist_credit ||
    row.artist_name ||
    row.primary_artist ||
    row.pa ||
    row.a ||
    row.artist ||
    profileLabel(Array.isArray(row.primary_artists) ? row.primary_artists[0] : null) ||
    profileLabel(Array.isArray(row.artists) ? row.artists[0] : null)
  );
}

function releaseLookupKey(row = {}) {
  const title = normalizeName(releaseTitleValue(row));
  const artist = normalizeName(releaseArtistValue(row));
  return title && artist ? `${title}|${artist}` : "";
}

function addGroup(map, key, item) {
  if (!key) return;
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(item);
}

function artistLabel(artist) {
  return artist?.display_name || artist?.public_name || artist?.name || `Artist #${artist?.id || "?"}`;
}

function releaseLabel(release) {
  return [
    release?.title || release?.canonical_title || `Release #${release?.id || "?"}`,
    release?.artist_display || release?.artist_name || release?.primary_artist,
  ].filter(Boolean).join(" - ");
}

function chartLabel(chart) {
  return chart?.label || `${capitalize(chart?.chart_type || "chart")} ${monthLabel(chart?.month, chart?.year)}`;
}

function uploadLabel(upload) {
  return [
    capitalize(upload.chart_type || "chart"),
    upload.platform_name || upload.platform || "Combined",
    monthLabel(upload.month, upload.year),
  ].filter(Boolean).join(" - ");
}

function certLabel(cert, release) {
  return [
    release ? releaseLabel(release) : (cert.title || cert.release_title || `Release #${cert.release_id ?? cert.release ?? "?"}`),
    cert.level,
  ].filter(Boolean).join(" - ");
}

function releaseArtistIds(release) {
  const fromList = (value) => Array.isArray(value)
    ? value.map((item) => Number(item?.id ?? item?.value ?? item)).filter(Boolean)
    : [];
  return [
    ...fromList(release.primary_artist_ids),
    ...fromList(release.primary_artists),
    Number(release.artist_id ?? release.artist) || null,
  ].filter(Boolean);
}

function releaseHasPrimaryArtist(release) {
  return releaseArtistIds(release).length > 0 || hasValue(release.artist_display || release.artist_name || release.primary_artist);
}

function releaseHasFeaturedArtistLinks(release) {
  const ids = Array.isArray(release.featured_artist_ids) ? release.featured_artist_ids.filter(Boolean) : [];
  const profiles = Array.isArray(release.featured_artist_profiles) ? release.featured_artist_profiles : [];
  return ids.length > 0 || profiles.length > 0;
}

function firstLeadArtist(release, artistById) {
  const id = releaseArtistIds(release)[0];
  return id ? artistById.get(Number(id)) : null;
}

function parseDate(value) {
  if (!hasValue(value)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function plural(noun, count) {
  if (count === 1) return noun;
  if (noun.endsWith("y")) return `${noun.slice(0, -1)}ies`;
  if (noun.endsWith("s")) return noun;
  return `${noun}s`;
}

function capitalize(value) {
  const text = stringValue(value);
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}
