export default function YearEndPage({ ctx }) {
  const {
    BRONZE,
    CertificationTag,
    F,
    GOLD,
    MEDALS,
    PAD,
    PLAT_LABEL,
    SF,
    SILVER,
    TXT,
    Tog,
    expandedYearEndRows,
    getCertificationForEntry,
    isDark,
    isMobile,
    isArtists,
    isSingles,
    openArtistDetails,
    openReleaseDetails,
    setYearEndMode,
    setYearEndPlat,
    toggleYearEndRow,
    yearEndDisplay,
    yearEndMode,
    yearEndPeriodLabel,
    yearEndPlat,
    yearEndPlatOptions,
  } = ctx;
  const yearEnd = yearEndDisplay;

  const selectStyle = {
    padding:isMobile?"10px 12px":"8px 14px",
    border:"1.5px solid "+(isDark?"#2F352F":"#DEDAD2"),
    borderRadius:"10px",
    background:isDark?"#1A1E1A":"#FAFAF8",
    fontSize:isMobile?"13px":"12px",
    fontFamily:F,
    fontWeight:750,
    cursor:"pointer",
    outline:"none",
    color:isDark?"#F6F3EA":"#1A1A1A",
  };

  return (
<div style={{padding:PAD,background:isDark?"#050805":"#FFF",minHeight:"60vh",boxSizing:"border-box",overflow:"hidden"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:isMobile?"stretch":"flex-end",marginBottom:isMobile?"16px":"20px",gap:isMobile?"12px":"20px",flexDirection:isMobile?"column":"row"}}>
            <div>
              <div style={{fontFamily:F,fontSize:isMobile?"10.5px":"11px",letterSpacing:isMobile?"1.8px":"2px",textTransform:"uppercase",color:GOLD,marginBottom:"6px",fontWeight:850}}>{yearEndMode==="bestofyear"?"BEST OF YEAR":"ALL TIME"}</div>
              <h2 style={{fontSize:TXT.pageTitle,fontWeight:800,margin:0,color:isDark?"#F6F3EA":"#050505"}}>{yearEndMode==="bestofyear"?"Best of the Year":"All Time Charts"}</h2>
              <p style={{fontFamily:F,fontSize:TXT.lead,color:isDark?"#D7DBD7":"#59645D",margin:"4px 0 0",lineHeight:1.55}}>Aggregated Display Points across {yearEndPeriodLabel}</p>
            </div>
            <div className="year-end-actions" data-share-action-area="true" style={{display:"flex",alignItems:"center",gap:isMobile?"10px":"12px",flexWrap:"wrap",position:isMobile?"sticky":"static",top:isMobile?"0":"auto",zIndex:isMobile?5:"auto",background:isMobile?(isDark?"#050805":"#FFF"):"transparent",padding:isMobile?"8px 0 4px":"0"}}>
              <select value={yearEndMode} onChange={e=>setYearEndMode(e.target.value)} style={{...selectStyle,minWidth:isMobile?"120px":"150px"}}>
                <option value="alltime">All Time</option>
                <option value="bestofyear">Best of Year</option>
              </select>
              <select value={yearEndPlat} onChange={e=>setYearEndPlat(e.target.value)} style={{...selectStyle,minWidth:isMobile?"110px":"140px"}}>
                {yearEndPlatOptions.map(p=><option key={p} value={p}>{p==="Combined"?"Combined":(PLAT_LABEL[p]||p)}</option>)}
              </select>
              <Tog sm/>
            </div>
          </div>

          {/* Full list */}
          {isMobile ? (
            <div style={{display:"grid",gap:"10px"}}>
              {yearEnd.slice(0,50).map((item,idx)=>{
                const rowKey = `${item.t}-${item.a}-${idx}`;
                const expanded = Boolean(expandedYearEndRows[rowKey]);
                const t3 = idx < 3;
                const medalColor = t3 ? MEDALS[idx] : (isDark?"#F6F3EA":"#050505");
                const itemTypeLabel = isArtists ? "Artist" : (isSingles ? "Single" : "Album");
                const certification = isArtists ? null : getCertificationForEntry(item, isSingles ? "single" : "album");
                const statItems = isArtists ? [
                  { label:"Total Pts", value:item.totalPts.toLocaleString() },
                  { label:"Months", value:item.months },
                  { label:"Entries", value:item.entries || "—" },
                  { label:"Peak", value:item.best ? `#${item.best}` : "—" },
                  { label:"Year-End Rank", value:`#${idx+1}` },
                  { label:"Type", value:itemTypeLabel },
                ] : [
                  { label:"Total Pts", value:item.totalPts.toLocaleString() },
                  { label:"Months", value:item.months },
                  { label:"Year-End Rank", value:`#${idx+1}` },
                  { label:"Type", value:itemTypeLabel },
                  ...(certification ? [{ label:"Certification", value:certification.label }] : []),
                ];

                return(
                  <div
                    key={rowKey}
                    style={{
                      padding:"15px 16px",
                      border:"1px solid "+(isDark?"rgba(255,255,255,0.12)":"rgba(0,0,0,0.08)"),
                      borderRadius:"16px",
                      background:isDark?"#0F120F":"#FFF",
                      color:isDark?"#F6F3EA":"#050505",
                      boxShadow:expanded ? (isDark?"inset 4px 0 0 #B8860B, 0 8px 22px rgba(0,0,0,0.26)":"inset 4px 0 0 #B8860B, 0 8px 22px rgba(0,0,0,0.045)") : (isDark?"0 2px 10px rgba(0,0,0,0.16)":"0 2px 10px rgba(0,0,0,0.025)"),
                      transition:"background 180ms ease, box-shadow 180ms ease, transform 180ms ease",
                    }}
                  >
                    <div
                      onClick={()=>toggleYearEndRow(rowKey)}
                      role="button"
                      aria-expanded={expanded}
                      style={{
                        display:"grid",
                        gridTemplateColumns:"34px minmax(0,1fr) 38px",
                        gap:"10px",
                        alignItems:"center",
                        cursor:"pointer",
                        minWidth:0,
                      }}
                    >
                      <div style={{fontSize:t3?"32px":"26px",fontWeight:950,lineHeight:1,color:medalColor,textAlign:"center",fontFamily:F}}>{idx+1}</div>

                      <div style={{display:"flex",alignItems:"center",gap:"11px",minWidth:0,maxWidth:"100%"}}>
                        <div style={{width:"46px",height:"46px",minWidth:"46px",borderRadius:"10px",overflow:"hidden",flexShrink:0,background:isDark?"#1A1E1A":"#F0EDE7",position:"relative"}}>
                          {item.cover_image
                            ? <img src={item.cover_image} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",display:"block"}} loading="lazy"/>
                            : <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:isDark?"#1e221e":"#e8e5de"}}><svg viewBox="0 0 24 24" width="40%" height="40%" fill="none"><circle cx="12" cy="12" r="3" fill={isDark?"#4a524a":"#a8a09a"}/><path d="M9 12a3 3 0 1 0 6 0V6l4-1" stroke={isDark?"#4a524a":"#a8a09a"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                          }
                        </div>
                        <div style={{minWidth:0,flex:1}}>
                          <button
                            type="button"
                            onClick={(event)=>{event.stopPropagation();isArtists ? openArtistDetails(item.t) : openReleaseDetails(item,isSingles?"single":"album");}}
                            style={{
                              display:"block",
                              width:"100%",
                              border:0,
                              background:"transparent",
                              padding:0,
                              margin:0,
                              textAlign:"left",
                              fontFamily:SF,
                              fontSize:t3?"18px":"16.5px",
                              fontWeight:850,
                              lineHeight:1.15,
                              color:isDark?"#F6F3EA":"#050505",
                              whiteSpace:"nowrap",
                              overflow:"hidden",
                              textOverflow:"ellipsis",
                              cursor:"pointer",
                            }}
                          >
                            {item.t}
                          </button>
                          <button
                            type="button"
                            onClick={(event)=>{event.stopPropagation();openArtistDetails(isArtists ? item.t : item.a);}}
                            style={{
                              display:"block",
                              width:"100%",
                              border:0,
                              background:"transparent",
                              padding:0,
                              margin:"4px 0 0",
                              textAlign:"left",
                              fontFamily:F,
                              fontSize:"14px",
                              fontWeight:700,
                              lineHeight:1.35,
                              color:isDark?"#D7DBD7":"#59645D",
                              whiteSpace:"nowrap",
                              overflow:"hidden",
                              textOverflow:"ellipsis",
                              cursor:"pointer",
                            }}
                          >
                            {item.a}
                          </button>
                          {certification&&<CertificationTag cert={certification} compact style={{marginTop:"6px"}} />}
                        </div>
                      </div>

                      <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:"6px",minWidth:0}}>
                        <button
                          type="button"
                          onClick={(event)=>{event.stopPropagation();toggleYearEndRow(rowKey);}}
                          aria-label={expanded ? "Hide year-end details" : "Show year-end details"}
                          aria-expanded={expanded}
                          style={{
                            width:"38px",
                            height:"34px",
                            border:"1px solid "+(isDark?"rgba(255,255,255,0.14)":"rgba(0,0,0,0.08)"),
                            borderRadius:"14px",
                            background:isDark?"#151915":"#FBFAF7",
                            color:isDark?"#F6F3EA":"#555",
                            fontSize:"18px",
                            fontWeight:900,
                            lineHeight:1,
                            cursor:"pointer",
                            display:"flex",
                            alignItems:"center",
                            justifyContent:"center",
                            padding:"0 0 2px",
                            boxShadow:"0 2px 8px rgba(0,0,0,0.04)",
                          }}
                        >
                          {expanded ? "▴" : "▾"}
                        </button>
                      </div>
                    </div>

                    {expanded && (
                      <div style={{
                        marginTop:"14px",
                        padding:"14px 16px 12px",
                        border:"1px solid "+(isDark?"rgba(255,255,255,0.12)":"rgba(0,0,0,0.06)"),
                        borderRadius:"16px",
                        background:isDark?"#0B0E0B":"#FBFAF7",
                      }}>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:"8px"}}>
                          {statItems.map((stat)=>(
                            <div key={stat.label} style={{background:isDark?"#151915":"#F7F7F7",border:"1px solid "+(isDark?"rgba(255,255,255,0.12)":"rgba(0,0,0,0.06)"),borderRadius:"12px",padding:"8px 6px",minWidth:0,boxSizing:"border-box"}}>
                              <span style={{display:"block",fontFamily:F,fontSize:"11px",color:isDark?"#AEB6AE":"#777",fontWeight:900,letterSpacing:"1px",textTransform:"uppercase",textAlign:"center"}}>{stat.label}</span>
                              <span style={{display:"block",marginTop:"4px",fontFamily:F,color:isDark?"#F6F3EA":"#050505",fontSize:"14px",fontWeight:900,textAlign:"center",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{stat.value}</span>
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={()=>isArtists ? openArtistDetails(item.t) : openReleaseDetails(item,isSingles?"single":"album")}
                          style={{
                            marginTop:"11px",
                            width:"100%",
                            border:"1px solid "+(isDark?"rgba(184,134,11,0.42)":"rgba(184,134,11,0.22)"),
                            borderRadius:"13px",
                            background:isDark?"#151915":"#FFF",
                            color:GOLD,
                            fontFamily:F,
                            fontSize:"12px",
                            fontWeight:900,
                            letterSpacing:"1px",
                            textTransform:"uppercase",
                            padding:"10px 12px",
                            cursor:"pointer",
                          }}
                        >
                          View {itemTypeLabel} Details
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{overflowX:"visible",overflowY:"hidden",WebkitOverflowScrolling:"touch",margin:"0",paddingBottom:"0"}}>
              <div style={{minWidth:"0",width:"100%"}}>
                {/* Column headers — styled like Charts page */}
                <div style={{
                  display:"grid",
                  gridTemplateColumns:"54px minmax(0,1fr) 148px 92px",
                  columnGap:"30px",
                  padding:"11px 0",
                  borderBottom:"2px solid "+(isDark?"#3a3e3a":"#1A1A1A"),
                  fontFamily:F,
                  fontSize:"12px",
                  fontWeight:900,
                  letterSpacing:"1.5px",
                  textTransform:"uppercase",
                  color:isDark?"#8a9288":"#4F5751",
                  alignItems:"end"
                }}>
                  <span style={{textAlign:"center"}}>#</span>
                  <span>{isArtists ? "ARTIST" : "TITLE"}</span>
                  <span style={{textAlign:"center",justifySelf:"stretch",whiteSpace:"nowrap"}}>TOTAL PTS</span>
                  <span style={{textAlign:"center",justifySelf:"stretch",whiteSpace:"nowrap"}}>MONTHS</span>
                </div>

                {yearEnd.slice(0,50).map((item,idx)=>{
                  const t3=idx<3;
                  const certification = isArtists ? null : getCertificationForEntry(item, isSingles ? "single" : "album");
                  return(
                    <div
                      key={item.t+(item.a || "")}
                      style={{
                        display:"grid",
                        gridTemplateColumns:"54px minmax(0,1fr) 148px 92px",
                        columnGap:"30px",
                        padding:t3?"14px 0":"10px 0",
                        borderBottom:"1px solid "+(isDark?"#2a2e2a":"#F2F2EE"),
                        alignItems:"center",
                        cursor:"default",
                        transition:"background 120ms ease",
                      }}
                      onMouseEnter={e=>e.currentTarget.style.background=isDark?"#141814":"#FAFAF6"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                    >
                      {/* Rank */}
                      <div style={{textAlign:"center",fontSize:t3?"22px":"16px",fontWeight:900,color:t3?MEDALS[idx]:(isDark?"#5a625a":"#B0B5B0"),letterSpacing:"-0.3px"}}>{idx+1}</div>

                      {/* Title + artist + art */}
                      <div style={{display:"flex",alignItems:"center",gap:"12px",minWidth:0}}>
                        <div style={{width:"52px",height:"52px",minWidth:"52px",borderRadius:"10px",overflow:"hidden",flexShrink:0,background:isDark?"#1A1E1A":"#F0EDE7",position:"relative"}}>
                          {item.cover_image
                            ? <img src={item.cover_image} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",display:"block"}} loading="lazy"/>
                            : <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:isDark?"#1e221e":"#e8e5de"}}><svg viewBox="0 0 24 24" width="40%" height="40%" fill="none"><circle cx="12" cy="12" r="3" fill={isDark?"#4a524a":"#a8a09a"}/><path d="M9 12a3 3 0 1 0 6 0V6l4-1" stroke={isDark?"#4a524a":"#a8a09a"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                          }
                        </div>
                        <div style={{minWidth:0}}>
                          <div style={{
                            display:"flex",
                            alignItems:"center",
                            gap:"7px",
                            flexWrap:"wrap",
                            fontSize:t3?"17px":"15px",
                            fontWeight:850,
                            marginBottom:"2px",
                            lineHeight:1.15,
                            color:isDark?"#F6F3EA":"#050505",
                          }}>
                            <button type="button" onClick={()=>isArtists ? openArtistDetails(item.t) : openReleaseDetails(item,isSingles?"single":"album")} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:"inherit",fontWeight:"inherit",lineHeight:"inherit",cursor:"pointer",textAlign:"left",color:"inherit"}}>{item.t}</button>
                            {certification&&<CertificationTag cert={certification} compact />}
                          </div>
                          <button type="button" onClick={(event)=>{event.stopPropagation();openArtistDetails(isArtists ? item.t : item.a);}} style={{
                            fontSize:"13px",
                            color:isDark?"#8a9288":"#59645D",
                            fontFamily:F,
                            border:0,
                            background:"transparent",
                            padding:0,
                            textAlign:"left",
                            cursor:"pointer",
                            marginTop:"2px",
                          }}>
                            {item.a}
                          </button>
                        </div>
                      </div>

                      {/* Total pts */}
                      <div style={{
                        textAlign:"center",
                        justifySelf:"stretch",
                        fontFamily:F,
                        fontSize:t3?"17px":"15px",
                        fontWeight:900,
                        color:t3?GOLD:(isDark?"#8a9288":"#8a9288"),
                        whiteSpace:"nowrap"
                      }}>
                        {item.totalPts.toLocaleString()}
                      </div>

                      {/* Months */}
                      <div style={{
                        textAlign:"center",
                        justifySelf:"stretch",
                        fontFamily:F,
                        fontSize:"14px",
                        color:isDark?"#8a9288":"#8a9288",
                        fontWeight:800,
                        whiteSpace:"nowrap"
                      }}>
                        {item.months}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
  );
}
