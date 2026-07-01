function artistSetKey(primaryStr, featuredStr) {
  const seen = new Set();
  const all = [];
  [
    ...String(primaryStr || "").split(/\s*(?:\||\bft\.?|\bfeat\.?|\bfeaturing\b|\bx\b|&|,)\s*/i),
    ...String(featuredStr || "").split(/,\s*/),
  ].forEach((name) => {
    const n = String(name || "").trim().toLowerCase();
    if (n && !seen.has(n)) { seen.add(n); all.push(n); }
  });
  return all.sort().join("+");
}

const releaseKey = (entry = {}) => {
  const title = String(entry.t || entry.title || "").trim().toLowerCase();
  const primary = String(entry.a || entry.primary_artist || entry.artist || "").trim();
  const featured = String(entry.fa || entry.featured_artists || "").trim();
  return `${title}|||${artistSetKey(primary, featured)}`;
};

const hasValue = (value) => value !== undefined && value !== null && value !== "";

function mergeReleaseMetadata(target, source) {
  ["t", "a", "fa", "y", "c", "co", "cc", "release_id", "primary_artists", "featured_artist_profiles"].forEach((field) => {
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
  countryName = "",
  resolveCountry = (entry) => ({
    country: entry.co || entry.country,
    code: entry.cc || entry.country_code,
  }),
  limit = 50,
}) {
  const platformData = full?.[chartType]?.platforms || {};
  const platforms = Object.entries(platformData);
  const targetCountry = String(countryCode || "").trim().toUpperCase();
  const targetCountryName = String(countryName || "").trim().toLowerCase();
  const releases = new Map();

  platforms.forEach(([platform, months]) => {
    (months?.[month] || []).forEach((entry) => {
      const key = releaseKey(entry);
      if (!key || key === "|||") return;

      const current = releases.get(key) || {
        ...entry,
        rawPoints: 0,
        platforms: new Set(),
        matchesCountry: true,
      };

      mergeReleaseMetadata(current, entry);
      current.rawPoints += Number(entry.rp ?? entry.raw_total_points ?? entry.p) || 0;
      current.platforms.add(platform);
      current.w = Math.max(Number(current.w) || 0, Number(entry.w) || 0) || current.w;
      const resolvedCountry = resolveCountry(entry) || {};
      const resolvedCode = String(resolvedCountry.code || "").trim().toUpperCase();
      const resolvedName = String(resolvedCountry.country || "").trim().toLowerCase();
      const exactCountryMatch =
        resolvedCode === targetCountry &&
        (!targetCountryName || resolvedName === targetCountryName);
      // One blank, conflicting, or non-Kenyan platform row disqualifies the
      // release. Kenyan-only charts must never infer eligibility from a
      // partial match.
      current.matchesCountry = current.matchesCountry && exactCountryMatch;
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
      p: index < 50 ? 50 - index : 0,
      rp: entry.rawPoints,
      pl: `${entry.platforms.size}/${platforms.length}`,
      cc: targetCountry,
      rawPoints: undefined,
      platforms: undefined,
      matchesCountry: undefined,
    }));
}
