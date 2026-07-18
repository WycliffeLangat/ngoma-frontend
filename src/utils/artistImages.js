import { resolveMediaUrl } from "../api/config.js";

const ARTIST_IMAGE_FIELDS = [
  "image",
  "image_url",
  "image_file",
  "image_file_url",
  "artist_image",
  "artist_image_url",
  "artist_image_file",
  "artist_image_file_url",
  "profile_image",
  "profile_image_url",
  "profile_image_file",
  "profile_image_file_url",
  "photo",
  "photo_url",
  "avatar",
  "avatar_url",
  "picture",
  "picture_url",
  "thumbnail",
  "thumbnail_url",
  "cover_image",
  "cover_image_url",
  "cover_image_file",
  "cover_image_file_url",
  "profile_photo",
  "profile_photo_url",
  "hero_image",
  "hero_image_url",
];

const VERSION_FIELDS = [
  "updated_at",
  "modified_at",
  "last_modified",
  "image_updated_at",
  "revision",
  "version",
];

let publicArtistMapCache = null;
let publicArtistMapRevision = "";

function cleanString(value) {
  const text = String(value || "").trim();
  if (!text || text === "—" || text.toLowerCase() === "null" || text.toLowerCase() === "undefined") return "";
  return text;
}

export function artistAliasValues(aliases) {
  if (Array.isArray(aliases)) return aliases;
  const text = cleanString(aliases);
  if (!text || text === "[]") return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Keep plain text aliases below.
  }
  return text.includes("|") ? text.split("|") : [text];
}

export function artistNameVariants(artist = {}) {
  const names = [
    artist?.name,
    artist?.display_name,
    artist?.public_name,
    artist?.artist_name,
    artist?.title,
    ...artistAliasValues(artist?.aliases),
  ];
  return [
    ...new Map(
      names
        .map((name) => cleanString(name))
        .filter(Boolean)
        .map((name) => [name.toLowerCase(), name])
    ).values(),
  ];
}

function hasImageLikeKey(key = "") {
  const normalized = String(key || "").toLowerCase();
  return normalized === "url" || normalized === "src" || normalized === "path"
    || /(^|_)(image|photo|avatar|cover|thumbnail|art|profile)(s|_url|_image|_photo|_avatar|_cover|_thumbnail|_art|_profile)?($|_)/.test(normalized);
}

function hasArtistContainerKey(key = "") {
  return /^(artist|artists|artist_profile|artist_profiles|artistprofile|profile|primary_artist|primary_artists|featured_artist|featured_artists|featured_artist_profiles)$/i
    .test(String(key || ""));
}

function looksLikeReleaseCandidate(candidate) {
  if (!candidate || typeof candidate !== "object") return false;
  const releaseIdentityFields = [
    "release_id",
    "track_id",
    "song_id",
    "album_id",
    "isrc",
    "upc",
  ];
  if (releaseIdentityFields.some((field) => cleanString(candidate[field]))) return true;

  const releaseArtworkFields = [
    "cover_image",
    "cover_image_url",
    "cover_image_file",
    "cover_image_file_url",
    "cover",
    "cover_url",
    "cover_file",
    "cover_file_url",
    "artwork",
    "artwork_url",
    "album_art",
    "thumbnail",
    "thumbnail_url",
    "streaming_url",
  ];
  const hasReleaseSignal = releaseArtworkFields.some((field) => cleanString(candidate[field]));
  const hasArtistSignal = [
    "name",
    "display_name",
    "public_name",
    "artist_name",
    "aliases",
    "social_links",
    "country_code",
    "genre",
    "artist_type",
    "verified",
    "biography",
    "slug",
  ].some((field) => candidate[field] !== undefined && candidate[field] !== null && candidate[field] !== "");
  return hasReleaseSignal && !hasArtistSignal;
}

function valueFromCandidate(candidate, fields = ARTIST_IMAGE_FIELDS) {
  if (!candidate) return "";
  if (typeof candidate === "string") return cleanString(candidate);
  if (looksLikeReleaseCandidate(candidate)) return "";
  if (Array.isArray(candidate)) {
    for (const item of candidate) {
      const nested = valueFromCandidate(item, fields);
      if (nested) return nested;
    }
    return "";
  }

  if (typeof candidate === "object") {
    for (const field of fields) {
      const value = candidate[field];
      if (typeof value === "string") {
        const cleaned = cleanString(value);
        if (cleaned) return cleaned;
      }
      if (value && typeof value === "object") {
        const nested = value.url || value.secure_url || value.image || value.src || value.path;
        const cleaned = cleanString(nested);
        if (cleaned) return cleaned;
      }
    }

    for (const [key, value] of Object.entries(candidate)) {
      if (typeof value === "string") {
        if (hasImageLikeKey(key)) {
          const cleaned = cleanString(value);
          if (cleaned) return cleaned;
        }
        continue;
      }

      if (value && typeof value === "object") {
        if (hasImageLikeKey(key)) {
          const nested = value.url || value.secure_url || value.image || value.src || value.path;
          const cleaned = cleanString(nested);
          if (cleaned) return cleaned;
        }

        // Artist chart rows contain a `releases` collection. Never walk arbitrary
        // nested objects here: doing so can mistake a song/album cover for the
        // artist's profile image. Only artist/profile containers may be searched.
        const nested = hasArtistContainerKey(key) && !looksLikeReleaseCandidate(value)
          ? valueFromCandidate(value, fields)
          : "";
        if (nested) return nested;
      }
    }
  }

  return "";
}

