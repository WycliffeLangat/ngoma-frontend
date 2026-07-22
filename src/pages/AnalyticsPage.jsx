import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import EntryThumb from "../components/EntryThumb.jsx";
import { useRotatingArt } from "../hooks/useRotatingArt.js";

// A single Records & Milestones row — styled to match the Hall of Fame
// "Monthly #1s" cards (small thumbnail + label/title/sub in a flex row)
// instead of the old big art-bleed tile. Records that don't pin to a single
// release/artist (e.g. "Total Charted Songs") rotate their thumbnail through
// the eligible pool; "Perfect Coverage Club" stays clickable and expands
// in place to list its full-coverage releases.
function RecordRow({ r, expanded, onToggle, pool, ctx, theme }) {
  const {
    CertificationTag, F, GOLD, RecordIcon, SF,
    fullCoverageClub, getCertificationForEntry, isArtists, isMobile, isSingles,
    openArtistDetails, openReleaseDetails, releaseLabelLower,
  } = ctx;
  const { isDark, textPrimary, textMuted, dividerColor, rowBorder } = theme;

  const recordCertification = !isArtists && r.certificationEntry ? getCertificationForEntry(r.certificationEntry, isSingles ? "single" : "album") : null;
  const rotating = useRotatingArt(pool);
  const thumbItem = r.certificationEntry || rotating?.entry || null;
  const thumbName = r.certificationEntry ? (r.certificationEntry.artist || r.value) : (rotating?.name || r.value);
  const thumbSize = isMobile ? 62 : 72;

  return (
    <div
      onClick={r.isCoverage ? onToggle : undefined}
      style={{
        display: "flex", flexDirection: "column",
        padding: "12px", background: isDark ? "#151915" : "#FAFAF8", borderRadius: "8px", border: "1px solid " + (isDark ? "#242923" : "#EFEDE7"),
        minWidth: 0, gridColumn: expanded ? "1 / -1" : "auto",
        cursor: r.isCoverage ? "pointer" : "default",
      }}
    >
      <div style={{ display: "flex", gap: "11px", alignItems: "center", minWidth: 0 }}>
        {thumbItem ? (
          <EntryThumb item={thumbItem} name={thumbName} isArtist={isArtists} size={thumbSize} accent={GOLD} />
        ) : (
          <div style={{ width: thumbSize, height: thumbSize, borderRadius: "10px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: isDark ? "#151915" : "#F0EDE7" }}>
            <RecordIcon label={r.displayLabel} size={isMobile ? 26 : 30} />
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: F, fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", color: GOLD, marginBottom: "4px" }}>{r.displayLabel}</div>
          {r.certificationEntry ? (
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); isArtists ? openArtistDetails(r.value) : openReleaseDetails(r.certificationEntry, isSingles ? "single" : "album"); }}
              style={{ display: "block", border: 0, background: "transparent", padding: 0, fontFamily: SF, fontWeight: 800, fontSize: "15px", marginBottom: "2px", lineHeight: 1.2, cursor: "pointer", textAlign: "left", color: isDark ? "#F6F3EA" : "inherit", maxWidth: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
            >{r.value}</button>
          ) : (
            <div style={{ fontFamily: SF, fontWeight: 800, fontSize: "15px", marginBottom: "2px", lineHeight: 1.2, color: isDark ? "#F6F3EA" : "inherit", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.value}</div>
          )}
          {recordCertification && <CertificationTag cert={recordCertification} compact style={{ marginBottom: "2px" }} />}
          <div style={{ fontFamily: F, fontSize: "13px", color: isDark ? "#AEB6AE" : "#69716B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{r.displaySub}</span>
            {r.climbDelta && <span style={{ display: "inline-flex", flexShrink: 0, alignItems: "center", padding: "1px 6px", borderRadius: "999px", background: isDark ? "rgba(45,176,74,0.16)" : "#EAF8EF", color: isDark ? "#4FCB6F" : "#1E8E3E", fontSize: "10px", fontWeight: 900 }}>+{r.climbDelta}</span>}
          </div>
          {r.isCoverage && (
            <div style={{ display: "flex", alignItems: "center", gap: "5px", fontFamily: F, fontSize: "10.5px", color: GOLD, fontWeight: 800, letterSpacing: "0.5px", marginTop: "6px" }}>
              <span>{expanded ? `Hide ${releaseLabelLower}` : `View ${releaseLabelLower}`}</span>
              <span style={{ fontSize: "11px", transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.22s ease", display: "inline-block" }}>▾</span>
            </div>
          )}
        </div>
      </div>

      {expanded && r.isCoverage && (
        <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: `1px solid ${dividerColor}`, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))", columnGap: "22px" }}>
          {fullCoverageClub.length ? fullCoverageClub.map((song, idx) => {
            const certification = getCertificationForEntry(song, isSingles ? "single" : "album");
            return (
              <div key={`${song.title}-${song.artist}`} className="ngoma-coverage-row" style={{ display: "grid", gridTemplateColumns: "22px 42px minmax(0,1fr)", gap: "8px", alignItems: "center", padding: "8px 6px", fontFamily: F, borderBottom: `1px solid ${rowBorder}` }}>
                <span style={{ fontSize: "10px", fontWeight: 900, color: GOLD }}>#{idx + 1}</span>
                <EntryThumb item={song} name={song.artist} size={42} accent={GOLD} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                    <button type="button" onClick={(event) => { event.stopPropagation(); isArtists ? openArtistDetails(song.title) : openReleaseDetails(song, isSingles ? "single" : "album"); }} style={{ border: 0, background: "transparent", padding: 0, fontFamily: SF, fontSize: "12px", fontWeight: 850, color: textPrimary, cursor: "pointer", textAlign: "left" }}>{song.title}</button>
                    {certification && <CertificationTag cert={certification} compact />}
                  </span>
                  <span style={{ display: "block", fontSize: "11px", color: textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{song.artist} · {song.month}</span>
                </span>
              </div>
            );
          }) : <div style={{ fontFamily: F, fontSize: "12px", color: textMuted }}>No full-coverage entries found for this view.</div>}
        </div>
      )}
    </div>
  );
}

export default function AnalyticsPage({ ctx }) {
  const {
    AnalyticsDeepSection,
    CC,
    CertificationTag,
    F,
    GOLD,
    MEDALS,
    MONTHS,
    PAD,
    PC,
    PLATS_FOR,
    PLAT_LABEL,
    RecordIcon,
    SF,
    SecMark,
    TXT,
    Tog,
    ViewToggle,
    allTitles,
    anMonth,
    analyticsRowsFor,
    artists,
    card,
    chartTypeLabel,
    cmpS1,
    cmpS2,
    crossPlatformRows,
    ct,
    currentPlatformKeys,
    currentRecords,
    currentRecordsPool,
    fullCoverageClub,
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
    openRecord,
    platTotalsData,
    releaseLabel,
    releaseLabelLower,
    secLbl,
    setAnMonth,
    setCmpS1,
    setCmpS2,
    setOpenRecord,
    songRankData,
    sp1,
    sp2,
    topCountryData,
    tp,
    uniquePlatformData,
    viewMode
  } = ctx;

  const xHitsRows = crossPlatformRows.filter(e => e.count >= tp);
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
      b.latestHofMonthRank - a.latestHofMonthRank ||
      String(a.title || "").localeCompare(String(b.title || ""))
    );
  const hofLabel = isArtists ? "Artists" : (isSingles ? "Singles / Songs" : "Albums");
  const [platCompareView, setPlatCompareView] = useState("table");

  // Records & Milestones theming — matches the Hall of Fame rows' look
  const recordsTextPrimary = isDark ? "#F6F3EA" : "#1A1A1A";
  const recordsTextMuted = isDark ? "#8F968F" : "#59645D";
  const recordsDividerColor = isDark ? "#242923" : "#F0EEE8";
  const recordsRowBorder = isDark ? "#1E231E" : "#F2F0EA";
  const recordsTheme = {
    isDark, isMobile,
    textPrimary: recordsTextPrimary, textMuted: recordsTextMuted,
    dividerColor: recordsDividerColor, rowBorder: recordsRowBorder,
  };

  // Shared chart theming — every Recharts instance below reads from this so
  // axes/grids/tooltips react to dark mode instead of being hardcoded light.
  const gridStroke = isDark ? "#242923" : "#EDEAE2";
  const axisTick = (size, extra) => ({ fontSize: size, fontFamily: F, fill: isDark ? "#93A093" : "#59645D", fontWeight: 650, ...extra });
  const tooltipStyle = {
    fontFamily: F, fontSize: 11,
    background: isDark ? "#161A16" : "#FFFFFF",
    border: "1px solid " + (isDark ? "#2F352F" : "#E4E1D8"),
    borderRadius: "8px",
    boxShadow: isDark ? "0 8px 24px rgba(0,0,0,0.35)" : "0 8px 24px rgba(31,36,31,0.08)",
    color: isDark ? "#F6F3EA" : "#1A1A1A",
  };
  const tooltipLabelStyle = { color: isDark ? "#D7DBD7" : "#59645D", fontWeight: 700, marginBottom: "2px" };
  const barCursorFill = isDark ? "rgba(255,255,255,0.05)" : "rgba(31,36,31,0.04)";
  const sectionGap = { marginBottom: isMobile ? "20px" : "26px" };
  const chartPanel = {
    width: "100%", maxWidth: isMobile ? "360px" : "none", margin: "0 auto",
    padding: isMobile ? "14px 8px 10px" : "16px 18px 12px",
    background: isDark ? "#0F120F" : "#FFFFFF",
    border: "1px solid " + (isDark ? "#2F352F" : "#E9E5DC"),
    borderRadius: "13px",
    boxShadow: isDark ? "none" : "0 6px 20px rgba(31,36,31,0.04)",
    overflow: "hidden",
  };

  return (
<div className="ngoma-analytics-page" style={{padding:PAD,background:"transparent",minHeight:"60vh",boxSizing:"border-box",overflow:"hidden"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:isMobile?"stretch":"center",marginBottom:"28px",gap:isMobile?"14px":"24px",flexDirection:isMobile?"column":"row",paddingBottom:"20px",borderBottom:"1px solid "+(isDark?"#2F352F":"#EFEDE7")}}>
            <div>
              <div style={{display:"inline-block",width:"28px",height:"3px",background:GOLD,borderRadius:"2px",marginBottom:"10px"}}/>
              <h2 style={{fontSize:isMobile?"22px":"28px",fontWeight:900,margin:"0 0 4px",letterSpacing:"-0.5px",color:isDark?"#F6F3EA":"#1A1A1A"}}>{isArtists?"Artist Analytics":isSingles?"Singles Analytics":"Albums Analytics"}</h2>
              <p style={{fontFamily:F,fontSize:"14px",color:isDark?"#8F968F":"#69716B",margin:0,lineHeight:1.6}}>Full Top 50 data across all platforms and months.</p>
            </div>
            <div style={{display:"flex",gap:"10px",flexDirection:"row",alignItems:"center",flexShrink:0,flexWrap:"wrap"}}>
              <select value={anMonth} onChange={e=>setAnMonth(e.target.value)} style={{flex:isMobile?"1":"none",minWidth:isMobile?"120px":"160px",padding:isMobile?"10px 12px":"8px 14px",border:"1.5px solid "+(isDark?"#2F352F":"#DEDAD2"),borderRadius:"10px",background:isDark?"#1A1E1A":"#FAFAF8",fontSize:isMobile?"13px":"12px",fontFamily:F,fontWeight:750,cursor:"pointer",outline:"none",color:isDark?"#F6F3EA":"#1A1A1A"}}>
                {MONTHS.map(m=><option key={m} value={m}>{m}</option>)}
              </select>
              <Tog sm/>
            </div>
          </div>

          {/* Climbers, Fallers, New Entries & Re-Entries — what moved this month */}
          <AnalyticsDeepSection label="Climbers & Drops" isMobile={isMobile}>
          <div className="anl-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",...sectionGap}}>
            <div style={card()}>
              <div style={{...secLbl("#2DB04A"), fontSize:"20px"}}><SecMark c="#2DB04A"/>Top {releaseLabel} Climbers — {anMonth}</div>
              {mvData.risers.map((s,i)=>{
                const certification = isArtists ? null : getCertificationForEntry(s, isSingles ? "single" : "album");
                return (
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",padding:isMobile?"8px 0":"6px 0",borderBottom:"1px solid #F0F0EC"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"10px",minWidth:0}}>
                    <EntryThumb item={s} name={isArtists?s.t:s.a} isArtist={isArtists} size={46} accent="#2DB04A" />
                    <div style={{minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
                        <button type="button" onClick={()=>openReleaseDetails(s,isArtists ? "artist" : (isSingles?"single":"album"))} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:TXT.cardTitle,fontWeight:800,lineHeight:1.15,cursor:"pointer",textAlign:"left"}}>{s.t}</button>
                        {certification&&<CertificationTag cert={certification} compact />}
                      </div>
                      {!isArtists && <div style={{fontSize:TXT.cardMeta,color:"#69716B",fontFamily:F,marginTop:"3px"}}>{s.a}</div>}
                    </div>
                  </div>
                  <div style={{textAlign:"right",fontFamily:F,whiteSpace:"nowrap",flexShrink:0}}>
                    <div style={{display:"inline-flex",alignItems:"center",gap:"4px",background:"rgba(45,176,74,0.10)",borderRadius:"6px",padding:"3px 8px",color:"#2DB04A",fontSize:"12px",fontWeight:900}}>▲ {s.from-s.to}</div>
                    <div style={{fontSize:TXT.micro,color:"#7B857D",marginTop:"3px"}}>#{s.from} → #{s.to}</div>
                  </div>
                </div>
                );
              })}
              {!mvData.risers.length&&<div style={{fontFamily:F,fontSize:isMobile?"12px":"11px",color:"#CCC",padding:"20px 0",textAlign:"center"}}>No movement data (debut month)</div>}
            </div>
            <div style={card()}>
              <div style={{...secLbl("#E53935"), fontSize:"20px"}}><SecMark c="#E53935"/>Biggest {releaseLabel} Drops — {anMonth}</div>
              {mvData.fallers.map((s,i)=>{
                const certification = isArtists ? null : getCertificationForEntry(s, isSingles ? "single" : "album");
                return (
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",padding:isMobile?"8px 0":"6px 0",borderBottom:"1px solid #F0F0EC"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"10px",minWidth:0}}>
                    <EntryThumb item={s} name={isArtists?s.t:s.a} isArtist={isArtists} size={46} accent="#E53935" />
                    <div style={{minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
                        <button type="button" onClick={()=>openReleaseDetails(s,isArtists ? "artist" : (isSingles?"single":"album"))} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:TXT.cardTitle,fontWeight:800,lineHeight:1.15,cursor:"pointer",textAlign:"left"}}>{s.t}</button>
                        {certification&&<CertificationTag cert={certification} compact />}
                      </div>
                      {!isArtists && <div style={{fontSize:TXT.cardMeta,color:"#69716B",fontFamily:F,marginTop:"3px"}}>{s.a}</div>}
                    </div>
                  </div>
                  <div style={{textAlign:"right",fontFamily:F,whiteSpace:"nowrap",flexShrink:0}}>
                    <div style={{display:"inline-flex",alignItems:"center",gap:"4px",background:"rgba(229,57,53,0.10)",borderRadius:"6px",padding:"3px 8px",color:"#E53935",fontSize:"12px",fontWeight:900}}>▼ {s.to-s.from}</div>
                    <div style={{fontSize:TXT.micro,color:"#7B857D",marginTop:"3px"}}>#{s.from} → #{s.to}</div>
                  </div>
                </div>
                );
              })}
              {!mvData.fallers.length&&<div style={{fontFamily:F,fontSize:isMobile?"12px":"11px",color:"#CCC",padding:"20px 0",textAlign:"center"}}>No drops (debut month)</div>}
            </div>
            <div style={card()}>
              <div style={{...secLbl("#2DB04A"), fontSize:"20px"}}><SecMark c="#2DB04A"/>New Entries — {anMonth}</div>
              {mvData.newEntries.slice(0,5).map((s,i)=>{
                const certification = isArtists ? null : getCertificationForEntry(s, isSingles ? "single" : "album");
                return (
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",padding:isMobile?"8px 0":"6px 0",borderBottom:"1px solid #F0F0EC"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"10px",minWidth:0}}>
                    <EntryThumb item={s} name={isArtists?s.title:s.artist} isArtist={isArtists} size={46} accent="#2DB04A" />
                    <div style={{minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
                        <button type="button" onClick={()=>openReleaseDetails(s,isArtists ? "artist" : (isSingles?"single":"album"))} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:TXT.cardTitle,fontWeight:800,lineHeight:1.15,cursor:"pointer",textAlign:"left"}}>{s.title}</button>
                        {certification&&<CertificationTag cert={certification} compact />}
                      </div>
                      {!isArtists && <div style={{fontSize:TXT.cardMeta,color:"#69716B",fontFamily:F,marginTop:"3px"}}>{s.artist}</div>}
                    </div>
                  </div>
                  <div style={{textAlign:"right",fontFamily:F,whiteSpace:"nowrap",flexShrink:0}}>
                    <div style={{display:"inline-flex",alignItems:"center",gap:"4px",background:"rgba(45,176,74,0.10)",borderRadius:"6px",padding:"3px 8px",color:"#2DB04A",fontSize:"12px",fontWeight:900}}>NEW</div>
                    <div style={{fontSize:TXT.micro,color:"#7B857D",marginTop:"3px"}}>#{s.rank}</div>
                  </div>
                </div>
                );
              })}
              {!mvData.newEntries.length&&<div style={{fontFamily:F,fontSize:isMobile?"12px":"11px",color:"#CCC",padding:"20px 0",textAlign:"center"}}>No new entries (debut month)</div>}
            </div>
            <div style={card()}>
              <div style={{...secLbl("#1565C0"), fontSize:"20px"}}><SecMark c="#1565C0"/>Re-Entries — {anMonth}</div>
              {mvData.reEntries.slice(0,5).map((s,i)=>{
                const certification = isArtists ? null : getCertificationForEntry(s, isSingles ? "single" : "album");
                return (
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",padding:isMobile?"8px 0":"6px 0",borderBottom:"1px solid #F0F0EC"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"10px",minWidth:0}}>
                    <EntryThumb item={s} name={isArtists?s.title:s.artist} isArtist={isArtists} size={46} accent="#1565C0" />
                    <div style={{minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
                        <button type="button" onClick={()=>openReleaseDetails(s,isArtists ? "artist" : (isSingles?"single":"album"))} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:TXT.cardTitle,fontWeight:800,lineHeight:1.15,cursor:"pointer",textAlign:"left"}}>{s.title}</button>
                        {certification&&<CertificationTag cert={certification} compact />}
                      </div>
                      {!isArtists && <div style={{fontSize:TXT.cardMeta,color:"#69716B",fontFamily:F,marginTop:"3px"}}>{s.artist}</div>}
                    </div>
                  </div>
                  <div style={{textAlign:"right",fontFamily:F,whiteSpace:"nowrap",flexShrink:0}}>
                    <div style={{display:"inline-flex",alignItems:"center",gap:"4px",background:"rgba(21,101,192,0.10)",borderRadius:"6px",padding:"3px 8px",color:"#1565C0",fontSize:"12px",fontWeight:900}}>BACK</div>
                    <div style={{fontSize:TXT.micro,color:"#7B857D",marginTop:"3px"}}>#{s.rank}</div>
                  </div>
                </div>
                );
              })}
              {!mvData.reEntries.length&&<div style={{fontFamily:F,fontSize:isMobile?"12px":"11px",color:"#CCC",padding:"20px 0",textAlign:"center"}}>No re-entries (debut month)</div>}
            </div>
          </div>
          </AnalyticsDeepSection>

          {/* Cross-platform overlap */}
          <AnalyticsDeepSection label="Cross-Platform Reach" isMobile={isMobile}>
          <div className="anl-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",...sectionGap}}>
          <div style={card()}>
            <div style={{...secLbl(), fontSize:"20px"}}><SecMark/>Cross-Platform Reach — {anMonth}</div>
            <p style={{fontFamily:F,fontSize:"12px",color:"#59645D",margin:"-4px 0 12px",lineHeight:1.45}}>{releaseLabel} charting on most platforms simultaneously.</p>
            {crossPlatformRows.slice(0,8).map((s,i)=>{
              const certification = isArtists ? null : getCertificationForEntry(s, isSingles ? "single" : "album");
              return (
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",padding:"7px 0",borderBottom:"1px solid #F0F0EC"}}>
                <div style={{display:"flex",alignItems:"center",gap:"10px",flex:1,minWidth:0}}>
                  <EntryThumb item={s} name={isArtists?s.t:s.a} isArtist={isArtists} size={44} accent="#00897B" />
                  <div style={{minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
                      <button type="button" onClick={()=>openReleaseDetails(s,isArtists ? "artist" : (isSingles?"single":"album"))} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:TXT.cardTitle,fontWeight:800,cursor:"pointer",textAlign:"left"}}>{s.t}</button>
                      {certification&&<CertificationTag cert={certification} compact />}
                    </div>
                    {!isArtists && <div style={{fontSize:TXT.cardMeta,color:"#59645D",fontFamily:F,marginTop:"2px"}}>{s.a}</div>}
                  </div>
                </div>
                <div style={{display:"flex",gap:"3px",alignItems:"center",flexShrink:0}}>
                  {s.plats.map(pl=><div key={pl} style={{width:"7px",height:"7px",borderRadius:"50%",background:PC[pl]||"#888"}} title={PLAT_LABEL[pl]}/>)}
                  <span style={{fontFamily:F,fontSize:TXT.cardMeta,fontWeight:700,color:GOLD,marginLeft:"6px"}}>{s.count}/{currentPlatformKeys.length}</span>
                </div>
              </div>
              );
            })}
          </div>
          <div style={card()}>
            <div style={{...secLbl("#00897B"), fontSize:"20px"}}><SecMark c="#00897B"/>Cross-Platform Hits — {anMonth}</div>
            <p style={{fontFamily:F,fontSize:"12px",color:"#59645D",margin:"-4px 0 12px",lineHeight:1.45}}>{releaseLabel} charting on all {tp} tracked platforms at once.</p>
            {xHitsRows.slice(0,8).map((s,i)=>{
              const certification = isArtists ? null : getCertificationForEntry(s, isSingles ? "single" : "album");
              return (
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",padding:"7px 0",borderBottom:"1px solid #F0F0EC"}}>
                <div style={{display:"flex",alignItems:"center",gap:"10px",flex:1,minWidth:0}}>
                  <EntryThumb item={s} name={isArtists?s.t:s.a} isArtist={isArtists} size={44} accent="#00897B" />
                  <div style={{minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
                      <button type="button" onClick={()=>openReleaseDetails(s,isArtists ? "artist" : (isSingles?"single":"album"))} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:TXT.cardTitle,fontWeight:800,cursor:"pointer",textAlign:"left"}}>{s.t}</button>
                      {certification&&<CertificationTag cert={certification} compact />}
                    </div>
                    {!isArtists && <div style={{fontSize:TXT.cardMeta,color:"#59645D",fontFamily:F,marginTop:"2px"}}>{s.a}</div>}
                  </div>
                </div>
                <div style={{display:"inline-flex",alignItems:"center",gap:"4px",background:"rgba(0,137,123,0.10)",borderRadius:"6px",padding:"3px 8px",color:"#00897B",fontSize:"12px",fontWeight:900,flexShrink:0}}>{s.count}/{currentPlatformKeys.length}</div>
              </div>
              );
            })}
            {!xHitsRows.length&&<div style={{fontFamily:F,fontSize:isMobile?"12px":"11px",color:"#CCC",padding:"20px 0",textAlign:"center"}}>No full cross-platform hits this month</div>}
          </div>
          </div>
          </AnalyticsDeepSection>

          {/* Platform totals */}
          {platTotalsData.length>0&&(
            <AnalyticsDeepSection label="Platform Totals" isMobile={isMobile}>
            <div style={{...card(),...sectionGap}}>
              <div style={{...secLbl(), fontSize:"20px"}}><SecMark/>Combined Top 50 Entries Contributed Per Platform — {anMonth}</div>
              <div style={{display:"flex",justifyContent:"flex-end",margin:"-4px 0 12px"}}><ViewToggle id="platformTotals" /></div>
              {viewMode("platformTotals")==="table" ? (
                <div style={{display:"grid",gap:"8px"}}>
                  {platTotalsData.map((entry)=>(
                    <div key={entry.platform} style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 70px",gap:"10px",alignItems:"center",padding:"9px 0",borderBottom:"1px solid "+(isDark?"#2F352F":"#F0F0EC")}}>
                      <div style={{display:"flex",alignItems:"center",gap:"8px",minWidth:0}}><span style={{width:"10px",height:"10px",borderRadius:"3px",background:entry.color,flexShrink:0}}/><span style={{fontFamily:F,fontSize:TXT.cardTitle,fontWeight:850,color:isDark?"#F6F3EA":"#1A1A1A",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{entry.platform}</span></div>
                      <span style={{fontFamily:F,fontSize:TXT.cardTitle,fontWeight:900,color:GOLD,textAlign:"right"}}>{entry.entries}</span>
                    </div>
                  ))}
                </div>
              ) : (
              <ResponsiveContainer width="100%" height={isMobile?230:200}>
                <BarChart data={platTotalsData} margin={{top:12,right:isMobile?16:20,left:isMobile?0:8,bottom:isMobile?6:0}}>
                  <CartesianGrid stroke={gridStroke} vertical={false}/>
                  <XAxis dataKey="platform" tick={isMobile?false:axisTick(10)} tickLine={false} axisLine={false}/>
                  <YAxis domain={[dataMin => Math.max(0, Math.floor(dataMin * 0.9)), dataMax => Math.ceil(dataMax * 1.05)]} allowDecimals={false} tick={axisTick(isMobile?10.5:10)} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} cursor={{fill:barCursorFill}} formatter={v=>[v,"Combined entries"]}/>
                  <Bar dataKey="entries" radius={[4,4,0,0]} maxBarSize={44}>{platTotalsData.map((e,i)=><Cell key={i} fill={e.color}/>)}</Bar>
                </BarChart>
              </ResponsiveContainer>
              )}
              {isMobile&&<div style={{display:"flex",justifyContent:"center",gap:"8px 12px",flexWrap:"wrap",marginTop:"10px"}}>{platTotalsData.map((entry)=><div key={entry.platform} style={{display:"inline-flex",alignItems:"center",gap:"5px",fontFamily:F,fontSize:"12px",fontWeight:750,color:"#59645D"}}><span style={{width:"9px",height:"9px",borderRadius:"3px",background:entry.color,flexShrink:0}}/>{entry.platform}</div>)}</div>}
            </div>
            </AnalyticsDeepSection>
          )}

          {/* Country analytics */}
          <AnalyticsDeepSection label="Country Stats" isMobile={isMobile}>
          <div style={{...card(),...sectionGap}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",marginBottom:"14px",flexWrap:"wrap"}}>
              <div style={{...secLbl(),marginBottom:0,fontSize:"20px"}}><SecMark/>Top 5 Countries — {anMonth}</div>
              <ViewToggle id="topCountries" />
            </div>
            {viewMode("topCountries")==="table" ? (
              <div style={{display:"grid",gap:"8px"}}>
                {topCountryData.map((country)=>(
                  <div key={country.code} style={{display:"grid",gridTemplateColumns:"54px minmax(0,1fr) 72px",gap:"10px",alignItems:"center",padding:"9px 0",borderBottom:"1px solid "+(isDark?"#2F352F":"#F0F0EC")}}>
                    <span style={{fontFamily:F,fontSize:TXT.cardMeta,fontWeight:950,color:country.color}}>{country.code}</span>
                    <span style={{fontFamily:F,fontSize:TXT.cardTitle,fontWeight:850,color:isDark?"#F6F3EA":"#1A1A1A",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{country.country}</span>
                    <span style={{fontFamily:F,fontSize:TXT.cardTitle,fontWeight:900,color:GOLD,textAlign:"right"}}>{country.entries}</span>
                  </div>
                ))}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topCountryData} layout="vertical" margin={{left:8,right:16,top:0,bottom:0}}>
                  <CartesianGrid stroke={gridStroke} horizontal={false}/>
                  <XAxis type="number" allowDecimals={false} tick={axisTick(10)} axisLine={false} tickLine={false}/>
                  <YAxis type="category" dataKey="code" width={38} tick={axisTick(11,{fontWeight:850})} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} cursor={{fill:barCursorFill}} formatter={(v,n)=>[v,n==="entries"?"Entries":"Points"]}/>
                  <Bar dataKey="entries" radius={[0,4,4,0]} maxBarSize={36}>{topCountryData.map((entry)=><Cell key={entry.code} fill={entry.color}/>)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          </AnalyticsDeepSection>

          {/* Platform exclusives */}
          <AnalyticsDeepSection label="Platform Exclusives" isMobile={isMobile}>
          <div style={{...card(),...sectionGap}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",marginBottom:"14px",flexWrap:"wrap"}}>
              <div style={{...secLbl(),marginBottom:0,fontSize:"20px"}}><SecMark/>Platform-Unique Entries — {anMonth}</div>
              <ViewToggle id="uniquePlatforms" />
            </div>
            {viewMode("uniquePlatforms")==="table" ? (
              <div className="anl-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                {uniquePlatformData.map((platform)=>(
                  <div key={platform.platform} style={{padding:"12px",border:"1px solid "+(isDark?"#2F352F":"#EFEDE7"),borderRadius:"12px",background:isDark?"#0F120F":"#FAFAF8"}}>
                    <div style={{fontFamily:F,fontSize:"12px",fontWeight:900,letterSpacing:"1px",textTransform:"uppercase",color:platform.color,marginBottom:"8px"}}>{platform.label} · {platform.count}</div>
                    {platform.entries.slice(0,4).map((entry)=>(
                      <div key={`${entry.title}-${entry.artist}`} style={{display:"flex",alignItems:"center",gap:"9px",padding:"6px 0",borderBottom:"1px solid "+(isDark?"#2F352F":"#F0F0EC")}}>
                        <EntryThumb item={entry} name={isArtists?entry.title:entry.artist} isArtist={isArtists} size={40} accent={platform.color} />
                        <div style={{minWidth:0}}>
                          <button type="button" onClick={()=>openReleaseDetails(entry,isArtists?"artist":(isSingles?"single":"album"))} style={{border:0,background:"transparent",padding:0,textAlign:"left",fontFamily:SF,fontSize:TXT.cardTitle,fontWeight:850,color:isDark?"#F6F3EA":"#050505",cursor:"pointer"}}>{entry.title}</button>
                          <div style={{fontFamily:F,fontSize:TXT.cardMeta,color:isDark?"#AEB6AE":"#69716B"}}>{isArtists ? `#${entry.rank}` : `#${entry.rank} · ${entry.artist}`}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={uniquePlatformData} margin={{top:10,right:18,left:0,bottom:0}}>
                  <CartesianGrid stroke={gridStroke} vertical={false}/>
                  <XAxis dataKey="label" tick={isMobile?false:axisTick(10)} tickLine={false} axisLine={false}/>
                  <YAxis allowDecimals={false} tick={axisTick(10)} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} cursor={{fill:barCursorFill}} formatter={v=>[v,"Unique entries"]}/>
                  <Bar dataKey="count" radius={[4,4,0,0]} maxBarSize={44}>{uniquePlatformData.map((entry)=><Cell key={entry.platform} fill={entry.color}/>)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          </AnalyticsDeepSection>

          {/* Records & Milestones — all-time achievements for the selected chart type,
              arranged like the Hall of Fame section below: one tinted card holding a
              grid of small thumbnail rows instead of large art-bleed tiles. */}
          <AnalyticsDeepSection label="Records & Milestones" isMobile={isMobile}>
          <style>{`
            .ngoma-coverage-row { transition: background 0.16s ease; border-radius: 8px; }
            .ngoma-coverage-row:hover { background: ${isDark ? "rgba(184,134,11,0.08)" : "rgba(184,134,11,0.05)"}; }
          `}</style>
          <div style={{...card(),...sectionGap}}>
            <h3 style={{fontFamily:F,fontSize:"13px",fontWeight:700,letterSpacing:"2px",textTransform:"uppercase",color:GOLD,margin:"0 0 6px"}}>{isMobile?"Records & Milestones":"Records & Milestones — All Time"}</h3>
            <p style={{fontFamily:F,fontSize:"13px",color:isDark?"#8F968F":"#69716B",margin:"0 0 18px",lineHeight:1.5}}>{chartTypeLabel} achievements calculated solely from published public Top 50 charts across all tracked months.</p>
            <div className="anl-grid-3" style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:"10px"}}>
              {currentRecords.map((r,i)=>{
                const expanded = r.isCoverage && openRecord === i;
                const pool = r.isCoverage ? fullCoverageClub : r.isTotalCount ? currentRecordsPool : [];
                return (
                  <RecordRow
                    key={`${r.displayLabel}-${r.value}`}
                    r={r}
                    expanded={expanded}
                    onToggle={()=>{if(r.isCoverage)setOpenRecord(expanded?null:i);}}
                    pool={pool}
                    ctx={ctx}
                    theme={recordsTheme}
                  />
                );
              })}
            </div>
          </div>
          </AnalyticsDeepSection>

          {hofItems.length > 0 && (
          <AnalyticsDeepSection label="Hall of Fame" isMobile={isMobile}>
          <div style={card({marginBottom:isMobile?"20px":"26px"})}>
            <h3 style={{fontFamily:F,fontSize:"13px",fontWeight:700,letterSpacing:"2px",textTransform:"uppercase",color:GOLD,margin:"0 0 18px"}}>{isMobile?"Monthly #1s":"Hall of Fame — Monthly #1s"}</h3>
            {(()=>{
              const HofSection = ({items, label}) => items.length === 0 ? null : (
                <div style={{marginBottom:"20px"}}>
                  <div style={{fontFamily:F,fontSize:"11px",fontWeight:900,letterSpacing:"1.8px",textTransform:"uppercase",color:GOLD,marginBottom:"12px",paddingBottom:"6px",borderBottom:"1px solid "+GOLD+"33"}}>{label}</div>
                  <div className="anl-grid-3" style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:"10px"}}>
                    {items.map((e,i)=>(
                      <div key={`${e.type}-${e.month}-${i}`} style={{display:"flex",gap:"11px",alignItems:"center",padding:"12px",background:isDark?"#151915":"#FAFAF8",borderRadius:"8px",border:"1px solid "+(isDark?"#242923":"#EFEDE7"),minWidth:0}}>
                        <EntryThumb item={e} name={isArtists?e.title:e.artist} isArtist={isArtists} size={isMobile?62:72} accent={GOLD} />
                        <div style={{minWidth:0}}>
                          <div style={{fontFamily:F,fontSize:"11px",letterSpacing:"1.5px",textTransform:"uppercase",color:GOLD,marginBottom:"4px"}}>{e.hofMonths.length > 1 ? `${e.hofMonths.length} months at #1` : e.month}</div>
                          <button type="button" onClick={()=>openReleaseDetails(e,e.type)} style={{display:"block",border:0,background:"transparent",padding:0,fontFamily:SF,fontWeight:800,fontSize:"15px",marginBottom:"2px",lineHeight:1.2,cursor:"pointer",textAlign:"left",color:isDark?"#F6F3EA":"inherit",maxWidth:"100%",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{e.title}</button>
                          <div style={{fontFamily:F,fontSize:"13px",color:isDark?"#AEB6AE":"#69716B",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{isArtists?"Artist #1":e.artist}</div>
                          {e.hofMonths.length > 1 && (
                            <div title={e.hofMonths.join(", ")} style={{fontFamily:F,fontSize:"11px",color:isDark?"#8F968F":"#7B857D",marginTop:"3px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                              {e.hofMonths.join(", ")}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
              return <HofSection items={hofItems} label={hofLabel} />;
            })()}
          </div>
          </AnalyticsDeepSection>
          )}

          {/* Head-to-head deep dive — an interactive tool, so it closes out the page */}
          <AnalyticsDeepSection label="Head-to-Head" isMobile={isMobile}>
          <div style={{...card(),padding:isMobile?"16px":"18px",...sectionGap,background:isDark?"#0F120F":"linear-gradient(135deg,#FAFAF8,#FFFFFF)",borderColor:isDark?"#2F352F":"#EFEDE7"}}>
            <div style={{...secLbl(), fontSize:"20px"}}><SecMark/>{isArtists ? "Artist" : (isSingles?"Song":"Album")} Head-to-Head</div>
            <p style={{fontFamily:F,fontSize:"13px",color:isDark?"#F6F3EA":"#69716B",margin:"-8px 0 14px",lineHeight:1.45}}>Compare two {isArtists ? "artists" : (isSingles?"songs":"albums")} across points, rank, platforms, and chart history.</p>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"minmax(0,1fr) auto minmax(0,1fr)",gap:isMobile?"10px":"12px",alignItems:"center",marginBottom:isMobile?"14px":"14px"}}>
              <div style={{minWidth:0}}>
                {isMobile&&<div style={{fontFamily:F,fontSize:"9px",fontWeight:900,letterSpacing:"1.2px",textTransform:"uppercase",color:GOLD,marginBottom:"6px"}}>{isArtists ? "Artist" : (isSingles?"Song":"Album")} One</div>}
                <select value={cmpS1} onChange={e=>setCmpS1(e.target.value)} title={sp1?(isArtists?sp1.title:`${sp1.title} — ${sp1.artist}`):""} style={{width:"100%",minWidth:0,padding:isMobile?"11px 12px":"8px 10px",border:"1.5px solid "+GOLD+"55",borderRadius:"8px",background:"#FFF",fontSize:isMobile?"12px":"11px",fontFamily:F,fontWeight:700,cursor:"pointer",outline:"none",color:"#1F241F"}}>
                  {allTitles.map(t=><option key={t.key} value={t.key}>{t.title} — {t.artist}</option>)}
                </select>
                {isMobile&&sp1&&<div style={{marginTop:"7px",padding:"8px 10px",borderRadius:"9px",background:GOLD+"0B",fontFamily:F,lineHeight:1.35,color:"#1F241F",overflowWrap:"anywhere"}}><strong style={{display:"block",fontSize:"12px"}}>{sp1.title}</strong>{!isArtists && <span style={{display:"block",fontSize:"11px",color:"#59645D",marginTop:"2px"}}>{sp1.artist}</span>}</div>}
              </div>
              <span style={{fontFamily:F,fontSize:"11px",color:isDark?"#5A625A":"#8A928B",fontWeight:900,textAlign:"center",letterSpacing:"1px",textTransform:"uppercase",background:isDark?"#1A1E1A":"#F0EDE6",padding:"5px 12px",borderRadius:"999px",whiteSpace:"nowrap",alignSelf:"center"}}>vs</span>
              <div style={{minWidth:0}}>
                {isMobile&&<div style={{fontFamily:F,fontSize:"9px",fontWeight:900,letterSpacing:"1.2px",textTransform:"uppercase",color:"#1565C0",marginBottom:"6px"}}>{isArtists ? "Artist" : (isSingles?"Song":"Album")} Two</div>}
                <select value={cmpS2} onChange={e=>setCmpS2(e.target.value)} title={sp2?(isArtists?sp2.title:`${sp2.title} — ${sp2.artist}`):""} style={{width:"100%",minWidth:0,padding:isMobile?"11px 12px":"8px 10px",border:"1.5px solid #1565C055",borderRadius:"8px",background:"#FFF",fontSize:isMobile?"12px":"11px",fontFamily:F,fontWeight:700,cursor:"pointer",outline:"none",color:"#1F241F"}}>
                  {allTitles.map(t=><option key={t.key} value={t.key}>{t.title} — {t.artist}</option>)}
                </select>
                {isMobile&&sp2&&<div style={{marginTop:"7px",padding:"8px 10px",borderRadius:"9px",background:"#1565C00B",fontFamily:F,lineHeight:1.35,color:"#1F241F",overflowWrap:"anywhere"}}><strong style={{display:"block",fontSize:"12px"}}>{sp2.title}</strong>{!isArtists && <span style={{display:"block",fontSize:"11px",color:"#59645D",marginTop:"2px"}}>{sp2.artist}</span>}</div>}
              </div>
            </div>
            {sp1&&sp2&&(<>
              {/* Title cards */}
              <div className="anl-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:isMobile?"10px":"12px",marginBottom:isMobile?"12px":"14px"}}>
                {[{d:sp1,c:GOLD},{d:sp2,c:"#1565C0"}].map(({d,c},i)=>(
                  <div key={i} style={{padding:isMobile?"13px":"15px",background:isDark?(i===0?"rgba(184,134,11,0.16)":"rgba(21,101,192,0.20)"):c+"0D",borderRadius:"10px",border:isDark?"1px solid "+c+"55":"1px solid transparent",borderLeft:"3px solid "+c,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"flex-start",gap:"10px",minWidth:0}}>
                    <EntryThumb item={d} name={isArtists?d.title:d.artist} isArtist={isArtists} size={isMobile?54:64} accent={c} />
                    <div style={{minWidth:0,flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:"7px",flexWrap:"wrap",minWidth:0}}>
                      <button type="button" onClick={()=>openReleaseDetails(d,isArtists ? "artist" : (isSingles?"single":"album"))} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:"15px",fontWeight:800,lineHeight:1.2,whiteSpace:isMobile?"normal":"nowrap",overflow:isMobile?"visible":"hidden",textOverflow:isMobile?"clip":"ellipsis",overflowWrap:"anywhere",minWidth:0,cursor:"pointer",textAlign:"left",color:isDark?"#F6F3EA":"#1F241F"}}>{d.title}</button>
                      {isArtists ? null : getCertificationForEntry(d, isSingles ? "single" : "album")&&<CertificationTag cert={isArtists ? null : getCertificationForEntry(d, isSingles ? "single" : "album")} compact />}
                    </div>
                    {!isArtists && <button type="button" onClick={(event)=>{event.stopPropagation();openArtistDetails(d.artist);}} style={{display:"block",maxWidth:"100%",fontFamily:F,fontSize:"12px",color:isDark?"#F6F3EA":"#59645D",marginTop:"3px",padding:0,border:0,background:"transparent",fontWeight:700,whiteSpace:isMobile?"normal":"nowrap",overflow:isMobile?"visible":"hidden",textOverflow:isMobile?"clip":"ellipsis",overflowWrap:"anywhere",cursor:"pointer",textAlign:"left"}}>{d.artist}</button>}
                    </div>
                    </div>
                    {isMobile&&<button type="button" onClick={()=>openReleaseDetails(d,isArtists ? "artist" : (isSingles?"single":"album"))} style={{marginTop:"9px",border:"1px solid "+c+"55",borderRadius:"999px",background:isDark?"rgba(255,255,255,0.04)":"#FFF",color:isDark&&i===1?"#72A7E8":c,fontFamily:F,fontSize:"11px",fontWeight:900,letterSpacing:"1px",textTransform:"uppercase",padding:"7px 10px",cursor:"pointer"}}>View Details</button>}
                    <div style={{display:"flex",gap:isMobile?"12px":"16px",marginTop:isMobile?"10px":"12px",flexWrap:"wrap"}}>
                      <div><div style={{fontFamily:F,fontSize:isMobile?"18px":"20px",fontWeight:800,color:isDark&&i===1?"#72A7E8":c}}>{d.totalPts.toLocaleString()}</div><div style={{fontFamily:F,fontSize:"11px",letterSpacing:"1px",textTransform:"uppercase",color:isDark?"#F6F3EA":"#69716B",fontWeight:700}}>Total Pts</div></div>
                      <div><div style={{fontFamily:F,fontSize:isMobile?"18px":"20px",fontWeight:800,color:isDark&&i===1?"#72A7E8":c}}>#{d.peak}</div><div style={{fontFamily:F,fontSize:"11px",letterSpacing:"1px",textTransform:"uppercase",color:isDark?"#F6F3EA":"#69716B",fontWeight:700}}>Peak</div></div>
                    </div>
                  </div>
                ))}
              </div>
              <AnalyticsDeepSection label="Detailed Comparison" isMobile={isMobile}>
              {/* Metric comparison table */}
              <div style={{width:"100%",maxWidth:isMobile?"360px":"none",margin:"0 auto 16px",border:"1px solid "+(isDark?"#2F352F":"#E4E1D8"),borderRadius:"12px",overflow:"hidden",background:isDark?"#0F120F":"#FFF",boxShadow:isDark?"none":"0 8px 24px rgba(31,36,31,0.05)"}}>
                <div style={{display:"grid",gridTemplateColumns:isMobile?"minmax(76px,1fr) minmax(100px,0.9fr) minmax(76px,1fr)":"minmax(130px,1fr) minmax(150px,0.8fr) minmax(130px,1fr)",gap:"8px",alignItems:"center",padding:isMobile?"10px 9px":"12px 16px",background:"#1F241F",color:"#FFF"}}>
                  <div style={{fontFamily:F,fontSize:"13px",fontWeight:850,textAlign:"center",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",color:"#E4BE55"}}>{sp1.title}</div>
                  <div style={{fontFamily:F,fontSize:"11px",fontWeight:900,letterSpacing:"1.2px",textAlign:"center",textTransform:"uppercase",color:"#C9CEC9"}}>Metric</div>
                  <div style={{fontFamily:F,fontSize:"13px",fontWeight:850,textAlign:"center",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",color:"#72A7E8"}}>{sp2.title}</div>
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
                      <div key={i} style={{display:"grid",gridTemplateColumns:isMobile?"minmax(76px,1fr) minmax(100px,0.9fr) minmax(76px,1fr)":"minmax(130px,1fr) minmax(150px,0.8fr) minmax(130px,1fr)",alignItems:"stretch",background:isDark?(i%2?"#121612":"#0F120F"):(i%2?"#FBFAF7":"#FFF"),borderBottom:i===rows.length-1?"none":"1px solid "+(isDark?"#2F352F":"#EEEAE1"),gap:0}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center",padding:isMobile?"9px 6px":"11px 12px",fontFamily:F,fontSize:"15px",fontWeight:aWins?900:800,color:GOLD,background:"transparent"}}>{r.fmt(r.a)}</div>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center",padding:isMobile?"9px 5px":"11px 10px",borderLeft:"1px solid "+(isDark?"#2F352F":"#EEEAE1"),borderRight:"1px solid "+(isDark?"#2F352F":"#EEEAE1"),fontFamily:F,fontSize:"11px",letterSpacing:"0.8px",textTransform:"uppercase",color:isDark?"#F6F3EA":"#59645D",fontWeight:850,lineHeight:1.25}}>{r.label}</div>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center",padding:isMobile?"9px 6px":"11px 12px",fontFamily:F,fontSize:"15px",fontWeight:bWins?900:800,color:isDark?"#72A7E8":"#1565C0",background:"transparent"}}>{r.fmt(r.b)}</div>
                      </div>
                    );
                  });
                })()}
              </div>
              {/* Rank trajectory chart */}
              <div style={{marginTop:isMobile?"14px":"0"}}>
                <div style={chartPanel}>
                  <div style={{fontFamily:F,fontSize:isMobile?"10px":"9.5px",fontWeight:800,letterSpacing:"1.4px",textTransform:"uppercase",textAlign:isMobile?"center":"left",color:isDark?"#D7DBD7":"#59645D",marginBottom:"8px"}}>Rank Trajectory (lower = better)</div>
                  <div style={{width:"100%",maxWidth:isMobile?"340px":"none",margin:"0 auto"}}>
                    <ResponsiveContainer width="100%" height={isMobile?190:180}>
                      <LineChart data={songRankData} margin={{top:14,right:isMobile?20:14,left:isMobile?8:4,bottom:4}}>
                        <CartesianGrid stroke={gridStroke} vertical={false}/>
                        <XAxis dataKey="month" tick={axisTick(isMobile?11:10.5)} tickLine={false} axisLine={false}/>
                        <YAxis width={isMobile?42:40} reversed domain={[1,"dataMax"]} tick={axisTick(isMobile?10.5:10)} tickFormatter={v=>"#"+v} axisLine={false} tickLine={false}/>
                        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} cursor={{stroke:gridStroke}} formatter={(v,n)=>["#"+v,n==="A"?sp1.title:sp2.title]}/>
                        <Line dataKey="A" stroke={GOLD} strokeWidth={2} dot={{r:4,fill:GOLD,stroke:isDark?"#0F120F":"#FFFFFF",strokeWidth:2}} activeDot={{r:6}} connectNulls/>
                        <Line dataKey="B" stroke="#1565C0" strokeWidth={2} dot={{r:4,fill:"#1565C0",stroke:isDark?"#0F120F":"#FFFFFF",strokeWidth:2}} activeDot={{r:6}} connectNulls/>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
              {/* Platform-by-platform peak ranks */}
              <div style={{marginTop:isMobile?"14px":"16px"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"10px",gap:"10px",flexWrap:"wrap"}}>
                  <div style={{fontFamily:F,fontSize:isMobile?"10px":"9.5px",fontWeight:800,letterSpacing:"1.4px",textTransform:"uppercase",color:"#59645D"}}>Peak Rank by Platform</div>
                  <div style={{display:"flex",gap:"6px"}}>
                    {["table","graph"].map(v=>(
                      <button key={v} type="button" onClick={()=>setPlatCompareView(v)} style={{padding:"5px 12px",borderRadius:"999px",border:"1.5px solid "+(platCompareView===v?(isDark?"#363C33":"#1A1A1A"):(isDark?"#2F352F":"#DEDAD2")),background:platCompareView===v?(isDark?"#363C33":"#1A1A1A"):"transparent",color:platCompareView===v?"#FFF":isDark?"#AEB6AE":"#59645D",fontFamily:F,fontSize:"10px",fontWeight:800,cursor:"pointer",textTransform:"uppercase",letterSpacing:"0.8px"}}>
                        {v==="table"?"Table":"Chart"}
                      </button>
                    ))}
                  </div>
                </div>
                {platCompareView==="table" ? (
                <div style={{border:"1px solid "+(isDark?"#2F352F":"#E4E1D8"),borderRadius:"12px",overflow:"hidden",background:isDark?"#0F120F":"#FFF"}}>
                  <div style={{display:"grid",gridTemplateColumns:isMobile?"minmax(76px,1fr) minmax(100px,0.9fr) minmax(76px,1fr)":"minmax(130px,1fr) minmax(150px,0.8fr) minmax(130px,1fr)",gap:"8px",padding:isMobile?"10px 9px":"12px 16px",background:"#1F241F",fontFamily:F,fontSize:"11px",fontWeight:850,letterSpacing:"1px",textTransform:"uppercase",color:"#C9CEC9"}}>
                    <div style={{textAlign:"center",color:"#E4BE55",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{sp1.title.length>16?sp1.title.slice(0,14)+"…":sp1.title}</div>
                    <div style={{textAlign:"center"}}>Platform</div>
                    <div style={{textAlign:"center",color:"#72A7E8",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{sp2.title.length>16?sp2.title.slice(0,14)+"…":sp2.title}</div>
                  </div>
                  {PLATS_FOR.map((pl,i)=>{
                    const a=sp1.platforms[pl],b=sp2.platforms[pl];
                    const lbl=PLAT_LABEL[pl]||pl;
                    return(
                      <div key={pl} style={{display:"grid",gridTemplateColumns:isMobile?"minmax(76px,1fr) minmax(100px,0.9fr) minmax(76px,1fr)":"minmax(130px,1fr) minmax(150px,0.8fr) minmax(130px,1fr)",alignItems:"stretch",gap:0,background:isDark?(i%2?"#121612":"#0F120F"):(i%2?"#FBFAF7":"#FFF"),borderBottom:i===PLATS_FOR.length-1?"none":"1px solid "+(isDark?"#2F352F":"#EEEAE1")}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:isMobile?"9px 6px":"11px 12px",fontFamily:F,fontSize:"15px",fontWeight:900,color:a?GOLD:(isDark?"#68716B":"#B8BDB8")}}>{a?"#"+a:"—"}</div>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center",padding:isMobile?"9px 5px":"11px 10px",borderLeft:"1px solid "+(isDark?"#2F352F":"#EEEAE1"),borderRight:"1px solid "+(isDark?"#2F352F":"#EEEAE1"),fontFamily:F,fontSize:"11px",fontWeight:850,color:PC[pl]||GOLD,letterSpacing:"0.6px",textTransform:"uppercase",lineHeight:1.25}}>{lbl}</div>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:isMobile?"9px 6px":"11px 12px",fontFamily:F,fontSize:"15px",fontWeight:900,color:b?(isDark?"#72A7E8":"#1565C0"):(isDark?"#68716B":"#B8BDB8")}}>{b?"#"+b:"—"}</div>
                      </div>
                    );
                  })}
                </div>
                ) : (
                <div style={{border:"1px solid "+(isDark?"#2F352F":"#E4E1D8"),borderRadius:"12px",overflow:"hidden",background:isDark?"#0F120F":"#FFF",padding:"12px 4px 4px"}}>
                <ResponsiveContainer width="100%" height={isMobile?220:200}>
                  <BarChart
                    data={PLATS_FOR.map(pl=>{
                      const a=sp1.platforms[pl],b=sp2.platforms[pl];
                      return {platform:PLAT_LABEL[pl]||pl,color:PC[pl]||"#888",aVal:a?(51-a):null,bVal:b?(51-b):null,aRank:a,bRank:b};
                    })}
                    margin={{top:10,right:isMobile?12:16,left:isMobile?0:4,bottom:isMobile?28:20}}
                  >
                    <CartesianGrid stroke={gridStroke} vertical={false}/>
                    <XAxis dataKey="platform" tick={axisTick(isMobile?9:9.5)} tickLine={false} axisLine={false} angle={isMobile?-30:0} textAnchor={isMobile?"end":"middle"}/>
                    <YAxis domain={[0,50]} tick={axisTick(10)} tickFormatter={v=>v===0?"":v===50?"#1":"#"+(51-v)} axisLine={false} tickLine={false} ticks={[0,10,20,30,40,50]}/>
                    <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} formatter={(v,n,p)=>["#"+(51-v),n==="aVal"?sp1.title:sp2.title]} cursor={{fill:barCursorFill}}/>
                    <Bar dataKey="aVal" fill={GOLD} radius={[4,4,0,0]} maxBarSize={32} name="aVal"/>
                    <Bar dataKey="bVal" fill="#1565C0" radius={[4,4,0,0]} maxBarSize={32} name="bVal"/>
                  </BarChart>
                </ResponsiveContainer>
                </div>
                )}
              </div>
              </AnalyticsDeepSection>
            </>)}
          </div>
          </AnalyticsDeepSection>
        </div>
  );
}
