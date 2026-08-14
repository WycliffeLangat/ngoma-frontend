import { useEffect, useRef, useState } from "react";
import { resolveMediaUrl } from "../../api/config.js";
import { cmsApi, getResults, qs } from "../api.js";
import {
  POSTER_W,
  POSTER_H,
  VIDEO_EXPORT_W,
  VIDEO_EXPORT_H,
  PREVIEW_W,
  PREVIEW_SCALE,
  POSTER_FONT_FAMILY,
  POSTER_THEMES,
  POSTER_FINISH_OPTIONS,
  POSTER_FRAME_OPTIONS,
  POSTER_TONE_OPTIONS,
  PosterBrandRow,
  PosterFooter,
  ArtPlaceholder,
  readableInk,
  downloadBlob,
  ensurePosterFontsReady,
  exportNodeAsPng,
  posterFinishOverlayStyle,
  posterFrameOverlayStyle,
  posterMediaFilter,
  preferredVideoMimeType,
  superHdHelpText,
  videoExportFrameRate,
  videoExportOptions,
} from "../utils/exportPoster.jsx";

const GOLD = "#B8860B";

const MODE_OPTIONS = [
  ["news", "News post"],
  ["video", "Video post"],
];

const THEME_OPTIONS = [
  ["dark", "Dark"],
  ["light", "Light"],
];

const TEXT_POSITIONS = [
  ["bottom", "Bottom"],
  ["center", "Center"],
  ["top", "Top"],
];

const TEXT_ALIGNMENTS = [
  ["left", "Left"],
  ["center", "Center"],
  ["right", "Right"],
];

const TEXT_CASE_OPTIONS = [
  ["uppercase", "Uppercase"],
  ["asTyped", "As typed"],
];

const VIDEO_EXPORT_MIN_SECONDS = 1;
const VIDEO_EXPORT_DEFAULT_SECONDS = 15;
const VIDEO_TRIM_UNKNOWN_MAX_SECONDS = 4 * 60 * 60;

const DEFAULT_NEWS_DESIGN = {
  image: "",
  headline: "New chart story headline",
  subheadline: "",
  category: "Chart News",
  theme: "dark",
  accent: GOLD,
  textPosition: "bottom",
  textAlign: "left",
  overlay: 58,
  imageZoom: 108,
  imageX: 50,
  imageY: 50,
  finish: "clean",
  frame: "none",
  tone: "neutral",
  designIntensity: 100,
  textColor: "",
  secondaryTextColor: "",
  brandTextColor: "",
  footerTextColor: "",
  headlineScale: 100,
  subheadlineScale: 100,
  categoryScale: 100,
  brandScale: 100,
  textWidth: 100,
  textOffsetY: 0,
  shadow: 100,
  textCase: "uppercase",
  showBrand: true,
  showFooter: true,
  showCategory: true,
  showSubheadline: true,
};

const DEFAULT_VIDEO_DESIGN = {
  videoUrl: "",
  videoFrame: "",
  sourceName: "",
  title: "Video title",
  artist: "Artist name",
  theme: "dark",
  accent: GOLD,
  textPosition: "bottom",
  textAlign: "left",
  overlay: 52,
  mediaZoom: 104,
  mediaX: 50,
  mediaY: 50,
  finish: "clean",
  frame: "none",
  tone: "neutral",
  designIntensity: 100,
  textColor: "",
  secondaryTextColor: "",
  brandTextColor: "",
  footerTextColor: "",
  trimStart: 0,
  exportDuration: VIDEO_EXPORT_DEFAULT_SECONDS,
  titleScale: 100,
  artistScale: 100,
  labelScale: 100,
  brandScale: 100,
  textWidth: 100,
  textOffsetY: 0,
  shadow: 100,
  textCase: "uppercase",
  showBrand: true,
  showFooter: true,
  showBadge: true,
};

const FIELD_LABEL = {
  display: "grid",
  gap: 6,
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: ".06em",
  color: "var(--cms-muted)",
};

const CONTROL_GRID = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
};

function normalizeArticle(row) {
  const dateValue = row.published_at || row.updated_at || row.created_at || "";
  let dateLabel = "";
  if (dateValue) {
    const parsed = new Date(dateValue);
    if (!Number.isNaN(parsed.getTime())) {
      dateLabel = parsed.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
    }
  }
  const category = String(row.category || "").replace(/_/g, " ").trim();
  return {
    id: row.id,
    title: row.title || "",
    subtitle: row.subheadline || "",
    image: resolveMediaUrl(row.cover_image || row.image || row.hero_image || ""),
    category: category ? category.replace(/\b\w/g, (char) => char.toUpperCase()) : "Chart News",
    author: row.author || "",
    excerpt: row.excerpt || "",
    dateLabel,
  };
}

function safeFilename(value, fallback) {
  const slug = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

function cloneDesign(defaults) {
  return { ...defaults };
}

function scaleValue(value, percent = 100) {
  return value * ((Number(percent) || 100) / 100);
}

function boundedPercent(value, fallback = 100) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(40, Math.min(100, number)) : fallback;
}

function blockWidth(baseWidth, percent) {
  return Math.round(baseWidth * (boundedPercent(percent) / 100));
}

function alignedBlockStyle(align) {
  if (align === "center") return { marginLeft: "auto", marginRight: "auto" };
  if (align === "right") return { marginLeft: "auto", marginRight: 0 };
  return { marginLeft: 0, marginRight: "auto" };
}

function displayText(value, textCase) {
  const raw = String(value || "");
  return textCase === "uppercase" ? raw.toUpperCase() : raw;
}

function formatSeconds(value) {
  const total = Math.max(0, Math.round(Number(value) || 0));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return minutes ? `${minutes}:${String(seconds).padStart(2, "0")}` : `${seconds}s`;
}

function clampTrimValue(value, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return min;
  return Math.max(min, Math.min(max, parsed));
}

function maxVideoTrimStart(duration) {
  const sourceDuration = Number(duration);
  if (!Number.isFinite(sourceDuration) || sourceDuration <= 0) return VIDEO_TRIM_UNKNOWN_MAX_SECONDS;
  const requiredRemainder = Math.min(VIDEO_EXPORT_MIN_SECONDS, sourceDuration);
  return Math.max(0, Math.floor(sourceDuration - requiredRemainder));
}

function maxVideoExportLength(duration, trimStart = 0) {
  const sourceDuration = Number(duration);
  if (!Number.isFinite(sourceDuration) || sourceDuration <= 0) return VIDEO_TRIM_UNKNOWN_MAX_SECONDS;
  return Math.max(VIDEO_EXPORT_MIN_SECONDS, Math.ceil(sourceDuration - (Number(trimStart) || 0)));
}

function mediaTransform(zoom = 100) {
  return `scale(${Math.max(100, Number(zoom) || 100) / 100})`;
}

function overlayStyle(theme, overlay, position) {
  const strength = Math.max(0, Math.min(90, Number(overlay) || 0)) / 100;
  const ink = theme === "light" ? "255,255,255" : "0,0,0";
  const directional = position === "top"
    ? `linear-gradient(180deg, rgba(${ink},${Math.min(0.9, strength + 0.18)}) 0%, rgba(${ink},${strength * 0.55}) 42%, rgba(${ink},${strength * 0.15}) 100%)`
    : position === "center"
      ? `linear-gradient(180deg, rgba(${ink},${strength * 0.45}) 0%, rgba(${ink},${Math.min(0.9, strength + 0.1)}) 48%, rgba(${ink},${strength * 0.45}) 100%)`
      : `linear-gradient(180deg, rgba(${ink},${strength * 0.1}) 0%, rgba(${ink},${strength * 0.42}) 42%, rgba(${ink},${Math.min(0.92, strength + 0.2)}) 100%)`;
  return {
    background: directional,
    opacity: 1,
  };
}

function textBoxPosition(position, offsetY = 0) {
  const offset = Number(offsetY) || 0;
  if (position === "top") return { top: 258 + offset };
  if (position === "center") return { top: 520 + offset, transform: "translateY(-50%)" };
  return { bottom: 142 - offset };
}

function headlineSize(text) {
  const len = String(text || "").trim().length;
  if (len > 92) return 56;
  if (len > 68) return 66;
  if (len > 46) return 78;
  return 90;
}

function titleSize(text) {
  const len = String(text || "").trim().length;
  if (len > 42) return 62;
  if (len > 28) return 76;
  return 90;
}

function textShadowStyle(theme, strength = 100) {
  const level = Math.max(0, Math.min(160, Number(strength) || 0)) / 100;
  if (!level) return "none";
  const blur = Math.round((theme === "light" ? 22 : 26) * level);
  const alpha = Math.min(0.82, (theme === "light" ? 0.72 : 0.62) * level);
  const color = theme === "light" ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
  return `0 ${Math.round(3 * level)}px ${blur}px ${color}`;
}

function defaultTextColor(theme) {
  return theme === "light" ? "#0C0C0C" : "#FFFFFF";
}

