import { resolveMediaUrl } from "../api/config.js";
import {
  artistCreditMembers,
  normArtistKey,
  profileNames,
  protectedArtistCreditNames,
} from "./chartHelpers.js";

const normalized = (value) => String(value || "").trim().toLowerCase();

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

export function publicChartRows(payload, type, month, platform = "Combined") {
  if (normalized(platform) === "combined") {
    return rankedTop50(payload?.full?.[type]?.combined?.[month]);
  }
  if (normalized(platform) === "kenyan") {
    return rankedTop50(payload?.full?.[type]?.regions?.KE?.[month]);
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
    if (normalized(platform) === "kenyan") {
      add("singles", platform, publicChartRows(payload, "singles", month, "Kenyan"));
      add("albums", platform, publicChartRows(payload, "albums", month, "Kenyan"));
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
  const regionalArtistRows = normalized(platform) === "kenyan"
    ? rankedTop50(payload?.full?.artists?.regions?.KE?.[month])
    : [];
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
  const kenyanOnly = normalized(platform) === "kenyan";

  artistSourceRows(payload, month, platform).forEach((entry) => {
    const rank = Number(entry.r ?? entry.rank);
    const points = Number(entry.p ?? entry.pts ?? entry.total_points) || 0;
    chartArtistCreditNames(entry, protectedNames, profiles).forEach((name) => {
      const key = normalized(name);
      const profile = profiles.get(key) || {};
      if (
        kenyanOnly &&
        (
          normalized(profile.country) !== "kenya" ||
          String(profile.country_code || "").trim().toUpperCase() !== "KE"
        )
      ) return;
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
