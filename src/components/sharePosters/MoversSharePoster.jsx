import { useMemo } from "react";
import { runtimePublicData } from "../../utils/publicDataRuntime.js";
import { buildMovementLists } from "../../utils/publicChartMirror.js";
import { resolveMediaUrl } from "../../api/config.js";
import {
  POSTER_W,
  POSTER_H,
  POSTER_FONT_FAMILY,
  TITLE_GAP_FROM_LOGO,
  PosterBrandRow,
  PosterFooter,
  ArtPlaceholder,
  usePosterTheme,
} from "../../admin/utils/exportPoster.jsx";

// Same design as the CMS's Movers & Shakers Poster (admin/pages/MoversPosterPage.jsx),
// fed from the public Analytics page's Climbers/Drops/New Entries panels.
const CHART_TYPES = [
  ["singles", "Singles"],
  ["albums", "Albums"],
  ["artists", "Artists"],
];

// Third element is the poster's header title template ({typeLabel} is
// substituted in) — matches the Analytics page's own section headings
// ("Biggest {type} Climbers" / "Biggest {type} Drops") so a shared poster
// reads exactly the same way the page introduced it.
const MOVES = [
  ["risers", "Climbers", "Biggest {typeLabel} Climbers", "#2DB04A"],
  ["fallers", "Drops", "Biggest {typeLabel} Drops", "#E5484D"],
  ["newEntries", "New Entries", "New Entries — {typeLabel}", "#2DB04A"],
  ["reEntries", "Re-Entries", "Re-Entries — {typeLabel}", "#1565C0"],
];

function rowTitle(chartType, row) {
  return chartType === "artists" ? (row.name || "") : (row.t || row.title || "");
}
function rowArtist(chartType, row) {
  return chartType === "artists" ? "" : (row.artist_credit || row.a || row.artist || "");
}
function rowImage(chartType, row) {
  return chartType === "artists" ? (row.image || "") : (row.cover_image || "");
}
function rowBadge(move, row) {
  if (move === "newEntries") return "NEW";
  if (move === "reEntries") return "RE";
  if (move === "risers") return `▲ ${row.delta}`;
  return `▼ ${row.delta}`;
}
function rowRank(chartType, row) {
  return chartType === "artists" ? row.rank : (row.r ?? row.rank ?? row.to);
}

export default function MoversSharePoster({ chartType = "singles", move = "risers", month = "", theme = "dark" }) {
  const t = usePosterTheme(theme);
  const payload = useMemo(() => runtimePublicData(), []);
  const rows = useMemo(() => {
    if (!month) return [];
    const lists = buildMovementLists(payload, chartType, month);
    return lists[move] || [];
  }, [payload, chartType, move, month]);

  const padX = 56;
  const [, , titleTemplate, accentColor] = MOVES.find(([value]) => value === move) || MOVES[0];
  const typeLabel = CHART_TYPES.find(([value]) => value === chartType)?.[1] || "Chart";
  const headerTitle = titleTemplate.replace("{typeLabel}", typeLabel);
  // Same list proportions as the Top-N chart poster (ChartListSharePoster) —
  // same header offset, row gap, and scale curve — so Climbers/Drops/New
  // Entries read as the same family of poster instead of a cramped variant.
  const n = Math.max(rows.length, 1);
  const listTop = 365;
  const footerH = 74;
  const listH = POSTER_H - listTop - footerH;
  const gap = 18;
  // One `gap` is budgeted per row (n gaps total, not n-1) and split as
  // gap/2 padding above and below each row's content — same symmetric
  // approach as ChartListSharePoster, so every row (including the first
  // and last) comes out the same height instead of the ends reading
  // shorter than the middle rows.
  const rowH = (listH - gap * n) / n;
  const rowPadY = gap / 2;
  const slotH = rowH + gap;
  const scale = Math.min(1.55, Math.max(0.7, rowH / 96));
  const artSize = Math.round(Math.min(88, Math.max(40, rowH - 18)));

  return (
    <div
      style={{
        width: POSTER_W, height: POSTER_H, boxSizing: "border-box",
        background: t.pageBg, fontFamily: POSTER_FONT_FAMILY, color: t.titleColor,
        position: "relative", overflow: "hidden",
      }}
    >
      <div style={{ padding: `56px ${padX}px 0`, position: "relative", zIndex: 1 }}>
        <PosterBrandRow theme={theme} />
      </div>

      <div style={{ padding: `${TITLE_GAP_FROM_LOGO}px ${padX}px 0`, position: "relative", zIndex: 1, textAlign: "center" }}>
        <div style={{ fontSize: headerTitle.length > 22 ? 40 : 48, fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.5px", color: t.titleColor, textTransform: "uppercase" }}>
          {headerTitle}
        </div>
        <div style={{ marginTop: 10, fontSize: 20, fontWeight: 700, color: accentColor, textTransform: "uppercase", letterSpacing: "0.6px" }}>
          {month}
        </div>
      </div>

      <div style={{ position: "absolute", top: listTop, left: padX, right: padX, bottom: footerH, zIndex: 1, borderTop: rows.length ? `1px solid ${t.dividerColor}` : "none" }}>
        {rows.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: t.emptyColor, fontSize: 22, fontWeight: 700, textAlign: "center" }}>
            No qualifying entries for this selection
          </div>
        ) : (
          rows.map((row, i) => (
            <div
              key={`${rowTitle(chartType, row)}-${i}`}
              style={{
                height: slotH,
                boxSizing: "border-box", display: "flex", alignItems: "center",
                gap: Math.round(28 * scale),
                paddingTop: rowPadY,
                paddingBottom: rowPadY,
                borderBottom: i === rows.length - 1 ? "none" : `1px solid ${t.dividerColor}`,
              }}
            >
              <span style={{ width: Math.round(56 * scale), flexShrink: 0, fontSize: Math.round(30 * scale), fontWeight: 900, color: rowRank(chartType, row) <= 3 ? "#C97A12" : t.metaColor }}>
                #{rowRank(chartType, row)}
              </span>
              {rowImage(chartType, row) ? (
                <img
                  src={resolveMediaUrl(rowImage(chartType, row))}
                  alt=""
                  style={{
                    width: artSize, height: artSize,
                    borderRadius: chartType === "artists" ? artSize / 2 : 10,
                    objectFit: "cover", flexShrink: 0, background: t.rowBg,
                  }}
                />
              ) : (
                <ArtPlaceholder width={artSize} height={artSize} radius={chartType === "artists" ? artSize / 2 : 10} theme={theme} accentColor={accentColor} />
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: Math.round(26 * scale), fontWeight: 800, color: t.titleColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {rowTitle(chartType, row)}
                </div>
                {rowArtist(chartType, row) && (
                  <div style={{ fontSize: Math.round(17 * scale), fontWeight: 600, color: t.metaColor, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {rowArtist(chartType, row)}
                  </div>
                )}
              </div>
              <div
                style={{
                  flexShrink: 0, marginRight: Math.round(38 * Math.min(scale, 1.2)), whiteSpace: "nowrap", textAlign: "center",
                  padding: `${Math.round(6 * scale)}px ${Math.round(14 * scale)}px`, borderRadius: 999,
                  background: `${accentColor}22`, color: accentColor, fontWeight: 900, fontSize: Math.round(18 * scale),
                }}
              >
                {rowBadge(move, row)}
              </div>
            </div>
          ))
        )}
      </div>

      <PosterFooter theme={theme} padX={padX} />
    </div>
  );
}
