import { splitArtistTokens } from "../utils/artistCredit.js";

// Renders a free-text artist credit string ("A, B & C feat. D") as a run of
// per-artist buttons, each opening that artist's detail page, with the
// original separators ("&", "feat.", etc.) kept as plain text in between.
export default function ArtistCredit({
  credit,
  onOpenArtist,
  fontFamily,
  fontSize = "14px",
  fontWeight = 650,
  color,
  darkColor,
  isDark = false,
  separatorColor,
  darkSeparatorColor,
  style,
}) {
  const tokens = splitArtistTokens(credit);
  if (!tokens.length) return null;

  const resolvedColor = isDark ? (darkColor || color) : color;
  const resolvedSeparatorColor = isDark ? (darkSeparatorColor || separatorColor) : separatorColor;

  return (
    <span style={{ display: "inline", wordBreak: "break-word", ...style }}>
      {tokens.map((token, tokenIndex) => {
        if (token.type === "separator") {
          return (
            <span
              key={`${token.value}-${tokenIndex}`}
              style={{ fontFamily, fontSize, fontWeight, color: resolvedSeparatorColor }}
            >
              {token.value}
            </span>
          );
        }

        return (
          <button
            key={`${token.value}-${tokenIndex}`}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpenArtist?.(token.value);
            }}
            className="ngoma-artist-link"
            style={{
              display: "inline",
              border: "none",
              background: "transparent",
              padding: 0,
              margin: 0,
              textAlign: "left",
              cursor: "pointer",
              fontFamily,
              fontSize,
              fontWeight,
              color: resolvedColor,
            }}
            title={`Open ${token.value}`}
          >
            {token.value}
          </button>
        );
      })}
    </span>
  );
}
