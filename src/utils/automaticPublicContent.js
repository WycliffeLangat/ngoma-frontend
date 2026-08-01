import { certificationKey } from "./chartHelpers.js";

const CATEGORY_LABELS = {
  chart_news: "CHART NEWS",
  albums: "ALBUMS",
  certifications: "CERTIFICATIONS",
  analytics: "ANALYTICS",
};

const titleText = (entry = {}) => entry.t || entry.title || entry.release_title || "";
const artistText = (entry = {}) => entry.a || entry.artist || entry.artist_credit || entry.primary_artist || "";
const chartTypeForBucket = (bucket) => (bucket === "albums" ? "albums" : "singles");
const numberValue = (value) => Number(String(value ?? "").replace(/,/g, "")) || 0;
const truthyValue = (value) => value === true || value === 1 || (typeof value === "string" && /^(true|1|yes)$/i.test(value.trim()));
const totalPointsFrom = (entry = {}) => numberValue(entry.totalPts ?? entry.total_points ?? entry.points ?? 0);
const rankValue = (entry = {}) => numberValue(entry.rank ?? entry.r);
const pointsValue = (entry = {}) => numberValue(entry.pts ?? entry.p ?? entry.total_points ?? entry.points);
const levelPoints = (level = {}) => numberValue(level.pts ?? level.threshold ?? 0);
const sortedLevels = (levels = []) => [...levels]
  .filter((level) => level?.level && levelPoints(level) > 0)
  .sort((left, right) => levelPoints(right) - levelPoints(left));

function levelForPoints(points, levels = []) {
  const total = numberValue(points);
  return sortedLevels(levels).find((level) => total >= levelPoints(level))?.level || null;
}

function levelLabel(level, levels = []) {
  return levels.find((item) => item.level === level)?.label || String(level || "").replace(/^\w/, (c) => c.toUpperCase());
}

function levelThreshold(level, levels = []) {
  return levelPoints(levels.find((item) => item.level === level));
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
  return validIsoDate(value) || new Date().toISOString();
}

function validIsoDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

function monthPeriodDate(monthLabel = "") {
  const match = String(monthLabel || "").match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (!match) return "";
  const parsed = new Date(`${match[1]} 1, ${match[2]} 00:00:00 UTC`);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Date(Date.UTC(Number(match[2]), parsed.getUTCMonth(), 1, 9, 0, 0)).toISOString();
}

