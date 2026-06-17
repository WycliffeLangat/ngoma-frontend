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
    openArtistDetails,
    openReleaseDetails,
    secLbl
  } = ctx;

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
                <div style={{fontSize:"28px"}}>{c.icon}</div>
                <div style={{fontWeight:800,fontSize:TXT.metric,margin:"6px 0 2px",color:c.color}}>{c.label}</div>
                <div style={{fontFamily:F,fontSize:TXT.cardMeta,color:"#69716B"}}>{c.pts.toLocaleString()}+ points</div>
              </div>
            ))}
          </div>
          <div style={{marginTop:"16px"}}>
            {CERTIFICATION_LEVELS.map(({ level })=>{
              const filtered=certs.filter(c=>c.level===level);
              if(!filtered.length)return null;
              return(<div key={level} style={{marginBottom:"24px"}}>
                <div style={{...secLbl(certColors[level]),marginBottom:"12px"}}>{certIcons[level]} {level.charAt(0).toUpperCase()+level.slice(1)} Certified ({filtered.length})</div>
                <div className="anl-grid-2" style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"8px"}}>
                  {filtered.map((c,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:"12px",padding:"12px 14px",background:certColors[level]+"0A",borderRadius:"8px",border:"1px solid "+certColors[level]+"22"}}>
                      <div style={{fontSize:"22px"}}>{certIcons[level]}</div>
                      <div style={{flex:1}}>
                        <button type="button" onClick={()=>openReleaseDetails(c,isSingles?"single":"album")} style={{display:"block",border:0,background:"transparent",padding:0,fontFamily:SF,fontWeight:800,fontSize:TXT.cardTitle,lineHeight:1.18,cursor:"pointer",textAlign:"left"}}>{c.t}</button>
                        <button type="button" onClick={(event)=>{event.stopPropagation();openArtistDetails(c.a);}} style={{display:"block",fontFamily:F,fontSize:TXT.cardMeta,color:"#69716B",fontWeight:750,marginTop:"3px",padding:0,border:0,background:"transparent",cursor:"pointer",textAlign:"left"}}>{c.a}</button>
                        <CountryBadge artist={c.a} showName style={{marginTop:"7px"}} />
                      </div>
                      <div style={{textAlign:"right",fontFamily:F}}>
                        <div style={{fontSize:"13px",fontWeight:700,color:certColors[level]}}>{c.totalPts.toLocaleString()}</div>
                        <div style={{fontSize:"9px",color:"#CCC"}}>pts</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>);
            })}
            {!certs.length&&<div style={{padding:"40px",textAlign:"center",fontFamily:F,color:"#CCC"}}>No certifications yet</div>}
          </div>
        </div>
  );
}
