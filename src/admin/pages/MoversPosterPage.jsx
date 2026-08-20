import { useEffect, useMemo, useRef, useState } from "react";
import { fetchAppData } from "../../api/public";
import { buildMovementLists } from "../../utils/publicChartMirror.js";
import { resolveMediaUrl } from "../../api/config.js";
import {
  POSTER_W,
  POSTER_H,
  PREVIEW_W,
  PREVIEW_SCALE,
  POSTER_FONT_FAMILY,
  TITLE_GAP_FROM_LOGO,
  PosterBrandRow,
  PosterFooter,
  ArtPlaceholder,
  PosterCanvas,
  PosterSettingsPanel,
  defaultPosterSettings,
  usePosterTheme,
  exportNodeAsPng,
} from "../utils/exportPoster.jsx";

const CHART_TYPES = [
  ["singles", "Songs"],
  ["albums", "Albums"],
  ["artists", "Artists"],
];

const MOVES = [
  ["risers", "Climbers", "#2DB04A"],
  ["fallers", "Drops", "#E5484D"],
  ["newEntries", "New Entries", "#2DB04A"],
  ["reEntries", "Re-Entries", "#1565C0"],
];

function rowTitle(chartType, row) {
  return chartType === "artists" ? (row.name || "") : (row.t || row.title || "");
}
function rowArtist(chartType, row) {
  return chartType === "artists" ? "" : (row.artist_credit || row.a || row.artist || "");
}
function rowImage(chartType, row) {
  return chartType === "artists" ? (row.image || "") : (row.cover_image || "");
}
function rowBadge(move, row) {
  if (move === "newEntries") return "NEW";
  if (move === "reEntries") return "RE";
  if (move === "risers") return `▲ ${row.delta}`;
  return `▼ ${row.delta}`;
}
function rowRank(chartType, row) {
  return chartType === "artists" ? row.rank : (row.r ?? row.rank ?? row.to);
}

function PosterContent({ rows, chartType, move, month, theme = "dark" }) {
  const t = usePosterTheme(theme);
  const padX = 56;
  const [, moveLabel, accentColor] = MOVES.find(([value]) => value === move) || MOVES[0];
  const typeLabel = CHART_TYPES.find(([value]) => value === chartType)?.[1] || "Chart";
  const headerTitle = `${moveLabel} — ${typeLabel}`;
  const n = Math.max(rows.length, 1);
  const listTop = 340;
  const footerH = 74;
  const listH = POSTER_H - listTop - footerH;
  const gap = 16;
  const rowH = (listH - gap * (n - 1)) / n;
  const scale = Math.min(1.4, Math.max(0.65, rowH / 92));
  const artSize = Math.round(Math.min(80, Math.max(38, rowH - 16)));

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
        <div style={{ fontSize: headerTitle.length > 22 ? 40 : 48, fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.5px", color: t.titleColor, textTransform: "uppercase" }}>
          {headerTitle}
        </div>
        <div style={{ marginTop: 10, fontSize: 20, fontWeight: 700, color: accentColor, textTransform: "uppercase", letterSpacing: "0.6px" }}>
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
              key={`${rowTitle(chartType, row)}-${i}`}
              style={{
                height: rowH, boxSizing: "border-box", display: "flex", alignItems: "center",
                gap: Math.round(16 * scale), marginBottom: i === rows.length - 1 ? 0 : gap,
                borderBottom: i === rows.length - 1 ? "none" : `1px solid ${t.dividerColor}`,
              }}
            >
              <span style={{ width: Math.round(42 * scale), flexShrink: 0, fontSize: Math.round(30 * scale), fontWeight: 900, color: rowRank(chartType, row) <= 3 ? "#C97A12" : t.metaColor }}>
                #{rowRank(chartType, row)}
              </span>
              {rowImage(chartType, row) ? (
                <img
                  src={resolveMediaUrl(rowImage(chartType, row))}
                  alt=""
                  style={{
                    width: artSize, height: artSize,
                    borderRadius: chartType === "artists" ? artSize / 2 : 10,
                    objectFit: "cover", flexShrink: 0, background: t.rowBg,
                  }}
                />
              ) : (
                <ArtPlaceholder width={artSize} height={artSize} radius={chartType === "artists" ? artSize / 2 : 10} theme={theme} accentColor={accentColor} />
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: Math.round(26 * scale), fontWeight: 800, color: t.titleColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {rowTitle(chartType, row)}
                </div>
                {rowArtist(chartType, row) && (
                  <div style={{ fontSize: Math.round(17 * scale), fontWeight: 600, color: t.metaColor, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {rowArtist(chartType, row)}
                  </div>
                )}
              </div>
              <div
                style={{
                  flexShrink: 0, whiteSpace: "nowrap", padding: `${Math.round(6 * scale)}px ${Math.round(14 * scale)}px`, borderRadius: 999,
                  background: `${accentColor}22`, color: accentColor, fontWeight: 900, fontSize: Math.round(18 * scale),
                }}
              >
                {rowBadge(move, row)}
              </div>
            </div>
          ))
        )}
      </div>

      <PosterFooter theme={theme} padX={padX} />
    </div>
  );
}

export default function MoversPosterPage() {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportError, setExportError] = useState("");
  const [chartType, setChartType] = useState("singles");
  const [move, setMove] = useState("risers");
  const [month, setMonth] = useState("");
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
    const lists = buildMovementLists(payload, chartType, month);
    return lists[move] || [];
  }, [payload, chartType, move, month]);

  async function handleDownload() {
    if (!posterRef.current || exporting) return;
    setExporting(true);
    setExportError("");
    try {
      await exportNodeAsPng(posterRef.current, `ngoma-${move}-${chartType}-${month.replace(/\s+/g, "-").toLowerCase()}-${theme}.png`);
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
          <h1>Movers &amp; Shakers Poster</h1>
          <p>Turn Climbers, Drops, New Entries, or Re-Entries into a 4:5 share card.</p>
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
                Movement
                <div className="cms-pill-bar" style={{ marginBottom: 0 }}>
                  {MOVES.map(([value, label]) => (
                    <button key={value} type="button" className={`cms-btn small ${move === value ? "" : "light"}`} onClick={() => setMove(value)}>
                      {label}
                    </button>
                  ))}
                </div>
              </label>

              <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--cms-muted)" }}>
                Month
                <input
                  className="cms-select" type="text" list="movers-months-list"
                  value={month} onChange={(e) => setMonth(e.target.value)} placeholder="Search months…"
                />
                <datalist id="movers-months-list">
                  {months.map((m) => <option key={m} value={m} />)}
                </datalist>
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
                  <PosterContent rows={rows} chartType={chartType} move={move} month={month} theme={theme} />
                </PosterCanvas>
              </div>
            </div>
          </div>

          <div style={{ position: "fixed", top: 0, left: -99999, pointerEvents: "none" }} aria-hidden="true">
            <div ref={posterRef}>
              <PosterCanvas settings={posterSettings} theme={theme}>
                <PosterContent rows={rows} chartType={chartType} move={move} month={month} theme={theme} />
              </PosterCanvas>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
