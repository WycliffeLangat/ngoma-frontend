import { useMemo } from "react";
import { runtimePublicData } from "../../utils/publicDataRuntime.js";
import {
  publicChartRows,
  buildArtistMonthMirror,
  buildYearEndMirror,
  chartHistoryForMonth,
  historyKeyForRow,
  platformLabel,
  platformColorFor,
} from "../../utils/publicChartMirror.js";
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

// Same Top-N leaderboard design as the CMS's Social Poster Generator
// (admin/pages/PosterGeneratorPage.jsx) — reused verbatim here so a reader's
// downloaded chart poster matches what the CMS would produce for the same
// selection, just fed from the public page's current view instead of an
// editor's manual picks.
const CHART_TYPES = [
  ["singles", "Songs"],
  ["albums", "Albums"],
  ["artists", "Artists"],
];

function normalizeMonthlyRows(chartType, rawRows, historyMap) {
  return rawRows.map((row) => {
    const isArtist = chartType === "artists";
    const rank = isArtist ? row.rank : (row.r ?? row.rank);
    const stats = historyMap.get(historyKeyForRow(chartType, row)) || {};
    const peakRank = Number.isFinite(stats.peakRank) ? stats.peakRank : rank;
    const previousRank = stats.previousRank ?? null;
    const monthsCount = stats.monthsCount || 1;
    let movement = "same";
    if (monthsCount <= 1) movement = "new";
    else if (previousRank === null) movement = "re";
    else if (previousRank > rank) movement = "up";
    else if (previousRank < rank) movement = "down";
    return {
      rank,
      title: isArtist ? (row.name || "") : (row.t || row.title || ""),
      subtitle: isArtist ? "" : (row.artist_credit || row.a || row.artist || ""),
      image: resolveMediaUrl(isArtist ? (row.image || "") : (row.cover_image || "")),
      monthsOnChart: monthsCount,
      peakRank,
      peakStreak: stats.peakStreak || 1,
      movement,
    };
  });
}

function normalizeYearEndRows(chartType, rawRows) {
  return rawRows.map((row) => ({
    rank: row.rank,
    title: chartType === "artists" ? (row.name || "") : (row.title || ""),
    subtitle: chartType === "artists" ? "" : (row.artist || ""),
    image: resolveMediaUrl(row.image || ""),
    monthsOnChart: row.months ?? 0,
    peakRank: row.best ?? row.rank,
    peakStreak: 1,
    points: Number(row.points) || 0,
    movement: null,
  }));
}

function PointsStat({ points, color, scale }) {
  return (
    <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", lineHeight: 1.1 }}>
      <span style={{ fontSize: Math.round(28 * scale), fontWeight: 900, color }}>{points.toLocaleString()}</span>
      <span style={{ fontSize: Math.round(13 * scale), fontWeight: 800, letterSpacing: "0.6px", textTransform: "uppercase", color, opacity: 0.75 }}>pts</span>
    </span>
  );
}

function MovementChip({ movement, sameColor, scale }) {
  const pad = `${Math.round(10 * scale)}px ${Math.round(20 * scale)}px`;
  const fontSize = Math.round(28 * scale);
  if (movement === "new") {
    return (
      <span style={{ padding: pad, borderRadius: 999, background: "#C97A1222", color: "#C97A12", fontSize, fontWeight: 900, letterSpacing: "0.4px" }}>
        NEW
      </span>
    );
  }
  if (movement === "re") {
    return (
      <span style={{ padding: pad, borderRadius: 999, background: "#0088FF22", color: "#0088FF", fontSize, fontWeight: 900, letterSpacing: "0.4px" }}>
        RE
      </span>
    );
  }
  if (movement === "up" || movement === "down") {
    const color = movement === "up" ? "#2DB04A" : "#E5484D";
    return (
      <span style={{ padding: pad, borderRadius: 999, background: `${color}1F`, color, fontSize, fontWeight: 900, display: "inline-flex", alignItems: "center", gap: 3 }}>
        {movement === "up" ? "▲" : "▼"}
      </span>
    );
  }
  if (movement === "same") {
    return <span style={{ padding: pad, borderRadius: 999, background: `${sameColor}22`, color: sameColor, fontSize, fontWeight: 900 }}>–</span>;
  }
  return null;
}

