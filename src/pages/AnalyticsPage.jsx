import EntryThumb from "../components/EntryThumb.jsx";
import ArtistCredit from "../components/ArtistCredit.jsx";
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
          <EntryThumb item={thumbItem} name={thumbName} isArtist={isArtists} size={thumbSize} accent={isDark?"#F6F3EA":"#1A1A1A"} />
        ) : (
          <div style={{ width: thumbSize, height: thumbSize, borderRadius: "10px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: isDark ? "#151915" : "#F0EDE7" }}>
            <RecordIcon label={r.displayLabel} size={isMobile ? 26 : 30} />
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: F, fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", color: isDark?"#F6F3EA":"#1A1A1A", marginBottom: "4px" }}>{r.displayLabel}</div>
          {r.certificationEntry ? (
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); isArtists ? openArtistDetails(r.value) : openReleaseDetails(r.certificationEntry, isSingles ? "single" : "album"); }}
              style={{ display: "block", border: 0, background: "transparent", padding: 0, fontFamily: SF, fontWeight: 800, fontSize: "15px", marginBottom: "2px", lineHeight: 1.2, cursor: "pointer", textAlign: "left", color: isDark ? "#F6F3EA" : "inherit", maxWidth: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
            >{r.value}</button>
          ) : (
            <div style={{ fontFamily: SF, fontWeight: 800, fontSize: "15px", marginBottom: "2px", lineHeight: 1.2, color: isDark ? "#F6F3EA" : "inherit", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.value}</div>
          )}
          <div style={{ fontFamily: F, fontSize: "13px", color: isDark ? "#AEB6AE" : "#69716B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{r.displaySub}</span>
            {r.climbDelta && <span style={{ display: "inline-flex", flexShrink: 0, alignItems: "center", padding: "1px 6px", borderRadius: "999px", background: isDark ? "rgba(45,176,74,0.16)" : "#EAF8EF", color: isDark ? "#4FCB6F" : "#1E8E3E", fontSize: "10px", fontWeight: 900 }}>+{r.climbDelta}</span>}
          </div>
          {r.isCoverage && (
            <div style={{ display: "flex", alignItems: "center", gap: "5px", fontFamily: F, fontSize: "10.5px", color: isDark?"#F6F3EA":"#1A1A1A", fontWeight: 800, letterSpacing: "0.5px", marginTop: "6px" }}>
              <span>{expanded ? `Hide ${releaseLabelLower}` : `View ${releaseLabelLower}`}</span>
              <span style={{ fontSize: "11px", transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.22s ease", display: "inline-block" }}>▾</span>
            </div>
          )}
        </div>
      </div>

      {expanded && r.isCoverage && (
        <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: `1px solid ${dividerColor}`, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))", columnGap: "22px" }}>
          {fullCoverageClub.length ? fullCoverageClub.map((song, idx) => {
            return (
              <div key={`${song.title}-${song.artist}`} className="ngoma-coverage-row" style={{ display: "grid", gridTemplateColumns: "22px 42px minmax(0,1fr)", gap: "8px", alignItems: "center", padding: "8px 6px", fontFamily: F, borderBottom: `1px solid ${rowBorder}` }}>
                <span style={{ fontSize: "10px", fontWeight: 900, color: isDark?"#F6F3EA":"#1A1A1A" }}>#{idx + 1}</span>
                <EntryThumb item={song} name={song.artist} size={42} accent={isDark?"#F6F3EA":"#1A1A1A"} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                    <button type="button" onClick={(event) => { event.stopPropagation(); isArtists ? openArtistDetails(song.title) : openReleaseDetails(song, isSingles ? "single" : "album"); }} style={{ border: 0, background: "transparent", padding: 0, fontFamily: SF, fontSize: "12px", fontWeight: 850, color: textPrimary, cursor: "pointer", textAlign: "left" }}>{song.title}</button>
                  </span>
                  <span style={{ display: "block", fontSize: "11px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}><ArtistCredit credit={song.artist} onOpenArtist={openArtistDetails} isDark={isDark} fontFamily={F} fontSize="11px" fontWeight={400} color={textMuted} darkColor={textMuted} separatorColor={textMuted} darkSeparatorColor={textMuted} /> · {song.month}</span>
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
    Bar,
    BarChart,
    CC,
    CartesianGrid,
    Cell,
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
    setOpenRecord,
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

  return (
<div className="ngoma-analytics-page" style={{padding:PAD,background:"transparent",minHeight:"60vh",boxSizing:"border-box",overflow:"hidden"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:isMobile?"stretch":"center",marginBottom:"28px",gap:isMobile?"14px":"24px",flexDirection:isMobile?"column":"row",paddingBottom:"20px",borderBottom:"1px solid "+(isDark?"#2F352F":"#EFEDE7")}}>
            <div>
              <div style={{display:"inline-block",width:"28px",height:"3px",background:isDark?"#F6F3EA":"#1A1A1A",borderRadius:"2px",marginBottom:"10px"}}/>
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
              <div style={{...secLbl(isDark?"#F6F3EA":"#1A1A1A"), fontSize:"20px"}}><SecMark c={isDark?"#F6F3EA":"#1A1A1A"}/>Top {releaseLabel} Climbers — {anMonth}</div>
              {mvData.risers.map((s,i)=>{
                return (
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",padding:isMobile?"8px 0":"6px 0",borderBottom:"1px solid #F0F0EC"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"10px",minWidth:0}}>
                    <EntryThumb item={s} name={isArtists?s.t:s.a} isArtist={isArtists} size={46} accent={isDark?"#F6F3EA":"#1A1A1A"} />
                    <div style={{minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
                        <button type="button" onClick={()=>openReleaseDetails(s,isArtists ? "artist" : (isSingles?"single":"album"))} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:TXT.cardTitle,fontWeight:800,lineHeight:1.15,cursor:"pointer",textAlign:"left"}}>{s.t}</button>
                      </div>
                      {!isArtists && <div style={{fontSize:TXT.cardMeta,marginTop:"3px"}}><ArtistCredit credit={s.a} onOpenArtist={openArtistDetails} isDark={isDark} fontFamily={F} fontSize={TXT.cardMeta} fontWeight={400} color="#69716B" darkColor="#69716B" separatorColor="#69716B" darkSeparatorColor="#69716B" /></div>}
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
              <div style={{...secLbl(isDark?"#F6F3EA":"#1A1A1A"), fontSize:"20px"}}><SecMark c={isDark?"#F6F3EA":"#1A1A1A"}/>Biggest {releaseLabel} Drops — {anMonth}</div>
              {mvData.fallers.map((s,i)=>{
                return (
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",padding:isMobile?"8px 0":"6px 0",borderBottom:"1px solid #F0F0EC"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"10px",minWidth:0}}>
                    <EntryThumb item={s} name={isArtists?s.t:s.a} isArtist={isArtists} size={46} accent={isDark?"#F6F3EA":"#1A1A1A"} />
                    <div style={{minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
                        <button type="button" onClick={()=>openReleaseDetails(s,isArtists ? "artist" : (isSingles?"single":"album"))} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:TXT.cardTitle,fontWeight:800,lineHeight:1.15,cursor:"pointer",textAlign:"left"}}>{s.t}</button>
                      </div>
                      {!isArtists && <div style={{fontSize:TXT.cardMeta,marginTop:"3px"}}><ArtistCredit credit={s.a} onOpenArtist={openArtistDetails} isDark={isDark} fontFamily={F} fontSize={TXT.cardMeta} fontWeight={400} color="#69716B" darkColor="#69716B" separatorColor="#69716B" darkSeparatorColor="#69716B" /></div>}
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
              <div style={{...secLbl(isDark?"#F6F3EA":"#1A1A1A"), fontSize:"20px"}}><SecMark c={isDark?"#F6F3EA":"#1A1A1A"}/>New Entries — {anMonth}</div>
              {mvData.newEntries.slice(0,5).map((s,i)=>{
                return (
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",padding:isMobile?"8px 0":"6px 0",borderBottom:"1px solid #F0F0EC"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"10px",minWidth:0}}>
                    <EntryThumb item={s} name={isArtists?s.title:s.artist} isArtist={isArtists} size={46} accent={isDark?"#F6F3EA":"#1A1A1A"} />
                    <div style={{minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
                        <button type="button" onClick={()=>openReleaseDetails(s,isArtists ? "artist" : (isSingles?"single":"album"))} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:TXT.cardTitle,fontWeight:800,lineHeight:1.15,cursor:"pointer",textAlign:"left"}}>{s.title}</button>
                      </div>
                      {!isArtists && <div style={{fontSize:TXT.cardMeta,marginTop:"3px"}}><ArtistCredit credit={s.artist} onOpenArtist={openArtistDetails} isDark={isDark} fontFamily={F} fontSize={TXT.cardMeta} fontWeight={400} color="#69716B" darkColor="#69716B" separatorColor="#69716B" darkSeparatorColor="#69716B" /></div>}
                    </div>
                  </div>
                  <div style={{textAlign:"right",fontFamily:F,whiteSpace:"nowrap",flexShrink:0}}>
                    <div style={{display:"inline-flex",alignItems:"center",gap:"4px",background:isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.06)",borderRadius:"6px",padding:"3px 8px",color:isDark?"#F6F3EA":"#1A1A1A",fontSize:"12px",fontWeight:900}}>NEW</div>
                    <div style={{fontSize:TXT.micro,color:"#7B857D",marginTop:"3px"}}>#{s.rank}</div>
                  </div>
                </div>
                );
              })}
              {!mvData.newEntries.length&&<div style={{fontFamily:F,fontSize:isMobile?"12px":"11px",color:"#CCC",padding:"20px 0",textAlign:"center"}}>No new entries (debut month)</div>}
            </div>
            <div style={card()}>
              <div style={{...secLbl(isDark?"#F6F3EA":"#1A1A1A"), fontSize:"20px"}}><SecMark c={isDark?"#F6F3EA":"#1A1A1A"}/>Re-Entries — {anMonth}</div>
              {mvData.reEntries.slice(0,5).map((s,i)=>{
                return (
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",padding:isMobile?"8px 0":"6px 0",borderBottom:"1px solid #F0F0EC"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"10px",minWidth:0}}>
                    <EntryThumb item={s} name={isArtists?s.title:s.artist} isArtist={isArtists} size={46} accent={isDark?"#F6F3EA":"#1A1A1A"} />
                    <div style={{minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
                        <button type="button" onClick={()=>openReleaseDetails(s,isArtists ? "artist" : (isSingles?"single":"album"))} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:TXT.cardTitle,fontWeight:800,lineHeight:1.15,cursor:"pointer",textAlign:"left"}}>{s.title}</button>
                      </div>
                      {!isArtists && <div style={{fontSize:TXT.cardMeta,marginTop:"3px"}}><ArtistCredit credit={s.artist} onOpenArtist={openArtistDetails} isDark={isDark} fontFamily={F} fontSize={TXT.cardMeta} fontWeight={400} color="#69716B" darkColor="#69716B" separatorColor="#69716B" darkSeparatorColor="#69716B" /></div>}
                    </div>
                  </div>
                  <div style={{textAlign:"right",fontFamily:F,whiteSpace:"nowrap",flexShrink:0}}>
                    <div style={{display:"inline-flex",alignItems:"center",gap:"4px",background:isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.06)",borderRadius:"6px",padding:"3px 8px",color:isDark?"#F6F3EA":"#1A1A1A",fontSize:"12px",fontWeight:900}}>BACK</div>
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
            <div style={{...secLbl(isDark?"#F6F3EA":"#1A1A1A"), fontSize:"20px"}}><SecMark c={isDark?"#F6F3EA":"#1A1A1A"}/>Cross-Platform Reach — {anMonth}</div>
            <p style={{fontFamily:F,fontSize:"12px",color:"#59645D",margin:"-4px 0 12px",lineHeight:1.45}}>{releaseLabel} charting on most platforms simultaneously.</p>
            {crossPlatformRows.slice(0,8).map((s,i)=>{
              return (
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",padding:"7px 0",borderBottom:"1px solid #F0F0EC"}}>
                <div style={{display:"flex",alignItems:"center",gap:"10px",flex:1,minWidth:0}}>
                  <EntryThumb item={s} name={isArtists?s.t:s.a} isArtist={isArtists} size={44} accent={isDark?"#F6F3EA":"#1A1A1A"} />
                  <div style={{minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
                      <button type="button" onClick={()=>openReleaseDetails(s,isArtists ? "artist" : (isSingles?"single":"album"))} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:TXT.cardTitle,fontWeight:800,cursor:"pointer",textAlign:"left"}}>{s.t}</button>
                    </div>
                    {!isArtists && <div style={{fontSize:TXT.cardMeta,marginTop:"2px"}}><ArtistCredit credit={s.a} onOpenArtist={openArtistDetails} isDark={isDark} fontFamily={F} fontSize={TXT.cardMeta} fontWeight={400} color="#59645D" darkColor="#59645D" separatorColor="#59645D" darkSeparatorColor="#59645D" /></div>}
                  </div>
                </div>
                <div style={{display:"flex",gap:"3px",alignItems:"center",flexShrink:0}}>
                  {s.plats.map(pl=><div key={pl} style={{width:"7px",height:"7px",borderRadius:"50%",background:PC[pl]||"#888"}} title={PLAT_LABEL[pl]}/>)}
                  <span style={{fontFamily:F,fontSize:TXT.cardMeta,fontWeight:700,color:isDark?"#F6F3EA":"#1A1A1A",marginLeft:"6px"}}>{s.count}/{currentPlatformKeys.length}</span>
                </div>
              </div>
              );
            })}
          </div>
          <div style={card()}>
            <div style={{...secLbl(isDark?"#F6F3EA":"#1A1A1A"), fontSize:"20px"}}><SecMark c={isDark?"#F6F3EA":"#1A1A1A"}/>Cross-Platform Hits — {anMonth}</div>
            <p style={{fontFamily:F,fontSize:"12px",color:"#59645D",margin:"-4px 0 12px",lineHeight:1.45}}>{releaseLabel} charting on all {tp} tracked platforms at once.</p>
            {xHitsRows.slice(0,8).map((s,i)=>{
              return (
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",padding:"7px 0",borderBottom:"1px solid #F0F0EC"}}>
                <div style={{display:"flex",alignItems:"center",gap:"10px",flex:1,minWidth:0}}>
                  <EntryThumb item={s} name={isArtists?s.t:s.a} isArtist={isArtists} size={44} accent={isDark?"#F6F3EA":"#1A1A1A"} />
                  <div style={{minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
                      <button type="button" onClick={()=>openReleaseDetails(s,isArtists ? "artist" : (isSingles?"single":"album"))} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:TXT.cardTitle,fontWeight:800,cursor:"pointer",textAlign:"left"}}>{s.t}</button>
                    </div>
                    {!isArtists && <div style={{fontSize:TXT.cardMeta,marginTop:"2px"}}><ArtistCredit credit={s.a} onOpenArtist={openArtistDetails} isDark={isDark} fontFamily={F} fontSize={TXT.cardMeta} fontWeight={400} color="#59645D" darkColor="#59645D" separatorColor="#59645D" darkSeparatorColor="#59645D" /></div>}
                  </div>
                </div>
                <div style={{display:"inline-flex",alignItems:"center",gap:"4px",background:isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.06)",borderRadius:"6px",padding:"3px 8px",color:isDark?"#F6F3EA":"#1A1A1A",fontSize:"12px",fontWeight:900,flexShrink:0}}>{s.count}/{currentPlatformKeys.length}</div>
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
              <div style={{...secLbl(isDark?"#F6F3EA":"#1A1A1A"), fontSize:"20px"}}><SecMark c={isDark?"#F6F3EA":"#1A1A1A"}/>Combined Top 50 Entries Contributed Per Platform — {anMonth}</div>
              <div style={{display:"flex",justifyContent:"flex-end",margin:"-4px 0 12px"}}><ViewToggle id="platformTotals" /></div>
              {viewMode("platformTotals")==="table" ? (
                <div style={{display:"grid",gap:"8px"}}>
                  {platTotalsData.map((entry)=>(
                    <div key={entry.platform} style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 70px",gap:"10px",alignItems:"center",padding:"9px 0",borderBottom:"1px solid "+(isDark?"#2F352F":"#F0F0EC")}}>
                      <div style={{display:"flex",alignItems:"center",gap:"8px",minWidth:0}}><span style={{width:"10px",height:"10px",borderRadius:"3px",background:entry.color,flexShrink:0}}/><span style={{fontFamily:F,fontSize:TXT.cardTitle,fontWeight:850,color:isDark?"#F6F3EA":"#1A1A1A",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{entry.platform}</span></div>
                      <span style={{fontFamily:F,fontSize:TXT.cardTitle,fontWeight:900,color:isDark?"#F6F3EA":"#1A1A1A",textAlign:"right"}}>{entry.entries}</span>
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
              <div style={{...secLbl(isDark?"#F6F3EA":"#1A1A1A"),marginBottom:0,fontSize:"20px"}}><SecMark c={isDark?"#F6F3EA":"#1A1A1A"}/>Top 5 Countries — {anMonth}</div>
              <ViewToggle id="topCountries" />
            </div>
            {viewMode("topCountries")==="table" ? (
              <div style={{display:"grid",gap:"8px"}}>
                {topCountryData.map((country)=>(
                  <div key={country.code} style={{display:"grid",gridTemplateColumns:"54px minmax(0,1fr) 72px",gap:"10px",alignItems:"center",padding:"9px 0",borderBottom:"1px solid "+(isDark?"#2F352F":"#F0F0EC")}}>
                    <span style={{fontFamily:F,fontSize:TXT.cardMeta,fontWeight:950,color:isDark?"#F6F3EA":"#1A1A1A"}}>{country.code}</span>
                    <span style={{fontFamily:F,fontSize:TXT.cardTitle,fontWeight:850,color:isDark?"#F6F3EA":"#1A1A1A",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{country.country}</span>
                    <span style={{fontFamily:F,fontSize:TXT.cardTitle,fontWeight:900,color:isDark?"#F6F3EA":"#1A1A1A",textAlign:"right"}}>{country.entries}</span>
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
              <div style={{...secLbl(isDark?"#F6F3EA":"#1A1A1A"),marginBottom:0,fontSize:"20px"}}><SecMark c={isDark?"#F6F3EA":"#1A1A1A"}/>Platform-Unique Entries — {anMonth}</div>
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
                          <div style={{fontFamily:F,fontSize:TXT.cardMeta,color:isDark?"#AEB6AE":"#69716B"}}>{isArtists ? `#${entry.rank}` : <>#{entry.rank} · <ArtistCredit credit={entry.artist} onOpenArtist={openArtistDetails} isDark={isDark} fontFamily={F} fontSize={TXT.cardMeta} fontWeight={400} color="#69716B" darkColor="#AEB6AE" separatorColor="#69716B" darkSeparatorColor="#AEB6AE" /></>}</div>
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
            <div style={{...secLbl(isDark?"#F6F3EA":"#1A1A1A"), fontSize:"20px"}}><SecMark c={isDark?"#F6F3EA":"#1A1A1A"}/>{isMobile?"Records & Milestones":"Records & Milestones — All Time"}</div>
            <p style={{fontFamily:F,fontSize:"13px",color:isDark?"#8F968F":"#69716B",margin:"-4px 0 18px",lineHeight:1.5}}>{chartTypeLabel} achievements calculated solely from published public Top 50 charts across all tracked months.</p>
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
            <div style={{...secLbl(isDark?"#F6F3EA":"#1A1A1A"), fontSize:"20px"}}><SecMark c={isDark?"#F6F3EA":"#1A1A1A"}/>{isMobile?"Monthly #1s":"Hall of Fame — Monthly #1s"}</div>
            <p style={{fontFamily:F,fontSize:"13px",color:isDark?"#8F968F":"#69716B",margin:"-4px 0 18px",lineHeight:1.5}}>Monthly leaders from the published public Top 50 charts across the full tracked dataset.</p>
            {(()=>{
              const HofSection = ({items, label}) => items.length === 0 ? null : (
                <div style={{marginBottom:"20px"}}>
                  <div style={{fontFamily:F,fontSize:"11px",fontWeight:900,letterSpacing:"1.8px",textTransform:"uppercase",color:isDark?"#F6F3EA":"#1A1A1A",marginBottom:"12px",paddingBottom:"6px",borderBottom:"1px solid "+(isDark?"#2F352F":"#E4E1D8")}}>{label}</div>
                  <div className="anl-grid-3" style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:"10px"}}>
                    {items.map((e,i)=>(
                      <div key={`${e.type}-${e.month}-${i}`} style={{display:"flex",gap:"11px",alignItems:"center",padding:"12px",background:isDark?"#151915":"#FAFAF8",borderRadius:"8px",border:"1px solid "+(isDark?"#242923":"#EFEDE7"),minWidth:0}}>
                        <EntryThumb item={e} name={isArtists?e.title:e.artist} isArtist={isArtists} size={isMobile?62:72} accent={isDark?"#F6F3EA":"#1A1A1A"} />
                        <div style={{minWidth:0}}>
                          <div style={{fontFamily:F,fontSize:"11px",letterSpacing:"1.5px",textTransform:"uppercase",color:isDark?"#F6F3EA":"#1A1A1A",marginBottom:"4px"}}>{e.hofMonths.length > 1 ? `${e.hofMonths.length} months at #1` : e.month}</div>
                          <button type="button" onClick={()=>openReleaseDetails(e,e.type)} style={{display:"block",border:0,background:"transparent",padding:0,fontFamily:SF,fontWeight:800,fontSize:"15px",marginBottom:"2px",lineHeight:1.2,cursor:"pointer",textAlign:"left",color:isDark?"#F6F3EA":"inherit",maxWidth:"100%",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{e.title}</button>
                          <div style={{fontFamily:F,fontSize:"13px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{isArtists?"Artist #1":<ArtistCredit credit={e.artist} onOpenArtist={openArtistDetails} isDark={isDark} fontFamily={F} fontSize="13px" fontWeight={400} color="#69716B" darkColor="#AEB6AE" separatorColor="#69716B" darkSeparatorColor="#AEB6AE" />}</div>
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
        </div>
  );
}
