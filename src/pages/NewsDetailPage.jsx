import EntryThumb from "../components/EntryThumb.jsx";
import { getPublicArtists } from "../utils/artistImages.js";
import { getNewsMedia, getPrimaryNewsMedia } from "../utils/newsMedia.js";


function readingTime(body) {
  const words = String(body || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function normalizeSourceLinks(value) {
  const raw = (() => {
    if (Array.isArray(value)) return value;
    if (!value) return [];
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  })();

  return raw
    .map((item) => {
      if (typeof item === "string") return { label: item, href: item };
      if (!item || typeof item !== "object") return null;
      const href = item.href || item.url || item.link || "";
      const label = item.label || item.title || item.name || href;
      return label || href ? { label, href, kind: item.kind || "" } : null;
    })
    .filter(Boolean);
}

function artistNameForArticle(article = {}, publicArtists = []) {
  const related = article.related_artist;
  if (related && typeof related === "object") {
    return related.public_name || related.display_name || related.name || related.artist_name || "";
  }
  const relatedId = Number(related ?? article.related_artist_id);
  if (Number.isFinite(relatedId) && relatedId > 0) {
    const artist = publicArtists.find((item) => Number(item.id) === relatedId);
    if (artist) return artist.public_name || artist.display_name || artist.name || "";
  }
  return article.related_artist_name || article.artist_name || article.primary_artist || "";
}

function releaseForArticle(article = {}, heroArtUrl = "") {
  const related = article.related_release;
  if (related && typeof related === "object") {
    return {
      ...related,
      release_id: related.id || related.release_id,
      title: related.title || article.related_release_title || article.title,
      artist: related.artist || related.artist_credit || article.related_release_artist || article.related_artist_name,
      primary_artist: related.primary_artist || article.related_artist_name,
      cover_image: related.cover_image || related.image || heroArtUrl,
      type: article.related_release_type || related.type || related.chart_type,
    };
  }
  return {
    release_id: related || article.related_release_id || null,
    title: article.related_release_title || "",
    artist: article.related_release_artist || article.related_artist_name || "",
    primary_artist: article.related_artist_name || "",
    cover_image: article.related_release_cover || heroArtUrl,
    type: article.related_release_type || (article.category === "albums" ? "album" : "single"),
  };
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
    setSelNews,
    openArtistDetails,
    openNewsDetails,
    openReleaseDetails
  } = ctx;

  if (!selNews?.title) {
    return (
      <div style={{padding:PAD,background:isDark?"#0F120F":"#FFF",border:isDark?"1px solid #2F352F":"1px solid transparent",borderRadius:isDark?"16px":"0",minHeight:"60vh",maxWidth:"680px",margin:"0 auto",boxSizing:"border-box"}}>
        <span onClick={()=>setSelNews(null)} style={{fontFamily:F,fontSize:isMobile?"14px":"13px",color:GOLD,cursor:"pointer",letterSpacing:"1px",textTransform:"uppercase",fontWeight:600}}>{"<- All News"}</span>
        <h1 style={{fontFamily:F,fontSize:isMobile?"24px":"28px",fontWeight:850,margin:"22px 0 8px",lineHeight:1.18,color:isDark?"#FFFFFF":"#000000"}}>Story unavailable</h1>
        <p style={{fontFamily:F,fontSize:"14px",lineHeight:1.65,color:isDark?"#FFFFFF":"#000000",margin:0}}>This story could not be opened from the current data snapshot.</p>
      </div>
    );
  }

  const color = isDark ? "#FFFFFF" : "#000000";
  const related = (NEWS || [])
    .filter((n) => n.id !== selNews.id && (n.category || "other") === (selNews.category || "other"))
    .slice(0, 3);

  const publicArtists = getPublicArtists();
  const articleMedia = getNewsMedia(selNews, publicArtists);
  const primaryMedia = getPrimaryNewsMedia(selNews, publicArtists);
  const heroArtUrl = primaryMedia.url;
  const bodyParagraphs = String(selNews.body || "").split("\n\n").filter(Boolean);
  const inlineMedia = articleMedia.slice(1);
  const sourceLinks = normalizeSourceLinks(selNews.source_links);
  const relatedArtistName = artistNameForArticle(selNews, publicArtists);
  const relatedRelease = releaseForArticle(selNews, heroArtUrl);
  const canOpenRelease = Boolean(openReleaseDetails && relatedRelease.title && relatedRelease.artist);
  const canOpenArtist = Boolean(openArtistDetails && relatedArtistName);

  return (
<div style={{padding:PAD,background:isDark?"#0F120F":"#FFF",border:isDark?"1px solid #2F352F":"1px solid transparent",borderRadius:isDark?"16px":"0",minHeight:"60vh",maxWidth:"680px",margin:"0 auto",boxSizing:"border-box",overflow:"hidden"}}>
          <span onClick={()=>setSelNews(null)} style={{fontFamily:F,fontSize:isMobile?"14px":"13px",color:GOLD,cursor:"pointer",letterSpacing:"1px",textTransform:"uppercase",fontWeight:600}}>{"<- All News"}</span>
          <div style={{marginTop:"20px"}}>
            <div style={{width:"100%",height:isMobile?"220px":"380px",borderRadius:"14px",overflow:"hidden",marginBottom:"24px",background:heroArtUrl?(isDark?"#1A1E1A":"#F0EDE7"):`linear-gradient(135deg, ${color}26, ${color}08)`}}>
              {heroArtUrl && articleMedia.length > 1 && !isMobile ? (
                <div style={{display:"grid",gridTemplateColumns:"minmax(0,1.45fr) minmax(150px,0.75fr)",gap:"3px",width:"100%",height:"100%"}}>
                  <img src={articleMedia[0].url} alt={selNews.title} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} loading="lazy"/>
                  <div style={{display:"grid",gridTemplateRows:"1fr 1fr",gap:"3px",minWidth:0}}>
                    {articleMedia.slice(1,3).map((item, index) => (
                      <img key={`${item.url}-${index}`} src={item.url} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} loading="lazy"/>
                    ))}
                  </div>
                </div>
              ) : heroArtUrl ? (
                <img src={heroArtUrl} alt={selNews.title} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} loading="lazy"/>
              ) : (
                <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <span style={selNews.emoji ? {fontSize:isMobile?"64px":"88px"} : {fontFamily:F,fontSize:isMobile?"26px":"34px",fontWeight:900,letterSpacing:"0.08em",color:color}}>{selNews.emoji || "NEWS"}</span>
                </div>
              )}
            </div>
            <div style={{display:"flex",gap:"10px",alignItems:"center",marginBottom:"12px",flexWrap:"wrap"}}>
              <span style={{fontFamily:F,fontSize:"11px",fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",color:color,background:isDark?color+"22":color+"14",border:`1px solid ${color}3D`,padding:"2px 8px",borderRadius:"10px"}}>{selNews.cat}</span>
              <span style={{fontFamily:F,fontSize:"12px",fontWeight:650,color:isDark?"#FFFFFF":"#000000"}}>{selNews.date}</span>
              <span style={{fontFamily:F,fontSize:"12px",color:isDark?"#FFFFFF":"#000000"}}>/</span>
              <span style={{fontFamily:F,fontSize:"12px",fontWeight:650,color:isDark?"#FFFFFF":"#000000"}}>{readingTime(selNews.body)} min read</span>
              {selNews.breaking && (
                <span style={{fontFamily:F,fontSize:"10.5px",fontWeight:900,letterSpacing:"0.8px",color:"#fff",background:"#C2364A",padding:"2px 7px",borderRadius:"5px"}}>BREAKING</span>
              )}
            </div>
            <h1 style={{fontSize:isMobile?"26px":"30px",fontWeight:850,margin:"0 0 10px",lineHeight:1.18,color:isDark?"#FFFFFF":"#000000"}}>{selNews.title}</h1>
            {selNews.author && (
              <p style={{fontFamily:F,fontSize:"13px",fontWeight:650,color:isDark?"#FFFFFF":"#000000",margin:"0 0 20px"}}>By {selNews.author}</p>
            )}
            {(canOpenRelease || canOpenArtist || sourceLinks.length > 0) && (
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap",margin:"0 0 22px"}}>
                {canOpenRelease && (
                  <button
                    type="button"
                    onClick={() => openReleaseDetails(relatedRelease, relatedRelease.type)}
                    style={{fontFamily:F,fontSize:"12px",fontWeight:800,color:isDark?"#FFFFFF":"#000000",background:isDark?"#171B16":"#F5F0E3",border:isDark?"1px solid #30382F":"1px solid #E0D4B3",borderRadius:"999px",padding:"8px 12px",cursor:"pointer"}}
                  >
                    Release: {relatedRelease.title}
                  </button>
                )}
                {canOpenArtist && (
                  <button
                    type="button"
                    onClick={() => openArtistDetails(relatedArtistName)}
                    style={{fontFamily:F,fontSize:"12px",fontWeight:800,color:isDark?"#FFFFFF":"#000000",background:isDark?"#171B16":"#F5F0E3",border:isDark?"1px solid #30382F":"1px solid #E0D4B3",borderRadius:"999px",padding:"8px 12px",cursor:"pointer"}}
                  >
                    Artist: {relatedArtistName}
                  </button>
                )}
                {sourceLinks.slice(0, 3).map((link, index) => (
                  link.href ? (
                    <a
                      key={`${link.href}-${index}`}
                      href={link.href}
                      target={link.href.startsWith("/") ? undefined : "_blank"}
                      rel={link.href.startsWith("/") ? undefined : "noopener noreferrer"}
                      style={{fontFamily:F,fontSize:"12px",fontWeight:800,color:GOLD,background:isDark?"#171B16":"#FFF9EA",border:isDark?"1px solid #30382F":"1px solid #E0D4B3",borderRadius:"999px",padding:"8px 12px",textDecoration:"none"}}
                    >
                      Source: {link.label}
                    </a>
                  ) : (
                    <span key={`${link.label}-${index}`} style={{fontFamily:F,fontSize:"12px",fontWeight:800,color:isDark?"#FFFFFF":"#000000",background:isDark?"#171B16":"#F5F0E3",border:isDark?"1px solid #30382F":"1px solid #E0D4B3",borderRadius:"999px",padding:"8px 12px"}}>
                      Source: {link.label}
                    </span>
                  )
                ))}
              </div>
            )}
            {bodyParagraphs.map((p,i)=>(
              <div key={i}>
                <p style={{fontFamily:F,fontSize:isMobile?"15px":"16px",color:isDark?"#FFFFFF":"#000000",lineHeight:1.8,margin:"0 0 16px"}}>{p}</p>
                {i === 0 && inlineMedia.length > 0 && (
                  <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(2,minmax(0,1fr))",gap:"10px",margin:"8px 0 22px"}}>
                    {inlineMedia.slice(0,2).map((item, index) => (
                      <figure key={`${item.url}-${index}`} style={{margin:0,borderRadius:"12px",overflow:"hidden",background:isDark?"#14170F":"#F4F1EA",border:isDark?"1px solid #2A2E28":"1px solid #EEE9DD"}}>
                        <img src={item.url} alt={item.caption || item.title || ""} style={{width:"100%",aspectRatio:isMobile?"16 / 10":"4 / 3",objectFit:"cover",display:"block"}} loading="lazy"/>
                        {(item.caption || item.title) && (
                          <figcaption style={{fontFamily:F,fontSize:"11.5px",fontWeight:650,color:isDark?"#FFFFFF":"#000000",lineHeight:1.45,padding:"8px 10px"}}>{item.caption || item.title}</figcaption>
                        )}
                      </figure>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {Array.isArray(selNews.tags) && selNews.tags.length > 0 && (
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap",margin:"8px 0 32px"}}>
                {selNews.tags.map((t) => (
                  <span key={t} style={{fontFamily:F,fontSize:"12px",fontWeight:600,color:isDark?"#FFFFFF":"#000000",background:isDark?"#181C18":"#F4F1EA",border:isDark?"1px solid #2F352F":"1px solid #E8E5DC",padding:"4px 10px",borderRadius:"999px"}}>#{t}</span>
                ))}
              </div>
            )}

            {related.length > 0 && (
              <div style={{marginTop:"20px",paddingTop:"24px",borderTop:isDark?"1px solid #2F352F":"1px solid #EEE"}}>
                <h4 style={{fontFamily:F,fontSize:"13px",fontWeight:800,letterSpacing:"0.6px",textTransform:"uppercase",color:isDark?"#FFFFFF":"#000000",margin:"0 0 14px"}}>More in {selNews.cat}</h4>
                <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
                  {related.map((n) => {
                    const relatedMedia = getPrimaryNewsMedia(n, publicArtists);
                    return (
                    <div key={n.id} onClick={()=>openNewsDetails ? openNewsDetails(n) : setSelNews(n)} style={{display:"flex",alignItems:"center",gap:"12px",cursor:"pointer",padding:"12px 14px",borderRadius:"10px",background:isDark?"#14170F":"#FAF8F3",border:isDark?"1px solid #2A2E28":"1px solid #EEE9DD"}}>
                      <EntryThumb item={{...n, cover_image: relatedMedia.url}} name={relatedMedia.artistName || n.title} size={56} radius="9px" accent={color} />
                      <div style={{minWidth:0}}>
                        <div style={{fontFamily:F,fontSize:"12px",fontWeight:600,color:isDark?"#FFFFFF":"#000000",marginBottom:"4px"}}>{n.date}</div>
                        <div style={{fontFamily:F,fontSize:"14.5px",fontWeight:750,color:isDark?"#FFFFFF":"#000000",lineHeight:1.35}}>{n.title}</div>
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
