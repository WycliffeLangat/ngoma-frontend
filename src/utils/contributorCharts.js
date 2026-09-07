import { splitArtistTokens } from "./artistCredit.js";

// Structured credits preserve names containing punctuation; legacy text uses
// the same credit separators as the public artist views.
export function contributorNames(entry, role) {
  const value = entry?.[role];
  const credits = Array.isArray(value) ? value : splitArtistTokens(value)
    .filter((token) => token.type === "artist").map((token) => token.value);
  const names = new Map();
  for (const credit of credits) {
    const name = String(typeof credit === "object" && credit !== null
      ? credit.name || credit.display_name || "" : credit || "").trim();
    if (name && !/^(?:—|-|n\/a|unknown)$/i.test(name)) {
      const key = name.toLowerCase();
      if (!names.has(key)) names.set(key, name);
    }
  }
  return [...names.values()];
}

export const PUBLIC_CHART_TYPES = ["singles", "albums", "artists", "songwriters", "producers"];
export const isPeopleChart = (type) => ["artists", "songwriters", "producers"].includes(type);
export const chartTypeName = (type) => String(type || "singles").replace(/^./, (letter) => letter.toUpperCase());
