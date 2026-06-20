import { FULL, MONTHS } from "../data/liveChartData";

const CURRENT_MONTH = MONTHS[MONTHS.length - 1];
const PERIOD = `${MONTHS[0]} to ${CURRENT_MONTH}`;
const PLATFORM_LABELS = {
  "APPLE MUSIC": "Apple Music",
  AUDIOMACK: "Audiomack",
  BOOMPLAY: "Boomplay",
  SPOTIFY: "Spotify",
  YOUTUBE: "YouTube",
  SHAZAM: "Shazam",
};
const PLATFORM_ALIASES = {
  "apple music": "APPLE MUSIC",
  apple: "APPLE MUSIC",
  audiomack: "AUDIOMACK",
  boomplay: "BOOMPLAY",
  spotify: "SPOTIFY",
  youtube: "YOUTUBE",
  shazam: "SHAZAM",
};
const CERTIFICATIONS = [
  { label: "Diamond", points: 600 },
  { label: "Platinum", points: 400 },
  { label: "Gold", points: 200 },
];

const clean = (value = "") => String(value).trim();
const key = (value = "") => clean(value).toLowerCase().replace(/[\u2019']/g, "'").replace(/\s+/g, " ");
const number = (value) => Number(value) || 0;
const top50 = (entries = []) => entries.filter((entry) => number(entry.r) <= 50).slice(0, 50);

function creditMembers(entry = {}) {
  const members = [entry.a, ...clean(entry.fa).split(/\s*,\s*|\s*&\s*/)]
    .map(clean)
    .filter(Boolean);
  return [...new Map(members.map((member) => [key(member), member])).values()];
}

function formatMembers(members = []) {
  if (members.length <= 1) return members[0] || "Unknown artist";
  if (members.length === 2) return members.join(" & ");
  return `${members.slice(0, -1).join(", ")} & ${members[members.length - 1]}`;
}

const credit = (entry = {}) => formatMembers(creditMembers(entry));
const releaseKey = (entry = {}) => `${key(entry.t)}|||${key(entry.a)}`;
const sourceLine = (type, month, platform = "Combined") =>
  `Source: ${platform} ${type === "albums" ? "Albums" : "Singles"}, ${month}.`;

function parseContext(question) {
  const q = key(question);
  const month = MONTHS.find((item) => q.includes(key(item))) || CURRENT_MONTH;
  const type = /\balbum|albums\b/.test(q) ? "albums" : "singles";
  const platformKey = Object.entries(PLATFORM_ALIASES).find(([alias]) => q.includes(alias))?.[1] || null;
  const platform = platformKey ? PLATFORM_LABELS[platformKey] : "Combined";
  const requestedCount = Math.min(50, Math.max(1, number(q.match(/\btop\s+(\d{1,2})\b/)?.[1]) || 5));
  return { q, month, type, platformKey, platform, requestedCount };
}

function chartEntries(type, month, platformKey = null) {
  return platformKey
    ? top50(FULL[type]?.platforms?.[platformKey]?.[month] || [])
    : top50(FULL[type]?.combined?.[month] || []);
}

function monthsThrough(month) {
  const cutoff = Math.max(0, MONTHS.indexOf(month));
  return MONTHS.slice(0, cutoff + 1);
}

function allCombined(type, month) {
  return monthsThrough(month).flatMap((item) =>
    chartEntries(type, item).map((entry) => ({ ...entry, month: item })),
  );
}

function artistNames() {
  const names = new Map();
  ["singles", "albums"].forEach((type) => {
    MONTHS.forEach((month) => {
      chartEntries(type, month).forEach((entry) => {
        creditMembers(entry).forEach((name) => names.set(key(name), name));
      });
    });
  });
  return [...names.values()].sort((a, b) => b.length - a.length);
}

function releaseNames() {
  const names = new Map();
  ["singles", "albums"].forEach((type) => {
    MONTHS.forEach((month) => {
      chartEntries(type, month).forEach((entry) => names.set(key(entry.t), entry.t));
    });
  });
  return [...names.values()].sort((a, b) => b.length - a.length);
}

const ARTISTS = artistNames();
const RELEASES = releaseNames();

function findMentioned(question, candidates) {
  const q = key(question);
  return candidates.filter((candidate) => q.includes(key(candidate))).slice(0, 2);
}

function artistTable(type, month) {
  const totals = new Map();
  allCombined(type, month).forEach((entry) => {
    creditMembers(entry).forEach((artist) => {
      const artistKey = key(artist);
      const row = totals.get(artistKey) || {
        name: artist,
        points: 0,
        entries: new Map(),
        months: new Set(),
        bestRank: 999,
        bestRelease: null,
      };
      row.points += number(entry.p);
      row.months.add(entry.month);
      row.bestRank = Math.min(row.bestRank, number(entry.r));
      const existing = row.entries.get(releaseKey(entry));
      if (!existing || number(entry.r) < number(existing.r)) row.entries.set(releaseKey(entry), entry);
      if (!row.bestRelease || number(entry.r) < number(row.bestRelease.r)) row.bestRelease = entry;
      totals.set(artistKey, row);
    });
  });
  return [...totals.values()]
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

function releaseProfile(title, type, month) {
  const matches = allCombined(type, month).filter((entry) => key(entry.t) === key(title));
  if (!matches.length) return null;
  const latest = matches[matches.length - 1];
  return {
    title: latest.t,
    artist: credit(latest),
    points: matches.reduce((sum, entry) => sum + number(entry.p), 0),
    peak: Math.min(...matches.map((entry) => number(entry.r))),
    months: matches.length,
    latestRank: number(latest.r),
    latestMonth: latest.month,
    journey: matches.map((entry) => `${entry.month.replace(/ \d{4}$/, "")}: #${entry.r}`).join(", "),
  };
}

function certification(points) {
  return CERTIFICATIONS.find((level) => points >= level.points)?.label || "Not certified";
}

function topList(context) {
  const entries = chartEntries(context.type, context.month, context.platformKey).slice(0, context.requestedCount);
  if (!entries.length) return `No ${context.platform} ${context.type} chart is available for ${context.month}.`;
  const list = entries.map((entry) => `#${entry.r} ${entry.t} - ${credit(entry)}`).join("\n");
  return `${context.platform} ${context.type === "albums" ? "albums" : "singles"} Top ${entries.length} for ${context.month}:\n${list}\n\n${sourceLine(context.type, context.month, context.platform)}`;
}

function leader(context) {
  const entry = chartEntries(context.type, context.month, context.platformKey)[0];
  if (!entry) return `No ${context.platform} ${context.type} chart is available for ${context.month}.`;
  const points = context.platformKey ? ` It recorded ${number(entry.p).toLocaleString()} platform points.` : ` It earned ${entry.p} Display Points.`;
  return `${entry.t} by ${credit(entry)} was #1 on the ${context.platform} ${context.type === "albums" ? "albums" : "singles"} chart for ${context.month}.${points}\n\n${sourceLine(context.type, context.month, context.platform)}`;
}

function newEntries(context) {
  const index = MONTHS.indexOf(context.month);
  const current = chartEntries(context.type, context.month, context.platformKey);
  const previous = index > 0 ? chartEntries(context.type, MONTHS[index - 1], context.platformKey) : [];
  const previousKeys = new Set(previous.map(releaseKey));
  const priorKeys = new Set(MONTHS.slice(0, index).flatMap((month) =>
    chartEntries(context.type, month, context.platformKey).map(releaseKey),
  ));
  const entries = current.filter((entry) => !priorKeys.has(releaseKey(entry)));
  const reentries = current.filter((entry) => !previousKeys.has(releaseKey(entry)) && priorKeys.has(releaseKey(entry)));
  const names = entries.slice(0, 12).map((entry) => `#${entry.r} ${entry.t} - ${credit(entry)}`).join("\n");
  const note = entries.length > 12 ? `\n...and ${entries.length - 12} more.` : "";
  const reentryNote = reentries.length ? ` ${reentries.length} additional ${reentries.length === 1 ? "release was a re-entry" : "releases were re-entries"} after charting in an earlier month.` : "";
  return `${entries.length} releases were new to this specific Top 50 in ${context.month}.${reentryNote}\n${names}${note}\n\n${sourceLine(context.type, context.month, context.platform)}`;
}

function movement(context, direction) {
  const index = MONTHS.indexOf(context.month);
  if (index < 1) return `${context.month} is the first available month, so no prior-month movement can be calculated.`;
  const previous = new Map(chartEntries(context.type, MONTHS[index - 1], context.platformKey).map((entry) => [releaseKey(entry), entry]));
  const movers = chartEntries(context.type, context.month, context.platformKey)
    .filter((entry) => previous.has(releaseKey(entry)))
    .map((entry) => ({ entry, change: number(previous.get(releaseKey(entry)).r) - number(entry.r) }))
    .filter((item) => direction === "rise" ? item.change > 0 : item.change < 0)
    .sort((a, b) => direction === "rise" ? b.change - a.change : a.change - b.change);
  const best = movers[0];
  if (!best) return `No ${direction === "rise" ? "rising" : "falling"} release was found for that chart and month.`;
  const oldRank = number(best.entry.r) + best.change;
  return `${best.entry.t} by ${credit(best.entry)} had the biggest ${direction} in ${context.month}: #${oldRank} to #${best.entry.r} (${Math.abs(best.change)} places).\n\n${sourceLine(context.type, context.month, context.platform)}`;
}

function artistAnswer(name, context) {
  const profile = artistTable(context.type, context.month).find((row) => key(row.name) === key(name));
  if (!profile) return `${name} has no ${context.type} Combined Top 50 record through ${context.month}.`;
  const best = profile.bestRelease;
  return `${profile.name} ranks #${profile.rank} on the cumulative ${context.type === "albums" ? "albums" : "singles"} artist table through ${context.month}. They have ${profile.points.toLocaleString()} credited Display Points across ${profile.entries.size} ${profile.entries.size === 1 ? "entry" : "entries"} and ${profile.months.size} ${profile.months.size === 1 ? "month" : "months"}. Their best release placement is #${profile.bestRank}: ${best.t}. Featured and joint credits are included.\n\nSource: Combined ${context.type === "albums" ? "Albums" : "Singles"}, ${MONTHS[0]} to ${context.month}.`;
}

function compareArtists(names, context) {
  const table = artistTable(context.type, context.month);
  const profiles = names.map((name) => table.find((row) => key(row.name) === key(name))).filter(Boolean);
  if (profiles.length < 2) return null;
  const lines = profiles.map((row) => `${row.name}: #${row.rank}, ${row.points.toLocaleString()} points, ${row.entries.size} entries, best release rank #${row.bestRank}`);
  const winner = [...profiles].sort((a, b) => b.points - a.points)[0];
  return `${lines.join("\n")}\n\n${winner.name} leads this comparison by cumulative credited Display Points through ${context.month}. Featured and joint credits are included.\n\nSource: Combined ${context.type === "albums" ? "Albums" : "Singles"}, ${MONTHS[0]} to ${context.month}.`;
}

function releaseAnswer(title, context) {
  const profile = releaseProfile(title, context.type, context.month);
  if (!profile) return `${title} has no ${context.type} Combined Top 50 record through ${context.month}.`;
  return `${profile.title} by ${profile.artist} has ${profile.points.toLocaleString()} cumulative Display Points through ${context.month}. It charted in ${profile.months} ${profile.months === 1 ? "month" : "months"}, peaked at #${profile.peak}, and was #${profile.latestRank} in its latest appearance (${profile.latestMonth}). Certification level: ${certification(profile.points)}.\nRank journey: ${profile.journey}.\n\nSource: Combined ${context.type === "albums" ? "Albums" : "Singles"}, ${MONTHS[0]} to ${context.month}.`;
}

function compareReleases(titles, context) {
  const profiles = titles.map((title) => releaseProfile(title, context.type, context.month)).filter(Boolean);
  if (profiles.length < 2) return null;
  const lines = profiles.map((row) => `${row.title}: ${row.points.toLocaleString()} points, peak #${row.peak}, ${row.months} chart months`);
  const winner = [...profiles].sort((a, b) => b.points - a.points)[0];
  return `${lines.join("\n")}\n\n${winner.title} leads by cumulative Display Points through ${context.month}.\n\nSource: Combined ${context.type === "albums" ? "Albums" : "Singles"}, ${MONTHS[0]} to ${context.month}.`;
}

function topArtists(context) {
  const rows = artistTable(context.type, context.month).slice(0, context.requestedCount);
  return `Cumulative Top ${rows.length} ${context.type === "albums" ? "album" : "singles"} artists through ${context.month}:\n${rows.map((row) => `#${row.rank} ${row.name} - ${row.points.toLocaleString()} points, ${row.entries.size} entries`).join("\n")}\n\nFeatured and joint credits are included. Source: Combined charts, ${MONTHS[0]} to ${context.month}.`;
}

function platformLeaders(context) {
  const platforms = Object.keys(FULL[context.type]?.platforms || {});
  const lines = platforms.map((platformKey) => {
    const entry = chartEntries(context.type, context.month, platformKey)[0];
    return entry ? `${PLATFORM_LABELS[platformKey]}: ${entry.t} - ${credit(entry)}` : null;
  }).filter(Boolean);
  return `Platform #1s for ${context.type === "albums" ? "albums" : "singles"}, ${context.month}:\n${lines.join("\n")}\n\nSource: individual platform charts, ${context.month}.`;
}

function platformContributions(context) {
  const combined = chartEntries(context.type, context.month);
  const lines = Object.keys(FULL[context.type]?.platforms || {}).map((platformKey) => {
    const platformKeys = new Set(chartEntries(context.type, context.month, platformKey).map(releaseKey));
    return {
      platform: PLATFORM_LABELS[platformKey],
      entries: combined.filter((entry) => platformKeys.has(releaseKey(entry))).length,
    };
  }).sort((a, b) => b.entries - a.entries);
  return `Combined Top 50 entries represented on each platform in ${context.month}:\n${lines.map((item) => `${item.platform}: ${item.entries}`).join("\n")}\n\n${lines[0]?.platform || "No platform"} contributed the most matched entries for this chart. Source: Combined and individual platform ${context.type} charts, ${context.month}.`;
}

function coverage(context) {
  const maximum = context.type === "albums" ? 2 : 6;
  const entries = chartEntries(context.type, context.month).filter((entry) => number(clean(entry.pl).split("/")[0]) === maximum);
  if (!entries.length) return `No release achieved ${maximum}/${maximum} platform coverage on the Combined ${context.type} chart in ${context.month}.\n\n${sourceLine(context.type, context.month)}`;
  return `${entries.length} ${entries.length === 1 ? "release" : "releases"} achieved ${maximum}/${maximum} coverage in ${context.month}:\n${entries.map((entry) => `${entry.t} - ${credit(entry)}`).join("\n")}\n\n${sourceLine(context.type, context.month)}`;
}

function certificationBreakdown(context) {
  const groups = new Map();
  allCombined(context.type, context.month).forEach((entry) => {
    const release = groups.get(releaseKey(entry)) || { entry, points: 0 };
    release.points += number(entry.p);
    groups.set(releaseKey(entry), release);
  });
  const certified = [...groups.values()].map((item) => ({ ...item, level: certification(item.points) })).filter((item) => item.level !== "Not certified");
  const counts = CERTIFICATIONS.map((level) => `${level.label}: ${certified.filter((item) => item.level === level.label).length}`).join(", ");
  const leaders = certified.sort((a, b) => b.points - a.points).slice(0, 5);
  return `Certification breakdown through ${context.month} (${context.type}): ${counts}.\nHighest totals:\n${leaders.map((item) => `${item.entry.t} - ${item.points.toLocaleString()} points (${item.level})`).join("\n") || "No certified releases yet."}\n\nThresholds: Gold 200, Platinum 400, Diamond 600 Display Points. Source: Combined charts, ${MONTHS[0]} to ${context.month}.`;
}

function localInternational(context) {
  const entries = chartEntries(context.type, context.month);
  const local = entries.filter((entry) => clean(entry.cc).toUpperCase() === "KE");
  const known = entries.filter((entry) => clean(entry.cc));
  const international = known.filter((entry) => clean(entry.cc).toUpperCase() !== "KE");
  const unknown = entries.length - known.length;
  return `In the ${context.month} Combined ${context.type} Top 50, ${local.length} entries are Kenyan and ${international.length} are international among entries with known country data.${unknown ? ` ${unknown} entries have no country recorded, so they are excluded from that comparison.` : ""}\n\n${sourceLine(context.type, context.month)}`;
}

function highestPoints(context) {
  const groups = new Map();
  allCombined(context.type, context.month).forEach((entry) => {
    const row = groups.get(releaseKey(entry)) || { entry, points: 0 };
    row.points += number(entry.p);
    groups.set(releaseKey(entry), row);
  });
  const best = [...groups.values()].sort((a, b) => b.points - a.points)[0];
  if (!best) return "No chart data is available for that request.";
  return `${best.entry.t} by ${credit(best.entry)} has the highest cumulative ${context.type} Display Points through ${context.month}: ${best.points.toLocaleString()}. Its certification level is ${certification(best.points)}.\n\nSource: Combined charts, ${MONTHS[0]} to ${context.month}.`;
}

export function answerNgomaQuestion(question) {
  const context = parseContext(question);
  const artistMentions = findMentioned(question, ARTISTS);
  const releaseMentions = findMentioned(question, RELEASES);

  if (!context.q) return "Ask a question about the Ngoma Charts dataset.";
  if (/^(hi|hello|hey|help|what can you do)[?!. ]*$/.test(context.q)) {
    return `I answer only from the Ngoma Charts data stored in this app (${PERIOD}). Ask about chart leaders, Top 50 entries, artists, releases, rank journeys, movements, platforms, coverage, certifications, or local vs international performance.`;
  }
  if (/data period|date range|what data|coverage period|how current/.test(context.q)) {
    return `The in-app analyst uses the bundled Ngoma Charts dataset from ${PERIOD}: Combined Top 50 singles and albums plus their individual platform charts. It does not browse the web or call an external AI service.`;
  }
  if (/weather|forecast|temperature|breaking news|latest news|sports|football|politic|election|stock|price|net worth|born|birthday|age of|how old|biograph|personal life|relationship|lyrics|song meaning|tour date|concert|streaming link|play the song/.test(context.q)) {
    return `That information is not part of the Ngoma Charts dataset, so I cannot answer it. I only use the chart records stored in this app (${PERIOD}) and do not search the web or guess.`;
  }
  if (/compare|versus|\bvs\b/.test(context.q) && artistMentions.length >= 2) return compareArtists(artistMentions, context);
  if (/compare|versus|\bvs\b/.test(context.q) && releaseMentions.length >= 2) return compareReleases(releaseMentions, context);
  if (/predict|prediction|what makes.*#?1|why.*#?1/.test(context.q)) {
    return "The stored charts show rankings, points, movement, coverage, and platform presence, but they do not contain causal data. I can describe patterns in the charts, but I cannot claim what predicts or causes a #1 release.";
  }
  if (/how many entries|chart size|entries.*chart/.test(context.q)) {
    return `Every ${context.platform} chart view is limited to the Top 50, so it contains 50 entries for ${context.month}.\n\n${sourceLine(context.type, context.month, context.platform)}`;
  }
  if (/top\s+\d+.*artist|best artist|top artist|artist ranking|artists ranking/.test(context.q)) return topArtists(context);
  if (/dominated|dominant artist|overall artist/.test(context.q)) return topArtists({ ...context, requestedCount: 5 });
  if (/platform.*#?1|#?1.*platform|platform leader|who led.*platform/.test(context.q)) return platformLeaders(context);
  if (/platform.*contribut|contribut.*platform|platform.*entr|which platform.*most/.test(context.q)) return platformContributions(context);
  if (/new entr|debut/.test(context.q)) return newEntries(context);
  if (/biggest rise|rose fastest|fastest ris|highest climb|biggest climb/.test(context.q)) return movement(context, "rise");
  if (/biggest fall|fell fastest|fastest fall|largest drop|biggest drop/.test(context.q)) return movement(context, "fall");
  if (/coverage|all platforms|cross.platform/.test(context.q)) return coverage(context);
  if (/certif|diamond|platinum|gold/.test(context.q) && !releaseMentions.length) return certificationBreakdown(context);
  if (/local.*international|international.*local|kenyan.*international/.test(context.q)) return localInternational(context);
  if (/highest points|most points|highest score|best release/.test(context.q) && !releaseMentions.length) return highestPoints(context);
  if (artistMentions.length) return artistAnswer(artistMentions[0], context);
  if (releaseMentions.length) return releaseAnswer(releaseMentions[0], context);
  if (/top\s+\d+|top songs|top albums|show.*chart|list.*chart/.test(context.q)) return topList(context);
  if (/who.*#?1|number one|chart leader|topped|top song|top album|what is #?1/.test(context.q)) return leader(context);

  return `I could not map that question to a fact stored in Ngoma Charts. I only answer from the in-app ${PERIOD} dataset. Try asking "Who was #1 in May 2026?", "Top 10 Spotify songs", "How did Finale perform?", "Top 10 artists", or "Certification breakdown".`;
}

export const NGOMA_ANALYST_PERIOD = PERIOD;
