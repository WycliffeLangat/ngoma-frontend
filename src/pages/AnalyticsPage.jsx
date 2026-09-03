import EntryThumb from "../components/EntryThumb.jsx";
import ArtistCredit from "../components/ArtistCredit.jsx";
import AnalyticsSlideshowFrame from "../components/AnalyticsSlideshowFrame.jsx";
import { useRotatingArt } from "../hooks/useRotatingArt.js";
import ShareButton from "../components/ShareButton.jsx";
import HallOfFameSharePoster from "../components/sharePosters/HallOfFameSharePoster.jsx";
import MoversSharePoster from "../components/sharePosters/MoversSharePoster.jsx";
import PlatformBreakdownSharePoster from "../components/sharePosters/PlatformBreakdownSharePoster.jsx";
import RecordCardSharePoster from "../components/sharePosters/RecordCardSharePoster.jsx";
import { buildAnalyticsShareUrl } from "../utils/shareLinks.js";

// Full month name → abbreviated, e.g. "September 2025" → "Sep 2025".
const MONTH_ABBR = { January: "Jan", February: "Feb", March: "Mar", April: "Apr", May: "May", June: "Jun", July: "Jul", August: "Aug", September: "Sep", October: "Oct", November: "Nov", December: "Dec" };
const abbrevMonth = (label = "") => String(label).replace(/^(\w+)(?=\s\d{4}$)/, (full) => MONTH_ABBR[full] || full);

// A single Records & Milestones row, rendered as a CSS-grid row (matches the
// Head-to-Head comparison table's chrome). Records that don't pin to a single
// release/artist (e.g. "Total Charted Songs") rotate their thumbnail through
// the eligible pool.
function RecordRow({ r, pool, ctx, theme, rowStyle, cols }) {
  const {
    F, GOLD, RecordIcon, SF,
    InfoButton,
    isArtists, isMobile, isSingles,
    anMonth, openArtistDetails, openReleaseDetails,
  } = ctx;
  const { isDark } = theme;
  const chartTypeKey = isArtists ? "artists" : (isSingles ? "singles" : "albums");
  const recordInfoFor = (label = "") => {
    const normalized = String(label).toLowerCase();
    if (normalized.includes("total charted")) {
      return "Counts the unique entries that have appeared in the public Top 50 for this chart type across the tracked period.";
    }
    if (normalized.includes("points")) {
      return "Identifies the entry or artist with the strongest accumulated public display points in the selected record pool.";
    }
    if (normalized.includes("peak") || normalized.includes("#1") || normalized.includes("number one")) {
      return "Tracks the strongest rank achievements from published public Top 50 history.";
    }
    if (normalized.includes("month")) {
      return "Counts chart longevity using published monthly Top 50 appearances.";
    }
    if (normalized.includes("climb")) {
      return "Measures the biggest upward rank movement between consecutive published months.";
    }
    return "This record is calculated from published public Top 50 chart history for the selected chart type.";
  };

  const rotating = useRotatingArt(pool);
  const thumbItem = r.certificationEntry || rotating?.entry || null;
  const thumbName = r.certificationEntry ? (r.certificationEntry.artist || r.value) : (rotating?.name || r.value);

  const shareButton = (
    <ShareButton
      compact
      isDark={isDark}
      F={F}
      GOLD={GOLD}
      shareUrl={buildAnalyticsShareUrl({ chartType: chartTypeKey, month: anMonth })}
      fileName={`ngoma-record-${String(r.displayLabel || "record").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")}.png`}
      posterContent={
        <RecordCardSharePoster
          title={String(r.value ?? "")}
          subtitle={r.certificationEntry?.artist || ""}
          image={thumbItem?.cover_image || thumbItem?.image || ""}
          isArtist={isArtists}
          recordLabel={r.displayLabel}
          statValue={r.climbDelta ? `+${r.climbDelta}` : String(r.displaySub ?? "")}
          statLabel={r.climbDelta ? "Change" : "Detail"}
          theme={isDark ? "dark" : "light"}
        />
      }
    />
  );

  const leaderNode = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: "10px", minWidth: 0 }}>
      {thumbItem ? (
        <EntryThumb item={thumbItem} name={thumbName} isArtist={isArtists} size={isMobile ? 34 : 38} accent={isDark?"#F6F3EA":"#1A1A1A"} />
      ) : (
        <div style={{ width: isMobile ? 34 : 38, height: isMobile ? 34 : 38, borderRadius: "9px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: isDark ? "#151915" : "#F0EDE7" }}>
          <RecordIcon label={r.displayLabel} size={isMobile ? 17 : 19} />
        </div>
      )}
      {r.certificationEntry ? (
        <button
          type="button"
          onClick={() => { isArtists ? openArtistDetails(r.value) : openReleaseDetails(r.certificationEntry, isSingles ? "single" : "album"); }}
          style={{ border: 0, background: "transparent", padding: 0, fontFamily: SF, fontWeight: 800, fontSize: "14px", cursor: "pointer", textAlign: "left", color: isDark ? "#FFFFFF" : "inherit", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}
        >{r.value}</button>
      ) : (
        <span style={{ fontFamily: SF, fontWeight: 800, fontSize: "14px", color: isDark ? "#FFFFFF" : "inherit", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.value}</span>
      )}
    </div>
  );

  const detailNode = (
    <>
      <span>{r.displaySub}</span>
      {r.climbDelta && <span style={{ display: "inline-flex", marginLeft: "8px", flexShrink: 0, alignItems: "center", padding: "1px 6px", borderRadius: "999px", background: isDark ? "rgba(45,176,74,0.16)" : "#EAF8EF", color: isDark ? "#4FCB6F" : "#1E8E3E", fontSize: "10px", fontWeight: 900 }}>+{r.climbDelta}</span>}
    </>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: cols, gap: isMobile ? "8px" : "10px", alignItems: "center", padding: isMobile ? "10px 10px" : "14px 16px", ...rowStyle }}>
      <div style={{ minWidth: 0, fontFamily: F, fontSize: isMobile ? "9px" : "11px", fontWeight: 800, letterSpacing: "0.6px", textTransform: "uppercase", color: isDark ? "#FFFFFF" : "#000000", overflowWrap: "anywhere", display:"inline-flex", alignItems:"center", gap:"5px" }}>
        <span>{r.displayLabel}</span>
        {InfoButton && <InfoButton title={r.displayLabel} body={recordInfoFor(r.displayLabel)} size={14} />}
      </div>
      {leaderNode}
      <div style={{ minWidth: 0, fontFamily: F, fontSize: isMobile ? "11px" : "13px", color: isDark ? "#FFFFFF" : "#000000", lineHeight: 1.4, overflowWrap: "anywhere" }}>{detailNode}</div>
      {shareButton}
    </div>
  );
}

