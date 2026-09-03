export const KENYA_COUNTRY_CODE = "KE";
export const KENYA_COUNTRY = { code: KENYA_COUNTRY_CODE, name: "Kenya" };
export const KENYA_ONLY_COUNTRY_GROUPS = [
  {
    key: "kenya",
    label: "Country",
    countries: [KENYA_COUNTRY],
  },
];
export const KENYA_ONLY_COUNTRIES = KENYA_ONLY_COUNTRY_GROUPS.flatMap((region) =>
  region.countries.map((country) => ({ ...country, region: region.key, regionLabel: region.label }))
);
export const AFRICA_COUNTRY_CHART_PREFIX = "africa-country:";
export const AFRICA_REGION_CHART_PREFIX = "africa-region:";

// African accents are ONE color per country, picked from that flag's own color set.
// Most flags use their dominant color, but where the dominant color is green — the
// most repeated color across these flags — a different color actually on that same
// flag is used instead, so the country palette isn't overwhelmingly one hue (e.g.
// Kenya's flag red instead of its green, Jamaica's gold instead of its green). Nigeria
// keeps green since white, its only other flag color, is unusable as a solid accent.
// Non-African codes are unrelated artist-origin accents, unchanged.
export const COUNTRY_ACCENTS = {
  AO: "#722CD1", BB: "#00267F", BF: "#EA2D39", BI: "#EB3339", BJ: "#F5A510", BW: "#47C5E1",
  CA: "#D80621", CD: "#54BEE3", CF: "#1F6DE3", CG: "#EB3939", CI: "#F7AC3B", CL: "#D52B1E",
  CM: "#F5AE15", CV: "#1879BF", DE: "#FFCE00", DJ: "#7BB4EA", DZ: "#D21034", EG: "#7D33D4",
  EH: "#873AD5", ER: "#DF1645", ET: "#F6C020", FR: "#0055A4", GA: "#F6C925", GB: "#012169",
  GH: "#F6D12B", GM: "#EC453F", GN: "#F6D930", GQ: "#0033A0", GW: "#F7E036", IN: "#FF9933",
  JM: "#FED100", KE: "#CE1126", KM: "#276BE4", KR: "#CD2E3A", LR: "#E81A3C", LS: "#1978C7",
  LY: "#682BCA", MA: "#E9203B", MG: "#ED5145", ML: "#FCD116", MR: "#E4002B", MU: "#2F6AE5",
  MW: "#9B49D8", MZ: "#A450DA", NA: "#1A76CF", NE: "#F5510A", NG: "#16C648", NO: "#BA0C2F",
  PR: "#ED0000", RW: "#61B9E5", SC: "#3769E6", SD: "#9142D7", SE: "#006AA7", SL: "#1B73D6",
  SN: "#F7E73B", SO: "#6EB6E7", SS: "#B55FDD", ST: "#D21034", SZ: "#E51740", TD: "#F5B71B",
  TG: "#D21034", TN: "#EA263A", TZ: "#1B70DE", UG: "#AD58DC", US: "#3C3B6E", ZA: "#001489",
  ZM: "#EF7D00", ZW: "#F59B0A",
};

// Top Countries charts use rank-based colors so the bars stay distinct even
// when the countries in a month share similar flag/accent colors.
export const COUNTRY_CHART_COLORS = [
  "#1565C0",
  "#C97A12",
  "#00897B",
  "#AD1457",
  "#7B1FA2",
  "#E53935",
  "#2DB04A",
  "#37474F",
];

// Assigns each country a fixed color that never changes between renders/months,
// instead of picking by sorted rank position (which reshuffles as entry counts
// change). Countries with a dedicated flag accent keep that color; any other
// code is hashed onto COUNTRY_CHART_COLORS so it still gets a stable, distinct
// shade every time. The result is then contrast-checked so pale flag accents
// (mostly yellows) stay legible as a bare chart-bar fill on both light and
// dark backgrounds, without losing the hue that makes each country unique.
export function countryChartColor(code) {
  const upper = String(code || "").trim().toUpperCase();
  if (!upper) return ensureBarContrast(COUNTRY_CHART_COLORS[0]);
  const accent = COUNTRY_ACCENTS[upper];
  if (accent) return ensureBarContrast(accent);
  return ensureBarContrast(COUNTRY_CHART_COLORS[hashCode(upper) % COUNTRY_CHART_COLORS.length]);
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return hash;
}


