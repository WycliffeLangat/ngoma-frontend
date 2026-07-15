// chart_entries rows snapshot their own copy of featured-artist credit text
// when they're created and are never touched again just because a release
// is edited afterward (or an artist behind that credit is merged/deleted).
// That's why a removed or merged featured artist can keep showing — and
// keep aggregating into the public artist chart — on every already-published
// month for a release, even after the release itself looks correct.
//
// This module pushes a release's current, authoritative credit back into
// every chart_entries row already tied to it, and provides the free-text
// rewrite used when an artist behind that credit is merged or deleted.
import { cmsApi, getResults } from "./api.js";

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

function creditListText(names) {
  const list = names.map((name) => String(name || "").trim()).filter(Boolean);
  if (list.length <= 1) return list.join("");
  if (list.length === 2) return `${list[0]} & ${list[1]}`;
  return `${list.slice(0, -1).join(", ")} & ${list[list.length - 1]}`;
}

function splitCreditNames(value) {
  return String(value || "")
    .split(/\s*(?:\||\bft\.?|\bfeat\.?|\bfeaturing\b|\bx\b|&|,)\s*/i)
    .map((name) => name.trim())
    .filter(Boolean);
}

// Structured Artist links win over the free-text "unlinked names" fallback —
// the same precedence publicChartMirror.js and reconcileMissingArtists() use
// to build the public artist chart, so this matches what the site will show.
export function releaseFeaturedArtistsText(release = {}) {
  const structured = (release.featured_artist_profiles || [])
    .map((profile) => profile?.public_name || profile?.display_name || profile?.name)
    .filter(Boolean);
  if (structured.length) return creditListText(structured);
  return String(release.featured_artists || "").trim();
}

// True if a free-text credit string names any of the given artist name
// variants — used to skip a PATCH when there's nothing to fix.
export function creditTextMentions(text, oldNames) {
  const oldKeys = new Set((Array.isArray(oldNames) ? oldNames : [oldNames]).map(normalizeName).filter(Boolean));
  if (!oldKeys.size) return false;
  return splitCreditNames(text).some((name) => oldKeys.has(normalizeName(name)));
}

// Replace or remove one artist's name variants inside a free-text credit
// string without disturbing any other names already listed there. Passing
// newName === null removes the name entirely (hard delete); otherwise it's
// swapped in (merge), de-duplicated against a name already present.
export function rewriteCreditText(text, oldNames, newName = null) {
  const oldKeys = new Set((Array.isArray(oldNames) ? oldNames : [oldNames]).map(normalizeName).filter(Boolean));
  if (!oldKeys.size) return String(text || "").trim();
  const seen = new Set();
  const tokens = splitCreditNames(text)
    .map((name) => (oldKeys.has(normalizeName(name)) ? newName : name))
    .filter(Boolean)
    .filter((name) => {
      const key = normalizeName(name);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return creditListText(tokens);
}

/**
 * Fetches a release's current, authoritative credit and pushes it into
 * every chart_entries row already tied to it (all months, all platforms),
 * fixing any that still snapshot older/stale credit text.
 */
export async function syncChartEntryFeaturedArtists(releaseId) {
  if (!releaseId) return { updated: 0, failed: 0, total: 0 };
  const [release, entries] = await Promise.all([
    cmsApi.get(`/releases/${releaseId}/`),
    cmsApi.get(`/chart-entries/?release=${releaseId}&page_size=500`).then(getResults),
  ]);
  const nextText = releaseFeaturedArtistsText(release);
  const stale = entries.filter((entry) => String(entry.featured_artists || "").trim() !== nextText);
  let updated = 0;
  let failed = 0;
  await Promise.all(stale.map(async (entry) => {
    try {
      await cmsApi.patch(`/chart-entries/${entry.id}/`, { featured_artists: nextText });
      updated += 1;
    } catch {
      failed += 1;
    }
  }));
  return { updated, failed, total: stale.length };
}

export async function syncChartEntryFeaturedArtistsForReleases(releaseIds) {
  const ids = [...new Set((releaseIds || []).map((id) => Number(id)).filter(Boolean))];
  const results = await Promise.all(
    ids.map((id) => syncChartEntryFeaturedArtists(id).catch(() => ({ updated: 0, failed: 1, total: 0 })))
  );
  return results.reduce((acc, r) => ({
    updated: acc.updated + r.updated,
    failed: acc.failed + r.failed,
    total: acc.total + r.total,
  }), { updated: 0, failed: 0, total: 0 });
}