function defaultSecondaryTextColor(theme) {
  return theme === "light" ? "#30352F" : "#E1E4DC";
}

function defaultBrandTextColor(theme) {
  return (POSTER_THEMES[theme] || POSTER_THEMES.dark).wordmarkBarColor;
}

function defaultFooterTextColor(theme) {
  return (POSTER_THEMES[theme] || POSTER_THEMES.dark).footerPrimary;
}

function designTextColor(design) {
  return design.textColor || defaultTextColor(design.theme);
}

function designSecondaryTextColor(design) {
  return design.secondaryTextColor || defaultSecondaryTextColor(design.theme);
}

function designBrandTextColor(design) {
  return design.brandTextColor || defaultBrandTextColor(design.theme);
}

function designFooterTextColor(design) {
  return design.footerTextColor || defaultFooterTextColor(design.theme);
}

function frameCanvasSize(video) {
  const rawW = video.videoWidth || 1080;
  const rawH = video.videoHeight || 1350;
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(rawW, rawH));
  return {
    width: Math.max(1, Math.round(rawW * scale)),
    height: Math.max(1, Math.round(rawH * scale)),
  };
}

function drawVideoFrame(video) {
  const canvas = document.createElement("canvas");
  const { width, height } = frameCanvasSize(video);
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.92);
}

function extractVideoFrame(source) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    let settled = false;

    function finish(fn, value) {
      if (settled) return;
      settled = true;
      video.removeAttribute("src");
      try { video.load(); } catch {}
      fn(value);
    }

    function capture() {
      try {
        finish(resolve, drawVideoFrame(video));
      } catch (error) {
        finish(reject, error);
      }
    }

    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.addEventListener("loadedmetadata", () => {
      const duration = Number(video.duration);
      const target = Number.isFinite(duration) && duration > 0
        ? Math.min(0.6, Math.max(0.08, duration * 0.08))
        : 0;
      if (!target) {
        capture();
        return;
      }
      try {
        video.currentTime = target;
      } catch {
        capture();
      }
    }, { once: true });
    video.addEventListener("seeked", capture, { once: true });
    video.addEventListener("loadeddata", () => {
      if (!Number.isFinite(Number(video.duration)) || Number(video.duration) <= 0) capture();
    }, { once: true });
    video.addEventListener("error", () => finish(reject, new Error("Could not read that video.")), { once: true });
    video.src = source;
    video.load();
  });
}

function canvasFont(weight, sizePx) {
  return `${weight} ${Math.round(sizePx)}px ${POSTER_FONT_FAMILY}`;
}

function roundedPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, r);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

function drawCoverMedia(ctx, media, design) {
  const sourceW = media.videoWidth || media.naturalWidth || VIDEO_EXPORT_W;
  const sourceH = media.videoHeight || media.naturalHeight || VIDEO_EXPORT_H;
  const canvasRatio = VIDEO_EXPORT_W / VIDEO_EXPORT_H;
  const sourceRatio = sourceW / sourceH;
  let drawW = VIDEO_EXPORT_W;
  let drawH = VIDEO_EXPORT_H;

  if (sourceRatio > canvasRatio) drawW = VIDEO_EXPORT_H * sourceRatio;
  else drawH = VIDEO_EXPORT_W / sourceRatio;

  const zoom = Math.max(100, Number(design.mediaZoom) || 100) / 100;
  drawW *= zoom;
  drawH *= zoom;

  const overflowX = Math.max(0, drawW - VIDEO_EXPORT_W);
  const overflowY = Math.max(0, drawH - VIDEO_EXPORT_H);
  const dx = -overflowX * ((Number(design.mediaX) || 50) / 100);
  const dy = -overflowY * ((Number(design.mediaY) || 50) / 100);
  ctx.save();
  ctx.filter = posterMediaFilter(design);
  ctx.drawImage(media, dx, dy, drawW, drawH);
  ctx.restore();
}

function drawCanvasOverlay(ctx, design) {
  const strength = Math.max(0, Math.min(90, Number(design.overlay) || 0)) / 100;
  const color = design.theme === "light" ? "255,255,255" : "0,0,0";
  const gradient = ctx.createLinearGradient(0, 0, 0, VIDEO_EXPORT_H);
  if (design.textPosition === "top") {
    gradient.addColorStop(0, `rgba(${color},${Math.min(0.9, strength + 0.18)})`);
    gradient.addColorStop(0.42, `rgba(${color},${strength * 0.55})`);
    gradient.addColorStop(1, `rgba(${color},${strength * 0.15})`);
  } else if (design.textPosition === "center") {
    gradient.addColorStop(0, `rgba(${color},${strength * 0.45})`);
    gradient.addColorStop(0.48, `rgba(${color},${Math.min(0.9, strength + 0.1)})`);
    gradient.addColorStop(1, `rgba(${color},${strength * 0.45})`);
  } else {
    gradient.addColorStop(0, `rgba(${color},${strength * 0.1})`);
    gradient.addColorStop(0.42, `rgba(${color},${strength * 0.42})`);
    gradient.addColorStop(1, `rgba(${color},${Math.min(0.92, strength + 0.2)})`);
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, VIDEO_EXPORT_W, VIDEO_EXPORT_H);
}

