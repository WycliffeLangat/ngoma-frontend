import { AFRICA_COUNTRIES } from "./africaRegions.js";

const ISO_ALPHA2_CODES = [
  "AF", "AX", "AL", "DZ", "AS", "AD", "AO", "AI", "AQ", "AG", "AR", "AM", "AW", "AU", "AT", "AZ",
  "BS", "BH", "BD", "BB", "BY", "BE", "BZ", "BJ", "BM", "BT", "BO", "BQ", "BA", "BW", "BV", "BR", "IO", "BN", "BG", "BF", "BI",
  "KH", "CM", "CA", "CV", "KY", "CF", "TD", "CL", "CN", "CX", "CC", "CO", "KM", "CG", "CD", "CK", "CR", "CI", "HR", "CU", "CW", "CY", "CZ",
  "DK", "DJ", "DM", "DO", "EC", "EG", "SV", "GQ", "ER", "EE", "SZ", "ET",
  "FK", "FO", "FJ", "FI", "FR", "GF", "PF", "TF",
  "GA", "GM", "GE", "DE", "GH", "GI", "GR", "GL", "GD", "GP", "GU", "GT", "GG", "GN", "GW", "GY",
  "HT", "HM", "VA", "HN", "HK", "HU", "IS", "IN", "ID", "IR", "IQ", "IE", "IM", "IL", "IT",
  "JM", "JP", "JE", "JO", "KZ", "KE", "KI", "KP", "KR", "KW", "KG",
  "LA", "LV", "LB", "LS", "LR", "LY", "LI", "LT", "LU",
  "MO", "MG", "MW", "MY", "MV", "ML", "MT", "MH", "MQ", "MR", "MU", "YT", "MX", "FM", "MD", "MC", "MN", "ME", "MS", "MA", "MZ", "MM",
  "NA", "NR", "NP", "NL", "NC", "NZ", "NI", "NE", "NG", "NU", "NF", "MK", "MP", "NO",
  "OM", "PK", "PW", "PS", "PA", "PG", "PY", "PE", "PH", "PN", "PL", "PT", "PR", "QA", "RE", "RO", "RU", "RW",
  "BL", "SH", "KN", "LC", "MF", "PM", "VC", "WS", "SM", "ST", "SA", "SN", "RS", "SC", "SL", "SG", "SX", "SK", "SI", "SB", "SO", "ZA", "GS", "SS", "ES", "LK", "SD", "SR", "SJ", "SE", "CH", "SY",
  "TW", "TJ", "TZ", "TH", "TL", "TG", "TK", "TO", "TT", "TN", "TR", "TM", "TC", "TV",
  "UG", "UA", "AE", "GB", "US", "UM", "UY", "UZ", "VU", "VE", "VN", "VG", "VI", "WF", "EH", "YE", "ZM", "ZW",
];

const COUNTRY_ALIASES = [
  ["america", "US"],
  ["usa", "US"],
  ["u s a", "US"],
  ["united states of america", "US"],
  ["uk", "GB"],
  ["u k", "GB"],
  ["britain", "GB"],
  ["great britain", "GB"],
  ["england", "GB"],
  ["south korea", "KR"],
  ["korea", "KR"],
  ["north korea", "KP"],
  ["russia", "RU"],
  ["drc", "CD"],
  ["dr congo", "CD"],
  ["democratic republic of congo", "CD"],
  ["congo kinshasa", "CD"],
  ["republic of congo", "CG"],
  ["congo brazzaville", "CG"],
  ["ivory coast", "CI"],
  ["cote divoire", "CI"],
  ["cote d ivoire", "CI"],
  ["cape verde", "CV"],
  ["cabo verde", "CV"],
  ["sao tome and principe", "ST"],
  ["swaziland", "SZ"],
  ["palestine", "PS"],
  ["uae", "AE"],
  ["viet nam", "VN"],
];

export function normalizeCountryName(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/^the\s+/, "");
}

function displayNameForCode(code) {
  try {
    if (typeof Intl !== "undefined" && Intl.DisplayNames) {
      return new Intl.DisplayNames(["en"], { type: "region" }).of(code) || "";
    }
  } catch {
    // Fall back to configured app countries below.
  }
  return "";
}

function normalizeCode(value = "") {
  return String(value || "").trim().toUpperCase();
}

const AFRICA_CODES = new Set(AFRICA_COUNTRIES.map((country) => country.code));

function defaultRegionForCode(code) {
  return AFRICA_CODES.has(normalizeCode(code)) ? "Africa" : "International";
}

function normalizeOrder(value) {
  const order = Number(value);
  return Number.isFinite(order) && order > 0 ? order : null;
}

export function buildCountryCodeIndex(extraCountries = []) {
  const byName = new Map();
  const countriesByCode = new Map();
  const add = (name, code, meta = {}) => {
    const cleanCode = normalizeCode(code);
    const cleanName = String(name || "").trim();
    const key = normalizeCountryName(cleanName);
    if (!cleanName || !/^[A-Z]{2}$/.test(cleanCode) || !key) return;
    const current = countriesByCode.get(cleanCode);
    const priority = Number(meta.priority || 0);
    if (!current || priority >= Number(current.priority || 0)) {
      countriesByCode.set(cleanCode, {
        name: cleanName,
        code: cleanCode,
        region: meta.region || defaultRegionForCode(cleanCode),
        flag: meta.flag || cleanCode,
        display_order: normalizeOrder(meta.display_order),
        priority,
      });
    }
    if (!byName.has(key)) byName.set(key, cleanCode);
  };

  ISO_ALPHA2_CODES.forEach((code) => add(displayNameForCode(code), code, { priority: 1 }));
  AFRICA_COUNTRIES.forEach((country) => add(country.name, country.code, {
    region: "Africa",
    flag: country.code,
    priority: 3,
  }));
  (Array.isArray(extraCountries) ? extraCountries : []).forEach((country) => {
    add(
      country?.name || country?.country || country?.label,
      country?.code || country?.country_code || country?.value,
      {
        region: country?.region,
        flag: country?.flag,
        display_order: country?.display_order,
        priority: 2,
      }
    );
  });
  COUNTRY_ALIASES.forEach(([name, code]) => {
    byName.set(normalizeCountryName(name), normalizeCode(code));
  });

  const ordered = [...countriesByCode.values()]
    .sort((left, right) =>
      normalizeCountryName(left.name).localeCompare(normalizeCountryName(right.name)) ||
      left.code.localeCompare(right.code)
    )
    .map((country, index) => ({
      name: country.name,
      code: country.code,
      region: country.region || defaultRegionForCode(country.code),
      flag: country.flag || country.code,
      display_order: index + 1,
    }));
  const countries = ordered.sort((left, right) => left.name.localeCompare(right.name));
  const byCode = new Map(ordered.map((country) => [country.code, country]));

  return {
    byName,
    byCode,
    countries,
    codeForCountry(name) {
      return byName.get(normalizeCountryName(name)) || "";
    },
    profileForCountry(name) {
      const code = byName.get(normalizeCountryName(name));
      return code ? byCode.get(code) || null : null;
    },
    profileForCode(code) {
      return byCode.get(normalizeCode(code)) || null;
    },
  };
}

export function countryCodeForName(name, extraCountries = []) {
  return buildCountryCodeIndex(extraCountries).codeForCountry(name);
}

export function countryProfileForName(name, extraCountries = []) {
  return buildCountryCodeIndex(extraCountries).profileForCountry(name);
}
