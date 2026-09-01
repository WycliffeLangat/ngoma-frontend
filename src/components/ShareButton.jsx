import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { exportNodeAsPng } from "../admin/utils/exportPoster.jsx";
import { trackEvent } from "../utils/track.js";

// Share entry point for any reader-facing page or detail panel (song,
// album, artist, charts, head-to-head, certifications...). Offers a copy-link
// action plus one or more poster download actions. `posterContent` keeps the
// original single-poster path; chart pages can pass `posterDownloadOptions`
// where a choice may download one poster or a batch of poster files.
export default function ShareButton({
  shareUrl,
  fileName,
  posterContent,
  posterDownloadOptions,
  isDark,
  F,
  GOLD,
  compact = false,
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  const [failedDownloadId, setFailedDownloadId] = useState(null);
  const [activeDownloadId, setActiveDownloadId] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState("");
  const [menuPos, setMenuPos] = useState(null);
  const posterRefs = useRef(new Map());
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const downloadChoices = (Array.isArray(posterDownloadOptions) && posterDownloadOptions.length
    ? posterDownloadOptions
    : posterContent
      ? [{ id: "poster", label: "Download poster", fileName, posterContent }]
      : []
  ).map((option, optionIndex) => {
    const id = option.id || `poster-${optionIndex}`;
    const rawFiles = Array.isArray(option.files) && option.files.length
      ? option.files
      : [{ fileName: option.fileName || fileName, posterContent: option.posterContent ?? option.content ?? posterContent }];
    const files = rawFiles.map((item, itemIndex) => ({
      ...item,
      key: `${id}-${item.id || item.fileName || itemIndex}`,
      fileName: item.fileName || option.fileName || fileName || `ngoma-poster-${itemIndex + 1}.png`,
      posterContent: item.posterContent ?? item.content,
    })).filter((item) => item.posterContent);
    return {
      ...option,
      id,
      label: option.label || (files.length > 1 ? `Download ${files.length} posters` : "Download poster"),
      files,
    };
  }).filter((option) => option.files.length);

  const hasPosterDownloads = downloadChoices.length > 0;
  const hiddenPosterItems = downloadChoices.flatMap((option) => option.files);

  useEffect(() => {
    if (!open) return undefined;
    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const estimatedMenuHeight = 60 + (hasPosterDownloads ? downloadChoices.length * 48 : 0);
      const openUpward = window.innerHeight - rect.bottom < estimatedMenuHeight + 8 && rect.top > estimatedMenuHeight;
      setMenuPos(openUpward
        ? { bottom: window.innerHeight - rect.top + 8, right: window.innerWidth - rect.right }
        : { top: rect.bottom + 8, right: window.innerWidth - rect.right });
    };
    updatePosition();
    const onDocClick = (event) => {
      if (
        containerRef.current && !containerRef.current.contains(event.target) &&
        menuRef.current && !menuRef.current.contains(event.target)
      ) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, hasPosterDownloads, downloadChoices.length]);

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    trackEvent({ eventType: "click", label: `share_copy_link_${fileName || "share"}` });
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard access can be denied by the browser; the link row still
      // shows the URL so the reader can select and copy it manually.
    }
  };

  const handleDownloadPoster = async (choice) => {
    if (!choice?.files?.length || downloading) return;
    trackEvent({ eventType: "click", label: `share_download_${choice.id || fileName || "poster"}` });
    setDownloading(true);
    setActiveDownloadId(choice.id);
    setDownloadProgress("");
    setDownloadError(false);
    setFailedDownloadId(null);
    try {
      for (let index = 0; index < choice.files.length; index += 1) {
        const item = choice.files[index];
        const node = posterRefs.current.get(item.key);
        if (!node) throw new Error("Poster render target missing");
        setDownloadProgress(choice.files.length > 1 ? `${index + 1}/${choice.files.length}` : "");
        await exportNodeAsPng(node, item.fileName);
      }
    } catch {
      setDownloadError(true);
      setFailedDownloadId(choice.id);
    } finally {
      setDownloading(false);
      setActiveDownloadId(null);
      setDownloadProgress("");
    }
  };

  const downloadButtonLabel = (choice) => {
    if (downloading && activeDownloadId === choice.id) {
      return downloadProgress ? `Preparing ${downloadProgress}...` : "Preparing poster...";
    }
    if (downloadError && failedDownloadId === choice.id) return "Try again";
    return choice.label;
  };

  const menuItemStyle = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    width: "100%",
    padding: "11px 14px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontFamily: F,
    fontSize: "13px",
    fontWeight: 700,
    color: isDark ? "#FFFFFF" : "#000000",
    textAlign: "left",
    borderRadius: "10px",
  };

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        ref={buttonRef}
        type="button"
        onClick={(event) => { event.stopPropagation(); setOpen((value) => !value); }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Share"
        title="Share"
        style={compact ? {
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "30px",
          height: "30px",
          borderRadius: "50%",
          border: `1px solid ${isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.14)"}`,
          background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
          color: isDark ? "#FFFFFF" : "#000000",
          cursor: "pointer",
          flexShrink: 0,
        } : {
          display: "inline-flex",
          alignItems: "center",
          gap: "7px",
          padding: "8px 14px",
          borderRadius: "999px",
          border: `1px solid ${isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.14)"}`,
          background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
          color: isDark ? "#FFFFFF" : "#000000",
          fontFamily: F,
          fontSize: "11.5px",
          fontWeight: 800,
          letterSpacing: "0.6px",
          textTransform: "uppercase",
          cursor: "pointer",
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
          <line x1="8.6" y1="10.6" x2="15.4" y2="6.4" /><line x1="8.6" y1="13.4" x2="15.4" y2="17.6" />
        </svg>
        {!compact && "Share"}
      </button>

      {open && menuPos && typeof document !== "undefined" && createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: "fixed",
            top: menuPos.top,
            bottom: menuPos.bottom,
            right: menuPos.right,
            minWidth: "240px",
            padding: "8px",
            borderRadius: "14px",
            background: isDark ? "#151815" : "#FFFFFF",
            border: `1px solid ${isDark ? "#2B302B" : "#E5E0D4"}`,
            boxShadow: isDark ? "0 18px 35px rgba(0,0,0,0.4)" : "0 18px 35px rgba(31,36,31,0.14)",
            zIndex: 1000,
          }}
        >
          <button type="button" role="menuitem" onClick={handleCopyLink} style={menuItemStyle}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11.5 4.5" />
              <path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07L12.5 19.5" />
            </svg>
            {copied ? "Link copied" : "Copy link"}
          </button>
          {downloadChoices.map((choice) => (
            <button key={choice.id} type="button" role="menuitem" onClick={() => handleDownloadPoster(choice)} disabled={downloading} style={{ ...menuItemStyle, opacity: downloading ? 0.6 : 1 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v13" /><path d="M6.5 11.5 12 17l5.5-5.5" /><path d="M4 20h16" />
              </svg>
              {downloadButtonLabel(choice)}
            </button>
          ))}
        </div>,
        document.body
      )}

      {/* Off-screen render target for poster export. Kept in the DOM while the
          menu is open or a batch is running so html-to-image can capture it. */}
      {hasPosterDownloads && (open || downloading) && typeof document !== "undefined" && createPortal(
        <div style={{ position: "fixed", top: 0, left: "-99999px", pointerEvents: "none" }} aria-hidden="true">
          {hiddenPosterItems.map((item) => (
            <div
              key={item.key}
              ref={(node) => {
                if (node) posterRefs.current.set(item.key, node);
                else posterRefs.current.delete(item.key);
              }}
            >
              {item.posterContent}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
