import { certificationKey } from "./chartHelpers.js";

const titleText = (entry = {}) => entry.t || entry.title || entry.release_title || "";
const artistText = (entry = {}) => entry.a || entry.artist || entry.artist_credit || entry.primary_artist || "";
const chartTypeForBucket = (bucket) => (bucket === "albums" ? "albums" : "singles");
const numberValue = (value) => Number(String(value ?? "").replace(/,/g, "")) || 0;
const truthyValue = (value) => value === true || value === 1 || (typeof value === "string" && /^(true|1|yes)$/i.test(value.trim()));
const totalPointsFrom = (entry = {}) => numberValue(entry.totalPts ?? entry.total_points ?? entry.points ?? 0);
const levelPoints = (level = {}) => numberValue(level.pts ?? level.threshold ?? 0);
const sortedLevels = (levels = []) => [...levels]
  .filter((level) => level?.level && levelPoints(level) > 0)
  .sort((left, right) => levelPoints(right) - levelPoints(left));

function levelForPoints(points, levels = []) {
  const total = numberValue(points);
  return sortedLevels(levels).find((level) => total >= levelPoints(level))?.level || null;
}

function rowSort(a, b) {
  return (Number(b.totalPts) || 0) - (Number(a.totalPts) || 0) ||
    (Number(a.best) || 999) - (Number(b.best) || 999) ||
    String(a.t || "").localeCompare(String(b.t || ""));
}

export function buildAutomaticCertifications(yearEndByType = {}, levels = []) {
  return Object.entries(yearEndByType).flatMap(([bucket, rows]) => {
    const chartType = chartTypeForBucket(bucket);
    return (rows || [])
      .map((entry) => {
        const totalPts = totalPointsFrom(entry);
        const level = levelForPoints(totalPts, levels);
        if (!level) return null;
        const title = titleText(entry);
        const artist = artistText(entry);
        if (!title || !artist) return null;
        return {
          ...entry,
          id: `auto-cert-${chartType}-${certificationKey(title, artist)}`,
          t: title,
          a: artist,
          title,
          artist,
          totalPts,
          total_points: totalPts,
          level,
          chart_type: chartType,
          country_code: entry.country_code || "",
          cover_image: entry.cover_image || entry.image || "",
          is_automatic: true,
          is_official: true,
          is_hidden: false,
        };
      })
      .filter(Boolean);
  }).sort(rowSort);
}

export function mergeCertifications(automaticRows = [], liveRows = [], levels = []) {
  const merged = new Map();

  (automaticRows || []).forEach((row) => {
    const key = `${chartTypeForBucket(row.chart_type)}|||${certificationKey(row.t, row.a)}`;
    const totalPts = totalPointsFrom(row);
    const level = levelForPoints(totalPts, levels);
    if (!level) return;
    merged.set(key, {
      ...row,
      level,
      totalPts,
      total_points: totalPts,
      is_hidden: false,
    });
  });

  (liveRows || []).forEach((row) => {
    const key = `${chartTypeForBucket(row.chart_type)}|||${certificationKey(row.t, row.a)}`;
    const automatic = merged.get(key);
    if (!automatic) {
      if (truthyValue(row.is_hidden)) return;
      const totalPts = totalPointsFrom(row);
      const eligibleLevel = levelForPoints(totalPts, levels);
      if (!eligibleLevel) return;
      merged.set(key, {
        ...row,
        level: eligibleLevel,
        totalPts,
        total_points: totalPts,
        is_hidden: false,
      });
      return;
    }
    const totalPts = totalPointsFrom(automatic);
    const eligibleLevel = levelForPoints(totalPts, levels);
    if (!eligibleLevel) {
      merged.delete(key);
      return;
    }
    const winner = { ...automatic, level: eligibleLevel };
    merged.set(key, {
      ...row,
      ...winner,
      id: row.id ?? winner.id,
      cover_image: winner.cover_image || row.cover_image || "",
      certification_date: row.certification_date || winner.certification_date || "",
      certified_at: row.certified_at || winner.certified_at || "",
      notes: row.notes || winner.notes || "",
      totalPts,
      total_points: totalPts,
      is_automatic: true,
      is_official: true,
      is_hidden: false,
    });
  });

  return [...merged.values()].sort(rowSort);
}
