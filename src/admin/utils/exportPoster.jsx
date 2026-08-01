import { toPng } from "html-to-image";

// Shared 4:5 portrait dimensions for every social share image the CMS
// generates (chart posters, spotlight cards, etc.) — matches Instagram/
// Facebook's portrait post aspect ratio.
export const POSTER_W = 1080;
export const POSTER_H = 1350;
export const PREVIEW_W = 360;
export const PREVIEW_SCALE = PREVIEW_W / POSTER_W;

const TRANSPARENT_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

export function readableInk(color) {
  const hex = String(color || "").trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!hex) return "#050505";
  let value = hex[1];
  if (value.length === 3) value = value.split("").map((c) => c + c).join("");
  const int = Number.parseInt(value, 16);
  const srgb = [(int >> 16) & 255, (int >> 8) & 255, int & 255].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });
  const luminance = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  return luminance > 0.42 ? "#050505" : "#FFFFFF";
}

// Rasterizes `node` (expected to be POSTER_W×POSTER_H) to a PNG and triggers
// a browser download. Two non-obvious options are load-bearing:
//   - skipFonts: html-to-image otherwise walks every stylesheet on the page
//     to embed @font-face rules, including the cross-origin Google Fonts
//     <link> in index.html, and throws a SecurityError reading its cssRules.
//   - imagePlaceholder: without it, a single cover-art image failing to
//     fetch (e.g. the media host doesn't send CORS headers) aborts the
//     WHOLE export instead of just leaving that one tile blank.
export async function exportNodeAsPng(node, filename) {
  const dataUrl = await toPng(node, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: "#050505",
    width: POSTER_W,
    height: POSTER_H,
    skipFonts: true,
    imagePlaceholder: TRANSPARENT_PIXEL,
  });
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

export const POSTER_FONT_FAMILY = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

// One shared dark/light palette for every card type — chart poster, spotlight
// card, and anything added later — so switching themes looks identical
// everywhere instead of each card type drifting its own colors.
export const POSTER_THEMES = {
  dark: {
    pageBg: "linear-gradient(160deg, #0b0b0b 0%, #050505 55%, #10130f 100%)",
    wordmarkBarColor: "#F6F3EA",
    titleColor: "#FFFFFF",
    metaColor: "#AEB6AE",
    dividerColor: "rgba(255,255,255,0.24)",
    rowBg: "#151815",
    sameColor: "#5A625A",
    footerBorder: "rgba(255,255,255,0.18)",
    footerPrimary: "#8F968F",
    footerSecondary: "#5A625A",
    emptyColor: "#5A625A",
  },
  light: {
    pageBg: "linear-gradient(160deg, #ffffff 0%, #faf8f3 55%, #f2eee3 100%)",
    wordmarkBarColor: "#1A1A1A",
    titleColor: "#0C0C0C",
    metaColor: "#69716B",
    dividerColor: "rgba(0,0,0,0.18)",
    rowBg: "#EFECE3",
    sameColor: "#8A928B",
    footerBorder: "rgba(0,0,0,0.16)",
    footerPrimary: "#4E5851",
    footerSecondary: "#8A928B",
    emptyColor: "#8A928B",
  },
};

// Small ascending-bars mark — the exact icon used in the public site's own
// header (src/NgomaCharts.jsx). There's no logo image file to embed, so
// every card type shares this exact same mark instead of inventing its own.
export function BrandMark({ size = 22, barColor }) {
  return (
    <svg width={size} height={size * (24 / 22)} viewBox="0 0 22 24" style={{ flexShrink: 0 }}>
      <rect x="0" y="15" width="3.5" height="9" fill={barColor} rx="0.5" />
      <rect x="5.5" y="10" width="3.5" height="14" fill={barColor} rx="0.5" />
      <rect x="11" y="5" width="3.5" height="19" fill="#B8860B" rx="0.5" />
      <rect x="16.5" y="0" width="3.5" height="24" fill={barColor} rx="0.5" />
    </svg>
  );
}

// The "NGOMA CHARTS" wordmark row, identical across every card type.
export function PosterBrandRow({ theme, size = 20, fontSize = 14, gap = 9 }) {
  const t = POSTER_THEMES[theme] || POSTER_THEMES.dark;
  return (
    <div style={{ display: "flex", alignItems: "center", gap }}>
      <BrandMark size={size} barColor={t.wordmarkBarColor} />
      <span style={{ fontSize, fontWeight: 900, letterSpacing: "2.6px", textTransform: "uppercase", color: "#B8860B" }}>
        Ngoma Charts
      </span>
    </div>
  );
}

// The footer strip ("ngomacharts.com" + tagline), identical across every
// card type.
export function PosterFooter({ theme, height = 74, padX = 56 }) {
  const t = POSTER_THEMES[theme] || POSTER_THEMES.dark;
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: `0 ${padX}px`,
        borderTop: `1px solid ${t.footerBorder}`,
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 700, color: t.footerPrimary }}>ngomacharts.com</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: t.footerSecondary }}>Kenya's official multi-platform music charts</span>
    </div>
  );
}
