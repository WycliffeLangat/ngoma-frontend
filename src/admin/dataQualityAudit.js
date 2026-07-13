import { getResults } from "./api.js";

const PAGE_SIZE = 500;
const MAX_ALERT_DETAILS = 14;
const FINAL_STATUSES = new Set(["approved", "published", "complete", "completed", "processed", "archived"]);
const OPEN_REPORT_STATUSES = new Set(["open", "new", "todo", "pending", "in_progress", "needs_attention"]);
const RELEASE_TYPES = ["singles", "albums"];
const CERT_LEVELS = ["gold", "platinum", "diamond"];

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
  const settled = await Promise.allSettled(
    RESOURCE_REQUESTS.map((request) => fetchAllCmsResults(api, request))
  );
  const records = {};
  const loadWarnings = [];

  settled.forEach((result, index) => {
    const request = RESOURCE_REQUESTS[index];
    if (result.status === "fulfilled") {
      records[request.key] = result.value;
    } else {
      records[request.key] = [];
      loadWarnings.push(`${request.label}: ${result.reason?.message || "unavailable"}`);
    }
  });

  return {
    ...auditCmsRecords(records, options),
    loadWarnings,
  };
}

export function mergeDashboardAudit(data, audit) {
  if (!audit) return data;
  return {
    ...data,
    cards: { ...(data?.cards || {}), ...(audit.cards || {}) },
    alerts: mergeAlerts(data?.alerts || [], audit.alerts || []),
    auditCoverage: audit.coverage,
    auditSummary: audit.summary,
    auditLoadWarnings: audit.loadWarnings || [],
  };
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
  const releases = [...(records.songs || []), ...(records.albums || [])];
  const releaseById = new Map(releases.map((release) => [Number(release.id), release]));
  const certRules = buildCertificationRules(records.certificationRules || []);

  const ctx = {
    now,
    buckets,
    summary,
    countryContext,
    artistById,
    releaseById,
    certRules,
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
    coverage: { recordCount, moduleCount, checkedAt: now.toISOString() },
    summary,
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

function auditArtists(artists, ctx) {
  const nameGroups = new Map();
  artists.forEach((artist) => {
    const status = normalizedStatus(artist);
    const label = artistLabel(artist);
    const inactive = ["archived", "inactive"].includes(status);
    const key = normalizeName(artist.display_name || artist.name);
    if (key) addGroup(nameGroups, key, artist);
    if (inactive) return;

    if (!hasMedia(artist.image || artist.image_url || artist.profile_image || artist.photo)) {
      pushIssue(ctx, "audit-artist-image-missing", {
        title: "Artist images missing",
        module: "artists",
        page: "artists",
        category: "Media",
        noun: "artist profile",
        messageTail: "are missing profile images.",
      }, { id: artist.id, label, problem: "Missing artist image" }, ["missingMedia"]);
    }

    const missing = missingFields(artist, [
      ["name", "artist name"],
      ["display_name", "display name"],
      ["slug", "slug"],
      ["country", "country"],
      ["country_code", "country code"],
      ["city_region", "city/region"],
      ["genre", "genre"],
      ["artist_type", "artist type"],
      ["biography", "biography"],
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

    const countryProblem = countryProblemFor(artist, ctx.countryContext);
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

    if (hasNumber(artist.total_releases) && Number(artist.total_releases) > 0 && !artist.verified) {
      pushIssue(ctx, "audit-artist-verification-missing", {
        title: "Credited artists are unverified",
        module: "artists",
        page: "artists",
        category: "Artists",
        noun: "artist profile",
        messageTail: "have releases but are not marked verified.",
      }, { id: artist.id, label, problem: "Artist has catalogue activity but is not verified" }, ["incompleteMetadata"]);
    }

    auditUrlFields(ctx, artist, SOCIAL_URL_FIELDS, {
      alertId: "audit-artist-invalid-url",
      title: "Artist profile URLs need cleanup",
      module: "artists",
      page: "artists",
      category: "URLs",
      noun: "artist URL",
      label,
    });

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

  pushDuplicateIssues(ctx, nameGroups, {
    id: "audit-artist-duplicate-name",
    title: "Possible duplicate artists",
    module: "artists",
    page: "duplicate-review",
    category: "Duplicates",
    noun: "artist name group",
    messageTail: "look like duplicate artist records.",
    labelFor: (group) => group.map(artistLabel).join(" / "),
  });
}

function auditReleases(releases, chartType, ctx) {
  const page = chartType === "albums" ? "albums" : "songs";
  const releaseName = chartType === "albums" ? "album" : "song";
  const duplicateGroups = new Map();

  releases.forEach((release) => {
    const status = normalizedStatus(release);
    if (["archived", "inactive"].includes(status)) return;
    const label = releaseLabel(release);
    const artistIds = releaseArtistIds(release);
    const duplicateKey = [
      chartType,
      normalizeName(release.title || release.canonical_title),
      artistIds.join(",") || normalizeName(release.artist_display || release.artist_name || release.primary_artist),
    ].join("|");
    if (!duplicateKey.includes("||")) addGroup(duplicateGroups, duplicateKey, release);

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
      ["canonical_title", "canonical title"],
      ["status", "status"],
      ["country", "country"],
      ["country_code", "country code"],
      ["genre", "genre"],
      ["label", "label"],
      ["distributor", "distributor"],
    ];
    if (!releaseHasPrimaryArtist(release)) required.push(["primary_artist_ids", "main artists"]);
    if (!release.release_date && !release.release_year) required.push(["release_date", "release date or year"]);
    if (chartType === "singles") {
      required.push(["isrc", "ISRC"], ["songwriters", "songwriters"], ["producers", "producers"]);
    } else {
      required.push(["upc", "UPC"], ["number_of_tracks", "number of tracks"]);
    }
    const missing = missingFields(release, required);
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

    const countryProblem = countryProblemFor(release, ctx.countryContext);
    const leadArtist = firstLeadArtist(release, ctx.artistById);
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

    const codeProblem = releaseCodeProblem(release, chartType);
    if (codeProblem) {
      pushIssue(ctx, `audit-${releaseName}-codes-questionable`, {
        title: `${capitalize(releaseName)} catalogue codes need cleanup`,
        module: "releases",
        page,
        category: "Details",
        noun: releaseName,
        messageTail: "have missing or invalid ISRC/UPC metadata.",
      }, { id: release.id, label, problem: codeProblem }, ["incompleteMetadata"]);
    }

    if (hasValue(release.featured_artists) && !releaseHasFeaturedArtistLinks(release)) {
      pushIssue(ctx, `audit-${releaseName}-featured-unlinked`, {
        title: `${capitalize(releaseName)} featured artists are unlinked`,
        module: "releases",
        page,
        category: "Artists",
        noun: releaseName,
        messageTail: "use text-only featured credits that should be linked to artist records.",
      }, { id: release.id, label, problem: `Unlinked featured names: ${stringValue(release.featured_artists)}` }, ["incompleteMetadata"]);
    }

    auditUrlFields(ctx, release, SOCIAL_URL_FIELDS, {
      alertId: `audit-${releaseName}-invalid-url`,
      title: `${capitalize(releaseName)} URLs need cleanup`,
      module: "releases",
      page,
      category: "URLs",
      noun: `${releaseName} URL`,
      label,
    });
  });

  pushDuplicateIssues(ctx, duplicateGroups, {
    id: `audit-${releaseName}-duplicate-title`,
    title: `Possible duplicate ${releaseName}s`,
    module: "releases",
    page,
    category: "Duplicates",
    noun: `${releaseName} group`,
    messageTail: `look like duplicate ${releaseName} records.`,
    labelFor: (group) => group.map(releaseLabel).join(" / "),
  });
}

function auditCountries(countries, records, ctx) {
  const codeGroups = new Map();
  const orderGroups = new Map();
  countries.forEach((country) => {
    const label = country.name || country.code || `Country #${country.id}`;
    const code = normalizeCode(country.code);
    if (code) addGroup(codeGroups, code, country);
    if (hasValue(country.display_order)) addGroup(orderGroups, String(country.display_order), country);
    const missing = missingFields(country, [
      ["name", "country name"],
      ["code", "country code"],
      ["region", "region"],
      ["flag", "flag/initial"],
      ["display_order", "display order"],
    ]);
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
  pushDuplicateIssues(ctx, orderGroups, {
    id: "audit-country-order-duplicate",
    title: "Country display order duplicates",
    module: "countries",
    page: "countries",
    category: "Countries",
    noun: "display order",
    messageTail: "are used by multiple countries.",
    labelFor: (group) => group.map((country) => country.name || country.code).join(" / "),
  });

  const activeByCode = new Map(countries.map((country) => [normalizeCode(country.code), country]));
  [...(records.artists || []), ...(records.songs || []), ...(records.albums || [])].forEach((row) => {
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
    if (cert.is_official && !hasValue(cert.certification_date)) {
      pushIssue(ctx, "audit-certification-official-date-missing", {
        title: "Official certifications missing dates",
        module: "certifications",
        page: "certifications",
        category: "Certifications",
        noun: "certification",
        messageTail: "are official but do not have certification dates.",
      }, { id: cert.id, label, problem: "Missing certification date" }, ["incompleteMetadata"]);
    }
    if (!cert.is_official && cert.is_hidden !== true) {
      pushIssue(ctx, "audit-certification-unofficial-visible", {
        title: "Unofficial certifications are visible",
        module: "certifications",
        page: "certifications",
        category: "Certifications",
        noun: "certification",
        messageTail: "are not official but are not hidden.",
      }, { id: cert.id, label, problem: "Mark official or hide from public surfaces" }, ["incompleteMetadata"]);
    }
    const threshold = ctx.certRules.get(level);
    const points = Number(cert.total_points);
    if (threshold && Number.isFinite(points) && points < threshold) {
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
    if (cert.is_official && !hasValue(cert.notes)) {
      pushIssue(ctx, "audit-certification-notes-missing", {
        title: "Official certifications missing notes",
        module: "certifications",
        page: "certifications",
        category: "Certifications",
        noun: "certification",
        messageTail: "should include notes/source context.",
      }, { id: cert.id, label, problem: "Missing notes/source context" }, ["incompleteMetadata"]);
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
    auditJsonUrls(ctx, article, "source_links", {
      alertId: "audit-news-invalid-url",
      title: "News source URLs need cleanup",
      module: "news",
      page: "news",
      category: "URLs",
      noun: "news source URL",
      label,
    });
    auditJsonUrls(ctx, article, "gallery", {
      alertId: "audit-news-gallery-invalid-url",
      title: "News gallery URLs need cleanup",
      module: "news",
      page: "news",
      category: "URLs",
      noun: "news gallery URL",
      label,
    });
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
    if (hasValue(item.file)) {
      const problem = mediaUrlProblem(item.file);
      if (problem) {
        pushIssue(ctx, "audit-media-url-invalid", {
          title: "Media file URLs need cleanup",
          module: "media",
          page: "media",
          category: "URLs",
          noun: "media asset",
          messageTail: "have invalid file URLs.",
        }, { id: item.id, label, problem }, ["invalidUrls"]);
      }
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
    if (group.length < 2) continue;
    pushIssue(ctx, meta.id, {
      title: meta.title,
      module: meta.module,
      page: meta.page,
      category: meta.category,
      noun: meta.noun,
      messageTail: meta.messageTail,
    }, {
      id: group[0]?.id,
      label: meta.labelFor(group),
      problem: `${group.length} records share the same key`,
    }, ["incompleteMetadata"]);
  }
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

function releaseCodeProblem(release, chartType) {
  const problems = [];
  if (hasValue(release.isrc) && !/^[A-Z]{2}[A-Z0-9]{3}\d{7}$/i.test(String(release.isrc).replace(/[-\s]/g, ""))) {
    problems.push(`Invalid ISRC: ${release.isrc}`);
  }
  if (chartType === "singles" && !hasValue(release.isrc)) problems.push("Missing ISRC");
  if (hasValue(release.upc) && !/^\d{12,14}$/.test(String(release.upc).replace(/[-\s]/g, ""))) {
    problems.push(`Invalid UPC: ${release.upc}`);
  }
  if (chartType === "albums") {
    if (!hasValue(release.upc)) problems.push("Missing UPC");
    const tracks = Number(release.number_of_tracks);
    if (!Number.isFinite(tracks) || tracks < 1) problems.push("Invalid number of tracks");
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
