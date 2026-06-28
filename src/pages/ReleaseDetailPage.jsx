import { useState, useEffect } from "react";

export default function ReleaseDetailPage({ ctx }) {
  const {
    CartesianGrid,
    CertificationTag,
    CountryBadge,
    F,
    GOLD,
    Line,
    LineChart,
    PAD,
    PC,
    ResponsiveContainer,
    SF,
    SecMark,
    Tooltip,
    XAxis,
    YAxis,
    card,
    closeDetails,
    getArtistCountry,
    getCertificationForEntry,
    isDark,
    isMobile,
    isSingles,
    openArtistDetails,
    releaseJourney,
    secLbl,
    selR,
    tp
  } = ctx;

  function formatDate(dateStr) {
    if (!dateStr) return "";
    const parts = String(dateStr).split("-");
    if (parts.length === 3 && parts[0].length === 4) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  }

  const [accentRgb, setAccentRgb] = useState(null);
  useEffect(() => {
    const url = selR?.cover_image;
    if (!url) { setAccentRgb(null); return; }
    setAccentRgb(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 6; canvas.height = 6;
        const c = canvas.getContext("2d");
        c.drawImage(img, 0, 0, 6, 6);
        const d = c.getImageData(0, 0, 6, 6).data;
        let r = 0, g = 0, b = 0;
        const n = d.length / 4;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i+1]; b += d[i+2]; }
        setAccentRgb(`${Math.round(r/n)},${Math.round(g/n)},${Math.round(b/n)}`);
      } catch (_) { setAccentRgb(null); }
    };
    img.onerror = () => setAccentRgb(null);
    img.src = url;
  }, [selR?.cover_image]);

  return (()=>{
        const selectedCertification = getCertificationForEntry(selR, selR.type || (isSingles ? "single" : "album"));
        const journey = releaseJourney(selR);
        const combinedHistory = journey.filter((item) => item.combined);
        const chartedJourney = journey.filter((item) => item.combined || item.platforms.length > 0);
        const platformNames = new Set(journey.flatMap((item) => item.platforms.map((entry) => entry.platform)));
        const totalPoints = combinedHistory.reduce((sum, item) => sum + Number(item.combined?.pts || 0), 0);
        const peakRank = combinedHistory.reduce((best, item) => Math.min(best, Number(item.combined?.rank || 999)), 999);
        const latestJourney = journey[journey.length - 1];
        const currentCombined = latestJourney?.combined ? latestJourney : null;
        const numberOneMonths = combinedHistory.filter((item) => Number(item.combined.rank) === 1).length;
        const bestCoverage = combinedHistory.reduce((best, item) => Math.max(best, Number(String(item.combined.plat || "0").split("/")[0]) || 0), 0);
        const releaseRankData = combinedHistory.map((item) => ({month:item.month.split(" ")[0].slice(0,3),rank:Number(item.combined.rank),points:Number(item.combined.pts)||0}));
        const platformPeaks = [...platformNames].map((platformName) => ({
          platform: platformName,
          rank: journey.reduce((best, item) => {
            const platformEntry = item.platforms.find((entry) => entry.platform === platformName);
            return platformEntry ? Math.min(best, Number(platformEntry.rank)) : best;
          }, 999),
        })).sort((a,b)=>a.rank-b.rank);
        const releaseMetadata = combinedHistory.find((item) => item.combined?.release_year || item.combined?.confidence || item.combined?.genre || item.combined?.label)?.combined || {};
        const releaseDetails = {...releaseMetadata, ...selR};
        const releaseConfidence = selR.confidence || releaseMetadata.confidence;
        const isAlbum = selR.type === "album" || !isSingles;

        // Resolve country via live CMS artist record (same priority as CountryBadge),
        // falling back to the country baked into the chart entry at export time.
        const liveCountry = getArtistCountry(releaseDetails);
        const displayCountry = liveCountry.country || releaseDetails.country || "";
        const displayCountryCode = liveCountry.code || releaseDetails.country_code || "";

        const infoRows = [
          ["Title", releaseDetails.title || selR.title],
          ["Main artists", releaseDetails.primary_artist_credit || releaseDetails.primary_artist],
          ["Featuring", releaseDetails.featured_artist_credit],
          ["Songwriters", releaseDetails.songwriters],
          ["Producers", releaseDetails.producers],
          ["Release year", releaseDetails.release_year || releaseMetadata.release_year],
          ["Release date", formatDate(releaseDetails.release_date)],
          [isAlbum ? "ISRCs" : "ISRC", releaseDetails.isrc],
          ["UPC", releaseDetails.upc],
          ...(isAlbum ? [["Number of tracks", releaseDetails.number_of_tracks]] : []),
          ["Country", displayCountry],
          ["Country code", displayCountryCode],
          ["Genre", releaseDetails.genre],
          ["Label", releaseDetails.label],
          ["Distributor", releaseDetails.distributor],
          ["Spotify URL", releaseDetails.spotify_url],
          ["Apple Music URL", releaseDetails.apple_music_url],
          ["Boomplay URL", releaseDetails.boomplay_url],
          ["Audiomack URL", releaseDetails.audiomack_url],
          ["YouTube URL", releaseDetails.youtube_url],
          ...(!isAlbum ? [["TikTok URL", releaseDetails.tiktok_url]] : []),
          ...(!isAlbum ? [["Shazam URL", releaseDetails.shazam_url]] : []),
          ["Radio info", releaseDetails.radio_info],
          ["Status", releaseDetails.status],
        ].filter(([, value]) => value !== null && value !== undefined && value !== "");

        const urlLabels = new Set(["Spotify URL", "Apple Music URL", "Boomplay URL", "Audiomack URL", "YouTube URL", "TikTok URL", "Shazam URL"]);

        return (
        <div style={{padding:PAD,background:isDark?"#050505":accentRgb?`linear-gradient(160deg,rgba(${accentRgb},0.13) 0%,#ffffff 100%)`:"#ffffff",minHeight:"60vh",boxSizing:"border-box",overflow:"hidden",transition:"background 0.6s ease"}}>
          <span onClick={closeDetails} style={{fontFamily:F,fontSize:isMobile?"12px":"11px",color:GOLD,cursor:"pointer",letterSpacing:"1px",textTransform:"uppercase",fontWeight:600}}>← Back</span>
          <div style={{marginTop:"20px"}}>
            {releaseDetails.cover_image&&<img src={releaseDetails.cover_image} alt={`${selR.title} cover`} style={{width:isMobile?"120px":"150px",aspectRatio:"1",objectFit:"cover",borderRadius:"14px",marginBottom:"16px",boxShadow:"0 10px 28px rgba(0,0,0,0.12)"}} />}
            <div style={{fontFamily:F,fontSize:"10px",letterSpacing:"2px",textTransform:"uppercase",color:GOLD,marginBottom:"6px"}}>{selR.type||"single"}</div>
            <h1 style={{display:"flex",alignItems:"center",fontSize:isMobile?"24px":"30px",fontWeight:850,margin:"0 0 4px",lineHeight:1.12}}>
              {selR.title}{selectedCertification&&<span aria-label={`${selectedCertification.label} certified`} title={`${selectedCertification.label} certified · ${Number(selectedCertification.totalPts||0).toLocaleString()} points`} style={{marginLeft:"6px",fontSize:isMobile?"12px":"18px",opacity:0.85,lineHeight:1}}><span style={selectedCertification.iconFilter?{filter:selectedCertification.iconFilter}:undefined}>{selectedCertification.icon}</span></span>}
            </h1>
            <div style={{display:"flex",alignItems:"center",gap:"9px",flexWrap:"wrap",margin:"0 0 16px"}}>
              <button type="button" onClick={()=>openArtistDetails(selR.primary_artist||selR.artist)} style={{fontSize:isMobile?"15px":"18px",color:"#4E5851",margin:0,padding:0,border:0,background:"transparent",fontFamily:F,cursor:"pointer",fontWeight:800}}>{selR.artist}</button>
              <CountryBadge artist={selR.primary_artist||selR.artist} item={releaseDetails} showName />
            </div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,minmax(0,1fr))":"repeat(4,minmax(0,1fr))",gap:"10px",marginBottom:"18px"}}>
              {[
                {label:"Total Points",value:totalPoints.toLocaleString()},
                {label:"Combined Peak Rank",value:peakRank<999?`#${peakRank}`:"—"},
                {label:"Current Combined Rank",value:currentCombined?`#${currentCombined.combined.rank}`:"—"},
                {label:"Months Charted",value:chartedJourney.length},
                {label:"#1 Combined Months",value:numberOneMonths},
                {label:"Platforms",value:platformNames.size},
                {label:"Best Coverage",value:`${bestCoverage}/${tp}`},
                {label:"Release Year",value:selR.release_year||releaseMetadata.release_year||"—"},
              ].map((stat)=><div key={stat.label} style={{padding:"14px 15px",border:"1px solid "+(isDark?"#2B302B":"#ECE9E1"),borderRadius:"10px",background:isDark?"#151815":"#FAFAF8"}}><div style={{fontFamily:F,fontSize:"11px",fontWeight:900,letterSpacing:"1.2px",textTransform:"uppercase",color:isDark?"#8F968F":"#7B857D"}}>{stat.label}</div><div style={{fontFamily:F,fontSize:"22px",fontWeight:900,color:isDark?"#F6F3EA":"#1A1A1A",marginTop:"5px"}}>{stat.value}</div></div>)}
            </div>
            <div style={{marginBottom:"18px",border:`1px solid ${isDark?"#2B302B":"#ECE9E1"}`,borderRadius:"12px",overflow:"hidden"}}>
              {infoRows.map(([label, value], idx) => (
                <div key={label} style={{display:"grid",gridTemplateColumns:isMobile?"110px 1fr":"170px 1fr",gap:"14px",padding:"12px 16px",background:isDark?(idx%2===0?"#121612":"#0F1110"):(idx%2===0?"#FAFAF8":"#FFFFFF"),borderTop:idx===0?"none":`1px solid ${isDark?"#2B302B":"#F0EDE6"}`,alignItems:"center"}}>
                  <span style={{fontFamily:F,fontSize:"11px",fontWeight:750,letterSpacing:"0.4px",color:isDark?"#8F968F":"#7B857D",textTransform:"uppercase"}}>{label}</span>
                  {urlLabels.has(label) ? (
                    <a href={value} target="_blank" rel="noopener noreferrer" onClick={(e)=>e.stopPropagation()} style={{fontFamily:F,fontSize:"14px",fontWeight:700,color:GOLD,textDecoration:"none",wordBreak:"break-all"}}>{value} ↗</a>
                  ) : (
                    <span style={{fontFamily:F,fontSize:"14px",fontWeight:650,color:isDark?"#F6F3EA":"#1A1A1A",wordBreak:"break-word"}}>{value}</span>
                  )}
                </div>
              ))}
            </div>
            {releaseConfidence&&<div style={{fontFamily:F,fontSize:"11px",color:"#68716B",margin:"-6px 0 18px"}}>Metadata confidence: <strong>{releaseConfidence}</strong></div>}
            <div className="anl-grid-2" style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1.4fr 0.8fr",gap:"14px",marginBottom:"20px"}}>
              <div style={card()}>
                <div style={secLbl()}><SecMark/>Combined Rank & Points Journey</div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={releaseRankData} margin={{top:10,right:18,left:0,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC"/>
                    <XAxis dataKey="month" tick={{fontSize:10,fontFamily:F,fill:"#59645D"}}/>
                    <YAxis yAxisId="rank" reversed domain={[1,50]} tick={{fontSize:10,fontFamily:F,fill:"#59645D"}} tickFormatter={v=>`#${v}`}/>
                    <YAxis yAxisId="points" orientation="right" domain={[0,50]} hide/>
                    <Tooltip formatter={(value,name)=>[name==="rank"?`#${value}`:value,name==="rank"?"Rank":"Points"]} contentStyle={{fontFamily:F,fontSize:11}}/>
                    <Line yAxisId="rank" type="monotone" dataKey="rank" stroke={GOLD} strokeWidth={3} dot={{r:4}}/>
                    <Line yAxisId="points" type="monotone" dataKey="points" stroke="#1565C0" strokeWidth={2} strokeDasharray="5 4" dot={{r:3}}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={card()}>
                <div style={secLbl()}><SecMark/>Platform Peak Ranks</div>
                {platformPeaks.map((item)=><div key={item.platform} style={{display:"flex",justifyContent:"space-between",gap:"12px",padding:"8px 0",borderBottom:"1px solid #F0F0EC",fontFamily:F,fontSize:"12px"}}><span style={{color:PC[item.platform]||"#59645D",fontWeight:800}}>{item.platform}</span><strong>#{item.rank}</strong></div>)}
              </div>
            </div>
            <h3 style={secLbl()}><SecMark/>Cross-Platform Journey</h3>
            {chartedJourney.map(({month:m,combined,platforms})=>(
              <div key={m} style={{marginBottom:"14px",padding:"16px",background:isDark?"#111411":"#FAFAF8",borderRadius:"8px",border:"1px solid "+(isDark?"#2B302B":"#EAEAE6")}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
                  <span style={{fontWeight:700,fontFamily:SF,color:isDark?"#F6F3EA":"inherit"}}>{m}</span>
                  {combined
                    ? <span style={{fontFamily:F,fontSize:"13px",fontWeight:700,color:GOLD}}>#{combined.rank} Combined · {combined.pts.toLocaleString()} pts · {combined.plat} platforms</span>
                    : <span style={{fontFamily:F,fontSize:"12px",fontWeight:800,color:isDark?"#F4EFE4":"#59645D"}}>Platform entries only</span>}
                </div>
                <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                  {platforms.map(p=>(
                    <span key={p.platform} style={{padding:"4px 10px",background:(PC[p.platform]||"#888")+"14",borderRadius:"12px",fontSize:"10px",fontFamily:F,fontWeight:600,color:PC[p.platform]||"#888",borderLeft:"2px solid "+(PC[p.platform]||"#888")}}>
                      {p.platform} #{p.rank}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        );
      })();
}
