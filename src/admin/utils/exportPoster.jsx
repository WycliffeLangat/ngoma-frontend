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
// 2x supersampling on export — matches the "Super HD" scale the News Card
// page already used — so every poster PNG downloads crisp instead of at the
// exact 1080x1350 CSS pixel size, which read as soft/blurry once shared.
export const POSTER_EXPORT_SCALE = 2;
export const POSTER_EXPORT_W = POSTER_W * POSTER_EXPORT_SCALE;
export const POSTER_EXPORT_H = POSTER_H * POSTER_EXPORT_SCALE;
export const VIDEO_EXPORT_SCALE = 1;
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
  if (!hex) return "#000000";
  let value = hex[1];
  if (value.length === 3) value = value.split("").map((c) => c + c).join("");
  const int = Number.parseInt(value, 16);
  const srgb = [(int >> 16) & 255, (int >> 8) & 255, int & 255].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });
  const luminance = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  return luminance > 0.42 ? "#000000" : "#FFFFFF";
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

function exportPixelRatio(value) {
  const ratio = Number(value);
  return Number.isFinite(ratio) && ratio > 0 ? ratio : POSTER_EXPORT_SCALE;
}

function waitForImageEvent(image) {
  return new Promise((resolve) => {
    if (!image || image.complete) {
      resolve();
      return;
    }
    let timer = 0;
    const done = () => {
      image.removeEventListener("load", done);
      image.removeEventListener("error", done);
      if (timer) window.clearTimeout(timer);
      resolve();
    };
    timer = window.setTimeout(done, 3000);
    image.addEventListener("load", done, { once: true });
    image.addEventListener("error", done, { once: true });
  });
}

async function waitForPosterImages(node) {
  if (!node?.querySelectorAll) return;
  const images = Array.from(node.querySelectorAll("img"));
  await Promise.all(images.map(async (image) => {
    if (image.complete && image.naturalWidth > 0) return;
    if (image.decode) {
      try {
        await image.decode();
        return;
      } catch {}
    }
    await waitForImageEvent(image);
  }));
  if (typeof requestAnimationFrame === "function") {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }
}

async function nodeToPng(node, { skipFonts, pixelRatio, backgroundColor }) {
  return toPng(node, {
    pixelRatio: exportPixelRatio(pixelRatio),
    cacheBust: true,
    backgroundColor,
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
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function ensurePosterFontsReady() {
  await waitForPosterFonts();
}

export function formatPosterDownloadDate(date = new Date()) {
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsed);
}

export function posterDownloadDateLabel(date = new Date()) {
  const formatted = formatPosterDownloadDate(date);
  return formatted ? `Downloaded ${formatted}` : "";
}

// Only refreshes spans still showing the auto-computed label — a CMS poster
// with a custom `downloadDateText` (or the date hidden entirely) carries no
// `data-poster-download-date-auto` marker, so this leaves it untouched
// instead of clobbering the edit at export time.
function stampPosterDownloadDates(node, date = new Date()) {
  if (!node?.querySelectorAll) return;
  const label = posterDownloadDateLabel(date);
  node.querySelectorAll("[data-poster-download-date-auto]").forEach((element) => {
    element.textContent = label;
  });
}

export function posterExportSizeLabel(scale = POSTER_EXPORT_SCALE) {
  const ratio = exportPixelRatio(scale);
  return `${POSTER_W * ratio}x${POSTER_H * ratio}px`;
}

export function videoExportSizeLabel() {
  return `${VIDEO_EXPORT_W}x${VIDEO_EXPORT_H}px`;
}

export function superHdHelpText(kind = "poster", scale = POSTER_EXPORT_SCALE) {
  const size = kind === "video" ? videoExportSizeLabel() : posterExportSizeLabel(scale);
  return `Exports at ${size} (4:5), high-resolution output using the app font.`;
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
    videoBitsPerSecond: 12_000_000,
    audioBitsPerSecond: 256_000,
  };
}

export function videoExportFrameRate() {
  return 30;
}

export async function exportNodeAsPng(node, filename, options = {}) {
  stampPosterDownloadDates(node);
  await waitForPosterFonts();
  await waitForPosterImages(node);
  const backgroundColor = options.backgroundColor || "#050505";
  let dataUrl;
  try {
    dataUrl = await nodeToPng(node, { skipFonts: false, pixelRatio: options.pixelRatio, backgroundColor });
  } catch {
    dataUrl = await nodeToPng(node, { skipFonts: true, pixelRatio: options.pixelRatio, backgroundColor });
  }
  downloadDataUrl(dataUrl, filename);
}

// Keep exported posters on the same font family as the public app and CMS.
export const POSTER_FONT_FAMILY = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

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
    emptyColor: "#8A928B",
  },
};

