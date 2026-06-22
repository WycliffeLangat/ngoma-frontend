export default function RecordsPage({ ctx }) {
  const {
    CertificationTag,
    F,
    GOLD,
    PAD,
    RecordIcon,
    SF,
    TXT,
    Tog,
    card,
    chartTypeLabel,
    currentRecords,
    fullCoverageClub,
    getCertificationForEntry,
    isMobile,
    isSingles,
    isArtists,
    openRecord,
    openArtistDetails,
    openReleaseDetails,
    releaseLabelLower,
    setOpenRecord
  } = ctx;

  return (
<div style={{padding:PAD,minHeight:"60vh",boxSizing:"border-box",overflow:"hidden"}}>
          <div style={{marginBottom:isMobile?"18px":"22px"}}>
            <div style={{maxWidth:isMobile?"100%":"620px"}}>
              <div style={{fontFamily:F,fontSize:TXT.kicker,letterSpacing:"2.6px",textTransform:"uppercase",color:GOLD,marginBottom:"6px"}}>THE RECORD BOOK</div>
              <h2 style={{fontSize:TXT.pageTitle,fontWeight:800,margin:0}}>Records & Milestones</h2>
              <p style={{fontFamily:F,fontSize:TXT.lead,color:"#59645D",margin:"4px 0 0",lineHeight:1.55}}>{chartTypeLabel} achievements across all tracked months · the chart's defining moments</p>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:isMobile?"10px":"12px",marginTop:isMobile?"14px":"16px",flexWrap:"wrap"}}>
              <Tog sm/>
            </div>
          </div>
          <div className="anl-grid-3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:isMobile?"14px":"16px"}}>
            {currentRecords.map((r,i)=>{
              const expanded = r.isCoverage && openRecord === i;
              const recordCertification = !isArtists && r.certificationEntry ? getCertificationForEntry(r.certificationEntry, isSingles ? "single" : "album") : null;
              return (
                <div key={`${r.displayLabel}-${r.value}`} onClick={()=>{if(r.isCoverage)setOpenRecord(expanded?null:i);}} style={{...card({padding:isMobile?"19px":"24px"}),position:"relative",overflow:"hidden",cursor:r.isCoverage?"pointer":"default",gridColumn:expanded?"1 / -1":"auto"}}>
                  <div style={{position:"absolute",top:isMobile?"8px":"12px",right:isMobile?"10px":"14px",opacity:1}}><RecordIcon label={r.displayLabel} size={isMobile?54:66} muted /></div>
                  <div style={{marginBottom:"13px",position:"relative",zIndex:1}}><RecordIcon label={r.displayLabel} size={isMobile?28:30} /></div>
                  <div style={{fontFamily:F,fontSize:isMobile?"10px":"10.5px",fontWeight:850,letterSpacing:"2px",textTransform:"uppercase",color:GOLD,marginBottom:"9px",position:"relative",zIndex:1,lineHeight:1.35}}>{r.displayLabel}</div>
                  {r.certificationEntry ? <button type="button" onClick={(event)=>{event.stopPropagation();isArtists ? openArtistDetails(r.value) : openReleaseDetails(r.certificationEntry,isSingles?"single":"album");}} style={{display:"block",border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:isMobile?"20px":"21px",fontWeight:900,lineHeight:1.12,marginBottom:recordCertification?"7px":"5px",position:"relative",zIndex:1,cursor:"pointer",textAlign:"left"}}>{r.value}</button> : <div style={{fontFamily:SF,fontSize:isMobile?"20px":"21px",fontWeight:900,lineHeight:1.12,marginBottom:"5px",position:"relative",zIndex:1}}>{r.value}</div>}
                  {recordCertification&&<CertificationTag cert={recordCertification} compact style={{marginBottom:"8px",position:"relative",zIndex:1}} />}
                  <div style={{fontFamily:F,fontSize:isMobile?"13px":"13px",color:"#59645D",lineHeight:1.45,position:"relative",zIndex:1,display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap"}}>
                    <span>{r.displaySub}</span>
                    {r.climbDelta&&<span style={{display:"inline-flex",alignItems:"center",padding:"2px 7px",borderRadius:"999px",background:"#EAF8EF",color:"#1E8E3E",fontSize:"10px",fontWeight:900,letterSpacing:"0.4px"}}>+{r.climbDelta}</span>}
                  </div>
                  {r.isCoverage&&(
                    <div style={{fontFamily:F,fontSize:isMobile?"10.5px":"10.5px",color:GOLD,fontWeight:800,letterSpacing:"0.5px",marginTop:"12px",position:"relative",zIndex:1}}>{expanded?`Hide ${releaseLabelLower}`:`View ${releaseLabelLower}`}</div>
                  )}
                  {expanded&&(
                    <div style={{marginTop:"12px",paddingTop:"12px",borderTop:"1px solid #F0EEE8",position:"relative",zIndex:1,display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(2,minmax(0,1fr))",columnGap:"22px"}}>
                      {fullCoverageClub.length?fullCoverageClub.map((song,idx)=>{
                        const certification = getCertificationForEntry(song, isSingles ? "single" : "album");
                        return (
                        <div key={`${song.title}-${song.artist}`} style={{display:"grid",gridTemplateColumns:"22px minmax(0,1fr)",gap:"8px",alignItems:"start",padding:"8px 6px",fontFamily:F,borderBottom:"1px solid #F2F0EA",borderRadius:"7px"}}>
                          <span style={{fontSize:"10px",fontWeight:900,color:GOLD}}>#{idx+1}</span>
                          <span style={{minWidth:0}}>
                            <span style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
                              <button type="button" onClick={(event)=>{event.stopPropagation();isArtists ? openArtistDetails(song.title) : openReleaseDetails(song,isSingles?"single":"album");}} style={{border:0,background:"transparent",padding:0,fontFamily:SF,fontSize:"12px",fontWeight:850,color:"#1A1A1A",cursor:"pointer",textAlign:"left"}}>{song.title}</button>
                              {certification&&<CertificationTag cert={certification} compact />}
                            </span>
                            <span style={{display:"block",fontSize:"11px",color:"#59645D",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{song.artist} · {song.month}</span>
                          </span>
                        </div>
                        );
                      }):<div style={{fontFamily:F,fontSize:"12px",color:"#59645D"}}>No full-coverage entries found for this view.</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
  );
}
