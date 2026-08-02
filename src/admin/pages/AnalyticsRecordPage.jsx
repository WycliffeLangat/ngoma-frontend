import { useEffect, useMemo, useRef, useState } from "react";
import { fetchAppData } from "../../api/public";
import { resolveMediaUrl } from "../../api/config.js";
import {
  publicChartRows,
  buildArtistMonthMirror,
  buildYearEndMirror,
  chartHistoryForMonth,
  historyKeyForRow,
  buildHallOfFameItems,
  buildMovementLists,
} from "../../utils/publicChartMirror.js";
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
  exportNodeAsPng,
} from "../utils/exportPoster.jsx";

const CHART_TYPES = [
  ["singles", "Songs"],
  ["albums", "Albums"],
  ["artists", "Artists"],
];

// Monthly records (need a target month + previous month to diff against) and
// All-Time records (aggregated across every published month, straight off
// the same buildYearEndMirror() the Year-End CMS page and chart poster's
// All-Time mode already use).
const RECORD_TYPES = [
  ["biggest-climber", "Biggest Climber", "monthly", "#2DB04A"],
  ["biggest-drop", "Biggest Drop", "monthly", "#E5484D"],
  ["strongest-debut", "Strongest Debut", "monthly", "#B8860B"],
  ["most-points", "Most Points (All-Time)", "all-time", "#B8860B"],
  ["most-consistent", "Most Consistent (All-Time)", "all-time", "#0088FF"],
  ["peak-performer", "Peak Performer (All-Time)", "all-time", "#B8860B"],
  ["most-number-ones", "Most #1s (All-Time)", "all-time", "#B8860B"],
  ["chart-longevity", "Chart Longevity (All-Time)", "all-time", "#0088FF"],
  ["biggest-monthly-climb", "Biggest Monthly Climb (All-Time)", "all-time", "#2DB04A"],
];

function monthlyRecordCandidates(payload, chartType, month) {
  const isArtist = chartType === "artists";
  const rawRows = isArtist
    ? buildArtistMonthMirror(payload, month, "Combined")
    : publicChartRows(payload, chartType, month, "Combined");
  const historyMap = chartHistoryForMonth(payload, chartType, month, "Combined");
  return rawRows.map((row) => {
    const rank = isArtist ? row.rank : (row.r ?? row.rank);
    const stats = historyMap.get(historyKeyForRow(chartType, row)) || {};
    const previousRank = stats.previousRank ?? null;
    const monthsCount = stats.monthsCount || 1;
    const isNew = monthsCount <= 1 || previousRank === null;
    return {
      title: isArtist ? (row.name || "") : (row.t || row.title || ""),
      subtitle: isArtist ? "" : (row.artist_credit || row.a || row.artist || ""),
      image: resolveMediaUrl(isArtist ? (row.image || "") : (row.cover_image || "")),
      rank,
      previousRank,
      peakRank: Number.isFinite(stats.peakRank) ? stats.peakRank : rank,
      monthsOnChart: monthsCount,
      isNew,
      delta: !isNew && previousRank !== null ? previousRank - rank : null,
    };
  });
}

