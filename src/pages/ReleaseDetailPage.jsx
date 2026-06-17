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
    getCertificationForEntry,
    isDark,
    isMobile,
    isSingles,
    openArtistDetails,
    releaseJourney,
    secLbl,
    selR
  } = ctx;

  return (()=>{
        const selectedCertification = getCertificationForEntry(selR, selR.type || (isSingles ? "single" : "album"));
        const journey = releaseJourney(selR);
        const combinedHistory = journey.filter((item) => item.combined);
        const platformNames = new Set(journey.flatMap((item) => item.platforms.map((entry) => entry.platform)));
        const totalPoints = combinedHistory.reduce((sum, item) => sum + Number(item.combined?.pts || 0), 0);
        const peakRank = combinedHistory.reduce((best, item) => Math.min(best, Number(item.combined?.rank || 999)), 999);
        const currentCombined = combinedHistory[combinedHistory.length - 1];
        const averageRank = combinedHistory.length ? Math.round(combinedHistory.reduce((sum, item) => sum + Number(item.combined.rank || 0), 0) / combinedHistory.length) : null;
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
        const releaseMetadata = combinedHistory.find((item) => item.combined?.release_year || item.combined?.confidence)?.combined || {};
        const releaseConfidence = selR.confidence || releaseMetadata.confidence;
        return (
        <div style={{padding:PAD,background:"#FFF",minHeight:"60vh",boxSizing:"border-box",overflow:"hidden"}}>
          <span onClick={closeDetails} style={{fontFamily:F,fontSize:isMobile?"12px":"11px",color:GOLD,cursor:"pointer",letterSpacing:"1px",textTransform:"uppercase",fontWeight:600}}>← Back</span>
          <div style={{marginTop:"20px"}}>
            <div style={{fontFamily:F,fontSize:"10px",letterSpacing:"2px",textTransform:"uppercase",color:GOLD,marginBottom:"6px"}}>{selR.type||"single"}</div>
            <h1 style={{fontSize:isMobile?"24px":"30px",fontWeight:850,margin:"0 0 4px",lineHeight:1.12}}>{selR.title}</h1>
            {selectedCertification&&<CertificationTag cert={selectedCertification} compact={false} style={{margin:"2px 0 10px"}} />}
            <div style={{display:"flex",alignItems:"center",gap:"9px",flexWrap:"wrap",margin:"0 0 16px"}}>
              <button type="button" onClick={()=>openArtistDetails(selR.primary_artist||selR.artist)} style={{fontSize:isMobile?"15px":"18px",color:"#4E5851",margin:0,padding:0,border:0,background:"transparent",fontFamily:F,cursor:"pointer",fontWeight:800}}>{selR.artist}</button>
              <CountryBadge artist={selR.primary_artist||selR.artist} showName />
            </div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,minmax(0,1fr))":"repeat(4,minmax(0,1fr))",gap:"10px",marginBottom:"18px"}}>
              {[
                {label:"Total Points",value:totalPoints.toLocaleString()},
                {label:"Peak Rank",value:peakRank<999?`#${peakRank}`:"—"},
                {label:"Current Rank",value:currentCombined?`#${currentCombined.combined.rank}`:"—"},
                {label:"Average Rank",value:averageRank?`#${averageRank}`:"—"},
                {label:"Months Charted",value:combinedHistory.length},
                {label:"#1 Months",value:numberOneMonths},
                {label:"Platforms",value:platformNames.size},
                {label:"Best Coverage",value:`${bestCoverage}/${isSingles?6:2}`},
                {label:"Release Year",value:selR.release_year||releaseMetadata.release_year||"—"},
              ].map((stat)=><div key={stat.label} style={{padding:"12px 13px",border:"1px solid #ECE9E1",borderRadius:"10px",background:"#FAFAF8"}}><div style={{fontFamily:F,fontSize:"9px",fontWeight:900,letterSpacing:"1.2px",textTransform:"uppercase",color:"#7B857D"}}>{stat.label}</div><div style={{fontFamily:F,fontSize:"19px",fontWeight:900,color:"#1A1A1A",marginTop:"5px"}}>{stat.value}</div></div>)}
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
            {journey.map(({month:m,combined,platforms})=>(
              <div key={m} style={{marginBottom:"14px",padding:"16px",background:"#FAFAF8",borderRadius:"8px",border:"1px solid #EAEAE6"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
                  <span style={{fontWeight:700,fontFamily:SF}}>{m}</span>
                  {combined?<span style={{fontFamily:F,fontSize:"13px",fontWeight:700,color:GOLD}}>#{combined.rank} Combined · {combined.pts.toLocaleString()} pts · {combined.plat} platforms</span>:<span style={{fontFamily:F,fontSize:"12px",color:isDark?"#AEB6AE":"#8A928B",fontWeight:800}}>Not charted this month</span>}
                </div>
                <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                  {platforms.map(p=>(
                    <span key={p.platform} style={{padding:"4px 10px",background:(PC[p.platform]||"#888")+"14",borderRadius:"12px",fontSize:"10px",fontFamily:F,fontWeight:600,color:PC[p.platform]||"#888",borderLeft:"2px solid "+(PC[p.platform]||"#888")}}>
                      {p.platform} #{p.rank}
                    </span>
                  ))}
                  {platforms.length===0&&<span style={{fontFamily:F,fontSize:isMobile?"12px":"11px",color:isDark?"#AEB6AE":"#8A928B",fontWeight:750}}>No tracked platform chart entry this month</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
        );
      })();
}
