import SharePosterCard from "../../components/SharePosterCard.jsx";
import { enrichPosterRecord, formatPosterRank } from "../../utils/posterData.js";
import { fetchAppData } from "../../api/public.js";
import { resolveMediaUrl } from "../../api/config.js";
import { useEffect, useRef, useState } from "react";
import { cmsApi, getResults, qs } from "../api.js";
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

const TYPES = [
  ["songs", "Song"],
  ["albums", "Album"],
  ["artists", "Artist"],
];


function currentRankFromRow(row = {}) {
  return row.current_rank ?? row.currentRank ?? row.latest_rank ?? row.latestRank ?? row.rank ?? row.r ?? null;
}

// Fill omitted search-result stats from published chart history.
function normalizeCandidate(type, source, payload) {
  const row = enrichPosterRecord(type, source, payload);
  if (type === "artists") {
    return {
      id: row.id,
      title: row.display_name || row.name || "",
      subtitle: [row.country, row.genre, row.artist_type].filter(Boolean).join(" · "),
      image: resolveMediaUrl(row.image || ""),
      currentRank: currentRankFromRow(row),
      peakRank: row.peak_rank,
      points: row.total_points == null ? null : Number(row.total_points),
      monthsOnChart: row.months_on_chart ?? null,
      secondaryStatLabel: "Releases",
      secondaryStatValue: row.total_releases ?? "—",
      certifications: [],
      isArtist: true,
    };
  }
  return {
    id: row.id,
    title: row.title || "",
    subtitle: [row.artist_credit || row.artist_display || "", type === "albums" ? "Album" : "Single", row.release_year, row.genre].filter(Boolean).join(" · "),
    image: resolveMediaUrl(row.cover_image || ""),
    currentRank: currentRankFromRow(row),
    peakRank: row.peak_rank,
    points: row.total_points == null ? null : Number(row.total_points),
    monthsOnChart: row.months_on_chart ?? null,
    secondaryStatLabel: "Entries",
    secondaryStatValue: row.entry_count ?? "—",
    certifications: (row.certifications || []).map((c) => (typeof c === "string" ? c : c.level)),
    isArtist: false,
  };
}

function SpotlightContent({ item, theme = "dark" }) {
  if (!item) return <div style={{ width: POSTER_W, height: POSTER_H, padding: 64 }}>Search and select a record to preview</div>;
  return <SharePosterCard image={item.image} title={item.title} subtitle={item.subtitle} certifications={item.certifications} theme={theme} stats={[
    { label: "Current Rank", value: formatPosterRank(item.currentRank) },
    { label: "Peak Rank", value: formatPosterRank(item.peakRank) },
    { label: "Total Points", value: item.points?.toLocaleString() ?? "—" },
    { label: "Months Charted", value: item.monthsOnChart ?? "—" },
    { label: item.secondaryStatLabel, value: item.secondaryStatValue },
  ]} />;
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
      Promise.all([cmsApi.get(`${endpoint}${qs(params)}`), fetchAppData()])
        .then(([data, payload]) => { if (active) setResults(getResults(data).map((row) => normalizeCandidate(type, row, payload))); })
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
