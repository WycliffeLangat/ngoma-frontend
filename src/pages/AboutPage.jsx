export default function AboutPage({ ctx }) {
  const {
    CERTIFICATION_LEVELS,
    DATA_PERIOD,
    F,
    GOLD,
    PAD,
    SF,
    TXT,
    card,
    hof,
    isDark,
    isMobile,
    navTo,
    openReleaseDetails
  } = ctx;

  return (
<div style={{padding:PAD,background:"#FFF",minHeight:"60vh",boxSizing:"border-box",overflow:"hidden"}}>
          <h2 style={{fontSize:TXT.pageTitle,fontWeight:800,margin:"0 0 4px",color:isDark?"#F6F3EA":"#050505"}}>About Ngoma Charts</h2>
          <p style={{fontFamily:F,fontSize:TXT.lead,color:isDark?"#D7DBD7":"#59645D",margin:"0 0 24px",lineHeight:1.7}}>Ngoma Charts tracks the music performing strongly in Kenya by comparing songs and albums across major digital platforms, then turning that activity into simple monthly Top 50 charts, artist rankings, analytics, records and certifications.</p>
          <div className="anl-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px"}}>
            <div style={card()}>
              <h3 style={{fontFamily:F,fontSize:TXT.micro,fontWeight:800,letterSpacing:"2px",textTransform:"uppercase",color:GOLD,margin:"0 0 10px"}}>How It Works</h3>
              <p style={{fontSize:TXT.body,color:isDark?"#D7DBD7":"#555F59",lineHeight:1.72,margin:0,fontFamily:F}}>Every month, Ngoma Charts reviews platform chart positions for singles and albums. Each platform ranking is normalized into points, the platform results are combined, and the highest-scoring releases form the Combined Top 50. Movement, peak, months on chart and platform coverage are then calculated from the release's full chart history.</p>
              <div style={{marginTop:"15px",padding:"12px",background:isDark?"#151815":"#FAF8F2",borderRadius:"12px",border:isDark?"1px solid #2F352F":"1px solid #EDE6D6"}}>
                <div style={{height:"8px",borderRadius:"999px",background:"linear-gradient(90deg,#B8860B 0%,#E7C86C 48%,#E9E7E0 100%)"}}></div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:"7px",fontFamily:F,fontSize:"10px",fontWeight:850,color:isDark?"#B8BDB8":"#59645D"}}><span>Higher rank = more points</span><span>Top 50 tracked monthly</span></div>
              </div>
            </div>
            <div style={card()}>
              <h3 style={{fontFamily:F,fontSize:TXT.micro,fontWeight:800,letterSpacing:"2px",textTransform:"uppercase",color:GOLD,margin:"0 0 10px"}}>Platforms Tracked</h3>
              <div style={{display:"flex",flexWrap:"wrap",gap:"7px"}}>{[["Apple Music","#FC3C44"],["Audiomack","#F68B1F"],["Boomplay","#00FFFF"],["Spotify","#1DB954"],["YouTube","#FF0000"],["Shazam","#0088FF"]].map(([p,c])=><span key={p} style={{display:"inline-flex",alignItems:"center",minHeight:"28px",padding:"5px 10px",background:c+"18",borderRadius:"999px",fontSize:TXT.note,fontFamily:F,fontWeight:750,color:p==="Boomplay"?"#007C7C":c,border:`1px solid ${c}35`}}>{p}</span>)}</div>
            </div>
            <div style={card()}>
              <h3 style={{fontFamily:F,fontSize:TXT.micro,fontWeight:800,letterSpacing:"2px",textTransform:"uppercase",color:GOLD,margin:"0 0 10px"}}>Singles Chart</h3>
              <p style={{fontSize:TXT.body,color:"#555F59",lineHeight:1.65,margin:"0 0 13px",fontFamily:F}}>The singles chart combines performance across all six tracked platforms.</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>{["Apple Music","Audiomack","Boomplay","Spotify","YouTube","Shazam"].map(p=><span key={p} style={{padding:"5px 9px",borderRadius:"9px",background:"#F7F6F2",border:"1px solid #E9E6DE",fontFamily:F,fontSize:"9.5px",fontWeight:800,color:"#4F5751"}}>{p}</span>)}</div>
            </div>
            <div style={card()}>
              <h3 style={{fontFamily:F,fontSize:TXT.micro,fontWeight:800,letterSpacing:"2px",textTransform:"uppercase",color:GOLD,margin:"0 0 10px"}}>Albums Chart</h3>
              <p style={{fontSize:TXT.body,color:"#555F59",lineHeight:1.65,margin:"0 0 13px",fontFamily:F}}>Album rankings are based on Apple Music and Audiomack. Their platform data determines the Combined order, which is then displayed on the same 50-to-1 scale as singles.</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:"7px"}}><span style={{padding:"6px 10px",borderRadius:"9px",background:"#FC3C4412",border:"1px solid #FC3C4435",fontFamily:F,fontSize:"9.5px",fontWeight:850,color:"#FC3C44"}}>Apple Music</span><span style={{padding:"6px 10px",borderRadius:"9px",background:"#F68B1F12",border:"1px solid #F68B1F35",fontFamily:F,fontSize:"9.5px",fontWeight:850,color:"#D66E00"}}>Audiomack</span></div>
            </div>
            <div style={card()}>
              <h3 style={{fontFamily:F,fontSize:TXT.micro,fontWeight:800,letterSpacing:"2px",textTransform:"uppercase",color:GOLD,margin:"0 0 10px"}}>Certifications</h3>
              <div style={{display:"grid",gap:"8px"}}>{CERTIFICATION_LEVELS.map(level=><div key={level.level} style={{display:"grid",gridTemplateColumns:"30px minmax(0,1fr) auto",gap:"9px",alignItems:"center",padding:"9px 10px",borderRadius:"11px",background:`${level.color}0B`,border:`1px solid ${level.color}25`}}><span style={{fontSize:"18px",textAlign:"center"}}>{level.icon}</span><strong style={{fontFamily:F,fontSize:"11px",color:level.color}}>{level.label}</strong><span style={{fontFamily:F,fontSize:"10px",fontWeight:800,color:"#59645D"}}>{level.pts.toLocaleString()}+ pts</span></div>)}</div>
            </div>
            <div style={card()}>
              <h3 style={{fontFamily:F,fontSize:TXT.micro,fontWeight:800,letterSpacing:"2px",textTransform:"uppercase",color:GOLD,margin:"0 0 10px"}}>Hall of Fame</h3>
              <p style={{fontSize:TXT.body,color:"#555F59",lineHeight:1.68,margin:0,fontFamily:F}}>Songs and albums that reach #1 on the Combined chart enter the Hall of Fame. The monthly leaders below cover the complete {DATA_PERIOD} dataset.</p>
            </div>
          </div>
          {/* Hall of Fame */}
          <div style={{...card({marginTop:"14px"}),background:"#FAF5EA",borderColor:GOLD+"44"}}>
            <h3 style={{fontFamily:F,fontSize:"10px",fontWeight:700,letterSpacing:"2px",textTransform:"uppercase",color:GOLD,margin:"0 0 14px"}}>{isMobile?"Monthly #1s":"Hall of Fame — Monthly #1s"}</h3>
            <div className="anl-grid-3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"10px"}}>
              {hof.map((e,i)=>(
                <div key={i} style={{padding:"12px",background:"#FFF",borderRadius:"8px",border:"1px solid "+GOLD+"33"}}>
                  <div style={{fontFamily:F,fontSize:"9px",letterSpacing:"1.5px",textTransform:"uppercase",color:GOLD,marginBottom:"4px"}}>{e.month} · {e.type}</div>
                  <button type="button" onClick={()=>openReleaseDetails(e,e.type)} style={{display:"block",border:0,background:"transparent",padding:0,fontFamily:SF,fontWeight:800,fontSize:TXT.cardTitle,marginBottom:"2px",lineHeight:1.2,cursor:"pointer",textAlign:"left"}}>{e.title}</button>
                  <div style={{fontFamily:F,fontSize:TXT.cardMeta,color:"#69716B"}}>{e.artist}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{display:"flex",justifyContent:"center",marginTop:"18px"}}><button type="button" onClick={()=>navTo("charts")} style={{padding:"12px 18px",borderRadius:"999px",border:"1px solid #B8860B55",background:"#B8860B",color:"#FFF",fontFamily:F,fontSize:"10.5px",fontWeight:900,letterSpacing:"1.2px",textTransform:"uppercase",cursor:"pointer",boxShadow:"0 8px 20px rgba(184,134,11,0.18)"}}>Explore Current Charts</button></div>
          {/* Brand */}
          <div style={{marginTop:"18px",padding:"20px",background:"#FAF5EA",border:"1px solid #E8DDBF",borderRadius:"14px",color:"#1A1A1A"}}>
            <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
              <svg width="20" height="22" viewBox="0 0 22 24" style={{flexShrink:0}}>
                <rect x="0" y="15" width="3.5" height="9" fill="#1A1A1A" rx="0.5"/>
                <rect x="5.5" y="10" width="3.5" height="14" fill="#1A1A1A" rx="0.5"/>
                <rect x="11" y="5" width="3.5" height="19" fill="#B8860B" rx="0.5"/>
                <rect x="16.5" y="0" width="3.5" height="24" fill="#1A1A1A" rx="0.5"/>
              </svg>
              <span style={{fontFamily:F,fontSize:"13px",fontWeight:800,letterSpacing:"2.5px",color:"#1A1A1A",textTransform:"uppercase"}}>Ngoma <span style={{color:"#B8860B"}}>Charts</span></span>
            </div>
            <p style={{fontFamily:F,fontSize:"11.5px",color:"#59645D",margin:"10px 0 0",lineHeight:1.65}}>"Ngoma" means music or drum in Swahili: the heartbeat of Kenyan culture. Transparent, data-driven rankings celebrate the artists making an impact in Kenya.</p>
          </div>
        </div>
  );
}
