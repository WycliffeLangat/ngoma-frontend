import { useEffect, useState } from "react";
import { getArtistImageUrl, getArtistDisplayName } from "../utils/artistImages.js";
import { resolveMediaUrl } from "../api/config.js";

const COVER_FIELDS = [
  "cover_image",
  "cover_image_url",
  "artwork",
  "artwork_url",
  "artworkUrl",
  "cover",
  "cover_url",
  "coverUrl",
  "cover_art",
  "album_art",
  "thumbnail",
  "thumbnail_url",
];

function cleanString(value) {
  const text = String(value || "").trim();
  return !text || text === "—" ? "" : text;
}

function coverUrlFromItem(item = {}) {
  for (const field of COVER_FIELDS) {
    const value = cleanString(item?.[field]);
    if (value) return resolveMediaUrl(value);
  }
  return "";
}

function initialsFor(label = "") {
  return (
    String(label || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "NG"
  );
}

// Same resolution EntryThumb uses internally, exposed so callers that need
// the raw URL (e.g. to drive a full-bleed CSS background) don't have to
// duplicate the cover/artist-image fallback logic.
export function resolveEntryImageUrl(item = {}, { name, isArtist = false } = {}) {
  const displayName = name || getArtistDisplayName(item) || item?.a || item?.artist || "";
  const isArtistEntry = isArtist || item?.is_artist_entry || item?.type === "artist";
  return isArtistEntry
    ? getArtistImageUrl(item, { name: displayName })
    : coverUrlFromItem(item) || getArtistImageUrl(item, { name: displayName });
}

// A small artwork/portrait thumbnail with a graceful initials fallback, used
// to add visual anchors to otherwise text-only rows (records, certifications,
// analytics rows, hall of fame). Resolves cover art for releases and photos
// for artists from whatever fields the entry happens to carry.
export default function EntryThumb({
  item = {},
  name,
  size = 40,
  radius,
  isArtist = false,
  accent = "#B8860B",
  style = {},
}) {
  const displayName = name || getArtistDisplayName(item) || item?.a || item?.artist || "";
  const isArtistEntry = isArtist || item?.is_artist_entry || item?.type === "artist";
  const url = resolveEntryImageUrl(item, { name: displayName, isArtist });
  const shape = radius ?? (isArtistEntry ? "50%" : "8px");

  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [url]);
  const showImage = url && !failed;

  return (
    <div
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: shape,
        overflow: "hidden",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, ${accent}33, #11111122)`,
        // Own compositing layer so this rounded/clipped box reliably clips
        // its image even while a hover-transformed ancestor is animating.
        transform: "translateZ(0)",
        ...style,
      }}
    >
      {showImage ? (
        <img
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <span
          style={{
            color: accent,
            fontSize: Math.max(10, size * 0.32),
            fontWeight: 900,
            letterSpacing: "0.5px",
          }}
        >
          {initialsFor(displayName)}
        </span>
      )}
    </div>
  );
}
