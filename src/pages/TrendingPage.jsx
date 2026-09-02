import ArtistCredit from "../components/ArtistCredit.jsx";

export default function TrendingPage({ ctx }) {
  const {
    CertificationTag,
    F,
    GOLD,
    InfoButton,
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
    openArtistDetails,
    openMomentumRelease,
    secLbl,
    toggleTrendingRow,
    trendLabelText,
    uniqueByMomentumIdentity
  } = ctx;
  const info = (title, body, items = [], size = 16) => InfoButton ? (
    <InfoButton title={title} body={body} items={items} size={size} />
  ) : null;
  const sectionTitle = (label, title, body, items = []) => (
    <div style={{...secLbl(isDark?"#FFFFFF":"#000000"), display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap"}}>
      <span><SecMark c={isDark?"#F6F3EA":"#1A1A1A"}/>{label}</span>
      {info(title || label, body, items)}
    </div>
  );
  const statInfo = {
    "Previous Rank": "The entry's position in the previous published Combined chart month.",
    [`${latestMonthShort} Rank`]: `The entry's position in the ${latestMonth} Combined chart.`,
    "Places Gained": "The number of positions climbed between the previous month and the selected month.",
    "Rank Path": "A compact month-by-month path of the entry's recent ranks. Lower numbers are better.",
  };

  return (
<div style={{padding:PAD,minHeight:"60vh",boxSizing:"border-box",overflow:"hidden"}}>
          <div style={{maxWidth:"1240px",margin:"0 auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:isMobile?"flex-start":"flex-end",marginBottom:isMobile?"16px":"20px",flexWrap:"wrap",gap:isMobile?"10px":"12px"}}>
              <div style={{minWidth:0,flex:isMobile?"1 1 100%":"1"}}>
                <div style={{fontFamily:F,fontSize:isMobile?"9px":"10.5px",letterSpacing:isMobile?"2.2px":"2.6px",textTransform:"uppercase",color:isDark?"#FFFFFF":"#000000",marginBottom:"6px"}}>RANK MOMENTUM</div>
                <div style={{display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap"}}>
                  <h2 style={{fontSize:isMobile?"24px":"24px",fontWeight:800,margin:0}}>Trending Up</h2>
                  {info("Trending Up", "Tracks the entries gaining the most rank positions on the Combined chart.", ["It compares the latest month against the previous published month.", "The page focuses on movement, not raw streams or total audience."])}
                </div>
                <p style={{fontFamily:F,fontSize:isMobile?"12px":"11px",color:isDark?"#FFFFFF":"#000000",margin:"6px 0 0",lineHeight:1.55}}>Tracks rising fastest on the Combined chart, measured by positions gained.</p>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:isMobile?"10px":"12px",flexWrap:"wrap",marginTop:isMobile?"2px":0}}>
                <Tog sm/>
              </div>
            </div>

            <div style={{...card({background:isDark?"#0F120F":"#FAFAF8",borderColor:isDark?"#2B302B":"#E8E5DC",padding:isMobile?"18px":"24px"}),marginBottom:isMobile?"16px":"20px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"6px"}}>
                <span style={{fontSize:"22px"}}>🔥</span>
                <div>
                  <div style={{fontFamily:F,fontSize:isMobile?"10.5px":"11px",fontWeight:800,letterSpacing:"1px",textTransform:"uppercase",color:isDark?"#FFFFFF":"#000000",display:"inline-flex",alignItems:"center",gap:"6px"}}>Biggest Climb{info("Biggest Climb", `The ${isSingles ? "song" : "album"} with the largest upward movement on the Combined chart in ${latestMonth}.`)}</div>
                  <div style={{fontFamily:F,fontSize:isMobile?"12px":"11px",color:isDark?"#FFFFFF":"#000000"}}>Most Combined chart places gained in {latestMonth}</div>
                </div>
              </div>
              {(()=>{const list=uniqueByMomentumIdentity(currentTrending.rising);const hot=list[0];if(!hot)return null;
                return(
                  <div style={{display:"flex",flexDirection:isMobile?"column":"row",alignItems:isMobile?"stretch":"center",gap:isMobile?"18px":"28px",marginTop:"14px"}}>
                    <div style={{flex:1,minWidth:isMobile?"0":"260px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:"9px",flexWrap:"wrap"}}>
                        <div style={{fontFamily:SF,fontSize:isMobile?"23px":"28px",fontWeight:850,cursor:"pointer",lineHeight:1.08,color:isDark?"#FFFFFF":"#000000"}} onClick={()=>openMomentumRelease(hot)}>{hot.t}</div>
                      </div>
                      <div style={{marginTop:"6px"}}><ArtistCredit credit={hot.a} onOpenArtist={openArtistDetails} isDark={isDark} fontFamily={F} fontSize="15px" fontWeight={700} color="#000000" darkColor="#FFFFFF" separatorColor="#000000" darkSeparatorColor="#FFFFFF" /></div>
                      <div style={{display:"flex",gap:isMobile?"14px":"20px",marginTop:"12px",flexWrap:"wrap"}}>
                        <div><div style={{fontFamily:F,fontSize:isMobile?"20px":"20px",fontWeight:900,color:"#2DB04A"}}>+{hot.places}</div><div style={{fontFamily:F,fontSize:"10px",letterSpacing:"1px",textTransform:"uppercase",color:isDark?"#FFFFFF":"#000000",fontWeight:800,display:"inline-flex",alignItems:"center",gap:"5px"}}>Places{info("Places Gained", statInfo["Places Gained"], [], 14)}</div></div>
                        <div><div style={{fontFamily:F,fontSize:isMobile?"20px":"20px",fontWeight:900,color:isDark?"#FFFFFF":"#000000"}}>#{hot.fromRank}</div><div style={{fontFamily:F,fontSize:"10px",letterSpacing:"1px",textTransform:"uppercase",color:isDark?"#FFFFFF":"#000000",fontWeight:800,display:"inline-flex",alignItems:"center",gap:"5px"}}>Previous Rank{info("Previous Rank", statInfo["Previous Rank"], [], 14)}</div></div>
                        <div><div style={{fontFamily:F,fontSize:isMobile?"20px":"20px",fontWeight:900,color:GOLD}}>#{hot.decRank}</div><div style={{fontFamily:F,fontSize:"10px",letterSpacing:"1px",textTransform:"uppercase",color:isDark?"#FFFFFF":"#000000",fontWeight:800,display:"inline-flex",alignItems:"center",gap:"5px"}}>{latestMonthShort} Rank{info(`${latestMonthShort} Rank`, statInfo[`${latestMonthShort} Rank`], [], 14)}</div></div>
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
              {sectionTitle(`Rising Fast - Most Places Gained (${isSingles?"Singles":"Albums"})`, "Rising Fast", "Ranks entries by how many positions they gained on the Combined chart compared with the previous month.", ["The list is deduplicated so the same release is not repeated under slightly different credits.", "Bars show recent rank strength; shorter/lower rank numbers are better."])}
              {uniqueByMomentumIdentity(currentTrending.rising).map((p,i)=>{
                const rowKey=`rising-${p.t}-${p.a}-${p.decRank}`;
                const expanded=Boolean(expandedTrendingRows[rowKey]);
                if(isMobile)return(
                  <div key={rowKey} style={{padding:"14px 15px",marginBottom:"9px",border:"1px solid "+(isDark?"#2B302B":"#E8EDE8"),borderRadius:"14px",background:isDark?"#0F120F":"#FFF",boxShadow:expanded?`inset 4px 0 0 ${isDark?"#FFFFFF":"#000000"}, 0 7px 20px rgba(0,0,0,0.04)`:"0 2px 8px rgba(0,0,0,0.025)"}}>
                    <div onClick={()=>toggleTrendingRow(rowKey)} role="button" aria-expanded={expanded} style={{display:"grid",gridTemplateColumns:"28px minmax(0,1fr) 38px",gap:"10px",alignItems:"center",cursor:"pointer"}}>
                      <div style={{fontFamily:F,fontSize:"18px",fontWeight:900,color:isDark?"#FFFFFF":"#000000",textAlign:"center"}}>{i+1}</div>
                      <div style={{minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}><strong style={{fontSize:"15px",lineHeight:1.2,overflowWrap:"anywhere"}}>{p.t}</strong></div>
                        <div style={{fontFamily:F,fontSize:"11.5px",fontWeight:850,color:"#2DB04A",marginTop:"5px"}}>↑ Up {p.places} {p.places===1?"place":"places"}{p.consecutive?" · climbing 2+ months":""}</div>
                      </div>
                      <button type="button" onClick={(event)=>{event.stopPropagation();toggleTrendingRow(rowKey);}} aria-label={expanded?"Hide rank movement details":"Show rank movement details"} aria-expanded={expanded} style={{width:"38px",height:"34px",border:"1px solid rgba(0,0,0,0.08)",borderRadius:"14px",background:"#FBFAF7",color:"#000000",fontSize:"18px",fontWeight:900,lineHeight:1,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:"0 0 2px"}}>{expanded?"-":"+"}</button>
                    </div>
                    {expanded&&<div style={{marginTop:"13px",padding:"13px",borderRadius:"13px",background:isDark?"#151815":"#F7F7F5",border:"1px solid "+(isDark?"#2B302B":"#E8E5DC")}}>
                      <div style={{lineHeight:1.5}}><ArtistCredit credit={p.a} onOpenArtist={openArtistDetails} isDark={isDark} fontFamily={F} fontSize="12px" fontWeight={750} color="#000000" darkColor="#FFFFFF" separatorColor="#000000" darkSeparatorColor="#FFFFFF" /></div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:"8px",marginTop:"10px"}}>
                        {[{l:"Previous Rank",v:`#${p.fromRank}`},{l:`${latestMonthShort} Rank`,v:`#${p.decRank}`},{l:"Places Gained",v:`+${p.places}`},{l:"Rank Path",v:(p.trend||[]).map(v=>v?`#${v}`:"—").join(" → ")}].map(s=><div key={s.l} style={{padding:"9px 6px",background:isDark?"#151815":"#FFF",borderRadius:"10px",textAlign:"center",minWidth:0}}><span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:"5px",fontFamily:F,fontSize:"8.5px",fontWeight:900,letterSpacing:"1px",textTransform:"uppercase",color:isDark?"#FFFFFF":"#000000"}}>{s.l}{info(s.l, statInfo[s.l] || "This value summarizes the entry's rank movement for the selected month.", [], 14)}</span><strong style={{display:"block",marginTop:"4px",fontFamily:F,fontSize:"12px",overflowWrap:"anywhere",color:s.l==="Places Gained"?"#2DB04A":(isDark?"#FFFFFF":"#000000")}}>{s.v}</strong></div>)}
                      </div>
                      <button type="button" onClick={()=>openMomentumRelease(p)} style={{marginTop:"10px",width:"100%",padding:"9px 10px",borderRadius:"11px",border:"1px solid "+(isDark?"#2B302B":"#E8E5DC"),background:isDark?"#151815":"#FFF",color:isDark?"#FFFFFF":"#000000",fontFamily:F,fontSize:"10px",fontWeight:900,letterSpacing:"1px",textTransform:"uppercase",cursor:"pointer"}}>View Details</button>
                    </div>}
                  </div>
                );
                return(
                  <div key={`${p.t}-${p.a}-${p.decRank}`} style={{display:"grid",gridTemplateColumns:"34px minmax(0,1fr) 114px 92px 14px",gap:"12px",alignItems:"center",padding:"12px 4px",margin:0,borderBottom:"1px solid #F2F2EE",borderRadius:"8px",boxSizing:"border-box",overflow:"hidden"}}
                    onMouseEnter={e=>e.currentTarget.style.background="#FAFAF6"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <div style={{fontFamily:F,fontSize:isMobile?"16px":"16px",fontWeight:850,color:isDark?"#FFFFFF":"#000000",textAlign:"center",transform:isMobile?"translateX(2px)":"translateX(2px)"}}>{i+1}</div>
                    <div style={{minWidth:0,paddingLeft:isMobile?"2px":"2px",boxSizing:"border-box"}}>
                      <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap",minWidth:0}}>
                        <button type="button" onClick={()=>openMomentumRelease(p)} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:isMobile?"15px":"15px",fontWeight:800,lineHeight:1.15,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",cursor:"pointer",textAlign:"left"}}>{p.t}</button>
                      </div>
                      <div style={{fontSize:isMobile?"12px":"12px",color:isDark?"#FFFFFF":"#000000",fontFamily:F,marginTop:"4px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}><ArtistCredit credit={p.a} onOpenArtist={openArtistDetails} isDark={isDark} fontFamily={F} fontSize="12px" fontWeight={400} color="#000000" darkColor="#FFFFFF" separatorColor="#000000" darkSeparatorColor="#FFFFFF" /> · #{p.fromRank} → #{p.decRank}{p.consecutive?" · climbing 2+ months":""}</div>
                    </div>
                    <TrendBars trend={p.trend} compact height={30}/>
                    <div style={{textAlign:"right",fontFamily:F}}><span style={{fontSize:"15px",fontWeight:900,color:"#2DB04A"}}>+{p.places}</span><div style={{fontSize:"10px",color:isDark?"#FFFFFF":"#000000",letterSpacing:"1px",textTransform:"uppercase",fontWeight:800}}>places</div></div>
                    <div style={{fontFamily:F,fontSize:"16px",fontWeight:800,color:isDark?"#FFFFFF":"#000000",textAlign:"right"}}>›</div>
                  </div>
                );
              })}
              <div style={{padding:"13px 0 0",fontFamily:F,fontSize:isMobile?"11px":"11px",color:isDark?"#FFFFFF":"#000000",textAlign:"center",lineHeight:1.55}}>{formulaLabel} · Bars show {trendLabelText} rank strength.</div>
            </div>

            {/* Strong Debuts */}
            <div style={{...card({padding:isMobile?"18px":"22px"}),marginTop:isMobile?"16px":"20px"}}>
              {sectionTitle(`Strongest ${latestMonthName} Debuts`, "Strongest Debuts", `Shows new public Top 50 entries that arrived highest in ${latestMonth}.`, ["A debut means first charted appearance in the tracked public chart history.", "The rank shown is the entry's first Combined chart rank."])}
              <p style={{fontFamily:F,fontSize:isMobile?"12px":"11px",color:isDark?"#FFFFFF":"#000000",margin:"-8px 0 14px",lineHeight:1.45}}>New entries that arrived high in {latestMonth}.</p>
              <div className="anl-grid-3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:isMobile?"8px":"10px"}}>
                {uniqueByMomentumIdentity(currentTrending.debuts).map((p)=>{
                  const rowKey=`debut-${p.t}-${p.a}-${p.decRank}`;
                  const expanded=Boolean(expandedTrendingRows[rowKey]);
                  if(isMobile)return <div key={rowKey} style={{padding:"14px 15px",background:isDark?"#0F120F":"#FAFAF8",borderRadius:"14px",border:"1px solid "+(isDark?"#2B302B":"#E8E5DC"),boxShadow:expanded?`inset 4px 0 0 ${isDark?"#FFFFFF":"#000000"}`:"none"}}>
                    <div onClick={()=>toggleTrendingRow(rowKey)} role="button" aria-expanded={expanded} style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 38px",gap:"10px",alignItems:"center",cursor:"pointer"}}>
                      <div style={{minWidth:0}}><strong style={{fontSize:"15px",lineHeight:1.2,overflowWrap:"anywhere"}}>{p.t}</strong><div style={{fontFamily:F,fontSize:"11.5px",fontWeight:850,color:isDark?"#FFFFFF":"#000000",marginTop:"5px"}}>New at #{p.decRank}</div></div>
                      <button type="button" onClick={(event)=>{event.stopPropagation();toggleTrendingRow(rowKey);}} aria-label={expanded?"Hide debut details":"Show debut details"} aria-expanded={expanded} style={{width:"38px",height:"34px",border:"1px solid rgba(0,0,0,0.08)",borderRadius:"14px",background:isDark?"#151815":"#FFF",color:isDark?"#FFFFFF":"#000000",fontSize:"18px",fontWeight:900,lineHeight:1,cursor:"pointer"}}>{expanded?"-":"+"}</button>
                    </div>
                    {expanded&&<div style={{marginTop:"12px",padding:"12px",background:isDark?"#111411":"#FFF",borderRadius:"12px",fontFamily:F}}><div style={{fontSize:"12px",fontWeight:750}}><ArtistCredit credit={p.a} onOpenArtist={openArtistDetails} isDark={isDark} fontFamily={F} fontSize="12px" fontWeight={750} color="#000000" darkColor="#FFFFFF" separatorColor="#000000" darkSeparatorColor="#FFFFFF" /></div><div style={{display:"flex",justifyContent:"space-between",gap:"12px",marginTop:"8px",fontSize:"12px",color:isDark?"#FFFFFF":"#000000"}}><span>First Combined appearance</span><strong style={{color:isDark?"#FFFFFF":"#000000"}}>#{p.decRank}</strong></div><button type="button" onClick={()=>openMomentumRelease(p)} style={{marginTop:"10px",width:"100%",padding:"9px 10px",borderRadius:"11px",border:"1px solid "+(isDark?"#2B302B":"#E8E5DC"),background:isDark?"#151815":"#FAFAF8",color:isDark?"#FFFFFF":"#000000",fontFamily:F,fontSize:"10px",fontWeight:900,letterSpacing:"1px",textTransform:"uppercase",cursor:"pointer"}}>View Details</button></div>}
                  </div>;
                  return(
                  <div key={`${p.t}-${p.a}-${p.decRank}`} style={{padding:"14px",background:isDark?"#0F120F":"#FAFAF8",borderRadius:"10px",border:"1px solid "+(isDark?"#2B302B":"#E8E5DC"),display:"grid",gridTemplateColumns:"1fr auto",gap:"8px",alignItems:"center"}}
                    onMouseEnter={e=>e.currentTarget.style.background=isDark?"#151815":"#F0EEE8"} onMouseLeave={e=>e.currentTarget.style.background=isDark?"#0F120F":"#FAFAF8"}>
                    <div style={{minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap",minWidth:0}}>
                        <button type="button" onClick={()=>openMomentumRelease(p)} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:isMobile?"15px":"15px",fontWeight:800,lineHeight:1.15,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",cursor:"pointer",textAlign:"left"}}>{p.t}</button>
                      </div>
                      <div style={{fontSize:isMobile?"12px":"12px",color:isDark?"#FFFFFF":"#000000",fontFamily:F,marginTop:"4px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}><ArtistCredit credit={p.a} onOpenArtist={openArtistDetails} isDark={isDark} fontFamily={F} fontSize="12px" fontWeight={400} color="#000000" darkColor="#FFFFFF" separatorColor="#000000" darkSeparatorColor="#FFFFFF" /> · First Combined appearance</div>
                    </div>
                    <span style={{fontFamily:F,fontSize:isMobile?"16px":"16px",fontWeight:900,color:isDark?"#FFFFFF":"#000000"}}>#{p.decRank}</span>
                  </div>);
                })}
              </div>
            </div>
          </div>
        </div>
  );
}
