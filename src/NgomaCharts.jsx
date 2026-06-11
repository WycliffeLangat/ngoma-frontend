import { useState, useEffect, useMemo } from "react";
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
import { FULL, ANL, MOM } from "./data/chartData";
import PremiumChartsPage from "./components/PremiumChartsPage";

// ===== FULL Top-50 dataset across all months and platforms =====
const MONTHS = ["October 2024","November 2024","December 2024"];
const S_PLATS = ["Combined","APPLE MUSIC","AUDIOMACK","BOOMPLAY","SPOTIFY","YOUTUBE","SHAZAM"];
const A_PLATS = ["Combined","APPLE MUSIC","AUDIOMACK"];
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

const getCombined = (ct, m) => enrichChartEntries(rawCombined(ct, m), (monthLabel) => rawCombined(ct, monthLabel), m, ct === "singles" ? 6 : 2);
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
  const [liveChartEntries, setLiveChartEntries] = useState([]);
  const [liveChartMeta, setLiveChartMeta] = useState(null);
  const [liveChartLoading, setLiveChartLoading] = useState(false);

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
  const [vw,setVw]=useState(typeof window!=="undefined"?window.innerWidth:1200);
  useEffect(()=>{const h=()=>setVw(window.innerWidth);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);
  const isMobile=vw<640;
  const PAD=isMobile?"clamp(20px, 5vw, 28px)":"28px";
  const PAGE_MAX="1240px";
  const pageFrame=(extra={})=>({maxWidth:PAGE_MAX,width:"100%",margin:"0 auto",boxSizing:"border-box",minWidth:0,...extra});
  const responsiveStack=(desktop="row")=>({flexDirection:isMobile?"column":desktop,alignItems:isMobile?"stretch":"center"});
  useEffect(()=>{const h=e=>{if(e.key==="Escape"){setSOpen(false);setSrch("");setShareImg(null);}};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);},[]);


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

  // Movement data for the current month
  const mvData=ANL.movements[month]||{new:0,ret:0,debut:0,risers:[],fallers:[]};

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
    section: isMobile ? "9.5px" : "9.5px",
    rowTitle: isMobile ? "15px" : "15px",
    rowMeta: isMobile ? "12px" : "12px",
    cardTitle: isMobile ? "15px" : "15px",
    cardMeta: isMobile ? "12px" : "12px",
    metric: isMobile ? "16px" : "16px",
    micro: "10px",
    note: isMobile ? "11px" : "11px",
    body: isMobile ? "13px" : "12px",
  };
  const secLbl=(c=GOLD)=>({fontFamily:F,fontSize:TXT.section,fontWeight:700,letterSpacing:"2.5px",textTransform:"uppercase",color:c,marginBottom:"14px",display:"flex",alignItems:"center",gap:"7px"});
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
  const coverageData=Object.entries(ANL.coverage[anMonth]||{}).filter(([,v])=>v>0).map(([k,v])=>({name:k+" platforms",value:v}));
  const platOnesS=Object.entries((ANL.platOnes[anMonth]||{}).singles||{});
  const platOnesA=Object.entries((ANL.platOnes[anMonth]||{}).albums||{});
  const crossPlat=ANL.crossPlat[anMonth]||[];

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

  const platTotalsData=Object.entries(ANL.platTotals[anMonth]||{}).map(([pl,v])=>({platform:PLAT_LABEL[pl]||pl,points:v,color:PC[pl]||"#888"}));

  const cmp1=artists.find(x=>x.n===cmpA1)||{n:cmpA1,p:0,m:0,t:0,pk:"-",mp:{}};
  const cmp2=artists.find(x=>x.n===cmpA2)||{n:cmpA2,p:0,m:0,t:0,pk:"-",mp:{}};
  const cmpData=MONTHS.map(m=>({month:m.split(" ")[0].slice(0,3),[cmpA1]:cmp1.mp?.[m]||0,[cmpA2]:cmp2.mp?.[m]||0}));

  // === SONG / ALBUM COMPARISON ===
  const PLATS_FOR=isSingles?["APPLE MUSIC","AUDIOMACK","BOOMPLAY","SPOTIFY","YOUTUBE","SHAZAM"]:["APPLE MUSIC","AUDIOMACK"];
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
    const cd=getCombined(ct,month);
    if(cd[0]&&!cmpS1)setCmpS1(cd[0].title+" — "+cd[0].artist);
    if(cd[1]&&!cmpS2)setCmpS2(cd[1].title+" — "+cd[1].artist);
  },[ct]);
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
    ctx.fillText("NGOMA TOP 50 - KENYA", x + 130, y + 92);
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
          `${monthlyComp.reduce((sum, item) => sum + (item.singles || 0), 0)} total single chart entries tracked across months`,
          `${monthlyComp.reduce((sum, item) => sum + (item.albums || 0), 0)} total album chart entries tracked across months`,
        ].filter(Boolean),
      };
    }

    if (page === "records") {
      const records = (isSingles ? MOM.records.singles : MOM.records.albums).slice(0, 6);
      return {
        eyebrow: "THE RECORD BOOK",
        title: `Records & Milestones`,
        subtitle: `${typeLabel} · Q4 2024`,
        accent: "#B8860B",
        highlights: records.map((record) => `${record.label}: ${record.value} · ${record.sub}`),
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
        subtitle: "Ngoma Top 50 - Kenya",
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
      title: "Ngoma Top 50 - Kenya",
      subtitle: "Ngoma Top 50 - Kenya",
      accent: "#B8860B",
      highlights: ["Charts", "Trending", "Artists", "Analytics", "Records", "Certifications"],
    };
  };

  const shareCurrentPageCard = () => {
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
    saveShareImage(url, fname, payload.title);
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
    x.fillStyle="rgba(255,255,255,0.5)";x.font="600 24px Helvetica";x.fillText("NGOMA TOP 50 - KENYA",90,by+150);
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

  return(
    <div style={{fontFamily:SF,background:"linear-gradient(180deg,#FBFAF7 0%,#F7F5F0 100%)",color:"#1A1A1A",minHeight:"100vh",width:"100%",overflowX:"hidden"}}>
      <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;600;700;800;900&family=Instrument+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
      <style>{`
        html, body, #root{max-width:100%;overflow-x:hidden;}
        *, *::before, *::after{box-sizing:border-box;}
        img, svg, canvas, video{max-width:100%;}
        button, input, select, textarea{max-width:100%;}
        .ngoma-mobile-text-safe{min-width:0;overflow-wrap:anywhere;}
        @media (max-width: 640px){
          .anl-grid-2{grid-template-columns:1fr !important;}
          .anl-grid-3{grid-template-columns:1fr !important;}
          .anl-grid-4{grid-template-columns:1fr 1fr !important;}
          .podium-grid{grid-template-columns:1fr !important;}
          .race-card{min-width:100% !important;}
          .ngoma-artist-row{grid-template-columns:32px minmax(0,1fr) 76px !important;gap:8px !important;padding:12px 4px !important;}
          .ngoma-artist-pts-label{display:none !important;}
          .ngoma-mobile-center-frame{padding-left:clamp(20px,5vw,28px) !important;padding-right:clamp(20px,5vw,28px) !important;}
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
            <span style={{color:"rgba(255,255,255,0.48)",fontSize:isMobile?"8px":"9.5px",letterSpacing:isMobile?"0.5px":"1px",fontFamily:"inherit",whiteSpace:"nowrap"}}>
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
                Ngoma Top 50 - Kenya
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
                  <span onClick={()=>{setMNav(false);setSOpen(true);}} style={{cursor:"pointer",padding:"13px 14px",borderRadius:"12px",fontFamily:F,fontSize:"13px",fontWeight:600,letterSpacing:"1px",textTransform:"uppercase",color:"#555"}}>⌕ Search</span>
                </div>
              )}
            </>
          ) : (
            <nav style={{display:"flex",gap:"22px",fontFamily:F,fontSize:"11px",fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",alignItems:"center",flexShrink:0}}>
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
              >⌕ Search</span>
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
          <span onClick={()=>setSelR(null)} style={{fontFamily:F,fontSize:"11px",color:GOLD,cursor:"pointer",letterSpacing:"1px",textTransform:"uppercase",fontWeight:600}}>← Back</span>
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
                  {platforms.length===0&&<span style={{fontFamily:F,fontSize:"11px",color:"#CCC"}}>Not in tracked Top 50 this month</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ARTIST PROFILE */}
      {selA&&!selR&&(
        <div style={{padding:PAD,background:"#FFF",minHeight:"60vh",boxSizing:"border-box",overflow:"hidden"}}>
          <span onClick={()=>setSelA(null)} style={{fontFamily:F,fontSize:"11px",color:GOLD,cursor:"pointer",letterSpacing:"1px",textTransform:"uppercase",fontWeight:600}}>← Back</span>
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
                <XAxis dataKey="month" tick={{fontSize:11,fontFamily:F}}/>
                <YAxis tick={{fontSize:10,fontFamily:F}} tickFormatter={v=>v.toLocaleString()}/>
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
  />
)}

      {/* ARTISTS PAGE */}
      {page==="artists"&&!selA&&!selR&&(
        <div style={{padding:PAD,background:"#FFF",minHeight:"60vh",boxSizing:"border-box",overflow:"hidden"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:isMobile?"stretch":"flex-end",marginBottom:"20px",gap:isMobile?"12px":"20px",flexDirection:isMobile?"column":"row"}}>
            <div><h2 style={{fontSize:TXT.pageTitle,fontWeight:800,margin:0}}>Top Artists</h2><p style={{fontFamily:F,fontSize:TXT.lead,color:"#69716B",margin:"4px 0 0",lineHeight:1.55}}>Computed from full Top 50 across all months · Click any artist for full profile</p></div>
            <Tog sm/>
          </div>
          {/* Comparison */}
          <div style={{...card(),marginBottom:"20px",background:"#FAFAF8"}}>
            <div style={secLbl()}><SecMark/>Artist Comparison</div>
            <div style={{display:"flex",gap:"12px",alignItems:"center",marginBottom:"14px",flexWrap:"wrap"}}>
              <select value={cmpA1} onChange={e=>setCmpA1(e.target.value)} style={{flex:1,minWidth:isMobile?0:"160px",padding:"8px 10px",border:"1.5px solid #DDD",borderRadius:"7px",background:"#FFF",fontSize:"11px",fontFamily:F,fontWeight:600,cursor:"pointer",outline:"none"}}>
                {allArtistNames.map(n=><option key={n} value={n}>{n}</option>)}
              </select>
              <span style={{fontFamily:F,fontSize:"12px",color:"#CCC",fontWeight:700}}>vs</span>
              <select value={cmpA2} onChange={e=>setCmpA2(e.target.value)} style={{flex:1,minWidth:isMobile?0:"160px",padding:"8px 10px",border:"1.5px solid #DDD",borderRadius:"7px",background:"#FFF",fontSize:"11px",fontFamily:F,fontWeight:600,cursor:"pointer",outline:"none"}}>
                {allArtistNames.map(n=><option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="anl-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"14px"}}>
              {[{d:cmp1,c:GOLD},{d:cmp2,c:"#1565C0"}].map(({d,c},i)=>(
                <div key={i} style={{padding:"14px",background:c+"0D",borderRadius:"8px",borderLeft:"3px solid "+c}}>
                  <div style={{fontFamily:F,fontSize:TXT.micro,fontWeight:800,letterSpacing:"1.5px",color:c,textTransform:"uppercase",marginBottom:"8px"}}>{d.n}</div>
                  {[{l:"Total Points",v:(d.p||0).toLocaleString()},{l:"Peak Rank",v:"#"+(d.pk||"—")},{l:"Months",v:d.m||0},{l:"Titles",v:d.t||0}].map((s,j)=>(
                    <div key={j} style={{display:"flex",justifyContent:"space-between",fontFamily:F,fontSize:TXT.note,borderBottom:"1px solid "+c+"22",padding:"4px 0"}}>
                      <span style={{color:"#888"}}>{s.l}</span><span style={{fontWeight:700,color:c}}>{s.v}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={cmpData}>
                <XAxis dataKey="month" tick={{fontSize:11,fontFamily:F}}/>
                <YAxis tick={{fontSize:10,fontFamily:F}} tickFormatter={v=>v.toLocaleString()}/>
                <Tooltip contentStyle={{fontFamily:F,fontSize:11}}/>
                <Legend wrapperStyle={{fontFamily:F,fontSize:10}}/>
                <Bar dataKey={cmpA1} fill={GOLD} radius={[4,4,0,0]}/>
                <Bar dataKey={cmpA2} fill="#1565C0" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Top Artists List - all 30 from full Top 50 */}
          {artists.slice(0,30).map((a,i)=>(
            <div key={a.n} className="ngoma-artist-row" onClick={()=>setSelA(a)} style={{display:"grid",gridTemplateColumns:isMobile?"32px minmax(0,1fr) 76px":"40px minmax(0,1fr) 110px 40px",gap:isMobile?"8px":0,padding:isMobile?"12px 4px":"10px 0",borderBottom:"1px solid #F2F2EE",alignItems:"center",cursor:"pointer",minWidth:0}}
              onMouseEnter={e=>e.currentTarget.style.background="#FAFAF6"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{fontSize:i<3?"18px":"13.5px",fontWeight:800,color:i<3?MEDALS[i]:"#D5D5D0",textAlign:"center"}}>{i+1}</div>
              <div className="ngoma-mobile-text-safe" style={{minWidth:0}}><div style={{fontSize:TXT.rowTitle,fontWeight:800,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",lineHeight:1.15}}>{a.n}</div><div style={{fontSize:TXT.rowMeta,color:"#69716B",fontFamily:F,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",marginTop:"4px"}}>{a.t} titles · Peak #{a.pk} · {a.m} months</div></div>
              <div style={{textAlign:"right",fontFamily:F,fontSize:TXT.metric,fontWeight:900,color:GOLD,whiteSpace:"nowrap"}}>{a.p.toLocaleString()}</div>
              {!isMobile&&<div className="ngoma-artist-pts-label" style={{textAlign:"center",fontFamily:F,fontSize:"9px",color:"#CCC"}}>pts</div>}
            </div>
          ))}
        </div>
      )}

      {/* ANALYTICS PAGE */}
      {page==="analytics"&&(
        <div style={{padding:PAD,background:"transparent",minHeight:"60vh",boxSizing:"border-box",overflow:"hidden"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:isMobile?"stretch":"flex-end",marginBottom:"20px",gap:isMobile?"12px":"20px",flexDirection:isMobile?"column":"row"}}>
            <div><h2 style={{fontSize:TXT.pageTitle,fontWeight:800,margin:0}}>Analytics</h2><p style={{fontFamily:F,fontSize:TXT.lead,color:"#69716B",margin:"4px 0 0",lineHeight:1.55}}>All visualizations computed from full Top 50 — across all platforms and months</p></div>
            <div style={{display:"flex",gap:"8px",flexWrap:"wrap",width:isMobile?"100%":"auto"}}>
              <select value={anMonth} onChange={e=>setAnMonth(e.target.value)} style={{padding:"7px 10px",border:"1.5px solid #DDD",borderRadius:"7px",background:"#FFF",fontSize:"10px",fontFamily:F,fontWeight:600,cursor:"pointer",outline:"none",minWidth:0,flex:isMobile?1:"initial"}}>
                {MONTHS.map(m=><option key={m} value={m}>{m}</option>)}
              </select>
              <Tog sm/>
            </div>
          </div>
          {/* AI Analyst — hidden for now, re-enable by removing the display:none wrapper */}
          <div style={{display:"none"}}>
          <div style={{...card(),marginBottom:"20px"}}>
            <div style={secLbl()}><SecMark/>Ngoma AI Analyst</div>
            <div style={{display:"flex",gap:"8px",marginBottom:"10px"}}>
              <input value={aiQ} onChange={e=>setAiQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&askAI()} placeholder="Ask about charts, artists, trends, predictions..." style={{flex:1,padding:"10px 14px",border:"1.5px solid #E0E0DC",borderRadius:"6px",fontSize:"13px",fontFamily:SF,outline:"none"}}/>
              <button onClick={askAI} disabled={aiL} style={{padding:"10px 22px",background:"#1A1A1A",border:"none",borderRadius:"6px",color:"#FFF",cursor:aiL?"default":"pointer",fontFamily:F,fontSize:"11px",fontWeight:700,opacity:aiL?0.6:1}}>{aiL?"...":"Ask"}</button>
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
          <div style={{...card(),marginBottom:"20px",background:"linear-gradient(135deg,#FAFAF8,#FFFFFF)"}}>
            <div style={secLbl()}><SecMark/>{isSingles?"Song":"Album"} Head-to-Head</div>
            <p style={{fontFamily:F,fontSize:TXT.note,color:"#69716B",margin:"-8px 0 14px",lineHeight:1.45}}>Compare any two {isSingles?"songs":"albums"} across every metric in the dataset</p>
            <div style={{display:"flex",gap:"12px",alignItems:"center",marginBottom:"16px",flexWrap:"wrap"}}>
              <select value={cmpS1} onChange={e=>setCmpS1(e.target.value)} style={{flex:1,minWidth:"160px",padding:"8px 10px",border:"1.5px solid "+GOLD+"55",borderRadius:"6px",background:"#FFF",fontSize:"11px",fontFamily:F,fontWeight:600,cursor:"pointer",outline:"none"}}>
                {allTitles.map(t=><option key={t.key} value={t.key}>{t.title} — {t.artist}</option>)}
              </select>
              <span style={{fontFamily:F,fontSize:"12px",color:"#CCC",fontWeight:700}}>vs</span>
              <select value={cmpS2} onChange={e=>setCmpS2(e.target.value)} style={{flex:1,minWidth:"160px",padding:"8px 10px",border:"1.5px solid #1565C055",borderRadius:"6px",background:"#FFF",fontSize:"11px",fontFamily:F,fontWeight:600,cursor:"pointer",outline:"none"}}>
                {allTitles.map(t=><option key={t.key} value={t.key}>{t.title} — {t.artist}</option>)}
              </select>
            </div>
            {sp1&&sp2&&(<>
              {/* Title cards */}
              <div className="anl-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"16px"}}>
                {[{d:sp1,c:GOLD},{d:sp2,c:"#1565C0"}].map(({d,c},i)=>(
                  <div key={i} onClick={()=>setSelR({title:d.title,artist:d.artist,type:isSingles?"single":"album"})} style={{padding:"16px",background:c+"0D",borderRadius:"10px",borderLeft:"3px solid "+c,cursor:"pointer"}}>
                    <div style={{fontFamily:SF,fontSize:"16px",fontWeight:800,lineHeight:1.15}}>{d.title}</div>
                    <div style={{fontFamily:F,fontSize:"11px",color:"#888",marginTop:"2px"}}>{d.artist}</div>
                    <div style={{display:"flex",gap:"16px",marginTop:"12px"}}>
                      <div><div style={{fontFamily:F,fontSize:"20px",fontWeight:800,color:c}}>{d.totalPts.toLocaleString()}</div><div style={{fontFamily:F,fontSize:"8px",letterSpacing:"1px",textTransform:"uppercase",color:"#BBB"}}>Total Pts</div></div>
                      <div><div style={{fontFamily:F,fontSize:"20px",fontWeight:800,color:c}}>#{d.peak}</div><div style={{fontFamily:F,fontSize:"8px",letterSpacing:"1px",textTransform:"uppercase",color:"#BBB"}}>Peak</div></div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Metric comparison table */}
              <div style={{marginBottom:"16px"}}>
                {(()=>{
                  const rows=[
                    {label:"Total Points",a:sp1.totalPts,b:sp2.totalPts,fmt:v=>v.toLocaleString(),hi:"max"},
                    {label:"Peak Position",a:sp1.peak,b:sp2.peak,fmt:v=>"#"+v,hi:"min"},
                    {label:"Average Rank",a:sp1.avgRank,b:sp2.avgRank,fmt:v=>"#"+v,hi:"min"},
                    {label:"Months on Chart",a:sp1.months,b:sp2.months,fmt:v=>v+"/3",hi:"max"},
                    {label:"#1 Finishes",a:sp1.numberOnes,b:sp2.numberOnes,fmt:v=>v+"×",hi:"max"},
                    {label:"Best Platform Coverage",a:sp1.bestCov,b:sp2.bestCov,fmt:v=>v+"/"+tp,hi:"max"},
                    {label:"Platforms Charted",a:sp1.platformCount,b:sp2.platformCount,fmt:v=>v+"/"+tp,hi:"max"},
                    {label:"Total Chart Appearances",a:sp1.appearances,b:sp2.appearances,fmt:v=>v+"×",hi:"max"},
                  ];
                  return rows.map((r,i)=>{
                    const aWins=r.hi==="max"?r.a>r.b:r.a<r.b;
                    const bWins=r.hi==="max"?r.b>r.a:r.b<r.a;
                    return(
                      <div key={i} style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #F0F0EC",gap:"12px"}}>
                        <div style={{textAlign:"right",fontFamily:F,fontSize:"14px",fontWeight:aWins?800:600,color:aWins?GOLD:"#999"}}>{r.fmt(r.a)}{aWins&&<span style={{fontSize:"9px",marginLeft:"4px"}}>▲</span>}</div>
                        <div style={{textAlign:"center",fontFamily:F,fontSize:"9px",letterSpacing:"1px",textTransform:"uppercase",color:"#BBB",minWidth:"120px"}}>{r.label}</div>
                        <div style={{textAlign:"left",fontFamily:F,fontSize:"14px",fontWeight:bWins?800:600,color:bWins?"#1565C0":"#999"}}>{bWins&&<span style={{fontSize:"9px",marginRight:"4px"}}>▲</span>}{r.fmt(r.b)}</div>
                      </div>
                    );
                  });
                })()}
              </div>
              {/* Points + Rank charts */}
              <div className="anl-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px"}}>
                <div>
                  <div style={{fontFamily:F,fontSize:"9px",fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",color:"#999",marginBottom:"8px"}}>Points by Month</div>
                  <ResponsiveContainer width="100%" height={150}>
                    <BarChart data={songMonthlyData}>
                      <XAxis dataKey="month" tick={{fontSize:10,fontFamily:F}}/>
                      <YAxis tick={{fontSize:9,fontFamily:F}} tickFormatter={v=>v>=1000?(v/1000)+"k":v}/>
                      <Tooltip contentStyle={{fontFamily:F,fontSize:11}} formatter={(v,n)=>[v.toLocaleString()+" pts",n==="A"?sp1.title:sp2.title]}/>
                      <Bar dataKey="A" fill={GOLD} radius={[3,3,0,0]}/>
                      <Bar dataKey="B" fill="#1565C0" radius={[3,3,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <div style={{fontFamily:F,fontSize:"9px",fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",color:"#999",marginBottom:"8px"}}>Rank Trajectory (lower = better)</div>
                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={songRankData}>
                      <XAxis dataKey="month" tick={{fontSize:10,fontFamily:F}}/>
                      <YAxis reversed domain={[1,"dataMax"]} tick={{fontSize:9,fontFamily:F}} tickFormatter={v=>"#"+v}/>
                      <Tooltip contentStyle={{fontFamily:F,fontSize:11}} formatter={(v,n)=>["#"+v,n==="A"?sp1.title:sp2.title]}/>
                      <Line dataKey="A" stroke={GOLD} strokeWidth={2.5} dot={{r:4}} connectNulls/>
                      <Line dataKey="B" stroke="#1565C0" strokeWidth={2.5} dot={{r:4}} connectNulls/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {/* Platform-by-platform peak ranks */}
              <div style={{marginTop:"16px"}}>
                <div style={{fontFamily:F,fontSize:"9px",fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",color:"#999",marginBottom:"10px"}}>Peak Rank by Platform</div>
                <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                  {PLATS_FOR.map(pl=>{
                    const a=sp1.platforms[pl],b=sp2.platforms[pl];
                    const lbl=PLAT_LABEL[pl]||pl;
                    return(
                      <div key={pl} style={{display:"grid",gridTemplateColumns:"1fr 90px 1fr",alignItems:"center",gap:"10px"}}>
                        <div style={{textAlign:"right",fontFamily:F,fontSize:"12px",fontWeight:700,color:a?GOLD:"#DDD"}}>{a?"#"+a:"—"}</div>
                        <div style={{textAlign:"center",fontFamily:F,fontSize:"9px",fontWeight:600,color:PC[pl]||"#888",letterSpacing:"0.5px"}}>{lbl}</div>
                        <div style={{textAlign:"left",fontFamily:F,fontSize:"12px",fontWeight:700,color:b?"#1565C0":"#DDD"}}>{b?"#"+b:"—"}</div>
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
              {l:"Chart Depth",v:getCombined(ct,anMonth).length,c:GOLD,s:"songs in Top 50 combined"},
              {l:"New Entries",v:mvData.new,c:"#2DB04A",s:"not in prev month"},
              {l:"Returning",v:mvData.ret,c:"#1565C0",s:"from prev month"},
              {l:"Platforms",v:tp,c:"#7B1FA2",s:"tracked for "+ct},
            ].map((s,i)=>(
              <div key={i} style={card()}><div style={{...secLbl(s.c),marginBottom:"6px"}}>{s.l}</div><div style={{fontSize:"28px",fontWeight:800,color:s.c}}>{s.v}</div><div style={{fontSize:"10px",color:"#BBB",fontFamily:F}}>{s.s}</div></div>
            ))}
          </div>
          {/* Top 10 + Platform #1s */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginBottom:"20px"}} className="anl-2col">
            <div style={card()}>
              <div style={secLbl()}><SecMark/>Top 10 — {anMonth}</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={top10sData} layout="vertical" margin={{left:10,right:20,top:0,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC" horizontal={false}/>
                  <XAxis type="number" tick={{fontSize:10,fontFamily:F}} tickFormatter={v=>v.toLocaleString()}/>
                  <YAxis type="category" dataKey="name" width={120} tick={{fontSize:9,fontFamily:F,textAnchor:"end"}}/>
                  <Tooltip formatter={v=>[v.toLocaleString()+" pts","Points"]} contentStyle={{fontFamily:F,fontSize:11}}/>
                  <Bar dataKey="pts" radius={[0,4,4,0]}>{top10sData.map((e,i)=><Cell key={i} fill={CC[i]||"#999"}/>)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={card()}>
              <div style={secLbl()}><SecMark/>Platform #1s — {anMonth}</div>
              <div className="anl-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
                {(isSingles?platOnesS:platOnesA).map(([pl,d])=>{
                  const lbl=PLAT_LABEL[pl]||pl;
                  return(
                    <div key={pl} style={{padding:"10px 12px",background:(PC[pl]||"#888")+"0D",borderRadius:"8px",borderLeft:"3px solid "+(PC[pl]||"#888")}}>
                      <div style={{fontSize:"8.5px",fontFamily:F,letterSpacing:"1.5px",textTransform:"uppercase",color:PC[pl]||"#888",marginBottom:"4px",fontWeight:700}}>{lbl}</div>
                      <div style={{fontSize:"11px",fontWeight:700,lineHeight:1.2}}>{d.t}</div>
                      <div style={{fontSize:"9.5px",color:"#999",fontFamily:F}}>{d.a} · {d.p} pts</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          {/* Top artists points line chart */}
          <div style={{...card(),marginBottom:"20px"}}>
            <div style={secLbl()}><SecMark/>Top 6 Artists — Points Trajectory ({isSingles?"Singles":"Albums"})</div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={topArtistsLine}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC"/>
                <XAxis dataKey="month" tick={{fontSize:11,fontFamily:F}}/>
                <YAxis tick={{fontSize:10,fontFamily:F}} tickFormatter={v=>v.toLocaleString()}/>
                <Tooltip formatter={(v,n)=>[v.toLocaleString()+" pts",n]} contentStyle={{fontFamily:F,fontSize:11}}/>
                <Legend wrapperStyle={{fontFamily:F,fontSize:10}}/>
                {artists.slice(0,6).map((a,i)=>(
                  <Line key={a.n} type="monotone" dataKey={a.n} stroke={CC[i]} strokeWidth={2} dot={{r:4}} activeDot={{r:6}}/>
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          {/* Cross-platform overlap + Coverage pie */}
          <div className="anl-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginBottom:"20px"}}>
            <div style={card()}>
              <div style={secLbl()}><SecMark/>Cross-Platform Reach — {anMonth}</div>
              <p style={{fontFamily:F,fontSize:"10px",color:"#BBB",margin:"-4px 0 12px"}}>{isSingles?"Songs charting on most platforms simultaneously":"Albums appear on Apple Music & Audiomack only"}</p>
              {isSingles&&crossPlat.slice(0,8).map((s,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid #F0F0EC"}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:"12px",fontWeight:700}}>{s.t}</div>
                    <div style={{fontSize:"10px",color:"#999",fontFamily:F}}>{s.a}</div>
                  </div>
                  <div style={{display:"flex",gap:"3px",alignItems:"center"}}>
                    {s.plats.map(pl=><div key={pl} style={{width:"7px",height:"7px",borderRadius:"50%",background:PC[pl]||"#888"}} title={PLAT_LABEL[pl]}/>)}
                    <span style={{fontFamily:F,fontSize:"11px",fontWeight:700,color:GOLD,marginLeft:"6px"}}>{s.count}/6</span>
                  </div>
                </div>
              ))}
              {!isSingles&&(()=>{
                const both=getPlatform("albums","APPLE MUSIC",anMonth).filter(am=>getPlatform("albums","AUDIOMACK",anMonth).some(au=>au.title===am.title&&au.artist===am.artist)).slice(0,8);
                return both.map((s,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid #F0F0EC",cursor:"pointer"}} onClick={()=>setSelR({title:s.title,artist:s.artist,type:"album"})}>
                    <div style={{flex:1}}><div style={{fontSize:"12px",fontWeight:700}}>{s.title}</div><div style={{fontSize:"10px",color:"#999",fontFamily:F}}>{s.artist}</div></div>
                    <div style={{display:"flex",gap:"3px",alignItems:"center"}}>
                      <div style={{width:"7px",height:"7px",borderRadius:"50%",background:PC["APPLE MUSIC"]}}/>
                      <div style={{width:"7px",height:"7px",borderRadius:"50%",background:PC["AUDIOMACK"]}}/>
                      <span style={{fontFamily:F,fontSize:"11px",fontWeight:700,color:GOLD,marginLeft:"6px"}}>2/2</span>
                    </div>
                  </div>
                ));
              })()}
            </div>
            <div style={card()}>
              <div style={secLbl()}><SecMark/>Platform Coverage — {anMonth}</div>
              <div style={{display:"flex",alignItems:"center",gap:"16px"}}>
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
                    <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"3px 0",fontFamily:F,fontSize:"11px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:"6px"}}><div style={{width:"10px",height:"10px",borderRadius:"2px",background:CC[i]}}/><span style={{color:"#555"}}>{e.name}</span></div>
                      <span style={{fontWeight:700}}>{e.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Platform totals (only singles since albums has 2) */}
          {isSingles&&(
            <div style={{...card(),marginBottom:"20px"}}>
              <div style={secLbl()}><SecMark/>Total Points Distributed Per Platform — {anMonth}</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={platTotalsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC"/>
                  <XAxis dataKey="platform" tick={{fontSize:10,fontFamily:F}}/>
                  <YAxis tick={{fontSize:10,fontFamily:F}} tickFormatter={v=>v.toLocaleString()}/>
                  <Tooltip contentStyle={{fontFamily:F,fontSize:11}} formatter={v=>[v.toLocaleString()+" pts","Total Points"]}/>
                  <Bar dataKey="points" radius={[4,4,0,0]}>{platTotalsData.map((e,i)=><Cell key={i} fill={e.color}/>)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {/* Local vs International */}
          {isSingles&&(()=>{
            const KENYAN=new Set(["Bensoul","Dyana Cods","Ssaru","D Voice","Geniusjini x66","Nadia Mukami","Iyanii","Charisma","Lilmaina","Savara","Sauti Sol","Nyashinski","Bien","Watendawili","Coster Ojwang","Otile Brown","Octopizzo","Njerae","Matata","Mutoriah","Fathermoh","Soundkraft","Bella Kombo","Wadagliz","Wakadinali","BURUKLYN BOYZ","Sosa The Prodigy","Obby Alpha","Prince Indah","Lil Maina","Spoiler"]);
            const cd=getCombined("singles",anMonth);
            let local=0,intl=0,localPts=0,intlPts=0;
            cd.forEach(e=>{if(KENYAN.has(e.artist)){local++;localPts+=e.pts;}else{intl++;intlPts+=e.pts;}});
            const pieData=[{name:"Kenyan",value:local,color:GOLD},{name:"International",value:intl,color:"#37474F"}];
            return(
              <div style={{...card(),marginBottom:"20px"}}>
                <div style={secLbl()}><SecMark/>Local vs International — {anMonth}</div>
                <p style={{fontFamily:F,fontSize:TXT.note,color:"#69716B",margin:"-6px 0 14px",lineHeight:1.45}}>Share of the Top 50 combined chart held by Kenyan vs international artists</p>
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
                          <span style={{fontFamily:F,fontSize:"13px",fontWeight:800,color:r.col}}>{r.c} <span style={{fontSize:"10px",color:"#BBB",fontWeight:500}}>of 50</span></span>
                        </div>
                        <div style={{height:"6px",background:"#F2F0EA",borderRadius:"3px",overflow:"hidden"}}><div style={{width:(r.c/50*100)+"%",height:"100%",background:r.col,borderRadius:"3px"}}/></div>
                        <div style={{fontFamily:F,fontSize:"9.5px",color:"#AAA",marginTop:"3px"}}>{r.p.toLocaleString()} total points</div>
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
              <div style={secLbl("#2DB04A")}><SecMark c="#2DB04A"/>Top Climbers — {anMonth}</div>
              {mvData.risers.map((s,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"1px solid #F0F0EC"}}>
                  <div><div style={{fontSize:TXT.cardTitle,fontWeight:800,lineHeight:1.15}}>{s.t}</div><div style={{fontSize:TXT.cardMeta,color:"#69716B",fontFamily:F,marginTop:"3px"}}>{s.a}</div></div>
                  <div style={{textAlign:"right",fontFamily:F}}><div style={{color:"#2DB04A",fontSize:TXT.cardMeta,fontWeight:800}}>▲{s.from-s.to}</div><div style={{fontSize:TXT.micro,color:"#7B857D"}}>#{s.from}→#{s.to}</div></div>
                </div>
              ))}
              {!mvData.risers.length&&<div style={{fontFamily:F,fontSize:"11px",color:"#CCC",padding:"20px 0",textAlign:"center"}}>No movement data (debut month)</div>}
            </div>
            <div style={card()}>
              <div style={secLbl("#E53935")}><SecMark c="#E53935"/>Biggest Drops — {anMonth}</div>
              {mvData.fallers.map((s,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"1px solid #F0F0EC"}}>
                  <div><div style={{fontSize:TXT.cardTitle,fontWeight:800,lineHeight:1.15}}>{s.t}</div><div style={{fontSize:TXT.cardMeta,color:"#69716B",fontFamily:F,marginTop:"3px"}}>{s.a}</div></div>
                  <div style={{textAlign:"right",fontFamily:F}}><div style={{color:"#E53935",fontSize:TXT.cardMeta,fontWeight:800}}>▼{s.to-s.from}</div><div style={{fontSize:TXT.micro,color:"#7B857D"}}>#{s.from}→#{s.to}</div></div>
                </div>
              ))}
              {!mvData.fallers.length&&<div style={{fontFamily:F,fontSize:"11px",color:"#CCC",padding:"20px 0",textAlign:"center"}}>No drops (debut month)</div>}
            </div>
          </div>
          {/* Top 10 Artists Bar */}
          <div style={{...card(),marginBottom:"20px"}}>
            <div style={secLbl()}><SecMark/>Top 10 Artists by Total Points — Q4 2024 ({isSingles?"Singles":"Albums"})</div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={artists.slice(0,10).map(a=>({name:a.n.length>14?a.n.slice(0,12)+"…":a.n,pts:a.p}))} layout="vertical" margin={{left:10,right:20,top:0,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC" horizontal={false}/>
                <XAxis type="number" tick={{fontSize:10,fontFamily:F}} tickFormatter={v=>v.toLocaleString()}/>
                <YAxis type="category" dataKey="name" width={110} tick={{fontSize:10,fontFamily:F,textAnchor:"end"}}/>
                <Tooltip formatter={v=>[v.toLocaleString()+" pts","Points"]} contentStyle={{fontFamily:F,fontSize:11}}/>
                <Bar dataKey="pts" radius={[0,4,4,0]}>{artists.slice(0,10).map((a,i)=><Cell key={i} fill={CC[i]||GOLD}/>)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Monthly Comparison */}
          <div style={{...card(),marginBottom:"20px"}}>
            <div style={secLbl()}><SecMark/>Monthly Trend — Singles vs Albums vs New Entries</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyComp}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC"/>
                <XAxis dataKey="month" tick={{fontSize:11,fontFamily:F}}/>
                <YAxis tick={{fontSize:10,fontFamily:F}}/>
                <Tooltip contentStyle={{fontFamily:F,fontSize:11}}/>
                <Legend wrapperStyle={{fontFamily:F,fontSize:10}}/>
                <Bar dataKey="singles" fill={GOLD} name="Singles" radius={[4,4,0,0]}/>
                <Bar dataKey="albums" fill="#1565C0" name="Albums" radius={[4,4,0,0]}/>
                <Bar dataKey="new" fill="#2DB04A" name="New Singles" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Tracked Song Journey */}
          <div style={card()}>
            <div style={secLbl()}><SecMark/>Top Songs Journey Across Months</div>
            {tracked.map(title=>{
              const hasAny=MONTHS.some(m=>getCombined(ct,m).find(e=>e.title===title));
              if(!hasAny)return null;
              return(<div key={title} style={{display:"flex",alignItems:"center",padding:"7px 0",borderBottom:"1px solid #F0F0EC",gap:"8px"}}>
                <div style={{flex:1,fontSize:"11px",fontWeight:700,lineHeight:1.2,cursor:"pointer",color:GOLD}} onClick={()=>{const e=MONTHS.flatMap(m=>getCombined(ct,m)).find(x=>x.title===title);if(e)setSelR({...e,type:isSingles?"single":"album"});}}>{title}</div>
                {MONTHS.map(m=>{const e=getCombined(ct,m).find(x=>x.title===title);return(<div key={m} style={{width:"44px",textAlign:"center",fontFamily:F}}>
                  <div style={{fontSize:"8px",color:"#CCC"}}>{m.split(" ")[0].slice(0,3)}</div>
                  {e?<div style={{fontSize:"14px",fontWeight:800,color:e.rank===1?GOLD:e.rank<=3?"#1A1A1A":"#888"}}>#{e.rank}</div>:<div style={{fontSize:"11px",color:"#E0E0DC"}}>—</div>}
                </div>);})}
              </div>);
            })}
          </div>
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
              <div style={{marginTop:isMobile?"2px":0}}><Tog sm/></div>
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
          <div style={{display:"flex",justifyContent:"space-between",alignItems:isMobile?"stretch":"flex-end",marginBottom:"20px",flexWrap:"wrap",gap:"12px",flexDirection:isMobile?"column":"row"}}>
            <div>
              <div style={{fontFamily:F,fontSize:TXT.kicker,letterSpacing:"2.6px",textTransform:"uppercase",color:GOLD,marginBottom:"6px"}}>THE RECORD BOOK</div>
              <h2 style={{fontSize:TXT.pageTitle,fontWeight:800,margin:0}}>Records & Milestones</h2>
              <p style={{fontFamily:F,fontSize:TXT.lead,color:"#69716B",margin:"4px 0 0",lineHeight:1.55}}>Notable achievements from Q4 2024 · the chart's defining moments</p>
            </div>
            <Tog sm/>
          </div>
          <div className="anl-grid-3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"14px"}}>
            {(isSingles?MOM.records.singles:MOM.records.albums).map((r,i)=>(
              <div key={i} style={{...card(),position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",top:"-10px",right:"-10px",fontSize:"64px",opacity:0.06}}>{r.icon}</div>
                <div style={{fontSize:"26px",marginBottom:"10px"}}>{r.icon}</div>
                <div style={{fontFamily:F,fontSize:TXT.micro,fontWeight:800,letterSpacing:"2px",textTransform:"uppercase",color:GOLD,marginBottom:"8px"}}>{r.label}</div>
                <div style={{fontFamily:SF,fontSize:isMobile?"18px":"19px",fontWeight:800,lineHeight:1.15,marginBottom:"4px"}}>{r.value}</div>
                <div style={{fontFamily:F,fontSize:TXT.cardMeta,color:"#69716B",lineHeight:1.45}}>{r.sub}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* YEAR-END PAGE */}
      {page==="year-end"&&(
        <div style={{padding:PAD,background:"#FFF",minHeight:"60vh",boxSizing:"border-box",overflow:"hidden"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:isMobile?"stretch":"flex-end",marginBottom:"20px",gap:isMobile?"12px":"20px",flexDirection:isMobile?"column":"row"}}>
            <div>
              <div style={{fontFamily:F,fontSize:TXT.kicker,letterSpacing:"2.6px",textTransform:"uppercase",color:GOLD,marginBottom:"6px"}}>ANNUAL CHART</div>
              <h2 style={{fontSize:TXT.pageTitle,fontWeight:800,margin:0}}>Best of 2024</h2>
              <p style={{fontFamily:F,fontSize:TXT.lead,color:"#69716B",margin:"4px 0 0",lineHeight:1.55}}>Aggregated points across October, November & December 2024</p>
            </div>
            <Tog sm/>
          </div>
          {/* Podium */}
          <div className="podium-grid" style={{display:"grid",gridTemplateColumns:"1fr 1.2fr 1fr",gap:"12px",marginBottom:"24px",alignItems:"end"}}>
            {[yearEnd[1],yearEnd[0],yearEnd[2]].map((e,i)=>{
              if(!e)return <div key={i}/>;
              const pos=[2,1,3][i],medal=[SILVER,GOLD,BRONZE][i];
              return(<div key={i} style={{textAlign:"center",cursor:"pointer"}} onClick={()=>setSelR({title:e.t,artist:e.a,type:isSingles?"single":"album"})}>
                <div style={{background:medal+"15",border:"2px solid "+medal,borderRadius:"12px",padding:"16px 12px"}}>
                  <div style={{fontSize:"32px",fontWeight:900,color:medal}}>#{pos}</div>
                  <div style={{fontSize:i===1?"15px":TXT.cardTitle,fontWeight:800,marginBottom:"4px",lineHeight:1.2}}>{e.t}</div>
                  <div style={{fontSize:TXT.cardMeta,color:"#69716B",fontFamily:F,marginBottom:"8px"}}>{e.a}</div>
                  <div style={{fontSize:"18px",fontWeight:800,color:medal}}>{e.totalPts.toLocaleString()}</div>
                  <div style={{fontSize:"9px",color:"#BBB",fontFamily:F}}>total pts · {e.months} months</div>
                </div>
              </div>);
            })}
          </div>
          {/* Full list */}
          <div style={{display:"grid",gridTemplateColumns:"48px 1fr 80px 60px",padding:"10px 0",borderBottom:"2px solid #1A1A1A",fontFamily:F,fontSize:"8.5px",fontWeight:700,letterSpacing:"2px",textTransform:"uppercase",color:"#CCC"}}>
            <span style={{textAlign:"center"}}>#</span><span>TITLE</span><span style={{textAlign:"right"}}>TOTAL PTS</span><span style={{textAlign:"center"}}>MONTHS</span>
          </div>
          {yearEnd.slice(0,50).map((item,idx)=>{
            const t3=idx<3;
            return(<div key={item.t+item.a} style={{display:"grid",gridTemplateColumns:"48px 1fr 80px 60px",padding:t3?"13px 0":"9px 0",borderBottom:"1px solid #F2F2EE",alignItems:"center",cursor:"pointer"}}
              onMouseEnter={e=>e.currentTarget.style.background="#FAFAF6"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}
              onClick={()=>setSelR({title:item.t,artist:item.a,type:isSingles?"single":"album"})}>
              <div style={{textAlign:"center",fontSize:t3?"20px":"13px",fontWeight:800,color:t3?MEDALS[idx]:"#D8D8D4"}}>{idx+1}</div>
              <div><div style={{fontSize:t3?"14px":TXT.cardTitle,fontWeight:800,marginBottom:"1px",lineHeight:1.15}}>{item.t}</div><div style={{fontSize:TXT.cardMeta,color:"#69716B",fontFamily:F,marginTop:"3px"}}>{item.a}</div></div>
              <div style={{textAlign:"right",fontFamily:F,fontSize:t3?"14px":TXT.cardMeta,fontWeight:800,color:t3?GOLD:"#69716B"}}>{item.totalPts.toLocaleString()}</div>
              <div style={{textAlign:"center",fontFamily:F,fontSize:"11px",color:"#BBB"}}>{item.months}/3</div>
            </div>);
          })}
        </div>
      )}

      {/* CERTIFICATIONS PAGE */}
      {page==="certifications"&&(
        <div style={{padding:PAD,background:"#FFF",minHeight:"60vh",boxSizing:"border-box",overflow:"hidden"}}>
          <h2 style={{fontSize:TXT.pageTitle,fontWeight:800,margin:"0 0 4px"}}>Ngoma Certifications</h2>
          <p style={{fontFamily:F,fontSize:TXT.lead,color:"#69716B",margin:"0 0 24px",lineHeight:1.55}}>Awarded based on cumulative combined chart points across all months · Computed from full Top 50</p>
          <div className="anl-grid-4" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px",marginBottom:"28px"}}>
            {[{icon:"💎",l:"Diamond",pts:"5,000+",color:"#7B1FA2"},{icon:"🪙",l:"Platinum",pts:"2,000+",color:SILVER},{icon:"🥇",l:"Gold",pts:"1,000+",color:GOLD},{icon:"🎵",l:"Ngoma",pts:"500+",color:"#2DB04A"}].map((c,i)=>(
              <div key={i} style={{...card({textAlign:"center"}),borderTop:"3px solid "+c.color}}>
                <div style={{fontSize:"28px"}}>{c.icon}</div>
                <div style={{fontWeight:800,fontSize:TXT.metric,margin:"6px 0 2px",color:c.color}}>{c.l}</div>
                <div style={{fontFamily:F,fontSize:TXT.cardMeta,color:"#69716B"}}>{c.pts} points</div>
              </div>
            ))}
          </div>
          <Tog sm/>
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
          <span onClick={()=>setSelNews(null)} style={{fontFamily:F,fontSize:"11px",color:GOLD,cursor:"pointer",letterSpacing:"1px",textTransform:"uppercase",fontWeight:600}}>← All News</span>
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
      <footer style={{padding:isMobile?"20px 18px":"20px 28px",borderTop:"3px solid #1A1A1A",background:"#1A1A1A",fontFamily:F,boxSizing:"border-box",overflow:"hidden"}}>
        <div style={{...pageFrame(),display:"flex",justifyContent:"space-between",alignItems:isMobile?"flex-start":"center",flexWrap:"wrap",gap:"12px",flexDirection:isMobile?"column":"row"}}>
          <div onClick={()=>navTo("charts")} style={{display:"flex",alignItems:"center",gap:"9px",cursor:"pointer"}}>
            <svg width="16" height="18" viewBox="0 0 22 24" style={{flexShrink:0}}>
              <rect x="0" y="15" width="3.5" height="9" fill="#FFF" rx="0.5"/>
              <rect x="5.5" y="10" width="3.5" height="14" fill="#FFF" rx="0.5"/>
              <rect x="11" y="5" width="3.5" height="19" fill="#B8860B" rx="0.5"/>
              <rect x="16.5" y="0" width="3.5" height="24" fill="#FFF" rx="0.5"/>
            </svg>
            <span style={{fontFamily:F,fontSize:"11px",fontWeight:800,letterSpacing:"2.5px",color:"#FFF",textTransform:"uppercase"}}>Ngoma <span style={{color:"#B8860B"}}>Charts</span></span>
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
                 style={{display:"flex",color:"rgba(255,255,255,0.35)",transition:"color .2s"}}
                 onMouseEnter={e=>e.currentTarget.style.color="#B8860B"}
                 onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.35)"}>
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
            color: "rgba(255,255,255,0.22)",
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
