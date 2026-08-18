import { cmsApi, clearCmsCache, getResults } from "./api.js";
import { getAffectedChartScopes, rerankAffectedChartScopes } from "./chartRankMaintenance.js";
import { syncChartEntryCredits } from "./chartEntryCreditSync.js";
import { releaseYearFromDate } from "./releaseDateDefaults.js";
import { buildCountryCodeIndex } from "../utils/countryCodes.js";

const PAGE_ENDPOINTS = {
  artists: "/artists/",
  songs: "/releases/",
  albums: "/releases/",
  countries: "/countries/",
  platforms: "/platforms/",
  charts: "/charts/",
  certifications: "/certifications/",
  "certification-rules": "/certification-rules/",
  news: "/news/",
  "page-content": "/page-content/",
  media: "/media/",
  reports: "/reports/",
  backups: "/backups/",
};

const PAGE_LABELS = {
  artists: "Artists",
  songs: "Songs",
  albums: "Albums",
  countries: "Countries",
  platforms: "Platforms",
  charts: "Chart periods",
  "chart-entries": "Chart entries",
  uploads: "Imports and uploads",
  certifications: "Certifications",
  "certification-rules": "Certification rules",
  news: "News",
  "page-content": "Page content",
  media: "Media library",
  reports: "Data quality reports",
  backups: "Backups",
  "duplicate-review": "Duplicate review",
};

const URL_FIELD_BY_LABEL = {
  Spotify: "spotify_url",
  "Apple Music": "apple_music_url",
  YouTube: "youtube_url",
  Boomplay: "boomplay_url",
  Audiomack: "audiomack_url",
  TikTok: "tiktok_url",
  Instagram: "instagram_url",
  X: "x_url",
  Facebook: "facebook_url",
  Shazam: "shazam_url",
  Website: "website_url",
};

const STATUS_DONE = "resolved";
const DEFAULT_PLATFORM_COLOR = "#111111";
const NGOMA_GOLD = "#C97A12";
const DEFAULT_CERTIFICATION_RULES = [
  { level: "diamond", threshold: 600 },
  { level: "platinum", threshold: 400 },
  { level: "gold", threshold: 200 },
];

function endpointForPage(page) {
  return PAGE_ENDPOINTS[page] || null;
}

function pageLabel(page) {
  return PAGE_LABELS[page] || page || "CMS section";
}

function isReleasePage(page) {
  return page === "songs" || page === "albums";
}

function optionId(value) {
  const raw = value && typeof value === "object" ? (value.value ?? value.id) : value;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function numberValue(value) {
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function artistIdsFrom(release, idField, profileField) {
  if (Array.isArray(release?.[idField])) {
    const ids = release[idField].map(optionId).filter(Boolean);
    if (ids.length) return ids;
  }
  const profiles = Array.isArray(release?.[profileField]) ? release[profileField] : [];
  return profiles.map(optionId).filter(Boolean);
}

function firstLeadArtistProfile(release) {
  const profiles = Array.isArray(release?.primary_artists) ? release.primary_artists : [];
  return profiles.find((artist) => optionId(artist)) || null;
}

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizeName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/^the\s+/, "");
}

function cleanPatch(patch) {
  return Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined)
  );
}

function mutationSolution({ id, label, description, run, tone = "primary" }) {
  return { id, kind: "mutation", label, description, run, tone };
}

function guidanceSolution({ id, label, description, fields = [], actionLabel = "Review fields", tone = "light" }) {
  return {
    id,
    kind: "guidance",
    label,
    description,
    fields,
    actionLabel,
    tone,
    confirmation: "Use the highlighted fields below, save the entry, then the dashboard audit will re-check it.",
  };
}

function navigateSolution(page, detail) {
  if (!page) return null;
  return {
    id: "open-entry",
    kind: "navigate",
    label: detail?.id ? "Open this entry" : `Open ${pageLabel(page)}`,
    description: detail?.id
      ? "Review every field in the regular CMS editor before saving."
      : "Go to the right CMS section to complete the manual review.",
    page,
    search: detail?.label || "",
    recordId: detail?.id ?? null,
  };
}

