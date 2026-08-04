// Ngoma Charts brand mark — an ascending bar/line chart, drawn directly in
// the app instead of loaded as a bitmap. Single ink color (no fixed teal
// fill) so it always matches the surrounding theme, light or dark, exactly
// like the old 4-bar icon did.
export default function NgomaMark({ size = 32, inkColor = "#1A1A1A", style }) {
  return (
    <svg
      width={size * 1.3}
      height={size}
      viewBox="0 0 130 100"
      style={{ flexShrink: 0, display: "block", ...style }}
    >
      <path d="M3,90 L124,90" stroke={inkColor} strokeWidth="4" strokeLinecap="round" />
      <rect x="20" y="74" width="10" height="16" rx="1.5" fill={inkColor} />
      <rect x="36" y="64" width="10" height="26" rx="1.5" fill={inkColor} />
      <rect x="52" y="54" width="10" height="36" rx="1.5" fill={inkColor} />
      <rect x="68" y="42" width="10" height="48" rx="1.5" fill={inkColor} />
      <path
        d="M25,74 L41,64 L57,54 L73,42 L92,22"
        fill="none"
        stroke={inkColor}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
