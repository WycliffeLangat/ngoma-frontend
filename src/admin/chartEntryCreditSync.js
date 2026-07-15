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

// A credit segment that exactly matches an already-registered artist's own
// name (e.g. a duo/group act whose name contains "&", like "Vestine &
// Dorcas") must never be torn apart into its individual words — otherwise
// an unrelated merge/delete for someone who just happens to share one of
// those words (e.g. a different, solo "Dorcas") would match a fragment of
// the duo's name and rewrite the duo's credit on every release it appears
// on. registeredKeys is a Set of normalized (trimmed, lowercased) names of
// every currently-registered Artist record.
//
// Commas always separate distinct credited entries — even a duo's own name
// never contains one — so split on commas first and only break a segment
// further on &/ft/feat/x if that whole segment isn't itself a registered
// act name. This protects a registered duo even when it's one of several
// names in a longer list (e.g. "Vestine & Dorcas, Bien"), not only when it's
// the entire credit string. Mirrors splitOrKeepRegistered in
// ChartEntriesPage.jsx's reconcileMissingArtists(), extended to segments.
function splitCreditNamesKeepingRegistered(value, registeredKeys) {
  const text = String(value || "").trim();
  if (!text) return [];
  if (!registeredKeys || !registeredKeys.size) return splitCreditNames(text);
  return text.split(/\s*,\s*/).flatMap((segment) => {
    const trimmed = segment.trim();
    if (!trimmed) return [];
    if (registeredKeys.has(normalizeName(trimmed))) return [trimmed];
    return trimmed
      .split(/\s*(?:\||\bft\.?|\bfeat\.?|\bfeaturing\b|\bx\b|&)\s*/i)
      .map((name) => name.trim())
      .filter(Boolean);
  });
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
// variants — used to skip a PATCH when there's nothing to fix. Pass
// registeredKeys (a Set of normalized names of currently-registered
// artists) so a credit that's itself a registered duo/group name isn't
// split into words and false-matched against one of its own members.
export function creditTextMentions(text, oldNames, registeredKeys) {
  const oldKeys = new Set((Array.isArray(oldNames) ? oldNames : [oldNames]).map(normalizeName).filter(Boolean));
  if (!oldKeys.size) return false;
  return splitCreditNamesKeepingRegistered(text, registeredKeys).some((name) => oldKeys.has(normalizeName(name)));
}

// Replace or remove one artist's name variants inside a free-text credit
// string without disturbing any other names already listed there. Passing
// newName === null removes the name entirely (hard delete); otherwise it's
// swapped in (merge), de-duplicated against a name already present. See
// creditTextMentions for what registeredKeys protects against.
export function rewriteCreditText(text, oldNames, newName = null, registeredKeys) {
  const oldKeys = new Set((Array.isArray(oldNames) ? oldNames : [oldNames]).map(normalizeName).filter(Boolean));
  if (!oldKeys.size) return String(text || "").trim();
  const seen = new Set();
  const tokens = splitCreditNamesKeepingRegistered(text, registeredKeys)
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
  const [release, rawEntries] = await Promise.all([
    cmsApi.get(`/releases/${releaseId}/`),
    cmsApi.get(`/chart-entries/?release=${releaseId}&page_size=500`).then(getResults),
  ]);
  // Never trust the backend's `release` filter blindly — a request that
  // returns even one row belonging to a different release would silently
  // spread this release's credit text onto a completely unrelated one.
  const entries = rawEntries.filter((entry) => Number(entry.release) === Number(releaseId));
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