function computeRecord(payload, chartType, month, recordType) {
  if (recordType === "most-number-ones") {
    const items = buildHallOfFameItems(payload, chartType);
    if (!items.length) return null;
    const winner = [...items].sort((a, b) => (b.hofMonths?.length || 0) - (a.hofMonths?.length || 0))[0];
    const isArtist = chartType === "artists";
    return {
      title: isArtist ? (winner.name || "") : (winner.t || winner.title || ""),
      subtitle: isArtist ? "" : (winner.artist_credit || winner.a || winner.artist || ""),
      image: resolveMediaUrl(isArtist ? (winner.image || "") : (winner.cover_image || "")),
      numberOnes: winner.hofMonths?.length || 0,
    };
  }

  if (recordType === "chart-longevity") {
    const rows = buildYearEndMirror(payload, chartType);
    if (!rows.length) return null;
    const winner = [...rows].sort((a, b) => b.months - a.months || b.points - a.points)[0];
    const isArtist = chartType === "artists";
    return {
      title: isArtist ? (winner.name || "") : (winner.title || ""),
      subtitle: isArtist ? "" : (winner.artist || ""),
      image: resolveMediaUrl(winner.image || ""),
      monthsOnChart: winner.months ?? 0,
    };
  }

  if (recordType === "biggest-monthly-climb") {
    const months = payload?.months || [];
    const isArtist = chartType === "artists";
    let best = null;
    months.forEach((m) => {
      const { risers } = buildMovementLists(payload, chartType, m);
      const top = risers[0];
      if (top && (!best || top.delta > best.delta)) best = top;
    });
    if (!best) return null;
    return {
      title: isArtist ? (best.name || "") : (best.t || best.title || ""),
      subtitle: isArtist ? "" : (best.artist_credit || best.a || best.artist || ""),
      image: resolveMediaUrl(isArtist ? (best.image || "") : (best.cover_image || "")),
      delta: best.delta,
    };
  }

  if (recordType === "most-points" || recordType === "most-consistent" || recordType === "peak-performer") {
    const rows = buildYearEndMirror(payload, chartType);
    if (!rows.length) return null;
    let winner;
    if (recordType === "most-points") winner = rows[0]; // already points-sorted
    else if (recordType === "most-consistent") winner = [...rows].sort((a, b) => b.months - a.months)[0];
    else winner = [...rows].sort((a, b) => (a.best || 999) - (b.best || 999) || b.points - a.points)[0];
    const isArtist = chartType === "artists";
    return {
      title: isArtist ? (winner.name || "") : (winner.title || ""),
      subtitle: isArtist ? "" : (winner.artist || ""),
      image: resolveMediaUrl(winner.image || ""),
      peakRank: winner.best ?? winner.rank,
      monthsOnChart: winner.months ?? 0,
      points: winner.points ?? 0,
    };
  }

  if (!month) return null;
  const candidates = monthlyRecordCandidates(payload, chartType, month);
  if (recordType === "strongest-debut") {
    return candidates.filter((c) => c.isNew).sort((a, b) => a.rank - b.rank)[0] || null;
  }
  const withMovement = candidates.filter((c) => !c.isNew && c.delta !== null && c.delta !== 0);
  if (recordType === "biggest-climber") {
    return withMovement.sort((a, b) => b.delta - a.delta)[0] || null;
  }
  return withMovement.sort((a, b) => a.delta - b.delta)[0] || null; // biggest-drop
}

function recordStat(recordType, item) {
  if (!item) return ["", ""];
  if (recordType === "biggest-climber") return ["Places Climbed", `+${item.delta}`];
  if (recordType === "biggest-drop") return ["Places Dropped", `-${Math.abs(item.delta)}`];
  if (recordType === "strongest-debut") return ["Debut Rank", `#${item.rank}`];
  if (recordType === "most-points") return ["Total Points", item.points.toLocaleString()];
  if (recordType === "most-consistent") return ["Months Charted", item.monthsOnChart];
  if (recordType === "peak-performer") return ["Peak Rank", item.peakRank ? `#${item.peakRank}` : "—"];
  if (recordType === "most-number-ones") return ["Months at #1", item.numberOnes];
  if (recordType === "chart-longevity") return ["Months Charted", item.monthsOnChart];
  if (recordType === "biggest-monthly-climb") return ["Places Climbed", `+${item.delta}`];
  return ["", ""];
}

