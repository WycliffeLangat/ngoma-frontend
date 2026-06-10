import { useEffect, useMemo, useState } from "react";

// Region-based colour-coding for country badges. Lets a user scan the chart
// and instantly gauge domestic (KE) vs cross-border market penetration.
const REGION_BADGE = {
  KE: { from: "#d4af37", to: "#b88914", text: "#111111" }, // Kenya — gold (home market)
  TZ: { from: "#2f7bd6", to: "#1d579e", text: "#ffffff" }, // Tanzania — blue
  UG: { from: "#15909e", to: "#0e6770", text: "#ffffff" }, // Uganda — teal
  RW: { from: "#4f5bd5", to: "#3a44a6", text: "#ffffff" }, // Rwanda — indigo
  CD: { from: "#b07a2b", to: "#825a1d", text: "#ffffff" }, // DR Congo — bronze
  NG: { from: "#7a5bd0", to: "#5a3fa6", text: "#ffffff" }, // Nigeria — violet
  GH: { from: "#c0463b", to: "#902f27", text: "#ffffff" }, // Ghana — red
  ZA: { from: "#e07b1f", to: "#b35f13", text: "#ffffff" }, // South Africa — orange
  US: { from: "#4a5568", to: "#2d3340", text: "#ffffff" }, // USA / intl — slate
  GB: { from: "#5b6b8c", to: "#3c4a66", text: "#ffffff" }, // UK — slate-blue
};
const DEFAULT_BADGE = { from: "#9aa0a6", to: "#6b7077", text: "#ffffff" }; // other / unknown — grey

function regionBadge(code) {
  const key = String(code || "").trim().toUpperCase();
  if (REGION_BADGE[key]) return REGION_BADGE[key];
  // East-African neighbours not explicitly listed lean gold; everything else slate-ish
  return DEFAULT_BADGE;
}

