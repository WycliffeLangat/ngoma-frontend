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
          <h2 style={{fontSize:TXT.pageTitle,fontWeight:800,margin:"0 0 4px",color:isDark?"#F6F3EA":"#050505"}}>Chart News</h2>
          <p style={{fontFamily:F,fontSize:isMobile?"11.5px":TXT.lead,color:isDark?"#D7DBD7":"#59645D",margin:isMobile?"0 0 20px":"0 0 24px",lineHeight:1.6}}>Analysis and stories from Kenya's music charts</p>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(2,minmax(0,1fr))",gap:isMobile?"18px":"16px"}}>
            {NEWS.map((n,i)=>{
              return (
              <div key={n.id} onClick={()=>setSelNews(n)} style={{...card({cursor:"pointer",padding:isMobile?"15px 16px":"20px",transition:"transform .2s ease, box-shadow .2s ease",gridColumn:!isMobile&&i===0?"1 / -1":"auto",background:isDark?"#0F120F":"#FFF",borderColor:isDark?"#2F352F":"#EFEDE7",boxShadow:isDark?"none":"0 1px 3px rgba(0,0,0,0.02),0 8px 24px rgba(0,0,0,0.02)"}),...((i===0)?{background:isDark?"#111411":"#FAF5EA",borderColor:GOLD+"44"}:{})}}
                onMouseEnter={e=>{if(!isMobile){e.currentTarget.style.boxShadow=isDark?"0 0 0 1px rgba(184,134,11,0.22)":"0 12px 30px rgba(31,36,31,0.10)";e.currentTarget.style.transform="translateY(-2px)";}}}
                onMouseLeave={e=>{e.currentTarget.style.boxShadow=isDark?"none":"0 1px 3px rgba(0,0,0,0.02),0 8px 24px rgba(0,0,0,0.02)";e.currentTarget.style.transform="none";}}>
                <div style={{display:"flex",gap:isMobile?"10px":"14px",alignItems:"center",minWidth:0}}>
                  {i===0&&n.emoji&&<div style={{fontSize:isMobile?"27px":"34px",flexShrink:0,alignSelf:"flex-start"}}>{n.emoji}</div>}
                  <div style={{flex:1,minWidth:0,maxWidth:!isMobile&&i===0?"780px":"none"}}>
                    <div style={{display:"flex",gap:"8px",alignItems:"center",marginBottom:isMobile?"8px":"7px",flexWrap:"wrap"}}>
                      <span style={{display:"inline-flex",alignItems:"center",height:"22px",fontFamily:F,fontSize:"9px",fontWeight:850,letterSpacing:"1.3px",textTransform:"uppercase",color:isDark?"#E4BE55":GOLD,background:isDark?"rgba(184,134,11,0.16)":"#F7EFD9",border:isDark?"1px solid rgba(184,134,11,0.28)":"1px solid transparent",padding:"0 9px",borderRadius:"999px"}}>{n.cat}</span>
                      <span style={{fontFamily:F,fontSize:"10px",fontWeight:650,color:isDark?"#C9CEC9":"#59645D"}}>{n.date}</span>
                    </div>
                    <h3 style={{fontSize:i===0?(isMobile?"16px":"18px"):TXT.cardTitle,fontWeight:800,margin:isMobile?"0 0 7px":"0 0 6px",lineHeight:1.28,color:isDark?"#F6F3EA":"#050505"}}>{n.title}</h3>
                    <p style={{fontFamily:F,fontSize:TXT.body,color:isDark?"#D7DBD7":"#59645D",margin:0,lineHeight:isMobile?1.68:1.6}}>{n.excerpt}</p>
                  </div>
                  <span aria-hidden="true" style={{fontFamily:F,fontSize:isMobile?"22px":"20px",color:isDark?"#C9CEC9":"#A5ACA6",flexShrink:0,padding:isMobile?"8px 0 8px 4px":"6px 2px 6px 8px"}}>›</span>
                </div>
              </div>
              );
            })}
          </div>
        </div>
  );
}
