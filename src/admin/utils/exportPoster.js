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