// Complete artist -> country map (generated from the full roster).
// The chart uses the API's country_code first; this is the fallback when
// the API doesn't supply one. 'SleepTherapy' is intentionally absent
// (it is a generic sleep-sounds catalogue name, not a real artist).
const ARTIST_COUNTRY_FALLBACK = {
  "21 Savage": { country: "United States", code: "US" },
  "347aidan": { country: "Canada", code: "CA" },
  "Ada Ehi": { country: "Nigeria", code: "NG" },
  "Adekunle Gold": { country: "Nigeria", code: "NG" },
  "Adele": { country: "United Kingdom", code: "GB" },
  "Alan Walker": { country: "Norway", code: "NO" },
  "Alikiba": { country: "Tanzania", code: "TZ" },
  "Amiso thwango": { country: "Kenya", code: "KE" },
  "Angela Chibalonza": { country: "Kenya", code: "KE" },
  "Anni3": { country: "Kenya", code: "KE" },
  "Ariana Grande": { country: "United States", code: "US" },
  "Asake": { country: "Nigeria", code: "NG" },
  "Aslam Tz": { country: "Tanzania", code: "TZ" },
  "Ayra Starr": { country: "Nigeria", code: "NG" },
  "Azawi": { country: "Uganda", code: "UG" },
  "Bahati": { country: "Kenya", code: "KE" },
  "Barnaba": { country: "Tanzania", code: "TZ" },
  "Bebe Cool": { country: "Uganda", code: "UG" },
  "Bella Kombo": { country: "Kenya", code: "KE" },
  "Bensoul": { country: "Kenya", code: "KE" },
  "BeyoncÃ©": { country: "United States", code: "US" },
  "Beyoncé": { country: "United States", code: "US" },
  "Bien": { country: "Kenya", code: "KE" },
  "Bien ft. Scar": { country: "Kenya", code: "KE" },
  "Big yasa": { country: "Kenya", code: "KE" },
  "BigXthaPlug": { country: "United States", code: "US" },
  "Billie Eilish": { country: "United States", code: "US" },
  "Billnass": { country: "Tanzania", code: "TZ" },
  "Black Sherif": { country: "Ghana", code: "GH" },
  "Blaq Diamond": { country: "South Africa", code: "ZA" },
  "Bnxn": { country: "Nigeria", code: "NG" },
  "BNXN": { country: "Nigeria", code: "NG" },
  "Bobi Wine": { country: "Uganda", code: "UG" },
  "Boutross": { country: "Kenya", code: "KE" },
  "BoyPee": { country: "Nigeria", code: "NG" },
  "Breeder LW": { country: "Kenya", code: "KE" },
  "Bridget Blue": { country: "Kenya", code: "KE" },
  "Bruce Africa": { country: "Tanzania", code: "TZ" },
  "Bruce africa": { country: "Tanzania", code: "TZ" },
  "Bruce Melodie": { country: "Rwanda", code: "RW" },
  "Bruni Star": { country: "Tanzania", code: "TZ" },
  "Bruno Mars": { country: "United States", code: "US" },
  "Burna Boy": { country: "Nigeria", code: "NG" },
  "BURUKLYN BOYZ": { country: "Kenya", code: "KE" },
  "Buruklyn Boyz": { country: "Kenya", code: "KE" },
  "Caiiro": { country: "South Africa", code: "ZA" },
  "Cardi B": { country: "United States", code: "US" },
  "Central Cee": { country: "United Kingdom", code: "GB" },
  "Chandler Moore": { country: "United States", code: "US" },
  "Charisma": { country: "Kenya", code: "KE" },
  "Chege": { country: "Tanzania", code: "TZ" },
  "Chike": { country: "Nigeria", code: "NG" },
  "Chris Brown": { country: "United States", code: "US" },
  "Christina Shusho": { country: "Tanzania", code: "TZ" },
  "CKay": { country: "Nigeria", code: "NG" },
  "Coldplay": { country: "United Kingdom", code: "GB" },
  "Coster Ojwang": { country: "Kenya", code: "KE" },
  "Crayon": { country: "Nigeria", code: "NG" },
  "D Voice": { country: "Tanzania", code: "TZ" },
  "Darassa": { country: "Tanzania", code: "TZ" },
  "Darkoo": { country: "United Kingdom", code: "GB" },
  "Dave": { country: "United Kingdom", code: "GB" },
  "Davido": { country: "Nigeria", code: "NG" },
  "Dayoo": { country: "Tanzania", code: "TZ" },
  "Debordo Leekunfa": { country: "Côte d'Ivoire", code: "CI" },
  "Diamond Platnumz": { country: "Tanzania", code: "TZ" },
  "DJ Lyta": { country: "Kenya", code: "KE" },
  "DJ WIZZY 254": { country: "Kenya", code: "KE" },
  "Dlala Thukzin": { country: "South Africa", code: "ZA" },
  "DOBA GENJE": { country: "Tanzania", code: "TZ" },
  "Doechii": { country: "United States", code: "US" },
  "Don Toliver": { country: "United States", code: "US" },
  "Drake": { country: "Canada", code: "CA" },
  "Dully Sykes": { country: "Tanzania", code: "TZ" },
  "Dunsin Oyekan": { country: "Nigeria", code: "NG" },
  "DYANA CODS": { country: "Kenya", code: "KE" },
  "Dyana Cods": { country: "Kenya", code: "KE" },
  "Ed Sheeran": { country: "United Kingdom", code: "GB" },
  "Eddy Kenzo": { country: "Uganda", code: "UG" },
  "Eminem": { country: "United States", code: "US" },
  "Emma Jalamo": { country: "Kenya", code: "KE" },
  "Eunice Njeri": { country: "Kenya", code: "KE" },
  "Excess Van": { country: "Kenya", code: "KE" },
  "Fally Ipupa": { country: "DR Congo", code: "CD" },
  "Fancy Fingers Refix - Fancy Fingers": { country: "Kenya", code: "KE" },
  "Fathermoh": { country: "Kenya", code: "KE" },
  "Felo Le Tee": { country: "South Africa", code: "ZA" },
  "Fido": { country: "Nigeria", code: "NG" },
  "Fireboy DML": { country: "Nigeria", code: "NG" },
  "Frank Ocean": { country: "United States", code: "US" },
  "From The Hood Music": { country: "Kenya", code: "KE" },
  "Future": { country: "United States", code: "US" },
  "Geniusjini x66": { country: "Kenya", code: "KE" },
  "GloRilla": { country: "United States", code: "US" },
  "Gody Tennor": { country: "Kenya", code: "KE" },
  "Govana": { country: "Jamaica", code: "JM" },
  "Guardian Angel": { country: "Kenya", code: "KE" },
  "Gunna": { country: "United States", code: "US" },
  "Gyptian": { country: "Jamaica", code: "JM" },
  "H_art the Band": { country: "Kenya", code: "KE" },
  "Hanumankind": { country: "India", code: "IN" },
  "Harmonize": { country: "Tanzania", code: "TZ" },
  "HOOD BOYZ": { country: "Kenya", code: "KE" },
  "Ibraah": { country: "Tanzania", code: "TZ" },
  "Isaiah Ndungu": { country: "Kenya", code: "KE" },
  "Israel Mbonyi": { country: "Rwanda", code: "RW" },
  "Iyanii": { country: "Kenya", code: "KE" },
  "J. Cole": { country: "United States", code: "US" },
  "Jabidii": { country: "Kenya", code: "KE" },
  "Jay Melody": { country: "Tanzania", code: "TZ" },
  "Jay melody": { country: "Tanzania", code: "TZ" },
  "Joeboy": { country: "Nigeria", code: "NG" },
  "Joefes": { country: "Nigeria", code: "NG" },
  "Joel Lwaga": { country: "Tanzania", code: "TZ" },
  "Johnny Drille": { country: "Nigeria", code: "NG" },
  "Jose Chameleone": { country: "Uganda", code: "UG" },
  "Joseph Kamaru": { country: "Kenya", code: "KE" },
  "Joshua Baraka": { country: "Uganda", code: "UG" },
  "JoÃ© DwÃ¨t FilÃ©": { country: "France", code: "FR" },
  "Joé Dwèt Filé": { country: "France", code: "FR" },
  "Juice WRLD": { country: "United States", code: "US" },
  "Justin Vibes": { country: "Kenya", code: "KE" },
  "Jux": { country: "Tanzania", code: "TZ" },
  "Juxx": { country: "Kenya", code: "KE" },
  "Kabza De Small": { country: "South Africa", code: "ZA" },
  "Kaka Talanta": { country: "Kenya", code: "KE" },
  "Kanye West": { country: "United States", code: "US" },
  "Keemlyf": { country: "Kenya", code: "KE" },
  "Kell Kay": { country: "Kenya", code: "KE" },
  "Ken Carson": { country: "United States", code: "US" },
  "Kendrick Lamar": { country: "United States", code: "US" },
  "Khalid": { country: "United States", code: "US" },
  "Khaligraph Jones": { country: "Kenya", code: "KE" },
  "Khalil Harrison": { country: "South Africa", code: "ZA" },
  "King Promise": { country: "Ghana", code: "GH" },
  "Kizz Daniel": { country: "Nigeria", code: "NG" },
  "KODONGKLAN": { country: "Kenya", code: "KE" },
  "Koffi Olomide": { country: "DR Congo", code: "CD" },
  "Koppa Gekon": { country: "Kenya", code: "KE" },
  "Kouz1": { country: "Kenya", code: "KE" },
  "Lady Gaga": { country: "United States", code: "US" },
  "Lavalava": { country: "Tanzania", code: "TZ" },
  "Lexsil": { country: "Kenya", code: "KE" },
  "Lil Maina": { country: "Kenya", code: "KE" },
  "Lil Tecca": { country: "United States", code: "US" },
  "Lil Uzi Vert": { country: "United States", code: "US" },
  "Lilmaina": { country: "Kenya", code: "KE" },
  "Lony Bway": { country: "Tanzania", code: "TZ" },
  "Loreen": { country: "Sweden", code: "SE" },
  "M.O.B": { country: "Kenya", code: "KE" },
  "Mad Clan": { country: "Kenya", code: "KE" },
  "Makhadzi": { country: "South Africa", code: "ZA" },
  "Marioo": { country: "Tanzania", code: "TZ" },
  "Master KG": { country: "South Africa", code: "ZA" },
  "Matata": { country: "Kenya", code: "KE" },
  "Maua Sama": { country: "Tanzania", code: "TZ" },
  "Maxi Priest": { country: "United Kingdom", code: "GB" },
  "Mbosso": { country: "Tanzania", code: "TZ" },
  "Mega": { country: "Kenya", code: "KE" },
  "Megan Thee Stallion": { country: "United States", code: "US" },
  "Mejja": { country: "Kenya", code: "KE" },
  "Mercy Chinwo": { country: "Nigeria", code: "NG" },
  "Metro Boomin": { country: "United States", code: "US" },
  "Minister Danybless": { country: "Tanzania", code: "TZ" },
  "Minister GUC": { country: "Nigeria", code: "NG" },
  "Mocco Genius": { country: "Tanzania", code: "TZ" },
  "MOLIY": { country: "Ghana", code: "GH" },
  "Molly Santana": { country: "United States", code: "US" },
  "Mr Pilato": { country: "Tanzania", code: "TZ" },
  "Mr Right": { country: "Kenya", code: "KE" },
  "Mr Seed": { country: "Kenya", code: "KE" },
  "Mr.Tee": { country: "Kenya", code: "KE" },
  "Mudra D Viral": { country: "Kenya", code: "KE" },
  "mudra d viral": { country: "Kenya", code: "KE" },
  "Mutoriah": { country: "Kenya", code: "KE" },
  "Nadia Mukami": { country: "Kenya", code: "KE" },
  "Najeeriii": { country: "Kenya", code: "KE" },
  "Nandipha808": { country: "South Africa", code: "ZA" },
  "Nandy": { country: "Tanzania", code: "TZ" },
  "Ndotz": { country: "Kenya", code: "KE" },
  "Neema Gospel Choir": { country: "Tanzania", code: "TZ" },
  "Nicki Minaj": { country: "United States", code: "US" },
  "Nikita Kering": { country: "Kenya", code: "KE" },
  "Nikita Keringâ€™": { country: "Kenya", code: "KE" },
  "Nikita Kering’": { country: "Kenya", code: "KE" },
  "Nines": { country: "United Kingdom", code: "GB" },
  "Njerae": { country: "Kenya", code: "KE" },
  "Nyashinski": { country: "Kenya", code: "KE" },
  "Obby Alpha": { country: "Kenya", code: "KE" },
  "Octopizzo": { country: "Kenya", code: "KE" },
  "Odongo Swagg": { country: "Kenya", code: "KE" },
  "OgaObinna": { country: "Kenya", code: "KE" },
  "Olivia Dean": { country: "United Kingdom", code: "GB" },
  "Olivia Rodrigo": { country: "United States", code: "US" },
  "Omah Lay": { country: "Nigeria", code: "NG" },
  "One Voice Children's Choir": { country: "United States", code: "US" },
  "OSKIDO": { country: "South Africa", code: "ZA" },
  "Othicho Jasuba": { country: "Kenya", code: "KE" },
  "Otile Brown": { country: "Kenya", code: "KE" },
  "Papi Clever & Dorcas": { country: "DR Congo", code: "CD" },
  "PARTYNEXTDOOR": { country: "Canada", code: "CA" },
  "Patoranking": { country: "Nigeria", code: "NG" },
  "Phina": { country: "Tanzania", code: "TZ" },
  "Phyllis Mbuthia": { country: "Kenya", code: "KE" },
  "Playboi Carti": { country: "United States", code: "US" },
  "Preston Pablo": { country: "Canada", code: "CA" },
  "Prince Indah": { country: "Kenya", code: "KE" },
  "prodbycpkshawn": { country: "Kenya", code: "KE" },
  "Qing Madi": { country: "Nigeria", code: "NG" },
  "Quavo": { country: "United States", code: "US" },
  "Rayvanny": { country: "Tanzania", code: "TZ" },
  "Rema": { country: "Nigeria", code: "NG" },
  "Rihanna": { country: "Barbados", code: "BB" },
  "Rod Wave": { country: "United States", code: "US" },
  "Roma Mkatoliki": { country: "Tanzania", code: "TZ" },
  "ROSÃ‰": { country: "South Korea", code: "KR" },
  "ROSÉ": { country: "South Korea", code: "KR" },
  "Ruger": { country: "Nigeria", code: "NG" },
  "Sabrina Carpenter": { country: "United States", code: "US" },
  "SahBabii": { country: "United States", code: "US" },
  "Salim Junior": { country: "Kenya", code: "KE" },
  "Sam Smith": { country: "United Kingdom", code: "GB" },
  "Sarkodie": { country: "Ghana", code: "GH" },
  "Sasha Alex Sloan": { country: "United States", code: "US" },
  "Sauti Sol": { country: "Kenya", code: "KE" },
  "Savara": { country: "Kenya", code: "KE" },
  "Scar Mkadinali": { country: "Kenya", code: "KE" },
  "SEAN MMG": { country: "Kenya", code: "KE" },
  "Sexyy Red": { country: "United States", code: "US" },
  "Seyi Vibez": { country: "Nigeria", code: "NG" },
  "Shad Mziki": { country: "Tanzania", code: "TZ" },
  "Shatta Wale": { country: "Ghana", code: "GH" },
  "Shenseea": { country: "Jamaica", code: "JM" },
  "Simi": { country: "Nigeria", code: "NG" },
  "Skillibeng": { country: "Jamaica", code: "JM" },
  "Sophia George": { country: "Jamaica", code: "JM" },
  "Sosa The Prodigy": { country: "Kenya", code: "KE" },
  "Soundkraft": { country: "Kenya", code: "KE" },
  "Spice Diana": { country: "Uganda", code: "UG" },
  "Spoiler": { country: "Kenya", code: "KE" },
  "Ssaru": { country: "Kenya", code: "KE" },
  "Stamina Shorwebwenzi": { country: "Tanzania", code: "TZ" },
  "Stanley & The Turbines": { country: "Kenya", code: "KE" },
  "Stella Mengele": { country: "Kenya", code: "KE" },
  "Stephen Kasolo": { country: "Kenya", code: "KE" },
  "Stonebwoy": { country: "Ghana", code: "GH" },
  "Summer Walker": { country: "United States", code: "US" },
  "SZA": { country: "United States", code: "US" },
  "Taylor Swift": { country: "United States", code: "US" },
  "Tems": { country: "Nigeria", code: "NG" },
  "The Ben": { country: "Rwanda", code: "RW" },
  "The Weeknd": { country: "Canada", code: "CA" },
  "TitoM": { country: "South Africa", code: "ZA" },
  "Toby Mr Romantic": { country: "Kenya", code: "KE" },
  "Tonny Young": { country: "Kenya", code: "KE" },
  "Toxic Lyrikali": { country: "Kenya", code: "KE" },
  "Travis Scott": { country: "United States", code: "US" },
  "Trio Mio": { country: "Kenya", code: "KE" },
  "Tyla": { country: "South Africa", code: "ZA" },
  "Tyler ICU": { country: "South Africa", code: "ZA" },
  "Tyler, The Creator": { country: "United States", code: "US" },
  "Tyler, The creator": { country: "United States", code: "US" },
  "Uncle Eddy": { country: "Kenya", code: "KE" },
  "Vicky Brilliance": { country: "Kenya", code: "KE" },
  "Victony": { country: "Nigeria", code: "NG" },
  "Vinka": { country: "Uganda", code: "UG" },
  "Vybz Kartel": { country: "Jamaica", code: "JM" },
  "Wadagliz": { country: "Kenya", code: "KE" },
  "Wakadinali": { country: "Kenya", code: "KE" },
  "Wanavokali": { country: "Kenya", code: "KE" },
  "Watendawili": { country: "Kenya", code: "KE" },
  "Whozu": { country: "Tanzania", code: "TZ" },
  "Willy Paul": { country: "Kenya", code: "KE" },
  "Wizkid": { country: "Nigeria", code: "NG" },
  "YA LEVIS": { country: "DR Congo", code: "CD" },
  "Yammi": { country: "Tanzania", code: "TZ" },
  "YBW Smith": { country: "Kenya", code: "KE" },
  "Years & Years": { country: "United Kingdom", code: "GB" },
  "Yeat": { country: "United States", code: "US" },
  "Young Jonn": { country: "Nigeria", code: "NG" },
  "YoungBoy Never Broke Again": { country: "United States", code: "US" },
  "Zabron Singers": { country: "Tanzania", code: "TZ" },
  "Zerb": { country: "Kenya", code: "KE" },
  "ZIGGY MADUDU": { country: "Kenya", code: "KE" },
  "Zuchu": { country: "Tanzania", code: "TZ" },
  "Zzero Sufuri": { country: "Kenya", code: "KE" },
};

