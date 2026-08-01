import { useEffect, useMemo, useRef, useState } from "react";
import { fetchAppData } from "../../api/public";
import { resolveMediaUrl } from "../../api/config.js";
import { publicChartRows, buildArtistMonthMirror, buildYearEndMirror } from "../../utils/publicChartMirror.js";
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

function normalizeRows(chartType, rawRows) {
  if (chartType === "artists") {
    return rawRows.map((row) => ({
      rank: row.rank,
      title: row.name,
      subtitle: "",
      image: resolveMediaUrl(row.image || ""),
      points: Number(row.points) || 0,
    }));
  }
  return rawRows.map((row) => ({
    rank: row.r ?? row.rank,
    title: row.t || row.title || "",
    subtitle: row.artist_credit || row.a || row.artist || "",
    image: resolveMediaUrl(row.cover_image || ""),
    points: Number(row.p ?? row.pts ?? row.total_points ?? 0),
  }));
}

// buildYearEndMirror() rows use a different field naming convention than the
// monthly mirrors (row.title/row.artist/row.name rather than row.t/row.a),
// so this gets its own normalizer instead of overloading normalizeRows().
function normalizeYearEndRows(chartType, rawRows) {
  if (chartType === "artists") {
    return rawRows.map((row) => ({
      rank: row.rank,
      title: row.name || "",
      subtitle: "",
      image: resolveMediaUrl(row.image || ""),
      points: Number(row.points) || 0,
    }));
  }
  return rawRows.map((row) => ({
    rank: row.rank,
    title: row.title || "",
    subtitle: row.artist || "",
    image: resolveMediaUrl(row.image || ""),
    points: Number(row.points) || 0,
  }));
}

function PosterContent({ chartType, period, platform, month, rows, accentColor }) {
  const headerH = 224;
  const footerH = 74;
  const padX = 64;
  const listH = POSTER_H - headerH - footerH;
  const gap = 8;
  const n = Math.max(rows.length, 1);
  const rowH = (listH - gap * (n - 1)) / n;
  const artSize = Math.max(36, Math.min(76, rowH - 16));
  const isArtists = chartType === "artists";
  const chartLabel = CHART_TYPES.find(([key]) => key === chartType)?.[1] || "Chart";

  return (
    <div
      style={{
        width: POSTER_W,
        height: POSTER_H,
        boxSizing: "border-box",
        background: "linear-gradient(160deg, #0b0b0b 0%, #050505 55%, #10130f 100%)",
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        color: "#F6F3EA",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -140,
          right: -140,
          width: 420,
          height: 420,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accentColor}33 0%, transparent 70%)`,
        }}
      />

      <div style={{ padding: `56px ${padX}px 0`, position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 26 }}>
          <div style={{ width: 28, height: 3, background: "#B8860B", borderRadius: 2 }} />
          <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: "3px", textTransform: "uppercase", color: "#B8860B" }}>
            Ngoma Charts
          </span>
        </div>
        <div style={{ fontSize: 76, fontWeight: 900, lineHeight: 1, letterSpacing: "-2px", color: "#FFFFFF" }}>
          TOP {rows.length || 0}
        </div>
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: "#F6F3EA" }}>{chartLabel}</span>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#5A625A" }} />
          <span style={{ fontSize: 22, fontWeight: 700, color: "#AEB6AE" }}>
            {period === "all-time" ? "All Time" : month}
          </span>
          <span
            style={{
              marginLeft: "auto",
              padding: "6px 16px",
              borderRadius: 999,
              background: accentColor,
              color: readableInk(accentColor),
              fontSize: 14,
              fontWeight: 900,
              letterSpacing: "1px",
              textTransform: "uppercase",
            }}
          >
            {period === "all-time" ? "All Time" : platformLabel(platform)}
          </span>
        </div>
      </div>

      <div style={{ position: "absolute", top: headerH, left: padX, right: padX, zIndex: 1 }}>
        {rows.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#5A625A", fontSize: 18, fontWeight: 700 }}>
            No chart data for this selection
          </div>
        ) : (
          rows.map((row, i) => (
            <div
              key={`${row.rank}-${row.title}-${i}`}
              style={{
                height: rowH,
                display: "flex",
                alignItems: "center",
                gap: 18,
                marginBottom: i === rows.length - 1 ? 0 : gap,
                borderBottom: i === rows.length - 1 ? "none" : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div
                style={{
                  width: 44,
                  flexShrink: 0,
                  textAlign: "center",
                  fontSize: row.rank <= 3 ? 30 : 24,
                  fontWeight: 900,
                  color: row.rank === 1 ? "#B8860B" : row.rank === 2 ? "#C7CCC6" : row.rank === 3 ? "#B8794A" : "#5A625A",
                }}
              >
                {row.rank}
              </div>
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
                    background: "#151815",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: artSize,
                    height: artSize,
                    borderRadius: isArtists ? artSize / 2 : 10,
                    flexShrink: 0,
                    background: `linear-gradient(135deg, ${accentColor}99, #151815)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: artSize * 0.36,
                    fontWeight: 900,
                    color: "#fff",
                  }}
                >
                  {(row.title || "NG").slice(0, 2).toUpperCase()}
                </div>
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: Math.min(26, rowH * 0.34),
                    fontWeight: 800,
                    color: "#FFFFFF",
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
                      fontSize: Math.min(18, rowH * 0.24),
                      fontWeight: 600,
                      color: "#8F968F",
                      marginTop: 2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {row.subtitle}
                  </div>
                )}
              </div>
              {row.points > 0 && (
                <div style={{ flexShrink: 0, textAlign: "right", fontSize: Math.min(16, rowH * 0.2), fontWeight: 800, color: "#B8860B" }}>
                  {row.points.toLocaleString()}
                  <div style={{ fontSize: 10, color: "#5A625A", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase" }}>
                    pts
                  </div>
                </div>
              )}
            </div>
          ))
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
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: "#8F968F" }}>ngomacharts.com</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#5A625A" }}>Kenya's official multi-platform music charts</span>
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
    if (chartType === "artists") {
      return normalizeRows("artists", buildArtistMonthMirror(payload, month, platform).slice(0, count));
    }
    return normalizeRows(chartType, publicChartRows(payload, chartType, month, platform).slice(0, count));
  }, [payload, chartType, period, platform, month, count]);

  const accentColor = platformColor(effectivePlatform);

  async function handleDownload() {
    if (!posterRef.current || exporting) return;
    setExporting(true);
    setExportError("");
    try {
      const safePeriod = period === "all-time" ? "all-time" : String(month).replace(/\s+/g, "-").toLowerCase();
      const safePlatform = String(effectivePlatform).replace(/\s+/g, "-").toLowerCase();
      await exportNodeAsPng(posterRef.current, `ngoma-top-${rows.length}-${chartType}-${safePlatform}-${safePeriod}.png`);
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
                <PosterContent chartType={chartType} period={period} platform={effectivePlatform} month={month} rows={rows} accentColor={accentColor} />
              </div>
            </div>
          </div>

          {/* Off-screen full-resolution node — this is what actually gets rasterized.
              The visible preview above is a separately scaled copy so users see the
              real layout without the capture picking up the CSS scale transform. */}
          <div style={{ position: "fixed", top: 0, left: -99999, pointerEvents: "none" }} aria-hidden="true">
            <div ref={posterRef}>
              <PosterContent chartType={chartType} platform={platform} month={month} rows={rows} accentColor={accentColor} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
