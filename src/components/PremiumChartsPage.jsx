import { useEffect, useMemo, useRef, useState } from "react";
import { getArtistImageUrl } from "../utils/artistImages.js";
import { API_BASE, resolveMediaUrl } from "../api/config.js";
import {
  COUNTRY_ACCENTS,
  KENYA_COUNTRY_CODE,
  africaChartLabel,
  countryCodeFromAfricaChart,
  isAfricaChart,
  isAfricaCountryChart,
} from "../utils/africaRegions.js";

// Module-level cache: artist name (lowercase) → resolved image URL (or "" if none found).
// Persists across re-renders and chart switches so each artist is only fetched once.
const _artistImgCache = new Map();

function regionBadge(code) {
  const key = String(code || "").trim().toUpperCase();
  return { accent: COUNTRY_ACCENTS[key] || "#69716B" };
}

function readableInk(color) {
  const raw = String(color || "").trim();
  const hex = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!hex) return "#050505";
  let value = hex[1];
  if (value.length === 3) {
    value = value.split("").map((char) => char + char).join("");
  }
  const int = Number.parseInt(value, 16);
  const srgb = [(int >> 16) & 255, (int >> 8) & 255, int & 255].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });
  const luminance = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  return luminance > 0.35 ? "#050505" : "#ffffff";
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

export function countryCodeToFlag(countryCode) {
  const code = String(countryCode || "").trim().toUpperCase();

  if (code.length !== 2 || !/^[A-Z]{2}$/.test(code)) {
    return String.fromCodePoint(0x1f30d);
  }

  return code
    .split("")
    .map((letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)))
    .join("");
}

// Lazily builds a name→artist Map from PUBLIC_DATA.artists so lookups are O(1).
// Rebuilt automatically when the revision changes (i.e. after a CMS-triggered page reload).
let _cmsArtistMapRevision = null;
let _cmsArtistMap = null;

function normArtistKeyLocal(str) {
  return String(str || "").trim().toLowerCase()
    .replace(/\s*\|\s*.+$/, "")
    .replace(/,\s+.+$/, "")
    .replace(/\s+(?:ft\.?|feat\.?|featuring|w\/)\s+.+$/i, "")
    .replace(/\s+x\s+.+$/i, "")
    .replace(/\s+&\s+.+$/i, "")
    .trim();
}

function findCmsArtist(artistName) {
  const publicData = typeof window !== "undefined" ? (window.__NGOMA_PUBLIC_DATA__ || {}) : {};
  const revision = publicData.revision || "";
  if (_cmsArtistMap === null || _cmsArtistMapRevision !== revision) {
    _cmsArtistMap = new Map();
    _cmsArtistMapRevision = revision;
    (publicData.artists || []).forEach((a) => {
      [a.name, a.display_name, a.public_name, ...(a.aliases || [])].forEach((n) => {
        const key = String(n || "").trim().toLowerCase();
        if (key) _cmsArtistMap.set(key, a);
      });
    });
  }
  const key = String(artistName || "").trim().toLowerCase();
  if (!key) return null;
  return _cmsArtistMap.get(key) || _cmsArtistMap.get(normArtistKeyLocal(key)) || null;
}

export function getArtistCountry(item) {
  const publicData = typeof window !== "undefined" ? (window.__NGOMA_PUBLIC_DATA__ || {}) : {};
  const publicCountry = (code) => (publicData.countries || []).find(
    (country) => String(country.code || "").trim().toUpperCase() === String(code || "").trim().toUpperCase()
  );

  // CMS artist record is the authoritative source — reflects live admin edits after page reload.
  const requestedArtist = String(item.primary_artist || item.artist || item.artist_name || "").trim();
  const managedArtist = requestedArtist ? findCmsArtist(requestedArtist) : null;
  if (managedArtist) {
    const managedCode = String(managedArtist.country_code || "").trim().toUpperCase();
    const managedCountry = publicCountry(managedCode);
    return {
      flag: managedCountry?.flag || countryCodeToFlag(managedCode),
      country: managedCountry?.name || managedArtist.country || "",
      code: managedCode,
      listedCountry: String(managedArtist.country || "").trim(),
      listedCode: managedCode,
    };
  }

  // Fall back to the country code embedded in the chart entry (from artist model at export time).
  const directCode = String(item.artist_country_code || item.country_code || "").trim().toUpperCase();
  if (directCode) {
    const managedCountry = publicCountry(directCode);
    return {
      flag: managedCountry?.flag || countryCodeToFlag(directCode),
      country: managedCountry?.name || item.artist_country || item.country || "",
      code: directCode,
      listedCountry: String(item.artist_country || item.country || "").trim(),
      listedCode: directCode,
    };
  }

  return {
    flag: "",
    country: "",
    code: "",
    listedCountry: "",
    listedCode: "",
  };
}