function normalizeArtistName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function findArtistCountryFallback(name) {
  const cleanName = String(name || "").trim();

  if (!cleanName) return null;

  if (ARTIST_COUNTRY_FALLBACK[cleanName]) {
    return ARTIST_COUNTRY_FALLBACK[cleanName];
  }

  const normalizedName = normalizeArtistName(cleanName);

  const exactMatchKey = Object.keys(ARTIST_COUNTRY_FALLBACK).find(
    (key) => normalizeArtistName(key) === normalizedName
  );

  if (exactMatchKey) {
    return ARTIST_COUNTRY_FALLBACK[exactMatchKey];
  }

  const primaryArtist = cleanName
    .split(/,|&| x | X | feat\.|ft\.|featuring/i)[0]
    ?.trim();

  if (primaryArtist && primaryArtist !== cleanName) {
    return findArtistCountryFallback(primaryArtist);
  }

  return null;
}

function useRealMobile(isMobileFromParent) {
  const getIsMobile = () => {
    if (typeof window === "undefined") return Boolean(isMobileFromParent);

    const widthCandidates = [
      window.innerWidth,
      window.visualViewport?.width,
      window.screen?.width,
      document.documentElement?.clientWidth,
    ].filter(Boolean);

    const smallestWidth = Math.min(...widthCandidates);

    const isSmallScreen = smallestWidth <= 768;

    const isTouchPhone =
      typeof navigator !== "undefined" &&
      /Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    return isSmallScreen || isTouchPhone || Boolean(isMobileFromParent);
  };

  const [realMobile, setRealMobile] = useState(getIsMobile);

  useEffect(() => {
    function checkMobile() {
      setRealMobile(getIsMobile());
    }

    checkMobile();

    window.addEventListener("resize", checkMobile);
    window.addEventListener("orientationchange", checkMobile);

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", checkMobile);
      window.visualViewport.addEventListener("scroll", checkMobile);
    }

    return () => {
      window.removeEventListener("resize", checkMobile);
      window.removeEventListener("orientationchange", checkMobile);

      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", checkMobile);
        window.visualViewport.removeEventListener("scroll", checkMobile);
      }
    };
  }, [isMobileFromParent]);

  return realMobile;
}

function countryCodeToFlag(countryCode) {
  const code = String(countryCode || "").trim().toUpperCase();

  if (code.length !== 2 || !/^[A-Z]{2}$/.test(code)) {
    return String.fromCodePoint(0x1f30d);
  }

  return code
    .split("")
    .map((letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)))
    .join("");
}

