import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { exportNodeAsPng } from "../admin/utils/exportPoster.jsx";
import { trackEvent } from "../utils/track.js";

// Share entry point for any reader-facing page or detail panel (song,
// album, artist, charts, head-to-head, certifications...). Offers exactly
// two actions — copy a link back to this view, or download the
// auto-generated poster — with no editing surface, since readers only ever
// get the finished, CMS-driven layout. `posterContent` is the poster's
// rendered JSX (matching whichever CMS poster design applies to this page);
// pass null to disable the download option when there's nothing to render.
// `compact` renders an icon-only trigger (no "Share" label) sized for a
// list row, e.g. one certification among many on the Certifications page.
export default function ShareButton({ shareUrl, fileName, posterContent, isDark, F, GOLD, compact = false }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  const [menuPos, setMenuPos] = useState(null);
  const posterRef = useRef(null);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      // Flip above the trigger when there isn't room below — matters for
      // rows near the bottom of a long scrollable list (e.g. the last
      // certification in the wall), not just the page-level Share buttons.
      const estimatedMenuHeight = posterContent ? 108 : 60;
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
  }, [open]);

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

  const handleDownloadPoster = async () => {
    if (!posterRef.current || !posterContent || downloading) return;
    trackEvent({ eventType: "click", label: `share_download_${fileName || "poster"}` });
    setDownloading(true);
    setDownloadError(false);
    try {
      await exportNodeAsPng(posterRef.current, fileName);
    } catch {
      setDownloadError(true);
    } finally {
      setDownloading(false);
    }
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
            minWidth: "230px",
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
          {posterContent && (
            <button type="button" role="menuitem" onClick={handleDownloadPoster} disabled={downloading} style={{ ...menuItemStyle, opacity: downloading ? 0.6 : 1 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v13" /><path d="M6.5 11.5 12 17l5.5-5.5" /><path d="M4 20h16" />
              </svg>
              {downloading ? "Preparing poster…" : downloadError ? "Try again" : "Download poster"}
            </button>
          )}
        </div>,
        document.body
      )}

      {/* Off-screen render target for the poster export — kept in the DOM
          (not display:none) so html-to-image can lay it out and capture it.
          Portaled to <body> so it's never clipped/offset by an ancestor's
          overflow or stacking context. */}
      {posterContent && typeof document !== "undefined" && createPortal(
        <div style={{ position: "fixed", top: 0, left: "-99999px", pointerEvents: "none" }} aria-hidden="true">
          <div ref={posterRef}>
            {posterContent}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
