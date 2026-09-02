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
  InfoButton = null,
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
  const axisTick = (size, extra) => ({ fontSize: size, fontFamily: F, fill: isDark ? "#FFFFFF" : "#000000", fontWeight: 650, ...extra });
  const tooltipStyle = {
    fontFamily: F, fontSize: 11,
    background: isDark ? "#161A16" : "#FFFFFF",
    border: "1px solid " + (isDark ? "#2F352F" : "#E4E1D8"),
    borderRadius: "8px",
    boxShadow: isDark ? "0 8px 24px rgba(0,0,0,0.35)" : "0 8px 24px rgba(31,36,31,0.08)",
    color: isDark ? "#FFFFFF" : "#000000",
  };
  const tooltipLabelStyle = { color: isDark ? "#FFFFFF" : "#000000", fontWeight: 700, marginBottom: "2px" };
  const barCursorFill = isDark ? "rgba(255,255,255,0.05)" : "rgba(31,36,31,0.04)";
  const headerInfoStyle = { background: "rgba(255,255,255,0.10)", color: "#FFFFFF", borderColor: "rgba(255,255,255,0.32)" };
  const infoCopy = {
    "#": "The row order after sorting platforms by points, peak rank, and platform name.",
    Platform: "The source platform being summarized for this song, album, or artist.",
    Points: "The total points accumulated from this platform's tracked chart placements.",
    Placements: "How many tracked chart placements contributed to this platform total.",
    Peak: "The best rank reached on this platform. Lower numbers are stronger.",
    Months: "How many distinct published months include activity on this platform.",
    Releases: "How many different releases contributed to this platform total.",
  };
  const info = (title, body, items = [], size = 14, style = {}) => InfoButton ? (
    <InfoButton title={title} body={body} items={items} size={size} style={style} />
  ) : null;

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
          <div style={{ margin: 0, fontFamily: F, fontSize: "20px", fontWeight: 800, letterSpacing: isMobile ? "2px" : "2.4px", textTransform: "uppercase", color: isDark?"#FFFFFF":"#000000", display: "flex", alignItems: "center", gap: "7px", lineHeight: 1.35 }}>
            <span style={{ display: "inline-block", width: "14px", height: "2px", background: isDark?"#FFFFFF":"#000000", borderRadius: "1px", flexShrink: 0 }} />
            Points by Platform
            {info("Points by Platform", "This chart summarizes how much each tracked source platform contributes to the selected song, album, or artist.", ["Graph view makes the strongest platforms easy to scan.", "Table view exposes the underlying totals, placements, peaks, months, and release counts when available."], 16)}
          </div>
          <p style={{ margin: "-4px 0 0", fontFamily: F, fontSize: "12px", lineHeight: 1.5, color: isDark ? "#FFFFFF" : "#000000" }}>
            Monthly platform placements are aggregated here for quick cross-platform comparison.
          </p>
        </div>
        <div style={{ display: "inline-flex", padding: "3px", borderRadius: "999px", background: isDark ? "#181C18" : "#F0EEE8", border: "1px solid " + (isDark ? "#2F352F" : "#E3E0D8") }}>
          {["graph", "table"].map((option) => (
            <span key={option} style={{ display: "inline-flex", alignItems: "center", gap: "2px" }}>
              <button
                type="button"
                onClick={() => setView(option)}
                aria-pressed={view === option}
                style={{
                  border: 0,
                  borderRadius: "999px",
                  padding: "7px 12px",
                  background: view === option ? (isDark ? "#363C33" : "#1A1A1A") : "transparent",
                  color: view === option ? "#FFFFFF" : (isDark ? "#FFFFFF" : "#000000"),
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
              {info(`${option === "graph" ? "Graph" : "Table"} View`, option === "graph" ? "Graph view displays platform points as horizontal bars so relative strength is easy to compare." : "Table view lists the exact platform totals and supporting metrics.", [], 14)}
            </span>
          ))}
        </div>
      </div>

      {view === "graph" && (
        <ResponsiveContainer width="100%" height={Math.max(160, ranked.length * 34)}>
          <BarChart data={ranked} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 4 }} barCategoryGap="22%">
            <CartesianGrid stroke={gridStroke} horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={axisTick(10)} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="platform" width={isMobile ? 82 : 104} tick={axisTick(11, { fontWeight: 800 })} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} cursor={{ fill: barCursorFill }} formatter={(v) => [Number(v).toLocaleString() + " pts", "Points"]} />
            <Bar dataKey="points" radius={[0, 6, 6, 0]} maxBarSize={30}>
              {ranked.map((row) => <Cell key={row.platform} fill={platformColor(row.platform)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {view === "table" && isMobile && (
        <div style={{ display: "grid", gap: "8px" }}>
          {ranked.map((row, index) => (
            <div key={row.platform} style={{ border: `1px solid ${isDark ? "#2B302B" : "#ECE9E1"}`, borderRadius: "10px", padding: "12px", background: isDark ? "#151815" : "#FAFAF8" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                  <span style={{ fontFamily: F, fontSize: "11px", fontWeight: 900, color: isDark ? "#FFFFFF" : "#000000", flexShrink: 0 }}>{index + 1}</span>
                  <span style={{ fontFamily: F, fontSize: "13px", fontWeight: 850, color: platformColor(row.platform), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "inline-flex", alignItems: "center", gap: "5px" }}>{row.platform}{info(`${row.platform} Performance`, `${row.platform} totals for the selected item, including points, placements, peak rank, and months charted.`, [], 14)}</span>
                </div>
                <span style={{ fontFamily: F, fontSize: "14px", fontWeight: 900, color: isDark ? "#FFFFFF" : "#000000", flexShrink: 0 }}>{Number(row.points).toLocaleString()} pts</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: showReleases ? "repeat(4, 1fr)" : "repeat(3, 1fr)", gap: "6px", fontFamily: F, fontSize: "11px" }}>
                {[["Placements", row.placements], ["Peak", row.peakRank === "—" ? "—" : `#${row.peakRank}`], ["Months", row.months], ...(showReleases ? [["Releases", row.releases]] : [])].map(([label, value]) => (
                  <div key={label} style={{ textAlign: "center" }}>
                    <div style={{ color: isDark ? "#FFFFFF" : "#000000", fontWeight: 800 }}>{value}</div>
                    <div style={{ color: isDark ? "#FFFFFF" : "#000000", fontSize: "9px", textTransform: "uppercase", letterSpacing: ".6px", marginTop: "2px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>{label}{info(label, infoCopy[label] || `${label} summarizes platform performance for the selected item.`, [], 13)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "table" && !isMobile && <div style={{ overflowX: "auto", border: `1px solid ${isDark ? "#2B302B" : "#ECE9E1"}`, borderRadius: "10px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: showReleases ? "610px" : "520px", fontFamily: F, fontSize: "12px" }}>
          <thead>
            <tr style={{ background: isDark ? "#151815" : "#FAFAF8", color: isDark ? "#FFFFFF" : "#000000", textAlign: "center" }}>
              {["#", "Platform", "Points", "Placements", "Peak", "Months", ...(showReleases ? ["Releases"] : [])].map((label) => (
                <th key={label} style={{ padding: "10px 12px", fontSize: "10px", letterSpacing: ".8px", textTransform: "uppercase", textAlign: "center" }}><span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:"5px"}}>{label}{info(label === "#" ? "Platform Sort Order" : label, infoCopy[label] || `${label} summarizes platform performance for the selected item.`, [], 13, headerInfoStyle)}</span></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ranked.map((row, index) => (
              <tr key={row.platform} style={{ borderTop: `1px solid ${isDark ? "#2B302B" : "#F0EDE6"}` }}>
                <td style={{ padding: "10px 12px", fontWeight: 900, color: isDark ? "#FFFFFF" : "#000000", textAlign: "center" }}>{index + 1}</td>
                <td style={{ padding: "10px 12px", fontWeight: 850, color: platformColor(row.platform), textAlign: "center" }}><span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:"5px"}}>{row.platform}{info(`${row.platform} Performance`, `${row.platform} totals for the selected item, including points, placements, peak rank, and months charted.`, [], 13)}</span></td>
                <td style={{ padding: "10px 12px", fontWeight: 900, color: isDark ? "#FFFFFF" : "#000000", textAlign: "center" }}>{Number(row.points).toLocaleString()}</td>
                <td style={{ padding: "10px 12px", color: isDark ? "#FFFFFF" : "#000000", textAlign: "center" }}>{row.placements}</td>
                <td style={{ padding: "10px 12px", color: isDark ? "#FFFFFF" : "#000000", textAlign: "center" }}>{row.peakRank === "—" ? "—" : `#${row.peakRank}`}</td>
                <td style={{ padding: "10px 12px", color: isDark ? "#FFFFFF" : "#000000", textAlign: "center" }}>{row.months}</td>
                {showReleases && <td style={{ padding: "10px 12px", color: isDark ? "#FFFFFF" : "#000000", textAlign: "center" }}>{row.releases}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>}
    </section>
  );
}
