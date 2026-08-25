const COUNTRY_BY_CODE = {
  AZ: "Azerbaijan",
  BB: "Barbados",
  BW: "Botswana",
  CA: "Canada",
  CD: "DR Congo",
  CI: "Cote d'Ivoire",
  CO: "Colombia",
  DE: "Germany",
  ES: "Spain",
  FR: "France",
  GB: "United Kingdom",
  GH: "Ghana",
  JM: "Jamaica",
  KE: "Kenya",
  KR: "South Korea",
  NG: "Nigeria",
  SE: "Sweden",
  SZ: "Eswatini",
  TZ: "Tanzania",
  UG: "Uganda",
  US: "United States",
  ZA: "South Africa",
};

const ARTIST_COUNTRY_CODES = {
  "al xapo": "GB",
  "addeh prince": "KE",
  "arrow bwoy": "KE",
  "audrey nuna": "US",
  "ayjay bobo": "NG",
  "b2k mnyama": "TZ",
  "balloranking": "NG",
  "bam boy": "KE",
  "benzoo": "ZA",
  "bhadboi oml": "NG",
  "blumengarten": "DE",
  "boohle": "ZA",
  "brick & lace": "JM",
  "bryson tiller": "US",
  "busy signal": "JM",
  "cardinal x25": "ZA",
  "cece winans": "US",
  "christopher martin": "JM",
  "chill77": "SE",
  "crashdummy": "JM",
  "david guetta": "FR",
  "dexta daps": "JM",
  "dj 9.8 sa": "ZA",
  "dj big n": "NG",
  "dj cheem": "BB",
  "dj khaled": "US",
  "dj mac": "JM",
  "dj snake": "FR",
  "dj tunez": "NG",
  "djo": "US",
  "eddy g bomba": "JM",
  "eemoh": "ZA",
  "emin": "AZ",
  "famous pluto": "NG",
  "fameye": "GH",
  "fena gitu": "KE",
  "fik fameica": "UG",
  "frida amani": "TZ",
  "gaise baba": "NG",
  "guzaman maloketo": "TZ",
  "harry belafonte": "US",
  "ice prince": "NG",
  "i-octane": "JM",
  "indila": "FR",
  "ishowspeed": "US",
  "j hus": "GB",
  "jae5": "GB",
  "jahvillani": "JM",
  "jay rock": "US",
  "john holt": "JM",
  "jovial": "KE",
  "justin bieber": "CA",
  "kabelo tiro": "BW",
  "kali uchis": "US",
  "kelvin momo": "ZA",
  "kedjevara": "CI",
  "key glock": "US",
  "kidi": "GH",
  "kinoti": "KE",
  "kitschrieg": "DE",
  "kitschkrieg": "DE",
  "koko pee": "NG",
  "kmk makuburi": "TZ",
  "klassik frescobar": "US",
  "kusah": "TZ",
  "lasmid": "GH",
  "lecrae": "US",
  "lucky dube": "ZA",
  "m'du": "ZA",
  "madilu system": "CD",
  "mad g odeya": "KE",
  "major league djz": "ZA",
  "mano": "ZA",
  "masego": "US",
  "mashede empire": "TZ",
  "masicka": "JM",
  "master kg": "ZA",
  "mauvais djo": "CD",
  "mellow & sleazy": "ZA",
  "m huncho": "GB",
  "miles montana": "ZA",
  "mr eazi": "NG",
  "mr madbwoy46": "TZ",
  "mr nice": "TZ",
  "mr ree": "KE",
  "mugs": "JM",
  "muyeez": "NG",
  "naira marley": "NG",
  "nas": "US",
  "nemzzz": "GB",
  "nf": "US",
  "nle choppa": "US",
  "noah kahan": "US",
  "nomzamo rsa": "ZA",
  "notnice": "JM",
  "odeal": "GB",
  "omega 256": "UG",
  "oscar mbo": "ZA",
  "pexi-tonic sa": "ZA",
  "rosalia": "ES",
  "r2bees": "GH",
  "rei ami": "KR",
  "rym ey": "JM",
  "rymey": "JM",
  "sam deep": "ZA",
  "sammy irungu": "KE",
  "sean paul": "JM",
  "sfear nofokol": "BW",
  "shaboozey": "US",
  "shatta wale": "GH",
  "shane o": "JM",
  "sheebah": "UG",
  "shirin david": "DE",
  "shoday": "NG",
  "singerz": "GH",
  "slingerz": "GH",
  "sleeptherapy": "US",
  "slyzza rsa": "ZA",
  "spice": "JM",
  "steve lacy": "US",
  "tabu ley rochereau": "CD",
  "teebone": "JM",
  "tommy lee sparta": "JM",
  "txc": "ZA",
  "tyga": "US",
  "uncle waffles": "SZ",
  "uncool mc": "ZA",
  "unjaps": "SE",
  "v": "KR",
  "valiant": "JM",
  "vanillah": "TZ",
  "wale": "US",
  "walter chilambo": "TZ",
  "wendy shay": "GH",
  "yemi alade": "NG",
  "yg": "US",
  "yung miami": "US",
  "zara larsson": "SE",
  "zinoleesky": "NG",
  "zlatan": "NG",
};

