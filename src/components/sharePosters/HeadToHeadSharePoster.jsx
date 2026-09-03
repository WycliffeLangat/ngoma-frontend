import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
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

// Same head-to-head comparison design as the CMS's Head-to-Head Poster tool
// (admin/pages/HeadToHeadPosterPage.jsx), fed from the public Head-to-Head
// page's currently-selected pair instead of an editor's manual picks.
const CHART_TYPES = [
  ["singles", "Singles"],
  ["albums", "Albums"],
  ["artists", "Artists"],
];

const GOLD = "#C97A12";
const BLUE = "#1565C0";

const METRIC_ROWS = [
  ["Total Points", (p) => p.totalPts.toLocaleString()],
  ["Peak", (p) => (p.peak ? `#${p.peak}` : "—")],
  ["Avg. Rank", (p) => (p.avgRank ? `#${p.avgRank}` : "—")],
  ["Months", (p) => p.months],
  ["#1 Finishes", (p) => p.numberOnes],
  ["Platforms", (p) => p.platformCount],
];

export default function HeadToHeadSharePoster({ profile1, profile2, months = [], chartType = "singles", theme = "dark" }) {
  const t = usePosterTheme(theme);
  const padX = 56;
  const typeLabel = CHART_TYPES.find(([value]) => value === chartType)?.[1] || "Chart";
  const headerTitle = `Head-to-Head — ${typeLabel}`;

  const trajectoryData = months.map((month) => ({
    month: month.split(" ")[0].slice(0, 3),
    A: profile1?.monthly?.[month]?.rank ?? null,
    B: profile2?.monthly?.[month]?.rank ?? null,
  }));
  const chartW = POSTER_W - padX * 2;

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
        <div style={{ fontSize: 40, fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.5px", color: t.titleColor, textTransform: "uppercase" }}>
          {headerTitle}
        </div>
      </div>

      {!profile1 || !profile2 ? (
        <div style={{ position: "absolute", top: 340, left: padX, right: padX, bottom: 74, display: "flex", alignItems: "center", justifyContent: "center", color: t.emptyColor, fontSize: 22, fontWeight: 700, textAlign: "center" }}>
          Select two entries to compare
        </div>
      ) : (
        <>
          <div style={{ position: "absolute", top: 320, left: padX, right: padX, display: "flex", gap: 20, zIndex: 1 }}>
            {[[profile1, GOLD], [profile2, BLUE]].map(([p, color], i) => (
              <div key={i} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 14, borderRadius: 14, background: t.rowBg, borderLeft: `4px solid ${color}` }}>
                {p.cover_image || p.image ? (
                  <img src={resolveMediaUrl(p.cover_image || p.image)} alt="" style={{ width: 100, height: 100, borderRadius: chartType === "artists" ? 50 : 10, objectFit: "cover" }} />
                ) : (
                  <ArtPlaceholder width={100} height={100} radius={chartType === "artists" ? 50 : 10} theme={theme} accentColor={color} />
                )}
                <div style={{ fontSize: 19, fontWeight: 800, color: t.titleColor, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
                  {p.title}
                </div>
                {p.artist && (
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.metaColor, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
                    {p.artist}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ position: "absolute", top: 570, left: padX, right: padX, borderRadius: 12, overflow: "hidden", border: `1px solid ${t.dividerColor}`, zIndex: 1 }}>
            {METRIC_ROWS.map(([label, fmt], i) => (
              <div key={label} style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr 1fr", background: i % 2 ? t.rowBg : "transparent" }}>
                <div style={{ padding: "10px 12px", textAlign: "center", fontSize: 20, fontWeight: 900, color: GOLD }}>{fmt(profile1)}</div>
                <div style={{ padding: "10px 12px", textAlign: "center", fontSize: 12, fontWeight: 800, letterSpacing: "0.6px", textTransform: "uppercase", color: t.metaColor, display: "flex", alignItems: "center", justifyContent: "center" }}>{label}</div>
                <div style={{ padding: "10px 12px", textAlign: "center", fontSize: 20, fontWeight: 900, color: BLUE }}>{fmt(profile2)}</div>
              </div>
            ))}
          </div>

          <div style={{ position: "absolute", top: 960, left: padX, right: padX, zIndex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.6px", textTransform: "uppercase", color: t.metaColor, marginBottom: 8, textAlign: "center" }}>
              Rank Trajectory (lower = better)
            </div>
            <LineChart width={chartW} height={280} data={trajectoryData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid stroke={t.dividerColor} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 14, fontFamily: POSTER_FONT_FAMILY, fill: t.metaColor, fontWeight: 700 }} tickLine={false} axisLine={false} />
              <YAxis reversed domain={[1, "dataMax"]} tick={{ fontSize: 14, fontFamily: POSTER_FONT_FAMILY, fill: t.metaColor, fontWeight: 700 }} tickFormatter={(v) => `#${v}`} axisLine={false} tickLine={false} width={40} />
              <Line dataKey="A" stroke={GOLD} strokeWidth={3} dot={{ r: 5, fill: GOLD }} connectNulls />
              <Line dataKey="B" stroke={BLUE} strokeWidth={3} dot={{ r: 5, fill: BLUE }} connectNulls />
            </LineChart>
          </div>
        </>
      )}

      <PosterFooter theme={theme} padX={padX} />
    </div>
  );
}
