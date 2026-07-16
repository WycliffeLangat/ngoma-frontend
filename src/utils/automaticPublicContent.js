import { certificationKey } from "./chartHelpers.js";

const CATEGORY_LABELS = {
  chart_news: "CHART NEWS",
  albums: "ALBUMS",
  certifications: "CERTIFICATIONS",
  analytics: "ANALYTICS",
};

const LEVEL_RANK = {
  diamond: 0,
  platinum: 1,
  gold: 2,
};

const DEFAULT_LEVEL_RANK = 99;

const titleText = (entry = {}) => entry.t || entry.title || entry.release_title || "";
const artistText = (entry = {}) => entry.a || entry.artist || entry.artist_credit || entry.primary_artist || "";
const chartTypeForBucket = (bucket) => (bucket === "albums" ? "albums" : "singles");

function levelForPoints(points, levels = []) {
  const total = Number(points) || 0;
  return levels.find((level) => total >= Number(level.pts || 0))?.level || null;
}

function levelLabel(level, levels = []) {
  return levels.find((item) => item.level === level)?.label || String(level || "").replace(/^\w/, (c) => c.toUpperCase());
}

function levelThreshold(level, levels = []) {
  return Number(levels.find((item) => item.level === level)?.pts || 0);
}

function dateLabel(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function isoDate(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

function uniqueTagList(values = []) {
  return [...new Set(values.map((item) => String(item || "").trim()).filter(Boolean))];
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
        const totalPts = Number(entry.totalPts ?? entry.total_points ?? entry.points ?? 0) || 0;
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
  const levelRank = Object.fromEntries(levels.map((item, index) => [item.level, index]));
  const rankFor = (level) => levelRank[level] ?? LEVEL_RANK[level] ?? DEFAULT_LEVEL_RANK;
  const merged = new Map();

  (automaticRows || []).forEach((row) => {
    const key = `${chartTypeForBucket(row.chart_type)}|||${certificationKey(row.t, row.a)}`;
    merged.set(key, row);
  });

  (liveRows || []).forEach((row) => {
    const key = `${chartTypeForBucket(row.chart_type)}|||${certificationKey(row.t, row.a)}`;
    const automatic = merged.get(key);
    if (!automatic) {
      merged.set(key, row);
      return;
    }
    const automaticRank = rankFor(automatic.level);
    const liveRank = rankFor(row.level);
    const winner = automaticRank <= liveRank ? automatic : row;
    merged.set(key, {
      ...row,
      ...winner,
      id: row.id ?? winner.id,
      cover_image: winner.cover_image || row.cover_image || "",
      certification_date: row.certification_date || winner.certification_date || "",
      certified_at: row.certified_at || winner.certified_at || "",
      notes: row.notes || winner.notes || "",
      is_automatic: true,
      is_official: true,
      is_hidden: false,
    });
  });

  return [...merged.values()].sort(rowSort);
}

function makeArticle(raw) {
  return {
    ...raw,
    cat: CATEGORY_LABELS[raw.category] || String(raw.category || "").toUpperCase().replace(/_/g, " "),
    date: dateLabel(raw.published_at),
    media: raw.cover_image ? [{ url: raw.cover_image, kind: "article_cover", title: raw.title }] : [],
    is_published: true,
    status: "published",
    is_automatic: true,
  };
}

function chartArticle({ chartType, monthLabel, rows, generatedAt, siteName }) {
  const top = rows?.[0];
  if (!top) return null;
  const runner = rows?.[1];
  const third = rows?.[2];
  const kind = chartType === "albums" ? "albums" : "singles";
  const category = chartType === "albums" ? "albums" : "chart_news";
  const artist = artistText(top);
  const title = titleText(top);
  const runnerText = runner ? `${titleText(runner)} by ${artistText(runner)} at #${runner.rank || runner.r || 2}` : "a fast-moving chase pack";
  const thirdText = third ? `${titleText(third)} by ${artistText(third)} at #${third.rank || third.r || 3}` : "fresh catalogue movement";
  const points = Number(top.pts ?? top.p ?? top.total_points ?? 0) || 0;
  const cover = top.cover_image || top.image || "";
  const published_at = isoDate(generatedAt);

  return makeArticle({
    id: `auto-news-${chartType}-${String(monthLabel || "latest").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    slug: `auto-${chartType}-${String(monthLabel || "latest").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    title: chartType === "albums"
      ? `${title} frames the ${monthLabel} album race`
      : `${title} turns ${monthLabel} into a statement month`,
    category,
    emoji: chartType === "albums" ? "" : "",
    excerpt: `${artist} leads the ${monthLabel} ${kind} chart while ${runnerText} keeps the story moving.`,
    subheadline: `${siteName || "Ngoma Charts"} generated this story from the latest published Combined Top 50 data.`,
    body: [
      `${title} by ${artist} opens the ${monthLabel} ${kind} conversation at #1, converting the latest Combined chart data into ${points.toLocaleString()} public Top 50 points.`,
      `The month has more texture behind the leader: ${runnerText}, with ${thirdText}. Together they show how momentum, catalogue depth and audience discovery are reshaping the chart in real time.`,
      `This public article is generated automatically from the published chart data and refreshes whenever a new month, correction or ranking update is introduced.`,
    ].join("\n\n"),
    tags: uniqueTagList(["auto-generated", chartType, "combined-chart", monthLabel]),
    author: "Ngoma Charts Data Desk",
    source_links: [{ label: "Generated from published chart data", kind: "automatic_chart_story" }],
    featured: true,
    pinned: false,
    breaking: false,
    published_at,
    updated_at: published_at,
    cover_image: cover,
    related_release: top.release_id || null,
  });
}

function certificationArticle(cert, levels, generatedAt, siteName) {
  if (!cert?.t || !cert?.a || !cert?.level) return null;
  const label = levelLabel(cert.level, levels);
  const threshold = levelThreshold(cert.level, levels);
  const total = Number(cert.totalPts ?? cert.total_points ?? 0) || 0;
  const releaseKind = cert.chart_type === "albums" ? "album" : "single";
  const published_at = isoDate(cert.certified_at || cert.certification_date || generatedAt);

  return makeArticle({
    id: `auto-news-cert-${cert.chart_type || "singles"}-${certificationKey(cert.t, cert.a)}`,
    slug: `auto-cert-${String(cert.chart_type || "singles").replace(/[^a-z0-9]+/gi, "-")}-${String(cert.t).toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${String(cert.a).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`.slice(0, 110),
    title: `${cert.t} crosses into ${label} territory`,
    category: "certifications",
    emoji: "",
    excerpt: `${cert.a}'s ${releaseKind} has ${total.toLocaleString()} cumulative Combined chart points, clearing the ${threshold.toLocaleString()}+ ${label} benchmark.`,
    subheadline: `${siteName || "Ngoma Charts"} certification milestones are now generated directly from point totals.`,
    body: [
      `${cert.t} by ${cert.a} is now ${label} certified after reaching ${total.toLocaleString()} cumulative Combined chart points.`,
      `The award is triggered by the same monthly public Top 50 point system that powers the charts, so the certification moves as soon as the data moves.`,
      `This story is generated automatically from the certification engine and will update when new chart data changes the release's point total or milestone level.`,
    ].join("\n\n"),
    tags: uniqueTagList(["auto-generated", "certification", cert.level, cert.chart_type]),
    author: "Ngoma Charts Data Desk",
    source_links: [{ label: "Generated from certification point totals", kind: "automatic_certification_story" }],
    featured: false,
    pinned: false,
    breaking: false,
    published_at,
    updated_at: published_at,
    cover_image: cert.cover_image || cert.image || "",
    related_release: cert.release_id || null,
  });
}

export function buildAutomaticNews({
  latestMonth = "",
  singlesRows = [],
  albumsRows = [],
  certifications = [],
  levels = [],
  generatedAt = "",
  siteName = "Ngoma Charts",
  certificationLimit = 8,
} = {}) {
  const currentCertifications = [...(certifications || [])]
    .sort(rowSort)
    .slice(0, certificationLimit)
    .map((cert) => certificationArticle(cert, levels, generatedAt, siteName))
    .filter(Boolean);
  return [
    chartArticle({ chartType: "singles", monthLabel: latestMonth, rows: singlesRows, generatedAt, siteName }),
    chartArticle({ chartType: "albums", monthLabel: latestMonth, rows: albumsRows, generatedAt, siteName }),
    ...currentCertifications,
  ].filter(Boolean);
}

export function mergeNews(liveRows = [], automaticRows = []) {
  const merged = new Map();
  (automaticRows || []).forEach((row) => {
    const key = row.slug || row.id || row.title;
    if (key) merged.set(key, row);
  });
  (liveRows || []).forEach((row) => {
    const key = row.slug || row.id || row.title;
    if (key) merged.set(key, row);
  });
  return [...merged.values()].sort((a, b) => {
    const pinned = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
    if (pinned) return pinned;
    const featured = Number(Boolean(b.featured)) - Number(Boolean(a.featured));
    if (featured) return featured;
    return new Date(b.published_at || b.date || 0) - new Date(a.published_at || a.date || 0);
  });
}
