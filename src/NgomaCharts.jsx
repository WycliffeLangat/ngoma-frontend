import { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  LabelList,
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
import { FULL, ANL, MOM } from "./data/chartData";
import PremiumChartsPage from "./components/PremiumChartsPage";

// ===== FULL Top-50 dataset across all months and platforms =====
const MONTHS = ["October 2024","November 2024","December 2024"];
const S_PLATS = ["Combined","APPLE MUSIC","AUDIOMACK","BOOMPLAY","SPOTIFY","YOUTUBE","SHAZAM"];
const A_PLATS = ["Combined","APPLE MUSIC","AUDIOMACK","BOOMPLAY","SPOTIFY","YOUTUBE","SHAZAM"];
const PLAT_LABEL = {"APPLE MUSIC":"Apple Music","AUDIOMACK":"Audiomack","BOOMPLAY":"Boomplay","SPOTIFY":"Spotify","YOUTUBE":"YouTube","SHAZAM":"Shazam"};
const PC = {"Apple Music":"#FC3C44","APPLE MUSIC":"#FC3C44","Audiomack":"#F68B1F","AUDIOMACK":"#F68B1F","Boomplay":"#2DB04A","BOOMPLAY":"#2DB04A","Spotify":"#1DB954","SPOTIFY":"#1DB954","YouTube":"#FF0000","YOUTUBE":"#FF0000","Shazam":"#0088FF","SHAZAM":"#0088FF"};
const GOLD="#B8860B"; const SILVER="#8C8C8C"; const BRONZE="#CD7F32";
const MEDALS=[GOLD,SILVER,BRONZE];
const F = "'Instrument Sans',Helvetica,sans-serif";
const SF = "'Source Serif 4',Georgia,serif";
const CC = [GOLD,"#E53935","#2DB04A","#1565C0","#7B1FA2","#E65100","#00897B","#37474F","#AD1457","#558B2F"];
const VO = [{l:"Top 10",c:10},{l:"Top 20",c:20},{l:"Top 50",c:50}];
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
const entryKey = e => `${String(e.t || e.title || "").trim().toLowerCase()}|||${String(e.a || e.artist || "").trim().toLowerCase()}`;
const monthIndex = m => MONTHS.indexOf(m);

const rawCombined = (ct, m) => FULL[ct].combined[m] || [];
const rawPlatform = (ct, pl, m) => ((FULL[ct].platforms[pl] || {})[m] || []);

function enrichChartEntries(entries, getRawEntries, currentMonth, totalPlatforms) {
  const currentIndex = monthIndex(currentMonth);
  const previousMonth = currentIndex > 0 ? MONTHS[currentIndex - 1] : null;
  const previousEntries = previousMonth ? getRawEntries(previousMonth) : [];
  const earlierEntries = currentIndex > 0
    ? MONTHS.slice(0, currentIndex).flatMap((m) => getRawEntries(m))
    : [];
  const allToCurrentEntries = currentIndex >= 0
    ? MONTHS.slice(0, currentIndex + 1).flatMap((m) => getRawEntries(m))
    : entries;

  return entries.map((e) => {
    const key = entryKey(e);
    const previousEntry = previousEntries.find((item) => entryKey(item) === key);
    const appearedBefore = earlierEntries.some((item) => entryKey(item) === key);
    const sameReleaseHistory = allToCurrentEntries.filter((item) => entryKey(item) === key);
    const peakRank = sameReleaseHistory.reduce((best, item) => {
      const rank = Number(item.r);
      return Number.isFinite(rank) && rank < best ? rank : best;
    }, Number(e.r) || 999);

    const monthsOnChart = MONTHS.slice(0, currentIndex + 1).reduce((count, m) => {
      return getRawEntries(m).some((item) => entryKey(item) === key) ? count + 1 : count;
    }, 0);

    const platformCount = e.pl
      ? Number(String(e.pl).split("/")[0]) || undefined
      : undefined;

    return {
      rank: e.r,
      title: e.t,
      artist: e.a,
      pts: e.p,
      plat: e.pl || (platformCount ? `${platformCount}/${totalPlatforms}` : ""),
      prev: previousEntry ? previousEntry.r : null,
      last_month: previousEntry ? previousEntry.r : "—",
      first: false,
      is_new: !appearedBefore,
      reentry: !previousEntry && appearedBefore,
      movement: previousEntry ? undefined : appearedBefore ? "reentry" : "new",
      peak_rank: peakRank === 999 ? e.r : peakRank,
      weeks_on_chart: monthsOnChart || "—",
      platform_count: platformCount,
    };
  });
}

const getCombined = (ct, m) => enrichChartEntries(rawCombined(ct, m), (monthLabel) => rawCombined(ct, monthLabel), m, 6);
const getPlatform = (ct, pl, m) => enrichChartEntries(rawPlatform(ct, pl, m), (monthLabel) => rawPlatform(ct, pl, monthLabel), m, 1);

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
  {id:1,date:"December 31, 2024",cat:"CHART NEWS",emoji:"🎵",title:"Olodumare Dethrones Bensoul to Claim December #1",excerpt:"After two consecutive months at the top, Bensoul's Extra Pressure falls to #3 as Joel Lwaga's Olodumare storms to #1 with 2,286 points across all six platforms.",body:"Joel Lwaga's Olodumare made history in December 2024, becoming the first song to dethrone Bensoul's Extra Pressure from the #1 spot since Ngoma Charts launched. With 2,286 combined points and a perfect 6/6 platform presence, it cemented its status as one of the most cross-cutting songs of Q4 2024."},
  {id:2,date:"December 15, 2024",cat:"ARTIST SPOTLIGHT",emoji:"🌟",title:"Iyanii: Q4's Fastest-Rising Artist",excerpt:"Kifo Cha Mende rose from outside the Top 20 in October to #2 in December — the biggest month-on-month rise of any song in Q4 2024.",body:"Iyanii's Kifo Cha Mende is the breakout story of Q4 2024. The song accumulated 3,773 combined points across the three months, reaching Diamond-tier-adjacent status."},
  {id:3,date:"December 5, 2024",cat:"ALBUMS",emoji:"💿",title:"GNX Tops Kenya's Albums Chart",excerpt:"Kendrick Lamar's surprise album lands at #1 on both Apple Music and Audiomack Kenya in December, displacing Asake's Lungu Boy.",body:"GNX edged out Marioo's The Godson by just 12 points (1,556 vs 1,544) in one of the closest #1 races of the year."},
  {id:4,date:"November 30, 2024",cat:"CHART NEWS",emoji:"🏆",title:"Bensoul Holds #1 For Second Straight Month",excerpt:"Extra Pressure earned 2,624 points in November — a 20% increase over October's 2,188.",body:"Extra Pressure became the first song in Ngoma Charts history to hold #1 for two consecutive months. With 6,680 cumulative points across Q4, it earned Diamond certification."},
  {id:5,date:"November 20, 2024",cat:"ANALYTICS",emoji:"📊",title:"Only Two Songs Achieved 6/6 Platform Coverage",excerpt:"Across Q4 2024, only Extra Pressure and Olodumare charted on all six platforms in the same month.",body:"Different platforms have genuinely different audiences in Kenya. A song that cracks all six must appeal across every listener segment."},
  {id:6,date:"November 5, 2024",cat:"ARTIST SPOTLIGHT",emoji:"⭐",title:"Dyana Cods Dominates 4 Platforms with Set It",excerpt:"Set It topped Apple Music, Boomplay, Spotify and Shazam simultaneously in October — a rare achievement.",body:"With 5,987 cumulative points across Q4, Dyana Cods earned Diamond certification for Set It."},
  {id:7,date:"October 31, 2024",cat:"ANNOUNCEMENT",emoji:"🚀",title:"Ngoma Charts Launches",excerpt:"Ngoma Charts' multi-platform music ranking system debuts with Bensoul's Extra Pressure as the inaugural #1.",body:"Ngoma Charts uses a 101-point system: #1 earns 100 points, #100 earns 1 point. Albums use a 201-point scale across the Top 200."},
  {id:8,date:"October 20, 2024",cat:"ALBUMS",emoji:"🎤",title:"Nyashinski's Album Anchors Albums Chart",excerpt:"To Whom It May Concern holds at #2 on the combined albums chart for October 2024.",body:"With 1,553 combined points, the album proved that Kenyan artists can compete with international heavyweights on home soil."},
];

