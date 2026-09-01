import {
  POSTER_FONT_FAMILY,
  TITLE_GAP_FROM_LOGO,
  PosterBrandRow,
  usePosterTheme,
} from "../../admin/utils/exportPoster.jsx";

// Shared header block for DetailListPoster/DetailChartPoster — brand row,
// then a small artist/cover thumbnail (when available) above the stacked
// title -> subtitle -> section badge. Kept as one component so both poster
// types stay pixel-identical and HEADER_H below is the single source of
// truth both use to lay out the content that follows it.
const IMAGE_SIZE = 116;
export const DETAIL_HEADER_H_WITH_IMAGE = 610;
export const DETAIL_HEADER_H_NO_IMAGE = 460;
export const DETAIL_FOOTER_H = 74;

export function detailHeaderHeight(hasImage) {
  return hasImage ? DETAIL_HEADER_H_WITH_IMAGE : DETAIL_HEADER_H_NO_IMAGE;
}

export default function DetailPosterHeader({ title = "", subtitle = "", sectionLabel = "", image = "", accentColor = "#C97A12", theme = "dark" }) {
  const t = usePosterTheme(theme);
  const padX = 60;

  return (
    <>
      <div style={{ padding: `56px ${padX}px 0`, position: "relative", zIndex: 1 }}>
        <PosterBrandRow theme={theme} />
      </div>

      <div style={{ padding: `${TITLE_GAP_FROM_LOGO}px ${padX}px 0`, position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        {image && (
          <img
            src={image}
            alt=""
            style={{
              width: IMAGE_SIZE,
              height: IMAGE_SIZE,
              borderRadius: 26,
              objectFit: "cover",
              marginBottom: 20,
              boxShadow: "0 14px 30px rgba(0,0,0,0.28)",
            }}
          />
        )}
        <div
          style={{
            fontSize: title.length > 26 ? 44 : title.length > 18 ? 50 : 58,
            fontWeight: 900,
            lineHeight: 1.1,
            letterSpacing: "-0.5px",
            color: t.titleColor,
            fontFamily: POSTER_FONT_FAMILY,
            textTransform: "uppercase",
            maxWidth: 900,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              marginTop: 14,
              fontSize: 23,
              fontWeight: 700,
              fontFamily: POSTER_FONT_FAMILY,
              color: t.metaColor,
              maxWidth: 860,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {subtitle}
          </div>
        )}
        {sectionLabel && (
          <div
            style={{
              marginTop: 20,
              padding: "9px 22px",
              borderRadius: 999,
              background: `${accentColor}1F`,
              color: accentColor,
              fontSize: 17,
              fontWeight: 900,
              fontFamily: POSTER_FONT_FAMILY,
              letterSpacing: "0.7px",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            {sectionLabel}
          </div>
        )}
      </div>
    </>
  );
}
