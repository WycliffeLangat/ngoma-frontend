import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import {
  POSTER_W,
  POSTER_H,
  POSTER_FONT_FAMILY,
  PosterFooter,
  usePosterTheme,
} from "../../admin/utils/exportPoster.jsx";
import DetailPosterHeader, { detailHeaderHeight, DETAIL_FOOTER_H } from "./DetailPosterHeader.jsx";

// Graph companion to DetailListPoster — same header treatment (stacked
// image/title/subtitle/badge) but the body renders the actual trend charts
// from the detail page (rank/points over time) instead of a table, so
// "Download Full Profile/Details" carries the visuals the page shows, not
// just the numbers behind them. `charts` is a list of { label, kind: "bar"
// | "line", data, xKey, dataKey, color, reversed, yDomain, yTickFormatter }
// — one card per chart, stacked to fill the page.
const FOOTER_H = DETAIL_FOOTER_H;

export default function DetailChartPoster({
  title = "",
  subtitle = "",
  sectionLabel = "",
  image = "",
  charts = [],
  accentColor = "#C97A12",
  theme = "dark",
}) {
  const t = usePosterTheme(theme);
  const padX = 60;
  const headerH = detailHeaderHeight(Boolean(image));
  const areaH = POSTER_H - headerH - FOOTER_H;
  const gap = 30;
  const cardCount = Math.max(charts.length, 1);
  const cardH = (areaH - gap * (cardCount - 1)) / cardCount;
  const gridStroke = theme === "light" ? "#EDEAE2" : "#242923";
  const axisTick = { fontSize: 17, fontFamily: POSTER_FONT_FAMILY, fill: t.metaColor, fontWeight: 700 };

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

      <div style={{ position: "absolute", top: headerH, left: padX, right: padX, zIndex: 1, display: "flex", flexDirection: "column", gap }}>
        {charts.map((chart, i) => (
          <div
            key={chart.label || i}
            style={{
              height: cardH,
              boxSizing: "border-box",
              border: `1px solid ${t.dividerColor}`,
              borderRadius: 20,
              padding: "26px 28px 20px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ fontSize: 21, fontWeight: 900, letterSpacing: "0.4px", color: t.titleColor, marginBottom: 4 }}>
              {chart.label}
            </div>
            {chart.hint && (
              <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.6px", textTransform: "uppercase", color: t.metaColor, marginBottom: 10 }}>
                {chart.hint}
              </div>
            )}
            <div style={{ flex: 1, minHeight: 0, marginTop: chart.hint ? 0 : 10 }}>
              {chart.data?.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  {chart.kind === "bar" ? (
                    <BarChart data={chart.data} barCategoryGap="24%">
                      <CartesianGrid stroke={gridStroke} vertical={false} />
                      <XAxis dataKey={chart.xKey} tick={axisTick} tickLine={false} axisLine={false} />
                      <YAxis tick={axisTick} axisLine={false} tickLine={false} width={44} />
                      <Bar dataKey={chart.dataKey} fill={chart.color || accentColor} radius={[6, 6, 0, 0]} maxBarSize={60} />
                    </BarChart>
                  ) : (
                    <LineChart data={chart.data} margin={{ top: 8, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke={gridStroke} vertical={false} />
                      <XAxis dataKey={chart.xKey} tick={axisTick} tickLine={false} axisLine={false} />
                      <YAxis
                        reversed={chart.reversed}
                        domain={chart.yDomain}
                        allowDecimals={false}
                        tick={axisTick}
                        tickFormatter={chart.yTickFormatter}
                        axisLine={false}
                        tickLine={false}
                        width={48}
                      />
                      <Line
                        type="monotone"
                        dataKey={chart.dataKey}
                        stroke={chart.color || accentColor}
                        strokeWidth={3.5}
                        connectNulls
                        dot={{ r: 5, fill: chart.color || accentColor, stroke: t.pageBg, strokeWidth: 2 }}
                        activeDot={false}
                      />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              ) : (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: t.emptyColor, fontSize: 18, fontWeight: 700 }}>
                  No data available
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <PosterFooter theme={theme} height={FOOTER_H} padX={padX} />
    </div>
  );
}
