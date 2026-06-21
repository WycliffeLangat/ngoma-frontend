function normArtistKey(str) {
  return String(str || "")
    .trim()
    .toLowerCase()
    .replace(/\s*\|\s*.+$/, "")
    .replace(/\s+(?:ft\.?|feat\.?|featuring|w\/)\s+.+$/i, "")
    .replace(/\s+x\s+.+$/i, "")
    .replace(/\s+&\s+.+$/i, "")
    .trim();
}

const releaseKey = (entry = {}) =>
  `${String(entry.t || entry.title || "").trim().toLowerCase()}|||${normArtistKey(entry.a || entry.primary_artist || entry.artist || "")}`;

const hasValue = (value) => value !== undefined && value !== null && value !== "";

function mergeReleaseMetadata(target, source) {
  ["t", "a", "fa", "y", "c", "cc", "release_id", "primary_artists", "featured_artist_profiles"].forEach((field) => {
    if (!hasValue(target[field]) && hasValue(source[field])) target[field] = source[field];
  });
}

/**
 * Builds a country-only chart from the same platform points used by Combined.
 * Country eligibility is based on the primary artist attached to each release.
 */
export function buildRegionalCombinedRows({
  full,
  chartType = "singles",
  month,
  countryCode,
  resolveCountryCode = (entry) => entry.cc,
  limit = 50,
}) {
  const platformData = full?.[chartType]?.platforms || {};
  const platforms = Object.entries(platformData);
  const targetCountry = String(countryCode || "").trim().toUpperCase();
  const releases = new Map();

  platforms.forEach(([platform, months]) => {
    (months?.[month] || []).forEach((entry) => {
      const key = releaseKey(entry);
      if (!key || key === "|||") return;

      const current = releases.get(key) || {
        ...entry,
        rawPoints: 0,
        platforms: new Set(),
        matchesCountry: false,
      };

      mergeReleaseMetadata(current, entry);
      current.rawPoints += Number(entry.p) || 0;
      current.platforms.add(platform);
      current.w = Math.max(Number(current.w) || 0, Number(entry.w) || 0) || current.w;
      current.matchesCountry ||= String(resolveCountryCode(entry) || "").trim().toUpperCase() === targetCountry;
      releases.set(key, current);
    });
  });

  return [...releases.values()]
    .filter((entry) => entry.matchesCountry)
    .sort((left, right) =>
      right.rawPoints - left.rawPoints ||
      right.platforms.size - left.platforms.size ||
      String(left.t || "").localeCompare(String(right.t || "")) ||
      String(left.a || "").localeCompare(String(right.a || ""))
    )
    .slice(0, limit)
    .map((entry, index) => ({
      ...entry,
      r: index + 1,
      p: limit - index,
      rp: entry.rawPoints,
      pl: `${entry.platforms.size}/${platforms.length}`,
      cc: targetCountry,
      rawPoints: undefined,
      platforms: undefined,
      matchesCountry: undefined,
    }));
}
