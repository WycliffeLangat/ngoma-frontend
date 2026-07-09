import { useEffect, useMemo, useState } from "react";
import { resolveEntryImageUrl } from "../components/EntryThumb.jsx";

// Cycles a card's background art through every eligible entry in `pool` so a
// box with no single "winner" still always shows a photo instead of sitting
// empty, and boxes with several eligible entries take turns bleeding through.
export function useRotatingArt(pool, intervalMs = 4500) {
  const candidates = useMemo(() => {
    return (pool || [])
      .map((entry) => {
        const name = entry.artist || entry.title || entry.n || "";
        const url = resolveEntryImageUrl(entry, { name, isArtist: Boolean(entry.is_artist_entry || entry.type === "artist") });
        return url ? { entry, name, url } : null;
      })
      .filter(Boolean);
  }, [pool]);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [candidates.length]);

  useEffect(() => {
    if (candidates.length < 2) return undefined;
    const id = setInterval(() => {
      setIndex((current) => (current + 1) % candidates.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [candidates.length, intervalMs]);

  return candidates.length ? candidates[index % candidates.length] : null;
}
