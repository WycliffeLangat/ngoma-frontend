export default function ArtistDetailPage({ ctx }) {
  const {
    Bar,
    BarChart,
    CartesianGrid,
    CertificationTag,
    CountryBadge,
    F,
    GOLD,
    Line,
    LineChart,
    PAD,
    ResponsiveContainer,
    SF,
    SecMark,
    TXT,
    Tooltip,
    XAxis,
    YAxis,
    card,
    closeDetails,
    getCertificationForEntry,
    isDark,
    isMobile,
    isSingles,
    monthIndex,
    openReleaseDetails,
    secLbl,
    selA,
    selectedArtistEntries,
    selectedArtistEntryGroups,
    selectedArtistRankData,
    selectedArtistReleases
  } = ctx;

  const publicData = typeof window !== "undefined" ? (window.__NGOMA_PUBLIC_DATA__ || {}) : {};
  const artistMetadata = (publicData.artists || []).find((artist) =>
    [artist.name, artist.display_name, artist.public_name, ...(artist.aliases || [])]
      .some((name) => String(name || "").trim().toLowerCase() === String(selA?.n || "").trim().toLowerCase())
  ) || {};
  const artistLinks = Object.entries(artistMetadata.social_links || {}).filter(([, url]) => url);

  return (
<div style={{padding:PAD,background:"#FFF",minHeight:"60vh",boxSizing:"border-box",overflow:"hidden"}}>
          <span onClick={closeDetails} style={{fontFamily:F,fontSize:isMobile?"12px":"11px",color:GOLD,cursor:"pointer",letterSpacing:"1px",textTransform:"uppercase",fontWeight:600}}>← Back</span>
          <div style={{marginTop:"20px",display:"flex",gap:"20px",alignItems:isMobile?"stretch":"flex-start",flexDirection:isMobile?"column":"row",minWidth:0}}>
            <div style={{width:"80px",height:"80px",borderRadius:"50%",background:"linear-gradient(135deg,#FAF5EA,#EDE0C0)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"32px",fontWeight:900,color:GOLD,flexShrink:0,border:"2px solid "+GOLD+"22",boxShadow:"0 4px 16px rgba(184,134,11,0.12)",overflow:"hidden"}}>{artistMetadata.image?<img src={artistMetadata.image} alt={selA.n} style={{width:"100%",height:"100%",objectFit:"cover"}} />:selA.n[0]}</div>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap"}}>
                <h2 style={{margin:0,fontSize:isMobile?"24px":"26px",fontWeight:850,lineHeight:1.12}}>{selA.n}</h2>
                <CountryBadge artist={selA.n} showName />
              </div>
              <div style={{fontFamily:F,fontSize:TXT.lead,color:"#69716B",marginTop:"6px",lineHeight:1.45}}>Credited on {selA.t} {isSingles?"songs":"albums"} across {selA.m} months</div>
              {(artistMetadata.genre||artistMetadata.artist_type||artistMetadata.city_region||artistMetadata.verified)&&<div style={{display:"flex",gap:"7px",flexWrap:"wrap",marginTop:"10px"}}>{[["Genre",artistMetadata.genre],["Type",artistMetadata.artist_type],["From",artistMetadata.city_region],["Status",artistMetadata.verified?"Verified":""]].filter(([,value])=>value).map(([label,value])=><span key={label} style={{padding:"5px 8px",borderRadius:"999px",background:"#FAF5EA",border:`1px solid ${GOLD}33`,fontFamily:F,fontSize:"9.5px",fontWeight:800,color:"#59645D"}}>{label}: {value}</span>)}</div>}
              {artistMetadata.biography&&<p style={{fontFamily:F,fontSize:"12.5px",lineHeight:1.7,color:"#59645D",margin:"12px 0 0",maxWidth:"760px"}}>{artistMetadata.biography}</p>}
              {artistLinks.length>0&&<div style={{display:"flex",gap:"7px",flexWrap:"wrap",marginTop:"11px"}}>{artistLinks.map(([label,url])=><a key={label} href={url} target="_blank" rel="noopener noreferrer" style={{padding:"6px 9px",borderRadius:"999px",background:GOLD,color:"#FFF",fontFamily:F,fontSize:"9.5px",fontWeight:850,textDecoration:"none",textTransform:"capitalize"}}>{label.replace(/_/g," ")}</a>)}</div>}
              <div style={{display:"flex",gap:"24px",marginTop:"14px",fontFamily:F,flexWrap:"wrap"}}>
                {[{v:"#"+selA.rank,l:"Current Rank",c:GOLD},{v:"#"+selA.pk,l:"Best Artist Rank"},{v:selA.p.toLocaleString(),l:"Total Points"},{v:selA.t,l:"Entries"},{v:selA.m,l:"Months Active"}].map((s,i)=>(
                  <div key={i}><div style={{fontSize:"22px",fontWeight:700,color:s.c||"#1A1A1A"}}>{s.v}</div><div style={{fontSize:"9px",letterSpacing:"1.5px",color:"#CCC",textTransform:"uppercase"}}>{s.l}</div></div>
                ))}
              </div>
            </div>
          </div>
          <div className="anl-grid-2" style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:"14px",marginTop:"24px",marginBottom:"20px"}}>
            <div style={card()}>
              <div style={secLbl()}><SecMark/>Monthly Credited Points</div>
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={selectedArtistRankData}>
                  <XAxis dataKey="month" tick={{fontSize:10.5,fontFamily:F,fill:"#59645D",fontWeight:650}} tickLine={false}/>
                  <YAxis tick={{fontSize:10,fontFamily:F,fill:"#59645D",fontWeight:650}} axisLine={false} tickLine={false}/>
                  <Tooltip formatter={v=>[v.toLocaleString()+" pts","Points"]} contentStyle={{fontFamily:F,fontSize:11}}/>
                  <Bar dataKey="points" fill={GOLD} radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={card()}>
              <div style={secLbl()}><SecMark/>Cumulative Artist Rank</div>
              <ResponsiveContainer width="100%" height={190}>
                <LineChart data={selectedArtistRankData} margin={{top:8,right:12,left:0,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC"/>
                  <XAxis dataKey="month" tick={{fontSize:10.5,fontFamily:F,fill:"#59645D"}}/>
                  <YAxis reversed domain={[1,"dataMax"]} allowDecimals={false} tickCount={8} tick={{fontSize:10,fontFamily:F,fill:"#59645D"}} tickFormatter={v=>`#${v}`}/>
                  <Tooltip formatter={v=>[`#${v}`,"Artist Rank"]} contentStyle={{fontFamily:F,fontSize:11}}/>
                  <Line type="monotone" dataKey="rank" stroke="#1565C0" strokeWidth={3} connectNulls dot={{r:4}}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,minmax(0,1fr))":"repeat(4,minmax(0,1fr))",gap:"10px",marginBottom:"22px"}}>
            {[
              {label:"Unique Releases",value:selectedArtistReleases.length},
              {label:"Top 10 Placements",value:selectedArtistEntries.filter((entry)=>Number(entry.rank)<=10).length},
              {label:"#1 Placements",value:selectedArtistEntries.filter((entry)=>Number(entry.rank)===1).length},
              {label:"Best Release Rank",value:selectedArtistEntries.length?`#${Math.min(...selectedArtistEntries.map((entry)=>Number(entry.rank)))}`:"—"},
            ].map((stat)=><div key={stat.label} style={{padding:"12px 13px",border:"1px solid #ECE9E1",borderRadius:"10px",background:"#FAFAF8"}}><div style={{fontFamily:F,fontSize:"9px",fontWeight:900,letterSpacing:"1px",textTransform:"uppercase",color:"#7B857D"}}>{stat.label}</div><div style={{fontFamily:F,fontSize:"19px",fontWeight:900,marginTop:"5px"}}>{stat.value}</div></div>)}
          </div>
          <h3 style={secLbl()}>Charted Entries Across Months</h3>
          {selectedArtistEntryGroups.map((group)=>{
            const certification = getCertificationForEntry(group, isSingles ? "single" : "album");
            const bestRow = [...group.rows].sort((a,b)=>Number(a.rank)-Number(b.rank))[0];
            return (
              <details key={`${group.title}-${group.artist}`} style={{borderBottom:"1px solid #F2F2EE",fontFamily:F}}>
                <summary style={{display:"grid",gridTemplateColumns:isMobile?"minmax(0,1fr)":"minmax(0,1fr) 150px 90px",gap:"12px",alignItems:"center",padding:"11px 0",cursor:"pointer",listStyle:"none"}}>
                  <div style={{minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:"7px",flexWrap:"wrap"}}>
                      <button type="button" onClick={(event)=>{event.preventDefault();openReleaseDetails(bestRow,isSingles?"single":"album");}} style={{fontWeight:800,fontSize:TXT.cardTitle,fontFamily:SF,border:0,background:"transparent",padding:0,cursor:"pointer",textAlign:"left",color:isDark?"#F6F3EA":"#050505"}}>{group.title}</button>
                      {certification&&<CertificationTag cert={certification} compact />}
                    </div>
                    <span style={{display:"block",marginTop:"3px",color:isDark?"#AEB6AE":"#7B857D",fontSize:TXT.micro,fontFamily:F}}>{group.rows.length} {group.rows.length===1?"month":"months"} charted · peak #{group.peak}</span>
                  </div>
                  <div style={{fontFamily:F,fontSize:TXT.cardMeta,fontWeight:900,color:GOLD,whiteSpace:"nowrap",textAlign:isMobile?"left":"right"}}>{group.totalPoints.toLocaleString()} pts</div>
                  <div style={{fontFamily:F,fontSize:"10px",fontWeight:850,color:isDark?"#AEB6AE":"#69716B",textAlign:isMobile?"left":"right",textTransform:"uppercase",letterSpacing:"1px"}}>Months</div>
                </summary>
                <div style={{padding:"0 0 10px 0",display:"grid",gap:"6px"}}>
                  {[...group.rows].sort((a,b)=>monthIndex(a.month)-monthIndex(b.month)).map((row)=>(
                    <div key={row.month} style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 56px 70px",gap:"8px",alignItems:"center",padding:"7px 10px",borderRadius:"9px",background:isDark?"#121612":"#FAFAF8"}}>
                      <span style={{fontFamily:F,fontSize:"11px",fontWeight:800,color:isDark?"#D7DBD7":"#59645D"}}>{row.month}</span>
                      <span style={{fontFamily:F,fontSize:"11px",fontWeight:900,color:GOLD,textAlign:"right"}}>#{row.rank}</span>
                      <span style={{fontFamily:F,fontSize:"11px",fontWeight:850,color:isDark?"#F6F3EA":"#1A1A1A",textAlign:"right"}}>{Number(row.pts||0).toLocaleString()} pts</span>
                    </div>
                  ))}
                </div>
              </details>
            );
          })}
          {false&&(()=>{
            return selectedArtistEntries.sort((a,b)=>a.rank-b.rank).map((s,i)=>{
              const certification = getCertificationForEntry(s, isSingles ? "single" : "album");
              return (
              <div key={i} style={{display:"flex",justifyContent:"space-between",gap:"12px",padding:"9px 0",borderBottom:"1px solid #F2F2EE",fontFamily:F}}
                onMouseEnter={e=>e.currentTarget.style.background="#FAFAF6"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:"7px",flexWrap:"wrap"}}>
                    <button type="button" onClick={()=>openReleaseDetails(s,isSingles?"single":"album")} style={{fontWeight:800,fontSize:TXT.cardTitle,fontFamily:SF,border:0,background:"transparent",padding:0,cursor:"pointer",textAlign:"left"}}>{s.title}</button>
                    {certification&&<CertificationTag cert={certification} compact />}
                  </div>
                  <span style={{color:"#7B857D",fontSize:TXT.micro,fontFamily:F}}> {s.month}</span>
                </div>
                <div style={{whiteSpace:"nowrap"}}><span style={{color:GOLD,fontWeight:800,fontSize:TXT.cardMeta}}>#{s.rank}</span><span style={{color:"#69716B",fontSize:TXT.cardMeta}}> · {s.pts.toLocaleString()} pts</span></div>
              </div>
              );
            });
          })()}
        </div>
  );
}
