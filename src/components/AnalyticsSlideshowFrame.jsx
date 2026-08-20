import { useState } from "react";
import { useRotatingArt } from "../hooks/useRotatingArt.js";

// A large rotating cover-art/portrait tile, styled after the Top 50 hero's
// slideshow tile (PremiumChartsPage.jsx), sized to sit in a 50%-width column
// next to an analytics list instead of the hero's viewport-relative sizing.
export default function AnalyticsSlideshowFrame({
  pool,
  isArtist = false,
  accent = "#C97A12",
  onOpen,
  label,
}) {
  const [paused, setPaused] = useState(false);
  const rotating = useRotatingArt(pool, 3800, { paused });

  const shape = isArtist ? "50%" : "8px";
  const cardBorder = "rgba(255,255,255,0.34)";
  const cardShadow = `0 0 0 1px ${cardBorder}, 0 20px 60px ${accent}33, 0 16px 44px rgba(0,0,0,0.30)`;
  const ariaLabel = rotating?.name || label || "Featured";

  return (
    <div
      className="ngoma-analytics-slideshow"
      style={{
        position: "relative",
        borderRadius: shape,
        overflow: "hidden",
        background: `linear-gradient(135deg, ${accent}42 0%, #cfd6d3 100%)`,
        width: "min(100%, 320px)",
        aspectRatio: "1 / 1",
        margin: "0 auto",
        cursor: rotating ? "pointer" : "default",
        boxShadow: cardShadow,
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onClick={() => rotating && onOpen?.(rotating.entry)}
      role={rotating ? "button" : undefined}
      tabIndex={rotating ? 0 : undefined}
      aria-label={ariaLabel}
      onKeyDown={(event) => {
        if (!rotating) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen?.(rotating.entry);
        }
      }}
    >
      {rotating ? (
        <img
          key={rotating.url}
          src={rotating.url}
          alt=""
          className="ngoma-hero-slide"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            fontSize: "42px",
            fontWeight: 900,
            background: `linear-gradient(135deg, ${accent}66 0%, rgba(255,255,255,0.16) 100%)`,
          }}
          aria-hidden="true"
        >
          {(label || "NG").slice(0, 2).toUpperCase()}
        </div>
      )}
    </div>
  );
}
