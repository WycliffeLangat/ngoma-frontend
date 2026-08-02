import { useEffect, useRef, useState } from "react";
import { cmsApi, getResults, qs } from "../api.js";
import {
  POSTER_W,
  POSTER_H,
  PREVIEW_W,
  PREVIEW_SCALE,
  POSTER_FONT_FAMILY,
  POSTER_THEMES,
  HEADER_ZONE_H,
  PosterBrandRow,
  PosterFooter,
  ArtPlaceholder,
  readableInk,
  exportNodeAsPng,
} from "../utils/exportPoster.jsx";

// Matches the public site's certification convention (NgomaCharts.jsx
// CERTIFICATION_LEVELS) rather than reinventing a palette for this card.
const CERT_META = {
  diamond: { emoji: "\u{1F48E}", color: "#7B1FA2", label: "Diamond" },
  platinum: { emoji: "\u{1F3B5}", color: "#868C97", label: "Platinum" },
  gold: { emoji: "\u{1F4C0}", color: "#B8860B", label: "Gold" },
};

const CERT_ORDER = ["diamond", "platinum", "gold"];

function formatCertDate(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString(undefined, { year: "numeric", month: "long" });
}

// Reads off /releases/ (song and album search merged) rather than the bare
// /certifications/ resource — the certifications endpoint doesn't carry
// cover art, only the release search does, and every certified release
// already echoes its own certifications array back on that endpoint (same
// field the Spotlight card already relies on).
function normalizeCertCandidate(row) {
  const certs = (row.certifications || []).map((c) => (typeof c === "string" ? { level: c } : c));
  const topCert = [...certs].sort(
    (a, b) => CERT_ORDER.indexOf(a.level) - CERT_ORDER.indexOf(b.level)
  )[0] || null;
  return {
    id: row.id,
    title: row.title || "",
    subtitle: row.artist_credit || row.artist_display || row.artist || "",
    image: row.cover_image || "",
    level: topCert?.level || null,
    points: Number(topCert?.total_points ?? row.total_points) || 0,
    certifiedDate: formatCertDate(topCert?.certification_date),
  };
}