const FIELD_BY_LABEL = {
  "artist name": "name",
  "display name": "display_name",
  slug: "slug",
  country: "country",
  "country code": "country_code",
  "city/region": "city_region",
  region: "region",
  "flag/initial": "flag",
  "display order": "display_order",
  genre: "genre",
  "artist type": "artist_type",
  biography: "biography",
  status: "status",
  image: "image",
  "artist image": "image",
  title: "title",
  headline: "title",
  "canonical title": "canonical_title",
  "main artists": "artist_credits",
  "release date": "release_date",
  "release date or year": "release_date",
  "cover image": "cover_image",
  label: "label",
  distributor: "distributor",
  songwriters: "songwriters",
  producers: "producers",
  "number of tracks": "number_of_tracks",
  name: "name",
  "short name": "short_name",
  color: "color",
  "brand color": "brand_color",
  "max chart size": "max_chart_size",
  "points base": "points_base",
  "points method": "points_method",
  year: "year",
  month: "month",
  "chart type": "chart_type",
  release: "release",
  level: "level",
  points: "total_points",
  threshold: "threshold",
  category: "category",
  author: "author",
  excerpt: "excerpt",
  body: "body",
  "seo title": "seo_title",
  "seo description": "seo_description",
  page: "page",
  section: "section",
  content: "content",
  file: "file",
  folder: "folder",
  "alt text": "alt_text",
  "usage notes": "usage_notes",
};

function problemFields(problem = "") {
  const text = String(problem || "");
  const missingMatch = text.match(/missing:\s*([^;]+)/i);
  const labels = missingMatch
    ? missingMatch[1].split(/,\s*/)
    : [text.split(":")[0]];
  return labels
    .map((label) => FIELD_BY_LABEL[String(label || "").trim().toLowerCase()])
    .filter(Boolean);
}

async function fetchRecord(page, detail) {
  const endpoint = endpointForPage(page);
  if (!endpoint || !detail?.id) return { record: null, error: "" };
  try {
    return { record: await cmsApi.get(`${endpoint}${detail.id}/`), error: "" };
  } catch (error) {
    return { record: null, error: error.message || "Could not load this entry." };
  }
}

async function patchRecord(page, id, patch) {
  const endpoint = endpointForPage(page);
  if (!endpoint || !id) throw new Error("This alert cannot be patched from the dashboard.");
  await cmsApi.patch(`${endpoint}${id}/`, cleanPatch(patch));
  return `${pageLabel(page)} entry updated. The dashboard audit will re-check it now.`;
}

async function patchReleaseEverywhere(releaseId, patch, { syncCredits = false } = {}) {
  const scopes = await getAffectedChartScopes(releaseId);
  await cmsApi.patch(`/releases/${releaseId}/`, cleanPatch(patch));
  const syncResult = syncCredits
    ? await syncChartEntryCredits(releaseId).catch(() => ({ updated: 0, failed: 1 }))
    : { updated: 0, failed: 0 };
  const rankResult = await rerankAffectedChartScopes(scopes);
  clearCmsCache();
  const notes = [];
  if (syncResult.updated) notes.push(`${syncResult.updated} chart entry credit snapshot${syncResult.updated === 1 ? "" : "s"} synced`);
  if (syncResult.failed) notes.push(`${syncResult.failed} credit sync ${syncResult.failed === 1 ? "failure" : "failures"}`);
  if (rankResult.failedScopes?.length) notes.push("some chart history scopes need manual refresh");
  return `Release updated across catalogue data${notes.length ? `; ${notes.join(", ")}` : ""}.`;
}

async function patchArtistEverywhere(artistId, patch) {
  await cmsApi.patch(`/artists/${artistId}/`, cleanPatch(patch));
  const releases = await cmsApi.get(`/artists/${artistId}/releases/`).catch(() => []);
  const releaseIds = (Array.isArray(releases) ? releases : [])
    .map((release) => optionId(release?.id ?? release))
    .filter(Boolean);
  if (releaseIds.length) {
    const scopes = await getAffectedChartScopes(releaseIds);
    const rankResult = await rerankAffectedChartScopes(scopes);
    if (rankResult.failedScopes?.length) {
      return "Artist updated, but some chart history scopes need manual refresh.";
    }
  }
  clearCmsCache();
  return "Artist updated and related chart history was refreshed.";
}

