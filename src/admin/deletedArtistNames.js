// Tombstones artist names an editor intentionally deleted, so automatic
// reconciliation (see reconcileMissingArtists in pages/ChartEntriesPage.jsx)
// never silently recreates them from a still-unlinked release credit. The
// only way a tombstoned name comes back is a human explicitly creating a
// new Artist record with that name through the Artists resource form —
// see clearDeletedArtistNames, called from ResourcePage.jsx on create.
const DELETED_ARTIST_NAMES_KEY = "cms_deleted_artist_names_v1";
const MAX_ENTRIES = 2000;

function storageOrNull(storage) {
  if (storage) return storage;
  try {
    if (typeof window !== "undefined") return window.localStorage;
  } catch {}
  return null;
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

function load(storage) {
  const target = storageOrNull(storage);
  if (!target) return {};
  try {
    const parsed = JSON.parse(target.getItem(DELETED_ARTIST_NAMES_KEY) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function persist(map, storage) {
  const target = storageOrNull(storage);
  if (!target) return;
  const entries = Object.entries(map)
    .sort(([, left], [, right]) => String(right).localeCompare(String(left)))
    .slice(0, MAX_ENTRIES);
  try {
    target.setItem(DELETED_ARTIST_NAMES_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {}
}

function aliasNames(aliases) {
  if (Array.isArray(aliases)) return aliases;
  if (!aliases || typeof aliases !== "string") return [];
  try {
    const parsed = JSON.parse(aliases);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return aliases.split(",").map((item) => item.trim()).filter(Boolean);
}

// Collects every name form an artist row is known by, for tombstoning or
// clearing in one call: name, display_name, public_name, and aliases.
export function artistNameVariants(artist = {}) {
  return [
    artist.name, artist.display_name, artist.public_name,
    ...aliasNames(artist.aliases),
  ].filter(Boolean);
}

export function recordDeletedArtistNames(names = [], storage) {
  const keys = names.map(normalizeName).filter(Boolean);
  if (!keys.length) return;
  const map = load(storage);
  const now = new Date().toISOString();
  keys.forEach((key) => { map[key] = now; });
  persist(map, storage);
}

export function clearDeletedArtistNames(names = [], storage) {
  const keys = names.map(normalizeName).filter(Boolean);
  if (!keys.length) return;
  const map = load(storage);
  let changed = false;
  keys.forEach((key) => {
    if (key in map) { delete map[key]; changed = true; }
  });
  if (changed) persist(map, storage);
}

export function isDeletedArtistName(name, storage) {
  const key = normalizeName(name);
  if (!key) return false;
  return Object.prototype.hasOwnProperty.call(load(storage), key);
}

export { DELETED_ARTIST_NAMES_KEY };
