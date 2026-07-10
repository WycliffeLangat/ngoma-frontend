// Pure utility functions used across chart pages.
// None of these depend on React state, FULL/MONTHS data, or module-level
// mutable values — they are safe to import anywhere.

// ── Release field accessors ───────────────────────────────────────────────

export const releaseTitle = (item = {}) =>
  item.t || item.title || item.release_title || item.name || "";

// Normalise "ft"/"ft." → "ft." so both display consistently with a period.
export const normFt = (s) => String(s || "").replace(/\bft\.?(?!\w)/gi, "ft.");

// Strip pipe-separated internal aliases from artist names.
// The backend uses "|" as an alias separator (e.g. "Toxic Lyrikali|Countree Hype")
// for internal lookups, but only the canonical name before the pipe should
// ever be shown to users.
export const cleanArtistDisplay = (s) => String(s || "").split("|")[0].trim();

export const releaseArtist = (item = {}) =>
  normFt(
    cleanArtistDisplay(
      item.artist_credit || item.a || item.artist ||
      item.artist_name || item.primary_artist || ""
    )
  );

// ── Artist credit formatting ───────────────────────────────────────────────

export const formatCreditMembers = (members = []) => {
  const unique = [
    ...new Map(
      members
        .map((m) => String(m || "").trim())
        .filter(Boolean)
        .map((m) => [m.toLowerCase(), m])
    ).values(),
  ];
  if (unique.length <= 1) return unique[0] || "";
  if (unique.length === 2) return unique.join(" & ");
  return `${unique.slice(0, -1).join(", ")} & ${unique[unique.length - 1]}`;
};

export const profileNames = (profiles = []) =>
  profiles
    .map((a) => a?.public_name || a?.display_name || a?.name || a)
    .map((n) => String(n || "").trim())
    .filter(Boolean);

export const splitCreditNames = (value = "") =>
  String(value || "")
    .split(/\s*,\s*|\s*&\s*|\s+ft\.?\s+|\s+feat\.?\s+|\s+featuring\s+/i)
    .map((n) => n.trim())
    .filter(Boolean);

export const artistCreditMembers = (item = {}) => {
  const structuredPrimary = profileNames(item.primary_artists);
  const structuredFeatured = profileNames(item.featured_artist_profiles);
  const primaryArtist = String(
    item.primary_artist_credit || item.primary_artist || item.pa || ""
  ).trim();
  const featuredArtists = String(
    item.featured_artist_credit || item.featured_artists || item.fa || ""
  ).trim();
  // Resolve primary and featured credits independently. A release can have a
  // linked primary profile while its featured artists are still text-only; the
  // previous all-or-nothing branch silently dropped those featured artists.
  const resolvedPrimary = structuredPrimary.length
    ? structuredPrimary
    : splitCreditNames(primaryArtist);
  const resolvedFeatured = structuredFeatured.length
    ? structuredFeatured
    : splitCreditNames(featuredArtists);
  const source = resolvedPrimary.length || resolvedFeatured.length
    ? [...resolvedPrimary, ...resolvedFeatured]
    : splitCreditNames(item.artist_credit || item.artist || item.a || "");
  return [
    ...new Map(
      source
        .map((m) => String(m || "").trim())
        .filter(Boolean)
        .map((m) => [m.toLowerCase(), m])
    ).values(),
  ];
};

export const formatArtistCredit = (
  primaryArtist = "",
  featuredArtists = "",
  primaryArtists = [],
  featuredProfiles = []
) => {
  const primaryNames = profileNames(primaryArtists).length
    ? profileNames(primaryArtists)
    : splitCreditNames(primaryArtist);
  const featuredNames = profileNames(featuredProfiles).length
    ? profileNames(featuredProfiles)
    : splitCreditNames(featuredArtists);
  const primaryCredit = formatCreditMembers(primaryNames);
  const featuredCredit = formatCreditMembers(
    featuredNames.filter(
      (n) => !primaryNames.some((p) => p.toLowerCase() === n.toLowerCase())
    )
  );
  return featuredCredit ? `${primaryCredit} & ${featuredCredit}` : primaryCredit;
};

