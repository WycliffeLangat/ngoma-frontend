import { useEffect, useRef, useState } from "react";
import { resolveMediaUrl } from "../../api/config.js";
import { cmsApi, getResults, qs } from "../api.js";
import {
  POSTER_W,
  POSTER_H,
  PREVIEW_W,
  PREVIEW_SCALE,
  POSTER_FONT_FAMILY,
  POSTER_THEMES,
  PosterBrandRow,
  PosterFooter,
  ArtPlaceholder,
  readableInk,
  exportNodeAsPng,
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

function textBoxPosition(position) {
  if (position === "top") return { top: 258 };
  if (position === "center") return { top: 520, transform: "translateY(-50%)" };
  return { bottom: 142 };
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
  const textColor = design.theme === "light" ? "#0C0C0C" : "#FFFFFF";
  const metaColor = design.theme === "light" ? "#30352F" : "#E1E4DC";
  const textShadow = design.theme === "light"
    ? "0 2px 22px rgba(255,255,255,.72)"
    : "0 3px 26px rgba(0,0,0,.58)";

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
          }}
        />
      ) : (
        <MediaPlaceholder label="Insert image" theme={design.theme} accent={design.accent} />
      )}

      <div style={{ position: "absolute", inset: 0, ...overlayStyle(design.theme, design.overlay, design.textPosition) }} />

      <div style={{ position: "relative", zIndex: 1, padding: `58px ${padX}px 0` }}>
        <PosterBrandRow theme={design.theme} size={54} fontSize={25} />
      </div>

      <div
        style={{
          position: "absolute",
          left: padX,
          right: padX,
          zIndex: 1,
          textAlign: design.textAlign,
          ...textBoxPosition(design.textPosition),
        }}
      >
        {design.category && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              maxWidth: "100%",
              padding: "8px 18px",
              borderRadius: 999,
              background: design.accent,
              color: readableInk(design.accent),
              fontSize: 17,
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
            marginTop: design.category ? 20 : 0,
            fontSize: headlineSize(design.headline),
            fontWeight: 950,
            lineHeight: 1.04,
            letterSpacing: 0,
            textTransform: "uppercase",
            color: textColor,
            textShadow,
            display: "-webkit-box",
            WebkitLineClamp: 4,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {design.headline || "Write headline"}
        </div>

        {design.subheadline && (
          <div
            style={{
              marginTop: 18,
              maxWidth: design.textAlign === "center" ? 860 : 820,
              marginLeft: design.textAlign === "right" ? "auto" : design.textAlign === "center" ? "auto" : 0,
              marginRight: design.textAlign === "center" ? "auto" : 0,
              color: metaColor,
              fontSize: 30,
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

      <PosterFooter theme={design.theme} padX={padX} />
    </div>
  );
}

function PlayBadge({ accent }) {
  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: 132,
        height: 132,
        borderRadius: "50%",
        background: `${accent}E6`,
        boxShadow: `0 18px 55px ${accent}55`,
        display: "grid",
        placeItems: "center",
        zIndex: 1,
      }}
    >
      <span
        style={{
          display: "block",
          width: 0,
          height: 0,
          marginLeft: 10,
          borderTop: "28px solid transparent",
          borderBottom: "28px solid transparent",
          borderLeft: `42px solid ${readableInk(accent)}`,
        }}
      />
    </div>
  );
}

