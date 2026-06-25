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
    Legend,
    Line,
    LineChart,
    MEDALS,
    MONTHS,
    PAD,
    PC,
    PLATS_FOR,
    PLAT_LABEL,
    Pie,
    PieChart,
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
    coverageData,
    crossPlatformRows,
    ct,
    currentPlatformKeys,
    featureAnalytics,
    getArtistCountry,
    getCertificationForEntry,
    getCombined,
    isDark,
    isMobile,
    isArtists,
    isSingles,
    mvData,
    openArtistDetails,
    openReleaseDetails,
    platOnes,
    platTotalsData,
    rankJourneyMonths,
    rankJourneyView,
    releaseLabel,
    releaseLabelLower,
    secLbl,
    setAnMonth,
    setCmpS1,
    setCmpS2,
    setRankJourneyView,
    songMonthlyData,
    songRankData,
    sp1,
    sp2,
    top10sData,
    topArtistTrajectoryArtists,
    topArtistsLine,
    topCountryData,
    tp,
    tracked,
    uniquePlatformData,
    viewMode
  } = ctx;

  const anLeader = analyticsRowsFor(anMonth).find(e => Number(e.rank) === 1) || analyticsRowsFor(anMonth)[0];
  const xHitsCount = crossPlatformRows.filter(e => e.count >= tp).length;

  return (
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
          {/* SONG / ALBUM COMPARISON */}
          <div style={{...card(),padding:isMobile?"16px":"18px",marginBottom:isMobile?"18px":"20px",background:isDark?"#0F120F":"linear-gradient(135deg,#FAFAF8,#FFFFFF)",borderColor:isDark?"#2F352F":"#EFEDE7"}}>
            <div style={secLbl()}><SecMark/>{isArtists ? "Artist" : (isSingles?"Song":"Album")} Head-to-Head</div>
            <p style={{fontFamily:F,fontSize:TXT.note,color:isDark?"#F6F3EA":"#69716B",margin:"-8px 0 14px",lineHeight:1.45}}>Compare two {isArtists ? "artists" : (isSingles?"songs":"albums")} across points, rank, platforms, and chart history.</p>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"minmax(0,1fr) auto minmax(0,1fr)",gap:isMobile?"10px":"12px",alignItems:"center",marginBottom:isMobile?"14px":"14px"}}>
              <div style={{minWidth:0}}>
                {isMobile&&<div style={{fontFamily:F,fontSize:"9px",fontWeight:900,letterSpacing:"1.2px",textTransform:"uppercase",color:GOLD,marginBottom:"6px"}}>{isArtists ? "Artist" : (isSingles?"Song":"Album")} One</div>}
                <select value={cmpS1} onChange={e=>setCmpS1(e.target.value)} title={sp1?`${sp1.title} — ${sp1.artist}`:""} style={{width:"100%",minWidth:0,padding:isMobile?"11px 12px":"8px 10px",border:"1.5px solid "+GOLD+"55",borderRadius:"8px",background:"#FFF",fontSize:isMobile?"12px":"11px",fontFamily:F,fontWeight:700,cursor:"pointer",outline:"none",color:"#1F241F"}}>
                  {allTitles.map(t=><option key={t.key} value={t.key}>{t.title} — {t.artist}</option>)}
                </select>
                {isMobile&&sp1&&<div style={{marginTop:"7px",padding:"8px 10px",borderRadius:"9px",background:GOLD+"0B",fontFamily:F,lineHeight:1.35,color:"#1F241F",overflowWrap:"anywhere"}}><strong style={{display:"block",fontSize:"12px"}}>{sp1.title}</strong><span style={{display:"block",fontSize:"11px",color:"#59645D",marginTop:"2px"}}>{sp1.artist}</span></div>}
              </div>
              <span style={{fontFamily:F,fontSize:isMobile?"10px":"12px",color:"#8A928B",fontWeight:900,textAlign:"center",textTransform:isMobile?"uppercase":"none",letterSpacing:isMobile?"1px":"normal"}}>vs</span>
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
                    <div style={{display:"flex",alignItems:"center",gap:"7px",flexWrap:"wrap",minWidth:0}}>
                      <button type="button" onClick={()=>openReleaseDetails(d,isArtists ? "artist" : (isSingles?"single":"album"))} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:isMobile?"15px":"16px",fontWeight:800,lineHeight:1.2,whiteSpace:isMobile?"normal":"nowrap",overflow:isMobile?"visible":"hidden",textOverflow:isMobile?"clip":"ellipsis",overflowWrap:"anywhere",minWidth:0,cursor:"pointer",textAlign:"left",color:isDark?"#F6F3EA":"#1F241F"}}>{d.title}</button>
                      {isArtists ? null : getCertificationForEntry(d, isSingles ? "single" : "album")&&<CertificationTag cert={isArtists ? null : getCertificationForEntry(d, isSingles ? "single" : "album")} compact />}
                    </div>
                    <button type="button" onClick={(event)=>{event.stopPropagation();openArtistDetails(d.artist);}} style={{display:"block",maxWidth:"100%",fontFamily:F,fontSize:isMobile?"11.5px":"11px",color:isDark?"#F6F3EA":"#59645D",marginTop:"3px",padding:0,border:0,background:"transparent",fontWeight:700,whiteSpace:isMobile?"normal":"nowrap",overflow:isMobile?"visible":"hidden",textOverflow:isMobile?"clip":"ellipsis",overflowWrap:"anywhere",cursor:"pointer",textAlign:"left"}}>{d.artist}</button>
                    {isMobile&&<button type="button" onClick={()=>openReleaseDetails(d,isArtists ? "artist" : (isSingles?"single":"album"))} style={{marginTop:"9px",border:"1px solid "+c+"55",borderRadius:"999px",background:isDark?"rgba(255,255,255,0.04)":"#FFF",color:isDark&&i===1?"#72A7E8":c,fontFamily:F,fontSize:"9.5px",fontWeight:900,letterSpacing:"1px",textTransform:"uppercase",padding:"7px 10px",cursor:"pointer"}}>View Details</button>}
                    <div style={{display:"flex",gap:isMobile?"12px":"16px",marginTop:isMobile?"10px":"12px",flexWrap:"wrap"}}>
                      <div><div style={{fontFamily:F,fontSize:isMobile?"18px":"20px",fontWeight:800,color:isDark&&i===1?"#72A7E8":c}}>{d.totalPts.toLocaleString()}</div><div style={{fontFamily:F,fontSize:isMobile?"8.5px":"8.5px",letterSpacing:"1px",textTransform:"uppercase",color:isDark?"#F6F3EA":"#69716B",fontWeight:700}}>Total Pts</div></div>
                      <div><div style={{fontFamily:F,fontSize:isMobile?"18px":"20px",fontWeight:800,color:isDark&&i===1?"#72A7E8":c}}>#{d.peak}</div><div style={{fontFamily:F,fontSize:isMobile?"8.5px":"8.5px",letterSpacing:"1px",textTransform:"uppercase",color:isDark?"#F6F3EA":"#69716B",fontWeight:700}}>Peak</div></div>
                    </div>
                  </div>
                ))}
              </div>
              <AnalyticsDeepSection label="View full H2H comparison details" isMobile={isMobile}>
              {/* Metric comparison table */}
              <div style={{width:"100%",maxWidth:isMobile?"360px":"none",margin:"0 auto 16px",border:"1px solid "+(isDark?"#2F352F":"#E4E1D8"),borderRadius:"12px",overflow:"hidden",background:isDark?"#0F120F":"#FFF",boxShadow:isDark?"none":"0 8px 24px rgba(31,36,31,0.05)"}}>
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
                      <div key={i} style={{display:"grid",gridTemplateColumns:isMobile?"minmax(76px,1fr) minmax(100px,0.9fr) minmax(76px,1fr)":"minmax(130px,1fr) minmax(150px,0.8fr) minmax(130px,1fr)",alignItems:"stretch",background:isDark?(i%2?"#121612":"#0F120F"):(i%2?"#FBFAF7":"#FFF"),borderBottom:i===rows.length-1?"none":"1px solid "+(isDark?"#2F352F":"#EEEAE1"),gap:0}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center",padding:isMobile?"9px 6px":"11px 12px",fontFamily:F,fontSize:isMobile?"13px":"14px",fontWeight:aWins?900:800,color:GOLD,background:"transparent"}}>{r.fmt(r.a)}</div>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center",padding:isMobile?"9px 5px":"11px 10px",borderLeft:"1px solid "+(isDark?"#2F352F":"#EEEAE1"),borderRight:"1px solid "+(isDark?"#2F352F":"#EEEAE1"),fontFamily:F,fontSize:isMobile?"8.6px":"9.5px",letterSpacing:"0.8px",textTransform:"uppercase",color:isDark?"#F6F3EA":"#59645D",fontWeight:850,lineHeight:1.25}}>{r.label}</div>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center",padding:isMobile?"9px 6px":"11px 12px",fontFamily:F,fontSize:isMobile?"13px":"14px",fontWeight:bWins?900:800,color:isDark?"#72A7E8":"#1565C0",background:"transparent"}}>{r.fmt(r.b)}</div>
                      </div>
                    );
                  });
                })()}
              </div>
              {/* Points + Rank charts */}
              <div className="anl-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginTop:isMobile?"14px":"0"}}>
                <div style={{width:"100%",maxWidth:isMobile?"360px":"none",margin:"0 auto",padding:isMobile?"14px 8px 10px":"0",background:isMobile?(isDark?"#0F120F":"#FFF"):"transparent",border:isMobile?"1px solid "+(isDark?"#2F352F":"#E9E5DC"):"none",borderRadius:isMobile?"13px":"0",boxShadow:isMobile?(isDark?"none":"0 6px 20px rgba(31,36,31,0.04)"):"none",overflow:"hidden"}}>
                  <div style={{fontFamily:F,fontSize:isMobile?"10px":"9.5px",fontWeight:800,letterSpacing:"1.4px",textTransform:"uppercase",textAlign:isMobile?"center":"left",color:isDark?"#D7DBD7":"#59645D",marginBottom:"8px"}}>Points by Month</div>
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
                <div style={{width:"100%",maxWidth:isMobile?"360px":"none",margin:"0 auto",padding:isMobile?"14px 8px 10px":"0",background:isMobile?(isDark?"#0F120F":"#FFF"):"transparent",border:isMobile?"1px solid "+(isDark?"#2F352F":"#E9E5DC"):"none",borderRadius:isMobile?"13px":"0",boxShadow:isMobile?(isDark?"none":"0 6px 20px rgba(31,36,31,0.04)"):"none",overflow:"hidden"}}>
                  <div style={{fontFamily:F,fontSize:isMobile?"10px":"9.5px",fontWeight:800,letterSpacing:"1.4px",textTransform:"uppercase",textAlign:isMobile?"center":"left",color:isDark?"#D7DBD7":"#59645D",marginBottom:"8px"}}>Rank Trajectory (lower = better)</div>
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
              {/* Platform-by-platform peak ranks */}
              <div style={{marginTop:isMobile?"14px":"16px"}}>
                <div style={{fontFamily:F,fontSize:isMobile?"10px":"9.5px",fontWeight:800,letterSpacing:"1.4px",textTransform:"uppercase",color:"#59645D",marginBottom:"10px"}}>Peak Rank by Platform</div>
                <div style={{border:"1px solid "+(isDark?"#2F352F":"#E4E1D8"),borderRadius:"12px",overflow:"hidden",background:isDark?"#0F120F":"#FFF"}}>
                  <div style={{display:"grid",gridTemplateColumns:isMobile?"minmax(76px,1fr) minmax(100px,0.9fr) minmax(76px,1fr)":"minmax(130px,1fr) minmax(150px,0.8fr) minmax(130px,1fr)",gap:"8px",padding:isMobile?"10px 9px":"12px 16px",background:"#1F241F",fontFamily:F,fontSize:isMobile?"9px":"9.5px",fontWeight:850,letterSpacing:"1px",textTransform:"uppercase",color:"#C9CEC9"}}>
                    <div style={{color:"#E4BE55",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{sp1.title.length>16?sp1.title.slice(0,14)+"…":sp1.title}</div>
                    <div style={{textAlign:"center"}}>Platform</div>
                    <div style={{textAlign:"right",color:"#72A7E8",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{sp2.title.length>16?sp2.title.slice(0,14)+"…":sp2.title}</div>
                  </div>
                  {PLATS_FOR.map((pl,i)=>{
                    const a=sp1.platforms[pl],b=sp2.platforms[pl];
                    const lbl=PLAT_LABEL[pl]||pl;
                    return(
                      <div key={pl} style={{display:"grid",gridTemplateColumns:isMobile?"minmax(76px,1fr) minmax(100px,0.9fr) minmax(76px,1fr)":"minmax(130px,1fr) minmax(150px,0.8fr) minmax(130px,1fr)",alignItems:"stretch",gap:0,background:isDark?(i%2?"#121612":"#0F120F"):(i%2?"#FBFAF7":"#FFF"),borderBottom:i===PLATS_FOR.length-1?"none":"1px solid "+(isDark?"#2F352F":"#EEEAE1")}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:isMobile?"9px 6px":"11px 12px",fontFamily:F,fontSize:isMobile?"12px":"13px",fontWeight:900,color:a?GOLD:(isDark?"#68716B":"#B8BDB8")}}>{a?"#"+a:"—"}</div>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center",padding:isMobile?"9px 5px":"11px 10px",borderLeft:"1px solid "+(isDark?"#2F352F":"#EEEAE1"),borderRight:"1px solid "+(isDark?"#2F352F":"#EEEAE1"),fontFamily:F,fontSize:isMobile?"9px":"9.5px",fontWeight:850,color:PC[pl]||GOLD,letterSpacing:"0.6px",textTransform:"uppercase",lineHeight:1.25}}>{lbl}</div>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:isMobile?"9px 6px":"11px 12px",fontFamily:F,fontSize:isMobile?"12px":"13px",fontWeight:900,color:b?(isDark?"#72A7E8":"#1565C0"):(isDark?"#68716B":"#B8BDB8")}}>{b?"#"+b:"—"}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
              </AnalyticsDeepSection>
            </>)}
          </div>
          {/* Stats row */}
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)",gap:"10px",marginBottom:"20px"}}>
            {[
              {l:"Chart Depth",v:analyticsRowsFor(anMonth).length,c:GOLD,s:`${releaseLabelLower} in Top 50 combined`},
              {l:"New Entries",v:mvData.new,c:"#2DB04A",s:"not in prev month"},
              {l:"Re-Entries",v:mvData.ret,c:"#1565C0",s:"returned to chart"},
              {l:"Platforms",v:tp,c:"#7B1FA2",s:`tracked for ${chartTypeLabel.toLowerCase()}`},
              {l:"Cross-Platform Hits",v:xHitsCount,c:"#00897B",s:`on all ${tp} platforms`},
              {l:"Chart Leader",v:anLeader?.title||"—",s:anLeader?.artist||"",compact:true,c:GOLD},
            ].map((s,i)=>(
              <div key={i} style={card({padding:isMobile?"15px":"18px"})}><div style={{...secLbl(s.c),marginBottom:"6px"}}>{s.l}</div><div style={{fontSize:s.compact?(isMobile?"14px":"16px"):(isMobile?"24px":"28px"),fontWeight:900,color:s.c,lineHeight:1.2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.v}</div><div style={{fontSize:isMobile?"10.5px":"10px",color:"#59645D",fontFamily:F,lineHeight:1.35}}>{s.s}</div></div>
            ))}
          </div>
          {/* Top 10 + Platform #1s */}
          <AnalyticsDeepSection label={isArtists ? "View top artists and platform #1s" : (isSingles?"View top songs and platform #1s":"View top albums and platform #1s")} isMobile={isMobile}>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:isMobile?"18px":"14px",marginBottom:"20px"}} className="anl-2col">
            <div style={card()}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",marginBottom:"14px",flexWrap:"wrap"}}>
                <div style={{...secLbl(),marginBottom:0}}><SecMark/>Top 10 {releaseLabel} — {anMonth}</div>
                <ViewToggle id="topReleases" />
              </div>
              {viewMode("topReleases")==="table" || isMobile ? (
                <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                  {top10sData.map((e,i)=>(
                    <div key={e.name} style={{display:"grid",gridTemplateColumns:"28px minmax(0,1fr) 86px",alignItems:"center",gap:"10px",padding:"9px 0",borderBottom:"1px solid #F0F0EC"}}>
                      <div style={{fontFamily:F,fontSize:"12px",fontWeight:900,color:i<3?MEDALS[i]:"#B8BDB8",textAlign:"center"}}>{i+1}</div>
                      <button type="button" onClick={()=>openReleaseDetails(e,isArtists ? "artist" : (isSingles?"single":"album"))} style={{border:0,background:"transparent",padding:0,textAlign:"left",fontFamily:SF,fontSize:"13px",fontWeight:800,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",cursor:"pointer"}}>{e.name}</button>
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
                      <button type="button" onClick={()=>openReleaseDetails({title:d.t,artist:d.a,primary_artist:d.primary_artist,featured_artists:d.featured_artists,is_artist_entry:d.is_artist_entry,type:d.type},isArtists ? "artist" : (isSingles?"single":"album"))} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:isMobile?"13px":"11.5px",fontWeight:800,lineHeight:1.2,cursor:"pointer",textAlign:"left"}}>{d.t}</button>
                      <div style={{fontSize:isMobile?"11px":"10px",color:"#59645D",fontFamily:F,marginTop:"3px"}}>{d.a}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          </AnalyticsDeepSection>
          {/* Top artists points line chart */}
          <AnalyticsDeepSection label="View artist trajectory" isMobile={isMobile}>
          <div style={{...card(),marginBottom:"20px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",marginBottom:"14px",flexWrap:"wrap"}}>
              <div style={{...secLbl(),marginBottom:0}}><SecMark/>Top 3 Artists — Points Trajectory ({chartTypeLabel})</div>
              <ViewToggle id="artistTrajectory" />
            </div>
            {viewMode("artistTrajectory")==="table" ? (
              <div style={{display:"grid",gap:"8px"}}>
                {topArtistTrajectoryArtists.map((artist,i)=>(
                  <div key={artist.n} style={{display:"grid",gridTemplateColumns:isMobile?"minmax(0,1fr) 82px":"minmax(0,1fr) repeat(3,80px)",gap:"8px",alignItems:"center",padding:"9px 0",borderBottom:"1px solid "+(isDark?"#2F352F":"#F0F0EC")}}>
                    <button type="button" onClick={()=>openArtistDetails(artist.n)} style={{border:0,background:"transparent",padding:0,textAlign:"left",fontFamily:SF,fontSize:TXT.cardTitle,fontWeight:850,color:CC[i],cursor:"pointer",whiteSpace:"normal",overflowWrap:"anywhere"}}>{artist.n}</button>
                    <span style={{fontFamily:F,fontSize:"12px",fontWeight:900,color:GOLD,textAlign:isMobile?"right":"center"}}>{artist.p.toLocaleString()}</span>
                    {!isMobile&&<span style={{fontFamily:F,fontSize:"12px",fontWeight:850,color:isDark?"#D7DBD7":"#59645D",textAlign:"center"}}>{artist.m} mo</span>}
                    {!isMobile&&<span style={{fontFamily:F,fontSize:"12px",fontWeight:850,color:isDark?"#D7DBD7":"#59645D",textAlign:"center"}}>Peak #{artist.pk}</span>}
                  </div>
                ))}
              </div>
            ) : (
            <div className="ngoma-analytics-chart-scroll" aria-label="Scrollable artist trajectory chart">
              <div style={{minWidth:"100%",height:isMobile?270:240}}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={topArtistsLine} margin={{top:10,right:24,left:8,bottom:4}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC"/>
                    <XAxis dataKey="month" interval={0} tick={{fontSize:11,fontFamily:F,fill:"#59645D",fontWeight:650}} tickLine={false}/>
                    <YAxis tick={{fontSize:10.5,fontFamily:F,fill:"#59645D",fontWeight:650}} tickFormatter={v=>v.toLocaleString()} axisLine={false} tickLine={false}/>
                    <Tooltip formatter={(v,n)=>[v.toLocaleString()+" pts",n]} contentStyle={{fontFamily:F,fontSize:11}}/>
                    <Legend wrapperStyle={{fontFamily:F,fontSize:isMobile?11:10.5,color:"#59645D"}}/>
                    {topArtistTrajectoryArtists.map((a,i)=>(
                      <Line key={a.n} type="monotone" dataKey={a.n} stroke={CC[i]} strokeWidth={2} dot={{r:4}} activeDot={{r:6}}/>
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            )}
          </div>
          </AnalyticsDeepSection>
          {/* Cross-platform overlap + Coverage pie */}
          <AnalyticsDeepSection label="View platform reach" isMobile={isMobile}>
          <div className="anl-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginBottom:"20px"}}>
            <div style={card()}>
              <div style={secLbl()}><SecMark/>Cross-Platform Reach — {anMonth}</div>
              <p style={{fontFamily:F,fontSize:"10px",color:"#59645D",margin:"-4px 0 12px",lineHeight:1.45}}>{releaseLabel} charting on most platforms simultaneously.</p>
              {crossPlatformRows.slice(0,8).map((s,i)=>{
                const certification = isArtists ? null : getCertificationForEntry(s, isSingles ? "single" : "album");
                return (
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",padding:"7px 0",borderBottom:"1px solid #F0F0EC"}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
                      <button type="button" onClick={()=>openReleaseDetails(s,isArtists ? "artist" : (isSingles?"single":"album"))} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:isMobile?"13px":"12px",fontWeight:800,cursor:"pointer",textAlign:"left"}}>{s.t}</button>
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
              <div style={{display:"flex",justifyContent:"flex-end",margin:"-4px 0 12px"}}><ViewToggle id="platformTotals" /></div>
              {viewMode("platformTotals")==="table" ? (
                <div style={{display:"grid",gap:"8px"}}>
                  {platTotalsData.map((entry)=>(
                    <div key={entry.platform} style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 70px",gap:"10px",alignItems:"center",padding:"9px 0",borderBottom:"1px solid "+(isDark?"#2F352F":"#F0F0EC")}}>
                      <div style={{display:"flex",alignItems:"center",gap:"8px",minWidth:0}}><span style={{width:"10px",height:"10px",borderRadius:"3px",background:entry.color,flexShrink:0}}/><span style={{fontFamily:F,fontSize:"12px",fontWeight:850,color:isDark?"#F6F3EA":"#1A1A1A",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{entry.platform}</span></div>
                      <span style={{fontFamily:F,fontSize:"13px",fontWeight:900,color:GOLD,textAlign:"right"}}>{entry.entries}</span>
                    </div>
                  ))}
                </div>
              ) : (
              <ResponsiveContainer width="100%" height={isMobile?230:200}>
                <BarChart data={platTotalsData} margin={{top:12,right:isMobile?16:20,left:isMobile?0:8,bottom:isMobile?6:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC"/>
                  <XAxis dataKey="platform" tick={isMobile?false:{fontSize:10,fontFamily:F,fill:"#59645D",fontWeight:650}} tickLine={false}/>
                  <YAxis domain={[0,50]} allowDecimals={false} tick={{fontSize:isMobile?10.5:10,fontFamily:F,fill:"#59645D",fontWeight:650}} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{fontFamily:F,fontSize:11}} formatter={v=>[v,"Combined entries"]}/>
                  <Bar dataKey="entries" radius={[4,4,0,0]}>{platTotalsData.map((e,i)=><Cell key={i} fill={e.color}/>)}</Bar>
                </BarChart>
              </ResponsiveContainer>
              )}
              {isMobile&&<div style={{display:"flex",justifyContent:"center",gap:"8px 12px",flexWrap:"wrap",marginTop:"10px"}}>{platTotalsData.map((entry)=><div key={entry.platform} style={{display:"inline-flex",alignItems:"center",gap:"5px",fontFamily:F,fontSize:"10px",fontWeight:750,color:"#59645D"}}><span style={{width:"9px",height:"9px",borderRadius:"3px",background:entry.color,flexShrink:0}}/>{entry.platform}</div>)}</div>}
            </div>
            </AnalyticsDeepSection>
          )}
          {/* Feature + unique platform + country analytics */}
          <AnalyticsDeepSection label="View feature analytics" isMobile={isMobile}>
          <div className="anl-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginBottom:"20px"}}>
            <div style={card()}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",marginBottom:"14px",flexWrap:"wrap"}}>
                <div style={{...secLbl(),marginBottom:0}}><SecMark/>Feature Impact — {chartTypeLabel}</div>
                <ViewToggle id="features" />
              </div>
              {viewMode("features")==="table" ? (
                <div style={{display:"grid",gap:"8px"}}>
                  {featureAnalytics.releases.slice(0,6).map((entry)=>(
                    <div key={`${entry.title}-${entry.artist}`} style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 70px",gap:"10px",alignItems:"center",padding:"9px 0",borderBottom:"1px solid "+(isDark?"#2F352F":"#F0F0EC")}}>
                      <div style={{minWidth:0}}><button type="button" onClick={()=>openReleaseDetails(entry,isSingles?"single":"album")} style={{border:0,background:"transparent",padding:0,textAlign:"left",fontFamily:SF,fontSize:TXT.cardTitle,fontWeight:850,color:isDark?"#F6F3EA":"#050505",cursor:"pointer",whiteSpace:"normal",overflowWrap:"anywhere"}}>{entry.title}</button><div style={{fontFamily:F,fontSize:"10.5px",color:isDark?"#AEB6AE":"#69716B",marginTop:"2px"}}>{entry.featured_artists}</div></div>
                      <span style={{fontFamily:F,fontSize:"13px",fontWeight:900,color:GOLD,textAlign:"right"}}>{entry.points.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={featureAnalytics.monthly} margin={{top:10,right:18,left:0,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC"/>
                    <XAxis dataKey="month" tick={{fontSize:10.5,fontFamily:F,fill:"#59645D"}}/>
                    <YAxis allowDecimals={false} tick={{fontSize:10,fontFamily:F,fill:"#59645D"}}/>
                    <Tooltip contentStyle={{fontFamily:F,fontSize:11}} formatter={(v,n)=>[v,n==="entries"?"Featured entries":"Feature points"]}/>
                    <Bar dataKey="entries" fill={GOLD} radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              )}
              <div style={{marginTop:"12px",fontFamily:F,fontSize:"10.5px",color:isDark?"#AEB6AE":"#69716B",lineHeight:1.45}}>Top featured artists: {featureAnalytics.artists.slice(0,3).map((item)=>`${item.name} (${item.points.toLocaleString()} pts)`).join(" · ") || "No features recorded"}</div>
            </div>
            <div style={card()}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",marginBottom:"14px",flexWrap:"wrap"}}>
                <div style={{...secLbl(),marginBottom:0}}><SecMark/>Top 5 Countries — {anMonth}</div>
                <ViewToggle id="topCountries" />
              </div>
              {viewMode("topCountries")==="table" ? (
                <div style={{display:"grid",gap:"8px"}}>
                  {topCountryData.map((country)=>(
                    <div key={country.code} style={{display:"grid",gridTemplateColumns:"54px minmax(0,1fr) 72px",gap:"10px",alignItems:"center",padding:"9px 0",borderBottom:"1px solid "+(isDark?"#2F352F":"#F0F0EC")}}>
                      <span style={{fontFamily:F,fontSize:"11px",fontWeight:950,color:country.color}}>{country.code}</span>
                      <span style={{fontFamily:F,fontSize:"12px",fontWeight:850,color:isDark?"#F6F3EA":"#1A1A1A",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{country.country}</span>
                      <span style={{fontFamily:F,fontSize:"12px",fontWeight:900,color:GOLD,textAlign:"right"}}>{country.entries}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={topCountryData} layout="vertical" margin={{left:8,right:16,top:0,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC" horizontal={false}/>
                    <XAxis type="number" allowDecimals={false} tick={{fontSize:10,fontFamily:F,fill:"#59645D"}}/>
                    <YAxis type="category" dataKey="code" width={38} tick={{fontSize:11,fontFamily:F,fill:"#59645D",fontWeight:850}}/>
                    <Tooltip contentStyle={{fontFamily:F,fontSize:11}} formatter={(v,n)=>[v,n==="entries"?"Entries":"Points"]}/>
                    <Bar dataKey="entries" radius={[0,4,4,0]}>{topCountryData.map((entry)=><Cell key={entry.code} fill={entry.color}/>)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          </AnalyticsDeepSection>
          <AnalyticsDeepSection label="View unique platform entries" isMobile={isMobile}>
          <div style={{...card(),marginBottom:"20px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",marginBottom:"14px",flexWrap:"wrap"}}>
              <div style={{...secLbl(),marginBottom:0}}><SecMark/>Platform-Unique Entries — {anMonth}</div>
              <ViewToggle id="uniquePlatforms" />
            </div>
            {viewMode("uniquePlatforms")==="table" ? (
              <div className="anl-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                {uniquePlatformData.map((platform)=>(
                  <div key={platform.platform} style={{padding:"12px",border:"1px solid "+(isDark?"#2F352F":"#EFEDE7"),borderRadius:"12px",background:isDark?"#0F120F":"#FAFAF8"}}>
                    <div style={{fontFamily:F,fontSize:"10px",fontWeight:900,letterSpacing:"1px",textTransform:"uppercase",color:platform.color,marginBottom:"8px"}}>{platform.label} · {platform.count}</div>
                    {platform.entries.slice(0,4).map((entry)=>(
                      <div key={`${entry.title}-${entry.artist}`} style={{padding:"6px 0",borderBottom:"1px solid "+(isDark?"#2F352F":"#F0F0EC")}}>
                        <button type="button" onClick={()=>openReleaseDetails(entry,isSingles?"single":"album")} style={{border:0,background:"transparent",padding:0,textAlign:"left",fontFamily:SF,fontSize:"12px",fontWeight:850,color:isDark?"#F6F3EA":"#050505",cursor:"pointer"}}>{entry.title}</button>
                        <div style={{fontFamily:F,fontSize:"10px",color:isDark?"#AEB6AE":"#69716B"}}>#{entry.rank} · {entry.artist}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={uniquePlatformData} margin={{top:10,right:18,left:0,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC"/>
                  <XAxis dataKey="label" tick={isMobile?false:{fontSize:10,fontFamily:F,fill:"#59645D"}}/>
                  <YAxis allowDecimals={false} tick={{fontSize:10,fontFamily:F,fill:"#59645D"}}/>
                  <Tooltip contentStyle={{fontFamily:F,fontSize:11}} formatter={v=>[v,"Unique entries"]}/>
                  <Bar dataKey="count" radius={[4,4,0,0]}>{uniquePlatformData.map((entry)=><Cell key={entry.platform} fill={entry.color}/>)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          </AnalyticsDeepSection>
          {/* Local vs International */}
          {(()=>{
            const cd=analyticsRowsFor(anMonth);
            let local=0,intl=0,localPts=0,intlPts=0;
            cd.forEach(e=>{if(getArtistCountry(e).code==="KE"){local++;localPts+=e.pts;}else{intl++;intlPts+=e.pts;}});
            const pieData=[{name:"Kenyan",value:local,color:GOLD},{name:"International",value:intl,color:"#37474F"}];
            return(
              <AnalyticsDeepSection label="View local vs international" isMobile={isMobile}>
              <div style={{...card(),marginBottom:"20px"}}>
                <div style={secLbl()}><SecMark/>Local vs International — {anMonth}</div>
                <p style={{fontFamily:F,fontSize:TXT.note,color:"#69716B",margin:"-6px 0 14px",lineHeight:1.45}}>Share of the current Top 50 entries by primary artist country.</p>
                <div style={{display:"flex",justifyContent:"flex-end",margin:"-4px 0 12px"}}><ViewToggle id="localMix" /></div>
                {viewMode("localMix")==="table" ? (
                  <div style={{display:"grid",gap:"8px"}}>
                    {[{l:"Kenyan Artists",c:local,p:localPts,col:GOLD},{l:"International",c:intl,p:intlPts,col:"#37474F"}].map((r)=>(
                      <div key={r.l} style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 58px 88px",gap:"10px",alignItems:"center",padding:"9px 0",borderBottom:"1px solid "+(isDark?"#2F352F":"#F0F0EC")}}>
                        <div style={{display:"flex",alignItems:"center",gap:"7px",minWidth:0}}><span style={{width:"11px",height:"11px",borderRadius:"3px",background:r.col,flexShrink:0}}/><span style={{fontFamily:F,fontSize:"12px",fontWeight:850,color:isDark?"#F6F3EA":"#1A1A1A",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.l}</span></div>
                        <span style={{fontFamily:F,fontSize:"12px",fontWeight:900,color:r.col,textAlign:"right"}}>{r.c}</span>
                        <span style={{fontFamily:F,fontSize:"12px",fontWeight:850,color:isDark?"#D7DBD7":"#59645D",textAlign:"right"}}>{r.p.toLocaleString()} pts</span>
                      </div>
                    ))}
                  </div>
                ) : (
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
                )}
              </div>
              </AnalyticsDeepSection>
            );
          })()}
          {/* Climbers & Fallers */}
          <AnalyticsDeepSection label={isArtists ? "View top artist climbers and biggest drops" : (isSingles ? "View top song climbers and biggest drops" : "View top album climbers and biggest drops")} isMobile={isMobile}>
          <div className="anl-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginBottom:"20px"}}>
            <div style={card()}>
              <div style={secLbl("#2DB04A")}><SecMark c="#2DB04A"/>Top {releaseLabel} Climbers — {anMonth}</div>
              {mvData.risers.map((s,i)=>{
                const certification = isArtists ? null : getCertificationForEntry(s, isSingles ? "single" : "album");
                return (
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",padding:isMobile?"8px 0":"6px 0",borderBottom:"1px solid #F0F0EC"}}>
                  <div style={{minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
                      <button type="button" onClick={()=>openReleaseDetails(s,isArtists ? "artist" : (isSingles?"single":"album"))} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:TXT.cardTitle,fontWeight:800,lineHeight:1.15,cursor:"pointer",textAlign:"left"}}>{s.t}</button>
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
                const certification = isArtists ? null : getCertificationForEntry(s, isSingles ? "single" : "album");
                return (
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",padding:isMobile?"8px 0":"6px 0",borderBottom:"1px solid #F0F0EC"}}>
                  <div style={{minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
                      <button type="button" onClick={()=>openReleaseDetails(s,isArtists ? "artist" : (isSingles?"single":"album"))} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:TXT.cardTitle,fontWeight:800,lineHeight:1.15,cursor:"pointer",textAlign:"left"}}>{s.t}</button>
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
          </AnalyticsDeepSection>
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
          <AnalyticsDeepSection label={isArtists ? "View artist rank journey" : (isSingles?"View song rank journey":"View album rank journey")} isMobile={isMobile}>
          <div style={card()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",marginBottom:"14px",flexWrap:"wrap"}}>
              <div style={{...secLbl(),marginBottom:0}}><SecMark/>{isArtists ? "Top Artists Rank Journey Across Months" : (isSingles?"Top Songs Rank Journey Across Months":"Top Albums Rank Journey Across Months")}</div>
              <ViewToggle value={rankJourneyView} onChange={setRankJourneyView} />
            </div>
            {rankJourneyView==="graph" ? (
              <div className="ngoma-analytics-chart-scroll" aria-label="Scrollable rank journey graph">
                <div style={{minWidth:"100%",height:320}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={rankJourneyMonths.map((m)=>{const row={month:m.split(" ")[0].slice(0,3)};tracked.forEach((title)=>{row[title]=analyticsRowsFor(m).find((entry)=>entry.title===title)?.rank||null;});return row;})} margin={{top:10,right:24,left:8,bottom:8}}>
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
            isMobile ? (
            <div style={{display:"grid",gap:"12px"}}>
            {tracked.map(title=>{
              const hasAny=rankJourneyMonths.some(m=>analyticsRowsFor(m).find(e=>e.title===title));
              if(!hasAny)return null;
              return(<div key={title} style={{padding:"12px",border:"1px solid "+(isDark?"#2F352F":"#EFEDE7"),borderRadius:"12px",background:isDark?"#0F120F":"#FAFAF8"}}>
                <button type="button" onClick={()=>{const e=rankJourneyMonths.flatMap(m=>analyticsRowsFor(m)).find(x=>x.title===title);if(e)openReleaseDetails(e,isArtists ? "artist" : (isSingles?"single":"album"));}} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:"13px",fontWeight:850,lineHeight:1.2,color:GOLD,cursor:"pointer",textAlign:"left",whiteSpace:"normal",overflowWrap:"anywhere"}}>{title}</button>
                <div style={{display:"flex",flexWrap:"wrap",gap:"7px",marginTop:"10px"}}>
                  {rankJourneyMonths.map(m=>{const e=analyticsRowsFor(m).find(x=>x.title===title);return(<div key={m} style={{minWidth:"44px",padding:"6px 7px",borderRadius:"9px",background:isDark?"#121612":"#FFF",border:"1px solid "+(isDark?"#2F352F":"#EFEDE7"),textAlign:"center",fontFamily:F}}>
                    <div style={{fontSize:"8.5px",color:isDark?"#AEB6AE":"#69716B",fontWeight:800}}>{m.split(" ")[0].slice(0,3)}</div>
                    {e?<div style={{fontSize:"12px",fontWeight:900,color:e.rank===1?GOLD:isDark?"#F6F3EA":"#1A1A1A"}}>#{e.rank}</div>:<div style={{fontSize:"11px",color:isDark?"#68716B":"#C9CEC9"}}>—</div>}
                  </div>);})}
                </div>
              </div>);
            })}
            </div>
            ) : (
            <div className="ngoma-analytics-chart-scroll" aria-label="Scrollable rank journey table">
            <div style={{minWidth:isMobile?"760px":"100%"}}>
            {tracked.map(title=>{
              const hasAny=rankJourneyMonths.some(m=>analyticsRowsFor(m).find(e=>e.title===title));
              if(!hasAny)return null;
              return(<div key={title} style={{display:"grid",gridTemplateColumns:`minmax(${isMobile?180:220}px,1fr) repeat(${rankJourneyMonths.length},44px)`,alignItems:"center",padding:"8px 0",borderBottom:"1px solid #F0F0EC",gap:"8px"}}>
                <div style={{minWidth:0,display:"flex",alignItems:"center",gap:"7px"}}>
                  <button type="button" onClick={()=>{const e=rankJourneyMonths.flatMap(m=>analyticsRowsFor(m)).find(x=>x.title===title);if(e)openReleaseDetails(e,isArtists ? "artist" : (isSingles?"single":"album"));}} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:isMobile?"12.5px":"11.5px",fontWeight:800,lineHeight:1.2,color:GOLD,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",cursor:"pointer"}}>{title}</button>
                  {(()=>{const e=rankJourneyMonths.flatMap(m=>analyticsRowsFor(m)).find(x=>x.title===title);const certification=e?isArtists ? null : getCertificationForEntry(e,isSingles?"single":"album"):null;return certification?<CertificationTag cert={certification} compact />:null;})()}
                </div>
                {rankJourneyMonths.map(m=>{const e=analyticsRowsFor(m).find(x=>x.title===title);return(<div key={m} style={{width:"44px",textAlign:"center",fontFamily:F}}>
                  <div style={{fontSize:isMobile?"9px":"8.5px",color:"#69716B",fontWeight:700}}>{m.split(" ")[0].slice(0,3)}</div>
                  {e?<div style={{fontSize:"14px",fontWeight:800,color:e.rank===1?GOLD:e.rank<=3?"#1A1A1A":"#888"}}>#{e.rank}</div>:<div style={{fontSize:"11px",color:"#E0E0DC"}}>—</div>}
                </div>);})}
              </div>);
            })}
            </div>
            </div>
            )
            )}
          </div>
          </AnalyticsDeepSection>
        </div>
  );
}
