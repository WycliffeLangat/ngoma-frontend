import { useEffect, useRef, useState } from "react";
import { cmsApi, getResults, qs } from "../api.js";
import {
  POSTER_W,
  POSTER_H,
  PREVIEW_W,
  PREVIEW_SCALE,
  POSTER_FONT_FAMILY,
  HEADER_ZONE_H,
  PosterBrandRow,
  PosterFooter,
  ArtPlaceholder,
  readableInk,
  PosterCanvas,
  PosterSettingsPanel,
  defaultPosterSettings,
  usePosterTheme,
  exportNodeAsPng,
} from "../utils/exportPoster.jsx";

const TYPES = [
  ["songs", "Song"],
  ["albums", "Album"],
  ["artists", "Artist"],
];

const CERT_COLORS = { gold: "#C97A12", platinum: "#8C97A8", diamond: "#4FC3F7" };
const CERT_ORDER = ["diamond", "platinum", "gold"];

// The releases/artists list endpoints already return peak_rank/total_points/
// months_on_chart/cover_image etc. directly on each row (same fields the
// CMS's own resource detail panel reads) — no extra per-record fetch needed.
function normalizeCandidate(type, row) {
  if (type === "artists") {
    return {
      id: row.id,
      title: row.display_name || row.name || "",
      subtitle: [row.country, row.genre].filter(Boolean).join(" · "),
      image: row.image || "",
      peakRank: row.peak_rank,
      points: Number(row.total_points) || 0,
      monthsOnChart: row.months_on_chart ?? 0,
      secondaryStatLabel: "Releases",
      secondaryStatValue: row.total_releases ?? 0,
      certifications: [],
      isArtist: true,
    };
  }
  return {
    id: row.id,
    title: row.title || "",
    subtitle: row.artist_credit || row.artist_display || "",
    image: row.cover_image || "",
    peakRank: row.peak_rank,
    points: Number(row.total_points) || 0,
    monthsOnChart: row.months_on_chart ?? 0,
    secondaryStatLabel: "Entries",
    secondaryStatValue: row.entry_count ?? "—",
    certifications: (row.certifications || []).map((c) => (typeof c === "string" ? c : c.level)),
    isArtist: false,
  };
}

