import { useMemo } from "react";
import { runtimePublicData } from "../../utils/publicDataRuntime.js";
import { buildCrossPlatformRows } from "../../utils/publicChartMirror.js";
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

// Same design as the CMS's Cross-Platform Poster (admin/pages/CrossPlatformPosterPage.jsx),
// fed from the public Analytics page's Cross-Platform Hits panel.
const CHART_TYPES = [
  ["singles", "Songs"],
  ["albums", "Albums"],
];

const MODES = [
  ["reach", "Cross-Platform Reach"],
  ["hits", "Cross-Platform Hits"],
];

export default function CrossPlatformSharePoster({ chartType = "singles", mode = "hits", month = "", theme = "dark" }) {
  const t = usePosterTheme(theme);
  const payload = useMemo(() => runtimePublicData(), []);
  const rows = useMemo(() => {
    if (!month) return [];
    const all = buildCrossPlatformRows(payload, chartType, month);
    const filtered = mode === "hits" ? all.filter((row) => row.count >= row.platformTotal) : all;
    return filtered.slice(0, 8);
  }, [payload, chartType, mode, month]);

  const padX = 56;
  const typeLabel = CHART_TYPES.find(([value]) => value === chartType)?.[1] || "Chart";
  const modeLabel = MODES.find(([value]) => value === mode)?.[1] || "";
  const headerTitle = `${modeLabel} — ${typeLabel}`;
  // Same list proportions as the Top-N chart poster (ChartListSharePoster).
  const n = Math.max(rows.length, 1);
  const listTop = 365;
  const footerH = 74;
  const listH = POSTER_H - listTop - footerH;
  const gap = 18;
  const rowH = (listH - gap * (n - 1)) / n;
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
        <div style={{ fontSize: headerTitle.length > 26 ? 40 : 48, fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.5px", color: t.titleColor, textTransform: "uppercase" }}>
          {headerTitle}
        </div>
        <div style={{ marginTop: 10, fontSize: 20, fontWeight: 700, color: "#00897B", textTransform: "uppercase", letterSpacing: "0.6px" }}>
          {month}
        </div>
      </div>

      <div style={{ position: "absolute", top: listTop, left: padX, right: padX, bottom: footerH, zIndex: 1 }}>
        {rows.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: t.emptyColor, fontSize: 22, fontWeight: 700, textAlign: "center" }}>
            No qualifying entries for this selection
          </div>
        ) : (
          rows.map((row, i) => (
            <div
              key={`${row.r ?? row.rank}-${row.t || row.title}-${i}`}
              style={{
                height: rowH + (i > 0 ? gap / 2 : 0) + (i < rows.length - 1 ? gap / 2 : 0),
                boxSizing: "border-box", display: "flex", alignItems: "center",
                gap: Math.round(28 * scale),
                paddingTop: i > 0 ? gap / 2 : 0,
                paddingBottom: i < rows.length - 1 ? gap / 2 : 0,
                borderBottom: i === rows.length - 1 ? "none" : `1px solid ${t.dividerColor}`,
              }}
            >
              <span style={{ width: Math.round(56 * scale), flexShrink: 0, fontSize: Math.round(30 * scale), fontWeight: 900, color: i < 3 ? "#00897B" : t.metaColor }}>
                {i + 1}
              </span>
              {row.cover_image ? (
                <img src={resolveMediaUrl(row.cover_image)} alt="" style={{ width: artSize, height: artSize, borderRadius: 10, objectFit: "cover", flexShrink: 0, background: t.rowBg }} />
              ) : (
                <ArtPlaceholder width={artSize} height={artSize} radius={10} theme={theme} accentColor="#00897B" />
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: Math.round(26 * scale), fontWeight: 800, color: t.titleColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {row.t || row.title}
                </div>
                <div style={{ fontSize: Math.round(17 * scale), fontWeight: 600, color: t.metaColor, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {row.artist_credit || row.a || row.artist || ""}
                </div>
              </div>
              <div
                style={{
                  flexShrink: 0, marginRight: Math.round(38 * Math.min(scale, 1.2)), whiteSpace: "nowrap", textAlign: "center",
                  padding: `${Math.round(6 * scale)}px ${Math.round(14 * scale)}px`, borderRadius: 999,
                  background: "#00897B22", color: "#00897B", fontWeight: 900, fontSize: Math.round(18 * scale),
                }}
              >
                {row.count}/{row.platformTotal}
              </div>
            </div>
          ))
        )}
      </div>

      <PosterFooter theme={theme} padX={padX} />
    </div>
  );
}