function hexToRgb(hex) {
  const clean = String(hex).replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const value = parseInt(full, 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

function rgbToHex({ r, g, b }) {
  const clamp = (v) => Math.round(Math.min(255, Math.max(0, v)));
  return "#" + [r, g, b].map((v) => clamp(v).toString(16).padStart(2, "0")).join("").toUpperCase();
}

function rgbToHsl({ r, g, b }) {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return { h: h / 6, s, l };
}

function hslToRgb({ h, s, l }) {
  if (s === 0) { const v = l * 255; return { r: v, g: v, b: v }; }
  const hue2rgb = (p, q, t) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: hue2rgb(p, q, h + 1 / 3) * 255,
    g: hue2rgb(p, q, h) * 255,
    b: hue2rgb(p, q, h - 1 / 3) * 255,
  };
}

// WCAG relative luminance — used to check a color's contrast as a bare fill
// against a near-white light-mode background and a near-black dark-mode one.
function relativeLuminance({ r, g, b }) {
  const toLinear = (c) => {
    const n = c / 255;
    return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

// Darkens colors that are too pale to read against a white card, and lightens
// colors that are too dark to read against a near-black one, while keeping
// hue/saturation untouched so the color still reads as "that same country".
function ensureBarContrast(hex) {
  const rgb = hexToRgb(hex);
  const lum = relativeLuminance(rgb);
  const contrastOnWhite = 1.05 / (lum + 0.05);
  const contrastOnDark = (lum + 0.05) / 0.07;
  if (contrastOnWhite >= 2.5 && contrastOnDark >= 2.5) return hex;
  const hsl = rgbToHsl(rgb);
  let { l } = hsl;
  if (contrastOnWhite < 2.5) l = Math.min(l, 0.42);
  if (contrastOnDark < 2.5) l = Math.max(l, 0.3);
  return rgbToHex(hslToRgb({ ...hsl, l }));
}



export const AFRICA_REGION_GROUPS = [
  {
    key: "eastern-africa",
    label: "Eastern Africa",
    countries: [
      { code: "BI", name: "Burundi" },
      { code: "KM", name: "Comoros" },
      { code: "DJ", name: "Djibouti" },
      { code: "ER", name: "Eritrea" },
      { code: "ET", name: "Ethiopia" },
      { code: "KE", name: "Kenya" },
      { code: "MG", name: "Madagascar" },
      { code: "MW", name: "Malawi" },
      { code: "MU", name: "Mauritius" },
      { code: "MZ", name: "Mozambique" },
      { code: "RW", name: "Rwanda" },
      { code: "SC", name: "Seychelles" },
      { code: "SO", name: "Somalia" },
      { code: "SS", name: "South Sudan" },
      { code: "TZ", name: "Tanzania" },
      { code: "UG", name: "Uganda" },
      { code: "ZM", name: "Zambia" },
      { code: "ZW", name: "Zimbabwe" },
    ],
  },
  {
    key: "central-africa",
    label: "Central Africa",
    countries: [
      { code: "AO", name: "Angola" },
      { code: "CM", name: "Cameroon" },
      { code: "CF", name: "Central African Republic" },
      { code: "TD", name: "Chad" },
      { code: "CG", name: "Congo" },
      { code: "CD", name: "Democratic Republic of the Congo" },
      { code: "GQ", name: "Equatorial Guinea" },
      { code: "GA", name: "Gabon" },
      { code: "ST", name: "Sao Tome and Principe" },
    ],
  },
  {
    key: "southern-africa",
    label: "Southern Africa",
    countries: [
      { code: "BW", name: "Botswana" },
      { code: "SZ", name: "Eswatini" },
      { code: "LS", name: "Lesotho" },
      { code: "NA", name: "Namibia" },
      { code: "ZA", name: "South Africa" },
    ],
  },
  {
    key: "northern-africa",
    label: "Northern Africa",
    countries: [
      { code: "DZ", name: "Algeria" },
      { code: "EG", name: "Egypt" },
      { code: "LY", name: "Libya" },
      { code: "MA", name: "Morocco" },
      { code: "SD", name: "Sudan" },
      { code: "TN", name: "Tunisia" },
      { code: "EH", name: "Western Sahara" },
    ],
  },
  {
    key: "western-africa",
    label: "Western Africa",
    countries: [
      { code: "BJ", name: "Benin" },
      { code: "BF", name: "Burkina Faso" },
      { code: "CV", name: "Cabo Verde" },
      { code: "CI", name: "Cote d'Ivoire" },
      { code: "GM", name: "Gambia" },
      { code: "GH", name: "Ghana" },
      { code: "GN", name: "Guinea" },
      { code: "GW", name: "Guinea-Bissau" },
      { code: "LR", name: "Liberia" },
      { code: "ML", name: "Mali" },
      { code: "MR", name: "Mauritania" },
      { code: "NE", name: "Niger" },
      { code: "NG", name: "Nigeria" },
      { code: "SN", name: "Senegal" },
      { code: "SL", name: "Sierra Leone" },
      { code: "TG", name: "Togo" },
    ],
  },
];

export const AFRICA_COUNTRIES = AFRICA_REGION_GROUPS.flatMap((region) =>
  region.countries.map((country) => ({ ...country, region: region.key, regionLabel: region.label }))
);

export const AFRICA_COUNTRY_BY_CODE = Object.fromEntries(
  AFRICA_COUNTRIES.map((country) => [country.code, country])
);

export const AFRICA_REGION_BY_KEY = Object.fromEntries(
  AFRICA_REGION_GROUPS.map((region) => [region.key, region])
);

export function normalizeCountryCode(code = "") {
  return String(code || "").trim().toUpperCase();
}

export function africaCountryChartKey(code = "") {
  return `${AFRICA_COUNTRY_CHART_PREFIX}${normalizeCountryCode(code)}`;
}

export function africaRegionChartKey(key = "") {
  return `${AFRICA_REGION_CHART_PREFIX}${String(key || "").trim().toLowerCase()}`;
}

export function isAfricaCountryChart(value = "") {
  return String(value || "").startsWith(AFRICA_COUNTRY_CHART_PREFIX);
}

export function isAfricaRegionChart(value = "") {
  return String(value || "").startsWith(AFRICA_REGION_CHART_PREFIX);
}

export function isAfricaChart(value = "") {
  return isAfricaCountryChart(value) || isAfricaRegionChart(value);
}

export function countryCodeFromAfricaChart(value = "") {
  return isAfricaCountryChart(value)
    ? normalizeCountryCode(String(value).slice(AFRICA_COUNTRY_CHART_PREFIX.length))
    : "";
}

export function regionKeyFromAfricaChart(value = "") {
  return isAfricaRegionChart(value)
    ? String(value).slice(AFRICA_REGION_CHART_PREFIX.length).trim().toLowerCase()
    : "";
}

export function africaCountryForCode(code = "") {
  return AFRICA_COUNTRY_BY_CODE[normalizeCountryCode(code)] || null;
}

export function africaRegionForKey(key = "") {
  return AFRICA_REGION_BY_KEY[String(key || "").trim().toLowerCase()] || null;
}

export function africaCountryCodesForRegion(key = "") {
  return africaRegionForKey(key)?.countries.map((country) => country.code) || [];
}

export function africaRegionBackendKeys(key = "") {
  const clean = String(key || "").trim();
  const normalized = clean.toLowerCase();
  const upperUnderscore = normalized.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").toUpperCase();
  return [clean, normalized, upperUnderscore].filter(Boolean);
}

export function africaChartLabel(value = "", fallback = "") {
  const countryCode = countryCodeFromAfricaChart(value);
  if (countryCode) {
    const country = africaCountryForCode(countryCode);
    return country ? `${country.name} Top 50` : `${countryCode} Top 50`;
  }

  const regionKey = regionKeyFromAfricaChart(value);
  if (regionKey) {
    const region = africaRegionForKey(regionKey);
    return region ? `${region.label} Top 50` : fallback || "Africa Region Top 50";
  }

  return fallback;
}
