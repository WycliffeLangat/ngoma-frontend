import EntryThumb from "../components/EntryThumb.jsx";
import { getPublicArtists, findArtistMentionedIn, getArtistImageUrl } from "../utils/artistImages.js";

const CATEGORY_COLORS = {
  chart_news: "#B8860B",
  albums: "#3B7DD8",
  milestones: "#D97706",
  records: "#C2364A",
  artist_spotlight: "#7C4DBD",
  certifications: "#B8860B",
  analytics: "#0E8A7D",
  announcement: "#5B6470",
  editorials: "#5B6470",
  new_releases: "#2E9E5B",
  industry_news: "#5B6470",
  artist_news: "#7C4DBD",
  awards: "#D97706",
  interviews: "#3B7DD8",
};

function readingTime(body) {
  const words = String(body || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export default function NewsDetailPage({ ctx }) {
  const {
    F,
    GOLD,
    NEWS,
    PAD,
    isDark,
    isMobile,
    selNews,
    setSelNews
  } = ctx;

  const color = CATEGORY_COLORS[selNews.category] || GOLD;
  const related = (NEWS || [])
    .filter((n) => n.id !== selNews.id && (n.category || "other") === (selNews.category || "other"))
    .slice(0, 3);

  const publicArtists = getPublicArtists();
  const mentionedArtist = selNews.cover_image ? null : findArtistMentionedIn(`${selNews.title} ${selNews.excerpt || ""}`, publicArtists);
  const heroArtUrl = selNews.cover_image || (mentionedArtist ? getArtistImageUrl(mentionedArtist, { name: mentionedArtist.name, artists: publicArtists }) : "");

  return (
<div style={{padding:PAD,background:isDark?"#0F120F":"#FFF",border:isDark?"1px solid #2F352F":"1px solid transparent",borderRadius:isDark?"16px":"0",minHeight:"60vh",maxWidth:"680px",margin:"0 auto",boxSizing:"border-box",overflow:"hidden"}}>
          <span onClick={()=>setSelNews(null)} style={{fontFamily:F,fontSize:isMobile?"14px":"13px",color:GOLD,cursor:"pointer",letterSpacing:"1px",textTransform:"uppercase",fontWeight:600}}>← All News</span>
          <div style={{marginTop:"20px"}}>
            <div style={{width:"100%",height:isMobile?"220px":"380px",borderRadius:"14px",overflow:"hidden",marginBottom:"24px",background:heroArtUrl?(isDark?"#1A1E1A":"#F0EDE7"):`linear-gradient(135deg, ${color}26, ${color}08)`}}>
              {heroArtUrl ? (
                <img src={heroArtUrl} alt={selNews.title} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} loading="lazy"/>
              ) : (
                <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontSize:isMobile?"64px":"88px"}}>{selNews.emoji || "🎵"}</span>
                </div>
              )}
            </div>
            <div style={{display:"flex",gap:"10px",alignItems:"center",marginBottom:"12px",flexWrap:"wrap"}}>
              <span style={{fontFamily:F,fontSize:"11px",fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",color:color,background:isDark?color+"22":color+"14",border:`1px solid ${color}3D`,padding:"2px 8px",borderRadius:"10px"}}>{selNews.cat}</span>
              <span style={{fontFamily:F,fontSize:"12px",fontWeight:650,color:isDark?"#C9CEC9":"#59645D"}}>{selNews.date}</span>
              <span style={{fontFamily:F,fontSize:"12px",color:isDark?"#666":"#B7BCB6"}}>·</span>
              <span style={{fontFamily:F,fontSize:"12px",fontWeight:650,color:isDark?"#C9CEC9":"#59645D"}}>{readingTime(selNews.body)} min read</span>
              {selNews.breaking && (
                <span style={{fontFamily:F,fontSize:"10.5px",fontWeight:900,letterSpacing:"0.8px",color:"#fff",background:"#C2364A",padding:"2px 7px",borderRadius:"5px"}}>BREAKING</span>
              )}
            </div>
            <h1 style={{fontSize:isMobile?"26px":"30px",fontWeight:850,margin:"0 0 10px",lineHeight:1.18,color:isDark?"#F6F3EA":"#050505"}}>{selNews.title}</h1>
            {selNews.author && (
              <p style={{fontFamily:F,fontSize:"13px",fontWeight:650,color:isDark?"#9a9a9a":"#8A8F87",margin:"0 0 20px"}}>By {selNews.author}</p>
            )}
            {selNews.body.split("\n\n").map((p,i)=><p key={i} style={{fontFamily:F,fontSize:isMobile?"15px":"16px",color:isDark?"#D7DBD7":"#444",lineHeight:1.8,margin:"0 0 16px"}}>{p}</p>)}

            {Array.isArray(selNews.tags) && selNews.tags.length > 0 && (
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap",margin:"8px 0 32px"}}>
                {selNews.tags.map((t) => (
                  <span key={t} style={{fontFamily:F,fontSize:"12px",fontWeight:600,color:isDark?"#B8BEB8":"#69716b",background:isDark?"#181C18":"#F4F1EA",border:isDark?"1px solid #2F352F":"1px solid #E8E5DC",padding:"4px 10px",borderRadius:"999px"}}>#{t}</span>
                ))}
              </div>
            )}

            {related.length > 0 && (
              <div style={{marginTop:"20px",paddingTop:"24px",borderTop:isDark?"1px solid #2F352F":"1px solid #EEE"}}>
                <h4 style={{fontFamily:F,fontSize:"13px",fontWeight:800,letterSpacing:"0.6px",textTransform:"uppercase",color:isDark?"#9a9a9a":"#8A8F87",margin:"0 0 14px"}}>More in {selNews.cat}</h4>
                <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
                  {related.map((n) => {
                    const relatedArtist = n.cover_image ? null : findArtistMentionedIn(`${n.title} ${n.excerpt || ""}`, publicArtists);
                    return (
                    <div key={n.id} onClick={()=>setSelNews(n)} style={{display:"flex",alignItems:"center",gap:"12px",cursor:"pointer",padding:"12px 14px",borderRadius:"10px",background:isDark?"#14170F":"#FAF8F3",border:isDark?"1px solid #2A2E28":"1px solid #EEE9DD"}}>
                      <EntryThumb item={n} name={relatedArtist?.name || n.title} size={56} radius="9px" accent={CATEGORY_COLORS[n.category] || GOLD} />
                      <div style={{minWidth:0}}>
                        <div style={{fontFamily:F,fontSize:"12px",fontWeight:600,color:isDark?"#9a9a9a":"#9a9a9a",marginBottom:"4px"}}>{n.date}</div>
                        <div style={{fontFamily:F,fontSize:"14.5px",fontWeight:750,color:isDark?"#F6F3EA":"#050505",lineHeight:1.35}}>{n.title}</div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
  );
}