function normalizeArtistName(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function countryForCode(code) {
  const normalized = String(code || "").trim().toUpperCase();
  return normalized ? { code: normalized, country: COUNTRY_BY_CODE[normalized] || "" } : null;
}

function cleanText(value) {
  const text = String(value ?? "").trim();
  return text && !/^(null|undefined|n\/a|none)$/i.test(text) ? text : "";
}

function uniqueValues(values = []) {
  const seen = new Set();
  const result = [];
  values.forEach((value) => {
    const text = cleanText(value);
    const key = text.toLowerCase();
    if (!text || seen.has(key)) return;
    seen.add(key);
    result.push(text);
  });
  return result;
}

function valuesFromMaybeList(value) {
  if (Array.isArray(value)) return value;
  const text = cleanText(value);
  if (!text || text === "[]") return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Plain text aliases/release lists are handled below.
  }
  return text.split(/[|,]/);
}

function naturalList(values = [], limit = 3) {
  const items = uniqueValues(values).slice(0, limit);
  if (!items.length) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function articleFor(text) {
  return /^[aeiou]/i.test(cleanText(text)) ? "an" : "a";
}

function normalizeArtistType(value) {
  const type = cleanText(value).toLowerCase();
  if (!type) return "artist";
  if (/\b(dj|producer)\b/.test(type)) return type;
  if (/\b(duo|group|band|collective|choir|crew)\b/.test(type)) return type;
  if (/\bsolo\b/.test(type)) return "solo artist";
  return type.includes("artist") ? type : `${type} artist`;
}

function originFor({ cityRegion, country } = {}) {
  const city = cleanText(cityRegion);
  const homeCountry = cleanText(country);
  if (city && homeCountry && city.toLowerCase() !== homeCountry.toLowerCase()) return `${city}, ${homeCountry}`;
  return city || homeCountry;
}

function releaseTitleValues(releaseTitles, releases) {
  return uniqueValues([
    ...valuesFromMaybeList(releaseTitles),
    ...(Array.isArray(releases) ? releases.map((release) => release?.title || release?.t || release?.name) : []),
  ]);
}

function buildArtistBioSentences({
  name,
  country,
  cityRegion,
  genre,
  artistType,
  aliases,
  verified,
  releaseTitles,
  releases,
} = {}) {
  const artistName = cleanText(name);
  if (!artistName) return [];

  const type = normalizeArtistType(artistType);
  const origin = originFor({ cityRegion, country });
  const style = cleanText(genre);
  const introParts = [
    `${artistName} is ${articleFor(type)} ${type}`,
    origin ? `from ${origin}` : "",
    style ? `working in ${style}` : "",
  ].filter(Boolean);
  const intro = `${introParts.join(" ")}.`;

  const aliasList = naturalList(valuesFromMaybeList(aliases), 3);
  const aliasSentence = aliasList ? `They are also credited as ${aliasList}.` : "";

  const titles = releaseTitleValues(releaseTitles, releases)
    .filter((title) => title.toLowerCase() !== artistName.toLowerCase());
  const releaseList = naturalList(titles, 3);
  const releaseSentence = releaseList
    ? `Their Ngoma Charts profile highlights releases including ${releaseList}.`
    : "Their Ngoma Charts profile brings together artist credits, release metadata, and public chart context.";

  const verificationSentence = verified ? "Ngoma Charts marks this as a verified artist profile." : "";
  return [intro, aliasSentence, releaseSentence, verificationSentence].filter(Boolean);
}

export function fallbackCountryForArtist(name) {
  const normalized = normalizeArtistName(name);
  if (!normalized) return null;
  const directCode = ARTIST_COUNTRY_CODES[normalized];
  if (directCode) return countryForCode(directCode);

  const withoutCreditTail = normalized
    .replace(/\s*\|\s*.+$/, "")
    .replace(/,\s+.+$/, "")
    .replace(/\s+(?:ft\.?|feat\.?|featuring|w\/)\s+.+$/i, "")
    .replace(/\s+x\s+.+$/i, "")
    .trim();
  return countryForCode(ARTIST_COUNTRY_CODES[withoutCreditTail]);
}

export function fallbackBiographyForArtist({
  name,
  country,
  cityRegion,
  genre,
  artistType,
  aliases,
  verified,
  releaseTitles,
  releases,
} = {}) {
  return buildArtistBioSentences({
    name,
    country,
    cityRegion,
    genre,
    artistType,
    aliases,
    verified,
    releaseTitles,
    releases,
  }).join(" ");
}

export function enrichBiographyForArtist(baseBiography, metadata = {}) {
  const base = cleanText(baseBiography);
  const generated = buildArtistBioSentences(metadata);
  if (!base) return generated.join(" ");

  const context = generated
    .slice(1)
    .filter((sentence) => !base.toLowerCase().includes(sentence.toLowerCase()))
    .slice(0, base.length < 180 ? 2 : 1);
  return [base, ...context].filter(Boolean).join(" ");
}
