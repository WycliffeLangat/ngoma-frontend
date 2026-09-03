import { resolveMediaUrl } from "../api/config.js";
import {
  artistCreditMembers,
  normArtistKey,
  profileNames,
  protectedArtistCreditNames,
} from "./chartHelpers.js";
import {
  KENYA_COUNTRY_CODE,
  africaCountryCodesForRegion,
  africaCountryForCode,
  africaRegionBackendKeys,
  countryChartColor,
  countryCodeFromAfricaChart,
  isAfricaChart,
  isAfricaRegionChart,
  regionKeyFromAfricaChart,
} from "./africaRegions.js";

const normalized = (value) => String(value || "").trim().toLowerCase();
const KENYAN_CHART = "Kenyan";
const isRegionalScope = (platform = "") => platform === KENYAN_CHART || isAfricaChart(platform);
const countryCodeForScope = (platform = "") => platform === KENYAN_CHART ? KENYA_COUNTRY_CODE : countryCodeFromAfricaChart(platform);

export function artistCreditNames(entry = {}, protectedNames = []) {
  return artistCreditMembers(entry, protectedNames);
}

function rankedTop50(rows = []) {
  return (Array.isArray(rows) ? rows : [])
    .map((row, sourceIndex) => ({ row, sourceIndex }))
    .sort((left, right) => {
      const leftRank = Number(left.row?.r ?? left.row?.rank);
      const rightRank = Number(right.row?.r ?? right.row?.rank);
      const safeLeft = Number.isFinite(leftRank) && leftRank > 0 ? leftRank : Number.POSITIVE_INFINITY;
      const safeRight = Number.isFinite(rightRank) && rightRank > 0 ? rightRank : Number.POSITIVE_INFINITY;
      return safeLeft - safeRight || left.sourceIndex - right.sourceIndex;
    })
    .map(({ row }) => ({ ...row }))
    .filter((row) => {
      const rank = Number(row.r ?? row.rank);
      return rank >= 1 && rank <= 50;
    })
    .slice(0, 50);
}

function platformRows(full, type, platform, month) {
  const platforms = full?.[type]?.platforms || {};
  const wanted = normalized(platform);
  const key = Object.keys(platforms).find((name) => normalized(name) === wanted);
  return key ? rankedTop50(platforms[key]?.[month]) : [];
}

function countryRows(full, type, code, month) {
  return rankedTop50(full?.[type]?.regions?.[code]?.[month]);
}

function rankRegionalRows(rows = []) {
  const grouped = new Map();
  rows.forEach(({ row, countryCode = "" }) => {
    if (!row) return;
    const key = row.release_id
      ? `id:${row.release_id}`
      : `${normalized(row.t || row.title)}|${normalized(row.artist_credit || row.a || row.artist)}`;
    if (!key || key === "|") return;
    const points = Number(row.p ?? row.pts ?? row.total_points) || 0;
    const rank = Number(row.r ?? row.rank) || Number.POSITIVE_INFINITY;
    const current = grouped.get(key) || {
      template: row,
      points: 0,
      bestRank: Number.POSITIVE_INFINITY,
      countryCodes: new Set(),
    };
    current.points += points;
    current.bestRank = Math.min(current.bestRank, rank);
    if (countryCode) current.countryCodes.add(countryCode);
    const templateRank = Number(current.template?.r ?? current.template?.rank) || Number.POSITIVE_INFINITY;
    const templatePoints = Number(current.template?.p ?? current.template?.pts ?? current.template?.total_points) || 0;
    if (rank < templateRank || (rank === templateRank && points > templatePoints)) current.template = row;
    grouped.set(key, current);
  });

  return [...grouped.values()]
    .sort((a, b) =>
      b.points - a.points ||
      a.bestRank - b.bestRank ||
      String(a.template?.t || a.template?.title || "").localeCompare(String(b.template?.t || b.template?.title || ""))
    )
    .slice(0, 50)
    .map((item, index) => ({
      ...item.template,
      r: index + 1,
      rank: index + 1,
      p: item.points,
      pts: item.points,
      region_country_codes: [...item.countryCodes],
    }));
}

