import PlatformPerformance from "../components/PlatformPerformance.jsx";
import ArtistCredit from "../components/ArtistCredit.jsx";
import ShareButton from "../components/ShareButton.jsx";
import SharePosterCard from "../components/SharePosterCard.jsx";
import DetailListPoster, { chunkPosterRows, posterFileSlug } from "../components/sharePosters/DetailListPoster.jsx";
import DetailChartPoster from "../components/sharePosters/DetailChartPoster.jsx";
import { buildReleaseShareUrl } from "../utils/shareLinks.js";
import { detailLinkEntries } from "../utils/detailLinks.js";

export default function ReleaseDetailPage({ ctx }) {
  const {
    A_PLATS,
    CartesianGrid,
    CertificationTag,
    CountryBadge,
    F,
    GOLD,
    Line,
    LineChart,
    PAD,
    PC,
    PLAT_LABEL,
    ResponsiveContainer,
    SF,
    S_PLATS,
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


  // Shared chart theming — keeps every Recharts panel dark-mode-aware
  // and consistent with the rest of the app instead of hardcoded light colors.
  const gridStroke = isDark ? "#242923" : "#EDEAE2";
  const axisTick = (size, extra) => ({ fontSize: size, fontFamily: F, fill: isDark ? "#FFFFFF" : "#000000", fontWeight: 650, ...extra });
  const tooltipStyle = {
    fontFamily: F, fontSize: 11,
    background: isDark ? "#161A16" : "#FFFFFF",
    border: "1px solid " + (isDark ? "#2F352F" : "#E4E1D8"),
    borderRadius: "8px",
    boxShadow: isDark ? "0 8px 24px rgba(0,0,0,0.35)" : "0 8px 24px rgba(31,36,31,0.08)",
    color: isDark ? "#FFFFFF" : "#000000",
  };
  const tooltipLabelStyle = { color: isDark ? "#FFFFFF" : "#000000", fontWeight: 700, marginBottom: "2px" };
  const dividerColor = isDark ? "#2B302B" : "#F0F0EC";
  const darkCard = (extra = {}) => ({ ...card(extra), background: isDark ? "#0F120F" : "#FFFFFF", borderColor: isDark ? "#2B302B" : "#EFEDE7" });

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
        const platformPerformance = [...journey.reduce((map, item) => {
          item.platforms.forEach((entry) => {
            const current = map.get(entry.platform) || {
              platform: entry.platform,
              points: 0,
              placements: 0,
              peakRank: Number.POSITIVE_INFINITY,
              months: new Set(),
            };
            const rank = Number(entry.rank);
            current.points += Number(entry.pts ?? entry.p ?? entry.total_points) || 0;
            current.placements += 1;
            current.peakRank = Math.min(current.peakRank, rank || Number.POSITIVE_INFINITY);
            current.months.add(item.month);
            map.set(entry.platform, current);
          });
          return map;
        }, new Map()).values()].map((row) => ({
          ...row,
          peakRank: Number.isFinite(row.peakRank) ? row.peakRank : "—",
          months: row.months.size,
        }));
        const releaseMetadata = combinedHistory.find((item) => (
          item.combined?.release_year ||
          item.combined?.release_date ||
          item.combined?.songwriters ||
          item.combined?.producers ||
          item.combined?.genre ||
          item.combined?.label ||
          item.combined?.distributor ||
          item.combined?.isrc ||
          item.combined?.upc
        ))?.combined || {};
        const releaseDetails = {...releaseMetadata, ...selR};
        const isAlbum = selR.type === "album" || !isSingles;
        const formatRankValue = (value) => Number.isFinite(Number(value)) && Number(value) > 0 ? `#${Number(value)}` : "—";

        // Resolve country via live CMS artist record (same priority as CountryBadge),
        // falling back to the country baked into the chart entry at export time.
        const liveCountry = getArtistCountry(releaseDetails);
        const displayCountry = liveCountry.country || releaseDetails.country || "";
        const displayCountryCode = liveCountry.code || releaseDetails.country_code || "";
        const releaseYearForPoster = releaseDetails.release_year || releaseMetadata.release_year || "";
        const posterSubtitle = [selR.artist, isAlbum ? "Album" : "Single", displayCountry, releaseYearForPoster].filter(Boolean).join(" · ");
        const releaseLinks = detailLinkEntries(releaseDetails, [
          { key: "spotify", label: "Spotify" },
          { key: "apple_music", label: "Apple Music" },
          { key: "boomplay", label: "Boomplay" },
          { key: "audiomack", label: "Audiomack" },
          { key: "youtube", label: "YouTube" },
          ...(!isAlbum ? [{ key: "tiktok", label: "TikTok" }] : []),
          ...(!isAlbum ? [{ key: "shazam", label: "Shazam" }] : []),
        ]).map(({ label, url }) => [`${label} URL`, url]);

        const infoRows = [
          ["Title", releaseDetails.title || selR.title],
          ["Main artists", releaseDetails.primary_artist_credit || releaseDetails.primary_artist],
          ["Featuring", releaseDetails.featured_artist_credit],
          ["Songwriters", releaseDetails.songwriters],
          ["Producers", releaseDetails.producers],
          ["Release year", releaseDetails.release_year || releaseMetadata.release_year],
          ["Release date", formatDate(releaseDetails.release_date)],
          ["Number of tracks", releaseDetails.number_of_tracks],
          ["ISRC", releaseDetails.isrc],
          ["UPC", releaseDetails.upc],
          ["Country", displayCountry],
          ["Country code", displayCountryCode],
          ["Genre", releaseDetails.genre],
          ["Label", releaseDetails.label],
          ["Distributor", releaseDetails.distributor],
          ...releaseLinks,
          ["Radio info", releaseDetails.radio_info],
          ["Status", releaseDetails.status],
        ].filter(([, value]) => value !== null && value !== undefined && value !== "");

        const urlLabels = new Set(["Spotify URL", "Apple Music URL", "Boomplay URL", "Audiomack URL", "YouTube URL", "TikTok URL", "Shazam URL"]);
        const artistCreditLabels = new Set(["Main artists", "Featuring", "Songwriters", "Producers"]);

        const releaseStats = [
          { label: "Current Rank", value: formatRankValue(currentCombined?.combined?.rank) },
          { label: "Peak Rank", value: peakRank < 999 ? `#${peakRank}` : "—" },
          { label: "Total Points", value: totalPoints.toLocaleString() },
          { label: "Months Charted", value: chartedJourney.length },
          { label: "Platforms", value: platformNames.size },
          { label: "Best Coverage", value: `${bestCoverage}/${tp}` },
        ];

        // "Download Full Details" — pairs the compact SharePosterCard with a
        // paginated set of poster images carrying the rest of the page: the
        // full info table and the full cross-platform monthly journey.
        const releaseBaseFileName = `ngoma-${posterFileSlug(selR.title || "release")}`;
        const releaseLinkPlatforms = releaseLinks.map(([label]) => label.replace(" URL", ""));
        const releaseFullInfoRows = [
          ...infoRows.filter(([label]) => !urlLabels.has(label)),
          ...(releaseLinkPlatforms.length ? [["Available Links", releaseLinkPlatforms.join(", ")]] : []),
        ].map(([label, value]) => [label, String(value)]);
        const releaseJourneyRows = chartedJourney.map(({ month: journeyMonth, combined, platforms }) => [
          journeyMonth,
          combined ? `#${combined.rank} · ${combined.pts.toLocaleString()} pts` : "—",
          `${platforms.length}/${tp}`,
          platforms.length ? platforms.map((p) => `${p.platform} #${p.rank}`).join(", ") : "—",
        ]);
        // Platform cells can wrap to 3 lines, so the journey table uses a
        // smaller page size than the plain info list to keep every row a
        // comfortable height instead of shrinking to fit a crowded page.
        const releaseJourneyChunks = chunkPosterRows(releaseJourneyRows, 4);
        const releaseInfoChunks = chunkPosterRows(releaseFullInfoRows, 5);
        const releaseHasTrendData = releaseRankData.length > 0;
        const releaseFullDetailFiles = [
          ...releaseInfoChunks.map((chunk, index) => ({
            id: `info-${index + 1}`,
            fileName: `${releaseBaseFileName}-full-info-${String(index + 1).padStart(2, "0")}-of-${releaseInfoChunks.length}.png`,
            posterContent: (
              <DetailListPoster
                title={selR.title || ""}
                subtitle={posterSubtitle}
                image={releaseDetails.cover_image || ""}
                sectionLabel={releaseInfoChunks.length > 1 ? `Release Info · ${index + 1}/${releaseInfoChunks.length}` : "Release Info"}
                columns={[{ label: "Field", width: "34%" }, { label: "Detail" }]}
                hideColumnHeader
                rows={chunk}
                theme={isDark ? "dark" : "light"}
              />
            ),
          })),
          ...(releaseHasTrendData ? [{
            id: "trends",
            fileName: `${releaseBaseFileName}-full-trends.png`,
            posterContent: (
              <DetailChartPoster
                title={selR.title || ""}
                subtitle={posterSubtitle}
                image={releaseDetails.cover_image || ""}
                sectionLabel="Monthly Trends"
                charts={[
                  { label: "Combined Points Trend", kind: "bar", data: releaseRankData, xKey: "month", dataKey: "points", color: GOLD },
                  { label: "Combined Rank Journey", hint: "Lower is better", kind: "line", data: releaseRankData, xKey: "month", dataKey: "rank", color: GOLD, reversed: true, yDomain: [1, 50], yTickFormatter: (v) => `#${v}` },
                ]}
                theme={isDark ? "dark" : "light"}
              />
            ),
          }] : []),
          ...releaseJourneyChunks.map((chunk, index) => ({
            id: `journey-${index + 1}`,
            fileName: `${releaseBaseFileName}-full-journey-${String(index + 1).padStart(2, "0")}-of-${releaseJourneyChunks.length}.png`,
            posterContent: (
              <DetailListPoster
                title={selR.title || ""}
                subtitle={posterSubtitle}
                image={releaseDetails.cover_image || ""}
                sectionLabel={releaseJourneyChunks.length > 1 ? `Platform Journey · ${index + 1}/${releaseJourneyChunks.length}` : "Platform Journey"}
                columns={[
                  { label: "Month", width: "18%" },
                  { label: "Combined", width: "22%" },
                  { label: "Coverage", width: "13%" },
                  { label: "Platforms", lines: 3 },
                ]}
                rows={chunk}
                theme={isDark ? "dark" : "light"}
              />
            ),
          })),
        ];
        const releasePosterDownloadOptions = [
          {
            id: "poster",
            label: "Download poster",
            fileName: `${releaseBaseFileName}.png`,
            posterContent: (
              <SharePosterCard
                image={releaseDetails.cover_image || ""}
                title={selR.title || ""}
                subtitle={posterSubtitle}
                stats={releaseStats}
                theme={isDark ? "dark" : "light"}
              />
            ),
          },
          {
            id: "full-details",
            label: `Download Full Details (${releaseFullDetailFiles.length} files)`,
            files: releaseFullDetailFiles,
          },
        ];

        return (
        <div style={{padding:PAD,background:isDark?"#050505":"#ffffff",minHeight:"60vh",boxSizing:"border-box",overflow:"hidden"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px",flexWrap:"wrap"}}>
            <span onClick={closeDetails} style={{fontFamily:F,fontSize:isMobile?"12px":"11px",color:isDark?"#FFFFFF":"#000000",cursor:"pointer",letterSpacing:"1px",textTransform:"uppercase",fontWeight:600}}>← Back</span>
            <ShareButton
              isDark={isDark}
              F={F}
              GOLD={GOLD}
              shareUrl={buildReleaseShareUrl(selR)}
              fileName={`${releaseBaseFileName}.png`}
              posterDownloadOptions={releasePosterDownloadOptions}
            />
          </div>

          {/* Hero — cover art beside identity, matching the artist detail page's layout */}
          <div style={{marginTop:"20px",display:"flex",gap:isMobile?"16px":"24px",alignItems:"flex-start",flexDirection:isMobile?"column":"row",minWidth:0}}>
            {releaseDetails.cover_image && (
              <img src={releaseDetails.cover_image} alt={`${selR.title} cover`} style={{width:isMobile?"120px":"156px",height:isMobile?"120px":"156px",aspectRatio:"1",objectFit:"cover",borderRadius:"20px",boxShadow:isDark?"0 12px 30px rgba(0,0,0,0.4)":"0 12px 30px rgba(0,0,0,0.14)",flexShrink:0}} />
            )}
            <div style={{flex:1,minWidth:0}}>
              <h1 style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:"8px",fontSize:isMobile?"24px":"32px",fontWeight:850,margin:"0 0 10px",lineHeight:1.1,fontFamily:SF,letterSpacing:"-0.5px",color:isDark?"#FFFFFF":"#000000"}}>
                {selR.title}{selectedCertification&&<span aria-label={`${selectedCertification.label} certified`} title={`${selectedCertification.label} certified · ${Number(selectedCertification.totalPts||0).toLocaleString()} points`} style={{fontSize:isMobile?"14px":"20px",opacity:0.9,lineHeight:1}}><span style={selectedCertification.iconFilter?{filter:selectedCertification.iconFilter}:undefined}>{selectedCertification.icon}</span></span>}
              </h1>
              <div style={{display:"flex",alignItems:"center",gap:"9px",flexWrap:"wrap"}}>
                <button type="button" onClick={()=>openArtistDetails(selR.primary_artist||selR.artist)} style={{fontSize:isMobile?"15px":"18px",color:isDark?"#FFFFFF":"#000000",margin:0,padding:0,border:0,background:"transparent",fontFamily:F,cursor:"pointer",fontWeight:800}}>{selR.artist}</button>
                <CountryBadge artist={selR.primary_artist||selR.artist} item={releaseDetails} showName />
              </div>
            </div>
          </div>

          <div style={{marginTop:"22px"}}>
            <div className="ngoma-detail-stat-grid" style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,minmax(0,1fr))":"repeat(4,minmax(0,1fr))",gap:"10px",marginBottom:"18px"}}>
              {[
                {label:"Total Points",value:totalPoints.toLocaleString()},
                {label:"Combined Peak Rank",value:peakRank<999?`#${peakRank}`:"—"},
                {label:"Current Combined Rank",value:currentCombined?`#${currentCombined.combined.rank}`:"—"},
                {label:"Months Charted",value:chartedJourney.length},
                {label:"#1 Combined Months",value:numberOneMonths},
                {label:"Platforms",value:platformNames.size},
                {label:"Best Coverage",value:`${bestCoverage}/${tp}`},
                {label:"Release Year",value:selR.release_year||releaseMetadata.release_year||"—"},
              ].map((stat)=><div key={stat.label} style={{padding:"14px 15px",border:"1px solid "+(isDark?"#2B302B":"#ECE9E1"),borderRadius:"10px",background:isDark?"#151815":"#FAFAF8"}}><div style={{fontFamily:F,fontSize:"11px",fontWeight:900,letterSpacing:"1.2px",textTransform:"uppercase",color:isDark?"#FFFFFF":"#000000"}}>{stat.label}</div><div style={{fontFamily:F,fontSize:"22px",fontWeight:900,color:isDark?"#FFFFFF":"#000000",marginTop:"5px"}}>{stat.value}</div></div>)}
            </div>
            <div style={{marginBottom:"18px",border:`1px solid ${isDark?"#2B302B":"#ECE9E1"}`,borderRadius:"12px",overflow:"hidden"}}>
              {infoRows.map(([label, value], idx) => (
                <div key={label} style={{display:"grid",gridTemplateColumns:isMobile?"110px 1fr":"170px 1fr",gap:"14px",padding:"12px 16px",background:isDark?(idx%2===0?"#121612":"#0F1110"):(idx%2===0?"#FAFAF8":"#FFFFFF"),borderTop:idx===0?"none":`1px solid ${isDark?"#2B302B":"#F0EDE6"}`,alignItems:"center"}}>
                  <span style={{fontFamily:F,fontSize:"11px",fontWeight:750,letterSpacing:"0.4px",color:isDark?"#FFFFFF":"#000000",textTransform:"uppercase"}}>{label}</span>
                  {urlLabels.has(label) ? (
                    <a href={value} target="_blank" rel="noopener noreferrer" onClick={(e)=>e.stopPropagation()} style={{fontFamily:F,fontSize:"14px",fontWeight:700,color:isDark?"#FFFFFF":"#000000",textDecoration:"none",wordBreak:"break-all"}}>{value} ↗</a>
                  ) : artistCreditLabels.has(label) ? (
                    <ArtistCredit credit={value} onOpenArtist={openArtistDetails} isDark={isDark} fontFamily={F} fontSize="14px" fontWeight={650} color="#000000" darkColor="#FFFFFF" separatorColor="#000000" darkSeparatorColor="#FFFFFF" />
                  ) : (
                    <span style={{fontFamily:F,fontSize:"14px",fontWeight:650,color:isDark?"#FFFFFF":"#000000",wordBreak:"break-word"}}>{value}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="anl-grid-2" style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1.4fr 0.8fr",gap:"14px",marginBottom:"20px"}}>
              <div style={darkCard()}>
                <div style={secLbl(isDark?"#FFFFFF":"#000000")}><SecMark c={isDark?"#FFFFFF":"#000000"}/>Combined Rank Journey</div>
                <div style={{fontFamily:F,fontSize:"9.5px",fontWeight:800,letterSpacing:"1.2px",textTransform:"uppercase",color:isDark?"#FFFFFF":"#000000",margin:"-6px 0 6px"}}>Lower = better</div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={releaseRankData} margin={{top:8,right:18,left:0,bottom:0}}>
                    <CartesianGrid stroke={gridStroke} vertical={false}/>
                    <XAxis dataKey="month" tick={axisTick(10)} tickLine={false} axisLine={false}/>
                    <YAxis reversed domain={[1,50]} tick={axisTick(10)} tickFormatter={v=>`#${v}`} axisLine={false} tickLine={false}/>
                    <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} cursor={{stroke:gridStroke}} formatter={(v)=>[`#${v}`,"Rank"]}/>
                    <Line type="monotone" dataKey="rank" stroke={GOLD} strokeWidth={2} dot={{r:4,fill:GOLD,stroke:isDark?"#0F120F":"#FFFFFF",strokeWidth:2}} activeDot={{r:6}}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={darkCard()}>
                <div style={secLbl(isDark?"#FFFFFF":"#000000")}><SecMark c={isDark?"#FFFFFF":"#000000"}/>Platform Peak Ranks</div>
                {platformPeaks.map((item)=><div key={item.platform} style={{display:"flex",justifyContent:"space-between",gap:"12px",padding:"8px 0",borderBottom:`1px solid ${dividerColor}`,fontFamily:F,fontSize:"12px"}}><span style={{color:PC[item.platform]||(isDark?"#93A093":"#59645D"),fontWeight:800}}>{item.platform}</span><strong style={{color:isDark?"#FFFFFF":"#000000"}}>#{item.rank}</strong></div>)}
              </div>
            </div>
            <PlatformPerformance
              rows={platformPerformance}
              isDark={isDark}
              isMobile={isMobile}
              F={F}
              SF={SF}
              GOLD={GOLD}
              PC={PC}
              expectedPlatforms={(isAlbum ? A_PLATS : S_PLATS)
                .filter((platform) => platform !== "Combined" && platform !== "Kenyan")
                .map((platform) => PLAT_LABEL[platform] || platform)}
            />
            <div style={darkCard({marginBottom:0})}>
              <div style={secLbl(isDark?"#FFFFFF":"#000000")}><SecMark c={isDark?"#FFFFFF":"#000000"}/>Cross-Platform Journey</div>
              <div style={{border:`1px solid ${isDark?"#2B302B":"#E4E1D8"}`,borderRadius:"12px",overflow:"hidden"}}>
                <div style={{display:"grid",gridTemplateColumns:isMobile?"58px 84px 46px minmax(0,1fr)":"74px 140px 60px minmax(0,1fr)",gap:"8px",padding:isMobile?"9px":"11px 14px",background:"#1F241F",fontFamily:F,fontSize:"10.5px",fontWeight:850,letterSpacing:"0.8px",textTransform:"uppercase",color:"#FFFFFF"}}>
                  <div>Month</div><div>Combined</div><div>Cover</div><div>Platforms</div>
                </div>
                {chartedJourney.map(({month:m,combined,platforms},idx)=>{
                  const isPeak = combined && Number(combined.rank) === 1;
                  return (
                  <div key={m} style={{display:"grid",gridTemplateColumns:isMobile?"58px 84px 46px minmax(0,1fr)":"74px 140px 60px minmax(0,1fr)",gap:"8px",alignItems:"center",padding:isMobile?"9px":"10px 14px",background:isDark?(idx%2?"#121612":"#0F120F"):(idx%2?"#FBFAF7":"#FFFFFF"),borderTop:idx===0?"none":`1px solid ${dividerColor}`,borderLeft:isPeak?`3px solid ${isDark?"#FFFFFF":"#000000"}`:"3px solid transparent"}}>
                    <span style={{fontFamily:SF,fontSize:"12px",fontWeight:800,color:isDark?"#FFFFFF":"#000000"}}>{m}</span>
                    {combined
                      ? <span style={{fontFamily:F,fontSize:"11.5px",fontWeight:800,color:isDark?"#FFFFFF":"#000000"}}>#{combined.rank} · {combined.pts.toLocaleString()} pts</span>
                      : <span style={{fontFamily:F,fontSize:"11px",color:isDark?"#FFFFFF":"#000000"}}>—</span>}
                    <span style={{fontFamily:F,fontSize:"11px",fontWeight:800,color:isDark?"#FFFFFF":"#000000"}}>{platforms.length}/{tp}</span>
                    <div style={{display:"flex",gap:"5px",flexWrap:"wrap"}}>
                      {platforms.map(p=>(
                        <span key={p.platform} title={`${p.platform} #${p.rank}`} style={{padding:"2px 8px",background:(PC[p.platform]||"#888")+"18",borderRadius:"999px",fontSize:"9.5px",fontFamily:F,fontWeight:700,color:PC[p.platform]||"#888"}}>
                          {p.platform} #{p.rank}
                        </span>
                      ))}
                      {!platforms.length && <span style={{fontSize:"11px",color:isDark?"#68716B":"#B8BDB8"}}>—</span>}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        );
      })();
}
