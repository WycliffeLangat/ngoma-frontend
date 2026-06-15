import { useState, useEffect, useMemo, useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  CartesianGrid,
} from "recharts";
import { FULL, MONTHS } from "./data/chartData";
import PremiumChartsPage, { getArtistCountry } from "./components/PremiumChartsPage";

// ===== FULL Top-50 dataset across all months and platforms =====
const CURRENT_MONTH = MONTHS[MONTHS.length - 1];
const DATA_PERIOD = `${MONTHS[0]} – ${CURRENT_MONTH}`;
const S_PLATS = ["Combined","APPLE MUSIC","AUDIOMACK","BOOMPLAY","SPOTIFY","YOUTUBE","SHAZAM"];
const A_PLATS = ["Combined","APPLE MUSIC","AUDIOMACK"];
const PLAT_LABEL = {"APPLE MUSIC":"Apple Music","AUDIOMACK":"Audiomack","BOOMPLAY":"Boomplay","SPOTIFY":"Spotify","YOUTUBE":"YouTube","SHAZAM":"Shazam"};
const PC = {"Apple Music":"#FC3C44","APPLE MUSIC":"#FC3C44","Audiomack":"#F68B1F","AUDIOMACK":"#F68B1F","Boomplay":"#00FFFF","BOOMPLAY":"#00FFFF","Spotify":"#1DB954","SPOTIFY":"#1DB954","YouTube":"#FF0000","YOUTUBE":"#FF0000","Shazam":"#0088FF","SHAZAM":"#0088FF"};
const GOLD="#B8860B"; const SILVER="#8C8C8C"; const BRONZE="#CD7F32";
const MEDALS=[GOLD,SILVER,BRONZE];
const F = "'Instrument Sans',Helvetica,sans-serif";
const SF = "'Source Serif 4',Georgia,serif";
const CC = [GOLD,"#E53935","#2DB04A","#1565C0","#7B1FA2","#E65100","#00897B","#37474F","#AD1457","#558B2F"];
const VO = [{l:"Top 10",c:10},{l:"Top 20",c:20},{l:"Top 50",c:50}];
const CERTIFICATION_LEVELS = [
  { level: "diamond", label: "Diamond", icon: "💎", pts: 600, color: "#7B1FA2" },
  { level: "platinum", label: "Platinum", icon: "🪙", pts: 400, color: SILVER },
  { level: "gold", label: "Gold", icon: "🥇", pts: 200, color: GOLD },
];
const getCertificationLevel = (totalPts = 0) => {
  const points = Number(totalPts) || 0;
  return CERTIFICATION_LEVELS.find((item) => points >= item.pts)?.level || null;
};

const buildCertifications = (items = []) => items
  .map((item) => ({
    t: item.t,
    a: item.a,
    totalPts: Number(item.totalPts) || 0,
    level: getCertificationLevel(item.totalPts),
  }))
  .filter((item) => item.level);