function CertificationCardContent({ item, theme = "dark" }) {
  const t = POSTER_THEMES[theme] || POSTER_THEMES.dark;
  const padX = 64;

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
        Search and select a certified song or album to preview
      </div>
    );
  }

  const meta = CERT_META[item.level] || CERT_META.gold;
  const artSize = 460;
  const tileBg = theme === "light" ? "rgba(0,0,0,0.045)" : "rgba(255,255,255,0.055)";
  const tileBorder = theme === "light" ? "rgba(0,0,0,0.14)" : "rgba(255,255,255,0.16)";
  const headerH = HEADER_ZONE_H;
  const footerH = 74;

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
      <div
        style={{
          position: "absolute",
          top: -160,
          left: -160,
          width: 480,
          height: 480,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${meta.color}2E 0%, transparent 70%)`,
        }}
      />

      <div style={{ padding: `72px ${padX}px 0`, position: "relative", zIndex: 1 }}>
        <PosterBrandRow theme={theme} />
      </div>

      {/* Artwork + title/subtitle are vertically centered in their own
          zone, independent of the stat tiles pinned near the bottom — same
          pattern as the Spotlight card, so artwork never crowds the logo. */}
      <div
        style={{
          position: "absolute",
          top: headerH,
          bottom: 360,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: `0 ${padX}px`,
          zIndex: 1,
        }}
      >
        <div style={{ position: "relative", flexShrink: 0 }}>
          {item.image ? (
            <img
              src={item.image}
              alt=""
              style={{ width: artSize, height: artSize, borderRadius: 26, objectFit: "cover", boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}
            />
          ) : (
            <div style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.4)", borderRadius: 26 }}>
              <ArtPlaceholder width={artSize} height={artSize} radius={26} theme={theme} accentColor={meta.color} markSize={116} />
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: 48,
            fontSize: item.title.length > 22 ? 44 : item.title.length > 14 ? 52 : 60,
            fontWeight: 900,
            lineHeight: 1.12,
            letterSpacing: "-0.5px",
            color: t.titleColor,
            textAlign: "center",
            textTransform: "uppercase",
            maxWidth: 920,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {item.title}
        </div>
        {item.subtitle && (
          <div style={{ marginTop: 10, fontSize: 26, fontWeight: 700, color: t.metaColor, textAlign: "center" }}>
            {item.subtitle}
          </div>
        )}
      </div>

      {/* Stat tiles anchored a fixed distance above the footer. The left
          tile pairs the symbol with the "Level Certified" wording — the
          badge itself fills the slot a raw points count would otherwise
          take, since the badge is the thing worth celebrating. */}
      <div style={{ position: "absolute", bottom: 150, left: 0, right: 0, padding: `0 ${padX}px`, zIndex: 1 }}>
        <div style={{ borderTop: `2px solid ${t.dividerColor}`, marginBottom: 30 }} />
        <div style={{ display: "grid", gridTemplateColumns: item.certifiedDate ? "repeat(2, 1fr)" : "1fr", gap: 14 }}>
          <div style={{ background: tileBg, border: `1px solid ${tileBorder}`, borderRadius: 16, padding: "22px 8px", textAlign: "center" }}>
            <span style={{ fontSize: 92, lineHeight: 1, display: "block" }}>{meta.emoji}</span>
            <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: "0.5px", textTransform: "uppercase", color: meta.color, marginTop: 14 }}>
              {meta.label} Certified
            </div>
          </div>
          {item.certifiedDate && (
            <div style={{ background: tileBg, border: `1px solid ${tileBorder}`, borderRadius: 16, padding: "24px 8px", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ fontSize: 44, fontWeight: 900, color: meta.color }}>{item.certifiedDate}</div>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "0.5px", textTransform: "uppercase", color: t.metaColor, marginTop: 10 }}>
                Certified
              </div>
            </div>
          )}
        </div>
      </div>

      <PosterFooter theme={theme} padX={padX} />
    </div>
  );
}

export default function CertificationCardPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [exportError, setExportError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [theme, setTheme] = useState("dark");
  const posterRef = useRef(null);

  // Searches songs and albums in parallel and merges — so "any entry
  // eligible" means any certified song OR album, not just whichever type
  // a Type toggle happened to have selected. With no search text, browse
  // the most recent releases of each type instead of showing an empty list.
  useEffect(() => {
    const trimmed = query.trim();
    let active = true;
    setSearching(true);
    const timer = setTimeout(() => {
      const params = trimmed ? { search: trimmed, page_size: 24 } : { page_size: 24 };
      Promise.all([
        cmsApi.get(`/releases/${qs({ ...params, chart_type: "singles" })}`).catch(() => []),
        cmsApi.get(`/releases/${qs({ ...params, chart_type: "albums" })}`).catch(() => []),
      ])
        .then(([songs, albums]) => {
          if (!active) return;
          const eligible = [...getResults(songs), ...getResults(albums)]
            .map(normalizeCertCandidate)
            .filter((c) => c.level)
            .sort((a, b) => a.title.localeCompare(b.title));
          setResults(eligible);
        })
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
      await exportNodeAsPng(posterRef.current, `ngoma-certification-${selected.level}-${safeTitle || selected.id}-${theme}.png`);
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
          <h1>Certification Card Generator</h1>
          <p>Search a certified song or album and turn it into a 4:5 share card celebrating the Gold, Platinum, or Diamond award.</p>
        </div>
      </div>

      {error && <div className="cms-alert error">{error}</div>}
      {exportError && <div className="cms-alert error">{exportError}</div>}

      <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div className="cms-card" style={{ flex: "1 1 320px", minWidth: 280 }}>
          <div className="cms-card-heading"><h2>Find a certification</h2></div>

          <div style={{ display: "grid", gap: 14 }}>
            <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--cms-muted)" }}>
              Search
              <input
                className="cms-select"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search certified titles, or leave blank to browse all…"
              />
            </label>

            {searching && <div className="cms-help">Loading…</div>}
            {!searching && results.length === 0 && (
              <div className="cms-help">{query.trim() ? "No certified titles match that search." : "No active certifications yet."}</div>
            )}

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
                      : <span className="cms-chart-image cms-chart-image-empty">♪</span>}
                    <span style={{ minWidth: 0 }}>
                      <strong style={{ display: "block", fontSize: 13 }}>{candidate.title}</strong>
                      {candidate.subtitle && <small className="cms-row-subtitle">{candidate.subtitle} · {(CERT_META[candidate.level] || CERT_META.gold).label}</small>}
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
            {exporting ? "Generating…" : "Download certification card (PNG)"}
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
              <CertificationCardContent item={selected} theme={theme} />
            </div>
          </div>
        </div>

        {/* Off-screen full-resolution node — see PosterGeneratorPage.jsx for why
            this is rendered separately from the scaled-down visible preview. */}
        <div style={{ position: "fixed", top: 0, left: -99999, pointerEvents: "none" }} aria-hidden="true">
          <div ref={posterRef}>
            <CertificationCardContent item={selected} theme={theme} />
          </div>
        </div>
      </div>
    </section>
  );
}
