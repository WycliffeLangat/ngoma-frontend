import fs from "node:fs";

const recordsPath =
  "C:/Users/HP/Desktop/Ngoma Charts Folder/files/ngoma_charts_backend/backend/.tmp/live_cms_records_post_featured_cleanup.json";
const outPath =
  "C:/Users/HP/Desktop/Ngoma Charts Folder/files/ngoma_charts_backend/backend/.tmp/remaining_alert_queues.json";

const records = JSON.parse(fs.readFileSync(recordsPath, "utf8"));
const publicPayload = await (
  await fetch(`https://web-production-0f6b5.up.railway.app/api/v1/app-data/?_=${Date.now()}`, {
    headers: { "Cache-Control": "no-cache" },
  })
).json();

const normalize = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const normalizeCode = (value) => String(value ?? "").trim().toUpperCase();
const hasValue = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  return true;
};
const releaseArtistIds = (release) => {
  const fromList = (value) =>
    Array.isArray(value)
      ? value.map((item) => Number(item?.id ?? item?.value ?? item)).filter(Boolean)
      : [];
  return [
    ...fromList(release.primary_artist_ids),
    ...fromList(release.primary_artists),
    Number(release.artist_id ?? release.artist) || null,
  ].filter(Boolean);
};
const labelArtist = (artist) => artist?.display_name || artist?.public_name || artist?.name || `Artist #${artist?.id}`;
const labelRelease = (release) =>
  [release.title || release.canonical_title || `Release #${release.id}`, release.artist_display || release.artist_name || release.primary_artist]
    .filter(Boolean)
    .join(" - ");

const countriesByCode = new Map((records.countries || []).map((country) => [normalizeCode(country.code), country]).filter(([code]) => code));
const countriesByName = new Map((records.countries || []).map((country) => [normalize(country.name), country]).filter(([name]) => name));
[
  ["usa", "US"],
  ["america", "US"],
  ["united states", "US"],
  ["uk", "GB"],
  ["britain", "GB"],
  ["united kingdom", "GB"],
  ["tanzania", "TZ"],
  ["south korea", "KR"],
].forEach(([name, code]) => {
  const country = countriesByCode.get(code);
  if (country) countriesByName.set(normalize(name), country);
});

function countryProblem(row) {
  const country = String(row.country ?? "").trim();
  const code = normalizeCode(row.country_code);
  const problems = [];
  if (!country && !code) problems.push("Missing country and country code");
  else if (!country) problems.push(`Missing country name for code ${code}`);
  else if (!code) problems.push(`Missing country code for ${country}`);
  if (/\b(unknown|unsure|tbd|tba|n\/a|none|null|various|global|international)\b|\?/i.test(country)) {
    problems.push(`Country value looks unsure: ${country}`);
  }
  if (code && !/^[A-Z]{2}$/.test(code)) {
    problems.push(`Country code is not two letters: ${row.country_code}`);
  } else if (code && !countriesByCode.has(code)) {
    problems.push(`Country code ${code} is not configured in Countries`);
  }
  if (country && code && countriesByCode.has(code)) {
    const configured = countriesByCode.get(code);
    const alias = countriesByName.get(normalize(country));
    if (normalize(configured.name) !== normalize(country) && normalizeCode(alias?.code) !== code) {
      problems.push(`Country/code mismatch: ${country} is paired with ${code} (${configured.name})`);
    }
  }
  return problems.join("; ");
}

function publicIdsForType(type) {
  const ids = new Set();
  for (const row of publicPayload.releases || []) {
    const chartType = String(row.chart_type || "").includes("album") ? "albums" : "singles";
    if (chartType === type) ids.add(Number(row.id));
  }
  return ids;
}

