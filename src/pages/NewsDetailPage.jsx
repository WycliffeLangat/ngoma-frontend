export default function NewsDetailPage({ ctx }) {
  const {
    F,
    GOLD,
    PAD,
    isDark,
    isMobile,
    selNews,
    setSelNews
  } = ctx;

  return (
<div style={{padding:PAD,background:isDark?"#0F120F":"#FFF",border:isDark?"1px solid #2F352F":"1px solid transparent",borderRadius:isDark?"16px":"0",minHeight:"60vh",maxWidth:"680px",margin:"0 auto",boxSizing:"border-box",overflow:"hidden"}}>
          <span onClick={()=>setSelNews(null)} style={{fontFamily:F,fontSize:isMobile?"12px":"11px",color:GOLD,cursor:"pointer",letterSpacing:"1px",textTransform:"uppercase",fontWeight:600}}>← All News</span>
          <div style={{marginTop:"20px"}}>
            {selNews.cover_image && (
              <div style={{width:"100%",borderRadius:"14px",overflow:"hidden",marginBottom:"24px",background:isDark?"#1A1E1A":"#F0EDE7"}}>
                <img src={selNews.cover_image} alt={selNews.title} style={{width:"100%",maxHeight:"380px",objectFit:"cover",display:"block"}} loading="lazy"/>
              </div>
            )}
            <div style={{display:"flex",gap:"10px",alignItems:"center",marginBottom:"12px",flexWrap:"wrap"}}>
              <span style={{fontFamily:F,fontSize:"9px",fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",color:isDark?"#E4BE55":GOLD,background:isDark?"rgba(184,134,11,0.16)":"#FAF5EA",border:isDark?"1px solid rgba(184,134,11,0.28)":"1px solid transparent",padding:"2px 8px",borderRadius:"10px"}}>{selNews.cat}</span>
              <span style={{fontFamily:F,fontSize:"10px",fontWeight:650,color:isDark?"#C9CEC9":"#59645D"}}>{selNews.date}</span>
            </div>
            <h1 style={{fontSize:isMobile?"24px":"26px",fontWeight:850,margin:"0 0 16px",lineHeight:1.18,color:isDark?"#F6F3EA":"#050505"}}>{selNews.title}</h1>
            {selNews.body.split("\n\n").map((p,i)=><p key={i} style={{fontFamily:F,fontSize:isMobile?"14px":"14px",color:isDark?"#D7DBD7":"#444",lineHeight:1.8,margin:"0 0 16px"}}>{p}</p>)}
          </div>
        </div>
  );
}
