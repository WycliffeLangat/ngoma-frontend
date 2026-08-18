import EntryThumb from "../components/EntryThumb.jsx";
import ArtistCredit from "../components/ArtistCredit.jsx";
import { useRotatingArt } from "../hooks/useRotatingArt.js";

// Full month name → abbreviated, e.g. "September 2025" → "Sep 2025".
const MONTH_ABBR = { January: "Jan", February: "Feb", March: "Mar", April: "Apr", May: "May", June: "Jun", July: "Jul", August: "Aug", September: "Sep", October: "Oct", November: "Nov", December: "Dec" };
const abbrevMonth = (label = "") => String(label).replace(/^(\w+)(?=\s\d{4}$)/, (full) => MONTH_ABBR[full] || full);

// A single Records & Milestones row, rendered as a table row. Records that
// don't pin to a single release/artist (e.g. "Total Charted Songs") rotate
// their thumbnail through the eligible pool.
function RecordRow({ r, pool, ctx, theme, rowStyle }) {
  const {
    F, RecordIcon, SF,
    isArtists, isMobile, isSingles,
    openArtistDetails, openReleaseDetails,
  } = ctx;
  const { isDark } = theme;

  const rotating = useRotatingArt(pool);
  const thumbItem = r.certificationEntry || rotating?.entry || null;
  const thumbName = r.certificationEntry ? (r.certificationEntry.artist || r.value) : (rotating?.name || r.value);

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

  if (isMobile) {
    // Stacked single-column row: label, then leader, then detail — avoids
    // horizontal scrolling on narrow screens.
    return (
      <tr style={rowStyle}>
        <td style={{ padding: "12px 14px", verticalAlign: "middle" }}>
          <div style={{ fontFamily: F, fontSize: "10px", fontWeight: 800, letterSpacing: "0.6px", textTransform: "uppercase", color: isDark ? "#FFFFFF" : "#000000", marginBottom: "8px" }}>{r.displayLabel}</div>
          <div style={{ marginBottom: "6px" }}>{leaderNode}</div>
          <div style={{ fontFamily: F, fontSize: "12px", color: isDark ? "#FFFFFF" : "#000000", lineHeight: 1.4 }}>{detailNode}</div>
        </td>
      </tr>
    );
  }

  return (
    <tr style={rowStyle}>
      <td style={{ padding: "14px 16px", verticalAlign: "middle", textAlign: "left", fontFamily: F, fontSize: "11px", fontWeight: 800, letterSpacing: "0.6px", textTransform: "uppercase", color: isDark ? "#FFFFFF" : "#000000" }}>{r.displayLabel}</td>
      <td style={{ padding: "14px 16px", verticalAlign: "middle", textAlign: "left" }}>{leaderNode}</td>
      <td style={{ padding: "14px 16px", verticalAlign: "middle", textAlign: "left", fontFamily: F, fontSize: "13px", color: isDark ? "#FFFFFF" : "#000000", lineHeight: 1.4 }}>{detailNode}</td>
    </tr>
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
    crossPlatformRows,
    ct,
    currentPlatformKeys,
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
    tp,
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
  const sectionGap = { marginBottom: isMobile ? "20px" : "26px" };

  return (
<div className="ngoma-analytics-page" style={{padding:PAD,background:"transparent",minHeight:"60vh",boxSizing:"border-box",overflow:"hidden"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:isMobile?"stretch":"center",marginBottom:"28px",gap:isMobile?"14px":"24px",flexDirection:isMobile?"column":"row",paddingBottom:"20px",borderBottom:"1px solid "+(isDark?"#2F352F":"#EFEDE7")}}>
            <div>
              <div style={{display:"inline-block",width:"28px",height:"3px",background:isDark?"#FFFFFF":"#000000",borderRadius:"2px",marginBottom:"10px"}}/>
              <h2 style={{fontSize:isMobile?"22px":"28px",fontWeight:900,margin:"0 0 4px",letterSpacing:"-0.5px",color:isDark?"#FFFFFF":"#000000"}}>{isArtists?"Artist Analytics":isSingles?"Singles Analytics":"Albums Analytics"}</h2>
              <p style={{fontFamily:F,fontSize:"14px",color:isDark?"#FFFFFF":"#000000",margin:0,lineHeight:1.6}}>Full Top 50 data across all platforms and months.</p>
            </div>
            <div style={{display:"flex",gap:"10px",flexDirection:"row",alignItems:"center",flexShrink:0,flexWrap:"wrap"}}>
              <select value={anMonth} onChange={e=>setAnMonth(e.target.value)} style={{flex:isMobile?"1":"none",minWidth:isMobile?"120px":"160px",padding:isMobile?"10px 12px":"8px 14px",border:"1.5px solid "+(isDark?"#2F352F":"#DEDAD2"),borderRadius:"10px",background:isDark?"#1A1E1A":"#FAFAF8",fontSize:isMobile?"13px":"12px",fontFamily:F,fontWeight:750,cursor:"pointer",outline:"none",color:isDark?"#FFFFFF":"#000000"}}>
                {MONTHS.map(m=><option key={m} value={m}>{m}</option>)}
              </select>
              <Tog sm/>
            </div>
          </div>

          {/* Climbers, Fallers & New Entries — what moved this month */}
          <AnalyticsDeepSection label="Climbers & Drops" isMobile={isMobile}>
          <div className="anl-grid-3" style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:"14px",...sectionGap}}>
            <div style={card()}>
              <div style={{...secLbl(isDark?"#FFFFFF":"#000000"), fontSize:"20px"}}><SecMark c={isDark?"#F6F3EA":"#1A1A1A"}/>Top {releaseLabel} Climbers — {anMonth}</div>
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
            <div style={card()}>
              <div style={{...secLbl(isDark?"#FFFFFF":"#000000"), fontSize:"20px"}}><SecMark c={isDark?"#F6F3EA":"#1A1A1A"}/>Biggest {releaseLabel} Drops — {anMonth}</div>
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
            <div style={card()}>
              <div style={{...secLbl(isDark?"#FFFFFF":"#000000"), fontSize:"20px"}}><SecMark c={isDark?"#F6F3EA":"#1A1A1A"}/>New Entries — {anMonth}</div>
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

          {/* Cross-platform overlap */}
          <AnalyticsDeepSection label="Cross-Platform Reach" isMobile={isMobile}>
          <div style={{...sectionGap}}>
          <div style={card()}>
            <div style={{...secLbl(isDark?"#FFFFFF":"#000000"), fontSize:"20px"}}><SecMark c={isDark?"#F6F3EA":"#1A1A1A"}/>Cross-Platform Hits — {anMonth}</div>
            <p style={{fontFamily:F,fontSize:"12px",color:isDark?"#FFFFFF":"#000000",margin:"-4px 0 12px",lineHeight:1.45}}>{releaseLabel} charting on all {tp} tracked platforms at once.</p>
            {xHitsRows.slice(0,8).map((s,i)=>{
              return (
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",padding:"7px 0",borderBottom:"1px solid #F0F0EC"}}>
                <div style={{display:"flex",alignItems:"center",gap:"10px",flex:1,minWidth:0}}>
                  <EntryThumb item={s} name={isArtists?s.t:s.a} isArtist={isArtists} size={44} accent={isDark?"#F6F3EA":"#1A1A1A"} />
                  <div style={{minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
                      <button type="button" onClick={()=>openReleaseDetails(s,isArtists ? "artist" : (isSingles?"single":"album"))} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:TXT.cardTitle,fontWeight:800,cursor:"pointer",textAlign:"left"}}>{s.t}</button>
                    </div>
                    {!isArtists && <div style={{fontSize:TXT.cardMeta,marginTop:"2px"}}><ArtistCredit credit={s.a} onOpenArtist={openArtistDetails} isDark={isDark} fontFamily={F} fontSize={TXT.cardMeta} fontWeight={400} color="#000000" darkColor="#FFFFFF" separatorColor="#000000" darkSeparatorColor="#FFFFFF" /></div>}
                  </div>
                </div>
                <div style={{display:"inline-flex",alignItems:"center",gap:"4px",background:isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.06)",borderRadius:"6px",padding:"3px 8px",color:isDark?"#FFFFFF":"#000000",fontSize:"12px",fontWeight:900,flexShrink:0}}>{s.count}/{currentPlatformKeys.length}</div>
              </div>
              );
            })}
            {!xHitsRows.length&&<div style={{fontFamily:F,fontSize:isMobile?"12px":"11px",color:isDark?"#FFFFFF":"#000000",padding:"20px 0",textAlign:"center"}}>No full cross-platform hits this month</div>}
          </div>
          </div>
          </AnalyticsDeepSection>

          {/* Platform totals */}
          {platTotalsData.length>0&&(
            <AnalyticsDeepSection label="Platform Totals" isMobile={isMobile}>
            <div style={{...card(),...sectionGap}}>
              <div style={{...secLbl(isDark?"#FFFFFF":"#000000"), fontSize:"20px"}}><SecMark c={isDark?"#F6F3EA":"#1A1A1A"}/>Combined Top 50 Entries Contributed Per Platform — {anMonth}</div>
              <div style={{display:"flex",justifyContent:"flex-end",margin:"-4px 0 12px"}}><ViewToggle id="platformTotals" /></div>
              {viewMode("platformTotals")==="table" ? (
                <div style={{display:"grid",gap:"8px"}}>
                  {platTotalsData.map((entry)=>(
                    <div key={entry.platform} style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 70px",gap:"10px",alignItems:"center",padding:"9px 0",borderBottom:"1px solid "+(isDark?"#2F352F":"#F0F0EC")}}>
                      <div style={{display:"flex",alignItems:"center",gap:"8px",minWidth:0}}><span style={{width:"10px",height:"10px",borderRadius:"3px",background:entry.color,flexShrink:0}}/><span style={{fontFamily:F,fontSize:TXT.cardTitle,fontWeight:850,color:isDark?"#FFFFFF":"#000000",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{entry.platform}</span></div>
                      <span style={{fontFamily:F,fontSize:TXT.cardTitle,fontWeight:900,color:isDark?"#FFFFFF":"#000000",textAlign:"right"}}>{entry.entries}</span>
                    </div>
                  ))}
                </div>
              ) : (
              <ResponsiveContainer width="100%" height={isMobile?230:200}>
                <BarChart data={platTotalsData} margin={{top:12,right:isMobile?16:20,left:isMobile?0:8,bottom:isMobile?6:0}} barCategoryGap="14%">
                  <CartesianGrid stroke={gridStroke} vertical={false}/>
                  <XAxis dataKey="platform" tick={isMobile?false:axisTick(10)} tickLine={false} axisLine={false}/>
                  <YAxis domain={[dataMin => Math.max(0, Math.floor(dataMin * 0.9)), dataMax => Math.ceil(dataMax * 1.05)]} allowDecimals={false} tick={axisTick(isMobile?10.5:10)} axisLine={false} tickLine={false}/>
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
              <div style={{...secLbl(isDark?"#FFFFFF":"#000000"),marginBottom:0,fontSize:"20px"}}><SecMark c={isDark?"#F6F3EA":"#1A1A1A"}/>Top 5 Countries — {anMonth}</div>
              <ViewToggle id="topCountries" />
            </div>
            {viewMode("topCountries")==="table" ? (
              <div style={{display:"grid",gap:"8px"}}>
                {topCountryData.map((country)=>(
                  <div key={country.code} style={{display:"grid",gridTemplateColumns:"54px minmax(0,1fr) 72px",gap:"10px",alignItems:"center",padding:"9px 0",borderBottom:"1px solid "+(isDark?"#2F352F":"#F0F0EC")}}>
                    <span style={{fontFamily:F,fontSize:TXT.cardMeta,fontWeight:950,color:isDark?"#FFFFFF":"#000000"}}>{country.code}</span>
                    <span style={{fontFamily:F,fontSize:TXT.cardTitle,fontWeight:850,color:isDark?"#FFFFFF":"#000000",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{country.country}</span>
                    <span style={{fontFamily:F,fontSize:TXT.cardTitle,fontWeight:900,color:isDark?"#FFFFFF":"#000000",textAlign:"right"}}>{country.entries}</span>
                  </div>
                ))}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={topCountryData} layout="vertical" margin={{left:8,right:16,top:0,bottom:0}} barCategoryGap="18%">
                  <CartesianGrid stroke={gridStroke} horizontal={false}/>
                  <XAxis type="number" allowDecimals={false} tick={axisTick(10)} axisLine={false} tickLine={false}/>
                  <YAxis type="category" dataKey="code" width={38} tick={axisTick(11,{fontWeight:850})} axisLine={false} tickLine={false}/>
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
            <div style={{...secLbl(isDark?"#FFFFFF":"#000000"), fontSize:"20px"}}><SecMark c={isDark?"#F6F3EA":"#1A1A1A"}/>{isMobile?"Records & Milestones":"Records & Milestones — All Time"}</div>
            <p style={{fontFamily:F,fontSize:"13px",color:isDark?"#FFFFFF":"#000000",margin:"-4px 0 18px",lineHeight:1.5}}>{chartTypeLabel} achievements calculated solely from published public Top 50 charts across all tracked months.</p>
            <div style={{overflowX:isMobile?"visible":"auto",border:"1px solid "+(isDark?"#242923":"#EFEDE7"),borderRadius:"12px"}}>
              <table style={{width:"100%",borderCollapse:"collapse",tableLayout:"fixed",minWidth:isMobile?"0":"520px",fontFamily:F}}>
                {!isMobile && (
                <colgroup>
                  <col style={{width:"22%"}}/>
                  <col style={{width:"28%"}}/>
                  <col style={{width:"50%"}}/>
                </colgroup>
                )}
                {!isMobile && (
                <thead>
                  <tr style={{background:isDark?"#151915":"#FAFAF8"}}>
                    <th style={{padding:"12px 16px",textAlign:"left",fontSize:"10px",letterSpacing:"0.8px",textTransform:"uppercase",color:isDark?"#FFFFFF":"#000000"}}>Record</th>
                    <th style={{padding:"12px 16px",textAlign:"left",fontSize:"10px",letterSpacing:"0.8px",textTransform:"uppercase",color:isDark?"#FFFFFF":"#000000"}}>Leader</th>
                    <th style={{padding:"12px 16px",textAlign:"left",fontSize:"10px",letterSpacing:"0.8px",textTransform:"uppercase",color:isDark?"#FFFFFF":"#000000"}}>Detail</th>
                  </tr>
                </thead>
                )}
                <tbody>
                  {currentRecords.map((r,i)=>{
                    const pool = r.isTotalCount ? currentRecordsPool : [];
                    return (
                      <RecordRow
                        key={`${r.displayLabel}-${r.value}`}
                        r={r}
                        pool={pool}
                        ctx={ctx}
                        theme={recordsTheme}
                        rowStyle={{borderTop:"1px solid "+(isDark?"#242923":"#EFEDE7"),background:isDark?(i%2?"#121612":"#0F120F"):(i%2?"#FBFAF7":"#FFF")}}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          </AnalyticsDeepSection>

          {hofItems.length > 0 && (
          <AnalyticsDeepSection label="Hall of Fame" isMobile={isMobile}>
          <div style={card({marginBottom:isMobile?"20px":"26px"})}>
            <div style={{...secLbl(isDark?"#FFFFFF":"#000000"), fontSize:"20px"}}><SecMark c={isDark?"#F6F3EA":"#1A1A1A"}/>{isMobile?"Monthly #1s":"Hall of Fame — Monthly #1s"}</div>
            <p style={{fontFamily:F,fontSize:"13px",color:isDark?"#FFFFFF":"#000000",margin:"-4px 0 18px",lineHeight:1.5}}>Monthly leaders from the published public Top 50 charts across the full tracked dataset.</p>
            <div style={{fontFamily:F,fontSize:"11px",fontWeight:900,letterSpacing:"1.8px",textTransform:"uppercase",color:isDark?"#FFFFFF":"#000000",marginBottom:"12px",paddingBottom:"6px",borderBottom:"1px solid "+(isDark?"#2F352F":"#E4E1D8")}}>{hofLabel}</div>
            <div style={{overflowX:isMobile?"visible":"auto",border:"1px solid "+(isDark?"#242923":"#EFEDE7"),borderRadius:"12px"}}>
              <table style={{width:"100%",borderCollapse:"collapse",tableLayout:"fixed",minWidth:isMobile?"0":(isArtists?"460px":"620px"),fontFamily:F}}>
                {!isMobile && (
                <colgroup>
                  <col style={{width:"56px"}}/>
                  <col style={{width:isArtists?"auto":"24%"}}/>
                  {!isArtists && <col style={{width:"20%"}}/>}
                  <col style={{width:"100px"}}/>
                  <col style={{width:isArtists?"38%":"30%"}}/>
                </colgroup>
                )}
                {!isMobile && (
                <thead>
                  <tr style={{background:isDark?"#151915":"#FAFAF8"}}>
                    <th style={{padding:"12px 16px",textAlign:"center",fontSize:"10px",letterSpacing:"0.8px",textTransform:"uppercase",color:isDark?"#FFFFFF":"#000000"}}>#</th>
                    <th style={{padding:"12px 16px",textAlign:"left",fontSize:"10px",letterSpacing:"0.8px",textTransform:"uppercase",color:isDark?"#FFFFFF":"#000000"}}>{isArtists?"Artist":"Title"}</th>
                    {!isArtists && <th style={{padding:"12px 16px",textAlign:"left",fontSize:"10px",letterSpacing:"0.8px",textTransform:"uppercase",color:isDark?"#FFFFFF":"#000000"}}>Artist</th>}
                    <th style={{padding:"12px 16px",textAlign:"right",fontSize:"10px",letterSpacing:"0.8px",textTransform:"uppercase",color:isDark?"#FFFFFF":"#000000"}}>Time at #1</th>
                    <th style={{padding:"12px 16px",textAlign:"left",fontSize:"10px",letterSpacing:"0.8px",textTransform:"uppercase",color:isDark?"#FFFFFF":"#000000"}}>Months</th>
                  </tr>
                </thead>
                )}
                <tbody>
                  {hofItems.map((e,i)=>{
                    const rowStyle = {borderTop:"1px solid "+(isDark?"#242923":"#EFEDE7"),background:isDark?(i%2?"#121612":"#0F120F"):(i%2?"#FBFAF7":"#FFF")};
                    const timeLabel = e.hofMonths.length > 1 ? `${e.hofMonths.length} months` : "1 month";
                    const monthsLabel = e.hofMonths.map(abbrevMonth).join(", ");
                    if (isMobile) {
                      return (
                        <tr key={`${e.type}-${e.month}-${i}`} style={rowStyle}>
                          <td style={{padding:"12px 14px",verticalAlign:"middle"}}>
                            <div style={{display:"flex",alignItems:"center",justifyContent:"flex-start",gap:"10px",minWidth:0}}>
                              <span style={{fontFamily:F,fontSize:"12px",fontWeight:900,color:isDark?"#FFFFFF":"#000000",flexShrink:0,width:"18px"}}>{i+1}</span>
                              <EntryThumb item={e} name={isArtists?e.title:e.artist} isArtist={isArtists} size={34} accent={isDark?"#F6F3EA":"#1A1A1A"} />
                              <div style={{minWidth:0,flex:1}}>
                                <button type="button" onClick={()=>openReleaseDetails(e,e.type)} style={{display:"block",border:0,background:"transparent",padding:0,fontFamily:SF,fontWeight:800,fontSize:"14px",cursor:"pointer",textAlign:"left",color:isDark?"#FFFFFF":"inherit",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"100%"}}>{e.title}</button>
                                {!isArtists && <div style={{fontFamily:F,fontSize:"12px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}><ArtistCredit credit={e.artist} onOpenArtist={openArtistDetails} isDark={isDark} fontFamily={F} fontSize="12px" fontWeight={400} color="#000000" darkColor="#FFFFFF" separatorColor="#000000" darkSeparatorColor="#FFFFFF" /></div>}
                              </div>
                            </div>
                            <div title={monthsLabel} style={{marginTop:"8px",paddingLeft:"62px",fontFamily:F,fontSize:"11px",color:isDark?"#FFFFFF":"#000000",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                              <strong>{timeLabel}</strong> · {monthsLabel}
                            </div>
                          </td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={`${e.type}-${e.month}-${i}`} style={rowStyle}>
                        <td style={{padding:"14px 16px",verticalAlign:"middle",textAlign:"center",fontFamily:F,fontSize:"13px",fontWeight:900,color:isDark?"#FFFFFF":"#000000"}}>{i+1}</td>
                        <td style={{padding:"14px 16px",verticalAlign:"middle",textAlign:"left"}}>
                          <div style={{display:"flex",alignItems:"center",justifyContent:"flex-start",gap:"10px",minWidth:0}}>
                            <EntryThumb item={e} name={isArtists?e.title:e.artist} isArtist={isArtists} size={38} accent={isDark?"#F6F3EA":"#1A1A1A"} />
                            <button type="button" onClick={()=>openReleaseDetails(e,e.type)} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontWeight:800,fontSize:"14px",cursor:"pointer",textAlign:"left",color:isDark?"#FFFFFF":"inherit",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"100%"}}>{e.title}</button>
                          </div>
                        </td>
                        {!isArtists && <td style={{padding:"14px 16px",verticalAlign:"middle",textAlign:"left",fontFamily:F,fontSize:"13px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}><ArtistCredit credit={e.artist} onOpenArtist={openArtistDetails} isDark={isDark} fontFamily={F} fontSize="13px" fontWeight={400} color="#000000" darkColor="#FFFFFF" separatorColor="#000000" darkSeparatorColor="#FFFFFF" /></td>}
                        <td style={{padding:"14px 16px",verticalAlign:"middle",textAlign:"right",fontFamily:F,fontSize:"13px",fontWeight:800,color:isDark?"#FFFFFF":"#000000",whiteSpace:"nowrap"}}>{timeLabel}</td>
                        <td title={monthsLabel} style={{padding:"14px 16px",verticalAlign:"middle",textAlign:"left",fontFamily:F,fontSize:"12px",color:isDark?"#FFFFFF":"#000000",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{monthsLabel}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          </AnalyticsDeepSection>
          )}
        </div>
  );
}
