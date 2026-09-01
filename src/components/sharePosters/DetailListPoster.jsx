import {
  POSTER_W,
  POSTER_H,
  POSTER_FONT_FAMILY,
  PosterFooter,
  usePosterTheme,
} from "../../admin/utils/exportPoster.jsx";
import DetailPosterHeader, { detailHeaderHeight, DETAIL_FOOTER_H } from "./DetailPosterHeader.jsx";

// Deep-dive companion to SharePosterCard — a small label/value or column
// table rendered at the same 4:5 poster size. The compact share card only
// has room for a handful of stat tiles; this carries the rest of what's on
// the Artist/Release detail page (full info table, full chart-history
// journey) as one or more paginated poster images for the "Download Full
// Profile" option. `columns` is optional (omit or set `hideColumnHeader`
// for a plain two-column label/value list); `rows` is an array of string
// arrays aligned to columns. `image` (artist photo / cover art) is optional
// but shown on every page when supplied, not just the compact share card,
// so each downloaded file reads as belonging to the same subject on its own.
const FOOTER_H = DETAIL_FOOTER_H;
const MAX_ROW_H = 150;

export default function DetailListPoster({
  title = "",
  subtitle = "",
  sectionLabel = "",
  image = "",
  columns = [],
  hideColumnHeader = false,
  rows = [],
  accentColor = "#C97A12",
  theme = "dark",
}) {
  const t = usePosterTheme(theme);
  const padX = 60;
  const headerH = detailHeaderHeight(Boolean(image));
  const listH = POSTER_H - headerH - FOOTER_H;
  const n = Math.max(rows.length, 1);
  const gap = 10;
  const showColumnHeader = columns.length > 0 && !hideColumnHeader;
  const columnHeaderH = showColumnHeader ? 66 : 0;
  const rowAreaH = listH - columnHeaderH;
  // Never clamped upward past what rowAreaH actually holds — only capped
  // from growing too tall when a page has just a few rows. This keeps the
  // list an exact fit within the fixed poster canvas (no scrolling exists
  // to rescue an overflow) instead of forcing a minimum that could push
  // content past the footer on a fuller page.
  const rowH = Math.min(MAX_ROW_H, (rowAreaH - gap * n) / n);
  const stripeColor = theme === "light" ? "rgba(0,0,0,0.028)" : "rgba(255,255,255,0.035)";

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
      <DetailPosterHeader title={title} subtitle={subtitle} sectionLabel={sectionLabel} image={image} accentColor={accentColor} theme={theme} />

      <div style={{ position: "absolute", top: headerH, left: padX, right: padX, zIndex: 1 }}>
        {showColumnHeader && (
          <div style={{ height: columnHeaderH, display: "flex", alignItems: "center", gap: 16, padding: "0 18px", borderBottom: `2px solid ${t.dividerColor}` }}>
            {columns.map((col, i) => (
              <span
                key={col.label || i}
                style={{ flex: col.width ? `0 0 ${col.width}` : 1, fontSize: 15, fontWeight: 900, letterSpacing: "0.6px", textTransform: "uppercase", color: t.metaColor, textAlign: col.align || "left" }}
              >
                {col.label}
              </span>
            ))}
          </div>
        )}
        {rows.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.emptyColor, fontSize: 20, fontWeight: 700 }}>
            No data available
          </div>
        ) : (
          <div style={{ borderTop: showColumnHeader ? "none" : `2px solid ${t.dividerColor}` }}>
            {rows.map((cells, rowIndex) => (
              <div
                key={rowIndex}
                style={{
                  minHeight: rowH,
                  boxSizing: "border-box",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: `${gap}px 18px`,
                  background: rowIndex % 2 === 1 ? stripeColor : "transparent",
                  borderBottom: rowIndex === rows.length - 1 ? "none" : `1px solid ${t.dividerColor}`,
                }}
              >
                {cells.map((cell, cellIndex) => {
                  const col = columns[cellIndex] || {};
                  return (
                    <span
                      key={cellIndex}
                      style={{
                        flex: col.width ? `0 0 ${col.width}` : 1,
                        fontSize: cellIndex === 0 ? 21 : 20,
                        fontWeight: cellIndex === 0 ? 800 : 650,
                        color: cellIndex === 0 ? t.titleColor : t.metaColor,
                        textAlign: col.align || "left",
                        display: "-webkit-box",
                        WebkitLineClamp: col.lines || 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        wordBreak: "break-word",
                      }}
                    >
                      {cell}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      <PosterFooter theme={theme} height={FOOTER_H} padX={padX} />
    </div>
  );
}

// Splits a flat row list into fixed-size pages so each DetailListPoster
// image stays legible instead of squeezing an unbounded row count into one
// fixed-height poster.
export function chunkPosterRows(rows, size) {
  const chunkSize = Math.max(1, Number(size) || 12);
  const chunks = [];
  for (let i = 0; i < rows.length; i += chunkSize) {
    chunks.push(rows.slice(i, i + chunkSize));
  }
  return chunks;
}

export function posterFileSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "ngoma";
}
