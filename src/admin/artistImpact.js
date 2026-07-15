import { cmsApi, getResults } from "./api";
import { artistNameVariants } from "./deletedArtistNames";
import { creditTextMentions, rewriteCreditText, syncChartEntryFeaturedArtistsForReleases } from "./chartEntryCreditSync";

const CHART_TYPES = ["singles", "albums"];
const MAX_TEXT_RISK_RESULTS = 20;

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

// Every currently-registered artist's name, normalized — so a credit that's
// itself a registered duo/group act (e.g. "Vestine & Dorcas") is never torn
// apart into its individual words and false-matched against one of them (see
// creditTextMentions/rewriteCreditText in chartEntryCreditSync.js). Cached
// for 60s by cmsApi's GET cache, so calling this per-artist in a bulk
// delete/merge is cheap after the first request.
async function fetchRegisteredArtistNameKeys() {
  const options = await cmsApi.get("/artists/options/").catch(() => []);
  const keys = new Set();
  (Array.isArray(options) ? options : getResults(options)).forEach((item) => {
    const key = normalize(item.public_name || item.display_name || item.name || item.label);
    if (key) keys.add(key);
  });
  return keys;
}

// A release is a "resurfacing risk" for this artist if a free-text credit
// field names them (as a distinct credited name, not merely a substring of
// some other registered act's name) but isn't backed by a structured link
// to them. Deleting the artist can't touch that text, so reconciliation
// (see reconcileMissingArtists in pages/ChartEntriesPage.jsx) will keep
// finding the name there and flag it as missing again.
function textRiskFields(release) {
  return [
    release.artist_display, release.artist_credit, release.a, release.artist,
    release.artist_name, release.primary_artist, release.pa,
    release.featured_artist_credit, release.featured_artists, release.fa,
  ].filter(Boolean).map(String);
}

/**
 * Previews what deleting or merging away one artist record will affect:
 *  - linkedReleases: releases structurally linked to them right now (via
 *    /artists/{id}/releases/) — this credit is reassigned on merge, or lost
 *    on a hard delete.
 *  - textRiskReleases: releases whose free-text credit fields mention this
 *    artist's name but aren't necessarily backed by that structured link —
 *    these are exactly the releases that will make the name resurface as
 *    "missing" after the artist record is gone, unless fixed first.
 * This is a fast, targeted check (search by name, not a full-catalog scan),
 * so it's a strong signal but not an exhaustive guarantee — the Data Quality
 * report's "featured artists are unlinked" / "may split a registered
 * duo/group act" alerts are the authoritative full-catalog version.
 */
export async function computeArtistImpact(artist) {
  const names = artistNameVariants(artist);
  const nameKeys = new Set(names.map(normalize).filter(Boolean));
  if (!nameKeys.size) return { linkedReleases: [], textRiskReleases: [], error: "" };

  // A name-only "artist" (no Artist record — e.g. a credit that only ever
  // existed as free text in Chart Entries) has nothing to look up here, but
  // the text-risk scan below still works from the name alone.
  let linkedReleases = [];
  let error = "";
  if (artist?.id) {
    try {
      const data = await cmsApi.get(`/artists/${artist.id}/releases/`);
      linkedReleases = Array.isArray(data) ? data : [];
    } catch (e) {
      error = e.message;
    }
  }

  const candidates = new Map();
  if (nameKeys.size) {
    const searches = names.flatMap((name) =>
      CHART_TYPES.map((chartType) =>
        cmsApi.get(`/releases/?search=${encodeURIComponent(name)}&chart_type=${chartType}&page_size=${MAX_TEXT_RISK_RESULTS}`)
          .then(getResults)
          .catch(() => [])
      )
    );
    const results = await Promise.all(searches);
    results.flat().forEach((release) => {
      if (release?.id) candidates.set(release.id, release);
    });
  }

  const registeredKeys = await fetchRegisteredArtistNameKeys();
  const textRiskReleases = [...candidates.values()].filter((release) =>
    textRiskFields(release).some((text) => creditTextMentions(text, names, registeredKeys))
  );

  return { linkedReleases, textRiskReleases, error };
}

/**
 * Runs right after an artist merge/delete actually completes: rewrites the
 * writable free-text "featured artists" field on every textRiskReleases
 * release that still names the old artist (merge: swapped to the keeper's
 * name; delete: removed), then pushes each affected release's corrected
 * credit into every existing chart_entries row tied to it — otherwise the
 * old name keeps showing, and keeps aggregating into the public artist
 * chart, on historical months even though the Artist record itself is gone.
 * newName === null means the artist was deleted outright (name removed,
 * not replaced).
 */
export async function applyArtistImpactCorrections(impact, { oldNames, newName = null } = {}) {
  const { linkedReleases = [], textRiskReleases = [] } = impact || {};
  const registeredKeys = await fetchRegisteredArtistNameKeys();
  let releasesFixed = 0;
  const fixFailures = [];
  for (const release of textRiskReleases) {
    const current = String(release.featured_artists || "");
    if (!creditTextMentions(current, oldNames, registeredKeys)) continue;
    try {
      await cmsApi.patch(`/releases/${release.id}/`, { featured_artists: rewriteCreditText(current, oldNames, newName, registeredKeys) });
      releasesFixed += 1;
    } catch (e) {
      fixFailures.push({ release, error: e });
    }
  }
  const affectedIds = [...new Set([...linkedReleases, ...textRiskReleases].map((r) => r.id).filter(Boolean))];
  const syncResult = await syncChartEntryFeaturedArtistsForReleases(affectedIds);
  return { releasesFixed, fixFailures, ...syncResult };
}
