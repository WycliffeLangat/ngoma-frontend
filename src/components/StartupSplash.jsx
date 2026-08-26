import NgomaMark from "./NgomaMark.jsx";

// Read the persisted theme synchronously (same key NgomaCharts writes) so the
// splash matches light/dark from the very first paint instead of flashing.
function isDarkPreferred() {
  try {
    return window.localStorage.getItem("ngoma-theme") === "dark";
  } catch {
    return false;
  }
}

// Branded loading state shown wherever the app has nothing else to paint yet —
// the pre-React startup splash in main.jsx and the Suspense fallback in
// App.jsx both use this instead of bare "Loading…" text.
export default function StartupSplash({ label }) {
  const dark = isDarkPreferred();
  const ink = dark ? "#FFFFFF" : "#1A1A1A";
  const bg = dark ? "#0b0e0b" : "#FFFFFF";
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "14px",
      height: "100vh", background: bg,
    }}>
      <NgomaMark size={120} inkColor={ink} style={{ animation: "ngoma-splash-pulse 1.4s ease-in-out infinite" }} />
      <span style={{
        fontFamily: "system-ui, sans-serif", fontSize: "39px", fontWeight: 900,
        letterSpacing: "0.5px", textTransform: "uppercase", color: ink,
      }}>
        Ngoma Charts
      </span>
      {label && (
        <span style={{ fontFamily: "system-ui, sans-serif", fontSize: "12px", color: dark ? "#888" : "#999" }}>
          {label}
        </span>
      )}
      <style>{`
        @keyframes ngoma-splash-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(0.94); }
        }
      `}</style>
    </div>
  );
}
