import { useState } from "react";
import EntryThumb from "../components/EntryThumb.jsx";
import ArtistCredit from "../components/ArtistCredit.jsx";

export default function HeadToHeadPage({ ctx }) {
  const {
    AnalyticsDeepSection,
    Bar,
    BarChart,
    CartesianGrid,
    CertificationTag,
    F,
    GOLD,
    GOLD_TEXTURE_URL,
    Line,
    LineChart,
    MONTHS,
    PAD,
    PC,
    PLATS_FOR,
    PLAT_LABEL,
    ResponsiveContainer,
    SF,
    SecMark,
    Tog,
    Tooltip,
    XAxis,
    YAxis,
    allTitles,
    card,
    cmpS1,
    cmpS2,
    getCertificationForEntry,
    isArtists,
    isDark,
    isMobile,
    isSingles,
    openArtistDetails,
    openReleaseDetails,
    secLbl,
    setCmpS1,
    setCmpS2,
    songRankData,
    sp1,
    sp2,
    tp,
  } = ctx;

  const [platCompareView, setPlatCompareView] = useState("table");

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
              <div style={{display:"inline-block",width:"28px",height:"3px",background:isDark?"#FFFFFF":"#000000",borderRadius:"2px",marginBottom:"10px"}}/>
              <h2 style={{fontSize:isMobile?"22px":"28px",fontWeight:900,margin:"0 0 4px",letterSpacing:"-0.5px",color:isDark?"#FFFFFF":"#000000"}}>Head-to-Head</h2>
              <p style={{fontFamily:F,fontSize:"14px",color:isDark?"#FFFFFF":"#000000",margin:0,lineHeight:1.6}}>Compare two {isArtists ? "artists" : (isSingles?"songs":"albums")} across points, rank, platforms, and chart history.</p>
            </div>
            <div style={{display:"flex",gap:"10px",flexDirection:"row",alignItems:"center",flexShrink:0,flexWrap:"wrap"}}>
              <Tog sm/>
            </div>
          </div>

          <div style={{...card(),padding:isMobile?"16px":"18px",background:isDark?"#0F120F":"linear-gradient(135deg,#FAFAF8,#FFFFFF)",borderColor:isDark?"#2F352F":"#EFEDE7"}}>
            <div style={{...secLbl(isDark?"#FFFFFF":"#000000"), fontSize:"20px"}}><SecMark c={isDark?"#FFFFFF":"#000000"}/>{isArtists ? "Artist" : (isSingles?"Song":"Album")} Head-to-Head</div>
            <p style={{fontFamily:F,fontSize:"13px",color:isDark?"#FFFFFF":"#000000",margin:"-8px 0 14px",lineHeight:1.45}}>Compare two {isArtists ? "artists" : (isSingles?"songs":"albums")} across points, rank, platforms, and chart history.</p>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"minmax(0,1fr) auto minmax(0,1fr)",gap:isMobile?"10px":"12px",alignItems:"center",marginBottom:isMobile?"14px":"14px"}}>
              <div style={{minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:"5px",fontFamily:F,fontSize:"9px",fontWeight:900,letterSpacing:"1.2px",textTransform:"uppercase",color:isDark?"#FFFFFF":"#000000",marginBottom:"6px"}}>
                  <span style={{width:"6px",height:"6px",borderRadius:"50%",background:GOLD,flexShrink:0}}/>
                  {isArtists ? "Artist" : (isSingles?"Song":"Album")} One
                </div>
                <select value={cmpS1} onChange={e=>setCmpS1(e.target.value)} title={sp1?(isArtists?sp1.title:`${sp1.title} — ${sp1.artist}`):""} style={{width:"100%",minWidth:0,padding:isMobile?"11px 12px":"8px 10px",border:"1.5px solid "+(isDark?"#3A3F3A":"#DEDAD2"),borderRadius:"8px",background:"#FFF",fontSize:isMobile?"12px":"11px",fontFamily:F,fontWeight:700,cursor:"pointer",outline:"none",color:"#1F241F"}}>
                  {allTitles.map(t=><option key={t.key} value={t.key}>{t.title} — {t.artist}</option>)}
                </select>
                {isMobile&&sp1&&<div style={{marginTop:"7px",padding:"8px 10px",borderRadius:"9px",background:isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.04)",fontFamily:F,lineHeight:1.35,color:"#1F241F",overflowWrap:"anywhere"}}><strong style={{display:"block",fontSize:"12px"}}>{sp1.title}</strong>{!isArtists && <span style={{display:"block",marginTop:"2px"}}><ArtistCredit credit={sp1.artist} onOpenArtist={openArtistDetails} isDark={isDark} fontFamily={F} fontSize="11px" fontWeight={400} color="#000000" darkColor="#FFFFFF" separatorColor="#000000" darkSeparatorColor="#FFFFFF" /></span>}</div>}
              </div>
              <span style={{fontFamily:F,fontSize:"11px",color:isDark?"#FFFFFF":"#000000",fontWeight:900,textAlign:"center",letterSpacing:"1px",textTransform:"uppercase",background:isDark?"#1A1E1A":"#F0EDE6",padding:"5px 12px",borderRadius:"999px",whiteSpace:"nowrap",alignSelf:"center"}}>vs</span>
              <div style={{minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:"5px",fontFamily:F,fontSize:"9px",fontWeight:900,letterSpacing:"1.2px",textTransform:"uppercase",color:isDark?"#FFFFFF":"#000000",marginBottom:"6px"}}>
                  <span style={{width:"6px",height:"6px",borderRadius:"50%",background:"#1565C0",flexShrink:0}}/>
                  {isArtists ? "Artist" : (isSingles?"Song":"Album")} Two
                </div>
                <select value={cmpS2} onChange={e=>setCmpS2(e.target.value)} title={sp2?(isArtists?sp2.title:`${sp2.title} — ${sp2.artist}`):""} style={{width:"100%",minWidth:0,padding:isMobile?"11px 12px":"8px 10px",border:"1.5px solid "+(isDark?"#3A3F3A":"#DEDAD2"),borderRadius:"8px",background:"#FFF",fontSize:isMobile?"12px":"11px",fontFamily:F,fontWeight:700,cursor:"pointer",outline:"none",color:"#1F241F"}}>
                  {allTitles.map(t=><option key={t.key} value={t.key}>{t.title} — {t.artist}</option>)}
                </select>
                {isMobile&&sp2&&<div style={{marginTop:"7px",padding:"8px 10px",borderRadius:"9px",background:isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.04)",fontFamily:F,lineHeight:1.35,color:"#1F241F",overflowWrap:"anywhere"}}><strong style={{display:"block",fontSize:"12px"}}>{sp2.title}</strong>{!isArtists && <span style={{display:"block",marginTop:"2px"}}><ArtistCredit credit={sp2.artist} onOpenArtist={openArtistDetails} isDark={isDark} fontFamily={F} fontSize="11px" fontWeight={400} color="#000000" darkColor="#FFFFFF" separatorColor="#000000" darkSeparatorColor="#FFFFFF" /></span>}</div>}
              </div>
            </div>
            {sp1&&sp2&&(<>
              {/* Title cards */}
              <div className="anl-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:isMobile?"14px":"20px",marginBottom:isMobile?"16px":"22px"}}>
                {[{d:sp1,c:isDark?"#FFFFFF":"#000000",accent:GOLD},{d:sp2,c:isDark?"#FFFFFF":"#000000",accent:"#1565C0"}].map(({d,c,accent},i)=>(
                  <div key={i} style={{padding:isMobile?"18px 16px":"24px 22px",background:isDark?"#12150F":"#FFFFFF",borderRadius:"14px",border:"1px solid "+(isDark?"#2F352F":"#E9E5DC"),borderLeft:"4px solid "+accent,minWidth:0,boxShadow:isDark?"none":"0 6px 20px rgba(31,36,31,0.05)"}}>
                    <div style={{display:"flex",alignItems:"flex-start",gap:"14px",minWidth:0}}>
                    <EntryThumb item={d} name={isArtists?d.title:d.artist} isArtist={isArtists} size={isMobile?60:76} accent={accent} />
                    <div style={{minWidth:0,flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:"7px",flexWrap:"wrap",minWidth:0}}>
                      <button type="button" onClick={()=>openReleaseDetails(d,isArtists ? "artist" : (isSingles?"single":"album"))} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:isMobile?"16px":"18px",fontWeight:800,lineHeight:1.25,whiteSpace:isMobile?"normal":"nowrap",overflow:isMobile?"visible":"hidden",textOverflow:isMobile?"clip":"ellipsis",overflowWrap:"anywhere",minWidth:0,cursor:"pointer",textAlign:"left",color:isDark?"#FFFFFF":"#000000"}}>{d.title}</button>
                    </div>
                    {!isArtists && <button type="button" onClick={(event)=>{event.stopPropagation();openArtistDetails(d.artist);}} style={{display:"block",maxWidth:"100%",fontFamily:F,fontSize:"13px",color:isDark?"#FFFFFF":"#000000",marginTop:"5px",padding:0,border:0,background:"transparent",fontWeight:700,whiteSpace:isMobile?"normal":"nowrap",overflow:isMobile?"visible":"hidden",textOverflow:isMobile?"clip":"ellipsis",overflowWrap:"anywhere",cursor:"pointer",textAlign:"left"}}>{d.artist}</button>}
                    </div>
                    </div>
                    {isMobile&&<button type="button" onClick={()=>openReleaseDetails(d,isArtists ? "artist" : (isSingles?"single":"album"))} style={{marginTop:"12px",border:"1px solid "+accent+"55",borderRadius:"999px",background:isDark?"rgba(255,255,255,0.04)":"#FFF",color:accent,fontFamily:F,fontSize:"11px",fontWeight:900,letterSpacing:"1px",textTransform:"uppercase",padding:"8px 12px",cursor:"pointer"}}>View Details</button>}
                    <div style={{display:"flex",gap:isMobile?"18px":"28px",marginTop:isMobile?"16px":"20px",paddingTop:isMobile?"14px":"18px",borderTop:"1px solid "+(isDark?"#242923":"#EFEDE7"),flexWrap:"wrap"}}>
                      <div><div style={{fontFamily:F,fontSize:isMobile?"20px":"24px",fontWeight:800,color:c}}>{d.totalPts.toLocaleString()}</div><div style={{fontFamily:F,fontSize:"11px",letterSpacing:"1px",textTransform:"uppercase",color:isDark?"#FFFFFF":"#000000",fontWeight:700,marginTop:"3px"}}>Total Pts</div></div>
                      <div><div style={{fontFamily:F,fontSize:isMobile?"20px":"24px",fontWeight:800,color:c}}>#{d.peak}</div><div style={{fontFamily:F,fontSize:"11px",letterSpacing:"1px",textTransform:"uppercase",color:isDark?"#FFFFFF":"#000000",fontWeight:700,marginTop:"3px"}}>Peak</div></div>
                    </div>
                  </div>
                ))}
              </div>
              <AnalyticsDeepSection label="Detailed Comparison" isMobile={isMobile}>
              {/* Metric comparison table */}
              <div style={{width:"100%",maxWidth:isMobile?"360px":"none",margin:"0 auto 16px",border:"1px solid "+(isDark?"#2F352F":"#E4E1D8"),borderRadius:"12px",overflow:"hidden",background:isDark?"#0F120F":"#FFF",boxShadow:isDark?"none":"0 8px 24px rgba(31,36,31,0.05)"}}>
                <div style={{display:"grid",gridTemplateColumns:isMobile?"minmax(76px,1fr) minmax(100px,0.9fr) minmax(76px,1fr)":"minmax(130px,1fr) minmax(150px,0.8fr) minmax(130px,1fr)",gap:"8px",alignItems:"center",padding:isMobile?"10px 9px":"12px 16px",background:"#1F241F",color:"#FFF"}}>
                  <div style={{fontFamily:F,fontSize:"13px",fontWeight:850,textAlign:"center",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",color:"#FFF"}}>{sp1.title}</div>
                  <div style={{fontFamily:F,fontSize:"11px",fontWeight:900,letterSpacing:"1.2px",textAlign:"center",textTransform:"uppercase",color:"#FFFFFF"}}>Metric</div>
                  <div style={{fontFamily:F,fontSize:"13px",fontWeight:850,textAlign:"center",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",color:"#FFF"}}>{sp2.title}</div>
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
                        <div style={{display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center",padding:isMobile?"12px 6px":"16px 14px",fontFamily:F,fontSize:"16px",fontWeight:aWins?900:800,color:isDark?"#FFFFFF":"#000000",background:"transparent"}}>{r.fmt(r.a)}</div>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center",padding:isMobile?"12px 5px":"16px 10px",borderLeft:"1px solid "+(isDark?"#2F352F":"#EEEAE1"),borderRight:"1px solid "+(isDark?"#2F352F":"#EEEAE1"),fontFamily:F,fontSize:"11px",letterSpacing:"0.8px",textTransform:"uppercase",color:isDark?"#FFFFFF":"#000000",fontWeight:850,lineHeight:1.25}}>{r.label}</div>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center",padding:isMobile?"12px 6px":"16px 14px",fontFamily:F,fontSize:"16px",fontWeight:bWins?900:800,color:isDark?"#FFFFFF":"#000000",background:"transparent"}}>{r.fmt(r.b)}</div>
                      </div>
                    );
                  });
                })()}
              </div>
              {/* Rank trajectory chart */}
              <div style={{marginTop:isMobile?"14px":"0"}}>
                <div style={chartPanel}>
                  <div style={{fontFamily:F,fontSize:isMobile?"10px":"9.5px",fontWeight:800,letterSpacing:"1.4px",textTransform:"uppercase",textAlign:isMobile?"center":"left",color:isDark?"#FFFFFF":"#000000",marginBottom:"8px"}}>Rank Trajectory (lower = better)</div>
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
                  <div style={{fontFamily:F,fontSize:isMobile?"10px":"9.5px",fontWeight:800,letterSpacing:"1.4px",textTransform:"uppercase",color:isDark?"#FFFFFF":"#000000"}}>Peak Rank by Platform</div>
                  <div style={{display:"flex",gap:"6px"}}>
                    {["table","graph"].map(v=>(
                      <button key={v} type="button" onClick={()=>setPlatCompareView(v)} style={{padding:"5px 12px",borderRadius:"999px",border:"1.5px solid "+(platCompareView===v?(isDark?"#363C33":"#1A1A1A"):(isDark?"#2F352F":"#DEDAD2")),background:platCompareView===v?(isDark?"#363C33":"#1A1A1A"):"transparent",color:platCompareView===v?"#FFF":isDark?"#FFFFFF":"#000000",fontFamily:F,fontSize:"10px",fontWeight:800,cursor:"pointer",textTransform:"uppercase",letterSpacing:"0.8px"}}>
                        {v==="table"?"Table":"Chart"}
                      </button>
                    ))}
                  </div>
                </div>
                {platCompareView==="table" ? (
                <div style={{border:"1px solid "+(isDark?"#2F352F":"#E4E1D8"),borderRadius:"12px",overflow:"hidden",background:isDark?"#0F120F":"#FFF"}}>
                  <div style={{display:"grid",gridTemplateColumns:isMobile?"minmax(76px,1fr) minmax(100px,0.9fr) minmax(76px,1fr)":"minmax(130px,1fr) minmax(150px,0.8fr) minmax(130px,1fr)",gap:"8px",padding:isMobile?"10px 9px":"12px 16px",background:"#1F241F",fontFamily:F,fontSize:"11px",fontWeight:850,letterSpacing:"1px",textTransform:"uppercase",color:"#FFFFFF"}}>
                    <div style={{textAlign:"center",color:"#FFF",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{sp1.title.length>16?sp1.title.slice(0,14)+"…":sp1.title}</div>
                    <div style={{textAlign:"center"}}>Platform</div>
                    <div style={{textAlign:"center",color:"#FFF",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{sp2.title.length>16?sp2.title.slice(0,14)+"…":sp2.title}</div>
                  </div>
                  {PLATS_FOR.map((pl,i)=>{
                    const a=sp1.platforms[pl],b=sp2.platforms[pl];
                    const lbl=PLAT_LABEL[pl]||pl;
                    return(
                      <div key={pl} style={{display:"grid",gridTemplateColumns:isMobile?"minmax(76px,1fr) minmax(100px,0.9fr) minmax(76px,1fr)":"minmax(130px,1fr) minmax(150px,0.8fr) minmax(130px,1fr)",alignItems:"stretch",gap:0,background:isDark?(i%2?"#121612":"#0F120F"):(i%2?"#FBFAF7":"#FFF"),borderBottom:i===PLATS_FOR.length-1?"none":"1px solid "+(isDark?"#2F352F":"#EEEAE1")}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:isMobile?"9px 6px":"11px 12px",fontFamily:F,fontSize:"15px",fontWeight:900,color:a?(isDark?"#FFFFFF":"#000000"):(isDark?"#68716B":"#B8BDB8")}}>{a?"#"+a:"—"}</div>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center",padding:isMobile?"9px 5px":"11px 10px",borderLeft:"1px solid "+(isDark?"#2F352F":"#EEEAE1"),borderRight:"1px solid "+(isDark?"#2F352F":"#EEEAE1"),fontFamily:F,fontSize:"11px",fontWeight:850,color:PC[pl]||GOLD,letterSpacing:"0.6px",textTransform:"uppercase",lineHeight:1.25}}>{lbl}</div>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:isMobile?"9px 6px":"11px 12px",fontFamily:F,fontSize:"15px",fontWeight:900,color:b?(isDark?"#FFFFFF":"#000000"):(isDark?"#68716B":"#B8BDB8")}}>{b?"#"+b:"—"}</div>
                      </div>
                    );
                  })}
                </div>
                ) : (
                <div style={{border:"1px solid "+(isDark?"#2F352F":"#E4E1D8"),borderRadius:"12px",overflow:"hidden",background:isDark?"#0F120F":"#FFF",padding:"12px 4px 4px"}}>
                <ResponsiveContainer width="100%" height={isMobile?240:220}>
                  <BarChart
                    data={PLATS_FOR.map(pl=>{
                      const a=sp1.platforms[pl],b=sp2.platforms[pl];
                      return {platform:PLAT_LABEL[pl]||pl,color:PC[pl]||"#888",aVal:a?(51-a):null,bVal:b?(51-b):null,aRank:a,bRank:b};
                    })}
                    margin={{top:10,right:isMobile?12:16,left:isMobile?0:4,bottom:isMobile?28:20}}
                    barGap={4}
                    barCategoryGap="16%"
                  >
                    <defs>
                      <pattern id="h2hGoldTexture" patternUnits="userSpaceOnUse" width={64} height={42}>
                        <image href={GOLD_TEXTURE_URL} x={0} y={0} width={64} height={42} preserveAspectRatio="xMidYMid slice"/>
                      </pattern>
                    </defs>
                    <CartesianGrid stroke={gridStroke} vertical={false}/>
                    <XAxis dataKey="platform" tick={axisTick(isMobile?9:9.5)} tickLine={false} axisLine={false} angle={isMobile?-30:0} textAnchor={isMobile?"end":"middle"}/>
                    <YAxis domain={[0,50]} tick={axisTick(10)} tickFormatter={v=>v===0?"":v===50?"#1":"#"+(51-v)} axisLine={false} tickLine={false} ticks={[0,10,20,30,40,50]}/>
                    <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} formatter={(v,n,p)=>["#"+(51-v),n==="aVal"?sp1.title:sp2.title]} cursor={{fill:barCursorFill}}/>
                    <Bar dataKey="aVal" fill="url(#h2hGoldTexture)" stroke={GOLD} strokeWidth={1} radius={[5,5,0,0]} maxBarSize={64} name="aVal"/>
                    <Bar dataKey="bVal" fill="#1565C0" radius={[5,5,0,0]} maxBarSize={64} name="bVal"/>
                  </BarChart>
                </ResponsiveContainer>
                </div>
                )}
              </div>
              </AnalyticsDeepSection>
            </>)}
          </div>
        </div>
  );
}
