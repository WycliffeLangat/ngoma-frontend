import { useState } from "react";
import EntryThumb, { resolveEntryImageUrl } from "../components/EntryThumb.jsx";
import { useRotatingArt } from "../hooks/useRotatingArt.js";

// A single Records & Milestones stat card — cover art bleeds through the
// background when the record pins to one release/artist, or rotates through
// the eligible pool for aggregate records like "Total Charted Songs".
function RecordCard({ r, expanded, onToggle, pool, ctx, theme }) {
  const {
    CertificationTag, F, GOLD, RecordIcon, SF,
    fullCoverageClub, getCertificationForEntry, isArtists, isMobile, isSingles,
    openArtistDetails, openReleaseDetails, releaseLabelLower,
  } = ctx;
  const { isDark, textPrimary, textMuted, cardBg, dividerColor, rowBorder, recordCard } = theme;

  const recordCertification = !isArtists && r.certificationEntry ? getCertificationForEntry(r.certificationEntry, isSingles ? "single" : "album") : null;
  const artEntryName = r.certificationEntry ? (r.certificationEntry.artist || r.certificationEntry.title) : "";
  const staticArtUrl = r.certificationEntry
    ? resolveEntryImageUrl(r.certificationEntry, { name: artEntryName, isArtist: Boolean(r.certificationEntry.is_artist_entry) })
    : "";
  const rotating = useRotatingArt(pool);
  const artUrl = staticArtUrl || rotating?.url || "";
  const hasArt = Boolean(artUrl);

  const valueNode = r.certificationEntry ? (
    <button
      type="button"
      onClick={(event) => { event.stopPropagation(); isArtists ? openArtistDetails(r.value) : openReleaseDetails(r.certificationEntry, isSingles ? "single" : "album"); }}
      style={{ display: "block", border: 0, background: "transparent", padding: 0, fontFamily: SF, fontSize: isMobile ? "20px" : "21px", fontWeight: 900, lineHeight: 1.12, marginBottom: recordCertification ? "7px" : "5px", cursor: "pointer", textAlign: "left", color: hasArt ? "#FFFFFF" : textPrimary, textShadow: hasArt ? "0 1px 8px rgba(0,0,0,0.55)" : "none" }}
    >{r.value}</button>
  ) : (
    <div style={{ fontFamily: SF, fontSize: isMobile ? "20px" : "21px", fontWeight: 900, lineHeight: 1.12, marginBottom: "5px", color: hasArt ? "#FFFFFF" : textPrimary, textShadow: hasArt ? "0 1px 8px rgba(0,0,0,0.55)" : "none" }}>{r.value}</div>
  );

  return (
    <div
      className="ngoma-record-card"
      onClick={onToggle}
      style={{
        ...recordCard({ padding: 0, borderRadius: "16px" }),
        position: "relative",
        overflow: "hidden",
        cursor: r.isCoverage ? "pointer" : "default",
        gridColumn: expanded ? "1 / -1" : "auto",
        minHeight: hasArt ? (isMobile ? "216px" : "248px") : "auto",
      }}
    >
      {hasArt ? (
        <>
          <img
            key={rotating?.entry ? (rotating.entry.key || rotating.name) : "static"}
            className="ngoma-record-art"
            src={artUrl}
            alt=""
            loading="lazy"
            decoding="async"
            onError={(event) => { event.currentTarget.style.display = "none"; }}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
          <div
            style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(0deg, rgba(6,7,6,0.94) 0%, rgba(6,7,6,0.82) 32%, rgba(6,7,6,0.38) 58%, rgba(6,7,6,0.08) 78%, rgba(6,7,6,0.28) 100%)",
            }}
          />
          <div style={{ position: "relative", zIndex: 1, padding: isMobile ? "19px" : "24px", display: "flex", flexDirection: "column", height: "100%", boxSizing: "border-box", justifyContent: "space-between" }}>
            <span style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: isMobile ? "30px" : "32px", height: isMobile ? "30px" : "32px", borderRadius: "10px",
              background: "rgba(6,7,6,0.55)", backdropFilter: "blur(6px)", flexShrink: 0, alignSelf: "flex-start",
            }}>
              <RecordIcon label={r.displayLabel} size={isMobile ? 17 : 18} />
            </span>

            <div>
              <div style={{ fontFamily: F, fontSize: isMobile ? "10px" : "10.5px", fontWeight: 850, letterSpacing: "2px", textTransform: "uppercase", color: GOLD, marginBottom: "9px", lineHeight: 1.35, textShadow: "0 1px 6px rgba(0,0,0,0.6)" }}>{r.displayLabel}</div>
              {valueNode}
              {recordCertification && <CertificationTag cert={recordCertification} compact style={{ marginBottom: "8px" }} />}
              <div style={{ fontFamily: F, fontSize: "13px", color: "rgba(255,255,255,0.82)", lineHeight: 1.45, display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", textShadow: "0 1px 6px rgba(0,0,0,0.55)" }}>
                <span>{r.displaySub}</span>
                {r.climbDelta && <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 7px", borderRadius: "999px", background: "rgba(45,176,74,0.35)", color: "#8CF0A6", fontSize: "10px", fontWeight: 900, letterSpacing: "0.4px" }}>+{r.climbDelta}</span>}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div style={{ position: "relative", zIndex: 1, padding: isMobile ? "19px" : "24px", boxSizing: "border-box" }}>
          <div style={{ position: "absolute", top: isMobile ? "8px" : "12px", right: isMobile ? "10px" : "14px" }}><RecordIcon label={r.displayLabel} size={isMobile ? 54 : 66} muted /></div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "13px", position: "relative", zIndex: 1 }}>
            <RecordIcon label={r.displayLabel} size={isMobile ? 28 : 30} />
          </div>
          <div style={{ fontFamily: F, fontSize: isMobile ? "10px" : "10.5px", fontWeight: 850, letterSpacing: "2px", textTransform: "uppercase", color: GOLD, marginBottom: "9px", position: "relative", zIndex: 1, lineHeight: 1.35 }}>{r.displayLabel}</div>
          {valueNode}
          <div style={{ fontFamily: F, fontSize: "13px", color: textMuted, lineHeight: 1.45, position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span>{r.displaySub}</span>
            {r.climbDelta && <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 7px", borderRadius: "999px", background: isDark ? "rgba(45,176,74,0.16)" : "#EAF8EF", color: isDark ? "#4FCB6F" : "#1E8E3E", fontSize: "10px", fontWeight: 900, letterSpacing: "0.4px" }}>+{r.climbDelta}</span>}
          </div>
        </div>
      )}

      {r.isCoverage && (
        <div className="ngoma-record-view-toggle" style={{ display: "flex", alignItems: "center", gap: "5px", fontFamily: F, fontSize: "10.5px", color: GOLD, fontWeight: 800, letterSpacing: "0.5px", padding: hasArt ? "0" : `0 ${isMobile ? "19px" : "24px"} ${isMobile ? "19px" : "24px"}`, margin: hasArt ? `0 ${isMobile ? "19px" : "24px"} ${isMobile ? "19px" : "24px"} ${isMobile ? "19px" : "24px"}` : "0", position: "relative", zIndex: 1 }}>
          <span>{expanded ? `Hide ${releaseLabelLower}` : `View ${releaseLabelLower}`}</span>
          <span style={{ fontSize: "11px", transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.22s ease", display: "inline-block" }}>▾</span>
        </div>
      )}

      {expanded && (
        <div style={{ position: "relative", zIndex: 1, margin: isMobile ? "0 19px 19px" : "0 24px 24px", paddingTop: "12px", borderTop: `1px solid ${dividerColor}`, background: cardBg, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))", columnGap: "22px" }}>
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

// A headline stat tile whose background bleeds cover art from whichever
// entries qualify for it (e.g. this month's new entries), cycling through
// them when more than one is eligible so no single release hogs the tile.
function AnalyticsStatBox({ label, value, sub, color, compact, pool, isMobile, isDark, F, card, driveText }) {
  const rotating = useRotatingArt(pool);
  const hasArt = Boolean(rotating?.url);
  const displayValue = driveText ? (rotating?.entry?.title || value) : value;
  const displaySub = driveText ? (rotating?.entry?.artist || sub) : sub;

  return (
    <div style={{ ...card({ padding: isMobile ? "14px" : "20px 22px" }), position: "relative", overflow: "hidden", borderTop: `3px solid ${color}` }}>
      {hasArt && (
        <>
          <img
            key={rotating.entry?.key || rotating.name}
            src={rotating.url}
            alt=""
            loading="lazy"
            decoding="async"
            onError={(event) => { event.currentTarget.style.display = "none"; }}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, rgba(6,7,6,0.90) 0%, rgba(6,7,6,0.74) 45%, rgba(6,7,6,0.36) 100%)" }} />
        </>
      )}
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: "11px", fontWeight: 900, letterSpacing: "1.2px", textTransform: "uppercase", color: hasArt ? "#FFFFFF" : color, marginBottom: "8px", fontFamily: F, textShadow: hasArt ? "0 1px 6px rgba(0,0,0,0.55)" : "none" }}>{label}</div>
        <div style={{ fontSize: compact ? (isMobile ? "14px" : "18px") : (isMobile ? "24px" : "32px"), fontWeight: 900, color: hasArt ? "#FFFFFF" : (isDark ? "#F6F3EA" : "#1A1A1A"), lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textShadow: hasArt ? "0 1px 8px rgba(0,0,0,0.6)" : "none" }}>{displayValue}</div>
        <div style={{ fontSize: "12px", color: hasArt ? "rgba(255,255,255,0.85)" : (isDark ? "#8F968F" : "#69716B"), fontFamily: F, lineHeight: 1.35, marginTop: "5px", textShadow: hasArt ? "0 1px 6px rgba(0,0,0,0.55)" : "none" }}>{displaySub}</div>
      </div>
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
    Line,
    LineChart,
    MEDALS,
    MONTHS,
    PAD,
    PC,
    PLATS_FOR,
    PLAT_LABEL,
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
    isDark,
    isMobile,
    isTablet,
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

  const anRows = analyticsRowsFor(anMonth);
  const anLeader = anRows.find(e => Number(e.rank) === 1) || anRows[0];
  const leaderPool = anRows.filter(e => Number(e.rank) === 1);
  const xHitsRows = crossPlatformRows.filter(e => e.count >= tp);
  const xHitsCount = xHitsRows.length;
  const [platCompareView, setPlatCompareView] = useState("table");

  // Records & Milestones theming — matches the standalone record cards' look
  const recordGridColumns = isMobile ? "1fr" : isTablet ? "repeat(2,1fr)" : "repeat(3,1fr)";
  const recordsCardBg = isDark ? "#141814" : "#FFFFFF";
  const recordsCardBorder = isDark ? "#242923" : "#EFEDE7";
  const recordsCardShadow = isDark ? "0 8px 24px rgba(0,0,0,0.32)" : "0 1px 3px rgba(0,0,0,0.02),0 8px 24px rgba(0,0,0,0.02)";
  const recordsTextPrimary = isDark ? "#F6F3EA" : "#1A1A1A";
  const recordsTextMuted = isDark ? "#8F968F" : "#59645D";
  const recordsDividerColor = isDark ? "#242923" : "#F0EEE8";
  const recordsRowBorder = isDark ? "#1E231E" : "#F2F0EA";
  const recordCard = (extra = {}) => card({
    background: recordsCardBg,
    border: `1px solid ${recordsCardBorder}`,
    boxShadow: recordsCardShadow,
    ...extra,
  });
  const recordsTheme = {
    isDark, isMobile,
    textPrimary: recordsTextPrimary, textMuted: recordsTextMuted,
    cardBg: recordsCardBg, cardBorder: recordsCardBorder, cardShadow: recordsCardShadow,
    dividerColor: recordsDividerColor, rowBorder: recordsRowBorder, recordCard,
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

          {/* Overview stats — the headline snapshot, always visible */}
          <div className="ngoma-detail-stat-grid" style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:isMobile?"12px":"14px",...sectionGap}}>
            {[
              {l:"New Entries",v:mvData.new,c:"#2DB04A",s:"not in prev month",pool:mvData.newEntries},
              {l:"Re-Entries",v:mvData.ret,c:"#1565C0",s:"returned to chart",pool:mvData.reEntries},
              {l:"Cross-Platform Hits",v:xHitsCount,c:"#00897B",s:`on all ${tp} platforms`,pool:xHitsRows},
              {l:"Chart Leader",v:anLeader?.title||"—",s:anLeader?.artist||"",compact:true,c:GOLD,pool:leaderPool,driveText:true},
            ].map((s,i)=>(
              <AnalyticsStatBox key={i} label={s.l} value={s.v} sub={s.s} color={s.c} compact={s.compact} pool={s.pool} driveText={s.driveText} isMobile={isMobile} isDark={isDark} F={F} card={card} />
            ))}
          </div>

          {/* Climbers & Fallers — what moved this month */}
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
                      <div style={{fontSize:TXT.cardMeta,color:"#69716B",fontFamily:F,marginTop:"3px"}}>{s.a}</div>
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
                      <div style={{fontSize:TXT.cardMeta,color:"#69716B",fontFamily:F,marginTop:"3px"}}>{s.a}</div>
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
          </div>
          </AnalyticsDeepSection>

          {/* Cross-platform overlap */}
          <AnalyticsDeepSection label="Cross-Platform Reach" isMobile={isMobile}>
          <div style={{...card(),...sectionGap}}>
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
                    <div style={{fontSize:TXT.cardMeta,color:"#59645D",fontFamily:F,marginTop:"2px"}}>{s.a}</div>
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
                  <Bar dataKey="entries" radius={[4,4,0,0]} maxBarSize={26}>{platTotalsData.map((e,i)=><Cell key={i} fill={e.color}/>)}</Bar>
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
                  <Bar dataKey="entries" radius={[0,4,4,0]} maxBarSize={22}>{topCountryData.map((entry)=><Cell key={entry.code} fill={entry.color}/>)}</Bar>
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
                          <button type="button" onClick={()=>openReleaseDetails(entry,isSingles?"single":"album")} style={{border:0,background:"transparent",padding:0,textAlign:"left",fontFamily:SF,fontSize:TXT.cardTitle,fontWeight:850,color:isDark?"#F6F3EA":"#050505",cursor:"pointer"}}>{entry.title}</button>
                          <div style={{fontFamily:F,fontSize:TXT.cardMeta,color:isDark?"#AEB6AE":"#69716B"}}>#{entry.rank} · {entry.artist}</div>
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
                  <Bar dataKey="count" radius={[4,4,0,0]} maxBarSize={26}>{uniquePlatformData.map((entry)=><Cell key={entry.platform} fill={entry.color}/>)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          </AnalyticsDeepSection>

          {/* Records & Milestones — all-time achievements for the selected chart type */}
          <AnalyticsDeepSection label="Records & Milestones" isMobile={isMobile}>
          <style>{`
            .ngoma-record-card { transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease; }
            .ngoma-record-card:hover { transform: translateY(-4px); border-color: ${GOLD}55 !important; }
            .ngoma-record-card:hover .ngoma-record-art { transform: scale(1.05); }
            .ngoma-record-art { transition: transform 0.5s ease, opacity 0.5s ease; animation: ngoma-record-art-fade 0.6s ease; }
            @keyframes ngoma-record-art-fade { from { opacity: 0; } to { opacity: 1; } }
            .ngoma-record-view-toggle { transition: gap 0.18s ease, color 0.18s ease; }
            .ngoma-record-card:hover .ngoma-record-view-toggle { gap: 8px; }
            .ngoma-coverage-row { transition: background 0.16s ease; border-radius: 8px; }
            .ngoma-coverage-row:hover { background: ${isDark ? "rgba(184,134,11,0.08)" : "rgba(184,134,11,0.05)"}; }
          `}</style>
          <p style={{fontFamily:F,fontSize:"13px",color:isDark?"#8F968F":"#69716B",margin:"-10px 0 14px",lineHeight:1.5}}>{chartTypeLabel} achievements calculated solely from published public Top 50 charts across all tracked months.</p>
          <div className="anl-grid-3" style={{display:"grid",gridTemplateColumns:recordGridColumns,gap:isMobile?"14px":"16px",...sectionGap}}>
            {currentRecords.map((r,i)=>{
              const expanded = r.isCoverage && openRecord === i;
              const pool = r.isCoverage ? fullCoverageClub : r.isTotalCount ? currentRecordsPool : [];
              return (
                <RecordCard
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
          </AnalyticsDeepSection>

          {/* Head-to-head deep dive — an interactive tool, so it closes out the page */}
          <AnalyticsDeepSection label="Head-to-Head" isMobile={isMobile}>
          <div style={{...card(),padding:isMobile?"16px":"18px",...sectionGap,background:isDark?"#0F120F":"linear-gradient(135deg,#FAFAF8,#FFFFFF)",borderColor:isDark?"#2F352F":"#EFEDE7"}}>
            <div style={{...secLbl(), fontSize:"20px"}}><SecMark/>{isArtists ? "Artist" : (isSingles?"Song":"Album")} Head-to-Head</div>
            <p style={{fontFamily:F,fontSize:"13px",color:isDark?"#F6F3EA":"#69716B",margin:"-8px 0 14px",lineHeight:1.45}}>Compare two {isArtists ? "artists" : (isSingles?"songs":"albums")} across points, rank, platforms, and chart history.</p>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"minmax(0,1fr) auto minmax(0,1fr)",gap:isMobile?"10px":"12px",alignItems:"center",marginBottom:isMobile?"14px":"14px"}}>
              <div style={{minWidth:0}}>
                {isMobile&&<div style={{fontFamily:F,fontSize:"9px",fontWeight:900,letterSpacing:"1.2px",textTransform:"uppercase",color:GOLD,marginBottom:"6px"}}>{isArtists ? "Artist" : (isSingles?"Song":"Album")} One</div>}
                <select value={cmpS1} onChange={e=>setCmpS1(e.target.value)} title={sp1?`${sp1.title} — ${sp1.artist}`:""} style={{width:"100%",minWidth:0,padding:isMobile?"11px 12px":"8px 10px",border:"1.5px solid "+GOLD+"55",borderRadius:"8px",background:"#FFF",fontSize:isMobile?"12px":"11px",fontFamily:F,fontWeight:700,cursor:"pointer",outline:"none",color:"#1F241F"}}>
                  {allTitles.map(t=><option key={t.key} value={t.key}>{t.title} — {t.artist}</option>)}
                </select>
                {isMobile&&sp1&&<div style={{marginTop:"7px",padding:"8px 10px",borderRadius:"9px",background:GOLD+"0B",fontFamily:F,lineHeight:1.35,color:"#1F241F",overflowWrap:"anywhere"}}><strong style={{display:"block",fontSize:"12px"}}>{sp1.title}</strong><span style={{display:"block",fontSize:"11px",color:"#59645D",marginTop:"2px"}}>{sp1.artist}</span></div>}
              </div>
              <span style={{fontFamily:F,fontSize:"11px",color:isDark?"#5A625A":"#8A928B",fontWeight:900,textAlign:"center",letterSpacing:"1px",textTransform:"uppercase",background:isDark?"#1A1E1A":"#F0EDE6",padding:"5px 12px",borderRadius:"999px",whiteSpace:"nowrap",alignSelf:"center"}}>vs</span>
              <div style={{minWidth:0}}>
                {isMobile&&<div style={{fontFamily:F,fontSize:"9px",fontWeight:900,letterSpacing:"1.2px",textTransform:"uppercase",color:"#1565C0",marginBottom:"6px"}}>{isArtists ? "Artist" : (isSingles?"Song":"Album")} Two</div>}
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
                  <div key={i} style={{padding:isMobile?"13px":"15px",background:isDark?(i===0?"rgba(184,134,11,0.16)":"rgba(21,101,192,0.20)"):c+"0D",borderRadius:"10px",border:isDark?"1px solid "+c+"55":"1px solid transparent",borderLeft:"3px solid "+c,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"flex-start",gap:"10px",minWidth:0}}>
                    <EntryThumb item={d} name={isArtists?d.title:d.artist} isArtist={isArtists} size={isMobile?54:64} accent={c} />
                    <div style={{minWidth:0,flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:"7px",flexWrap:"wrap",minWidth:0}}>
                      <button type="button" onClick={()=>openReleaseDetails(d,isArtists ? "artist" : (isSingles?"single":"album"))} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:"15px",fontWeight:800,lineHeight:1.2,whiteSpace:isMobile?"normal":"nowrap",overflow:isMobile?"visible":"hidden",textOverflow:isMobile?"clip":"ellipsis",overflowWrap:"anywhere",minWidth:0,cursor:"pointer",textAlign:"left",color:isDark?"#F6F3EA":"#1F241F"}}>{d.title}</button>
                      {isArtists ? null : getCertificationForEntry(d, isSingles ? "single" : "album")&&<CertificationTag cert={isArtists ? null : getCertificationForEntry(d, isSingles ? "single" : "album")} compact />}
                    </div>
                    <button type="button" onClick={(event)=>{event.stopPropagation();openArtistDetails(d.artist);}} style={{display:"block",maxWidth:"100%",fontFamily:F,fontSize:"12px",color:isDark?"#F6F3EA":"#59645D",marginTop:"3px",padding:0,border:0,background:"transparent",fontWeight:700,whiteSpace:isMobile?"normal":"nowrap",overflow:isMobile?"visible":"hidden",textOverflow:isMobile?"clip":"ellipsis",overflowWrap:"anywhere",cursor:"pointer",textAlign:"left"}}>{d.artist}</button>
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
                    <div style={{color:"#E4BE55",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{sp1.title.length>16?sp1.title.slice(0,14)+"…":sp1.title}</div>
                    <div style={{textAlign:"center"}}>Platform</div>
                    <div style={{textAlign:"right",color:"#72A7E8",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{sp2.title.length>16?sp2.title.slice(0,14)+"…":sp2.title}</div>
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
                    <Bar dataKey="aVal" fill={GOLD} radius={[4,4,0,0]} maxBarSize={22} name="aVal"/>
                    <Bar dataKey="bVal" fill="#1565C0" radius={[4,4,0,0]} maxBarSize={22} name="bVal"/>
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
