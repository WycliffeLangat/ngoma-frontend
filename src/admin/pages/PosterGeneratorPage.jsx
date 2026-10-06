import ChartListSharePoster from "../../components/sharePosters/ChartListSharePoster.jsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchAppData } from "../../api/public";
import {
  publicChartRows,
  buildArtistMonthMirror,
  buildYearEndMirror,
  chartHistoryForMonth,
  historyKeyForRow,
} from "../../utils/publicChartMirror.js";
import { resolveMediaUrl } from "../../api/config.js";
import {
  POSTER_W,
  POSTER_H,
  PREVIEW_W,
  PREVIEW_SCALE,
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

const PERIODS = [
  ["monthly", "Monthly"],
  ["all-time", "All Time"],
];

const COUNT_OPTIONS = [5, 10, 15, 20];

// Small, self-contained brand palette — mirrors the public app's platform
// colors without pulling in NgomaCharts.jsx's module state. Keyed uppercase
// since that's how platform names come back from the app-data payload
// (payload.full.singles.platforms keys are e.g. "SPOTIFY", "APPLE MUSIC").
const PLATFORM_COLORS = {
  COMBINED: "#BF870E",
  KENYAN: "#006600",
  SPOTIFY: "#1DB954",
  "APPLE MUSIC": "#FC3C44",
  AUDIOMACK: "#F68B1F",
  BOOMPLAY: "#00B4B4",
  YOUTUBE: "#FF0000",
  SHAZAM: "#0088FF",
};
const PLATFORM_LABELS = {
  COMBINED: "Combined",
  KENYAN: "Kenyan",
  SPOTIFY: "Spotify",
  "APPLE MUSIC": "Apple Music",
  AUDIOMACK: "Audiomack",
  BOOMPLAY: "Boomplay",
  YOUTUBE: "YouTube",
  SHAZAM: "Shazam",
};
const platformKey = (name) => String(name || "").trim().toUpperCase();
const platformColor = (name) => PLATFORM_COLORS[platformKey(name)] || "#BF870E";
const platformLabel = (name) => PLATFORM_LABELS[platformKey(name)] || name;

// Monthly rows get their MONTHS/PEAK/+- columns from chartHistoryForMonth()
// (scans every published month up to the target one); All-Time rows already
// carry equivalent months/best fields straight off buildYearEndMirror(), and
// have no "previous period" to diff against for a movement arrow.
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
    movement: null,
  }));
}