export default function AnalyticsPage({ ctx }) {
  const {
    AnalyticsDeepSection,
    Bar,
    BarChart,
    CC,
    CartesianGrid,
    Cell,
    CertificationTag,
    F,
    GOLD,
    InfoButton,
    MEDALS,
    MONTHS,
    PAD,
    PLATS_FOR,
    RecordIcon,
    ResponsiveContainer,
    SF,
    SecMark,
    TXT,
    Tog,
    Tooltip,
    ViewToggle,
    XAxis,
    YAxis,
    anMonth,
    analyticsRowsFor,
    artists,
    card,
    chartTypeLabel,
    ct,
    currentRecords,
    currentRecordsPool,
    getCertificationForEntry,
    getCombined,
    hof,
    isDark,
    isMobile,
    isArtists,
    isSingles,
    mvData,
    openArtistDetails,
    openReleaseDetails,
    platTotalsData,
    releaseLabel,
    secLbl,
    setAnMonth,
    topCountryData,
    viewMode
  } = ctx;

  const chartTypeKey = isArtists ? "artists" : (isSingles ? "singles" : "albums");
  const hofType = isArtists ? "artist" : (isSingles ? "single" : "album");
  const hofMonthIndex = new Map(MONTHS.map((monthLabel, index) => [monthLabel, index]));
  const hofEntryKey = (entry = {}) => {
    if (isArtists) {
      return `artist|${String(entry.title || entry.n || entry.primary_artist || entry.artist || "").trim().toLowerCase()}`;
    }
    const releaseId = entry.release_id || entry.releaseId || "";
    if (releaseId) return `${hofType}|id:${releaseId}`;
    return `${hofType}|${String(entry.title || entry.t || "").trim().toLowerCase()}|${String(entry.artist || entry.a || entry.primary_artist || "").trim().toLowerCase()}`;
  };
  const hofItems = [...(hof || [])
    .filter((entry) => entry.type === hofType)
    .reduce((map, entry) => {
      const key = hofEntryKey(entry);
      if (!key || key.endsWith("|")) return map;
      const monthRank = hofMonthIndex.get(entry.month) ?? -1;
      const current = map.get(key) || { ...entry, hofMonths: [], latestHofMonthRank: -1 };
      current.hofMonths.push(entry.month);
      if (monthRank >= current.latestHofMonthRank) {
        Object.assign(current, entry, {
          hofMonths: current.hofMonths,
          latestHofMonthRank: monthRank,
        });
      }
      map.set(key, current);
      return map;
    }, new Map()).values()]
    .map((entry) => ({
      ...entry,
      hofMonths: [...new Set(entry.hofMonths)].sort((a, b) => (hofMonthIndex.get(b) ?? -1) - (hofMonthIndex.get(a) ?? -1)),
    }))
    .sort((a, b) =>
      b.hofMonths.length - a.hofMonths.length ||
      b.latestHofMonthRank - a.latestHofMonthRank ||
      String(a.title || "").localeCompare(String(b.title || ""))
    );
  const hofLabel = isArtists ? "Artists" : (isSingles ? "Singles / Songs" : "Albums");

  const recordsTheme = { isDark, isMobile };

  // Shared chart theming — every Recharts instance below reads from this so
  // axes/grids/tooltips react to dark mode instead of being hardcoded light.
  const gridStroke = isDark ? "#242923" : "#EDEAE2";
  const axisTick = (size, extra) => ({ fontSize: size, fontFamily: F, fill: isDark ? "#FFFFFF" : "#000000", fontWeight: 650, ...extra });
  const tooltipStyle = {
    fontFamily: F, fontSize: 11,
    background: isDark ? "#161A16" : "#FFFFFF",
    border: "1px solid " + (isDark ? "#2F352F" : "#E4E1D8"),
    borderRadius: "8px",
    boxShadow: isDark ? "0 8px 24px rgba(0,0,0,0.35)" : "0 8px 24px rgba(31,36,31,0.08)",
    color: isDark ? "#FFFFFF" : "#000000",
  };
  const tooltipLabelStyle = { color: isDark ? "#FFFFFF" : "#000000", fontWeight: 700, marginBottom: "2px" };
  const barCursorFill = isDark ? "rgba(255,255,255,0.05)" : "rgba(31,36,31,0.04)";
  const axisStroke = isDark ? "#3A413A" : "#D9D5CB";
  const sectionGap = { marginBottom: isMobile ? "20px" : "26px" };
  // display:block (not secLbl's default flex) so the info button flows as
  // normal inline content right after the label text — if the label wraps
  // onto multiple lines, the button stays attached to the last line instead
  // of dropping onto its own separate line below the whole heading.
  const sectionTitle = (label, title, body, items = []) => (
    <div style={{...secLbl(isDark?"#FFFFFF":"#000000"), marginBottom:0, fontSize:"20px", display:"block", flex:"1 1 auto", minWidth:0}}>
      <SecMark c={isDark?"#F6F3EA":"#1A1A1A"}/>
      <span style={{marginLeft:"7px"}}>{label}</span>
      {InfoButton && <InfoButton title={title || label} body={body} items={items} size={16} style={{marginLeft:"8px"}} />}
    </div>
  );
  const compactInfo = (title, body, items = []) => InfoButton ? (
    <InfoButton title={title} body={body} items={items} size={16} />
  ) : null;

  // Head-to-Head-style CSS-grid table chrome, reused by Records and Hall of Fame.
  const gridBorder = "1px solid " + (isDark ? "#2F352F" : "#EEEAE1");
  const gridRowBg = (i) => isDark ? (i % 2 ? "#121612" : "#0F120F") : (i % 2 ? "#FBFAF7" : "#FFF");
  const gridHeaderStyle = { background: "#1F241F", color: "#FFFFFF" };
  const recordsCols = isMobile ? "56px minmax(64px,1fr) minmax(56px,1fr) 26px" : "150px minmax(160px,1fr) minmax(180px,1.4fr) 48px";
  const gridRowGap = isMobile ? "8px" : "10px";
  const hofCols = isMobile
    ? "28px minmax(0,1fr) 70px"
    : (isArtists ? "48px minmax(220px,1fr) 92px minmax(220px,1.4fr)" : "48px minmax(160px,1fr) minmax(140px,0.9fr) 92px minmax(160px,1.3fr)");

  // Normalized pools (title/artist field names) so useRotatingArt's default
  // name lookup works for risers/fallers, which carry t/a instead of title/artist.
  const risersPool = mvData.risers.map(s => ({ ...s, title: s.t, artist: s.a }));
  const fallersPool = mvData.fallers.map(s => ({ ...s, title: s.t, artist: s.a }));
  const newEntriesPool = mvData.newEntries.slice(0, 5);
  const openMoverDetails = (entry) => openReleaseDetails(entry, isArtists ? "artist" : (isSingles ? "single" : "album"));
  const splitRowStyle = { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "20px", alignItems: "center", ...sectionGap };

  // "Download All Posters" — the top Share button covers every poster this
  // page can produce (Hall of Fame, Climbers/Drops/New Entries, Platform
  // Totals, Top Countries) in one batch, alongside the plain Hall of Fame
  // poster it already offered. Sections with no qualifying data this month
  // are skipped rather than shipping an empty-state poster nobody asked for.
  const analyticsPosterTheme = isDark ? "dark" : "light";
  const analyticsPosterFiles = [
    {
      id: "hall-of-fame",
      fileName: `ngoma-hall-of-fame-${chartTypeKey}.png`,
      posterContent: <HallOfFameSharePoster chartType={chartTypeKey} theme={analyticsPosterTheme} />,
    },
    ...(mvData.risers.length ? [{
      id: "climbers",
      fileName: `ngoma-climbers-${chartTypeKey}.png`,
      posterContent: <MoversSharePoster chartType={chartTypeKey} move="risers" month={anMonth} theme={analyticsPosterTheme} />,
    }] : []),
    ...(mvData.fallers.length ? [{
      id: "drops",
      fileName: `ngoma-drops-${chartTypeKey}.png`,
      posterContent: <MoversSharePoster chartType={chartTypeKey} move="fallers" month={anMonth} theme={analyticsPosterTheme} />,
    }] : []),
    ...(mvData.newEntries.length ? [{
      id: "new-entries",
      fileName: `ngoma-new-entries-${chartTypeKey}.png`,
      posterContent: <MoversSharePoster chartType={chartTypeKey} move="newEntries" month={anMonth} theme={analyticsPosterTheme} />,
    }] : []),
    ...(platTotalsData.length ? [{
      id: "platform-totals",
      fileName: `ngoma-platform-totals-${chartTypeKey}.png`,
      posterContent: <PlatformBreakdownSharePoster chartType={isSingles ? "singles" : "albums"} metric="totals" month={anMonth} viewMode={viewMode("platformTotals")} theme={analyticsPosterTheme} />,
    }] : []),
    ...(topCountryData.length ? [{
      id: "top-countries",
      fileName: `ngoma-top-countries-${chartTypeKey}.png`,
      posterContent: <PlatformBreakdownSharePoster chartType={chartTypeKey} metric="country" month={anMonth} viewMode={viewMode("topCountries")} theme={analyticsPosterTheme} />,
    }] : []),
  ];
  const analyticsPosterDownloadOptions = [
    {
      id: "poster",
      label: "Download poster",
      fileName: `ngoma-hall-of-fame-${chartTypeKey}.png`,
      posterContent: <HallOfFameSharePoster chartType={chartTypeKey} theme={analyticsPosterTheme} />,
    },
    {
      id: "all",
      label: `Download All Posters (${analyticsPosterFiles.length} files)`,
      files: analyticsPosterFiles,
    },
  ];

  return (
<div className="ngoma-analytics-page" style={{padding:PAD,background:"transparent",minHeight:"60vh",boxSizing:"border-box",overflow:"hidden"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:isMobile?"stretch":"center",marginBottom:"28px",gap:isMobile?"14px":"24px",flexDirection:isMobile?"column":"row",paddingBottom:"20px",borderBottom:"1px solid "+(isDark?"#2F352F":"#EFEDE7")}}>
            <div>
              <div style={{display:"inline-block",width:"28px",height:"3px",background:isDark?"#FFFFFF":"#000000",borderRadius:"2px",marginBottom:"10px"}}/>
              {/* h2 is inline (not the default block) so the info button flows
                  right after the heading text instead of dropping below it
                  when the heading itself wraps onto multiple lines. */}
              <div style={{display:"block",marginBottom:"4px"}}>
                <h2 style={{display:"inline",fontSize:isMobile?"22px":"28px",fontWeight:900,margin:0,letterSpacing:"-0.5px",color:isDark?"#FFFFFF":"#000000"}}>{isArtists?"Artist Analytics":isSingles?"Singles Analytics":"Albums Analytics"}</h2>
                {" "}
                {compactInfo(
                  isArtists ? "Artist Analytics" : (isSingles ? "Singles Analytics" : "Albums Analytics"),
                  "Analytics summarizes movement, countries, records, milestones, and Hall of Fame results from the published public Top 50 data."
                )}
              </div>
              <p style={{fontFamily:F,fontSize:"14px",color:isDark?"#FFFFFF":"#000000",margin:0,lineHeight:1.6}}>Full Top 50 data across all platforms and months.</p>
            </div>
            <div style={{display:"flex",gap:"10px",flexDirection:isMobile?"column":"row",alignItems:isMobile?"stretch":"center",flexShrink:0,width:isMobile?"100%":"auto"}}>
              {/* Month select + Share are grouped on their own row (space-
                  between on mobile) so Share always lands on the right edge
                  instead of wrapping onto a second line behind the wide
                  chart-type switcher below it — three wide controls crammed
                  into one row was what pushed Share out of position. */}
              <div style={{display:"flex",gap:"10px",alignItems:"center",justifyContent:isMobile?"space-between":"flex-start"}}>
                <select value={anMonth} onChange={e=>setAnMonth(e.target.value)} style={{flex:isMobile?"1":"none",minWidth:isMobile?"120px":"160px",padding:isMobile?"10px 12px":"8px 14px",border:"1.5px solid "+(isDark?"#2F352F":"#DEDAD2"),borderRadius:"10px",background:isDark?"#1A1E1A":"#FAFAF8",fontSize:isMobile?"13px":"12px",fontFamily:F,fontWeight:750,cursor:"pointer",outline:"none",color:isDark?"#FFFFFF":"#000000"}}>
                  {MONTHS.map(m=><option key={m} value={m}>{m}</option>)}
                </select>
                {compactInfo("Analytics Month", "Choose which published month powers the movement, platform, country, and monthly analytics panels. All-time records still use the full tracked history.")}
                <ShareButton
                  isDark={isDark}
                  F={F}
                  GOLD={GOLD}
                  shareUrl={buildAnalyticsShareUrl({ chartType: chartTypeKey, month: anMonth })}
                  fileName={`ngoma-hall-of-fame-${chartTypeKey}.png`}
                  posterDownloadOptions={analyticsPosterDownloadOptions}
                />
              </div>
              <Tog sm/>
            </div>
          </div>

          {/* Climbers, Drops & New Entries — what moved this month */}
          <AnalyticsDeepSection label="Biggest Climbers & Drops" isMobile={isMobile}>
          <div className="anl-split-row" style={splitRowStyle}>
            {!isMobile && (
              <div style={{order:1}}>
                <AnalyticsSlideshowFrame pool={risersPool} isArtist={isArtists} accent="#2DB04A" onOpen={openMoverDetails} label={`Biggest ${releaseLabel} Climbers`} />
              </div>
            )}
            <div style={{...card(),order:2}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"10px",marginBottom:"14px",flexWrap:"nowrap"}}>
                {sectionTitle(
                  `Biggest ${releaseLabel} Climbers - ${anMonth}`,
                  `Biggest ${releaseLabel} Climbers`,
                  "Shows entries with the largest upward rank movement compared with the previous published month.",
                  ["The change is measured in chart places gained.", "Higher positive movement means a stronger climb.", "Debut-month charts may have no movement because there is no previous month to compare."]
                )}
                <ShareButton
                  compact
                  isDark={isDark}
                  F={F}
                  GOLD={GOLD}
                  shareUrl={buildAnalyticsShareUrl({ chartType: chartTypeKey, month: anMonth })}
                  fileName={`ngoma-climbers-${chartTypeKey}.png`}
                  posterContent={<MoversSharePoster chartType={chartTypeKey} move="risers" month={anMonth} theme={isDark ? "dark" : "light"} />}
                  style={{ flexShrink: 0 }}
                />
              </div>
              {mvData.risers.map((s,i)=>{
                return (
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",padding:isMobile?"8px 0":"6px 0",borderBottom:"1px solid #F0F0EC"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"10px",minWidth:0}}>
                    <EntryThumb item={s} name={isArtists?s.t:s.a} isArtist={isArtists} size={46} accent={isDark?"#F6F3EA":"#1A1A1A"} />
                    <div style={{minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
                        <button type="button" onClick={()=>openReleaseDetails(s,isArtists ? "artist" : (isSingles?"single":"album"))} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:TXT.cardTitle,fontWeight:800,lineHeight:1.15,cursor:"pointer",textAlign:"left"}}>{s.t}</button>
                      </div>
                      {!isArtists && <div style={{fontSize:TXT.cardMeta,marginTop:"3px"}}><ArtistCredit credit={s.a} onOpenArtist={openArtistDetails} isDark={isDark} fontFamily={F} fontSize={TXT.cardMeta} fontWeight={400} color="#000000" darkColor="#FFFFFF" separatorColor="#000000" darkSeparatorColor="#FFFFFF" /></div>}
                    </div>
                  </div>
                  <div style={{textAlign:"right",fontFamily:F,whiteSpace:"nowrap",flexShrink:0}}>
                    <div style={{display:"inline-flex",alignItems:"center",gap:"4px",background:"rgba(45,176,74,0.10)",borderRadius:"6px",padding:"3px 8px",color:"#2DB04A",fontSize:"12px",fontWeight:900}}>▲ {s.from-s.to}</div>
                    <div style={{fontSize:TXT.micro,color:isDark?"#FFFFFF":"#000000",marginTop:"3px"}}>#{s.from} → #{s.to}</div>
                  </div>
                </div>
                );
              })}
              {!mvData.risers.length&&<div style={{fontFamily:F,fontSize:isMobile?"12px":"11px",color:isDark?"#FFFFFF":"#000000",padding:"20px 0",textAlign:"center"}}>No movement data (debut month)</div>}
            </div>
          </div>

          <div className="anl-split-row" style={splitRowStyle}>
            <div style={{...card(),order:1}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"10px",marginBottom:"14px",flexWrap:"nowrap"}}>
                {sectionTitle(
                  `Biggest ${releaseLabel} Drops - ${anMonth}`,
                  `Biggest ${releaseLabel} Drops`,
                  "Shows entries with the largest downward rank movement compared with the previous published month.",
                  ["The drop is measured in chart places lost.", "This is movement within the public Top 50 history, not a drop in streams or listeners."]
                )}
                <ShareButton
                  compact
                  isDark={isDark}
                  F={F}
                  GOLD={GOLD}
                  shareUrl={buildAnalyticsShareUrl({ chartType: chartTypeKey, month: anMonth })}
                  fileName={`ngoma-drops-${chartTypeKey}.png`}
                  posterContent={<MoversSharePoster chartType={chartTypeKey} move="fallers" month={anMonth} theme={isDark ? "dark" : "light"} />}
                  style={{ flexShrink: 0 }}
                />
              </div>
              {mvData.fallers.map((s,i)=>{
                return (
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",padding:isMobile?"8px 0":"6px 0",borderBottom:"1px solid #F0F0EC"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"10px",minWidth:0}}>
                    <EntryThumb item={s} name={isArtists?s.t:s.a} isArtist={isArtists} size={46} accent={isDark?"#F6F3EA":"#1A1A1A"} />
                    <div style={{minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
                        <button type="button" onClick={()=>openReleaseDetails(s,isArtists ? "artist" : (isSingles?"single":"album"))} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:TXT.cardTitle,fontWeight:800,lineHeight:1.15,cursor:"pointer",textAlign:"left"}}>{s.t}</button>
                      </div>
                      {!isArtists && <div style={{fontSize:TXT.cardMeta,marginTop:"3px"}}><ArtistCredit credit={s.a} onOpenArtist={openArtistDetails} isDark={isDark} fontFamily={F} fontSize={TXT.cardMeta} fontWeight={400} color="#000000" darkColor="#FFFFFF" separatorColor="#000000" darkSeparatorColor="#FFFFFF" /></div>}
                    </div>
                  </div>
                  <div style={{textAlign:"right",fontFamily:F,whiteSpace:"nowrap",flexShrink:0}}>
                    <div style={{display:"inline-flex",alignItems:"center",gap:"4px",background:"rgba(229,57,53,0.10)",borderRadius:"6px",padding:"3px 8px",color:"#E53935",fontSize:"12px",fontWeight:900}}>▼ {s.to-s.from}</div>
                    <div style={{fontSize:TXT.micro,color:isDark?"#FFFFFF":"#000000",marginTop:"3px"}}>#{s.from} → #{s.to}</div>
                  </div>
                </div>
                );
              })}
              {!mvData.fallers.length&&<div style={{fontFamily:F,fontSize:isMobile?"12px":"11px",color:isDark?"#FFFFFF":"#000000",padding:"20px 0",textAlign:"center"}}>No drops (debut month)</div>}
            </div>
            {!isMobile && (
              <div style={{order:2}}>
                <AnalyticsSlideshowFrame pool={fallersPool} isArtist={isArtists} accent="#E53935" onOpen={openMoverDetails} label={`Biggest ${releaseLabel} Drops`} />
              </div>
            )}
          </div>

          <div className="anl-split-row" style={splitRowStyle}>
            {!isMobile && (
              <div style={{order:1}}>
                <AnalyticsSlideshowFrame pool={newEntriesPool} isArtist={isArtists} accent={GOLD} onOpen={openMoverDetails} label="New Entries" />
              </div>
            )}
            <div style={{...card(),order:2}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"10px",marginBottom:"14px",flexWrap:"nowrap"}}>
                {sectionTitle(
                  `New Entries - ${anMonth}`,
                  "New Entries",
                  "Shows entries appearing on this public Top 50 for the first time in the tracked history.",
                  ["A new entry is not necessarily a newly released song or album.", "It means this is its first charted public Top 50 appearance in the dataset."]
                )}
                <ShareButton
                  compact
                  isDark={isDark}
                  F={F}
                  GOLD={GOLD}
                  shareUrl={buildAnalyticsShareUrl({ chartType: chartTypeKey, month: anMonth })}
                  fileName={`ngoma-new-entries-${chartTypeKey}.png`}
                  posterContent={<MoversSharePoster chartType={chartTypeKey} move="newEntries" month={anMonth} theme={isDark ? "dark" : "light"} />}
                  style={{ flexShrink: 0 }}
                />
              </div>
              {mvData.newEntries.slice(0,5).map((s,i)=>{
                return (
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",padding:isMobile?"8px 0":"6px 0",borderBottom:"1px solid #F0F0EC"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"10px",minWidth:0}}>
                    <EntryThumb item={s} name={isArtists?s.title:s.artist} isArtist={isArtists} size={46} accent={isDark?"#F6F3EA":"#1A1A1A"} />
                    <div style={{minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
                        <button type="button" onClick={()=>openReleaseDetails(s,isArtists ? "artist" : (isSingles?"single":"album"))} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:TXT.cardTitle,fontWeight:800,lineHeight:1.15,cursor:"pointer",textAlign:"left"}}>{s.title}</button>
                      </div>
                      {!isArtists && <div style={{fontSize:TXT.cardMeta,marginTop:"3px"}}><ArtistCredit credit={s.artist} onOpenArtist={openArtistDetails} isDark={isDark} fontFamily={F} fontSize={TXT.cardMeta} fontWeight={400} color="#000000" darkColor="#FFFFFF" separatorColor="#000000" darkSeparatorColor="#FFFFFF" /></div>}
                    </div>
                  </div>
                  <div style={{textAlign:"right",fontFamily:F,whiteSpace:"nowrap",flexShrink:0}}>
                    <div style={{display:"inline-flex",alignItems:"center",gap:"4px",background:isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.06)",borderRadius:"6px",padding:"3px 8px",color:isDark?"#FFFFFF":"#000000",fontSize:"12px",fontWeight:900}}>NEW</div>
                    <div style={{fontSize:TXT.micro,color:isDark?"#FFFFFF":"#000000",marginTop:"3px"}}>#{s.rank}</div>
                  </div>
                </div>
                );
              })}
              {!mvData.newEntries.length&&<div style={{fontFamily:F,fontSize:isMobile?"12px":"11px",color:isDark?"#FFFFFF":"#000000",padding:"20px 0",textAlign:"center"}}>No new entries (debut month)</div>}
            </div>
          </div>
          </AnalyticsDeepSection>


          {/* Platform totals */}
          {platTotalsData.length>0&&(
            <AnalyticsDeepSection label="Platform Totals" isMobile={isMobile}>
            <div style={{...card(),...sectionGap}}>
              {sectionTitle(
                `Platform Totals - ${anMonth}`,
                "Platform Totals",
                "Counts how many entries from the selected month's Combined Top 50 also appeared on each tracked source platform.",
                ["This is a coverage count, not streams, listeners, or total points.", "A single entry can count on multiple platforms, so the bars can add up to more than 50."]
              )}
              <div style={{display:"flex",justifyContent:"flex-end",alignItems:"center",gap:"10px",margin:"-4px 0 12px"}}>
                <ShareButton
                  compact
                  isDark={isDark}
                  F={F}
                  GOLD={GOLD}
                  shareUrl={buildAnalyticsShareUrl({ chartType: chartTypeKey, month: anMonth })}
                  fileName={`ngoma-platform-totals-${chartTypeKey}.png`}
                  posterContent={<PlatformBreakdownSharePoster chartType={isSingles ? "singles" : "albums"} metric="totals" month={anMonth} viewMode={viewMode("platformTotals")} theme={isDark ? "dark" : "light"} />}
                />
                <ViewToggle id="platformTotals" />
              </div>
              {viewMode("platformTotals")==="table" ? (
                <div style={{display:"grid",gap:"8px"}}>
                  {platTotalsData.map((entry)=>(
                    <div key={entry.platform} style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 70px",gap:"10px",alignItems:"center",padding:"9px 0",borderBottom:"1px solid "+(isDark?"#2F352F":"#F0F0EC")}}>
                      <div style={{display:"flex",alignItems:"center",gap:"8px",minWidth:0}}><span style={{width:"10px",height:"10px",borderRadius:"3px",background:entry.color,flexShrink:0}}/><span style={{fontFamily:F,fontSize:TXT.cardTitle,fontWeight:850,color:isDark?"#FFFFFF":"#000000",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{entry.platform}</span>{InfoButton && <InfoButton title={`${entry.platform} Platform Total`} body={`${entry.platform} has ${entry.entries} entries from the selected month's Combined Top 50. This is a coverage count, not streams or points.`} size={14} />}</div>
                      <span style={{fontFamily:F,fontSize:TXT.cardTitle,fontWeight:900,color:isDark?"#FFFFFF":"#000000",textAlign:"right"}}>{entry.entries}</span>
                    </div>
                  ))}
                </div>
              ) : (
              <ResponsiveContainer width="100%" height={isMobile?230:200}>
                <BarChart data={platTotalsData} margin={{top:12,right:isMobile?16:20,left:isMobile?0:8,bottom:isMobile?6:0}} barCategoryGap="14%">
                  <CartesianGrid stroke={gridStroke} vertical={false}/>
                  <XAxis dataKey="platform" tick={isMobile?false:axisTick(10)} tickLine={{stroke:axisStroke}} axisLine={{stroke:axisStroke}}/>
                  <YAxis domain={[dataMin => Math.max(0, Math.floor(dataMin * 0.9)), dataMax => Math.ceil(dataMax * 1.05)]} allowDecimals={false} tick={axisTick(isMobile?10.5:10)} axisLine={{stroke:axisStroke}} tickLine={{stroke:axisStroke}}/>
                  <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} cursor={{fill:barCursorFill}} formatter={v=>[v,"Combined entries"]}/>
                  <Bar dataKey="entries" radius={[6,6,0,0]} maxBarSize={84}>{platTotalsData.map((e,i)=><Cell key={i} fill={e.color}/>)}</Bar>
                </BarChart>
              </ResponsiveContainer>
              )}
              {isMobile&&<div style={{display:"flex",justifyContent:"center",gap:"8px 12px",flexWrap:"wrap",marginTop:"10px"}}>{platTotalsData.map((entry)=><div key={entry.platform} style={{display:"inline-flex",alignItems:"center",gap:"5px",fontFamily:F,fontSize:"12px",fontWeight:750,color:isDark?"#FFFFFF":"#000000"}}><span style={{width:"9px",height:"9px",borderRadius:"3px",background:entry.color,flexShrink:0}}/>{entry.platform}</div>)}</div>}
            </div>
            </AnalyticsDeepSection>
          )}

          {/* Country analytics */}
          <AnalyticsDeepSection label="Country Stats" isMobile={isMobile}>
          <div style={{...card(),...sectionGap}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",marginBottom:"14px",flexWrap:"wrap"}}>
              {sectionTitle(
                `Top 5 Countries - ${anMonth}`,
                "Top Countries",
                "Counts the most represented artist countries among entries in the selected public chart month.",
                ["Country comes from artist profile metadata when available.", "For songs and albums, the primary artist usually determines the country count."]
              )}
              <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                <ShareButton
                  compact
                  isDark={isDark}
                  F={F}
                  GOLD={GOLD}
                  shareUrl={buildAnalyticsShareUrl({ chartType: chartTypeKey, month: anMonth })}
                  fileName={`ngoma-top-countries-${chartTypeKey}.png`}
                  posterContent={<PlatformBreakdownSharePoster chartType={chartTypeKey} metric="country" month={anMonth} viewMode={viewMode("topCountries")} theme={isDark ? "dark" : "light"} />}
                />
                <ViewToggle id="topCountries" />
              </div>
            </div>
            {viewMode("topCountries")==="table" ? (
              <div style={{display:"grid",gap:"8px"}}>
                {topCountryData.map((country)=>(
                  <div key={country.code} style={{display:"grid",gridTemplateColumns:"54px minmax(0,1fr) 72px",gap:"10px",alignItems:"center",padding:"9px 0",borderBottom:"1px solid "+(isDark?"#2F352F":"#F0F0EC")}}>
                    <span style={{fontFamily:F,fontSize:TXT.cardMeta,fontWeight:950,color:isDark?"#FFFFFF":"#000000"}}>{country.code}</span>
                    <span style={{fontFamily:F,fontSize:TXT.cardTitle,fontWeight:850,color:isDark?"#FFFFFF":"#000000",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",display:"inline-flex",alignItems:"center",gap:"6px"}}>{country.country}{InfoButton && <InfoButton title={`${country.country} Country Count`} body={`${country.country} appears ${country.entries} time${country.entries === 1 ? "" : "s"} among the selected month's public chart entries, based on artist country metadata.`} size={14} />}</span>
                    <span style={{fontFamily:F,fontSize:TXT.cardTitle,fontWeight:900,color:isDark?"#FFFFFF":"#000000",textAlign:"right"}}>{country.entries}</span>
                  </div>
                ))}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={topCountryData} layout="vertical" margin={{left:8,right:16,top:0,bottom:0}} barCategoryGap="18%">
                  <CartesianGrid stroke={gridStroke} horizontal={false}/>
                  <XAxis type="number" allowDecimals={false} tick={axisTick(10)} axisLine={{stroke:axisStroke}} tickLine={{stroke:axisStroke}}/>
                  <YAxis type="category" dataKey="code" width={38} tick={axisTick(11,{fontWeight:850})} axisLine={{stroke:axisStroke}} tickLine={{stroke:axisStroke}}/>
                  <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} cursor={{fill:barCursorFill}} formatter={(v,n)=>[v,n==="entries"?"Entries":"Points"]}/>
                  <Bar dataKey="entries" radius={[0,6,6,0]} maxBarSize={56}>{topCountryData.map((entry)=><Cell key={entry.code} fill={entry.color}/>)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          </AnalyticsDeepSection>

          {/* Records & Milestones — all-time achievements for the selected chart type. */}
          <AnalyticsDeepSection label="Records & Milestones" isMobile={isMobile}>
          <div style={{...card(),...sectionGap}}>
            {sectionTitle(
              isMobile ? "Records & Milestones" : "Records & Milestones - All Time",
              "Records & Milestones",
              "Highlights all-time achievements calculated from the published public Top 50 charts.",
              ["Records use the currently selected chart type.", "They are based on chart ranks, points, months, and appearances stored in the public dataset."]
            )}
            <p style={{fontFamily:F,fontSize:"13px",color:isDark?"#FFFFFF":"#000000",margin:"-4px 0 18px",lineHeight:1.5}}>{chartTypeLabel} achievements calculated solely from published public Top 50 charts across all tracked months.</p>
            <div style={{border:"1px solid "+(isDark?"#242923":"#EFEDE7"),borderRadius:"12px",overflow:"hidden"}}>
              <div style={{display:"grid",gridTemplateColumns:recordsCols,gap:gridRowGap,padding:isMobile?"10px 10px":"12px 16px",...gridHeaderStyle}}>
                <div style={{fontFamily:F,fontSize:isMobile?"9px":"10px",fontWeight:900,letterSpacing:"0.8px",textTransform:"uppercase",color:"#FFFFFF",display:"inline-flex",alignItems:"center",gap:"5px"}}>Record{InfoButton && <InfoButton title="Record" body="The achievement being measured, such as highest points, most charted entries, biggest climb, or total charted releases." size={14} style={{background:"rgba(255,255,255,0.10)",color:"#FFFFFF",borderColor:"rgba(255,255,255,0.32)"}} />}</div>
                <div style={{fontFamily:F,fontSize:isMobile?"9px":"10px",fontWeight:900,letterSpacing:"0.8px",textTransform:"uppercase",color:"#FFFFFF",display:"inline-flex",alignItems:"center",gap:"5px"}}>Leader{InfoButton && <InfoButton title="Leader" body="The song, album, or artist currently leading that record category." size={14} style={{background:"rgba(255,255,255,0.10)",color:"#FFFFFF",borderColor:"rgba(255,255,255,0.32)"}} />}</div>
                <div style={{fontFamily:F,fontSize:isMobile?"9px":"10px",fontWeight:900,letterSpacing:"0.8px",textTransform:"uppercase",color:"#FFFFFF",display:"inline-flex",alignItems:"center",gap:"5px"}}>Detail{InfoButton && <InfoButton title="Record Detail" body="The supporting value behind the record, such as points, months, entries, rank change, or award level." size={14} style={{background:"rgba(255,255,255,0.10)",color:"#FFFFFF",borderColor:"rgba(255,255,255,0.32)"}} />}</div>
                <div/>
              </div>
              {currentRecords.map((r,i)=>{
                const pool = r.isTotalCount ? currentRecordsPool : [];
                return (
                  <RecordRow
                    key={`${r.displayLabel}-${r.value}`}
                    r={r}
                    pool={pool}
                    ctx={ctx}
                    theme={recordsTheme}
                    cols={recordsCols}
                    rowStyle={{borderTop:gridBorder,background:gridRowBg(i)}}
                  />
                );
              })}
            </div>
          </div>
          </AnalyticsDeepSection>

          {hofItems.length > 0 && (
          <AnalyticsDeepSection label="Hall of Fame" isMobile={isMobile}>
          <div style={card({marginBottom:isMobile?"20px":"26px"})}>
            {sectionTitle(
              isMobile ? "Monthly #1s" : "Hall of Fame - Monthly #1s",
              "Hall of Fame",
              "Lists entries that reached #1 on a published monthly Combined chart.",
              ["Time at #1 counts how many months the entry led the chart.", "Months lists the specific published chart months where it finished at #1."]
            )}
            <p style={{fontFamily:F,fontSize:"13px",color:isDark?"#FFFFFF":"#000000",margin:"-4px 0 18px",lineHeight:1.5}}>Monthly leaders from the published public Top 50 charts across the full tracked dataset.</p>
            <div style={{fontFamily:F,fontSize:"11px",fontWeight:900,letterSpacing:"1.8px",textTransform:"uppercase",color:isDark?"#FFFFFF":"#000000",marginBottom:"12px",paddingBottom:"6px",borderBottom:"1px solid "+(isDark?"#2F352F":"#E4E1D8")}}>{hofLabel}</div>
            <div style={{border:"1px solid "+(isDark?"#242923":"#EFEDE7"),borderRadius:"12px",overflow:"hidden"}}>
              <div style={{display:"grid",gridTemplateColumns:hofCols,gap:gridRowGap,padding:isMobile?"10px 10px":"12px 16px",...gridHeaderStyle}}>
                <div style={{fontFamily:F,fontSize:isMobile?"9px":"10px",fontWeight:900,letterSpacing:"0.8px",textTransform:"uppercase",color:"#FFFFFF",textAlign:"center"}}>#{InfoButton && <InfoButton title="Hall of Fame Rank" body="Rows are ordered by time spent at #1, then by recency and title when needed." size={14} style={{marginLeft:"5px",background:"rgba(255,255,255,0.10)",color:"#FFFFFF",borderColor:"rgba(255,255,255,0.32)"}} />}</div>
                <div style={{fontFamily:F,fontSize:isMobile?"9px":"10px",fontWeight:900,letterSpacing:"0.8px",textTransform:"uppercase",color:"#FFFFFF",display:"inline-flex",alignItems:"center",gap:"5px"}}>{isArtists?"Artist":"Title"}{InfoButton && <InfoButton title={isArtists ? "Artist" : "Title"} body={`The ${isArtists ? "artist" : "release"} that reached #1 on a published monthly Combined chart.`} size={14} style={{background:"rgba(255,255,255,0.10)",color:"#FFFFFF",borderColor:"rgba(255,255,255,0.32)"}} />}</div>
                {!isMobile && !isArtists && <div style={{fontFamily:F,fontSize:"10px",fontWeight:900,letterSpacing:"0.8px",textTransform:"uppercase",color:"#FFFFFF",display:"inline-flex",alignItems:"center",gap:"5px"}}>Artist{InfoButton && <InfoButton title="Artist" body="The primary artist credit attached to the Hall of Fame release." size={14} style={{background:"rgba(255,255,255,0.10)",color:"#FFFFFF",borderColor:"rgba(255,255,255,0.32)"}} />}</div>}
                <div style={{fontFamily:F,fontSize:isMobile?"9px":"10px",fontWeight:900,letterSpacing:"0.8px",textTransform:"uppercase",color:"#FFFFFF",textAlign:"center"}}>{isMobile?"Time":"Time at #1"}{InfoButton && <InfoButton title="Time at #1" body="Counts how many published months this entry finished at rank #1." size={14} style={{marginLeft:"5px",background:"rgba(255,255,255,0.10)",color:"#FFFFFF",borderColor:"rgba(255,255,255,0.32)"}} />}</div>
                {!isMobile && <div style={{fontFamily:F,fontSize:"10px",fontWeight:900,letterSpacing:"0.8px",textTransform:"uppercase",color:"#FFFFFF",display:"inline-flex",alignItems:"center",gap:"5px"}}>Months{InfoButton && <InfoButton title="Hall of Fame Months" body="The specific published months where the entry held #1." size={14} style={{background:"rgba(255,255,255,0.10)",color:"#FFFFFF",borderColor:"rgba(255,255,255,0.32)"}} />}</div>}
              </div>
              {hofItems.map((e,i)=>{
                const rowStyle = {borderTop:gridBorder,background:gridRowBg(i)};
                const timeLabel = e.hofMonths.length > 1 ? `${e.hofMonths.length} months` : "1 month";
                const monthsLabel = e.hofMonths.map(abbrevMonth).join(", ");
                const titleCell = (
                  <div style={{display:"flex",alignItems:"center",gap:"10px",minWidth:0}}>
                    <EntryThumb item={e} name={isArtists?e.title:e.artist} isArtist={isArtists} size={isMobile?32:38} accent={isDark?"#F6F3EA":"#1A1A1A"} />
                    <div style={{minWidth:0,flex:1}}>
                      <button type="button" onClick={()=>openReleaseDetails(e,e.type)} style={{display:"block",border:0,background:"transparent",padding:0,fontFamily:SF,fontWeight:800,fontSize:isMobile?"13px":"14px",cursor:"pointer",textAlign:"left",color:isDark?"#FFFFFF":"inherit",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"100%"}}>{e.title}</button>
                      {isMobile && !isArtists && <div style={{fontFamily:F,fontSize:"11px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}><ArtistCredit credit={e.artist} onOpenArtist={openArtistDetails} isDark={isDark} fontFamily={F} fontSize="11px" fontWeight={400} color="#000000" darkColor="#FFFFFF" separatorColor="#000000" darkSeparatorColor="#FFFFFF" /></div>}
                      {isMobile && <div title={monthsLabel} style={{fontFamily:F,fontSize:"10px",color:isDark?"#FFFFFF":"#000000",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",marginTop:"2px"}}>{monthsLabel}</div>}
                    </div>
                  </div>
                );
                return (
                  <div key={`${e.type}-${e.month}-${i}`} style={{display:"grid",gridTemplateColumns:hofCols,gap:gridRowGap,alignItems:"center",padding:isMobile?"10px 10px":"14px 16px",...rowStyle}}>
                    <div style={{fontFamily:F,fontSize:isMobile?"12px":"13px",fontWeight:900,color:isDark?"#FFFFFF":"#000000",textAlign:"center"}}>{i+1}</div>
                    {titleCell}
                    {!isMobile && !isArtists && <div style={{minWidth:0,fontFamily:F,fontSize:"13px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}><ArtistCredit credit={e.artist} onOpenArtist={openArtistDetails} isDark={isDark} fontFamily={F} fontSize="13px" fontWeight={400} color="#000000" darkColor="#FFFFFF" separatorColor="#000000" darkSeparatorColor="#FFFFFF" /></div>}
                    <div style={{fontFamily:F,fontSize:isMobile?"11px":"13px",fontWeight:800,color:isDark?"#FFFFFF":"#000000",whiteSpace:"nowrap",textAlign:"center"}}>{timeLabel}</div>
                    {!isMobile && <div title={monthsLabel} style={{minWidth:0,fontFamily:F,fontSize:"12px",color:isDark?"#FFFFFF":"#000000",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{monthsLabel}</div>}
                  </div>
                );
              })}
            </div>
          </div>
          </AnalyticsDeepSection>
          )}
        </div>
  );
}
