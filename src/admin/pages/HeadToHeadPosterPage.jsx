import { useEffect, useMemo, useRef, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { fetchAppData } from "../../api/public";
import { buildHeadToHeadCandidates, buildHeadToHeadProfile } from "../../utils/publicChartMirror.js";
import { resolveMediaUrl } from "../../api/config.js";
import {
  POSTER_W,
  POSTER_H,
  PREVIEW_W,
  PREVIEW_SCALE,
  POSTER_FONT_FAMILY,
  POSTER_THEMES,
  TITLE_GAP_FROM_LOGO,
  PosterBrandRow,
  PosterFooter,
  ArtPlaceholder,
  PosterCanvas,
  PosterSettingsPanel,
  defaultPosterSettings,
  exportNodeAsPng,
} from "../utils/exportPoster.jsx";

const CHART_TYPES = [
  ["singles", "Songs"],
  ["albums", "Albums"],
  ["artists", "Artists"],
];

const GOLD = "#B8860B";
const BLUE = "#1565C0";

const METRIC_ROWS = [
  ["Total Points", (p) => p.totalPts.toLocaleString()],
  ["Peak", (p) => (p.peak ? `#${p.peak}` : "—")],
  ["Avg. Rank", (p) => (p.avgRank ? `#${p.avgRank}` : "—")],
  ["Months", (p) => p.months],
  ["#1 Finishes", (p) => p.numberOnes],
  ["Platforms", (p) => p.platformCount],
];

function PosterContent({ profile1, profile2, months, chartType, theme = "dark" }) {
  const t = POSTER_THEMES[theme] || POSTER_THEMES.dark;
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
          {/* Identity row */}
          <div style={{ position: "absolute", top: 320, left: padX, right: padX, display: "flex", gap: 20, zIndex: 1 }}>
            {[[profile1, GOLD], [profile2, BLUE]].map(([p, color], i) => (
              <div key={i} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 14, borderRadius: 14, background: t.rowBg, borderLeft: `4px solid ${color}` }}>
                {p.image ? (
                  <img src={resolveMediaUrl(p.image)} alt="" style={{ width: 100, height: 100, borderRadius: chartType === "artists" ? 50 : 10, objectFit: "cover" }} />
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

          {/* Metric table */}
          <div style={{ position: "absolute", top: 570, left: padX, right: padX, borderRadius: 12, overflow: "hidden", border: `1px solid ${t.dividerColor}`, zIndex: 1 }}>
            {METRIC_ROWS.map(([label, fmt], i) => (
              <div key={label} style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr 1fr", background: i % 2 ? t.rowBg : "transparent" }}>
                <div style={{ padding: "10px 12px", textAlign: "center", fontSize: 20, fontWeight: 900, color: GOLD }}>{fmt(profile1)}</div>
                <div style={{ padding: "10px 12px", textAlign: "center", fontSize: 12, fontWeight: 800, letterSpacing: "0.6px", textTransform: "uppercase", color: t.metaColor, display: "flex", alignItems: "center", justifyContent: "center" }}>{label}</div>
                <div style={{ padding: "10px 12px", textAlign: "center", fontSize: 20, fontWeight: 900, color: BLUE }}>{fmt(profile2)}</div>
              </div>
            ))}
          </div>

          {/* Rank trajectory — explicit px width/height, not ResponsiveContainer */}
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

export default function HeadToHeadPosterPage() {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportError, setExportError] = useState("");
  const [chartType, setChartType] = useState("singles");
  const [key1, setKey1] = useState("");
  const [key2, setKey2] = useState("");
  const [theme, setTheme] = useState("dark");
  const [posterSettings, setPosterSettings] = useState(() => defaultPosterSettings());
  const [exporting, setExporting] = useState(false);
  const posterRef = useRef(null);

  useEffect(() => {
    let active = true;
    fetchAppData()
      .then((data) => { if (active) setPayload(data); })
      .catch((err) => { if (active) setError(err.message || "Failed to load chart data"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const candidates = useMemo(() => (payload ? buildHeadToHeadCandidates(payload, chartType) : []), [payload, chartType]);

  useEffect(() => {
    if (candidates.length && (!key1 || !candidates.some((c) => c.key === key1))) setKey1(candidates[0]?.key || "");
    if (candidates.length > 1 && (!key2 || !candidates.some((c) => c.key === key2))) setKey2(candidates[1]?.key || "");
  }, [candidates]); // eslint-disable-line react-hooks/exhaustive-deps

  const profile1 = useMemo(() => (payload && key1 ? buildHeadToHeadProfile(payload, chartType, key1) : null), [payload, chartType, key1]);
  const profile2 = useMemo(() => (payload && key2 ? buildHeadToHeadProfile(payload, chartType, key2) : null), [payload, chartType, key2]);
  const months = payload?.months || [];

  async function handleDownload() {
    if (!posterRef.current || exporting || !profile1 || !profile2) return;
    setExporting(true);
    setExportError("");
    try {
      await exportNodeAsPng(posterRef.current, `ngoma-head-to-head-${chartType}-${theme}.png`);
    } catch {
      setExportError("Couldn't generate the image — try again.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <section>
      <div className="cms-page-head">
        <div>
          <h1>Head-to-Head Poster</h1>
          <p>Compare two entries' points, rank, platforms, and trajectory as a 4:5 share card.</p>
        </div>
      </div>

      {error && <div className="cms-alert error">{error}</div>}
      {exportError && <div className="cms-alert error">{exportError}</div>}

      {loading ? (
        <div className="cms-empty">Loading live chart data…</div>
      ) : (
        <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div className="cms-card" style={{ flex: "1 1 320px", minWidth: 280 }}>
            <div className="cms-card-heading"><h2>Card selection</h2></div>

            <div style={{ display: "grid", gap: 14 }}>
              <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--cms-muted)" }}>
                Chart type
                <div className="cms-pill-bar" style={{ marginBottom: 0 }}>
                  {CHART_TYPES.map(([value, label]) => (
                    <button key={value} type="button" className={`cms-btn small ${chartType === value ? "" : "light"}`} onClick={() => { setChartType(value); setKey1(""); setKey2(""); }}>
                      {label}
                    </button>
                  ))}
                </div>
              </label>

              <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--cms-muted)" }}>
                Entry One
                <select className="cms-select" value={key1} onChange={(e) => setKey1(e.target.value)}>
                  {candidates.map((c) => <option key={c.key} value={c.key}>{c.title}{c.artist ? ` — ${c.artist}` : ""}</option>)}
                </select>
              </label>

              <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--cms-muted)" }}>
                Entry Two
                <select className="cms-select" value={key2} onChange={(e) => setKey2(e.target.value)}>
                  {candidates.map((c) => <option key={c.key} value={c.key}>{c.title}{c.artist ? ` — ${c.artist}` : ""}</option>)}
                </select>
              </label>

              <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--cms-muted)" }}>
                Card theme
                <div className="cms-pill-bar" style={{ marginBottom: 0 }}>
                  {[["dark", "Dark"], ["light", "Light"]].map(([value, label]) => (
                    <button key={value} type="button" className={`cms-btn small ${theme === value ? "" : "light"}`} onClick={() => setTheme(value)}>
                      {label}
                    </button>
                  ))}
                </div>
              </label>

              <PosterSettingsPanel
                settings={posterSettings}
                onChange={setPosterSettings}
                onReset={() => setPosterSettings(defaultPosterSettings())}
              />
            </div>

            <button type="button" className="cms-btn full" style={{ marginTop: 20 }} onClick={handleDownload} disabled={exporting || !profile1 || !profile2}>
              {exporting ? "Generating…" : "Download card (PNG)"}
            </button>
            <p className="cms-help" style={{ marginTop: 10 }}>
              Exports as a Super HD 4:5 PNG using the app font — ready for Instagram/Facebook portrait posts.
            </p>
          </div>

          <div style={{ flex: "0 0 auto" }}>
            <div style={{ width: PREVIEW_W, height: PREVIEW_W * (POSTER_H / POSTER_W), overflow: "hidden", borderRadius: 18, border: "1px solid var(--cms-line)", boxShadow: "0 20px 50px rgba(20,16,4,.18)" }}>
              <div style={{ width: POSTER_W, height: POSTER_H, transform: `scale(${PREVIEW_SCALE})`, transformOrigin: "top left" }}>
                <PosterCanvas settings={posterSettings} theme={theme}>
                  <PosterContent profile1={profile1} profile2={profile2} months={months} chartType={chartType} theme={theme} />
                </PosterCanvas>
              </div>
            </div>
          </div>

          <div style={{ position: "fixed", top: 0, left: -99999, pointerEvents: "none" }} aria-hidden="true">
            <div ref={posterRef}>
              <PosterCanvas settings={posterSettings} theme={theme}>
                <PosterContent profile1={profile1} profile2={profile2} months={months} chartType={chartType} theme={theme} />
              </PosterCanvas>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