// Shared per-poster controls used by the CMS poster generators.
export const POSTER_SETTINGS_DEFAULTS = {
  contentScale: 100,
  contentOffsetY: 0,
  finish: "clean",
  frame: "none",
  tone: "neutral",
  designIntensity: 100,
  textColor: "",
  secondaryTextColor: "",
  brandTextColor: "",
  footerTextColor: "",
  brandScale: 100,
  footerScale: 100,
  showBrand: true,
  showFooter: true,
  // Public reader-facing pages (ShareButton downloads) never go through
  // PosterSettingsPanel/PosterSettingsProvider, so they always fall back to
  // these context defaults — showDownloadDate stays true and downloadDateText
  // stays auto there, keeping the date stamp public-only by construction.
  // CMS poster generators explicitly opt into editing/removing it via the
  // panel below.
  showDownloadDate: true,
  downloadDateText: "",
};

export const POSTER_FINISH_OPTIONS = [
  ["clean", "Clean"],
  ["depth", "Depth"],
  ["editorial", "Editorial"],
];

export const POSTER_FRAME_OPTIONS = [
  ["none", "None"],
  ["fine", "Fine"],
  ["bold", "Bold"],
];

export const POSTER_TONE_OPTIONS = [
  ["neutral", "Neutral"],
  ["rich", "Rich"],
  ["crisp", "Crisp"],
];

const PosterSettingsContext = createContext(POSTER_SETTINGS_DEFAULTS);

function boundedNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function validOption(value, options, fallback) {
  return options.some(([option]) => option === value) ? value : fallback;
}

function normalizeColor(value) {
  const color = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : "";
}

export function normalizePosterSettings(settings = {}) {
  return {
    contentScale: boundedNumber(settings.contentScale, POSTER_SETTINGS_DEFAULTS.contentScale, 85, 115),
    contentOffsetY: boundedNumber(settings.contentOffsetY, POSTER_SETTINGS_DEFAULTS.contentOffsetY, -120, 120),
    finish: validOption(settings.finish, POSTER_FINISH_OPTIONS, POSTER_SETTINGS_DEFAULTS.finish),
    frame: validOption(settings.frame, POSTER_FRAME_OPTIONS, POSTER_SETTINGS_DEFAULTS.frame),
    tone: validOption(settings.tone, POSTER_TONE_OPTIONS, POSTER_SETTINGS_DEFAULTS.tone),
    designIntensity: boundedNumber(settings.designIntensity, POSTER_SETTINGS_DEFAULTS.designIntensity, 0, 100),
    textColor: normalizeColor(settings.textColor),
    secondaryTextColor: normalizeColor(settings.secondaryTextColor),
    brandTextColor: normalizeColor(settings.brandTextColor),
    footerTextColor: normalizeColor(settings.footerTextColor),
    brandScale: boundedNumber(settings.brandScale, POSTER_SETTINGS_DEFAULTS.brandScale, 70, 140),
    footerScale: boundedNumber(settings.footerScale, POSTER_SETTINGS_DEFAULTS.footerScale, 70, 140),
    showBrand: settings.showBrand !== false,
    showFooter: settings.showFooter !== false,
    showDownloadDate: settings.showDownloadDate !== false,
    downloadDateText: String(settings.downloadDateText || "").slice(0, 40),
  };
}

export function defaultPosterSettings(overrides = {}) {
  return normalizePosterSettings({ ...POSTER_SETTINGS_DEFAULTS, ...overrides });
}

export function usePosterSettings() {
  return useContext(PosterSettingsContext);
}

export function resolvePosterTheme(theme = "dark", settings = {}) {
  const base = POSTER_THEMES[theme] || POSTER_THEMES.dark;
  const normalized = normalizePosterSettings(settings);
  return {
    ...base,
    wordmarkBarColor: normalized.brandTextColor || base.wordmarkBarColor,
    titleColor: normalized.textColor || base.titleColor,
    metaColor: normalized.secondaryTextColor || base.metaColor,
    footerPrimary: normalized.footerTextColor || base.footerPrimary,
    emptyColor: normalized.secondaryTextColor || base.emptyColor,
  };
}

