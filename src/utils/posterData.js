import { buildArtistMonthMirror, publicChartRows } from "./publicChartMirror.js";

export function posterRank(...values) {
  return values.find((value) => Number.isFinite(Number(value)) && Number(value) > 0) ?? null;
}

export function formatPosterRank(...values) {
  const rank = posterRank(...values);
  return rank === null ? "—" : `#${Number(rank)}`;
}

// Search endpoints can omit chart aggregates. Recover them from the same
// published Combined chart data used by public posters, without title-only matches.
export function enrichPosterRecord(type, record, payload = {}) {
  const artist = type === "artists";
  const chartType = type === "songs" ? "singles" : type;
  const normalize = (value) => String(value || "").trim().toLowerCase();
  const matches = (row) => {
    if (artist) return normalize(row.name) === normalize(record.display_name || record.name);
    if (row.release_id && record.id) return String(row.release_id) === String(record.id);
    return normalize(row.t || row.title) === normalize(record.title) &&
      normalize(row.artist_credit || row.a || row.artist) === normalize(record.artist_credit || record.artist_display || record.artist);
  };
  const history = (payload.months || []).flatMap((month) => {
    const rows = artist ? buildArtistMonthMirror(payload, month) : publicChartRows(payload, chartType, month);
    const row = rows.find(matches);
    return row ? [row] : [];
  });
  const latest = history.at(-1);
  const ranks = history.map((row) => posterRank(row.rank, row.r)).filter((rank) => rank !== null).map(Number);
  return {
    ...record,
    current_rank: posterRank(record.current_rank, record.currentRank, record.latest_rank, record.latestRank, record.rank, record.r, latest?.rank, latest?.r),
    peak_rank: posterRank(record.peak_rank, record.peakRank, ranks.length ? Math.min(...ranks) : null),
    total_points: record.total_points ?? (history.length ? history.reduce((sum, row) => sum + Number(row.p ?? row.pts ?? row.points ?? 0), 0) : null),
    months_on_chart: record.months_on_chart ?? (history.length || null),
    cover_image: record.cover_image || latest?.cover_image || "",
    image: record.image || latest?.image || "",
  };
}
