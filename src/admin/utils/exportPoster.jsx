import { createContext, useContext } from "react";
import { toPng } from "html-to-image";
import NgomaMark from "../../components/NgomaMark.jsx";

// Shared 4:5 portrait dimensions for every social share image the CMS
// generates (chart posters, spotlight cards, etc.) — matches Instagram/
// Facebook's portrait post aspect ratio.
export const POSTER_W = 1080;
export const POSTER_H = 1350;
export const PREVIEW_W = 360;
export const PREVIEW_SCALE = PREVIEW_W / POSTER_W;
export const POSTER_EXPORT_SCALE = 3;
export const POSTER_EXPORT_W = POSTER_W * POSTER_EXPORT_SCALE;
export const POSTER_EXPORT_H = POSTER_H * POSTER_EXPORT_SCALE;
export const VIDEO_EXPORT_SCALE = 2;
export const VIDEO_EXPORT_W = POSTER_W * VIDEO_EXPORT_SCALE;
export const VIDEO_EXPORT_H = POSTER_H * VIDEO_EXPORT_SCALE;

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

// `imagePlaceholder` keeps one failed remote cover-art request from aborting
// the whole poster export. Font embedding is attempted first, then retried
// without stylesheet inspection when a browser blocks cross-origin font rules.
async function waitForPosterFonts() {
  if (typeof document === "undefined" || !document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load(`700 24px ${POSTER_FONT_FAMILY}`),
      document.fonts.load(`900 72px ${POSTER_FONT_FAMILY}`),
    ]);
    await document.fonts.ready;
  } catch {}
}

async function nodeToPng(node, skipFonts) {
  return toPng(node, {
    pixelRatio: POSTER_EXPORT_SCALE,
    cacheBust: true,
    backgroundColor: "#050505",
    width: POSTER_W,
    height: POSTER_H,
    skipFonts,
    imagePlaceholder: TRANSPARENT_PIXEL,
  });
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

export async function ensurePosterFontsReady() {
  await waitForPosterFonts();
}

export function posterExportSizeLabel() {
  return `${POSTER_EXPORT_W}x${POSTER_EXPORT_H}px`;
}

export function videoExportSizeLabel() {
  return `${VIDEO_EXPORT_W}x${VIDEO_EXPORT_H}px`;
}

export function superHdHelpText(kind = "poster") {
  const size = kind === "video" ? videoExportSizeLabel() : posterExportSizeLabel();
  return `Exports at ${size} (4:5), Super HD, using the app font.`;
}

export function preferredVideoMimeType() {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return null;
  return [
    ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "mp4"],
    ["video/mp4;codecs=h264,aac", "mp4"],
    ["video/webm;codecs=vp9,opus", "webm"],
    ["video/webm;codecs=vp8,opus", "webm"],
    ["video/webm", "webm"],
  ].find(([mimeType]) => MediaRecorder.isTypeSupported(mimeType)) || null;
}

export function videoExportOptions() {
  return {
    videoBitsPerSecond: 42_000_000,
    audioBitsPerSecond: 320_000,
  };
}

export function videoExportFrameRate() {
  return 30;
}

export async function exportNodeAsPng(node, filename) {
  await waitForPosterFonts();
  let dataUrl;
  try {
    dataUrl = await nodeToPng(node, false);
  } catch {
    dataUrl = await nodeToPng(node, true);
  }
  downloadDataUrl(dataUrl, filename);
}

// Keep exported posters on the same font family as the public app and CMS.
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

// Shared per-poster controls used by the CMS poster generators.
export const POSTER_SETTINGS_DEFAULTS = {
  contentScale: 100,
  contentOffsetY: 0,
  brandScale: 100,
  footerScale: 100,
  showBrand: true,
  showFooter: true,
};

const PosterSettingsContext = createContext(POSTER_SETTINGS_DEFAULTS);

function boundedNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

export function normalizePosterSettings(settings = {}) {
  return {
    contentScale: boundedNumber(settings.contentScale, POSTER_SETTINGS_DEFAULTS.contentScale, 85, 115),
    contentOffsetY: boundedNumber(settings.contentOffsetY, POSTER_SETTINGS_DEFAULTS.contentOffsetY, -120, 120),
    brandScale: boundedNumber(settings.brandScale, POSTER_SETTINGS_DEFAULTS.brandScale, 70, 140),
    footerScale: boundedNumber(settings.footerScale, POSTER_SETTINGS_DEFAULTS.footerScale, 70, 140),
    showBrand: settings.showBrand !== false,
    showFooter: settings.showFooter !== false,
  };
}

export function defaultPosterSettings(overrides = {}) {
  return normalizePosterSettings({ ...POSTER_SETTINGS_DEFAULTS, ...overrides });
}

