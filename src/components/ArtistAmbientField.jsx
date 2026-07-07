import { useEffect, useMemo, useState } from "react";
import { getArtistImageUrl, getPublicArtists } from "../utils/artistImages.js";

// EXPERIMENT: a living backdrop of artist portraits, mounted once at the app
// shell root. Fixed to the viewport (not the scrollable page), sitting behind
// every page's own content — it shows through wherever a page doesn't paint
// an opaque background over it. Mechanics: cycling cast, slow drift, a
// time-of-day mood tint, light/dark aware blending, and varied frame shapes.

const SLOTS = [
  { top: "2%",  left: "1%",  size: 210 },
  { top: "68%", left: "5%",  size: 150 },
  { top: "8%",  left: "85%", size: 230 },
  { top: "74%", left: "91%", size: 110 },
  { top: "40%", left: "45%", size: 90  },
  { top: "88%", left: "38%", size: 175 },
  { top: "30%", left: "18%", size: 80  },
  { top: "18%", left: "62%", size: 140 },
  { top: "52%", left: "78%", size: 120 },
  { top: "24%", left: "35%", size: 70  },
];

// Frame silhouettes rotated round-robin across slots — width:height aspect is
// relative (1 = square footprint), several use clip-path polygons instead of
// border-radius for angular/organic silhouettes.
const SHAPES = [
  { id: "circle",   aspect: 1,    borderRadius: "50%" },
  { id: "squircle", aspect: 1,    borderRadius: "30% 70% 65% 35% / 40% 35% 65% 60%" },
  { id: "blob",     aspect: 1,    borderRadius: "63% 37% 41% 59% / 55% 45% 55% 45%", blurPx: 1.5 },
  { id: "hexagon",  aspect: 1,    clipPath: "polygon(25% 3%, 75% 3%, 100% 50%, 75% 97%, 25% 97%, 0% 50%)" },
  { id: "diamond",  aspect: 1,    clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" },
  { id: "arch",     aspect: 0.8,  borderRadius: "50% 50% 6% 6% / 62% 62% 6% 6%" },
  { id: "capsule",  aspect: 0.56, borderRadius: "999px" },
  { id: "oval",     aspect: 1.7,  borderRadius: "50%" },
  { id: "torn",     aspect: 1,    clipPath: "polygon(8% 2%, 55% 0%, 92% 10%, 100% 45%, 94% 82%, 62% 100%, 22% 96%, 2% 68%, 0% 30%)" },
  { id: "medallion",aspect: 1,    borderRadius: "50%", ring: true },
];

// Duotone-ish filter treatments, cycled per slot for visual variety beyond
// plain grayscale — "warm" and "cool" lean into the time-of-day mood hue.
function buildFilter({ kind, isDark, hue }) {
  const base = isDark ? "contrast(1.1) brightness(0.95)" : "contrast(0.92) brightness(1.35)";
  if (kind === "warm") return `grayscale(0.7) sepia(0.5) hue-rotate(${hue - 15}deg) saturate(1.6) ${base}`;
  if (kind === "cool") return `grayscale(0.85) hue-rotate(${hue + 190}deg) saturate(1.5) ${base}`;
  return `grayscale(1) hue-rotate(${hue}deg) ${base}`;
}

// Time-of-day mood: a tint (rgb triplet) + hue-rotate nudge so the whole
// backdrop's temperature drifts with the real clock over the course of a day.
const MOODS = [
  { name: "night",  from: 0,  to: 5,  tint: "99,102,241",  hue: 18 },
  { name: "dawn",   from: 5,  to: 8,  tint: "255,159,110", hue: 6 },
  { name: "day",    from: 8,  to: 17, tint: "125,211,252", hue: -4 },
  { name: "dusk",   from: 17, to: 20, tint: "255,107,129", hue: -10 },
  { name: "night2", from: 20, to: 24, tint: "99,102,241",  hue: 18 },
];

function moodForHour(hour) {
  return MOODS.find((m) => hour >= m.from && hour < m.to) || MOODS[0];
}

function useTimeMood() {
  const [mood, setMood] = useState(() => moodForHour(new Date().getHours()));
  useEffect(() => {
    const id = setInterval(() => setMood(moodForHour(new Date().getHours())), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);
  return mood;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e) => setReduced(e.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);
  return reduced;
}

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function usePortraitPool() {
  return useMemo(() => {
    const seen = new Set();
    const pool = [];
    for (const artist of getPublicArtists()) {
      const url = getArtistImageUrl(artist, { name: artist.name, artists: [artist] });
      if (url && !seen.has(url)) {
        seen.add(url);
        pool.push(url);
      }
    }
    return shuffle(pool);
  }, []);
}

const DRIFT_KEYFRAMES = `
@keyframes ngoma-portrait-drift-1 {
  0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
  25%      { transform: translate(3%, -4%) rotate(2deg) scale(1.05); }
  50%      { transform: translate(-2%, 3%) rotate(-1deg) scale(0.97); }
  75%      { transform: translate(-4%, -2%) rotate(1deg) scale(1.03); }
}
@keyframes ngoma-portrait-drift-2 {
  0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
  30%      { transform: translate(-4%, 3%) rotate(-3deg) scale(0.96); }
  60%      { transform: translate(3%, 4%) rotate(2deg) scale(1.04); }
}
@keyframes ngoma-portrait-drift-3 {
  0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
  40%      { transform: translate(4%, 2%) rotate(3deg) scale(1.06); }
  70%      { transform: translate(-3%, -3%) rotate(-2deg) scale(0.95); }
}
@keyframes ngoma-portrait-drift-4 {
  0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
  20%      { transform: translate(-3%, -3%) rotate(4deg) scale(1.03); }
  55%      { transform: translate(4%, -2%) rotate(-4deg) scale(0.98); }
  85%      { transform: translate(-2%, 4%) rotate(2deg) scale(1.02); }
}
`;

function PortraitSlot({ index, layout, pool, isDark, reducedMotion, mood, sizeScale, opacityScale }) {
  const [poolIdx, setPoolIdx] = useState(() => (pool.length ? (index * 7) % pool.length : 0));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (reducedMotion || pool.length < 2) return undefined;
    const period = 16000 + index * 2600;
    const initialDelay = (index * 1300) % period;
    let swapTimeout;
    let cycleInterval;

    const swap = () => {
      setVisible(false);
      swapTimeout = setTimeout(() => {
        setPoolIdx((p) => (p + 1) % pool.length);
        setVisible(true);
      }, 900);
    };

    const startTimeout = setTimeout(() => {
      swap();
      cycleInterval = setInterval(swap, period);
    }, initialDelay);

    return () => {
      clearTimeout(startTimeout);
      clearTimeout(swapTimeout);
      clearInterval(cycleInterval);
    };
  }, [pool.length, reducedMotion, index]);

  const url = pool[poolIdx];
  if (!url) return null;

  const shape = SHAPES[index % SHAPES.length];
  const filterKind = ["plain", "warm", "cool"][index % 3];
  const driftVariant = (index % 4) + 1;
  const driftDuration = 65 + (index % 5) * 18;
  const baseRotate = ((index * 37) % 24) - 12;
  const baseOpacity = isDark ? 0.11 + (index % 4) * 0.02 : 0.05 + (index % 4) * 0.012;
  const opacity = visible ? baseOpacity * opacityScale : 0;

  const scaledSize = layout.size * sizeScale;
  const width = scaledSize * shape.aspect;
  const height = scaledSize;

  return (
    <div
      style={{
        position: "absolute",
        top: layout.top,
        left: layout.left,
        width: `${width}px`,
        height: `${height}px`,
        opacity,
        transition: "opacity 1.1s ease",
        animation: reducedMotion ? "none" : `ngoma-portrait-drift-${driftVariant} ${driftDuration}s ease-in-out infinite`,
        animationDelay: reducedMotion ? undefined : `-${(index * 11) % driftDuration}s`,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: shape.borderRadius,
          clipPath: shape.clipPath,
          backgroundImage: `url(${url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          transform: `rotate(${baseRotate}deg)`,
          filter: buildFilter({ kind: filterKind, isDark, hue: mood.hue }) + (shape.blurPx ? ` blur(${shape.blurPx}px)` : ""),
          mixBlendMode: isDark
            ? ["screen", "overlay", "soft-light"][index % 3]
            : ["multiply", "soft-light", "darken"][index % 3],
          boxShadow: shape.ring
            ? (isDark ? "0 0 0 2px rgba(255,255,255,0.14)" : "0 0 0 2px rgba(0,0,0,0.10)")
            : "none",
        }}
      />
    </div>
  );
}

export default function ArtistAmbientField({ theme = "dark", className = "", isMobile = false, isTablet = false }) {
  const isDark = theme === "dark";
  const pool = usePortraitPool();
  const reducedMotion = usePrefersReducedMotion();
  const mood = useTimeMood();

  if (!pool.length) return null;

  // Phones get fewer, smaller, fainter portraits so the backdrop stays a
  // subtle texture instead of competing with foreground content on a
  // narrow viewport. Tablets sit between phone and desktop density.
  const activeSlots = isMobile ? SLOTS.filter((_, i) => i % 2 === 0) : SLOTS;
  const sizeScale = isMobile ? 0.55 : isTablet ? 0.78 : 1;
  const opacityScale = isMobile ? 0.65 : isTablet ? 0.85 : 1;

  return (
    <div
      aria-hidden="true"
      className={`ngoma-ambient-field ${className}`}
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        // Negative, not 0: this must always paint behind normal in-flow content
        // (most of the app never sets z-index), not just behind other
        // explicitly-positioned siblings. Requires the mounting ancestor to
        // establish its own stacking context (isolation: isolate) — otherwise
        // this escapes upward and lands behind that ancestor's own background.
        zIndex: -1,
      }}
    >
      <style>{DRIFT_KEYFRAMES}</style>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 28% 18%, rgba(${mood.tint}, ${isDark ? 0.1 : 0.05}) 0%, transparent 60%)`,
          mixBlendMode: isDark ? "screen" : "soft-light",
        }}
      />
      {activeSlots.map((slotLayout, i) => (
        <PortraitSlot
          key={i}
          index={i}
          layout={slotLayout}
          pool={pool}
          isDark={isDark}
          reducedMotion={reducedMotion}
          mood={mood}
          sizeScale={sizeScale}
          opacityScale={opacityScale}
        />
      ))}
    </div>
  );
}
