import { toPng } from "html-to-image";
import NgomaMark from "../../components/NgomaMark.jsx";

// Shared 4:5 portrait dimensions for every social share image the CMS
// generates (chart posters, spotlight cards, etc.) — matches Instagram/
// Facebook's portrait post aspect ratio.
export const POSTER_W = 1080;
export const POSTER_H = 1350;
export const PREVIEW_W = 360;
export const PREVIEW_SCALE = PREVIEW_W / POSTER_W;

// Fixed gap between the bottom of <PosterBrandRow /> and the top of a card's
// title text — 2cm at 96 DPI (the standard CSS reference pixel), applied the
// same way on every card type so the logo-to-title spacing always reads as
// one consistent layout instead of each poster having hand-tuned padding.
export const TITLE_GAP_FROM_LOGO = 76;

// For card types that position their post-logo content with an absolute
// `top: <px>` offset (rather than flowing it after the brand row in normal
// document flow) — the standard brand row sits at 72px top padding and is
// ~108px tall (icon + gap + stacked wordmark), so this reproduces the same
// TITLE_GAP_FROM_LOGO gap via a single reusable offset instead of each card
// guessing its own number.
export const HEADER_ZONE_H = 72 + 108 + TITLE_GAP_FROM_LOGO;

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

export const POSTER_FONT_FAMILY = "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

// One shared dark/light palette for every card type — chart poster, spotlight
// card, and anything added later — so switching themes looks identical
// everywhere instead of each card type drifting its own colors.
export const POSTER_THEMES = {
  dark: {
    pageBg: "#050505",
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
    pageBg: "#FFFFFF",
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

// Fallback artwork tile used whenever a record has no cover/hero image — a
// card should never show a blank gap where art belongs, so this renders the
// same brand mark used in the header instead of a plain color block.
export function ArtPlaceholder({ width, height, radius = 0, theme, accentColor = "#B8860B", markSize }) {
  const t = POSTER_THEMES[theme] || POSTER_THEMES.dark;
  const size = markSize || Math.round(Math.min(
    typeof width === "number" ? width : 200,
    typeof height === "number" ? height : 200
  ) * 0.32);
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        flexShrink: 0,
        background: `linear-gradient(135deg, ${accentColor}CC, ${t.rowBg})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <NgomaMark size={size} inkColor={t.titleColor} />
    </div>
  );
}

// The "NGOMA CHARTS" wordmark row, identical across every card type. Always
// rendered as its own standalone line at the top of a card — never squeezed
// inline next to other header content — so the brand reads clearly at a
// glance even in a fast social-media scroll.
export function PosterBrandRow({ theme, size = 56, fontSize = 26, gap = 14 }) {
  const t = POSTER_THEMES[theme] || POSTER_THEMES.dark;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap }}>
      <NgomaMark size={size} inkColor={t.wordmarkBarColor} />
      <span style={{ fontSize, fontWeight: 950, letterSpacing: "-0.8px", textTransform: "uppercase", color: t.wordmarkBarColor, lineHeight: 1 }}>
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
      <span style={{ fontSize: 14, fontWeight: 700, color: t.footerPrimary }}>© 2026 Ngoma Media Ltd.</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: t.footerSecondary }}>Music ranking intelligence</span>
    </div>
  );
}
