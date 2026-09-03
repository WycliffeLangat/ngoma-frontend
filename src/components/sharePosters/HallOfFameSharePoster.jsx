import { useMemo } from "react";
import { runtimePublicData } from "../../utils/publicDataRuntime.js";
import { buildHallOfFameItems } from "../../utils/publicChartMirror.js";
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

// Same "Monthly #1s" grid design as the CMS's Hall of Fame Poster tool
// (admin/pages/HallOfFamePosterPage.jsx) — this is what backs the public
// Analytics page's Records & Milestones / Hall of Fame section.
const CHART_TYPES = [
  ["singles", "Singles"],
  ["albums", "Albums"],
  ["artists", "Artists"],
];

const GOLD = "#C97A12";

function itemTitle(chartType, item) {
  return chartType === "artists" ? (item.name || "") : (item.t || item.title || "");
}
function itemArtist(chartType, item) {
  return chartType === "artists" ? "" : (item.artist_credit || item.a || item.artist || "");
}
function itemImage(chartType, item) {
  return chartType === "artists" ? (item.image || "") : (item.cover_image || "");
}

export default function HallOfFameSharePoster({ chartType = "singles", theme = "dark" }) {
  const t = usePosterTheme(theme);
  const payload = useMemo(() => runtimePublicData(), []);
  const items = useMemo(() => buildHallOfFameItems(payload, chartType), [payload, chartType]);

  const padX = 56;
  const typeLabel = CHART_TYPES.find(([value]) => value === chartType)?.[1] || "Chart";
  const headerTitle = `Hall of Fame — ${typeLabel}`;
  const cols = 2;
  const gridTop = 340;
  const footerH = 74;
  const gridH = POSTER_H - gridTop - footerH;
  const gap = 18;
  const shown = Math.min(items.length, cols * 4);
  const rows = Math.max(Math.ceil(shown / cols), 1);
  const cardW = (POSTER_W - padX * 2 - gap * (cols - 1)) / cols;
  const cardH = (gridH - gap * (rows - 1)) / rows;
  const artSize = Math.max(60, Math.min(cardH - 150, cardW - 32, 220));
  const cardScale = Math.min(1.8, Math.max(0.8, cardH / 260));

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
        <div style={{ marginTop: 10, fontSize: 18, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.6px" }}>
          Monthly #1s
        </div>
      </div>

      <div style={{ position: "absolute", top: gridTop, left: padX, right: padX, bottom: footerH, zIndex: 1, display: "flex", flexWrap: "wrap", gap, alignContent: "flex-start" }}>
        {items.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", color: t.emptyColor, fontSize: 22, fontWeight: 700, textAlign: "center" }}>
            No #1s recorded yet
          </div>
        ) : (
          items.slice(0, cols * 4).map((item, i) => {
            const months = item.hofMonths || [];
            const monthLabel = months.length > 1 ? `${months.length} months at #1` : (months[0] || "");
            return (
              <div
                key={`${itemTitle(chartType, item)}-${i}`}
                style={{
                  width: cardW, height: cardH, boxSizing: "border-box", padding: 18, borderRadius: 16,
                  background: t.rowBg, border: `1px solid ${t.dividerColor}`,
                  display: "flex", flexDirection: "column", alignItems: "center",
                  justifyContent: "center", gap: 8, textAlign: "center", position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute", top: 12, left: 12, display: "flex", alignItems: "center", gap: 5,
                    padding: "4px 10px 4px 8px", borderRadius: 999, background: `${GOLD}22`, color: GOLD,
                    fontSize: Math.round(11 * Math.min(cardScale, 1.1)), fontWeight: 900, letterSpacing: "0.4px",
                  }}
                >
                  ★ #1
                </div>
                {itemImage(chartType, item) ? (
                  <img
                    src={resolveMediaUrl(itemImage(chartType, item))}
                    alt=""
                    style={{ width: artSize, height: artSize, borderRadius: chartType === "artists" ? artSize / 2 : 12, objectFit: "cover", boxShadow: "0 10px 22px rgba(0,0,0,0.22)" }}
                  />
                ) : (
                  <ArtPlaceholder width={artSize} height={artSize} radius={chartType === "artists" ? artSize / 2 : 12} theme={theme} accentColor={GOLD} />
                )}
                <div style={{ fontSize: Math.round(21 * cardScale), fontWeight: 850, color: t.titleColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%", marginTop: 4 }}>
                  {itemTitle(chartType, item)}
                </div>
                {itemArtist(chartType, item) && (
                  <div style={{ fontSize: Math.round(14 * cardScale), fontWeight: 600, color: t.metaColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
                    {itemArtist(chartType, item)}
                  </div>
                )}
                <div
                  style={{
                    marginTop: 4, padding: "4px 12px", borderRadius: 999, background: t.pageBg,
                    fontSize: Math.round(12 * cardScale), fontWeight: 900, letterSpacing: "0.6px", textTransform: "uppercase", color: GOLD,
                  }}
                >
                  {monthLabel}
                </div>
              </div>
            );
          })
        )}
      </div>

      <PosterFooter theme={theme} padX={padX} />
    </div>
  );
}
