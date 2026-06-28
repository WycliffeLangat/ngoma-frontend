import { useState } from "react";

export default function PlatformPerformance({
  rows = [],
  isDark,
  isMobile,
  F,
  SF,
  GOLD,
  PC = {},
  showReleases = false,
  expectedPlatforms = [],
}) {
  const [view, setView] = useState("graph");
  const hasPerformance = rows.some((row) => row && Number(row.placements) > 0);
  if (!hasPerformance) return null;

  const rowByPlatform = new Map(
    rows.filter(Boolean).map((row) => [String(row.platform).trim().toLowerCase(), row])
  );
  const completeRows = [
    ...expectedPlatforms.map((platform) =>
      rowByPlatform.get(String(platform).trim().toLowerCase()) || {
        platform,
        points: 0,
        placements: 0,
        peakRank: "—",
        months: 0,
        releases: 0,
      }
    ),
    ...rows.filter((row) =>
      !expectedPlatforms.some(
        (platform) => String(platform).trim().toLowerCase() === String(row.platform).trim().toLowerCase()
      )
    ),
  ];
  const ranked = completeRows
    .sort((a, b) =>
      Number(b.points) - Number(a.points) ||
      Number(a.peakRank || 999) - Number(b.peakRank || 999) ||
      String(a.platform).localeCompare(String(b.platform))
    );

  if (!ranked.length) return null;

  const maxPoints = Math.max(...ranked.map((row) => Number(row.points) || 0), 1);
  const platformColor = (platform) => {
    const exact = PC[platform];
    if (exact) return exact;
    const key = Object.keys(PC).find(
      (name) => String(name).trim().toLowerCase() === String(platform).trim().toLowerCase()
    );
    return (key && PC[key]) || GOLD;
  };

  return (
    <section style={{
      marginBottom: "22px",
      padding: isMobile ? "16px" : "20px",
      border: `1px solid ${isDark ? "#2B302B" : "#E8E5DC"}`,
      borderRadius: "14px",
      background: isDark ? "#0F1110" : "#FFFFFF",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "14px", flexWrap: "wrap", marginBottom: "18px" }}>
        <div>
          <h3 style={{ margin: 0, fontFamily: SF, fontSize: isMobile ? "18px" : "21px", fontWeight: 850 }}>
            Points by Platform
          </h3>
          <p style={{ margin: "5px 0 0", fontFamily: F, fontSize: "12px", lineHeight: 1.5, color: isDark ? "#AEB6AE" : "#69716B" }}>
            Comparable Top-50 points are calculated as 51 − rank for every monthly platform placement.
          </p>
        </div>
        <div style={{ display: "inline-flex", padding: "3px", borderRadius: "999px", background: isDark ? "#252A26" : "#F0EEE8" }}>
          {["graph", "table"].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setView(option)}
              aria-pressed={view === option}
              style={{
                border: 0,
                borderRadius: "999px",
                padding: "7px 12px",
                background: view === option ? (isDark ? "#F6F3EA" : "#FFFFFF") : "transparent",
                color: view === option ? "#1A1A1A" : (isDark ? "#AEB6AE" : "#69716B"),
                boxShadow: view === option ? "0 1px 4px rgba(0,0,0,.12)" : "none",
                fontFamily: F,
                fontSize: "10px",
                fontWeight: 900,
                letterSpacing: ".8px",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {view === "graph" && <div style={{ display: "grid", gap: "12px" }}>
        {ranked.map((row) => {
          const color = platformColor(row.platform);
          const width = Number(row.points) > 0
            ? Math.max(3, (Number(row.points) / maxPoints) * 100)
            : 0;
          return (
            <div key={row.platform}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginBottom: "5px", fontFamily: F, fontSize: "12px", fontWeight: 800 }}>
                <span>{row.platform}</span>
                <span>{Number(row.points).toLocaleString()} pts</span>
              </div>
              <div
                role="img"
                aria-label={`${row.platform}: ${row.points} points`}
                style={{ height: "11px", borderRadius: "999px", background: isDark ? "#252A26" : "#EEECE6", overflow: "hidden" }}
              >
                <div style={{ width: `${width}%`, height: "100%", borderRadius: "999px", background: color }} />
              </div>
            </div>
          );
        })}
      </div>}

      {view === "table" && <div style={{ overflowX: "auto", border: `1px solid ${isDark ? "#2B302B" : "#ECE9E1"}`, borderRadius: "10px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: showReleases ? "610px" : "520px", fontFamily: F, fontSize: "12px" }}>
          <thead>
            <tr style={{ background: isDark ? "#151815" : "#FAFAF8", color: isDark ? "#AEB6AE" : "#69716B", textAlign: "left" }}>
              {["#", "Platform", "Points", "Placements", "Peak", "Months", ...(showReleases ? ["Releases"] : [])].map((label) => (
                <th key={label} style={{ padding: "10px 12px", fontSize: "10px", letterSpacing: ".8px", textTransform: "uppercase" }}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ranked.map((row, index) => (
              <tr key={row.platform} style={{ borderTop: `1px solid ${isDark ? "#2B302B" : "#F0EDE6"}` }}>
                <td style={{ padding: "10px 12px", fontWeight: 900, color: GOLD }}>{index + 1}</td>
                <td style={{ padding: "10px 12px", fontWeight: 850, color: platformColor(row.platform) }}>{row.platform}</td>
                <td style={{ padding: "10px 12px", fontWeight: 900 }}>{Number(row.points).toLocaleString()}</td>
                <td style={{ padding: "10px 12px" }}>{row.placements}</td>
                <td style={{ padding: "10px 12px" }}>{row.peakRank === "—" ? "—" : `#${row.peakRank}`}</td>
                <td style={{ padding: "10px 12px" }}>{row.months}</td>
                {showReleases && <td style={{ padding: "10px 12px" }}>{row.releases}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>}
    </section>
  );
}