export default function PremiumChartsPage({
  isMobile,
  loaded,
  F,
  SF,
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
  selectedCountryScope,
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
  onOpenArtist,
  onOpenRelease,
  getCombined,
  liveChartLoading,
  liveChartMeta,
  liveStatus,
  pageMax = "1240px",
  certificationForEntry = () => null,
  CertificationTag = () => null,
  isTablet = false,
  isDark = false,
}) {
  const mobile = useRealMobile(isMobile);
  const tablet = !mobile && isTablet;
  const safeGutter = mobile ? "clamp(18px, 4.8vw, 26px)" : (tablet ? "clamp(22px, 3vw, 30px)" : "28px");
  const heroSidePadding = mobile
    ? safeGutter
    : `max(${tablet ? "22px" : "28px"}, calc((100vw - ${pageMax}) / 2 + ${tablet ? "22px" : "28px"}))`;
  const activePlatformPillRef = useRef(null);
  const [expandedRowKey, setExpandedRowKey] = useState(null);
  const [artistImageOverrides, setArtistImageOverrides] = useState({});
  const [publicDataRefreshKey, setPublicDataRefreshKey] = useState(() => {
    if (typeof window === "undefined") return 0;
    return String(window.__NGOMA_PUBLIC_REVISION__ || window.__NGOMA_PUBLIC_DATA__?.revision || "");
  });
  const [detectedDarkMode, setDetectedDarkMode] = useState(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return false;
    return (
      document.documentElement?.dataset?.ngomaTheme === "dark" ||
      document.body?.dataset?.ngomaTheme === "dark" ||
      window.localStorage?.getItem("ngoma-theme") === "dark"
    );
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return undefined;

    const syncDarkMode = () => {
      setDetectedDarkMode(
        document.documentElement?.dataset?.ngomaTheme === "dark" ||
          document.body?.dataset?.ngomaTheme === "dark" ||
          window.localStorage?.getItem("ngoma-theme") === "dark"
      );
    };

    syncDarkMode();

    const observer = new MutationObserver(syncDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-ngoma-theme"] });
    if (document.body) {
      observer.observe(document.body, { attributes: true, attributeFilter: ["data-ngoma-theme"] });
    }
    window.addEventListener("storage", syncDarkMode);

    return () => {
      observer.disconnect();
      window.removeEventListener("storage", syncDarkMode);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handlePublicDataReady = () => {
      _artistImgCache.clear();
      setArtistImageOverrides({});
      const revision = window.__NGOMA_PUBLIC_DATA__?.revision || window.__NGOMA_PUBLIC_REVISION__ || "refresh";
      // The backend revision can remain unchanged for a short period after an
      // image save. Include a local nonce so React always rebuilds the artist
      // lookup and image URLs when fresh public data arrives.
      setPublicDataRefreshKey(`${revision}|${Date.now()}`);
    };

    window.addEventListener("ngoma-public-data-ready", handlePublicDataReady);
    return () => window.removeEventListener("ngoma-public-data-ready", handlePublicDataReady);
  }, []);

  const darkMode = Boolean(isDark || detectedDarkMode);
  const isArtistsChart = ct === "artists";
  const publicArtists = useMemo(() => {
    const publicData = typeof window !== "undefined" ? (window.__NGOMA_PUBLIC_DATA__ || {}) : {};
    return Array.isArray(publicData.artists) ? publicData.artists : [];
  }, [publicDataRefreshKey]);

  // Prefer the newest CMS artist list for every chart row. Only genuinely
  // missing images fall back to the per-artist endpoint.
  useEffect(() => {
    if (!isArtistsChart || !data.length) return;
    let cancelled = false;
    const revision = String(publicDataRefreshKey || "snapshot");
    const seeded = {};
    const missing = [];

    data.forEach((item) => {
      const name = String(item.title || item.n || "").trim();
      const key = name.toLowerCase();
      if (!key) return;
      const profile = publicArtists.find((artist) =>
        [artist.name, artist.display_name, artist.public_name, ...(artist.aliases || [])]
          .some((value) => String(value || "").trim().toLowerCase() === key)
      );
      const currentUrl = profile ? getArtistImageUrl(profile, { name, artists: [profile] }) : "";
      if (currentUrl) seeded[key] = currentUrl;
      else if (!_artistImgCache.has(`${revision}|${key}`)) missing.push(item);
    });
    setArtistImageOverrides(seeded);
    if (!missing.length) return undefined;

    // Mark all as in-flight before any async work to prevent duplicate fetches.
    missing.forEach((item) => {
      const key = String(item.title || item.n || "").trim().toLowerCase();
      _artistImgCache.set(`${revision}|${key}`, "");
    });

    Promise.all(missing.map(async (item) => {
      const name = String(item.title || item.n || "").trim();
      const key = name.toLowerCase();
      const managedProfile = publicArtists.find((artist) =>
        [artist.name, artist.display_name, artist.public_name, ...(artist.aliases || [])]
          .some((value) => String(value || "").trim().toLowerCase() === key)
      );
      const slug = managedProfile?.slug || item.artist_profile?.slug ||
        name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      try {
        const res = await fetch(`${API_BASE}/app-data/artist/${slug}/`, { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        const artist = json?.artist || {};
        const url = getArtistImageUrl(artist, { name, artists: [artist] }) ||
          resolveMediaUrl(artist.image || artist.image_url || "");
        _artistImgCache.set(`${revision}|${key}`, url);
        return url ? [key, url] : null;
      } catch { return null; }
    })).then((results) => {
      if (cancelled) return;
      const found = Object.fromEntries((results || []).filter(Boolean));
      if (Object.keys(found).length) setArtistImageOverrides((prev) => ({ ...prev, ...found }));
    });

    return () => { cancelled = true; };
  }, [isArtistsChart, data, publicArtists, publicDataRefreshKey]);
  const selectedAfricaCountryCode = countryCodeFromAfricaChart(plat);
  const isAfricaScope = isAfricaChart(plat);
  const isKenyanChart = plat === "Kenyan" || selectedAfricaCountryCode === KENYA_COUNTRY_CODE;

  // `plat` only carries the country identity while the country's own pill is active — on
  // the "Combined" pill (the post-switch default) or a platform pill with no data for that
  // country yet, `plat` says nothing about which country is selected. The persistent
  // `selectedCountryScope` is what should name the header in those cases.
  const selectedScopeCountryCode = countryCodeFromAfricaChart(selectedCountryScope);
  const isViewingNonKenyaCountry = isAfricaChart(selectedCountryScope) && selectedScopeCountryCode !== KENYA_COUNTRY_CODE;
  const headerIsAfricaScope = isAfricaScope || isViewingNonKenyaCountry;
  const headerScopeSource = isAfricaScope ? plat : selectedCountryScope;
  const headerCountryCode = isAfricaScope ? selectedAfricaCountryCode : selectedScopeCountryCode;
  const africaScopeLabel = headerIsAfricaScope ? africaChartLabel(headerScopeSource).replace(/\s+Top 50$/i, "") : "";

  const chartLabel = isArtistsChart ? "Artists" : (isSingles ? "Singles" : "Albums");
  const mastheadSubject = isArtistsChart ? "Artists" : (isSingles ? "Songs" : "Albums");
  const mastheadSubjectLower = mastheadSubject.toLowerCase();
  const regionalScopeLabel = headerIsAfricaScope
    ? (headerCountryCode === KENYA_COUNTRY_CODE ? "Kenyan" : africaScopeLabel)
    : "Kenyan";
  const regionalChartLabel = `${regionalScopeLabel} ${chartLabel}`;
  const regionalScopeShortLabel = isAfricaChart(selectedCountryScope)
    ? africaChartLabel(selectedCountryScope).replace(/\s+Top 50$/i, "")
    : "Kenyan";
  const regionalTop50Label = `${regionalScopeShortLabel} Top 50`;
  // The hero subtitle is always just the country name — "(KENYA)", "(COMOROS)" — never
  // suffixed with the chart type (Singles/Albums/Artists).
  const countryDisplayName = headerIsAfricaScope
    ? (headerCountryCode === KENYA_COUNTRY_CODE ? "Kenya" : africaScopeLabel)
    : "Kenya";
  const countryAccent = COUNTRY_ACCENTS[headerCountryCode || selectedScopeCountryCode || KENYA_COUNTRY_CODE] || "#1A8A5A";
  const isExplicitPlatformChart = Boolean(PC[plat]) && plat !== "Combined" && plat !== "Kenyan" && !isAfricaChart(plat);
  const platformLabel = liveChartMeta?.platform || (
    isExplicitPlatformChart ? (PLAT_LABEL[plat] || plat) :
    (isKenyanChart || headerIsAfricaScope) ? regionalChartLabel :
    (plat === "Combined" ? "Combined" : PLAT_LABEL[plat] || plat)
  );
  const chartAccent = isExplicitPlatformChart
    ? (PC[plat] || GOLD)
    : (plat === "Combined" || isKenyanChart || headerIsAfricaScope || isAfricaCountryChart(headerScopeSource))
      ? countryAccent
      : (PC[plat] || GOLD);
  const chartAccentSoft = `${chartAccent}18`;
  const chartAccentBorder = `${chartAccent}33`;
  const chartAccentShadow = `${chartAccent}33`;
  const chartAccentInk = readableInk(chartAccent);
  function formatChartDate(value) {
    if (!value) return "";
    const raw = String(value);
    const date = value instanceof Date ? value : new Date(raw.includes("T") ? raw : `${raw}T00:00:00`);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }

  function formatChartPeriod(meta = {}) {
    const direct = meta.week_label || meta.period_label || meta.date_range || meta.range_label || meta.range;
    if (direct) return String(direct);
    const start = meta.week_start || meta.start_date || meta.period_start;
    const end = meta.week_end || meta.end_date || meta.period_end;
    if (start && end) return `${formatChartDate(start)} - ${formatChartDate(end)}`;
    return month;
  }

  const mastheadMeta = liveChartMeta || {};
  const mastheadPeriodLabel = formatChartPeriod(mastheadMeta);
  const mastheadTitle = "NGOMA TOP 50";
  const mastheadSubtitle = `${countryDisplayName}'s most popular ${mastheadSubjectLower} across Ngoma Charts.`;
  const mastheadSurface = darkMode ? "#0b0e0b" : "#ffffff";
  const mastheadText = darkMode ? "#f6f3ea" : "#050505";
  const mastheadMuted = darkMode ? "rgba(246,243,234,0.64)" : "#59645d";
  const mastheadBorder = darkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)";
  const mastheadAccentBorder = chartAccent;

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

    if (diff > 0) return { type: "up", label: `▲${diff}` };
    if (diff < 0) return { type: "down", label: `▼${Math.abs(diff)}` };

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
        color: chartAccent,
        background: chartAccentSoft,
      };
    }

    if (m.type === "reentry") {
      return {
        color: chartAccent,
        background: chartAccentSoft,
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

    return {
      lastMonth,
      peak,
    };
  }

  function getMonthsOnChart(item) {
    const candidates = [
      item.times_on_chart,
      item.months_on_chart,
      item.chart_appearances,
      item.appearances_on_chart,
    ];

    for (const value of candidates) {
      if (value === undefined || value === null || value === "") continue;
      const numeric = Number(value);
      if (Number.isFinite(numeric) && numeric > 0) return numeric;
      const text = String(value).trim();
      if (text && text !== "—") return text;
    }

    return "—";
  }

  function calculateStaticPeak(item) {
    if (isArtistsChart || item?.is_artist_entry) return item.peak_rank || item.rank || "—";
    let peak = item.rank || "—";

    MONTHS.forEach((m) => {
      const found = getCombined(ct, m).find(
        (entry) => entry.title === item.title &&
          (entry.primary_artist || entry.artist) === (item.primary_artist || item.artist)
      );

      if (found && typeof found.rank === "number" && found.rank < peak) {
        peak = found.rank;
      }
    });

    return peak;
  }

  function openArtist(name) {
    if (onOpenArtist) {
      onOpenArtist(name);
      return;
    }
    const artist = artists.find((item) => item.n === name);
    if (artist) setSelA(artist);
  }

  function openRelease(item) {
    if (isArtistsChart || item?.is_artist_entry) {
      openArtist(item?.title || item?.primary_artist || item?.artist);
      return;
    }
    if (onOpenRelease) {
      onOpenRelease(item, isSingles ? "single" : "album");
      return;
    }
    setSelR({
      ...item,
      type: isSingles ? "single" : "album",
    });
  }

  function splitArtistTokens(artistText) {
    const source = normalizeDetailValue(artistText, "");
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

  function ArtistLinks({ item }) {
    const tokens = splitArtistTokens(item?.artist_credit || item?.artist || item?.primary_artist || item?.artist_name);
    if (!tokens.length) return null;

    return (
      <span style={{ ...styles.artistLinksWrap, marginTop: mobile ? "4px" : "2px" }}>
        {tokens.map((token, tokenIndex) => {
          if (token.type === "separator") {
            return (
              <span
                key={`${token.value}-${tokenIndex}`}
                style={{
                  ...styles.artistSeparator,
                  ...(mobile ? { fontSize: "12px", fontWeight: 700 } : null),
                  ...(darkMode ? styles.artistSeparatorDark : null),
                }}
              >
                {token.value}
              </span>
            );
          }

          return (
            <button
              key={`${token.value}-${tokenIndex}`}
              onClick={(event) => {
                event.stopPropagation();
                openArtist(token.value);
              }}
              className="ngoma-artist-link"
              style={{
                ...styles.artistButton,
                fontFamily: F,
                ...(mobile ? { fontSize: "12px", fontWeight: 700 } : null),
                ...(darkMode ? styles.artistButtonDark : null),
              }}
              title={`Open ${token.value}`}
            >
              {token.value}
            </button>
          );
        })}
      </span>
    );
  }

  function normalizeDetailValue(value, fallback = "—") {
    if (value === null || value === undefined || value === "") return fallback;
    if (Array.isArray(value)) {
      const joined = value
        .map((entry) => normalizeDetailValue(entry, ""))
        .filter(Boolean)
        .join(", ");
      return joined || fallback;
    }
    if (typeof value === "object") {
      return value.name || value.title || value.label || fallback;
    }
    return String(value).trim() || fallback;
  }

  function firstDetailValue(item, keys, fallback = "—") {
    for (const key of keys) {
      const value = item?.[key];
      const normalized = normalizeDetailValue(value, "");
      if (normalized) return normalized;
    }
    return fallback;
  }

  function getArtworkUrl(item) {
    if (isArtistsChart || item?.is_artist_entry || item?.type === "artist") {
      return getArtistImageUrl(item, {
        name: item?.title || item?.n || item?.primary_artist || item?.artist,
        artists: publicArtists,
        isArtist: true,
      });
    }

    const value = firstDetailValue(
      item,
      [
        "cover_image",
        "cover_image_url",
        "cover_image_file",
        "cover_image_file_url",
        "image",
        "image_url",
        "image_file",
        "image_file_url",
        "img",
        "img_url",
        "artwork",
        "artwork_url",
        "artworkUrl",
        "cover",
        "cover_url",
        "cover_file",
        "cover_file_url",
        "coverUrl",
        "cover_art",
        "album_art",
        "thumbnail",
        "thumbnail_url",
        "file",
        "file_url",
      ],
      ""
    );
    return value && value !== "—" ? resolveMediaUrl(value) : "";
  }

  function getArtworkLabel(item) {
    const source = normalizeDetailValue(item?.title || item?.artist, "NG");
    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "NG";
  }

  function getReleaseYear(item) {
    const direct = firstDetailValue(
      item,
      ["year_of_release", "release_year", "year", "released", "releaseDate", "release_date", "date"],
      ""
    );
    const match = String(direct || "").match(/(?:19|20)\d{2}/);
    return match ? match[0] : "—";
  }

  function getPlatformDetails(item) {
    if (!isCombinedChart) return platformLabel || "—";
    return firstDetailValue(
      item,
      ["platforms", "platform_names", "platform_list", "plat", "platform_count"],
      item?.plat || "—"
    );
  }

  function getProducerDetails(item) {
    return firstDetailValue(
      item,
      ["producers", "producer", "produced_by", "production", "producer_names"],
      "—"
    );
  }

  function getSongwriterDetails(item) {
    return firstDetailValue(
      item,
      ["songwriters", "songwriter", "writers", "writer", "written_by", "composers", "composer"],
      "—"
    );
  }

  function getReleaseDate(item) {
    const value = firstDetailValue(
      item,
      ["release_date", "releaseDate", "date_released"],
      ""
    );
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return value;
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${value}T00:00:00Z`));
  }

  function hasReleaseLinks(item) {
    return [
      "spotify_url",
      "apple_music_url",
      "youtube_url",
      "boomplay_url",
      "audiomack_url",
      "tiktok_url",
      "shazam_url",
    ].some((key) => Boolean(item?.[key]));
  }

  function ReleaseArtwork({ item, size = 50 }) {
    const nameKey = String(item?.title || "").trim().toLowerCase();
    const artworkUrl = (isArtistsChart ? artistImageOverrides[nameKey] : "") || getArtworkUrl(item) || "";
    const label = getArtworkLabel(item);

    return (
      <div
        style={{
          ...styles.releaseArtwork,
          width: size,
          height: size,
          minWidth: size,
          borderRadius: "10px",
          background: `linear-gradient(135deg, ${chartAccent} 0%, #111111 100%)`,
        }}
        title={`${item.title || "Release"} artwork`}
      >
        {artworkUrl ? (
          <img
            src={artworkUrl}
            alt=""
            style={styles.releaseArtworkImage}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span style={styles.releaseArtworkFallback}>{label}</span>
        )}
      </div>
    );
  }

  function DetailCard({ label, value, wide = false, accent }) {
    return (
      <div
        style={{
          ...styles.detailCard,
          ...(darkMode ? styles.detailCardDark : null),
          ...(darkMode && label === "Platforms" ? styles.platformDetailCardDark : null),
          ...(wide ? styles.detailCardWide : null),
        }}
      >
        <span
          style={{
            ...styles.detailCardLabel,
            ...(mobile ? { fontSize: "11px" } : null),
            ...(darkMode ? styles.detailCardLabelDark : null),
          }}
        >
          {label}
        </span>
        <span
          style={{
            ...styles.detailCardValue,
            ...(mobile ? { fontSize: "15px" } : null),
            ...(darkMode ? styles.detailCardValueDark : null),
            ...(accent && !darkMode ? { color: accent } : null),
          }}
        >
          {value || "—"}
        </span>
      </div>
    );
  }

  function managedArtistForItem(item) {
    const publicData = typeof window !== "undefined" ? (window.__NGOMA_PUBLIC_DATA__ || {}) : {};
    const requestedName = String(item?.title || item?.n || item?.primary_artist || item?.artist || "").trim();
    const requestedKey = requestedName.toLowerCase();
    const profile = publicArtists.find((artist) =>
      [artist.name, artist.display_name, artist.public_name, ...(artist.aliases || [])]
        .some((name) => String(name || "").trim().toLowerCase() === requestedKey)
    ) || item?.artist_profile || {};
    return {
      ...profile,
      image: artistImageOverrides[requestedKey] ||
        getArtistImageUrl({ ...profile, title: requestedName, artist_profile: profile }, { name: requestedName, artists: [profile] }) ||
        item?.image ||
        "",
    };
  }

  function DetailLinks({ links = {} }) {
    const entries = [
      ["Spotify", links.spotify || links.spotify_url],
      ["Apple Music", links.apple_music || links.apple_music_url],
      ["YouTube", links.youtube || links.youtube_url],
      ["Boomplay", links.boomplay || links.boomplay_url],
      ["Audiomack", links.audiomack || links.audiomack_url],
      ["TikTok", links.tiktok || links.tiktok_url],
      ["Shazam", links.shazam || links.shazam_url],
      ["Instagram", links.instagram || links.instagram_url],
      ["X", links.x || links.x_url],
      ["Facebook", links.facebook || links.facebook_url],
      ["Website", links.website || links.website_url],
    ].filter(([, url]) => Boolean(url));
    if (!entries.length) return null;
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
        {entries.map(([label, url]) => (
          <a key={`${label}-${url}`} href={url} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} style={{ color: chartAccent, fontWeight: 850, textDecoration: "none" }}>
            {label} ↗
          </a>
        ))}
      </div>
    );
  }

  function DetailPanel({ item, profile, artistCountry, badge, compact = false }) {
    const hasCountry = Boolean(artistCountry.country || artistCountry.code);
    const countryLabel = artistCountry.country
      ? `${artistCountry.country}${artistCountry.code ? ` (${artistCountry.code})` : ""}`
      : artistCountry.code || "";
    const gridStyle = compact ? styles.mobileDetailsGrid : styles.desktopDetailsGrid;

    if (isArtistsChart || item?.is_artist_entry) {
      const artistProfile = managedArtistForItem(item);
      const aliases = normalizeDetailValue(artistProfile.aliases || item.aliases, "");
      const artistLinks = artistProfile.social_links || item.social_links || {};
      const hasArtistLinks = Object.values(artistLinks).some(Boolean);
      const compactMove = compact ? movement(item) : null;
      const compactMoveStyle = compact ? movementStyle(item) : null;
      return (
        <div style={gridStyle}>
          {compact && <DetailCard label="Move" value={compactMove.label || "—"} accent={compactMoveStyle.color} />}
          {compact && <DetailCard label="Months" value={getMonthsOnChart(item)} />}
          {compact && <DetailCard label="Last Month" value={profile.lastMonth} />}
          {compact && <DetailCard label="Peak" value={profile.peak} />}
          {hasCountry && <DetailCard label="Country" value={countryLabel} accent={badge.accent} />}
          {isCombinedChart && <DetailCard label="Platforms" value={getPlatformDetails(item)} />}
          {isCombinedChart && <DetailCard label="Points" value={Number(item.pts || 0).toLocaleString()} />}
          {isCombinedChart && <DetailCard label="Entries" value={item.entries_count || "—"} />}
          {!compact && <DetailCard label="Months" value={getMonthsOnChart(item)} />}
          {(artistProfile.city_region || item.city_region) && <DetailCard label="City / Region" value={artistProfile.city_region || item.city_region} />}
          {(artistProfile.genre || item.genre) && <DetailCard label="Genre" value={artistProfile.genre || item.genre} />}
          {(artistProfile.artist_type || item.artist_type) && <DetailCard label="Artist type" value={artistProfile.artist_type || item.artist_type} />}
          {(artistProfile.verified || item.verified) && <DetailCard label="Verification" value="Verified artist" accent={badge.accent} />}
          {aliases && <DetailCard label="Aliases" value={aliases} wide />}
          {(artistProfile.biography || item.biography) && <DetailCard label="Biography" value={artistProfile.biography || item.biography} wide />}
          {hasArtistLinks && <DetailCard label="Artist links" value={<DetailLinks links={artistLinks} />} wide />}
        </div>
      );
    }

    const primaryCredit = firstDetailValue(item, ["primary_artist_credit"], "");
    const featuredCredit = firstDetailValue(item, ["featured_artist_credit"], "");
    const songwriterDetails = getSongwriterDetails(item);
    const producerDetails = getProducerDetails(item);
    const releaseDate = getReleaseDate(item);
    const releaseYear = getReleaseYear(item);
    const creditedArtists = firstDetailValue(item, ["credited_artists", "additional_credits"], "");
    const genre = firstDetailValue(item, ["genre", "genres"], "");
    const label = firstDetailValue(item, ["label", "record_label"], "");
    const distributor = firstDetailValue(item, ["distributor", "distribution"], "");
    const isrc = firstDetailValue(item, ["isrc", "isrc_code"], "");
    const upc = firstDetailValue(item, ["upc", "upc_code", "barcode"], "");
    const trackCount = firstDetailValue(item, ["number_of_tracks", "track_count", "tracks"], "");
    const radioInfo = firstDetailValue(item, ["radio_info", "radio_notes"], "");
    const compactMove = compact ? movement(item) : null;
    const compactMoveStyle = compact ? movementStyle(item) : null;
    return (
      <div style={gridStyle}>
        {compact && <DetailCard label="Move" value={compactMove.label || "—"} accent={compactMoveStyle.color} />}
        {compact && <DetailCard label="Months" value={getMonthsOnChart(item)} />}
        {compact && <DetailCard label="Last Month" value={profile.lastMonth} />}
        {compact && <DetailCard label="Peak" value={profile.peak} />}
        {!compact && <DetailCard label="Months" value={getMonthsOnChart(item)} />}
        {primaryCredit && <DetailCard label="Main artist(s)" value={primaryCredit} wide />}
        {featuredCredit && <DetailCard label="Featuring" value={featuredCredit} wide />}
        {creditedArtists && <DetailCard label="Additional credits" value={creditedArtists} wide />}
        {songwriterDetails !== "—" && <DetailCard label="Songwriter(s)" value={songwriterDetails} wide />}
        {producerDetails !== "—" && <DetailCard label="Producer(s)" value={producerDetails} wide />}
        {releaseDate && <DetailCard label="Release date" value={releaseDate} />}
        {releaseYear !== "—" && <DetailCard label="Release year" value={releaseYear} />}
        {genre && <DetailCard label="Genre" value={genre} />}
        {label && <DetailCard label="Label" value={label} />}
        {distributor && <DetailCard label="Distributor" value={distributor} />}
        {isrc && <DetailCard label="ISRC" value={isrc} />}
        {upc && <DetailCard label="UPC" value={upc} />}
        {trackCount && <DetailCard label="Tracks" value={trackCount} />}
        {radioInfo && <DetailCard label="Radio information" value={radioInfo} wide />}
        {hasReleaseLinks(item) && <DetailCard label="Listen" value={<DetailLinks links={item} />} wide />}
      </div>
    );
  }

  // ----- Sortable columns -------------------------------------------------
  // Default ("rank"/"asc") preserves the chart's natural order.
  const [sort, setSort] = useState({ key: "rank", dir: "asc" });

  // Hero carousel — cycles through the full Top 50, not just a top-5 slice ──
  const [slideIdx, setSlideIdx] = useState(0);
  const slideTimerRef = useRef(null);
  const heroItems = useMemo(
    () => [...data].sort((a, b) => Number(a.rank) - Number(b.rank)),
    [data]
  );

  useEffect(() => {
    setSlideIdx(0);
    clearInterval(slideTimerRef.current);
    if (heroItems.length > 1) {
      slideTimerRef.current = setInterval(
        () => setSlideIdx(i => (i + 1) % heroItems.length),
        3800
      );
    }
    return () => clearInterval(slideTimerRef.current);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

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
      case "monthsOnChart":
        return num(getMonthsOnChart(item));
      case "peak":
        return num(profile.peak);
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

  const shown = sortedData;

  function handleSort(key) {
    setSort((current) => {
      if (current.key !== key) {
        // Coverage reads most-first; rank history reads best-first.
        const firstDir = key === "platforms" || key === "monthsOnChart" ? "desc" : "asc";
        return { key, dir: firstDir };
      }
      return { key, dir: current.dir === "asc" ? "desc" : "asc" };
    });
  }

  function sortArrow(key) {
    if (sort.key !== key) return "";
    return sort.dir === "asc" ? " ▲" : " ▼";
  }

  function getRowKey(item, index) {
    return `${ct}-${month}-${plat}-${item.title}-${item.primary_artist || item.artist}-${item.rank}-${index}`;
  }

  function yearEndTitleStyle(item) {
    const topThree = Number(item?.rank) <= 3;
    return {
      fontSize: mobile ? (topThree ? "14.5px" : "13.25px") : (tablet ? (topThree ? "16px" : "14.25px") : (topThree ? "17px" : "15px")),
      fontWeight: 850,
      ...(mobile
        ? { whiteSpace: "normal", overflow: "visible", textOverflow: "clip", overflowWrap: "anywhere" }
        : { whiteSpace: "normal", overflow: "visible", textOverflow: "clip" }),
    };
  }

  function toggleRow(rowKey) {
    setExpandedRowKey((current) => (current === rowKey ? null : rowKey));
  }

  useEffect(() => {
    setExpandedRowKey(null);
  }, [ct, month, plat, vc]);

  useEffect(() => {
    if (!mobile || !activePlatformPillRef.current) return;
    activePlatformPillRef.current.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [mobile, plat, selectedCountryScope, ct]);

  function ChartToggle() {
    return (
      <div style={{...styles.toggleWrap, background: darkMode ? "#181C18" : "#f2f2f2", border: `1px solid ${darkMode ? "#2F352F" : "rgba(0,0,0,0.08)"}`}}>
        {["singles", "albums", "artists"].map((item) => {
          const active = ct === item;

          return (
            <button
              key={item}
              onClick={() => {
                setCt(item);
              }}
              style={{
                ...styles.toggleButton,
                background: active ? chartAccent : (darkMode ? "transparent" : "#ffffff"),
                color: active ? chartAccentInk : (darkMode ? "#B8BDB8" : "#111111"),
                borderColor: active ? chartAccent : (darkMode ? "transparent" : "rgba(0,0,0,0.14)"),
                boxShadow: active ? `0 2px 10px ${chartAccentShadow}` : "none",
                flex: mobile ? 1 : "initial",
                minHeight: mobile ? "38px" : (tablet ? "36px" : undefined),
              }}
            >
              {item}
            </button>
          );
        })}
      </div>
    );
  }

  const isCombinedChart = plat === "Combined" || isKenyanChart || isAfricaScope;

  const mastheadItem = heroItems[slideIdx] || heroItems[0] || top || data[0] || null;
  const mastheadItemIsArtist = Boolean(mastheadItem && (isArtistsChart || mastheadItem?.is_artist_entry));
  const mastheadImageLabel = mastheadItem
    ? (mastheadItemIsArtist
        ? (mastheadItem.title || mastheadItem.n || mastheadItem.artist || "Featured artist")
        : [mastheadItem.title || mastheadItem.t, mastheadItem.primary_artist || mastheadItem.artist_display || mastheadItem.artist || mastheadItem.a]
            .filter(Boolean)
            .join(" by "))
    : `${mastheadTitle} artwork`;

  return (
    <>
      <style>{`
        .ngoma-table-row {
          transition: transform 0.16s ease, box-shadow 0.16s ease;
          position: relative;
          z-index: 1;
        }
        .ngoma-table-row:hover {
          transform: translateY(-2px) scale(1.003);
          box-shadow: ${darkMode ? `0 10px 24px rgba(0,0,0,0.4), 0 0 0 1px ${chartAccentBorder}` : `0 10px 24px rgba(31,36,31,0.10), 0 0 0 1px ${chartAccentBorder}`};
          z-index: 2;
        }
      `}</style>
      <style>{`
        .ngoma-premium-charts-dark .ngoma-title-link,
        .ngoma-premium-charts-dark .ngoma-title-link:visited,
        .ngoma-app-shell[data-theme="dark"] .ngoma-premium-charts .ngoma-title-link,
        .ngoma-app-shell[data-theme="dark"] .ngoma-premium-charts .ngoma-title-link:visited {
          color: #FFFFFF !important;
          -webkit-text-fill-color: #FFFFFF !important;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ngoma-slide-in {
          from { opacity: 0; transform: translateX(14px); }
          to   { opacity: 1; transform: none; }
        }
        .ngoma-hero-slide { animation: ngoma-slide-in 0.38s cubic-bezier(.22,.68,0,1.2) both; }
        .ytc-masthead {
          isolation: isolate;
        }
        .ytc-masthead::before {
          content: "";
          position: absolute;
          pointer-events: none;
          inset: ${mobile ? "12px" : `18px max(18px, calc((100vw - ${pageMax}) / 2 + 18px)) 18px`};
          border: 1px solid var(--ngoma-hero-border);
          border-radius: 8px;
          z-index: 1;
        }
        .ngoma-chart-row-stripe:nth-child(even) { background: ${darkMode ? "#121612" : "transparent"} !important; }
        .ngoma-chart-row-stripe:nth-child(odd)  { background: ${darkMode ? "#0f120f" : "transparent"} !important; }
        .ngoma-mobile-table-row {
          transition: background 160ms ease, box-shadow 160ms ease, transform 160ms ease;
        }
        .ngoma-mobile-table-row:active {
          transform: translateY(1px);
        }
        .ytc-masthead-select {
          appearance: none;
          -webkit-appearance: none;
          width: 100%;
          border: 0 !important;
          outline: 0;
          background: transparent !important;
          background-color: transparent !important;
          color: ${mastheadText} !important;
          font: inherit;
          font-weight: 800;
          padding: 0 28px 0 0;
          cursor: pointer;
        }
        html[data-ngoma-theme="dark"] .ngoma-app-shell .ytc-masthead-select,
        .ngoma-premium-charts-dark .ytc-masthead-select {
          background: transparent !important;
          background-color: transparent !important;
          color: #f6f3ea !important;
          border-color: transparent !important;
          box-shadow: none !important;
        }
        .ytc-masthead-select option {
          background: #ffffff;
          color: #111111;
        }
        .ytc-masthead-select:focus-visible {
          outline: 2px solid rgba(255,255,255,0.82);
          outline-offset: 4px;
          border-radius: 999px;
        }
        .ytc-masthead-heading {
          letter-spacing: 0 !important;
        }
        @media (max-width: 768px) {
          .ytc-masthead-heading {
            font-size: 40px !important;
            line-height: 1.02 !important;
            letter-spacing: 0 !important;
          }
        }
        @media (hover: hover) {
          .ngoma-mobile-table-row:hover {
            background: ${darkMode ? "#121612" : "#fbfaf7"} !important;
          }
        }
        .ngoma-source-selector-option {
          background: var(--platform-pill-bg) !important;
          color: var(--platform-pill-text) !important;
          border-color: var(--platform-pill-border) !important;
          box-shadow: var(--platform-pill-shadow) !important;
        }
        .ngoma-source-selector-option[aria-current="true"] {
          background: var(--platform-pill-active-bg) !important;
          color: var(--platform-pill-active-text) !important;
          border-color: var(--platform-pill-active-border) !important;
          box-shadow: var(--platform-pill-active-shadow) !important;
        }
      `}</style>
      <div
        className={`ngoma-premium-charts ${darkMode ? "ngoma-premium-charts-dark" : ""}`}
        style={{
          ...styles.page,
          "--ngoma-chart-accent": chartAccent,
          "--ngoma-chart-accent-soft": chartAccentSoft,
          "--ngoma-chart-accent-border": chartAccentBorder,
          "--ngoma-chart-accent-ink": chartAccentInk,
          width: "100vw",
          maxWidth: "100vw",
          marginLeft: "calc(50% - 50vw)",
          marginRight: "calc(50% - 50vw)",
          padding: "0 0 34px",
          boxSizing: "border-box",
        }}
      >
      <section
        className="ytc-masthead"
        style={{
          ...styles.hero,
          "--ngoma-hero-border": mastheadAccentBorder,
          background: mastheadSurface,
          maxWidth: "100%",
          margin: 0,
          boxSizing: "border-box",
          padding: mobile
            ? `40px ${safeGutter}`
            : `${tablet ? "62px" : "80px"} ${heroSidePadding}`,
          opacity: loaded ? 1 : 0,
          transform: loaded ? "none" : "translateY(8px)",
          color: mastheadText,
        }}
      >

        <div
          className="ngoma-hero-main"
          style={{
            ...styles.heroMain,
            gridTemplateColumns: (!mobile && heroItems.length > 0) ? `minmax(0, 1fr) minmax(220px, ${tablet ? "300px" : "352px"})` : "1fr",
            gap: heroItems.length > 0 ? (mobile ? "28px" : (tablet ? "44px" : "72px")) : 0,
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 2,
          }}
        >
          {/* Left: chart title. */}
          <div
            style={{
              ...styles.heroLeft,
              paddingTop: 0,
              paddingBottom: 0,
              transform: "none",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                ...styles.eyebrowRow,
                color: mastheadMuted,
                fontSize: mobile ? "14px" : (tablet ? "18px" : "22px"),
                fontWeight: 650,
                letterSpacing: 0,
                textTransform: "none",
                marginBottom: mobile ? "20px" : (tablet ? "22px" : "28px"),
                zIndex: 2,
              }}
            >
              <span style={{ color: countryAccent, fontWeight: 800 }}>{countryDisplayName}</span>
              {liveChartLoading && (
                <>
                  <span style={{color: darkMode ? "rgba(255,255,255,0.42)" : "#a3aaa5"}}>/</span>
                  <span>Loading</span>
                </>
              )}
            </div>

            <h1
              className="ytc-masthead-heading ngoma-chart-hero-title"
              aria-label={mastheadTitle}
              style={{
                ...styles.heroTitle,
                color: mastheadText,
                fontFamily: F,
                fontSize: mobile ? "40px" : (tablet ? "56px" : "76px"),
                letterSpacing: 0,
                lineHeight: mobile ? 1.02 : 0.98,
                margin: 0,
                textTransform: "none",
                maxWidth: mobile ? "12ch" : "760px",
              }}
            >
              {mastheadTitle}
            </h1>

            <div
              style={{
                ...styles.heroMeta,
                flexDirection: "column",
                alignItems: "flex-start",
                gap: mobile ? "20px" : (tablet ? "34px" : "72px"),
                marginTop: mobile ? "18px" : (tablet ? "30px" : "42px"),
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: mobile ? "16px" : (tablet ? "20px" : "24px"),
                  fontWeight: 650,
                  lineHeight: 1.42,
                  color: mastheadMuted,
                  maxWidth: "620px",
                }}
              >
                {mastheadSubtitle}
              </p>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: mobile ? "10px" : "16px",
                  width: mobile ? "100%" : "auto",
                }}
              >
                <label
                  style={{
                    ...styles.mastheadPill,
                    width: mobile ? "100%" : (tablet ? "190px" : "212px"),
                    background: "transparent",
                    backgroundColor: "transparent",
                    borderColor: mastheadBorder,
                    color: mastheadText,
                  }}
                >
                  <span style={styles.screenReaderOnly}>Chart period</span>
                  <select
                    className="ytc-masthead-select"
                    value={month}
                    onChange={(event) => setMonth(event.target.value)}
                    aria-label="Chart period"
                  >
                    {mastheadPeriodLabel !== month && (
                      <option value={month}>{mastheadPeriodLabel}</option>
                    )}
                    {MONTHS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ ...styles.mastheadPillIcon, color: mastheadText }}>
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </label>

              </div>
            </div>
          </div>

          {/* Right: rotating cover-art tile. */}
          {heroItems.length > 0 && (() => {
            const item        = heroItems[slideIdx] || heroItems[0];
            const isArtist    = isArtistsChart || !!item?.is_artist_entry;
            const artProfile  = isArtist ? managedArtistForItem(item) : {};
            const img         = isArtist
              ? (artistImageOverrides[String(item?.title || "").trim().toLowerCase()] || artProfile?.image || getArtworkUrl(item) || "")
              : getArtworkUrl(item);
            const pauseTimer  = () => clearInterval(slideTimerRef.current);
            const resumeTimer = () => {
              clearInterval(slideTimerRef.current);
              if (heroItems.length > 1) {
                slideTimerRef.current = setInterval(
                  () => setSlideIdx(i => (i + 1) % heroItems.length),
                  3800
                );
              }
            };

            const cardBorder = "rgba(255,255,255,0.34)";
            const cardShadow  = `0 0 0 1px ${cardBorder}, 0 28px 90px ${chartAccentShadow}, 0 24px 70px rgba(0,0,0,0.36)`;

            return (
              <div
                className="ngoma-hero-showcase ytc-masthead-art"
                style={{
                  position: "relative",
                  borderRadius: "8px",
                  overflow: "hidden",
                  background: `linear-gradient(135deg, ${chartAccent}42 0%, #cfd6d3 100%)`,
                  width: mobile ? "min(74vw, 278px)" : (tablet ? "min(28vw, 300px)" : "min(24vw, 352px)"),
                  aspectRatio: "1 / 1",
                  cursor: "pointer",
                  boxShadow: cardShadow,
                  justifySelf: "center",
                  marginLeft: "auto",
                  marginRight: "auto",
                }}
                onMouseEnter={pauseTimer}
                onMouseLeave={resumeTimer}
                onClick={() => openRelease(item)}
                aria-label={`Open ${mastheadImageLabel || mastheadTitle}`}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openRelease(item);
                  }
                }}
              >
                {/* Cover art */}
                {img && (
                  <img
                    key={`hero-img-${slideIdx}`}
                    src={img}
                    alt=""
                    className="ngoma-hero-slide"
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                )}
                {!img && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#ffffff",
                      fontFamily: F,
                      fontSize: mobile ? "42px" : "56px",
                      fontWeight: 900,
                      background: `linear-gradient(135deg, ${chartAccent}66 0%, rgba(255,255,255,0.16) 100%)`,
                    }}
                    aria-hidden="true"
                  >
                    {getArtworkLabel(item)}
                  </div>
                )}

              </div>
            );
          })()}
        </div>
      </section>


      <section
        style={{
          ...styles.controls,
          background: darkMode ? "#0b0e0b" : "#ffffff",
          borderBottom: `1px solid ${chartAccentBorder}`,
          maxWidth: pageMax,
          margin: "0 auto",
          boxSizing: "border-box",
          flexDirection: mobile ? "column" : "row",
          alignItems: mobile ? "stretch" : "center",
          padding: mobile ? "14px 16px" : (tablet ? "14px 22px" : "16px 28px"),
        }}
      >
        <ChartToggle />

        <div style={mobile ? { position: "relative", width: "100%", minWidth: 0 } : { display: "contents" }}>
          <div
            style={{
              ...styles.platforms,
              gap: mobile ? "8px" : (tablet ? "7px" : "6px"),
              flexWrap: mobile ? "nowrap" : "wrap",
              overflowX: mobile ? "auto" : "visible",
              paddingBottom: mobile ? "6px" : 0,
              paddingRight: mobile ? "30px" : 0,
            }}
          >
            {platList.map((item) => {
              // The "Kenyan" pill is a shortcut to whichever country is currently
              // selected (it defaults to Kenya) — always target selectedCountryScope
              // directly rather than the active tab's `plat`, since `plat` is "Combined"
              // by default after switching country.
              const active = item === "Kenyan"
                ? plat === selectedCountryScope
                : plat === item;
              const color = item === "Kenyan" ? countryAccent : (item === "Combined" ? GOLD : PC[item] || GOLD);
              const ink = readableInk(color);
              const label = item === "Kenyan" ? (mobile ? regionalScopeShortLabel : regionalTop50Label) : (item === "Combined" ? item : PLAT_LABEL[item] || item);

              return (
                <button
                  key={item}
                  ref={active ? activePlatformPillRef : null}
                  className="ngoma-source-selector-option"
                  aria-current={active ? "true" : undefined}
                  onClick={() => setPlat(item === "Kenyan" ? selectedCountryScope : item)}
                  style={{
                    ...styles.platformButton,
                    "--platform-pill-bg": darkMode ? "#151815" : "#ffffff",
                    "--platform-pill-text": darkMode ? "#B8BDB8" : "#6b7280",
                    "--platform-pill-border": darkMode ? "#2F352F" : "rgba(0,0,0,0.12)",
                    "--platform-pill-shadow": "none",
                    "--platform-pill-active-bg": color,
                    "--platform-pill-active-text": ink,
                    "--platform-pill-active-border": color,
                    "--platform-pill-active-shadow": `0 2px 10px ${color}33`,
                    padding: mobile ? "8px 13px" : (tablet ? "7px 10px" : "8px 12px"),
                    borderColor: active ? color : (darkMode ? "#2F352F" : "rgba(0,0,0,0.12)"),
                    background: active ? color : (darkMode ? "#151815" : "#ffffff"),
                    color: active ? ink : (darkMode ? "#B8BDB8" : "#6b7280"),
                    boxShadow: active ? `0 2px 10px ${color}33` : "none",
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

      </section>

      <section
        style={{
          ...styles.tableShell,
          borderTop: mobile ? "none" : `3px solid ${chartAccent}`,
          maxWidth: pageMax,
          width: mobile ? "auto" : "100%",
          margin: mobile ? `16px ${safeGutter} 28px` : "24px auto 34px",
          boxSizing: "border-box",
          borderRadius: 0,
          ...(mobile ? {
            background: darkMode ? "#0d0f0d" : "#ffffff",
            border: `1px solid ${chartAccentBorder}`,
            boxShadow: darkMode ? "0 10px 28px rgba(0,0,0,0.28)" : "0 10px 28px rgba(31,36,31,0.05)",
          } : null),
        }}
      >
        {mobile ? (
          <div className="ngoma-mobile-table-header" style={{...styles.mobileTableHeader, background: darkMode ? "#0f120f" : "#f0ede6", borderBottom: `2px solid ${chartAccentBorder}`, color: darkMode ? "#8a9288" : "#3d4440"}}>
            <span style={styles.mobileTableHeaderCell}>#</span>
            <span style={{...styles.mobileTableHeaderCell, textAlign: "left"}}>{isArtistsChart ? "Artist" : (isSingles ? "Song" : "Album")}</span>
            <span style={styles.mobileTableHeaderCell}>Info</span>
          </div>
        ) : (
          <div className="ngoma-table-header" style={{...styles.tableHeader, ...(tablet ? { gridTemplateColumns: "48px 72px minmax(0, 1fr) 82px 74px 66px 58px", gap: "14px", padding: "11px 18px", fontSize: "9.5px" } : null), background: darkMode ? "#0f120f" : "#f0ede6", borderBottom: `2px solid ${chartAccentBorder}`, color: darkMode ? "#8a9288" : "#3d4440"}}>
            <span
              style={{ ...styles.headerCell, cursor: "pointer" }}
              onClick={() => handleSort("rank")}
              title="Sort by position"
            >
              #{sortArrow("rank")}
            </span>
            <span style={styles.headerCell}>Move</span>
            <span style={{ ...styles.headerEntryCell, ...(tablet ? { paddingLeft: "52px" } : null) }}>{isArtistsChart ? "Artist" : (isSingles ? "Song" : "Album")}</span>
            <span
              style={{ ...styles.headerCell, cursor: "pointer" }}
              onClick={() => handleSort("monthsOnChart")}
              title="Sort by months on chart"
            >
              Months{sortArrow("monthsOnChart")}
            </span>
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
            <span style={styles.headerCell}>Details</span>
          </div>
        )}

        <div style={mobile ? styles.mobileRowsGrid : styles.rows}>
          {shown.map((item, index) => {
            const profile = getReleaseProfile(item);
            const move = movement(item);
            const moveStyle = movementStyle(item);
            const medalColor = item.rank <= 3 ? MEDALS[item.rank - 1] : (darkMode ? "#f6f3ea" : "#050505");
            const artistCountry = getArtistCountry(item);
            const badge = regionBadge(artistCountry.code);
            const certification = isArtistsChart ? null : certificationForEntry(item, isSingles ? "single" : "album");
            const rowKey = getRowKey(item, index);
            const expanded = expandedRowKey === rowKey;

            if (mobile) {

              return (
                <div
                  key={rowKey}
                  className="ngoma-mobile-chart-row-wrap"
                  style={{
                    ...styles.mobileDesktopRowWrap,
                    ...(darkMode ? styles.mobileDesktopRowWrapDark : null),
                    animationDelay: `${Math.min(index * 20, 400)}ms`,
                  }}
                >
                  <div
                    className="ngoma-mobile-table-row"
                    style={{
                      ...styles.mobileDesktopRow,
                      ...(darkMode ? styles.mobileDesktopRowDark : null),
                      ...(item.rank === 1 ? { borderLeftColor: chartAccent } : null),
                      ...(expanded ? { boxShadow: `inset 4px 0 0 ${chartAccent}` } : null),
                    }}
                    onClick={() => toggleRow(rowKey)}
                    role="button"
                    aria-expanded={expanded}
                  >
                    <div style={styles.mobileDesktopRankStack}>
                      <div style={{ ...styles.mobileDesktopRank, color: medalColor }}>{item.rank}</div>
                      <div style={{ ...styles.mobileDesktopMove, color: moveStyle.color, background: moveStyle.background }}>
                        {move.label || "-"}
                      </div>
                    </div>

                    <div style={styles.mobileDesktopEntryCell}>
                      <ReleaseArtwork item={item} size={40} />
                      <div style={styles.mobileDesktopEntryText}>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            openRelease(item);
                          }}
                          className="ngoma-title-link"
                          style={{ ...styles.titleButton, ...yearEndTitleStyle(item), fontFamily: SF, ...(darkMode ? styles.titleButtonDark : null), color: darkMode ? "#FFFFFF" : "#050505" }}
                          title={`Open ${item.title}`}
                        >
                          {item.title}
                        </button>

                        {isArtistsChart ? (
                          item.artist ? (
                            <div style={{...styles.artistLinksWrap, fontFamily: F, ...(darkMode ? styles.artistButtonDark : null), cursor:"default"}}>
                              {item.artist}
                            </div>
                          ) : null
                        ) : <ArtistLinks item={item} />}
                        {certification && <CertificationTag cert={certification} compact style={{ marginTop: "6px" }} />}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleRow(rowKey);
                      }}
                      style={{ ...styles.mobileDesktopDetailsToggle, ...(darkMode ? styles.mobileDesktopDetailsToggleDark : null) }}
                      aria-label={expanded ? "Hide chart details" : "Show chart details"}
                      aria-expanded={expanded}
                    >
                      {expanded ? "-" : "+"}
                    </button>
                  </div>

                  {expanded && (
                    <div style={{ ...styles.mobileDesktopExpandedDetails, ...(darkMode ? styles.mobileDesktopExpandedDetailsDark : null) }}>
                      <DetailPanel
                        item={item}
                        profile={profile}
                        artistCountry={artistCountry}
                        badge={badge}
                        compact
                      />
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div key={rowKey} className="ngoma-chart-row-stripe" style={styles.desktopRowWrap}>
                <div
                  className="ngoma-table-row"
                  style={{
                    ...styles.row,
                    ...(tablet ? { gridTemplateColumns: "48px 72px minmax(0, 1fr) 82px 74px 66px 58px", gap: "14px", padding: "16px 18px" } : null),
                    background: darkMode ? "#0d0f0d" : "transparent",
                    color: darkMode ? "#fffdf7" : "#050505",
                    animationDelay: `${Math.min(index * 20, 400)}ms`,
                    ...(item.rank === 1 ? { borderLeft: `3px solid ${chartAccent}` } : {}),
                  }}
                >
                  <div
                    style={{
                      ...styles.rank,
                      color: medalColor,
                      justifySelf: "center",
                      textAlign: "center",
                      fontSize: tablet ? (item.rank === 1 ? "24px" : item.rank <= 3 ? "20px" : "28px") : (item.rank === 1 ? "26px" : item.rank <= 3 ? "22px" : undefined),
                      fontWeight: item.rank <= 3 ? 950 : 900,
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
                    <ReleaseArtwork item={item} size={tablet ? 58 : 66} />

                    <div style={styles.entryText}>
                      <div style={{ display: "flex", alignItems: "center", gap: "7px", flexWrap: "wrap" }}>
                        <button
                          onClick={() => openRelease(item)}
                          className="ngoma-title-link"
                          style={{ ...styles.titleButton, ...yearEndTitleStyle(item), fontFamily: SF, ...(darkMode ? styles.titleButtonDark : null), color: darkMode ? "#FFFFFF" : "#050505" }}
                          title={`Open ${item.title}`}
                        >
                          {item.title}
                        </button>
                        {certification && <CertificationTag cert={certification} compact />}
                      </div>

                      {isArtistsChart ? (
                        item.artist ? (
                          <div style={{...styles.artistLinksWrap, fontFamily: F, ...(darkMode ? styles.artistButtonDark : null), cursor:"default"}}>
                            {item.artist}
                          </div>
                        ) : null
                      ) : <ArtistLinks item={item} />}
                    </div>
                  </div>

                  <div style={{ ...styles.metaNumber, ...(tablet ? { fontSize: "13.5px" } : null), ...(darkMode ? styles.metaNumberDark : null) }}>{getMonthsOnChart(item)}</div>
                  <div style={{ ...styles.metaNumber, ...(tablet ? { fontSize: "13.5px" } : null), ...(darkMode ? styles.metaNumberDark : null) }}>{profile.lastMonth}</div>
                  <div style={{ ...styles.metaNumber, ...(tablet ? { fontSize: "13.5px" } : null), ...(darkMode ? styles.metaNumberDark : null) }}>{profile.peak}</div>
                  <button
                    type="button"
                    onClick={() => toggleRow(rowKey)}
                    style={{ ...styles.desktopDetailsToggle, ...(darkMode ? styles.desktopDetailsToggleDark : null) }}
                    aria-label={expanded ? "Hide chart details" : "Show chart details"}
                    aria-expanded={expanded}
                  >
                    {expanded ? "-" : "+"}
                  </button>
                </div>

                {expanded && (
                  <div style={{ ...styles.desktopExpandedDetails, ...(tablet ? { margin: "0 18px 14px 132px", padding: "16px 18px" } : null), ...(darkMode ? styles.desktopExpandedDetailsDark : null) }}>
                    <DetailPanel
                      item={item}
                      profile={profile}
                      artistCountry={artistCountry}
                      badge={badge}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={styles.tableFooter}>
          Showing {shown.length} of {data.length} · {month} · {platformLabel}
        </div>
      </section>

      </div>
    </>
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

const styles = {
  page: {
    background: "#ffffff",
    color: "#050505",
    minHeight: "60vh",
    width: "100%",
    maxWidth: "100%",
    overflowX: "hidden",
  },

  hero: {
    position: "relative",
    overflow: "hidden",
    background: "#ffffff",
    borderBottom: "none",
    transition: "all 0.5s ease-out",
    width: "100%",
    maxWidth: "100%",
  },

  eyebrowRow: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
    fontWeight: 800,
    letterSpacing: "1.1px",
    textTransform: "uppercase",
    color: "#69716b",
  },

  eyebrowDivider: {
    color: "var(--ngoma-chart-accent)",
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
    fontWeight: 900,
    fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
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

  mastheadPill: {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    minHeight: "44px",
    padding: "0 16px",
    borderRadius: "999px",
    border: "1px solid rgba(255,255,255,0.28)",
    background: "transparent",
    color: "#050505",
    fontSize: "17px",
    fontWeight: 800,
    lineHeight: 1,
    boxSizing: "border-box",
    backdropFilter: "none",
  },

  mastheadPillIcon: {
    position: "absolute",
    right: "14px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#ffffff",
    pointerEvents: "none",
  },

  screenReaderOnly: {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: 0,
    margin: "-1px",
    overflow: "hidden",
    clip: "rect(0, 0, 0, 0)",
    whiteSpace: "nowrap",
    border: 0,
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
    color: "var(--ngoma-chart-accent)",
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
    background: "var(--ngoma-chart-accent-soft)",
    color: "var(--ngoma-chart-accent)",
    fontSize: "12px",
    fontWeight: 900,
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
    overflow: "hidden",
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
    color: "#050505",
    overflow: "hidden",
    maxWidth: "100%",
  },

  tableTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "20px",
    borderBottom: "1px solid rgba(0,0,0,0.08)",
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
    background: "var(--ngoma-chart-accent-soft)",
    color: "var(--ngoma-chart-accent)",
    fontSize: "13px",
    fontWeight: 900,
    letterSpacing: "1px",
    textTransform: "uppercase",
  },

  tableHeader: {
    display: "grid",
    gridTemplateColumns: "54px 86px minmax(0, 1fr) 108px 86px 78px 70px",
    gap: "24px",
    alignItems: "center",
    justifyItems: "center",
    padding: "12px 24px",
    background: "#f0ede6",
    color: "#3d4440",
    fontSize: "10px",
    fontWeight: 900,
    letterSpacing: "0.9px",
    textTransform: "uppercase",
    borderBottom: "2px solid var(--ngoma-chart-accent-border)",
  },

  headerCell: {
    width: "100%",
    textAlign: "center",
    justifySelf: "center",
    padding: "0 6px",
  },

  headerEntryCell: {
    width: "100%",
    textAlign: "left",
    justifySelf: "start",
    paddingLeft: "62px",
  },

  desktopRowWrap: {
    borderBottom: "1px solid rgba(0,0,0,0.08)",
  },

  rows: {
    display: "flex",
    flexDirection: "column",
  },

  mobileRowsGrid: {
    display: "flex",
    flexDirection: "column",
  },

  mobileTableHeader: {
    display: "grid",
    gridTemplateColumns: "38px minmax(0, 1fr) 34px",
    gap: "9px",
    alignItems: "center",
    padding: "10px 12px",
    fontSize: "9px",
    fontWeight: 900,
    letterSpacing: "0.8px",
    textTransform: "uppercase",
  },

  mobileTableHeaderCell: {
    width: "100%",
    textAlign: "center",
    justifySelf: "center",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  mobileDesktopRowWrap: {
    borderBottom: "1px solid rgba(0,0,0,0.08)",
    animation: "fadeUp 0.35s ease both",
    maxWidth: "100%",
    boxSizing: "border-box",
  },

  mobileDesktopRowWrapDark: {
    borderBottom: "1px solid rgba(255,255,255,0.10)",
  },

  mobileDesktopRow: {
    display: "grid",
    gridTemplateColumns: "38px minmax(0, 1fr) 34px",
    gap: "9px",
    alignItems: "center",
    minWidth: 0,
    maxWidth: "100%",
    padding: "12px 10px 12px 8px",
    borderLeft: "3px solid transparent",
    background: "#ffffff",
    color: "#050505",
    cursor: "pointer",
    boxSizing: "border-box",
  },

  mobileDesktopRowDark: {
    background: "#0d0f0d",
    color: "#fffdf7",
  },

  mobileDesktopRankStack: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "5px",
    minWidth: 0,
  },

  mobileDesktopRank: {
    fontSize: "20px",
    fontWeight: 950,
    lineHeight: 1,
    textAlign: "center",
  },

  mobileDesktopMove: {
    minWidth: "32px",
    maxWidth: "36px",
    borderRadius: "999px",
    padding: "3px 5px",
    fontSize: "9px",
    fontWeight: 950,
    lineHeight: 1,
    textAlign: "center",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  mobileDesktopEntryCell: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    minWidth: 0,
    maxWidth: "100%",
  },

  mobileDesktopEntryText: {
    minWidth: 0,
    maxWidth: "100%",
  },

  mobileDesktopDetailsToggle: {
    justifySelf: "center",
    width: "32px",
    height: "32px",
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: "10px",
    background: "#fbfaf7",
    color: "#555555",
    fontSize: "20px",
    fontWeight: 900,
    lineHeight: 1,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 0 2px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },

  mobileDesktopDetailsToggleDark: {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "#151815",
    color: "#fffdf7",
    boxShadow: "0 2px 10px rgba(0,0,0,0.22)",
  },

  mobileDesktopExpandedDetails: {
    margin: 0,
    padding: "12px 12px 14px 49px",
    borderTop: "1px solid rgba(0,0,0,0.06)",
    background: "#fbfaf7",
    boxShadow: "none",
    animation: "slideDown 220ms ease both",
  },

  mobileDesktopExpandedDetailsDark: {
    borderTop: "1px solid rgba(255,255,255,0.10)",
    background: "#0b0e0b",
    color: "#fffdf7",
  },

  row: {
    display: "grid",
    gridTemplateColumns: "54px 86px minmax(0, 1fr) 108px 86px 78px 70px",
    gap: "24px",
    alignItems: "center",
    padding: "20px 24px",
    borderBottom: "1px solid rgba(0,0,0,0.08)",
    color: "#050505",
    animation: "fadeUp 0.35s ease both",
    transition: "background 180ms ease, box-shadow 180ms ease",
  },

  releaseArtwork: {
    position: "relative",
    flexShrink: 0,
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  releaseArtworkImage: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },

  releaseArtworkFallback: {
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: 950,
    letterSpacing: "1px",
    lineHeight: 1,
    textShadow: "0 1px 6px rgba(0,0,0,0.35)",
  },

  desktopDetailsToggle: {
    justifySelf: "center",
    width: "40px",
    height: "36px",
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: "14px",
    background: "#fbfaf7",
    color: "#555555",
    fontSize: "22px",
    fontWeight: 900,
    lineHeight: 1,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 0 2px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },

  desktopDetailsToggleDark: {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "#151815",
    color: "#fffdf7",
    boxShadow: "0 2px 10px rgba(0,0,0,0.22)",
  },

  desktopExpandedDetails: {
    margin: "0 24px 16px 176px",
    padding: "18px 20px",
    border: "1px solid rgba(0,0,0,0.06)",
    borderRadius: "16px",
    background: "#fbfaf7",
  },

  desktopExpandedDetailsDark: {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "#0f120f",
    color: "#fffdf7",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.02)",
  },

  desktopDetailsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "12px",
  },

  mobileDetailsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "10px",
  },

  detailCard: {
    background: "#f7f7f7",
    border: "1px solid rgba(0,0,0,0.06)",
    borderRadius: "12px",
    padding: "12px 13px",
    minWidth: 0,
    boxSizing: "border-box",
  },

  detailCardDark: {
    background: "#151815",
    border: "1px solid rgba(255,255,255,0.10)",
    color: "#fffdf7",
  },

  platformDetailCardDark: {
    background: "#101310",
    border: "1px solid rgba(255,255,255,0.16)",
    color: "#fffdf7",
  },

  detailCardWide: {
    gridColumn: "1 / -1",
  },

  detailCardLabel: {
    display: "block",
    fontSize: "12px",
    color: "#777777",
    fontWeight: 900,
    letterSpacing: "1px",
    textTransform: "uppercase",
  },

  detailCardLabelDark: {
    color: "#c8d0c8",
  },

  detailCardValue: {
    display: "block",
    marginTop: "4px",
    color: "#050505",
    fontSize: "17px",
    fontWeight: 900,
    lineHeight: 1.28,
    overflowWrap: "anywhere",
  },

  detailCardValueDark: {
    color: "#fffdf7",
  },

  rank: {
    fontSize: "34px",
    fontWeight: 950,
    lineHeight: 1,
    color: "#050505",
  },

  moveBadge: {
    justifySelf: "center",
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
    background: "linear-gradient(135deg, var(--ngoma-chart-accent) 0%, #111111 100%)",
    border: "1px solid rgba(0,0,0,0.08)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), 0 6px 18px rgba(0,0,0,0.12)",
  },

  flagText: {
    color: "var(--ngoma-chart-accent-ink)",
    fontSize: "13px",
    fontWeight: 900,
    letterSpacing: "1.2px",
    textTransform: "uppercase",
    lineHeight: 1,
  },

  entryText: {
    minWidth: 0,
    position: "relative",
    zIndex: 1,
  },

  artistLinksWrap: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "baseline",
    gap: "0 0",
    minWidth: 0,
    maxWidth: "100%",
    marginTop: "5px",
    lineHeight: 1.25,
  },

  artistSeparator: {
    color: "#777777",
    fontSize: "13px",
    fontWeight: 400,
    margin: "0 4px",
    lineHeight: 1.25,
  },

  artistSeparatorDark: {
    color: "#c8d0c8",
  },

  titleButton: {
    display: "block",
    maxWidth: "100%",
    border: "none",
    background: "transparent",
    WebkitAppearance: "none",
    appearance: "none",
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

  titleButtonDark: {
    color: "#FFFFFF",
    WebkitTextFillColor: "#FFFFFF",
  },

  artistButton: {
    display: "inline",
    maxWidth: "100%",
    border: "none",
    background: "transparent",
    color: "#59645D",
    padding: 0,
    marginTop: 0,
    textAlign: "left",
    fontSize: "13px",
    fontWeight: 400,
    cursor: "pointer",
    whiteSpace: "normal",
    overflow: "visible",
    textOverflow: "clip",
  },

  artistButtonDark: {
    color: "#8a9288",
  },

  metaNumber: {
    color: "#050505",
    fontSize: "15px",
    fontWeight: 900,
    textAlign: "center",
  },

  metaNumberDark: {
    color: "#fffdf7",
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


  tableTopActions: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexShrink: 0,
    flexWrap: "wrap",
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

};
