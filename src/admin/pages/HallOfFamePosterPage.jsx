import { useEffect, useMemo, useRef, useState } from "react";
import { fetchAppData } from "../../api/public";
import { buildHallOfFameItems } from "../../utils/publicChartMirror.js";
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
  exportNodeAsPng,
} from "../utils/exportPoster.jsx";

const CHART_TYPES = [
  ["singles", "Songs"],
  ["albums", "Albums"],
  ["artists", "Artists"],
];

const GOLD = "#B8860B";

function itemTitle(chartType, item) {
  return chartType === "artists" ? (item.name || "") : (item.t || item.title || "");
}
function itemArtist(chartType, item) {
  return chartType === "artists" ? "" : (item.artist_credit || item.a || item.artist || "");
}
function itemImage(chartType, item) {
  return chartType === "artists" ? (item.image || "") : (item.cover_image || "");
}

function PosterContent({ items, chartType, theme = "dark" }) {
  const t = POSTER_THEMES[theme] || POSTER_THEMES.dark;
  const padX = 56;
  const typeLabel = CHART_TYPES.find(([value]) => value === chartType)?.[1] || "Chart";
  const headerTitle = `Hall of Fame — ${typeLabel}`;
  const cols = 2;
  const gridTop = 340;
  const footerH = 74;
  const gridH = POSTER_H - gridTop - footerH;
  const gap = 18;
  const shown = Math.min(items.length, cols * 4);
  const rows = Math.max(Math.ceil(shown / cols), 1);
  const cardW = (POSTER_W - padX * 2 - gap * (cols - 1)) / cols;
  const cardH = (gridH - gap * (rows - 1)) / rows;
  // Reserve room for title + artist + month label + padding/gaps below the
  // artwork (~150px), not just an arbitrary sliver — otherwise the text gets
  // squeezed to near-zero height and silently disappears. Art itself is
  // capped so a sparse month (few Hall of Fame entries) doesn't blow the
  // cover art up to absurd size — the leftover room goes to text scale
  // instead (cardScale below), not the image.
  const artSize = Math.max(60, Math.min(cardH - 150, cardW - 32, 220));
  // When a card gets taller than the ~260px baseline (few entries that
  // month, more room per card), scale its text up to use the space instead
  // of leaving it blank under a fixed-size title/artist/month block.
  const cardScale = Math.min(1.8, Math.max(0.8, cardH / 260));

  return (
    <div
      style={{
        width: POSTER_W, height: POSTER_H, boxSizing: "border-box",
        background: t.pageBg, fontFamily: POSTER_FONT_FAMILY, color: t.titleColor,
        position: "relative", overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: -180, left: -120, width: 460, height: 460, borderRadius: "50%", background: `radial-gradient(circle, ${GOLD}2E 0%, transparent 70%)` }} />

      <div style={{ padding: `56px ${padX}px 0`, position: "relative", zIndex: 1 }}>
        <PosterBrandRow theme={theme} />
      </div>

      <div style={{ padding: `${TITLE_GAP_FROM_LOGO}px ${padX}px 0`, position: "relative", zIndex: 1, textAlign: "center" }}>
        <div style={{ fontSize: headerTitle.length > 22 ? 40 : 48, fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.5px", color: t.titleColor, textTransform: "uppercase" }}>
          {headerTitle}
        </div>
        <div style={{ marginTop: 10, fontSize: 18, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.6px" }}>
          Monthly #1s
        </div>
      </div>

      <div style={{ position: "absolute", top: gridTop, left: padX, right: padX, bottom: footerH, zIndex: 1, display: "flex", flexWrap: "wrap", gap, alignContent: "flex-start" }}>
        {items.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", color: t.emptyColor, fontSize: 22, fontWeight: 700, textAlign: "center" }}>
            No #1s recorded yet
          </div>
        ) : (
          items.slice(0, cols * 4).map((item, i) => {
            const months = item.hofMonths || [];
            const monthLabel = months.length > 1 ? `${months.length} months at #1` : (months[0] || "");
            return (
              <div
                key={`${itemTitle(chartType, item)}-${i}`}
                style={{
                  width: cardW, height: cardH, boxSizing: "border-box", padding: 16, borderRadius: 14,
                  background: t.rowBg, display: "flex", flexDirection: "column", alignItems: "center",
                  justifyContent: "center", gap: 8, textAlign: "center",
                }}
              >
                {itemImage(chartType, item) ? (
                  <img
                    src={resolveMediaUrl(itemImage(chartType, item))}
                    alt=""
                    style={{ width: artSize, height: artSize, borderRadius: chartType === "artists" ? artSize / 2 : 10, objectFit: "cover" }}
                  />
                ) : (
                  <ArtPlaceholder width={artSize} height={artSize} radius={chartType === "artists" ? artSize / 2 : 10} theme={theme} accentColor={GOLD} />
                )}
                <div style={{ fontSize: Math.round(20 * cardScale), fontWeight: 800, color: t.titleColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
                  {itemTitle(chartType, item)}
                </div>
                {itemArtist(chartType, item) && (
                  <div style={{ fontSize: Math.round(14 * cardScale), fontWeight: 600, color: t.metaColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
                    {itemArtist(chartType, item)}
                  </div>
                )}
                <div style={{ fontSize: Math.round(12 * cardScale), fontWeight: 900, letterSpacing: "0.6px", textTransform: "uppercase", color: GOLD }}>
                  {monthLabel}
                </div>
              </div>
            );
          })
        )}
      </div>

      <PosterFooter theme={theme} padX={padX} />
    </div>
  );
}

export default function HallOfFamePosterPage() {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportError, setExportError] = useState("");
  const [chartType, setChartType] = useState("singles");
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

  const items = useMemo(() => {
    if (!payload) return [];
    return buildHallOfFameItems(payload, chartType);
  }, [payload, chartType]);

  async function handleDownload() {
    if (!posterRef.current || exporting) return;
    setExporting(true);
    setExportError("");
    try {
      await exportNodeAsPng(posterRef.current, `ngoma-hall-of-fame-${chartType}-${theme}.png`);
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
          <h1>Hall of Fame Poster</h1>
          <p>Turn the Monthly #1s Hall of Fame into a 4:5 share card.</p>
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
                Card theme
                <div className="cms-pill-bar" style={{ marginBottom: 0 }}>
                  {[["dark", "Dark"], ["light", "Light"]].map(([value, label]) => (
                    <button key={value} type="button" className={`cms-btn small ${theme === value ? "" : "light"}`} onClick={() => setTheme(value)}>
                      {label}
                    </button>
                  ))}
                </div>
              </label>
            </div>

            <button type="button" className="cms-btn full" style={{ marginTop: 20 }} onClick={handleDownload} disabled={exporting || !items.length}>
              {exporting ? "Generating…" : "Download card (PNG)"}
            </button>
            <p className="cms-help" style={{ marginTop: 10 }}>
              Exports at {POSTER_W}×{POSTER_H}px (4:5), 2× resolution — ready for Instagram/Facebook portrait posts. Shows up to 8 of the most recent Hall of Fame entries.
            </p>
          </div>

          <div style={{ flex: "0 0 auto" }}>
            <div style={{ width: PREVIEW_W, height: PREVIEW_W * (POSTER_H / POSTER_W), overflow: "hidden", borderRadius: 18, border: "1px solid var(--cms-line)", boxShadow: "0 20px 50px rgba(20,16,4,.18)" }}>
              <div style={{ width: POSTER_W, height: POSTER_H, transform: `scale(${PREVIEW_SCALE})`, transformOrigin: "top left" }}>
                <PosterContent items={items} chartType={chartType} theme={theme} />
              </div>
            </div>
          </div>

          <div style={{ position: "fixed", top: 0, left: -99999, pointerEvents: "none" }} aria-hidden="true">
            <div ref={posterRef}>
              <PosterContent items={items} chartType={chartType} theme={theme} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
