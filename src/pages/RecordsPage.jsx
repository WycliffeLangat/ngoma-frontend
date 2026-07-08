import { useEffect, useMemo, useState } from "react";
import EntryThumb, { resolveEntryImageUrl } from "../components/EntryThumb.jsx";

// Cycles a card's background art through every eligible entry in `pool` so a
// box with no single "winner" (Perfect Coverage Club, Total Charted X) still
// always shows a photo instead of sitting empty.
function useRotatingArt(pool, intervalMs = 4500) {
  const candidates = useMemo(() => {
    return (pool || [])
      .map((entry) => {
        const name = entry.artist || entry.title || entry.n || "";
        const url = resolveEntryImageUrl(entry, { name, isArtist: Boolean(entry.is_artist_entry || entry.type === "artist") });
        return url ? { entry, name, url } : null;
      })
      .filter(Boolean);
  }, [pool]);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [candidates.length]);

  useEffect(() => {
    if (candidates.length < 2) return undefined;
    const id = setInterval(() => {
      setIndex((current) => (current + 1) % candidates.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [candidates.length, intervalMs]);

  return candidates.length ? candidates[index % candidates.length] : null;
}

function RecordCard({ r, expanded, onToggle, pool, ctx, theme }) {
  const {
    CertificationTag, F, GOLD, RecordIcon, SF,
    fullCoverageClub, getCertificationForEntry, isArtists, isMobile, isSingles,
    openArtistDetails, openReleaseDetails, releaseLabelLower,
  } = ctx;
  const { isDark, textPrimary, textMuted, cardBg, dividerColor, rowBorder, recordCard } = theme;

  const recordCertification = !isArtists && r.certificationEntry ? getCertificationForEntry(r.certificationEntry, isSingles ? "single" : "album") : null;
  const artEntryName = r.certificationEntry ? (r.certificationEntry.artist || r.certificationEntry.title) : "";
  const staticArtUrl = r.certificationEntry
    ? resolveEntryImageUrl(r.certificationEntry, { name: artEntryName, isArtist: Boolean(r.certificationEntry.is_artist_entry) })
    : "";
  const rotating = useRotatingArt(pool);
  const artUrl = staticArtUrl || rotating?.url || "";
  const hasArt = Boolean(artUrl);

  const valueNode = r.certificationEntry ? (
    <button
      type="button"
      onClick={(event) => { event.stopPropagation(); isArtists ? openArtistDetails(r.value) : openReleaseDetails(r.certificationEntry, isSingles ? "single" : "album"); }}
      style={{ display: "block", border: 0, background: "transparent", padding: 0, fontFamily: SF, fontSize: isMobile ? "20px" : "21px", fontWeight: 900, lineHeight: 1.12, marginBottom: recordCertification ? "7px" : "5px", cursor: "pointer", textAlign: "left", color: hasArt ? "#FFFFFF" : textPrimary, textShadow: hasArt ? "0 1px 8px rgba(0,0,0,0.55)" : "none" }}
    >{r.value}</button>
  ) : (
    <div style={{ fontFamily: SF, fontSize: isMobile ? "20px" : "21px", fontWeight: 900, lineHeight: 1.12, marginBottom: "5px", color: hasArt ? "#FFFFFF" : textPrimary, textShadow: hasArt ? "0 1px 8px rgba(0,0,0,0.55)" : "none" }}>{r.value}</div>
  );

  return (
    <div
      className="ngoma-record-card"
      onClick={onToggle}
      style={{
        ...recordCard({ padding: 0, borderRadius: "16px" }),
        position: "relative",
        overflow: "hidden",
        cursor: r.isCoverage ? "pointer" : "default",
        gridColumn: expanded ? "1 / -1" : "auto",
        minHeight: hasArt ? (isMobile ? "216px" : "248px") : "auto",
      }}
    >
      {hasArt ? (
        <>
          <img
            key={rotating?.entry ? (rotating.entry.key || rotating.name) : "static"}
            className="ngoma-record-art"
            src={artUrl}
            alt=""
            loading="lazy"
            decoding="async"
            onError={(event) => { event.currentTarget.style.display = "none"; }}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
          <div
            style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(0deg, rgba(6,7,6,0.94) 0%, rgba(6,7,6,0.82) 32%, rgba(6,7,6,0.38) 58%, rgba(6,7,6,0.08) 78%, rgba(6,7,6,0.28) 100%)",
            }}
          />
          <div style={{ position: "relative", zIndex: 1, padding: isMobile ? "19px" : "24px", display: "flex", flexDirection: "column", height: "100%", boxSizing: "border-box", justifyContent: "space-between" }}>
            <span style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: isMobile ? "30px" : "32px", height: isMobile ? "30px" : "32px", borderRadius: "10px",
              background: "rgba(6,7,6,0.55)", backdropFilter: "blur(6px)", flexShrink: 0, alignSelf: "flex-start",
            }}>
              <RecordIcon label={r.displayLabel} size={isMobile ? 17 : 18} />
            </span>

            <div>
              <div style={{ fontFamily: F, fontSize: isMobile ? "10px" : "10.5px", fontWeight: 850, letterSpacing: "2px", textTransform: "uppercase", color: GOLD, marginBottom: "9px", lineHeight: 1.35, textShadow: "0 1px 6px rgba(0,0,0,0.6)" }}>{r.displayLabel}</div>
              {valueNode}
              {recordCertification && <CertificationTag cert={recordCertification} compact style={{ marginBottom: "8px" }} />}
              <div style={{ fontFamily: F, fontSize: "13px", color: "rgba(255,255,255,0.82)", lineHeight: 1.45, display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", textShadow: "0 1px 6px rgba(0,0,0,0.55)" }}>
                <span>{r.displaySub}</span>
                {r.climbDelta && <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 7px", borderRadius: "999px", background: "rgba(45,176,74,0.35)", color: "#8CF0A6", fontSize: "10px", fontWeight: 900, letterSpacing: "0.4px" }}>+{r.climbDelta}</span>}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div style={{ position: "relative", zIndex: 1, padding: isMobile ? "19px" : "24px", boxSizing: "border-box" }}>
          <div style={{ position: "absolute", top: isMobile ? "8px" : "12px", right: isMobile ? "10px" : "14px" }}><RecordIcon label={r.displayLabel} size={isMobile ? 54 : 66} muted /></div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "13px", position: "relative", zIndex: 1 }}>
            <RecordIcon label={r.displayLabel} size={isMobile ? 28 : 30} />
          </div>
          <div style={{ fontFamily: F, fontSize: isMobile ? "10px" : "10.5px", fontWeight: 850, letterSpacing: "2px", textTransform: "uppercase", color: GOLD, marginBottom: "9px", position: "relative", zIndex: 1, lineHeight: 1.35 }}>{r.displayLabel}</div>
          {valueNode}
          <div style={{ fontFamily: F, fontSize: "13px", color: textMuted, lineHeight: 1.45, position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span>{r.displaySub}</span>
            {r.climbDelta && <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 7px", borderRadius: "999px", background: isDark ? "rgba(45,176,74,0.16)" : "#EAF8EF", color: isDark ? "#4FCB6F" : "#1E8E3E", fontSize: "10px", fontWeight: 900, letterSpacing: "0.4px" }}>+{r.climbDelta}</span>}
          </div>
        </div>
      )}

      {r.isCoverage && (
        <div className="ngoma-record-view-toggle" style={{ display: "flex", alignItems: "center", gap: "5px", fontFamily: F, fontSize: "10.5px", color: GOLD, fontWeight: 800, letterSpacing: "0.5px", padding: hasArt ? "0" : `0 ${isMobile ? "19px" : "24px"} ${isMobile ? "19px" : "24px"}`, margin: hasArt ? `0 ${isMobile ? "19px" : "24px"} ${isMobile ? "19px" : "24px"} ${isMobile ? "19px" : "24px"}` : "0", position: "relative", zIndex: 1 }}>
          <span>{expanded ? `Hide ${releaseLabelLower}` : `View ${releaseLabelLower}`}</span>
          <span style={{ fontSize: "11px", transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.22s ease", display: "inline-block" }}>▾</span>
        </div>
      )}

      {expanded && (
        <div style={{ position: "relative", zIndex: 1, margin: isMobile ? "0 19px 19px" : "0 24px 24px", paddingTop: "12px", borderTop: `1px solid ${dividerColor}`, background: cardBg, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))", columnGap: "22px" }}>
          {fullCoverageClub.length ? fullCoverageClub.map((song, idx) => {
            const certification = getCertificationForEntry(song, isSingles ? "single" : "album");
            return (
              <div key={`${song.title}-${song.artist}`} className="ngoma-coverage-row" style={{ display: "grid", gridTemplateColumns: "22px 42px minmax(0,1fr)", gap: "8px", alignItems: "center", padding: "8px 6px", fontFamily: F, borderBottom: `1px solid ${rowBorder}` }}>
                <span style={{ fontSize: "10px", fontWeight: 900, color: GOLD }}>#{idx + 1}</span>
                <EntryThumb item={song} name={song.artist} size={42} accent={GOLD} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                    <button type="button" onClick={(event) => { event.stopPropagation(); isArtists ? openArtistDetails(song.title) : openReleaseDetails(song, isSingles ? "single" : "album"); }} style={{ border: 0, background: "transparent", padding: 0, fontFamily: SF, fontSize: "12px", fontWeight: 850, color: textPrimary, cursor: "pointer", textAlign: "left" }}>{song.title}</button>
                    {certification && <CertificationTag cert={certification} compact />}
                  </span>
                  <span style={{ display: "block", fontSize: "11px", color: textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{song.artist} · {song.month}</span>
                </span>
              </div>
            );
          }) : <div style={{ fontFamily: F, fontSize: "12px", color: textMuted }}>No full-coverage entries found for this view.</div>}
        </div>
      )}
    </div>
  );
}

export default function RecordsPage({ ctx }) {
  const {
    F,
    GOLD,
    PAD,
    TXT,
    Tog,
    card,
    chartTypeLabel,
    currentRecords,
    currentRecordsPool,
    fullCoverageClub,
    isDark,
    isMobile,
    isTablet,
    openRecord,
    setOpenRecord,
  } = ctx;

  const recordGridColumns = isMobile ? "1fr" : isTablet ? "repeat(2,1fr)" : "repeat(3,1fr)";

  const cardBg = isDark ? "#141814" : "#FFFFFF";
  const cardBorder = isDark ? "#242923" : "#EFEDE7";
  const cardShadow = isDark ? "0 8px 24px rgba(0,0,0,0.32)" : "0 1px 3px rgba(0,0,0,0.02),0 8px 24px rgba(0,0,0,0.02)";
  const textPrimary = isDark ? "#F6F3EA" : "#1A1A1A";
  const textMuted = isDark ? "#8F968F" : "#59645D";
  const dividerColor = isDark ? "#242923" : "#F0EEE8";
  const rowBorder = isDark ? "#1E231E" : "#F2F0EA";

  const recordCard = (extra = {}) => card({
    background: cardBg,
    border: `1px solid ${cardBorder}`,
    boxShadow: cardShadow,
    ...extra,
  });

  const theme = { isDark, isMobile, textPrimary, textMuted, cardBg, cardBorder, cardShadow, dividerColor, rowBorder, recordCard };

  return (
<div style={{padding:PAD,minHeight:"60vh",boxSizing:"border-box",overflow:"hidden"}}>
      <style>{`
        .ngoma-record-card { transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease; }
        .ngoma-record-card:hover { transform: translateY(-4px); border-color: ${GOLD}55 !important; }
        .ngoma-record-card:hover .ngoma-record-art { transform: scale(1.05); }
        .ngoma-record-art { transition: transform 0.5s ease, opacity 0.5s ease; animation: ngoma-record-art-fade 0.6s ease; }
        @keyframes ngoma-record-art-fade { from { opacity: 0; } to { opacity: 1; } }
        .ngoma-record-view-toggle { transition: gap 0.18s ease, color 0.18s ease; }
        .ngoma-record-card:hover .ngoma-record-view-toggle { gap: 8px; }
        .ngoma-coverage-row { transition: background 0.16s ease; border-radius: 8px; }
        .ngoma-coverage-row:hover { background: ${isDark ? "rgba(184,134,11,0.08)" : "rgba(184,134,11,0.05)"}; }
      `}</style>

          <div style={{marginBottom:isMobile?"18px":"22px"}}>
            <div style={{maxWidth:isMobile?"100%":"620px"}}>
              <div style={{fontFamily:F,fontSize:TXT.kicker,letterSpacing:"2.6px",textTransform:"uppercase",color:GOLD,marginBottom:"6px"}}>THE RECORD BOOK</div>
              <h2 style={{fontSize:TXT.pageTitle,fontWeight:800,margin:0,color:textPrimary}}>Records & Milestones</h2>
              <p style={{fontFamily:F,fontSize:TXT.lead,color:textMuted,margin:"4px 0 0",lineHeight:1.55}}>{chartTypeLabel} achievements calculated solely from published public Top 50 charts across all tracked months</p>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:isMobile?"10px":"12px",marginTop:isMobile?"14px":"16px",flexWrap:"wrap"}}>
              <Tog sm/>
            </div>
          </div>
          <div className="anl-grid-3" style={{display:"grid",gridTemplateColumns:recordGridColumns,gap:isMobile?"14px":"16px"}}>
            {currentRecords.map((r,i)=>{
              const expanded = r.isCoverage && openRecord === i;
              const pool = r.isCoverage ? fullCoverageClub : r.isTotalCount ? currentRecordsPool : [];
              return (
                <RecordCard
                  key={`${r.displayLabel}-${r.value}`}
                  r={r}
                  expanded={expanded}
                  onToggle={()=>{if(r.isCoverage)setOpenRecord(expanded?null:i);}}
                  pool={pool}
                  ctx={ctx}
                  theme={theme}
                />
              );
            })}
          </div>
        </div>
  );
}