export default function NgomaCharts(){
  const [page,setPage]=useState("charts");
  const [ct,setCt]=useState("singles");
  const [month,setMonth]=useState("December 2024");
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
  const [cmpS1,setCmpS1]=useState("");
  const [cmpS2,setCmpS2]=useState("");
  const [aiQ,setAiQ]=useState("");
  const [aiA,setAiA]=useState("");
  const [aiL,setAiL]=useState(false);
  const [anMonth,setAnMonth]=useState("December 2024");
  const [loaded,setLd]=useState(false);
  // Live backend (optional) — falls back to baked-in data if unreachable
  const API_BASE = import.meta.env.VITE_API_BASE || "";
  const [liveStatus, setLiveStatus] = useState("static"); // "static" | "live" | "checking"
  const [shareImg, setShareImg] = useState(null);
  const [shareCardModalOpen, setShareCardModalOpen] = useState(false);
  const [shareCardRange, setShareCardRange] = useState(6);
  const [shareCardFormat, setShareCardFormat] = useState("PNG");
  const [liveChartEntries, setLiveChartEntries] = useState([]);
  const [liveChartMeta, setLiveChartMeta] = useState(null);
  const [liveChartLoading, setLiveChartLoading] = useState(false);
  const [openRecord, setOpenRecord] = useState(null);

  const isSingles = ct === "singles";
  const platList = isSingles ? S_PLATS : A_PLATS;
  const tp = 6;

  useEffect(() => {
    if (!API_BASE) return;

    setLiveStatus("checking");

    fetch(API_BASE + "/charts/latest/?chart_type=singles&platform=combined")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then(() => setLiveStatus("live"))
      .catch(() => setLiveStatus("static"));
  }, [API_BASE]);

  useEffect(() => {
    if (!API_BASE) return;

    const { monthNumber, year } = getMonthYearParts(month);

    if (!monthNumber || !year) return;

    const params = new URLSearchParams();
    params.set("type", ct);
    params.set("month", String(monthNumber));
    params.set("year", String(year));
    params.set("platform", platformToSlug(plat));

    setLiveChartLoading(true);

    fetch(`${API_BASE}/export/chart-image-data/?${params.toString()}`)
      .then((response) => {
        if (!response.ok) throw new Error("Live chart unavailable");
        return response.json();
      })
      .then((chartData) => {
        const entries = (chartData.entries || []).map((entry) => {
          const movementType = String(entry.movement || "").toLowerCase();

          return {
            rank: entry.rank,
            title: entry.title,
            artist: entry.artist,
            pts: entry.total_points || 0,
            plat: entry.platform_count ? `${entry.platform_count}/${tp}` : "",
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
          };
        });

        setLiveChartEntries(entries);
        setLiveChartMeta(chartData);
        setLiveStatus("live");
      })
      .catch(() => {
        setLiveChartEntries([]);
        setLiveChartMeta(null);
        setLiveStatus("static");
      })
      .finally(() => {
        setLiveChartLoading(false);
      });
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
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const hideStrayShareButtons = () => {
      const buttons = Array.from(document.querySelectorAll("button"));
      buttons.forEach((btn) => {
        const label = (btn.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
        if (label !== "share card") return;

        const isApprovedPageAction = btn.getAttribute("data-keep-share-card") === "true" || Boolean(btn.closest("[data-share-action-area='true']"));
        if (isApprovedPageAction) return;

        const computed = window.getComputedStyle(btn);
        const rect = btn.getBoundingClientRect();
        const inFooter = Boolean(btn.closest("footer"));
        const floatingPosition = computed.position === "fixed" || computed.position === "sticky" || computed.position === "absolute";
        const bottomRightFloat = rect.right > window.innerWidth - 260 && rect.bottom > window.innerHeight - 180;

        if (inFooter || floatingPosition || bottomRightFloat) {
          btn.style.setProperty("display", "none", "important");
          btn.style.setProperty("visibility", "hidden", "important");
          btn.style.setProperty("pointer-events", "none", "important");
          btn.setAttribute("aria-hidden", "true");
          btn.setAttribute("data-stray-share-hidden", "true");
        }
      });
    };

    hideStrayShareButtons();
    const observer = new MutationObserver(hideStrayShareButtons);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", hideStrayShareButtons);
    window.addEventListener("scroll", hideStrayShareButtons, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", hideStrayShareButtons);
      window.removeEventListener("scroll", hideStrayShareButtons);
    };
  }, [page]);


const getData = () =>
  plat === "Combined" ? getCombined(ct, month) : getPlatform(ct, plat, month);

const staticData = getData();

const data = liveChartEntries.length ? liveChartEntries : staticData;

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

  // Artists from FULL Top-50 data — use pre-computed
  const artists=isSingles?ANL.sArtists:ANL.aArtists;
  const artistInitials=(name="")=>String(name).trim().split(/\s+/).slice(0,2).map(part=>part[0]||"").join("").toUpperCase()||"NC";
  const artistTrendFor=(artist={})=>{
    const latest=MONTHS[MONTHS.length-1];
    const previous=MONTHS[MONTHS.length-2];
    const latestPts=Number(artist.mp?.[latest]||0);
    const previousPts=Number(artist.mp?.[previous]||0);
    const delta=latestPts-previousPts;
    if(delta>0) return {symbol:"↑",color:"#2DB04A",label:`Up ${delta.toLocaleString()} pts`};
    if(delta<0) return {symbol:"↓",color:"#C0392B",label:`Down ${Math.abs(delta).toLocaleString()} pts`};
    return {symbol:"–",color:"#9AA19A",label:"No change"};
  };

  const chartTypeLabel = isSingles ? "Singles" : "Albums";
  const releaseLabel = isSingles ? "Songs" : "Albums";
  const releaseLabelLower = isSingles ? "songs" : "albums";
  const releaseSingularLower = isSingles ? "song" : "album";
  const platformKeysFor = (chartType = ct) => (chartType === "singles" ? S_PLATS : A_PLATS).filter((platform) => platform !== "Combined");
  const currentPlatformKeys = platformKeysFor(ct);
  const recordsCoverageTargetFor = (chartType = ct) => (chartType === "albums" ? 2 : platformKeysFor(chartType).length);
  const currentRecordsCoverageTarget = recordsCoverageTargetFor(ct);

  const platformHitsFor = (chartType, targetMonth, title, artist) => {
    return platformKeysFor(chartType).filter((platform) =>
      rawPlatform(chartType, platform, targetMonth).some((entry) => entryKey(entry) === entryKey({ title, artist }))
    );
  };

  const crossPlatformRows = getCombined(ct, anMonth)
    .map((entry) => {
      const hits = platformHitsFor(ct, anMonth, entry.title, entry.artist);
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
    .sort((a, b) => b.count - a.count || Number(b.pts || 0) - Number(a.pts || 0));

  const coverageBucket = crossPlatformRows.reduce((acc, entry) => {
    acc[entry.count] = (acc[entry.count] || 0) + 1;
    return acc;
  }, {});

  const coverageData = Object.entries(coverageBucket)
    .map(([count, value]) => ({ name: `${count} platform${Number(count) === 1 ? "" : "s"}`, value, count: Number(count) }))
    .sort((a, b) => b.count - a.count);

  const platOnes = currentPlatformKeys
    .map((platform) => {
      const entry = getPlatform(ct, platform, anMonth)[0];
      return entry ? [platform, { t: entry.title, a: entry.artist, p: entry.pts }] : null;
    })
    .filter(Boolean);

  const platTotalsData = currentPlatformKeys
    .map((platform) => ({
      platform: PLAT_LABEL[platform] || platform,
      points: rawPlatform(ct, platform, anMonth).reduce((sum, entry) => sum + (Number(entry.p) || Number(entry.pts) || 0), 0),
      color: PC[platform] || "#888",
    }))
    .filter((entry) => entry.points > 0);

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
  const mvData = buildMovementData(ct, anMonth);

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
        const hits = platformHitsFor(chartType, m, entry.title, entry.artist);
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

  const monthlyBestFor = (chartType) => {
    const rows = [];
    MONTHS.forEach((m) => {
      getCombined(chartType, m).forEach((entry) => rows.push({ ...entry, month: m, points: num(entry.pts) }));
    });
    return rows.sort((a, b) => b.points - a.points)[0] || null;
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

  const currentRecords = (() => {
    const groups = releaseGroupsFor(ct);
    const highestMonthly = monthlyBestFor(ct);
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
      },
      {
        label: "Highest Monthly Score",
        displayLabel: "Highest Monthly Score",
        value: highestMonthly?.title || "—",
        displaySub: highestMonthly
          ? `${highestMonthly.artist} · ${highestMonthly.points.toLocaleString()} pts`
          : `No ${releaseLabelLower} found`,
      },
      {
        label: "Biggest Monthly Climb",
        displayLabel: "Biggest Monthly Climb",
        value: biggestClimb?.title || "—",
        displaySub: biggestClimb
          ? `${biggestClimb.artist} · #${biggestClimb.from} → #${biggestClimb.to}`
          : `No monthly climb found`,
        climbDelta: biggestClimb?.delta || null,
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
      },
      {
        label: `Total Charted ${releaseLabel}`,
        displayLabel: `Total Charted ${releaseLabel}`,
        value: groups.length,
        displaySub: `charted ${trackedPeriodLabel}`,
      },
    ];
  })();

  const fullCoverageClub = useMemo(() => {
    const seen = new Map();
    MONTHS.forEach((m) => {
      getCombined(ct, m).forEach((entry) => {
        const hits = platformHitsFor(ct, m, entry.title, entry.artist);
        const fallbackCount = num(entry.platform_count) || num(String(entry.plat || "").split("/")[0]);
        const count = Math.max(hits.length, fallbackCount);
        if (count >= currentRecordsCoverageTarget) {
          const key = entryKey(entry);
          if (!seen.has(key)) seen.set(key, { title: entry.title, artist: entry.artist, month: m, pts: entry.pts });
        }
      });
    });
    return [...seen.values()].sort((a, b) => num(b.pts) - num(a.pts));
  }, [ct, currentRecordsCoverageTarget]);

  const askAI=async()=>{
    if(!aiQ.trim())return;setAiL(true);setAiA("");
    const sCtx=MONTHS.map(m=>m+" Singles Top 10: "+getCombined("singles",m).slice(0,10).map(e=>"#"+e.rank+" "+e.title+" ("+e.artist+","+e.pts+"pts)").join(", ")).join(" | ");
    const aCtx=MONTHS.map(m=>m+" Albums Top 5: "+getCombined("albums",m).slice(0,5).map(e=>"#"+e.rank+" "+e.title+" ("+e.artist+","+e.pts+"pts)").join(", ")).join(" | ");
    const sys="You are Ngoma Charts AI analyst for multi-platform Kenya music chart data (Oct-Dec 2024). Real data: "+sCtx+" "+aCtx+". Be concise, data-driven, and cite specific numbers.";
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
  const formulaLabel = latestTrendMonths.length >= 3
    ? `Momentum = (${trendMonthShort(latestTrendMonths[2])}−${trendMonthShort(latestTrendMonths[1])} points × 0.7) + (${trendMonthShort(latestTrendMonths[1])}−${trendMonthShort(latestTrendMonths[0])} points × 0.3)`
    : "Momentum is weighted by recent point gains";
  const getTrendPoints = (trend = []) => {
    const rawValues = Array.isArray(trend) ? trend.map((value) => Number(value) || 0) : [];
    const lastValues = rawValues.slice(-latestTrendMonths.length);

    while (lastValues.length < latestTrendMonths.length) lastValues.unshift(0);

    return latestTrendMonths.map((trendMonth, index) => ({
      month: trendMonth,
      label: trendMonthShort(trendMonth),
      value: lastValues[index] || 0,
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
  const openMomentumRelease = (row) => setSelR({ title: row.t, artist: row.a, type: isSingles ? "single" : "album" });
  const TrendBars = ({ trend = [], height = 58, compact = false }) => {
    const bars = getTrendPoints(trend);
    const maxValue = Math.max(1, ...bars.map((bar) => bar.value));

    return (
      <div style={{display:"flex",alignItems:"flex-end",gap:compact?"3px":"6px",height,justifyContent:compact?"flex-end":"center"}}>
        {bars.map((bar, index) => (
          <div key={`${bar.month}-${index}`} title={`${bar.month}: ${bar.value.toLocaleString()} pts`} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:compact?"2px":"4px"}}>
            <div
              style={{
                width:compact?"7px":"28px",
                height:Math.max(compact?3:4, (bar.value / maxValue) * (compact ? 24 : 54)) + "px",
                background:index === bars.length - 1 ? "#2DB04A" : "#CDE8D2",
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
  const top10sData=getCombined(ct,anMonth).slice(0,10).map(e=>({name:e.title.length>16?e.title.slice(0,14)+"…":e.title,pts:e.pts}));
  const monthlyComp=MONTHS.map(m=>({
    month:m.split(" ")[0].slice(0,3),
    singles:getCombined("singles",m).length,
    albums:getCombined("albums",m).length,
    new:ANL.movements[m].new,
    debut:ANL.movements[m].debut,
  }));

  const topArtistsLine=MONTHS.map(m=>{
    const obj={month:m.split(" ")[0].slice(0,3)};
    artists.slice(0,6).forEach(a=>{
      obj[a.n]=a.mp[m]||0;
    });
    return obj;
  });

  const cmp1=artists.find(x=>x.n===cmpA1)||{n:cmpA1,p:0,m:0,t:0,pk:"-",mp:{}};
  const cmp2=artists.find(x=>x.n===cmpA2)||{n:cmpA2,p:0,m:0,t:0,pk:"-",mp:{}};
  const cmpData=MONTHS.map(m=>({month:m.split(" ")[0].slice(0,3),[cmpA1]:cmp1.mp?.[m]||0,[cmpA2]:cmp2.mp?.[m]||0}));

  // === SONG / ALBUM COMPARISON ===
  const PLATS_FOR = currentPlatformKeys;
  // Unique titles for the current chart type, with their artist
  const allTitles=useMemo(()=>{
    const map={};
    MONTHS.forEach(m=>getCombined(ct,m).forEach(e=>{const k=e.title+" — "+e.artist;if(!map[k])map[k]={key:k,title:e.title,artist:e.artist};}));
    return Object.values(map).sort((a,b)=>a.title.localeCompare(b.title));
  },[ct]);
  // Build a full profile for a song key
  const songProfile=(key)=>{
    const meta=allTitles.find(t=>t.key===key);
    if(!meta)return null;
    const {title,artist}=meta;
    const prof={title,artist,monthly:{},platforms:{},totalPts:0,peak:999,months:0,debutMonth:null,bestCov:0,avgRank:0};
    let rankSum=0,rankCount=0;
    MONTHS.forEach(m=>{
      const e=getCombined(ct,m).find(x=>x.title===title&&x.artist===artist);
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
    PLATS_FOR.forEach(pl=>{
      let best=null;
      MONTHS.forEach(m=>{const pe=getPlatform(ct,pl,m).find(x=>x.title===title&&x.artist===artist);if(pe&&(best===null||pe.rank<best))best=pe.rank;});
      if(best!==null)prof.platforms[pl]=best;
    });
    prof.platformCount=Object.keys(prof.platforms).length;
    // weeks-equivalent: number of (platform×month) chart appearances
    let appearances=0;
    PLATS_FOR.forEach(pl=>MONTHS.forEach(m=>{if(getPlatform(ct,pl,m).find(x=>x.title===title&&x.artist===artist))appearances+=1;}));
    prof.appearances=appearances;
    // #1 count on combined
    prof.numberOnes=Object.values(prof.monthly).filter(x=>x.rank===1).length;
    return prof;
  };
  // Default song selections to the current month's #1 and #2
  useEffect(()=>{
    const cd=getCombined(ct,anMonth);
    if(cd[0])setCmpS1(cd[0].title+" — "+cd[0].artist);
    if(cd[1])setCmpS2(cd[1].title+" — "+cd[1].artist);
  },[ct,anMonth]);
  const sp1=songProfile(cmpS1)||songProfile(allTitles[0]?.key);
  const sp2=songProfile(cmpS2)||songProfile(allTitles[1]?.key);
  const songMonthlyData=MONTHS.map(m=>({month:m.split(" ")[0].slice(0,3),A:sp1?.monthly[m]?.pts||0,B:sp2?.monthly[m]?.pts||0}));
  const songRankData=MONTHS.map(m=>({month:m.split(" ")[0].slice(0,3),A:sp1?.monthly[m]?.rank||null,B:sp2?.monthly[m]?.rank||null}));

  const yearEnd=isSingles?ANL.yearEndS:ANL.yearEndA;

  const tracked=isSingles?["Extra Pressure","Set It","Olodumare","Kifo Cha Mende","Bae Bae"]:["Lungu Boy","To Whom It May Concern","The Motions","GNX","Alusa Why Are You Topless?"];

  const certs=isSingles?ANL.certs.singles:ANL.certs.albums;
  const certIcons={diamond:"💎",platinum:"🪙",gold:"🥇",ngoma:"🎵"};
  const certColors={diamond:"#7B1FA2",platinum:SILVER,gold:GOLD,ngoma:"#2DB04A"};

  // Hall of Fame: #1 each month for both singles and albums
  const hof=MONTHS.flatMap(m=>{
    const s=getCombined("singles",m)[0];
    const a=getCombined("albums",m)[0];
    return [s?{...s,month:m,type:"single"}:null,a?{...a,month:m,type:"album"}:null];
  }).filter(Boolean);

  const releaseJourney=r=>{
    if(!r)return [];
    return MONTHS.map(m=>{
      const sc=getCombined(ct,m).find(e=>e.title===r.title&&e.artist===r.artist);
      const platforms=isSingles?["APPLE MUSIC","AUDIOMACK","BOOMPLAY","SPOTIFY","YOUTUBE","SHAZAM"]:["APPLE MUSIC","AUDIOMACK"];
      const entries=platforms.map(pl=>{const d=getPlatform(ct,pl,m).find(e=>e.title===r.title&&e.artist===r.artist);return d?{platform:PLAT_LABEL[pl]||pl,rank:d.rank,pts:d.pts}:null;}).filter(Boolean);
      return {month:m,combined:sc||null,platforms:entries};
    });
  };

  const allArtistNames=[...new Set(artists.map(a=>a.n))].sort();

  // === SHAREABLE CARDS (current page or selected release → PNG download) ===
  const safeShareFileName = (value = "ngoma-card") =>
    String(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "") || "ngoma-card";

  const saveShareImage = (url, fname, title) => {
    try {
      const link = document.createElement("a");
      link.download = fname;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      // Preview remains available even where automatic downloads are blocked.
    }

    setShareImg({ url, fname, title });
  };

  const wrapCanvasText = (ctx, text, x, y, maxWidth, lineHeight, maxLines = 2) => {
    const words = String(text || "").split(" ").filter(Boolean);
    let line = "";
    let lines = 0;

    for (let i = 0; i < words.length; i += 1) {
      const test = line ? `${line} ${words[i]}` : words[i];

      if (ctx.measureText(test).width > maxWidth && line) {
        lines += 1;
        if (lines >= maxLines) {
          const ellipsis = "…";
          let clipped = line;
          while (ctx.measureText(clipped + ellipsis).width > maxWidth && clipped.length > 0) {
            clipped = clipped.slice(0, -1);
          }
          ctx.fillText(clipped.trim() + ellipsis, x, y);
          return y + lineHeight;
        }
        ctx.fillText(line, x, y);
        line = words[i];
        y += lineHeight;
      } else {
        line = test;
      }
    }

    if (line) ctx.fillText(line, x, y);
    return y + lineHeight;
  };

  const drawShareBrand = (ctx, x, y, dark = false) => {
    const base = dark ? "#1A1A1A" : "#FFF";
    const barWidth = 18;
    const bars = [38, 56, 76, 96];

    bars.forEach((height, index) => {
      ctx.fillStyle = index === 2 ? "#B8860B" : base;
      ctx.fillRect(x + index * 28, y + 100 - height, barWidth, height);
    });

    ctx.fillStyle = base;
    ctx.font = "800 34px Helvetica, Arial";
    ctx.fillText("NGOMA", x + 130, y + 62);
    ctx.fillStyle = "#B8860B";
    ctx.fillText("CHARTS", x + 130 + ctx.measureText("NGOMA ").width, y + 62);
    ctx.fillStyle = dark ? "rgba(26,26,26,0.55)" : "rgba(255,255,255,0.55)";
    ctx.font = "700 19px Helvetica, Arial";
    ctx.fillText("MUSIC RANKING INTELLIGENCE", x + 130, y + 92);
  };

  const pageSharePayload = () => {
    const typeLabel = isSingles ? "Singles" : "Albums";
    const platformLabel = plat === "Combined" ? "Combined" : (PLAT_LABEL[plat] || plat);

    if (selNews) {
      return {
        eyebrow: "CHART NEWS",
        title: selNews.title,
        subtitle: `${selNews.cat} · ${selNews.date}`,
        accent: "#B8860B",
        highlights: [selNews.excerpt, "Read the full story on Ngoma Charts."].filter(Boolean),
      };
    }

    if (selA) {
      return {
        eyebrow: "ARTIST PROFILE",
        title: selA.n,
        subtitle: `${typeLabel} performance summary`,
        accent: "#B8860B",
        highlights: [
          `${Number(selA.p || 0).toLocaleString()} total points`,
          `${selA.t} charted ${isSingles ? "songs" : "albums"}`,
          `Peak position: #${selA.pk}`,
          `${selA.m} months active on the chart`,
        ],
      };
    }

    if (page === "charts") {
      return {
        eyebrow: "CHARTS",
        title: `${month} ${typeLabel} Chart`,
        subtitle: `${platformLabel} · Top ${Math.min(vc, data.length)}`,
        accent: "#B8860B",
        highlights: display.slice(0, 6).map((item) => `#${item.rank} ${item.title} — ${item.artist} · ${Number(item.pts || 0).toLocaleString()} pts`),
      };
    }

    if (page === "trending") {
      const rising = uniqueByMomentumIdentity((isSingles ? MOM.predictions.singles : MOM.predictions.albums).rising).slice(0, 6);
      return {
        eyebrow: "MOMENTUM ENGINE",
        title: "Trending Up",
        subtitle: `${typeLabel} rising fastest in ${latestMonth}`,
        accent: "#2DB04A",
        highlights: rising.map((item, index) => `#${index + 1} ${item.t} — ${item.a} · +${Number(item.mom || 0).toLocaleString()} momentum`),
      };
    }

    if (page === "artists") {
      return {
        eyebrow: "ARTISTS",
        title: `Top ${typeLabel} Artists`,
        subtitle: "Ranked by total chart points",
        accent: "#B8860B",
        highlights: artists.slice(0, 6).map((artist, index) => `#${index + 1} ${artist.n} · ${Number(artist.p || 0).toLocaleString()} pts · peak #${artist.pk}`),
      };
    }

    if (page === "analytics") {
      const topArtist = artists[0];
      const topRelease = getCombined(ct, month)[0];
      return {
        eyebrow: "ANALYTICS",
        title: `${typeLabel} Chart Analytics`,
        subtitle: `${month} · ${platformLabel}`,
        accent: "#1565C0",
        highlights: [
          topRelease ? `Current #1: ${topRelease.title} — ${topRelease.artist}` : null,
          topArtist ? `Top artist: ${topArtist.n} · ${Number(topArtist.p || 0).toLocaleString()} pts` : null,
          `${getCombined(ct, anMonth).length} ${typeLabel.toLowerCase()} entries tracked in ${anMonth}`,
          `${platOnes.length} platforms with a #1 ${isSingles ? "song" : "album"} in ${anMonth}`,
        ].filter(Boolean),
      };
    }

    if (page === "records") {
      return {
        eyebrow: "THE RECORD BOOK",
        title: `Records & Milestones`,
        subtitle: `${typeLabel} · all tracked months`,
        accent: "#B8860B",
        highlights: currentRecords.slice(0, 6).map((record) => `${record.displayLabel}: ${record.value} · ${record.displaySub}`),
      };
    }

    if (page === "year-end") {
      return {
        eyebrow: "ANNUAL CHART",
        title: `Best of 2024 — ${typeLabel}`,
        subtitle: "Aggregated points across tracked months",
        accent: "#B8860B",
        highlights: yearEnd.slice(0, 6).map((item, index) => `#${index + 1} ${item.t} — ${item.a} · ${Number(item.totalPts || 0).toLocaleString()} pts`),
      };
    }

    if (page === "certifications") {
      return {
        eyebrow: "CERTIFICATIONS",
        title: `Ngoma Certifications`,
        subtitle: `${typeLabel} · cumulative combined chart points`,
        accent: "#7B1FA2",
        highlights: certs.slice(0, 6).map((cert) => `${cert.t} — ${cert.a} · ${cert.level.toUpperCase()} · ${Number(cert.totalPts || 0).toLocaleString()} pts`),
      };
    }

    if (page === "news") {
      return {
        eyebrow: "CHART NEWS",
        title: "Ngoma Chart News",
        subtitle: "Analysis and stories from Kenya's music charts",
        accent: "#B8860B",
        highlights: NEWS.slice(0, 5).map((item) => `${item.cat}: ${item.title}`),
      };
    }

    if (page === "about") {
      return {
        eyebrow: "ABOUT",
        title: "About Ngoma Charts",
        subtitle: "Music ranking intelligence",
        accent: "#B8860B",
        highlights: [
          "Transparent, data-driven monthly music rankings.",
          "Tracks songs, albums, artists, certifications and milestones.",
          "Built around multi-platform chart performance in Kenya.",
        ],
      };
    }

    return {
      eyebrow: "NGOMA CHARTS",
      title: "Music ranking intelligence",
      subtitle: "Music ranking intelligence",
      accent: "#B8860B",
      highlights: ["Charts", "Trending", "Artists", "Analytics", "Records", "Certifications"],
    };
  };

  const shareCurrentPageCard = (downloadDirect = false) => {
    if (selR) {
      shareReleaseCard(selR);
      return;
    }

    const payload = pageSharePayload();
    if (!payload) return;

    const W = 1080;
    const H = 1080;
    const cv = document.createElement("canvas");
    cv.width = W;
    cv.height = H;
    const x = cv.getContext("2d");
    const accent = payload.accent || "#B8860B";

    const bg = x.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#1A1A1A");
    bg.addColorStop(1, "#2A241D");
    x.fillStyle = bg;
    x.fillRect(0, 0, W, H);

    const glow = x.createRadialGradient(W - 120, 120, 0, W - 120, 120, 620);
    glow.addColorStop(0, accent + "55");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = glow;
    x.fillRect(0, 0, W, H);

    drawShareBrand(x, 82, 82, false);

    x.fillStyle = accent;
    x.font = "800 26px Helvetica, Arial";
    x.letterSpacing = "2px";
    x.fillText(String(payload.eyebrow || "NGOMA CHARTS").toUpperCase(), 90, 285);

    x.fillStyle = "#FFF";
    x.font = "800 76px Georgia, serif";
    const afterTitleY = wrapCanvasText(x, payload.title, 90, 380, 900, 84, 3);

    x.fillStyle = "rgba(255,255,255,0.62)";
    x.font = "600 30px Helvetica, Arial";
    wrapCanvasText(x, payload.subtitle, 90, afterTitleY + 10, 880, 40, 2);

    const boxTop = 590;
    x.fillStyle = "rgba(255,255,255,0.08)";
    x.fillRect(80, boxTop, 920, 330);
    x.fillStyle = accent;
    x.fillRect(80, boxTop, 8, 330);

    x.font = "700 29px Helvetica, Arial";
    (payload.highlights || []).slice(0, 6).forEach((line, index) => {
      const y = boxTop + 62 + index * 45;
      x.fillStyle = index === 0 ? "#FFF" : "rgba(255,255,255,0.78)";
      const text = String(line || "");
      let clipped = text;
      while (x.measureText(clipped).width > 835 && clipped.length > 0) {
        clipped = clipped.slice(0, -1);
      }
      x.fillText(clipped.length < text.length ? clipped.trim() + "…" : clipped, 120, y);
    });

    x.fillStyle = "rgba(255,255,255,0.45)";
    x.font = "700 24px Helvetica, Arial";
    x.fillText("ngomacharts.com", 90, 990);
    x.textAlign = "right";
    x.fillText(new Date().getFullYear().toString(), 990, 990);
    x.textAlign = "left";

    const url = cv.toDataURL("image/png");
    const fname = `ngoma-${safeShareFileName(payload.eyebrow)}-${safeShareFileName(payload.title)}.png`;

    if (downloadDirect) {
      const link = document.createElement("a");
      link.href = url;
      link.download = fname;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    saveShareImage(url, fname, payload.title);
  };

  const ShareCardButton = ({ compact = false, dark = false }) => (
    <button
      type="button"
      data-keep-share-card="true"
      data-share-card="page-action"
      onClick={openShareCardPack}
      style={{
        border: dark ? "1px solid rgba(255,255,255,0.28)" : "1px solid #D7D2C8",
        background: dark ? "#101828" : "#FFF",
        borderRadius: "999px",
        padding: compact ? (isMobile ? "8px 12px" : "8px 14px") : (isMobile ? "9px 14px" : "9px 16px"),
        fontFamily: F,
        fontSize: isMobile ? "10px" : "10.5px",
        fontWeight: 850,
        letterSpacing: "1.05px",
        textTransform: "uppercase",
        cursor: "pointer",
        boxShadow: dark ? "0 8px 24px rgba(0,0,0,0.10)" : "0 4px 12px rgba(0,0,0,0.04)",
        color: dark ? "#FFF" : "#1A1A1A",
        whiteSpace: "nowrap",
        lineHeight: 1,
      }}
    >
      Share Card
    </button>
  );

  const shareModalPayload = pageSharePayload();
  const shareModalMonth = page === "analytics" ? anMonth : month;
  const shareModalYear = (String(shareModalMonth).match(/\b(20\d{2})\b/) || [])[1] || String(new Date().getFullYear());
  const shareModalYears = Array.from(new Set(MONTHS.map((item) => (String(item).match(/\b(20\d{2})\b/) || [])[1]).filter(Boolean))).sort();
  const shareModalPlatformLabel = plat === "Combined" ? "Combined" : (PLAT_LABEL[plat] || plat);
  const shareModalTypeLabel = isSingles ? "Singles" : "Albums";
  const shareModalMaxRange = Math.max(1, shareModalPayload?.highlights?.length || 6);
  const shareModalSelectedRange = Math.min(Math.max(1, shareCardRange || 6), shareModalMaxRange);
  const shareModalHighlights = (shareModalPayload?.highlights || []).slice(0, shareModalSelectedRange);
  const shareModalRangeOptions = Array.from(new Set([3, 6, 10, shareModalSelectedRange].map((value) => Math.min(value, shareModalMaxRange)))).filter(Boolean).sort((a, b) => a - b);
  const openShareCardPack = () => {
    if (selR) {
      shareCurrentPageCard();
      return;
    }
    setShareCardModalOpen(true);
  };
  const downloadShareCardPackImage = () => {
    if (shareCardFormat !== "PNG") return;
    setShareCardModalOpen(false);
    shareCurrentPageCard(true);
  };

  const shareReleaseCard = (r) => {
    if(!r)return;
    const peak=MONTHS.reduce((best,m)=>{const e=getCombined(r.type==="album"?"albums":"singles",m).find(x=>x.title===r.title&&x.artist===r.artist);if(e&&(!best||e.rank<best.rank))return{...e,month:m};return best;},null);
    const W=1080,H=1080;
    const cv=document.createElement("canvas");cv.width=W;cv.height=H;
    const x=cv.getContext("2d");
    // bg
    const g=x.createLinearGradient(0,0,W,H);g.addColorStop(0,"#1A1A1A");g.addColorStop(1,"#2C2620");
    x.fillStyle=g;x.fillRect(0,0,W,H);
    // gold glow
    const rg=x.createRadialGradient(W-150,150,0,W-150,150,500);rg.addColorStop(0,"rgba(184,134,11,0.25)");rg.addColorStop(1,"transparent");
    x.fillStyle=rg;x.fillRect(0,0,W,H);
    // logo bars
    const bx=90,by=130;const bars=[[0,40,24],[34,55,24],[68,75,24,true],[102,95,24]];
    bars.forEach(([ox,h,w,gold])=>{x.fillStyle=gold?"#B8860B":"#FFF";x.fillRect(bx+ox,by+95-h,w,h);});
    // wordmark
    x.fillStyle="#FFF";x.font="800 34px Helvetica,Arial";x.textBaseline="alphabetic";
    x.fillText("NGOMA",bx+150,by+70);
    x.fillStyle="#B8860B";x.fillText("CHARTS",bx+150+x.measureText("NGOMA ").width,by+70);
    // eyebrow
    x.fillStyle="rgba(255,255,255,0.5)";x.font="600 24px Helvetica";x.fillText("MUSIC RANKING INTELLIGENCE",90,by+150);
    // huge rank
    x.fillStyle="#B8860B";x.font="900 340px Helvetica";x.textAlign="left";
    x.fillText("#"+(peak?peak.rank:r.rank||"—"),70,640);
    // peak label
    x.fillStyle="rgba(255,255,255,0.4)";x.font="600 28px Helvetica";
    x.fillText("PEAK POSITION"+(peak?" · "+peak.month.split(" ")[0].toUpperCase():""),90,700);
    // title (wrap)
    x.fillStyle="#FFF";x.font="800 64px Georgia,serif";
    const words=r.title.split(" ");let line="",ty=800;
    words.forEach(w=>{const test=line+w+" ";if(x.measureText(test).width>900&&line){x.fillText(line.trim(),90,ty);line=w+" ";ty+=76;}else line=test;});
    x.fillText(line.trim(),90,ty);
    // artist
    x.fillStyle="#B8860B";x.font="500 40px Helvetica";x.fillText(r.artist,90,ty+70);
    // points footer
    if(peak){x.fillStyle="rgba(255,255,255,0.5)";x.font="600 30px Helvetica";x.fillText(peak.pts.toLocaleString()+" POINTS · "+peak.plat+" PLATFORMS",90,H-90);}
    // export
    const url=cv.toDataURL("image/png");
    const fname="ngoma-"+safeShareFileName(r.title)+".png";
    saveShareImage(url,fname,r.title);
  };

  const AnalyticsDeepSection = ({ label, children }) => {
    if (!isMobile) return <>{children}</>;
    return (
      <details className="ngoma-mobile-collapsible">
        <summary>{label}<span>View</span></summary>
        <div className="ngoma-mobile-collapsible-body">{children}</div>
      </details>
    );
  };

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
                    <span key={t} onClick={()=>navTo(t)} style={{cursor:"pointer",padding:"13px 14px",borderRadius:"12px",fontFamily:F,fontSize:"13px",fontWeight:page===t?800:600,letterSpacing:"1px",textTransform:"uppercase",color:page===t?"#1A1A1A":"#555",background:page===t?"linear-gradient(135deg,#FAF5EA,#F5EAD2)":"transparent",border:page===t?"1px solid "+GOLD+"33":"1px solid transparent"}}>{navLabel(t)}</span>
                  ))}
                  <span onClick={()=>{setMNav(false);setSOpen(true);}} style={{cursor:"pointer",padding:"13px 14px",borderRadius:"12px",fontFamily:F,fontSize:"13px",fontWeight:600,letterSpacing:"1px",textTransform:"uppercase",color:"#555"}}>Search</span>
                </div>
              )}
            </>
          ) : (
            <nav style={{display:"flex",gap:"22px",fontFamily:F,fontSize:isMobile?"12px":"11px",fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",alignItems:"center",flexShrink:0}}>
              {navItems.map(t=>(
                <span key={t} onClick={()=>navTo(t)} style={{color:page===t?"#1A1A1A":"#6B6B6B",cursor:"pointer",whiteSpace:"nowrap",padding:"6px 12px",borderRadius:"20px",background:page===t?"linear-gradient(135deg,#FAF5EA,#F5EAD2)":"transparent",fontWeight:page===t?800:700,transition:"all 0.15s",border:page===t?"1px solid "+GOLD+"33":"1px solid transparent"}}
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
      {shareImg&&(
        <div style={{position:"fixed",inset:0,background:"rgba(20,18,15,0.82)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",backdropFilter:"blur(4px)"}} onClick={()=>setShareImg(null)}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#FFF",borderRadius:"16px",maxWidth:"420px",width:"100%",overflow:"hidden",boxShadow:"0 30px 80px rgba(0,0,0,0.4)"}}>
            <div style={{padding:"18px 22px",borderBottom:"1px solid #EEE",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontFamily:F,fontSize:"13px",fontWeight:700}}>Share Card Ready</div>
              <span onClick={()=>setShareImg(null)} style={{cursor:"pointer",color:"#CCC",fontSize:"16px"}}>✕</span>
            </div>
            <div style={{padding:"20px",background:"#FAFAF8"}}>
              <img src={shareImg.url} alt={shareImg.title} style={{width:"100%",borderRadius:"10px",display:"block",boxShadow:"0 8px 24px rgba(0,0,0,0.15)"}}/>
            </div>
            <div style={{padding:"16px 22px 20px"}}>
              <p style={{fontFamily:F,fontSize:"11.5px",color:"#888",lineHeight:1.5,margin:"0 0 14px"}}>On desktop: right-click the image → "Save image as". On mobile: press and hold → "Save to Photos". Or use the button below.</p>
              <div style={{display:"flex",gap:"8px"}}>
                <a href={shareImg.url} download={shareImg.fname} style={{flex:1,textAlign:"center",padding:"11px",background:"#1A1A1A",color:"#FFF",borderRadius:"22px",fontFamily:F,fontSize:"12px",fontWeight:700,textDecoration:"none"}}>Download PNG</a>
                <a href={shareImg.url} target="_blank" rel="noopener noreferrer" style={{flex:1,textAlign:"center",padding:"11px",background:"#FFF",color:"#1A1A1A",border:"1.5px solid #E0E0DC",borderRadius:"22px",fontFamily:F,fontSize:"12px",fontWeight:700,textDecoration:"none"}}>Open in New Tab</a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAGE SHARE CARD PACK */}
      {shareCardModalOpen && shareModalPayload && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 260,
            background: "rgba(0,0,0,0.58)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: isMobile ? "14px" : "22px",
            boxSizing: "border-box",
          }}
          onClick={() => setShareCardModalOpen(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "18px",
              width: isMobile ? "calc(100vw - 28px)" : "min(1080px, calc(100vw - 80px))",
              maxHeight: isMobile ? "86vh" : "82vh",
              overflowY: "auto",
              boxShadow: "0 30px 90px rgba(0,0,0,0.34)",
              padding: isMobile ? "18px" : "28px",
              boxSizing: "border-box",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"18px",marginBottom:"20px"}}>
              <div>
                <h3 style={{margin:0,fontFamily:F,fontSize:isMobile?"22px":"26px",lineHeight:1.1,fontWeight:950,color:"#0f172a"}}>Download Chart Pack</h3>
                <p style={{margin:"8px 0 0",fontFamily:F,fontSize:isMobile?"12.5px":"14px",color:"#526071",lineHeight:1.45}}>Export this page as a share card with the same options style used on Charts.</p>
              </div>
              <button
                type="button"
                onClick={() => setShareCardModalOpen(false)}
                aria-label="Close share card pack"
                style={{border:"none",background:"#f1f3f5",width:"34px",height:"34px",borderRadius:"999px",fontSize:"22px",lineHeight:1,cursor:"pointer",color:"#0f172a",fontWeight:700,flexShrink:0}}
              >
                ×
              </button>
            </div>

            <div
              style={{
                display:"grid",
                gridTemplateColumns:isMobile?"1fr":"1.05fr 0.75fr 1.05fr 1.1fr 1fr 0.9fr auto",
                gap:"10px",
                alignItems:"end",
                marginBottom:"20px",
              }}
            >
              <label style={{display:"grid",gap:"6px",fontFamily:F,fontSize:"10px",fontWeight:900,letterSpacing:"1px",textTransform:"uppercase",color:"#687385"}}>
                Chart
                <select
                  value={ct}
                  onChange={(event) => {
                    setCt(event.target.value);
                    setPlat("Combined");
                  }}
                  style={{width:"100%",border:"1px solid #d8dee8",borderRadius:"10px",background:"#fff",padding:"11px 12px",fontFamily:F,fontSize:"13px",fontWeight:800,color:"#101828",outline:"none"}}
                >
                  <option value="singles">Singles</option>
                  <option value="albums">Albums</option>
                </select>
              </label>

              <label style={{display:"grid",gap:"6px",fontFamily:F,fontSize:"10px",fontWeight:900,letterSpacing:"1px",textTransform:"uppercase",color:"#687385"}}>
                Year
                <select
                  value={shareModalYear}
                  onChange={(event) => {
                    const nextMonth = MONTHS.find((item) => String(item).includes(event.target.value));
                    if (nextMonth) {
                      setMonth(nextMonth);
                      setAnMonth(nextMonth);
                    }
                  }}
                  style={{width:"100%",border:"1px solid #d8dee8",borderRadius:"10px",background:"#fff",padding:"11px 12px",fontFamily:F,fontSize:"13px",fontWeight:800,color:"#101828",outline:"none"}}
                >
                  {(shareModalYears.length ? shareModalYears : [shareModalYear]).map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
              </label>

              <label style={{display:"grid",gap:"6px",fontFamily:F,fontSize:"10px",fontWeight:900,letterSpacing:"1px",textTransform:"uppercase",color:"#687385"}}>
                Month
                <select
                  value={shareModalMonth}
                  onChange={(event) => {
                    setMonth(event.target.value);
                    setAnMonth(event.target.value);
                  }}
                  style={{width:"100%",border:"1px solid #d8dee8",borderRadius:"10px",background:"#fff",padding:"11px 12px",fontFamily:F,fontSize:"13px",fontWeight:800,color:"#101828",outline:"none"}}
                >
                  {MONTHS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>

              <label style={{display:"grid",gap:"6px",fontFamily:F,fontSize:"10px",fontWeight:900,letterSpacing:"1px",textTransform:"uppercase",color:"#687385"}}>
                Platform
                <select
                  value={plat}
                  onChange={(event) => setPlat(event.target.value)}
                  style={{width:"100%",border:"1px solid #d8dee8",borderRadius:"10px",background:"#fff",padding:"11px 12px",fontFamily:F,fontSize:"13px",fontWeight:800,color:"#101828",outline:"none"}}
                >
                  {platList.map((item) => <option key={item} value={item}>{item === "Combined" ? "Combined" : PLAT_LABEL[item] || item}</option>)}
                </select>
              </label>

              <label style={{display:"grid",gap:"6px",fontFamily:F,fontSize:"10px",fontWeight:900,letterSpacing:"1px",textTransform:"uppercase",color:"#687385"}}>
                Preview range
                <select
                  value={shareModalSelectedRange}
                  onChange={(event) => setShareCardRange(Number(event.target.value))}
                  style={{width:"100%",border:"1px solid #d8dee8",borderRadius:"10px",background:"#fff",padding:"11px 12px",fontFamily:F,fontSize:"13px",fontWeight:800,color:"#101828",outline:"none"}}
                >
                  {(shareModalRangeOptions.length ? shareModalRangeOptions : [3,6]).map((range) => <option key={range} value={range}>Top {range} insights</option>)}
                </select>
              </label>

              <label style={{display:"grid",gap:"6px",fontFamily:F,fontSize:"10px",fontWeight:900,letterSpacing:"1px",textTransform:"uppercase",color:"#687385"}}>
                Format
                <select
                  value={shareCardFormat}
                  onChange={(event) => setShareCardFormat(event.target.value)}
                  style={{width:"100%",border:"1px solid #d8dee8",borderRadius:"10px",background:"#fff",padding:"11px 12px",fontFamily:F,fontSize:"13px",fontWeight:800,color:"#101828",outline:"none"}}
                >
                  <option value="PNG">PNG</option>
                </select>
              </label>

              <button
                type="button"
                onClick={downloadShareCardPackImage}
                disabled={shareCardFormat !== "PNG"}
                style={{border:"none",borderRadius:"999px",background:shareCardFormat === "PNG" ? "#101828" : "#9aa4b2",color:"#fff",padding:"12px 18px",fontFamily:F,fontSize:"12px",fontWeight:950,letterSpacing:"0.8px",textTransform:"uppercase",cursor:shareCardFormat === "PNG" ? "pointer" : "not-allowed",whiteSpace:"nowrap",minHeight:"42px"}}
              >
                Download 1 Image
              </button>
            </div>

            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"0.95fr 1.05fr",gap:isMobile?"14px":"22px",alignItems:"stretch"}}>
              <div style={{border:"1px solid #e7e9ee",borderRadius:"16px",padding:isMobile?"14px":"18px",background:"#f8fafc"}}>
                <div style={{fontFamily:F,fontSize:"10px",fontWeight:950,letterSpacing:"1.4px",textTransform:"uppercase",color:"#687385",marginBottom:"10px"}}>Preview details</div>
                <div style={{display:"grid",gap:"10px"}}>
                  {[
                    ["Page", shareModalPayload.eyebrow || "Ngoma Charts"],
                    ["Chart", shareModalTypeLabel],
                    ["Month", shareModalMonth],
                    ["Platform", shareModalPlatformLabel],
                    ["Items", `${shareModalHighlights.length} shown`],
                  ].map(([label,value]) => (
                    <div key={label} style={{display:"flex",justifyContent:"space-between",gap:"14px",borderBottom:"1px solid #edf0f4",paddingBottom:"8px",fontFamily:F,fontSize:"12px"}}>
                      <span style={{color:"#687385",fontWeight:800}}>{label}</span>
                      <strong style={{color:"#101828",textAlign:"right"}}>{value}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{borderRadius:"18px",overflow:"hidden",background:"linear-gradient(135deg,#101010,#261f18)",minHeight:isMobile?"420px":"520px",padding:isMobile?"22px":"34px",boxSizing:"border-box",boxShadow:"inset 0 0 0 1px rgba(255,255,255,0.08)",position:"relative"}}>
                <div style={{position:"absolute",right:"-90px",top:"-110px",width:"280px",height:"280px",borderRadius:"50%",background:(shareModalPayload.accent || GOLD) + "33",filter:"blur(4px)"}} />
                <div style={{position:"relative",zIndex:1,display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"18px",marginBottom:"28px"}}>
                  <div>
                    <div style={{fontFamily:F,fontSize:isMobile?"21px":"28px",fontWeight:950,letterSpacing:"0.5px",color:"#fff"}}>NGOMA <span style={{color:GOLD}}>CHARTS</span></div>
                    <div style={{fontFamily:F,fontSize:isMobile?"9px":"10.5px",fontWeight:800,letterSpacing:"1.7px",textTransform:"uppercase",color:"rgba(255,255,255,0.62)",marginTop:"5px"}}>Music ranking intelligence</div>
                  </div>
                  <div style={{fontFamily:F,fontSize:"10px",fontWeight:950,letterSpacing:"1px",textTransform:"uppercase",color:"#101828",background:GOLD,borderRadius:"999px",padding:"7px 10px",whiteSpace:"nowrap"}}>Top {shareModalHighlights.length}</div>
                </div>

                <div style={{position:"relative",zIndex:1,fontFamily:F,fontSize:"11px",fontWeight:900,letterSpacing:"1.3px",textTransform:"uppercase",color:shareModalPayload.accent || GOLD,marginBottom:"12px"}}>{shareModalPayload.eyebrow}</div>
                <div style={{position:"relative",zIndex:1,fontFamily:SF,fontSize:isMobile?"28px":"39px",fontWeight:900,lineHeight:1.03,color:"#fff",maxWidth:"880px"}}>{shareModalPayload.title}</div>
                <div style={{position:"relative",zIndex:1,fontFamily:F,fontSize:isMobile?"12px":"14px",fontWeight:700,lineHeight:1.45,color:"rgba(255,255,255,0.68)",marginTop:"12px"}}>{shareModalPayload.subtitle}</div>

                <div style={{position:"relative",zIndex:1,marginTop:"28px",background:"rgba(255,255,255,0.08)",borderLeft:`5px solid ${shareModalPayload.accent || GOLD}`,borderRadius:"10px",padding:isMobile?"14px":"18px"}}>
                  {shareModalHighlights.map((line, index) => (
                    <div key={`${line}-${index}`} style={{fontFamily:F,fontSize:isMobile?"12.5px":"15px",fontWeight:index===0?900:750,lineHeight:1.42,color:index===0?"#fff":"rgba(255,255,255,0.78)",padding:index===0?"0 0 9px":"9px 0",borderBottom:index===shareModalHighlights.length-1?"none":"1px solid rgba(255,255,255,0.08)"}}>
                      {line}
                    </div>
                  ))}
                </div>

                <div style={{position:"relative",zIndex:1,display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",marginTop:"28px",fontFamily:F,fontSize:"11px",fontWeight:850,letterSpacing:"1px",textTransform:"uppercase",color:"rgba(255,255,255,0.46)"}}>
                  <span>ngomacharts.com</span>
                  <span>{new Date().getFullYear()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                <div key={i} onClick={()=>{setSOpen(false);setSrch("");setSelR(e);setPage("charts");setCt(e.type==="single"?"singles":"albums");setMonth(e.month);}} style={{padding:"11px 20px",borderBottom:"1px solid #F5F5F3",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}
                  onMouseEnter={x=>x.currentTarget.style.background="#FAFAF6"} onMouseLeave={x=>x.currentTarget.style.background="transparent"}>
                  <div><div style={{fontSize:"14px",fontWeight:700}}>{e.title}</div><div style={{fontSize:"10.5px",color:"#999",fontFamily:F}}>{e.artist} · <span style={{color:GOLD}}>{e.type} · {e.month}</span></div></div>
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
      {selR&&(
        <div style={{padding:PAD,background:"#FFF",minHeight:"60vh",boxSizing:"border-box",overflow:"hidden"}}>
          <span onClick={()=>setSelR(null)} style={{fontFamily:F,fontSize:isMobile?"12px":"11px",color:GOLD,cursor:"pointer",letterSpacing:"1px",textTransform:"uppercase",fontWeight:600}}>← Back</span>
          <div style={{marginTop:"20px"}}>
            <div style={{fontFamily:F,fontSize:"10px",letterSpacing:"2px",textTransform:"uppercase",color:GOLD,marginBottom:"6px"}}>{selR.type||"single"}</div>
            <h1 style={{fontSize:isMobile?"24px":"30px",fontWeight:850,margin:"0 0 4px",lineHeight:1.12}}>{selR.title}</h1>
            <p style={{fontSize:isMobile?"15px":"18px",color:"#69716B",margin:"0 0 16px",fontFamily:F,cursor:"pointer",fontWeight:700}} onClick={()=>{const a=artists.find(x=>x.n===selR.artist);if(a){setSelR(null);setSelA(a);}}}>{selR.artist}</p>
            <button onClick={()=>shareReleaseCard(selR)} style={{display:"inline-flex",alignItems:"center",gap:"8px",padding:"9px 18px",background:"#1A1A1A",color:"#FFF",border:"none",borderRadius:"22px",fontFamily:F,fontSize:"12px",fontWeight:700,cursor:"pointer",marginBottom:"24px",letterSpacing:"0.5px"}}
              onMouseEnter={e=>e.currentTarget.style.background="#000"} onMouseLeave={e=>e.currentTarget.style.background="#1A1A1A"}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B8860B" strokeWidth="2.5"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              Share as Image
            </button>
            <h3 style={secLbl()}><SecMark/>Cross-Platform Journey</h3>
            {releaseJourney(selR).map(({month:m,combined,platforms})=>(
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
      )}

      {/* ARTIST PROFILE */}
      {selA&&!selR&&(
        <div style={{padding:PAD,background:"#FFF",minHeight:"60vh",boxSizing:"border-box",overflow:"hidden"}}>
          <span onClick={()=>setSelA(null)} style={{fontFamily:F,fontSize:isMobile?"12px":"11px",color:GOLD,cursor:"pointer",letterSpacing:"1px",textTransform:"uppercase",fontWeight:600}}>← Back</span>
          <div style={{marginTop:"20px",display:"flex",gap:"20px",alignItems:isMobile?"stretch":"flex-start",flexDirection:isMobile?"column":"row",minWidth:0}}>
            <div style={{width:"80px",height:"80px",borderRadius:"50%",background:"linear-gradient(135deg,#FAF5EA,#EDE0C0)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"32px",fontWeight:900,color:GOLD,flexShrink:0,border:"2px solid "+GOLD+"22",boxShadow:"0 4px 16px rgba(184,134,11,0.12)"}}>{selA.n[0]}</div>
            <div style={{flex:1}}>
              <h2 style={{margin:0,fontSize:isMobile?"24px":"26px",fontWeight:850,lineHeight:1.12}}>{selA.n}</h2>
              <div style={{fontFamily:F,fontSize:TXT.lead,color:"#69716B",marginTop:"4px",lineHeight:1.45}}>Peak: #{selA.pk} · {selA.t} {isSingles?"songs":"albums"} · {selA.m} months on chart</div>
              <div style={{display:"flex",gap:"24px",marginTop:"14px",fontFamily:F}}>
                {[{v:selA.p.toLocaleString(),l:"Total Points",c:GOLD},{v:selA.t,l:"Charted Titles"},{v:"#"+selA.pk,l:"Peak Rank"},{v:selA.m,l:"Months Active"}].map((s,i)=>(
                  <div key={i}><div style={{fontSize:"22px",fontWeight:700,color:s.c||"#1A1A1A"}}>{s.v}</div><div style={{fontSize:"9px",letterSpacing:"1.5px",color:"#CCC",textTransform:"uppercase"}}>{s.l}</div></div>
                ))}
              </div>
            </div>
          </div>
          <div style={{...card(),marginTop:"24px",marginBottom:"20px"}}>
            <div style={secLbl()}><SecMark/>Monthly Points</div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={MONTHS.map(m=>({month:m.split(" ")[0].slice(0,3),pts:selA.mp?.[m]||0}))}>
                <XAxis dataKey="month" tick={{fontSize:isMobile?11:11,fontFamily:F,fill:"#59645D",fontWeight:650}} tickLine={false}/>
                <YAxis tick={{fontSize:isMobile?10.5:10.5,fontFamily:F,fill:"#59645D",fontWeight:650}} tickFormatter={v=>v.toLocaleString()} axisLine={false} tickLine={false}/>
                <Tooltip formatter={v=>[v.toLocaleString()+" pts","Points"]} contentStyle={{fontFamily:F,fontSize:11}}/>
                <Bar dataKey="pts" fill={GOLD} radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <h3 style={secLbl()}>Charted Titles Across Months</h3>
          {(()=>{
            const titles=new Set();
            const items=[];
            MONTHS.forEach(m=>{
              getCombined(ct,m).filter(e=>e.artist===selA.n).forEach(e=>{
                items.push({...e,month:m});
              });
            });
            return items.sort((a,b)=>a.rank-b.rank).map((s,i)=>(
              <div key={i} onClick={()=>setSelR(s)} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:"1px solid #F2F2EE",fontFamily:F,cursor:"pointer"}}
                onMouseEnter={e=>e.currentTarget.style.background="#FAFAF6"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div><span style={{fontWeight:800,fontSize:TXT.cardTitle,fontFamily:SF}}>{s.title}</span><span style={{color:"#7B857D",fontSize:TXT.micro,fontFamily:F}}> · {s.month}</span></div>
                <div><span style={{color:GOLD,fontWeight:800,fontSize:TXT.cardMeta}}>#{s.rank}</span><span style={{color:"#69716B",fontSize:TXT.cardMeta}}> · {s.pts.toLocaleString()} pts</span></div>
              </div>
            ));
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
    getCombined={getCombined}
    liveChartLoading={liveChartLoading}
liveChartMeta={liveChartMeta}
liveStatus={liveStatus}
    pageMax={PAGE_MAX}
    shareCurrentPageCard={shareCurrentPageCard}
  />
)}

      {/* ARTISTS PAGE */}
      {page==="artists"&&!selA&&!selR&&(
        <div style={{padding:PAD,background:"#FFF",minHeight:"60vh",boxSizing:"border-box",overflow:"hidden"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:isMobile?"stretch":"flex-end",marginBottom:isMobile?"18px":"22px",gap:isMobile?"14px":"20px",flexDirection:isMobile?"column":"row"}}>
            <div>
              <h2 style={{fontSize:TXT.pageTitle,fontWeight:800,margin:0}}>Top Artists</h2>
              <p style={{fontFamily:F,fontSize:isMobile?"12.5px":"11.5px",color:"#59645D",margin:"5px 0 0",lineHeight:1.6}}>Computed from full Top 50 across all months · Click any artist for full profile</p>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:isMobile?"10px":"12px",flexWrap:"wrap"}}>
              <Tog sm/>
              <ShareCardButton compact />
            </div>
          </div>
          {/* Comparison */}
          <div style={{...card(),padding:isMobile?"18px":"22px",marginBottom:"22px",background:"#FAFAF8"}}>
            <div style={{...secLbl(),marginBottom:isMobile?"14px":"16px"}}><SecMark/>Artist Comparison</div>
            <div style={{display:"flex",gap:isMobile?"8px":"12px",alignItems:"center",marginBottom:"16px",flexWrap:isMobile?"nowrap":"wrap"}}>
              <select value={cmpA1} onChange={e=>setCmpA1(e.target.value)} style={{flex:1,minWidth:0,padding:isMobile?"10px 9px":"9px 12px",border:"1.5px solid #D6D1C7",borderRadius:"8px",background:"#FFF",fontSize:isMobile?"12px":"11.5px",fontFamily:F,fontWeight:700,cursor:"pointer",outline:"none",color:"#1F241F"}}>
                {allArtistNames.map(n=><option key={n} value={n}>{n}</option>)}
              </select>
              <span style={{fontFamily:F,fontSize:isMobile?"11px":"12px",color:"#7B857D",fontWeight:800,flexShrink:0}}>vs</span>
              <select value={cmpA2} onChange={e=>setCmpA2(e.target.value)} style={{flex:1,minWidth:0,padding:isMobile?"10px 9px":"9px 12px",border:"1.5px solid #D6D1C7",borderRadius:"8px",background:"#FFF",fontSize:isMobile?"12px":"11.5px",fontFamily:F,fontWeight:700,cursor:"pointer",outline:"none",color:"#1F241F"}}>
                {allArtistNames.map(n=><option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="anl-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:isMobile?"10px":"12px",marginBottom:isMobile?"16px":"18px"}}>
              {[{d:cmp1,c:GOLD},{d:cmp2,c:"#1565C0"}].map(({d,c},i)=>(
                <div key={i} style={{padding:isMobile?"15px":"16px",background:c+"0D",borderRadius:"10px",borderLeft:"3px solid "+c,minHeight:isMobile?"142px":"auto"}}>
                  <div style={{fontFamily:F,fontSize:isMobile?"10.5px":"10px",fontWeight:900,letterSpacing:"1.5px",color:c,textTransform:"uppercase",marginBottom:"9px"}}>{d.n}</div>
                  {[{l:"Total Points",v:(d.p||0).toLocaleString()},{l:"Peak Rank",v:"#"+(d.pk||"—")},{l:"Months",v:d.m||0},{l:"Titles",v:d.t||0}].map((s,j)=>(
                    <div key={j} style={{display:"flex",justifyContent:"space-between",gap:"12px",fontFamily:F,fontSize:isMobile?"12px":"11.5px",borderBottom:"1px solid "+c+"22",padding:isMobile?"5px 0":"4px 0",lineHeight:1.35}}>
                      <span style={{color:"#59645D",fontWeight:650}}>{s.l}</span><span style={{fontWeight:850,color:c}}>{s.v}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div style={{fontFamily:F,fontSize:isMobile?"10px":"10.5px",fontWeight:800,letterSpacing:"1.3px",textTransform:"uppercase",color:"#59645D",margin:"0 0 8px"}}>Total Points</div>
            <ResponsiveContainer width="100%" height={isMobile?190:205}>
              <BarChart data={cmpData} margin={{top:18,right:isMobile?8:12,left:isMobile?2:10,bottom:6}} barCategoryGap={isMobile?"22%":"28%"}>
                <CartesianGrid vertical={false} stroke="#E8E4DA" strokeDasharray="3 3"/>
                <XAxis dataKey="month" tick={{fontSize:isMobile?11:11.5,fontFamily:F,fill:"#59645D",fontWeight:700}} tickLine={false}/>
                <YAxis width={isMobile?40:50} tick={{fontSize:isMobile?10.5:11,fontFamily:F,fill:"#59645D",fontWeight:650}} tickFormatter={v=>v.toLocaleString()} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{fontFamily:F,fontSize:12,borderRadius:8,border:"1px solid #E1DCD0"}} formatter={(v)=>[Number(v||0).toLocaleString()+" pts","Total Points"]}/>
                <Legend wrapperStyle={{fontFamily:F,fontSize:isMobile?11:11.5,color:"#59645D",paddingTop:8}}/>
                <Bar dataKey={cmpA1} fill={GOLD} radius={[5,5,0,0]} barSize={isMobile?20:36}>
                  <LabelList dataKey={cmpA1} position="top" formatter={(v)=>Number(v||0)>0?Number(v).toLocaleString():""} style={{fontFamily:F,fontSize:isMobile?8.5:9.5,fill:"#59645D",fontWeight:700}}/>
                </Bar>
                <Bar dataKey={cmpA2} fill="#1565C0" radius={[5,5,0,0]} barSize={isMobile?20:36}>
                  <LabelList dataKey={cmpA2} position="top" formatter={(v)=>Number(v||0)>0?Number(v).toLocaleString():""} style={{fontFamily:F,fontSize:isMobile?8.5:9.5,fill:"#59645D",fontWeight:700}}/>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Top Artists List - all 30 from full Top 50 */}
          <div style={{display:"grid",gridTemplateColumns:isMobile?"34px 34px minmax(0,1fr) 82px":"44px 38px minmax(0,1fr) 70px 104px 34px",gap:isMobile?"9px":"12px",alignItems:"center",padding:isMobile?"0 8px 9px":"0 12px 10px",borderBottom:"1px solid #EDEBE4",fontFamily:F,fontSize:isMobile?"9.5px":"10px",fontWeight:900,letterSpacing:"1.6px",textTransform:"uppercase",color:"#8A928B"}}>
            <div></div>
            <div></div>
            <div>Artist</div>
            {!isMobile&&<div style={{textAlign:"center"}}>Move</div>}
            <div style={{textAlign:"right"}}>Points</div>
            {!isMobile&&<div></div>}
          </div>
          {artists.slice(0,30).map((a,i)=>{const trend=artistTrendFor(a);return(
            <div key={a.n} className="ngoma-artist-row" onClick={()=>setSelA(a)} style={{display:"grid",gridTemplateColumns:isMobile?"34px 34px minmax(0,1fr) 82px":"44px 38px minmax(0,1fr) 70px 104px 34px",gap:isMobile?"9px":"12px",padding:isMobile?"13px 8px":"12px",borderBottom:"1px solid #F2F2EE",alignItems:"center",cursor:"pointer",minWidth:0,borderRadius:isMobile?"8px":"0"}}
              onMouseEnter={e=>e.currentTarget.style.background="#FAFAF6"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{fontSize:i<3?"17px":"13.5px",fontWeight:900,color:i<3?MEDALS[i]:"#B8BDB8",textAlign:"center",fontFamily:F}}>{i+1}</div>
              <div style={{width:isMobile?"28px":"30px",height:isMobile?"28px":"30px",borderRadius:"50%",background:i<3?"linear-gradient(135deg,#FFF5D8,#F3E3B2)":"#F2F1ED",border:"1px solid "+(i<3?GOLD+"33":"#E1DED6"),display:"flex",alignItems:"center",justifyContent:"center",fontFamily:F,fontSize:isMobile?"10px":"10.5px",fontWeight:900,color:i<3?GOLD:"#69716B",letterSpacing:"0.4px",flexShrink:0}}>{artistInitials(a.n)}</div>
              <div className="ngoma-mobile-text-safe" style={{minWidth:0}}>
                <div style={{fontSize:isMobile?"15.5px":"15.5px",fontWeight:850,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",lineHeight:1.15}}>{a.n}</div>
                <div style={{fontSize:isMobile?"12.2px":"12px",color:"#59645D",fontFamily:F,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",marginTop:"4px",lineHeight:1.35}}>{a.t} {a.t===1?"title":"titles"} · Peak: #{a.pk} · {a.m} {a.m===1?"month":"months"}</div>
              </div>
              {!isMobile&&<div title={trend.label} style={{textAlign:"center",fontFamily:F,fontSize:"14px",fontWeight:900,color:trend.color}}>{trend.symbol}</div>}
              <div style={{textAlign:"right",fontFamily:F,fontSize:isMobile?"16px":"16px",fontWeight:900,color:GOLD,whiteSpace:"nowrap"}}>{a.p.toLocaleString()}</div>
              {!isMobile&&<div className="ngoma-artist-pts-label" style={{textAlign:"left",fontFamily:F,fontSize:"9.5px",color:"#7B857D",fontWeight:700}}>pts</div>}
            </div>
          )})}
        </div>
      )}

      {/* ANALYTICS PAGE */}
      {page==="analytics"&&(
        <div style={{padding:PAD,background:"transparent",minHeight:"60vh",boxSizing:"border-box",overflow:"hidden"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:isMobile?"stretch":"flex-end",marginBottom:"20px",gap:isMobile?"12px":"20px",flexDirection:isMobile?"column":"row"}}>
            <div><h2 style={{fontSize:TXT.pageTitle,fontWeight:800,margin:0}}>Analytics</h2><p style={{fontFamily:F,fontSize:isMobile?"12.5px":"11.5px",color:"#59645D",margin:"5px 0 0",lineHeight:1.6}}>Analytics are based on the full Top 50 across all platforms and months.</p></div>
            <div style={{display:"flex",gap:"8px",flexWrap:"wrap",width:isMobile?"100%":"auto"}}>
              <select value={anMonth} onChange={e=>setAnMonth(e.target.value)} style={{padding:isMobile?"10px 11px":"8px 12px",border:"1.5px solid #DDD",borderRadius:"8px",background:"#FFF",fontSize:isMobile?"12px":"10.5px",fontFamily:F,fontWeight:700,cursor:"pointer",outline:"none",minWidth:0,flex:isMobile?1:"initial"}}>
                {MONTHS.map(m=><option key={m} value={m}>{m}</option>)}
              </select>
              <Tog sm/>
              <ShareCardButton compact />
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
              {["Who dominated Q4 2024 overall?","Which song rose the fastest?","Compare singles vs albums platform performance","What predicts a #1 song?","Best Kenyan artists vs international?","Diamond certified breakdown","Which platform discovers trends earliest?","Cross-platform overlap analysis"].map(q=>(
                <button key={q} onClick={()=>setAiQ(q)} style={{padding:"4px 10px",background:"#FFF",border:"1px solid #E0E0DC",borderRadius:"14px",fontSize:"10px",fontFamily:F,color:"#888",cursor:"pointer"}}>{q}</button>
              ))}
            </div>
          </div>
          </div>{/* end AI hidden wrapper */}
          {/* SONG / ALBUM COMPARISON */}
          <div style={{...card(),padding:isMobile?"16px":"18px",marginBottom:isMobile?"18px":"20px",background:"linear-gradient(135deg,#FAFAF8,#FFFFFF)"}}>
            <div style={secLbl()}><SecMark/>{isSingles?"Song":"Album"} Head-to-Head</div>
            <p style={{fontFamily:F,fontSize:TXT.note,color:"#69716B",margin:"-8px 0 14px",lineHeight:1.45}}>Compare two {isSingles?"songs":"albums"} across points, rank, platforms, and chart history.</p>
            <div style={{display:"flex",gap:isMobile?"8px":"12px",alignItems:"center",marginBottom:isMobile?"12px":"14px",flexWrap:isMobile?"nowrap":"wrap"}}>
              <select value={cmpS1} onChange={e=>setCmpS1(e.target.value)} style={{flex:1,minWidth:0,padding:isMobile?"10px 9px":"8px 10px",border:"1.5px solid "+GOLD+"55",borderRadius:"7px",background:"#FFF",fontSize:isMobile?"12px":"11px",fontFamily:F,fontWeight:700,cursor:"pointer",outline:"none",color:"#1F241F"}}>
                {allTitles.map(t=><option key={t.key} value={t.key}>{t.title} — {t.artist}</option>)}
              </select>
              <span style={{fontFamily:F,fontSize:isMobile?"11px":"12px",color:"#8A928B",fontWeight:800,flexShrink:0}}>vs</span>
              <select value={cmpS2} onChange={e=>setCmpS2(e.target.value)} style={{flex:1,minWidth:0,padding:isMobile?"10px 9px":"8px 10px",border:"1.5px solid #1565C055",borderRadius:"7px",background:"#FFF",fontSize:isMobile?"12px":"11px",fontFamily:F,fontWeight:700,cursor:"pointer",outline:"none",color:"#1F241F"}}>
                {allTitles.map(t=><option key={t.key} value={t.key}>{t.title} — {t.artist}</option>)}
              </select>
            </div>
            {sp1&&sp2&&(<>
              {/* Title cards */}
              <div className="anl-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:isMobile?"10px":"12px",marginBottom:isMobile?"12px":"14px"}}>
                {[{d:sp1,c:GOLD},{d:sp2,c:"#1565C0"}].map(({d,c},i)=>(
                  <div key={i} onClick={()=>setSelR({title:d.title,artist:d.artist,type:isSingles?"single":"album"})} style={{padding:isMobile?"13px":"15px",background:c+"0D",borderRadius:"10px",borderLeft:"3px solid "+c,cursor:"pointer",minWidth:0}}>
                    <div style={{fontFamily:SF,fontSize:isMobile?"15px":"16px",fontWeight:800,lineHeight:1.15,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{d.title}</div>
                    <div style={{fontFamily:F,fontSize:isMobile?"11.5px":"11px",color:"#59645D",marginTop:"3px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{d.artist}</div>
                    <div style={{display:"flex",gap:isMobile?"12px":"16px",marginTop:isMobile?"10px":"12px",flexWrap:"wrap"}}>
                      <div><div style={{fontFamily:F,fontSize:isMobile?"18px":"20px",fontWeight:800,color:c}}>{d.totalPts.toLocaleString()}</div><div style={{fontFamily:F,fontSize:isMobile?"8.5px":"8.5px",letterSpacing:"1px",textTransform:"uppercase",color:"#69716B",fontWeight:700}}>Total Pts</div></div>
                      <div><div style={{fontFamily:F,fontSize:isMobile?"18px":"20px",fontWeight:800,color:c}}>#{d.peak}</div><div style={{fontFamily:F,fontSize:isMobile?"8.5px":"8.5px",letterSpacing:"1px",textTransform:"uppercase",color:"#69716B",fontWeight:700}}>Peak</div></div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Metric comparison table */}
              <div style={{marginBottom:"16px"}}>
                {(()=>{
                  const rows=[
                    {label:"Total Points",a:sp1.totalPts,b:sp2.totalPts,fmt:v=>v.toLocaleString(),hi:"max"},
                    {label:"Peak",a:sp1.peak,b:sp2.peak,fmt:v=>"#"+v,hi:"min"},
                    {label:"Avg. Rank",a:sp1.avgRank,b:sp2.avgRank,fmt:v=>"#"+v,hi:"min"},
                    {label:"Months",a:sp1.months,b:sp2.months,fmt:v=>v+"/3",hi:"max"},
                    {label:"#1 Finishes",a:sp1.numberOnes,b:sp2.numberOnes,fmt:v=>v+"×",hi:"max"},
                    {label:"Best Coverage",a:sp1.bestCov,b:sp2.bestCov,fmt:v=>v+"/"+tp,hi:"max"},
                    {label:"Platforms Charted",a:sp1.platformCount,b:sp2.platformCount,fmt:v=>v+"/"+tp,hi:"max"},
                    {label:"Appearances",a:sp1.appearances,b:sp2.appearances,fmt:v=>v+"×",hi:"max"},
                  ];
                  return rows.map((r,i)=>{
                    const aWins=r.hi==="max"?r.a>r.b:r.a<r.b;
                    const bWins=r.hi==="max"?r.b>r.a:r.b<r.a;
                    return(
                      <div key={i} style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",alignItems:"center",padding:isMobile?"6px 0":"7px 0",borderBottom:"1px solid #F0F0EC",gap:isMobile?"8px":"12px"}}>
                        <div style={{textAlign:"right",fontFamily:F,fontSize:isMobile?"13px":"14px",fontWeight:aWins?800:650,color:aWins?GOLD:"#59645D"}}>{r.fmt(r.a)}{aWins&&<span style={{fontSize:"9px",marginLeft:"4px"}}>▲</span>}</div>
                        <div style={{textAlign:"center",fontFamily:F,fontSize:isMobile?"8.8px":"9.5px",letterSpacing:"1px",textTransform:"uppercase",color:"#69716B",minWidth:isMobile?"88px":"120px",fontWeight:750}}>{r.label}</div>
                        <div style={{textAlign:"left",fontFamily:F,fontSize:isMobile?"13px":"14px",fontWeight:bWins?800:650,color:bWins?"#1565C0":"#59645D"}}>{bWins&&<span style={{fontSize:"9px",marginRight:"4px"}}>▲</span>}{r.fmt(r.b)}</div>
                      </div>
                    );
                  });
                })()}
              </div>
              {/* Points + Rank charts */}
              <div className="anl-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px"}}>
                <div>
                  <div style={{fontFamily:F,fontSize:isMobile?"10px":"9.5px",fontWeight:800,letterSpacing:"1.4px",textTransform:"uppercase",color:"#59645D",marginBottom:"8px"}}>Points by Month</div>
                  <ResponsiveContainer width="100%" height={isMobile?172:158}>
                    <BarChart data={songMonthlyData} margin={{top:14,right:isMobile?10:12,left:isMobile?0:4,bottom:4}}>
                      <XAxis dataKey="month" tick={{fontSize:isMobile?11:10.5,fontFamily:F,fill:"#59645D",fontWeight:650}} tickLine={false}/>
                      <YAxis tick={{fontSize:isMobile?10.5:10,fontFamily:F,fill:"#59645D",fontWeight:650}} tickFormatter={v=>v>=1000?(v/1000)+"k":v} axisLine={false} tickLine={false}/>
                      <Tooltip contentStyle={{fontFamily:F,fontSize:11}} formatter={(v,n)=>[v.toLocaleString()+" pts",n==="A"?sp1.title:sp2.title]}/>
                      <Bar dataKey="A" fill={GOLD} radius={[3,3,0,0]}/>
                      <Bar dataKey="B" fill="#1565C0" radius={[3,3,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <div style={{fontFamily:F,fontSize:isMobile?"10px":"9.5px",fontWeight:800,letterSpacing:"1.4px",textTransform:"uppercase",color:"#59645D",marginBottom:"8px"}}>Rank Trajectory (lower = better)</div>
                  <ResponsiveContainer width="100%" height={isMobile?172:158}>
                    <LineChart data={songRankData} margin={{top:14,right:isMobile?12:14,left:isMobile?0:4,bottom:4}}>
                      <XAxis dataKey="month" tick={{fontSize:isMobile?11:10.5,fontFamily:F,fill:"#59645D",fontWeight:650}} tickLine={false}/>
                      <YAxis reversed domain={[1,"dataMax"]} tick={{fontSize:isMobile?10.5:10,fontFamily:F,fill:"#59645D",fontWeight:650}} tickFormatter={v=>"#"+v} axisLine={false} tickLine={false}/>
                      <Tooltip contentStyle={{fontFamily:F,fontSize:11}} formatter={(v,n)=>["#"+v,n==="A"?sp1.title:sp2.title]}/>
                      <Line dataKey="A" stroke={GOLD} strokeWidth={2.5} dot={{r:4}} connectNulls/>
                      <Line dataKey="B" stroke="#1565C0" strokeWidth={2.5} dot={{r:4}} connectNulls/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
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
                      <div style={{fontSize:"13px",fontWeight:800,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{e.name}</div>
                      <div style={{fontFamily:F,fontSize:"12px",fontWeight:900,color:GOLD,textAlign:"right",whiteSpace:"nowrap"}}>{e.pts.toLocaleString()} pts</div>
                    </div>
                  ))}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={top10sData} layout="vertical" margin={{left:10,right:20,top:0,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC" horizontal={false}/>
                    <XAxis type="number" tick={{fontSize:10.5,fontFamily:F,fill:"#59645D",fontWeight:650}} tickFormatter={v=>v.toLocaleString()} axisLine={false} tickLine={false}/>
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
                      <div style={{fontSize:isMobile?"13px":"11.5px",fontWeight:800,lineHeight:1.2}}>{d.t}</div>
                      <div style={{fontSize:isMobile?"11px":"10px",color:"#59645D",fontFamily:F,marginTop:"3px"}}>{d.a} · {d.p} pts</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          {/* Top artists points line chart */}
          <AnalyticsDeepSection label="View artist trajectory">
          <div style={{...card(),marginBottom:"20px"}}>
            <div style={secLbl()}><SecMark/>Top 5 Artists — Points Trajectory ({chartTypeLabel})</div>
            <ResponsiveContainer width="100%" height={isMobile?260:240}>
              <LineChart data={topArtistsLine} margin={{top:10,right:isMobile?18:24,left:isMobile?0:8,bottom:isMobile?4:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC"/>
                <XAxis dataKey="month" tick={{fontSize:isMobile?11:11,fontFamily:F,fill:"#59645D",fontWeight:650}} tickLine={false}/>
                <YAxis tick={{fontSize:isMobile?10.5:10.5,fontFamily:F,fill:"#59645D",fontWeight:650}} tickFormatter={v=>v.toLocaleString()} axisLine={false} tickLine={false}/>
                <Tooltip formatter={(v,n)=>[v.toLocaleString()+" pts",n]} contentStyle={{fontFamily:F,fontSize:11}}/>
                <Legend wrapperStyle={{fontFamily:F,fontSize:isMobile?11:10.5,color:"#59645D"}}/>
                {artists.slice(0,5).map((a,i)=>(
                  <Line key={a.n} type="monotone" dataKey={a.n} stroke={CC[i]} strokeWidth={2} dot={{r:4}} activeDot={{r:6}}/>
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          </AnalyticsDeepSection>
          {/* Cross-platform overlap + Coverage pie */}
          <AnalyticsDeepSection label="View platform reach">
          <div className="anl-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginBottom:"20px"}}>
            <div style={card()}>
              <div style={secLbl()}><SecMark/>Cross-Platform Reach — {anMonth}</div>
              <p style={{fontFamily:F,fontSize:"10px",color:"#59645D",margin:"-4px 0 12px",lineHeight:1.45}}>{releaseLabel} charting on most platforms simultaneously.</p>
              {crossPlatformRows.slice(0,8).map((s,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid #F0F0EC"}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:isMobile?"13px":"12px",fontWeight:800}}>{s.t}</div>
                    <div style={{fontSize:isMobile?"11px":"10.5px",color:"#59645D",fontFamily:F,marginTop:"2px"}}>{s.a}</div>
                  </div>
                  <div style={{display:"flex",gap:"3px",alignItems:"center"}}>
                    {s.plats.map(pl=><div key={pl} style={{width:"7px",height:"7px",borderRadius:"50%",background:PC[pl]||"#888"}} title={PLAT_LABEL[pl]}/>)}
                    <span style={{fontFamily:F,fontSize:isMobile?"12px":"11px",fontWeight:700,color:GOLD,marginLeft:"6px"}}>{s.count}/{currentPlatformKeys.length}</span>
                  </div>
                </div>
              ))}
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
            <AnalyticsDeepSection label="View platform totals">
            <div style={{...card(),marginBottom:"20px"}}>
              <div style={secLbl()}><SecMark/>Total Points Distributed Per Platform — {anMonth}</div>
              <ResponsiveContainer width="100%" height={isMobile?230:200}>
                <BarChart data={platTotalsData} margin={{top:12,right:isMobile?16:20,left:isMobile?0:8,bottom:isMobile?6:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC"/>
                  <XAxis dataKey="platform" tick={{fontSize:isMobile?10.5:10,fontFamily:F,fill:"#59645D",fontWeight:650}} tickLine={false}/>
                  <YAxis tick={{fontSize:isMobile?10.5:10,fontFamily:F,fill:"#59645D",fontWeight:650}} tickFormatter={v=>v.toLocaleString()} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{fontFamily:F,fontSize:11}} formatter={v=>[v.toLocaleString()+" pts","Total Points"]}/>
                  <Bar dataKey="points" radius={[4,4,0,0]}>{platTotalsData.map((e,i)=><Cell key={i} fill={e.color}/>)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            </AnalyticsDeepSection>
          )}
          {/* Local vs International */}
          {(()=>{
            const KENYAN=new Set(["Bensoul","Dyana Cods","Ssaru","D Voice","Geniusjini x66","Nadia Mukami","Iyanii","Charisma","Lilmaina","Savara","Sauti Sol","Nyashinski","Bien","Watendawili","Coster Ojwang","Otile Brown","Octopizzo","Njerae","Matata","Mutoriah","Fathermoh","Soundkraft","Bella Kombo","Wadagliz","Wakadinali","BURUKLYN BOYZ","Sosa The Prodigy","Obby Alpha","Prince Indah","Lil Maina","Spoiler"]);
            const cd=getCombined(ct,anMonth);
            let local=0,intl=0,localPts=0,intlPts=0;
            cd.forEach(e=>{if(KENYAN.has(e.artist)){local++;localPts+=e.pts;}else{intl++;intlPts+=e.pts;}});
            const pieData=[{name:"Kenyan",value:local,color:GOLD},{name:"International",value:intl,color:"#37474F"}];
            return(
              <div style={{...card(),marginBottom:"20px"}}>
                <div style={secLbl()}><SecMark/>Local vs International — {anMonth}</div>
                <p style={{fontFamily:F,fontSize:TXT.note,color:"#69716B",margin:"-6px 0 14px",lineHeight:1.45}}>Share of the Top 50 by Kenyan and international artists.</p>
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
            );
          })()}
          {/* Climbers & Fallers */}
          <div className="anl-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginBottom:"20px"}}>
            <div style={card()}>
              <div style={secLbl("#2DB04A")}><SecMark c="#2DB04A"/>Top {releaseLabel} Climbers — {anMonth}</div>
              {mvData.risers.map((s,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:isMobile?"8px 0":"6px 0",borderBottom:"1px solid #F0F0EC"}}>
                  <div><div style={{fontSize:TXT.cardTitle,fontWeight:800,lineHeight:1.15}}>{s.t}</div><div style={{fontSize:TXT.cardMeta,color:"#69716B",fontFamily:F,marginTop:"3px"}}>{s.a}</div></div>
                  <div style={{textAlign:"right",fontFamily:F}}><div style={{color:"#2DB04A",fontSize:TXT.cardMeta,fontWeight:800}}>▲{s.from-s.to}</div><div style={{fontSize:TXT.micro,color:"#7B857D"}}>#{s.from}→#{s.to}</div></div>
                </div>
              ))}
              {!mvData.risers.length&&<div style={{fontFamily:F,fontSize:isMobile?"12px":"11px",color:"#CCC",padding:"20px 0",textAlign:"center"}}>No movement data (debut month)</div>}
            </div>
            <div style={card()}>
              <div style={secLbl("#E53935")}><SecMark c="#E53935"/>Biggest {releaseLabel} Drops — {anMonth}</div>
              {mvData.fallers.map((s,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:isMobile?"8px 0":"6px 0",borderBottom:"1px solid #F0F0EC"}}>
                  <div><div style={{fontSize:TXT.cardTitle,fontWeight:800,lineHeight:1.15}}>{s.t}</div><div style={{fontSize:TXT.cardMeta,color:"#69716B",fontFamily:F,marginTop:"3px"}}>{s.a}</div></div>
                  <div style={{textAlign:"right",fontFamily:F}}><div style={{color:"#E53935",fontSize:TXT.cardMeta,fontWeight:800}}>▼{s.to-s.from}</div><div style={{fontSize:TXT.micro,color:"#7B857D"}}>#{s.from}→#{s.to}</div></div>
                </div>
              ))}
              {!mvData.fallers.length&&<div style={{fontFamily:F,fontSize:isMobile?"12px":"11px",color:"#CCC",padding:"20px 0",textAlign:"center"}}>No drops (debut month)</div>}
            </div>
          </div>
          {/* Top 10 Artists Bar */}
          <AnalyticsDeepSection label="View top artists chart">
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
          <AnalyticsDeepSection label={isSingles?"View song rank journey":"View album rank journey"}>
          <div style={card()}>
            <div style={secLbl()}><SecMark/>{isSingles?"Top Songs Rank Journey Across Months":"Top Albums Rank Journey Across Months"}</div>
            {tracked.map(title=>{
              const hasAny=MONTHS.some(m=>getCombined(ct,m).find(e=>e.title===title));
              if(!hasAny)return null;
              return(<div key={title} style={{display:"flex",alignItems:"center",padding:"7px 0",borderBottom:"1px solid #F0F0EC",gap:"8px"}}>
                <div style={{flex:1,fontSize:isMobile?"12.5px":"11.5px",fontWeight:800,lineHeight:1.2,cursor:"pointer",color:GOLD,minWidth:0,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}} onClick={()=>{const e=MONTHS.flatMap(m=>getCombined(ct,m)).find(x=>x.title===title);if(e)setSelR({...e,type:isSingles?"single":"album"});}}>{title}</div>
                {MONTHS.map(m=>{const e=getCombined(ct,m).find(x=>x.title===title);return(<div key={m} style={{width:"44px",textAlign:"center",fontFamily:F}}>
                  <div style={{fontSize:isMobile?"9px":"8.5px",color:"#69716B",fontWeight:700}}>{m.split(" ")[0].slice(0,3)}</div>
                  {e?<div style={{fontSize:"14px",fontWeight:800,color:e.rank===1?GOLD:e.rank<=3?"#1A1A1A":"#888"}}>#{e.rank}</div>:<div style={{fontSize:"11px",color:"#E0E0DC"}}>—</div>}
                </div>);})}
              </div>);
            })}
          </div>
          </AnalyticsDeepSection>
        </div>
      )}

      {/* TRENDING / PREDICTIONS PAGE */}
      {page==="trending"&&(
        <div style={{padding:PAD,minHeight:"60vh",boxSizing:"border-box",overflow:"hidden"}}>
          <div style={{maxWidth:"1240px",margin:"0 auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:isMobile?"flex-start":"flex-end",marginBottom:isMobile?"16px":"20px",flexWrap:"wrap",gap:isMobile?"10px":"12px"}}>
              <div style={{minWidth:0,flex:isMobile?"1 1 100%":"1"}}>
                <div style={{fontFamily:F,fontSize:isMobile?"9px":"10.5px",letterSpacing:isMobile?"2.2px":"2.6px",textTransform:"uppercase",color:"#2DB04A",marginBottom:"6px"}}>MOMENTUM ENGINE</div>
                <h2 style={{fontSize:isMobile?"24px":"24px",fontWeight:800,margin:0}}>Trending Up</h2>
                <p style={{fontFamily:F,fontSize:isMobile?"12px":"11px",color:"#626A64",margin:"6px 0 0",lineHeight:1.55}}>Tracks rising fastest across the charts, based on recent point gains.</p>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:isMobile?"10px":"12px",flexWrap:"wrap",marginTop:isMobile?"2px":0}}>
                <Tog sm/>
                <ShareCardButton compact />
              </div>
            </div>

            <div style={{...card({background:"linear-gradient(135deg,#F4FBF5,#FFFFFF)",borderColor:"#2DB04A22",padding:isMobile?"18px":"24px"}),marginBottom:isMobile?"16px":"20px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"6px"}}>
                <span style={{fontSize:"22px"}}>🔥</span>
                <div>
                  <div style={{fontFamily:F,fontSize:isMobile?"10.5px":"11px",fontWeight:800,letterSpacing:"1px",textTransform:"uppercase",color:"#2DB04A"}}>Highest Momentum</div>
                  <div style={{fontFamily:F,fontSize:isMobile?"12px":"11px",color:"#68746C"}}>Highest momentum score in {latestMonth}</div>
                </div>
              </div>
              {(()=>{const list=uniqueByMomentumIdentity((isSingles?MOM.predictions.singles:MOM.predictions.albums).rising);const hot=list[0];if(!hot)return null;
                return(
                  <div style={{display:"flex",flexDirection:isMobile?"column":"row",alignItems:isMobile?"stretch":"center",gap:isMobile?"18px":"28px",marginTop:"14px"}}>
                    <div style={{flex:1,minWidth:isMobile?"0":"260px"}}>
                      <div style={{fontFamily:SF,fontSize:isMobile?"23px":"28px",fontWeight:850,cursor:"pointer",lineHeight:1.08}} onClick={()=>openMomentumRelease(hot)}>{hot.t}</div>
                      <div style={{fontFamily:F,fontSize:isMobile?"15px":"15px",color:"#69716B",marginTop:"6px",fontWeight:700}}>{hot.a}</div>
                      <div style={{display:"flex",gap:isMobile?"14px":"20px",marginTop:"12px",flexWrap:"wrap"}}>
                        <div><div style={{fontFamily:F,fontSize:isMobile?"20px":"20px",fontWeight:900,color:"#2DB04A"}}>+{hot.mom.toLocaleString()}</div><div style={{fontFamily:F,fontSize:"10px",letterSpacing:"1px",textTransform:"uppercase",color:"#7B857D",fontWeight:800}}>Momentum</div></div>
                        <div><div style={{fontFamily:F,fontSize:isMobile?"20px":"20px",fontWeight:900,color:GOLD}}>#{hot.decRank}</div><div style={{fontFamily:F,fontSize:"10px",letterSpacing:"1px",textTransform:"uppercase",color:"#7B857D",fontWeight:800}}>{latestMonthShort} Rank</div></div>
                        <div><div style={{fontFamily:F,fontSize:isMobile?"20px":"20px",fontWeight:900,color:"#1A1A1A"}}>{hot.decPts?.toLocaleString?.() || "—"}</div><div style={{fontFamily:F,fontSize:"10px",letterSpacing:"1px",textTransform:"uppercase",color:"#7B857D",fontWeight:800}}>{latestMonthShort} Points</div></div>
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
              <div style={secLbl("#2DB04A")}><SecMark c="#2DB04A"/>Rising Fast — Top Momentum {isSingles?"Singles":"Albums"}</div>
              {uniqueByMomentumIdentity((isSingles?MOM.predictions.singles:MOM.predictions.albums).rising).map((p,i)=>{
                return(
                  <div key={`${p.t}-${p.a}-${p.decRank}`} style={{display:"grid",gridTemplateColumns:isMobile?"28px minmax(0,1fr) minmax(84px,96px)":"34px minmax(0,1fr) 114px 92px 14px",gap:isMobile?"9px":"12px",alignItems:"center",padding:isMobile?"14px 10px 14px 14px":"12px 4px",margin:isMobile?"0 2px":"0",borderBottom:"1px solid #F2F2EE",cursor:"pointer",borderRadius:isMobile?"12px":"8px",boxSizing:"border-box",overflow:"hidden"}}
                    onClick={()=>openMomentumRelease(p)}
                    onMouseEnter={e=>e.currentTarget.style.background="#FAFAF6"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <div style={{fontFamily:F,fontSize:isMobile?"16px":"16px",fontWeight:850,color:"#8E948D",textAlign:"center",transform:isMobile?"translateX(2px)":"translateX(2px)"}}>{i+1}</div>
                    <div style={{minWidth:0,paddingLeft:isMobile?"2px":"2px",boxSizing:"border-box"}}>
                      <div style={{fontSize:isMobile?"15px":"15px",fontWeight:800,lineHeight:1.15,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.t}</div>
                      <div style={{fontSize:isMobile?"12px":"12px",color:"#69716B",fontFamily:F,marginTop:"4px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.a} · #{p.decRank} in {latestMonthShort} · {p.decPts?.toLocaleString?.() || "—"} pts</div>
                    </div>
                    {isMobile ? (
                      <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:"8px",minWidth:0,width:"100%",paddingRight:"0",boxSizing:"border-box",transform:"translateX(2px)"}}>
                        <div style={{width:"34px",flex:"0 0 34px",display:"flex",justifyContent:"flex-end",overflow:"hidden"}}>
                          <TrendBars trend={p.trend} compact height={30}/>
                        </div>
                        <div style={{fontFamily:F,minWidth:"38px",textAlign:"left",lineHeight:1}}>
                          <span style={{fontSize:isMobile?"15px":"15px",fontWeight:900,color:"#2DB04A"}}>+{p.mom.toLocaleString()}</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <TrendBars trend={p.trend} compact height={30}/>
                        <div style={{textAlign:"right",fontFamily:F}}>
                          <span style={{fontSize:isMobile?"15px":"15px",fontWeight:900,color:"#2DB04A"}}>+{p.mom.toLocaleString()}</span>
                          <div style={{fontSize:"10px",color:"#7B857D",letterSpacing:"1px",textTransform:"uppercase",fontWeight:800}}>momentum</div>
                        </div>
                        <div style={{fontFamily:F,fontSize:"16px",fontWeight:800,color:"#B6BDB7",textAlign:"right"}}>›</div>
                      </>
                    )}
                  </div>
                );
              })}
              <div style={{padding:"13px 0 0",fontFamily:F,fontSize:isMobile?"11px":"11px",color:"#6E746F",textAlign:"center",lineHeight:1.55}}>{formulaLabel} · Bars show {trendLabelText} point totals.</div>
            </div>

            {/* Strong Debuts */}
            <div style={{...card({padding:isMobile?"18px":"22px"}),marginTop:isMobile?"16px":"20px"}}>
              <div style={secLbl("#1565C0")}><SecMark c="#1565C0"/>Strongest {latestMonthName} Debuts</div>
              <p style={{fontFamily:F,fontSize:isMobile?"12px":"11px",color:"#69716B",margin:"-8px 0 14px",lineHeight:1.45}}>New entries that arrived high in {latestMonth}.</p>
              <div className="anl-grid-3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:isMobile?"8px":"10px"}}>
                {uniqueByMomentumIdentity((isSingles?MOM.predictions.singles:MOM.predictions.albums).debuts).map((p)=>(
                  <div key={`${p.t}-${p.a}-${p.decRank}`} onClick={()=>openMomentumRelease(p)} style={{padding:isMobile?"10px 12px":"14px",background:"#F5F8FC",borderRadius:"10px",border:"1px solid #1565C022",cursor:"pointer",display:"grid",gridTemplateColumns:"1fr auto",gap:"8px",alignItems:"center"}}
                    onMouseEnter={e=>e.currentTarget.style.background="#EEF5FF"} onMouseLeave={e=>e.currentTarget.style.background="#F5F8FC"}>
                    <div style={{minWidth:0}}>
                      <div style={{fontSize:isMobile?"15px":"15px",fontWeight:800,lineHeight:1.15,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.t}</div>
                      <div style={{fontSize:isMobile?"12px":"12px",color:"#69716B",fontFamily:F,marginTop:"4px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.a} · {p.decPts.toLocaleString()} pts</div>
                    </div>
                    <span style={{fontFamily:F,fontSize:isMobile?"16px":"16px",fontWeight:900,color:"#1565C0"}}>#{p.decRank}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RECORDS & MILESTONES PAGE */}
      {page==="records"&&(
        <div style={{padding:PAD,minHeight:"60vh",boxSizing:"border-box",overflow:"hidden"}}>
          <div style={{marginBottom:isMobile?"18px":"22px"}}>
            <div style={{maxWidth:isMobile?"100%":"620px"}}>
              <div style={{fontFamily:F,fontSize:TXT.kicker,letterSpacing:"2.6px",textTransform:"uppercase",color:GOLD,marginBottom:"6px"}}>THE RECORD BOOK</div>
              <h2 style={{fontSize:TXT.pageTitle,fontWeight:800,margin:0}}>Records & Milestones</h2>
              <p style={{fontFamily:F,fontSize:TXT.lead,color:"#59645D",margin:"4px 0 0",lineHeight:1.55}}>{chartTypeLabel} achievements across all tracked months · the chart's defining moments</p>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:isMobile?"10px":"12px",marginTop:isMobile?"14px":"16px",flexWrap:"wrap"}}>
              <Tog sm/>
              <ShareCardButton compact />
            </div>
          </div>
          <div className="anl-grid-3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:isMobile?"14px":"16px"}}>
            {currentRecords.map((r,i)=>{
              const expanded = r.isCoverage && openRecord === i;
              return (
                <div key={`${r.displayLabel}-${r.value}`} onClick={()=>r.isCoverage&&setOpenRecord(expanded?null:i)} style={{...card({padding:isMobile?"19px":"24px"}),position:"relative",overflow:"hidden",cursor:r.isCoverage?"pointer":"default"}}>
                  <div style={{position:"absolute",top:isMobile?"8px":"12px",right:isMobile?"10px":"14px",opacity:1}}><RecordIcon label={r.displayLabel} size={isMobile?54:66} muted /></div>
                  <div style={{marginBottom:"13px",position:"relative",zIndex:1}}><RecordIcon label={r.displayLabel} size={isMobile?28:30} /></div>
                  <div style={{fontFamily:F,fontSize:isMobile?"10px":"10.5px",fontWeight:850,letterSpacing:"2px",textTransform:"uppercase",color:GOLD,marginBottom:"9px",position:"relative",zIndex:1,lineHeight:1.35}}>{r.displayLabel}</div>
                  <div style={{fontFamily:SF,fontSize:isMobile?"20px":"21px",fontWeight:850,lineHeight:1.12,marginBottom:"5px",position:"relative",zIndex:1}}>{r.value}</div>
                  <div style={{fontFamily:F,fontSize:isMobile?"13px":"13px",color:"#59645D",lineHeight:1.45,position:"relative",zIndex:1,display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap"}}>
                    <span>{r.displaySub}</span>
                    {r.climbDelta&&<span style={{display:"inline-flex",alignItems:"center",padding:"2px 7px",borderRadius:"999px",background:"#EAF8EF",color:"#1E8E3E",fontSize:"10px",fontWeight:900,letterSpacing:"0.4px"}}>+{r.climbDelta}</span>}
                  </div>
                  {r.isCoverage&&(
                    <div style={{fontFamily:F,fontSize:isMobile?"10.5px":"10.5px",color:GOLD,fontWeight:800,letterSpacing:"0.5px",marginTop:"12px",position:"relative",zIndex:1}}>{expanded?`Hide ${releaseLabelLower}`:`View ${releaseLabelLower}`}</div>
                  )}
                  {expanded&&(
                    <div style={{marginTop:"12px",paddingTop:"12px",borderTop:"1px solid #F0EEE8",position:"relative",zIndex:1}}>
                      {fullCoverageClub.length?fullCoverageClub.slice(0,6).map((song,idx)=>(
                        <div key={`${song.title}-${song.artist}`} style={{display:"grid",gridTemplateColumns:"22px minmax(0,1fr)",gap:"8px",alignItems:"start",padding:"6px 0",fontFamily:F}}>
                          <span style={{fontSize:"10px",fontWeight:900,color:GOLD}}>#{idx+1}</span>
                          <span style={{minWidth:0}}><strong style={{fontSize:"12px",color:"#1A1A1A"}}>{song.title}</strong><span style={{display:"block",fontSize:"11px",color:"#59645D",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{song.artist} · {song.month}</span></span>
                        </div>
                      )):<div style={{fontFamily:F,fontSize:"12px",color:"#59645D"}}>No full-coverage entries found for this view.</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* YEAR-END PAGE */}
      {page==="year-end"&&(
        <div style={{padding:PAD,background:"#FFF",minHeight:"60vh",boxSizing:"border-box",overflow:"hidden"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:isMobile?"stretch":"flex-end",marginBottom:isMobile?"16px":"20px",gap:isMobile?"12px":"20px",flexDirection:isMobile?"column":"row"}}>
            <div>
              <div style={{fontFamily:F,fontSize:isMobile?"10.5px":"11px",letterSpacing:isMobile?"1.8px":"2px",textTransform:"uppercase",color:GOLD,marginBottom:"6px",fontWeight:850}}>ANNUAL CHART</div>
              <h2 style={{fontSize:TXT.pageTitle,fontWeight:800,margin:0}}>Best of 2024</h2>
              <p style={{fontFamily:F,fontSize:TXT.lead,color:"#59645D",margin:"4px 0 0",lineHeight:1.55}}>Aggregated points across October, November & December 2024</p>
            </div>
            <div className="year-end-actions" data-share-action-area="true" style={{display:"flex",alignItems:"center",gap:isMobile?"10px":"12px",flexWrap:"wrap",position:isMobile?"sticky":"static",top:isMobile?"0":"auto",zIndex:isMobile?5:"auto",background:isMobile?"#FFF":"transparent",padding:isMobile?"8px 0 4px":"0"}}>
              <Tog sm/>
              <ShareCardButton compact />
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
                  return(<div key={`${pos}-${e.t}-${e.a}`} style={{textAlign:"center",cursor:"pointer"}} onClick={()=>setSelR({title:e.t,artist:e.a,type:isSingles?"single":"album"})}>
                    <div style={{background:featured?"linear-gradient(180deg,#FFF9E8 0%,#FFFDF8 100%)":medal+"12",border:(featured?"2.5px":"2px")+" solid "+medal,borderRadius:isMobile?"12px":"13px",padding:featured?(isMobile?"18px 12px":"18px 14px"):(isMobile?"15px 12px":"16px 12px"),boxShadow:featured?"0 14px 36px rgba(184,134,11,0.16)":"none",transform:(!isMobile&&featured)?"translateY(-2px)":"none"}}>
                      <div style={{fontSize:featured?(isMobile?"33px":"38px"):"32px",fontWeight:950,color:medal,lineHeight:1}}>#{pos}</div>
                      <div style={{fontSize:featured?(isMobile?"16px":"16px"):TXT.cardTitle,fontWeight:850,margin:"8px 0 4px",lineHeight:1.18}}>{e.t}</div>
                      <div style={{fontSize:TXT.cardMeta,color:"#59645D",fontFamily:F,marginBottom:"8px"}}>{e.a}</div>
                      <div style={{fontSize:featured?(isMobile?"18px":"20px"):"18px",fontWeight:850,color:medal}}>{e.totalPts.toLocaleString()}</div>
                      <div style={{fontSize:"9.5px",color:"#7B817B",fontFamily:F}}>total pts · {e.months} months</div>
                    </div>
                  </div>);
                })}
              </div>
            );
          })()}

          {/* Full list */}
          <div style={{
            overflowX:isMobile?"auto":"visible",
            overflowY:"hidden",
            WebkitOverflowScrolling:"touch",
            margin:isMobile?"0 -4px":"0",
            paddingBottom:isMobile?"2px":"0"
          }}>
            <div style={{minWidth:isMobile?"350px":"0",width:"100%"}}>
              <div style={{
                display:"grid",
                gridTemplateColumns:isMobile?"34px minmax(90px,1fr) 92px 64px":"54px minmax(0,1fr) 148px 92px",
                columnGap:isMobile?"16px":"30px",
                padding:isMobile?"10px 12px":"11px 0",
                borderBottom:"2px solid #1A1A1A",
                fontFamily:F,
                fontSize:isMobile?"7.8px":"9px",
                fontWeight:900,
                letterSpacing:isMobile?"0.75px":"1.8px",
                textTransform:"uppercase",
                color:"#4F5751",
                alignItems:"end"
              }}>
                <span style={{textAlign:"center"}}>#</span>
                <span>TITLE</span>
                <span style={{textAlign:"center",justifySelf:"stretch",whiteSpace:"nowrap"}}>TOTAL PTS</span>
                <span style={{textAlign:"center",justifySelf:"stretch",whiteSpace:"nowrap",borderLeft:isMobile?"1px solid #E6E0D2":"none",paddingLeft:0}}>MONTHS</span>
              </div>

              {yearEnd.slice(0,50).map((item,idx)=>{
                const t3=idx<3;
                return(
                  <div
                    key={item.t+item.a}
                    style={{
                      display:"grid",
                      gridTemplateColumns:isMobile?"34px minmax(90px,1fr) 92px 64px":"54px minmax(0,1fr) 148px 92px",
                      columnGap:isMobile?"16px":"30px",
                      padding:t3?(isMobile?"13px 12px":"13px 0"):(isMobile?"10px 12px":"9px 0"),
                      borderBottom:"1px solid #F2F2EE",
                      alignItems:"center",
                      cursor:"pointer"
                    }}
                    onMouseEnter={e=>e.currentTarget.style.background="#FAFAF6"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                    onClick={()=>setSelR({title:item.t,artist:item.a,type:isSingles?"single":"album"})}
                  >
                    <div style={{textAlign:"center",fontSize:t3?(isMobile?"19px":"20px"):(isMobile?"12px":"13px"),fontWeight:850,color:t3?MEDALS[idx]:"#BFC4BF"}}>{idx+1}</div>

                    <div style={{minWidth:0}}>
                      <div style={{
                        fontSize:t3?(isMobile?"13.5px":"14px"):TXT.cardTitle,
                        fontWeight:850,
                        marginBottom:"1px",
                        lineHeight:1.15,
                        whiteSpace:isMobile?"nowrap":"normal",
                        overflow:isMobile?"hidden":"visible",
                        textOverflow:isMobile?"ellipsis":"clip"
                      }}>
                        {item.t}
                      </div>
                      <div style={{
                        fontSize:TXT.cardMeta,
                        color:"#59645D",
                        fontFamily:F,
                        marginTop:"3px",
                        whiteSpace:isMobile?"nowrap":"normal",
                        overflow:isMobile?"hidden":"visible",
                        textOverflow:isMobile?"ellipsis":"clip"
                      }}>
                        {item.a}
                      </div>
                    </div>

                    <div style={{
                      textAlign:"center",
                      justifySelf:"stretch",
                      fontFamily:F,
                      fontSize:t3?(isMobile?"13px":"14px"):TXT.cardMeta,
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
                      fontSize:isMobile?"10.8px":"11px",
                      color:"#7B817B",
                      fontWeight:750,
                      whiteSpace:"nowrap",
                      borderLeft:isMobile?"1px solid #F0EADB":"none",
                      paddingLeft:0
                    }}>
                      {item.months}/3
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CERTIFICATIONS PAGE */}
      {page==="certifications"&&(
        <div style={{padding:PAD,background:"#FFF",minHeight:"60vh",boxSizing:"border-box",overflow:"hidden"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:isMobile?"stretch":"flex-end",marginBottom:"24px",gap:isMobile?"12px":"20px",flexDirection:isMobile?"column":"row"}}>
            <div>
              <h2 style={{fontSize:TXT.pageTitle,fontWeight:800,margin:"0 0 4px"}}>Ngoma Certifications</h2>
              <p style={{fontFamily:F,fontSize:TXT.lead,color:"#69716B",margin:0,lineHeight:1.55}}>Awarded based on cumulative combined chart points across all months · Computed from full Top 50</p>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:isMobile?"10px":"12px",flexWrap:"wrap"}}>
              <Tog sm/>
              <ShareCardButton compact />
            </div>
          </div>
          <div className="anl-grid-4" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px",marginBottom:"28px"}}>
            {[{icon:"💎",l:"Diamond",pts:"5,000+",color:"#7B1FA2"},{icon:"🪙",l:"Platinum",pts:"2,000+",color:SILVER},{icon:"🥇",l:"Gold",pts:"1,000+",color:GOLD},{icon:"🎵",l:"Ngoma",pts:"500+",color:"#2DB04A"}].map((c,i)=>(
              <div key={i} style={{...card({textAlign:"center"}),borderTop:"3px solid "+c.color}}>
                <div style={{fontSize:"28px"}}>{c.icon}</div>
                <div style={{fontWeight:800,fontSize:TXT.metric,margin:"6px 0 2px",color:c.color}}>{c.l}</div>
                <div style={{fontFamily:F,fontSize:TXT.cardMeta,color:"#69716B"}}>{c.pts} points</div>
              </div>
            ))}
          </div>
          <div style={{marginTop:"16px"}}>
            {["diamond","platinum","gold","ngoma"].map(level=>{
              const filtered=certs.filter(c=>c.level===level);
              if(!filtered.length)return null;
              return(<div key={level} style={{marginBottom:"24px"}}>
                <div style={{...secLbl(certColors[level]),marginBottom:"12px"}}>{certIcons[level]} {level.charAt(0).toUpperCase()+level.slice(1)} Certified ({filtered.length})</div>
                <div className="anl-grid-2" style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"8px"}}>
                  {filtered.map((c,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:"12px",padding:"12px 14px",background:certColors[level]+"0A",borderRadius:"8px",border:"1px solid "+certColors[level]+"22",cursor:"pointer"}} onClick={()=>setSelR({title:c.t,artist:c.a,type:isSingles?"single":"album"})}>
                      <div style={{fontSize:"22px"}}>{certIcons[level]}</div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:800,fontSize:TXT.cardTitle,lineHeight:1.18}}>{c.t}</div>
                        <div style={{fontFamily:F,fontSize:TXT.cardMeta,color:"#69716B",marginTop:"3px"}}>{c.a}</div>
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
      {page==="news"&&!selNews&&(
        <div style={{padding:PAD,background:"transparent",minHeight:"60vh",boxSizing:"border-box",overflow:"hidden"}}>
          <h2 style={{fontSize:TXT.pageTitle,fontWeight:800,margin:"0 0 4px"}}>Chart News</h2>
          <p style={{fontFamily:F,fontSize:TXT.lead,color:"#69716B",margin:"0 0 24px",lineHeight:1.55}}>Analysis and stories from Kenya's music charts</p>
          <div style={{display:"grid",gap:"14px"}}>
            {NEWS.map((n,i)=>(
              <div key={n.id} onClick={()=>setSelNews(n)} style={{...card({cursor:"pointer",transition:"all 0.15s"}),...((i===0)?{background:"#FAF5EA",borderColor:GOLD+"44"}:{})}}
                onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 20px rgba(0,0,0,0.08)";e.currentTarget.style.transform="translateY(-1px)";}}
                onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";e.currentTarget.style.transform="none";}}>
                <div style={{display:"flex",gap:"16px",alignItems:"flex-start"}}>
                  <div style={{fontSize:i===0?"36px":"28px",flexShrink:0}}>{n.emoji}</div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",gap:"8px",alignItems:"center",marginBottom:"6px"}}>
                      <span style={{fontFamily:F,fontSize:TXT.micro,fontWeight:800,letterSpacing:"1.5px",textTransform:"uppercase",color:GOLD,background:"#FAF5EA",padding:"2px 8px",borderRadius:"10px"}}>{n.cat}</span>
                      <span style={{fontFamily:F,fontSize:TXT.micro,color:"#7B857D"}}>{n.date}</span>
                    </div>
                    <h3 style={{fontSize:i===0?(isMobile?"16px":"17px"):TXT.cardTitle,fontWeight:800,margin:"0 0 6px",lineHeight:1.25}}>{n.title}</h3>
                    <p style={{fontFamily:F,fontSize:TXT.body,color:"#69716B",margin:0,lineHeight:1.6}}>{n.excerpt}</p>
                  </div>
                  <span style={{fontFamily:F,fontSize:"18px",color:"#DDD",flexShrink:0}}>›</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {page==="news"&&selNews&&(
        <div style={{padding:PAD,background:"#FFF",minHeight:"60vh",maxWidth:"680px",margin:"0 auto",boxSizing:"border-box",overflow:"hidden"}}>
          <span onClick={()=>setSelNews(null)} style={{fontFamily:F,fontSize:isMobile?"12px":"11px",color:GOLD,cursor:"pointer",letterSpacing:"1px",textTransform:"uppercase",fontWeight:600}}>← All News</span>
          <div style={{marginTop:"20px"}}>
            <div style={{display:"flex",gap:"10px",alignItems:"center",marginBottom:"12px"}}>
              <span style={{fontFamily:F,fontSize:"9px",fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",color:GOLD,background:"#FAF5EA",padding:"2px 8px",borderRadius:"10px"}}>{selNews.cat}</span>
              <span style={{fontFamily:F,fontSize:"10px",color:"#CCC"}}>{selNews.date}</span>
            </div>
            <div style={{fontSize:"40px",marginBottom:"16px"}}>{selNews.emoji}</div>
            <h1 style={{fontSize:isMobile?"24px":"26px",fontWeight:850,margin:"0 0 16px",lineHeight:1.18}}>{selNews.title}</h1>
            {selNews.body.split("\n\n").map((p,i)=><p key={i} style={{fontFamily:F,fontSize:isMobile?"14px":"14px",color:"#444",lineHeight:1.8,margin:"0 0 16px"}}>{p}</p>)}
          </div>
        </div>
      )}

      {/* ABOUT PAGE */}
      {page==="about"&&(
        <div style={{padding:PAD,background:"#FFF",minHeight:"60vh",boxSizing:"border-box",overflow:"hidden"}}>
          <h2 style={{fontSize:TXT.pageTitle,fontWeight:800,margin:"0 0 4px"}}>About Ngoma Charts</h2>
          <p style={{fontFamily:F,fontSize:TXT.lead,color:"#69716B",margin:"0 0 24px",lineHeight:1.6}}>Ngoma Charts' multi-platform music ranking system, launched October 2024.</p>
          <div className="anl-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px"}}>
            {[
              {title:"How It Works",text:"Weekly data collected from major platforms. Songs score by position: #1=100 pts, #100=1 pt. Albums use a 201-point scale. Monthly charts aggregate all weekly data. Movement arrows compare each month to the previous month."},
              {title:"Platforms Tracked",custom:true},
              {title:"Singles Chart",text:"Top 50 from Apple Music, Audiomack, Boomplay, Spotify, YouTube & Shazam. Combined chart aggregates all platforms by points. View Top 10, 20 or 50."},
              {title:"Albums Chart",text:"Top 50 from Apple Music and Audiomack (201-point scale across 200 positions). Boomplay excluded. Combined chart aggregates both."},
              {title:"Certifications",text:"💎 Ngoma Diamond: 5,000+ pts · 🪙 Ngoma Platinum: 2,000+ · 🥇 Ngoma Gold: 1,000+ · 🎵 Ngoma: 500+. Awarded on cumulative combined chart points."},
              {title:"Hall of Fame",text:"Songs that hit #1 on the combined chart enter the Hall of Fame. Q4 2024: Extra Pressure (Oct, Nov), Olodumare (Dec) for singles; Lungu Boy (Oct, Nov), GNX (Dec) for albums."},
            ].map((item,i)=>(
              <div key={i} style={card()}>
                <h3 style={{fontFamily:F,fontSize:TXT.micro,fontWeight:800,letterSpacing:"2px",textTransform:"uppercase",color:GOLD,margin:"0 0 10px"}}>{item.title}</h3>
                {item.custom?<div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>{[["Apple Music","#FC3C44"],["Audiomack","#F68B1F"],["Boomplay","#2DB04A"],["Spotify","#1DB954"],["YouTube","#FF0000"],["Shazam","#0088FF"]].map(([p,c])=><span key={p} style={{padding:"5px 10px",background:c+"10",borderRadius:"12px",fontSize:TXT.note,fontFamily:F,fontWeight:700,color:c,borderLeft:"3px solid "+c}}>{p}</span>)}</div>:<p style={{fontSize:TXT.body,color:"#555F59",lineHeight:1.65,margin:0,fontFamily:F}}>{item.text}</p>}
              </div>
            ))}
          </div>
          {/* Hall of Fame */}
          <div style={{...card({marginTop:"14px"}),background:"#FAF5EA",borderColor:GOLD+"44"}}>
            <h3 style={{fontFamily:F,fontSize:"10px",fontWeight:700,letterSpacing:"2px",textTransform:"uppercase",color:GOLD,margin:"0 0 14px"}}>🏆 Hall of Fame — Monthly #1s</h3>
            <div className="anl-grid-3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"10px"}}>
              {hof.map((e,i)=>(
                <div key={i} style={{padding:"12px",background:"#FFF",borderRadius:"8px",border:"1px solid "+GOLD+"33",cursor:"pointer"}} onClick={()=>setSelR({...e,type:e.type})}>
                  <div style={{fontFamily:F,fontSize:"9px",letterSpacing:"1.5px",textTransform:"uppercase",color:GOLD,marginBottom:"4px"}}>{e.month} · {e.type}</div>
                  <div style={{fontWeight:800,fontSize:TXT.cardTitle,marginBottom:"2px",lineHeight:1.2}}>{e.title}</div>
                  <div style={{fontFamily:F,fontSize:TXT.cardMeta,color:"#69716B"}}>{e.artist}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Brand */}
          <div style={{marginTop:"14px",padding:"20px",background:"#1A1A1A",borderRadius:"10px",color:"#FFF"}}>
            <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
              <svg width="20" height="22" viewBox="0 0 22 24" style={{flexShrink:0}}>
                <rect x="0" y="15" width="3.5" height="9" fill="#FFF" rx="0.5"/>
                <rect x="5.5" y="10" width="3.5" height="14" fill="#FFF" rx="0.5"/>
                <rect x="11" y="5" width="3.5" height="19" fill="#B8860B" rx="0.5"/>
                <rect x="16.5" y="0" width="3.5" height="24" fill="#FFF" rx="0.5"/>
              </svg>
              <span style={{fontFamily:F,fontSize:"13px",fontWeight:800,letterSpacing:"2.5px",color:"#FFF",textTransform:"uppercase"}}>Ngoma <span style={{color:"#B8860B"}}>Charts</span></span>
            </div>
            <p style={{fontFamily:F,fontSize:"11.5px",color:"rgba(255,255,255,0.5)",margin:"10px 0 0",lineHeight:1.6}}>"Ngoma" means music/drum in Swahili — the heartbeat of Kenyan culture. Transparent, data-driven rankings celebrating artists making an impact in Kenya.</p>
          </div>
        </div>
      )}

      </main>

      {/* FOOTER */}
      <footer style={{padding:isMobile?"24px 18px 30px":"20px 28px",borderTop:"3px solid #1A1A1A",background:"#1A1A1A",fontFamily:F,boxSizing:"border-box",overflow:"hidden"}}>
        <div style={{...pageFrame(),display:"flex",justifyContent:"space-between",alignItems:isMobile?"flex-start":"center",flexWrap:"wrap",gap:"12px",flexDirection:isMobile?"column":"row"}}>
          <div onClick={()=>navTo("charts")} style={{display:"flex",alignItems:"center",gap:"9px",cursor:"pointer"}}>
            <svg width="16" height="18" viewBox="0 0 22 24" style={{flexShrink:0}}>
              <rect x="0" y="15" width="3.5" height="9" fill="#FFF" rx="0.5"/>
              <rect x="5.5" y="10" width="3.5" height="14" fill="#FFF" rx="0.5"/>
              <rect x="11" y="5" width="3.5" height="19" fill="#B8860B" rx="0.5"/>
              <rect x="16.5" y="0" width="3.5" height="24" fill="#FFF" rx="0.5"/>
            </svg>
            <span style={{fontFamily:F,fontSize:isMobile?"12px":"11px",fontWeight:800,letterSpacing:"2.5px",color:"#FFF",textTransform:"uppercase"}}>Ngoma <span style={{color:"#B8860B"}}>Charts</span></span>
          </div>
          <div style={{display:"flex",gap:"18px",alignItems:"center"}}>
            {[
              {label:"Facebook", href:"https://www.facebook.com/ngomacharts",
               path:"M14 8.5h2V5.8h-2.4C11.5 5.8 10.5 7 10.5 9v1.5H8.7V13h1.8v6h2.6v-6h2l.3-2.5h-2.3V9.1c0-.4.2-.6.7-.6Z"},
              {label:"X", href:"https://x.com/Ngoma_Charts",
               path:"M16.8 5h2.2l-4.8 5.5L20 19h-4.4l-3.5-4.6L8 19H5.8l5.1-5.9L5 5h4.5l3.1 4.2L16.8 5Zm-.8 12.6h1.2L9.1 6.3H7.8L16 17.6Z"},
              {label:"Instagram", href:"https://www.instagram.com/ngoma_charts/",
               path:"M12 7.3A4.7 4.7 0 1012 16.7 4.7 4.7 0 0012 7.3Zm0 7.7a3 3 0 110-6 3 3 0 010 6Zm4.9-7.9a1.1 1.1 0 11-2.2 0 1.1 1.1 0 012.2 0ZM16.5 5h-9A2.5 2.5 0 005 7.5v9A2.5 2.5 0 007.5 19h9a2.5 2.5 0 002.5-2.5v-9A2.5 2.5 0 0016.5 5Z"},
            ].map(s=>(
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                 style={{display:"flex",color:"rgba(255,255,255,0.62)",transition:"color .2s"}}
                 onMouseEnter={e=>e.currentTarget.style.color="#B8860B"}
                 onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.62)"}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d={s.path}/></svg>
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
            alignItems: isMobile ? "flex-start" : "center",
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
