const CONTRIBUTOR_SEPARATOR = /\s*(?:,|;|\||\/|&|\+|\bfeat\.?|\bft\.?|\bfeaturing\b|\band\b|\bwith\b|\bx\b)\s*/i;

function rawContributorValues(value) {
  if (Array.isArray(value)) return value;
  const text = String(value || "").trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Legacy CMS values are usually plain text, not JSON tags.
  }
  return [value];
}

function cleanContributorDisplayName(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function contributorIdentityKey(value) {
  return cleanContributorDisplayName(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function splitContributorNames(value) {
  return rawContributorValues(value)
    .flatMap((credit) => {
      const name = typeof credit === "object" && credit !== null
        ? credit.name || credit.display_name || ""
        : credit;
      return String(name || "").split(CONTRIBUTOR_SEPARATOR).map(cleanContributorDisplayName).filter(Boolean);
    });
}

export function normalizedContributorNames(value) {
  const names = new Map();
  for (const name of splitContributorNames(value)) {
    if (/^(?:—|-|n\/a|unknown)$/i.test(name)) continue;
    const key = contributorIdentityKey(name);
    if (!key) continue;
    const current = names.get(key);
    // Prefer a normally capitalized spelling over an all-lowercase duplicate.
    if (!current || (current === current.toLowerCase() && name !== name.toLowerCase())) {
      names.set(key, name);
    }
  }
  return [...names.values()];
}

const EXECUTIVE_PRODUCER = /^(?:executive|exec\.?)[\s-]+producer\b/i;

export function formatContributorNames(value, role = "") {
  return normalizedContributorNames(value)
    .filter((name) => !(role === "producers" && EXECUTIVE_PRODUCER.test(name)))
    .join(" & ");
}

export function contributorNames(entry, role) {
  return normalizedContributorNames(entry?.[role])
    .filter((name) => !(role === "producers" && EXECUTIVE_PRODUCER.test(name)));
}

export const PUBLIC_CHART_TYPES = ["singles", "albums", "artists", "producers"];
export const isPeopleChart = (type) => ["artists", "songwriters", "producers"].includes(type);
export const chartTypeName = (type) => String(type || "singles").replace(/^./, (letter) => letter.toUpperCase());
