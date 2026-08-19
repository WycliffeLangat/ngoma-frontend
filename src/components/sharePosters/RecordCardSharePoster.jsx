import {
  POSTER_W,
  POSTER_H,
  POSTER_FONT_FAMILY,
  HEADER_ZONE_H,
  PosterBrandRow,
  PosterFooter,
  ArtPlaceholder,
  usePosterTheme,
} from "../../admin/utils/exportPoster.jsx";

// Same design as the CMS's Analytics Record Cards (admin/pages/AnalyticsRecordPage.jsx),
// fed directly from a single already-resolved public Records & Milestones row
// instead of recomputing the record from scratch — the public Analytics page
// already knows the leader, detail text, and thumbnail for every record type
// it shows (including ones with no fixed CMS record-type key, like rotating
// "Total Charted Songs"), so this just renders whatever it's handed.
export default function RecordCardSharePoster({
  title,
  subtitle,
  image,
  isArtist = false,
  recordLabel,
  accentColor = "#C97A12",
  statLabel,
  statValue,
  countryLabel = "Kenya",
  theme = "dark",
}) {
  const t = usePosterTheme(theme);
  const padX = 64;
  const artSize = 560;
  const headerH = HEADER_ZONE_H;
  const footerH = 74;
  const headerText = `${recordLabel} · ${countryLabel}`;
  // Some records carry a short, dramatic figure ("+12", "1,500") fit for a
  // huge hero number; others carry a full descriptive sentence ("Test Artist
  // · 1,500 pts"), which would overflow/wrap badly at that size — those get
  // a smaller, wrapping treatment instead with no separate caption line.
  const isShortStat = String(statValue ?? "").length <= 14;

  return (
    <div
      style={{
        width: POSTER_W,
        height: POSTER_H,
        boxSizing: "border-box",
        background: t.pageBg,
        fontFamily: POSTER_FONT_FAMILY,
        color: t.titleColor,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: `72px ${padX}px 0`, position: "relative", zIndex: 1 }}>
        <PosterBrandRow theme={theme} />
      </div>

      <div
        style={{
          position: "absolute",
          top: headerH,
          bottom: footerH,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "center",
          padding: `8px ${padX}px`,
          zIndex: 1,
        }}
      >
        <div
          style={{
            fontSize: headerText.length > 22 ? 44 : headerText.length > 14 ? 52 : 60,
            fontWeight: 900,
            lineHeight: 1.12,
            letterSpacing: "-0.5px",
            color: accentColor,
            textAlign: "center",
            textTransform: "uppercase",
          }}
        >
          {headerText}
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          {image ? (
            <img
              src={image}
              alt=""
              style={{ width: artSize, height: artSize, borderRadius: isArtist ? artSize / 2 : 26, objectFit: "cover", boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}
            />
          ) : (
            <div style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.4)", borderRadius: isArtist ? artSize / 2 : 26 }}>
              <ArtPlaceholder
                width={artSize}
                height={artSize}
                radius={isArtist ? artSize / 2 : 26}
                theme={theme}
                accentColor={accentColor}
                markSize={140}
              />
            </div>
          )}

          <div
            style={{
              marginTop: 30,
              fontSize: title.length > 22 ? 44 : title.length > 14 ? 52 : 60,
              fontWeight: 900,
              lineHeight: 1.12,
              letterSpacing: "-0.5px",
              color: t.titleColor,
              textAlign: "center",
              textTransform: "uppercase",
              maxWidth: 960,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div style={{ marginTop: 12, fontSize: 30, fontWeight: 700, color: t.metaColor, textAlign: "center" }}>
              {subtitle}
            </div>
          )}
        </div>

        <div style={{ width: "100%" }}>
          <div style={{ borderTop: `2px solid ${t.dividerColor}`, marginBottom: 26 }} />
          {isShortStat ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 92, fontWeight: 900, color: accentColor, letterSpacing: "-1px" }}>{statValue}</div>
              {statLabel && (
                <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", color: t.metaColor, marginTop: 4 }}>
                  {statLabel}
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                fontSize: 36,
                fontWeight: 800,
                color: accentColor,
                textAlign: "center",
                lineHeight: 1.3,
                maxWidth: 880,
                margin: "0 auto",
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {statValue}
            </div>
          )}
        </div>
      </div>

      <PosterFooter theme={theme} padX={padX} />
    </div>
  );
}
