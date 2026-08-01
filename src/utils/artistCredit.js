// Splits a free-text artist credit string ("A, B & C feat. D") into artist
// tokens and the separator text between them, so each artist can be linked
// independently while preserving the original punctuation/wording.
export function splitArtistTokens(artistText) {
  const source = artistText === null || artistText === undefined ? "" : String(artistText).trim();
  if (!source) return [];

  const separatorPattern = /(\s*(?:,|&|\+|\bfeat\.?(?!\w)|\bft\.?(?!\w)|\bfeaturing\b|\band\b|\bwith\b|\bx\b)\s*)/gi;
  const pieces = source.split(separatorPattern).filter((piece) => piece !== "");

  return pieces
    .map((piece) => {
      separatorPattern.lastIndex = 0;
      const isSeparator = separatorPattern.test(piece);
      separatorPattern.lastIndex = 0;
      return isSeparator
        ? { type: "separator", value: piece.replace(/\bft\.?(?!\w)/gi, "ft.").replace(/\bfeat\.?(?!\w)/gi, "ft.") }
        : { type: "artist", value: piece.trim() };
    })
    .filter((piece) => piece.value);
}
