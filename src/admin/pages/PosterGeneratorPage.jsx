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
import { POSTER_W, POSTER_H, PREVIEW_W, PREVIEW_SCALE, readableInk, exportNodeAsPng } from "../utils/exportPoster.js";

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
  COMBINED: "#B8860B",
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
  KENYAN: "Kenya",
  SPOTIFY: "Spotify",
  "APPLE MUSIC": "Apple Music",
  AUDIOMACK: "Audiomack",
  BOOMPLAY: "Boomplay",
  YOUTUBE: "YouTube",
  SHAZAM: "Shazam",
};
const platformKey = (name) => String(name || "").trim().toUpperCase();
const platformColor = (name) => PLATFORM_COLORS[platformKey(name)] || "#B8860B";
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
    else if (previousRank === null) movement = "new";
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

// Dark mirrors the public app's own dark theme; light mirrors its light
// theme. rowBg is only used as a neutral fill for artwork placeholder tiles
// (rows themselves sit directly on the page background, no card fill).
const POSTER_THEMES = {
  dark: {
    pageBg: "linear-gradient(160deg, #0b0b0b 0%, #050505 55%, #10130f 100%)",
    wordmarkBarColor: "#F6F3EA",
    titleColor: "#FFFFFF",
    metaColor: "#AEB6AE",
    dividerColor: "rgba(255,255,255,0.14)",
    rowBg: "#151815",
    sameColor: "#5A625A",
    footerBorder: "rgba(255,255,255,0.08)",
    footerPrimary: "#8F968F",
    footerSecondary: "#5A625A",
    emptyColor: "#5A625A",
  },
  light: {
    pageBg: "linear-gradient(160deg, #ffffff 0%, #faf8f3 55%, #f2eee3 100%)",
    wordmarkBarColor: "#1A1A1A",
    titleColor: "#0C0C0C",
    metaColor: "#69716B",
    dividerColor: "rgba(0,0,0,0.12)",
    rowBg: "#EFECE3",
    sameColor: "#8A928B",
    footerBorder: "rgba(0,0,0,0.08)",
    footerPrimary: "#4E5851",
    footerSecondary: "#8A928B",
    emptyColor: "#8A928B",
  },
};

// Small ascending-bars mark — the exact icon used in the public site's own
// header (src/NgomaCharts.jsx), reused here since there's no logo image file
// to embed.
function BrandMark({ size = 22, barColor }) {
  return (
    <svg width={size} height={size * (24 / 22)} viewBox="0 0 22 24" style={{ flexShrink: 0 }}>
      <rect x="0" y="15" width="3.5" height="9" fill={barColor} rx="0.5" />
      <rect x="5.5" y="10" width="3.5" height="14" fill={barColor} rx="0.5" />
      <rect x="11" y="5" width="3.5" height="19" fill="#B8860B" rx="0.5" />
      <rect x="16.5" y="0" width="3.5" height="24" fill={barColor} rx="0.5" />
    </svg>
  );
}