export function usePosterTheme(theme = "dark") {
  return resolvePosterTheme(theme, usePosterSettings());
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
  const mediaFilter = posterMediaFilter(normalized);
  const finishStyle = posterFinishOverlayStyle(normalized, theme);
  const frameStyle = posterFrameOverlayStyle(normalized, theme);

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
            filter: mediaFilter === "none" ? undefined : mediaFilter,
          }}
        >
          {children}
        </div>
        {finishStyle && <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", ...finishStyle }} />}
        {frameStyle && <div aria-hidden="true" style={{ position: "absolute", pointerEvents: "none", ...frameStyle }} />}
      </div>
    </PosterSettingsProvider>
  );
}

export function posterMediaFilter(settings = {}) {
  const normalized = normalizePosterSettings(settings);
  const level = normalized.designIntensity / 100;
  if (normalized.tone === "rich") {
    return `saturate(${1 + 0.18 * level}) contrast(${1 + 0.08 * level}) brightness(${1 + 0.02 * level})`;
  }
  if (normalized.tone === "crisp") {
    return `contrast(${1 + 0.14 * level}) brightness(${1 + 0.05 * level}) saturate(${1 - 0.06 * level})`;
  }
  return "none";
}

export function posterFinishOverlayStyle(settings = {}, theme = "dark") {
  const normalized = normalizePosterSettings(settings);
  if (normalized.finish === "clean" || normalized.designIntensity <= 0) return null;
  const level = normalized.designIntensity / 100;
  const edgeInk = theme === "light" ? "0,0,0" : "255,255,255";
  const shadowInk = "0,0,0";
  if (normalized.finish === "depth") {
    return {
      background: `linear-gradient(180deg, rgba(${edgeInk},${0.07 * level}) 0%, rgba(${shadowInk},0) 38%, rgba(${shadowInk},${0.24 * level}) 100%)`,
    };
  }
  return {
    background: [
      `linear-gradient(90deg, rgba(${edgeInk},${0.12 * level}) 0%, rgba(${edgeInk},0) 18%, rgba(${edgeInk},0) 82%, rgba(${edgeInk},${0.12 * level}) 100%)`,
      `linear-gradient(180deg, rgba(${edgeInk},${0.05 * level}) 0%, rgba(${shadowInk},0) 45%, rgba(${shadowInk},${0.18 * level}) 100%)`,
    ].join(", "),
  };
}

export function posterFrameOverlayStyle(settings = {}, theme = "dark") {
  const normalized = normalizePosterSettings(settings);
  if (normalized.frame === "none" || normalized.designIntensity <= 0) return null;
  const level = normalized.designIntensity / 100;
  const color = theme === "light" ? `rgba(0,0,0,${0.24 * level})` : `rgba(255,255,255,${0.3 * level})`;
  const inset = normalized.frame === "bold" ? 34 : 28;
  const width = normalized.frame === "bold" ? 6 : 2;
  return {
    inset,
    border: `${width}px solid ${color}`,
    boxSizing: "border-box",
  };
}

function PosterChoice({ label, value, options, onChange }) {
  return (
    <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: "var(--cms-muted)" }}>
      {label}
      <div className="cms-pill-bar" style={{ marginBottom: 0 }}>
        {options.map(([option, optionLabel]) => (
          <button
            key={option}
            type="button"
            className={`cms-btn small ${value === option ? "" : "light"}`}
            onClick={() => onChange(option)}
          >
            {optionLabel}
          </button>
        ))}
      </div>
    </label>
  );
}

function PosterColor({ label, value, fallback, onChange }) {
  return (
    <div style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: "var(--cms-muted)" }}>
      <span>{label}</span>
      <div style={{ display: "grid", gridTemplateColumns: "44px 1fr auto", alignItems: "center", gap: 8 }}>
        <input
          type="color"
          aria-label={label}
          value={value || fallback}
          onChange={(event) => onChange(event.target.value)}
          style={{ width: 44, height: 34, padding: 3 }}
        />
        <span style={{ color: "var(--cms-ink)", fontWeight: 900 }}>{value || "Theme default"}</span>
        <button type="button" className="cms-btn small light" onClick={() => onChange("")}>Default</button>
      </div>
    </div>
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