function regionalRows(full, type, platform, month) {
  const countryCode = countryCodeForScope(platform);
  if (countryCode) return countryRows(full, type, countryCode, month);

  const regionKey = regionKeyFromAfricaChart(platform);
  if (!regionKey) return [];
  const regions = full?.[type]?.regions || {};
  for (const key of africaRegionBackendKeys(regionKey)) {
    const rows = rankedTop50(regions?.[key]?.[month]);
    if (rows.length) return rows;
  }
  return rankRegionalRows(
    africaCountryCodesForRegion(regionKey).flatMap((code) =>
      countryRows(full, type, code, month).map((row) => ({ row, countryCode: code }))
    )
  );
}

export function publicChartRows(payload, type, month, platform = "Combined") {
  if (normalized(platform) === "combined") {
    return rankedTop50(payload?.full?.[type]?.combined?.[month]);
  }
  if (isRegionalScope(platform)) {
    return regionalRows(payload?.full, type, platform, month);
  }
  return platformRows(payload?.full, type, platform, month);
}

function artistProfileMap(payload) {
  const map = new Map();
  (payload?.artists || []).forEach((artist) => {
    [artist.name, artist.display_name, artist.public_name, ...(artist.aliases || [])].forEach((name) => {
      const key = normalized(name);
      if (key) map.set(key, artist);
      const normalizedKey = normArtistKey(name);
      if (normalizedKey && !map.has(normalizedKey)) map.set(normalizedKey, artist);
    });
  });
  return map;
}

function artistProfileForName(profiles, name) {
  const key = normalized(name);
  if (!key) return null;
  return profiles.get(key) || profiles.get(normArtistKey(name)) || null;
}

function chartArtistCreditNames(entry = {}, protectedNames = [], profiles = new Map()) {
  const structuredKeys = new Set(
    [
      ...profileNames(entry.primary_artists),
      ...profileNames(entry.featured_artist_profiles),
    ].map(normArtistKey).filter(Boolean)
  );

  return artistCreditNames(entry, protectedNames).filter((name) => {
    const key = normArtistKey(name);
    if (!key) return false;
    return structuredKeys.has(key) || Boolean(artistProfileForName(profiles, name));
  });
}

function artistSourceRows(payload, month, platform = "Combined") {
  const full = payload?.full || {};
  const sources = [];
  const add = (type, platformName, rows) => rankedTop50(rows).forEach((row) => {
    sources.push({ ...row, sourceChartType: type, sourcePlatform: platformName });
  });

  if (normalized(platform) !== "combined") {
    if (isRegionalScope(platform)) {
      add("singles", platform, publicChartRows(payload, "singles", month, platform));
      add("albums", platform, publicChartRows(payload, "albums", month, platform));
      return sources;
    }
    add("singles", platform, platformRows(full, "singles", platform, month));
    add("albums", platform, platformRows(full, "albums", platform, month));
    return sources;
  }

  add("singles", "Combined", full?.singles?.combined?.[month]);
  add("albums", "Combined", full?.albums?.combined?.[month]);
  return sources;
}

function artistImage(profile = {}) {
  const raw = resolveMediaUrl(profile.image || profile.image_url || profile.photo || "");
  if (!raw) return "";
  const stamp = profile.updated_at || profile.modified_at || "";
  if (!stamp || /^data:|^blob:/i.test(raw)) return raw;
  return `${raw}${raw.includes("?") ? "&" : "?"}v=${encodeURIComponent(stamp)}`;
}

