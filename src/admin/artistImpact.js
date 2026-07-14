import { cmsApi, getResults } from "./api";
import { artistNameVariants } from "./deletedArtistNames";

const CHART_TYPES = ["singles", "albums"];
const MAX_TEXT_RISK_RESULTS = 20;

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

// A release is a "resurfacing risk" for this artist if a free-text credit
// field literally contains their name but isn't backed by a structured
// link to them. Deleting the artist can't touch that text, so reconciliation
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
  if (!artist?.id) return { linkedReleases: [], textRiskReleases: [], error: "" };
  const names = artistNameVariants(artist);
  const nameKeys = new Set(names.map(normalize).filter(Boolean));

  let linkedReleases = [];
  let error = "";
  try {
    const data = await cmsApi.get(`/artists/${artist.id}/releases/`);
    linkedReleases = Array.isArray(data) ? data : [];
  } catch (e) {
    error = e.message;
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

  const textRiskReleases = [...candidates.values()].filter((release) =>
    textRiskFields(release).some((text) => {
      const value = normalize(text);
      return [...nameKeys].some((key) => value.includes(key));
    })
  );

  return { linkedReleases, textRiskReleases, error };
}