function compoundArtistMatches(problem = "") {
  const matches = [];
  const pattern = /matches artist record "([^"]+)" \(id (\d+)\)/g;
  let match = pattern.exec(problem);
  while (match) {
    matches.push({ name: match[1], id: Number(match[2]) });
    match = pattern.exec(problem);
  }
  return matches;
}

function buildCompoundArtistSolutions(alert, detail, page, record) {
  if (!/^audit-(song|album)-compound-artist-unlinked$/.test(alert?.id || "")) return [];
  if (!isReleasePage(page) || !record?.id) return [];
  return compoundArtistMatches(detail?.problem).map((artist) =>
    mutationSolution({
      id: `link-compound-artist-${artist.id}`,
      label: `Link ${artist.name}`,
      description: "Use the registered artist record as the primary release credit, then refresh historical chart rows tied to this release.",
      run: async () => {
        const artistRecord = await cmsApi.get(`/artists/${artist.id}/`).catch(() => null);
        const featuredIds = artistIdsFrom(record, "featured_artist_ids", "featured_artist_profiles")
          .filter((id) => id !== artist.id);
        return patchReleaseEverywhere(record.id, {
          primary_artist_ids: [artist.id],
          featured_artist_ids: featuredIds,
          featured_artists: "",
          country: artistRecord?.country || record.country || "",
          country_code: normalizeCode(artistRecord?.country_code || record.country_code),
        }, { syncCredits: true });
      },
    })
  );
}

async function configuredCountries() {
  const rows = getResults(await cmsApi.get("/countries/?page_size=500"));
  const byCode = new Map();
  const byName = new Map();
  rows.forEach((country) => {
    const code = normalizeCode(country.code);
    const name = normalizeName(country.name);
    if (code) byCode.set(code, country);
    if (name) byName.set(name, country);
  });
  return { rows, byCode, byName };
}

function countryFieldNames(page) {
  return page === "countries"
    ? { name: "name", code: "code" }
    : { name: "country", code: "country_code" };
}

async function leadArtistCountryPatch(release) {
  let lead = firstLeadArtistProfile(release);
  const leadId = optionId(lead) || artistIdsFrom(release, "primary_artist_ids", "primary_artists")[0] || optionId(release?.artist_id ?? release?.artist);
  if (!lead?.country_code && leadId) {
    lead = await cmsApi.get(`/artists/${leadId}/`).catch(() => lead);
  }
  const country = String(lead?.country || "").trim();
  const countryCode = normalizeCode(lead?.country_code);
  if (!country && !countryCode) return null;
  const patch = {};
  if (country && country !== String(release.country || "").trim()) patch.country = country;
  if (countryCode && countryCode !== normalizeCode(release.country_code)) patch.country_code = countryCode;
  return Object.keys(patch).length ? patch : null;
}

async function buildCountrySolutions(alert, detail, page, record) {
  const id = alert?.id || "";
  if (!record?.id || !/country/i.test(`${id} ${detail?.problem || ""}`)) return [];
  if (/duplicate|inactive/.test(id)) return [];

  if (isReleasePage(page) && /does not match lead artist/i.test(detail?.problem || "")) {
    const patch = await leadArtistCountryPatch(record);
    if (patch) {
      return [mutationSolution({
        id: "copy-lead-artist-country",
        label: "Use lead artist country",
        description: "Copy the linked lead artist country onto this release and refresh chart history that uses it.",
        run: () => patchReleaseEverywhere(record.id, patch),
      })];
    }
  }

  const fields = countryFieldNames(page);
  const currentName = String(record[fields.name] || "").trim();
  const currentCode = String(record[fields.code] || "").trim();
  const code = normalizeCode(currentCode);
  const { rows, byCode, byName } = await configuredCountries().catch(() => ({ rows: [], byCode: new Map(), byName: new Map() }));
  const patch = {};

  if (page === "countries") {
    const countryIndex = buildCountryCodeIndex(rows);
    const profile = countryIndex.profileForCountry(currentName) || countryIndex.profileForCode(code);
    if (profile) {
      if (record.code !== profile.code) patch.code = profile.code;
      if (record.region !== profile.region) patch.region = profile.region;
      if (record.flag !== profile.flag) patch.flag = profile.flag;
      if (Number(record.display_order) !== Number(profile.display_order)) patch.display_order = profile.display_order;
    }
  }

  if (currentCode && code !== currentCode && /^[A-Z]{2}$/.test(code)) patch[fields.code] = code;
  const configuredByCode = byCode.get(code);
  if (configuredByCode && (!currentName || normalizeName(configuredByCode.name) !== normalizeName(currentName))) {
    patch[fields.name] = configuredByCode.name;
  }
  if (!code && currentName) {
    const configuredByName = byName.get(normalizeName(currentName));
    if (configuredByName?.code) patch[fields.code] = normalizeCode(configuredByName.code);
  }

  if (!Object.keys(patch).length) return [];
  return [mutationSolution({
    id: "normalize-country",
    label: "Normalize country fields",
    description: "Use the configured Countries table to fill the missing name/code or correct casing.",
    run: () => {
      if (isReleasePage(page)) return patchReleaseEverywhere(record.id, patch);
      if (page === "artists") return patchArtistEverywhere(record.id, patch);
      return patchRecord(page, record.id, patch);
    },
  })];
}

