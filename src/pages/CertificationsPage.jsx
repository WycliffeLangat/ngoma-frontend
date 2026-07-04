export default function CertificationsPage({ ctx }) {
  const {
    CERTIFICATION_LEVELS,
    CountryBadge,
    F,
    PAD,
    SF,
    TXT,
    Tog,
    card,
    certColors,
    certIcons,
    certs,
    isMobile,
    isSingles,
    isArtists,
    openArtistDetails,
    openReleaseDetails,
    secLbl
  } = ctx;

  const certIconFilters = Object.fromEntries(CERTIFICATION_LEVELS.map(l => [l.level, l.iconFilter || null]));

  // Each entry should only appear at its highest certification level.
  // CERTIFICATION_LEVELS is ordered highest→lowest (index 0 = diamond, etc.).
  const levelRank = Object.fromEntries(CERTIFICATION_LEVELS.map((l, i) => [l.level, i]));
  const deduplicatedCerts = Object.values(
    certs.reduce((acc, c) => {
      const key = `${String(c.t||"").toLowerCase()}|||${String(c.a||"").toLowerCase()}`;
      if (!acc[key] || (levelRank[c.level] ?? 99) < (levelRank[acc[key].level] ?? 99)) {
        acc[key] = c;
      }
      return acc;
    }, {})
  );

  if (isArtists) {
    return (
      <div style={{padding:PAD,background:"#FFF",minHeight:"60vh",boxSizing:"border-box",overflow:"hidden"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:isMobile?"stretch":"flex-end",marginBottom:"24px",gap:isMobile?"12px":"20px",flexDirection:isMobile?"column":"row"}}>
          <div>
            <h2 style={{fontSize:TXT.pageTitle,fontWeight:800,margin:"0 0 4px"}}>Artist Certifications</h2>
            <p style={{fontFamily:F,fontSize:TXT.lead,color:"#69716B",margin:0,lineHeight:1.55}}>Artist certification rules have not been activated yet. Song and album certifications remain based on cumulative Combined chart points.</p>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:isMobile?"10px":"12px",flexWrap:"wrap"}}>
            <Tog sm/>
          </div>
        </div>
        <div style={{...card({textAlign:"center",padding:isMobile?"28px":"34px"})}}>
          <div style={{fontFamily:SF,fontSize:isMobile?"22px":"26px",fontWeight:850,marginBottom:"8px"}}>No artist certifications yet</div>
          <div style={{fontFamily:F,fontSize:TXT.body,color:"#69716B",lineHeight:1.6}}>Use the Artists toggle on Charts, Analytics, Records, and Year End to view artist rankings and comparisons.</div>
        </div>
      </div>
    );
  }

  return (
<div style={{padding:PAD,background:"#FFF",minHeight:"60vh",boxSizing:"border-box",overflow:"hidden"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:isMobile?"stretch":"flex-end",marginBottom:"24px",gap:isMobile?"12px":"20px",flexDirection:isMobile?"column":"row"}}>
            <div>
              <h2 style={{fontSize:TXT.pageTitle,fontWeight:800,margin:"0 0 4px"}}>Certifications</h2>
              <p style={{fontFamily:F,fontSize:TXT.lead,color:"#69716B",margin:0,lineHeight:1.55}}>Awarded from cumulative Combined chart points earned across every month a song or album appears.</p>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:isMobile?"10px":"12px",flexWrap:"wrap"}}>
              <Tog sm/>
            </div>
          </div>
          <div className="anl-grid-3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px",marginBottom:"28px"}}>
            {CERTIFICATION_LEVELS.map((c,i)=>(
              <div key={i} style={{...card({textAlign:"center"}),borderTop:"3px solid "+c.color}}>
                <div style={{fontSize:"28px"}}><span style={c.iconFilter?{filter:c.iconFilter}:undefined}>{c.icon}</span></div>
                <div style={{fontWeight:800,fontSize:TXT.metric,margin:"6px 0 2px",color:c.color}}>{c.label}</div>
                <div style={{fontFamily:F,fontSize:TXT.cardMeta,color:"#69716B"}}>{c.pts.toLocaleString()}+ points</div>
              </div>
            ))}
          </div>
          <div style={{marginTop:"20px"}}>
            {CERTIFICATION_LEVELS.map(({ level })=>{
              const filtered=deduplicatedCerts.filter(c=>c.level===level).sort((a,b)=>(b.totalPts||0)-(a.totalPts||0));
              if(!filtered.length)return null;
              return(<div key={level} style={{marginBottom:"32px"}}>
                <div style={{...secLbl(certColors[level]),marginBottom:"16px",fontSize:"15px",letterSpacing:"0.5px"}}><span style={certIconFilters[level]?{filter:certIconFilters[level]}:undefined}>{certIcons[level]}</span> {level.charAt(0).toUpperCase()+level.slice(1)} Certified ({filtered.length})</div>
                <div className="cert-wall">
                  {filtered.map((c,i)=>(
                    <div key={i} className={`cert-wall-card ${level}`} style={{borderTop:"3px solid "+certColors[level],background:certColors[level]+"08",display:"flex",flexDirection:"column",gap:"10px"}}>
                      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"8px"}}>
                        <span className="cert-icon" style={{flexShrink:0}}><span style={certIconFilters[level]?{filter:certIconFilters[level]}:undefined}>{certIcons[level]}</span></span>
                        <div style={{textAlign:"right",fontFamily:F,flexShrink:0}}>
                          <div style={{fontSize:"20px",fontWeight:900,color:certColors[level],lineHeight:1}}>{c.totalPts.toLocaleString()}</div>
                          <div style={{fontSize:"12px",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.8px",color:"#9a9a9a",marginTop:"2px"}}>pts</div>
                        </div>
                      </div>
                      <div>
                        <button type="button" onClick={()=>openReleaseDetails(c,isSingles?"single":"album")} style={{display:"block",border:0,background:"transparent",padding:0,fontFamily:SF,fontWeight:800,fontSize:"17px",lineHeight:1.25,cursor:"pointer",textAlign:"left",color:"#050505",marginBottom:"4px",whiteSpace:"normal",wordBreak:"break-word"}}>{c.t}</button>
                        <button type="button" onClick={(event)=>{event.stopPropagation();openArtistDetails(c.a);}} style={{display:"block",fontFamily:F,fontSize:"14px",color:"#69716B",fontWeight:700,padding:0,border:0,background:"transparent",cursor:"pointer",textAlign:"left",marginBottom:"6px"}}>{c.a}</button>
                        <CountryBadge artist={c.a} showName style={{marginTop:"2px"}} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>);
            })}
            {!deduplicatedCerts.length&&<div style={{padding:"40px",textAlign:"center",fontFamily:F,color:"#CCC"}}>No certifications yet</div>}
          </div>
        </div>
  );
}
