import { resolveMediaUrl } from "../api/config.js";
import { buildRegionalCombinedRows } from "../data/regionalCombinedChart.js";

const normalized = (value) => String(value || "").trim().toLowerCase();

const splitCredit = (value) => String(value || "")
  .split(/\s*(?:\||\bft\.?|\bfeat\.?|\bfeaturing\b|\bx\b|&|,)\s*/i)
  .map((name) => name.trim())
  .filter(Boolean);

export function artistCreditNames(entry = {}) {
  const names = [];
  const add = (value) => {
    const name = String(value || "").trim();
    if (name && !names.some((item) => normalized(item) === normalized(name))) names.push(name);
  };

  const primaryProfiles = entry.primary_artists || [];
  const featuredProfiles = entry.featured_artist_profiles || [];
  primaryProfiles.forEach((profile) => add(profile?.public_name || profile?.display_name || profile?.name));
  featuredProfiles.forEach((profile) => add(profile?.public_name || profile?.display_name || profile?.name));
  if (!primaryProfiles.length) {
    splitCredit(entry.primary_artist_credit || entry.pa || entry.primary_artist || entry.a).forEach(add);
  }
  if (!featuredProfiles.length) {
    splitCredit(entry.featured_artist_credit || entry.fa || entry.featured_artists).forEach(add);
  }
  if (!names.length) splitCredit(entry.artist_credit || entry.artist || entry.a).forEach(add);
  return names;
}

function rankedTop50(rows = [], { positionalPoints = false } = {}) {
  return (Array.isArray(rows) ? rows : [])
    .map((row, sourceIndex) => ({ row, sourceIndex }))
    .sort((left, right) => {
      const leftRank = Number(left.row?.r ?? left.row?.rank);
      const rightRank = Number(right.row?.r ?? right.row?.rank);
      const safeLeft = Number.isFinite(leftRank) && leftRank > 0 ? leftRank : Number.POSITIVE_INFINITY;
      const safeRight = Number.isFinite(rightRank) && rightRank > 0 ? rightRank : Number.POSITIVE_INFINITY;
      return safeLeft - safeRight || left.sourceIndex - right.sourceIndex;
    })
    .slice(0, 50)
    .map(({ row }, index) => {
      const rank = index + 1;
      return {
        ...row,
        r: rank,
        ...(positionalPoints ? { p: 51 - rank } : {}),
      };
    });
}

function platformRows(full, type, platform, month) {
  const platforms = full?.[type]?.platforms || {};
  const wanted = normalized(platform);
  const key = Object.keys(platforms).find((name) => normalized(name) === wanted);
  return key ? rankedTop50(platforms[key]?.[month]) : [];
}

export function publicChartRows(payload, type, month, platform = "Combined") {
  if (normalized(platform) === "combined") {
    return rankedTop50(payload?.full?.[type]?.combined?.[month], { positionalPoints: true });
  }
  if (normalized(platform) === "kenyan") {
    return buildRegionalCombinedRows({
      full: payload?.full,
      chartType: type,
      month,
      countryCode: "KE",
      resolveCountryCode: (entry) =>
        entry.primary_artists?.[0]?.country_code || entry.artist_profile?.country_code || entry.cc,
    });
  }
  return platformRows(payload?.full, type, platform, month);
}

function artistProfileMap(payload) {
  const map = new Map();
  (payload?.artists || []).forEach((artist) => {
    [artist.name, artist.display_name, artist.public_name, ...(artist.aliases || [])].forEach((name) => {
      const key = normalized(name);
      if (key) map.set(key, artist);
    });
  });
  return map;
}

function artistSourceRows(payload, month, platform = "Combined") {
  const full = payload?.full || {};
  const sources = [];
  const add = (type, platformName, rows) => rankedTop50(rows).forEach((row) => {
    sources.push({ ...row, sourceChartType: type, sourcePlatform: platformName });
  });

  if (normalized(platform) !== "combined") {
    if (normalized(platform) === "kenyan") {
      add("singles", platform, publicChartRows(payload, "singles", month, "Kenyan"));
      add("albums", platform, publicChartRows(payload, "albums", month, "Kenyan"));
      return sources;
    }
    add("singles", platform, platformRows(full, "singles", platform, month));
    add("albums", platform, platformRows(full, "albums", platform, month));
    return sources;
  }

  Object.entries(full?.singles?.platforms || {}).forEach(([name, months]) => {
    add("singles", name, months?.[month]);
  });
  Object.entries(full?.albums?.platforms || {}).forEach(([name, months]) => {
    add("albums", name, months?.[month]);
  });
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
  const artists = new Map();

  artistSourceRows(payload, month, platform).forEach((entry) => {
    const rank = Number(entry.r ?? entry.rank);
    const points = 51 - rank;
    artistCreditNames(entry).forEach((name) => {
      const key = normalized(name);
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
  const artists = new Map();
  const cumulative = new Map();
  months.forEach((month) => {
    artistSourceRows(payload, month, "Combined").forEach((entry) => {
      const points = 51 - Number(entry.r ?? entry.rank);
      artistCreditNames(entry).forEach((name) => {
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