function drawPosterFinishCanvas(ctx, design) {
  if (design.finish === "clean" || !Number(design.designIntensity)) return;
  const level = Math.max(0, Math.min(100, Number(design.designIntensity) || 0)) / 100;
  const edgeInk = design.theme === "light" ? "0,0,0" : "255,255,255";
  const shadowInk = "0,0,0";
  ctx.save();
  if (design.finish === "depth") {
    const gradient = ctx.createLinearGradient(0, 0, 0, VIDEO_EXPORT_H);
    gradient.addColorStop(0, `rgba(${edgeInk},${0.07 * level})`);
    gradient.addColorStop(0.38, `rgba(${shadowInk},0)`);
    gradient.addColorStop(1, `rgba(${shadowInk},${0.24 * level})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, VIDEO_EXPORT_W, VIDEO_EXPORT_H);
  } else if (design.finish === "editorial") {
    const horizontal = ctx.createLinearGradient(0, 0, VIDEO_EXPORT_W, 0);
    horizontal.addColorStop(0, `rgba(${edgeInk},${0.12 * level})`);
    horizontal.addColorStop(0.18, `rgba(${edgeInk},0)`);
    horizontal.addColorStop(0.82, `rgba(${edgeInk},0)`);
    horizontal.addColorStop(1, `rgba(${edgeInk},${0.12 * level})`);
    ctx.fillStyle = horizontal;
    ctx.fillRect(0, 0, VIDEO_EXPORT_W, VIDEO_EXPORT_H);

    const vertical = ctx.createLinearGradient(0, 0, 0, VIDEO_EXPORT_H);
    vertical.addColorStop(0, `rgba(${edgeInk},${0.05 * level})`);
    vertical.addColorStop(0.45, `rgba(${shadowInk},0)`);
    vertical.addColorStop(1, `rgba(${shadowInk},${0.18 * level})`);
    ctx.fillStyle = vertical;
    ctx.fillRect(0, 0, VIDEO_EXPORT_W, VIDEO_EXPORT_H);
  }
  ctx.restore();
}

function drawPosterFrameCanvas(ctx, design) {
  if (design.frame === "none" || !Number(design.designIntensity)) return;
  const level = Math.max(0, Math.min(100, Number(design.designIntensity) || 0)) / 100;
  const inset = (design.frame === "bold" ? 34 : 28) * (VIDEO_EXPORT_W / POSTER_W);
  const width = (design.frame === "bold" ? 6 : 2) * (VIDEO_EXPORT_W / POSTER_W);
  ctx.save();
  ctx.strokeStyle = design.theme === "light" ? `rgba(0,0,0,${0.24 * level})` : `rgba(255,255,255,${0.3 * level})`;
  ctx.lineWidth = width;
  ctx.strokeRect(inset, inset, VIDEO_EXPORT_W - inset * 2, VIDEO_EXPORT_H - inset * 2);
  ctx.restore();
}

function drawNgomaMarkCanvas(ctx, centerX, topY, size, color) {
  const markScale = size / 100;
  const left = centerX - 65 * markScale;
  ctx.save();
  ctx.translate(left, topY);
  ctx.scale(markScale, markScale);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(3, 90);
  ctx.lineTo(124, 90);
  ctx.stroke();
  [[20, 74, 10, 16], [36, 64, 10, 26], [52, 54, 10, 36], [68, 42, 10, 48]].forEach(([x, y, w, h]) => {
    roundedPath(ctx, x, y, w, h, 1.5);
    ctx.fill();
  });
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(25, 74);
  ctx.lineTo(41, 64);
  ctx.lineTo(57, 54);
  ctx.lineTo(73, 42);
  ctx.lineTo(92, 22);
  ctx.stroke();
  ctx.restore();
}

function drawBrandCanvas(ctx, design, scale) {
  const t = POSTER_THEMES[design.theme] || POSTER_THEMES.dark;
  const brandColor = design.brandTextColor || t.wordmarkBarColor;
  const brandScale = (Number(design.brandScale) || 100) / 100;
  const markTop = 58 * scale;
  const markSize = 54 * scale * brandScale;
  drawNgomaMarkCanvas(ctx, VIDEO_EXPORT_W / 2, markTop, markSize, brandColor);
  ctx.save();
  ctx.fillStyle = brandColor;
  ctx.font = canvasFont(900, 25 * scale * brandScale);
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("Ngoma Charts", VIDEO_EXPORT_W / 2, markTop + markSize + 14 * scale * brandScale);
  ctx.restore();
}

function wrapTextLines(ctx, text, maxWidth, maxLines) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";

  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      line = candidate;
      return;
    }
    if (line) lines.push(line);
    line = word;
  });
  if (line) lines.push(line);

  if (lines.length <= maxLines) return lines;
  const clipped = lines.slice(0, maxLines);
  let last = clipped[maxLines - 1];
  while (last.length > 1 && ctx.measureText(`${last}...`).width > maxWidth) {
    last = last.slice(0, -1).trim();
  }
  clipped[maxLines - 1] = `${last}...`;
  return clipped;
}

function ellipsizeText(ctx, text, maxWidth) {
  let value = String(text || "").trim();
  if (ctx.measureText(value).width <= maxWidth) return value;
  while (value.length > 1 && ctx.measureText(`${value}...`).width > maxWidth) {
    value = value.slice(0, -1).trim();
  }
  return `${value}...`;
}

function alignedX(align, padX) {
  if (align === "center") return VIDEO_EXPORT_W / 2;
  if (align === "right") return VIDEO_EXPORT_W - padX;
  return padX;
}

function drawVideoTextBlockCanvas(ctx, design, scale) {
  const padX = 62 * scale;
  const maxWidth = blockWidth(VIDEO_EXPORT_W - padX * 2, design.textWidth);
  const align = design.textAlign || "left";
  const textColor = designTextColor(design);
  const metaColor = designSecondaryTextColor(design);
  const titleFontSize = scaleValue(titleSize(design.title), design.titleScale) * scale;
  const titleLineH = titleFontSize * 1.02;
  const artistFontSize = scaleValue(34, design.artistScale) * scale;
  const artistLineH = artistFontSize * 1.2;
  const pillFontSize = scaleValue(17, design.labelScale) * scale;
  const pillPadX = 18 * scale;
  const pillPadY = 8 * scale;
  const showBadge = design.showBadge !== false;

  ctx.save();
  ctx.font = canvasFont(900, titleFontSize);
  const titleLines = wrapTextLines(ctx, displayText(design.title || "Video title", design.textCase), maxWidth, 3);
  ctx.font = canvasFont(900, pillFontSize);
  const pillW = showBadge ? ctx.measureText("VIDEO").width + pillPadX * 2 : 0;
  const pillH = showBadge ? pillFontSize + pillPadY * 2 : 0;
  const blockH = pillH + (showBadge ? 20 * scale : 0) + titleLines.length * titleLineH + 18 * scale + artistLineH;
  let blockTop = VIDEO_EXPORT_H - 142 * scale - blockH;
  if (design.textPosition === "top") blockTop = 258 * scale;
  else if (design.textPosition === "center") blockTop = 520 * scale - blockH / 2;
  blockTop += (Number(design.textOffsetY) || 0) * scale;
  const bottomGuard = design.showFooter === false ? 40 * scale : 90 * scale;
  blockTop = Math.max(185 * scale, Math.min(blockTop, VIDEO_EXPORT_H - bottomGuard - blockH));

  const pillX = align === "center"
    ? VIDEO_EXPORT_W / 2 - pillW / 2
    : align === "right"
      ? VIDEO_EXPORT_W - padX - pillW
      : padX;
  if (showBadge) {
    roundedPath(ctx, pillX, blockTop, pillW, pillH, pillH / 2);
    ctx.fillStyle = design.accent;
    ctx.fill();
    ctx.fillStyle = readableInk(design.accent);
    ctx.font = canvasFont(900, pillFontSize);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("VIDEO", pillX + pillW / 2, blockTop + pillH / 2);
  }

  ctx.textAlign = align;
  ctx.textBaseline = "top";
  const shadowLevel = Math.max(0, Math.min(160, Number(design.shadow) || 0)) / 100;
  ctx.shadowColor = shadowLevel
    ? (design.theme === "light" ? `rgba(255,255,255,${Math.min(0.82, 0.74 * shadowLevel)})` : `rgba(0,0,0,${Math.min(0.82, 0.62 * shadowLevel)})`)
    : "transparent";
  ctx.shadowBlur = 22 * scale * shadowLevel;
  ctx.shadowOffsetY = 3 * scale * shadowLevel;
  ctx.fillStyle = textColor;
  ctx.font = canvasFont(900, titleFontSize);
  const x = alignedX(align, padX);
  let y = blockTop + pillH + (showBadge ? 20 * scale : 0);
  titleLines.forEach((line) => {
    ctx.fillText(line, x, y, maxWidth);
    y += titleLineH;
  });

  y += 18 * scale;
  ctx.fillStyle = metaColor;
  ctx.font = canvasFont(850, artistFontSize);
  ctx.fillText(ellipsizeText(ctx, displayText(design.artist || "Artist name", design.textCase), maxWidth), x, y, maxWidth);
  ctx.restore();
}

function drawFooterCanvas(ctx, design, scale) {
  const t = POSTER_THEMES[design.theme] || POSTER_THEMES.dark;
  const footerColor = design.footerTextColor || t.footerPrimary;
  const height = 74 * scale;
  const padX = 62 * scale;
  const y = VIDEO_EXPORT_H - height;
  ctx.save();
  ctx.strokeStyle = t.footerBorder;
  ctx.lineWidth = scale;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(VIDEO_EXPORT_W, y);
  ctx.stroke();
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = footerColor;
  ctx.font = canvasFont(700, 14 * scale);
  ctx.fillText("© 2026 Ngoma Media Ltd.", padX, y + height / 2);
  ctx.textAlign = "right";
  ctx.fillStyle = footerColor;
  ctx.font = canvasFont(600, 12 * scale);
  ctx.fillText("Music ranking intelligence", VIDEO_EXPORT_W - padX, y + height / 2);
  ctx.restore();
}

function drawVideoPostFrame(ctx, video, design) {
  const scale = VIDEO_EXPORT_W / POSTER_W;
  ctx.clearRect(0, 0, VIDEO_EXPORT_W, VIDEO_EXPORT_H);
  drawCoverMedia(ctx, video, design);
  drawCanvasOverlay(ctx, design);
  drawPosterFinishCanvas(ctx, design);
  if (design.showBrand !== false) drawBrandCanvas(ctx, design, scale);
  drawVideoTextBlockCanvas(ctx, design, scale);
  if (design.showFooter !== false) drawFooterCanvas(ctx, design, scale);
  drawPosterFrameCanvas(ctx, design);
}

function loadExportVideo(source) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      fn(value);
    };
    video.crossOrigin = "anonymous";
    video.preload = "auto";
    video.playsInline = true;
    video.muted = false;
    video.addEventListener("canplay", () => finish(resolve, video), { once: true });
    video.addEventListener("loadedmetadata", () => {
      if (video.readyState >= 3) finish(resolve, video);
    }, { once: true });
    video.addEventListener("error", () => finish(reject, new Error("Could not load the video for export.")), { once: true });
    video.src = source;
    video.load();
  });
}

async function createAudioCapture(video) {
  const cleanup = [];
  try {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (AudioContextCtor) {
      const context = new AudioContextCtor();
      await context.resume();
      const source = context.createMediaElementSource(video);
      const destination = context.createMediaStreamDestination();
      source.connect(destination);
      cleanup.push(() => {
        try { source.disconnect(); } catch {}
        try { context.close(); } catch {}
      });
      const tracks = destination.stream.getAudioTracks();
      if (tracks.length) return { tracks, cleanup };
    }
  } catch {}

  try {
    const sourceStream = video.captureStream?.() || video.mozCaptureStream?.();
    const tracks = sourceStream?.getAudioTracks?.() || [];
    if (tracks.length) return { tracks, cleanup };
  } catch {}

  return { tracks: [], cleanup };
}

function videoTrimStart(design, video) {
  const requested = Math.max(0, Number(design.trimStart) || 0);
  const sourceDuration = Number(video.duration);
  if (!Number.isFinite(sourceDuration) || sourceDuration <= 0) return requested;
  return Math.max(0, Math.min(requested, maxVideoTrimStart(sourceDuration)));
}

function videoExportDuration(design, video, startTime = 0) {
  const requested = Math.max(VIDEO_EXPORT_MIN_SECONDS, Number(design.exportDuration) || VIDEO_EXPORT_DEFAULT_SECONDS);
  const sourceDuration = Number(video.duration);
  if (!Number.isFinite(sourceDuration) || sourceDuration <= 0) return requested;
  return Math.max(0.5, Math.min(requested, Math.max(0.5, sourceDuration - startTime)));
}

function waitForVideoSeek(video, targetTime) {
  return new Promise((resolve) => {
    const target = Math.max(0, Number(targetTime) || 0);
    if (Math.abs((Number(video.currentTime) || 0) - target) < 0.05) {
      resolve();
      return;
    }
    let timer = 0;
    const done = () => {
      if (timer) window.clearTimeout(timer);
      video.removeEventListener("seeked", done);
      resolve();
    };
    video.addEventListener("seeked", done, { once: true });
    try {
      video.currentTime = target;
      timer = window.setTimeout(done, 1200);
    } catch {
      done();
    }
  });
}

async function exportVideoPostFile(design, filenameBase) {
  const videoType = preferredVideoMimeType();
  if (!videoType) throw new Error("This browser cannot export video posts.");

  await ensurePosterFontsReady();
  const [mimeType, extension] = videoType;
  const canvas = document.createElement("canvas");
  canvas.width = VIDEO_EXPORT_W;
  canvas.height = VIDEO_EXPORT_H;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx || !canvas.captureStream) throw new Error("This browser cannot render HD video exports.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const video = await loadExportVideo(design.videoUrl);
  const startTime = videoTrimStart(design, video);
  await waitForVideoSeek(video, startTime);
  drawVideoPostFrame(ctx, video, design);
  const clipSeconds = videoExportDuration(design, video, startTime);

  const canvasStream = canvas.captureStream(videoExportFrameRate());
  const audioCapture = await createAudioCapture(video);
  const outputStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...audioCapture.tracks,
  ]);
  const recorder = new MediaRecorder(outputStream, {
    mimeType,
    ...videoExportOptions(),
  });
  const chunks = [];

  return new Promise((resolve, reject) => {
    let settled = false;
    let frameTimer = 0;
    let stopTimer = 0;
    const cleanup = () => {
      if (frameTimer) window.clearInterval(frameTimer);
      if (stopTimer) window.clearTimeout(stopTimer);
      canvasStream.getTracks().forEach((track) => track.stop());
      outputStream.getTracks().forEach((track) => track.stop());
      audioCapture.cleanup.forEach((fn) => fn());
      video.pause();
      video.removeAttribute("src");
      try { video.load(); } catch {}
    };
    const fail = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      if (!chunks.length) {
        reject(new Error("The browser did not produce a video file. Try a shorter export length or another video file."));
        return;
      }
      downloadBlob(new Blob(chunks, { type: mimeType }), `${filenameBase}.${extension}`);
      resolve({ audioPreserved: audioCapture.tracks.length > 0 });
    };
    const renderFrame = () => {
      try {
        drawVideoPostFrame(ctx, video, design);
      } catch {
        fail(new Error("The browser could not render that video. Upload the original video file and try again."));
      }
    };
    const stopRecording = () => {
      if (recorder.state !== "inactive") recorder.stop();
    };

    recorder.addEventListener("dataavailable", (event) => {
      if (event.data?.size) chunks.push(event.data);
    });
    recorder.addEventListener("stop", finish, { once: true });
    recorder.addEventListener("error", () => fail(new Error("Video recording failed.")), { once: true });
    video.addEventListener("ended", () => {
      if (recorder.state !== "inactive") recorder.stop();
    }, { once: true });
    video.addEventListener("error", () => fail(new Error("Video playback failed during export.")), { once: true });

    try {
      recorder.start(500);
      video.play().then(() => {
        renderFrame();
        frameTimer = window.setInterval(renderFrame, Math.max(33, Math.round(1000 / videoExportFrameRate())));
        stopTimer = window.setTimeout(stopRecording, Math.ceil(clipSeconds * 1000));
      }).catch(() => fail(new Error("The browser blocked video playback for export. Try again from the download button.")));
    } catch (error) {
      fail(error);
    }
  });
}

function ControlField({ label, children, help }) {
  return (
    <label style={FIELD_LABEL}>
      {label}
      {children}
      {help && <span className="cms-help" style={{ textTransform: "none", letterSpacing: 0, fontWeight: 650 }}>{help}</span>}
    </label>
  );
}

function SegmentedControl({ label, value, options, onChange }) {
  return (
    <div style={FIELD_LABEL}>
      {label}
      <div className="cms-pill-bar" style={{ marginBottom: 0 }}>
        {options.map(([optionValue, optionLabel]) => (
          <button
            key={optionValue}
            type="button"
            className={`cms-btn small ${value === optionValue ? "" : "light"}`}
            aria-pressed={value === optionValue}
            onClick={() => onChange(optionValue)}
          >
            {optionLabel}
          </button>
        ))}
      </div>
    </div>
  );
}

function RangeControl({ label, min, max, value, onChange, suffix = "" }) {
  return (
    <label style={{ display: "grid", gap: 5, fontSize: 11, fontWeight: 800, color: "var(--cms-muted)" }}>
      <span style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <span>{label}</span>
        <b style={{ color: "var(--cms-ink)" }}>{value}{suffix}</b>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function ToggleControl({ label, checked, onChange }) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "9px 10px",
        border: "1px solid var(--cms-line)",
        borderRadius: 12,
        background: "#fff",
        color: "var(--cms-muted)",
        fontSize: 12,
        fontWeight: 800,
      }}
    >
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        style={{ width: 16, height: 16, accentColor: "var(--cms-gold)" }}
      />
    </label>
  );
}

function ColorControl({ label, value, fallback, onChange }) {
  return (
    <div style={{ display: "grid", gap: 5, fontSize: 11, fontWeight: 800, color: "var(--cms-muted)" }}>
      <span>{label}</span>
      <div style={{ display: "grid", gridTemplateColumns: "42px 1fr auto", alignItems: "center", gap: 7 }}>
        <input
          type="color"
          aria-label={label}
          value={value || fallback}
          onChange={(event) => onChange(event.target.value)}
          style={{ width: 42, height: 32, padding: 3 }}
        />
        <b style={{ color: "var(--cms-ink)", fontSize: 11 }}>{value || "Default"}</b>
        <button type="button" className="cms-btn small light" onClick={() => onChange("")}>Reset</button>
      </div>
    </div>
  );
}

function MediaPlaceholder({ label, theme, accent }) {
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <ArtPlaceholder width="100%" height="100%" radius={0} theme={theme} accentColor={accent} markSize={170} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          color: POSTER_THEMES[theme]?.titleColor || "#fff",
          fontSize: 28,
          fontWeight: 900,
          letterSpacing: "2px",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
    </div>
  );
}

function NewsPostContent({ design }) {
  const t = POSTER_THEMES[design.theme] || POSTER_THEMES.dark;
  const padX = 62;
  const textColor = designTextColor(design);
  const metaColor = designSecondaryTextColor(design);
  const brandTextColor = designBrandTextColor(design);
  const footerTextColor = designFooterTextColor(design);
  const textShadow = textShadowStyle(design.theme, design.shadow);
  const brandScale = (Number(design.brandScale) || 100) / 100;
  const textMaxWidth = blockWidth(POSTER_W - padX * 2, design.textWidth);
  const showCategory = design.showCategory !== false && design.category;
  const showSubheadline = design.showSubheadline !== false && design.subheadline;
  const mediaFilter = posterMediaFilter(design);
  const finishOverlay = posterFinishOverlayStyle(design, design.theme);
  const frameOverlay = posterFrameOverlayStyle(design, design.theme);

  return (
    <div
      style={{
        width: POSTER_W,
        height: POSTER_H,
        boxSizing: "border-box",
        background: t.pageBg,
        fontFamily: POSTER_FONT_FAMILY,
        color: textColor,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {design.image ? (
        <img
          src={design.image}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: `${design.imageX}% ${design.imageY}%`,
            transform: mediaTransform(design.imageZoom),
            transformOrigin: "center",
            filter: mediaFilter === "none" ? undefined : mediaFilter,
          }}
        />
      ) : (
        <MediaPlaceholder label="Insert image" theme={design.theme} accent={design.accent} />
      )}

      <div style={{ position: "absolute", inset: 0, ...overlayStyle(design.theme, design.overlay, design.textPosition) }} />
      {finishOverlay && <div style={{ position: "absolute", inset: 0, pointerEvents: "none", ...finishOverlay }} />}

      {design.showBrand !== false && (
        <div style={{ position: "relative", zIndex: 1, padding: `58px ${padX}px 0` }}>
          <PosterBrandRow theme={design.theme} size={54 * brandScale} fontSize={25 * brandScale} gap={14 * brandScale} color={brandTextColor} />
        </div>
      )}

      <div
        style={{
          position: "absolute",
          left: padX,
          right: padX,
          zIndex: 1,
          textAlign: design.textAlign,
          ...textBoxPosition(design.textPosition, design.textOffsetY),
        }}
      >
        <div style={{ maxWidth: textMaxWidth, ...alignedBlockStyle(design.textAlign) }}>
          {showCategory && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                maxWidth: "100%",
                padding: "8px 18px",
                borderRadius: 999,
                background: design.accent,
                color: readableInk(design.accent),
                fontSize: scaleValue(17, design.categoryScale),
                fontWeight: 950,
                letterSpacing: "1.2px",
                textTransform: "uppercase",
                boxShadow: `0 12px 34px ${design.accent}44`,
              }}
            >
              {design.category}
            </span>
          )}

          <div
            style={{
              marginTop: showCategory ? 20 : 0,
              fontSize: scaleValue(headlineSize(design.headline), design.headlineScale),
              fontWeight: 950,
              lineHeight: 1.04,
              letterSpacing: 0,
              textTransform: "none",
              color: textColor,
              textShadow,
              display: "-webkit-box",
              WebkitLineClamp: 4,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {displayText(design.headline || "Write headline", design.textCase)}
          </div>

          {showSubheadline && (
            <div
              style={{
                marginTop: 18,
                color: metaColor,
                fontSize: scaleValue(30, design.subheadlineScale),
                fontWeight: 750,
                lineHeight: 1.34,
                textShadow,
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {design.subheadline}
            </div>
          )}
        </div>
      </div>

      {design.showFooter !== false && <PosterFooter theme={design.theme} padX={padX} primaryColor={footerTextColor} secondaryColor={footerTextColor} />}
      {frameOverlay && <div style={{ position: "absolute", zIndex: 5, pointerEvents: "none", ...frameOverlay }} />}
    </div>
  );
}

function VideoPostContent({ design, exportMode = false, videoRef = null, onVideoMetadata = null }) {
  const t = POSTER_THEMES[design.theme] || POSTER_THEMES.dark;
  const padX = 62;
  const textColor = designTextColor(design);
  const metaColor = designSecondaryTextColor(design);
  const brandTextColor = designBrandTextColor(design);
  const footerTextColor = designFooterTextColor(design);
  const brandScale = (Number(design.brandScale) || 100) / 100;
  const textMaxWidth = blockWidth(POSTER_W - padX * 2, design.textWidth);
  const showBadge = design.showBadge !== false;
  const titleShadow = textShadowStyle(design.theme, design.shadow);
  const mediaFilter = posterMediaFilter(design);
  const finishOverlay = posterFinishOverlayStyle(design, design.theme);
  const frameOverlay = posterFrameOverlayStyle(design, design.theme);
  const mediaStyle = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: `${design.mediaX}% ${design.mediaY}%`,
    transform: mediaTransform(design.mediaZoom),
    transformOrigin: "center",
    filter: mediaFilter === "none" ? undefined : mediaFilter,
    pointerEvents: exportMode ? "none" : "auto",
  };

  return (
    <div
      style={{
        width: POSTER_W,
        height: POSTER_H,
        boxSizing: "border-box",
        background: t.pageBg,
        fontFamily: POSTER_FONT_FAMILY,
        color: textColor,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {design.videoUrl && !exportMode ? (
        <video
          ref={videoRef}
          src={design.videoUrl}
          poster={design.videoFrame || undefined}
          controls={!exportMode}
          preload="metadata"
          playsInline
          onLoadedMetadata={onVideoMetadata || undefined}
          style={mediaStyle}
        />
      ) : design.videoFrame ? (
        <img src={design.videoFrame} alt="" style={mediaStyle} />
      ) : (
        <MediaPlaceholder label="Insert video" theme={design.theme} accent={design.accent} />
      )}

      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", ...overlayStyle(design.theme, design.overlay, design.textPosition) }} />
      {finishOverlay && <div style={{ position: "absolute", inset: 0, pointerEvents: "none", ...finishOverlay }} />}

      {design.showBrand !== false && (
        <div style={{ position: "relative", zIndex: 2, padding: `58px ${padX}px 0`, pointerEvents: "none" }}>
          <PosterBrandRow theme={design.theme} size={54 * brandScale} fontSize={25 * brandScale} gap={14 * brandScale} color={brandTextColor} />
        </div>
      )}

      <div
        style={{
          position: "absolute",
          left: padX,
          right: padX,
          zIndex: 2,
          textAlign: design.textAlign,
          pointerEvents: "none",
          ...textBoxPosition(design.textPosition, design.textOffsetY),
        }}
      >
        <div style={{ maxWidth: textMaxWidth, ...alignedBlockStyle(design.textAlign) }}>
          {showBadge && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                maxWidth: "100%",
                padding: "8px 18px",
                borderRadius: 999,
                background: design.accent,
                color: readableInk(design.accent),
                fontSize: scaleValue(17, design.labelScale),
                fontWeight: 950,
                letterSpacing: "1.2px",
                textTransform: "uppercase",
              }}
            >
              Video
            </span>
          )}

          <div
            style={{
              marginTop: showBadge ? 20 : 0,
              fontSize: scaleValue(titleSize(design.title), design.titleScale),
              fontWeight: 950,
              lineHeight: 1.02,
              letterSpacing: 0,
              textTransform: "none",
              color: textColor,
              textShadow: titleShadow,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {displayText(design.title || "Video title", design.textCase)}
          </div>

          <div
            style={{
              marginTop: 18,
              color: metaColor,
              fontSize: scaleValue(34, design.artistScale),
              fontWeight: 850,
              lineHeight: 1.2,
              textShadow: titleShadow,
              textTransform: "none",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {displayText(design.artist || "Artist name", design.textCase)}
          </div>
        </div>
      </div>

      {design.showFooter !== false && <PosterFooter theme={design.theme} padX={padX} primaryColor={footerTextColor} secondaryColor={footerTextColor} pointerEvents={exportMode ? undefined : "none"} />}
      {frameOverlay && <div style={{ position: "absolute", zIndex: 5, pointerEvents: "none", ...frameOverlay }} />}
    </div>
  );
}

export default function NewsCardPage() {
  const [mode, setMode] = useState("news");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState(null);
  const [newsDesign, setNewsDesign] = useState(() => cloneDesign(DEFAULT_NEWS_DESIGN));
  const [videoDesign, setVideoDesign] = useState(() => cloneDesign(DEFAULT_VIDEO_DESIGN));
  const [newsImageObjectUrl, setNewsImageObjectUrl] = useState("");
  const [videoObjectUrl, setVideoObjectUrl] = useState("");
  const [error, setError] = useState("");
  const [exportError, setExportError] = useState("");
  const [frameError, setFrameError] = useState("");
  const [capturingFrame, setCapturingFrame] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [exporting, setExporting] = useState(false);
  const posterRef = useRef(null);
  const previewVideoRef = useRef(null);
  const trimPreviewTimerRef = useRef(null);

  function clearTrimPreviewTimer() {
    if (trimPreviewTimerRef.current) {
      window.clearTimeout(trimPreviewTimerRef.current);
      trimPreviewTimerRef.current = null;
    }
  }

  useEffect(() => () => {
    clearTrimPreviewTimer();
  }, []);

  useEffect(() => () => {
    if (newsImageObjectUrl) URL.revokeObjectURL(newsImageObjectUrl);
  }, [newsImageObjectUrl]);

  useEffect(() => () => {
    if (videoObjectUrl) URL.revokeObjectURL(videoObjectUrl);
  }, [videoObjectUrl]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setError("");
      return undefined;
    }
    let active = true;
    setSearching(true);
    const timer = setTimeout(() => {
      cmsApi.get(`/news/${qs({ search: trimmed, page_size: 8 })}`)
        .then((data) => {
          if (active) setResults(getResults(data).map(normalizeArticle));
        })
        .catch((err) => {
          if (active) setError(err.message || "Search failed");
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 280);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  function updateNews(patch) {
    setNewsDesign((current) => ({ ...current, ...patch }));
  }

  function updateVideo(patch) {
    setVideoDesign((current) => ({ ...current, ...patch }));
  }

  function resetNewsSettings() {
    setNewsDesign((current) => ({
      ...cloneDesign(DEFAULT_NEWS_DESIGN),
      image: current.image,
      headline: current.headline,
      subheadline: current.subheadline,
      category: current.category,
    }));
  }

  function resetNewsAll() {
    setSelectedArticleId(null);
    setNewsImageObjectUrl("");
    setQuery("");
    setResults([]);
    setNewsDesign(cloneDesign(DEFAULT_NEWS_DESIGN));
  }

  function resetVideoSettings() {
    setVideoDesign((current) => ({
      ...cloneDesign(DEFAULT_VIDEO_DESIGN),
      videoUrl: current.videoUrl,
      videoFrame: current.videoFrame,
      sourceName: current.sourceName,
      title: current.title,
      artist: current.artist,
    }));
  }

  function resetVideoAll() {
    clearTrimPreviewTimer();
    setVideoObjectUrl("");
    setFrameError("");
    setVideoDuration(0);
    setVideoDesign(cloneDesign(DEFAULT_VIDEO_DESIGN));
  }

  function clearVideoMedia() {
    clearTrimPreviewTimer();
    setVideoObjectUrl("");
    setFrameError("");
    setVideoDuration(0);
    setCapturingFrame(false);
    updateVideo({
      videoUrl: "",
      videoFrame: "",
      sourceName: "",
      trimStart: 0,
      exportDuration: VIDEO_EXPORT_DEFAULT_SECONDS,
    });
  }

  function applyArticle(article) {
    setMode("news");
    setSelectedArticleId(article.id);
    setNewsImageObjectUrl("");
    updateNews({
      image: article.image,
      headline: article.title || DEFAULT_NEWS_DESIGN.headline,
      subheadline: article.subtitle || article.excerpt || "",
      category: article.category || DEFAULT_NEWS_DESIGN.category,
    });
  }

  function handleNewsImageFile(file) {
    if (!file) return;
    const nextUrl = URL.createObjectURL(file);
    setNewsImageObjectUrl(nextUrl);
    setSelectedArticleId(null);
    updateNews({ image: nextUrl });
  }

  async function handleVideoFile(file) {
    if (!file) return;
    clearTrimPreviewTimer();
    const nextUrl = URL.createObjectURL(file);
    setVideoObjectUrl(nextUrl);
    setFrameError("");
    setVideoDuration(0);
    setCapturingFrame(true);
    updateVideo({
      videoUrl: nextUrl,
      videoFrame: "",
      sourceName: file.name || "Uploaded video",
      trimStart: 0,
      exportDuration: VIDEO_EXPORT_DEFAULT_SECONDS,
    });
    try {
      const frame = await extractVideoFrame(nextUrl);
      setVideoDesign((current) => (
        current.videoUrl === nextUrl
          ? { ...current, videoFrame: frame }
          : current
      ));
    } catch {
      setFrameError("Couldn't capture a still frame from that video. Try the current-frame button after it loads.");
    } finally {
      setCapturingFrame(false);
    }
  }

  function handleVideoUrl(value) {
    clearTrimPreviewTimer();
    setVideoObjectUrl("");
    setFrameError("");
    setVideoDuration(0);
    updateVideo({
      videoUrl: value,
      videoFrame: "",
      sourceName: value ? "Video URL" : "",
      trimStart: 0,
      exportDuration: VIDEO_EXPORT_DEFAULT_SECONDS,
    });
  }

  function handlePreviewVideoMetadata(event) {
    const duration = Number(event.currentTarget.duration);
    const nextDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
    setVideoDuration(nextDuration);
    if (nextDuration > 0) {
      setVideoDesign((current) => {
        const maxStart = maxVideoTrimStart(nextDuration);
        const trimStart = clampTrimValue(current.trimStart, 0, maxStart);
        const maxLength = maxVideoExportLength(nextDuration, trimStart);
        const exportDuration = clampTrimValue(current.exportDuration, VIDEO_EXPORT_MIN_SECONDS, maxLength);
        return trimStart === current.trimStart && exportDuration === current.exportDuration
          ? current
          : { ...current, trimStart, exportDuration };
      });
    }
  }

  function setTrimStartFromPreview() {
    const video = previewVideoRef.current;
    if (!video) return;
    const currentTime = Math.floor(Number(video.currentTime) || 0);
    const maxStart = maxVideoTrimStart(videoDuration);
    const trimStart = clampTrimValue(currentTime, 0, maxStart);
    const maxLength = maxVideoExportLength(videoDuration, trimStart);
    updateVideo({
      trimStart,
      exportDuration: clampTrimValue(videoDesign.exportDuration, VIDEO_EXPORT_MIN_SECONDS, maxLength),
    });
  }

  function setTrimEndFromPreview() {
    const video = previewVideoRef.current;
    if (!video) return;
    const currentTime = Math.ceil(Number(video.currentTime) || 0);
    const trimStart = Number(videoDesign.trimStart) || 0;
    const exportDuration = clampTrimValue(
      currentTime - trimStart,
      VIDEO_EXPORT_MIN_SECONDS,
      maxVideoExportLength(videoDuration, trimStart)
    );
    updateVideo({ exportDuration });
  }

  function useFullVideoTrim() {
    if (videoDuration <= 0) return;
    updateVideo({
      trimStart: 0,
      exportDuration: maxVideoExportLength(videoDuration, 0),
    });
  }

  function playTrimPreview() {
    const video = previewVideoRef.current;
    if (!video) return;
    clearTrimPreviewTimer();
    const start = Number(videoDesign.trimStart) || 0;
    const duration = Math.max(0.5, Number(videoDesign.exportDuration) || VIDEO_EXPORT_DEFAULT_SECONDS);
    try {
      video.currentTime = start;
    } catch {}
    video.play().catch(() => {});
    trimPreviewTimerRef.current = window.setTimeout(() => {
      video.pause();
      trimPreviewTimerRef.current = null;
    }, Math.ceil(duration * 1000));
  }

  function captureCurrentVideoFrame() {
    const video = previewVideoRef.current;
    if (!video || !video.videoWidth) {
      setFrameError("The video is not ready yet.");
      return;
    }
    setFrameError("");
    try {
      updateVideo({ videoFrame: drawVideoFrame(video) });
    } catch {
      setFrameError("This video cannot be captured by the browser. Upload the file directly if it came from another site.");
    }
  }

  async function handleDownload() {
    if (exporting) return;
    setExporting(true);
    setExportError("");
    try {
      const fileBase = mode === "news"
        ? safeFilename(newsDesign.headline, "news-post")
        : safeFilename(`${videoDesign.artist}-${videoDesign.title}`, "video-post");
      if (mode === "video") {
        await exportVideoPostFile(videoDesign, `ngoma-video-post-${fileBase}`);
        clearVideoMedia();
      } else if (posterRef.current) {
        await exportNodeAsPng(posterRef.current, `ngoma-news-post-${fileBase}.png`);
      }
    } catch (err) {
      setExportError(err.message || "Couldn't generate the file. Try again after the media finishes loading.");
    } finally {
      setExporting(false);
    }
  }

  const activeTheme = mode === "news" ? newsDesign.theme : videoDesign.theme;
  const videoExportType = preferredVideoMimeType();
  const trimStartMax = maxVideoTrimStart(videoDuration);
  const effectiveTrimStart = clampTrimValue(videoDesign.trimStart, 0, trimStartMax);
  const exportLengthMax = maxVideoExportLength(videoDuration, effectiveTrimStart);
  const effectiveExportDuration = clampTrimValue(videoDesign.exportDuration, VIDEO_EXPORT_MIN_SECONDS, exportLengthMax);
  const trimEnd = videoDuration > 0
    ? Math.min(videoDuration, effectiveTrimStart + effectiveExportDuration)
    : effectiveTrimStart + effectiveExportDuration;
  const canDownload = mode === "news"
    ? Boolean(newsDesign.headline.trim())
    : Boolean(videoDesign.videoUrl && videoDesign.title.trim() && videoDesign.artist.trim() && videoExportType);

  return (
    <section>
      <div className="cms-page-head">
        <div>
          <h1>Post Designer</h1>
          <p>Create share-ready news and video post designs for Ngoma social channels.</p>
        </div>
      </div>

      {error && <div className="cms-alert error">{error}</div>}
      {exportError && <div className="cms-alert error">{exportError}</div>}

      <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div className="cms-card" style={{ flex: "1 1 380px", minWidth: 300 }}>
          <div className="cms-card-heading"><h2>Designer</h2></div>

          <SegmentedControl label="Post type" value={mode} options={MODE_OPTIONS} onChange={setMode} />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0 4px" }}>
            <button
              type="button"
              className="cms-btn light small"
              onClick={mode === "news" ? resetNewsSettings : resetVideoSettings}
            >
              Reset settings
            </button>
            <button
              type="button"
              className="cms-btn light small"
              onClick={mode === "news" ? resetNewsAll : resetVideoAll}
            >
              Reset all
            </button>
          </div>

          {mode === "news" ? (
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ borderTop: "1px solid var(--cms-line)", paddingTop: 16 }}>
                <ControlField label="Import news article">
                  <input
                    className="cms-select"
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search headlines..."
                  />
                </ControlField>

                {searching && <div className="cms-help" style={{ marginTop: 8 }}>Searching...</div>}

                {results.length > 0 && (
                  <div style={{ display: "grid", gap: 6, maxHeight: 260, overflowY: "auto", marginTop: 10 }}>
                    {results.map((candidate) => (
                      <button
                        key={candidate.id}
                        type="button"
                        onClick={() => applyArticle(candidate)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "8px 10px",
                          borderRadius: 10,
                          border: `1px solid ${selectedArticleId === candidate.id ? "var(--cms-gold)" : "var(--cms-line)"}`,
                          background: selectedArticleId === candidate.id ? "var(--cms-gold-soft)" : "#fff",
                          cursor: "pointer",
                          textAlign: "left",
                          font: "inherit",
                        }}
                      >
                        {candidate.image
                          ? <img src={candidate.image} alt="" className="cms-chart-image" />
                          : <span className="cms-chart-image cms-chart-image-empty">N</span>}
                        <span style={{ minWidth: 0 }}>
                          <strong style={{ display: "block", fontSize: 13 }}>{candidate.title}</strong>
                          {candidate.category && <small className="cms-row-subtitle">{candidate.category}</small>}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ borderTop: "1px solid var(--cms-line)", paddingTop: 16, display: "grid", gap: 14 }}>
                <div style={FIELD_LABEL}>
                  Image
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <label className="cms-btn light small" style={{ display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
                      {newsDesign.image ? "Replace image" : "Insert image"}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={(event) => handleNewsImageFile(event.target.files?.[0])}
                      />
                    </label>
                    {newsDesign.image && (
                      <button type="button" className="cms-btn light small" onClick={() => updateNews({ image: "" })}>
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <ControlField label="Image URL">
                  <input
                    className="cms-select"
                    type="url"
                    value={newsDesign.image.startsWith("blob:") ? "" : newsDesign.image}
                    onChange={(event) => {
                      setNewsImageObjectUrl("");
                      setSelectedArticleId(null);
                      updateNews({ image: event.target.value });
                    }}
                    placeholder="https://..."
                  />
                </ControlField>

                <ControlField label="Headline">
                  <textarea
                    className="cms-select"
                    value={newsDesign.headline}
                    onChange={(event) => updateNews({ headline: event.target.value })}
                    rows={3}
                    style={{ minHeight: 92, resize: "vertical" }}
                  />
                </ControlField>

                <ControlField label="Subheadline">
                  <textarea
                    className="cms-select"
                    value={newsDesign.subheadline}
                    onChange={(event) => updateNews({ subheadline: event.target.value })}
                    rows={2}
                    style={{ minHeight: 70, resize: "vertical" }}
                  />
                </ControlField>

                <div style={CONTROL_GRID}>
                  <ControlField label="Category">
                    <input
                      className="cms-select"
                      value={newsDesign.category}
                      onChange={(event) => updateNews({ category: event.target.value })}
                    />
                  </ControlField>
                  <ControlField label="Accent">
                    <input
                      className="cms-select"
                      type="color"
                      value={newsDesign.accent}
                      onChange={(event) => updateNews({ accent: event.target.value })}
                      style={{ height: 39, padding: 4 }}
                    />
                  </ControlField>
                </div>

                <SegmentedControl label="Theme" value={newsDesign.theme} options={THEME_OPTIONS} onChange={(value) => updateNews({ theme: value })} />
                <SegmentedControl label="Headline position" value={newsDesign.textPosition} options={TEXT_POSITIONS} onChange={(value) => updateNews({ textPosition: value })} />
                <SegmentedControl label="Text align" value={newsDesign.textAlign} options={TEXT_ALIGNMENTS} onChange={(value) => updateNews({ textAlign: value })} />
                <SegmentedControl label="Text case" value={newsDesign.textCase} options={TEXT_CASE_OPTIONS} onChange={(value) => updateNews({ textCase: value })} />
                <SegmentedControl label="Finish" value={newsDesign.finish} options={POSTER_FINISH_OPTIONS} onChange={(value) => updateNews({ finish: value })} />
                <SegmentedControl label="Frame" value={newsDesign.frame} options={POSTER_FRAME_OPTIONS} onChange={(value) => updateNews({ frame: value })} />
                <SegmentedControl label="Tone" value={newsDesign.tone} options={POSTER_TONE_OPTIONS} onChange={(value) => updateNews({ tone: value })} />

                <div style={CONTROL_GRID}>
                  <ColorControl label="Headline color" value={newsDesign.textColor} fallback={defaultTextColor(newsDesign.theme)} onChange={(value) => updateNews({ textColor: value })} />
                  <ColorControl label="Secondary color" value={newsDesign.secondaryTextColor} fallback={defaultSecondaryTextColor(newsDesign.theme)} onChange={(value) => updateNews({ secondaryTextColor: value })} />
                  <ColorControl label="Brand color" value={newsDesign.brandTextColor} fallback={defaultBrandTextColor(newsDesign.theme)} onChange={(value) => updateNews({ brandTextColor: value })} />
                  <ColorControl label="Footer color" value={newsDesign.footerTextColor} fallback={defaultFooterTextColor(newsDesign.theme)} onChange={(value) => updateNews({ footerTextColor: value })} />
                </div>

                <div style={CONTROL_GRID}>
                  <ToggleControl label="Brand" checked={newsDesign.showBrand !== false} onChange={(value) => updateNews({ showBrand: value })} />
                  <ToggleControl label="Footer" checked={newsDesign.showFooter !== false} onChange={(value) => updateNews({ showFooter: value })} />
                  <ToggleControl label="Category" checked={newsDesign.showCategory !== false} onChange={(value) => updateNews({ showCategory: value })} />
                  <ToggleControl label="Subheadline" checked={newsDesign.showSubheadline !== false} onChange={(value) => updateNews({ showSubheadline: value })} />
                </div>

                <div style={CONTROL_GRID}>
                  <RangeControl label="Zoom" min={100} max={170} value={newsDesign.imageZoom} suffix="%" onChange={(value) => updateNews({ imageZoom: value })} />
                  <RangeControl label="Overlay" min={15} max={82} value={newsDesign.overlay} suffix="%" onChange={(value) => updateNews({ overlay: value })} />
                  <RangeControl label="Horizontal" min={0} max={100} value={newsDesign.imageX} suffix="%" onChange={(value) => updateNews({ imageX: value })} />
                  <RangeControl label="Vertical" min={0} max={100} value={newsDesign.imageY} suffix="%" onChange={(value) => updateNews({ imageY: value })} />
                  <RangeControl label="Headline size" min={70} max={135} value={newsDesign.headlineScale} suffix="%" onChange={(value) => updateNews({ headlineScale: value })} />
                  <RangeControl label="Subheadline size" min={70} max={135} value={newsDesign.subheadlineScale} suffix="%" onChange={(value) => updateNews({ subheadlineScale: value })} />
                  <RangeControl label="Category size" min={70} max={140} value={newsDesign.categoryScale} suffix="%" onChange={(value) => updateNews({ categoryScale: value })} />
                  <RangeControl label="Brand size" min={70} max={135} value={newsDesign.brandScale} suffix="%" onChange={(value) => updateNews({ brandScale: value })} />
                  <RangeControl label="Text width" min={45} max={100} value={newsDesign.textWidth} suffix="%" onChange={(value) => updateNews({ textWidth: value })} />
                  <RangeControl label="Text vertical" min={-220} max={220} value={newsDesign.textOffsetY} suffix="px" onChange={(value) => updateNews({ textOffsetY: value })} />
                  <RangeControl label="Text shadow" min={0} max={160} value={newsDesign.shadow} suffix="%" onChange={(value) => updateNews({ shadow: value })} />
                  <RangeControl label="Design intensity" min={0} max={100} value={newsDesign.designIntensity} suffix="%" onChange={(value) => updateNews({ designIntensity: value })} />
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ borderTop: "1px solid var(--cms-line)", paddingTop: 16, display: "grid", gap: 14 }}>
                <div style={FIELD_LABEL}>
                  Video
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <label className="cms-btn light small" style={{ display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
                      {videoDesign.videoUrl ? "Replace video" : "Insert video"}
                      <input
                        type="file"
                        accept="video/*"
                        style={{ display: "none" }}
                        onChange={(event) => handleVideoFile(event.target.files?.[0])}
                      />
                    </label>
                    {videoDesign.videoUrl && (
                      <button
                        type="button"
                        className="cms-btn light small"
                        onClick={clearVideoMedia}
                      >
                        Clear
                      </button>
                    )}
                    {videoDesign.videoUrl && (
                      <button type="button" className="cms-btn light small" onClick={captureCurrentVideoFrame}>
                        Capture frame
                      </button>
                    )}
                    {videoDesign.videoUrl && (
                      <>
                        <button type="button" className="cms-btn light small" onClick={setTrimStartFromPreview}>
                          Set trim start
                        </button>
                        <button type="button" className="cms-btn light small" onClick={setTrimEndFromPreview}>
                          Set trim end
                        </button>
                        <button type="button" className="cms-btn light small" onClick={playTrimPreview}>
                          Play trimmed clip
                        </button>
                        <button type="button" className="cms-btn light small" onClick={useFullVideoTrim} disabled={videoDuration <= 0}>
                          Use full video
                        </button>
                      </>
                    )}
                  </div>
                  {(videoDesign.sourceName || capturingFrame) && (
                    <span className="cms-help" style={{ textTransform: "none", letterSpacing: 0, fontWeight: 650 }}>
                      {capturingFrame ? "Capturing preview frame..." : videoDesign.sourceName}
                    </span>
                  )}
                  {frameError && (
                    <span className="cms-help" style={{ textTransform: "none", letterSpacing: 0, fontWeight: 650, color: "var(--cms-danger)" }}>
                      {frameError}
                    </span>
                  )}
                </div>

                <ControlField label="Video URL">
                  <input
                    className="cms-select"
                    type="url"
                    value={videoDesign.videoUrl.startsWith("blob:") ? "" : videoDesign.videoUrl}
                    onChange={(event) => handleVideoUrl(event.target.value)}
                    placeholder="https://..."
                  />
                </ControlField>

                {videoDesign.videoUrl && (
                  <video
                    ref={previewVideoRef}
                    src={videoDesign.videoUrl}
                    poster={videoDesign.videoFrame || undefined}
                    controls
                    playsInline
                    preload="metadata"
                    onLoadedMetadata={handlePreviewVideoMetadata}
                    style={{
                      width: "100%",
                      maxHeight: 220,
                      borderRadius: 12,
                      background: "#050505",
                      border: "1px solid var(--cms-line)",
                    }}
                  />
                )}

                <ControlField label="Title">
                  <textarea
                    className="cms-select"
                    value={videoDesign.title}
                    onChange={(event) => updateVideo({ title: event.target.value })}
                    rows={2}
                    style={{ minHeight: 72, resize: "vertical" }}
                  />
                </ControlField>

                <ControlField label="Artist name">
                  <input
                    className="cms-select"
                    value={videoDesign.artist}
                    onChange={(event) => updateVideo({ artist: event.target.value })}
                  />
                </ControlField>

                <div style={CONTROL_GRID}>
                  <ControlField label="Accent">
                    <input
                      className="cms-select"
                      type="color"
                      value={videoDesign.accent}
                      onChange={(event) => updateVideo({ accent: event.target.value })}
                      style={{ height: 39, padding: 4 }}
                    />
                  </ControlField>
                  <SegmentedControl label="Theme" value={videoDesign.theme} options={THEME_OPTIONS} onChange={(value) => updateVideo({ theme: value })} />
                </div>

                <SegmentedControl label="Title position" value={videoDesign.textPosition} options={TEXT_POSITIONS} onChange={(value) => updateVideo({ textPosition: value })} />
                <SegmentedControl label="Text align" value={videoDesign.textAlign} options={TEXT_ALIGNMENTS} onChange={(value) => updateVideo({ textAlign: value })} />
                <SegmentedControl label="Text case" value={videoDesign.textCase} options={TEXT_CASE_OPTIONS} onChange={(value) => updateVideo({ textCase: value })} />
                <SegmentedControl label="Finish" value={videoDesign.finish} options={POSTER_FINISH_OPTIONS} onChange={(value) => updateVideo({ finish: value })} />
                <SegmentedControl label="Frame" value={videoDesign.frame} options={POSTER_FRAME_OPTIONS} onChange={(value) => updateVideo({ frame: value })} />
                <SegmentedControl label="Tone" value={videoDesign.tone} options={POSTER_TONE_OPTIONS} onChange={(value) => updateVideo({ tone: value })} />

                <div style={CONTROL_GRID}>
                  <ColorControl label="Title color" value={videoDesign.textColor} fallback={defaultTextColor(videoDesign.theme)} onChange={(value) => updateVideo({ textColor: value })} />
                  <ColorControl label="Artist color" value={videoDesign.secondaryTextColor} fallback={defaultSecondaryTextColor(videoDesign.theme)} onChange={(value) => updateVideo({ secondaryTextColor: value })} />
                  <ColorControl label="Brand color" value={videoDesign.brandTextColor} fallback={defaultBrandTextColor(videoDesign.theme)} onChange={(value) => updateVideo({ brandTextColor: value })} />
                  <ColorControl label="Footer color" value={videoDesign.footerTextColor} fallback={defaultFooterTextColor(videoDesign.theme)} onChange={(value) => updateVideo({ footerTextColor: value })} />
                </div>

                <div style={CONTROL_GRID}>
                  <ToggleControl label="Brand" checked={videoDesign.showBrand !== false} onChange={(value) => updateVideo({ showBrand: value })} />
                  <ToggleControl label="Footer" checked={videoDesign.showFooter !== false} onChange={(value) => updateVideo({ showFooter: value })} />
                  <ToggleControl label="Video label" checked={videoDesign.showBadge !== false} onChange={(value) => updateVideo({ showBadge: value })} />
                </div>

                <div style={CONTROL_GRID}>
                  <RangeControl label="Zoom" min={100} max={170} value={videoDesign.mediaZoom} suffix="%" onChange={(value) => updateVideo({ mediaZoom: value })} />
                  <RangeControl label="Overlay" min={15} max={82} value={videoDesign.overlay} suffix="%" onChange={(value) => updateVideo({ overlay: value })} />
                  <RangeControl label="Horizontal" min={0} max={100} value={videoDesign.mediaX} suffix="%" onChange={(value) => updateVideo({ mediaX: value })} />
                  <RangeControl label="Vertical" min={0} max={100} value={videoDesign.mediaY} suffix="%" onChange={(value) => updateVideo({ mediaY: value })} />
                  <RangeControl label="Title size" min={70} max={135} value={videoDesign.titleScale} suffix="%" onChange={(value) => updateVideo({ titleScale: value })} />
                  <RangeControl label="Artist size" min={70} max={135} value={videoDesign.artistScale} suffix="%" onChange={(value) => updateVideo({ artistScale: value })} />
                  <RangeControl label="Label size" min={70} max={140} value={videoDesign.labelScale} suffix="%" onChange={(value) => updateVideo({ labelScale: value })} />
                  <RangeControl label="Brand size" min={70} max={135} value={videoDesign.brandScale} suffix="%" onChange={(value) => updateVideo({ brandScale: value })} />
                  <RangeControl label="Text width" min={45} max={100} value={videoDesign.textWidth} suffix="%" onChange={(value) => updateVideo({ textWidth: value })} />
                  <RangeControl label="Text vertical" min={-220} max={220} value={videoDesign.textOffsetY} suffix="px" onChange={(value) => updateVideo({ textOffsetY: value })} />
                  <RangeControl label="Text shadow" min={0} max={160} value={videoDesign.shadow} suffix="%" onChange={(value) => updateVideo({ shadow: value })} />
                  <RangeControl label="Design intensity" min={0} max={100} value={videoDesign.designIntensity} suffix="%" onChange={(value) => updateVideo({ designIntensity: value })} />
                  <RangeControl label="Trim start" min={0} max={trimStartMax} value={effectiveTrimStart} suffix="s" onChange={(value) => updateVideo({ trimStart: value })} />
                  <RangeControl label="Export length" min={VIDEO_EXPORT_MIN_SECONDS} max={exportLengthMax} value={effectiveExportDuration} suffix="s" onChange={(value) => updateVideo({ exportDuration: value })} />
                </div>
                <span className="cms-help" style={{ textTransform: "none", letterSpacing: 0, fontWeight: 650 }}>
                  Trim exports {formatSeconds(effectiveTrimStart)} to {formatSeconds(trimEnd)}
                  {videoDuration > 0 ? ` from this ${formatSeconds(videoDuration)} video.` : "."}
                </span>
              </div>
            </div>
          )}

          <button
            type="button"
            className="cms-btn full"
            style={{ marginTop: 20 }}
            onClick={handleDownload}
            disabled={exporting || !canDownload}
          >
            {exporting
              ? mode === "video" ? "Rendering video..." : "Generating..."
              : mode === "news"
                ? "Download news post (PNG)"
                : `Download video post (${(videoExportType?.[1] || "video").toUpperCase()})`}
          </button>
          <p className="cms-help" style={{ marginTop: 10 }}>
            {mode === "video" ? superHdHelpText("video") : superHdHelpText("poster")}
            {mode === "video" ? " Audio is preserved from the original browser-readable video." : ""}
          </p>
          {mode === "video" && !videoExportType && (
            <div className="cms-alert warning">This browser cannot export video posts. Use Chrome or Edge.</div>
          )}
        </div>

        <div style={{ flex: "0 0 auto" }}>
          <div
            style={{
              width: PREVIEW_W,
              height: PREVIEW_W * (POSTER_H / POSTER_W),
              overflow: "hidden",
              borderRadius: 18,
              border: "1px solid var(--cms-line)",
              boxShadow: "0 20px 50px rgba(20,16,4,.18)",
              background: POSTER_THEMES[activeTheme]?.pageBg || "#050505",
            }}
          >
            <div style={{ width: POSTER_W, height: POSTER_H, transform: `scale(${PREVIEW_SCALE})`, transformOrigin: "top left" }}>
              {mode === "news"
                ? <NewsPostContent design={newsDesign} />
                : <VideoPostContent design={videoDesign} />}
            </div>
          </div>
        </div>

        <div style={{ position: "fixed", top: 0, left: -99999, pointerEvents: "none" }} aria-hidden="true">
          <div ref={posterRef}>
            {mode === "news"
              ? <NewsPostContent design={newsDesign} />
              : <VideoPostContent design={videoDesign} exportMode />}
          </div>
        </div>
      </div>
    </section>
  );
}
