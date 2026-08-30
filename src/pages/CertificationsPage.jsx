import EntryThumb from "../components/EntryThumb.jsx";
import ArtistCredit from "../components/ArtistCredit.jsx";
import ShareButton from "../components/ShareButton.jsx";
import CertificationSharePoster, { certificationToPosterItem } from "../components/sharePosters/CertificationSharePoster.jsx";
import { buildCertificationsShareUrl, buildReleaseShareUrl } from "../utils/shareLinks.js";

export default function CertificationsPage({ ctx }) {
  const {
    CERTIFICATION_LEVELS,
    CountryBadge,
    F,
    GOLD,
    PAD,
    SF,
    SecMark,
    TXT,
    Tog,
    card,
    certIcons,
    certs,
    isDark,
    isMobile,
    isSingles,
    isArtists,
    openArtistDetails,
    openReleaseDetails,
    secLbl
  } = ctx;

  const textPrimary = isDark ? "#FFFFFF" : "#000000";
  const textMuted = isDark ? "rgba(255,255,255,0.78)" : "#4F5750";
  const cardBg = isDark ? "#141814" : "#FFFFFF";
  const cardBorder = isDark ? "#242923" : "#EFEDE7";
  const softBg = isDark ? "rgba(255,255,255,0.04)" : "#FAF8F2";
  const cardShadow = isDark ? "0 8px 24px rgba(0,0,0,0.32)" : "0 1px 3px rgba(0,0,0,0.02),0 8px 24px rgba(0,0,0,0.02)";
  const tileCard = (extra = {}) => card({ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow, ...extra });

  const certIconFilters = Object.fromEntries(CERTIFICATION_LEVELS.map(l => [l.level, l.iconFilter || null]));
  const certMetaByLevel = Object.fromEntries(CERTIFICATION_LEVELS.map(l => [l.level, l]));

  // Each entry should only appear at its highest certification level.
  // CERTIFICATION_LEVELS is ordered highest-to-lowest (index 0 = diamond, etc.).
  const levelRank = Object.fromEntries(CERTIFICATION_LEVELS.map((l, i) => [l.level, i]));
  const deduplicatedCerts = Object.values(
    certs.reduce((acc, c) => {
      const key = `${String(c.t||"").toLowerCase()}|||${String(c.a||"").toLowerCase()}`;
      if (!acc[key] || (levelRank[c.level] ?? 99) < (levelRank[acc[key].level] ?? 99)) {
        acc[key] = c;
      }
      return acc;
    }, {})
  );
  const sortedCerts = [...deduplicatedCerts].sort((a, b) => (b.totalPts || 0) - (a.totalPts || 0));
  const topCert = sortedCerts[0] || null;
  const topCertMeta = topCert ? certMetaByLevel[topCert.level] : null;
  const activeLabel = isSingles ? "songs" : "albums";
  const activeSingular = isSingles ? "song" : "album";
  const totalCertified = deduplicatedCerts.length;
  const levelStats = CERTIFICATION_LEVELS.map((level) => ({
    ...level,
    count: deduplicatedCerts.filter((cert) => cert.level === level.level).length,
  }));
  const awardRules = [
    ["Source", `Only Combined ${activeSingular} chart points are used.`],
    ["Running total", `Points keep adding every month a ${activeSingular} appears on the Combined Top 50.`],
    ["Current tier", "Each release appears once, at the highest award level it has reached."],
  ];

  if (isArtists) {
    return (
      <div style={{padding:PAD,minHeight:"60vh",boxSizing:"border-box",overflow:"hidden"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:isMobile?"stretch":"flex-end",marginBottom:"24px",gap:isMobile?"12px":"20px",flexDirection:isMobile?"column":"row"}}>
          <div>
            <h2 style={{fontSize:TXT.pageTitle,fontWeight:800,margin:"0 0 4px",color:textPrimary}}>Artist Certifications</h2>
            <p style={{fontFamily:F,fontSize:TXT.lead,color:textMuted,margin:0,lineHeight:1.55}}>Artist certification rules have not been activated yet. Song and album certifications remain based on cumulative Combined chart points.</p>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:isMobile?"10px":"12px",flexWrap:"wrap"}}>
            <Tog sm/>
          </div>
        </div>
        <div style={{...tileCard({textAlign:"center",padding:isMobile?"28px":"34px",borderRadius:"16px"})}}>
          <div style={{fontFamily:SF,fontSize:isMobile?"22px":"26px",fontWeight:850,marginBottom:"8px",color:textPrimary}}>No artist certifications yet</div>
          <div style={{fontFamily:F,fontSize:TXT.body,color:textMuted,lineHeight:1.6}}>Use the Artists toggle on Charts, Analytics, Records, and Year End to view artist rankings and comparisons.</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="ngoma-certifications-page"
      style={{
        padding: PAD,
        minHeight: "60vh",
        boxSizing: "border-box",
        overflow: "hidden",
        "--cert-card-bg": cardBg,
        "--cert-soft-bg": softBg,
        "--cert-border": cardBorder,
        "--cert-text": textPrimary,
        "--cert-muted": textMuted,
      }}
    >
      <section className="ngoma-cert-hero" style={{borderColor:cardBorder,background:isDark?"linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))":"linear-gradient(135deg,#FFF,#FAF8F2)"}}>
        <div style={{minWidth:0}}>
          <div style={{...secLbl(textPrimary),marginBottom:"10px"}}><SecMark c={textPrimary}/>Point-Based Awards</div>
          <h2 style={{fontSize:TXT.pageTitle,fontWeight:800,margin:"0 0 8px",color:textPrimary}}>Certifications</h2>
          <p style={{fontFamily:F,fontSize:TXT.lead,color:textMuted,margin:0,lineHeight:1.65,maxWidth:"760px"}}>
            Certifications show which {activeLabel} have built enough lifetime Combined chart points to cross an award threshold. The page is grouped by award level, then sorted by total points so the strongest certified releases are easiest to scan.
          </p>
        </div>
        <div className="ngoma-cert-actions">
          <ShareButton
            isDark={isDark}
            F={F}
            GOLD={GOLD}
            shareUrl={buildCertificationsShareUrl()}
            fileName="ngoma-certifications.png"
            posterContent={topCert ? <CertificationSharePoster item={certificationToPosterItem(topCert)} theme={isDark ? "dark" : "light"} /> : null}
          />
          <Tog sm/>
        </div>
      </section>

      <div className="ngoma-cert-dashboard">
        <div className="ngoma-cert-feature" style={tileCard({borderRadius:"14px"})}>
          <div style={{fontFamily:F,fontSize:"11px",fontWeight:900,letterSpacing:"1px",textTransform:"uppercase",color:textMuted}}>Current leader</div>
          {topCert ? (
            <>
              <div style={{display:"flex",alignItems:"center",gap:"13px",marginTop:"12px"}}>
                <div style={{position:"relative",flexShrink:0}}>
                  <EntryThumb
                    item={topCert}
                    name={topCert.a}
                    size={isMobile?62:76}
                    radius="10px"
                    accent={topCertMeta?.color || textPrimary}
                    style={{boxShadow:isDark?"0 10px 22px rgba(0,0,0,0.28)":"0 10px 22px rgba(0,0,0,0.10)"}}
                  />
                  <span
                    style={{
                      position:"absolute",
                      right:"-6px",
                      bottom:"-6px",
                      width:isMobile?24:28,
                      height:isMobile?24:28,
                      borderRadius:"50%",
                      display:"flex",
                      alignItems:"center",
                      justifyContent:"center",
                      background:cardBg,
                      border:`1px solid ${cardBorder}`,
                      boxShadow:isDark?"0 4px 12px rgba(0,0,0,0.35)":"0 4px 12px rgba(0,0,0,0.12)",
                      fontSize:isMobile?"15px":"17px",
                      lineHeight:1,
                    }}
                  >
                    <span style={{filter:topCertMeta?.iconFilter||undefined}}>{certIcons[topCert.level]}</span>
                  </span>
                </div>
                <div style={{minWidth:0}}>
                  <button type="button" onClick={()=>openReleaseDetails(topCert,topCert.chart_type==="albums"?"album":"single")} style={{display:"block",border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:isMobile?"20px":"24px",fontWeight:850,lineHeight:1.08,cursor:"pointer",textAlign:"left",color:textPrimary,whiteSpace:"normal",wordBreak:"break-word"}}>{topCert.t}</button>
                  <div style={{display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap",marginTop:"7px"}}>
                    <ArtistCredit credit={topCert.artist_credit || topCert.a} onOpenArtist={openArtistDetails} isDark={isDark} fontFamily={F} fontSize="13px" fontWeight={400} color="#000000" darkColor="#FFFFFF" separatorColor="#000000" darkSeparatorColor="#FFFFFF" />
                    <CountryBadge artist={topCert.a} item={topCert} compact />
                  </div>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginTop:"18px"}}>
                <div style={{padding:"12px",borderRadius:"10px",background:softBg,border:`1px solid ${cardBorder}`}}>
                  <div style={{fontFamily:F,fontSize:"11px",fontWeight:850,color:textMuted,textTransform:"uppercase",letterSpacing:"0.7px"}}>Award</div>
                  <div style={{fontFamily:F,fontSize:"16px",fontWeight:850,color:topCertMeta?.color || textPrimary,marginTop:"4px"}}>{topCertMeta?.label || topCert.level}</div>
                </div>
                <div style={{padding:"12px",borderRadius:"10px",background:softBg,border:`1px solid ${cardBorder}`}}>
                  <div style={{fontFamily:F,fontSize:"11px",fontWeight:850,color:textMuted,textTransform:"uppercase",letterSpacing:"0.7px"}}>Points</div>
                  <div style={{fontFamily:F,fontSize:"16px",fontWeight:850,color:textPrimary,marginTop:"4px"}}>{(topCert.totalPts || 0).toLocaleString()}</div>
                </div>
              </div>
            </>
          ) : (
            <p style={{fontFamily:F,fontSize:"14px",lineHeight:1.65,color:textMuted,margin:"12px 0 0"}}>No certified {activeLabel} yet.</p>
          )}
        </div>

        <div className="ngoma-cert-rules" style={{borderColor:cardBorder,background:softBg}}>
          <div style={{fontFamily:F,fontSize:"11px",fontWeight:900,letterSpacing:"1px",textTransform:"uppercase",color:textMuted}}>How awards are decided</div>
          {awardRules.map(([label, detail]) => (
            <div key={label} className="ngoma-cert-rule">
              <span style={{fontFamily:F,fontSize:"13px",fontWeight:850,color:textPrimary}}>{label}</span>
              <p style={{fontFamily:F,fontSize:"13px",lineHeight:1.5,color:textMuted,margin:0}}>{detail}</p>
            </div>
          ))}
        </div>
      </div>

      <section style={{marginTop:"26px"}}>
        <div style={{...secLbl(textPrimary),marginBottom:"14px"}}><SecMark c={textPrimary}/>Award Levels</div>
        <div className="anl-grid-3 ngoma-cert-level-grid" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px"}}>
          {levelStats.map((level)=>(
            <div key={level.level} className="ngoma-cert-tile" style={{...tileCard({borderRadius:"14px",borderTop:`3px solid ${level.color}`})}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"10px"}}>
                <span style={{fontSize:"28px",lineHeight:1,filter:level.iconFilter||undefined}}>{level.icon}</span>
                <span style={{fontFamily:F,fontSize:"12px",fontWeight:850,color:textMuted}}>{level.count.toLocaleString()} current</span>
              </div>
              <div style={{fontFamily:SF,fontWeight:850,fontSize:TXT.metric,margin:"12px 0 3px",color:level.color}}>{level.label}</div>
              <div style={{fontFamily:F,fontSize:TXT.cardMeta,color:textMuted}}>{level.pts.toLocaleString()}+ lifetime points</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{marginTop:"30px"}}>
        <div style={{...secLbl(textPrimary),marginBottom:"14px"}}><SecMark c={textPrimary}/>Certified {isSingles ? "Songs" : "Albums"} ({totalCertified.toLocaleString()})</div>
        {CERTIFICATION_LEVELS.map(({ level })=>{
          const filtered=deduplicatedCerts.filter(c=>c.level===level).sort((a,b)=>(b.totalPts||0)-(a.totalPts||0));
          const meta = certMetaByLevel[level] || {};
          if(!filtered.length)return null;
          return(
            <div key={level} className="ngoma-cert-section">
              <div className="ngoma-cert-section-heading" style={{borderColor:cardBorder}}>
                <span style={{display:"inline-flex",alignItems:"center",gap:"9px",fontFamily:SF,fontSize:"18px",fontWeight:850,color:textPrimary}}>
                  <span style={{filter:certIconFilters[level]||undefined}}>{certIcons[level]}</span>
                  {level.charAt(0).toUpperCase()+level.slice(1)}
                </span>
                <span style={{fontFamily:F,fontSize:"12px",fontWeight:850,color:textMuted}}>{filtered.length.toLocaleString()} certified</span>
              </div>
              <div className="cert-wall">
                {filtered.map((c,i)=>{
                  const releaseType = c.chart_type === "albums" ? "album" : "single";
                  return (
                    <div key={`${c.t}-${c.a}-${i}`} className={`cert-wall-card ${level}`} style={{"--cert-level-color":meta.color || textPrimary,background:isDark?"rgba(255,255,255,0.035)":"rgba(0,0,0,0.018)"}}>
                      <span className="cert-icon"><span style={certIconFilters[level]?{filter:certIconFilters[level]}:undefined}>{certIcons[level]}</span></span>
                      <EntryThumb item={c} name={c.a} size={isMobile?54:62} accent={textPrimary} />
                      <div className="cert-release-copy">
                        <button type="button" onClick={()=>openReleaseDetails(c,releaseType)} style={{display:"block",border:0,background:"transparent",padding:0,fontFamily:SF,fontWeight:850,fontSize:"15px",lineHeight:1.25,cursor:"pointer",textAlign:"left",color:textPrimary,whiteSpace:"normal",wordBreak:"break-word"}}>{c.t}</button>
                        <div style={{display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap",marginTop:"4px"}}>
                          <ArtistCredit credit={c.artist_credit || c.a} onOpenArtist={openArtistDetails} isDark={isDark} fontFamily={F} fontSize="13px" fontWeight={400} color="#000000" darkColor="#FFFFFF" separatorColor="#000000" darkSeparatorColor="#FFFFFF" />
                          <CountryBadge artist={c.a} item={c} compact />
                        </div>
                      </div>
                      <div className="cert-points" style={{fontFamily:F}}>
                        <div style={{fontSize:"19px",fontWeight:900,color:textPrimary,lineHeight:1}}>{(c.totalPts || 0).toLocaleString()}</div>
                        <div style={{fontSize:"10px",fontWeight:800,textTransform:"uppercase",letterSpacing:"0.8px",color:textMuted,marginTop:"3px"}}>points</div>
                      </div>
                      <div className="cert-share">
                        <ShareButton
                          compact
                          isDark={isDark}
                          F={F}
                          GOLD={GOLD}
                          shareUrl={buildReleaseShareUrl({ title: c.t, artist: c.a, type: releaseType })}
                          fileName={`ngoma-${String(c.t||"certification").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")}.png`}
                          posterContent={<CertificationSharePoster item={certificationToPosterItem(c)} theme={isDark ? "dark" : "light"} />}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {!deduplicatedCerts.length&&<div style={{padding:"40px",textAlign:"center",fontFamily:F,color:textMuted,border:`1px solid ${cardBorder}`,borderRadius:"14px",background:softBg}}>No certifications yet</div>}
      </section>
    </div>
  );
}