function SpotlightContent({ item, type, theme = "dark" }) {
  const t = usePosterTheme(theme);
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
        Search and select {type === "artists" ? "an artist" : "a release"} to preview
      </div>
    );
  }

  const topCert = CERT_ORDER.find((level) => item.certifications.includes(level)) || null;
  const certColor = topCert ? CERT_COLORS[topCert] : "#C97A12";
  const artSize = 560;
  const tileBg = theme === "light" ? "rgba(0,0,0,0.045)" : "rgba(255,255,255,0.055)";
  const tileBorder = theme === "light" ? "rgba(0,0,0,0.14)" : "rgba(255,255,255,0.16)";

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

      {/* The identity block (art/title/subtitle) is vertically centered in
          its own zone above the logo-to-stats midsection, independent of
          the stat tiles pinned near the bottom — so the artwork always
          sits in the visual middle of the card instead of drifting up
          against the logo when content is short. */}
      <div
        style={{
          position: "absolute",
          top: HEADER_ZONE_H,
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
              style={{
                width: artSize,
                height: artSize,
                borderRadius: item.isArtist ? artSize / 2 : 26,
                objectFit: "cover",
                boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
              }}
            />
          ) : (
            <div style={{ boxShadow: "0 30px 80px rgba(0,0,0,0.45)", borderRadius: item.isArtist ? artSize / 2 : 26 }}>
              <ArtPlaceholder
                width={artSize}
                height={artSize}
                radius={item.isArtist ? artSize / 2 : 26}
                theme={theme}
                accentColor={certColor}
                markSize={140}
              />
            </div>
          )}
          {topCert && (
            <div
              style={{
                position: "absolute",
                bottom: -16,
                left: "50%",
                transform: "translateX(-50%)",
                padding: "9px 24px",
                borderRadius: 999,
                background: certColor,
                color: readableInk(certColor),
                fontSize: 20,
                fontWeight: 900,
                letterSpacing: "2px",
                textTransform: "uppercase",
                boxShadow: `0 10px 30px ${certColor}55`,
                whiteSpace: "nowrap",
              }}
            >
              {topCert} Certified
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: topCert ? 48 : 32,
            fontSize: item.title.length > 22 ? 44 : item.title.length > 14 ? 52 : 60,
            fontWeight: 900,
            lineHeight: 1.12,
            letterSpacing: "-1px",
            color: t.titleColor,
            textAlign: "center",
            textTransform: "uppercase",
            maxWidth: 960,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {item.title}
        </div>
        {item.subtitle && (
          <div style={{ marginTop: 14, fontSize: 30, fontWeight: 700, color: t.metaColor, textAlign: "center" }}>
            {item.subtitle}
          </div>
        )}
      </div>

      {/* Stat tiles are anchored a fixed distance above the footer — at
          least ~2cm (76px) of clear air below them — instead of trailing
          the identity block, so they read as a distinct "details" strip. */}
      <div style={{ position: "absolute", bottom: 150, left: 0, right: 0, padding: `0 ${padX}px`, zIndex: 1 }}>
        <div style={{ borderTop: `2px solid ${t.dividerColor}`, marginBottom: 30 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          {[
            ["Peak Rank", item.peakRank ? `#${item.peakRank}` : "—"],
            ["Total Points", item.points ? item.points.toLocaleString() : "0"],
            ["Months Charted", item.monthsOnChart],
            [item.secondaryStatLabel, item.secondaryStatValue],
          ].map(([label, value]) => (
            <div key={label} style={{ background: tileBg, border: `1px solid ${tileBorder}`, borderRadius: 16, padding: "24px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 50, fontWeight: 900, color: "#C97A12" }}>{value}</div>
              <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "0.5px", textTransform: "uppercase", color: t.metaColor, marginTop: 8 }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <PosterFooter theme={theme} padX={padX} />
    </div>
  );
}

export default function SpotlightGeneratorPage() {
  const [type, setType] = useState("songs");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [exportError, setExportError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [posterSettings, setPosterSettings] = useState(() => defaultPosterSettings());
  const posterRef = useRef(null);

  useEffect(() => {
    setSelected(null);
    setResults([]);
    setQuery("");
    setError("");
  }, [type]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) { setResults([]); return; }
    let active = true;
    setSearching(true);
    const timer = setTimeout(() => {
      const endpoint = type === "artists" ? "/artists/" : "/releases/";
      const params = type === "artists"
        ? { search: trimmed, page_size: 8 }
        : { chart_type: type === "albums" ? "albums" : "singles", search: trimmed, page_size: 8 };
      cmsApi.get(`${endpoint}${qs(params)}`)
        .then((data) => { if (active) setResults(getResults(data).map((row) => normalizeCandidate(type, row))); })
        .catch((err) => { if (active) setError(err.message || "Search failed"); })
        .finally(() => { if (active) setSearching(false); });
    }, 280);
    return () => { active = false; clearTimeout(timer); };
  }, [type, query]);

  async function handleDownload() {
    if (!posterRef.current || !selected || exporting) return;
    setExporting(true);
    setExportError("");
    try {
      const safeTitle = String(selected.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      await exportNodeAsPng(posterRef.current, `ngoma-spotlight-${type}-${safeTitle || selected.id}-${theme}.png`);
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
          <h1>Spotlight Card Generator</h1>
          <p>Search for one song, album, or artist and turn it into a 4:5 share card with its chart stats.</p>
        </div>
      </div>

      {error && <div className="cms-alert error">{error}</div>}
      {exportError && <div className="cms-alert error">{exportError}</div>}

      <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div className="cms-card" style={{ flex: "1 1 320px", minWidth: 280 }}>
          <div className="cms-card-heading"><h2>Find a record</h2></div>

          <div style={{ display: "grid", gap: 14 }}>
            <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--cms-muted)" }}>
              Type
              <div className="cms-pill-bar" style={{ marginBottom: 0 }}>
                {TYPES.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`cms-btn small ${type === value ? "" : "light"}`}
                    onClick={() => setType(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </label>

            <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--cms-muted)" }}>
              Search
              <input
                className="cms-select"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={type === "artists" ? "Search artists…" : "Search titles…"}
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
                      : <span className="cms-chart-image cms-chart-image-empty">{type === "artists" ? "A" : "♪"}</span>}
                    <span style={{ minWidth: 0 }}>
                      <strong style={{ display: "block", fontSize: 13 }}>{candidate.title}</strong>
                      {candidate.subtitle && <small className="cms-row-subtitle">{candidate.subtitle}</small>}
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
            disabled={exporting || !selected}
          >
            {exporting ? "Generating…" : "Download spotlight card (PNG)"}
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
                <SpotlightContent item={selected} type={type} theme={theme} />
              </PosterCanvas>
            </div>
          </div>
        </div>

        {/* Off-screen full-resolution node — see PosterGeneratorPage.jsx for why
            this is rendered separately from the scaled-down visible preview. */}
        <div style={{ position: "fixed", top: 0, left: -99999, pointerEvents: "none" }} aria-hidden="true">
          <div ref={posterRef}>
            <PosterCanvas settings={posterSettings} theme={theme}>
              <SpotlightContent item={selected} type={type} theme={theme} />
            </PosterCanvas>
          </div>
        </div>
      </div>
    </section>
  );
}
