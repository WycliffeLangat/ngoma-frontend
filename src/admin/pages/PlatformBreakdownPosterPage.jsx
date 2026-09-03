import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from "recharts";
import { fetchAppData } from "../../api/public";
import {
  buildUniquePlatformEntries,
  buildTopCountryStats,
} from "../../utils/publicChartMirror.js";
import {
  POSTER_W,
  POSTER_H,
  PREVIEW_W,
  PREVIEW_SCALE,
  POSTER_FONT_FAMILY,
  TITLE_GAP_FROM_LOGO,
  PosterBrandRow,
  PosterFooter,
  PosterCanvas,
  PosterSettingsPanel,
  defaultPosterSettings,
  usePosterTheme,
  exportNodeAsPng,
} from "../utils/exportPoster.jsx";

const CHART_TYPES = [
  ["singles", "Songs"],
  ["albums", "Albums"],
];

const METRICS = [
  ["exclusives", "Platform Exclusives"],
  ["country", "Top Countries"],
];

// Every bar-chart candidate reuses this single shape so PosterContent doesn't
// need to know which metric produced it: a plain `[{label, value, color}]`
// list. Table mode reads the same array.
function rowsForMetric(payload, chartType, metric, month) {
  if (metric === "exclusives") {
    return buildUniquePlatformEntries(payload, chartType, month)
      .filter((entry) => entry.count > 0)
      .map((entry) => ({ label: entry.label, value: entry.count, color: entry.color }));
  }
  return buildTopCountryStats(payload, chartType, month)
    .map((entry) => ({ label: `${entry.code} · ${entry.country}`, value: entry.entries, color: entry.color }));
}

const METRIC_UNIT = { exclusives: "unique entries", country: "entries" };

function PosterContent({ rows, chartType, metric, month, viewMode, theme = "dark" }) {
  const t = usePosterTheme(theme);
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
          // Explicit pixel width/height on BarChart itself, not a
          // ResponsiveContainer — ResponsiveContainer measures its parent via
          // ResizeObserver, which does not reliably resolve inside the
          // off-screen (position:fixed; left:-99999px) export node, silently
          // baking a near-zero-height chart into the exported PNG even though
          // the same component renders correctly in the normal, visible
          // preview. The poster canvas size is fixed and known up front, so
          // there's nothing to auto-measure — pass it directly instead.
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
          // Scale the table's font/row size to the room actually available —
          // a 5-row country table gets the same 936px as a 10-row one, and
          // fixed small text just leaves dead space underneath instead of
          // using it.
          const tableRows = rows.slice(0, 10);
          const tableGap = 14;
          const tableH = POSTER_H - 340 - 74;
          const rowH = (tableH - tableGap * (tableRows.length - 1)) / tableRows.length;
          const tableScale = Math.min(2.2, Math.max(0.8, rowH / 90));
          return (
          <div style={{ display: "grid", gap: tableGap }}>
            {tableRows.map((row) => (
              <div key={row.label} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: Math.round(16 * tableScale), alignItems: "center", padding: `${Math.round(12 * tableScale)}px 0`, borderBottom: `1px solid ${t.dividerColor}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: Math.round(12 * tableScale), minWidth: 0 }}>
                  <span style={{ width: Math.round(16 * tableScale), height: Math.round(16 * tableScale), borderRadius: 4, background: row.color, flexShrink: 0 }} />
                  <span style={{ fontSize: Math.round(26 * tableScale), fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.label}</span>
                </div>
                <span style={{ fontSize: Math.round(30 * tableScale), fontWeight: 900, color: "#C97A12", flexShrink: 0 }}>{row.value}</span>
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

export default function PlatformBreakdownPosterPage() {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportError, setExportError] = useState("");
  const [chartType, setChartType] = useState("singles");
  const [metric, setMetric] = useState("exclusives");
  const [month, setMonth] = useState("");
  const [viewMode, setViewMode] = useState("graph");
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

  const months = payload?.months || [];
  useEffect(() => {
    if (months.length && !month) setMonth(months[months.length - 1]);
  }, [months, month]);

  const rows = useMemo(() => {
    if (!payload || !month) return [];
    return rowsForMetric(payload, chartType, metric, month);
  }, [payload, chartType, metric, month]);

  async function handleDownload() {
    if (!posterRef.current || exporting) return;
    setExporting(true);
    setExportError("");
    try {
      await exportNodeAsPng(posterRef.current, `ngoma-${metric}-${chartType}-${month.replace(/\s+/g, "-").toLowerCase()}-${theme}.png`);
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
          <h1>Platform &amp; Country Breakdown</h1>
          <p>Turn Platform Exclusives or Top Countries into a 4:5 share card.</p>
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
                    <button key={value} type="button" className={`cms-btn small ${chartType === value ? "" : "light"}`} onClick={() => setChartType(value)}>
                      {label}
                    </button>
                  ))}
                </div>
              </label>

              <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--cms-muted)" }}>
                Metric
                <div className="cms-pill-bar" style={{ marginBottom: 0 }}>
                  {METRICS.map(([value, label]) => (
                    <button key={value} type="button" className={`cms-btn small ${metric === value ? "" : "light"}`} onClick={() => setMetric(value)}>
                      {label}
                    </button>
                  ))}
                </div>
              </label>

              <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--cms-muted)" }}>
                Month
                <input
                  className="cms-select"
                  type="text"
                  list="breakdown-months-list"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  placeholder="Search months…"
                />
                <datalist id="breakdown-months-list">
                  {months.map((m) => <option key={m} value={m} />)}
                </datalist>
              </label>

              <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--cms-muted)" }}>
                View
                <div className="cms-pill-bar" style={{ marginBottom: 0 }}>
                  {[["graph", "Chart"], ["table", "Table"]].map(([value, label]) => (
                    <button key={value} type="button" className={`cms-btn small ${viewMode === value ? "" : "light"}`} onClick={() => setViewMode(value)}>
                      {label}
                    </button>
                  ))}
                </div>
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
                theme={theme}
                settings={posterSettings}
                onChange={setPosterSettings}
                onReset={() => setPosterSettings(defaultPosterSettings())}
              />
            </div>

            <button type="button" className="cms-btn full" style={{ marginTop: 20 }} onClick={handleDownload} disabled={exporting || !rows.length}>
              {exporting ? "Generating…" : "Download card (PNG)"}
            </button>
            <p className="cms-help" style={{ marginTop: 10 }}>
              Exports as an HD 1080 4:5 PNG using the app font - ready for Instagram/Facebook portrait posts.
            </p>
          </div>

          <div style={{ flex: "0 0 auto" }}>
            <div style={{ width: PREVIEW_W, height: PREVIEW_W * (POSTER_H / POSTER_W), overflow: "hidden", borderRadius: 18, border: "1px solid var(--cms-line)", boxShadow: "0 20px 50px rgba(20,16,4,.18)" }}>
              <div style={{ width: POSTER_W, height: POSTER_H, transform: `scale(${PREVIEW_SCALE})`, transformOrigin: "top left" }}>
                <PosterCanvas settings={posterSettings} theme={theme}>
                  <PosterContent rows={rows} chartType={chartType} metric={metric} month={month} viewMode={viewMode} theme={theme} />
                </PosterCanvas>
              </div>
            </div>
          </div>

          <div style={{ position: "fixed", top: 0, left: -99999, pointerEvents: "none" }} aria-hidden="true">
            <div ref={posterRef}>
              <PosterCanvas settings={posterSettings} theme={theme}>
                <PosterContent rows={rows} chartType={chartType} metric={metric} month={month} viewMode={viewMode} theme={theme} />
              </PosterCanvas>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
