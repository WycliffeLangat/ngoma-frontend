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
  genre,
  placementCount,
  releaseCount,
  monthCount,
  peakRank,
} = {}) {
  const artistName = String(name || "").trim();
  if (!artistName) return "";

  const home = country ? ` from ${country}` : "";
  const style = genre ? ` whose Ngoma Charts profile is tagged with ${genre}` : "";
  const placements = Number(placementCount) || 0;
  const releases = Number(releaseCount) || 0;
  const months = Number(monthCount) || 0;
  const peak = Number(peakRank);
  const peakText = Number.isFinite(peak) && peak > 0 ? `, with a best artist rank of #${peak}` : "";
  const releaseText = releases
    ? `${releases} credited Top 50 ${releases === 1 ? "release" : "releases"}`
    : "credited Top 50 entries";
  const placementText = placements
    ? `${placements} monthly platform ${placements === 1 ? "placement" : "placements"}`
    : "monthly platform placements";
  const monthText = months
    ? ` across ${months} ${months === 1 ? "month" : "months"}`
    : "";

  return `${artistName} is an artist${home}${style}. Their Ngoma Charts profile covers ${releaseText} and ${placementText}${monthText} in the September 2025 to July 2026 chart archive${peakText}.`;
}