function getArtistCountry(item) {
  const directCode = String(item.artist_country_code || item.country_code || "").trim().toUpperCase();

  if (directCode) {
    return {
      flag: countryCodeToFlag(directCode),
      country: item.artist_country || item.country || "",
      code: directCode,
    };
  }

  const fallback =
    findArtistCountryFallback(item.artist) ||
    findArtistCountryFallback(item.artist_name) ||
    findArtistCountryFallback(item.primary_artist);

  if (fallback) {
    return {
      flag: countryCodeToFlag(fallback.code),
      country: fallback.country,
      code: fallback.code,
    };
  }

  return {
    flag: String.fromCodePoint(0x1f30d),
    country: "Country not set",
    code: "",
  };
}

export default function PremiumChartsPage({
  isMobile,
  loaded,
  GOLD,
  MEDALS,
  MONTHS,
  VO,
  PC,
  PLAT_LABEL,
  ct,
  setCt,
  month,
  setMonth,
  plat,
  setPlat,
  platList,
  vc,
  setVc,
  data,
  display,
  top,
  tp,
  isSingles,
  artists,
  setSelA,
  setSelR,
  getCombined,
  liveChartLoading,
  liveChartMeta,
  liveStatus,
}) {
  const mobile = useRealMobile(isMobile);
  const [expandedMobileRows, setExpandedMobileRows] = useState({});

  const chartTitle = "Ngoma Top 50";
  const chartLabel = isSingles ? "Singles" : "Albums";
  const platformLabel =
    liveChartMeta?.platform || (plat === "Combined" ? "Combined" : PLAT_LABEL[plat] || plat);

  function movement(item) {
    const movementType = String(item.movement || item.movement_type || "").toLowerCase();
    const isReEntry =
      item.reentry ||
      movementType === "reentry" ||
      movementType === "re-entry" ||
      movementType === "re" ||
      movementType === "r.e";

    if (isReEntry) return { type: "reentry", label: "RE" };

    if (item.is_new || movementType === "new") {
      return { type: "new", label: "NEW" };
    }

    if (item.prev === null || item.prev === undefined || item.prev === "") {
      return { type: "new", label: "NEW" };
    }

    const diff = Number(item.prev) - Number(item.rank);

    if (diff > 0) return { type: "up", label: `▲ ${diff}` };
    if (diff < 0) return { type: "down", label: `▼ ${Math.abs(diff)}` };

    return { type: "same", label: "—" };
  }

  function movementStyle(item) {
    const m = movement(item);

    if (m.type === "up") {
      return {
        color: "#2DB04A",
        background: "rgba(45,176,74,0.12)",
      };
    }

    if (m.type === "down") {
      return {
        color: "#E53935",
        background: "rgba(229,57,53,0.12)",
      };
    }

    if (m.type === "new") {
      return {
        color: GOLD,
        background: "rgba(184,134,11,0.14)",
      };
    }

    if (m.type === "reentry") {
      return {
        color: "#1565C0",
        background: "rgba(21,101,192,0.12)",
      };
    }

    return {
      color: "#777777",
      background: "#f2f2f2",
    };
  }

  function getReleaseProfile(item) {
    const lastMonth =
      item.last_month !== undefined && item.last_month !== null && item.last_month !== ""
        ? item.last_month
        : item.prev ?? "—";

    const peak =
      item.peak_rank !== undefined && item.peak_rank !== null && item.peak_rank !== ""
        ? item.peak_rank
        : calculateStaticPeak(item);

    const weeks =
      item.weeks_on_chart !== undefined &&
      item.weeks_on_chart !== null &&
      item.weeks_on_chart !== ""
        ? item.weeks_on_chart
        : calculateStaticWeeks(item);

    return {
      lastMonth,
      peak,
      weeks,
    };
  }

  function calculateStaticPeak(item) {
    let peak = item.rank || "—";

    MONTHS.forEach((m) => {
      const found = getCombined(ct, m).find(
        (entry) => entry.title === item.title && entry.artist === item.artist
      );

      if (found && typeof found.rank === "number" && found.rank < peak) {
        peak = found.rank;
      }
    });

    return peak;
  }

  function calculateStaticWeeks(item) {
    let weeks = 0;

    MONTHS.forEach((m) => {
      const found = getCombined(ct, m).find(
        (entry) => entry.title === item.title && entry.artist === item.artist
      );

      if (found) weeks += 1;
    });

    return weeks || "—";
  }

  function openArtist(name) {
    const artist = artists.find((item) => item.n === name);
    if (artist) setSelA(artist);
  }

  function openRelease(item) {
    setSelR({
      ...item,
      type: isSingles ? "single" : "album",
    });
  }

  // ----- Sortable columns -------------------------------------------------
  // Default ("rank"/"asc") preserves the chart's natural order.
  const [sort, setSort] = useState({ key: "rank", dir: "asc" });

  function sortValue(item, key) {
    const profile = getReleaseProfile(item);
    const num = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
    };
    switch (key) {
      case "rank":
        return num(item.rank);
      case "lastMonth":
        return num(profile.lastMonth);
      case "peak":
        return num(profile.peak);
      case "months":
        return num(profile.weeks);
      case "platforms": {
        const m = String(item.plat || "").match(/^(\d+)/);
        return m ? Number(m[1]) : -1;
      }
      default:
        return num(item.rank);
    }
  }

  const sortedData = useMemo(() => {
    const copy = [...data];
    copy.sort((a, b) => {
      const av = sortValue(a, sort.key);
      const bv = sortValue(b, sort.key);
      if (av === bv) return Number(a.rank) - Number(b.rank); // stable tie-break
      return sort.dir === "asc" ? av - bv : bv - av;
    });
    return copy;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, sort, ct, month]);

  const shown = sortedData.slice(0, vc);

  function handleSort(key) {
    setSort((current) => {
      if (current.key !== key) {
        // Rank/Last Month/Peak read best-first (asc); Months/Platforms read
        // most-first (desc) on first click — that's what people expect.
        const firstDir = key === "months" || key === "platforms" ? "desc" : "asc";
        return { key, dir: firstDir };
      }
      return { key, dir: current.dir === "asc" ? "desc" : "asc" };
    });
  }

  function sortArrow(key) {
    if (sort.key !== key) return "";
    return sort.dir === "asc" ? " ▲" : " ▼";
  }

  // ----- Trend sparkline data --------------------------------------------
  function getTrendPositions(item) {
    const idx = MONTHS.indexOf(month);
    if (idx < 0) return [];
    const windowMonths = MONTHS.slice(Math.max(0, idx - 5), idx + 1);
    return windowMonths.map((m) => {
      const found = getCombined(ct, m).find(
        (entry) => entry.title === item.title && entry.artist === item.artist
      );
      return found && typeof found.rank === "number" ? found.rank : null;
    });
  }

  // ----- CSV / report export ---------------------------------------------
  function exportCsv() {
    const header = [
      "Rank",
      isSingles ? "Song" : "Album",
      "Artist",
      "Country",
      "Country Code",
      "Last Month",
      "Peak",
      "Months on Chart",
      "Platforms",
    ];
    const escape = (value) => {
      const s = String(value ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = shown.map((item) => {
      const profile = getReleaseProfile(item);
      const country = getArtistCountry(item);
      return [
        item.rank,
        item.title,
        item.artist,
        country.country,
        country.code,
        profile.lastMonth,
        profile.peak,
        profile.weeks,
        plat === "Combined" && item.plat ? item.plat : "—",
      ]
        .map(escape)
        .join(",");
    });
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    link.href = url;
    link.download = `ngoma-top-${shown.length}-${slug(month)}-${slug(platformLabel)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function getMobileRowKey(item, index) {
    return `${item.title}-${item.artist}-${item.rank}-${index}`;
  }

  function toggleMobileRow(rowKey) {
    setExpandedMobileRows((current) => ({
      ...current,
      [rowKey]: !current[rowKey],
    }));
  }

  useEffect(() => {
    setExpandedMobileRows({});
  }, [ct, month, plat, vc]);

  function ChartToggle() {
    return (
      <div style={styles.toggleWrap}>
        {["singles", "albums"].map((item) => {
          const active = ct === item;

          return (
            <button
              key={item}
              onClick={() => {
                setCt(item);
                setPlat("Combined");
              }}
              style={{
                ...styles.toggleButton,
                background: active ? GOLD : "#ffffff",
                color: active ? "#090909" : "#111111",
                borderColor: active ? GOLD : "rgba(0,0,0,0.14)",
                flex: mobile ? 1 : "initial",
              }}
            >
              {item}
            </button>
          );
        })}
      </div>
    );
  }

  function MobileStat({ label, value }) {
    return (
      <div style={styles.mobileMiniStat}>
        <span style={styles.mobileMiniStatLabel}>{label}</span>
        <span style={styles.mobileMiniStatValue}>{value}</span>
      </div>
    );
  }

  const sourceLabel = new Date().toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const isCombinedChart = plat === "Combined";
  const crossPlatformHitsCount = data.filter((item) => item.plat === `${tp}/${tp}`).length;
  const newEntriesCount = data.filter((item) => movement(item).type === "new").length;

  return (
    <div style={styles.page}>
      <section
        style={{
          ...styles.hero,
          padding: mobile ? "28px 16px 24px" : "46px 44px 40px",
          opacity: loaded ? 1 : 0,
          transform: loaded ? "none" : "translateY(8px)",
        }}
      >
        <div style={styles.heroGlow} />

        <div
          style={{
            ...styles.eyebrowRow,
            fontSize: mobile ? "10px" : "11px",
            marginBottom: 0,
          }}
        >
          <span style={{ opacity: 0.65, letterSpacing: "0.5px" }}>{sourceLabel}</span>
          <span style={styles.eyebrowDivider}>/</span>
          <span>{platformLabel}</span>
          {liveChartLoading && (
            <>
              <span style={styles.eyebrowDivider}>/</span>
              <span>Loading</span>
            </>
          )}
        </div>

        <div
          style={{
            ...styles.heroMain,
            gridTemplateColumns: mobile ? "1fr" : "minmax(0, 1fr) minmax(260px, 360px)",
            gap: mobile ? "20px" : "28px",
          }}
        >
          <div
            style={{
              ...styles.heroLeft,
              paddingTop: 0,
              paddingBottom: 0,
            }}
          >
            <h1
              style={{
                ...styles.heroTitle,
                fontSize: mobile ? "42px" : "76px",
                letterSpacing: mobile ? "-1.5px" : "-3px",
                margin: mobile ? "-2px 0 54px" : "-10px 0 84px",
              }}
            >
              {chartTitle}
            </h1>

            <div
              style={{
                ...styles.heroMeta,
                alignItems: "baseline",
              }}
            >
              <span
                style={{
                  fontSize: mobile ? "20px" : "24px",
                  fontWeight: 850,
                  letterSpacing: "-0.5px",
                  color: "#050505",
                }}
              >
                {month}
              </span>
            </div>
          </div>

          <div
            style={{
              ...styles.numberOneCard,
              borderRadius: mobile ? "22px" : "28px",
              padding: mobile ? "20px" : "24px",
            }}
          >
            <div style={styles.numberOneLabel}>#1 this month</div>

            <div
              style={{
                ...styles.numberOneRank,
                fontSize: mobile ? "76px" : "96px",
              }}
            >
              1
            </div>

            <button
              onClick={() => top && openRelease(top)}
              style={{
                ...styles.numberOneTitle,
                fontSize: mobile ? "23px" : "28px",
              }}
            >
              {top?.title || "—"}
            </button>

            <button onClick={() => top && openArtist(top.artist)} style={styles.numberOneArtist}>
              {top?.artist || ""}
            </button>

            {top?.plat && <div style={styles.coveragePill}>{top.plat} platforms</div>}
          </div>
        </div>
      </section>

      <section
        style={{
          ...styles.statsBand,
          gridTemplateColumns: mobile ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))",
        }}
      >
        {[
          {
            label: "Entries",
            value: data.length,
            sub: isSingles ? "songs" : "albums",
          },
          {
            label: isCombinedChart ? "Cross-Platform Hits" : "Platform Entries",
            value: isCombinedChart ? crossPlatformHitsCount : data.length,
            sub: isCombinedChart
              ? `on all ${tp} platforms`
              : `${isSingles ? "songs" : "albums"} on ${platformLabel}`,
          },
          {
            label: "New Entries",
            value: newEntriesCount,
            sub: "this month",
          },
          {
            label: "Chart Leader",
            value: top?.title || "—",
            sub: top?.artist || "",
            compact: true,
          },
        ].map((item, index) => (
          <div
            key={item.label}
            style={{
              ...styles.statItem,
              padding: mobile ? "15px 16px" : "18px 24px",
            }}
          >
            <div style={styles.statLabel}>{item.label}</div>
            <div
              style={{
                ...styles.statValue,
                fontSize: item.compact ? (mobile ? "15px" : "18px") : mobile ? "25px" : "30px",
                color: index === 3 ? GOLD : "#050505",
              }}
            >
              {item.value}
            </div>
            <div style={styles.statSub}>{item.sub}</div>
          </div>
        ))}
      </section>

      <section
        style={{
          ...styles.controls,
          flexDirection: mobile ? "column" : "row",
          alignItems: mobile ? "stretch" : "center",
          padding: mobile ? "14px 16px" : "16px 28px",
        }}
      >
        <ChartToggle />

        <select
          value={month}
          onChange={(event) => setMonth(event.target.value)}
          style={{
            ...styles.select,
            width: mobile ? "100%" : "auto",
          }}
        >
          {MONTHS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <div style={mobile ? { position: "relative", width: "100%", minWidth: 0 } : { display: "contents" }}>
          <div
            style={{
              ...styles.platforms,
              gap: mobile ? "9px" : "6px",
              flexWrap: mobile ? "nowrap" : "wrap",
              overflowX: mobile ? "auto" : "visible",
              paddingBottom: mobile ? "6px" : 0,
              paddingRight: mobile ? "30px" : 0,
            }}
          >
            {platList.map((item) => {
              const active = plat === item;
              const color = item === "Combined" ? GOLD : PC[item] || GOLD;
              const label = item === "Combined" ? item : PLAT_LABEL[item] || item;

              return (
                <button
                  key={item}
                  onClick={() => setPlat(item)}
                  style={{
                    ...styles.platformButton,
                    padding: mobile ? "9px 15px" : "8px 12px",
                    borderColor: active ? color : "rgba(0,0,0,0.12)",
                    background: active ? `${color}18` : "#ffffff",
                    color: active ? color : "#6b7280",
                    flexShrink: 0,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {mobile && <div style={styles.pillFade} />}
        </div>

        <div
          style={{
            ...styles.viewOptions,
            marginLeft: mobile ? 0 : "auto",
            width: mobile ? "100%" : "auto",
          }}
        >
          {VO.map((item) => {
            const active = vc === item.c;
            const disabled = item.c > data.length;

            return (
              <button
                key={item.c}
                onClick={() => !disabled && setVc(item.c)}
                disabled={disabled}
                style={{
                  ...styles.viewButton,
                  padding: mobile ? "11px 12px" : "8px 12px",
                  background: active ? "#ffffff" : "#f6f6f3",
                  color: active ? GOLD : "#4b5563",
                  border: active ? `2px solid ${GOLD}` : "1px solid #e5e7eb",
                  fontWeight: active ? 900 : 800,
                  opacity: disabled ? 0.4 : 1,
                  flex: mobile ? 1 : "initial",
                }}
              >
                {item.l}
              </button>
            );
          })}
        </div>
      </section>

      <section
        style={{
          ...styles.tableShell,
          margin: mobile ? "16px 12px 28px" : "24px 28px 34px",
          borderRadius: mobile ? "20px" : "26px",
        }}
      >
        <div
          style={{
            ...styles.tableTop,
            flexDirection: mobile ? "column" : "row",
            alignItems: mobile ? "flex-start" : "center",
            padding: mobile ? "20px 18px" : "24px 26px",
          }}
        >
          <div>
            <div
              style={{
                ...styles.tableTitle,
                fontSize: mobile ? "21px" : "24px",
              }}
            >
              {chartTitle}
            </div>
            <div style={styles.tableSub}>
              {chartLabel} · {platformLabel} · {month}
            </div>
          </div>

          <div style={styles.tableTopActions}>
            <button
              type="button"
              onClick={exportCsv}
              style={styles.exportButton}
              title="Download this chart as a CSV report"
            >
              ↓ Export CSV
            </button>
            <div style={styles.tableRange}>Top {Math.min(vc, data.length)}</div>
          </div>
        </div>

        {!mobile && (
          <div style={styles.tableHeader}>
            <span
              style={{ ...styles.headerCell, cursor: "pointer" }}
              onClick={() => handleSort("rank")}
              title="Sort by position"
            >
              #{sortArrow("rank")}
            </span>
            <span style={styles.headerCell}>Move</span>
            <span style={styles.headerEntryCell}>{isSingles ? "Song" : "Album"}</span>
            <span style={styles.headerCell}>Trend</span>
            <span
              style={{ ...styles.headerCell, cursor: "pointer" }}
              onClick={() => handleSort("lastMonth")}
              title="Sort by last month"
            >
              Last Month{sortArrow("lastMonth")}
            </span>
            <span
              style={{ ...styles.headerCell, cursor: "pointer" }}
              onClick={() => handleSort("peak")}
              title="Sort by peak position"
            >
              Peak{sortArrow("peak")}
            </span>
            <span
              style={{ ...styles.headerCell, cursor: "pointer" }}
              onClick={() => handleSort("months")}
              title="Sort by months on chart"
            >
              Months{sortArrow("months")}
            </span>
            <span
              style={{ ...styles.headerCell, cursor: "pointer" }}
              onClick={() => handleSort("platforms")}
              title="Sort by platform coverage"
            >
              Platforms{sortArrow("platforms")}
            </span>
          </div>
        )}

        <div style={styles.rows}>
          {shown.map((item, index) => {
            const profile = getReleaseProfile(item);
            const move = movement(item);
            const moveStyle = movementStyle(item);
            const medalColor = item.rank <= 3 ? MEDALS[item.rank - 1] : "#050505";
            const artistCountry = getArtistCountry(item);
            const badge = regionBadge(artistCountry.code);

            if (mobile) {
              const rowKey = getMobileRowKey(item, index);
              const expanded = Boolean(expandedMobileRows[rowKey]);

              return (
                <div
                  key={rowKey}
                  style={{
                    ...styles.mobileRow,
                    animationDelay: `${Math.min(index * 20, 400)}ms`,
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.background = "#fff7e6";
                    event.currentTarget.style.boxShadow = "inset 4px 0 0 #c89116";
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.background = "#ffffff";
                    event.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div
                    style={{ ...styles.mobileCompactRow, cursor: "pointer" }}
                    onClick={() => toggleMobileRow(rowKey)}
                    role="button"
                    aria-expanded={expanded}
                  >
                    <div style={{ ...styles.mobileRank, color: medalColor }}>{item.rank}</div>

                    <div style={styles.mobileEntryMain}>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          openRelease(item);
                        }}
                        className="ngoma-title-link"
                        style={styles.titleButton}
                      >
                        {item.title}
                      </button>

                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          openArtist(item.artist);
                        }}
                        className="ngoma-artist-link"
                        style={styles.artistButton}
                      >
                        {item.artist}
                      </button>
                    </div>

                    <div style={styles.mobileMovementWrap}>
                      <div
                        style={{
                          ...styles.moveBadge,
                          color: moveStyle.color,
                          background: moveStyle.background,
                          minWidth: "46px",
                        }}
                      >
                        {move.label || "—"}
                      </div>

                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleMobileRow(rowKey);
                        }}
                        style={styles.mobileDetailsToggle}
                        aria-label={expanded ? "Hide chart details" : "Show chart details"}
                        aria-expanded={expanded}
                      >
                        {expanded ? "▴" : "▾"}
                      </button>
                    </div>
                  </div>

                  {expanded && (
                    <div style={styles.mobileExpandedDetails}>
                      <div style={styles.mobileCountryRow}>
                        <div
                          style={{
                            ...styles.flagBox,
                            width: "38px",
                            height: "38px",
                            borderRadius: "12px",
                            background: `linear-gradient(135deg, ${badge.from} 0%, ${badge.to} 100%)`,
                          }}
                          title={`${artistCountry.country}${
                            artistCountry.code ? ` (${artistCountry.code})` : ""
                          }`}
                        >
                          <span style={{ ...styles.flagText, color: badge.text }}>
                            {artistCountry.code || "—"}
                          </span>
                        </div>

                        <div>
                          <div style={styles.mobileDetailLabel}>Country</div>
                          <div style={styles.mobileDetailValue}>
                            {artistCountry.country || "Country not set"}
                            {artistCountry.code ? ` (${artistCountry.code})` : ""}
                          </div>
                        </div>
                      </div>

                      <div style={styles.mobileTrendRow}>
                        <span style={styles.mobileDetailLabel}>6-Month Trend</span>
                        <Sparkline positions={getTrendPositions(item)} width={84} height={26} />
                      </div>

                      <div style={styles.mobileStatsRow}>
                        <MobileStat label="L.M" value={profile.lastMonth} />
                        <MobileStat label="Peak" value={profile.peak} />
                        <MobileStat label="Mos" value={profile.weeks} />
                        <MobileStat
                          label="Plat."
                          value={plat === "Combined" && item.plat ? item.plat : "—"}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div
                key={`${item.title}-${item.artist}-${item.rank}-${index}`}
                style={{
                  ...styles.row,
                  animationDelay: `${Math.min(index * 20, 400)}ms`,
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.background = "#fff7e6";
                  event.currentTarget.style.boxShadow = "inset 4px 0 0 #c89116";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.background = "#ffffff";
                  event.currentTarget.style.boxShadow = "none";
                }}
              >
                <div
                  style={{
                    ...styles.rank,
                    color: medalColor,
                    justifySelf: "center",
                    textAlign: "center",
                  }}
                >
                  {item.rank}
                </div>

                <div
                  style={{
                    ...styles.moveBadge,
                    color: moveStyle.color,
                    background: moveStyle.background,
                    justifySelf: "center",
                  }}
                >
                  {move.label || "—"}
                </div>

                <div style={styles.entryCell}>
                  <div
                    style={{
                      ...styles.flagBox,
                      background: `linear-gradient(135deg, ${badge.from} 0%, ${badge.to} 100%)`,
                    }}
                    title={`${artistCountry.country}${
                      artistCountry.code ? ` (${artistCountry.code})` : ""
                    }`}
                  >
                    <span style={{ ...styles.flagText, color: badge.text }}>
                      {artistCountry.code || "—"}
                    </span>
                  </div>

                  <div style={styles.entryText}>
                    <button
                      onClick={() => openRelease(item)}
                      className="ngoma-title-link"
                      style={styles.titleButton}
                    >
                      {item.title}
                    </button>

                    <button
                      onClick={() => openArtist(item.artist)}
                      className="ngoma-artist-link"
                      style={styles.artistButton}
                    >
                      {item.artist}
                    </button>
                  </div>
                </div>

                <div style={styles.trendCell}>
                  <Sparkline positions={getTrendPositions(item)} />
                </div>

                <div style={styles.metaNumber}>{profile.lastMonth}</div>
                <div style={styles.metaNumber}>{profile.peak}</div>
                <div style={styles.metaNumber}>{profile.weeks}</div>

                <div style={styles.platformCell}>
                  {plat === "Combined" && item.plat ? item.plat : "—"}
                </div>
              </div>
            );
          })}
        </div>

        <div style={styles.tableFooter}>
          Showing {shown.length} of {data.length} · {month} · {platformLabel}
        </div>
      </section>
    </div>
  );
}

function MiniBars({ GOLD }) {
  return (
    <svg width="38" height="42" viewBox="0 0 22 24" style={{ flexShrink: 0 }}>
      <rect x="0" y="15" width="3.5" height="9" fill="#050505" rx="0.5" />
      <rect x="5.5" y="10" width="3.5" height="14" fill="#050505" rx="0.5" />
      <rect x="11" y="5" width="3.5" height="19" fill={GOLD} rx="0.5" />
      <rect x="16.5" y="0" width="3.5" height="24" fill="#050505" rx="0.5" />
    </svg>
  );
}

// Inline mini-chart of a release's last few months of chart positions.
// Lower rank = better, so the line is inverted (a climb means the rank number
// fell). Colour reflects the net trajectory across the window.
function Sparkline({ positions, width = 62, height = 22 }) {
  const present = positions.map((r, i) => ({ i, r })).filter((p) => p.r != null);

  if (present.length < 2) {
    return (
      <svg width={width} height={height} aria-hidden="true">
        <line
          x1="3"
          y1={height / 2}
          x2={width - 3}
          y2={height / 2}
          stroke="#d8d8d2"
          strokeWidth="1.5"
          strokeDasharray="2 3"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  const pad = 3;
  const ranks = present.map((p) => p.r);
  const minR = Math.min(...ranks);
  const maxR = Math.max(...ranks);
  const span = Math.max(1, maxR - minR);
  const n = positions.length;
  const xAt = (i) => pad + (i / (n - 1)) * (width - 2 * pad);
  // best rank (minR) -> top of the box; worst rank (maxR) -> bottom
  const yAt = (r) => pad + ((r - minR) / span) * (height - 2 * pad);

  const first = present[0].r;
  const last = present[present.length - 1].r;
  const color = last < first ? "#2DB04A" : last > first ? "#E53935" : "#9aa0a6";

  const line = present.map((p) => `${xAt(p.i)},${yAt(p.r)}`).join(" ");
  const end = present[present.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={xAt(end.i)} cy={yAt(end.r)} r="2.4" fill={color} />
    </svg>
  );
}

const styles = {
  page: {
    background: "#f7f5ef",
    color: "#050505",
    minHeight: "60vh",
    width: "100%",
    maxWidth: "100%",
    overflowX: "hidden",
  },

  hero: {
    position: "relative",
    overflow: "hidden",
    background: "#f7f5ef",
    borderBottom: "1px solid rgba(0,0,0,0.08)",
    transition: "all 0.5s ease-out",
    width: "100%",
    maxWidth: "100%",
  },

  heroGlow: {
    position: "absolute",
    inset: 0,
    background: "transparent",
    pointerEvents: "none",
  },

  eyebrowRow: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
    fontWeight: 800,
    letterSpacing: "2.6px",
    textTransform: "uppercase",
    color: "#555555",
  },

  eyebrowDivider: {
    color: "#c89116",
  },

  heroMain: {
    position: "relative",
    display: "grid",
    alignItems: "end",
    width: "100%",
    maxWidth: "100%",
  },

  heroLeft: {
    minWidth: 0,
    maxWidth: "100%",
  },

  logoRow: {
    display: "flex",
    gap: "16px",
    alignItems: "center",
  },

  logoText: {
    fontWeight: 900,
    color: "#050505",
  },

  logoSub: {
    marginTop: "4px",
    fontSize: "11px",
    letterSpacing: "2px",
    textTransform: "uppercase",
    color: "#777777",
  },

  heroTitle: {
    margin: 0,
    lineHeight: 0.92,
    fontWeight: 950,
    textTransform: "uppercase",
    color: "#050505",
    maxWidth: "100%",
    overflowWrap: "break-word",
  },

  heroMeta: {
    display: "flex",
    flexWrap: "wrap",
    color: "#777777",
  },

  heroMetaSmall: {
    fontSize: "12px",
    color: "#777777",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
  },

  numberOneCard: {
    background: "#ffffff",
    border: "1px solid rgba(0,0,0,0.08)",
    boxShadow: "0 14px 40px rgba(0,0,0,0.08)",
    maxWidth: "100%",
  },

  numberOneLabel: {
    fontSize: "11px",
    fontWeight: 900,
    letterSpacing: "2.5px",
    textTransform: "uppercase",
    color: "#777777",
  },

  numberOneRank: {
    marginTop: "12px",
    lineHeight: 0.85,
    fontWeight: 950,
    color: "#c89116",
  },

  numberOneTitle: {
    display: "block",
    border: "none",
    background: "transparent",
    padding: 0,
    marginTop: "18px",
    textAlign: "left",
    color: "#050505",
    fontWeight: 900,
    lineHeight: 1.05,
    cursor: "pointer",
    maxWidth: "100%",
    overflowWrap: "break-word",
  },

  numberOneArtist: {
    border: "none",
    background: "transparent",
    padding: 0,
    marginTop: "8px",
    color: "#777777",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
  },

  coveragePill: {
    display: "inline-flex",
    marginTop: "18px",
    padding: "8px 13px",
    borderRadius: "999px",
    background: "rgba(200,145,22,0.14)",
    color: "#c89116",
    fontSize: "12px",
    fontWeight: 900,
  },

  statsBand: {
    display: "grid",
    background: "#ffffff",
    borderTop: "1px solid rgba(0,0,0,0.08)",
    borderBottom: "1px solid rgba(0,0,0,0.08)",
    width: "100%",
    maxWidth: "100%",
  },

  statItem: {
    borderRight: "1px solid rgba(0,0,0,0.08)",
    minWidth: 0,
  },

  statLabel: {
    fontSize: "10.5px",
    letterSpacing: "1.6px",
    textTransform: "uppercase",
    color: "#555555",
    fontWeight: 900,
  },

  statValue: {
    marginTop: "8px",
    fontWeight: 950,
    lineHeight: 1,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    color: "#050505",
  },

  statSub: {
    marginTop: "6px",
    fontSize: "12px",
    color: "#777777",
  },

  controls: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    background: "#ffffff",
    color: "#111111",
    borderBottom: "1px solid #EAEAE6",
    width: "100%",
    maxWidth: "100%",
  },

  toggleWrap: {
    display: "flex",
    gap: "6px",
    padding: "4px",
    borderRadius: "999px",
    background: "#f2f2f2",
    border: "1px solid rgba(0,0,0,0.08)",
    width: "100%",
    maxWidth: "100%",
  },

  toggleButton: {
    border: "1px solid",
    borderRadius: "999px",
    padding: "8px 14px",
    fontSize: "11px",
    fontWeight: 900,
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    cursor: "pointer",
  },

  select: {
    padding: "9px 12px",
    borderRadius: "12px",
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#050505",
    fontSize: "13px",
    fontWeight: 700,
    outline: "none",
  },

  platforms: {
    display: "flex",
    gap: "6px",
    scrollbarWidth: "thin",
    maxWidth: "100%",
  },

  platformButton: {
    border: "1.5px solid",
    borderRadius: "999px",
    background: "#ffffff",
    padding: "8px 12px",
    fontSize: "12px",
    fontWeight: 800,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  viewOptions: {
    display: "flex",
    gap: "6px",
  },

  viewButton: {
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    padding: "8px 12px",
    fontSize: "12px",
    fontWeight: 800,
    cursor: "pointer",
  },

  tableShell: {
    background: "#ffffff",
    color: "#050505",
    border: "1px solid rgba(0,0,0,0.08)",
    overflow: "hidden",
    boxShadow: "0 14px 40px rgba(0,0,0,0.08)",
    maxWidth: "100%",
  },

  tableTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "20px",
    borderBottom: "1px solid rgba(0,0,0,0.08)",
    background: "#ffffff",
    color: "#050505",
  },

  tableTitle: {
    fontWeight: 950,
    letterSpacing: "-0.5px",
    color: "#050505",
  },

  tableSub: {
    marginTop: "6px",
    fontSize: "12px",
    color: "#555555",
    fontWeight: 800,
    letterSpacing: "1.2px",
    textTransform: "uppercase",
  },

  tableRange: {
    padding: "10px 14px",
    borderRadius: "999px",
    background: "rgba(200,145,22,0.14)",
    color: "#c89116",
    fontSize: "13px",
    fontWeight: 900,
    letterSpacing: "1px",
    textTransform: "uppercase",
  },

  tableHeader: {
    display: "grid",
    gridTemplateColumns: "54px 84px minmax(0, 1fr) 92px 84px 60px 70px 86px",
    gap: "14px",
    alignItems: "center",
    justifyItems: "center",
    padding: "14px 24px",
    background: "#f4f3ef",
    color: "#555555",
    fontSize: "10.5px",
    fontWeight: 900,
    letterSpacing: "1.6px",
    textTransform: "uppercase",
    borderBottom: "1px solid rgba(0,0,0,0.08)",
  },

  headerCell: {
    width: "100%",
    textAlign: "center",
    justifySelf: "center",
  },

  headerEntryCell: {
    width: "100%",
    textAlign: "left",
    justifySelf: "start",
    paddingLeft: "62px",
  },

  rows: {
    display: "flex",
    flexDirection: "column",
    background: "#ffffff",
  },

  row: {
    display: "grid",
    gridTemplateColumns: "54px 84px minmax(0, 1fr) 92px 84px 60px 70px 86px",
    gap: "14px",
    alignItems: "center",
    padding: "16px 24px",
    borderBottom: "1px solid rgba(0,0,0,0.08)",
    background: "#ffffff",
    color: "#050505",
    animation: "fadeUp 0.35s ease both",
    transition: "background 180ms ease, box-shadow 180ms ease",
  },

  mobileRow: {
    padding: "15px 14px",
    borderBottom: "1px solid rgba(0,0,0,0.08)",
    background: "#ffffff",
    color: "#050505",
    animation: "fadeUp 0.35s ease both",
    transition: "background 180ms ease, box-shadow 180ms ease",
  },

  mobileRowTop: {
    display: "grid",
    gridTemplateColumns: "42px minmax(0, 1fr) 54px",
    gap: "10px",
    alignItems: "center",
  },

  mobileCompactRow: {
    display: "grid",
    gridTemplateColumns: "42px minmax(0, 1fr) auto",
    gap: "10px",
    alignItems: "center",
  },

  mobileMovementWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "6px",
  },

  mobileDetailsToggle: {
    width: "38px",
    height: "34px",
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: "14px",
    background: "#fbfaf7",
    color: "#555555",
    fontSize: "18px",
    fontWeight: 900,
    lineHeight: 1,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 0 2px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    transition: "background 160ms ease, transform 160ms ease, box-shadow 160ms ease",
  },

  mobileExpandedDetails: {
    marginTop: "14px",
    padding: "14px 12px 12px",
    border: "1px solid rgba(0,0,0,0.06)",
    borderRadius: "16px",
    background: "#fbfaf7",
  },

  mobileCountryRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "11px",
  },

  mobileDetailLabel: {
    fontSize: "9px",
    color: "#777777",
    fontWeight: 900,
    letterSpacing: "1px",
    textTransform: "uppercase",
  },

  mobileDetailValue: {
    marginTop: "3px",
    fontSize: "12px",
    color: "#050505",
    fontWeight: 900,
  },

  mobileRank: {
    fontSize: "28px",
    fontWeight: 950,
    lineHeight: 1,
  },

  mobileEntryMain: {
    minWidth: 0,
  },

  mobileStatsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "7px",
    marginTop: "12px",
  },

  mobileMiniStat: {
    background: "#f7f7f7",
    border: "1px solid rgba(0,0,0,0.06)",
    borderRadius: "12px",
    padding: "8px 6px",
    minWidth: 0,
  },

  mobileMiniStatLabel: {
    display: "block",
    fontSize: "9px",
    color: "#777777",
    fontWeight: 900,
    letterSpacing: "1px",
    textTransform: "uppercase",
    textAlign: "center",
  },

  mobileMiniStatValue: {
    display: "block",
    marginTop: "4px",
    color: "#050505",
    fontSize: "12px",
    fontWeight: 900,
    textAlign: "center",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  rank: {
    fontSize: "34px",
    fontWeight: 950,
    lineHeight: 1,
    color: "#050505",
  },

  moveBadge: {
    justifySelf: "start",
    minWidth: "52px",
    textAlign: "center",
    borderRadius: "999px",
    padding: "6px 9px",
    fontSize: "12px",
    fontWeight: 950,
  },

  entryCell: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    minWidth: 0,
  },

  flagBox: {
    width: "50px",
    height: "50px",
    borderRadius: "14px",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #d4af37 0%, #b88914 100%)",
    border: "1px solid rgba(0,0,0,0.08)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), 0 6px 18px rgba(0,0,0,0.12)",
  },

  flagText: {
    color: "#111111",
    fontSize: "13px",
    fontWeight: 900,
    letterSpacing: "1.2px",
    textTransform: "uppercase",
    lineHeight: 1,
  },

  entryText: {
    minWidth: 0,
  },

  titleButton: {
    display: "block",
    maxWidth: "100%",
    border: "none",
    background: "transparent",
    color: "#050505",
    padding: 0,
    textAlign: "left",
    fontSize: "16px",
    fontWeight: 950,
    lineHeight: 1.15,
    cursor: "pointer",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  artistButton: {
    display: "block",
    maxWidth: "100%",
    border: "none",
    background: "transparent",
    color: "#777777",
    padding: 0,
    marginTop: "5px",
    textAlign: "left",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  metaNumber: {
    color: "#050505",
    fontSize: "15px",
    fontWeight: 900,
    textAlign: "center",
  },

  platformCell: {
    justifySelf: "center",
    padding: "6px 9px",
    borderRadius: "999px",
    background: "#f2f2f2",
    color: "#050505",
    fontSize: "12px",
    fontWeight: 900,
  },

  tableFooter: {
    padding: "16px 22px",
    textAlign: "center",
    color: "#777777",
    fontSize: "12px",
    fontWeight: 700,
    background: "#ffffff",
  },

  trendCell: {
    justifySelf: "center",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },

  tableTopActions: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexShrink: 0,
  },

  exportButton: {
    border: "1px solid rgba(0,0,0,0.16)",
    borderRadius: "999px",
    background: "#ffffff",
    color: "#3a3a3a",
    padding: "9px 16px",
    fontSize: "12px",
    fontWeight: 900,
    letterSpacing: "0.6px",
    textTransform: "uppercase",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  pillFade: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: "6px",
    width: "30px",
    pointerEvents: "none",
    background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, #ffffff 80%)",
  },

  mobileTrendRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    marginBottom: "12px",
    padding: "8px 10px",
    borderRadius: "12px",
    background: "#ffffff",
    border: "1px solid rgba(0,0,0,0.06)",
  },
};
