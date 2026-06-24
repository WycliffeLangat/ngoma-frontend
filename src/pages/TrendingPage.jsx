export default function TrendingPage({ ctx }) {
  const {
    CertificationTag,
    F,
    GOLD,
    PAD,
    SF,
    SecMark,
    Tog,
    TrendBars,
    card,
    currentTrending,
    expandedTrendingRows,
    formulaLabel,
    getCertificationForEntry,
    isDark,
    isMobile,
    isSingles,
    latestMonth,
    latestMonthName,
    latestMonthShort,
    openMomentumRelease,
    secLbl,
    toggleTrendingRow,
    trendLabelText,
    uniqueByMomentumIdentity
  } = ctx;

  return (
<div style={{padding:PAD,minHeight:"60vh",boxSizing:"border-box",overflow:"hidden"}}>
          <div style={{maxWidth:"1240px",margin:"0 auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:isMobile?"flex-start":"flex-end",marginBottom:isMobile?"16px":"20px",flexWrap:"wrap",gap:isMobile?"10px":"12px"}}>
              <div style={{minWidth:0,flex:isMobile?"1 1 100%":"1"}}>
                <div style={{fontFamily:F,fontSize:isMobile?"9px":"10.5px",letterSpacing:isMobile?"2.2px":"2.6px",textTransform:"uppercase",color:"#2DB04A",marginBottom:"6px"}}>RANK MOMENTUM</div>
                <h2 style={{fontSize:isMobile?"24px":"24px",fontWeight:800,margin:0}}>Trending Up</h2>
                <p style={{fontFamily:F,fontSize:isMobile?"12px":"11px",color:"#626A64",margin:"6px 0 0",lineHeight:1.55}}>Tracks rising fastest on the Combined chart, measured by positions gained.</p>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:isMobile?"10px":"12px",flexWrap:"wrap",marginTop:isMobile?"2px":0}}>
                <Tog sm/>
              </div>
            </div>

            <div style={{...card({background:isDark?"#0F120F":"linear-gradient(135deg,#F4FBF5,#FFFFFF)",borderColor:isDark?"#2DB04A55":"#2DB04A22",padding:isMobile?"18px":"24px"}),marginBottom:isMobile?"16px":"20px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"6px"}}>
                <span style={{fontSize:"22px"}}>🔥</span>
                <div>
                  <div style={{fontFamily:F,fontSize:isMobile?"10.5px":"11px",fontWeight:800,letterSpacing:"1px",textTransform:"uppercase",color:"#2DB04A"}}>Biggest Climb</div>
                  <div style={{fontFamily:F,fontSize:isMobile?"12px":"11px",color:isDark?"#D7DBD7":"#68746C"}}>Most Combined chart places gained in {latestMonth}</div>
                </div>
              </div>
              {(()=>{const list=uniqueByMomentumIdentity(currentTrending.rising);const hot=list[0];if(!hot)return null;
                return(
                  <div style={{display:"flex",flexDirection:isMobile?"column":"row",alignItems:isMobile?"stretch":"center",gap:isMobile?"18px":"28px",marginTop:"14px"}}>
                    <div style={{flex:1,minWidth:isMobile?"0":"260px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:"9px",flexWrap:"wrap"}}>
                        <div style={{fontFamily:SF,fontSize:isMobile?"23px":"28px",fontWeight:850,cursor:"pointer",lineHeight:1.08,color:isDark?"#F6F3EA":"#1A1A1A"}} onClick={()=>openMomentumRelease(hot)}>{hot.t}</div>
                        {getCertificationForEntry(hot, isSingles ? "single" : "album")&&<CertificationTag cert={getCertificationForEntry(hot, isSingles ? "single" : "album")} compact={false} />}
                      </div>
                      <div style={{fontFamily:F,fontSize:isMobile?"15px":"15px",color:isDark?"#D7DBD7":"#69716B",marginTop:"6px",fontWeight:700}}>{hot.a}</div>
                      <div style={{display:"flex",gap:isMobile?"14px":"20px",marginTop:"12px",flexWrap:"wrap"}}>
                        <div><div style={{fontFamily:F,fontSize:isMobile?"20px":"20px",fontWeight:900,color:"#2DB04A"}}>+{hot.places}</div><div style={{fontFamily:F,fontSize:"10px",letterSpacing:"1px",textTransform:"uppercase",color:isDark?"#AEB6AE":"#7B857D",fontWeight:800}}>Places</div></div>
                        <div><div style={{fontFamily:F,fontSize:isMobile?"20px":"20px",fontWeight:900,color:isDark?"#F6F3EA":"#1A1A1A"}}>#{hot.fromRank}</div><div style={{fontFamily:F,fontSize:"10px",letterSpacing:"1px",textTransform:"uppercase",color:isDark?"#AEB6AE":"#7B857D",fontWeight:800}}>Previous Rank</div></div>
                        <div><div style={{fontFamily:F,fontSize:isMobile?"20px":"20px",fontWeight:900,color:GOLD}}>#{hot.decRank}</div><div style={{fontFamily:F,fontSize:"10px",letterSpacing:"1px",textTransform:"uppercase",color:isDark?"#AEB6AE":"#7B857D",fontWeight:800}}>{latestMonthShort} Rank</div></div>
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
              <div style={secLbl("#2DB04A")}><SecMark c="#2DB04A"/>Rising Fast — Most Places Gained ({isSingles?"Singles":"Albums"})</div>
              {uniqueByMomentumIdentity(currentTrending.rising).map((p,i)=>{
                const rowKey=`rising-${p.t}-${p.a}-${p.decRank}`;
                const expanded=Boolean(expandedTrendingRows[rowKey]);
                if(isMobile)return(
                  <div key={rowKey} style={{padding:"14px 15px",marginBottom:"9px",border:"1px solid #E8EDE8",borderRadius:"14px",background:"#FFF",boxShadow:expanded?"inset 4px 0 0 #2DB04A, 0 7px 20px rgba(0,0,0,0.04)":"0 2px 8px rgba(0,0,0,0.025)"}}>
                    <div onClick={()=>toggleTrendingRow(rowKey)} role="button" aria-expanded={expanded} style={{display:"grid",gridTemplateColumns:"28px minmax(0,1fr) 38px",gap:"10px",alignItems:"center",cursor:"pointer"}}>
                      <div style={{fontFamily:F,fontSize:"18px",fontWeight:900,color:"#8E948D",textAlign:"center"}}>{i+1}</div>
                      <div style={{minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}><strong style={{fontSize:"15px",lineHeight:1.2,overflowWrap:"anywhere"}}>{p.t}</strong>{getCertificationForEntry(p,isSingles?"single":"album")&&<CertificationTag cert={getCertificationForEntry(p,isSingles?"single":"album")} compact />}</div>
                        <div style={{fontFamily:F,fontSize:"11.5px",fontWeight:850,color:"#2DB04A",marginTop:"5px"}}>↑ Up {p.places} {p.places===1?"place":"places"}{p.consecutive?" · climbing 2+ months":""}</div>
                      </div>
                      <button type="button" onClick={(event)=>{event.stopPropagation();toggleTrendingRow(rowKey);}} aria-label={expanded?"Hide rank movement details":"Show rank movement details"} aria-expanded={expanded} style={{width:"38px",height:"34px",border:"1px solid rgba(0,0,0,0.08)",borderRadius:"14px",background:"#FBFAF7",color:"#555",fontSize:"18px",fontWeight:900,lineHeight:1,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:"0 0 2px"}}>{expanded?"▴":"▾"}</button>
                    </div>
                    {expanded&&<div style={{marginTop:"13px",padding:"13px",borderRadius:"13px",background:"#F7FBF7",border:"1px solid #2DB04A18"}}>
                      <div style={{fontFamily:F,fontSize:"12px",fontWeight:750,color:"#59645D",lineHeight:1.5}}>{p.a}</div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:"8px",marginTop:"10px"}}>
                        {[{l:"Previous Rank",v:`#${p.fromRank}`},{l:`${latestMonthShort} Rank`,v:`#${p.decRank}`},{l:"Places Gained",v:`+${p.places}`},{l:"Rank Path",v:(p.trend||[]).map(v=>v?`#${v}`:"—").join(" → ")}].map(s=><div key={s.l} style={{padding:"9px 6px",background:isDark?"#151815":"#FFF",borderRadius:"10px",textAlign:"center",minWidth:0}}><span style={{display:"block",fontFamily:F,fontSize:"8.5px",fontWeight:900,letterSpacing:"1px",textTransform:"uppercase",color:isDark?"#8F968F":"#7B857D"}}>{s.l}</span><strong style={{display:"block",marginTop:"4px",fontFamily:F,fontSize:"12px",overflowWrap:"anywhere",color:s.l==="Places Gained"?"#2DB04A":(isDark?"#F6F3EA":"#1A1A1A")}}>{s.v}</strong></div>)}
                      </div>
                      <button type="button" onClick={()=>openMomentumRelease(p)} style={{marginTop:"10px",width:"100%",padding:"9px 10px",borderRadius:"11px",border:`1px solid ${isDark?"#2DB04A55":"#2DB04A33"}`,background:isDark?"#0A1A0A":"#FFF",color:"#258A3D",fontFamily:F,fontSize:"10px",fontWeight:900,letterSpacing:"1px",textTransform:"uppercase",cursor:"pointer"}}>View Details</button>
                    </div>}
                  </div>
                );
                return(
                  <div key={`${p.t}-${p.a}-${p.decRank}`} style={{display:"grid",gridTemplateColumns:"34px minmax(0,1fr) 114px 92px 14px",gap:"12px",alignItems:"center",padding:"12px 4px",margin:0,borderBottom:"1px solid #F2F2EE",borderRadius:"8px",boxSizing:"border-box",overflow:"hidden"}}
                    onMouseEnter={e=>e.currentTarget.style.background="#FAFAF6"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <div style={{fontFamily:F,fontSize:isMobile?"16px":"16px",fontWeight:850,color:"#8E948D",textAlign:"center",transform:isMobile?"translateX(2px)":"translateX(2px)"}}>{i+1}</div>
                    <div style={{minWidth:0,paddingLeft:isMobile?"2px":"2px",boxSizing:"border-box"}}>
                      <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap",minWidth:0}}>
                        <button type="button" onClick={()=>openMomentumRelease(p)} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:isMobile?"15px":"15px",fontWeight:800,lineHeight:1.15,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",cursor:"pointer",textAlign:"left"}}>{p.t}</button>
                        {getCertificationForEntry(p, isSingles ? "single" : "album")&&<CertificationTag cert={getCertificationForEntry(p, isSingles ? "single" : "album")} compact />}
                      </div>
                      <div style={{fontSize:isMobile?"12px":"12px",color:"#69716B",fontFamily:F,marginTop:"4px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.a} · #{p.fromRank} → #{p.decRank}{p.consecutive?" · climbing 2+ months":""}</div>
                    </div>
                    <TrendBars trend={p.trend} compact height={30}/>
                    <div style={{textAlign:"right",fontFamily:F}}><span style={{fontSize:"15px",fontWeight:900,color:"#2DB04A"}}>+{p.places}</span><div style={{fontSize:"10px",color:"#7B857D",letterSpacing:"1px",textTransform:"uppercase",fontWeight:800}}>places</div></div>
                    <div style={{fontFamily:F,fontSize:"16px",fontWeight:800,color:"#B6BDB7",textAlign:"right"}}>›</div>
                  </div>
                );
              })}
              <div style={{padding:"13px 0 0",fontFamily:F,fontSize:isMobile?"11px":"11px",color:"#6E746F",textAlign:"center",lineHeight:1.55}}>{formulaLabel} · Bars show {trendLabelText} rank strength.</div>
            </div>

            {/* Strong Debuts */}
            <div style={{...card({padding:isMobile?"18px":"22px"}),marginTop:isMobile?"16px":"20px"}}>
              <div style={secLbl("#1565C0")}><SecMark c="#1565C0"/>Strongest {latestMonthName} Debuts</div>
              <p style={{fontFamily:F,fontSize:isMobile?"12px":"11px",color:"#69716B",margin:"-8px 0 14px",lineHeight:1.45}}>New entries that arrived high in {latestMonth}.</p>
              <div className="anl-grid-3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:isMobile?"8px":"10px"}}>
                {uniqueByMomentumIdentity(currentTrending.debuts).map((p)=>{
                  const rowKey=`debut-${p.t}-${p.a}-${p.decRank}`;
                  const expanded=Boolean(expandedTrendingRows[rowKey]);
                  if(isMobile)return <div key={rowKey} style={{padding:"14px 15px",background:"#F8FAFD",borderRadius:"14px",border:"1px solid #1565C022",boxShadow:expanded?"inset 4px 0 0 #1565C0":"none"}}>
                    <div onClick={()=>toggleTrendingRow(rowKey)} role="button" aria-expanded={expanded} style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 38px",gap:"10px",alignItems:"center",cursor:"pointer"}}>
                      <div style={{minWidth:0}}><strong style={{fontSize:"15px",lineHeight:1.2,overflowWrap:"anywhere"}}>{p.t}</strong><div style={{fontFamily:F,fontSize:"11.5px",fontWeight:850,color:"#1565C0",marginTop:"5px"}}>New at #{p.decRank}</div></div>
                      <button type="button" onClick={(event)=>{event.stopPropagation();toggleTrendingRow(rowKey);}} aria-label={expanded?"Hide debut details":"Show debut details"} aria-expanded={expanded} style={{width:"38px",height:"34px",border:"1px solid rgba(0,0,0,0.08)",borderRadius:"14px",background:"#FFF",color:"#555",fontSize:"18px",fontWeight:900,lineHeight:1,cursor:"pointer"}}>{expanded?"▴":"▾"}</button>
                    </div>
                    {expanded&&<div style={{marginTop:"12px",padding:"12px",background:isDark?"#111411":"#FFF",borderRadius:"12px",fontFamily:F}}><div style={{fontSize:"12px",fontWeight:750,color:isDark?"#8F968F":"#59645D"}}>{p.a}</div><div style={{display:"flex",justifyContent:"space-between",gap:"12px",marginTop:"8px",fontSize:"12px",color:isDark?"#F6F3EA":"undefined"}}><span>First Combined appearance</span><strong style={{color:"#1565C0"}}>#{p.decRank}</strong></div><button type="button" onClick={()=>openMomentumRelease(p)} style={{marginTop:"10px",width:"100%",padding:"9px 10px",borderRadius:"11px",border:`1px solid ${isDark?"#1565C055":"#1565C033"}`,background:isDark?"#0A1218":"#F8FAFD",color:"#1565C0",fontFamily:F,fontSize:"10px",fontWeight:900,letterSpacing:"1px",textTransform:"uppercase",cursor:"pointer"}}>View Details</button></div>}
                  </div>;
                  return(
                  <div key={`${p.t}-${p.a}-${p.decRank}`} style={{padding:"14px",background:"#F5F8FC",borderRadius:"10px",border:"1px solid #1565C022",display:"grid",gridTemplateColumns:"1fr auto",gap:"8px",alignItems:"center"}}
                    onMouseEnter={e=>e.currentTarget.style.background="#EEF5FF"} onMouseLeave={e=>e.currentTarget.style.background="#F5F8FC"}>
                    <div style={{minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap",minWidth:0}}>
                        <button type="button" onClick={()=>openMomentumRelease(p)} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:isMobile?"15px":"15px",fontWeight:800,lineHeight:1.15,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",cursor:"pointer",textAlign:"left"}}>{p.t}</button>
                        {getCertificationForEntry(p, isSingles ? "single" : "album")&&<CertificationTag cert={getCertificationForEntry(p, isSingles ? "single" : "album")} compact />}
                      </div>
                      <div style={{fontSize:isMobile?"12px":"12px",color:"#69716B",fontFamily:F,marginTop:"4px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.a} · First Combined appearance</div>
                    </div>
                    <span style={{fontFamily:F,fontSize:isMobile?"16px":"16px",fontWeight:900,color:"#1565C0"}}>#{p.decRank}</span>
                  </div>);
                })}
              </div>
            </div>
          </div>
        </div>
  );
}