function MovementChip({ movement, sameColor, scale }) {
  const pad = `${Math.round(4 * scale)}px ${Math.round(10 * scale)}px`;
  const fontSize = Math.round(13 * scale);
  if (movement === "new") {
    return (
      <span style={{ padding: pad, borderRadius: 999, background: "#B8860B22", color: "#B8860B", fontSize, fontWeight: 900, letterSpacing: "0.4px" }}>
        NEW
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

// Deliberately not a grid table with column headers — a numbered list with
// artwork and inline stat chips per row instead, so this reads as its own
// design rather than a recreation of any particular reference layout.
function PosterContent({ chartType, period, platform, month, rows, accentColor, countryLabel, theme = "dark" }) {
  const t = POSTER_THEMES[theme] || POSTER_THEMES.dark;
  const headerH = 268;
  const footerH = 74;
  const padX = 56;
  const listH = POSTER_H - headerH - footerH;
  const gap = 10;
  const n = Math.max(rows.length, 1);
  const rowH = (listH - gap * (n - 1)) / n;
  // Rows scale up when there are fewer entries (more room per row) and down
  // when there are more, clamped so text never goes illegibly small or
  // comically large. 96px is roughly a Top-10 row's natural height.
  const scale = Math.min(1.9, Math.max(0.6, rowH / 96));
  const isArtists = chartType === "artists";
  const typeLabel = (CHART_TYPES.find(([key]) => key === chartType)?.[1] || "Chart").toUpperCase();
  const artSize = Math.round(Math.min(88, Math.max(40, rowH - 18)));

  return (
    <div
      style={{
        width: POSTER_W,
        height: POSTER_H,
        boxSizing: "border-box",
        background: t.pageBg,
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        color: t.titleColor,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -180,
          left: -120,
          width: 460,
          height: 460,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accentColor}2E 0%, transparent 70%)`,
        }}
      />

      <div style={{ padding: `44px ${padX}px 0`, position: "relative", zIndex: 1, display: "flex", alignItems: "flex-start", gap: 22 }}>
        <div
          style={{
            flexShrink: 0,
            padding: "10px 20px",
            borderRadius: 18,
            background: accentColor,
            color: readableInk(accentColor),
            textAlign: "center",
            lineHeight: 1,
          }}
        >
          <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: "-1px" }}>{rows.length || 0}</div>
          <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "1px", textTransform: "uppercase", marginTop: 2 }}>Top</div>
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
            <BrandMark size={20} barColor={t.wordmarkBarColor} />
            <span style={{ fontSize: 14, fontWeight: 900, letterSpacing: "2.6px", textTransform: "uppercase", color: "#B8860B" }}>
              Ngoma Charts
            </span>
          </div>
          <div
            style={{
              fontSize: typeLabel.length > 6 ? 34 : 40,
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: "-0.5px",
              color: t.titleColor,
              textTransform: "uppercase",
            }}
          >
            {typeLabel} in {countryLabel}
          </div>
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 17, fontWeight: 700, color: t.metaColor }}>
              {period === "all-time" ? "All Time" : month}
            </span>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: t.metaColor, opacity: 0.6 }} />
            <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: "0.6px", textTransform: "uppercase", color: accentColor }}>
              {period === "all-time" ? "All Time" : platformLabel(platform)}
            </span>
          </div>
        </div>
      </div>

      <div style={{ position: "absolute", top: headerH, left: padX, right: padX, zIndex: 1 }}>
        {rows.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: t.emptyColor, fontSize: 18, fontWeight: 700 }}>
            No chart data for this selection
          </div>
        ) : (
          rows.map((row, i) => {
            const peakText = row.peakStreak > 1 ? `#${row.peakRank} · ${row.peakStreak}mo` : `#${row.peakRank ?? "—"}`;
            return (
              <div
                key={`${row.rank}-${row.title}-${i}`}
                style={{
                  minHeight: rowH,
                  display: "flex",
                  alignItems: "center",
                  gap: Math.round(14 * Math.min(scale, 1.2)),
                  marginBottom: i === rows.length - 1 ? 0 : gap,
                  paddingBottom: i === rows.length - 1 ? 0 : gap,
                  borderBottom: i === rows.length - 1 ? "none" : `1px solid ${t.dividerColor}`,
                }}
              >
                <span
                  style={{
                    width: Math.round(40 * scale),
                    flexShrink: 0,
                    fontSize: Math.round(26 * scale),
                    fontWeight: 900,
                    color: row.rank <= 3 ? "#B8860B" : t.metaColor,
                    fontStyle: "italic",
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
                  <div
                    style={{
                      width: artSize,
                      height: artSize,
                      borderRadius: isArtists ? artSize / 2 : 10,
                      flexShrink: 0,
                      background: `linear-gradient(135deg, ${accentColor}AA, ${t.rowBg})`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: artSize * 0.36,
                      fontWeight: 900,
                      color: t.titleColor,
                    }}
                  >
                    {(row.title || "NG").slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: Math.round(20 * scale),
                      fontWeight: 800,
                      color: t.titleColor,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {row.title}
                  </div>
                  {row.subtitle && (
                    <div
                      style={{
                        fontSize: Math.round(15 * scale),
                        fontWeight: 600,
                        color: t.metaColor,
                        marginTop: 1,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {row.subtitle}
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: Math.round(12 * scale),
                      fontWeight: 800,
                      color: t.metaColor,
                      marginTop: Math.round(6 * scale),
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {row.monthsOnChart} mo · Peak {peakText}
                  </div>
                </div>
                {row.movement !== null && (
                  <span style={{ flexShrink: 0 }}>
                    <MovementChip movement={row.movement} sameColor={t.sameColor} scale={Math.min(scale, 1.3)} />
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: footerH,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: `0 ${padX}px`,
          borderTop: `1px solid ${t.footerBorder}`,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: t.footerPrimary }}>ngomacharts.com</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: t.footerSecondary }}>Kenya's official multi-platform music charts</span>
      </div>
    </div>
  );
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

  const accentColor = platformColor(effectivePlatform);
  const countryLabel = "Kenya";

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
              Exports at {POSTER_W}×{POSTER_H}px (4:5), 2× resolution — ready for Instagram/Facebook portrait posts.
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
                <PosterContent chartType={chartType} period={period} platform={effectivePlatform} month={month} rows={rows} accentColor={accentColor} countryLabel={countryLabel} theme={theme} />
              </div>
            </div>
          </div>

          {/* Off-screen full-resolution node — this is what actually gets rasterized.
              The visible preview above is a separately scaled copy so users see the
              real layout without the capture picking up the CSS scale transform. */}
          <div style={{ position: "fixed", top: 0, left: -99999, pointerEvents: "none" }} aria-hidden="true">
            <div ref={posterRef}>
              <PosterContent chartType={chartType} period={period} platform={effectivePlatform} month={month} rows={rows} accentColor={accentColor} countryLabel={countryLabel} theme={theme} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
