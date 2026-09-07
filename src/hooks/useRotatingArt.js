import { useEffect, useMemo, useState } from "react";
import { resolveEntryImageUrl } from "../components/EntryThumb.jsx";

// Cycles a card's background art through every eligible entry in `pool` so a
// box with no single "winner" still always shows a photo instead of sitting
// empty, and boxes with several eligible entries take turns bleeding through.
export function useRotatingArt(pool, intervalMs = 4500, { paused = false } = {}) {
  const [motionPaused, setMotionPaused] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMotionPaused(media.matches || document.hidden);
    update();
    media.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      media.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  const candidates = useMemo(() => {
    return (pool || [])
      .map((entry) => {
        const name = entry.artist || entry.a || entry.title || entry.t || entry.n || "";
        const url = resolveEntryImageUrl(entry, { name, isArtist: Boolean(entry.is_artist_entry || entry.type === "artist") });
        return url ? { entry, name, url } : null;
      })
      .filter(Boolean);
  }, [pool]);

  const [index, setIndex] = useState(0);
  const candidateKey = candidates.map((item) => item.url).join("|");

  useEffect(() => {
    setIndex(0);
  }, [candidateKey]);

  useEffect(() => {
    if (paused || motionPaused || candidates.length < 2) return undefined;
    const id = setInterval(() => {
      setIndex((current) => (current + 1) % candidates.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [candidateKey, candidates.length, intervalMs, paused, motionPaused]);

  return candidates.length ? candidates[index % candidates.length] : null;
}