function RecordCardContent({ item, chartType, recordType, recordLabel, accentColor, countryLabel, theme = "dark" }) {
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
        No qualifying entry for this record this month
      </div>
    );
  }

  const [statLabel, statValue] = recordStat(recordType, item);
  const artSize = 560;
  const isArtist = chartType === "artists";
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
          right: -160,
          width: 480,
          height: 480,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accentColor}2E 0%, transparent 70%)`,
        }}
      />

      <div style={{ padding: `72px ${padX}px 0`, position: "relative", zIndex: 1 }}>
        <PosterBrandRow theme={theme} />
      </div>

      {/* Badge, identity block, and stat block are three children of one
          space-between flex column spanning the whole middle of the card, so
          whatever room short content leaves gets distributed as breathing
          room between them instead of collecting as one dead gap. */}
      <div
        style={{
          position: "absolute",
          top: headerH,
          bottom: footerH,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "center",
          padding: `8px ${padX}px`,
          zIndex: 1,
        }}
      >
        <div
          style={{
            fontSize: `${recordLabel} · ${countryLabel}`.length > 22 ? 44 : `${recordLabel} · ${countryLabel}`.length > 14 ? 52 : 60,
            fontWeight: 900,
            lineHeight: 1.12,
            letterSpacing: "-0.5px",
            color: accentColor,
            textAlign: "center",
            textTransform: "uppercase",
          }}
        >
          {recordLabel} · {countryLabel}
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          {item.image ? (
            <img
              src={item.image}
              alt=""
              style={{ width: artSize, height: artSize, borderRadius: isArtist ? artSize / 2 : 26, objectFit: "cover", boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}
            />
          ) : (
            <div style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.4)", borderRadius: isArtist ? artSize / 2 : 26 }}>
              <ArtPlaceholder
                width={artSize}
                height={artSize}
                radius={isArtist ? artSize / 2 : 26}
                theme={theme}
                accentColor={accentColor}
                markSize={140}
              />
            </div>
          )}

          <div
            style={{
              marginTop: 30,
              fontSize: item.title.length > 22 ? 44 : item.title.length > 14 ? 52 : 60,
              fontWeight: 900,
              lineHeight: 1.12,
              letterSpacing: "-0.5px",
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
            <div style={{ marginTop: 12, fontSize: 30, fontWeight: 700, color: t.metaColor, textAlign: "center" }}>
              {item.subtitle}
            </div>
          )}
        </div>

        <div style={{ width: "100%" }}>
          <div style={{ borderTop: `2px solid ${t.dividerColor}`, marginBottom: 26 }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 92, fontWeight: 900, color: accentColor, letterSpacing: "-1px" }}>{statValue}</div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", color: t.metaColor, marginTop: 4 }}>
              {statLabel}
            </div>
          </div>
        </div>
      </div>

      <PosterFooter theme={theme} padX={padX} />
    </div>
  );
}

export default function AnalyticsRecordPage() {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportError, setExportError] = useState("");
  const [chartType, setChartType] = useState("singles");
  const [recordType, setRecordType] = useState("biggest-climber");
  const [month, setMonth] = useState("");
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

  const recordMeta = RECORD_TYPES.find(([value]) => value === recordType) || RECORD_TYPES[0];
  const [, recordLabel, recordPeriod, accentColor] = recordMeta;
  const countryLabel = "Kenya";

  const item = useMemo(() => {
    if (!payload) return null;
    return computeRecord(payload, chartType, month, recordType);
  }, [payload, chartType, month, recordType]);

  async function handleDownload() {
    if (!posterRef.current || !item || exporting) return;
    setExporting(true);
    setExportError("");
    try {
      const safeTitle = String(item.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      await exportNodeAsPng(posterRef.current, `ngoma-record-${recordType}-${chartType}-${safeTitle}-${theme}.png`);
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
          <h1>Analytics Record Cards</h1>
          <p>Turn a chart record — biggest climber, strongest debut, most consistent, and more — into a 4:5 share card.</p>
        </div>
      </div>

      {error && <div className="cms-alert error">{error}</div>}
      {exportError && <div className="cms-alert error">{exportError}</div>}

      {loading ? (
        <div className="cms-empty">Loading live chart data…</div>
      ) : (
        <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div className="cms-card" style={{ flex: "1 1 320px", minWidth: 280 }}>
            <div className="cms-card-heading"><h2>Record selection</h2></div>

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
                Record
                <div className="cms-pill-bar" style={{ marginBottom: 0 }}>
                  {RECORD_TYPES.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={`cms-btn small ${recordType === value ? "" : "light"}`}
                      onClick={() => setRecordType(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </label>

              {recordPeriod === "monthly" && (
                <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--cms-muted)" }}>
                  Month
                  <input
                    className="cms-select"
                    type="text"
                    list="record-months-list"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    placeholder="Search months…"
                  />
                  <datalist id="record-months-list">
                    {months.map((m) => <option key={m} value={m} />)}
                  </datalist>
                </label>
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
              disabled={exporting || !item}
            >
              {exporting ? "Generating…" : "Download record card (PNG)"}
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
                <RecordCardContent item={item} chartType={chartType} recordType={recordType} recordLabel={recordLabel} accentColor={accentColor} countryLabel={countryLabel} theme={theme} />
              </div>
            </div>
          </div>

          <div style={{ position: "fixed", top: 0, left: -99999, pointerEvents: "none" }} aria-hidden="true">
            <div ref={posterRef}>
              <RecordCardContent item={item} chartType={chartType} recordType={recordType} recordLabel={recordLabel} accentColor={accentColor} countryLabel={countryLabel} theme={theme} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
