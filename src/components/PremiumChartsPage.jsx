import { useEffect, useMemo, useRef, useState } from "react";
import { getArtistImageUrl } from "../utils/artistImages.js";
import { sameRelease } from "../utils/chartHelpers.js";
import { API_BASE, resolveMediaUrl } from "../api/config.js";
import EntryThumb from "./EntryThumb.jsx";

// Module-level cache: artist name (lowercase) → resolved image URL (or "" if none found).
// Persists across re-renders and chart switches so each artist is only fetched once.
const _artistImgCache = new Map();

// Flag-derived accent colors shared with the Year End country tags.
const COUNTRY_ACCENTS = {
  BB: "#00267F", CA: "#D80621", CD: "#007FFF", CI: "#F77F00", CL: "#D52B1E", DE: "#FFCE00", FR: "#0055A4",
  GB: "#012169", GH: "#CE1126", IN: "#FF9933", JM: "#009B3A", KE: "#006600",
  KR: "#CD2E3A", NG: "#008751", NO: "#BA0C2F", PR: "#ED0000", RW: "#00A1DE", SE: "#006AA7",
  TZ: "#1EB53A", UG: "#D90000", US: "#3C3B6E", ZA: "#007749", ZW: "#319208",
};

function regionBadge(code) {
  const key = String(code || "").trim().toUpperCase();
  return { accent: COUNTRY_ACCENTS[key] || "#69716B" };
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
  isDark = false,
}) {
  const mobile = useRealMobile(isMobile);
  const safeGutter = mobile ? "clamp(20px, 5vw, 28px)" : "28px";
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
  const isKenyanChart = plat === "Kenyan";

  const chartTitle = "NGOMA TOP 50";
  const kenyanChartLabel = isArtistsChart ? "Kenyan Artists" : (isSingles ? "Kenyan Songs" : "Kenyan Albums");
  const chartRegion = isKenyanChart ? `(${kenyanChartLabel.toUpperCase()})` : "(KENYA)";
  const chartDisplayTitle = `${chartTitle} ${chartRegion}`;
  const chartLabel = isArtistsChart ? "Artists" : (isSingles ? "Singles" : "Albums");
  const platformLabel = liveChartMeta?.platform || (isKenyanChart ? kenyanChartLabel : (plat === "Combined" ? "Combined" : PLAT_LABEL[plat] || plat));
  const chartAccent = isKenyanChart ? COUNTRY_ACCENTS.KE : (plat === "Combined" ? GOLD : PC[plat] || GOLD);
  const chartAccentInk = plat === "BOOMPLAY" ? "#007C7C" : chartAccent;

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

    return {
      lastMonth,
      peak,
    };
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
      });
    }

    const value = firstDetailValue(
      item,
      [
        "cover_image",
        "artwork",
        "artwork_url",
        "artworkUrl",
        "cover",
        "cover_url",
        "coverUrl",
        "cover_art",
        "album_art",
        "thumbnail",
        "thumbnail_url",
      ],
      ""
    );
    return value && value !== "—" ? value : "";
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
            ...(mobile ? { fontSize: "9.5px" } : null),
            ...(darkMode ? styles.detailCardLabelDark : null),
          }}
        >
          {label}
        </span>
        <span
          style={{
            ...styles.detailCardValue,
            ...(mobile ? { fontSize: "13px" } : null),
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
          {compact && <DetailCard label="L.M" value={profile.lastMonth} />}
          {compact && <DetailCard label="Peak" value={profile.peak} />}
          {hasCountry && <DetailCard label="Country" value={countryLabel} accent={badge.accent} />}
          {isCombinedChart && <DetailCard label="Platforms" value={getPlatformDetails(item)} />}
          {isCombinedChart && <DetailCard label="Points" value={Number(item.pts || 0).toLocaleString()} />}
          {isCombinedChart && <DetailCard label="Entries" value={item.entries_count || "—"} />}
          <DetailCard label="Months" value={item.months_on_chart || "—"} />
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
        {compact && <DetailCard label="L.M" value={profile.lastMonth} />}
        {compact && <DetailCard label="Peak" value={profile.peak} />}
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
        const firstDir = key === "platforms" ? "desc" : "asc";
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
      fontSize: mobile ? (topThree ? "15px" : "13.5px") : (topThree ? "17px" : "15px"),
      fontWeight: 850,
      ...(mobile
        ? { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }
        : { whiteSpace: "normal", overflow: "visible", textOverflow: "clip" }),
    };
  }

  function toggleRow(rowKey) {
    setExpandedRowKey((current) => (current === rowKey ? null : rowKey));
  }

  useEffect(() => {
    setExpandedRowKey(null);
  }, [ct, month, plat, vc]);

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
                setPlat("Combined");
              }}
              style={{
                ...styles.toggleButton,
                background: active ? chartAccent : (darkMode ? "transparent" : "#ffffff"),
                color: active ? (darkMode ? "#F6F3EA" : "#090909") : (darkMode ? "#B8BDB8" : "#111111"),
                borderColor: active ? chartAccent : (darkMode ? "transparent" : "rgba(0,0,0,0.14)"),
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
      <div
        className={label === "Plat." ? "ngoma-platform-cell" : undefined}
        style={{
          ...styles.mobileMiniStat,
          ...(darkMode ? styles.mobileMiniStatDark : null),
        }}
      >
        <span style={{ ...styles.mobileMiniStatLabel, ...(darkMode ? styles.mobileMiniStatLabelDark : null) }}>
          {label}
        </span>
        <span style={{ ...styles.mobileMiniStatValue, ...(darkMode ? styles.mobileMiniStatValueDark : null) }}>
          {value}
        </span>
      </div>
    );
  }

  const sourceLabel = new Date().toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const isCombinedChart = plat === "Combined" || isKenyanChart;

  // A single continuously-scrolling "conveyor belt" strip of the full Top 50
  // for whatever's active right now — Top Singles / Top Albums / Top Artists —
  // rendered as cover-art cards (releases) or circular avatars (artists).
  // Auto-scrolls via rAF (not a CSS animation) so it can be grabbed and
  // dragged/flicked by the user to fast-track through the strip.
  const marqueeItems = data;
  const marqueeCardW = isArtistsChart ? (mobile ? 84 : 96) : (mobile ? 126 : 152);
  const marqueeGap = isArtistsChart ? (mobile ? 16 : 22) : (mobile ? 12 : 16);
  const MARQUEE_SPEED_PX_PER_SEC = 55; // "fair" pace — tuned so a card is comfortably readable as it passes

  const marqueeViewportRef = useRef(null);
  const marqueeTrackRef = useRef(null);
  const marqueeHoveredRef = useRef(false);
  const marqueeDragRef = useRef({ dragging: false, startX: 0, startScrollLeft: 0, lastX: 0, lastT: 0, velocity: 0, dragDistance: 0, suppressClickUntil: 0, downTarget: null });

  useEffect(() => {
    const viewport = marqueeViewportRef.current;
    const track = marqueeTrackRef.current;
    if (!viewport || !track || !marqueeItems.length) return undefined;

    const reduceMotion = typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

    let rafId;
    let lastTime = null;

    const step = (time) => {
      rafId = requestAnimationFrame(step);
      if (lastTime === null) { lastTime = time; return; }
      const dt = (time - lastTime) / 1000;
      lastTime = time;
      const drag = marqueeDragRef.current;
      if (reduceMotion || drag.dragging || marqueeHoveredRef.current) return;
      const setWidth = track.scrollWidth / 2;
      if (setWidth <= 0) return;
      let next = viewport.scrollLeft + MARQUEE_SPEED_PX_PER_SEC * dt;
      if (next >= setWidth) next -= setWidth;
      viewport.scrollLeft = next;
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [marqueeItems.length]);

  function marqueeGlide(startVelocity) {
    const viewport = marqueeViewportRef.current;
    const track = marqueeTrackRef.current;
    if (!viewport || !track) return;
    let velocity = startVelocity;
    let lastT = null;
    const frame = (time) => {
      if (marqueeDragRef.current.dragging) return;
      if (lastT === null) { lastT = time; requestAnimationFrame(frame); return; }
      const dt = (time - lastT) / 1000;
      lastT = time;
      velocity *= 0.94;
      if (Math.abs(velocity) < 4) return;
      const setWidth = track.scrollWidth / 2;
      if (setWidth > 0) {
        let next = viewport.scrollLeft + velocity * dt;
        if (next < 0) next += setWidth;
        if (next >= setWidth) next -= setWidth;
        viewport.scrollLeft = next;
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  function handleMarqueePointerDown(event) {
    const viewport = marqueeViewportRef.current;
    if (!viewport) return;
    const drag = marqueeDragRef.current;
    drag.dragging = true;
    drag.startX = event.clientX;
    drag.startScrollLeft = viewport.scrollLeft;
    drag.lastX = event.clientX;
    drag.lastT = performance.now();
    drag.velocity = 0;
    drag.dragDistance = 0;
    drag.downTarget = event.target;
    viewport.style.cursor = "grabbing";
    viewport.setPointerCapture?.(event.pointerId);
  }

  function handleMarqueePointerMove(event) {
    const drag = marqueeDragRef.current;
    if (!drag.dragging) return;
    const viewport = marqueeViewportRef.current;
    const track = marqueeTrackRef.current;
    if (!viewport || !track) return;
    const dx = event.clientX - drag.startX;
    drag.dragDistance = Math.max(drag.dragDistance, Math.abs(dx));
    const setWidth = track.scrollWidth / 2;
    let next = drag.startScrollLeft - dx;
    if (setWidth > 0) {
      next = ((next % setWidth) + setWidth) % setWidth;
    }
    viewport.scrollLeft = next;
    const now = performance.now();
    const dt = now - drag.lastT;
    if (dt > 0) drag.velocity = (event.clientX - drag.lastX) / dt;
    drag.lastX = event.clientX;
    drag.lastT = now;
  }

  function handleMarqueePointerUp(event) {
    const drag = marqueeDragRef.current;
    if (!drag.dragging) return;
    drag.dragging = false;
    const viewport = marqueeViewportRef.current;
    if (viewport) {
      viewport.style.cursor = "grab";
      viewport.releasePointerCapture?.(event.pointerId);
    }
    if (drag.dragDistance > 6) {
      drag.suppressClickUntil = performance.now() + 80;
      if (Math.abs(drag.velocity) > 0.03) marqueeGlide(-drag.velocity * 1000);
    } else {
      // setPointerCapture above retargets the native click event that
      // normally follows pointerup to the viewport itself, so the card
      // button never sees it — fire the button's click directly instead.
      const card = drag.downTarget?.closest?.("button");
      if (card) card.click();
    }
    drag.downTarget = null;
  }

  function handleMarqueeClickCapture(event) {
    const drag = marqueeDragRef.current;
    if (drag.suppressClickUntil && performance.now() < drag.suppressClickUntil) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  const highlightLabelStyle = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontFamily: F,
    fontSize: mobile ? "11px" : "12px",
    fontWeight: 850,
    letterSpacing: "1.6px",
    textTransform: "uppercase",
    color: darkMode ? "#F6F3EA" : "#1A1A1A",
  };
  const highlightCountStyle = {
    marginLeft: "auto",
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.4px",
    textTransform: "none",
    color: darkMode ? "#8F968F" : "#69716B",
  };
  const edgeFadeStyle = (side = "right") => ({
    position: "absolute",
    top: 0,
    [side]: 0,
    bottom: 0,
    width: "56px",
    pointerEvents: "none",
    zIndex: 2,
    background: side === "right"
      ? `linear-gradient(90deg, transparent, ${darkMode ? "#10140F" : "#FFFFFF"} 82%)`
      : `linear-gradient(270deg, transparent, ${darkMode ? "#10140F" : "#FFFFFF"} 82%)`,
  });

  function renderMarqueeCard(item, key) {
    if (isArtistsChart) {
      const rank = Number(item.rank) || 0;
      const medalColor = rank >= 1 && rank <= 3 ? MEDALS[rank - 1] : chartAccent;
      return (
        <button
          type="button"
          className="ngoma-artist-avatar"
          key={key}
          onClick={() => openRelease(item)}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "9px",
            width: marqueeCardW,
            flexShrink: 0,
            border: 0,
            background: "transparent",
            cursor: "pointer",
            padding: 0,
            fontFamily: F,
          }}
          title={item.title}
        >
          <div style={{ position: "relative" }}>
            <EntryThumb item={item} name={item.title} isArtist size={marqueeCardW} accent={chartAccent} />
            <span
              style={{
                position: "absolute",
                bottom: "-4px",
                right: "-4px",
                minWidth: "20px",
                height: "20px",
                padding: "0 5px",
                borderRadius: "999px",
                background: medalColor,
                color: "#050505",
                fontSize: "10px",
                fontWeight: 900,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: darkMode ? "0 0 0 2px #10140F" : "0 0 0 2px #ffffff",
              }}
            >
              {rank}
            </span>
          </div>
          <span
            style={{
              fontSize: mobile ? "11px" : "12px",
              fontWeight: 700,
              color: darkMode ? "#F6F3EA" : "#111111",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "100%",
            }}
          >
            {item.title}
          </span>
        </button>
      );
    }

    const art = getArtworkUrl(item);
    const label = getArtworkLabel(item);
    const mv = movement(item);
    const mvStyle = movementStyle(item);
    return (
      <button
        type="button"
        className="ngoma-rising-card"
        key={key}
        onClick={() => openRelease(item)}
        style={{
          width: marqueeCardW,
          flexShrink: 0,
          border: 0,
          background: "transparent",
          cursor: "pointer",
          padding: 0,
          textAlign: "left",
          fontFamily: F,
        }}
      >
        <div
          className="ngoma-rising-art"
          style={{
            position: "relative",
            width: marqueeCardW,
            height: marqueeCardW,
            borderRadius: "13px",
            overflow: "hidden",
            background: `linear-gradient(135deg, ${chartAccent}44 0%, ${darkMode ? "#111" : "#e8e8e8"} 100%)`,
            // Without its own compositing layer, this rounded/clipped box can
            // fail to clip its absolutely-positioned children (rank number,
            // NEW/RE badge) while the ancestor button is mid hover-transform —
            // a known browser bug where content briefly leaks past the
            // border-radius during a parent transform.
            transform: "translateZ(0)",
            WebkitMaskImage: "-webkit-radial-gradient(white, black)",
          }}
        >
          {art ? (
            <img src={art} alt="" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", fontWeight: 900, color: chartAccent }}>{label}</div>
          )}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0) 46%)",
              pointerEvents: "none",
            }}
          />
          <span
            style={{
              position: "absolute",
              left: "10px",
              bottom: "8px",
              fontSize: mobile ? "24px" : "30px",
              fontWeight: 900,
              color: "#FFFFFF",
              lineHeight: 1,
              letterSpacing: "-1px",
              textShadow: "0 2px 10px rgba(0,0,0,0.5)",
            }}
          >
            {item.rank}
          </span>
          {(mv.type === "new" || mv.type === "reentry") && (
            <span
              style={{
                position: "absolute",
                top: "8px",
                right: "8px",
                fontSize: "10px",
                fontWeight: 900,
                letterSpacing: "0.4px",
                color: mvStyle.color,
                background: darkMode ? "rgba(11,14,11,0.85)" : "rgba(255,255,255,0.92)",
                borderRadius: "5px",
                padding: "2px 6px",
              }}
            >
              {mv.label}
            </span>
          )}
        </div>
        <div
          style={{
            marginTop: "9px",
            fontSize: mobile ? "12px" : "13px",
            fontWeight: 800,
            color: darkMode ? "#F6F3EA" : "#050505",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {item.title}
        </div>
        <div
          style={{
            fontSize: mobile ? "11px" : "12px",
            color: darkMode ? "#8F968F" : "#69716B",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {item.primary_artist || item.artist}
        </div>
      </button>
    );
  }

  return (
    <>
      <style>{`
        .ngoma-marquee-viewport { user-select: none; -webkit-user-select: none; }
        .ngoma-marquee-viewport::-webkit-scrollbar { display: none; }
        .ngoma-marquee-track { will-change: scroll-position; }
        .ngoma-marquee-track a, .ngoma-marquee-track button { -webkit-user-drag: none; }
        .ngoma-rising-card, .ngoma-artist-avatar { transition: transform 0.22s ease; }
        .ngoma-rising-card:hover, .ngoma-rising-card:focus-visible { transform: translateY(-5px); }
        .ngoma-artist-avatar:hover, .ngoma-artist-avatar:focus-visible { transform: translateY(-3px); }
        .ngoma-table-row {
          transition: transform 0.16s ease, box-shadow 0.16s ease;
          position: relative;
          z-index: 1;
        }
        .ngoma-table-row:hover {
          transform: translateY(-2px) scale(1.003);
          box-shadow: ${darkMode ? `0 10px 24px rgba(0,0,0,0.4), 0 0 0 1px ${chartAccent}40` : `0 10px 24px rgba(31,36,31,0.10), 0 0 0 1px ${chartAccent}30`};
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
        .ngoma-dot-btn { transition: width 0.32s ease, background 0.32s ease; }
        .ngoma-carousel-arrow {
          width: 30px; height: 30px; border-radius: 50%;
          cursor: pointer; font-size: 16px; line-height: 1;
          display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(8px); transition: opacity 0.2s;
        }
        .ngoma-carousel-arrow:hover { opacity: 0.7; }
        .ngoma-chart-row-stripe:nth-child(even) { background: ${darkMode ? "#121612" : "transparent"} !important; }
        .ngoma-chart-row-stripe:nth-child(odd)  { background: ${darkMode ? "#0f120f" : "transparent"} !important; }
      `}</style>
      <div className={`ngoma-premium-charts ${darkMode ? "ngoma-premium-charts-dark" : ""}`} style={{...styles.page, padding: mobile ? `0 ${safeGutter} 28px` : "0 28px 34px", boxSizing: "border-box"}}>
      <section
        style={{
          ...styles.hero,
          background: darkMode ? "#0b0e0b" : "#ffffff",
          maxWidth: pageMax,
          margin: "0 auto",
          boxSizing: "border-box",
          padding: mobile ? "28px 0 24px" : "42px 0 38px",
          opacity: loaded ? 1 : 0,
          transform: loaded ? "none" : "translateY(8px)",
        }}
      >

        <div style={{...styles.heroGlow,background:`linear-gradient(120deg, ${chartAccent}12 0%, transparent 54%, ${chartAccent}08 100%)`}} />

        <div
          style={{
            ...styles.eyebrowRow,
            color: darkMode ? "rgba(255,255,255,0.5)" : "#69716b",
            fontSize: mobile ? "10px" : "11px",
            marginBottom: 0,
          }}
        >
          <span style={{ opacity: 0.65, letterSpacing: "0.5px" }}>{sourceLabel}</span>
          <span style={{color: chartAccent}}>/</span>
          <span>{platformLabel}</span>
          {liveChartLoading && (
            <>
              <span style={{color: chartAccent}}>/</span>
              <span>Loading</span>
            </>
          )}
        </div>

        <div
          className="ngoma-hero-main"
          style={{
            ...styles.heroMain,
            gridTemplateColumns: (!mobile && heroItems.length > 0) ? `minmax(260px, 1fr) auto` : "1fr",
            gap: heroItems.length > 0 ? (mobile ? "22px" : "28px") : 0,
            alignItems: "stretch",
            justifyContent: "space-between",
          }}
        >
          {/* ── Left: chart title ── */}
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
            <h1
              className="ngoma-chart-hero-title"
              aria-label={chartDisplayTitle}
              style={{
                ...styles.heroTitle,
                color: darkMode ? "rgba(255,255,255,0.92)" : "#050505",
                fontSize: mobile ? "30px" : "72px",
                letterSpacing: mobile ? "-0.45px" : "-2.6px",
                lineHeight: mobile ? 0.96 : 0.9,
                margin: mobile ? "28px 0 28px" : "38px 0 38px",
              }}
            >
              <span style={{ display: "block", whiteSpace: "nowrap" }}>{chartTitle}</span>
              <span
                style={{
                  display: "block",
                  marginTop: mobile ? "7px" : "10px",
                  fontFamily: "Inter, Arial, sans-serif",
                  fontSize: mobile ? "14px" : "24px",
                  fontWeight: 900,
                  lineHeight: 1,
                  letterSpacing: mobile ? "2.4px" : "4px",
                  color: chartAccentInk,
                  whiteSpace: "nowrap",
                }}
              >
                {chartRegion}
              </span>
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
                  color: darkMode ? "rgba(255,255,255,0.65)" : "#050505",
                }}
              >
                {month}
              </span>
            </div>
          </div>

          {/* ── Right: full-bleed auto-sliding showcase, cycles the whole Top 50 ── */}
          {heroItems.length > 0 && (() => {
            const item        = heroItems[slideIdx] || heroItems[0];
            const isArtist    = isArtistsChart || !!item?.is_artist_entry;
            const artProfile  = isArtist ? managedArtistForItem(item) : {};
            const img         = isArtist
              ? (artistImageOverrides[String(item?.title || "").trim().toLowerCase()] || artProfile?.image || getArtworkUrl(item) || "")
              : getArtworkUrl(item);
            const cardTitle   = isArtist
              ? (item.title || item.n || item.a || "")
              : (item.title || item.t || "");
            const cardSub     = isArtist
              ? [artProfile?.genre || item.genre, artProfile?.city_region || item.city_region].filter(Boolean).join(" · ")
              : (item.primary_artist || item.artist_display || item.artist || item.a || "");
            // All-time Combined Top 50 points: sum this release's Combined
            // score across every month it has charted, not just the active
            // tab's scope or the current month alone.
            const pts = !isArtist
              ? MONTHS.reduce((sum, m) => {
                  const entry = (getCombined(ct, m) || []).find((e) => sameRelease(e, item));
                  return sum + Number(entry?.total_points ?? entry?.pts ?? 0);
                }, 0)
              : Number(item.total_points ?? item.pts ?? 0);
            const rank        = Number(item.rank || item.r || slideIdx + 1);
            const mvmt        = movement(item);
            const mvStyle     = movementStyle(item);
            const cert        = isArtist ? null : certificationForEntry(item, isSingles ? "single" : "album");
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

            const cardBorder = darkMode ? "#242923" : "#EFEDE7";
            const cardShadow  = darkMode
              ? `0 0 0 1px ${cardBorder}, 0 14px 36px rgba(0,0,0,0.5)`
              : `0 0 0 1px ${cardBorder}, 0 14px 36px rgba(31,36,31,0.14)`;
            const arrowBorder = `${chartAccent}99`;
            const arrowBg     = `${chartAccent}44`;
            const arrowColor  = chartAccent;

            return (
              <div
                className="ngoma-hero-showcase"
                style={{
                  position: "relative",
                  borderRadius: "22px",
                  overflow: "hidden",
                  background: `linear-gradient(135deg, ${chartAccent}55 0%, ${darkMode ? "#161a16" : "#2a2a2a"} 100%)`,
                  width: mobile ? "75%" : "clamp(240px, 24vw, 345px)",
                  aspectRatio: "1 / 1",
                  cursor: "pointer",
                  boxShadow: cardShadow,
                  justifySelf: "end",
                  marginRight: mobile ? 0 : "76px",
                }}
                onMouseEnter={pauseTimer}
                onMouseLeave={resumeTimer}
                onClick={() => openRelease(item)}
              >
                {/* Full-bleed art */}
                {img && (
                  <img
                    key={`hero-img-${slideIdx}`}
                    src={img}
                    alt=""
                    className="ngoma-hero-slide"
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                )}

                {/* Bottom-up scrim so the details stay legible over the dominant image */}
                <div style={{
                  position: "absolute", inset: 0, pointerEvents: "none",
                  background: "linear-gradient(0deg, rgba(6,7,6,0.92) 0%, rgba(6,7,6,0.72) 26%, rgba(6,7,6,0.2) 54%, rgba(6,7,6,0.02) 72%, rgba(6,7,6,0.22) 100%)",
                }} />

                {/* Rank number, top-right corner */}
                <div
                  key={`wm-${slideIdx}`}
                  style={{
                    position: "absolute", top: "16px", right: "20px",
                    fontSize: "clamp(32px, 4vw, 44px)", fontWeight: 900, lineHeight: 1,
                    fontFamily: F, color: "#FFFFFF",
                    textShadow: "0 4px 16px rgba(0,0,0,0.55)",
                    pointerEvents: "none", userSelect: "none",
                    letterSpacing: "-1.5px", zIndex: 2,
                  }}
                >{rank}</div>

                {/* Top-left type chip */}
                <div style={{
                  position: "absolute", top: "20px", left: "24px", zIndex: 2,
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  padding: "6px 11px", borderRadius: "999px",
                  background: "rgba(6,7,6,0.55)", backdropFilter: "blur(6px)",
                  fontSize: "11px", fontWeight: 800, letterSpacing: "1px",
                  textTransform: "uppercase", color: "#FFFFFF", fontFamily: F,
                }}>
                  <span>{isArtist ? "Artist" : isSingles ? "Single" : "Album"}</span>
                </div>

                {/* Text block, bottom */}
                <div
                  key={`slide-${slideIdx}`}
                  className="ngoma-hero-slide"
                  style={{ position: "absolute", left: "24px", right: "24px", bottom: "48px", zIndex: 2 }}
                >
                  <div style={{
                    fontSize: "clamp(20px, 2.2vw, 27px)", fontWeight: 850,
                    color: "#FFFFFF",
                    lineHeight: 1.15, marginBottom: "6px",
                    fontFamily: SF,
                    textShadow: "0 2px 12px rgba(0,0,0,0.55)",
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}>{cardTitle || "—"}</div>

                  {cardSub && (
                    <div style={{
                      fontSize: "14px",
                      color: "rgba(255,255,255,0.82)",
                      marginBottom: "12px",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      fontFamily: F,
                      textShadow: "0 1px 8px rgba(0,0,0,0.5)",
                    }}>{cardSub}</div>
                  )}

                  <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                    {pts > 0 && (
                      <span style={{
                        fontSize: "12px", fontWeight: 700,
                        color: "#FFFFFF",
                        background: "rgba(255,255,255,0.16)",
                        border: "1px solid rgba(255,255,255,0.3)",
                        borderRadius: "5px", padding: "3px 9px",
                        fontFamily: F,
                        letterSpacing: "0.3px",
                        backdropFilter: "blur(4px)",
                      }}>{pts.toLocaleString()} pts</span>
                    )}
                    <span style={{
                      fontSize: "12px", fontWeight: 800,
                      color: mvStyle.color,
                      background: "rgba(6,7,6,0.5)",
                      borderRadius: "5px", padding: "3px 8px",
                      fontFamily: F,
                      backdropFilter: "blur(4px)",
                    }}>{mvmt.label}</span>
                    {cert && <CertificationTag entry={item} />}
                  </div>
                </div>

                {/* Bottom-right: prev / next arrows */}
                <div className="ngoma-hero-controls" style={{
                  position: "absolute", right: "18px", bottom: "16px", zIndex: 2,
                  display: "flex", gap: "6px",
                }}>
                  <button
                    type="button"
                    aria-label="Show previous entry"
                    className="ngoma-carousel-arrow"
                    style={{ borderColor: arrowBorder, background: arrowBg, color: arrowColor }}
                    onClick={e => { e.stopPropagation(); setSlideIdx(i => (i - 1 + heroItems.length) % heroItems.length); }}
                  >‹</button>
                  <button
                    type="button"
                    aria-label="Show next entry"
                    className="ngoma-carousel-arrow"
                    style={{ borderColor: arrowBorder, background: arrowBg, color: arrowColor }}
                    onClick={e => { e.stopPropagation(); setSlideIdx(i => (i + 1) % heroItems.length); }}
                  >›</button>
                </div>
              </div>
            );
          })()}
        </div>
      </section>


      <section
        style={{
          ...styles.controls,
          background: darkMode ? "#0b0e0b" : "#ffffff",
          borderBottom: `1px solid ${darkMode ? "#1f261f" : "#EAEAE6"}`,
          maxWidth: pageMax,
          margin: "0 auto",
          boxSizing: "border-box",
          flexDirection: mobile ? "column" : "row",
          alignItems: mobile ? "stretch" : "center",
          padding: mobile ? "16px 18px" : "16px 28px",
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
              const color = item === "Kenyan" ? COUNTRY_ACCENTS.KE : (item === "Combined" ? GOLD : PC[item] || GOLD);
              const ink = item === "BOOMPLAY" ? "#007C7C" : color;
              const label = item === "Kenyan" ? "Kenyan Top 50" : (item === "Combined" ? item : PLAT_LABEL[item] || item);

              return (
                <button
                  key={item}
                  onClick={() => setPlat(item)}
                  style={{
                    ...styles.platformButton,
                    padding: mobile ? "9px 15px" : "8px 12px",
                    borderColor: active ? color : (darkMode ? "#2F352F" : "rgba(0,0,0,0.12)"),
                    background: active ? `${color}18` : (darkMode ? "#151815" : "#ffffff"),
                    color: active ? ink : (darkMode ? "#B8BDB8" : "#6b7280"),
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

      {marqueeItems.length > 0 && (
        <section
          style={{
            maxWidth: pageMax,
            margin: "0 auto",
            padding: mobile ? "18px 18px 0" : "24px 28px 0",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              background: darkMode ? "#10140F" : "#FFFFFF",
              border: `1px solid ${darkMode ? "#242923" : "#EFEDE7"}`,
              borderRadius: "18px",
              boxShadow: darkMode ? "0 10px 28px rgba(0,0,0,0.34)" : "0 10px 28px rgba(31,36,31,0.05)",
              padding: mobile ? "20px 0" : "26px 0",
              boxSizing: "border-box",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: mobile ? "0 18px 16px" : "0 26px 18px" }}>
              <div style={highlightLabelStyle}>
                <span style={{ width: "14px", height: "2px", borderRadius: "1px", background: chartAccent, display: "inline-block" }} />
                Top {chartLabel}
                <span style={highlightCountStyle}>{month}</span>
              </div>
            </div>
            <div
              ref={marqueeViewportRef}
              className="ngoma-marquee-viewport"
              style={{ position: "relative", overflow: "hidden", cursor: "grab", touchAction: "pan-y" }}
              onPointerDown={handleMarqueePointerDown}
              onPointerMove={handleMarqueePointerMove}
              onPointerUp={handleMarqueePointerUp}
              onPointerCancel={handleMarqueePointerUp}
              onPointerLeave={(event) => { marqueeHoveredRef.current = false; handleMarqueePointerUp(event); }}
              onPointerEnter={() => { marqueeHoveredRef.current = true; }}
              onClickCapture={handleMarqueeClickCapture}
            >
              <div
                ref={marqueeTrackRef}
                className="ngoma-marquee-track"
                style={{
                  display: "flex",
                  gap: `${marqueeGap}px`,
                  width: "max-content",
                  padding: mobile ? "0 18px 6px" : "0 26px 6px",
                }}
              >
                {[0, 1].map((setIndex) =>
                  marqueeItems.map((item) => renderMarqueeCard(item, `marquee-${setIndex}-${item.rank}-${item.title}`))
                )}
              </div>
              <div style={edgeFadeStyle("left")} />
              <div style={edgeFadeStyle("right")} />
            </div>
          </div>
        </section>
      )}

      <section
        style={{
          ...styles.tableShell,
          borderTop: mobile ? "none" : `3px solid ${chartAccent}`,
          maxWidth: pageMax,
          width: "100%",
          margin: mobile ? "16px auto 28px" : "24px auto 34px",
          boxSizing: "border-box",
          borderRadius: 0,
        }}
      >
        {!mobile && (
          <div style={{...styles.tableHeader, background: darkMode ? "#0f120f" : "#f0ede6", borderBottom: `2px solid ${chartAccent}33`, color: darkMode ? "#8a9288" : "#3d4440"}}>
            <span
              style={{ ...styles.headerCell, cursor: "pointer" }}
              onClick={() => handleSort("rank")}
              title="Sort by position"
            >
              #{sortArrow("rank")}
            </span>
            <span style={styles.headerCell}>Move</span>
            <span style={styles.headerEntryCell}>{isArtistsChart ? "Artist" : (isSingles ? "Song" : "Album")}</span>
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
            const medalColor = item.rank <= 3 ? MEDALS[item.rank - 1] : "#050505";
            const artistCountry = getArtistCountry(item);
            const badge = regionBadge(artistCountry.code);
            const certification = isArtistsChart ? null : certificationForEntry(item, isSingles ? "single" : "album");
            const rowKey = getRowKey(item, index);
            const expanded = expandedRowKey === rowKey;

            if (mobile) {

              return (
                <div
                  key={rowKey}
                  style={{
                    ...styles.mobileRow,
                    ...(darkMode ? styles.mobileRowDark : null),
                    boxShadow: expanded
                      ? `inset 4px 0 0 ${chartAccent}, 0 8px 22px rgba(0,0,0,${darkMode ? "0.26" : "0.045"})`
                      : (darkMode ? "0 2px 10px rgba(0,0,0,0.16)" : "0 2px 10px rgba(0,0,0,0.025)"),
                    animationDelay: `${Math.min(index * 20, 400)}ms`,
                    maxWidth: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  <div
                    style={{ ...styles.mobileCompactRow, cursor: "pointer" }}
                    onClick={() => toggleRow(rowKey)}
                    role="button"
                    aria-expanded={expanded}
                  >
                    <div style={{ ...styles.mobileRank, color: medalColor }}>{item.rank}</div>
                    <ReleaseArtwork item={item} size={56} />

                    <div style={styles.mobileEntryMain}>
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

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleRow(rowKey);
                      }}
                      style={{ ...styles.mobileDetailsToggle, ...(darkMode ? styles.mobileDetailsToggleDark : null) }}
                      aria-label={expanded ? "Hide chart details" : "Show chart details"}
                      aria-expanded={expanded}
                    >
                      {expanded ? "▴" : "▾"}
                    </button>
                  </div>

                  {expanded && (
                    <div style={{ ...styles.mobileExpandedDetails, ...(darkMode ? styles.mobileExpandedDetailsDark : null) }}>
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
                      fontSize: item.rank === 1 ? "26px" : item.rank <= 3 ? "22px" : undefined,
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
                    <ReleaseArtwork item={item} size={66} />

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

                  <div style={{ ...styles.metaNumber, ...(darkMode ? styles.metaNumberDark : null) }}>{profile.lastMonth}</div>
                  <div style={{ ...styles.metaNumber, ...(darkMode ? styles.metaNumberDark : null) }}>{profile.peak}</div>
                  <button
                    type="button"
                    onClick={() => toggleRow(rowKey)}
                    style={{ ...styles.desktopDetailsToggle, ...(darkMode ? styles.desktopDetailsToggleDark : null) }}
                    aria-label={expanded ? "Hide chart details" : "Show chart details"}
                    aria-expanded={expanded}
                  >
                    {expanded ? "▴" : "▾"}
                  </button>
                </div>

                {expanded && (
                  <div style={{ ...styles.desktopExpandedDetails, ...(darkMode ? styles.desktopExpandedDetailsDark : null) }}>
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
    letterSpacing: "1.1px",
    textTransform: "uppercase",
    color: "#69716b",
  },

  eyebrowDivider: {
    color: "#B8860B",
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
    color: "#B8860B",
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
    background: "rgba(184,134,11,0.14)",
    color: "#B8860B",
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
    background: "rgba(184,134,11,0.14)",
    color: "#B8860B",
    fontSize: "13px",
    fontWeight: 900,
    letterSpacing: "1px",
    textTransform: "uppercase",
  },

  tableHeader: {
    display: "grid",
    gridTemplateColumns: "54px 90px minmax(0, 1fr) 110px 86px 82px",
    gap: "30px",
    alignItems: "center",
    justifyItems: "center",
    padding: "12px 24px",
    background: "#f0ede6",
    color: "#3d4440",
    fontSize: "10px",
    fontWeight: 900,
    letterSpacing: "0.9px",
    textTransform: "uppercase",
    borderBottom: "2px solid rgba(184,134,11,0.20)",
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
    display: "grid",
    gap: "10px",
  },

  row: {
    display: "grid",
    gridTemplateColumns: "54px 90px minmax(0, 1fr) 110px 86px 82px",
    gap: "30px",
    alignItems: "center",
    padding: "20px 24px",
    borderBottom: "1px solid rgba(0,0,0,0.08)",
    color: "#050505",
    animation: "fadeUp 0.35s ease both",
    transition: "background 180ms ease, box-shadow 180ms ease",
  },

  mobileRow: {
    padding: "18px 18px",
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: "16px",
    background: "#ffffff",
    color: "#050505",
    animation: "fadeUp 0.35s ease both",
    transition: "background 180ms ease, box-shadow 180ms ease",
  },

  mobileRowDark: {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "#0F120F",
    color: "#F6F3EA",
  },

  mobileRowTop: {
    display: "grid",
    gridTemplateColumns: "42px minmax(0, 1fr) 54px",
    gap: "10px",
    alignItems: "center",
  },

  mobileCompactRow: {
    display: "grid",
    gridTemplateColumns: "34px 56px minmax(0, 1fr) max-content",
    gap: "10px",
    alignItems: "center",
    minWidth: 0,
    maxWidth: "100%",
  },

  mobileMovementWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "6px",
    minWidth: 0,
    maxWidth: "100%",
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

  mobileDetailsToggleDark: {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "#151815",
    color: "#fffdf7",
    boxShadow: "0 2px 10px rgba(0,0,0,0.22)",
  },

  mobileExpandedDetails: {
    margin: "12px 0 0",
    padding: "14px 16px 12px",
    border: "1px solid rgba(0,0,0,0.06)",
    borderRadius: "14px",
    background: "#fbfaf7",
    boxShadow: "none",
    animation: "slideDown 220ms ease both",
  },

  mobileExpandedDetailsDark: {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "#0b0e0b",
    color: "#fffdf7",
    boxShadow: "none",
  },

  mobileCountryRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "11px",
    minWidth: 0,
  },

  mobileDetailLabel: {
    fontSize: "8.5px",
    color: "#777777",
    fontWeight: 900,
    letterSpacing: "1px",
    textTransform: "uppercase",
  },

  mobileDetailValue: {
    marginTop: "3px",
    fontSize: "11px",
    color: "#050505",
    fontWeight: 900,
    overflowWrap: "anywhere",
  },

  mobileRank: {
    fontSize: "22px",
    fontWeight: 950,
    lineHeight: 1,
  },

  mobileEntryMain: {
    minWidth: 0,
    maxWidth: "100%",
  },

  mobileStatsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "8px",
    marginTop: "12px",
  },

  mobileMiniStat: {
    background: "#f7f7f7",
    border: "1px solid rgba(0,0,0,0.06)",
    borderRadius: "12px",
    padding: "8px 6px",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box",
  },

  mobileMiniStatDark: {
    background: "#151815",
    border: "1px solid rgba(255,255,255,0.10)",
    color: "#fffdf7",
  },

  mobileMiniStatLabel: {
    display: "block",
    fontSize: "8px",
    color: "#777777",
    fontWeight: 900,
    letterSpacing: "1px",
    textTransform: "uppercase",
    textAlign: "center",
  },

  mobileMiniStatLabelDark: {
    color: "#c8d0c8",
  },

  mobileMiniStatValue: {
    display: "block",
    marginTop: "4px",
    color: "#050505",
    fontSize: "11px",
    fontWeight: 900,
    textAlign: "center",
    whiteSpace: "normal",
    overflow: "visible",
    textOverflow: "clip",
  },


  mobileMiniStatValueDark: {
    color: "#fffdf7",
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
    fontSize: "18px",
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
    fontSize: "11px",
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
    fontSize: "15px",
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
