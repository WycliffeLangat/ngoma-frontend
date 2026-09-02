import { useMemo } from "react";
import { getPublicArtists, getArtistImageUrl } from "../utils/artistImages.js";
import NgomaMark from "../components/NgomaMark.jsx";

export default function AboutPage({ ctx }) {
  const {
    CERTIFICATION_LEVELS,
    DATA_PERIOD,
    F,
    GOLD,
    InfoButton,
    PAD,
    PUBLIC_PLATFORMS,
    PUBLIC_METHODOLOGY,
    SecMark,
    SITE_NAME,
    TXT,
    card,
    isDark,
    isMobile,
    navTo,
    secLbl,
  } = ctx;

  const textPrimary = isDark ? "#FFFFFF" : "#000000";
  const textMuted = isDark ? "rgba(255,255,255,0.78)" : "#4F5750";
  const panelBg = isDark ? "#151815" : "#FAF8F2";
  const panelBorder = isDark ? "#2F352F" : "#EDE6D6";
  const fallbackPlatforms = [
    {name:"Apple Music",color:"#FC3C44"},
    {name:"Audiomack",color:"#F68B1F"},
    {name:"Boomplay",color:"#00B4B4"},
    {name:"Spotify",color:"#1DB954"},
    {name:"YouTube",color:"#FF0000"},
    {name:"Shazam",color:"#0088FF"},
  ];
  const trackedPlatforms = PUBLIC_PLATFORMS.length ? PUBLIC_PLATFORMS : fallbackPlatforms;
  const platformNames = trackedPlatforms.map((platform) => platform.name).filter(Boolean);
  const platformList = platformNames.length ? platformNames.join(", ") : "the tracked digital platforms";
  const methodologySummary = PUBLIC_METHODOLOGY?.config?.description || "Every month, Ngoma Charts reviews platform chart positions for singles and albums, turns those positions into comparable points, combines the points by release, and publishes the highest-scoring entries as the Combined Top 50.";
  const certificationSummary = CERTIFICATION_LEVELS.map((level) => `${level.label} at ${level.pts.toLocaleString()}+ points`).join(", ");

  const howItWorksSteps = [
    {
      title: "1. Start with the monthly source charts",
      body: `${SITE_NAME} begins with the chart positions that songs and albums earn on the tracked platforms. For singles, the tracked public platforms are ${platformList}. Albums use the album platforms available in the dataset, currently Apple Music and Audiomack.`,
    },
    {
      title: "2. Separate singles, albums, and artists",
      body: "Songs and albums are handled as release charts because each row is a specific title. Artists are handled separately because an artist can collect impact from several songs, albums, and collaborations in the same month.",
    },
    {
      title: "3. Clean the names so the same release is counted once",
      body: "Before points are added, titles and artist credits are matched carefully. This keeps small wording differences, featured artist credits, aliases, or duplicate rows from splitting one real song or album into several separate entries.",
    },
    {
      title: "4. Turn each platform rank into points",
      body: "A chart rank is converted into points on the active methodology scale. In plain terms, #1 earns more than #2, #2 earns more than #3, and lower positions earn fewer points. This makes different platform charts comparable on one scoreboard.",
    },
    {
      title: "5. Add the platform points together",
      body: "After every platform row has points, the points for the same release are added together for that month. A release can be strong because it is very high on one platform, because it appears on several platforms, or both.",
    },
    {
      title: "6. Publish the Combined Top 50",
      body: "The releases are sorted by their combined point totals, and the 50 highest-scoring songs or albums become the public Combined chart for that month. The Combined chart is the main chart used across records, analytics, and certifications.",
    },
    {
      title: "7. Compare with previous months",
      body: "Once the monthly chart is built, the app compares each entry with its earlier chart history. That is how it knows movement, peak position, months on chart, latest appearance, platform coverage, and full rank journey.",
    },
    {
      title: "8. Build artist rankings from credited work",
      body: "Artist rankings are created by looking at the charted releases an artist is credited on, then adding the artist's point contribution from those Top 50 appearances. This rewards both one major hit and steady impact across several releases.",
    },
    {
      title: "9. Create analytics, records, and Hall of Fame entries",
      body: "The analytics pages read from the same monthly history. Number ones, biggest climbs, longest chart runs, highest point totals, platform reach, and Hall of Fame entries all come from those stored Combined chart results. A song or album enters the Hall of Fame when it reaches #1 on the Combined chart.",
    },
    {
      title: "10. Update certifications from lifetime points",
      body: `Certifications do not reset each month. A song or album keeps adding its Combined chart points across its full chart life. When the lifetime total reaches a threshold, it earns the matching award: ${certificationSummary}. If it reaches a higher tier later, the public page shows the highest current tier.`,
    },
  ];

  const featuredPortraits = useMemo(() => {
    const seen = new Set();
    const urls = [];
    for (const artist of getPublicArtists()) {
      const url = getArtistImageUrl(artist, { name: artist.name, artists: [artist] });
      if (url && !seen.has(url)) { seen.add(url); urls.push(url); }
    }
    return urls
      .map((url) => ({ url, order: Math.random() }))
      .sort((a, b) => a.order - b.order)
      .slice(0, isMobile ? 6 : 10)
      .map((item) => item.url);
  }, [isMobile]);
  const info = (title, body, items = [], size = 16) => InfoButton ? (
    <InfoButton title={title} body={body} items={items} size={size} />
  ) : null;
  const aboutCopy = {
    "How It Works": "A step-by-step overview of how public chart data moves from source-platform ranks into monthly Combined charts, artist rankings, analytics, and certifications.",
    "Platforms Tracked": `The public source platforms included in the dataset: ${platformList}.`,
    "Singles Chart": "The singles chart scores songs across the tracked song platforms, then combines those platform points into one monthly Top 50.",
    "Albums Chart": "The albums chart applies the same Top 50 idea to album source charts available in the dataset.",
    "Artist Rankings": "Artist rankings aggregate credited chart impact so a performer can be measured across lead releases, collaborations, and multiple titles.",
    Certifications: "Certifications are lifetime point awards based on accumulated Combined chart points.",
    "Hall of Fame": "The Hall of Fame highlights entries that reached #1 on the Combined chart.",
  };
  const aboutSectionTitle = (label, items = []) => (
    <div style={secLbl(textPrimary)}><SecMark c={isDark?"#F6F3EA":"#1A1A1A"}/>{label}{info(label, aboutCopy[label] || `${label} is part of the public chart explanation.`, items)}</div>
  );

  return (
    <div style={{padding:PAD,background:isDark?"#050505":"#FFF",minHeight:"60vh",boxSizing:"border-box",overflow:"hidden"}}>
      <h2 style={{fontSize:TXT.pageTitle,fontWeight:800,margin:"0 0 4px",color:textPrimary,display:"inline-flex",alignItems:"center",gap:"8px",flexWrap:"wrap"}}>About {SITE_NAME}{info(`About ${SITE_NAME}`, `${SITE_NAME} explains how the public charts are calculated, which platforms are tracked, and how rankings, records, and awards connect to the same monthly dataset.`, ["Use this page when you want the plain-language methodology behind the public app.", "Each info sign opens extra context without changing the chart view."])}</h2>
      <p style={{fontFamily:F,fontSize:isMobile?"14px":"15px",color:textPrimary,margin:"0 0 18px",lineHeight:1.7}}>
        {SITE_NAME} tracks the music performing strongly in Kenya by comparing songs and albums across major digital platforms, then turning that activity into simple monthly Top 50 charts, artist rankings, analytics, records and certifications.
      </p>

      {featuredPortraits.length>0 && (
        <div style={{display:"flex",alignItems:"center",marginBottom:"26px"}}>
          <div style={{display:"flex"}}>
            {featuredPortraits.map((url,i)=>(
              <div key={i} style={{
                width:isMobile?56:76,height:isMobile?56:76,borderRadius:"50%",overflow:"hidden",
                marginLeft:i===0?0:(isMobile?-16:-22),
                border:"2px solid "+(isDark?"#050505":"#FFF"),
                boxShadow:"0 3px 10px rgba(0,0,0,0.18)",flexShrink:0,position:"relative",zIndex:featuredPortraits.length-i,
              }}>
                <img src={url} alt="" loading="lazy" decoding="async" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
              </div>
            ))}
          </div>
          {info("Featured Artist Portraits", "These portraits come from public artist image metadata and are shown as a visual cue for the Kenyan music ecosystem represented in the charts.", [], 15)}
        </div>
      )}

      <section className="ngoma-about-how" style={card({marginBottom:"14px"})}>
        {aboutSectionTitle("How It Works")}
        <p style={{fontSize:isMobile?"14px":"15px",color:textPrimary,lineHeight:1.72,margin:"0 0 14px",fontFamily:F}}>{methodologySummary}</p>
        <div style={{margin:"0 0 18px",padding:"12px",background:panelBg,borderRadius:"12px",border:`1px solid ${panelBorder}`}}>
          <div style={{height:"8px",borderRadius:"999px",background:"linear-gradient(90deg,#C97A12 0%,#F2981A 48%,#E9E7E0 100%)"}}></div>
          <div style={{display:"flex",justifyContent:"space-between",gap:"12px",marginTop:"7px",fontFamily:F,fontSize:"12px",fontWeight:850,color:textPrimary,flexWrap:"wrap"}}>
            <span>Higher rank means more points</span>
            <span>Combined points decide the Top 50</span>
          </div>
        </div>
        <div className="ngoma-about-process">
          {howItWorksSteps.map((step, index) => (
            <div key={step.title} className="ngoma-about-process-row" style={{borderColor:panelBorder}}>
              <span className="ngoma-about-step-number" style={{background:panelBg,borderColor:panelBorder,color:textPrimary,fontFamily:F}}>{String(index + 1).padStart(2, "0")}</span>
              <div style={{minWidth:0}}>
                <h3 style={{fontFamily:F,fontSize:isMobile?"15px":"16px",lineHeight:1.3,fontWeight:850,color:textPrimary,margin:"0 0 5px",display:"inline-flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>{step.title.replace(/^\d+\.\s*/, "")}{info(step.title.replace(/^\d+\.\s*/, ""), step.body, [], 13)}</h3>
                <p style={{fontFamily:F,fontSize:"14px",lineHeight:1.68,color:textMuted,margin:0}}>{step.body}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={{marginTop:"16px",padding:"14px",background:panelBg,border:`1px solid ${panelBorder}`,borderRadius:"12px"}}>
          <strong style={{display:"inline-flex",alignItems:"center",gap:"6px",fontFamily:F,fontSize:"13px",color:textPrimary,marginBottom:"5px"}}>Simple example{info("Simple Example", "This example shows the core scoring idea: platform ranks are converted into points first, then those points are added into one Combined score.", [], 13)}</strong>
          <p style={{fontFamily:F,fontSize:"14px",lineHeight:1.65,color:textMuted,margin:0}}>
            If one song is #1 on Apple Music and #8 on Spotify, those two ranks are first changed into points, then added together. If another song appears on more platforms but at lower ranks, its total is calculated the same way. The higher total ranks higher on the Combined chart, and those monthly points also feed the song's lifetime certification total.
          </p>
        </div>
      </section>

      <div className="anl-grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px"}}>
        <div style={card()}>
          {aboutSectionTitle("Platforms Tracked")}
          <div style={{display:"flex",flexWrap:"wrap",gap:"7px"}}>{trackedPlatforms.map((platform)=>{const p=platform.name,c=platform.brand_color||platform.color||"#69716B";return <span key={p} style={{display:"inline-flex",alignItems:"center",gap:"6px",minHeight:"28px",padding:"5px 10px",background:c+"18",borderRadius:"999px",fontSize:"13px",fontFamily:F,fontWeight:750,color:p==="Boomplay"?"#007C7C":c,border:`1px solid ${c}35`}}>{p}{info(p, `${p} is one of the tracked source platforms used to build public chart rankings when data is available for the selected chart type.`, [], 13)}</span>;})}</div>
        </div>
        <div style={card()}>
          {aboutSectionTitle("Singles Chart")}
          <p style={{fontSize:"14px",color:textPrimary,lineHeight:1.65,margin:"0 0 13px",fontFamily:F}}>The singles chart combines song performance across the tracked song platforms. Each platform rank becomes points, then the song's points are added into one Combined monthly score.</p>
          <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>{["Apple Music","Audiomack","Boomplay","Spotify","YouTube","Shazam"].map(p=><span key={p} style={{padding:"5px 9px",borderRadius:"9px",background:isDark?"#1A1E1A":"#F7F6F2",border:"1px solid "+(isDark?"#2F352F":"#E9E6DE"),fontFamily:F,fontSize:"12px",fontWeight:800,color:textPrimary,display:"inline-flex",alignItems:"center",gap:"6px"}}>{p}{info(`${p} Singles Source`, `${p} is included as a singles source platform when the public dataset has monthly chart rows for it.`, [], 13)}</span>)}</div>
        </div>
        <div style={card()}>
          {aboutSectionTitle("Albums Chart")}
          <p style={{fontSize:"14px",color:textPrimary,lineHeight:1.65,margin:"0 0 13px",fontFamily:F}}>Album rankings use the album source charts available in the dataset. The album rows are scored, combined, and displayed on the same Top 50 idea as singles: strongest total points first.</p>
          <div style={{display:"flex",flexWrap:"wrap",gap:"7px"}}><span style={{padding:"6px 10px",borderRadius:"9px",background:"#FC3C4412",border:"1px solid #FC3C4435",fontFamily:F,fontSize:"12px",fontWeight:850,color:"#FC3C44",display:"inline-flex",alignItems:"center",gap:"6px"}}>Apple Music{info("Apple Music Albums", "Apple Music album rankings contribute to the albums chart when monthly album data is available.", [], 13)}</span><span style={{padding:"6px 10px",borderRadius:"9px",background:"#F68B1F12",border:"1px solid #F68B1F35",fontFamily:F,fontSize:"12px",fontWeight:850,color:"#D66E00",display:"inline-flex",alignItems:"center",gap:"6px"}}>Audiomack{info("Audiomack Albums", "Audiomack album rankings contribute to the albums chart when monthly album data is available.", [], 13)}</span></div>
        </div>
        <div style={card()}>
          {aboutSectionTitle("Artist Rankings")}
          <p style={{fontSize:"14px",color:textPrimary,lineHeight:1.68,margin:0,fontFamily:F}}>Artist rankings use credited chart activity. If an artist has one major hit, multiple steady entries, or credited collaborations, those Top 50 points help show the artist's overall monthly impact.</p>
        </div>
        <div style={card()}>
          {aboutSectionTitle("Certifications")}
          <div style={{display:"grid",gap:"8px"}}>{CERTIFICATION_LEVELS.map(level=><div key={level.level} style={{display:"grid",gridTemplateColumns:"34px minmax(0,1fr) auto",gap:"9px",alignItems:"center",padding:"9px 10px",borderRadius:"11px",background:`${level.color}0B`,border:`1px solid ${level.color}25`}}><span style={{fontSize:"22px",textAlign:"center"}}>{level.icon}</span><strong style={{fontFamily:F,fontSize:"14px",color:level.color,display:"inline-flex",alignItems:"center",gap:"6px"}}>{level.label}{info(level.label, `${level.label} is awarded when a song or album reaches at least ${level.pts.toLocaleString()} lifetime Combined chart points.`, [], 13)}</strong><span style={{fontFamily:F,fontSize:"13px",fontWeight:800,color:textPrimary,display:"inline-flex",alignItems:"center",gap:"6px"}}>{level.pts.toLocaleString()}+ pts{info(`${level.label} Points`, "This is the lifetime Combined points threshold required for the award tier.", [], 13)}</span></div>)}</div>
        </div>
        <div style={card()}>
          {aboutSectionTitle("Hall of Fame")}
          <p style={{fontSize:"14px",color:textPrimary,lineHeight:1.68,margin:0,fontFamily:F}}>Songs and albums that reach #1 on the Combined chart enter the Hall of Fame. The full monthly leaders list covers the complete {DATA_PERIOD} dataset in Analytics.</p>
        </div>
      </div>
      <div style={{display:"flex",justifyContent:"center",marginTop:"18px"}}><button type="button" onClick={()=>navTo("charts")} style={{padding:"12px 18px",borderRadius:"999px",border:"1px solid #C97A1255",backgroundColor:"#F2981A",backgroundImage:"url(/textures/gold-texture.png)",backgroundSize:"160px 106px",backgroundRepeat:"repeat",color:"#FFF",fontFamily:F,fontSize:"12px",fontWeight:900,letterSpacing:"1.2px",textTransform:"uppercase",cursor:"pointer",boxShadow:"0 8px 20px rgba(201,122,18,0.18)"}}>Explore Current Charts</button></div>
      <div style={{marginTop:"18px",padding:"20px",background:isDark?"#111208":"#FAF5EA",border:"1px solid "+(isDark?"#2F2B1A":"#E8DDBF"),borderRadius:"14px",color:textPrimary}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          <NgomaMark size={26} inkColor={textPrimary} />
          <span style={{fontFamily:F,fontSize:"15px",fontWeight:800,letterSpacing:"2.5px",color:textPrimary,textTransform:"uppercase"}}>Ngoma <span style={{color:"#C97A12"}}>Charts</span></span>
        </div>
        <p style={{fontFamily:F,fontSize:"14px",color:textPrimary,margin:"10px 0 0",lineHeight:1.65}}>"Ngoma" means music or drum in Swahili: the heartbeat of Kenyan culture. Transparent, data-driven rankings celebrate the artists making an impact in Kenya.</p>
      </div>
    </div>
  );
}