function directImageFromCandidate(candidate, fields = ARTIST_IMAGE_FIELDS) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return "";
  for (const field of fields) {
    const value = candidate[field];
    if (typeof value === "string") {
      const cleaned = cleanString(value);
      if (cleaned) return cleaned;
    }
    if (value && typeof value === "object") {
      const nested = value.url || value.secure_url || value.image || value.src || value.path;
      const cleaned = cleanString(nested);
      if (cleaned) return cleaned;
    }
  }
  return "";
}

function versionFromCandidate(candidate) {
  if (!candidate || typeof candidate !== "object") return "";
  for (const field of VERSION_FIELDS) {
    const value = cleanString(candidate[field]);
    if (value) return value;
  }
  return "";
}

function addVersion(url, version) {
  const resolved = resolveMediaUrl(cleanString(url));
  const token = cleanString(version);
  if (!resolved || !token) return resolved;
  // Cloudinary URLs can already include transformation/query strings. Appending a
  // version token forces browsers/CDNs to refresh after a CMS image replacement.
  const separator = resolved.includes("?") ? "&" : "?";
  return `${resolved}${separator}v=${encodeURIComponent(token)}`;
}

export function normaliseArtistName(name = "") {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s*\|\s*.+$/, "")
    .replace(/,\s+.+$/, "")
    .replace(/\s+(?:ft\.?|feat\.?|featuring|w\/)\s+.+$/i, "")
    .replace(/\s+x\s+.+$/i, "")
    .replace(/\s+&\s+.+$/i, "")
    .trim();
}

export function getArtistDisplayName(item = {}) {
  return cleanString(
    item?.title ||
    item?.n ||
    item?.display_name ||
    item?.public_name ||
    item?.name ||
    item?.primary_artist ||
    item?.artist_name ||
    item?.artist
  );
}

function artistNameKeys(artist = {}) {
  const keys = new Set();
  artistNameVariants(artist).forEach((name) => {
    const cleaned = cleanString(name).toLowerCase();
    if (!cleaned) return;
    keys.add(cleaned);
    const normalized = normaliseArtistName(cleaned);
    if (normalized) keys.add(normalized);
  });
  return [...keys];
}

function betterArtistProfile(current, next) {
  if (!current) return next;
  if (!next) return current;

  // Prefer the profile that actually has an image, then the one with a newer
  // timestamp. This matters because chart entries can contain older embedded
  // artist snapshots while /artists contains the latest CMS-edited profile.
  const currentImage = valueFromCandidate(current);
  const nextImage = valueFromCandidate(next);
  if (!currentImage && nextImage) return next;
  if (currentImage && !nextImage) return current;

  const currentVersion = versionFromCandidate(current);
  const nextVersion = versionFromCandidate(next);
  if (currentVersion && nextVersion && nextVersion > currentVersion) return next;

  return current;
}

function addArtistToMap(map, artist) {
  if (!artist || typeof artist !== "object") return;
  const keys = artistNameKeys(artist);
  if (!keys.length) return;

  keys.forEach((key) => {
    map.set(key, betterArtistProfile(map.get(key), artist));
  });
}

function scanPublicChartNode(node, map) {
  if (!node) return;

  if (Array.isArray(node)) {
    node.forEach((entry) => {
      if (!entry || typeof entry !== "object") return;
      addArtistToMap(map, entry.artist_profile || entry.artistProfile || entry.profile);
      addArtistToMap(map, entry.artist);
      addArtistToMap(map, entry.primary_artist);
      (entry.primary_artists || []).forEach((artist) => addArtistToMap(map, artist));
      (entry.featured_artist_profiles || []).forEach((artist) => addArtistToMap(map, artist));
      (entry.featured_artists || []).forEach?.((artist) => addArtistToMap(map, artist));
    });
    return;
  }

  if (typeof node === "object") {
    Object.values(node).forEach((value) => scanPublicChartNode(value, map));
  }
}