const publicSongIds = publicIdsForType("singles");
const publicAlbumIds = publicIdsForType("albums");
const allReleases = [...records.songs, ...records.albums];
const artistById = new Map((records.artists || []).map((artist) => [Number(artist.id), artist]));
const scopedReleases = allReleases.filter((release) =>
  (release.chart_type === "albums" ? publicAlbumIds : publicSongIds).has(Number(release.id))
);
const chartedArtistIds = new Set();
for (const release of scopedReleases) releaseArtistIds(release).forEach((id) => chartedArtistIds.add(Number(id)));

function firstLeadArtist(release) {
  const id = releaseArtistIds(release)[0];
  return id ? artistById.get(Number(id)) : null;
}

function effectiveRelease(release, leadArtist) {
  if (hasValue(release.country) || hasValue(release.country_code) || !leadArtist) return release;
  return {
    ...release,
    country: leadArtist.country,
    country_code: leadArtist.country_code,
  };
}

const missingArtists = (records.artists || [])
  .filter((artist) => chartedArtistIds.has(Number(artist.id)))
  .filter((artist) => !["archived", "inactive"].includes(String(artist.status || "").toLowerCase()))
  .map((artist) => ({ id: artist.id, name: labelArtist(artist), country: artist.country, country_code: artist.country_code, problem: countryProblem(artist) }))
  .filter((row) => row.problem)
  .sort((a, b) => a.name.localeCompare(b.name));

const releaseCountryRows = scopedReleases
  .map((release) => {
    const lead = firstLeadArtist(release);
    const effective = effectiveRelease(release, lead);
    const problem = countryProblem(effective);
    const leadCode = normalizeCode(lead?.country_code);
    const releaseCode = normalizeCode(release.country_code);
    const mismatch = leadCode && releaseCode && leadCode !== releaseCode
      ? `Release country code ${releaseCode} does not match lead artist ${labelArtist(lead)} (${leadCode})`
      : "";
    return {
      id: release.id,
      title: release.title,
      chart_type: release.chart_type,
      label: labelRelease(release),
      artist_id: releaseArtistIds(release)[0] || null,
      lead_artist: lead ? labelArtist(lead) : "",
      country: release.country,
      country_code: release.country_code,
      problem: [problem, mismatch].filter(Boolean).join("; "),
    };
  })
  .filter((row) => row.problem)
  .sort((a, b) => a.chart_type.localeCompare(b.chart_type) || a.label.localeCompare(b.label));

const news = (records.news || [])
  .filter((article) => (article.status === "published" || article.is_published) && (!hasValue(article.cover_image) || !hasValue(article.seo_title) || !hasValue(article.seo_description)))
  .map((article) => ({
    id: article.id,
    title: article.title,
    related_artist: article.related_artist,
    related_release: article.related_release,
    missing: [
      !hasValue(article.cover_image) ? "cover_image" : "",
      !hasValue(article.seo_title) ? "seo_title" : "",
      !hasValue(article.seo_description) ? "seo_description" : "",
    ].filter(Boolean),
  }));

const featuredText = allReleases
  .filter((release) => scopedReleases.some((row) => Number(row.id) === Number(release.id)))
  .filter((release) => hasValue(release.featured_artists) && !(Array.isArray(release.featured_artist_ids) && release.featured_artist_ids.length))
  .map((release) => ({ id: release.id, title: release.title, chart_type: release.chart_type, label: labelRelease(release), featured_artists: release.featured_artists }));

const queues = {
  generated_at: new Date().toISOString(),
  counts: {
    missingArtists: missingArtists.length,
    releaseCountryRows: releaseCountryRows.length,
    songCountryRows: releaseCountryRows.filter((row) => row.chart_type === "singles").length,
    albumCountryRows: releaseCountryRows.filter((row) => row.chart_type === "albums").length,
    news: news.length,
    featuredText: featuredText.length,
  },
  missingArtists,
  releaseCountryRows,
  news,
  featuredText,
};
fs.writeFileSync(outPath, JSON.stringify(queues, null, 2), "utf8");
console.log(JSON.stringify(queues.counts, null, 2));
console.log(outPath);
