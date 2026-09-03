import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Cell, CartesianGrid } from "recharts";
import { runtimePublicData } from "../../utils/publicDataRuntime.js";
import {
  buildUniquePlatformEntries,
  buildTopCountryStats,
} from "../../utils/publicChartMirror.js";
import {
  POSTER_W,
  POSTER_H,
  POSTER_FONT_FAMILY,
  TITLE_GAP_FROM_LOGO,
  PosterBrandRow,
  PosterFooter,
  usePosterTheme,
} from "../../admin/utils/exportPoster.jsx";

// Same design as the CMS's Platform & Country Breakdown poster
// (admin/pages/PlatformBreakdownPosterPage.jsx), fed from the public
// Analytics page's country stats panel.
const CHART_TYPES = [
  ["singles", "Songs"],
  ["albums", "Albums"],
  ["artists", "Artists"],
];

const METRICS = [
  ["exclusives", "Platform Exclusives"],
  ["country", "Top Countries"],
];

function rowsForMetric(payload, chartType, metric, month) {
  if (metric === "exclusives") {
    return buildUniquePlatformEntries(payload, chartType, month)
      .filter((entry) => entry.count > 0)
      .map((entry) => ({ label: entry.label, value: entry.count, color: entry.color }));
  }
  return buildTopCountryStats(payload, chartType, month)
    .map((entry) => ({ label: `${entry.code} · ${entry.country}`, value: entry.entries, color: entry.color }));
}

export default function PlatformBreakdownSharePoster({ chartType = "singles", metric = "country", month = "", viewMode = "graph", theme = "dark" }) {
  const t = usePosterTheme(theme);
  const payload = useMemo(() => runtimePublicData(), []);
  const rows = useMemo(() => {
    if (!month) return [];
    return rowsForMetric(payload, chartType, metric, month);
  }, [payload, chartType, metric, month]);

  const padX = 64;
  const metricLabel = METRICS.find(([value]) => value === metric)?.[1] || "";
  const typeLabel = CHART_TYPES.find(([value]) => value === chartType)?.[1] || "Chart";
  const headerTitle = `${metricLabel} — ${typeLabel} Chart`;

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

      <div style={{ padding: `${TITLE_GAP_FROM_LOGO}px ${padX}px 0`, position: "relative", zIndex: 1, textAlign: "center" }}>
        <div
          style={{
            fontSize: headerTitle.length > 26 ? 44 : 52,
            fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.5px",
            color: t.titleColor, textTransform: "uppercase",
          }}
        >
          {headerTitle}
        </div>
        <div style={{ marginTop: 10, fontSize: 20, fontWeight: 700, color: "#C97A12", textTransform: "uppercase", letterSpacing: "0.6px" }}>
          {month}
        </div>
      </div>

      <div style={{ position: "absolute", top: 340, left: padX, right: padX, bottom: 74, zIndex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {rows.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: t.emptyColor, fontSize: 22, fontWeight: 700, textAlign: "center" }}>
            No data for this selection
          </div>
        ) : viewMode === "graph" ? (
          <div style={{ width: "100%", height: 900, display: "flex", justifyContent: "center" }}>
            <BarChart width={POSTER_W - padX * 2} height={900} data={rows} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
              <CartesianGrid stroke={t.dividerColor} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 16, fontFamily: POSTER_FONT_FAMILY, fill: t.metaColor, fontWeight: 700 }}
                tickLine={false}
                axisLine={false}
                angle={-30}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 16, fontFamily: POSTER_FONT_FAMILY, fill: t.metaColor, fontWeight: 700 }}
                axisLine={false}
                tickLine={false}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={80}>
                {rows.map((row, index) => <Cell key={index} fill={row.color} />)}
              </Bar>
            </BarChart>
          </div>
        ) : (() => {
          // Proportional bar-leaderboard instead of a bare dot+label+number
          // list — the bar length carries the comparison at a glance, and a
          // rank number gives the same "ranked poster" family feel as the
          // Top-N chart and Movers posters instead of reading as a plain table.
          const tableRows = rows.slice(0, 10);
          const tableGap = 14;
          const tableH = POSTER_H - 340 - 74;
          const n = tableRows.length;
          const rowH = (tableH - tableGap * n) / n;
          const rowPadY = tableGap / 2;
          const slotH = rowH + tableGap;
          const tableScale = Math.min(2.2, Math.max(0.8, rowH / 96));
          const maxValue = Math.max(...tableRows.map((row) => Number(row.value) || 0), 1);
          return (
          <div style={{ borderTop: `1px solid ${t.dividerColor}` }}>
            {tableRows.map((row, i) => (
              <div
                key={row.label}
                style={{
                  height: slotH, boxSizing: "border-box", display: "flex", alignItems: "center",
                  gap: Math.round(20 * tableScale), paddingTop: rowPadY, paddingBottom: rowPadY,
                  borderBottom: i === tableRows.length - 1 ? "none" : `1px solid ${t.dividerColor}`,
                }}
              >
                <span style={{ width: Math.round(46 * tableScale), flexShrink: 0, fontSize: Math.round(26 * tableScale), fontWeight: 900, color: i < 3 ? row.color : t.metaColor }}>
                  {i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: Math.round(8 * tableScale) }}>
                    <span style={{ fontSize: Math.round(24 * tableScale), fontWeight: 800, color: t.titleColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {row.label}
                    </span>
                    <span style={{ fontSize: Math.round(24 * tableScale), fontWeight: 900, color: row.color, flexShrink: 0 }}>
                      {row.value}
                    </span>
                  </div>
                  <div style={{ height: Math.max(6, Math.round(10 * tableScale)), borderRadius: 999, background: t.rowBg, overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${Math.max(4, (Number(row.value) / maxValue) * 100)}%`,
                        height: "100%", borderRadius: 999, background: row.color,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          );
        })()}
      </div>

      <PosterFooter theme={theme} padX={padX} />
    </div>
  );
}
