import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from "recharts";

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

  const platformColor = (platform) => {
    const exact = PC[platform];
    if (exact) return exact;
    const key = Object.keys(PC).find(
      (name) => String(name).trim().toLowerCase() === String(platform).trim().toLowerCase()
    );
    return (key && PC[key]) || GOLD;
  };

  // Chart theming — reacts to dark mode instead of hardcoded light colors.
  const gridStroke = isDark ? "#242923" : "#EDEAE2";
  const axisTick = (size, extra) => ({ fontSize: size, fontFamily: F, fill: isDark ? "#93A093" : "#59645D", fontWeight: 650, ...extra });
  const tooltipStyle = {
    fontFamily: F, fontSize: 11,
    background: isDark ? "#161A16" : "#FFFFFF",
    border: "1px solid " + (isDark ? "#2F352F" : "#E4E1D8"),
    borderRadius: "8px",
    boxShadow: isDark ? "0 8px 24px rgba(0,0,0,0.35)" : "0 8px 24px rgba(31,36,31,0.08)",
    color: isDark ? "#F6F3EA" : "#1A1A1A",
  };
  const tooltipLabelStyle = { color: isDark ? "#D7DBD7" : "#59645D", fontWeight: 700, marginBottom: "2px" };
  const barCursorFill = isDark ? "rgba(255,255,255,0.05)" : "rgba(31,36,31,0.04)";

  return (
    <section className="ngoma-platform-performance" style={{
      marginBottom: "22px",
      padding: isMobile ? "16px" : "20px",
      border: `1px solid ${isDark ? "#2B302B" : "#E8E5DC"}`,
      borderRadius: "14px",
      background: isDark ? "#0F1110" : "#FFFFFF",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "14px", flexWrap: "wrap", marginBottom: "18px" }}>
        <div>
          <h3 style={{ margin: 0, fontFamily: SF, fontSize: isMobile ? "18px" : "21px", fontWeight: 850, color: isDark ? "#F6F3EA" : "#1A1A1A" }}>
            Points by Platform
          </h3>
          <p style={{ margin: "5px 0 0", fontFamily: F, fontSize: "12px", lineHeight: 1.5, color: isDark ? "#AEB6AE" : "#69716B" }}>
            Comparable Top-50 points are calculated as 51 − rank for every monthly platform placement.
          </p>
        </div>
        <div style={{ display: "inline-flex", padding: "3px", borderRadius: "999px", background: isDark ? "#181C18" : "#F0EEE8", border: "1px solid " + (isDark ? "#2F352F" : "#E3E0D8") }}>
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
                background: view === option ? (isDark ? "#363C33" : "#1A1A1A") : "transparent",
                color: view === option ? "#FFFFFF" : (isDark ? "#B8BDB8" : "#59645D"),
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

      {view === "graph" && (
        <ResponsiveContainer width="100%" height={Math.max(160, ranked.length * 34)}>
          <BarChart data={ranked} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 4 }}>
            <CartesianGrid stroke={gridStroke} horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={axisTick(10)} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="platform" width={isMobile ? 82 : 104} tick={axisTick(11, { fontWeight: 800 })} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} cursor={{ fill: barCursorFill }} formatter={(v) => [Number(v).toLocaleString() + " pts", "Points"]} />
            <Bar dataKey="points" radius={[0, 4, 4, 0]} maxBarSize={22}>
              {ranked.map((row) => <Cell key={row.platform} fill={platformColor(row.platform)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

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
                <td style={{ padding: "10px 12px", fontWeight: 900, color: isDark ? "#F6F3EA" : "#1A1A1A" }}>{Number(row.points).toLocaleString()}</td>
                <td style={{ padding: "10px 12px", color: isDark ? "#F6F3EA" : "#1A1A1A" }}>{row.placements}</td>
                <td style={{ padding: "10px 12px", color: isDark ? "#F6F3EA" : "#1A1A1A" }}>{row.peakRank === "—" ? "—" : `#${row.peakRank}`}</td>
                <td style={{ padding: "10px 12px", color: isDark ? "#F6F3EA" : "#1A1A1A" }}>{row.months}</td>
                {showReleases && <td style={{ padding: "10px 12px", color: isDark ? "#F6F3EA" : "#1A1A1A" }}>{row.releases}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>}
    </section>
  );
}
