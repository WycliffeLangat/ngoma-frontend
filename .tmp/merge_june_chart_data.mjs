import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";


const root = process.cwd();
const sourcePath = path.join(root, "src", "data", "chartData.js");
const payloadPath = path.join(root, ".tmp", "june_backend_payload.json");
const { MONTHS, FULL } = await import(`${pathToFileURL(sourcePath).href}?v=${Date.now()}`);
const payload = JSON.parse(await fs.readFile(payloadPath, "utf8"));
const month = "June 2026";

const clean = (value) =>
  String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const identityKey = (chartType, row) =>
  `${chartType}|${clean(row.t || row.title)}|${clean(
    row.pa || row.primary_artist || row.a || row.artist
  )}`;

const embeddedArtists = (row) => [
  ...(Array.isArray(row.primary_artists) ? row.primary_artists : []),
  ...(Array.isArray(row.featured_artist_profiles) ? row.featured_artist_profiles : []),
];

const priorRows = [];
for (const chartType of ["singles", "albums"]) {
  for (const rows of Object.values(FULL[chartType].combined || {})) {
    for (const row of rows) priorRows.push({ chartType, row, priority: 2 });
  }
  for (const months of Object.values(FULL[chartType].platforms || {})) {
    for (const rows of Object.values(months || {})) {
      for (const row of rows) priorRows.push({ chartType, row, priority: 1 });
    }
  }
}

const priorByRelease = new Map();
const artistsByName = new Map();
for (const item of priorRows) {
  const key = identityKey(item.chartType, item.row);
  const previous = priorByRelease.get(key);
  if (!previous || item.priority > previous.priority) priorByRelease.set(key, item);
  for (const artist of embeddedArtists(item.row)) {
    for (const name of [
      artist?.name,
      artist?.display_name,
      artist?.public_name,
      ...(Array.isArray(artist?.aliases) ? artist.aliases : []),
    ]) {
      const artistKey = clean(name);
      if (artistKey && !artistsByName.has(artistKey)) artistsByName.set(artistKey, artist);
    }
  }
}

const metadataFields = [
  "genre",
  "label",
  "distributor",
  "release_date",
  "isrc",
  "upc",
  "number_of_tracks",
  "songwriters",
  "producers",
  "cover_image",
  "spotify_url",
  "apple_music_url",
  "boomplay_url",
  "audiomack_url",
  "youtube_url",
  "tiktok_url",
  "shazam_url",
  "radio_info",
  "co",
  "cc",
  "fl",
  "y",
  "c",
];

const stableArtist = (profile) => {
  if (!profile) return null;
  const name = profile.display_name || profile.public_name || profile.name;
  return artistsByName.get(clean(name)) || { ...profile, id: undefined };
};

const mergeRow = (chartType, local) => {
  const prior = priorByRelease.get(identityKey(chartType, local))?.row;
  const merged = { ...local };
  delete merged.id;
  delete merged.release_id;
  delete merged.artist_id;

  if (prior) {
    if (prior.release_id) merged.release_id = prior.release_id;
    if (prior.artist_id) merged.artist_id = prior.artist_id;
    for (const field of metadataFields) {
      if ((merged[field] === "" || merged[field] == null) && prior[field] != null) {
        merged[field] = prior[field];
      }
    }
    merged.primary_artist_ids = prior.primary_artist_ids || [];
    merged.featured_artist_ids = prior.featured_artist_ids || [];
    merged.primary_artists = prior.primary_artists || [];
    merged.featured_artist_profiles = prior.featured_artist_profiles || [];
  } else {
    const primary = (local.primary_artists || []).map(stableArtist).filter(Boolean);
    const featured = (local.featured_artist_profiles || [])
      .map(stableArtist)
      .filter(Boolean);
    merged.primary_artists = primary;
    merged.featured_artist_profiles = featured;
    merged.primary_artist_ids = primary.map((artist) => artist.id).filter(Boolean);
    merged.featured_artist_ids = featured.map((artist) => artist.id).filter(Boolean);
    if (primary[0]?.id) merged.artist_id = primary[0].id;
  }
  return merged;
};

for (const chartType of ["singles", "albums"]) {
  FULL[chartType].combined[month] = payload.full[chartType].combined[month].map((row) =>
    mergeRow(chartType, row)
  );
  for (const platform of Object.keys(FULL[chartType].platforms)) {
    const rows = payload.full[chartType].platforms[platform]?.[month] || [];
    FULL[chartType].platforms[platform][month] = rows.map((row) =>
      mergeRow(chartType, row)
    );
  }
}

const updatedMonths = [...MONTHS.filter((value) => value !== month), month];
const output = [
  "// Generated from the published Ngoma Charts data. Do not edit chart rows by hand.",
  `export const MONTHS = ${JSON.stringify(updatedMonths)};`,
  `export const FULL = ${JSON.stringify(FULL)};`,
  "",
].join("\n");
await fs.writeFile(sourcePath, output, "utf8");

console.log(
  JSON.stringify(
    {
      months: updatedMonths.length,
      latest: updatedMonths.at(-1),
      singles: FULL.singles.combined[month].length,
      albums: FULL.albums.combined[month].length,
      singlePlatforms: Object.fromEntries(
        Object.entries(FULL.singles.platforms).map(([key, value]) => [
          key,
          value[month].length,
        ])
      ),
      albumPlatforms: Object.fromEntries(
        Object.entries(FULL.albums.platforms).map(([key, value]) => [
          key,
          value[month].length,
        ])
      ),
    },
    null,
    2
  )
);
