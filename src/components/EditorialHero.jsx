import EntryThumb from "./EntryThumb.jsx";
import { useState } from "react";
import { useRotatingArt } from "../hooks/useRotatingArt.js";

export default function EditorialHero({ eyebrow, title, description, metric, metricLabel, entry, pool, actions, onOpen, isArtist = false }) {
  const [paused, setPaused] = useState(false);
  const rotating = useRotatingArt(pool, 4500, { paused });
  const artwork = rotating?.entry || entry;
  const artworkTitle = artwork?.artwork_label || artwork?.title || artwork?.t || artwork?.n || "Featured artwork";
  return (
    <section className="v2-editorial-hero">
      <div className="v2-editorial-copy">
        <div className="v2-eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
        {actions && <div className="v2-hero-actions">{actions}</div>}
      </div>
      <aside className="v2-editorial-visual" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}>
        <strong className="v2-hero-metric">{metric}</strong>
        <p>{metricLabel}</p>
        {artwork && <button type="button" className="v2-hero-cover" onClick={() => onOpen?.(artwork)} aria-label={onOpen ? `Open ${artworkTitle}` : artworkTitle} disabled={!onOpen}>
          <span key={rotating?.url || artworkTitle} className="v2-rotating-art"><EntryThumb item={artwork} name={artwork.artist || artwork.a || artwork.title || artwork.t} isArtist={Boolean(artwork.is_artist_entry) || isArtist} size={124} /></span>
          <span className="v2-cover-caption">{artworkTitle}</span>
        </button>}
      </aside>
    </section>
  );
}