const releaseTitle = (item = {}) => item.t || item.title || item.release_title || item.name || "";
const releaseArtist = (item = {}) => item.a || item.artist || item.artist_name || item.primary_artist || "";
const formatCreditMembers = (members = []) => {
  const unique = [...new Map(members
    .map((member) => String(member || "").trim())
    .filter(Boolean)
    .map((member) => [member.toLowerCase(), member])).values()];
  if (unique.length <= 1) return unique[0] || "";
  if (unique.length === 2) return unique.join(" & ");
  return `${unique.slice(0, -1).join(", ")} & ${unique[unique.length - 1]}`;
};
const artistCreditMembers = (item = {}) => {
  const primaryArtist = String(item.primary_artist || item.pa || "").trim();
  const featuredArtists = String(item.featured_artists || item.fa || "").trim();
  const source = primaryArtist
    ? [primaryArtist, ...featuredArtists.split(/\s*,\s*|\s*&\s*/)]
    : String(item.artist || item.a || "").split(/\s*,\s*|\s*&\s*/);
  return [...new Map(source
    .map((member) => String(member || "").trim())
    .filter(Boolean)
    .map((member) => [member.toLowerCase(), member])).values()];
};
const formatArtistCredit = (primaryArtist = "", featuredArtists = "") => {
  const members = [primaryArtist, ...String(featuredArtists || "").split(/\s*,\s*|\s*&\s*/)]
    .map((member) => String(member || "").trim())
    .filter(Boolean);
  return formatCreditMembers(members);
};
const firstFiniteNumber = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;
    const parsed = Number(String(value).replace(/,/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};
const certificationKey = (title = "", artist = "") =>
  `${String(title).trim().toLowerCase()}|||${String(artist).trim().toLowerCase()}`;
const certificationMetaForLevel = (level) => CERTIFICATION_LEVELS.find((item) => item.level === level) || null;
const COUNTRY_ACCENTS = {
  BB:"#00267F",CA:"#D80621",CD:"#007FFF",CI:"#F77F00",CL:"#D52B1E",DE:"#FFCE00",FR:"#0055A4",GB:"#012169",
  GH:"#CE1126",IN:"#FF9933",JM:"#009B3A",KE:"#006600",KR:"#CD2E3A",NG:"#008751",
  NO:"#BA0C2F",PR:"#ED0000",RW:"#00A1DE",SE:"#006AA7",TZ:"#1EB53A",UG:"#D90000",US:"#3C3B6E",ZA:"#007749",ZW:"#319208",
};
const CountryBadge = ({ artist, item, compact = false, style = {} }) => {
  const country = getArtistCountry(item || { artist });
  const accent = COUNTRY_ACCENTS[country.code] || "#69716B";
  return (
    <span
      title={`${country.country}${country.code ? ` (${country.code})` : ""}`}
      style={{
        display:"inline-flex",alignItems:"center",justifyContent:"center",gap:"6px",
        minWidth:compact?"28px":"36px",height:compact?"28px":"30px",padding:"0 7px",
        borderRadius:compact?"9px":"999px",background:`${accent}12`,border:`1px solid ${accent}45`,
        color:accent,fontFamily:F,fontSize:compact?"9px":"10px",fontWeight:850,whiteSpace:"nowrap",...style,
      }}
    >
      <span style={{fontSize:compact?"9px":"10px",letterSpacing:"0.8px",lineHeight:1}}>{country.code || "—"}</span>
    </span>
  );
};
const MONTH_NUMBER = {
  "January": 1,
  "February": 2,
  "March": 3,
  "April": 4,
  "May": 5,
  "June": 6,
  "July": 7,
  "August": 8,
  "September": 9,
  "October": 10,
  "November": 11,
  "December": 12,
};

function getMonthYearParts(label) {
  const [monthName, year] = label.split(" ");
  return {
    monthNumber: MONTH_NUMBER[monthName],
    year,
  };
}

function platformToSlug(platform) {
  if (!platform || platform === "Combined") return "combined";

  return platform
    .toLowerCase()
    .replace(/\s+/g, "-");
}

// Helpers — return entries from FULL with proper month-to-month chart history
const entryKey = e => `${String(e.t || e.title || "").trim().toLowerCase()}|||${String(e.primary_artist || e.a || e.artist || "").trim().toLowerCase()}`;
const sameRelease = (left, right) => entryKey(left) === entryKey(right);
const monthIndex = m => MONTHS.indexOf(m);

const rawCombined = (ct, m) => FULL[ct].combined[m] || [];
const rawPlatform = (ct, pl, m) => ((FULL[ct].platforms[pl] || {})[m] || []);
const combinedEntryCache = new Map();
const platformEntryCache = new Map();
const rawPlatformIndexCache = new Map();

const getRawPlatformIndex = (ct, pl, m) => {
  const cacheKey = `${ct}|${pl}|${m}`;
  if (!rawPlatformIndexCache.has(cacheKey)) {
    const index = new Map();
    rawPlatform(ct, pl, m).forEach((entry) => {
      const key = entryKey(entry);
      if (!index.has(key)) index.set(key, entry);
    });
    rawPlatformIndexCache.set(cacheKey, index);
  }
  return rawPlatformIndexCache.get(cacheKey);
};

function enrichChartEntries(entries, getRawEntries, currentMonth, totalPlatforms) {
  const currentIndex = monthIndex(currentMonth);
  const historyMonths = currentIndex >= 0 ? MONTHS.slice(0, currentIndex + 1) : [];
  const historyByMonth = historyMonths.map((monthLabel) =>
    getRawEntries(monthLabel).filter((item) => Number(item.r) <= 50).slice(0, 50)
  );
  const previousEntries = currentIndex > 0 ? historyByMonth[currentIndex - 1] : [];
  const previousByKey = new Map();
  previousEntries.forEach((item) => {
    const key = entryKey(item);
    if (!previousByKey.has(key)) previousByKey.set(key, item);
  });
  const earlierKeys = new Set();
  const historyStats = new Map();

  historyByMonth.forEach((monthEntries, monthOffset) => {
    const seenThisMonth = new Set();
    monthEntries.forEach((item) => {
      const key = entryKey(item);
      if (monthOffset < currentIndex) earlierKeys.add(key);

      const rank = Number(item.r);
      const stats = historyStats.get(key) || { peakRank: Number.POSITIVE_INFINITY, months: 0 };
      if (Number.isFinite(rank)) stats.peakRank = Math.min(stats.peakRank, rank);
      if (!seenThisMonth.has(key)) {
        stats.months += 1;
        seenThisMonth.add(key);
      }
      historyStats.set(key, stats);
    });
  });

  return entries.map((e) => {
    const key = entryKey(e);
    const previousEntry = previousByKey.get(key);
    const appearedBefore = earlierKeys.has(key);
    const stats = historyStats.get(key) || {};
    const peakRank = stats.peakRank;
    const monthsOnChart = stats.months || 0;

    const platformCount = e.pl
      ? Number(String(e.pl).split("/")[0]) || undefined
      : undefined;

    const primaryArtist = String(e.pa || e.a || "").trim();
    const featuredArtists = String(e.fa || "").trim();

    return {
      rank: e.r,
      title: e.t,
      artist: formatArtistCredit(primaryArtist, featuredArtists),
      primary_artist: primaryArtist,
      featured_artists: featuredArtists,
      pts: e.p,
      rawPts: e.rp ?? null,
      plat: e.pl || (platformCount ? `${platformCount}/${totalPlatforms}` : ""),
      prev: previousEntry ? previousEntry.r : null,
      last_month: previousEntry ? previousEntry.r : "—",
      first: false,
      is_new: !appearedBefore,
      reentry: !previousEntry && appearedBefore,
      movement: previousEntry ? undefined : appearedBefore ? "reentry" : "new",
      peak_rank: peakRank === 999 ? e.r : peakRank,
      weeks_on_chart: e.w ?? "—",
      months_on_chart: monthsOnChart || "—",
      platform_count: platformCount,
      platform_max: e.pl ? Number(String(e.pl).split("/")[1]) || totalPlatforms : totalPlatforms,
      release_year: e.y ?? null,
      confidence: e.c || "",
      country: e.co || "",
      country_code: e.cc || "",
      artist_country: e.co || "",
      artist_country_code: e.cc || "",
    };
  });
}

const getCombined = (ct, m) => {
  const cacheKey = `${ct}|${m}`;
  if (!combinedEntryCache.has(cacheKey)) {
    combinedEntryCache.set(
      cacheKey,
      enrichChartEntries(rawCombined(ct, m), (monthLabel) => rawCombined(ct, monthLabel), m, ct === "albums" ? 2 : 6)
    );
  }
  return combinedEntryCache.get(cacheKey);
};

const getPlatform = (ct, pl, m) => {
  const cacheKey = `${ct}|${pl}|${m}`;
  if (!platformEntryCache.has(cacheKey)) {
    platformEntryCache.set(
      cacheKey,
      enrichChartEntries(rawPlatform(ct, pl, m), (monthLabel) => rawPlatform(ct, pl, monthLabel), m, 1)
    );
  }
  return platformEntryCache.get(cacheKey);
};

const defaultComparisonKey = (chartType, index) => {
  const entry = getCombined(chartType, CURRENT_MONTH)[index];
  return entry ? `${entry.title} — ${entry.artist}` : "";
};

const buildCombinedYearEnd = (chartType) => {
  const releases = new Map();

  MONTHS.forEach((monthLabel) => {
    getCombined(chartType, monthLabel).forEach((entry) => {
      const key = entryKey(entry);
      const current = releases.get(key) || {
        t: entry.title,
        a: entry.artist,
        primary_artist: entry.primary_artist,
        featured_artists: entry.featured_artists,
        release_year: entry.release_year,
        confidence: entry.confidence,
        country_code: entry.country_code,
        totalPts: 0,
        months: 0,
        best: Number.POSITIVE_INFINITY,
      };

      current.totalPts += Number(entry.pts) || 0;
      current.months += 1;
      current.best = Math.min(current.best, Number(entry.rank) || Number.POSITIVE_INFINITY);
      releases.set(key, current);
    });
  });

  return [...releases.values()].sort((a, b) =>
    b.totalPts - a.totalPts || a.best - b.best || a.t.localeCompare(b.t)
  );
};

const combinedArtistsCache = new Map();
const buildCombinedArtists = (chartType, throughMonth = CURRENT_MONTH) => {
  const cacheKey = `${chartType}|${throughMonth}`;
  if (combinedArtistsCache.has(cacheKey)) return combinedArtistsCache.get(cacheKey);

  const cutoffIndex = Math.max(0, monthIndex(throughMonth));
  const includedMonths = MONTHS.slice(0, cutoffIndex + 1);
  const artistMap = new Map();
  const cumulativeTotals = new Map();
  const previousRanks = new Map();

  includedMonths.forEach((monthLabel, monthOffset) => {
    getCombined(chartType, monthLabel).forEach((entry) => {
      artistCreditMembers(entry).forEach((artistName) => {
        const key = artistName.toLowerCase();
        const current = artistMap.get(key) || {
          n: artistName,
          p: 0,
          m: 0,
          t: 0,
          rank: Number.POSITIVE_INFINITY,
          prevRank: null,
          pk: Number.POSITIVE_INFINITY,
          mp: {},
          rh: {},
          months: new Set(),
          titles: new Set(),
        };

        const points = Number(entry.pts) || 0;
        current.p += points;
        current.mp[monthLabel] = (current.mp[monthLabel] || 0) + points;
        current.months.add(monthLabel);
        current.titles.add(entryKey(entry));
        artistMap.set(key, current);
        cumulativeTotals.set(key, (cumulativeTotals.get(key) || 0) + points);
      });
    });

    [...cumulativeTotals.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .forEach(([key], index) => {
        const artist = artistMap.get(key);
        if (!artist) return;
        const rank = index + 1;
        artist.rh[monthLabel] = rank;
        artist.pk = Math.min(artist.pk, rank);
        if (monthOffset === includedMonths.length - 2) previousRanks.set(key, rank);
        if (monthOffset === includedMonths.length - 1) artist.rank = rank;
      });
  });

  const result = [...artistMap.entries()]
    .map(([key, { months, titles, ...artist }]) => ({
      ...artist,
      m: months.size,
      t: titles.size,
      prevRank: previousRanks.get(key) || null,
      pk: Number.isFinite(artist.pk) ? artist.pk : "—",
    }))
    .sort((a, b) => a.rank - b.rank || b.p - a.p || a.n.localeCompare(b.n));
  combinedArtistsCache.set(cacheKey, result);
  return result;
};

const buildCombinedTrending = (chartType) => {
  const latestMonth = MONTHS[MONTHS.length - 1];
  const previousMonth = MONTHS[MONTHS.length - 2];
  const earlierMonths = MONTHS.slice(0, -2);
  const latestRows = getCombined(chartType, latestMonth);
  const previousRows = getCombined(chartType, previousMonth);
  const previousMap = new Map(previousRows.map((entry) => [entryKey(entry), entry]));
  const earlierMaps = earlierMonths.map((monthLabel) =>
    new Map(getCombined(chartType, monthLabel).map((entry) => [entryKey(entry), entry]))
  );

  const rising = latestRows
    .map((entry) => {
      const key = entryKey(entry);
      const previous = previousMap.get(key);
      if (!previous || Number(previous.rank) <= Number(entry.rank)) return null;

      const earlierRanks = earlierMaps.map((map) => map.get(key)?.rank ?? null);
      const rankTrend = [...earlierRanks, previous.rank, entry.rank];
      const chartedRanks = rankTrend.filter((rank) => Number.isFinite(Number(rank))).map(Number);
      const consecutive = chartedRanks.length >= 3 && chartedRanks.every((rank, index) => index === 0 || rank < chartedRanks[index - 1]);

      return {
        t: entry.title,
        a: entry.artist,
        fromRank: Number(previous.rank),
        decRank: Number(entry.rank),
        places: Number(previous.rank) - Number(entry.rank),
        trend: rankTrend,
        consecutive,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.places - a.places || Number(b.consecutive) - Number(a.consecutive) || a.decRank - b.decRank)
    .slice(0, 8);

  const previousKeys = new Set([
    ...previousRows.map(entryKey),
    ...earlierMaps.flatMap((map) => [...map.keys()]),
  ]);
  const debuts = latestRows
    .filter((entry) => !previousKeys.has(entryKey(entry)) && Number(entry.rank) <= 15)
    .map((entry) => ({
      t: entry.title,
      a: entry.artist,
      decRank: Number(entry.rank),
      trend: [...earlierMonths.map(() => null), null, Number(entry.rank)],
    }));

  return { rising, debuts };
};

const COMBINED_YEAR_END = {
  singles: buildCombinedYearEnd("singles"),
  albums: buildCombinedYearEnd("albums"),
};
const COMBINED_ARTISTS = {
  singles: buildCombinedArtists("singles"),
  albums: buildCombinedArtists("albums"),
};
const COMBINED_TRENDING = {
  singles: buildCombinedTrending("singles"),
  albums: buildCombinedTrending("albums"),
};

function AnalyticsDeepSection({ label, isMobile, children }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isMobile) return <>{children}</>;

  return (
    <details
      className="ngoma-mobile-collapsible"
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary>{label}<span>View</span></summary>
      {isOpen && <div className="ngoma-mobile-collapsible-body">{children}</div>}
    </details>
  );
}

// Movement badge
const mv = e => {
  const movementType = String(e.movement || e.movement_type || "").toLowerCase();
  if(e.reentry || movementType === "reentry" || movementType === "re-entry" || movementType === "re" || movementType === "r.e") return {t:"reentry"};
  if(e.is_new || movementType === "new") return {t:"new"};
  if(e.prev===null||e.prev===undefined||e.prev==="") return {t:"new"};
  const d=e.prev-e.rank;
  if(d>0) return {t:"up",v:d};
  if(d<0) return {t:"down",v:Math.abs(d)};
  return {t:"same"};
};


const MvBadge=({e})=>{
  const m=mv(e);
  if(m.t==="new")return <span style={{background:"#1A1A1A",color:"#FFF",padding:"1.5px 4px",borderRadius:"2px",fontSize:"7px",letterSpacing:"1px",fontWeight:800}}>NEW</span>;
  if(m.t==="reentry")return <span style={{background:"#1565C0",color:"#FFF",padding:"1.5px 4px",borderRadius:"2px",fontSize:"7px",letterSpacing:"1px",fontWeight:800}}>RE</span>;
  if(m.t==="up")return <span style={{color:"#2DB04A",fontSize:"9px",fontWeight:700}}>{"▲"+m.v}</span>;
  if(m.t==="down")return <span style={{color:"#E53935",fontSize:"9px",fontWeight:700}}>{"▼"+m.v}</span>;
  return <span style={{color:"#DEDEDE",fontSize:"9px"}}>{"—"}</span>;
};

const RecordIcon = ({ label = "", size = 30, muted = false }) => {
  const key = String(label).toLowerCase();
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: { color: muted ? "rgba(184,134,11,0.13)" : GOLD, display: "block" },
  };

  if (key.includes("#1") || key.includes("months at")) {
    return (
      <svg {...common}>
        <path d="M4 18h16" />
        <path d="M5 16 4 7l5 3 3-6 3 6 5-3-1 9H5Z" />
      </svg>
    );
  }

  if (key.includes("score")) {
    return (
      <svg {...common}>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="m7 15 3-4 3 2 5-7" />
      </svg>
    );
  }

  if (key.includes("climb")) {
    return (
      <svg {...common}>
        <path d="M4 17 17 4" />
        <path d="M9 4h8v8" />
        <path d="M4 17l4 3 2-5" />
      </svg>
    );
  }

  if (key.includes("coverage")) {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="M4 12h16" />
        <path d="M12 4c2.2 2.3 3.2 5 3.2 8s-1 5.7-3.2 8" />
        <path d="M12 4c-2.2 2.3-3.2 5-3.2 8s1 5.7 3.2 8" />
      </svg>
    );
  }

  if (key.includes("longevity")) {
    return (
      <svg {...common}>
        <path d="M7 4h10" />
        <path d="M7 20h10" />
        <path d="M8 4c0 4 3.2 5.4 4 8-0.8 2.6-4 4-4 8" />
        <path d="M16 4c0 4-3.2 5.4-4 8 0.8 2.6 4 4 4 8" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M10 18V6l8-2v10" />
      <circle cx="7" cy="18" r="3" />
      <circle cx="15" cy="14" r="3" />
    </svg>
  );
};

const NEWS=[
  {id:1,date:"June 15, 2026",cat:"CHART NEWS",emoji:"",title:"Finale Leads May After Collaboration Credits Are Unified",excerpt:"Bien & Alikiba's Finale ranks #1 with appearances on five of six tracked singles platforms.",body:"Equivalent Bien, Bien ft. Alikiba and Bien & Alikiba credits are treated as one release. Finale leads Apple Music, Spotify and YouTube for May."},
  {id:2,date:"June 14, 2026",cat:"CHART NEWS",emoji:"",title:"Finale Completes Back-to-Back Months at #1",excerpt:"Bien & Alikiba also lead the recalculated April Combined singles chart.",body:"The collaboration finishes ahead of Siaka and Pawa in April, then retains the summit in May."},
  {id:3,date:"June 13, 2026",cat:"ANALYTICS",emoji:"",title:"Pawa Remains the Period's Highest-Scoring Single",excerpt:"Mbosso's Pawa totals 436 display points across all nine tracked months.",body:"Pawa appeared in every monthly Combined chart and finished #1 in November and December 2025."},
  {id:4,date:"June 12, 2026",cat:"ARTIST SPOTLIGHT",emoji:"",title:`${COMBINED_ARTISTS.singles[0].n} Leads the Singles Artist Ranking`,excerpt:`Credited appearances produce ${COMBINED_ARTISTS.singles[0].p.toLocaleString()} cumulative artist points through May 2026.`,body:"The artist ranking now credits every named primary and featured artist whenever a release contributes to the Combined Top 50."},
  {id:5,date:"June 11, 2026",cat:"ANALYTICS",emoji:"",title:"Natafuta Doo Makes May's Biggest Singles Jump",excerpt:"ELISHA TOTO climbs twenty-three positions from #40 to #17.",body:"The 23-place gain is the largest positive move among returning singles in May's normalized Combined chart."},
  {id:6,date:"June 10, 2026",cat:"CHART NEWS",emoji:"",title:"Zuchu's I Love You Climbs Eighteen Places",excerpt:"I Love You moves from #36 in April to #18 in May.",body:"The release also leads Boomplay's May chart, giving Zuchu both a strong platform result and a Top 20 Combined finish."},
  {id:7,date:"June 9, 2026",cat:"CHART NEWS",emoji:"",title:"Chai ya saa kumi Surges to #2",excerpt:"Ywaya Tajiri gains seventeen places from April to May.",body:"Chai ya saa kumi rises from #19 to #2 and appears on five of the six tracked singles platforms."},
  {id:8,date:"June 8, 2026",cat:"ANALYTICS",emoji:"",title:"May's Top Five Reflect Broad Platform Reach",excerpt:"Four of the first five singles chart on five platforms, while LAST DANCE reaches four.",body:"Finale, Chai ya saa kumi, AYAYAAH and Siaka each post 5/6 coverage in the latest Combined Top 50."},
  {id:9,date:"June 7, 2026",cat:"PLATFORM WATCH",emoji:"",title:"Finale Leads Three May Platform Charts",excerpt:"Bien & Alikiba finish #1 on Apple Music, Spotify and YouTube.",body:"Audiomack is led by Alikiba & Mbosso's Bhuju, Boomplay by Zuchu's I Love You, and Shazam by Deejay MJ's Well Done."},
  {id:10,date:"June 6, 2026",cat:"ANALYTICS",emoji:"",title:"No May Single Reaches 6/6 Coverage",excerpt:"The latest singles chart peaks at five tracked platforms per release.",body:"The result highlights how differently audiences behave across Apple Music, Audiomack, Boomplay, Spotify, YouTube and Shazam."},
  {id:11,date:"June 5, 2026",cat:"ALBUMS",emoji:"",title:"Asake's M$NEY Debuts at #1",excerpt:"M$NEY leads the May Combined albums chart with full 2/2 coverage.",body:"The album appears on both Apple Music and Audiomack and arrives ahead of Cardi B's AM I THE DRAMA? (Ultimate Edition)."},
  {id:12,date:"June 4, 2026",cat:"ALBUMS",emoji:"",title:"Kehlani Makes May's Biggest Album Leap",excerpt:"Kehlani rises forty-five places from #50 to #5.",body:"No returning song or album makes a larger month-to-month move in the latest Combined rankings."},
  {id:13,date:"June 3, 2026",cat:"ALBUMS",emoji:"",title:"Fally Ipupa's XX Rockets to #4",excerpt:"XX gains thirty-one positions from its April rank of #35.",body:"The climb places Fally Ipupa immediately behind May's Top 3 albums and gives XX full Apple Music and Audiomack coverage."},
  {id:14,date:"June 2, 2026",cat:"ALBUMS",emoji:"",title:"GOLD Climbs Sixteen Places",excerpt:"GOLD moves from #31 in April to #15 in May.",body:"The album records one of May's strongest gains and returns to the upper half of the Combined Top 50."},
  {id:15,date:"June 1, 2026",cat:"ARTIST SPOTLIGHT",emoji:"",title:`${COMBINED_ARTISTS.albums[0].n} Tops the Albums Artist Ranking`,excerpt:`Credited album appearances total ${COMBINED_ARTISTS.albums[0].p.toLocaleString()} cumulative artist points.`,body:"The albums artist ranking includes both primary and featured credits across every tracked Combined Top 50."},
  {id:16,date:"May 31, 2026",cat:"ALBUMS",emoji:"",title:"The Last Wun Leads the Nine-Month Albums Ranking",excerpt:"Gunna's album totals 414 display points across all nine months.",body:"The Last Wun finishes ahead of Bien's Alusa Why Are You Topless? and PARTYNEXTDOOR's $ome $exy $ongs 4 U."},
  {id:17,date:"May 30, 2026",cat:"ALBUMS",emoji:"",title:"Sixteen May Top 20 Albums Reach Both Platforms",excerpt:"Most of May's leading albums appear on both Apple Music and Audiomack.",body:"M$NEY, RNB, XX, Kehlani and twelve other Top 20 albums record full 2/2 platform coverage."},
  {id:18,date:"May 29, 2026",cat:"ANALYTICS",emoji:"",title:"Wrong Places Secures Platinum Status",excerpt:"Joshua Baraka & JAE5 total 408 points across nine months.",body:"Wrong Places appears in every tracked month and exceeds the new 400-point Platinum certification threshold."},
];

export default function NgomaCharts(){
  const [page,setPage]=useState("charts");
  const [ct,setCt]=useState("singles");
  const [month,setMonth]=useState(CURRENT_MONTH);
  const [plat,setPlat]=useState("Combined");
  const [vc,setVc]=useState(10);
  const [hr,setHr]=useState(null);
  const [srch,setSrch]=useState("");
  const [sOpen,setSOpen]=useState(false);
  const [mNav,setMNav]=useState(false);
  const [selA,setSelA]=useState(null);
  const [selR,setSelR]=useState(null);
  const [selNews,setSelNews]=useState(null);
  const [cmpA1,setCmpA1]=useState("Bensoul");
  const [cmpA2,setCmpA2]=useState("Dyana Cods");
  const [cmpS1,setCmpS1]=useState(() => defaultComparisonKey("singles", 0));
  const [cmpS2,setCmpS2]=useState(() => defaultComparisonKey("singles", 1));
  const [aiQ,setAiQ]=useState("");
  const [aiA,setAiA]=useState("");
  const [aiL,setAiL]=useState(false);
  const [anMonth,setAnMonth]=useState(CURRENT_MONTH);
  const [artistMonth,setArtistMonth]=useState(CURRENT_MONTH);
  const [rankJourneyView,setRankJourneyView]=useState("table");
  const [loaded,setLd]=useState(false);
  // Live backend (optional) — falls back to baked-in data if unreachable
  const API_BASE = import.meta.env.VITE_API_BASE || "";
  const [liveStatus, setLiveStatus] = useState("static"); // "static" | "live" | "checking"
  const [liveChartEntries, setLiveChartEntries] = useState([]);
  const [liveChartMeta, setLiveChartMeta] = useState(null);
  const [liveChartLoading, setLiveChartLoading] = useState(false);
  const [openRecord, setOpenRecord] = useState(null);
  const [expandedYearEndRows, setExpandedYearEndRows] = useState({});
  const [expandedArtistRows, setExpandedArtistRows] = useState({});
  const [expandedTrendingRows, setExpandedTrendingRows] = useState({});
  const detailOpenRef = useRef(false);
  const detailReturnScrollRef = useRef(0);

  const toggleYearEndRow = (rowKey) => {
    setExpandedYearEndRows((current) => ({
      ...current,
      [rowKey]: !current[rowKey],
    }));
  };

  const toggleArtistRow = (rowKey) => {
    setExpandedArtistRows((current) => ({
      ...current,
      [rowKey]: !current[rowKey],
    }));
  };

  const toggleTrendingRow = (rowKey) => {
    setExpandedTrendingRows((current) => ({
      ...current,
      [rowKey]: !current[rowKey],
    }));
  };

  const isSingles = ct === "singles";
  const platList = isSingles ? S_PLATS : A_PLATS;
  const tp = isSingles ? 6 : 2;

  useEffect(() => {
    if (!API_BASE) return;

    setLiveStatus("checking");

    fetch(API_BASE + "/charts/latest/?chart_type=singles&platform=combined")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then(() => setLiveStatus("live"))
      .catch(() => setLiveStatus("static"));
  }, [API_BASE]);

  useEffect(() => {
    setLiveChartEntries([]);
    setLiveChartMeta(null);

    if (!API_BASE) return;

    const { monthNumber, year } = getMonthYearParts(month);

    if (!monthNumber || !year) return;

    const controller = new AbortController();

    const params = new URLSearchParams();
    params.set("type", ct);
    params.set("month", String(monthNumber));
    params.set("year", String(year));
    params.set("platform", platformToSlug(plat));

    setLiveChartLoading(true);

    fetch(`${API_BASE}/export/chart-image-data/?${params.toString()}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Live chart unavailable");
        return response.json();
      })
      .then((chartData) => {
        const entries = (chartData.entries || []).map((entry) => {
          const movementType = String(entry.movement || "").toLowerCase();

          const displayPoints = entry.total_points || 0;

          return {
            rank: entry.rank,
            title: entry.title,
            artist: formatArtistCredit(entry.primary_artist || entry.artist, entry.featured_artists),
            primary_artist: entry.primary_artist || entry.artist,
            featured_artists: entry.featured_artists || "",
            pts: displayPoints,
            rawPts: null,
            plat: entry.platform_count ? `${entry.platform_count}/${entry.platform_max || tp}` : "",
            prev: entry.prev_rank,
            first: false,
            is_new: movementType === "new",
            reentry: movementType === "reentry" || movementType === "re-entry" || movementType === "re",
            movement: entry.movement,
            last_month:
              entry.last_month !== null && entry.last_month !== undefined && entry.last_month !== ""
                ? entry.last_month
                : entry.prev_rank ?? "—",
            peak_rank: entry.peak_rank,
            weeks_on_chart: entry.weeks_on_chart,
            platform_count: entry.platform_count,
            platform_max: entry.platform_max,
            release_year: entry.release_year,
            confidence: entry.confidence,
            country: entry.artist_country || entry.country || "",
            country_code: entry.artist_country_code || entry.country_code || "",
            artist_country: entry.artist_country || entry.country || "",
            artist_country_code: entry.artist_country_code || entry.country_code || "",
          };
        });

        setLiveChartEntries(entries);
        setLiveChartMeta(chartData);
        setLiveStatus("live");
      })
      .catch((error) => {
        if (error.name === "AbortError") return;
        setLiveChartEntries([]);
        setLiveChartMeta(null);
        setLiveStatus("static");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLiveChartLoading(false);
      });

    return () => controller.abort();
  }, [API_BASE, ct, month, plat, tp]);
  useEffect(()=>{setTimeout(()=>setLd(true),100);},[]);

  useEffect(() => {
    setShareCardRange(6);
  }, [page, ct, month, anMonth, plat]);
  const [vw,setVw]=useState(typeof window!=="undefined"?window.innerWidth:1200);
  useEffect(()=>{const h=()=>setVw(window.innerWidth);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);
  const isMobile=vw<640;
  const PAD=isMobile?"clamp(20px, 5vw, 28px)":"28px";
  const PAGE_MAX="1240px";
  const pageFrame=(extra={})=>({maxWidth:PAGE_MAX,width:"100%",margin:"0 auto",boxSizing:"border-box",minWidth:0,...extra});
  const responsiveStack=(desktop="row")=>({flexDirection:isMobile?"column":desktop,alignItems:isMobile?"stretch":"center"});
  useEffect(()=>{const h=e=>{if(e.key==="Escape"){setSOpen(false);setSrch("");setShareImg(null);setShareCardModalOpen(false);}};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);},[]);
  useEffect(() => {
    detailOpenRef.current = Boolean(selA || selR);
  }, [selA, selR]);
  useEffect(() => {
    const handlePopState = () => {
      if (!detailOpenRef.current) return;
      detailOpenRef.current = false;
      setSelA(null);
      setSelR(null);
      requestAnimationFrame(() => window.scrollTo({ top: detailReturnScrollRef.current, behavior: "auto" }));
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

const getData = () =>
  plat === "Combined" ? getCombined(ct, month) : getPlatform(ct, plat, month);

const staticData = getData();

const sourceData = liveChartEntries.length ? liveChartEntries : staticData;
const data = sourceData.filter((entry) => Number(entry.rank) <= 50).slice(0, 50);

const display = data.slice(0, Math.min(vc, data.length));

const top = data[0];

  // ALL data flattened for search
  const allEntries=useMemo(()=>{
    const out=[];
    MONTHS.forEach(m=>{
      getCombined("singles",m).forEach(e=>out.push({...e,type:"single",month:m}));
      getCombined("albums",m).forEach(e=>out.push({...e,type:"album",month:m}));
    });
    return out;
  },[]);
  const sRes=srch.length>1?[...new Map(allEntries.filter(e=>
    e.title.toLowerCase().includes(srch.toLowerCase())||e.artist.toLowerCase().includes(srch.toLowerCase())
  ).map(e=>[e.type+e.title+e.artist+e.month,e])).values()].slice(0,16):[];

  // Every credited artist receives the release's full chart contribution.
  const artistCutoffMonth = page === "analytics" ? anMonth : page === "artists" ? artistMonth : CURRENT_MONTH;
  const artists = buildCombinedArtists(ct, artistCutoffMonth);
  useEffect(() => {
    if (!artists.length) return;
    if (!artists.some((item) => item.n === cmpA1)) setCmpA1(artists[0].n);
    if (!artists.some((item) => item.n === cmpA2)) setCmpA2((artists[1] || artists[0]).n);
  }, [ct, artistCutoffMonth, artists, cmpA1, cmpA2]);
  const prepareDetailNavigation = () => {
    if (!detailOpenRef.current) {
      detailReturnScrollRef.current = window.scrollY || 0;
      window.history.pushState({ ...(window.history.state || {}), ngomaDetail: true }, "");
      detailOpenRef.current = true;
    }
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
  };
  const closeDetails = () => {
    if (window.history.state?.ngomaDetail) {
      window.history.back();
      return;
    }
    detailOpenRef.current = false;
    setSelA(null);
    setSelR(null);
    requestAnimationFrame(() => window.scrollTo({ top: detailReturnScrollRef.current, behavior: "auto" }));
  };
  const openArtistDetails = (name) => {
    const requestedName = String(name || "").trim();
    const allCurrentArtists = [...COMBINED_ARTISTS.singles, ...COMBINED_ARTISTS.albums];
    const resolvedName = allCurrentArtists.find((item) => item.n.toLowerCase() === requestedName.toLowerCase())?.n
      || artistCreditMembers({ artist: requestedName })[0]
      || requestedName;
    const singleProfile = buildCombinedArtists("singles", CURRENT_MONTH).find((item) => item.n === resolvedName);
    const albumProfile = buildCombinedArtists("albums", CURRENT_MONTH).find((item) => item.n === resolvedName);
    const profile = (isSingles ? singleProfile : albumProfile) || singleProfile || albumProfile;
    if (!profile) return;
    setCt(singleProfile === profile ? "singles" : "albums");
    setPlat("Combined");
    setSelR(null);
    setSelA(profile);
    prepareDetailNavigation();
  };
  const openReleaseDetails = (entry = {}, type = isSingles ? "single" : "album") => {
    const normalizedType = String(type || entry.type || "single").toLowerCase().includes("album") ? "album" : "single";
    const displayArtist = releaseArtist(entry);
    const primaryArtist = entry.primary_artist || entry.pa || artistCreditMembers({ artist: displayArtist })[0] || displayArtist;
    setCt(normalizedType === "album" ? "albums" : "singles");
    setPlat("Combined");
    setSelA(null);
    setSelR({
      ...entry,
      title: releaseTitle(entry),
      artist: displayArtist,
      primary_artist: primaryArtist,
      type: normalizedType,
    });
    prepareDetailNavigation();
  };
  const artistTrendFor=(artist={})=>{
    if(!artist.prevRank) return {symbol:"NEW",color:"#1565C0",label:"New",shortLabel:"New"};
    const delta=Number(artist.prevRank)-Number(artist.rank);
    if(delta>0) return {symbol:"↑",color:"#2DB04A",label:`Up ${delta}`,shortLabel:"Up"};
    if(delta<0) return {symbol:"↓",color:"#C0392B",label:`Down ${Math.abs(delta)}`,shortLabel:"Down"};
    return {symbol:"–",color:"#9AA19A",label:"No change",shortLabel:"No change"};
  };

  const chartTypeLabel = isSingles ? "Singles" : "Albums";
  const releaseLabel = isSingles ? "Songs" : "Albums";
  const releaseLabelLower = isSingles ? "songs" : "albums";
  const releaseSingularLower = isSingles ? "song" : "album";
  const platformKeysFor = (chartType = ct) => (chartType === "singles" ? S_PLATS : A_PLATS).filter((platform) => platform !== "Combined");
  const currentPlatformKeys = platformKeysFor(ct);
  const analyticsActive = page === "analytics";
  const recordsActive = page === "records";
  const recordsCoverageTargetFor = (chartType = ct) => (chartType === "albums" ? 2 : platformKeysFor(chartType).length);
  const currentRecordsCoverageTarget = recordsCoverageTargetFor(ct);

  const platformHitsFor = (chartType, targetMonth, title, artist) => {
    return platformKeysFor(chartType).filter((platform) =>
      getRawPlatformIndex(chartType, platform, targetMonth).has(entryKey({ title, artist }))
    );
  };

  const crossPlatformRows = analyticsActive ? getCombined(ct, anMonth)
    .map((entry) => {
      const hits = platformHitsFor(ct, anMonth, entry.title, entry.primary_artist || entry.artist);
      const fallbackCount = Number(String(entry.plat || "").split("/")[0]) || 0;
      const fallbackHits = hits.length ? hits : currentPlatformKeys.slice(0, fallbackCount);
      const count = fallbackHits.length || fallbackCount;
      return {
        ...entry,
        t: entry.title,
        a: entry.artist,
        plats: fallbackHits,
        count,
      };
    })
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count || Number(b.pts || 0) - Number(a.pts || 0)) : [];

  const coverageBucket = crossPlatformRows.reduce((acc, entry) => {
    acc[entry.count] = (acc[entry.count] || 0) + 1;
    return acc;
  }, {});

  const coverageData = Object.entries(coverageBucket)
    .map(([count, value]) => ({ name: `${count} platform${Number(count) === 1 ? "" : "s"}`, value, count: Number(count) }))
    .sort((a, b) => b.count - a.count);

  const platOnes = analyticsActive ? currentPlatformKeys
    .map((platform) => {
      const entry = rawPlatform(ct, platform, anMonth)[0];
      return entry ? [platform, { t: entry.t, a: formatArtistCredit(entry.a, entry.fa), primary_artist: entry.a, featured_artists: entry.fa || "", p: entry.p }] : null;
    })
    .filter(Boolean) : [];

  const platTotalsData = analyticsActive ? currentPlatformKeys
    .map((platform) => {
      const platformIndex = getRawPlatformIndex(ct, platform, anMonth);
      const entries = getCombined(ct, anMonth).filter((entry) => platformIndex.has(entryKey(entry))).length;
      return {
        platform: PLAT_LABEL[platform] || platform,
        entries,
        color: PC[platform] || "#888",
      };
    })
    .filter((entry) => entry.entries > 0) : [];

  const buildMovementData = (chartType, targetMonth) => {
    const currentIndex = monthIndex(targetMonth);
    const currentRows = getCombined(chartType, targetMonth);
    const previousMonth = currentIndex > 0 ? MONTHS[currentIndex - 1] : null;
    const previousRows = previousMonth ? getCombined(chartType, previousMonth) : [];

    const moves = currentRows
      .map((entry) => {
        const previous = previousRows.find((item) => entryKey(item) === entryKey(entry));
        if (!previous) return null;
        const from = Number(previous.rank);
        const to = Number(entry.rank);
        if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) return null;
        return { t: entry.title, a: entry.artist, from, to, delta: from - to };
      })
      .filter(Boolean);

    return {
      new: currentRows.filter((entry) => entry.is_new).length,
      ret: currentRows.filter((entry) => entry.reentry).length,
      debut: currentRows.filter((entry) => entry.is_new).length,
      risers: moves.filter((entry) => entry.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 5),
      fallers: moves.filter((entry) => entry.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 5),
    };
  };

  // Movement data for the current analytics month and selected chart type
  const mvData = analyticsActive
    ? buildMovementData(ct, anMonth)
    : { new: 0, ret: 0, debut: 0, risers: [], fallers: [] };

  const num = (value) => {
    const parsed = Number(String(value ?? 0).replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const trackedPeriodLabel = "across all tracked months";
  const monthCountLabel = `${MONTHS.length} ${MONTHS.length === 1 ? "month" : "months"}`;

  const releaseGroupsFor = (chartType) => {
    const groups = new Map();
    MONTHS.forEach((m) => {
      getCombined(chartType, m).forEach((entry) => {
        const key = entryKey(entry);
        if (!groups.has(key)) {
          groups.set(key, {
            key,
            title: entry.title,
            artist: entry.artist,
            totalPoints: 0,
            months: new Set(),
            numberOneMonths: new Set(),
            rows: [],
            fullCoverageMonths: new Set(),
          });
        }

        const group = groups.get(key);
        const points = num(entry.pts);
        const rank = num(entry.rank);
        const hits = platformHitsFor(chartType, m, entry.title, entry.primary_artist || entry.artist);
        const fallbackCount = num(entry.platform_count) || num(String(entry.plat || "").split("/")[0]);
        const platformCount = Math.max(hits.length, fallbackCount);

        group.totalPoints += points;
        group.months.add(m);
        group.rows.push({ ...entry, month: m, points, rank, platformCount });
        if (rank === 1) group.numberOneMonths.add(m);
        if (platformCount >= recordsCoverageTargetFor(chartType)) group.fullCoverageMonths.add(m);
      });
    });
    return [...groups.values()];
  };

  const biggestClimbFor = (chartType) => {
    let best = null;
    MONTHS.forEach((m, index) => {
      if (index === 0) return;
      const previousMonth = MONTHS[index - 1];
      const previousRows = getCombined(chartType, previousMonth);
      getCombined(chartType, m).forEach((entry) => {
        const previous = previousRows.find((item) => entryKey(item) === entryKey(entry));
        if (!previous) return;
        const from = num(previous.rank);
        const to = num(entry.rank);
        const delta = from - to;
        if (delta > 0 && (!best || delta > best.delta)) {
          best = { ...entry, from, to, delta, month: m };
        }
      });
    });
    return best;
  };

  const currentRecords = recordsActive ? (() => {
    const groups = releaseGroupsFor(ct);
    const highestPoints = [...groups]
      .sort((a, b) => b.totalPoints - a.totalPoints || a.title.localeCompare(b.title))[0];
    const biggestClimb = biggestClimbFor(ct);
    const mostNumberOnes = [...groups]
      .filter((group) => group.numberOneMonths.size > 0)
      .sort((a, b) => b.numberOneMonths.size - a.numberOneMonths.size || b.totalPoints - a.totalPoints)[0];
    const longestRun = [...groups]
      .sort((a, b) => b.months.size - a.months.size || b.totalPoints - a.totalPoints)[0];
    const fullCoverageCount = groups.filter((group) => group.fullCoverageMonths.size > 0).length;

    return [
      {
        label: "Most Months at #1",
        displayLabel: "Most Months at #1",
        value: mostNumberOnes?.title || "—",
        displaySub: mostNumberOnes
          ? `${mostNumberOnes.artist} · No. 1 for ${mostNumberOnes.numberOneMonths.size} ${mostNumberOnes.numberOneMonths.size === 1 ? "month" : "months"} ${trackedPeriodLabel}`
          : `No #1 ${releaseLabelLower} found`,
        certificationEntry: mostNumberOnes ? { title: mostNumberOnes.title, artist: mostNumberOnes.artist } : null,
      },
      {
        label: "Highest Points Score",
        displayLabel: "Highest Points Score",
        value: highestPoints?.title || "—",
        displaySub: highestPoints
          ? `${highestPoints.artist} · ${highestPoints.totalPoints.toLocaleString()} pts`
          : `No ${releaseLabelLower} found`,
        certificationEntry: highestPoints ? { title: highestPoints.title, artist: highestPoints.artist } : null,
      },
      {
        label: "Biggest Monthly Climb",
        displayLabel: "Biggest Monthly Climb",
        value: biggestClimb?.title || "—",
        displaySub: biggestClimb
          ? `${biggestClimb.artist} · #${biggestClimb.from} → #${biggestClimb.to}`
          : `No monthly climb found`,
        climbDelta: biggestClimb?.delta || null,
        certificationEntry: biggestClimb,
      },
      {
        label: "Perfect Coverage Club",
        displayLabel: "Perfect Coverage Club",
        value: `${fullCoverageCount} ${releaseLabelLower}`,
        displaySub: `${currentRecordsCoverageTarget}/${currentRecordsCoverageTarget} platform coverage`,
        isCoverage: true,
      },
      {
        label: "Chart Longevity",
        displayLabel: "Chart Longevity",
        value: longestRun?.title || "—",
        displaySub: longestRun
          ? `${longestRun.artist} · ${longestRun.months.size === MONTHS.length ? `Charted all ${monthCountLabel}` : `Charted ${longestRun.months.size} ${longestRun.months.size === 1 ? "month" : "months"}`}`
          : `No ${releaseLabelLower} found`,
        certificationEntry: longestRun ? { title: longestRun.title, artist: longestRun.artist } : null,
      },
      {
        label: `Total Charted ${releaseLabel}`,
        displayLabel: `Total Charted ${releaseLabel}`,
        value: groups.length,
        displaySub: `charted ${trackedPeriodLabel}`,
      },
    ];
  })() : [];

  const fullCoverageClub = useMemo(() => {
    if (!recordsActive) return [];
    const seen = new Map();
    MONTHS.forEach((m) => {
      getCombined(ct, m).forEach((entry) => {
        const hits = platformHitsFor(ct, m, entry.title, entry.primary_artist || entry.artist);
        const fallbackCount = num(entry.platform_count) || num(String(entry.plat || "").split("/")[0]);
        const count = Math.max(hits.length, fallbackCount);
        if (count >= currentRecordsCoverageTarget) {
          const key = entryKey(entry);
          if (!seen.has(key)) seen.set(key, { title: entry.title, artist: entry.artist, month: m, pts: entry.pts });
        }
      });
    });
    return [...seen.values()].sort((a, b) => num(b.pts) - num(a.pts));
  }, [ct, currentRecordsCoverageTarget, recordsActive]);

  const askAI=async()=>{
    if(!aiQ.trim())return;setAiL(true);setAiA("");
    const sCtx=MONTHS.map(m=>m+" Singles Top 10: "+getCombined("singles",m).slice(0,10).map(e=>"#"+e.rank+" "+e.title+" ("+e.artist+","+e.pts+"pts)").join(", ")).join(" | ");
    const aCtx=MONTHS.map(m=>m+" Albums Top 5: "+getCombined("albums",m).slice(0,5).map(e=>"#"+e.rank+" "+e.title+" ("+e.artist+","+e.pts+"pts)").join(", ")).join(" | ");
    const sys=`You are Ngoma Charts AI analyst for multi-platform Kenya music chart data (${DATA_PERIOD}). Real data: ${sCtx} ${aCtx}. Be concise, data-driven, and cite specific numbers.`;
    try{
      let text;
      if(API_BASE){
        // DEPLOYED: route through your backend, which holds the API key securely server-side.
        const r=await fetch(API_BASE+"/ai/analyst/",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question:aiQ,system:sys})});
        const d=await r.json();
        text=d.answer||d.error||"No response.";
      }else{
        // ARTIFACT PREVIEW: direct call (auth injected by the Claude environment only).
        const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1200,system:sys,messages:[{role:"user",content:aiQ}]})});
        const d=await r.json();
        text=d.content?.map(c=>c.text).join("")||"No response.";
      }
      setAiA(text);
    }catch{setAiA("Unable to connect. (If deployed, ensure the backend /ai/analyst/ endpoint and ANTHROPIC_API_KEY are configured.)");}
    setAiL(false);
  };

  const navTo=p=>{setPage(p);setSelA(null);setSelR(null);setSelNews(null);setMNav(false);};
  const navItems=["charts","trending","artists","analytics","records","year-end","certifications","news","about"];
  const navLabel=t=>t==="year-end"?"Year End":t;
  const card=(extra={})=>({background:"#FFF",borderRadius:"14px",border:"1px solid #EFEDE7",padding:isMobile?"18px":"22px",boxSizing:"border-box",maxWidth:"100%",boxShadow:"0 1px 3px rgba(0,0,0,0.02),0 8px 24px rgba(0,0,0,0.02)",...extra});
  const TXT = {
    kicker: isMobile ? "9px" : "10.5px",
    pageTitle: isMobile ? "24px" : "24px",
    lead: isMobile ? "12px" : "11px",
    section: isMobile ? "10.5px" : "10px",
    rowTitle: isMobile ? "15px" : "15px",
    rowMeta: isMobile ? "12px" : "12px",
    cardTitle: isMobile ? "15px" : "15px",
    cardMeta: isMobile ? "12px" : "12px",
    metric: isMobile ? "16px" : "16px",
    micro: "10px",
    note: isMobile ? "11px" : "11px",
    body: isMobile ? "13px" : "12px",
  };
  const secLbl=(c=GOLD)=>({fontFamily:F,fontSize:TXT.section,fontWeight:800,letterSpacing:isMobile?"2px":"2.4px",textTransform:"uppercase",color:c,marginBottom:"14px",display:"flex",alignItems:"center",gap:"7px",lineHeight:1.35});
  const SecMark=({c=GOLD})=><span style={{display:"inline-block",width:"14px",height:"2px",background:c,borderRadius:"1px"}}/>;


  const latestMonth = MONTHS[MONTHS.length - 1] || month;
  const latestMonthName = latestMonth.split(" ")[0] || "Latest";
  const latestMonthShort = latestMonthName.slice(0, 3);
  const latestTrendMonths = MONTHS.slice(-3);
  const trendMonthShort = (label = "") => String(label).split(" ")[0].slice(0, 3);
  const trendLabelText = latestTrendMonths.map(trendMonthShort).join(" / ");
  const currentTrending = isSingles ? COMBINED_TRENDING.singles : COMBINED_TRENDING.albums;
  const formulaLabel = "Movement compares each release's Combined chart rank with the previous month";
  const getTrendPoints = (trend = []) => {
    const rawValues = Array.isArray(trend)
      ? trend.map((value) => Number.isFinite(Number(value)) ? Number(value) : null)
      : [];
    const lastValues = rawValues.slice(-latestTrendMonths.length);

    while (lastValues.length < latestTrendMonths.length) lastValues.unshift(null);

    return latestTrendMonths.map((trendMonth, index) => ({
      month: trendMonth,
      label: trendMonthShort(trendMonth),
      rank: lastValues[index],
    }));
  };
  const uniqueByMomentumIdentity = (rows = []) => [
    ...new Map(
      rows.map((row, index) => [
        `${String(row.t || "").trim().toLowerCase()}|${String(row.a || "").trim().toLowerCase()}|${row.decRank ?? index}`,
        row,
      ])
    ).values(),
  ];
  const openMomentumRelease = (row) => openReleaseDetails(row, isSingles ? "single" : "album");
  const TrendBars = ({ trend = [], height = 58, compact = false }) => {
    const bars = getTrendPoints(trend);

    return (
      <div style={{display:"flex",alignItems:"flex-end",gap:compact?"3px":"6px",height,justifyContent:compact?"flex-end":"center"}}>
        {bars.map((bar, index) => (
          <div key={`${bar.month}-${index}`} title={`${bar.month}: ${bar.rank ? `#${bar.rank}` : "not charted"}`} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:compact?"2px":"4px"}}>
            <div
              style={{
                width:compact?"7px":"28px",
                height:bar.rank ? Math.max(compact?3:4, ((51 - bar.rank) / 50) * (compact ? 24 : 54)) + "px" : compact?"3px":"4px",
                background:bar.rank ? (index === bars.length - 1 ? "#2DB04A" : "#CDE8D2") : "#E7EAE7",
                borderRadius:compact?"1px":"3px",
                transition:"height 0.5s",
              }}
            />
            {!compact && <span style={{fontFamily:F,fontSize:"8px",color:"#7C8A80"}}>{bar.label}</span>}
          </div>
        ))}
      </div>
    );
  };

  const Tog=({sm})=>(
    <div
      style={{
        display:"flex",
        gap:sm?"5px":"6px",
        padding:sm?"3px":"4px",
        borderRadius:"999px",
        background:"#F2F2F2",
        border:"1px solid rgba(0,0,0,0.10)",
        boxSizing:"border-box",
        overflow:"hidden",
        maxWidth:"100%",
      }}
    >
      {["singles","albums"].map(t=><button
        key={t}
        onClick={()=>{setCt(t);setPlat("Combined");}}
        style={{
          padding:sm?"7px 14px":"8px 18px",
          background:ct===t?GOLD:"#FFF",
          border:"1px solid "+(ct===t?GOLD:"rgba(0,0,0,0.14)"),
          borderRadius:"999px",
          color:"#111",
          cursor:"pointer",
          fontSize:sm?"10px":"11px",
          fontWeight:900,
          letterSpacing:"1.5px",
          textTransform:"uppercase",
          fontFamily:F,
          lineHeight:1,
          boxShadow:ct===t?"0 2px 8px rgba(184,134,11,0.20)":"none",
          transition:"all .16s ease",
        }}
      >{t}</button>)}
    </div>
  );

  // === ANALYTICS COMPUTATIONS — all from full Top-50 data ===
  const analysisMonths = analyticsActive ? MONTHS.slice(0, Math.max(0, monthIndex(anMonth)) + 1) : MONTHS;
  const top10sData=analyticsActive?getCombined(ct,anMonth).slice(0,10).map(e=>({...e,name:e.title.length>16?e.title.slice(0,14)+"…":e.title,title:e.title,artist:e.artist,pts:e.pts})):[];
  const monthlyComp=analyticsActive?analysisMonths.map(m=>{
    const rows=getCombined(ct,m);
    return {
      month:m.split(" ")[0].slice(0,3),
      singles:getCombined("singles",m).length,
      albums:getCombined("albums",m).length,
      new:rows.filter(entry=>entry.is_new).length,
      debut:rows.filter(entry=>entry.is_new&&Number(entry.rank)<=10).length,
    };
  }):[];

  const topArtistsLine=analyticsActive?analysisMonths.map(m=>{
    const obj={month:m.split(" ")[0].slice(0,3)};
    artists.slice(0,6).forEach(a=>{
      obj[a.n]=a.mp[m]||0;
    });
    return obj;
  }):[];

  const cmp1=artists.find(x=>x.n===cmpA1)||{n:cmpA1,p:0,m:0,t:0,pk:"-",mp:{}};
  const cmp2=artists.find(x=>x.n===cmpA2)||{n:cmpA2,p:0,m:0,t:0,pk:"-",mp:{}};

  // === SONG / ALBUM COMPARISON ===
  const PLATS_FOR = currentPlatformKeys;
  // Unique titles for the current chart type, with their artist
  const allTitles=useMemo(()=>{
    if(!analyticsActive)return [];
    const map={};
    analysisMonths.forEach(m=>getCombined(ct,m).forEach(e=>{const k=e.title+" — "+e.artist;if(!map[k])map[k]={key:k,title:e.title,artist:e.artist,primary_artist:e.primary_artist||e.artist};}));
    return Object.values(map).sort((a,b)=>a.title.localeCompare(b.title));
  },[analyticsActive,ct,anMonth]);
  // Build a full profile for a song key
  const songProfile=(key)=>{
    const meta=allTitles.find(t=>t.key===key);
    if(!meta)return null;
    const {title,artist,primary_artist}=meta;
    const prof={title,artist,primary_artist,monthly:{},platforms:{},totalPts:0,peak:999,months:0,debutMonth:null,bestCov:0,avgRank:0};
    let rankSum=0,rankCount=0;
    analysisMonths.forEach(m=>{
      const e=getCombined(ct,m).find(x=>sameRelease(x,{title,primary_artist}));
      if(e){
        prof.monthly[m]={rank:e.rank,pts:e.pts,cov:e.plat};
        prof.totalPts+=e.pts; prof.months+=1;
        if(e.rank<prof.peak)prof.peak=e.rank;
        if(!prof.debutMonth)prof.debutMonth=m;
        const covNum=parseInt((e.plat||"0/0").split("/")[0],10)||0;
        if(covNum>prof.bestCov)prof.bestCov=covNum;
        rankSum+=e.rank; rankCount+=1;
      }
    });
    prof.avgRank=rankCount?Math.round(rankSum/rankCount):0;
    const releaseKey=entryKey({title,primary_artist});
    PLATS_FOR.forEach(pl=>{
      let best=null;
      analysisMonths.forEach(m=>{const pe=getRawPlatformIndex(ct,pl,m).get(releaseKey);if(pe&&(best===null||pe.r<best))best=pe.r;});
      if(best!==null)prof.platforms[pl]=best;
    });
    prof.platformCount=Object.keys(prof.platforms).length;
    // weeks-equivalent: number of (platform×month) chart appearances
    let appearances=0;
    PLATS_FOR.forEach(pl=>analysisMonths.forEach(m=>{if(getRawPlatformIndex(ct,pl,m).has(releaseKey))appearances+=1;}));
    prof.appearances=appearances;
    // #1 count on combined
    prof.numberOnes=Object.values(prof.monthly).filter(x=>x.rank===1).length;
    return prof;
  };
  // Default song selections to the current month's #1 and #2
  useEffect(()=>{
    if(!analyticsActive)return;
    const cd=getCombined(ct,anMonth);
    if(cd[0])setCmpS1(cd[0].title+" — "+cd[0].artist);
    if(cd[1])setCmpS2(cd[1].title+" — "+cd[1].artist);
  },[analyticsActive,ct,anMonth]);
  const [sp1,sp2]=useMemo(()=>{
    if(!analyticsActive)return [null,null];
    return [
      songProfile(cmpS1)||songProfile(allTitles[0]?.key),
      songProfile(cmpS2)||songProfile(allTitles[1]?.key),
    ];
  },[analyticsActive,ct,cmpS1,cmpS2,allTitles]);
  const songMonthlyData=analyticsActive?analysisMonths.map(m=>({month:m.split(" ")[0].slice(0,3),A:sp1?.monthly[m]?.pts||0,B:sp2?.monthly[m]?.pts||0})):[];
  const songRankData=analyticsActive?analysisMonths.map(m=>({month:m.split(" ")[0].slice(0,3),A:sp1?.monthly[m]?.rank||null,B:sp2?.monthly[m]?.rank||null})):[];

  const yearEnd=isSingles?COMBINED_YEAR_END.singles:COMBINED_YEAR_END.albums;

  const tracked=getCombined(ct,analyticsActive?anMonth:CURRENT_MONTH).slice(0,5).map(entry=>entry.title);

  const certs=buildCertifications(yearEnd);
  const certIcons=CERTIFICATION_LEVELS.reduce((acc, item) => {
    acc[item.level] = item.icon;
    return acc;
  }, {});
  const certColors=CERTIFICATION_LEVELS.reduce((acc, item) => {
    acc[item.level] = item.color;
    return acc;
  }, {});
  const certificationLookup = useMemo(() => {
    const buildLookup = (items = []) => {
      const map = new Map();
      items.forEach((item) => {
        const level = getCertificationLevel(item.totalPts);
        const meta = certificationMetaForLevel(level);
        if (!meta) return;
        map.set(certificationKey(item.t, item.a), {
          ...meta,
          totalPts: Number(item.totalPts) || 0,
        });
      });
      return map;
    };

    return {
      singles: buildLookup(COMBINED_YEAR_END.singles),
      albums: buildLookup(COMBINED_YEAR_END.albums),
    };
  }, []);
  const getCertificationForEntry = (entry = {}, fallbackType) => {
    const type = String(fallbackType || entry.type || (isSingles ? "single" : "album")).toLowerCase();
    const bucket = type.includes("album") ? "albums" : "singles";
    const title = releaseTitle(entry);
    const artist = releaseArtist(entry);

    const explicitLevel = String(
      entry.certification_level ||
      entry.certificationLevel ||
      entry.certification ||
      entry.cert_level ||
      ""
    )
      .trim()
      .toLowerCase()
      .replace(/\s+certified$/, "");

    const explicitMeta = certificationMetaForLevel(explicitLevel);
    const totalPts = firstFiniteNumber(
      entry.totalPts,
      entry.total_points,
      entry.totalPoints,
      entry.cumulative_points,
      entry.certification_points,
      entry.certificationPoints
    );

    const fromLookup = certificationLookup[bucket]?.get(certificationKey(title, artist));
    if (fromLookup) return fromLookup;

    if (explicitMeta) {
      return { ...explicitMeta, totalPts: totalPts || 0 };
    }

    const levelFromPoints = getCertificationLevel(totalPts);
    const metaFromPoints = certificationMetaForLevel(levelFromPoints);
    return metaFromPoints ? { ...metaFromPoints, totalPts: totalPts || 0 } : null;
  };
  const allCertifiedReleases = useMemo(() => {
    const build = (items = [], type) => buildCertifications(items).map((item) => {
      const meta = certificationMetaForLevel(item.level);
      return meta ? { ...item, ...meta, type } : null;
    }).filter(Boolean);

    return [
      ...build(COMBINED_YEAR_END.singles, "single"),
      ...build(COMBINED_YEAR_END.albums, "album"),
    ].sort((a, b) => b.totalPts - a.totalPts || b.pts - a.pts);
  }, []);

  const getCertificationsForNews = (news = {}, limit = 3) => {
    const text = `${news.title || ""} ${news.excerpt || ""} ${news.body || ""}`.toLowerCase();
    if (!text.trim()) return [];

    const seen = new Set();
    return allCertifiedReleases.filter((cert) => {
      const key = certificationKey(cert.t, cert.a);
      if (seen.has(key)) return false;
      const title = String(cert.t || "").toLowerCase();
      const artist = String(cert.a || "").toLowerCase();
      const matches = title && text.includes(title) || (artist && title && text.includes(artist) && text.includes(title));
      if (matches) seen.add(key);
      return matches;
    }).slice(0, limit);
  };

  const CertificationTag = ({ cert, compact = true, style = {} }) => {
    if (!cert) return null;
    const certificationLabel = `${cert.label} certified · ${Number(cert.totalPts || 0).toLocaleString()} points`;
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "fit-content",
          maxWidth: "100%",
          minWidth: compact ? "24px" : "30px",
          minHeight: compact ? "24px" : "30px",
          padding: compact ? "2px 5px" : "4px 6px",
          borderRadius: "999px",
          background: `${cert.color}14`,
          border: `1px solid ${cert.color}40`,
          color: cert.color,
          fontFamily: F,
          fontSize: compact ? "13px" : "17px",
          lineHeight: 1.1,
          whiteSpace: "nowrap",
          verticalAlign: "middle",
          ...style,
        }}
        title={certificationLabel}
        aria-label={certificationLabel}
      >
        <span aria-hidden="true">{cert.icon}</span>
      </span>
    );
  };

  // Hall of Fame: #1 each month for both singles and albums
  const hof=MONTHS.flatMap(m=>{
    const s=getCombined("singles",m)[0];
    const a=getCombined("albums",m)[0];
    return [s?{...s,month:m,type:"single"}:null,a?{...a,month:m,type:"album"}:null];
  }).filter(Boolean);

  const releaseJourney=r=>{
    if(!r)return [];
    return MONTHS.map(m=>{
      const sc=getCombined(ct,m).find(e=>sameRelease(e,r));
      const platforms=isSingles?["APPLE MUSIC","AUDIOMACK","BOOMPLAY","SPOTIFY","YOUTUBE","SHAZAM"]:["APPLE MUSIC","AUDIOMACK"];
      const entries=platforms.map(pl=>{const d=getPlatform(ct,pl,m).find(e=>sameRelease(e,r));return d?{platform:PLAT_LABEL[pl]||pl,rank:d.rank,pts:d.pts}:null;}).filter(Boolean);
      return {month:m,combined:sc||null,platforms:entries};
    });
  };

  const allArtistNames=[...new Set(artists.map(a=>a.n))].sort();
  const selectedArtistEntries = selA ? MONTHS.flatMap((monthLabel) =>
    getCombined(ct, monthLabel)
      .filter((entry) => artistCreditMembers(entry).some((name) => name.toLowerCase() === selA.n.toLowerCase()))
      .map((entry) => ({...entry, month: monthLabel}))
  ) : [];
  const selectedArtistReleases = selA ? [...new Map(selectedArtistEntries.map((entry) => [entryKey(entry), entry])).values()] : [];
  const selectedArtistRankData = selA ? MONTHS.map((monthLabel) => ({
    month: monthLabel.split(" ")[0].slice(0, 3),
    rank: selA.rh?.[monthLabel] || null,
    points: selA.mp?.[monthLabel] || 0,
  })) : [];

  return(
    <div style={{fontFamily:SF,background:"linear-gradient(180deg,#FBFAF7 0%,#F7F5F0 100%)",color:"#1A1A1A",minHeight:"100vh",width:"100%",overflowX:"hidden"}}>
      <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;600;700;800;900&family=Instrument+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
      <style>{`
        html, body, #root{max-width:100%;overflow-x:hidden;}
        *, *::before, *::after{box-sizing:border-box;}
        img, svg, canvas, video{max-width:100%;}
        button, input, select, textarea{max-width:100%;}
        footer button:not([data-keep-share-card="true"]){display:none !important;}
        footer .share-card-button, footer [data-share-card]:not([data-keep-share-card="true"]), footer [aria-label*="Share"]{display:none !important;}
        button[data-stray-share-hidden="true"]{display:none !important;visibility:hidden !important;pointer-events:none !important;}
        .ngoma-mobile-text-safe{min-width:0;overflow-wrap:anywhere;}
        .ngoma-analytics-chart-scroll{max-width:100%;overflow-x:auto;overflow-y:hidden;padding-bottom:4px;}
        .ngoma-analytics-chart-inner{min-width:0;}
        .ngoma-analytics-metric-label{color:#59645D !important;}
        .ngoma-analytics-muted{color:#59645D !important;}
        .ngoma-analytics-page > *{content-visibility:auto;contain-intrinsic-size:auto 320px;}
        .ngoma-mobile-collapsible{margin:0 0 20px;}
        .ngoma-mobile-collapsible > summary{display:none;}
        @media (max-width: 860px){
          .anl-2col{grid-template-columns:1fr !important;}
        }
        @media (max-width: 640px){
          .anl-grid-2{grid-template-columns:1fr !important;}
          .anl-2col{grid-template-columns:1fr !important;}
          .anl-grid-3{grid-template-columns:1fr !important;}
          .anl-grid-4{grid-template-columns:1fr 1fr !important;}
          .podium-grid{grid-template-columns:1fr !important;}
          .race-card{min-width:100% !important;}
          .ngoma-artist-row{grid-template-columns:34px 34px minmax(0,1fr) 82px !important;gap:9px !important;padding:13px 8px !important;}
          .ngoma-artist-pts-label{display:none !important;}
          .ngoma-mobile-center-frame{padding-left:clamp(20px,5vw,28px) !important;padding-right:clamp(20px,5vw,28px) !important;}
          .ngoma-analytics-chart-scroll{margin-left:-2px;margin-right:-2px;padding-bottom:8px;}
          .ngoma-analytics-chart-inner{min-width:520px;}
          .ngoma-analytics-wide-chart{min-width:620px;}
          .ngoma-mobile-collapsible{background:#FFF;border:1px solid #EFEDE7;border-radius:14px;box-shadow:0 1px 3px rgba(0,0,0,0.02),0 8px 24px rgba(0,0,0,0.02);overflow:hidden;}
          .ngoma-mobile-collapsible > summary{display:flex;align-items:center;justify-content:space-between;gap:12px;list-style:none;padding:15px 16px;font-family:"Instrument Sans",Helvetica,sans-serif;font-size:10.5px;font-weight:850;letter-spacing:1.8px;text-transform:uppercase;color:#59645D;cursor:pointer;}
          .ngoma-mobile-collapsible > summary::-webkit-details-marker{display:none;}
          .ngoma-mobile-collapsible > summary span{font-size:10px;letter-spacing:0.8px;color:#B8860B;text-transform:none;}
          .ngoma-mobile-collapsible[open] > summary{border-bottom:1px solid #F2F0EA;}
          .ngoma-mobile-collapsible[open] > summary span{font-size:0;}
          .ngoma-mobile-collapsible[open] > summary span::after{content:"Hide";font-size:10px;color:#B8860B;}
          .ngoma-mobile-collapsible-body > div{border:none !important;box-shadow:none !important;margin-bottom:0 !important;border-radius:0 !important;}
        }
        ::-webkit-scrollbar{height:5px;width:5px;}
        ::-webkit-scrollbar-thumb{background:#D8D2C4;border-radius:3px;}
        * { -webkit-tap-highlight-color: transparent; }
        .ngoma-title-link:hover{ text-decoration: underline; text-underline-offset: 2px; }
        .ngoma-artist-link:hover{ color:#B8860B !important; text-decoration: underline; text-underline-offset: 2px; }
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:none;}}
      `}</style>

      {/* HEADER */}
      <header style={{background:"#FFF",borderBottom:"3px solid #1A1A1A",position:"sticky",top:0,zIndex:50}}>
        <div style={{background:"#1A1A1A",color:"#FFF"}}>
          <div style={{...pageFrame({display:"flex",justifyContent:"flex-end",alignItems:"center",gap:"10px",padding:isMobile?"6px 16px":"5px 28px"}),fontFamily:F,fontSize:isMobile?"8px":"9.5px",letterSpacing:isMobile?"1px":"2px",textTransform:"uppercase"}}>
            <span style={{color:"rgba(255,255,255,0.68)",fontSize:isMobile?"8px":"9.5px",letterSpacing:isMobile?"0.5px":"1px",fontFamily:"inherit",whiteSpace:"nowrap"}}>
              {new Date().toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short",year:"numeric"})}
            </span>
          </div>
        </div>
        <div style={{...pageFrame({display:"flex",justifyContent:"space-between",alignItems:"center",padding:isMobile?"14px 16px":"18px 28px 22px"}),columnGap:isMobile?"16px":"60px",rowGap:"16px",flexWrap:"wrap"}}>
          <div onClick={()=>navTo("charts")} style={{display:"flex",alignItems:"center",gap:"14px",cursor:"pointer"}}>
            <svg width={isMobile?"24":"32"} height={isMobile?"26":"34"} viewBox="0 0 22 24" style={{flexShrink:0}}>
              <rect x="0" y="15" width="3.5" height="9" fill="#1A1A1A" rx="0.5"/>
              <rect x="5.5" y="10" width="3.5" height="14" fill="#1A1A1A" rx="0.5"/>
              <rect x="11" y="5" width="3.5" height="19" fill="#B8860B" rx="0.5"/>
              <rect x="16.5" y="0" width="3.5" height="24" fill="#1A1A1A" rx="0.5"/>
            </svg>
            <div style={{display:"flex",flexDirection:"column",lineHeight:1,cursor:"pointer"}}>
              <span
                style={{
                  fontFamily:F,
                  fontSize:isMobile?"20px":"28px",
                  fontWeight:950,
                  letterSpacing:isMobile?"2px":"4px",
                  color:"#1A1A1A",
                  textTransform:"uppercase",
                }}
              >
                NGOMA <span style={{color:"#B8860B",fontWeight:950}}>CHARTS</span>
              </span>
              <span
                style={{
                  marginTop:"4px",
                  fontFamily:F,
                  fontSize:isMobile?"9.5px":"13px",
                  fontWeight:900,
                  letterSpacing:isMobile?"1.4px":"2.2px",
                  color:"#777777",
                  textTransform:"uppercase",
                  whiteSpace:"nowrap",
                }}
              >
                Music ranking intelligence
              </span>
            </div>
          </div>
          {isMobile ? (
            <>
              <button
                onClick={()=>setMNav(o=>!o)}
                aria-label="Toggle menu"
                aria-expanded={mNav}
                style={{marginLeft:"auto",display:"flex",flexDirection:"column",justifyContent:"center",gap:"4px",width:"42px",height:"38px",border:"1px solid #E5E0D4",borderRadius:"11px",background:"#FFF",cursor:"pointer",padding:"0 10px",flexShrink:0}}
              >
                <span style={{display:"block",height:"2px",background:"#1A1A1A",borderRadius:"2px",transition:"all .2s",transform:mNav?"translateY(6px) rotate(45deg)":"none"}}/>
                <span style={{display:"block",height:"2px",background:"#1A1A1A",borderRadius:"2px",opacity:mNav?0:1,transition:"opacity .2s"}}/>
                <span style={{display:"block",height:"2px",background:"#1A1A1A",borderRadius:"2px",transition:"all .2s",transform:mNav?"translateY(-6px) rotate(-45deg)":"none"}}/>
              </button>
              {mNav&&(
                <div style={{width:"100%",display:"flex",flexDirection:"column",gap:"2px",marginTop:"8px",borderTop:"1px solid #EEE",paddingTop:"10px"}}>
                  {navItems.map(t=>(
                    <span key={t} onClick={()=>navTo(t)} style={{cursor:"pointer",padding:"13px 14px",borderRadius:"12px",fontFamily:F,fontSize:"13px",fontWeight:page===t?800:600,letterSpacing:"1px",textTransform:"uppercase",color:page===t?"#1A1A1A":"#555",background:page===t?"#F1E3BF":"transparent",border:page===t?"1px solid #D4B65E":"1px solid transparent"}}>{navLabel(t)}</span>
                  ))}
                  <span onClick={()=>{setMNav(false);setSOpen(true);}} style={{cursor:"pointer",padding:"13px 14px",borderRadius:"12px",fontFamily:F,fontSize:"13px",fontWeight:600,letterSpacing:"1px",textTransform:"uppercase",color:"#555"}}>Search</span>
                </div>
              )}
            </>
          ) : (
            <nav style={{display:"flex",gap:"22px",fontFamily:F,fontSize:isMobile?"12px":"11px",fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",alignItems:"center",flexShrink:0}}>
              {navItems.map(t=>(
                <span key={t} onClick={()=>navTo(t)} style={{color:page===t?"#1A1A1A":"#6B6B6B",cursor:"pointer",whiteSpace:"nowrap",padding:"6px 12px",borderRadius:"20px",background:page===t?"#F1E3BF":"transparent",fontWeight:page===t?800:700,transition:"all 0.15s",border:page===t?"1px solid #D4B65E":"1px solid transparent"}}
                  onMouseEnter={e=>{if(page!==t)e.currentTarget.style.color="#1A1A1A";}} onMouseLeave={e=>{if(page!==t)e.currentTarget.style.color="#6B6B6B";}}>{navLabel(t)}</span>
              ))}
              <span
                onClick={()=>setSOpen(true)}
                style={{
                  cursor:"pointer",
                  color:"#6B6B6B",
                  whiteSpace:"nowrap",
                  padding:"6px 12px",
                  borderRadius:"20px",
                  fontFamily:F,
                  fontSize:"11px",
                  fontWeight:700,
                  letterSpacing:"1.5px",
                  textTransform:"uppercase",
                  border:"1px solid transparent",
                }}
                onMouseEnter={e=>{e.currentTarget.style.color="#1A1A1A";e.currentTarget.style.background="#FAF5EA";}}
                onMouseLeave={e=>{e.currentTarget.style.color="#6B6B6B";e.currentTarget.style.background="transparent";}}
              >Search</span>
            </nav>
          )}
        </div>
      </header>

      {/* SHARE IMAGE PREVIEW */}
      {/* SEARCH */}
      {sOpen&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:100,display:"flex",justifyContent:"center",paddingTop:"70px"}} onClick={()=>{setSOpen(false);setSrch("");}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#FFF",borderRadius:"12px",width:isMobile?"calc(100vw - 32px)":"560px",maxWidth:"100%",maxHeight:"560px",overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,0.25)",boxSizing:"border-box"}}>
            <div style={{padding:"16px 20px",borderBottom:"1px solid #EEE",display:"flex",alignItems:"center",gap:"10px"}}>
              <span style={{fontSize:"18px",color:"#CCC"}}>⌕</span>
              <input value={srch} onChange={e=>setSrch(e.target.value)} placeholder="Search across all songs, albums, artists..." autoFocus style={{flex:1,border:"none",outline:"none",fontSize:"16px",fontFamily:SF}}/>
              <span onClick={()=>{setSOpen(false);setSrch("");}} style={{cursor:"pointer",color:"#CCC"}}>✕</span>
            </div>
            <div style={{maxHeight:"480px",overflow:"auto"}}>
              {sRes.map((e,i)=>(
                <div key={i} style={{padding:"11px 20px",borderBottom:"1px solid #F5F5F3",display:"flex",justifyContent:"space-between",alignItems:"center"}}
                  onMouseEnter={x=>x.currentTarget.style.background="#FAFAF6"} onMouseLeave={x=>x.currentTarget.style.background="transparent"}>
                  <div><button type="button" onClick={()=>{setSOpen(false);setSrch("");setPage("charts");setMonth(e.month);openReleaseDetails(e,e.type);}} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:"14px",fontWeight:700,cursor:"pointer",textAlign:"left"}}>{e.title}</button><div style={{fontSize:"10.5px",color:"#999",fontFamily:F}}>{e.artist} · <span style={{color:GOLD}}>{e.type} · {e.month}</span></div></div>
                  <div style={{fontFamily:F,fontSize:"10.5px",color:GOLD,fontWeight:600}}>#{e.rank} · {e.pts.toLocaleString()} pts</div>
                </div>
              ))}
              {srch.length>1&&!sRes.length&&<div style={{padding:"24px",textAlign:"center",color:"#CCC",fontFamily:F}}>No results across all months</div>}
              {srch.length<=1&&<div style={{padding:"24px",textAlign:"center",color:"#DDD",fontFamily:F,fontSize:"13px"}}>Type to search across all 50+ entries from each platform</div>}
            </div>
          </div>
        </div>
      )}

      <main style={pageFrame({padding:isMobile?"0 4px":0,overflow:"hidden"})}>
      {/* RELEASE DETAIL */}
      {selR&&(()=>{
        const selectedCertification = getCertificationForEntry(selR, selR.type || (isSingles ? "single" : "album"));
        const journey = releaseJourney(selR);
        const combinedHistory = journey.filter((item) => item.combined);
        const platformNames = new Set(journey.flatMap((item) => item.platforms.map((entry) => entry.platform)));
        const totalPoints = combinedHistory.reduce((sum, item) => sum + Number(item.combined?.pts || 0), 0);
        const peakRank = combinedHistory.reduce((best, item) => Math.min(best, Number(item.combined?.rank || 999)), 999);
        const currentCombined = combinedHistory[combinedHistory.length - 1];
        const averageRank = combinedHistory.length ? Math.round(combinedHistory.reduce((sum, item) => sum + Number(item.combined.rank || 0), 0) / combinedHistory.length) : null;
        const numberOneMonths = combinedHistory.filter((item) => Number(item.combined.rank) === 1).length;
        const bestCoverage = combinedHistory.reduce((best, item) => Math.max(best, Number(String(item.combined.plat || "0").split("/")[0]) || 0), 0);
        const releaseRankData = combinedHistory.map((item) => ({month:item.month.split(" ")[0].slice(0,3),rank:Number(item.combined.rank),points:Number(item.combined.pts)||0}));
        const platformPeaks = [...platformNames].map((platformName) => ({
          platform: platformName,
          rank: journey.reduce((best, item) => {
            const platformEntry = item.platforms.find((entry) => entry.platform === platformName);
            return platformEntry ? Math.min(best, Number(platformEntry.rank)) : best;
          }, 999),
        })).sort((a,b)=>a.rank-b.rank);
        const releaseMetadata = combinedHistory.find((item) => item.combined?.release_year || item.combined?.confidence)?.combined || {};
        const releaseConfidence = selR.confidence || releaseMetadata.confidence;
        return (
        <div style={{padding:PAD,background:"#FFF",minHeight:"60vh",boxSizing:"border-box",overflow:"hidden"}}>
          <span onClick={closeDetails} style={{fontFamily:F,fontSize:isMobile?"12px":"11px",color:GOLD,cursor:"pointer",letterSpacing:"1px",textTransform:"uppercase",fontWeight:600}}>← Back</span>
          <div style={{marginTop:"20px"}}>
            <div style={{fontFamily:F,fontSize:"10px",letterSpacing:"2px",textTransform:"uppercase",color:GOLD,marginBottom:"6px"}}>{selR.type||"single"}</div>
            <h1 style={{fontSize:isMobile?"24px":"30px",fontWeight:850,margin:"0 0 4px",lineHeight:1.12}}>{selR.title}</h1>
            {selectedCertification&&<CertificationTag cert={selectedCertification} compact={false} style={{margin:"2px 0 10px"}} />}
            <div style={{display:"flex",alignItems:"center",gap:"9px",flexWrap:"wrap",margin:"0 0 16px"}}>
              <button type="button" onClick={()=>openArtistDetails(selR.primary_artist||selR.artist)} style={{fontSize:isMobile?"15px":"18px",color:"#4E5851",margin:0,padding:0,border:0,background:"transparent",fontFamily:F,cursor:"pointer",fontWeight:800}}>{selR.artist}</button>
              <CountryBadge artist={selR.primary_artist||selR.artist} showName />
            </div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,minmax(0,1fr))":"repeat(4,minmax(0,1fr))",gap:"10px",marginBottom:"18px"}}>
              {[
                {label:"Total Points",value:totalPoints.toLocaleString()},
                {label:"Peak Rank",value:peakRank<999?`#${peakRank}`:"—"},
                {label:"Current Rank",value:currentCombined?`#${currentCombined.combined.rank}`:"—"},
                {label:"Average Rank",value:averageRank?`#${averageRank}`:"—"},
                {label:"Months Charted",value:combinedHistory.length},
                {label:"#1 Months",value:numberOneMonths},
                {label:"Platforms",value:platformNames.size},
                {label:"Best Coverage",value:`${bestCoverage}/${isSingles?6:2}`},
                {label:"Release Year",value:selR.release_year||releaseMetadata.release_year||"—"},
              ].map((stat)=><div key={stat.label} style={{padding:"12px 13px",border:"1px solid #ECE9E1",borderRadius:"10px",background:"#FAFAF8"}}><div style={{fontFamily:F,fontSize:"9px",fontWeight:900,letterSpacing:"1.2px",textTransform:"uppercase",color:"#7B857D"}}>{stat.label}</div><div style={{fontFamily:F,fontSize:"19px",fontWeight:900,color:"#1A1A1A",marginTop:"5px"}}>{stat.value}</div></div>)}
            </div>
            {releaseConfidence&&<div style={{fontFamily:F,fontSize:"11px",color:"#68716B",margin:"-6px 0 18px"}}>Metadata confidence: <strong>{releaseConfidence}</strong></div>}
            <div className="anl-grid-2" style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1.4fr 0.8fr",gap:"14px",marginBottom:"20px"}}>
              <div style={card()}>
                <div style={secLbl()}><SecMark/>Combined Rank & Points Journey</div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={releaseRankData} margin={{top:10,right:18,left:0,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC"/>
                    <XAxis dataKey="month" tick={{fontSize:10,fontFamily:F,fill:"#59645D"}}/>
                    <YAxis yAxisId="rank" reversed domain={[1,50]} tick={{fontSize:10,fontFamily:F,fill:"#59645D"}} tickFormatter={v=>`#${v}`}/>
                    <YAxis yAxisId="points" orientation="right" domain={[0,50]} hide/>
                    <Tooltip formatter={(value,name)=>[name==="rank"?`#${value}`:value,name==="rank"?"Rank":"Points"]} contentStyle={{fontFamily:F,fontSize:11}}/>
                    <Line yAxisId="rank" type="monotone" dataKey="rank" stroke={GOLD} strokeWidth={3} dot={{r:4}}/>
                    <Line yAxisId="points" type="monotone" dataKey="points" stroke="#1565C0" strokeWidth={2} strokeDasharray="5 4" dot={{r:3}}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={card()}>
                <div style={secLbl()}><SecMark/>Platform Peak Ranks</div>
                {platformPeaks.map((item)=><div key={item.platform} style={{display:"flex",justifyContent:"space-between",gap:"12px",padding:"8px 0",borderBottom:"1px solid #F0F0EC",fontFamily:F,fontSize:"12px"}}><span style={{color:PC[item.platform]||"#59645D",fontWeight:800}}>{item.platform}</span><strong>#{item.rank}</strong></div>)}
              </div>
            </div>
            <h3 style={secLbl()}><SecMark/>Cross-Platform Journey</h3>
            {journey.map(({month:m,combined,platforms})=>(
              <div key={m} style={{marginBottom:"14px",padding:"16px",background:"#FAFAF8",borderRadius:"8px",border:"1px solid #EAEAE6"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
                  <span style={{fontWeight:700,fontFamily:SF}}>{m}</span>
                  {combined?<span style={{fontFamily:F,fontSize:"13px",fontWeight:700,color:GOLD}}>#{combined.rank} Combined · {combined.pts.toLocaleString()} pts · {combined.plat} platforms</span>:<span style={{fontFamily:F,fontSize:"12px",color:"#CCC"}}>Not on combined chart</span>}
                </div>
                <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                  {platforms.map(p=>(
                    <span key={p.platform} style={{padding:"4px 10px",background:(PC[p.platform]||"#888")+"14",borderRadius:"12px",fontSize:"10px",fontFamily:F,fontWeight:600,color:PC[p.platform]||"#888",borderLeft:"2px solid "+(PC[p.platform]||"#888")}}>
                      {p.platform} #{p.rank}
                    </span>
                  ))}
                  {platforms.length===0&&<span style={{fontFamily:F,fontSize:isMobile?"12px":"11px",color:"#CCC"}}>Not in tracked Top 50 this month</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
        );
      })()}

      {/* ARTIST PROFILE */}
      {selA&&!selR&&(
        <div style={{padding:PAD,background:"#FFF",minHeight:"60vh",boxSizing:"border-box",overflow:"hidden"}}>
          <span onClick={closeDetails} style={{fontFamily:F,fontSize:isMobile?"12px":"11px",color:GOLD,cursor:"pointer",letterSpacing:"1px",textTransform:"uppercase",fontWeight:600}}>← Back</span>
          <div style={{marginTop:"20px",display:"flex",gap:"20px",alignItems:isMobile?"stretch":"flex-start",flexDirection:isMobile?"column":"row",minWidth:0}}>
            <div style={{width:"80px",height:"80px",borderRadius:"50%",background:"linear-gradient(135deg,#FAF5EA,#EDE0C0)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"32px",fontWeight:900,color:GOLD,flexShrink:0,border:"2px solid "+GOLD+"22",boxShadow:"0 4px 16px rgba(184,134,11,0.12)"}}>{selA.n[0]}</div>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap"}}>
                <h2 style={{margin:0,fontSize:isMobile?"24px":"26px",fontWeight:850,lineHeight:1.12}}>{selA.n}</h2>
                <CountryBadge artist={selA.n} showName />
              </div>
              <div style={{fontFamily:F,fontSize:TXT.lead,color:"#69716B",marginTop:"6px",lineHeight:1.45}}>Credited on {selA.t} {isSingles?"songs":"albums"} across {selA.m} months</div>
              <div style={{display:"flex",gap:"24px",marginTop:"14px",fontFamily:F,flexWrap:"wrap"}}>
                {[{v:"#"+selA.rank,l:"Current Rank",c:GOLD},{v:"#"+selA.pk,l:"Best Artist Rank"},{v:selA.p.toLocaleString(),l:"Total Points"},{v:selA.t,l:"Entries"},{v:selA.m,l:"Months Active"}].map((s,i)=>(
                  <div key={i}><div style={{fontSize:"22px",fontWeight:700,color:s.c||"#1A1A1A"}}>{s.v}</div><div style={{fontSize:"9px",letterSpacing:"1.5px",color:"#CCC",textTransform:"uppercase"}}>{s.l}</div></div>
                ))}
              </div>
            </div>
          </div>
          <div className="anl-grid-2" style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:"14px",marginTop:"24px",marginBottom:"20px"}}>
            <div style={card()}>
              <div style={secLbl()}><SecMark/>Monthly Credited Points</div>
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={selectedArtistRankData}>
                  <XAxis dataKey="month" tick={{fontSize:10.5,fontFamily:F,fill:"#59645D",fontWeight:650}} tickLine={false}/>
                  <YAxis tick={{fontSize:10,fontFamily:F,fill:"#59645D",fontWeight:650}} axisLine={false} tickLine={false}/>
                  <Tooltip formatter={v=>[v.toLocaleString()+" pts","Points"]} contentStyle={{fontFamily:F,fontSize:11}}/>
                  <Bar dataKey="points" fill={GOLD} radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={card()}>
              <div style={secLbl()}><SecMark/>Cumulative Artist Rank</div>
              <ResponsiveContainer width="100%" height={190}>
                <LineChart data={selectedArtistRankData} margin={{top:8,right:12,left:0,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC"/>
                  <XAxis dataKey="month" tick={{fontSize:10.5,fontFamily:F,fill:"#59645D"}}/>
                  <YAxis reversed domain={[1,"dataMax"]} allowDecimals={false} tick={{fontSize:10,fontFamily:F,fill:"#59645D"}} tickFormatter={v=>`#${v}`}/>
                  <Tooltip formatter={v=>[`#${v}`,"Artist Rank"]} contentStyle={{fontFamily:F,fontSize:11}}/>
                  <Line type="monotone" dataKey="rank" stroke="#1565C0" strokeWidth={3} connectNulls dot={{r:4}}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,minmax(0,1fr))":"repeat(4,minmax(0,1fr))",gap:"10px",marginBottom:"22px"}}>
            {[
              {label:"Unique Releases",value:selectedArtistReleases.length},
              {label:"Top 10 Placements",value:selectedArtistEntries.filter((entry)=>Number(entry.rank)<=10).length},
              {label:"#1 Placements",value:selectedArtistEntries.filter((entry)=>Number(entry.rank)===1).length},
              {label:"Best Release Rank",value:selectedArtistEntries.length?`#${Math.min(...selectedArtistEntries.map((entry)=>Number(entry.rank)))}`:"—"},
            ].map((stat)=><div key={stat.label} style={{padding:"12px 13px",border:"1px solid #ECE9E1",borderRadius:"10px",background:"#FAFAF8"}}><div style={{fontFamily:F,fontSize:"9px",fontWeight:900,letterSpacing:"1px",textTransform:"uppercase",color:"#7B857D"}}>{stat.label}</div><div style={{fontFamily:F,fontSize:"19px",fontWeight:900,marginTop:"5px"}}>{stat.value}</div></div>)}
          </div>
          <h3 style={secLbl()}>Charted Entries Across Months</h3>
          {(()=>{
            return selectedArtistEntries.sort((a,b)=>a.rank-b.rank).map((s,i)=>{
              const certification = getCertificationForEntry(s, isSingles ? "single" : "album");
              return (
              <div key={i} style={{display:"flex",justifyContent:"space-between",gap:"12px",padding:"9px 0",borderBottom:"1px solid #F2F2EE",fontFamily:F}}
                onMouseEnter={e=>e.currentTarget.style.background="#FAFAF6"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:"7px",flexWrap:"wrap"}}>
                    <button type="button" onClick={()=>openReleaseDetails(s,isSingles?"single":"album")} style={{fontWeight:800,fontSize:TXT.cardTitle,fontFamily:SF,border:0,background:"transparent",padding:0,cursor:"pointer",textAlign:"left"}}>{s.title}</button>
                    {certification&&<CertificationTag cert={certification} compact />}
                  </div>
                  <span style={{color:"#7B857D",fontSize:TXT.micro,fontFamily:F}}> {s.month}</span>
                </div>
                <div style={{whiteSpace:"nowrap"}}><span style={{color:GOLD,fontWeight:800,fontSize:TXT.cardMeta}}>#{s.rank}</span><span style={{color:"#69716B",fontSize:TXT.cardMeta}}> · {s.pts.toLocaleString()} pts</span></div>
              </div>
              );
            });
          })()}
        </div>
      )}

      {/* CHARTS PAGE */}
      {page === "charts" && !selA && !selR && (
  <PremiumChartsPage
    isMobile={isMobile}
    loaded={loaded}
    F={F}
    SF={SF}
    GOLD={GOLD}
    MEDALS={MEDALS}
    MONTHS={MONTHS}
    VO={VO}
    PC={PC}
    PLAT_LABEL={PLAT_LABEL}
    ct={ct}
    setCt={setCt}
    month={month}
    setMonth={setMonth}
    plat={plat}
    setPlat={setPlat}
    platList={platList}
    vc={vc}
    setVc={setVc}
    data={data}
    display={display}
    top={top}
    tp={tp}
    isSingles={isSingles}
    artists={artists}
    setSelA={setSelA}
    setSelR={setSelR}
    onOpenArtist={openArtistDetails}
    onOpenRelease={openReleaseDetails}
    getCombined={getCombined}
    liveChartLoading={liveChartLoading}
liveChartMeta={liveChartMeta}
liveStatus={liveStatus}
    pageMax={PAGE_MAX}
    certificationForEntry={getCertificationForEntry}
    CertificationTag={CertificationTag}
  />
)}

      {/* ARTISTS PAGE */}
      {page==="artists"&&!selA&&!selR&&(
        <div style={{padding:PAD,background:"#FFF",minHeight:"60vh",boxSizing:"border-box",overflow:"hidden"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:isMobile?"stretch":"flex-end",marginBottom:isMobile?"18px":"22px",gap:isMobile?"14px":"20px",flexDirection:isMobile?"column":"row"}}>
            <div>
              <h2 style={{fontSize:TXT.pageTitle,fontWeight:800,margin:0}}>Top Artists</h2>
              <p style={{fontFamily:F,fontSize:isMobile?"12.5px":"11.5px",color:"#59645D",margin:"5px 0 0",lineHeight:1.6}}>Cumulative credited performance from {MONTHS[0]} through {artistMonth}</p>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:isMobile?"10px":"12px",flexWrap:"wrap"}}>
              <select value={artistMonth} onChange={e=>setArtistMonth(e.target.value)} style={{width:isMobile?"100%":"auto",padding:isMobile?"11px 12px":"8px 12px",border:"1.5px solid #DDD",borderRadius:"9px",background:"#FFF",fontSize:isMobile?"12.5px":"10.5px",fontFamily:F,fontWeight:750,cursor:"pointer",outline:"none"}}>
                {MONTHS.map(m=><option key={m} value={m}>{m}</option>)}
              </select>
              <Tog sm/>
            </div>
          </div>
          {/* Comparison */}
          <div style={{...card(),padding:isMobile?"18px":"22px",marginBottom:"22px",background:"#FAFAF8"}}>
            <div style={{...secLbl(),marginBottom:isMobile?"14px":"16px"}}><SecMark/>Artist Comparison</div>
            <div style={{display:"flex",gap:isMobile?"9px":"12px",alignItems:"center",flexDirection:isMobile?"column":"row",marginBottom:"16px",flexWrap:"wrap"}}>
              <select value={cmpA1} onChange={e=>setCmpA1(e.target.value)} style={{flex:isMobile?"none":1,width:isMobile?"100%":"auto",minWidth:0,padding:isMobile?"11px 12px":"9px 12px",border:"1.5px solid #D6D1C7",borderRadius:"8px",background:"#FFF",fontSize:isMobile?"12px":"11.5px",fontFamily:F,fontWeight:700,cursor:"pointer",outline:"none",color:"#1F241F"}}>
                {allArtistNames.map(n=><option key={n} value={n}>{n}</option>)}
              </select>
              <span style={{fontFamily:F,fontSize:isMobile?"11px":"12px",color:"#7B857D",fontWeight:800,flexShrink:0}}>vs</span>
              <select value={cmpA2} onChange={e=>setCmpA2(e.target.value)} style={{flex:isMobile?"none":1,width:isMobile?"100%":"auto",minWidth:0,padding:isMobile?"11px 12px":"9px 12px",border:"1.5px solid #D6D1C7",borderRadius:"8px",background:"#FFF",fontSize:isMobile?"12px":"11.5px",fontFamily:F,fontWeight:700,cursor:"pointer",outline:"none",color:"#1F241F"}}>
                {allArtistNames.map(n=><option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="anl-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:isMobile?"10px":"12px",marginBottom:isMobile?"12px":"14px"}}>
              {[{d:cmp1,c:GOLD},{d:cmp2,c:"#1565C0"}].map(({d,c},i)=>(
                <button key={i} type="button" onClick={()=>openArtistDetails(d.n)} style={{padding:isMobile?"13px":"15px",background:c+"0D",borderRadius:"10px",border:"none",borderLeft:"3px solid "+c,cursor:"pointer",minWidth:0,textAlign:"left"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"8px",minWidth:0}}>
                    <CountryBadge artist={d.n} compact />
                    <div style={{fontFamily:SF,fontSize:isMobile?"15px":"16px",fontWeight:850,lineHeight:1.2,whiteSpace:"normal",overflowWrap:"anywhere",color:"#1F241F"}}>{d.n}</div>
                  </div>
                </button>
              ))}
            </div>
            <div style={{width:"100%",maxWidth:isMobile?"360px":"none",margin:"0 auto",border:"1px solid #E4E1D8",borderRadius:"12px",overflow:"hidden",background:"#FFF",boxShadow:"0 8px 24px rgba(31,36,31,0.05)"}}>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"minmax(76px,1fr) minmax(100px,0.9fr) minmax(76px,1fr)":"minmax(130px,1fr) minmax(150px,0.8fr) minmax(130px,1fr)",gap:"8px",alignItems:"center",padding:isMobile?"10px 9px":"12px 16px",background:"#1F241F",color:"#FFF"}}>
                <div style={{fontFamily:F,fontSize:isMobile?"10px":"11px",fontWeight:850,textAlign:"center",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",color:"#E4BE55"}}>{cmp1.n}</div>
                <div style={{fontFamily:F,fontSize:"9px",fontWeight:900,letterSpacing:"1.4px",textAlign:"center",textTransform:"uppercase",color:"#C9CEC9"}}>Metric</div>
                <div style={{fontFamily:F,fontSize:isMobile?"10px":"11px",fontWeight:850,textAlign:"center",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",color:"#72A7E8"}}>{cmp2.n}</div>
              </div>
              {[
                {label:"Total Points",a:cmp1.p||0,b:cmp2.p||0,fmt:v=>v.toLocaleString(),hi:"max"},
                {label:"Best Artist Rank",a:cmp1.pk||999,b:cmp2.pk||999,fmt:v=>v===999?"—":"#"+v,hi:"min"},
                {label:"Months Active",a:cmp1.m||0,b:cmp2.m||0,fmt:v=>v,hi:"max"},
                {label:"Entries",a:cmp1.t||0,b:cmp2.t||0,fmt:v=>v,hi:"max"},
              ].map((row,i)=>{
                const aWins=row.hi==="max"?row.a>row.b:row.a<row.b;
                const bWins=row.hi==="max"?row.b>row.a:row.b<row.a;
                return <div key={row.label} style={{display:"grid",gridTemplateColumns:isMobile?"minmax(76px,1fr) minmax(100px,0.9fr) minmax(76px,1fr)":"minmax(130px,1fr) minmax(150px,0.8fr) minmax(130px,1fr)",alignItems:"stretch",background:i%2?"#FBFAF7":"#FFF",borderBottom:i===3?"none":"1px solid #EEEAE1"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:isMobile?"9px 6px":"11px 12px",fontFamily:F,fontSize:isMobile?"13px":"14px",fontWeight:aWins?900:700,color:aWins?GOLD:"#4E5851",background:aWins?GOLD+"0D":"transparent"}}>{row.fmt(row.a)}</div>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center",padding:isMobile?"9px 5px":"11px 10px",borderLeft:"1px solid #EEEAE1",borderRight:"1px solid #EEEAE1",fontFamily:F,fontSize:isMobile?"8.6px":"9.5px",letterSpacing:"0.8px",textTransform:"uppercase",color:"#59645D",fontWeight:850,lineHeight:1.25}}>{row.label}</div>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:isMobile?"9px 6px":"11px 12px",fontFamily:F,fontSize:isMobile?"13px":"14px",fontWeight:bWins?900:700,color:bWins?"#1565C0":"#4E5851",background:bWins?"#1565C00D":"transparent"}}>{row.fmt(row.b)}</div>
                </div>;
              })}
            </div>
          </div>
          {/* Top 50 artists through the selected month */}
          {isMobile ? (
            <div style={{display:"grid",gap:"10px"}}>
              {artists.slice(0,50).map((a,i)=>{
                const trend=artistTrendFor(a);
                const rowKey=`${a.n}-${i}`;
                const expanded=Boolean(expandedArtistRows[rowKey]);
                const artistStats=[
                  {label:"Peak Rank",value:`#${a.pk}`},
                  {label:"Months",value:a.m},
                  {label:"Entries",value:a.t},
                ];
                return(
                  <div key={rowKey} style={{padding:"15px 16px",border:"1px solid rgba(0,0,0,0.08)",borderRadius:"16px",background:"#FFF",boxShadow:expanded?"inset 4px 0 0 #C89116, 0 8px 22px rgba(0,0,0,0.045)":"0 2px 10px rgba(0,0,0,0.025)"}}>
                    <div onClick={()=>toggleArtistRow(rowKey)} role="button" aria-expanded={expanded} style={{display:"grid",gridTemplateColumns:"34px 42px minmax(0,1fr) 38px",gap:"10px",alignItems:"center",cursor:"pointer",minWidth:0}}>
                      <div style={{fontSize:i<3?"28px":"24px",fontWeight:950,lineHeight:1,color:i<3?MEDALS[i]:"#050505",textAlign:"center",fontFamily:F}}>{i+1}</div>
                      <CountryBadge artist={a.n} style={{minWidth:"42px",width:"42px",height:"42px",borderRadius:"12px",padding:0,flexShrink:0}} />
                      <div style={{minWidth:0}}>
                        <button type="button" onClick={(event)=>{event.stopPropagation();openArtistDetails(a.n);}} style={{display:"block",width:"100%",border:0,background:"transparent",padding:0,margin:0,textAlign:"left",fontFamily:SF,fontSize:"15.5px",fontWeight:850,lineHeight:1.2,color:"#050505",whiteSpace:"normal",overflowWrap:"anywhere",cursor:"pointer"}}>{a.n}</button>
                        <div style={{fontFamily:F,fontSize:"11.5px",fontWeight:800,color:trend.color,marginTop:"5px",lineHeight:1.25}}>{trend.symbol} {trend.shortLabel}</div>
                      </div>
                      <button type="button" onClick={(event)=>{event.stopPropagation();toggleArtistRow(rowKey);}} aria-label={expanded?"Hide artist details":"Show artist details"} aria-expanded={expanded} style={{width:"38px",height:"34px",border:"1px solid rgba(0,0,0,0.08)",borderRadius:"14px",background:"#FBFAF7",color:"#555",fontSize:"18px",fontWeight:900,lineHeight:1,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:"0 0 2px",boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>{expanded?"▴":"▾"}</button>
                    </div>
                    {expanded&&(
                      <div style={{marginTop:"14px",padding:"14px 16px 12px",border:"1px solid rgba(0,0,0,0.06)",borderRadius:"16px",background:"#FBFAF7"}}>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:"8px"}}>
                          {artistStats.map((stat)=>(
                            <div key={stat.label} style={{background:"#FFF",border:"1px solid rgba(0,0,0,0.06)",borderRadius:"12px",padding:"9px 7px",minWidth:0}}>
                              <span style={{display:"block",fontFamily:F,fontSize:"9px",color:"#777",fontWeight:900,letterSpacing:"1px",textTransform:"uppercase",textAlign:"center"}}>{stat.label}</span>
                              <span style={{display:"block",marginTop:"4px",fontFamily:F,color:"#050505",fontSize:"12px",fontWeight:900,textAlign:"center",whiteSpace:"normal",overflowWrap:"anywhere"}}>{stat.value}</span>
                            </div>
                          ))}
                        </div>
                        <button type="button" onClick={()=>openArtistDetails(a.n)} style={{marginTop:"11px",width:"100%",border:"1px solid rgba(184,134,11,0.22)",borderRadius:"13px",background:"#FFF",color:GOLD,fontFamily:F,fontSize:"10.5px",fontWeight:900,letterSpacing:"1px",textTransform:"uppercase",padding:"10px 12px",cursor:"pointer"}}>View Artist Profile</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (<>
            <div style={{display:"grid",gridTemplateColumns:"44px 38px minmax(0,1fr) 70px 126px",gap:"12px",alignItems:"center",padding:"0 12px 10px",borderBottom:"1px solid #EDEBE4",fontFamily:F,fontSize:"10px",fontWeight:900,letterSpacing:"1.6px",textTransform:"uppercase",color:"#8A928B"}}>
              <div></div><div title="Country"></div><div>Artist</div><div style={{textAlign:"center"}}>Move</div><div style={{textAlign:"center"}}>Total Points</div>
            </div>
            {artists.slice(0,50).map((a,i)=>{const trend=artistTrendFor(a);return(
              <div key={a.n} className="ngoma-artist-row" style={{display:"grid",gridTemplateColumns:"44px 38px minmax(0,1fr) 70px 126px",gap:"12px",padding:"12px",borderBottom:"1px solid #F2F2EE",alignItems:"center",minWidth:0}}
                onMouseEnter={e=>e.currentTarget.style.background="#FAFAF6"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{fontSize:i<3?"17px":"13.5px",fontWeight:900,color:i<3?MEDALS[i]:"#B8BDB8",textAlign:"center",fontFamily:F}}>{i+1}</div>
                <CountryBadge artist={a.n} compact />
                <div style={{minWidth:0}}><button type="button" onClick={()=>openArtistDetails(a.n)} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:"15.5px",fontWeight:850,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",lineHeight:1.15,cursor:"pointer",maxWidth:"100%",textAlign:"left"}}>{a.n}</button><div style={{fontSize:"12px",color:"#59645D",fontFamily:F,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",marginTop:"4px",lineHeight:1.35}}>{a.t} {a.t===1?"entry":"entries"} · Artist peak: #{a.pk} · {a.m} {a.m===1?"month":"months"}</div></div>
                <div title={trend.label} style={{textAlign:"center",fontFamily:F,fontSize:"14px",fontWeight:900,color:trend.color}}>{trend.symbol}</div>
                <div style={{textAlign:"center",fontFamily:F,fontSize:"16px",fontWeight:900,color:GOLD,whiteSpace:"nowrap"}}>{a.p.toLocaleString()}</div>
              </div>
            )})}
          </>)}
        </div>
      )}

      {/* ANALYTICS PAGE */}
      {page==="analytics"&&!selA&&!selR&&(
        <div className="ngoma-analytics-page" style={{padding:PAD,background:"transparent",minHeight:"60vh",boxSizing:"border-box",overflow:"hidden"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:isMobile?"stretch":"flex-end",marginBottom:"20px",gap:isMobile?"12px":"20px",flexDirection:isMobile?"column":"row"}}>
            <div><h2 style={{fontSize:TXT.pageTitle,fontWeight:800,margin:0}}>Analytics</h2><p style={{fontFamily:F,fontSize:isMobile?"12.5px":"11.5px",color:"#59645D",margin:"5px 0 0",lineHeight:1.6}}>Analytics are based on the full Top 50 across all platforms and months.</p></div>
            <div style={{display:"flex",gap:isMobile?"10px":"8px",flexDirection:isMobile?"column":"row",alignItems:isMobile?"stretch":"center",width:isMobile?"100%":"auto"}}>
              <select value={anMonth} onChange={e=>setAnMonth(e.target.value)} style={{width:isMobile?"100%":"auto",padding:isMobile?"12px 13px":"8px 12px",border:"1.5px solid #DDD",borderRadius:"9px",background:"#FFF",fontSize:isMobile?"13px":"10.5px",fontFamily:F,fontWeight:750,cursor:"pointer",outline:"none",minWidth:0}}>
                {MONTHS.map(m=><option key={m} value={m}>{m}</option>)}
              </select>
              <div style={{display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap"}}>
                <Tog sm/>
              </div>
            </div>
          </div>
          {/* AI Analyst — hidden for now, re-enable by removing the display:none wrapper */}
          <div style={{display:"none"}}>
          <div style={{...card(),marginBottom:"20px"}}>
            <div style={secLbl()}><SecMark/>Ngoma AI Analyst</div>
            <div style={{display:"flex",gap:"8px",marginBottom:"10px"}}>
              <input value={aiQ} onChange={e=>setAiQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&askAI()} placeholder="Ask about charts, artists, trends, predictions..." style={{flex:1,padding:"10px 14px",border:"1.5px solid #E0E0DC",borderRadius:"6px",fontSize:"13px",fontFamily:SF,outline:"none"}}/>
              <button onClick={askAI} disabled={aiL} style={{padding:"10px 22px",background:"#1A1A1A",border:"none",borderRadius:"6px",color:"#FFF",cursor:aiL?"default":"pointer",fontFamily:F,fontSize:isMobile?"12px":"11px",fontWeight:700,opacity:aiL?0.6:1}}>{aiL?"...":"Ask"}</button>
            </div>
            {aiA&&<div style={{padding:"14px",background:"#FAFAF8",borderRadius:"8px",border:"1px solid #EAEAE6",fontSize:"13px",lineHeight:1.7,whiteSpace:"pre-wrap",marginBottom:"10px"}}>{aiA}</div>}
            <div style={{display:"flex",gap:"5px",flexWrap:"wrap"}}>
              {[`Who dominated ${DATA_PERIOD} overall?`,"Which song rose the fastest?","Compare singles vs albums platform performance","What predicts a #1 song?","Best Kenyan artists vs international?","Certification breakdown","Which platform discovers trends earliest?","Cross-platform overlap analysis"].map(q=>(
                <button key={q} onClick={()=>setAiQ(q)} style={{padding:"4px 10px",background:"#FFF",border:"1px solid #E0E0DC",borderRadius:"14px",fontSize:"10px",fontFamily:F,color:"#888",cursor:"pointer"}}>{q}</button>
              ))}
            </div>
          </div>
          </div>{/* end AI hidden wrapper */}
          {/* SONG / ALBUM COMPARISON */}
          <div style={{...card(),padding:isMobile?"16px":"18px",marginBottom:isMobile?"18px":"20px",background:"linear-gradient(135deg,#FAFAF8,#FFFFFF)"}}>
            <div style={secLbl()}><SecMark/>{isSingles?"Song":"Album"} Head-to-Head</div>
            <p style={{fontFamily:F,fontSize:TXT.note,color:"#69716B",margin:"-8px 0 14px",lineHeight:1.45}}>Compare two {isSingles?"songs":"albums"} across points, rank, platforms, and chart history.</p>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"minmax(0,1fr) auto minmax(0,1fr)",gap:isMobile?"10px":"12px",alignItems:"center",marginBottom:isMobile?"14px":"14px"}}>
              <div style={{minWidth:0}}>
                {isMobile&&<div style={{fontFamily:F,fontSize:"9px",fontWeight:900,letterSpacing:"1.2px",textTransform:"uppercase",color:GOLD,marginBottom:"6px"}}>{isSingles?"Song":"Album"} One</div>}
                <select value={cmpS1} onChange={e=>setCmpS1(e.target.value)} title={sp1?`${sp1.title} — ${sp1.artist}`:""} style={{width:"100%",minWidth:0,padding:isMobile?"11px 12px":"8px 10px",border:"1.5px solid "+GOLD+"55",borderRadius:"8px",background:"#FFF",fontSize:isMobile?"12px":"11px",fontFamily:F,fontWeight:700,cursor:"pointer",outline:"none",color:"#1F241F"}}>
                  {allTitles.map(t=><option key={t.key} value={t.key}>{t.title} — {t.artist}</option>)}
                </select>
                {isMobile&&sp1&&<div style={{marginTop:"7px",padding:"8px 10px",borderRadius:"9px",background:GOLD+"0B",fontFamily:F,lineHeight:1.35,color:"#1F241F",overflowWrap:"anywhere"}}><strong style={{display:"block",fontSize:"12px"}}>{sp1.title}</strong><span style={{display:"block",fontSize:"11px",color:"#59645D",marginTop:"2px"}}>{sp1.artist}</span></div>}
              </div>
              <span style={{fontFamily:F,fontSize:isMobile?"10px":"12px",color:"#8A928B",fontWeight:900,textAlign:"center",textTransform:isMobile?"uppercase":"none",letterSpacing:isMobile?"1px":"normal"}}>vs</span>
              <div style={{minWidth:0}}>
                {isMobile&&<div style={{fontFamily:F,fontSize:"9px",fontWeight:900,letterSpacing:"1.2px",textTransform:"uppercase",color:"#1565C0",marginBottom:"6px"}}>{isSingles?"Song":"Album"} Two</div>}
                <select value={cmpS2} onChange={e=>setCmpS2(e.target.value)} title={sp2?`${sp2.title} — ${sp2.artist}`:""} style={{width:"100%",minWidth:0,padding:isMobile?"11px 12px":"8px 10px",border:"1.5px solid #1565C055",borderRadius:"8px",background:"#FFF",fontSize:isMobile?"12px":"11px",fontFamily:F,fontWeight:700,cursor:"pointer",outline:"none",color:"#1F241F"}}>
                  {allTitles.map(t=><option key={t.key} value={t.key}>{t.title} — {t.artist}</option>)}
                </select>
                {isMobile&&sp2&&<div style={{marginTop:"7px",padding:"8px 10px",borderRadius:"9px",background:"#1565C00B",fontFamily:F,lineHeight:1.35,color:"#1F241F",overflowWrap:"anywhere"}}><strong style={{display:"block",fontSize:"12px"}}>{sp2.title}</strong><span style={{display:"block",fontSize:"11px",color:"#59645D",marginTop:"2px"}}>{sp2.artist}</span></div>}
              </div>
            </div>
            {sp1&&sp2&&(<>
              {/* Title cards */}
              <div className="anl-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:isMobile?"10px":"12px",marginBottom:isMobile?"12px":"14px"}}>
                {[{d:sp1,c:GOLD},{d:sp2,c:"#1565C0"}].map(({d,c},i)=>(
                  <div key={i} style={{padding:isMobile?"13px":"15px",background:c+"0D",borderRadius:"10px",borderLeft:"3px solid "+c,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:"7px",flexWrap:"wrap",minWidth:0}}>
                      <button type="button" onClick={()=>openReleaseDetails(d,isSingles?"single":"album")} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:isMobile?"15px":"16px",fontWeight:800,lineHeight:1.2,whiteSpace:isMobile?"normal":"nowrap",overflow:isMobile?"visible":"hidden",textOverflow:isMobile?"clip":"ellipsis",overflowWrap:"anywhere",minWidth:0,cursor:"pointer",textAlign:"left"}}>{d.title}</button>
                      {getCertificationForEntry(d, isSingles ? "single" : "album")&&<CertificationTag cert={getCertificationForEntry(d, isSingles ? "single" : "album")} compact />}
                    </div>
                    <button type="button" onClick={(event)=>{event.stopPropagation();openArtistDetails(d.artist);}} style={{display:"block",maxWidth:"100%",fontFamily:F,fontSize:isMobile?"11.5px":"11px",color:"#59645D",marginTop:"3px",padding:0,border:0,background:"transparent",fontWeight:700,whiteSpace:isMobile?"normal":"nowrap",overflow:isMobile?"visible":"hidden",textOverflow:isMobile?"clip":"ellipsis",overflowWrap:"anywhere",cursor:"pointer",textAlign:"left"}}>{d.artist}</button>
                    <div style={{display:"flex",gap:isMobile?"12px":"16px",marginTop:isMobile?"10px":"12px",flexWrap:"wrap"}}>
                      <div><div style={{fontFamily:F,fontSize:isMobile?"18px":"20px",fontWeight:800,color:c}}>{d.totalPts.toLocaleString()}</div><div style={{fontFamily:F,fontSize:isMobile?"8.5px":"8.5px",letterSpacing:"1px",textTransform:"uppercase",color:"#69716B",fontWeight:700}}>Total Pts</div></div>
                      <div><div style={{fontFamily:F,fontSize:isMobile?"18px":"20px",fontWeight:800,color:c}}>#{d.peak}</div><div style={{fontFamily:F,fontSize:isMobile?"8.5px":"8.5px",letterSpacing:"1px",textTransform:"uppercase",color:"#69716B",fontWeight:700}}>Peak</div></div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Metric comparison table */}
              <div style={{width:"100%",maxWidth:isMobile?"360px":"none",margin:"0 auto 16px",border:"1px solid #E4E1D8",borderRadius:"12px",overflow:"hidden",background:"#FFF",boxShadow:"0 8px 24px rgba(31,36,31,0.05)"}}>
                <div style={{display:"grid",gridTemplateColumns:isMobile?"minmax(76px,1fr) minmax(100px,0.9fr) minmax(76px,1fr)":"minmax(130px,1fr) minmax(150px,0.8fr) minmax(130px,1fr)",gap:"8px",alignItems:"center",padding:isMobile?"10px 9px":"12px 16px",background:"#1F241F",color:"#FFF"}}>
                  <div style={{fontFamily:F,fontSize:isMobile?"10px":"11px",fontWeight:850,textAlign:"center",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",color:"#E4BE55"}}>{sp1.title}</div>
                  <div style={{fontFamily:F,fontSize:"9px",fontWeight:900,letterSpacing:"1.4px",textAlign:"center",textTransform:"uppercase",color:"#C9CEC9"}}>Metric</div>
                  <div style={{fontFamily:F,fontSize:isMobile?"10px":"11px",fontWeight:850,textAlign:"center",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",color:"#72A7E8"}}>{sp2.title}</div>
                </div>
                {(()=>{
                  const rows=[
                    {label:"Total Points",a:sp1.totalPts,b:sp2.totalPts,fmt:v=>v.toLocaleString(),hi:"max"},
                    {label:"Peak",a:sp1.peak,b:sp2.peak,fmt:v=>"#"+v,hi:"min"},
                    {label:"Avg. Rank",a:sp1.avgRank,b:sp2.avgRank,fmt:v=>"#"+v,hi:"min"},
                    {label:"Months",a:sp1.months,b:sp2.months,fmt:v=>v+"/"+MONTHS.length,hi:"max"},
                    {label:"#1 Finishes",a:sp1.numberOnes,b:sp2.numberOnes,fmt:v=>v,hi:"max"},
                    {label:"Platforms Charted",a:sp1.platformCount,b:sp2.platformCount,fmt:v=>v+"/"+tp,hi:"max"},
                    {label:"Appearances",a:sp1.appearances,b:sp2.appearances,fmt:v=>v,hi:"max"},
                  ];
                  return rows.map((r,i)=>{
                    const aWins=r.hi==="max"?r.a>r.b:r.a<r.b;
                    const bWins=r.hi==="max"?r.b>r.a:r.b<r.a;
                    return(
                      <div key={i} style={{display:"grid",gridTemplateColumns:isMobile?"minmax(76px,1fr) minmax(100px,0.9fr) minmax(76px,1fr)":"minmax(130px,1fr) minmax(150px,0.8fr) minmax(130px,1fr)",alignItems:"stretch",background:i%2?"#FBFAF7":"#FFF",borderBottom:i===rows.length-1?"none":"1px solid #EEEAE1",gap:0}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center",padding:isMobile?"9px 6px":"11px 12px",fontFamily:F,fontSize:isMobile?"13px":"14px",fontWeight:aWins?900:700,color:aWins?GOLD:"#4E5851",background:aWins?GOLD+"0D":"transparent"}}>{r.fmt(r.a)}</div>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center",padding:isMobile?"9px 5px":"11px 10px",borderLeft:"1px solid #EEEAE1",borderRight:"1px solid #EEEAE1",fontFamily:F,fontSize:isMobile?"8.6px":"9.5px",letterSpacing:"0.8px",textTransform:"uppercase",color:"#59645D",fontWeight:850,lineHeight:1.25}}>{r.label}</div>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center",padding:isMobile?"9px 6px":"11px 12px",fontFamily:F,fontSize:isMobile?"13px":"14px",fontWeight:bWins?900:700,color:bWins?"#1565C0":"#4E5851",background:bWins?"#1565C00D":"transparent"}}>{r.fmt(r.b)}</div>
                      </div>
                    );
                  });
                })()}
              </div>
              {/* Points + Rank charts */}
              <AnalyticsDeepSection label="View comparison charts" isMobile={isMobile}>
              <div className="anl-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px"}}>
                <div style={{width:"100%",maxWidth:isMobile?"360px":"none",margin:"0 auto",padding:isMobile?"14px 8px 10px":"0",background:isMobile?"#FFF":"transparent",border:isMobile?"1px solid #E9E5DC":"none",borderRadius:isMobile?"13px":"0",boxShadow:isMobile?"0 6px 20px rgba(31,36,31,0.04)":"none",overflow:"hidden"}}>
                  <div style={{fontFamily:F,fontSize:isMobile?"10px":"9.5px",fontWeight:800,letterSpacing:"1.4px",textTransform:"uppercase",textAlign:isMobile?"center":"left",color:"#59645D",marginBottom:"8px"}}>Points by Month</div>
                  <div style={{width:"100%",maxWidth:isMobile?"340px":"none",margin:"0 auto"}}>
                    <ResponsiveContainer width="100%" height={isMobile?190:158}>
                      <BarChart data={songMonthlyData} margin={{top:14,right:isMobile?20:12,left:isMobile?8:4,bottom:4}}>
                        <XAxis dataKey="month" tick={{fontSize:isMobile?11:10.5,fontFamily:F,fill:"#59645D",fontWeight:650}} tickLine={false}/>
                        <YAxis width={isMobile?42:40} domain={[0,50]} tick={{fontSize:isMobile?10.5:10,fontFamily:F,fill:"#59645D",fontWeight:650}} axisLine={false} tickLine={false}/>
                        <Tooltip contentStyle={{fontFamily:F,fontSize:11}} formatter={(v,n)=>[v.toLocaleString()+" pts",n==="A"?sp1.title:sp2.title]}/>
                        <Bar dataKey="A" fill={GOLD} radius={[3,3,0,0]}/>
                        <Bar dataKey="B" fill="#1565C0" radius={[3,3,0,0]}/>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div style={{width:"100%",maxWidth:isMobile?"360px":"none",margin:"0 auto",padding:isMobile?"14px 8px 10px":"0",background:isMobile?"#FFF":"transparent",border:isMobile?"1px solid #E9E5DC":"none",borderRadius:isMobile?"13px":"0",boxShadow:isMobile?"0 6px 20px rgba(31,36,31,0.04)":"none",overflow:"hidden"}}>
                  <div style={{fontFamily:F,fontSize:isMobile?"10px":"9.5px",fontWeight:800,letterSpacing:"1.4px",textTransform:"uppercase",textAlign:isMobile?"center":"left",color:"#59645D",marginBottom:"8px"}}>Rank Trajectory (lower = better)</div>
                  <div style={{width:"100%",maxWidth:isMobile?"340px":"none",margin:"0 auto"}}>
                    <ResponsiveContainer width="100%" height={isMobile?190:158}>
                      <LineChart data={songRankData} margin={{top:14,right:isMobile?20:14,left:isMobile?8:4,bottom:4}}>
                        <XAxis dataKey="month" tick={{fontSize:isMobile?11:10.5,fontFamily:F,fill:"#59645D",fontWeight:650}} tickLine={false}/>
                        <YAxis width={isMobile?42:40} reversed domain={[1,"dataMax"]} tick={{fontSize:isMobile?10.5:10,fontFamily:F,fill:"#59645D",fontWeight:650}} tickFormatter={v=>"#"+v} axisLine={false} tickLine={false}/>
                        <Tooltip contentStyle={{fontFamily:F,fontSize:11}} formatter={(v,n)=>["#"+v,n==="A"?sp1.title:sp2.title]}/>
                        <Line dataKey="A" stroke={GOLD} strokeWidth={2.5} dot={{r:4}} connectNulls/>
                        <Line dataKey="B" stroke="#1565C0" strokeWidth={2.5} dot={{r:4}} connectNulls/>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
              </AnalyticsDeepSection>
              {/* Platform-by-platform peak ranks */}
              <div style={{marginTop:isMobile?"14px":"16px"}}>
                <div style={{fontFamily:F,fontSize:isMobile?"10px":"9.5px",fontWeight:800,letterSpacing:"1.4px",textTransform:"uppercase",color:"#59645D",marginBottom:"10px"}}>Peak Rank by Platform</div>
                <div style={{border:"1px solid #EFEDE7",borderRadius:"10px",overflow:"hidden",background:"#FFF"}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px",padding:isMobile?"8px 10px":"8px 12px",background:"#FAFAF7",borderBottom:"1px solid #EFEDE7",fontFamily:F,fontSize:isMobile?"9px":"9.5px",fontWeight:850,letterSpacing:"1px",textTransform:"uppercase",color:"#69716B"}}>
                    <div>{sp1.title.length>16?sp1.title.slice(0,14)+"…":sp1.title}</div>
                    <div style={{textAlign:"center"}}>Platform</div>
                    <div style={{textAlign:"right"}}>{sp2.title.length>16?sp2.title.slice(0,14)+"…":sp2.title}</div>
                  </div>
                  {PLATS_FOR.map(pl=>{
                    const a=sp1.platforms[pl],b=sp2.platforms[pl];
                    const lbl=PLAT_LABEL[pl]||pl;
                    return(
                      <div key={pl} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",alignItems:"center",gap:"8px",padding:isMobile?"8px 10px":"8px 12px",borderBottom:"1px solid #F2F0EA"}}>
                        <div style={{textAlign:"left",fontFamily:F,fontSize:isMobile?"12px":"12px",fontWeight:800,color:a?GOLD:"#B8BDB8"}}>{a?"#"+a:"—"}</div>
                        <div style={{textAlign:"center",fontFamily:F,fontSize:isMobile?"10px":"10px",fontWeight:750,color:PC[pl]||"#59645D",letterSpacing:"0.4px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{lbl}</div>
                        <div style={{textAlign:"right",fontFamily:F,fontSize:isMobile?"12px":"12px",fontWeight:800,color:b?"#1565C0":"#B8BDB8"}}>{b?"#"+b:"—"}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>)}
          </div>
          {/* Stats row */}
          <div className="anl-grid-4" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"10px",marginBottom:"20px"}}>
            {[
              {l:"Chart Depth",v:getCombined(ct,anMonth).length,c:GOLD,s:`${releaseLabelLower} in Top 50 combined`},
              {l:"New Entries",v:mvData.new,c:"#2DB04A",s:"not in prev month"},
              {l:"Re-Entries",v:mvData.ret,c:"#1565C0",s:"returned to chart"},
              {l:"Platforms",v:tp,c:"#7B1FA2",s:`tracked for ${chartTypeLabel.toLowerCase()}`},
            ].map((s,i)=>(
              <div key={i} style={card({padding:isMobile?"15px":"18px"})}><div style={{...secLbl(s.c),marginBottom:"6px"}}>{s.l}</div><div style={{fontSize:isMobile?"24px":"28px",fontWeight:800,color:s.c}}>{s.v}</div><div style={{fontSize:isMobile?"10.5px":"10px",color:"#59645D",fontFamily:F,lineHeight:1.35}}>{s.s}</div></div>
            ))}
          </div>
          {/* Top 10 + Platform #1s */}
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:isMobile?"18px":"14px",marginBottom:"20px"}} className="anl-2col">
            <div style={card()}>
              <div style={secLbl()}><SecMark/>Top 10 {releaseLabel} — {anMonth}</div>
              {isMobile ? (
                <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                  {top10sData.map((e,i)=>(
                    <div key={e.name} style={{display:"grid",gridTemplateColumns:"28px minmax(0,1fr) 86px",alignItems:"center",gap:"10px",padding:"9px 0",borderBottom:"1px solid #F0F0EC"}}>
                      <div style={{fontFamily:F,fontSize:"12px",fontWeight:900,color:i<3?MEDALS[i]:"#B8BDB8",textAlign:"center"}}>{i+1}</div>
                      <button type="button" onClick={()=>openReleaseDetails(e,isSingles?"single":"album")} style={{border:0,background:"transparent",padding:0,textAlign:"left",fontFamily:SF,fontSize:"13px",fontWeight:800,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",cursor:"pointer"}}>{e.name}</button>
                      <div style={{fontFamily:F,fontSize:"12px",fontWeight:900,color:GOLD,textAlign:"right",whiteSpace:"nowrap"}}>{e.pts.toLocaleString()} pts</div>
                    </div>
                  ))}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={top10sData} layout="vertical" margin={{left:10,right:20,top:0,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC" horizontal={false}/>
                    <XAxis type="number" domain={[0,50]} tick={{fontSize:10.5,fontFamily:F,fill:"#59645D",fontWeight:650}} tickFormatter={v=>v.toLocaleString()} axisLine={false} tickLine={false}/>
                    <YAxis type="category" dataKey="name" width={120} tick={{fontSize:10.5,fontFamily:F,textAnchor:"end",fill:"#59645D",fontWeight:650}} tickLine={false}/>
                    <Tooltip formatter={v=>[v.toLocaleString()+" pts","Points"]} contentStyle={{fontFamily:F,fontSize:12,borderRadius:8,border:"1px solid #E1DCD0"}}/>
                    <Bar dataKey="pts" radius={[0,4,4,0]}>{top10sData.map((e,i)=><Cell key={i} fill={i===0?GOLD:`rgba(184,134,11,${Math.max(0.35,0.92-i*0.055)})`}/>)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div style={card()}>
              <div style={secLbl()}><SecMark/>Platform #1s — {anMonth} ({chartTypeLabel})</div>
              <div className="anl-grid-2" style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:isMobile?"10px":"8px"}}>
                {platOnes.map(([pl,d])=>{
                  const lbl=PLAT_LABEL[pl]||pl;
                  return(
                    <div key={pl} style={{padding:isMobile?"12px":"10px 12px",background:(PC[pl]||"#888")+"0D",borderRadius:"8px",borderLeft:"3px solid "+(PC[pl]||"#888")}}>
                      <div style={{fontSize:isMobile?"9.5px":"8.8px",fontFamily:F,letterSpacing:"1.5px",textTransform:"uppercase",color:PC[pl]||"#888",marginBottom:"5px",fontWeight:800}}>{lbl}</div>
                      <button type="button" onClick={()=>openReleaseDetails({title:d.t,artist:d.a,primary_artist:d.primary_artist,featured_artists:d.featured_artists},isSingles?"single":"album")} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:isMobile?"13px":"11.5px",fontWeight:800,lineHeight:1.2,cursor:"pointer",textAlign:"left"}}>{d.t}</button>
                      <div style={{fontSize:isMobile?"11px":"10px",color:"#59645D",fontFamily:F,marginTop:"3px"}}>{d.a}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          {/* Top artists points line chart */}
          <AnalyticsDeepSection label="View artist trajectory" isMobile={isMobile}>
          <div style={{...card(),marginBottom:"20px"}}>
            <div style={secLbl()}><SecMark/>Top 5 Artists — Points Trajectory ({chartTypeLabel})</div>
            <div className="ngoma-analytics-chart-scroll" aria-label="Scrollable artist trajectory chart">
              <div style={{minWidth:isMobile?"720px":"100%",height:isMobile?270:240}}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={topArtistsLine} margin={{top:10,right:24,left:8,bottom:4}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC"/>
                    <XAxis dataKey="month" interval={0} tick={{fontSize:11,fontFamily:F,fill:"#59645D",fontWeight:650}} tickLine={false}/>
                    <YAxis tick={{fontSize:10.5,fontFamily:F,fill:"#59645D",fontWeight:650}} tickFormatter={v=>v.toLocaleString()} axisLine={false} tickLine={false}/>
                    <Tooltip formatter={(v,n)=>[v.toLocaleString()+" pts",n]} contentStyle={{fontFamily:F,fontSize:11}}/>
                    <Legend wrapperStyle={{fontFamily:F,fontSize:isMobile?11:10.5,color:"#59645D"}}/>
                    {artists.slice(0,5).map((a,i)=>(
                      <Line key={a.n} type="monotone" dataKey={a.n} stroke={CC[i]} strokeWidth={2} dot={{r:4}} activeDot={{r:6}}/>
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          </AnalyticsDeepSection>
          {/* Cross-platform overlap + Coverage pie */}
          <AnalyticsDeepSection label="View platform reach" isMobile={isMobile}>
          <div className="anl-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginBottom:"20px"}}>
            <div style={card()}>
              <div style={secLbl()}><SecMark/>Cross-Platform Reach — {anMonth}</div>
              <p style={{fontFamily:F,fontSize:"10px",color:"#59645D",margin:"-4px 0 12px",lineHeight:1.45}}>{releaseLabel} charting on most platforms simultaneously.</p>
              {crossPlatformRows.slice(0,8).map((s,i)=>{
                const certification = getCertificationForEntry(s, isSingles ? "single" : "album");
                return (
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",padding:"7px 0",borderBottom:"1px solid #F0F0EC"}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
                      <button type="button" onClick={()=>openReleaseDetails(s,isSingles?"single":"album")} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:isMobile?"13px":"12px",fontWeight:800,cursor:"pointer",textAlign:"left"}}>{s.t}</button>
                      {certification&&<CertificationTag cert={certification} compact />}
                    </div>
                    <div style={{fontSize:isMobile?"11px":"10.5px",color:"#59645D",fontFamily:F,marginTop:"2px"}}>{s.a}</div>
                  </div>
                  <div style={{display:"flex",gap:"3px",alignItems:"center",flexShrink:0}}>
                    {s.plats.map(pl=><div key={pl} style={{width:"7px",height:"7px",borderRadius:"50%",background:PC[pl]||"#888"}} title={PLAT_LABEL[pl]}/>)}
                    <span style={{fontFamily:F,fontSize:isMobile?"12px":"11px",fontWeight:700,color:GOLD,marginLeft:"6px"}}>{s.count}/{currentPlatformKeys.length}</span>
                  </div>
                </div>
                );
              })}
            </div>
            <div style={card()}>
              <div style={secLbl()}><SecMark/>Platform Coverage — {anMonth}</div>
              <div style={{display:"flex",alignItems:"center",gap:isMobile?"12px":"16px",flexWrap:isMobile?"wrap":"nowrap"}}>
                <ResponsiveContainer width={150} height={150}>
                  <PieChart>
                    <Pie data={coverageData} cx={70} cy={70} innerRadius={40} outerRadius={65} paddingAngle={2} dataKey="value">
                      {coverageData.map((e,i)=><Cell key={i} fill={CC[i]}/>)}
                    </Pie>
                    <Tooltip contentStyle={{fontFamily:F,fontSize:11}}/>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{flex:1}}>
                  {coverageData.map((e,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"3px 0",fontFamily:F,fontSize:isMobile?"12px":"11px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:"6px"}}><div style={{width:"10px",height:"10px",borderRadius:"2px",background:CC[i]}}/><span style={{color:"#555"}}>{e.name}</span></div>
                      <span style={{fontWeight:700}}>{e.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          </AnalyticsDeepSection>
          {/* Platform totals */}
          {platTotalsData.length>0&&(
            <AnalyticsDeepSection label="View platform totals" isMobile={isMobile}>
            <div style={{...card(),marginBottom:"20px"}}>
              <div style={secLbl()}><SecMark/>Combined Top 50 Entries Contributed Per Platform — {anMonth}</div>
              <ResponsiveContainer width="100%" height={isMobile?230:200}>
                <BarChart data={platTotalsData} margin={{top:12,right:isMobile?16:20,left:isMobile?0:8,bottom:isMobile?6:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC"/>
                  <XAxis dataKey="platform" tick={isMobile?false:{fontSize:10,fontFamily:F,fill:"#59645D",fontWeight:650}} tickLine={false}/>
                  <YAxis domain={[0,50]} allowDecimals={false} tick={{fontSize:isMobile?10.5:10,fontFamily:F,fill:"#59645D",fontWeight:650}} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{fontFamily:F,fontSize:11}} formatter={v=>[v,"Combined entries"]}/>
                  <Bar dataKey="entries" radius={[4,4,0,0]}>{platTotalsData.map((e,i)=><Cell key={i} fill={e.color}/>)}</Bar>
                </BarChart>
              </ResponsiveContainer>
              {isMobile&&<div style={{display:"flex",justifyContent:"center",gap:"8px 12px",flexWrap:"wrap",marginTop:"10px"}}>{platTotalsData.map((entry)=><div key={entry.platform} style={{display:"inline-flex",alignItems:"center",gap:"5px",fontFamily:F,fontSize:"10px",fontWeight:750,color:"#59645D"}}><span style={{width:"9px",height:"9px",borderRadius:"3px",background:entry.color,flexShrink:0}}/>{entry.platform}</div>)}</div>}
            </div>
            </AnalyticsDeepSection>
          )}
          {/* Local vs International */}
          {(()=>{
            const cd=getCombined(ct,anMonth);
            let local=0,intl=0,localPts=0,intlPts=0;
            cd.forEach(e=>{if(getArtistCountry(e).code==="KE"){local++;localPts+=e.pts;}else{intl++;intlPts+=e.pts;}});
            const pieData=[{name:"Kenyan",value:local,color:GOLD},{name:"International",value:intl,color:"#37474F"}];
            return(
              <AnalyticsDeepSection label="View local vs international" isMobile={isMobile}>
              <div style={{...card(),marginBottom:"20px"}}>
                <div style={secLbl()}><SecMark/>Local vs International — {anMonth}</div>
                <p style={{fontFamily:F,fontSize:TXT.note,color:"#69716B",margin:"-6px 0 14px",lineHeight:1.45}}>Share of the current Top 50 entries by primary artist country.</p>
                <div style={{display:"flex",alignItems:"center",gap:"24px",flexWrap:"wrap"}}>
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie data={pieData} cx={75} cy={75} innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                        {pieData.map((e,i)=><Cell key={i} fill={e.color}/>)}
                      </Pie>
                      <Tooltip contentStyle={{fontFamily:F,fontSize:11}}/>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{flex:1,minWidth:"200px"}}>
                    {[{l:"Kenyan Artists",c:local,p:localPts,col:GOLD},{l:"International",c:intl,p:intlPts,col:"#37474F"}].map((r,i)=>(
                      <div key={i} style={{marginBottom:"14px"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"5px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:"7px"}}><div style={{width:"11px",height:"11px",borderRadius:"3px",background:r.col}}/><span style={{fontFamily:F,fontSize:"12px",fontWeight:600}}>{r.l}</span></div>
                          <span style={{fontFamily:F,fontSize:"13px",fontWeight:800,color:r.col}}>{r.c} <span style={{fontSize:"10px",color:"#69716B",fontWeight:600}}>of 50</span></span>
                        </div>
                        <div style={{height:"6px",background:"#F2F0EA",borderRadius:"3px",overflow:"hidden"}}><div style={{width:(r.c/50*100)+"%",height:"100%",background:r.col,borderRadius:"3px"}}/></div>
                        <div style={{fontFamily:F,fontSize:isMobile?"10.5px":"10px",color:"#59645D",marginTop:"4px"}}>{r.p.toLocaleString()} total points</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              </AnalyticsDeepSection>
            );
          })()}
          {/* Climbers & Fallers */}
          <div className="anl-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginBottom:"20px"}}>
            <div style={card()}>
              <div style={secLbl("#2DB04A")}><SecMark c="#2DB04A"/>Top {releaseLabel} Climbers — {anMonth}</div>
              {mvData.risers.map((s,i)=>{
                const certification = getCertificationForEntry(s, isSingles ? "single" : "album");
                return (
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",padding:isMobile?"8px 0":"6px 0",borderBottom:"1px solid #F0F0EC"}}>
                  <div style={{minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
                      <button type="button" onClick={()=>openReleaseDetails(s,isSingles?"single":"album")} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:TXT.cardTitle,fontWeight:800,lineHeight:1.15,cursor:"pointer",textAlign:"left"}}>{s.t}</button>
                      {certification&&<CertificationTag cert={certification} compact />}
                    </div>
                    <div style={{fontSize:TXT.cardMeta,color:"#69716B",fontFamily:F,marginTop:"3px"}}>{s.a}</div>
                  </div>
                  <div style={{textAlign:"right",fontFamily:F,whiteSpace:"nowrap"}}><div style={{color:"#2DB04A",fontSize:TXT.cardMeta,fontWeight:800}}>▲{s.from-s.to}</div><div style={{fontSize:TXT.micro,color:"#7B857D"}}>#{s.from}→#{s.to}</div></div>
                </div>
                );
              })}
              {!mvData.risers.length&&<div style={{fontFamily:F,fontSize:isMobile?"12px":"11px",color:"#CCC",padding:"20px 0",textAlign:"center"}}>No movement data (debut month)</div>}
            </div>
            <div style={card()}>
              <div style={secLbl("#E53935")}><SecMark c="#E53935"/>Biggest {releaseLabel} Drops — {anMonth}</div>
              {mvData.fallers.map((s,i)=>{
                const certification = getCertificationForEntry(s, isSingles ? "single" : "album");
                return (
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",padding:isMobile?"8px 0":"6px 0",borderBottom:"1px solid #F0F0EC"}}>
                  <div style={{minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
                      <button type="button" onClick={()=>openReleaseDetails(s,isSingles?"single":"album")} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:TXT.cardTitle,fontWeight:800,lineHeight:1.15,cursor:"pointer",textAlign:"left"}}>{s.t}</button>
                      {certification&&<CertificationTag cert={certification} compact />}
                    </div>
                    <div style={{fontSize:TXT.cardMeta,color:"#69716B",fontFamily:F,marginTop:"3px"}}>{s.a}</div>
                  </div>
                  <div style={{textAlign:"right",fontFamily:F,whiteSpace:"nowrap"}}><div style={{color:"#E53935",fontSize:TXT.cardMeta,fontWeight:800}}>▼{s.to-s.from}</div><div style={{fontSize:TXT.micro,color:"#7B857D"}}>#{s.from}→#{s.to}</div></div>
                </div>
                );
              })}
              {!mvData.fallers.length&&<div style={{fontFamily:F,fontSize:isMobile?"12px":"11px",color:"#CCC",padding:"20px 0",textAlign:"center"}}>No drops (debut month)</div>}
            </div>
          </div>
          {/* Top 10 Artists Bar */}
          <AnalyticsDeepSection label="View top artists chart" isMobile={isMobile}>
          <div style={{...card(),marginBottom:"20px"}}>
            <div style={secLbl()}><SecMark/>Top 10 Artists by Total Points — ({chartTypeLabel})</div>
            <ResponsiveContainer width="100%" height={isMobile?280:260}>
              <BarChart data={artists.slice(0,10).map(a=>({name:a.n.length>14?a.n.slice(0,12)+"…":a.n,pts:a.p}))} layout="vertical" margin={{left:isMobile?4:10,right:isMobile?18:20,top:0,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC" horizontal={false}/>
                <XAxis type="number" tick={{fontSize:isMobile?10.5:10.5,fontFamily:F,fill:"#59645D",fontWeight:650}} tickFormatter={v=>v.toLocaleString()} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="name" width={isMobile?96:110} tick={{fontSize:isMobile?10.5:10.5,fontFamily:F,textAnchor:"end",fill:"#59645D",fontWeight:650}} tickLine={false}/>
                <Tooltip formatter={v=>[v.toLocaleString()+" pts","Points"]} contentStyle={{fontFamily:F,fontSize:11}}/>
                <Bar dataKey="pts" radius={[0,4,4,0]}>{artists.slice(0,10).map((a,i)=><Cell key={i} fill={i===0?GOLD:`rgba(184,134,11,${Math.max(0.35,0.92-i*0.055)})`}/>)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          </AnalyticsDeepSection>
          {/* Tracked Song Journey */}
          <AnalyticsDeepSection label={isSingles?"View song rank journey":"View album rank journey"} isMobile={isMobile}>
          <div style={card()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",marginBottom:"14px",flexWrap:"wrap"}}>
              <div style={{...secLbl(),marginBottom:0}}><SecMark/>{isSingles?"Top Songs Rank Journey Across Months":"Top Albums Rank Journey Across Months"}</div>
              <div style={{display:"flex",padding:"3px",borderRadius:"999px",background:"#F2F2EE",border:"1px solid #E3E0D8"}}>
                {["table","graph"].map((view)=><button key={view} type="button" onClick={()=>setRankJourneyView(view)} style={{border:0,borderRadius:"999px",background:rankJourneyView===view?"#1A1A1A":"transparent",color:rankJourneyView===view?"#FFF":"#59645D",padding:"7px 12px",fontFamily:F,fontSize:"9.5px",fontWeight:900,letterSpacing:"1px",textTransform:"uppercase",cursor:"pointer"}}>{view}</button>)}
              </div>
            </div>
            {rankJourneyView==="graph" ? (
              <div className="ngoma-analytics-chart-scroll" aria-label="Scrollable rank journey graph">
                <div style={{minWidth:isMobile?"720px":"100%",height:320}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analysisMonths.map((m)=>{const row={month:m.split(" ")[0].slice(0,3)};tracked.forEach((title)=>{row[title]=getCombined(ct,m).find((entry)=>entry.title===title)?.rank||null;});return row;})} margin={{top:10,right:24,left:8,bottom:8}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC"/>
                      <XAxis dataKey="month" tick={{fontSize:10.5,fontFamily:F,fill:"#59645D"}}/>
                      <YAxis reversed domain={[1,50]} tick={{fontSize:10,fontFamily:F,fill:"#59645D"}} tickFormatter={v=>`#${v}`}/>
                      <Tooltip formatter={(value,name)=>[`#${value}`,name]} contentStyle={{fontFamily:F,fontSize:11}}/>
                      <Legend wrapperStyle={{fontFamily:F,fontSize:10,color:"#59645D"}}/>
                      {tracked.map((title,index)=><Line key={title} type="monotone" dataKey={title} stroke={CC[index]} strokeWidth={2.5} connectNulls={false} dot={{r:3}} activeDot={{r:5}}/>)}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
            <div className="ngoma-analytics-chart-scroll" aria-label="Scrollable rank journey table">
            <div style={{minWidth:isMobile?"760px":"100%"}}>
            {tracked.map(title=>{
              const hasAny=analysisMonths.some(m=>getCombined(ct,m).find(e=>e.title===title));
              if(!hasAny)return null;
              return(<div key={title} style={{display:"grid",gridTemplateColumns:`minmax(${isMobile?180:220}px,1fr) repeat(${analysisMonths.length},44px)`,alignItems:"center",padding:"8px 0",borderBottom:"1px solid #F0F0EC",gap:"8px"}}>
                <div style={{minWidth:0,display:"flex",alignItems:"center",gap:"7px"}}>
                  <button type="button" onClick={()=>{const e=analysisMonths.flatMap(m=>getCombined(ct,m)).find(x=>x.title===title);if(e)openReleaseDetails(e,isSingles?"single":"album");}} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:isMobile?"12.5px":"11.5px",fontWeight:800,lineHeight:1.2,color:GOLD,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",cursor:"pointer"}}>{title}</button>
                  {(()=>{const e=analysisMonths.flatMap(m=>getCombined(ct,m)).find(x=>x.title===title);const certification=e?getCertificationForEntry(e,isSingles?"single":"album"):null;return certification?<CertificationTag cert={certification} compact />:null;})()}
                </div>
                {analysisMonths.map(m=>{const e=getCombined(ct,m).find(x=>x.title===title);return(<div key={m} style={{width:"44px",textAlign:"center",fontFamily:F}}>
                  <div style={{fontSize:isMobile?"9px":"8.5px",color:"#69716B",fontWeight:700}}>{m.split(" ")[0].slice(0,3)}</div>
                  {e?<div style={{fontSize:"14px",fontWeight:800,color:e.rank===1?GOLD:e.rank<=3?"#1A1A1A":"#888"}}>#{e.rank}</div>:<div style={{fontSize:"11px",color:"#E0E0DC"}}>—</div>}
                </div>);})}
              </div>);
            })}
            </div>
            </div>
            )}
          </div>
          </AnalyticsDeepSection>
        </div>
      )}

      {/* TRENDING / PREDICTIONS PAGE */}
      {page==="trending"&&!selA&&!selR&&(
        <div style={{padding:PAD,minHeight:"60vh",boxSizing:"border-box",overflow:"hidden"}}>
          <div style={{maxWidth:"1240px",margin:"0 auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:isMobile?"flex-start":"flex-end",marginBottom:isMobile?"16px":"20px",flexWrap:"wrap",gap:isMobile?"10px":"12px"}}>
              <div style={{minWidth:0,flex:isMobile?"1 1 100%":"1"}}>
                <div style={{fontFamily:F,fontSize:isMobile?"9px":"10.5px",letterSpacing:isMobile?"2.2px":"2.6px",textTransform:"uppercase",color:"#2DB04A",marginBottom:"6px"}}>RANK MOMENTUM</div>
                <h2 style={{fontSize:isMobile?"24px":"24px",fontWeight:800,margin:0}}>Trending Up</h2>
                <p style={{fontFamily:F,fontSize:isMobile?"12px":"11px",color:"#626A64",margin:"6px 0 0",lineHeight:1.55}}>Tracks rising fastest on the Combined chart, measured by positions gained.</p>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:isMobile?"10px":"12px",flexWrap:"wrap",marginTop:isMobile?"2px":0}}>
                <Tog sm/>
              </div>
            </div>

            <div style={{...card({background:"linear-gradient(135deg,#F4FBF5,#FFFFFF)",borderColor:"#2DB04A22",padding:isMobile?"18px":"24px"}),marginBottom:isMobile?"16px":"20px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"6px"}}>
                <span style={{fontSize:"22px"}}>🔥</span>
                <div>
                  <div style={{fontFamily:F,fontSize:isMobile?"10.5px":"11px",fontWeight:800,letterSpacing:"1px",textTransform:"uppercase",color:"#2DB04A"}}>Biggest Climb</div>
                  <div style={{fontFamily:F,fontSize:isMobile?"12px":"11px",color:"#68746C"}}>Most Combined chart places gained in {latestMonth}</div>
                </div>
              </div>
              {(()=>{const list=uniqueByMomentumIdentity(currentTrending.rising);const hot=list[0];if(!hot)return null;
                return(
                  <div style={{display:"flex",flexDirection:isMobile?"column":"row",alignItems:isMobile?"stretch":"center",gap:isMobile?"18px":"28px",marginTop:"14px"}}>
                    <div style={{flex:1,minWidth:isMobile?"0":"260px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:"9px",flexWrap:"wrap"}}>
                        <div style={{fontFamily:SF,fontSize:isMobile?"23px":"28px",fontWeight:850,cursor:"pointer",lineHeight:1.08}} onClick={()=>openMomentumRelease(hot)}>{hot.t}</div>
                        {getCertificationForEntry(hot, isSingles ? "single" : "album")&&<CertificationTag cert={getCertificationForEntry(hot, isSingles ? "single" : "album")} compact={false} />}
                      </div>
                      <div style={{fontFamily:F,fontSize:isMobile?"15px":"15px",color:"#69716B",marginTop:"6px",fontWeight:700}}>{hot.a}</div>
                      <div style={{display:"flex",gap:isMobile?"14px":"20px",marginTop:"12px",flexWrap:"wrap"}}>
                        <div><div style={{fontFamily:F,fontSize:isMobile?"20px":"20px",fontWeight:900,color:"#2DB04A"}}>+{hot.places}</div><div style={{fontFamily:F,fontSize:"10px",letterSpacing:"1px",textTransform:"uppercase",color:"#7B857D",fontWeight:800}}>Places</div></div>
                        <div><div style={{fontFamily:F,fontSize:isMobile?"20px":"20px",fontWeight:900,color:"#1A1A1A"}}>#{hot.fromRank}</div><div style={{fontFamily:F,fontSize:"10px",letterSpacing:"1px",textTransform:"uppercase",color:"#7B857D",fontWeight:800}}>Previous Rank</div></div>
                        <div><div style={{fontFamily:F,fontSize:isMobile?"20px":"20px",fontWeight:900,color:GOLD}}>#{hot.decRank}</div><div style={{fontFamily:F,fontSize:"10px",letterSpacing:"1px",textTransform:"uppercase",color:"#7B857D",fontWeight:800}}>{latestMonthShort} Rank</div></div>
                      </div>
                    </div>
                    <div style={{minWidth:isMobile?"100%":"180px",display:"flex",justifyContent:isMobile?"flex-start":"flex-end"}}>
                      <TrendBars trend={hot.trend} height={isMobile?62:82}/>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div style={card({padding:isMobile?"18px":"22px"})}>
              <div style={secLbl("#2DB04A")}><SecMark c="#2DB04A"/>Rising Fast — Most Places Gained ({isSingles?"Singles":"Albums"})</div>
              {uniqueByMomentumIdentity(currentTrending.rising).map((p,i)=>{
                const rowKey=`rising-${p.t}-${p.a}-${p.decRank}`;
                const expanded=Boolean(expandedTrendingRows[rowKey]);
                if(isMobile)return(
                  <div key={rowKey} style={{padding:"14px 15px",marginBottom:"9px",border:"1px solid #E8EDE8",borderRadius:"14px",background:"#FFF",boxShadow:expanded?"inset 4px 0 0 #2DB04A, 0 7px 20px rgba(0,0,0,0.04)":"0 2px 8px rgba(0,0,0,0.025)"}}>
                    <div onClick={()=>toggleTrendingRow(rowKey)} role="button" aria-expanded={expanded} style={{display:"grid",gridTemplateColumns:"28px minmax(0,1fr) 38px",gap:"10px",alignItems:"center",cursor:"pointer"}}>
                      <div style={{fontFamily:F,fontSize:"18px",fontWeight:900,color:"#8E948D",textAlign:"center"}}>{i+1}</div>
                      <div style={{minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}><strong style={{fontSize:"15px",lineHeight:1.2,overflowWrap:"anywhere"}}>{p.t}</strong>{getCertificationForEntry(p,isSingles?"single":"album")&&<CertificationTag cert={getCertificationForEntry(p,isSingles?"single":"album")} compact />}</div>
                        <div style={{fontFamily:F,fontSize:"11.5px",fontWeight:850,color:"#2DB04A",marginTop:"5px"}}>↑ Up {p.places} {p.places===1?"place":"places"}{p.consecutive?" · climbing 2+ months":""}</div>
                      </div>
                      <button type="button" onClick={(event)=>{event.stopPropagation();toggleTrendingRow(rowKey);}} aria-label={expanded?"Hide rank movement details":"Show rank movement details"} aria-expanded={expanded} style={{width:"38px",height:"34px",border:"1px solid rgba(0,0,0,0.08)",borderRadius:"14px",background:"#FBFAF7",color:"#555",fontSize:"18px",fontWeight:900,lineHeight:1,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:"0 0 2px"}}>{expanded?"▴":"▾"}</button>
                    </div>
                    {expanded&&<div style={{marginTop:"13px",padding:"13px",borderRadius:"13px",background:"#F7FBF7",border:"1px solid #2DB04A18"}}>
                      <div style={{fontFamily:F,fontSize:"12px",fontWeight:750,color:"#59645D",lineHeight:1.5}}>{p.a}</div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:"8px",marginTop:"10px"}}>
                        {[{l:"Previous Rank",v:`#${p.fromRank}`},{l:`${latestMonthShort} Rank`,v:`#${p.decRank}`},{l:"Places Gained",v:`+${p.places}`},{l:"Rank Path",v:(p.trend||[]).map(v=>v?`#${v}`:"—").join(" → ")}].map(s=><div key={s.l} style={{padding:"9px 6px",background:"#FFF",borderRadius:"10px",textAlign:"center",minWidth:0}}><span style={{display:"block",fontFamily:F,fontSize:"8.5px",fontWeight:900,letterSpacing:"1px",textTransform:"uppercase",color:"#7B857D"}}>{s.l}</span><strong style={{display:"block",marginTop:"4px",fontFamily:F,fontSize:"12px",overflowWrap:"anywhere",color:s.l==="Places Gained"?"#2DB04A":"#1A1A1A"}}>{s.v}</strong></div>)}
                      </div>
                      <button type="button" onClick={()=>openMomentumRelease(p)} style={{marginTop:"10px",width:"100%",padding:"9px 10px",borderRadius:"11px",border:"1px solid #2DB04A33",background:"#FFF",color:"#258A3D",fontFamily:F,fontSize:"10px",fontWeight:900,letterSpacing:"1px",textTransform:"uppercase",cursor:"pointer"}}>View Details</button>
                    </div>}
                  </div>
                );
                return(
                  <div key={`${p.t}-${p.a}-${p.decRank}`} style={{display:"grid",gridTemplateColumns:"34px minmax(0,1fr) 114px 92px 14px",gap:"12px",alignItems:"center",padding:"12px 4px",margin:0,borderBottom:"1px solid #F2F2EE",borderRadius:"8px",boxSizing:"border-box",overflow:"hidden"}}
                    onMouseEnter={e=>e.currentTarget.style.background="#FAFAF6"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <div style={{fontFamily:F,fontSize:isMobile?"16px":"16px",fontWeight:850,color:"#8E948D",textAlign:"center",transform:isMobile?"translateX(2px)":"translateX(2px)"}}>{i+1}</div>
                    <div style={{minWidth:0,paddingLeft:isMobile?"2px":"2px",boxSizing:"border-box"}}>
                      <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap",minWidth:0}}>
                        <button type="button" onClick={()=>openMomentumRelease(p)} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:isMobile?"15px":"15px",fontWeight:800,lineHeight:1.15,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",cursor:"pointer",textAlign:"left"}}>{p.t}</button>
                        {getCertificationForEntry(p, isSingles ? "single" : "album")&&<CertificationTag cert={getCertificationForEntry(p, isSingles ? "single" : "album")} compact />}
                      </div>
                      <div style={{fontSize:isMobile?"12px":"12px",color:"#69716B",fontFamily:F,marginTop:"4px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.a} · #{p.fromRank} → #{p.decRank}{p.consecutive?" · climbing 2+ months":""}</div>
                    </div>
                    <TrendBars trend={p.trend} compact height={30}/>
                    <div style={{textAlign:"right",fontFamily:F}}><span style={{fontSize:"15px",fontWeight:900,color:"#2DB04A"}}>+{p.places}</span><div style={{fontSize:"10px",color:"#7B857D",letterSpacing:"1px",textTransform:"uppercase",fontWeight:800}}>places</div></div>
                    <div style={{fontFamily:F,fontSize:"16px",fontWeight:800,color:"#B6BDB7",textAlign:"right"}}>›</div>
                  </div>
                );
              })}
              <div style={{padding:"13px 0 0",fontFamily:F,fontSize:isMobile?"11px":"11px",color:"#6E746F",textAlign:"center",lineHeight:1.55}}>{formulaLabel} · Bars show {trendLabelText} rank strength.</div>
            </div>

            {/* Strong Debuts */}
            <div style={{...card({padding:isMobile?"18px":"22px"}),marginTop:isMobile?"16px":"20px"}}>
              <div style={secLbl("#1565C0")}><SecMark c="#1565C0"/>Strongest {latestMonthName} Debuts</div>
              <p style={{fontFamily:F,fontSize:isMobile?"12px":"11px",color:"#69716B",margin:"-8px 0 14px",lineHeight:1.45}}>New entries that arrived high in {latestMonth}.</p>
              <div className="anl-grid-3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:isMobile?"8px":"10px"}}>
                {uniqueByMomentumIdentity(currentTrending.debuts).map((p)=>{
                  const rowKey=`debut-${p.t}-${p.a}-${p.decRank}`;
                  const expanded=Boolean(expandedTrendingRows[rowKey]);
                  if(isMobile)return <div key={rowKey} style={{padding:"14px 15px",background:"#F8FAFD",borderRadius:"14px",border:"1px solid #1565C022",boxShadow:expanded?"inset 4px 0 0 #1565C0":"none"}}>
                    <div onClick={()=>toggleTrendingRow(rowKey)} role="button" aria-expanded={expanded} style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 38px",gap:"10px",alignItems:"center",cursor:"pointer"}}>
                      <div style={{minWidth:0}}><strong style={{fontSize:"15px",lineHeight:1.2,overflowWrap:"anywhere"}}>{p.t}</strong><div style={{fontFamily:F,fontSize:"11.5px",fontWeight:850,color:"#1565C0",marginTop:"5px"}}>New at #{p.decRank}</div></div>
                      <button type="button" onClick={(event)=>{event.stopPropagation();toggleTrendingRow(rowKey);}} aria-label={expanded?"Hide debut details":"Show debut details"} aria-expanded={expanded} style={{width:"38px",height:"34px",border:"1px solid rgba(0,0,0,0.08)",borderRadius:"14px",background:"#FFF",color:"#555",fontSize:"18px",fontWeight:900,lineHeight:1,cursor:"pointer"}}>{expanded?"▴":"▾"}</button>
                    </div>
                    {expanded&&<div style={{marginTop:"12px",padding:"12px",background:"#FFF",borderRadius:"12px",fontFamily:F}}><div style={{fontSize:"12px",fontWeight:750,color:"#59645D"}}>{p.a}</div><div style={{display:"flex",justifyContent:"space-between",gap:"12px",marginTop:"8px",fontSize:"12px"}}><span>First Combined appearance</span><strong style={{color:"#1565C0"}}>#{p.decRank}</strong></div><button type="button" onClick={()=>openMomentumRelease(p)} style={{marginTop:"10px",width:"100%",padding:"9px 10px",borderRadius:"11px",border:"1px solid #1565C033",background:"#F8FAFD",color:"#1565C0",fontFamily:F,fontSize:"10px",fontWeight:900,letterSpacing:"1px",textTransform:"uppercase",cursor:"pointer"}}>View Details</button></div>}
                  </div>;
                  return(
                  <div key={`${p.t}-${p.a}-${p.decRank}`} style={{padding:"14px",background:"#F5F8FC",borderRadius:"10px",border:"1px solid #1565C022",display:"grid",gridTemplateColumns:"1fr auto",gap:"8px",alignItems:"center"}}
                    onMouseEnter={e=>e.currentTarget.style.background="#EEF5FF"} onMouseLeave={e=>e.currentTarget.style.background="#F5F8FC"}>
                    <div style={{minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap",minWidth:0}}>
                        <button type="button" onClick={()=>openMomentumRelease(p)} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:isMobile?"15px":"15px",fontWeight:800,lineHeight:1.15,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",cursor:"pointer",textAlign:"left"}}>{p.t}</button>
                        {getCertificationForEntry(p, isSingles ? "single" : "album")&&<CertificationTag cert={getCertificationForEntry(p, isSingles ? "single" : "album")} compact />}
                      </div>
                      <div style={{fontSize:isMobile?"12px":"12px",color:"#69716B",fontFamily:F,marginTop:"4px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.a} · First Combined appearance</div>
                    </div>
                    <span style={{fontFamily:F,fontSize:isMobile?"16px":"16px",fontWeight:900,color:"#1565C0"}}>#{p.decRank}</span>
                  </div>);
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RECORDS & MILESTONES PAGE */}
      {page==="records"&&!selA&&!selR&&(
        <div style={{padding:PAD,minHeight:"60vh",boxSizing:"border-box",overflow:"hidden"}}>
          <div style={{marginBottom:isMobile?"18px":"22px"}}>
            <div style={{maxWidth:isMobile?"100%":"620px"}}>
              <div style={{fontFamily:F,fontSize:TXT.kicker,letterSpacing:"2.6px",textTransform:"uppercase",color:GOLD,marginBottom:"6px"}}>THE RECORD BOOK</div>
              <h2 style={{fontSize:TXT.pageTitle,fontWeight:800,margin:0}}>Records & Milestones</h2>
              <p style={{fontFamily:F,fontSize:TXT.lead,color:"#59645D",margin:"4px 0 0",lineHeight:1.55}}>{chartTypeLabel} achievements across all tracked months · the chart's defining moments</p>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:isMobile?"10px":"12px",marginTop:isMobile?"14px":"16px",flexWrap:"wrap"}}>
              <Tog sm/>
            </div>
          </div>
          <div className="anl-grid-3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:isMobile?"14px":"16px"}}>
            {currentRecords.map((r,i)=>{
              const expanded = r.isCoverage && openRecord === i;
              const recordCertification = r.certificationEntry ? getCertificationForEntry(r.certificationEntry, isSingles ? "single" : "album") : null;
              return (
                <div key={`${r.displayLabel}-${r.value}`} onClick={()=>{if(r.isCoverage)setOpenRecord(expanded?null:i);}} style={{...card({padding:isMobile?"19px":"24px"}),position:"relative",overflow:"hidden",cursor:r.isCoverage?"pointer":"default",gridColumn:expanded?"1 / -1":"auto"}}>
                  <div style={{position:"absolute",top:isMobile?"8px":"12px",right:isMobile?"10px":"14px",opacity:1}}><RecordIcon label={r.displayLabel} size={isMobile?54:66} muted /></div>
                  <div style={{marginBottom:"13px",position:"relative",zIndex:1}}><RecordIcon label={r.displayLabel} size={isMobile?28:30} /></div>
                  <div style={{fontFamily:F,fontSize:isMobile?"10px":"10.5px",fontWeight:850,letterSpacing:"2px",textTransform:"uppercase",color:GOLD,marginBottom:"9px",position:"relative",zIndex:1,lineHeight:1.35}}>{r.displayLabel}</div>
                  {r.certificationEntry ? <button type="button" onClick={(event)=>{event.stopPropagation();openReleaseDetails(r.certificationEntry,isSingles?"single":"album");}} style={{display:"block",border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:isMobile?"20px":"21px",fontWeight:850,lineHeight:1.12,marginBottom:recordCertification?"7px":"5px",position:"relative",zIndex:1,cursor:"pointer",textAlign:"left"}}>{r.value}</button> : <div style={{fontFamily:SF,fontSize:isMobile?"20px":"21px",fontWeight:850,lineHeight:1.12,marginBottom:"5px",position:"relative",zIndex:1}}>{r.value}</div>}
                  {recordCertification&&<CertificationTag cert={recordCertification} compact style={{marginBottom:"8px",position:"relative",zIndex:1}} />}
                  <div style={{fontFamily:F,fontSize:isMobile?"13px":"13px",color:"#59645D",lineHeight:1.45,position:"relative",zIndex:1,display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap"}}>
                    <span>{r.displaySub}</span>
                    {r.climbDelta&&<span style={{display:"inline-flex",alignItems:"center",padding:"2px 7px",borderRadius:"999px",background:"#EAF8EF",color:"#1E8E3E",fontSize:"10px",fontWeight:900,letterSpacing:"0.4px"}}>+{r.climbDelta}</span>}
                  </div>
                  {r.isCoverage&&(
                    <div style={{fontFamily:F,fontSize:isMobile?"10.5px":"10.5px",color:GOLD,fontWeight:800,letterSpacing:"0.5px",marginTop:"12px",position:"relative",zIndex:1}}>{expanded?`Hide ${releaseLabelLower}`:`View ${releaseLabelLower}`}</div>
                  )}
                  {expanded&&(
                    <div style={{marginTop:"12px",paddingTop:"12px",borderTop:"1px solid #F0EEE8",position:"relative",zIndex:1,display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(2,minmax(0,1fr))",columnGap:"22px"}}>
                      {fullCoverageClub.length?fullCoverageClub.map((song,idx)=>{
                        const certification = getCertificationForEntry(song, isSingles ? "single" : "album");
                        return (
                        <div key={`${song.title}-${song.artist}`} style={{display:"grid",gridTemplateColumns:"22px minmax(0,1fr)",gap:"8px",alignItems:"start",padding:"8px 6px",fontFamily:F,borderBottom:"1px solid #F2F0EA",borderRadius:"7px"}}>
                          <span style={{fontSize:"10px",fontWeight:900,color:GOLD}}>#{idx+1}</span>
                          <span style={{minWidth:0}}>
                            <span style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
                              <button type="button" onClick={(event)=>{event.stopPropagation();openReleaseDetails(song,isSingles?"single":"album");}} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:"12px",fontWeight:850,color:"#1A1A1A",cursor:"pointer",textAlign:"left"}}>{song.title}</button>
                              {certification&&<CertificationTag cert={certification} compact />}
                            </span>
                            <span style={{display:"block",fontSize:"11px",color:"#59645D",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{song.artist} · {song.month}</span>
                          </span>
                        </div>
                        );
                      }):<div style={{fontFamily:F,fontSize:"12px",color:"#59645D"}}>No full-coverage entries found for this view.</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* YEAR-END PAGE */}
      {page==="year-end"&&!selA&&!selR&&(
        <div style={{padding:PAD,background:"#FFF",minHeight:"60vh",boxSizing:"border-box",overflow:"hidden"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:isMobile?"stretch":"flex-end",marginBottom:isMobile?"16px":"20px",gap:isMobile?"12px":"20px",flexDirection:isMobile?"column":"row"}}>
            <div>
              <div style={{fontFamily:F,fontSize:isMobile?"10.5px":"11px",letterSpacing:isMobile?"1.8px":"2px",textTransform:"uppercase",color:GOLD,marginBottom:"6px",fontWeight:850}}>ANNUAL CHART</div>
              <h2 style={{fontSize:TXT.pageTitle,fontWeight:800,margin:0}}>Best of the Year</h2>
              <p style={{fontFamily:F,fontSize:TXT.lead,color:"#59645D",margin:"4px 0 0",lineHeight:1.55}}>Aggregated Display Points across {DATA_PERIOD}</p>
            </div>
            <div className="year-end-actions" data-share-action-area="true" style={{display:"flex",alignItems:"center",gap:isMobile?"10px":"12px",flexWrap:"wrap",position:isMobile?"sticky":"static",top:isMobile?"0":"auto",zIndex:isMobile?5:"auto",background:isMobile?"#FFF":"transparent",padding:isMobile?"8px 0 4px":"0"}}>
              <Tog sm/>
            </div>
          </div>

          {/* Podium */}
          {(()=>{
            const podiumItems = isMobile
              ? [
                  { e: yearEnd[0], pos: 1, medal: GOLD, featured: true },
                  { e: yearEnd[1], pos: 2, medal: SILVER, featured: false },
                  { e: yearEnd[2], pos: 3, medal: BRONZE, featured: false },
                ]
              : [
                  { e: yearEnd[1], pos: 2, medal: SILVER, featured: false },
                  { e: yearEnd[0], pos: 1, medal: GOLD, featured: true },
                  { e: yearEnd[2], pos: 3, medal: BRONZE, featured: false },
                ];
            return (
              <div className="podium-grid" style={{display:"grid",gridTemplateColumns:"1fr 1.2fr 1fr",gap:isMobile?"10px":"12px",marginBottom:isMobile?"20px":"24px",alignItems:"end"}}>
                {podiumItems.map(({e,pos,medal,featured},i)=>{
                  if(!e)return <div key={i}/>;
                  const certification = getCertificationForEntry(e, isSingles ? "single" : "album");
                  return(<div key={`${pos}-${e.t}-${e.a}`} style={{textAlign:"center"}}>
                    <div style={{background:featured?"linear-gradient(180deg,#FFF9E8 0%,#FFFDF8 100%)":medal+"12",border:(featured?"2.5px":"2px")+" solid "+medal,borderRadius:isMobile?"12px":"13px",padding:featured?(isMobile?"18px 12px":"18px 14px"):(isMobile?"15px 12px":"16px 12px"),boxShadow:featured?"0 14px 36px rgba(184,134,11,0.16)":"none",transform:(!isMobile&&featured)?"translateY(-2px)":"none"}}>
                      <div style={{fontSize:featured?(isMobile?"33px":"38px"):"32px",fontWeight:950,color:medal,lineHeight:1}}>#{pos}</div>
                      <CountryBadge artist={e.a} style={{margin:"10px auto 0",minWidth:isMobile?"34px":"38px",height:isMobile?"30px":"34px",borderRadius:"11px",padding:"0 7px"}} />
                      <button type="button" onClick={()=>openReleaseDetails(e,isSingles?"single":"album")} style={{display:"block",width:"100%",border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:featured?(isMobile?"16px":"16px"):TXT.cardTitle,fontWeight:850,margin:"8px 0 4px",lineHeight:1.18,cursor:"pointer"}}>{e.t}</button>
                      <button type="button" onClick={(event)=>{event.stopPropagation();openArtistDetails(e.a);}} style={{display:"block",width:"100%",fontSize:TXT.cardMeta,color:"#59645D",fontFamily:F,fontWeight:750,marginBottom:"6px",padding:0,border:0,background:"transparent",cursor:"pointer"}}>{e.a}</button>
                      {certification&&<CertificationTag cert={certification} compact style={{margin:"0 auto 8px"}} />}
                      <div style={{fontSize:featured?(isMobile?"18px":"20px"):"18px",fontWeight:850,color:medal}}>{e.totalPts.toLocaleString()}</div>
                    </div>
                  </div>);
                })}
              </div>
            );
          })()}

          {/* Full list */}
          {isMobile ? (
            <div style={{display:"grid",gap:"10px"}}>
              {yearEnd.slice(0,50).map((item,idx)=>{
                const rowKey = `${item.t}-${item.a}-${idx}`;
                const expanded = Boolean(expandedYearEndRows[rowKey]);
                const t3 = idx < 3;
                const medalColor = t3 ? MEDALS[idx] : "#050505";
                const itemTypeLabel = isSingles ? "Single" : "Album";
                const certification = getCertificationForEntry(item, isSingles ? "single" : "album");
                const statItems = [
                  { label:"Total Pts", value:item.totalPts.toLocaleString() },
                  { label:"Months", value:item.months },
                  { label:"Year-End Rank", value:`#${idx+1}` },
                  { label:"Type", value:itemTypeLabel },
                  ...(certification ? [{ label:"Certification", value:certification.label }] : []),
                ];

                return(
                  <div
                    key={rowKey}
                    style={{
                      padding:"15px 16px",
                      border:"1px solid rgba(0,0,0,0.08)",
                      borderRadius:"16px",
                      background:"#FFF",
                      color:"#050505",
                      boxShadow:expanded ? "inset 4px 0 0 #C89116, 0 8px 22px rgba(0,0,0,0.045)" : "0 2px 10px rgba(0,0,0,0.025)",
                      transition:"background 180ms ease, box-shadow 180ms ease, transform 180ms ease",
                    }}
                  >
                    <div
                      onClick={()=>toggleYearEndRow(rowKey)}
                      role="button"
                      aria-expanded={expanded}
                      style={{
                        display:"grid",
                        gridTemplateColumns:"34px minmax(0,1fr) 38px",
                        gap:"10px",
                        alignItems:"center",
                        cursor:"pointer",
                        minWidth:0,
                      }}
                    >
                      <div style={{fontSize:t3?"28px":"24px",fontWeight:950,lineHeight:1,color:medalColor,textAlign:"center",fontFamily:F}}>{idx+1}</div>

                      <div style={{display:"flex",alignItems:"center",gap:"11px",minWidth:0,maxWidth:"100%"}}>
                        <CountryBadge artist={item.a} style={{minWidth:"42px",width:"42px",height:"42px",borderRadius:"12px",padding:0,flexShrink:0}} />
                        <div style={{minWidth:0,flex:1}}>
                          <button
                            type="button"
                            onClick={(event)=>{event.stopPropagation();openReleaseDetails(item,isSingles?"single":"album");}}
                            style={{
                              display:"block",
                              width:"100%",
                              border:0,
                              background:"transparent",
                              padding:0,
                              margin:0,
                              textAlign:"left",
                              fontFamily:SF,
                              fontSize:t3?"15.5px":"15px",
                              fontWeight:850,
                              lineHeight:1.15,
                              color:"#050505",
                              whiteSpace:"nowrap",
                              overflow:"hidden",
                              textOverflow:"ellipsis",
                              cursor:"pointer",
                            }}
                          >
                            {item.t}
                          </button>
                          <button
                            type="button"
                            onClick={(event)=>{event.stopPropagation();openArtistDetails(item.a);}}
                            style={{
                              display:"block",
                              width:"100%",
                              border:0,
                              background:"transparent",
                              padding:0,
                              margin:"4px 0 0",
                              textAlign:"left",
                              fontFamily:F,
                              fontSize:"12.2px",
                              fontWeight:700,
                              lineHeight:1.35,
                              color:"#59645D",
                              whiteSpace:"nowrap",
                              overflow:"hidden",
                              textOverflow:"ellipsis",
                              cursor:"pointer",
                            }}
                          >
                            {item.a}
                          </button>
                          {certification&&<CertificationTag cert={certification} compact style={{marginTop:"6px"}} />}
                        </div>
                      </div>

                      <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:"6px",minWidth:0}}>
                        <button
                          type="button"
                          onClick={(event)=>{event.stopPropagation();toggleYearEndRow(rowKey);}}
                          aria-label={expanded ? "Hide year-end details" : "Show year-end details"}
                          aria-expanded={expanded}
                          style={{
                            width:"38px",
                            height:"34px",
                            border:"1px solid rgba(0,0,0,0.08)",
                            borderRadius:"14px",
                            background:"#FBFAF7",
                            color:"#555",
                            fontSize:"18px",
                            fontWeight:900,
                            lineHeight:1,
                            cursor:"pointer",
                            display:"flex",
                            alignItems:"center",
                            justifyContent:"center",
                            padding:"0 0 2px",
                            boxShadow:"0 2px 8px rgba(0,0,0,0.04)",
                          }}
                        >
                          {expanded ? "▴" : "▾"}
                        </button>
                      </div>
                    </div>

                    {expanded && (
                      <div style={{
                        marginTop:"14px",
                        padding:"14px 16px 12px",
                        border:"1px solid rgba(0,0,0,0.06)",
                        borderRadius:"16px",
                        background:"#FBFAF7",
                      }}>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:"8px"}}>
                          {statItems.map((stat)=>(
                            <div key={stat.label} style={{background:"#F7F7F7",border:"1px solid rgba(0,0,0,0.06)",borderRadius:"12px",padding:"8px 6px",minWidth:0,boxSizing:"border-box"}}>
                              <span style={{display:"block",fontFamily:F,fontSize:"9px",color:"#777",fontWeight:900,letterSpacing:"1px",textTransform:"uppercase",textAlign:"center"}}>{stat.label}</span>
                              <span style={{display:"block",marginTop:"4px",fontFamily:F,color:"#050505",fontSize:"12px",fontWeight:900,textAlign:"center",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{stat.value}</span>
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={()=>openReleaseDetails(item,isSingles?"single":"album")}
                          style={{
                            marginTop:"11px",
                            width:"100%",
                            border:"1px solid rgba(184,134,11,0.22)",
                            borderRadius:"13px",
                            background:"#FFF",
                            color:GOLD,
                            fontFamily:F,
                            fontSize:"10.5px",
                            fontWeight:900,
                            letterSpacing:"1px",
                            textTransform:"uppercase",
                            padding:"10px 12px",
                            cursor:"pointer",
                          }}
                        >
                          View {itemTypeLabel} Details
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{
              overflowX:"visible",
              overflowY:"hidden",
              WebkitOverflowScrolling:"touch",
              margin:"0",
              paddingBottom:"0"
            }}>
              <div style={{minWidth:"0",width:"100%"}}>
                <div style={{
                  display:"grid",
                  gridTemplateColumns:"54px minmax(0,1fr) 148px 92px",
                  columnGap:"30px",
                  padding:"11px 0",
                  borderBottom:"2px solid #1A1A1A",
                  fontFamily:F,
                  fontSize:"9px",
                  fontWeight:900,
                  letterSpacing:"1.8px",
                  textTransform:"uppercase",
                  color:"#4F5751",
                  alignItems:"end"
                }}>
                  <span style={{textAlign:"center"}}>#</span>
                  <span>TITLE</span>
                  <span style={{textAlign:"center",justifySelf:"stretch",whiteSpace:"nowrap"}}>TOTAL PTS</span>
                  <span style={{textAlign:"center",justifySelf:"stretch",whiteSpace:"nowrap"}}>MONTHS</span>
                </div>

                {yearEnd.slice(0,50).map((item,idx)=>{
                  const t3=idx<3;
                  const certification = getCertificationForEntry(item, isSingles ? "single" : "album");
                  return(
                    <div
                      key={item.t+item.a}
                      style={{
                        display:"grid",
                        gridTemplateColumns:"54px minmax(0,1fr) 148px 92px",
                        columnGap:"30px",
                        padding:t3?"13px 0":"9px 0",
                        borderBottom:"1px solid #F2F2EE",
                        alignItems:"center",
                        cursor:"default"
                      }}
                      onMouseEnter={e=>e.currentTarget.style.background="#FAFAF6"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                    >
                      <div style={{textAlign:"center",fontSize:t3?"20px":"13px",fontWeight:850,color:t3?MEDALS[idx]:"#BFC4BF"}}>{idx+1}</div>

                      <div style={{display:"flex",alignItems:"center",gap:"12px",minWidth:0}}>
                        <CountryBadge artist={item.a} style={{minWidth:"50px",width:"50px",height:"50px",borderRadius:"14px",padding:0,flexShrink:0}} />
                        <div style={{minWidth:0}}>
                          <div style={{
                            display:"flex",
                            alignItems:"center",
                            gap:"7px",
                            flexWrap:"wrap",
                            fontSize:t3?"14px":TXT.cardTitle,
                            fontWeight:850,
                            marginBottom:"1px",
                            lineHeight:1.15,
                            whiteSpace:"normal",
                            overflow:"visible",
                            textOverflow:"clip"
                          }}>
                            <button type="button" onClick={()=>openReleaseDetails(item,isSingles?"single":"album")} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:"inherit",fontWeight:"inherit",lineHeight:"inherit",cursor:"pointer",textAlign:"left"}}>{item.t}</button>
                            {certification&&<CertificationTag cert={certification} compact />}
                          </div>
                          <button type="button" onClick={(event)=>{event.stopPropagation();openArtistDetails(item.a);}} style={{
                            fontSize:TXT.cardMeta,
                            color:"#59645D",
                            fontFamily:F,
                            border:0,
                            background:"transparent",
                            padding:0,
                            textAlign:"left",
                            cursor:"pointer",
                            marginTop:"3px",
                            whiteSpace:"normal",
                            overflow:"visible",
                            textOverflow:"clip"
                          }}>
                            {item.a}
                          </button>
                        </div>
                      </div>

                      <div style={{
                        textAlign:"center",
                        justifySelf:"stretch",
                        fontFamily:F,
                        fontSize:t3?"14px":TXT.cardMeta,
                        fontWeight:850,
                        color:t3?GOLD:"#59645D",
                        whiteSpace:"nowrap"
                      }}>
                        {item.totalPts.toLocaleString()}
                      </div>

                      <div style={{
                        textAlign:"center",
                        justifySelf:"stretch",
                        fontFamily:F,
                        fontSize:"11px",
                        color:"#7B817B",
                        fontWeight:750,
                        whiteSpace:"nowrap"
                      }}>
                        {item.months}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CERTIFICATIONS PAGE */}
      {page==="certifications"&&!selA&&!selR&&(
        <div style={{padding:PAD,background:"#FFF",minHeight:"60vh",boxSizing:"border-box",overflow:"hidden"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:isMobile?"stretch":"flex-end",marginBottom:"24px",gap:isMobile?"12px":"20px",flexDirection:isMobile?"column":"row"}}>
            <div>
              <h2 style={{fontSize:TXT.pageTitle,fontWeight:800,margin:"0 0 4px"}}>Certifications</h2>
              <p style={{fontFamily:F,fontSize:TXT.lead,color:"#69716B",margin:0,lineHeight:1.55}}>Awarded from cumulative Combined chart points earned across every month a song or album appears.</p>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:isMobile?"10px":"12px",flexWrap:"wrap"}}>
              <Tog sm/>
            </div>
          </div>
          <div className="anl-grid-3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px",marginBottom:"28px"}}>
            {CERTIFICATION_LEVELS.map((c,i)=>(
              <div key={i} style={{...card({textAlign:"center"}),borderTop:"3px solid "+c.color}}>
                <div style={{fontSize:"28px"}}>{c.icon}</div>
                <div style={{fontWeight:800,fontSize:TXT.metric,margin:"6px 0 2px",color:c.color}}>{c.label}</div>
                <div style={{fontFamily:F,fontSize:TXT.cardMeta,color:"#69716B"}}>{c.pts.toLocaleString()}+ points</div>
              </div>
            ))}
          </div>
          <div style={{marginTop:"16px"}}>
            {CERTIFICATION_LEVELS.map(({ level })=>{
              const filtered=certs.filter(c=>c.level===level);
              if(!filtered.length)return null;
              return(<div key={level} style={{marginBottom:"24px"}}>
                <div style={{...secLbl(certColors[level]),marginBottom:"12px"}}>{certIcons[level]} {level.charAt(0).toUpperCase()+level.slice(1)} Certified ({filtered.length})</div>
                <div className="anl-grid-2" style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"8px"}}>
                  {filtered.map((c,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:"12px",padding:"12px 14px",background:certColors[level]+"0A",borderRadius:"8px",border:"1px solid "+certColors[level]+"22"}}>
                      <div style={{fontSize:"22px"}}>{certIcons[level]}</div>
                      <div style={{flex:1}}>
                        <button type="button" onClick={()=>openReleaseDetails(c,isSingles?"single":"album")} style={{display:"block",border:0,background:"transparent",padding:0,fontFamily:SF,fontWeight:800,fontSize:TXT.cardTitle,lineHeight:1.18,cursor:"pointer",textAlign:"left"}}>{c.t}</button>
                        <button type="button" onClick={(event)=>{event.stopPropagation();openArtistDetails(c.a);}} style={{display:"block",fontFamily:F,fontSize:TXT.cardMeta,color:"#69716B",fontWeight:750,marginTop:"3px",padding:0,border:0,background:"transparent",cursor:"pointer",textAlign:"left"}}>{c.a}</button>
                        <CountryBadge artist={c.a} showName style={{marginTop:"7px"}} />
                      </div>
                      <div style={{textAlign:"right",fontFamily:F}}>
                        <div style={{fontSize:"13px",fontWeight:700,color:certColors[level]}}>{c.totalPts.toLocaleString()}</div>
                        <div style={{fontSize:"9px",color:"#CCC"}}>pts</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>);
            })}
            {!certs.length&&<div style={{padding:"40px",textAlign:"center",fontFamily:F,color:"#CCC"}}>No certifications yet</div>}
          </div>
        </div>
      )}

      {/* NEWS PAGE */}
      {page==="news"&&!selNews&&!selA&&!selR&&(
        <div style={{padding:PAD,background:"transparent",minHeight:"60vh",boxSizing:"border-box",overflow:"hidden",maxWidth:"1040px",margin:"0 auto"}}>
          <h2 style={{fontSize:TXT.pageTitle,fontWeight:800,margin:"0 0 4px"}}>Chart News</h2>
          <p style={{fontFamily:F,fontSize:isMobile?"11.5px":TXT.lead,color:"#59645D",margin:isMobile?"0 0 20px":"0 0 24px",lineHeight:1.6}}>Analysis and stories from Kenya's music charts</p>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(2,minmax(0,1fr))",gap:isMobile?"18px":"16px"}}>
            {NEWS.map((n,i)=>{
              return (
              <div key={n.id} onClick={()=>setSelNews(n)} style={{...card({cursor:"pointer",padding:isMobile?"15px 16px":"20px",transition:"transform .2s ease, box-shadow .2s ease",gridColumn:!isMobile&&i===0?"1 / -1":"auto"}),...((i===0)?{background:"#FAF5EA",borderColor:GOLD+"44"}:{})}}
                onMouseEnter={e=>{if(!isMobile){e.currentTarget.style.boxShadow="0 12px 30px rgba(31,36,31,0.10)";e.currentTarget.style.transform="translateY(-2px)";}}}
                onMouseLeave={e=>{e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,0.02),0 8px 24px rgba(0,0,0,0.02)";e.currentTarget.style.transform="none";}}>
                <div style={{display:"flex",gap:isMobile?"10px":"14px",alignItems:"center",minWidth:0}}>
                  {i===0&&n.emoji&&<div style={{fontSize:isMobile?"27px":"34px",flexShrink:0,alignSelf:"flex-start"}}>{n.emoji}</div>}
                  <div style={{flex:1,minWidth:0,maxWidth:!isMobile&&i===0?"780px":"none"}}>
                    <div style={{display:"flex",gap:"8px",alignItems:"center",marginBottom:isMobile?"8px":"7px",flexWrap:"wrap"}}>
                      <span style={{display:"inline-flex",alignItems:"center",height:"22px",fontFamily:F,fontSize:"9px",fontWeight:850,letterSpacing:"1.3px",textTransform:"uppercase",color:GOLD,background:"#F7EFD9",padding:"0 9px",borderRadius:"999px"}}>{n.cat}</span>
                      <span style={{fontFamily:F,fontSize:"10px",fontWeight:650,color:"#59645D"}}>{n.date}</span>
                    </div>
                    <h3 style={{fontSize:i===0?(isMobile?"16px":"18px"):TXT.cardTitle,fontWeight:800,margin:isMobile?"0 0 7px":"0 0 6px",lineHeight:1.28}}>{n.title}</h3>
                    <p style={{fontFamily:F,fontSize:TXT.body,color:"#59645D",margin:0,lineHeight:isMobile?1.68:1.6}}>{n.excerpt}</p>
                  </div>
                  <span aria-hidden="true" style={{fontFamily:F,fontSize:isMobile?"22px":"20px",color:"#A5ACA6",flexShrink:0,padding:isMobile?"8px 0 8px 4px":"6px 2px 6px 8px"}}>›</span>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}
      {page==="news"&&selNews&&!selA&&!selR&&(
        <div style={{padding:PAD,background:"#FFF",minHeight:"60vh",maxWidth:"680px",margin:"0 auto",boxSizing:"border-box",overflow:"hidden"}}>
          <span onClick={()=>setSelNews(null)} style={{fontFamily:F,fontSize:isMobile?"12px":"11px",color:GOLD,cursor:"pointer",letterSpacing:"1px",textTransform:"uppercase",fontWeight:600}}>← All News</span>
          <div style={{marginTop:"20px"}}>
            <div style={{display:"flex",gap:"10px",alignItems:"center",marginBottom:"12px",flexWrap:"wrap"}}>
              <span style={{fontFamily:F,fontSize:"9px",fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",color:GOLD,background:"#FAF5EA",padding:"2px 8px",borderRadius:"10px"}}>{selNews.cat}</span>
              <span style={{fontFamily:F,fontSize:"10px",fontWeight:650,color:"#59645D"}}>{selNews.date}</span>
            </div>
            <h1 style={{fontSize:isMobile?"24px":"26px",fontWeight:850,margin:"0 0 16px",lineHeight:1.18}}>{selNews.title}</h1>
            {selNews.body.split("\n\n").map((p,i)=><p key={i} style={{fontFamily:F,fontSize:isMobile?"14px":"14px",color:"#444",lineHeight:1.8,margin:"0 0 16px"}}>{p}</p>)}
          </div>
        </div>
      )}

      {/* ABOUT PAGE */}
      {page==="about"&&!selA&&!selR&&(
        <div style={{padding:PAD,background:"#FFF",minHeight:"60vh",boxSizing:"border-box",overflow:"hidden"}}>
          <h2 style={{fontSize:TXT.pageTitle,fontWeight:800,margin:"0 0 4px"}}>About Ngoma Charts</h2>
          <p style={{fontFamily:F,fontSize:TXT.lead,color:"#59645D",margin:"0 0 24px",lineHeight:1.6}}>Ngoma Charts' multi-platform music ranking system, launched October 2024.</p>
          <div className="anl-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px"}}>
            <div style={card()}>
              <h3 style={{fontFamily:F,fontSize:TXT.micro,fontWeight:800,letterSpacing:"2px",textTransform:"uppercase",color:GOLD,margin:"0 0 10px"}}>How It Works</h3>
              <p style={{fontSize:TXT.body,color:"#555F59",lineHeight:1.68,margin:0,fontFamily:F}}>Chart data is collected from major platforms and combined using the existing ranking method. Once the monthly Top 50 order is set, Combined results are displayed on a 50-to-1 scale. Movement arrows compare each entry with the previous month.</p>
              <div style={{marginTop:"15px",padding:"12px",background:"#FAF8F2",borderRadius:"12px",border:"1px solid #EDE6D6"}}>
                <div style={{height:"8px",borderRadius:"999px",background:"linear-gradient(90deg,#B8860B 0%,#E7C86C 48%,#E9E7E0 100%)"}}></div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:"7px",fontFamily:F,fontSize:"10px",fontWeight:850,color:"#59645D"}}><span>#1 = 50 pts</span><span>#50 = 1 pt</span></div>
              </div>
            </div>
            <div style={card()}>
              <h3 style={{fontFamily:F,fontSize:TXT.micro,fontWeight:800,letterSpacing:"2px",textTransform:"uppercase",color:GOLD,margin:"0 0 10px"}}>Platforms Tracked</h3>
              <div style={{display:"flex",flexWrap:"wrap",gap:"7px"}}>{[["Apple Music","#FC3C44"],["Audiomack","#F68B1F"],["Boomplay","#00FFFF"],["Spotify","#1DB954"],["YouTube","#FF0000"],["Shazam","#0088FF"]].map(([p,c])=><span key={p} style={{display:"inline-flex",alignItems:"center",minHeight:"28px",padding:"5px 10px",background:c+"18",borderRadius:"999px",fontSize:TXT.note,fontFamily:F,fontWeight:750,color:p==="Boomplay"?"#007C7C":c,border:`1px solid ${c}35`}}>{p}</span>)}</div>
            </div>
            <div style={card()}>
              <h3 style={{fontFamily:F,fontSize:TXT.micro,fontWeight:800,letterSpacing:"2px",textTransform:"uppercase",color:GOLD,margin:"0 0 10px"}}>Singles Chart</h3>
              <p style={{fontSize:TXT.body,color:"#555F59",lineHeight:1.65,margin:"0 0 13px",fontFamily:F}}>The singles chart combines performance across all six tracked platforms.</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>{["Apple Music","Audiomack","Boomplay","Spotify","YouTube","Shazam"].map(p=><span key={p} style={{padding:"5px 9px",borderRadius:"9px",background:"#F7F6F2",border:"1px solid #E9E6DE",fontFamily:F,fontSize:"9.5px",fontWeight:800,color:"#4F5751"}}>{p}</span>)}</div>
            </div>
            <div style={card()}>
              <h3 style={{fontFamily:F,fontSize:TXT.micro,fontWeight:800,letterSpacing:"2px",textTransform:"uppercase",color:GOLD,margin:"0 0 10px"}}>Albums Chart</h3>
              <p style={{fontSize:TXT.body,color:"#555F59",lineHeight:1.65,margin:"0 0 13px",fontFamily:F}}>Album rankings are based on Apple Music and Audiomack. Their platform data determines the Combined order, which is then displayed on the same 50-to-1 scale as singles.</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:"7px"}}><span style={{padding:"6px 10px",borderRadius:"9px",background:"#FC3C4412",border:"1px solid #FC3C4435",fontFamily:F,fontSize:"9.5px",fontWeight:850,color:"#FC3C44"}}>Apple Music</span><span style={{padding:"6px 10px",borderRadius:"9px",background:"#F68B1F12",border:"1px solid #F68B1F35",fontFamily:F,fontSize:"9.5px",fontWeight:850,color:"#D66E00"}}>Audiomack</span></div>
            </div>
            <div style={card()}>
              <h3 style={{fontFamily:F,fontSize:TXT.micro,fontWeight:800,letterSpacing:"2px",textTransform:"uppercase",color:GOLD,margin:"0 0 10px"}}>Certifications</h3>
              <div style={{display:"grid",gap:"8px"}}>{CERTIFICATION_LEVELS.map(level=><div key={level.level} style={{display:"grid",gridTemplateColumns:"30px minmax(0,1fr) auto",gap:"9px",alignItems:"center",padding:"9px 10px",borderRadius:"11px",background:`${level.color}0B`,border:`1px solid ${level.color}25`}}><span style={{fontSize:"18px",textAlign:"center"}}>{level.icon}</span><strong style={{fontFamily:F,fontSize:"11px",color:level.color}}>{level.label}</strong><span style={{fontFamily:F,fontSize:"10px",fontWeight:800,color:"#59645D"}}>{level.pts.toLocaleString()}+ pts</span></div>)}</div>
            </div>
            <div style={card()}>
              <h3 style={{fontFamily:F,fontSize:TXT.micro,fontWeight:800,letterSpacing:"2px",textTransform:"uppercase",color:GOLD,margin:"0 0 10px"}}>Hall of Fame</h3>
              <p style={{fontSize:TXT.body,color:"#555F59",lineHeight:1.68,margin:0,fontFamily:F}}>Songs and albums that reach #1 on the Combined chart enter the Hall of Fame. The monthly leaders below cover the complete {DATA_PERIOD} dataset.</p>
            </div>
          </div>
          {/* Hall of Fame */}
          <div style={{...card({marginTop:"14px"}),background:"#FAF5EA",borderColor:GOLD+"44"}}>
            <h3 style={{fontFamily:F,fontSize:"10px",fontWeight:700,letterSpacing:"2px",textTransform:"uppercase",color:GOLD,margin:"0 0 14px"}}>{isMobile?"Monthly #1s":"Hall of Fame — Monthly #1s"}</h3>
            <div className="anl-grid-3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"10px"}}>
              {hof.map((e,i)=>(
                <div key={i} style={{padding:"12px",background:"#FFF",borderRadius:"8px",border:"1px solid "+GOLD+"33"}}>
                  <div style={{fontFamily:F,fontSize:"9px",letterSpacing:"1.5px",textTransform:"uppercase",color:GOLD,marginBottom:"4px"}}>{e.month} · {e.type}</div>
                  <button type="button" onClick={()=>openReleaseDetails(e,e.type)} style={{display:"block",border:0,background:"transparent",padding:0,fontFamily:SF,fontWeight:800,fontSize:TXT.cardTitle,marginBottom:"2px",lineHeight:1.2,cursor:"pointer",textAlign:"left"}}>{e.title}</button>
                  <div style={{fontFamily:F,fontSize:TXT.cardMeta,color:"#69716B"}}>{e.artist}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{display:"flex",justifyContent:"center",marginTop:"18px"}}><button type="button" onClick={()=>navTo("charts")} style={{padding:"12px 18px",borderRadius:"999px",border:"1px solid #B8860B55",background:"#B8860B",color:"#FFF",fontFamily:F,fontSize:"10.5px",fontWeight:900,letterSpacing:"1.2px",textTransform:"uppercase",cursor:"pointer",boxShadow:"0 8px 20px rgba(184,134,11,0.18)"}}>Explore Current Charts</button></div>
          {/* Brand */}
          <div style={{marginTop:"18px",padding:"20px",background:"#FAF5EA",border:"1px solid #E8DDBF",borderRadius:"14px",color:"#1A1A1A"}}>
            <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
              <svg width="20" height="22" viewBox="0 0 22 24" style={{flexShrink:0}}>
                <rect x="0" y="15" width="3.5" height="9" fill="#1A1A1A" rx="0.5"/>
                <rect x="5.5" y="10" width="3.5" height="14" fill="#1A1A1A" rx="0.5"/>
                <rect x="11" y="5" width="3.5" height="19" fill="#B8860B" rx="0.5"/>
                <rect x="16.5" y="0" width="3.5" height="24" fill="#1A1A1A" rx="0.5"/>
              </svg>
              <span style={{fontFamily:F,fontSize:"13px",fontWeight:800,letterSpacing:"2.5px",color:"#1A1A1A",textTransform:"uppercase"}}>Ngoma <span style={{color:"#B8860B"}}>Charts</span></span>
            </div>
            <p style={{fontFamily:F,fontSize:"11.5px",color:"#59645D",margin:"10px 0 0",lineHeight:1.65}}>"Ngoma" means music or drum in Swahili: the heartbeat of Kenyan culture. Transparent, data-driven rankings celebrate the artists making an impact in Kenya.</p>
          </div>
        </div>
      )}

      </main>

      {/* FOOTER */}
      <footer style={{padding:isMobile?"32px 18px 36px":"22px 28px",borderTop:"3px solid #1A1A1A",background:"#1A1A1A",fontFamily:F,boxSizing:"border-box",overflow:"hidden"}}>
        <div style={{...pageFrame(),display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:isMobile?"18px":"14px",flexDirection:isMobile?"column":"row",textAlign:isMobile?"center":"left"}}>
          <div onClick={()=>navTo("charts")} style={{display:"flex",alignItems:"center",gap:"9px",cursor:"pointer"}}>
            <svg width="16" height="18" viewBox="0 0 22 24" style={{flexShrink:0}}>
              <rect x="0" y="15" width="3.5" height="9" fill="#FFF" rx="0.5"/>
              <rect x="5.5" y="10" width="3.5" height="14" fill="#FFF" rx="0.5"/>
              <rect x="11" y="5" width="3.5" height="19" fill="#B8860B" rx="0.5"/>
              <rect x="16.5" y="0" width="3.5" height="24" fill="#FFF" rx="0.5"/>
            </svg>
            <span style={{fontFamily:F,fontSize:isMobile?"12px":"11px",fontWeight:800,letterSpacing:"2.5px",color:"#FFF",textTransform:"uppercase"}}>Ngoma <span style={{color:"#B8860B"}}>Charts</span></span>
          </div>
          <div style={{display:"flex",gap:isMobile?"10px":"14px",alignItems:"center",justifyContent:"center"}}>
            {[
              {label:"Facebook", href:"https://www.facebook.com/ngomacharts",
               path:"M14 8.5h2V5.8h-2.4C11.5 5.8 10.5 7 10.5 9v1.5H8.7V13h1.8v6h2.6v-6h2l.3-2.5h-2.3V9.1c0-.4.2-.6.7-.6Z"},
              {label:"X", href:"https://x.com/Ngoma_Charts",
               path:"M16.8 5h2.2l-4.8 5.5L20 19h-4.4l-3.5-4.6L8 19H5.8l5.1-5.9L5 5h4.5l3.1 4.2L16.8 5Zm-.8 12.6h1.2L9.1 6.3H7.8L16 17.6Z"},
              {label:"Instagram", href:"https://www.instagram.com/ngoma_charts/",
               path:"M12 7.3A4.7 4.7 0 1012 16.7 4.7 4.7 0 0012 7.3Zm0 7.7a3 3 0 110-6 3 3 0 010 6Zm4.9-7.9a1.1 1.1 0 11-2.2 0 1.1 1.1 0 012.2 0ZM16.5 5h-9A2.5 2.5 0 005 7.5v9A2.5 2.5 0 007.5 19h9a2.5 2.5 0 002.5-2.5v-9A2.5 2.5 0 0016.5 5Z"},
            ].map(s=>(
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                 style={{display:"flex",alignItems:"center",justifyContent:"center",width:isMobile?"44px":"38px",height:isMobile?"44px":"38px",borderRadius:"50%",color:"rgba(255,255,255,0.68)",transition:"color .2s, background .2s",background:"rgba(255,255,255,0.04)"}}
                 onMouseEnter={e=>e.currentTarget.style.color="#B8860B"}
                 onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.62)"}>
                <svg width={isMobile?"22":"20"} height={isMobile?"22":"20"} viewBox="0 0 24 24" fill="currentColor"><path d={s.path}/></svg>
              </a>
            ))}
          </div>
        </div>
        <div
          style={{
            ...pageFrame(),
            marginTop: "8px",
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            gap: isMobile ? "4px" : "10px",
            alignItems: "center",
            justifyContent: isMobile ? "center" : "flex-start",
            textAlign: isMobile ? "center" : "left",
            fontSize: "8px",
            color: "rgba(255,255,255,0.38)",
            letterSpacing: "1px",
            textTransform: "uppercase",
          }}
        >
          <span>© 2026 Ngoma Charts · A Ngoma Media Product</span>
        </div>
      </footer>
    </div>
  );
}