function publishedDateFor(monthLabel, generatedAt) {
  return validIsoDate(monthPeriodDate(monthLabel)) || validIsoDate(generatedAt) || new Date().toISOString();
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

function makeArticle(raw) {
  const media = Array.isArray(raw.media) ? raw.media.filter(Boolean) : [];
  if (raw.cover_image && !media.some((item) => item?.url === raw.cover_image)) {
    media.unshift({ url: raw.cover_image, kind: "article_cover", title: raw.title });
  }
  return {
    ...raw,
    cat: CATEGORY_LABELS[raw.category] || String(raw.category || "").toUpperCase().replace(/_/g, " "),
    date: dateLabel(raw.published_at),
    media,
    is_published: true,
    status: "published",
    is_automatic: true,
  };
}

function primaryArtistProfile(entry = {}) {
  return Array.isArray(entry.primary_artists) ? entry.primary_artists[0] : null;
}

function profileName(profile = {}) {
  return profile?.public_name || profile?.display_name || profile?.name || "";
}

function articleMediaForEntry(entry = {}, title = "") {
  const media = [];
  const cover = entry.cover_image || entry.image || "";
  if (cover) media.push({ url: cover, kind: "release_cover", title });
  const artist = primaryArtistProfile(entry);
  const artistImage = artist?.image || artist?.image_url || artist?.photo || artist?.cover_image || "";
  if (artistImage) {
    media.push({
      url: artistImage,
      kind: "artist_image",
      title: profileName(artist),
      entity_type: "artist",
      entity_id: artist.id ?? null,
    });
  }
  return media;
}

function rowCredit(entry = {}) {
  const title = titleText(entry);
  const artist = artistText(entry);
  const rank = rankValue(entry);
  return `${title}${artist ? ` by ${artist}` : ""}${rank ? ` at #${rank}` : ""}`;
}

function artistVerb(artist = "", singular = "", plural = "") {
  return /\s(&|and|x)\s|,|\bft\.?\b|\bfeat\.?\b/i.test(String(artist || "")) ? plural : singular;
}

function movementSentence(entry = {}, title = "The leader") {
  const rank = rankValue(entry);
  const previous = numberValue(entry.prev ?? entry.previous_rank ?? entry.last_month);
  if (entry.is_new || entry.movement === "new") {
    return `${title} arrives as a new Top 50 entry, giving the month a fresh #${rank || 1} story.`;
  }
  if (entry.reentry || entry.movement === "reentry") {
    return `${title} returns to the Top 50 this month, making the #${rank || 1} placement a comeback as well as a chart lead.`;
  }
  if (previous && rank) {
    const delta = previous - rank;
    if (delta > 0) return `${title} climbs ${delta} place${delta === 1 ? "" : "s"} from #${previous} to #${rank}, adding momentum to its lead.`;
    if (delta < 0) return `${title} slips ${Math.abs(delta)} place${Math.abs(delta) === 1 ? "" : "s"} from #${previous} but still holds the chart conversation at #${rank}.`;
    return `${title} holds steady at #${rank}, suggesting sustained demand rather than a one-week spike.`;
  }
  return "";
}

function coverageSentence(entry = {}, kind = "singles") {
  const coverage = entry.plat || (entry.platform_count && entry.platform_max ? `${entry.platform_count}/${entry.platform_max}` : "");
  const peak = numberValue(entry.peak_rank);
  const months = numberValue(entry.months_on_chart ?? entry.times_on_chart);
  const parts = [];
  if (coverage) parts.push(`platform coverage is ${coverage}`);
  if (peak) parts.push(`its best Combined rank is #${peak}`);
  if (months) parts.push(`it has appeared for ${months} chart month${months === 1 ? "" : "s"}`);
  if (!parts.length) return "";
  return `The chart context is stronger with the details in view: ${parts.join(", ")} across the ${kind} dataset.`;
}

function rankGapSentence(top = {}, runner = {}) {
  if (!runner) return "";
  const topPoints = pointsValue(top);
  const runnerPoints = pointsValue(runner);
  const gap = topPoints && runnerPoints ? topPoints - runnerPoints : null;
  const gapText = Number.isFinite(gap) && gap > 0
    ? `, with a ${gap.toLocaleString()} point gap separating #1 from #2`
    : "";
  return `${rowCredit(runner)} is the immediate pressure point${gapText}.`;
}

function standoutRows(rows = [], top = {}) {
  const topKey = `${titleText(top)}|${artistText(top)}`;
  const movers = (rows || [])
    .filter((row) => `${titleText(row)}|${artistText(row)}` !== topKey)
    .map((row) => {
      const previous = numberValue(row.prev ?? row.previous_rank ?? row.last_month);
      const rank = rankValue(row);
      return { row, gain: previous && rank ? previous - rank : 0 };
    })
    .filter((item) => item.gain > 0)
    .sort((a, b) => b.gain - a.gain)
    .slice(0, 2);
  const arrivals = (rows || [])
    .filter((row) => row.is_new || row.movement === "new" || row.reentry || row.movement === "reentry")
    .slice(0, 3);
  return { movers, arrivals };
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
  const runnerText = runner ? rowCredit(runner) : "a fast-moving chase pack";
  const thirdText = third ? rowCredit(third) : "the rest of the front pack";
  const points = pointsValue(top);
  const cover = top.cover_image || top.image || "";
  const published_at = publishedDateFor(monthLabel, generatedAt);
  const leadArtist = primaryArtistProfile(top);
  const leadArtistName = profileName(leadArtist) || top.primary_artist || artist;
  const { movers, arrivals } = standoutRows(rows, top);
  const moverSentence = movers.length
    ? `${movers.map(({ row, gain }) => `${titleText(row)} gains ${gain} place${gain === 1 ? "" : "s"} to #${rankValue(row)}`).join("; ")}.`
    : "";
  const arrivalsSentence = arrivals.length
    ? `New and returning pressure also matters: ${arrivals.map(rowCredit).join("; ")}.`
    : "";
  const sourceLabel = `${monthLabel} Combined Top 50 ${kind}`;

  return makeArticle({
    id: `auto-news-${chartType}-${String(monthLabel || "latest").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    slug: `auto-${chartType}-${String(monthLabel || "latest").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    title: chartType === "albums"
      ? `${artist}'s ${title} sets the pace for ${monthLabel} albums`
      : `${artist}'s ${title} leads ${monthLabel} singles at #1`,
    category,
    emoji: chartType === "albums" ? "" : "",
    excerpt: `${artist} ${artistVerb(artist, "tops", "top")} the ${monthLabel} ${kind} chart with ${points.toLocaleString()} points, with ${runnerText} setting the nearest challenge.`,
    subheadline: `${siteName || "Ngoma Charts"} looks at the leader, challengers and movement shaping ${sourceLabel}.`,
    body: [
      `${title} by ${artist} opens the ${monthLabel} ${kind} chart at #1 with ${points.toLocaleString()} public Top 50 points.`,
      `${rankGapSentence(top, runner) || "The nearest challengers are still forming behind the leader."} ${third ? `${thirdText} gives the podium another angle, so the month reads as a race rather than a runaway.` : "The rest of the Top 50 supplies the movement around that lead."}`,
      movementSentence(top, title),
      [coverageSentence(top, kind), moverSentence, arrivalsSentence].filter(Boolean).join(" "),
      `${leadArtistName || artist} ${artistVerb(leadArtistName || artist, "leaves", "leave")} ${monthLabel} with the strongest front-page signal in the ${kind} table, while the rest of the Top 50 shows where pressure is building next.`,
    ].filter(Boolean).join("\n\n"),
    tags: uniqueTagList([chartType, "combined-chart", monthLabel]),
    author: "Ngoma Charts Data Desk",
    source_links: [{ label: sourceLabel, kind: "automatic_chart_story", href: "/charts" }],
    featured: true,
    pinned: false,
    breaking: false,
    published_at,
    updated_at: published_at,
    cover_image: cover,
    media: articleMediaForEntry(top, title),
    related_release: top.release_id || null,
    related_release_title: title,
    related_release_artist: artist,
    related_release_type: chartType === "albums" ? "album" : "single",
    related_artist: leadArtist?.id || null,
    related_artist_name: leadArtistName,
  });
}

function certificationArticle(cert, levels, generatedAt, siteName) {
  if (!cert?.t || !cert?.a || !cert?.level) return null;
  const label = levelLabel(cert.level, levels);
  const threshold = levelThreshold(cert.level, levels);
  const total = Number(cert.totalPts ?? cert.total_points ?? 0) || 0;
  const releaseKind = cert.chart_type === "albums" ? "album" : "single";
  const published_at = validIsoDate(cert.certified_at || cert.certification_date) || validIsoDate(generatedAt) || new Date().toISOString();
  const overThreshold = threshold ? total - threshold : 0;
  const thresholdText = threshold ? `${threshold.toLocaleString()}+` : label;
  const bestRank = numberValue(cert.best ?? cert.peak ?? cert.peak_rank);
  const leadArtist = primaryArtistProfile(cert);
  const artistName = profileName(leadArtist) || cert.a;

  return makeArticle({
    id: `auto-news-cert-${cert.chart_type || "singles"}-${certificationKey(cert.t, cert.a)}`,
    slug: `auto-cert-${String(cert.chart_type || "singles").replace(/[^a-z0-9]+/gi, "-")}-${String(cert.t).toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${String(cert.a).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`.slice(0, 110),
    title: `${cert.t} earns ${label} status on Ngoma Charts`,
    category: "certifications",
    emoji: "",
    excerpt: `${cert.a}'s ${releaseKind} reaches ${total.toLocaleString()} cumulative Combined chart points, clearing the ${thresholdText} ${label} benchmark.`,
    subheadline: `${siteName || "Ngoma Charts"} looks at the chart run behind the ${label} milestone.`,
    body: [
      `${cert.t} by ${cert.a} is now ${label} certified after reaching ${total.toLocaleString()} cumulative Combined chart points.`,
      threshold
        ? `The current ${label} line is ${threshold.toLocaleString()} points, so the ${releaseKind} is ${Math.max(0, overThreshold).toLocaleString()} point${Math.max(0, overThreshold) === 1 ? "" : "s"} beyond the benchmark.`
        : `The milestone is calculated against the active certification rules in the CMS.`,
      bestRank
        ? `Its certification case is not just about volume: the release has also climbed as high as #${bestRank} in the public chart record.`
        : `Its certification case comes from accumulated monthly Top 50 performance rather than a manually written award note.`,
      `The next chart periods will show whether the release simply holds this level or keeps adding enough points to push toward the next benchmark.`,
    ].join("\n\n"),
    tags: uniqueTagList(["certification", cert.level, cert.chart_type]),
    author: "Ngoma Charts Data Desk",
    source_links: [{ label: "Certification point totals", kind: "automatic_certification_story", href: "/certifications" }],
    featured: false,
    pinned: false,
    breaking: false,
    published_at,
    updated_at: published_at,
    cover_image: cert.cover_image || cert.image || "",
    media: articleMediaForEntry(cert, cert.t),
    related_release: cert.release_id || null,
    related_release_title: cert.t,
    related_release_artist: cert.a,
    related_release_type: cert.chart_type === "albums" ? "album" : "single",
    related_artist: leadArtist?.id || null,
    related_artist_name: artistName,
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