function urlFieldFromProblem(problem = "") {
  const label = String(problem).split(":")[0]?.trim();
  return URL_FIELD_BY_LABEL[label] || null;
}

function buildUrlSolutions(alert, detail, page, record) {
  if (!record?.id || !/url/i.test(alert?.id || "")) return [];
  const field = alert.id === "audit-media-url-invalid" ? "file" : urlFieldFromProblem(detail?.problem);
  if (!field || typeof record[field] !== "string" || !record[field].trim()) return [];
  const value = record[field].trim();
  const fixes = [];
  const patchUrl = (nextValue) => {
    const patch = { [field]: nextValue };
    if (isReleasePage(page)) return patchReleaseEverywhere(record.id, patch);
    return patchRecord(page, record.id, patch);
  };

  if (/^http:\/\//i.test(value)) {
    fixes.push(mutationSolution({
      id: `url-https-${field}`,
      label: "Switch to HTTPS",
      description: "Keep the same URL and change the insecure http scheme to https.",
      run: () => patchUrl(value.replace(/^http:\/\//i, "https://")),
    }));
  } else if (!/^https?:\/\//i.test(value) && !value.startsWith("/") && !/^data:/i.test(value)) {
    fixes.push(mutationSolution({
      id: `url-add-scheme-${field}`,
      label: "Add HTTPS scheme",
      description: "Prefix this value with https:// so the CMS can validate it as a URL.",
      run: () => patchUrl(`https://${value.replace(/^\/+/, "")}`),
    }));
  }

  fixes.push(mutationSolution({
    id: `url-clear-${field}`,
    label: "Clear invalid URL",
    description: "Remove this value when it points to the wrong platform or cannot be repaired safely.",
    tone: "light",
    run: () => patchUrl(""),
  }));
  return fixes;
}

function buildReleaseDateSolutions(alert, detail, page, record) {
  if (!record?.id || !isReleasePage(page)) return [];
  if (!/date/i.test(`${alert?.id || ""} ${detail?.problem || ""}`)) return [];
  const year = releaseYearFromDate(record.release_date);
  if (!year || Number(record.release_year) === year) return [];
  return [mutationSolution({
    id: "sync-release-year-from-date",
    label: "Use release date year",
    description: `Set Release year to ${year}, derived directly from the Release date.`,
    run: () => patchReleaseEverywhere(record.id, { release_year: year }),
  })];
}

function buildStatusSolutions(alert, detail, page, record) {
  if (!record?.id) return [];
  const id = alert?.id || "";
  const fixes = [];
  if (id === "audit-artist-verification-missing" && page === "artists") {
    fixes.push(mutationSolution({
      id: "verify-artist",
      label: "Mark artist verified",
      description: "Set verified=true for this credited artist profile.",
      run: () => patchRecord(page, record.id, { verified: true }),
    }));
  }
  if (id === "audit-platform-support-missing" && page === "platforms") {
    fixes.push(mutationSolution({
      id: "platform-enable-both",
      label: "Enable singles and albums",
      description: "Make this active platform available for both chart types.",
      run: () => patchRecord(page, record.id, { supports_singles: true, supports_albums: true }),
    }));
  }
  if (id === "audit-chart-period-not-ready" && page === "charts") {
    fixes.push(mutationSolution({
      id: "chart-mark-approved",
      label: "Mark approved",
      description: "Move this chart period to approved so it is ready for the publishing workflow.",
      run: () => patchRecord(page, record.id, { status: "approved" }),
    }));
  }
  if (id === "audit-open-quality-reports" && page === "reports") {
    fixes.push(mutationSolution({
      id: "report-resolved",
      label: "Mark report resolved",
      description: "Close this quality report after you have reviewed the underlying issue.",
      run: () => patchRecord(page, record.id, { status: STATUS_DONE }),
    }));
  }
  if (id === "audit-page-content-visible-empty" && page === "page-content") {
    fixes.push(mutationSolution({
      id: "hide-empty-content",
      label: "Hide empty block",
      description: "Set this incomplete content block to not visible until it is filled in.",
      run: () => patchRecord(page, record.id, { is_visible: false }),
    }));
  }
  if (id === "audit-news-status-mismatch" && page === "news") {
    fixes.push(mutationSolution({
      id: "news-status-published",
      label: "Set status to published",
      description: "Keep the article public and align its workflow status.",
      run: () => patchRecord(page, record.id, { status: "published", is_published: true }),
    }));
    fixes.push(mutationSolution({
      id: "news-unpublish",
      label: "Return to draft",
      description: "Make the workflow status and public flag agree by taking the article offline.",
      tone: "light",
      run: () => patchRecord(page, record.id, { status: "draft", is_published: false }),
    }));
  }
  if ((id === "audit-news-highlight-unpublished" || id === "audit-news-scheduled-overdue") && page === "news") {
    fixes.push(mutationSolution({
      id: "news-publish-now",
      label: "Publish now",
      description: "Set the article public and mark its status as published.",
      run: () => patchRecord(page, record.id, { status: "published", is_published: true }),
    }));
  }
  if (id === "audit-news-highlight-unpublished" && page === "news") {
    fixes.push(mutationSolution({
      id: "news-remove-highlight",
      label: "Remove highlight flags",
      description: "Keep it unpublished but clear featured, pinned, and breaking flags.",
      tone: "light",
      run: () => patchRecord(page, record.id, { featured: false, pinned: false, breaking: false }),
    }));
  }
  return fixes;
}

function buildColorSolutions(alert, detail, page, record) {
  if (alert?.id !== "audit-platform-color-invalid" || page !== "platforms" || !record?.id) return [];
  const problem = detail?.problem || "";
  const field = /^brand color:/i.test(problem) ? "brand_color" : /^color:/i.test(problem) ? "color" : "";
  if (!field) return [];
  return [
    mutationSolution({
      id: `platform-${field}-neutral`,
      label: "Use neutral black",
      description: "Set this platform color to a valid neutral hex value.",
      run: () => patchRecord(page, record.id, { [field]: DEFAULT_PLATFORM_COLOR }),
    }),
    mutationSolution({
      id: `platform-${field}-gold`,
      label: "Use Ngoma gold",
      description: "Set this platform color to the CMS gold hex value.",
      tone: "light",
      run: () => patchRecord(page, record.id, { [field]: NGOMA_GOLD }),
    }),
  ];
}

async function buildCertificationSolutions(alert, detail, page, record) {
  if (alert?.id !== "audit-certification-below-threshold" || page !== "certifications" || !record?.id) return [];
  const points = Number(String(record.total_points ?? record.totalPts ?? record.points ?? "").replace(/,/g, ""));
  if (!Number.isFinite(points)) return [];
  const activeRules = getResults(await cmsApi.get("/certification-rules/?page_size=500").catch(() => []))
    .filter((rule) => rule.active !== false && numberValue(rule.threshold) > 0)
    .sort((left, right) => numberValue(right.threshold) - numberValue(left.threshold));
  const rules = activeRules.length ? activeRules : DEFAULT_CERTIFICATION_RULES;
  const eligible = rules.find((rule) => points >= numberValue(rule.threshold));
  if (eligible?.level && String(eligible.level).toLowerCase() !== String(record.level || "").toLowerCase()) {
    return [mutationSolution({
      id: "certification-lower-level",
      label: `Set level to ${eligible.level}`,
      description: "Move this certification to the highest active level its points currently satisfy.",
      run: () => patchRecord(page, record.id, { level: String(eligible.level).toLowerCase() }),
    })];
  }
  return [mutationSolution({
    id: "certification-hide",
    label: "Hide certification",
    description: "Keep the record for audit history but remove it from public certification views.",
    tone: "light",
    run: () => patchRecord(page, record.id, { is_hidden: true }),
  })];
}

function buildGuidedFallbackSolution({ alert, detail, page, recordError }) {
  const id = String(alert?.id || "");
  const problem = String(detail?.problem || "");
  const signal = `${id} ${problem}`.toLowerCase();
  const fields = problemFields(problem);
  const section = pageLabel(page);
  const suffix = "Saving updates the canonical CMS record, so the same correction is reused everywhere this entry appears.";

  if (recordError) {
    return guidanceSolution({
      id: "guided-open-section",
      label: `Resolve in ${section}`,
      description: `The exact record could not be loaded automatically. Open the ${section} section, search for this item, correct the fields named by the alert, and save. ${suffix}`,
      fields,
      actionLabel: "Review section",
    });
  }

  if (/image|cover|media/.test(signal)) {
    return guidanceSolution({
      id: "guided-media-fix",
      label: "Upload the missing media",
      description: `Add the missing image or file on this entry, check the alt/title metadata, and save. ${suffix}`,
      fields: fields.length ? fields : ["image", "cover_image", "file"],
    });
  }

  if (/json|aliases|gallery|source/.test(signal)) {
    return guidanceSolution({
      id: "guided-json-fix",
      label: "Repair the JSON field",
      description: `Replace the invalid JSON with valid JSON, or clear the field if it should be empty, then save. ${suffix}`,
      fields: fields.length ? fields : ["aliases", "gallery", "source_links", "data"],
    });
  }

  if (/duplicate/.test(id)) {
    return guidanceSolution({
      id: "guided-duplicate-fix",
      label: "Merge, remove, or make unique",
      description: `Compare the duplicate records named in the alert. Merge true duplicates, delete the extra record, or edit the repeated key so each record is unique. ${suffix}`,
      fields,
      actionLabel: "Review duplicate",
    });
  }

  if (/featured-unlinked/.test(id)) {
    return guidanceSolution({
      id: "guided-featured-artist-links",
      label: "Link the featured artists",
      description: `Use the Artists control to link each credited featuring artist to an artist record, then remove stale free-text credits if they duplicate the structured links. ${suffix}`,
      fields: ["artist_credits", "featured_artists"],
    });
  }

  if (/country/.test(signal)) {
    return guidanceSolution({
      id: "guided-country-fix",
      label: "Correct country fields",
      description: `Choose the configured country name/code pair that matches this entry, or update the related lead artist country if that is the source of truth. ${suffix}`,
      fields: fields.length ? fields : ["country", "country_code"],
    });
  }

  if (/date/.test(id)) {
    return guidanceSolution({
      id: "guided-date-fix",
      label: "Correct release date metadata",
      description: `Set a real release date, or at minimum a valid release year, and make sure the year agrees with the date. ${suffix}`,
      fields: ["release_date", "release_year"],
    });
  }

  if (/chart|upload|weekly/.test(id) || page === "uploads" || page === "chart-entries") {
    return guidanceSolution({
      id: "guided-chart-upload-fix",
      label: "Review the chart workflow",
      description: `Open the chart or upload named in the alert, correct validation errors or missing rows, then approve or republish the affected chart period. ${suffix}`,
      fields,
      actionLabel: "Review workflow",
    });
  }

  if (/certification-rule/.test(id) || page === "certification-rules") {
    return guidanceSolution({
      id: "guided-certification-rule-fix",
      label: "Correct the certification rule",
      description: "Keep one active rule for each level and set thresholds in ascending order: gold below platinum below diamond. Save the rule, then run Correct certifications.",
      fields: fields.length ? fields : ["level", "threshold", "active"],
    });
  }

  if (/certification/.test(id) || page === "certifications") {
    return guidanceSolution({
      id: "guided-certification-fix",
      label: "Correct certification fields",
      description: "Select the release, set the highest level currently allowed by its points, or hide the certification if no active threshold is met.",
      fields: fields.length ? fields : ["release", "level", "total_points", "is_hidden"],
    });
  }

  if (/news/.test(id) || page === "news") {
    return guidanceSolution({
      id: "guided-news-fix",
      label: "Resolve the article workflow",
      description: `Complete the missing editorial fields, align status with the published flag, or remove highlight flags from unpublished articles. ${suffix}`,
      fields: fields.length ? fields : ["cover_image", "title", "category", "excerpt", "body", "status", "is_published"],
    });
  }

  if (/page-content/.test(id) || page === "page-content") {
    return guidanceSolution({
      id: "guided-page-content-fix",
      label: "Complete or hide the content block",
      description: `Fill the visible content block, repair section data JSON, or turn visibility off until the content is ready. ${suffix}`,
      fields: fields.length ? fields : ["page", "section", "title", "content", "data", "is_visible"],
    });
  }

  if (/report/.test(id) || page === "reports") {
    return guidanceSolution({
      id: "guided-report-fix",
      label: "Resolve the quality report",
      description: "Review the underlying issue described in the report, apply the needed CMS edit, then set the report status to resolved.",
      fields: fields.length ? fields : ["status", "description"],
    });
  }

  if (/backup/.test(id) || page === "backups") {
    return guidanceSolution({
      id: "guided-backup-fix",
      label: "Create or verify the latest backup",
      description: "Run a fresh CMS backup or inspect the failed backup entry, then save the backup record once the status is success.",
      fields: fields.length ? fields : ["status", "notes"],
    });
  }

  if (/missing|incomplete|invalid/.test(signal)) {
    return guidanceSolution({
      id: "guided-field-fix",
      label: "Complete the required fields",
      description: `Correct the field values named by the alert and save this entry. ${suffix}`,
      fields,
    });
  }

  return guidanceSolution({
    id: "guided-general-fix",
    label: `Resolve in ${section}`,
    description: `Review the fields named by this alert, make the correction in this edit form, and save. ${suffix}`,
    fields,
  });
}

async function buildQuickFixSolutions({ alert, detail, page, record, canApply }) {
  if (!canApply || !record) return [];
  const groups = await Promise.all([
    Promise.resolve(buildCompoundArtistSolutions(alert, detail, page, record)),
    buildCountrySolutions(alert, detail, page, record),
    Promise.resolve(buildUrlSolutions(alert, detail, page, record)),
    Promise.resolve(buildReleaseDateSolutions(alert, detail, page, record)),
    Promise.resolve(buildStatusSolutions(alert, detail, page, record)),
    Promise.resolve(buildColorSolutions(alert, detail, page, record)),
    buildCertificationSolutions(alert, detail, page, record),
  ]);
  const seen = new Set();
  return groups.flat().filter((solution) => {
    if (!solution?.id || seen.has(solution.id)) return false;
    seen.add(solution.id);
    return true;
  });
}

export async function buildAlertCaseReview({ alert, detail, page, canApply = true }) {
  const resolvedPage = page || alert?.page || "";
  const { record, error: recordError } = await fetchRecord(resolvedPage, detail);
  const quickFixes = await buildQuickFixSolutions({
    alert,
    detail,
    page: resolvedPage,
    record,
    canApply,
  });
  const fallback = quickFixes.length
    ? null
    : buildGuidedFallbackSolution({ alert, detail, page: resolvedPage, record, recordError });
  const openSolution = navigateSolution(resolvedPage, detail);
  const solutions = [...quickFixes, fallback, openSolution].filter(Boolean);
  return {
    alert,
    detail,
    page: resolvedPage,
    pageLabel: pageLabel(resolvedPage),
    record,
    recordError,
    solutions,
  };
}

export function hasDirectFix(review) {
  return (review?.solutions || []).some((solution) => solution.kind === "mutation");
}

export const alertResolutionInternals = {
  compoundArtistMatches,
  normalizeName,
  normalizeCode,
};
