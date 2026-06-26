import { resolveMediaUrl } from "../api/config.js";

const ARTIST_IMAGE_FIELDS = [
  "image",
  "image_url",
  "artist_image",
  "artist_image_url",
  "profile_image",
  "profile_image_url",
  "photo",
  "photo_url",
  "avatar",
  "avatar_url",
  "picture",
  "picture_url",
  "thumbnail",
  "thumbnail_url",
];

const VERSION_FIELDS = [
  "updated_at",
  "modified_at",
  "last_modified",
  "image_updated_at",
  "revision",
  "version",
];

function cleanString(value) {
  const text = String(value || "").trim();
  if (!text || text === "—" || text.toLowerCase() === "null" || text.toLowerCase() === "undefined") return "";
  return text;
}

function valueFromCandidate(candidate, fields = ARTIST_IMAGE_FIELDS) {
  if (!candidate) return "";
  if (typeof candidate === "string") return cleanString(candidate);

  if (typeof candidate === "object") {
    for (const field of fields) {
      const value = candidate[field];
      if (typeof value === "string") {
        const cleaned = cleanString(value);
        if (cleaned) return cleaned;
      }
      if (value && typeof value === "object") {
        const nested = value.url || value.secure_url || value.image || value.src;
        const cleaned = cleanString(nested);
        if (cleaned) return cleaned;
      }
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

export function findArtistProfileByName(name = "", artists = []) {
  const wanted = cleanString(name).toLowerCase();
  const normalizedWanted = normaliseArtistName(wanted);
  if (!wanted && !normalizedWanted) return null;

  return (artists || []).find((artist) => {
    const names = [artist?.name, artist?.display_name, artist?.public_name, ...(artist?.aliases || [])];
    return names.some((candidate) => {
      const current = cleanString(candidate).toLowerCase();
      return current && (current === wanted || current === normalizedWanted || normaliseArtistName(current) === normalizedWanted);
    });
  }) || null;
}

export function getPublicArtists() {
  if (typeof window === "undefined") return [];
  return window.__NGOMA_PUBLIC_DATA__?.artists || [];
}

export function getArtistImageUrl(item = {}, options = {}) {
  const publicArtists = options.artists || getPublicArtists();
  const explicitName = options.name || getArtistDisplayName(item);
  const publicProfile = findArtistProfileByName(explicitName, publicArtists);

  const candidates = [
    item?.artist_profile,
    item?.artistProfile,
    item?.profile,
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