export function buildArtistMonthMirror(payload, month, platform = "Combined") {
  const profiles = artistProfileMap(payload);
  const protectedNames = protectedArtistCreditNames(payload?.artists || []);
  const regionalArtistRows = (() => {
    if (!isRegionalScope(platform)) return [];
    const countryCode = countryCodeForScope(platform);
    if (countryCode) return rankedTop50(payload?.full?.artists?.regions?.[countryCode]?.[month]);
    const regionKey = regionKeyFromAfricaChart(platform);
    const regions = payload?.full?.artists?.regions || {};
    for (const key of africaRegionBackendKeys(regionKey)) {
      const rows = rankedTop50(regions?.[key]?.[month]);
      if (rows.length) return rows;
    }
    return [];
  })();
  if (regionalArtistRows.length) {
    return regionalArtistRows.map((row) => {
      const name = row.t || row.title || row.pa || "";
      const profile = profiles.get(normalized(name)) || row.primary_artists?.[0] || {};
      return {
        name,
        points: Number(row.p ?? row.pts) || 0,
        raw_points: Number(row.rp ?? row.rawPts) || 0,
        entries_count: Number(row.entries_count) || 0,
        profile,
        image: artistImage(profile),
        rank: Number(row.r ?? row.rank),
      };
    });
  }
  const artists = new Map();
  const scopedCountryCode = countryCodeForScope(platform);
  const scopedRegionCodes = isAfricaRegionChart(platform)
    ? new Set(africaCountryCodesForRegion(regionKeyFromAfricaChart(platform)))
    : null;
  const countryMatchesScope = (profile = {}) => {
    const listedCode = String(profile.country_code || "").trim().toUpperCase();
    if (scopedCountryCode) {
      const expected = africaCountryForCode(scopedCountryCode);
      return listedCode === scopedCountryCode ||
        normalized(profile.country) === normalized(expected?.name);
    }
    if (scopedRegionCodes?.size) return scopedRegionCodes.has(listedCode);
    return true;
  };

  artistSourceRows(payload, month, platform).forEach((entry) => {
    const rank = Number(entry.r ?? entry.rank);
    const points = Number(entry.p ?? entry.pts ?? entry.total_points) || 0;
    chartArtistCreditNames(entry, protectedNames, profiles).forEach((name) => {
      const key = normalized(name);
      const profile = profiles.get(key) || {};
      if (!countryMatchesScope(profile)) return;
      const current = artists.get(key) || {
        name,
        points: 0,
        entries: new Set(),
        placements: 0,
        releases: [],
      };
      const releaseKey = entry.release_id
        ? `${entry.sourceChartType}|${entry.release_id}`
        : `${entry.sourceChartType}|${normalized(entry.t || entry.title)}|${normalized(entry.artist_credit || entry.a)}`;
      current.points += points;
      current.placements += 1;
      current.entries.add(releaseKey);
      current.releases.push(entry);
      artists.set(key, current);
    });
  });

  return [...artists.entries()]
    .map(([key, item]) => {
      const profile = profiles.get(key) || {};
      return {
        ...item,
        entries_count: item.entries.size,
        profile,
        image: artistImage(profile),
      };
    })
    .sort((a, b) => b.points - a.points || b.entries_count - a.entries_count || a.name.localeCompare(b.name))
    .slice(0, 50)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

export function buildYearEndMirror(payload, type) {
  const months = Array.isArray(payload?.months) ? payload.months : [];
  if (type !== "artists") {
    const releases = new Map();
    months.forEach((month) => {
      publicChartRows(payload, type, month).forEach((entry) => {
        const key = entry.release_id
          ? `id:${entry.release_id}`
          : `${normalized(entry.t || entry.title)}|${normalized(entry.artist_credit || entry.a)}`;
        const current = releases.get(key) || {
          title: entry.t || entry.title,
          artist: entry.artist_credit || entry.a || entry.artist,
          releaseId: entry.release_id,
          image: entry.cover_image || "",
          points: 0,
          months: 0,
          best: Number.POSITIVE_INFINITY,
        };
        current.points += Number(entry.p ?? entry.pts) || 0;
        current.months += 1;
        current.best = Math.min(current.best, Number(entry.r ?? entry.rank) || Number.POSITIVE_INFINITY);
        if (!current.image && entry.cover_image) current.image = entry.cover_image;
        releases.set(key, current);
      });
    });
    return [...releases.values()]
      .sort((a, b) => b.points - a.points || a.best - b.best || a.title.localeCompare(b.title))
      .slice(0, 50)
      .map((item, index) => ({ ...item, rank: index + 1 }));
  }

  const profiles = artistProfileMap(payload);
  const protectedNames = protectedArtistCreditNames(payload?.artists || []);
  const artists = new Map();
  const cumulative = new Map();
  months.forEach((month) => {
    artistSourceRows(payload, month, "Combined").forEach((entry) => {
      const points = Number(entry.p ?? entry.pts ?? entry.total_points) || 0;
      chartArtistCreditNames(entry, protectedNames, profiles).forEach((name) => {
        const key = normalized(name);
        const current = artists.get(key) || {
          name,
          points: 0,
          months: new Set(),
          releases: new Set(),
          placements: 0,
          best: Number.POSITIVE_INFINITY,
        };
        current.points += points;
        current.placements += 1;
        current.months.add(month);
        current.releases.add(entry.release_id
          ? `${entry.sourceChartType}|${entry.release_id}`
          : `${entry.sourceChartType}|${normalized(entry.t || entry.title)}|${normalized(entry.a)}`);
        artists.set(key, current);
        cumulative.set(key, (cumulative.get(key) || 0) + points);
      });
    });
    [...cumulative.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .forEach(([key], index) => {
        const artist = artists.get(key);
        if (artist) artist.best = Math.min(artist.best, index + 1);
      });
  });

  return [...artists.entries()]
    .map(([key, item]) => {
      const profile = profiles.get(key) || {};
      return {
        name: item.name,
        artistId: profile.id,
        image: artistImage(profile),
        points: item.points,
        months: item.months.size,
        entries: item.placements,
        uniqueReleases: item.releases.size,
        best: Number.isFinite(item.best) ? item.best : null,
      };
    })
    .sort((a, b) => b.points - a.points || (a.best || 999) - (b.best || 999) || a.name.localeCompare(b.name))
    .slice(0, 50)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

function historyIdentity(type, row) {
  if (type === "artists") return `name:${normalized(row.name || row.title)}`;
  if (row.release_id) return `id:${row.release_id}`;
  return `key:${normalized(row.t || row.title)}|${normalized(row.artist_credit || row.a || row.artist)}`;
}

function historyRank(type, row) {
  return Number(type === "artists" ? row.rank : (row.r ?? row.rank));
}

// Scans every published month up to and including `month` to work out, per
// entry currently charting that month: the peak rank it has ever held, how
// many of those scanned months it spent AT that peak rank, how many distinct
// months it has charted in total, and its rank the month before (for a
// movement indicator). Used by the poster generator's "Top N" table columns
// (MONTHS / PEAK / +-) — buildYearEndMirror() already covers the same peak/
// months stats for the All-Time period, so this is only needed for a single
// target month.
export function chartHistoryForMonth(payload, type, month, platform = "Combined") {
  const months = Array.isArray(payload?.months) ? payload.months : [];
  const targetIndex = months.indexOf(month);
  const history = new Map();
  if (targetIndex < 0) return history;

  const rowsForMonth = (monthLabel) => type === "artists"
    ? buildArtistMonthMirror(payload, monthLabel, platform)
    : publicChartRows(payload, type, monthLabel, platform);

  let previousMonthRows = [];
  months.slice(0, targetIndex + 1).forEach((monthLabel, index) => {
    const rows = rowsForMonth(monthLabel);
    const seenThisMonth = new Set();
    rows.forEach((row) => {
      const rank = historyRank(type, row);
      if (!Number.isFinite(rank)) return;
      const identity = historyIdentity(type, row);
      const stats = history.get(identity) || { peakRank: Number.POSITIVE_INFINITY, peakStreak: 0, monthsCount: 0 };
      if (rank < stats.peakRank) {
        stats.peakRank = rank;
        stats.peakStreak = 1;
      } else if (rank === stats.peakRank) {
        stats.peakStreak += 1;
      }
      if (!seenThisMonth.has(identity)) {
        stats.monthsCount += 1;
        seenThisMonth.add(identity);
      }
      history.set(identity, stats);
    });
    if (index === targetIndex - 1) previousMonthRows = rows;
  });

  const previousRankByIdentity = new Map();
  previousMonthRows.forEach((row) => {
    const rank = historyRank(type, row);
    if (Number.isFinite(rank)) previousRankByIdentity.set(historyIdentity(type, row), rank);
  });
  history.forEach((stats, identity) => {
    stats.previousRank = previousRankByIdentity.has(identity) ? previousRankByIdentity.get(identity) : null;
  });

  return history;
}

export function historyKeyForRow(type, row) {
  return historyIdentity(type, row);
}

// ── Platform labels/colors — shared across every Analytics-section poster ──

export const PLATFORM_COLORS = {
  COMBINED: "#C97A12",
  KENYAN: "#006600",
  SPOTIFY: "#1DB954",
  "APPLE MUSIC": "#FC3C44",
  AUDIOMACK: "#F68B1F",
  BOOMPLAY: "#00B4B4",
  YOUTUBE: "#FF0000",
  SHAZAM: "#0088FF",
};
export const PLATFORM_LABELS = {
  COMBINED: "Combined",
  KENYAN: "Kenyan",
  SPOTIFY: "Spotify",
  "APPLE MUSIC": "Apple Music",
  AUDIOMACK: "Audiomack",
  BOOMPLAY: "Boomplay",
  YOUTUBE: "YouTube",
  SHAZAM: "Shazam",
};
export function platformLabel(name) {
  return PLATFORM_LABELS[String(name || "").trim().toUpperCase()] || name;
}
export function platformColorFor(name) {
  return PLATFORM_COLORS[String(name || "").trim().toUpperCase()] || "#888888";
}

// Real per-platform breakdown only exists for singles/albums — the backend's
// `full.artists.platforms` is always empty, so platform-scoped Analytics
// sections (Cross-Platform Reach/Hits, platform coverage counts, Platform Exclusives)
// simply don't apply to the Artists chart type and return empty results.
export function platformKeysForChart(payload, chartType) {
  if (chartType === "artists") return [];
  return Object.keys(payload?.full?.[chartType]?.platforms || {});
}

// ── Cross-Platform Reach / Hits ─────────────────────────────────────────────

// The backend already stamps each Combined row with `pl: "X/Y"` (platforms
// charted / platforms tracked that month) — reuse that authoritative count
// instead of re-deriving it by cross-referencing every platform's Top 50.
// "Cross-Platform Hits" is just this same list filtered to `count === total`
// at the call site (see AnalyticsPage.jsx's `xHitsRows`).
export function buildCrossPlatformRows(payload, chartType, month, platform = "Combined") {
  if (chartType === "artists") return [];
  return publicChartRows(payload, chartType, month, platform)
    .map((row) => {
      const [countStr, totalStr] = String(row.pl || "").split("/");
      const count = Number(countStr) || 0;
      const total = Number(totalStr) || platformKeysForChart(payload, chartType).length;
      return { ...row, count, platformTotal: total };
    })
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count || (Number(b.p ?? b.pts) || 0) - (Number(a.p ?? a.pts) || 0));
}

// ── Platform Coverage Counts ─────────────────────────────────────────────

// ── Platform Exclusives (platform-unique entries) ───────────────────────────

export function buildUniquePlatformEntries(payload, chartType, month) {
  if (chartType === "artists") return [];
  const names = platformKeysForChart(payload, chartType);
  const rowsByPlatform = new Map(names.map((name) => [name, platformRows(payload?.full, chartType, name, month)]));
  const indexByPlatform = new Map(
    names.map((name) => [name, new Set((rowsByPlatform.get(name) || []).map((row) => historyIdentity(chartType, row)))])
  );
  return names.map((name) => {
    const otherIndexes = names.filter((other) => other !== name).map((other) => indexByPlatform.get(other));
    const uniqueEntries = (rowsByPlatform.get(name) || []).filter(
      (row) => !otherIndexes.some((index) => index.has(historyIdentity(chartType, row)))
    );
    return {
      platform: name,
      label: platformLabel(name),
      color: platformColorFor(name),
      count: uniqueEntries.length,
      entries: uniqueEntries.slice(0, 6),
    };
  });
}

// ── Top Countries ────────────────────────────────────────────────────────

export function buildTopCountryStats(payload, chartType, month, platform = "Combined", limit = 5) {
  const rows = chartType === "artists"
    ? buildArtistMonthMirror(payload, month, platform)
    : publicChartRows(payload, chartType, month, platform);
  const countryMap = new Map();
  rows.forEach((row) => {
    let code = "";
    let name = "";
    if (chartType === "artists") {
      code = String(row.profile?.country_code || "").trim().toUpperCase();
      name = row.profile?.country || "";
    } else {
      const primary = row.primary_artists?.[0];
      code = String(primary?.country_code || row.cc || "").trim().toUpperCase();
      name = primary?.country || row.co || "";
    }
    // Skip entries with no resolvable artist country — Top Countries should
    // only ever show real countries actually present in the data, never a
    // catch-all "unknown" bucket standing in for missing CMS metadata.
    if (!code) return;
    const current = countryMap.get(code) || {
      code, country: name || code, entries: 0, points: 0,
    };
    current.entries += 1;
    current.points += Number(row.p ?? row.pts ?? row.points) || 0;
    countryMap.set(code, current);
  });
  return [...countryMap.values()]
    .sort((a, b) => b.entries - a.entries || b.points - a.points || a.code.localeCompare(b.code))
    .slice(0, limit)
    .map((entry) => ({
      ...entry,
      color: countryChartColor(entry.code),
    }));
}

// ── Climbers / Drops / New Entries / Re-Entries ─────────────────────────────

// Singles/albums rows already carry the backend's own `movement`/`prev_rank`
// fields ("=", "new", "re-entry", "+N", "-N") — trust those directly rather
// than re-deriving movement from scratch. Artists have no such fields
// (buildArtistMonthMirror is a CMS-side aggregate, not a backend chart), so
// artists fall back to chartHistoryForMonth's cross-month diffing.
export function buildMovementLists(payload, chartType, month, platform = "Combined") {
  const risers = [];
  const fallers = [];
  const newEntries = [];
  const reEntries = [];

  if (chartType === "artists") {
    const rows = buildArtistMonthMirror(payload, month, platform);
    const history = chartHistoryForMonth(payload, "artists", month, platform);
    rows.forEach((row) => {
      const stats = history.get(historyKeyForRow("artists", row)) || {};
      const previousRank = stats.previousRank ?? null;
      const monthsCount = stats.monthsCount || 1;
      if (previousRank === null) {
        (monthsCount <= 1 ? newEntries : reEntries).push(row);
      } else if (previousRank > row.rank) {
        risers.push({ ...row, from: previousRank, to: row.rank, delta: previousRank - row.rank });
      } else if (previousRank < row.rank) {
        fallers.push({ ...row, from: previousRank, to: row.rank, delta: row.rank - previousRank });
      }
    });
  } else {
    publicChartRows(payload, chartType, month, platform).forEach((row) => {
      const movement = String(row.movement ?? "");
      if (movement === "new") { newEntries.push(row); return; }
      if (movement === "re-entry") { reEntries.push(row); return; }
      const delta = Number(movement);
      if (!Number.isFinite(delta) || delta === 0) return;
      const rank = row.r ?? row.rank;
      if (delta > 0) risers.push({ ...row, from: row.prev_rank, to: rank, delta });
      else fallers.push({ ...row, from: row.prev_rank, to: rank, delta: Math.abs(delta) });
    });
  }

  risers.sort((a, b) => b.delta - a.delta);
  fallers.sort((a, b) => b.delta - a.delta);
  return {
    risers: risers.slice(0, 5),
    fallers: fallers.slice(0, 5),
    newEntries: newEntries.slice(0, 5),
    reEntries: reEntries.slice(0, 5),
  };
}

// ── Hall of Fame (monthly #1s) ──────────────────────────────────────────────

// Shared by the public Analytics page and the CMS poster generator, so both
// always agree on who's actually been #1 — this used to be a copy of this
// exact dedup logic living inline in AnalyticsPage.jsx.
export function buildHallOfFameItems(payload, chartType) {
  const months = Array.isArray(payload?.months) ? payload.months : [];
  const byIdentity = new Map();
  months.forEach((month) => {
    const rows = chartType === "artists"
      ? buildArtistMonthMirror(payload, month, "Combined")
      : publicChartRows(payload, chartType, month, "Combined");
    const top = rows.find((row) => (chartType === "artists" ? row.rank : (row.r ?? row.rank)) === 1);
    if (!top) return;
    const identity = historyIdentity(chartType, top);
    const current = byIdentity.get(identity) || { hofMonths: [] };
    Object.assign(current, top, { hofMonths: [...current.hofMonths, month] });
    byIdentity.set(identity, current);
  });
  return [...byIdentity.values()].sort((a, b) => {
    const aLast = months.indexOf(a.hofMonths[a.hofMonths.length - 1]);
    const bLast = months.indexOf(b.hofMonths[b.hofMonths.length - 1]);
    return bLast - aLast;
  });
}

// ── Head-to-Head ──────────────────────────────────────────────────────────

export function buildHeadToHeadCandidates(payload, chartType) {
  const months = Array.isArray(payload?.months) ? payload.months : [];
  const seen = new Map();
  months.forEach((month) => {
    const rows = chartType === "artists"
      ? buildArtistMonthMirror(payload, month, "Combined")
      : publicChartRows(payload, chartType, month, "Combined");
    rows.forEach((row) => {
      const identity = historyIdentity(chartType, row);
      if (seen.has(identity)) return;
      seen.set(identity, {
        key: identity,
        title: chartType === "artists" ? (row.name || "") : (row.t || row.title || ""),
        artist: chartType === "artists" ? "" : (row.artist_credit || row.a || ""),
        image: chartType === "artists" ? (row.image || "") : (row.cover_image || ""),
      });
    });
  });
  return [...seen.values()].sort((a, b) => a.title.localeCompare(b.title));
}

export function buildHeadToHeadProfile(payload, chartType, candidateKey, platform = "Combined") {
  const months = Array.isArray(payload?.months) ? payload.months : [];
  const platformNames = platformKeysForChart(payload, chartType);
  let title = "";
  let artist = "";
  let image = "";
  let totalPts = 0;
  let appearances = 0;
  let numberOnes = 0;
  let peak = Number.POSITIVE_INFINITY;
  const monthly = {};
  const platformBest = {};

  months.forEach((month) => {
    const rows = chartType === "artists"
      ? buildArtistMonthMirror(payload, month, platform)
      : publicChartRows(payload, chartType, month, platform);
    const row = rows.find((candidate) => historyIdentity(chartType, candidate) === candidateKey);
    if (row) {
      const rank = chartType === "artists" ? row.rank : (row.r ?? row.rank);
      const points = Number(row.p ?? row.pts ?? row.points) || 0;
      title = chartType === "artists" ? (row.name || "") : (row.t || row.title || "");
      artist = chartType === "artists" ? "" : (row.artist_credit || row.a || "");
      image = chartType === "artists" ? (row.image || "") : (row.cover_image || "");
      totalPts += points;
      appearances += 1;
      if (rank === 1) numberOnes += 1;
      if (rank < peak) peak = rank;
      monthly[month] = { rank, points };
    }
    if (chartType !== "artists") {
      platformNames.forEach((name) => {
        const platformRow = publicChartRows(payload, chartType, month, name)
          .find((candidate) => historyIdentity(chartType, candidate) === candidateKey);
        if (!platformRow) return;
        const rank = platformRow.r ?? platformRow.rank;
        if (!platformBest[name] || rank < platformBest[name]) platformBest[name] = rank;
      });
    }
  });

  const avgRank = appearances
    ? Math.round((Object.values(monthly).reduce((sum, entry) => sum + entry.rank, 0) / appearances) * 10) / 10
    : null;

  return {
    key: candidateKey, title, artist, image,
    totalPts, peak: Number.isFinite(peak) ? peak : null,
    months: appearances, avgRank, numberOnes, appearances,
    platformCount: Object.keys(platformBest).length,
    platforms: platformBest,
    monthly,
  };
}