export function PosterSettingsPanel({ settings, onChange, onReset, theme = "dark" }) {
  const normalized = normalizePosterSettings(settings);
  const baseTheme = POSTER_THEMES[theme] || POSTER_THEMES.dark;
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

      <PosterChoice
        label="Finish"
        value={normalized.finish}
        options={POSTER_FINISH_OPTIONS}
        onChange={(finish) => update({ finish })}
      />
      <PosterChoice
        label="Frame"
        value={normalized.frame}
        options={POSTER_FRAME_OPTIONS}
        onChange={(frame) => update({ frame })}
      />
      <PosterChoice
        label="Tone"
        value={normalized.tone}
        options={POSTER_TONE_OPTIONS}
        onChange={(tone) => update({ tone })}
      />
      <PosterRange
        label="Design intensity"
        min={0}
        max={100}
        value={normalized.designIntensity}
        onChange={(designIntensity) => update({ designIntensity })}
      />
      <PosterColor
        label="Main text color"
        value={normalized.textColor}
        fallback={baseTheme.titleColor}
        onChange={(textColor) => update({ textColor })}
      />
      <PosterColor
        label="Secondary text color"
        value={normalized.secondaryTextColor}
        fallback={baseTheme.metaColor}
        onChange={(secondaryTextColor) => update({ secondaryTextColor })}
      />
      <PosterColor
        label="Brand text color"
        value={normalized.brandTextColor}
        fallback={baseTheme.wordmarkBarColor}
        onChange={(brandTextColor) => update({ brandTextColor })}
      />
      <PosterColor
        label="Footer text color"
        value={normalized.footerTextColor}
        fallback={baseTheme.footerPrimary}
        onChange={(footerTextColor) => update({ footerTextColor })}
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
        <>
          <PosterRange
            label="Footer size"
            min={70}
            max={140}
            value={normalized.footerScale}
            onChange={(footerScale) => update({ footerScale })}
          />
          <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: "var(--cms-muted)" }}>
            <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <span>Download date</span>
              <button
                type="button"
                className={`cms-btn small ${normalized.showDownloadDate ? "" : "light"}`}
                onClick={() => update({ showDownloadDate: !normalized.showDownloadDate })}
              >
                {normalized.showDownloadDate ? "On" : "Off"}
              </button>
            </span>
            {normalized.showDownloadDate && (
              <input
                className="cms-select"
                type="text"
                value={normalized.downloadDateText}
                placeholder={posterDownloadDateLabel()}
                maxLength={40}
                onChange={(event) => update({ downloadDateText: event.target.value })}
              />
            )}
          </label>
        </>
      )}
    </div>
  );
}

// Fallback artwork tile used whenever a record has no cover/hero image — a
// card should never show a blank gap where art belongs, so this renders the
// same brand mark used in the header instead of a plain color block.
export function ArtPlaceholder({ width, height, radius = 0, theme, accentColor = "#C97A12", markSize }) {
  const t = usePosterTheme(theme);
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
export function PosterBrandRow({ theme, size = 56, fontSize = 26, gap = 14, color }) {
  const settings = usePosterSettings();
  if (!settings.showBrand) return null;
  const t = usePosterTheme(theme);
  const scale = settings.brandScale / 100;
  const brandColor = color || t.wordmarkBarColor;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: gap * scale }}>
      <NgomaMark size={size * scale} inkColor={brandColor} />
      <span style={{ fontSize: fontSize * scale, fontWeight: 950, letterSpacing: "-0.8px", textTransform: "uppercase", color: brandColor, lineHeight: 1 }}>
        Ngoma Charts
      </span>
    </div>
  );
}

// The footer strip, identical across every card type. The download-date
// stamp defaults to the settings context (PosterSettingsPanel-driven CMS
// pages, or the always-on public-page default when no provider wraps the
// poster) but `showDownloadDate`/`downloadDateText` props let a caller that
// keeps its own design state outside the settings context (e.g. NewsCardPage)
// override it directly instead of needing a PosterSettingsProvider.
export function PosterFooter({ theme, height = 74, padX = 56, primaryColor, pointerEvents, showDownloadDate, downloadDateText }) {
  const settings = usePosterSettings();
  if (!settings.showFooter) return null;
  const t = usePosterTheme(theme);
  const scale = settings.footerScale / 100;
  const primary = primaryColor || t.footerPrimary;
  const dateVisible = showDownloadDate !== undefined ? showDownloadDate : settings.showDownloadDate;
  const customText = (downloadDateText !== undefined ? downloadDateText : settings.downloadDateText || "").trim();
  const downloadDate = dateVisible ? (customText || posterDownloadDateLabel()) : "";
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
        pointerEvents,
      }}
    >
      <span style={{ fontSize: 14 * scale, fontWeight: 700, color: primary }}>© 2026 Ngoma Media Ltd.</span>
      {downloadDate && (
        <span
          {...(customText ? {} : { "data-poster-download-date-auto": "1" })}
          style={{
            fontSize: 14 * scale,
            fontWeight: 700,
            color: primary,
            textAlign: "right",
          }}
        >
          {downloadDate}
        </span>
      )}
    </div>
  );
}
