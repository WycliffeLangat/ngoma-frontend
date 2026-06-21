export default function YearEndPage({ ctx }) {
  const {
    BRONZE,
    CertificationTag,
    CountryBadge,
    DATA_PERIOD,
    F,
    GOLD,
    MEDALS,
    PAD,
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
    toggleYearEndRow,
    yearEnd
  } = ctx;

  return (
<div style={{padding:PAD,background:isDark?"#050805":"#FFF",minHeight:"60vh",boxSizing:"border-box",overflow:"hidden"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:isMobile?"stretch":"flex-end",marginBottom:isMobile?"16px":"20px",gap:isMobile?"12px":"20px",flexDirection:isMobile?"column":"row"}}>
            <div>
              <div style={{fontFamily:F,fontSize:isMobile?"10.5px":"11px",letterSpacing:isMobile?"1.8px":"2px",textTransform:"uppercase",color:GOLD,marginBottom:"6px",fontWeight:850}}>ANNUAL CHART</div>
              <h2 style={{fontSize:TXT.pageTitle,fontWeight:800,margin:0,color:isDark?"#F6F3EA":"#050505"}}>Best of the Year</h2>
              <p style={{fontFamily:F,fontSize:TXT.lead,color:isDark?"#D7DBD7":"#59645D",margin:"4px 0 0",lineHeight:1.55}}>Aggregated Display Points across {DATA_PERIOD}</p>
            </div>
            <div className="year-end-actions" data-share-action-area="true" style={{display:"flex",alignItems:"center",gap:isMobile?"10px":"12px",flexWrap:"wrap",position:isMobile?"sticky":"static",top:isMobile?"0":"auto",zIndex:isMobile?5:"auto",background:isMobile?(isDark?"#050805":"#FFF"):"transparent",padding:isMobile?"8px 0 4px":"0"}}>
              <Tog sm/>
            </div>
          </div>

          {/* Podium */}
          {(()=>{
            const podiumItems = isMobile
              ? [
                  { e: yearEnd[0], pos: 1, medal: MEDALS[0], featured: true },
                  { e: yearEnd[1], pos: 2, medal: SILVER, featured: false },
                  { e: yearEnd[2], pos: 3, medal: BRONZE, featured: false },
                ]
              : [
                  { e: yearEnd[1], pos: 2, medal: SILVER, featured: false },
                  { e: yearEnd[0], pos: 1, medal: MEDALS[0], featured: true },
                  { e: yearEnd[2], pos: 3, medal: BRONZE, featured: false },
                ];
            return (
              <div className="podium-grid" style={{display:"grid",gridTemplateColumns:"1fr 1.2fr 1fr",gap:isMobile?"10px":"12px",marginBottom:isMobile?"20px":"24px",alignItems:"end"}}>
                {podiumItems.map(({e,pos,medal,featured},i)=>{
                  if(!e)return <div key={i}/>;
                  const certification = isArtists ? null : getCertificationForEntry(e, isSingles ? "single" : "album");
                  return(<div key={`${pos}-${e.t}-${e.a}`} style={{textAlign:"center"}}>
                    <div style={{background:isDark?"#0F120F":featured?"linear-gradient(180deg,#FFF9E8 0%,#FFFDF8 100%)":medal+"12",border:(featured?"2.5px":"2px")+" solid "+medal,borderRadius:isMobile?"12px":"13px",padding:featured?(isMobile?"18px 12px":"18px 14px"):(isMobile?"15px 12px":"16px 12px"),boxShadow:isDark?"none":featured?"0 14px 36px rgba(184,134,11,0.16)":"none",transform:(!isMobile&&featured)?"translateY(-2px)":"none"}}>
                      <div style={{fontSize:featured?(isMobile?"33px":"38px"):"32px",fontWeight:950,color:medal,lineHeight:1}}>#{pos}</div>
                      <CountryBadge artist={isArtists ? e.t : e.a} style={{margin:"10px auto 0",minWidth:isMobile?"34px":"38px",height:isMobile?"30px":"34px",borderRadius:"11px",padding:"0 7px"}} />
                      <button type="button" onClick={()=>isArtists ? openArtistDetails(e.t) : openReleaseDetails(e,isSingles?"single":"album")} style={{display:"block",width:"100%",border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:featured?(isMobile?"16px":"16px"):TXT.cardTitle,fontWeight:850,margin:"8px 0 4px",lineHeight:1.18,cursor:"pointer",color:isDark?"#F6F3EA":"#050505"}}>{e.t}</button>
                      <button type="button" onClick={(event)=>{event.stopPropagation();openArtistDetails(isArtists ? e.t : e.a);}} style={{display:"block",width:"100%",fontSize:TXT.cardMeta,color:isDark?"#D7DBD7":"#59645D",fontFamily:F,fontWeight:750,marginBottom:"6px",padding:0,border:0,background:"transparent",cursor:"pointer"}}>{e.a}</button>
                      {certification&&<CertificationTag cert={certification} compact style={{margin:"0 auto 8px"}} />}
                      <div style={{fontSize:featured?(isMobile?"18px":"20px"):"18px",fontWeight:850,color:medal}}>{e.totalPts.toLocaleString()}</div>
                    </div>
                  </div>);
                })}
              </div>
            );
          })()}

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
                      <div style={{fontSize:t3?"28px":"24px",fontWeight:950,lineHeight:1,color:medalColor,textAlign:"center",fontFamily:F}}>{idx+1}</div>

                      <div style={{display:"flex",alignItems:"center",gap:"11px",minWidth:0,maxWidth:"100%"}}>
                        <CountryBadge artist={isArtists ? item.t : item.a} style={{minWidth:"42px",width:"42px",height:"42px",borderRadius:"12px",padding:0,flexShrink:0}} />
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
                              fontSize:t3?"15.5px":"15px",
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
                              fontSize:"12.2px",
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
                              <span style={{display:"block",fontFamily:F,fontSize:"9px",color:isDark?"#AEB6AE":"#777",fontWeight:900,letterSpacing:"1px",textTransform:"uppercase",textAlign:"center"}}>{stat.label}</span>
                              <span style={{display:"block",marginTop:"4px",fontFamily:F,color:isDark?"#F6F3EA":"#050505",fontSize:"12px",fontWeight:900,textAlign:"center",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{stat.value}</span>
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
                            fontSize:"10.5px",
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
            <div style={{
              overflowX:"visible",
              overflowY:"hidden",
              WebkitOverflowScrolling:"touch",
              margin:"0",
              paddingBottom:"0"
            }}>
              <div style={{minWidth:"0",width:"100%"}}>
                <div style={{
                  display:"grid",
                  gridTemplateColumns:"54px minmax(0,1fr) 148px 92px",
                  columnGap:"30px",
                  padding:"11px 0",
                  borderBottom:"2px solid #1A1A1A",
                  fontFamily:F,
                  fontSize:"9px",
                  fontWeight:900,
                  letterSpacing:"1.8px",
                  textTransform:"uppercase",
                  color:"#4F5751",
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
                        padding:t3?"13px 0":"9px 0",
                        borderBottom:"1px solid #F2F2EE",
                        alignItems:"center",
                        cursor:"default"
                      }}
                      onMouseEnter={e=>e.currentTarget.style.background="#FAFAF6"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                    >
                      <div style={{textAlign:"center",fontSize:t3?"20px":"13px",fontWeight:850,color:t3?MEDALS[idx]:"#BFC4BF"}}>{idx+1}</div>

                      <div style={{display:"flex",alignItems:"center",gap:"12px",minWidth:0}}>
                        <CountryBadge artist={isArtists ? item.t : item.a} style={{minWidth:"50px",width:"50px",height:"50px",borderRadius:"14px",padding:0,flexShrink:0}} />
                        <div style={{minWidth:0}}>
                          <div style={{
                            display:"flex",
                            alignItems:"center",
                            gap:"7px",
                            flexWrap:"wrap",
                            fontSize:t3?"14px":TXT.cardTitle,
                            fontWeight:850,
                            marginBottom:"1px",
                            lineHeight:1.15,
                            whiteSpace:"normal",
                            overflow:"visible",
                            textOverflow:"clip"
                          }}>
                            <button type="button" onClick={()=>isArtists ? openArtistDetails(item.t) : openReleaseDetails(item,isSingles?"single":"album")} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:"inherit",fontWeight:"inherit",lineHeight:"inherit",cursor:"pointer",textAlign:"left"}}>{item.t}</button>
                            {certification&&<CertificationTag cert={certification} compact />}
                          </div>
                          <button type="button" onClick={(event)=>{event.stopPropagation();openArtistDetails(isArtists ? item.t : item.a);}} style={{
                            fontSize:TXT.cardMeta,
                            color:"#59645D",
                            fontFamily:F,
                            border:0,
                            background:"transparent",
                            padding:0,
                            textAlign:"left",
                            cursor:"pointer",
                            marginTop:"3px",
                            whiteSpace:"normal",
                            overflow:"visible",
                            textOverflow:"clip"
                          }}>
                            {item.a}
                          </button>
                        </div>
                      </div>

                      <div style={{
                        textAlign:"center",
                        justifySelf:"stretch",
                        fontFamily:F,
                        fontSize:t3?"14px":TXT.cardMeta,
                        fontWeight:850,
                        color:t3?GOLD:"#59645D",
                        whiteSpace:"nowrap"
                      }}>
                        {item.totalPts.toLocaleString()}
                      </div>

                      <div style={{
                        textAlign:"center",
                        justifySelf:"stretch",
                        fontFamily:F,
                        fontSize:"11px",
                        color:"#7B817B",
                        fontWeight:750,
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
