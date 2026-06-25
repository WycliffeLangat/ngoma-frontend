export default function NewsPage({ ctx }) {
  const {
    F,
    GOLD,
    NEWS,
    PAD,
    TXT,
    card,
    isDark,
    isMobile,
    setSelNews
  } = ctx;

  return (
<div style={{padding:PAD,background:"transparent",minHeight:"60vh",boxSizing:"border-box",overflow:"hidden",maxWidth:"1040px",margin:"0 auto"}}>
          <h2 style={{fontFamily:F,fontSize:TXT.pageTitle,fontWeight:800,margin:"0 0 4px",color:isDark?"#F6F3EA":"#050505"}}>Chart News</h2>
          <p style={{fontFamily:F,fontSize:isMobile?"11.5px":TXT.lead,color:isDark?"#D7DBD7":"#69716b",margin:isMobile?"0 0 22px":"0 0 28px",lineHeight:1.6}}>Analysis and stories from Kenya's music charts</p>
          <div className="news-grid" style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(2,minmax(0,1fr))",gap:isMobile?"16px":"20px"}}>
            {NEWS.map((n,i)=>{
              const isFeatured = i === 0 && !isMobile;
              const hasCover = !!n.cover_image;
              return (
              <div key={n.id}
                className={isFeatured ? "news-card-featured" : ""}
                onClick={()=>setSelNews(n)}
                style={{...card({cursor:"pointer",padding:0,overflow:"hidden",transition:"transform 200ms ease, box-shadow 200ms ease",gridColumn:isFeatured?"1 / -1":"auto",background:isDark?"#0F120F":"#FFF",borderColor:isDark?"#2F352F":"#E8E5DC",boxShadow:isDark?"none":"0 2px 8px rgba(0,0,0,0.04)"}),...(i===0?{background:isDark?"#111411":"#FAF5EA",borderColor:GOLD+"44",borderLeft:"3px solid "+GOLD}:{})}}
                onMouseEnter={e=>{if(!isMobile){e.currentTarget.style.boxShadow=isDark?"0 0 0 1px rgba(184,134,11,0.22)":"0 14px 36px rgba(0,0,0,0.09)";e.currentTarget.style.transform="translateY(-2px)";}}}
                onMouseLeave={e=>{e.currentTarget.style.boxShadow=isDark?"none":"0 2px 8px rgba(0,0,0,0.04)";e.currentTarget.style.transform="none";}}>

                {/* Featured card: full-width hero image */}
                {isFeatured && hasCover && (
                  <div style={{width:"100%",height:"240px",overflow:"hidden",flexShrink:0}}>
                    <img src={n.cover_image} alt={n.title} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} loading="lazy"/>
                  </div>
                )}

                <div style={{padding:isMobile?"16px":"22px",display:"flex",gap:isMobile?"10px":"14px",alignItems:"flex-start",minWidth:0}}>
                  {i===0 && n.emoji && !hasCover && <div style={{fontSize:isMobile?"27px":"38px",flexShrink:0,marginTop:"2px"}}>{n.emoji}</div>}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",gap:"8px",alignItems:"center",marginBottom:isMobile?"9px":"8px",flexWrap:"wrap"}}>
                      <span style={{display:"inline-flex",alignItems:"center",height:"20px",fontFamily:F,fontSize:"11px",fontWeight:900,letterSpacing:"1.1px",textTransform:"uppercase",color:isDark?"#E4BE55":GOLD,background:isDark?"rgba(184,134,11,0.16)":"rgba(184,134,11,0.11)",border:"1px solid rgba(184,134,11,0.22)",padding:"0 8px",borderRadius:"999px"}}>{n.cat}</span>
                      <span style={{fontFamily:F,fontSize:"12px",fontWeight:600,color:isDark?"#9a9a9a":"#9a9a9a"}}>{n.date}</span>
                    </div>
                    <h3 style={{fontFamily:F,fontSize:i===0?(isMobile?"20px":"22px"):(isMobile?"17px":"18px"),fontWeight:800,margin:isMobile?"0 0 8px":"0 0 7px",lineHeight:1.28,color:isDark?"#F6F3EA":"#050505"}}>{n.title}</h3>
                    <p style={{fontFamily:F,fontSize:"14px",color:isDark?"#B8BEB8":"#59645D",margin:0,lineHeight:1.65}}>{n.excerpt}</p>
                  </div>
                  {/* Non-featured + mobile: right-side thumbnail */}
                  {!isFeatured && hasCover && (
                    <div style={{width:isMobile?"60px":"72px",height:isMobile?"60px":"72px",minWidth:isMobile?"60px":"72px",borderRadius:"10px",overflow:"hidden",flexShrink:0,alignSelf:"center",background:isDark?"#1A1E1A":"#F0EDE7"}}>
                      <img src={n.cover_image} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} loading="lazy"/>
                    </div>
                  )}
                  <span aria-hidden="true" style={{fontFamily:F,fontSize:isMobile?"20px":"18px",color:isDark?"#555":"#C0C7C1",flexShrink:0,padding:isMobile?"6px 0 6px 4px":"4px 0 4px 10px",marginTop:"2px"}}>›</span>
                </div>
              </div>
              );
            })}
          </div>
        </div>
  );
}
