import { useState, useEffect } from "react";

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
    API_BASE,
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

  const [liveArtist, setLiveArtist] = useState(null);

  useEffect(() => {
    if (!API_BASE || !selA?.n) return;
    const slug = artistMetadata.slug ||
      String(selA.n).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    let cancelled = false;
    fetch(`${API_BASE}/app-data/artist/${slug}/`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled && data?.artist) setLiveArtist(data.artist); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [selA?.n, API_BASE]);

  const profile = liveArtist || artistMetadata;
  const artistLinks = Object.entries(profile.social_links || {}).filter(([, url]) => url);

  const entryCountryCode = selectedArtistEntries[0]?.artist_country_code || selectedArtistEntries[0]?.country_code || "";
  const entryCountry = selectedArtistEntries[0]?.artist_country || selectedArtistEntries[0]?.country || "";

  const countryItem = {
    artist_country_code: profile.country_code || entryCountryCode || "",
    artist_country: profile.country || entryCountry || "",
    country_code: profile.country_code || entryCountryCode || "",
    country: profile.country || entryCountry || "",
    artist: selA.n,
  };

  const aliases = profile.aliases;
  const aliasesDisplay = Array.isArray(aliases) && aliases.length
    ? JSON.stringify(aliases)
    : (typeof aliases === "string" && aliases) ? aliases : "[]";

  const artistInfoRows = [
    ["Artist name", selA.n],
    ["Display name", profile.display_name],
    ["Aliases", aliasesDisplay !== "[]" ? aliasesDisplay : null],
    ["Country", profile.country || entryCountry],
    ["Country code", profile.country_code || entryCountryCode],
    ["City / Region", profile.city_region],
    ["Genre", profile.genre],
    ["Artist type", profile.artist_type],
    ["Verified", profile.verified ? "Yes" : null],
    ["Status", profile.status],
    ["Spotify URL", profile.social_links?.spotify],
    ["Apple Music URL", profile.social_links?.apple_music],
    ["YouTube URL", profile.social_links?.youtube],
    ["Boomplay URL", profile.social_links?.boomplay],
    ["Audiomack URL", profile.social_links?.audiomack],
    ["TikTok URL", profile.social_links?.tiktok],
    ["Instagram URL", profile.social_links?.instagram],
    ["X URL", profile.social_links?.x],
    ["Facebook URL", profile.social_links?.facebook],
    ["Website URL", profile.social_links?.website],
  ].filter(([, value]) => value !== null && value !== undefined && value !== "");

  const urlLabels = new Set(["Spotify URL", "Apple Music URL", "YouTube URL", "Boomplay URL", "Audiomack URL", "TikTok URL", "Instagram URL", "X URL", "Facebook URL", "Website URL"]);

  return (
<div style={{padding:PAD,background:"#FFF",minHeight:"60vh",boxSizing:"border-box",overflow:"hidden"}}>
          <span onClick={closeDetails} style={{fontFamily:F,fontSize:isMobile?"12px":"11px",color:GOLD,cursor:"pointer",letterSpacing:"1px",textTransform:"uppercase",fontWeight:600}}>← Back</span>
          <div style={{marginTop:"20px",display:"flex",gap:"20px",alignItems:isMobile?"stretch":"flex-start",flexDirection:isMobile?"column":"row",minWidth:0}}>
            <div style={{width:"80px",height:"80px",borderRadius:"50%",background:"linear-gradient(135deg,#FAF5EA,#EDE0C0)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"32px",fontWeight:900,color:GOLD,flexShrink:0,border:"2px solid "+GOLD+"22",boxShadow:"0 4px 16px rgba(184,134,11,0.12)",overflow:"hidden"}}>{profile.image?<img src={profile.image} alt={selA.n} style={{width:"100%",height:"100%",objectFit:"cover"}} />:selA.n[0]}</div>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap"}}>
                <h2 style={{margin:0,fontSize:isMobile?"24px":"26px",fontWeight:850,lineHeight:1.12}}>{selA.n}</h2>
                <CountryBadge item={countryItem} showName />
              </div>
              <div style={{fontFamily:F,fontSize:TXT.lead,color:"#69716B",marginTop:"6px",lineHeight:1.45}}>Credited on {selA.t} {isSingles?"songs":"albums"} across {selA.m} months</div>
              {profile.biography&&<p style={{fontFamily:F,fontSize:"12.5px",lineHeight:1.7,color:"#59645D",margin:"12px 0 0",maxWidth:"760px"}}>{profile.biography}</p>}
              <div style={{display:"flex",gap:"24px",marginTop:"14px",fontFamily:F,flexWrap:"wrap"}}>
                {[{v:"#"+selA.rank,l:"Current Rank",c:GOLD},{v:"#"+selA.pk,l:"Best Artist Rank"},{v:selA.p.toLocaleString(),l:"Total Points"},{v:selA.t,l:"Entries"},{v:selA.m,l:"Months Active"}].map((s,i)=>(
                  <div key={i}><div style={{fontSize:"22px",fontWeight:700,color:s.c||"#1A1A1A"}}>{s.v}</div><div style={{fontSize:"9px",letterSpacing:"1.5px",color:"#CCC",textTransform:"uppercase"}}>{s.l}</div></div>
                ))}
              </div>
            </div>
          </div>

          <div style={{margin:"20px 0 18px",border:"1px solid #ECE9E1",borderRadius:"12px",overflow:"hidden"}}>
            {artistInfoRows.map(([label, value], idx) => (
              <div key={label} style={{display:"grid",gridTemplateColumns:isMobile?"110px 1fr":"150px 1fr",gap:"12px",padding:"9px 14px",background:idx%2===0?"#FAFAF8":"#FFFFFF",borderTop:idx===0?"none":"1px solid #F0EDE6",alignItems:"center"}}>
                <span style={{fontFamily:F,fontSize:"9.5px",fontWeight:700,letterSpacing:"0.4px",color:"#7B857D",textTransform:"uppercase"}}>{label}</span>
                {urlLabels.has(label) ? (
                  <a href={value} target="_blank" rel="noopener noreferrer" onClick={(e)=>e.stopPropagation()} style={{fontFamily:F,fontSize:"12px",fontWeight:700,color:GOLD,textDecoration:"none",wordBreak:"break-all"}}>{value} ↗</a>
                ) : (
                  <span style={{fontFamily:F,fontSize:"12px",fontWeight:600,color:"#1A1A1A",wordBreak:"break-word"}}>{value}</span>
                )}
              </div>
            ))}
          </div>

          <div className="anl-grid-2" style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:"14px",marginBottom:"20px"}}>
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
                      <button type="button" onClick={(event)=>{event.preventDefault();openReleaseDetails(bestRow,isSingles?"single":"album");}} style={{fontWeight:800,fontSize:TXT.cardTitle,fontFamily:SF,border:0,background:"transparent",padding:0,cursor:"pointer",textAlign:"left",color:isDark?"#F6F3EA":"#050505"}}>
                        {group.title}{certification&&<span aria-label={`${certification.label} certified`} title={`${certification.label} certified · ${Number(certification.totalPts||0).toLocaleString()} points`} style={{marginLeft:"5px",opacity:0.9}}>({certification.icon})</span>}
                      </button>
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
        </div>
  );
}
