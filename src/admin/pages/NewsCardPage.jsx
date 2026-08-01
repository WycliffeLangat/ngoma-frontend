import { useEffect, useRef, useState } from "react";
import { cmsApi, getResults, qs } from "../api.js";
import {
  POSTER_W,
  POSTER_H,
  PREVIEW_W,
  PREVIEW_SCALE,
  POSTER_FONT_FAMILY,
  POSTER_THEMES,
  PosterBrandRow,
  PosterFooter,
  readableInk,
  exportNodeAsPng,
} from "../utils/exportPoster.jsx";

const GOLD = "#B8860B";

function normalizeArticle(row) {
  const dateValue = row.published_at || row.updated_at || row.created_at || "";
  let dateLabel = "";
  if (dateValue) {
    const parsed = new Date(dateValue);
    if (!Number.isNaN(parsed.getTime())) {
      dateLabel = parsed.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
    }
  }
  return {
    id: row.id,
    title: row.title || "",
    subtitle: row.subheadline || "",
    image: row.cover_image || "",
    category: String(row.category || "").replace(/_/g, " "),
    author: row.author || "",
    excerpt: row.excerpt || "",
    dateLabel,
  };
}

function NewsCardContent({ item, theme = "dark" }) {
  const t = POSTER_THEMES[theme] || POSTER_THEMES.dark;
  const padX = 56;

  if (!item) {
    return (
      <div
        style={{
          width: POSTER_W,
          height: POSTER_H,
          background: t.pageBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: t.emptyColor,
          fontFamily: POSTER_FONT_FAMILY,
          fontSize: 22,
          fontWeight: 700,
          textAlign: "center",
          padding: 64,
        }}
      >
        Search and select a news article to preview
      </div>
    );
  }

  const heroH = 620;

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
      <div style={{ padding: `72px ${padX}px 0`, position: "relative", zIndex: 1 }}>
        <PosterBrandRow theme={theme} />
      </div>

      <div style={{ marginTop: 24, padding: `0 ${padX}px`, position: "relative", zIndex: 1 }}>
        {item.image ? (
          <img
            src={item.image}
            alt=""
            style={{ width: "100%", height: heroH, borderRadius: 22, objectFit: "cover", display: "block" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: heroH,
              borderRadius: 22,
              background: `linear-gradient(135deg, ${GOLD}AA, ${t.rowBg})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 100,
              fontWeight: 900,
              color: t.titleColor,
            }}
          >
            {(item.title || "NG").slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>

      {/* The headline group and the byline are two children of one
          space-between flex column spanning the rest of the card, so a
          short excerpt (or none at all) doesn't leave one big dead gap
          before the footer — the byline stays anchored just above it. */}
      <div
        style={{
          position: "absolute",
          top: 72 + 30 + 24 + heroH,
          bottom: 74,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: `22px ${padX}px`,
          zIndex: 1,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            {item.category && (
              <span
                style={{
                  padding: "6px 16px",
                  borderRadius: 999,
                  background: GOLD,
                  color: readableInk(GOLD),
                  fontSize: 14,
                  fontWeight: 900,
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                }}
              >
                {item.category}
              </span>
            )}
            {item.dateLabel && <span style={{ fontSize: 16, fontWeight: 700, color: t.metaColor }}>{item.dateLabel}</span>}
          </div>

          <div
            style={{
              marginTop: 18,
              fontSize: item.title.length > 60 ? 36 : item.title.length > 36 ? 42 : 48,
              fontWeight: 900,
              lineHeight: 1.14,
              letterSpacing: "-0.5px",
              color: t.titleColor,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {item.title}
          </div>

          {(item.subtitle || item.excerpt) && (
            <div
              style={{
                marginTop: 14,
                fontSize: 21,
                fontWeight: 600,
                lineHeight: 1.5,
                color: t.metaColor,
                display: "-webkit-box",
                WebkitLineClamp: 4,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {item.subtitle || item.excerpt}
            </div>
          )}
        </div>

        {item.author && (
          <div style={{ fontSize: 16, fontWeight: 700, color: t.metaColor }}>
            By {item.author}
          </div>
        )}
      </div>

      <PosterFooter theme={theme} padX={padX} />
    </div>
  );
}

export default function NewsCardPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [exportError, setExportError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [theme, setTheme] = useState("dark");
  const posterRef = useRef(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) { setResults([]); return; }
    let active = true;
    setSearching(true);
    const timer = setTimeout(() => {
      cmsApi.get(`/news/${qs({ search: trimmed, page_size: 8 })}`)
        .then((data) => { if (active) setResults(getResults(data).map(normalizeArticle)); })
        .catch((err) => { if (active) setError(err.message || "Search failed"); })
        .finally(() => { if (active) setSearching(false); });
    }, 280);
    return () => { active = false; clearTimeout(timer); };
  }, [query]);

  async function handleDownload() {
    if (!posterRef.current || !selected || exporting) return;
    setExporting(true);
    setExportError("");
    try {
      const safeTitle = String(selected.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      await exportNodeAsPng(posterRef.current, `ngoma-news-${safeTitle || selected.id}-${theme}.png`);
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
          <h1>News Card Generator</h1>
          <p>Search for a published news article and turn it into a 4:5 share card.</p>
        </div>
      </div>

      {error && <div className="cms-alert error">{error}</div>}
      {exportError && <div className="cms-alert error">{exportError}</div>}

      <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div className="cms-card" style={{ flex: "1 1 320px", minWidth: 280 }}>
          <div className="cms-card-heading"><h2>Find an article</h2></div>

          <div style={{ display: "grid", gap: 14 }}>
            <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--cms-muted)" }}>
              Search
              <input
                className="cms-select"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search headlines…"
              />
            </label>

            {searching && <div className="cms-help">Searching…</div>}

            {results.length > 0 && (
              <div style={{ display: "grid", gap: 6, maxHeight: 320, overflowY: "auto" }}>
                {results.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => setSelected(candidate)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: `1px solid ${selected?.id === candidate.id ? "var(--cms-gold)" : "var(--cms-line)"}`,
                      background: selected?.id === candidate.id ? "var(--cms-gold-soft)" : "#fff",
                      cursor: "pointer",
                      textAlign: "left",
                      font: "inherit",
                    }}
                  >
                    {candidate.image
                      ? <img src={candidate.image} alt="" className="cms-chart-image" />
                      : <span className="cms-chart-image cms-chart-image-empty">N</span>}
                    <span style={{ minWidth: 0 }}>
                      <strong style={{ display: "block", fontSize: 13 }}>{candidate.title}</strong>
                      {candidate.category && <small className="cms-row-subtitle">{candidate.category}</small>}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--cms-muted)" }}>
              Card theme
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
            disabled={exporting || !selected}
          >
            {exporting ? "Generating…" : "Download news card (PNG)"}
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
              <NewsCardContent item={selected} theme={theme} />
            </div>
          </div>
        </div>

        <div style={{ position: "fixed", top: 0, left: -99999, pointerEvents: "none" }} aria-hidden="true">
          <div ref={posterRef}>
            <NewsCardContent item={selected} theme={theme} />
          </div>
        </div>
      </div>
    </section>
  );
}