export function usePosterSettings() {
  return useContext(PosterSettingsContext);
}

export function PosterSettingsProvider({ settings, children }) {
  return (
    <PosterSettingsContext.Provider value={normalizePosterSettings(settings)}>
      {children}
    </PosterSettingsContext.Provider>
  );
}

export function PosterCanvas({ settings, theme = "dark", children }) {
  const normalized = normalizePosterSettings(settings);
  const t = POSTER_THEMES[theme] || POSTER_THEMES.dark;
  const scale = normalized.contentScale / 100;

  return (
    <PosterSettingsProvider settings={normalized}>
      <div
        style={{
          width: POSTER_W,
          height: POSTER_H,
          position: "relative",
          overflow: "hidden",
          background: t.pageBg,
          fontFamily: POSTER_FONT_FAMILY,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: POSTER_W,
            height: POSTER_H,
            transform: `translateY(${normalized.contentOffsetY}px) scale(${scale})`,
            transformOrigin: "center center",
          }}
        >
          {children}
        </div>
      </div>
    </PosterSettingsProvider>
  );
}

function PosterRange({ label, value, min, max, step = 1, suffix = "%", onChange }) {
  return (
    <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: "var(--cms-muted)" }}>
      <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <span>{label}</span>
        <span style={{ color: "var(--cms-ink)", fontWeight: 900 }}>{value}{suffix}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export function PosterSettingsPanel({ settings, onChange, onReset }) {
  const normalized = normalizePosterSettings(settings);
  const update = (patch) => onChange?.({ ...normalized, ...patch });

  return (
    <div style={{ display: "grid", gap: 12, paddingTop: 4 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <strong style={{ fontSize: 13, textTransform: "uppercase", color: "var(--cms-ink)" }}>Poster design</strong>
        <button type="button" className="cms-btn small light" onClick={onReset}>Reset settings</button>
      </div>

      <PosterRange
        label="Text/content size"
        min={85}
        max={115}
        value={normalized.contentScale}
        onChange={(contentScale) => update({ contentScale })}
      />
      <PosterRange
        label="Vertical position"
        min={-120}
        max={120}
        suffix="px"
        value={normalized.contentOffsetY}
        onChange={(contentOffsetY) => update({ contentOffsetY })}
      />

      <div className="cms-pill-bar" style={{ marginBottom: 0 }}>
        <button
          type="button"
          className={`cms-btn small ${normalized.showBrand ? "" : "light"}`}
          onClick={() => update({ showBrand: !normalized.showBrand })}
        >
          Brand {normalized.showBrand ? "On" : "Off"}
        </button>
        <button
          type="button"
          className={`cms-btn small ${normalized.showFooter ? "" : "light"}`}
          onClick={() => update({ showFooter: !normalized.showFooter })}
        >
          Footer {normalized.showFooter ? "On" : "Off"}
        </button>
      </div>

      {normalized.showBrand && (
        <PosterRange
          label="Brand size"
          min={70}
          max={140}
          value={normalized.brandScale}
          onChange={(brandScale) => update({ brandScale })}
        />
      )}
      {normalized.showFooter && (
        <PosterRange
          label="Footer size"
          min={70}
          max={140}
          value={normalized.footerScale}
          onChange={(footerScale) => update({ footerScale })}
        />
      )}
    </div>
  );
}

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
  const settings = usePosterSettings();
  if (!settings.showBrand) return null;
  const t = POSTER_THEMES[theme] || POSTER_THEMES.dark;
  const scale = settings.brandScale / 100;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: gap * scale }}>
      <NgomaMark size={size * scale} inkColor={t.wordmarkBarColor} />
      <span style={{ fontSize: fontSize * scale, fontWeight: 950, letterSpacing: "-0.8px", textTransform: "uppercase", color: t.wordmarkBarColor, lineHeight: 1 }}>
        Ngoma Charts
      </span>
    </div>
  );
}

// The footer strip ("ngomacharts.com" + tagline), identical across every
// card type.
export function PosterFooter({ theme, height = 74, padX = 56 }) {
  const settings = usePosterSettings();
  if (!settings.showFooter) return null;
  const t = POSTER_THEMES[theme] || POSTER_THEMES.dark;
  const scale = settings.footerScale / 100;
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: height * scale,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: `0 ${padX}px`,
        borderTop: `1px solid ${t.footerBorder}`,
      }}
    >
      <span style={{ fontSize: 14 * scale, fontWeight: 700, color: t.footerPrimary }}>© 2026 Ngoma Media Ltd.</span>
      <span style={{ fontSize: 12 * scale, fontWeight: 600, color: t.footerSecondary }}>Music ranking intelligence</span>
    </div>
  );
}
