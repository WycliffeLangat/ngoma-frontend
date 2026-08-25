const PLACEHOLDER_LINK_VALUES = new Set([
  "-",
  "--",
  "---",
  "n/a",
  "na",
  "none",
  "null",
  "undefined",
  "tba",
  "tbd",
  "todo",
  "#",
]);

const PLATFORM_HOSTS = {
  spotify: [/(^|\.)spotify\.com$/i],
  apple_music: [/(^|\.)music\.apple\.com$/i, /(^|\.)itunes\.apple\.com$/i],
  youtube: [/(^|\.)youtube\.com$/i, /(^|\.)youtu\.be$/i, /(^|\.)music\.youtube\.com$/i],
  boomplay: [/(^|\.)boomplay\.com$/i],
  audiomack: [/(^|\.)audiomack\.com$/i],
  tiktok: [/(^|\.)tiktok\.com$/i],
  instagram: [/(^|\.)instagram\.com$/i],
  x: [/(^|\.)x\.com$/i, /(^|\.)twitter\.com$/i],
  facebook: [/(^|\.)facebook\.com$/i],
  shazam: [/(^|\.)shazam\.com$/i],
};

export const DETAIL_LINK_PLATFORMS = [
  { key: "spotify", label: "Spotify", fields: ["spotify_url", "spotify", "social_links.spotify", "links.spotify"] },
  { key: "apple_music", label: "Apple Music", fields: ["apple_music_url", "apple_music", "apple", "social_links.apple_music", "links.apple_music"] },
  { key: "youtube", label: "YouTube", fields: ["youtube_url", "youtube", "social_links.youtube", "links.youtube"] },
  { key: "boomplay", label: "Boomplay", fields: ["boomplay_url", "boomplay", "social_links.boomplay", "links.boomplay"] },
  { key: "audiomack", label: "Audiomack", fields: ["audiomack_url", "audiomack", "social_links.audiomack", "links.audiomack"] },
  { key: "tiktok", label: "TikTok", fields: ["tiktok_url", "tiktok", "social_links.tiktok", "links.tiktok"] },
  { key: "shazam", label: "Shazam", fields: ["shazam_url", "shazam", "social_links.shazam", "links.shazam"] },
  { key: "instagram", label: "Instagram", fields: ["instagram_url", "instagram", "social_links.instagram", "links.instagram"] },
  { key: "x", label: "X", fields: ["x_url", "x", "twitter_url", "twitter", "social_links.x", "social_links.twitter", "links.x", "links.twitter"] },
  { key: "facebook", label: "Facebook", fields: ["facebook_url", "facebook", "social_links.facebook", "links.facebook"] },
  { key: "website", label: "Website", fields: ["website_url", "website", "official_website", "social_links.website", "links.website"] },
];

function cleanString(value) {
  return String(value ?? "").trim();
}

function getPathValue(source, path) {
  if (!source || !path) return "";
  return String(path).split(".").reduce((current, key) => (
    current && typeof current === "object" ? current[key] : undefined
  ), source);
}

function stripUrlPunctuation(value) {
  return String(value || "")
    .trim()
    .replace(/^[<([{]+/, "")
    .replace(/[>"'\s]+$/g, "")
    .replace(/[),.;\]]+$/g, "");
}

function urlCandidate(value) {
  const raw = cleanString(value);
  if (!raw) return "";
  const normalized = raw.toLowerCase();
  if (PLACEHOLDER_LINK_VALUES.has(normalized)) return "";
  if (/^(coming soon|not available|no link|missing)$/i.test(raw)) return "";

  const urlish = raw.match(/(?:https?:\/\/|\/\/|www\.)[^\s<>"']+/i) ||
    raw.match(/\b[a-z0-9-]+(?:\.[a-z0-9-]+)+(?::\d+)?(?:\/[^\s<>"']*)?/i);
  return stripUrlPunctuation(urlish ? urlish[0] : raw);
}

export function normalizeDetailUrl(value) {
  let candidate = urlCandidate(value);
  if (!candidate) return "";

  if (candidate.startsWith("//")) candidate = `https:${candidate}`;
  if (/^www\./i.test(candidate)) candidate = `https://${candidate}`;
  if (!/^https?:\/\//i.test(candidate) && /^[a-z0-9-]+(?:\.[a-z0-9-]+)+(?::\d+)?(?:\/|$|\?|#)/i.test(candidate)) {
    candidate = `https://${candidate}`;
  }
  if (!/^https?:\/\//i.test(candidate)) return "";

  try {
    const parsed = new URL(candidate);
    if (!parsed.hostname || !parsed.hostname.includes(".")) return "";
    if (parsed.protocol === "http:") parsed.protocol = "https:";
    if (parsed.protocol !== "https:") return "";
    return parsed.href;
  } catch {
    return "";
  }
}

function platformFromConfig(platformKey) {
  return DETAIL_LINK_PLATFORMS.find((item) => item.key === platformKey) || null;
}

export function urlMatchesPlatform(url, platformKey) {
  const normalized = normalizeDetailUrl(url);
  if (!normalized) return false;
  if (!platformKey || platformKey === "website") return true;
  const patterns = PLATFORM_HOSTS[platformKey];
  if (!patterns) return true;
  try {
    const hostname = new URL(normalized).hostname;
    return patterns.some((pattern) => pattern.test(hostname));
  } catch {
    return false;
  }
}

function valuesForFields(source, fields = []) {
  return fields.map((field) => getPathValue(source, field)).filter((value) => value !== undefined && value !== null && value !== "");
}

function knownLinkValues(source) {
  if (!source || typeof source !== "object") return [];
  const values = [];
  const collectFrom = (item) => {
    if (!item || typeof item !== "object") return;
    DETAIL_LINK_PLATFORMS.forEach((platform) => {
      values.push(...valuesForFields(item, platform.fields));
    });
    Object.entries(item).forEach(([key, value]) => {
      if (/_?url$/i.test(key) || /link/i.test(key)) values.push(value);
    });
  };

  collectFrom(source);
  [source.canonical_release, source.release_details, source.artist_profile, source.profile].forEach(collectFrom);
  [source.social_links, source.links, source.canonical_release?.social_links, source.artist_profile?.social_links, source.profile?.social_links].forEach((links) => {
    if (links && typeof links === "object") values.push(...Object.values(links));
  });
  return values;
}

export function bestDetailUrl(source, platformKey, fields) {
  const config = platformFromConfig(platformKey);
  const preferredFields = fields || config?.fields || [];
  for (const value of valuesForFields(source, preferredFields)) {
    const normalized = normalizeDetailUrl(value);
    if (normalized && urlMatchesPlatform(normalized, platformKey)) return normalized;
  }

  if (platformKey === "website") return "";
  for (const value of knownLinkValues(source)) {
    const normalized = normalizeDetailUrl(value);
    if (normalized && urlMatchesPlatform(normalized, platformKey)) return normalized;
  }
  return "";
}

export function detailLinkEntries(source, platforms = DETAIL_LINK_PLATFORMS) {
  const seen = new Set();
  return platforms
    .map((platform) => {
      const url = bestDetailUrl(source, platform.key, platform.fields);
      return url ? { ...platform, url } : null;
    })
    .filter((item) => {
      if (!item || seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
}
