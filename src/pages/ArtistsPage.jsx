export default function ArtistsPage({ ctx }) {
  const {
    CountryBadge,
    F,
    GOLD,
    MEDALS,
    MONTHS,
    PAD,
    SF,
    SecMark,
    TXT,
    Tog,
    allArtistNames,
    artistMonth,
    artistTrendFor,
    artists,
    card,
    cmp1,
    cmp2,
    cmpA1,
    cmpA2,
    expandedArtistRows,
    isDark,
    isMobile,
    openArtistDetails,
    secLbl,
    setArtistMonth,
    setCmpA1,
    setCmpA2,
    toggleArtistRow
  } = ctx;

  return (
<div style={{padding:PAD,background:isDark?"#050505":"#FFF",minHeight:"60vh",boxSizing:"border-box",overflow:"hidden"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:isMobile?"stretch":"flex-end",marginBottom:isMobile?"18px":"22px",gap:isMobile?"14px":"20px",flexDirection:isMobile?"column":"row"}}>
            <div>
              <h2 style={{fontSize:TXT.pageTitle,fontWeight:800,margin:0}}>Top Artists</h2>
              <p style={{fontFamily:F,fontSize:isMobile?"12.5px":"11.5px",color:"#59645D",margin:"5px 0 0",lineHeight:1.6}}>Cumulative credited performance from {MONTHS[0]} through {artistMonth}</p>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:isMobile?"10px":"12px",flexWrap:"wrap"}}>
              <select value={artistMonth} onChange={e=>setArtistMonth(e.target.value)} style={{width:isMobile?"100%":"auto",padding:isMobile?"11px 12px":"8px 12px",border:"1.5px solid "+(isDark?"#3A3F3A":"#DDD"),borderRadius:"9px",background:isDark?"#1A1E1A":"#FFF",color:isDark?"#F6F3EA":"inherit",fontSize:isMobile?"12.5px":"10.5px",fontFamily:F,fontWeight:750,cursor:"pointer",outline:"none"}}>
                {MONTHS.map(m=><option key={m} value={m}>{m}</option>)}
              </select>
              <Tog sm/>
            </div>
          </div>
          {/* Comparison */}
          <div style={{...card(),padding:isMobile?"18px":"22px",marginBottom:"22px",background:isDark?"#111411":"#FAFAF8"}}>
            <div style={{...secLbl(),marginBottom:isMobile?"14px":"16px"}}><SecMark/>Artist Comparison</div>
            <div style={{display:"flex",gap:isMobile?"9px":"12px",alignItems:"center",flexDirection:isMobile?"column":"row",marginBottom:"16px",flexWrap:"wrap"}}>
              <select value={cmpA1} onChange={e=>setCmpA1(e.target.value)} style={{flex:isMobile?"none":1,width:isMobile?"100%":"auto",minWidth:0,padding:isMobile?"11px 12px":"9px 12px",border:"1.5px solid "+(isDark?"#3A3F3A":"#D6D1C7"),borderRadius:"8px",background:isDark?"#1A1E1A":"#FFF",fontSize:isMobile?"12px":"11.5px",fontFamily:F,fontWeight:700,cursor:"pointer",outline:"none",color:isDark?"#F6F3EA":"#1F241F"}}>
                {allArtistNames.map(n=><option key={n} value={n}>{n}</option>)}
              </select>
              <span style={{fontFamily:F,fontSize:isMobile?"11px":"12px",color:"#7B857D",fontWeight:800,flexShrink:0}}>vs</span>
              <select value={cmpA2} onChange={e=>setCmpA2(e.target.value)} style={{flex:isMobile?"none":1,width:isMobile?"100%":"auto",minWidth:0,padding:isMobile?"11px 12px":"9px 12px",border:"1.5px solid "+(isDark?"#3A3F3A":"#D6D1C7"),borderRadius:"8px",background:isDark?"#1A1E1A":"#FFF",fontSize:isMobile?"12px":"11.5px",fontFamily:F,fontWeight:700,cursor:"pointer",outline:"none",color:isDark?"#F6F3EA":"#1F241F"}}>
                {allArtistNames.map(n=><option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="anl-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:isMobile?"10px":"12px",marginBottom:isMobile?"12px":"14px"}}>
              {[{d:cmp1,c:GOLD},{d:cmp2,c:"#1565C0"}].map(({d,c},i)=>(
                <button key={i} type="button" onClick={()=>openArtistDetails(d.n)} style={{padding:isMobile?"13px":"15px",background:isDark?(i===0?"rgba(184,134,11,0.16)":"rgba(21,101,192,0.20)"):c+"0D",borderRadius:"10px",border:isDark?"1px solid "+c+"55":"none",borderLeft:"3px solid "+c,cursor:"pointer",minWidth:0,textAlign:"left"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"8px",minWidth:0}}>
                    <CountryBadge artist={d.n} compact />
                    <div style={{fontFamily:SF,fontSize:isMobile?"15px":"16px",fontWeight:850,lineHeight:1.2,whiteSpace:"normal",overflowWrap:"anywhere",color:isDark?"#F6F3EA":"#1F241F"}}>{d.n}</div>
                  </div>
                </button>
              ))}
            </div>
            <div style={{width:"100%",maxWidth:isMobile?"360px":"none",margin:"0 auto",border:"1px solid "+(isDark?"#2F352F":"#E4E1D8"),borderRadius:"12px",overflow:"hidden",background:isDark?"#0F120F":"#FFF",boxShadow:isDark?"none":"0 8px 24px rgba(31,36,31,0.05)"}}>
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
                return <div key={row.label} style={{display:"grid",gridTemplateColumns:isMobile?"minmax(76px,1fr) minmax(100px,0.9fr) minmax(76px,1fr)":"minmax(130px,1fr) minmax(150px,0.8fr) minmax(130px,1fr)",alignItems:"stretch",background:isDark?(i%2?"#121612":"#0F120F"):(i%2?"#FBFAF7":"#FFF"),borderBottom:i===3?"none":"1px solid "+(isDark?"#2F352F":"#EEEAE1")}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:isMobile?"9px 6px":"11px 12px",fontFamily:F,fontSize:isMobile?"13px":"14px",fontWeight:aWins?900:800,color:GOLD,background:"transparent"}}>{row.fmt(row.a)}</div>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center",padding:isMobile?"9px 5px":"11px 10px",borderLeft:"1px solid "+(isDark?"#2F352F":"#EEEAE1"),borderRight:"1px solid "+(isDark?"#2F352F":"#EEEAE1"),fontFamily:F,fontSize:isMobile?"8.6px":"9.5px",letterSpacing:"0.8px",textTransform:"uppercase",color:isDark?"#C9CEC9":"#59645D",fontWeight:850,lineHeight:1.25}}>{row.label}</div>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:isMobile?"9px 6px":"11px 12px",fontFamily:F,fontSize:isMobile?"13px":"14px",fontWeight:bWins?900:800,color:"#1565C0",background:"transparent"}}>{row.fmt(row.b)}</div>
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
                  <div key={rowKey} style={{padding:"15px 16px",border:"1px solid "+(isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.08)"),borderRadius:"16px",background:isDark?"#0F1110":"#FFF",boxShadow:expanded?"inset 4px 0 0 #B8860B, 0 8px 22px rgba(0,0,0,0.045)":"0 2px 10px rgba(0,0,0,0.025)"}}>
                    <div onClick={()=>toggleArtistRow(rowKey)} role="button" aria-expanded={expanded} style={{display:"grid",gridTemplateColumns:"34px 42px minmax(0,1fr) 38px",gap:"10px",alignItems:"center",cursor:"pointer",minWidth:0}}>
                      <div style={{fontSize:i<3?"28px":"24px",fontWeight:950,lineHeight:1,color:i<3?MEDALS[i]:"#050505",textAlign:"center",fontFamily:F}}>{i+1}</div>
                      <CountryBadge artist={a.n} style={{minWidth:"42px",width:"42px",height:"42px",borderRadius:"12px",padding:0,flexShrink:0}} />
                      <div style={{minWidth:0}}>
                        <button type="button" onClick={(event)=>{event.stopPropagation();openArtistDetails(a.n);}} style={{display:"block",width:"100%",border:0,background:"transparent",padding:0,margin:0,textAlign:"left",fontFamily:SF,fontSize:"15.5px",fontWeight:850,lineHeight:1.2,color:isDark?"#F6F3EA":"#050505",whiteSpace:"normal",overflowWrap:"anywhere",cursor:"pointer"}}>{a.n}</button>
                        <div style={{fontFamily:F,fontSize:"11.5px",fontWeight:800,color:trend.color,marginTop:"5px",lineHeight:1.25}}>{trend.symbol} {trend.shortLabel}</div>
                      </div>
                      <button type="button" onClick={(event)=>{event.stopPropagation();toggleArtistRow(rowKey);}} aria-label={expanded?"Hide artist details":"Show artist details"} aria-expanded={expanded} style={{width:"38px",height:"34px",border:"1px solid "+(isDark?"rgba(255,255,255,0.10)":"rgba(0,0,0,0.08)"),borderRadius:"14px",background:isDark?"#1A1E1A":"#FBFAF7",color:isDark?"#C5C5C0":"#555",fontSize:"18px",fontWeight:900,lineHeight:1,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:"0 0 2px",boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>{expanded?"▴":"▾"}</button>
                    </div>
                    {expanded&&(
                      <div style={{marginTop:"14px",padding:"14px 16px 12px",border:"1px solid "+(isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.06)"),borderRadius:"16px",background:isDark?"#111411":"#FBFAF7"}}>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:"8px"}}>
                          {artistStats.map((stat)=>(
                            <div key={stat.label} style={{background:isDark?"#1A1E1A":"#FFF",border:"1px solid "+(isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.06)"),borderRadius:"12px",padding:"9px 7px",minWidth:0}}>
                              <span style={{display:"block",fontFamily:F,fontSize:"9px",color:isDark?"#AEB6AE":"#777",fontWeight:900,letterSpacing:"1px",textTransform:"uppercase",textAlign:"center"}}>{stat.label}</span>
                              <span style={{display:"block",marginTop:"4px",fontFamily:F,color:isDark?"#D7DBD7":"#050505",fontSize:"12px",fontWeight:900,textAlign:"center",whiteSpace:"normal",overflowWrap:"anywhere"}}>{stat.value}</span>
                            </div>
                          ))}
                        </div>
                        <button type="button" onClick={()=>openArtistDetails(a.n)} style={{marginTop:"11px",width:"100%",border:"1px solid rgba(184,134,11,0.22)",borderRadius:"13px",background:isDark?"#151815":"#FFF",color:GOLD,fontFamily:F,fontSize:"10.5px",fontWeight:900,letterSpacing:"1px",textTransform:"uppercase",padding:"10px 12px",cursor:"pointer"}}>View Artist Profile</button>
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
                <div style={{fontSize:i<3?"20px":"14px",fontWeight:900,color:i<3?MEDALS[i]:"#B0B5B0",textAlign:"center",fontFamily:F,letterSpacing:"-0.3px"}}>{i+1}</div>
                <CountryBadge artist={a.n} compact />
                <div style={{minWidth:0}}><button type="button" onClick={()=>openArtistDetails(a.n)} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:"15.5px",fontWeight:850,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",lineHeight:1.15,cursor:"pointer",maxWidth:"100%",textAlign:"left"}}>{a.n}</button><div style={{fontSize:"12px",color:isDark?"#AEB6AE":"#59645D",fontFamily:F,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",marginTop:"4px",lineHeight:1.35}}>{a.t} {a.t===1?"entry":"entries"} · Artist peak: #{a.pk} · {a.m} {a.m===1?"month":"months"}</div></div>
                <div title={trend.label} style={{textAlign:"center",fontFamily:F,fontSize:"14px",fontWeight:900,color:trend.color}}>{trend.symbol}</div>
                <div style={{textAlign:"center",fontFamily:F,fontSize:"16px",fontWeight:900,color:GOLD,whiteSpace:"nowrap"}}>{a.p.toLocaleString()}</div>
              </div>
            )})}
          </>)}
        </div>
  );
}
