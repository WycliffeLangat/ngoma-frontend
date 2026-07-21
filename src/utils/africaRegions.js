export const KENYA_COUNTRY_CODE = "KE";
export const AFRICA_COUNTRY_CHART_PREFIX = "africa-country:";
export const AFRICA_REGION_CHART_PREFIX = "africa-region:";

// African accents are ONE dominant color per country, picked from that flag's own color
// ratios (e.g. Nigeria = Green 66.7% + White 33.3% -> Green; Somalia = Light Blue 95% ->
// Light Blue), rendered as a bright/vivid shade rather than a literal muted flag swatch.
// Where a country's top colors are tied, the tie is broken to keep the 55 countries spread
// across color families as evenly as possible, then each country sharing a dominant color
// gets a distinct shade (hue/lightness) of that family so the full set stays unique. Flags
// whose dominant color is Black get a bright violet instead (true black can't be "bright"),
// a hue none of the other families use. Kenya is pinned to its long-standing site-brand
// green (#006600) rather than the auto-generated shade, since that exact color already
// means "Kenya" everywhere else in the app. Non-African codes are unrelated artist-origin
// accents, unchanged.
export const COUNTRY_ACCENTS = {
  AO: "#722CD1", BB: "#00267F", BF: "#EA2D39", BI: "#EB3339", BJ: "#F5A510", BW: "#47C5E1",
  CA: "#D80621", CD: "#54BEE3", CF: "#1F6DE3", CG: "#EB3939", CI: "#F7AC3B", CL: "#D52B1E",
  CM: "#F5AE15", CV: "#1879BF", DE: "#FFCE00", DJ: "#7BB4EA", DZ: "#14B838", EG: "#7D33D4",
  EH: "#873AD5", ER: "#DF1645", ET: "#F6C020", FR: "#0055A4", GA: "#F6C925", GB: "#012169",
  GH: "#F6D12B", GM: "#EC453F", GN: "#F6D930", GQ: "#1EE678", GW: "#F7E036", IN: "#FF9933",
  JM: "#009B3A", KE: "#006600", KM: "#276BE4", KR: "#CD2E3A", LR: "#E81A3C", LS: "#1978C7",
  LY: "#682BCA", MA: "#E9203B", MG: "#ED5145", ML: "#2CE88D", MR: "#15BF40", MU: "#2F6AE5",
  MW: "#9B49D8", MZ: "#A450DA", NA: "#1A76CF", NE: "#F5510A", NG: "#16C648", NO: "#BA0C2F",
  PR: "#ED0000", RW: "#61B9E5", SC: "#3769E6", SD: "#9142D7", SE: "#006AA7", SL: "#1B73D6",
  SN: "#F7E73B", SO: "#6EB6E7", SS: "#B55FDD", ST: "#17CD50", SZ: "#E51740", TD: "#F5B71B",
  TG: "#18DB63", TN: "#EA263A", TZ: "#1B70DE", UG: "#AD58DC", US: "#3C3B6E", ZA: "#18D45A",
  ZM: "#19E26D", ZW: "#F59B0A",
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