function VideoPostContent({ design, exportMode = false, videoRef = null }) {
  const t = POSTER_THEMES[design.theme] || POSTER_THEMES.dark;
  const padX = 62;
  const textColor = design.theme === "light" ? "#0C0C0C" : "#FFFFFF";
  const metaColor = design.theme === "light" ? "#30352F" : "#E1E4DC";
  const mediaStyle = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: `${design.mediaX}% ${design.mediaY}%`,
    transform: mediaTransform(design.mediaZoom),
    transformOrigin: "center",
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
          muted
          loop
          playsInline
          autoPlay
          style={mediaStyle}
        />
      ) : design.videoFrame ? (
        <img src={design.videoFrame} alt="" style={mediaStyle} />
      ) : (
        <MediaPlaceholder label="Insert video" theme={design.theme} accent={design.accent} />
      )}

      <div style={{ position: "absolute", inset: 0, ...overlayStyle(design.theme, design.overlay, design.textPosition) }} />
      {design.videoUrl && <PlayBadge accent={design.accent} />}

      <div style={{ position: "relative", zIndex: 2, padding: `58px ${padX}px 0` }}>
        <PosterBrandRow theme={design.theme} size={54} fontSize={25} />
      </div>

      <div
        style={{
          position: "absolute",
          left: padX,
          right: padX,
          zIndex: 2,
          textAlign: design.textAlign,
          ...textBoxPosition(design.textPosition),
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            maxWidth: "100%",
            padding: "8px 18px",
            borderRadius: 999,
            background: design.accent,
            color: readableInk(design.accent),
            fontSize: 17,
            fontWeight: 950,
            letterSpacing: "1.2px",
            textTransform: "uppercase",
          }}
        >
          Video
        </span>

        <div
          style={{
            marginTop: 20,
            fontSize: titleSize(design.title),
            fontWeight: 950,
            lineHeight: 1.02,
            letterSpacing: 0,
            textTransform: "uppercase",
            color: textColor,
            textShadow: design.theme === "light" ? "0 2px 22px rgba(255,255,255,.74)" : "0 3px 26px rgba(0,0,0,.62)",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {design.title || "Video title"}
        </div>

        <div
          style={{
            marginTop: 18,
            color: metaColor,
            fontSize: 34,
            fontWeight: 850,
            lineHeight: 1.2,
            textShadow: design.theme === "light" ? "0 2px 18px rgba(255,255,255,.72)" : "0 3px 22px rgba(0,0,0,.62)",
            textTransform: "uppercase",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {design.artist || "Artist name"}
        </div>
      </div>

      <PosterFooter theme={design.theme} padX={padX} />
    </div>
  );
}

export default function NewsCardPage() {
  const [mode, setMode] = useState("news");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState(null);
  const [newsDesign, setNewsDesign] = useState(DEFAULT_NEWS_DESIGN);
  const [videoDesign, setVideoDesign] = useState(DEFAULT_VIDEO_DESIGN);
  const [newsImageObjectUrl, setNewsImageObjectUrl] = useState("");
  const [videoObjectUrl, setVideoObjectUrl] = useState("");
  const [error, setError] = useState("");
  const [exportError, setExportError] = useState("");
  const [frameError, setFrameError] = useState("");
  const [capturingFrame, setCapturingFrame] = useState(false);
  const [exporting, setExporting] = useState(false);
  const posterRef = useRef(null);
  const previewVideoRef = useRef(null);

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
    const nextUrl = URL.createObjectURL(file);
    setVideoObjectUrl(nextUrl);
    setFrameError("");
    setCapturingFrame(true);
    updateVideo({ videoUrl: nextUrl, videoFrame: "", sourceName: file.name || "Uploaded video" });
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
    setVideoObjectUrl("");
    setFrameError("");
    updateVideo({
      videoUrl: value,
      videoFrame: "",
      sourceName: value ? "Video URL" : "",
    });
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
    if (!posterRef.current || exporting) return;
    setExporting(true);
    setExportError("");
    try {
      const fileBase = mode === "news"
        ? safeFilename(newsDesign.headline, "news-post")
        : safeFilename(`${videoDesign.artist}-${videoDesign.title}`, "video-post");
      await exportNodeAsPng(posterRef.current, `ngoma-${mode}-post-${fileBase}.png`);
    } catch {
      setExportError("Couldn't generate the image. Try again after the media finishes loading.");
    } finally {
      setExporting(false);
    }
  }

  const activeTheme = mode === "news" ? newsDesign.theme : videoDesign.theme;
  const canDownload = mode === "news"
    ? Boolean(newsDesign.headline.trim())
    : Boolean(videoDesign.videoUrl && videoDesign.videoFrame && videoDesign.title.trim() && videoDesign.artist.trim());

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

                <div style={CONTROL_GRID}>
                  <RangeControl label="Zoom" min={100} max={170} value={newsDesign.imageZoom} suffix="%" onChange={(value) => updateNews({ imageZoom: value })} />
                  <RangeControl label="Overlay" min={15} max={82} value={newsDesign.overlay} suffix="%" onChange={(value) => updateNews({ overlay: value })} />
                  <RangeControl label="Horizontal" min={0} max={100} value={newsDesign.imageX} suffix="%" onChange={(value) => updateNews({ imageX: value })} />
                  <RangeControl label="Vertical" min={0} max={100} value={newsDesign.imageY} suffix="%" onChange={(value) => updateNews({ imageY: value })} />
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
                        onClick={() => {
                          setVideoObjectUrl("");
                          updateVideo({ videoUrl: "", videoFrame: "", sourceName: "" });
                        }}
                      >
                        Clear
                      </button>
                    )}
                    {videoDesign.videoUrl && (
                      <button type="button" className="cms-btn light small" onClick={captureCurrentVideoFrame}>
                        Capture frame
                      </button>
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

                <div style={CONTROL_GRID}>
                  <RangeControl label="Zoom" min={100} max={170} value={videoDesign.mediaZoom} suffix="%" onChange={(value) => updateVideo({ mediaZoom: value })} />
                  <RangeControl label="Overlay" min={15} max={82} value={videoDesign.overlay} suffix="%" onChange={(value) => updateVideo({ overlay: value })} />
                  <RangeControl label="Horizontal" min={0} max={100} value={videoDesign.mediaX} suffix="%" onChange={(value) => updateVideo({ mediaX: value })} />
                  <RangeControl label="Vertical" min={0} max={100} value={videoDesign.mediaY} suffix="%" onChange={(value) => updateVideo({ mediaY: value })} />
                </div>
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
              ? "Generating..."
              : mode === "news"
                ? "Download news post (PNG)"
                : "Download video post cover (PNG)"}
          </button>
          <p className="cms-help" style={{ marginTop: 10 }}>
            Exports at {POSTER_W}x{POSTER_H}px (4:5), 2x resolution.
          </p>
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
                : <VideoPostContent design={videoDesign} videoRef={previewVideoRef} />}
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