export function getPublicArtists() {
  if (typeof window === "undefined") return [];
  return window.__NGOMA_PUBLIC_DATA__?.artists || [];
}

export function getPublicArtistMap() {
  if (typeof window === "undefined") return new Map();

  const publicData = window.__NGOMA_PUBLIC_DATA__ || {};
  const revision = String(
    publicData.revision ||
    publicData.generated_at ||
    `${(publicData.artists || []).length}|${Object.keys(publicData.full || {}).length}`
  );

  if (publicArtistMapCache && publicArtistMapRevision === revision) {
    return publicArtistMapCache;
  }

  const map = new Map();

  // Main CMS artist list — this should be the first authority.
  (publicData.artists || []).forEach((artist) => addArtistToMap(map, artist));

  // Fallback: chart API entries also carry primary_artists with image fields.
  // This covers artist charts built from API chart rows, where the row only
  // has a name such as "Asake" but not the full CMS artist object.
  scanPublicChartNode(publicData.full, map);
  scanPublicChartNode(publicData.year_end, map);

  publicArtistMapCache = map;
  publicArtistMapRevision = revision;
  return map;
}

export function findArtistProfileByName(name = "", artists = []) {
  const wanted = cleanString(name).toLowerCase();
  const normalizedWanted = normaliseArtistName(wanted);
  if (!wanted && !normalizedWanted) return null;

  const direct = (artists || []).find((artist) => {
    const keys = artistNameKeys(artist);
    return keys.includes(wanted) || keys.includes(normalizedWanted);
  });
  if (direct) return direct;

  const publicMap = getPublicArtistMap();
  return publicMap.get(wanted) || publicMap.get(normalizedWanted) || null;
}

export function findArtistProfileInPublicData(name = "") {
  return findArtistProfileByName(name, getPublicArtists());
}

// News/editorial copy names artists in free text ("Cardi B Ties the Record...")
// rather than carrying a clean artist field. Scans the public artist roster for
// the longest name/alias that appears in the text, so callers can resolve a
// real artist photo instead of falling back to a generic placeholder.
export function findArtistMentionedIn(text = "", artists) {
  const haystack = cleanString(text).toLowerCase();
  if (!haystack) return null;
  const pool = artists || getPublicArtists();

  let best = null;
  for (const artist of pool) {
    const candidates = artistNameVariants(artist);
    for (const candidate of candidates) {
      const needle = cleanString(candidate).toLowerCase();
      if (needle.length < 3) continue;
      if (haystack.includes(needle) && (!best || needle.length > best.needle.length)) {
        best = { artist, needle };
      }
    }
  }
  return best?.artist || null;
}

export function getArtistImageUrl(item = {}, options = {}) {
  const publicArtists = options.artists || getPublicArtists();
  const explicitName = options.name || getArtistDisplayName(item);
  const isArtistEntry = options.isArtist || item?.is_artist_entry || item?.type === "artist";
  if (isArtistEntry) {
    const directImage = directImageFromCandidate(item);
    if (directImage) return addVersion(directImage, versionFromCandidate(item));
  }
  const publicProfile = findArtistProfileByName(explicitName, publicArtists);
  const nestedProfiles = [
    ...(Array.isArray(item?.artists) ? item.artists : []),
    ...(Array.isArray(item?.primary_artists) ? item.primary_artists : []),
    ...(Array.isArray(item?.featured_artist_profiles) ? item.featured_artist_profiles : []),
    ...(Array.isArray(item?.featured_artists) ? item.featured_artists : []),
  ].filter((candidate) => candidate && typeof candidate === "object");
  const wanted = cleanString(explicitName).toLowerCase();
  const normalizedWanted = normaliseArtistName(wanted);
  const matchingNestedProfiles = nestedProfiles.filter((candidate) => {
    const keys = artistNameKeys(candidate);
    return keys.includes(wanted) || keys.includes(normalizedWanted);
  });

  const candidates = [
    item?.artist_profile,
    item?.artistProfile,
    item?.profile,
    ...matchingNestedProfiles,
    publicProfile,
    item,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const image = valueFromCandidate(candidate);
    if (image) return addVersion(image, versionFromCandidate(candidate) || versionFromCandidate(item));
  }

  return "";
}

export function withResolvedArtistImage(item = {}, options = {}) {
  const artistProfile = item?.artist_profile || item?.artistProfile || item?.profile || null;
  const publicProfile = findArtistProfileByName(options.name || getArtistDisplayName(item), options.artists || getPublicArtists()) || {};
  const image = getArtistImageUrl(item, options);
  return {
    ...item,
    artist_profile: artistProfile || publicProfile,
    image,
  };
}
