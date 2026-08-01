import { useEffect, useRef, useState } from "react";
import { cmsApi, getResults, qs } from "../api.js";
import { POSTER_W, POSTER_H, PREVIEW_W, PREVIEW_SCALE, readableInk, exportNodeAsPng } from "../utils/exportPoster.js";

const TYPES = [
  ["songs", "Song"],
  ["albums", "Album"],
  ["artists", "Artist"],
];

const CERT_COLORS = { gold: "#B8860B", platinum: "#8C97A8", diamond: "#4FC3F7" };
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

function SpotlightContent({ item, type }) {
  if (!item) {
    return (
      <div
        style={{
          width: POSTER_W,
          height: POSTER_H,
          background: "#050505",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#5A625A",
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
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
  const certColor = topCert ? CERT_COLORS[topCert] : "#B8860B";
  const artSize = 620;

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
          top: -160,
          left: -160,
          width: 480,
          height: 480,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${certColor}2E 0%, transparent 70%)`,
        }}
      />

      <div style={{ padding: "48px 64px 0", position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 28, height: 3, background: "#B8860B", borderRadius: 2 }} />
        <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: "3px", textTransform: "uppercase", color: "#B8860B" }}>
          Ngoma Charts
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 36, position: "relative", zIndex: 1, padding: "0 64px" }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          {item.image ? (
            <img
              src={item.image}
              alt=""
              style={{
                width: artSize,
                height: artSize,
                borderRadius: item.isArtist ? artSize / 2 : 28,
                objectFit: "cover",
                boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
              }}
            />
          ) : (
            <div
              style={{
                width: artSize,
                height: artSize,
                borderRadius: item.isArtist ? artSize / 2 : 28,
                background: `linear-gradient(135deg, ${certColor}CC, #151815)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 120,
                fontWeight: 900,
                color: "#fff",
                boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
              }}
            >
              {(item.title || "NG").slice(0, 2).toUpperCase()}
            </div>
          )}
          {topCert && (
            <div
              style={{
                position: "absolute",
                bottom: -14,
                left: "50%",
                transform: "translateX(-50%)",
                padding: "9px 24px",
                borderRadius: 999,
                background: certColor,
                color: readableInk(certColor),
                fontSize: 15,
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
            marginTop: topCert ? 46 : 30,
            fontSize: item.title.length > 22 ? 38 : item.title.length > 14 ? 46 : 52,
            fontWeight: 900,
            lineHeight: 1.1,
            letterSpacing: "-1px",
            color: "#FFFFFF",
            textAlign: "center",
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
          <div style={{ marginTop: 10, fontSize: 26, fontWeight: 700, color: "#AEB6AE", textAlign: "center" }}>
            {item.subtitle}
          </div>
        )}
      </div>

      <div style={{ position: "absolute", bottom: 130, left: 64, right: 64, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, zIndex: 1 }}>
        {[
          ["Peak Rank", item.peakRank ? `#${item.peakRank}` : "—"],
          ["Total Points", item.points ? item.points.toLocaleString() : "0"],
          ["Months Charted", item.monthsOnChart],
          [item.secondaryStatLabel, item.secondaryStatValue],
        ].map(([label, value]) => (
          <div key={label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "16px 8px", textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#B8860B" }}>{value}</div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.6px", textTransform: "uppercase", color: "#8F968F", marginTop: 4 }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 74,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 64px",
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: "#8F968F" }}>ngomacharts.com</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#5A625A" }}>Kenya's official multi-platform music charts</span>
      </div>
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
      await exportNodeAsPng(posterRef.current, `ngoma-spotlight-${type}-${safeTitle || selected.id}.png`);
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
              <SpotlightContent item={selected} type={type} />
            </div>
          </div>
        </div>

        {/* Off-screen full-resolution node — see PosterGeneratorPage.jsx for why
            this is rendered separately from the scaled-down visible preview. */}
        <div style={{ position: "fixed", top: 0, left: -99999, pointerEvents: "none" }} aria-hidden="true">
          <div ref={posterRef}>
            <SpotlightContent item={selected} type={type} />
          </div>
        </div>
      </div>
    </section>
  );
}
