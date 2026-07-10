import { useMemo, useState } from "react";
import EntryThumb from "../components/EntryThumb.jsx";
import { getPublicArtists } from "../utils/artistImages.js";
import { getNewsMedia, getPrimaryNewsMedia } from "../utils/newsMedia.js";

// Accent color per raw category slug — used as a card's left border and the
// tint behind its category pill. Falls back to GOLD for anything unmapped.
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

  const [filter, setFilter] = useState("all");
  const publicArtists = useMemo(() => getPublicArtists(), []);

  function resolveNewsArt(n) {
    const primary = getPrimaryNewsMedia(n, publicArtists);
    return { ...primary, media: getNewsMedia(n, publicArtists) };
  }

  const categories = useMemo(() => {
    const seen = new Map(); // slug -> { label, count }
    NEWS.forEach((n) => {
      const slug = n.category || "other";
      const entry = seen.get(slug) || { label: n.cat || slug, count: 0 };
      entry.count += 1;
      seen.set(slug, entry);
    });
    return [...seen.entries()]
      .map(([slug, v]) => ({ slug, ...v }))
      .sort((a, b) => b.count - a.count);
  }, [NEWS]);

  const filtered = filter === "all" ? NEWS : NEWS.filter((n) => (n.category || "other") === filter);

  const breaking = NEWS.find((n) => n.breaking);

  if (!NEWS.length) {
    return (
      <div style={{padding:PAD,minHeight:"60vh",maxWidth:"1040px",margin:"0 auto",boxSizing:"border-box"}}>
        <h2 style={{fontFamily:F,fontSize:TXT.pageTitle,fontWeight:800,margin:"0 0 4px",color:isDark?"#F6F3EA":"#050505"}}>Chart News</h2>
        <p style={{fontFamily:F,fontSize:TXT.lead,color:isDark?"#D7DBD7":"#69716b",lineHeight:1.6}}>No stories published yet — check back soon.</p>
      </div>
    );
  }

  const heroCandidate = filter === "all"
    ? (filtered.find((n) => n.featured || n.pinned) || filtered[0])
    : null;
  const rest = heroCandidate ? filtered.filter((n) => n.id !== heroCandidate.id) : filtered;

  function Pill({ cat, label }) {
    const color = CATEGORY_COLORS[cat] || GOLD;
    const active = filter === cat;
    return (
      <button
        onClick={() => setFilter(cat)}
        style={{
          fontFamily:F,fontSize:"12px",fontWeight:700,letterSpacing:"0.4px",
          padding:"6px 13px",borderRadius:"999px",cursor:"pointer",whiteSpace:"nowrap",
          border:active ? `1px solid ${color}` : (isDark?"1px solid #2F352F":"1px solid #E8E5DC"),
          background:active ? (isDark? color+"2A" : color+"1A") : (isDark?"#14170F":"#FAF8F3"),
          color:active ? color : (isDark?"#B8BEB8":"#59645D"),
          transition:"background 150ms ease, color 150ms ease",
        }}
      >{label}</button>
    );
  }

  function CategoryPillTag({ n, size = "sm" }) {
    const color = CATEGORY_COLORS[n.category] || GOLD;
    return (
      <span style={{
        display:"inline-flex",alignItems:"center",height:size==="lg"?"22px":"20px",fontFamily:F,
        fontSize:size==="lg"?"11.5px":"11px",fontWeight:900,letterSpacing:"1.1px",textTransform:"uppercase",
        color:isDark ? color : color, background:isDark?color+"22":color+"14",
        border:`1px solid ${color}3D`,padding:"0 8px",borderRadius:"999px",
      }}>{n.cat}</span>
    );
  }

  function MetaRow({ n, size }) {
    return (
      <div style={{display:"flex",gap:"8px",alignItems:"center",marginBottom:size==="lg"?"10px":"8px",flexWrap:"wrap"}}>
        <CategoryPillTag n={n} size={size} />
        <span style={{fontFamily:F,fontSize:"12px",fontWeight:600,color:isDark?"#9a9a9a":"#9a9a9a"}}>{n.date}</span>
        <span style={{fontFamily:F,fontSize:"12px",color:isDark?"#666":"#B7BCB6"}}>·</span>
        <span style={{fontFamily:F,fontSize:"12px",fontWeight:600,color:isDark?"#9a9a9a":"#9a9a9a"}}>{readingTime(n.body)} min read</span>
        {n.breaking && (
          <span style={{fontFamily:F,fontSize:"10.5px",fontWeight:900,letterSpacing:"0.8px",color:"#fff",background:"#C2364A",padding:"2px 7px",borderRadius:"5px"}}>BREAKING</span>
        )}
      </div>
    );
  }

  function Card({ n, hero }) {
    const color = CATEGORY_COLORS[n.category] || GOLD;
    const art = resolveNewsArt(n);
    const hasArt = !!art.url;
    const media = art.media || [];
    const thumbItem = { ...n, cover_image: art.url };
    return (
      <div
        onClick={() => setSelNews(n)}
        className={hero ? "news-card-featured" : "news-card"}
        style={{...card({cursor:"pointer",padding:0,overflow:"hidden",transition:"transform 200ms ease, box-shadow 200ms ease",
          gridColumn:hero?"1 / -1":"auto",background:isDark?"#0F120F":"#FFF",
          borderColor:isDark?"#2F352F":"#E8E5DC",borderLeft:`3px solid ${color}`,
          boxShadow:isDark?"none":"0 2px 8px rgba(0,0,0,0.04)"})}}
        onMouseEnter={(e)=>{if(!isMobile){e.currentTarget.style.boxShadow=isDark?"0 0 0 1px rgba(184,134,11,0.22)":"0 14px 36px rgba(0,0,0,0.09)";e.currentTarget.style.transform="translateY(-2px)";}}}
        onMouseLeave={(e)=>{e.currentTarget.style.boxShadow=isDark?"none":"0 2px 8px rgba(0,0,0,0.04)";e.currentTarget.style.transform="none";}}
      >
        {hero && (
          <div style={{width:"100%",height:isMobile?"220px":"340px",overflow:"hidden",flexShrink:0,position:"relative",background:`linear-gradient(135deg, ${color}26, ${color}08)`}}>
            {hasArt && media.length > 1 && !isMobile ? (
              <div style={{display:"grid",gridTemplateColumns:"minmax(0,1.6fr) minmax(160px,0.8fr)",gap:"3px",width:"100%",height:"100%"}}>
                <img src={media[0].url} alt={n.title} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} loading="lazy"/>
                <div style={{display:"grid",gridTemplateRows:"1fr 1fr",gap:"3px",minWidth:0}}>
                  {media.slice(1,3).map((item, index) => (
                    <img key={`${item.url}-${index}`} src={item.url} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} loading="lazy"/>
                  ))}
                </div>
              </div>
            ) : hasArt ? (
              <img src={art.url} alt={n.title} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} loading="lazy"/>
            ) : (
              <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <span style={{fontSize:isMobile?"56px":"78px"}}>{n.emoji || "🎵"}</span>
              </div>
            )}
          </div>
        )}
        <div style={{padding:isMobile?"16px":"22px",display:"flex",gap:isMobile?"12px":"16px",alignItems:"flex-start",minWidth:0}}>
          <div style={{flex:1,minWidth:0}}>
            <MetaRow n={n} size={hero?"lg":"sm"} />
            <h3 style={{fontFamily:F,fontSize:hero?(isMobile?"20px":"22px"):(isMobile?"17px":"18px"),fontWeight:800,margin:hero?"0 0 8px":"0 0 7px",lineHeight:1.28,color:isDark?"#F6F3EA":"#050505"}}>{n.title}</h3>
            <p style={{fontFamily:F,fontSize:"14px",color:isDark?"#B8BEB8":"#59645D",margin:0,lineHeight:1.65}}>{n.excerpt}</p>
          </div>
          {!hero && (
            <EntryThumb
              item={thumbItem}
              name={art.artistName || n.title}
              size={isMobile?96:128}
              radius="10px"
              accent={color}
              style={{alignSelf:"center"}}
            />
          )}
          <span aria-hidden="true" style={{fontFamily:F,fontSize:isMobile?"20px":"18px",color:isDark?"#555":"#C0C7C1",flexShrink:0,padding:isMobile?"6px 0 6px 4px":"4px 0 4px 10px",marginTop:"2px"}}>›</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{padding:PAD,background:"transparent",minHeight:"60vh",boxSizing:"border-box",overflow:"hidden",maxWidth:"1040px",margin:"0 auto"}}>
      <h2 style={{fontFamily:F,fontSize:TXT.pageTitle,fontWeight:800,margin:"0 0 4px",color:isDark?"#F6F3EA":"#050505"}}>Chart News</h2>
      <p style={{fontFamily:F,fontSize:isMobile?"11.5px":TXT.lead,color:isDark?"#D7DBD7":"#69716b",margin:isMobile?"0 0 16px":"0 0 20px",lineHeight:1.6}}>Analysis and stories from Ngoma Charts</p>

      {breaking && (
        <div
          onClick={() => setSelNews(breaking)}
          style={{display:"flex",alignItems:"center",gap:"10px",cursor:"pointer",marginBottom:isMobile?"16px":"20px",
            padding:"10px 14px",borderRadius:"10px",background:isDark?"rgba(194,54,74,0.14)":"rgba(194,54,74,0.08)",
            border:"1px solid rgba(194,54,74,0.35)"}}
        >
          <span style={{fontFamily:F,fontSize:"10.5px",fontWeight:900,letterSpacing:"0.8px",color:"#fff",background:"#C2364A",padding:"3px 8px",borderRadius:"5px",flexShrink:0}}>BREAKING</span>
          <span style={{fontFamily:F,fontSize:isMobile?"13px":"14px",fontWeight:700,color:isDark?"#F6F3EA":"#1a1a1a",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{breaking.title}</span>
        </div>
      )}

      <div style={{display:"flex",gap:"8px",overflowX:"auto",paddingBottom:"4px",marginBottom:isMobile?"18px":"24px",scrollbarWidth:"none"}}>
        <Pill cat="all" label={`All (${NEWS.length})`} />
        {categories.map((c) => <Pill key={c.slug} cat={c.slug} label={`${c.label} (${c.count})`} />)}
      </div>

      {!filtered.length ? (
        <p style={{fontFamily:F,fontSize:"14px",color:isDark?"#B8BEB8":"#59645D"}}>No stories in this category yet.</p>
      ) : (
        <div className="news-grid" style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(2,minmax(0,1fr))",gap:isMobile?"16px":"20px"}}>
          {heroCandidate && <Card key={heroCandidate.id} n={heroCandidate} hero />}
          {rest.map((n) => <Card key={n.id} n={n} hero={false} />)}
        </div>
      )}
    </div>
  );
}
