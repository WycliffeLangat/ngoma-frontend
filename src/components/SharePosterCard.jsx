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
export default function SharePosterCard({ image, title = "", subtitle = "", stats = [], accentColor = "#C97A12" }) {
  const t = POSTER_THEMES.dark;
  const artSize = 480;

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
        <PosterBrandRow theme="dark" />
      </div>

      <div
        style={{
          position: "absolute",
          top: 256,
          bottom: stats.length ? 280 : 150,
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
            <ArtPlaceholder width={artSize} height={artSize} radius={32} theme="dark" accentColor={accentColor} markSize={148} />
          </div>
        )}
        <div
          style={{
            marginTop: 44,
            fontSize: title.length > 22 ? 46 : 56,
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
          <div style={{ marginTop: 14, fontSize: 28, fontWeight: 700, color: t.metaColor, textAlign: "center" }}>
            {subtitle}
          </div>
        )}
      </div>

      {stats.length > 0 && (
        <div style={{ position: "absolute", bottom: 150, left: 0, right: 0, padding: "0 64px", zIndex: 1 }}>
          <div style={{ borderTop: `2px solid ${t.dividerColor}`, marginBottom: 28 }} />
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${stats.length}, 1fr)`, gap: 14 }}>
            {stats.map((stat) => (
              <div key={stat.label} style={{ background: t.rowBg, borderRadius: 16, padding: "22px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 32, fontWeight: 900, color: t.titleColor }}>{stat.value}</div>
                <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.6px", textTransform: "uppercase", color: t.metaColor, marginTop: 8 }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <PosterFooter theme="dark" padX={64} />
    </div>
  );
}