export default function PosterGeneratorPage() {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportError, setExportError] = useState("");
  const [chartType, setChartType] = useState("singles");
  const [period, setPeriod] = useState("monthly");
  const [platform, setPlatform] = useState("Combined");
  const [month, setMonth] = useState("");
  const [count, setCount] = useState(10);
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

  const platformOptions = useMemo(() => {
    const singlesPlats = Object.keys(payload?.full?.singles?.platforms || {});
    const albumsPlats = Object.keys(payload?.full?.albums?.platforms || {});
    const names = [...new Set([...singlesPlats, ...albumsPlats])];
    return ["Combined", "Kenyan", ...names];
  }, [payload]);

  // All-Time mirrors (buildYearEndMirror) are always calculated against the
  // Combined chart — there's no per-platform all-time breakdown.
  const effectivePlatform = period === "all-time" ? "Combined" : platform;

  const rows = useMemo(() => {
    if (!payload) return [];
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


  async function handleDownload() {
    if (!posterRef.current || exporting) return;
    setExporting(true);
    setExportError("");
    try {
      const safePeriod = period === "all-time" ? "all-time" : String(month).replace(/\s+/g, "-").toLowerCase();
      const safePlatform = String(effectivePlatform).replace(/\s+/g, "-").toLowerCase();
      await exportNodeAsPng(posterRef.current, `ngoma-top-${rows.length}-${chartType}-${safePlatform}-${safePeriod}-${theme}.png`);
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
          <h1>Social Poster Generator</h1>
          <p>Turn any published Top N chart into a 4:5 image ready to post on Instagram, X, or Facebook.</p>
        </div>
      </div>

      {error && <div className="cms-alert error">{error}</div>}
      {exportError && <div className="cms-alert error">{exportError}</div>}

      {loading ? (
        <div className="cms-empty">Loading live chart data…</div>
      ) : (
        <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div className="cms-card" style={{ flex: "1 1 320px", minWidth: 280 }}>
            <div className="cms-card-heading"><h2>Chart selection</h2></div>

            <div style={{ display: "grid", gap: 14 }}>
              <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--cms-muted)" }}>
                Chart type
                <div className="cms-pill-bar" style={{ marginBottom: 0 }}>
                  {CHART_TYPES.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={`cms-btn small ${chartType === value ? "" : "light"}`}
                      onClick={() => setChartType(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </label>

              <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--cms-muted)" }}>
                Period
                <div className="cms-pill-bar" style={{ marginBottom: 0 }}>
                  {PERIODS.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={`cms-btn small ${period === value ? "" : "light"}`}
                      onClick={() => setPeriod(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </label>

              <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--cms-muted)" }}>
                Platform
                <select className="cms-select" value={platform} disabled={period === "all-time"} onChange={(e) => setPlatform(e.target.value)}>
                  {platformOptions.map((name) => (
                    <option key={name} value={name}>{name === "Kenyan" ? "Kenya (national chart)" : platformLabel(name)}</option>
                  ))}
                </select>
                {period === "all-time" && (
                  <span className="cms-help">All-Time posters are always calculated from the Combined chart.</span>
                )}
              </label>

              {period === "monthly" && (
                <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--cms-muted)" }}>
                  Month
                  <select className="cms-select" value={month} onChange={(e) => setMonth(e.target.value)}>
                    {months.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </label>
              )}

              <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--cms-muted)" }}>
                Entries
                <div className="cms-pill-bar" style={{ marginBottom: 0 }}>
                  {COUNT_OPTIONS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`cms-btn small ${count === value ? "" : "light"}`}
                      onClick={() => setCount(value)}
                    >
                      Top {value}
                    </button>
                  ))}
                </div>
              </label>

              <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--cms-muted)" }}>
                Poster theme
                <div className="cms-pill-bar" style={{ marginBottom: 0 }}>
                  {[["dark", "Dark"], ["light", "Light"]].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={`cms-btn small ${theme === value ? "" : "light"}`}
                      onClick={() => setTheme(value)}
                    >
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

            <button
              type="button"
              className="cms-btn full"
              style={{ marginTop: 20 }}
              onClick={handleDownload}
              disabled={exporting || rows.length === 0}
            >
              {exporting ? "Generating…" : "Download poster (PNG)"}
            </button>
            <p className="cms-help" style={{ marginTop: 10 }}>
              Exports as an HD 1080 4:5 PNG using the app font - ready for Instagram/Facebook portrait posts.
            </p>
          </div>

          <div style={{ flex: "0 0 auto" }}>
            <div
              style={{
                width: PREVIEW_W,
                height: PREVIEW_W * (POSTER_H / POSTER_W),
                overflow: "hidden",
                borderRadius: 18,
                border: "1px solid var(--cms-line)",
                boxShadow: "0 20px 50px rgba(20,16,4,.18)",
              }}
            >
              <div style={{ width: POSTER_W, height: POSTER_H, transform: `scale(${PREVIEW_SCALE})`, transformOrigin: "top left" }}>
                <PosterCanvas settings={posterSettings} theme={theme}>
                  <ChartListSharePoster payload={payload} chartType={chartType} period={period} platform={effectivePlatform} month={month} count={count} theme={theme} />
                </PosterCanvas>
              </div>
            </div>
          </div>

          {/* Off-screen full-resolution node — this is what actually gets rasterized.
              The visible preview above is a separately scaled copy so users see the
              real layout without the capture picking up the CSS scale transform. */}
          <div style={{ position: "fixed", top: 0, left: -99999, pointerEvents: "none" }} aria-hidden="true">
            <div ref={posterRef}>
              <PosterCanvas settings={posterSettings} theme={theme}>
                <ChartListSharePoster payload={payload} chartType={chartType} period={period} platform={effectivePlatform} month={month} count={count} theme={theme} />
              </PosterCanvas>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