// ── General helpers ───────────────────────────────────────────────────────

// Returns the first value in the argument list that parses as a finite number.
export const firstFiniteNumber = (...values) => {
  for (const v of values) {
    if (v === undefined || v === null || v === "") continue;
    const parsed = Number(String(v).replace(/,/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

// Canonical cache key for certification lookups.
export const certificationKey = (title = "", artist = "") =>
  `${String(title).trim().toLowerCase()}|||${String(artist).trim().toLowerCase()}`;

// ── Date / platform helpers ───────────────────────────────────────────────

const MONTH_NUMBER = {
  January: 1, February: 2, March: 3, April: 4,
  May: 5, June: 6, July: 7, August: 8,
  September: 9, October: 10, November: 11, December: 12,
};

// Splits a backend month label into its numeric month and year.
export function getMonthYearParts(label) {
  const [monthName, year] = label.split(" ");
  return { monthNumber: MONTH_NUMBER[monthName], year };
}

// Converts a platform display name to a URL-safe slug (e.g. "Apple Music" → "apple-music").
export function platformToSlug(platform) {
  if (!platform || platform === "Combined") return "combined";
  return platform.toLowerCase().replace(/\s+/g, "-");
}

// ── Artist key helpers ────────────────────────────────────────────────────

// Strips "ft. X", "& Y", "x Z" suffixes — used for CMS artist lookups where
// only the primary/first name is needed.
export function normArtistKey(str) {
  return String(str || "")
    .trim()
    .toLowerCase()
    .replace(/\s*\|\s*.+$/, "")
    .replace(/\s+(?:ft\.?|feat\.?|featuring|w\/)\s+.+$/i, "")
    .replace(/\s+x\s+.+$/i, "")
    .replace(/\s+&\s+.+$/i, "")
    .trim();
}

// Produces a sorted, deduplicated artist-set key so collaborations match
// regardless of billing order ("Bien ft. Alikiba" === "Alikiba ft. Bien").
export function artistSetKey(primaryStr, featuredStr) {
  const seen = new Set();
  const all = [];
  [
    ...String(primaryStr || "").split(
      /\s*(?:\||\bft\.?|\bfeat\.?|\bfeaturing\b|\bx\b|&|,)\s*/i
    ),
    ...String(featuredStr || "").split(/,\s*/),
  ].forEach((name) => {
    const n = String(name || "").trim().toLowerCase();
    if (n && !seen.has(n)) { seen.add(n); all.push(n); }
  });
  return all.sort().join("+");
}

// Canonical identity key for a chart entry — used to detect duplicate releases.
export const entryKey = (e) => {
  const title = String(e.t || e.title || "").trim().toLowerCase();
  const primary = String(e.primary_artist || e.a || e.artist || "").trim();
  const featured = String(e.fa || e.featured_artists || "").trim();
  return `${title}|||${artistSetKey(primary, featured)}`;
};

export const sameRelease = (left, right) => {
  const leftId = Number(left?.release_id);
  const rightId = Number(right?.release_id);
  if (leftId && rightId) return leftId === rightId;
  return entryKey(left) === entryKey(right);
};

const rankedRowsCache = new WeakMap();

// The backend owns rank normalization and both point systems. This helper
// only orders rows by the authoritative rank and preserves every score.
export function normalizeRankedRows(rows = []) {
  if (!Array.isArray(rows) || !rows.length) return [];
  if (rankedRowsCache.has(rows)) return rankedRowsCache.get(rows);

  const normalized = [...rows]
    .map((row, sourceIndex) => ({ row, sourceIndex }))
    .sort((left, right) => {
      const leftRank = Number(left.row?.r ?? left.row?.rank);
      const rightRank = Number(right.row?.r ?? right.row?.rank);
      const safeLeft = Number.isFinite(leftRank) && leftRank > 0 ? leftRank : Number.POSITIVE_INFINITY;
      const safeRight = Number.isFinite(rightRank) && rightRank > 0 ? rightRank : Number.POSITIVE_INFINITY;
      return safeLeft - safeRight || left.sourceIndex - right.sourceIndex;
    })
    .map(({ row }) => ({ ...row }));

  rankedRowsCache.set(rows, normalized);
  return normalized;
}

// ── Movement badge logic ──────────────────────────────────────────────────

// Returns a movement descriptor for a chart entry.
// { t: "new" | "reentry" | "up" | "down" | "same", v?: number }
export const mv = (e) => {
  const movementType = String(e.movement || e.movement_type || "").toLowerCase();
  if (
    e.reentry ||
    movementType === "reentry" ||
    movementType === "re-entry" ||
    movementType === "re" ||
    movementType === "r.e"
  )
    return { t: "reentry" };
  if (e.is_new || movementType === "new") return { t: "new" };
  if (e.prev === null || e.prev === undefined || e.prev === "") return { t: "new" };
  const d = e.prev - e.rank;
  if (d > 0) return { t: "up", v: d };
  if (d < 0) return { t: "down", v: Math.abs(d) };
  return { t: "same" };
};

export const resolveMovementFromHistory = ({
  historyAvailable = false,
  appearedBefore = false,
  appearedPreviousMonth = false,
  previousRank = null,
  backendPrevRank = null,
  backendLastMonth = null,
  backendMovement = "",
} = {}) => {
  if (!historyAvailable) {
    const movementType = String(backendMovement || "").toLowerCase();
    return {
      prev: backendPrevRank ?? null,
      lastMonth:
        backendLastMonth !== null &&
        backendLastMonth !== undefined &&
        backendLastMonth !== ""
          ? backendLastMonth
          : backendPrevRank ?? "—",
      isNew: movementType === "new",
      reentry:
        movementType === "reentry" ||
        movementType === "re-entry" ||
        movementType === "re",
      movement: backendMovement,
    };
  }

  const prev = appearedPreviousMonth
    ? previousRank ?? backendPrevRank ?? null
    : null;
  const isNew = !appearedBefore;
  const reentry = !appearedPreviousMonth && appearedBefore;

  return {
    prev,
    lastMonth: prev ?? "—",
    isNew,
    reentry,
    movement: isNew ? "new" : reentry ? "reentry" : undefined,
  };
};

// ── News / certifications data mapping ───────────────────────────────────

const NEWS_CATEGORY_LABELS = {
  chart_news: "CHART NEWS",
  milestones: "MILESTONES",
  new_releases: "NEW RELEASES",
  industry_news: "INDUSTRY NEWS",
  artist_news: "ARTIST NEWS",
  awards: "AWARDS",
  certifications: "CERTIFICATIONS",
  records: "RECORDS",
  interviews: "INTERVIEWS",
  editorials: "EDITORIALS",
  artist_spotlight: "ARTIST SPOTLIGHT",
  albums: "ALBUMS",
  analytics: "ANALYTICS",
  announcement: "ANNOUNCEMENT",
};

// Transforms raw API news objects into the shape used by the frontend.
const normalizeNewsMedia = (n = {}) => {
  const media = Array.isArray(n.media) ? n.media : [];
  return media
    .map((item) => {
      if (typeof item === "string") return { url: item };
      if (!item || typeof item !== "object") return null;
      const url = item.url || item.src || item.image || item.cover_image || "";
      return url ? { ...item, url } : null;
    })
    .filter(Boolean);
};

export const mapPublicNews = (items = []) =>
  items.map((n) => {
    const media = normalizeNewsMedia(n);
    return {
      ...n,
      id: n.id,
      date: n.published_at
        ? new Date(n.published_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "",
      cat:
        NEWS_CATEGORY_LABELS[n.category] ||
        (n.category || "").toUpperCase().replace(/_/g, " "),
      emoji: n.emoji || "",
      title: n.title || "",
      excerpt: n.excerpt || "",
      body: n.body || "",
      media,
      cover_image: media[0]?.url || n.cover_image || "",
    };
  });
