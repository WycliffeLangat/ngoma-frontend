export const KENYA_COUNTRY_CODE = "KE";
export const AFRICA_COUNTRY_CHART_PREFIX = "africa-country:";
export const AFRICA_REGION_CHART_PREFIX = "africa-region:";

// Flag-derived accent colors, one unique hex per country — shared by the public charts
// hero, Year End country tags, and artist country badges. Every entry must stay unique;
// several African flags share the same Pan-African red/green/gold family, so those are
// deliberately shifted to a different (but still flag-plausible) shade of that color
// rather than reusing an identical hex.
export const COUNTRY_ACCENTS = {
  AO: "#C8102E", BB: "#00267F", BF: "#009E49", BI: "#1EB53A", BJ: "#008751", BW: "#6DA9D2",
  CA: "#D80621", CD: "#007FFF", CF: "#003082", CG: "#009543", CI: "#F77F00", CL: "#D52B1E",
  CM: "#007A5E", CV: "#003893", DE: "#FFCE00", DJ: "#6AB2E7", DZ: "#006233", EG: "#CE1126",
  EH: "#007A3D", ER: "#12AD2B", ET: "#078930", FR: "#0055A4", GA: "#009E60", GB: "#012169",
  GH: "#FCD116", GM: "#3A75C4", GN: "#CE2B37", GQ: "#3E9A00", GW: "#A6192E", IN: "#FF9933",
  JM: "#009B3A", KE: "#006600", KM: "#FFC61E", KR: "#CD2E3A", LR: "#BF0A30", LS: "#00209F",
  LY: "#239E46", MA: "#C1272D", MG: "#007E3A", ML: "#14B53A", MR: "#00A95C", MU: "#EA2839",
  MW: "#D21034", MZ: "#007168", NA: "#003580", NE: "#E05206", NG: "#00A651", NO: "#BA0C2F",
  PR: "#ED0000", RW: "#00A1DE", SC: "#003F87", SD: "#C4111B", SE: "#006AA7", SL: "#6CACE4",
  SN: "#00853F", SO: "#4189DD", SS: "#0F47AF", ST: "#E4002B", SZ: "#3E5EB9", TD: "#002664",
  TG: "#006A4E", TN: "#E70013", TZ: "#00A3DD", UG: "#D90000", US: "#3C3B6E", ZA: "#007749",
  ZM: "#198A00", ZW: "#319208",
};

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