export default function ChartListSharePoster({ chartType = "singles", period = "monthly", platform = "Combined", month = "", count = 10, theme = "dark" }) {
  const t = usePosterTheme(theme);
  const payload = useMemo(() => runtimePublicData(), []);

  const rows = useMemo(() => {
    if (period === "all-time") {
      return normalizeYearEndRows(chartType, buildYearEndMirror(payload, chartType).slice(0, count));
    }
    if (!month) return [];
    const rawRows = chartType === "artists"
      ? buildArtistMonthMirror(payload, month, platform)
      : publicChartRows(payload, chartType, month, platform);
    const historyMap = chartHistoryForMonth(payload, chartType, month, platform);
    return normalizeMonthlyRows(chartType, rawRows.slice(0, count), historyMap);
  }, [payload, chartType, period, platform, month, count]);

  const accentColor = period === "all-time" ? "#C97A12" : platformColorFor(platform);
  const countryLabel = "Kenya";
  const padX = 56;
  const isArtists = chartType === "artists";
  const typeLabel = CHART_TYPES.find(([key]) => key === chartType)?.[1] || "Chart";
  const headerTitle = `Top ${rows.length || 0} ${typeLabel} in ${countryLabel}`;
  const headerH = 365;
  const footerH = 74;
  const listH = POSTER_H - headerH - footerH;
  const gap = 18;
  const n = Math.max(rows.length, 1);
  // One `gap` is budgeted per row (n gaps total, not n-1) and split as
  // gap/2 padding above and below each row's content — see rowPadY below.
  // Splitting it symmetrically keeps "divider to content" equal on both
  // sides of every row; putting the whole gap on one side (e.g. as a
  // trailing marginBottom) made the space above each row's content look
  // bigger than the space below it.
  const rowH = (listH - gap * n) / n;
  const rowPadY = gap / 2;
  const slotH = rowH + gap;
  const scale = Math.min(1.55, Math.max(0.7, rowH / 96));
  const artSize = Math.round(Math.min(88, Math.max(40, rowH - 18)));

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
      <div style={{ padding: `56px ${padX}px 0`, position: "relative", zIndex: 1 }}>
        <PosterBrandRow theme={theme} />
      </div>

      <div style={{ padding: `${TITLE_GAP_FROM_LOGO}px ${padX}px 0`, position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <div
          style={{
            fontSize: headerTitle.length > 26 ? 44 : headerTitle.length > 18 ? 52 : 60,
            fontWeight: 900,
            lineHeight: 1.08,
            letterSpacing: "-0.5px",
            color: t.titleColor,
            textTransform: "uppercase",
            maxWidth: 900,
          }}
        >
          {headerTitle}
        </div>
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 23, fontWeight: 700, color: t.metaColor }}>
            {period === "all-time" ? "All Time" : month}
          </span>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: t.metaColor, opacity: 0.6 }} />
          <span style={{ fontSize: 17, fontWeight: 900, letterSpacing: "0.6px", textTransform: "uppercase", color: accentColor }}>
            {period === "all-time" ? "All Time" : platformLabel(platform)}
          </span>
        </div>
      </div>

      <div style={{ position: "absolute", top: headerH, left: padX, right: padX, zIndex: 1, borderTop: rows.length ? `1px solid ${t.dividerColor}` : "none" }}>
        {rows.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.emptyColor, fontSize: 18, fontWeight: 700 }}>
            No chart data for this selection
          </div>
        ) : (
          rows.map((row, i) => {
            const oneLine = rows.length > 10;
            const statScale = Math.min(scale, 1.5);
            return (
              <div
                key={`${row.rank}-${row.title}-${i}`}
                style={{
                  height: slotH,
                  boxSizing: "border-box",
                  display: "flex",
                  alignItems: "center",
                  gap: Math.round(28 * scale),
                  paddingTop: rowPadY,
                  paddingBottom: rowPadY,
                  borderBottom: i === rows.length - 1 ? "none" : `1px solid ${t.dividerColor}`,
                }}
              >
                <span
                  style={{
                    width: Math.round(58 * scale),
                    flexShrink: 0,
                    fontSize: Math.round(36 * scale),
                    fontWeight: 900,
                    color: row.rank <= 3 ? "#C97A12" : t.metaColor,
                  }}
                >
                  {row.rank}
                </span>
                {row.image ? (
                  <img
                    src={row.image}
                    alt=""
                    style={{
                      width: artSize,
                      height: artSize,
                      borderRadius: isArtists ? artSize / 2 : 10,
                      objectFit: "cover",
                      flexShrink: 0,
                      background: t.rowBg,
                    }}
                  />
                ) : (
                  <ArtPlaceholder
                    width={artSize}
                    height={artSize}
                    radius={isArtists ? artSize / 2 : 10}
                    theme={theme}
                    accentColor={accentColor}
                  />
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  {oneLine ? (
                    <div style={{ fontSize: Math.round(30 * scale), fontWeight: 800, color: t.titleColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {row.title}
                      {row.subtitle && <span style={{ fontWeight: 600, color: t.metaColor }}> — {row.subtitle}</span>}
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: Math.round(32 * scale), fontWeight: 800, color: t.titleColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {row.title}
                      </div>
                      {row.subtitle && (
                        <div style={{ fontSize: Math.round(21 * scale), fontWeight: 600, color: t.metaColor, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {row.subtitle}
                        </div>
                      )}
                    </>
                  )}
                </div>
                {row.movement !== null ? (
                  <span style={{ flexShrink: 0, marginRight: 38, width: Math.round(100 * statScale), display: "flex", justifyContent: "center" }}>
                    <MovementChip movement={row.movement} sameColor={t.sameColor} scale={statScale} />
                  </span>
                ) : row.points > 0 && (
                  <span style={{ flexShrink: 0 }}>
                    <PointsStat points={row.points} color={t.titleColor} scale={statScale} />
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      <PosterFooter theme={theme} height={footerH} padX={padX} />
    </div>
  );
}
