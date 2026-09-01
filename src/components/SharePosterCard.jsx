import {
  POSTER_W,
  POSTER_H,
  POSTER_FONT_FAMILY,
  POSTER_THEMES,
  PosterBrandRow,
  PosterFooter,
  ArtPlaceholder,
} from "../admin/utils/exportPoster.jsx";

// Fixed, non-editable 4:5 share card for a reader-facing song/album or
// artist — same visual kit the CMS poster generators use, but with no
// settings panel: readers only ever get the one finished layout to
// download and share as-is.
export default function SharePosterCard({ image, title = "", subtitle = "", stats = [], accentColor = "#C97A12", theme = "dark" }) {
  const t = POSTER_THEMES[theme] || POSTER_THEMES.dark;
  const visibleStats = stats.filter((stat) =>
    stat?.label &&
    stat.value !== null &&
    stat.value !== undefined &&
    stat.value !== ""
  );
  const statCount = visibleStats.length;
  const compactStats = statCount > 3;
  const statColumns = statCount ? Math.min(compactStats ? 3 : statCount, 3) : 1;
  const statRows = statCount ? Math.ceil(statCount / statColumns) : 0;
  const statTileMinH = compactStats ? 104 : 112;
  const statGap = compactStats ? 12 : 14;
  const statsBottom = compactStats ? 138 : 150;
  const statsPanelHeight = statCount
    ? 30 + (statRows * statTileMinH) + (Math.max(0, statRows - 1) * statGap)
    : 0;
  const contentBottom = statCount ? statsBottom + statsPanelHeight + 34 : 150;
  const artSize = compactStats ? 420 : 480;
  const titleFontSize = title.length > 22 ? (compactStats ? 42 : 46) : (compactStats ? 50 : 56);

  return (
    <div
      style={{
        width: POSTER_W,
        height: POSTER_H,
        position: "relative",
        overflow: "hidden",
        background: t.pageBg,
        fontFamily: POSTER_FONT_FAMILY,
      }}
    >
      <div style={{ padding: "72px 64px 0", position: "relative", zIndex: 1 }}>
        <PosterBrandRow theme={theme} />
      </div>

      <div
        style={{
          position: "absolute",
          top: 256,
          bottom: contentBottom,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 64px",
          zIndex: 1,
        }}
      >
        {image ? (
          <img
            src={image}
            alt=""
            style={{ width: artSize, height: artSize, borderRadius: 32, objectFit: "cover", boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}
          />
        ) : (
          <div style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.4)", borderRadius: 32 }}>
            <ArtPlaceholder width={artSize} height={artSize} radius={32} theme={theme} accentColor={accentColor} markSize={148} />
          </div>
        )}
        <div
          style={{
            marginTop: 44,
            fontSize: titleFontSize,
            fontWeight: 900,
            lineHeight: 1.14,
            letterSpacing: "-0.5px",
            color: t.titleColor,
            textAlign: "center",
            textTransform: "uppercase",
            maxWidth: 900,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              marginTop: 14,
              fontSize: compactStats ? 24 : 28,
              fontWeight: 700,
              lineHeight: 1.25,
              color: t.metaColor,
              textAlign: "center",
              maxWidth: 880,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {subtitle}
          </div>
        )}
      </div>

      {statCount > 0 && (
        <div style={{ position: "absolute", bottom: statsBottom, left: 0, right: 0, padding: "0 64px", zIndex: 1 }}>
          <div style={{ borderTop: `2px solid ${t.dividerColor}`, marginBottom: 28 }} />
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${statColumns}, 1fr)`, gap: statGap }}>
            {visibleStats.map((stat) => (
              <div
                key={stat.label}
                style={{
                  minHeight: statTileMinH,
                  background: t.rowBg,
                  borderRadius: 16,
                  padding: compactStats ? "16px 8px" : "22px 8px",
                  textAlign: "center",
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div style={{ fontSize: compactStats ? 30 : 32, fontWeight: 900, color: t.titleColor }}>{stat.value}</div>
                <div style={{ fontSize: compactStats ? 12 : 13, fontWeight: 800, letterSpacing: "0.6px", textTransform: "uppercase", color: t.metaColor, marginTop: 8 }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <PosterFooter theme={theme} padX={64} />
    </div>
  );
}
