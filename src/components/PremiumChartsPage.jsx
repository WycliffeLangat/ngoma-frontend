import { useEffect, useMemo, useRef, useState } from "react";

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
  if (managedArtist?.country_code) {
    const managedCountry = publicCountry(managedArtist.country_code);
    return {
      flag: managedCountry?.flag || countryCodeToFlag(managedArtist.country_code),
      country: managedCountry?.name || managedArtist.country || "",
      code: String(managedArtist.country_code).trim().toUpperCase(),
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
    };
  }

  return {
    flag: "",
    country: "",
    code: "",
  };
}

export default function PremiumChartsPage({
  isMobile,
  loaded,
  F,
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

  const darkMode = Boolean(isDark || detectedDarkMode);
  const isArtistsChart = ct === "artists";
  const isKenyanChart = plat === "Kenyan";

  const chartTitle = "NGOMA TOP 50";
  const chartRegion = isKenyanChart ? "(KENYAN SONGS)" : "(KENYA)";
  const chartDisplayTitle = `${chartTitle} ${chartRegion}`;
  const chartLabel = isArtistsChart ? "Artists" : (isSingles ? "Singles" : "Albums");
  const platformLabel = liveChartMeta?.platform || (isKenyanChart ? "Kenyan Songs" : (plat === "Combined" ? "Combined" : PLAT_LABEL[plat] || plat));
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
      <span style={styles.artistLinksWrap}>
        {tokens.map((token, tokenIndex) => {
          if (token.type === "separator") {
            return (
              <span
                key={`${token.value}-${tokenIndex}`}
                style={{ ...styles.artistSeparator, ...(darkMode ? styles.artistSeparatorDark : null) }}
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
              style={{ ...styles.artistButton, ...(darkMode ? styles.artistButtonDark : null) }}
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
        "image",
        "image_url",
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

  function ReleaseArtwork({ item, size = 50 }) {
    const artworkUrl = getArtworkUrl(item);
    const label = getArtworkLabel(item);

    return (
      <div
        style={{
          ...styles.releaseArtwork,
          width: size,
          height: size,
          minWidth: size,
          borderRadius: 0,
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
        <span style={{ ...styles.detailCardLabel, ...(darkMode ? styles.detailCardLabelDark : null) }}>
          {label}
        </span>
        <span
          style={{
            ...styles.detailCardValue,
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
    if (item?.artist_profile) return item.artist_profile;
    const publicData = typeof window !== "undefined" ? (window.__NGOMA_PUBLIC_DATA__ || {}) : {};
    const requestedName = String(item?.title || item?.primary_artist || item?.artist || "").trim().toLowerCase();
    return (publicData.artists || []).find((artist) =>
      [artist.name, artist.display_name, artist.public_name, ...(artist.aliases || [])]
        .some((name) => String(name || "").trim().toLowerCase() === requestedName)
    ) || {};
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
    const compactMove = compact ? movement(item) : null;
    const compactMoveStyle = compact ? movementStyle(item) : null;
    return (
      <div style={gridStyle}>
        {compact && <DetailCard label="Move" value={compactMove.label || "—"} accent={compactMoveStyle.color} />}
        {compact && <DetailCard label="L.M" value={profile.lastMonth} />}
        {compact && <DetailCard label="Peak" value={profile.peak} />}
        {primaryCredit && <DetailCard label="Main artist(s)" value={primaryCredit} wide />}
        {featuredCredit && <DetailCard label="Featuring" value={featuredCredit} wide />}
        {getSongwriterDetails(item) !== "—" && <DetailCard label="Songwriter(s)" value={getSongwriterDetails(item)} wide />}
        {getProducerDetails(item) !== "—" && <DetailCard label="Producer(s)" value={getProducerDetails(item)} wide />}
        <DetailCard label="Release year" value={getReleaseYear(item)} />
      </div>
    );
  }

  // ----- Sortable columns -------------------------------------------------
  // Default ("rank"/"asc") preserves the chart's natural order.
  const [sort, setSort] = useState({ key: "rank", dir: "asc" });

  // Top-5 hero carousel ─────────────────────────────────────────────────────
  const [slideIdx, setSlideIdx] = useState(0);
  const slideTimerRef = useRef(null);
  const top5 = useMemo(
    () => [...data].sort((a, b) => Number(a.rank) - Number(b.rank)).slice(0, 5),
    [data]
  );

  useEffect(() => {
    setSlideIdx(0);
    clearInterval(slideTimerRef.current);
    if (top5.length > 1) {
      slideTimerRef.current = setInterval(
        () => setSlideIdx(i => (i + 1) % top5.length),
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

  return (
    <>
      <style>{`
        .ngoma-premium-charts-dark .ngoma-title-link,
        .ngoma-premium-charts-dark .ngoma-title-link:visited,
        .ngoma-premium-charts-dark .ngoma-title-link:hover,
        .ngoma-app-shell[data-theme="dark"] .ngoma-premium-charts .ngoma-title-link,
        .ngoma-app-shell[data-theme="dark"] .ngoma-premium-charts .ngoma-title-link:visited,
        .ngoma-app-shell[data-theme="dark"] .ngoma-premium-charts .ngoma-title-link:hover {
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
          style={{
            ...styles.heroMain,
            gridTemplateColumns: (!mobile && top5.length > 0) ? `minmax(260px, 44%) 1fr` : "1fr",
            gap: (!mobile && top5.length > 0) ? "28px" : 0,
            alignItems: "stretch",
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

          {/* ── Right: Top-5 auto-sliding showcase ── */}
          {!mobile && top5.length > 0 && (() => {
            const item        = top5[slideIdx] || top5[0];
            const isArtist    = isArtistsChart || !!item?.is_artist_entry;
            const artProfile  = isArtist ? managedArtistForItem(item) : {};
            const img         = isArtist
              ? (artProfile?.image || getArtworkUrl(item))
              : getArtworkUrl(item);
            const cardTitle   = isArtist
              ? (item.title || item.n || item.a || "")
              : (item.title || item.t || "");
            const cardSub     = isArtist
              ? [artProfile?.genre || item.genre, artProfile?.city_region || item.city_region].filter(Boolean).join(" · ")
              : (item.primary_artist || item.artist_display || item.artist || item.a || "");
            const pts         = Number(item.total_points || item.pts || 0);
            const rank        = Number(item.rank || item.r || slideIdx + 1);
            const mvmt        = movement(item);
            const mvStyle     = movementStyle(item);
            const rankPillBg  = chartAccent;
            const cert        = isArtist ? null : certificationForEntry(item, isSingles ? "single" : "album");
            const pauseTimer  = () => clearInterval(slideTimerRef.current);
            const resumeTimer = () => {
              clearInterval(slideTimerRef.current);
              if (top5.length > 1) {
                slideTimerRef.current = setInterval(
                  () => setSlideIdx(i => (i + 1) % top5.length),
                  3800
                );
              }
            };

            // Theme-aware card tokens
            const cardBg      = darkMode ? "#141814" : "#FFFFFF";
            const cardShadow  = darkMode
              ? `0 0 0 1px rgba(255,255,255,0.12), 0 8px 32px rgba(0,0,0,0.55)`
              : `0 0 0 1px rgba(0,0,0,0.08), 0 12px 40px rgba(0,0,0,0.14)`;
            const textPrimary = darkMode ? "#FFFFFF"              : "#0A0A0A";
            const textSub     = darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.55)";

            const dotInactive = darkMode ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.18)";
            const arrowBorder = `${chartAccent}99`;
            const arrowBg     = `${chartAccent}44`;
            const arrowColor  = chartAccent;
            const mvFallbackBg = darkMode ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)";

            return (
              <div
                style={{
                  position: "relative",
                  borderRadius: "20px",
                  overflow: "hidden",
                  background: cardBg,
                  display: "flex",
                  flexDirection: "column",
                  cursor: "pointer",
                  boxShadow: cardShadow,
                }}
                onMouseEnter={pauseTimer}
                onMouseLeave={resumeTimer}
                onClick={() => openRelease(item)}
              >
                {/* Blurred art backdrop — dark mode only */}
                {img && darkMode && (
                  <div style={{
                    position: "absolute", inset: 0, pointerEvents: "none",
                    backgroundImage: `url(${img})`,
                    backgroundSize: "cover", backgroundPosition: "center",
                    filter: "blur(32px) brightness(0.22) saturate(1.4)",
                    transform: "scale(1.18)",
                  }} />
                )}

                {/* Gradient overlay */}
                <div style={{
                  position: "absolute", inset: 0, pointerEvents: "none",
                  background: darkMode
                    ? `linear-gradient(145deg, ${chartAccent}18 0%, rgba(20,24,20,0.78) 50%, rgba(10,13,10,0.97) 100%)`
                    : `linear-gradient(145deg, ${chartAccent}08 0%, rgba(255,255,255,0) 60%)`,
                }} />

                {/* Left accent stripe */}
                <div style={{
                  position: "absolute", top: 0, left: 0,
                  width: "3px", height: "100%",
                  background: `linear-gradient(to bottom, ${chartAccent}, ${chartAccent}55)`,
                  zIndex: 2,
                }} />

                {/* Large rank watermark — direct card child so overflow:hidden doesn't clip it */}
                <div
                  key={`wm-${slideIdx}`}
                  style={{
                    position: "absolute", right: "36px", top: "22px",
                    fontSize: "100px", fontWeight: 900, lineHeight: 1,
                    fontFamily: "'IBM Plex Sans Condensed', Helvetica, sans-serif",
                    color: chartAccent,
                    pointerEvents: "none", userSelect: "none",
                    letterSpacing: "-4px",
                    zIndex: 20,
                  }}
                >{rank}</div>

                {/* Main content */}
                <div
                  key={`slide-${slideIdx}`}
                  className="ngoma-hero-slide"
                  style={{
                    position: "relative", zIndex: 3,
                    flex: 1, display: "flex", gap: "20px",
                    padding: "22px 22px 16px 26px", alignItems: "center",
                  }}
                >
                  {/* Cover art */}
                  <div style={{
                    width: "120px", height: "120px", minWidth: "120px",
                    borderRadius: "12px", overflow: "hidden", flexShrink: 0,
                    boxShadow: darkMode
                      ? "0 12px 36px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)"
                      : "0 8px 24px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)",
                    background: `linear-gradient(135deg, ${chartAccent}44 0%, ${darkMode ? "#111" : "#e8e8e8"} 100%)`,
                    position: "relative",
                  }}>
                    {img ? (
                      <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    ) : (
                      <div style={{
                        width: "100%", height: "100%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "28px", fontWeight: 900, color: chartAccent,
                        fontFamily: "'IBM Plex Sans Condensed', Helvetica, sans-serif",
                      }}>#{rank}</div>
                    )}
                    {/* Rank pill on art */}
                    <div style={{
                      position: "absolute", top: "5px", left: "5px",
                      minWidth: "22px", height: "22px", borderRadius: "11px",
                      padding: "0 6px",
                      background: rankPillBg,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "10px", fontWeight: 900, color: "#FFF",
                      fontFamily: "'IBM Plex Sans Condensed', Helvetica, sans-serif",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                      letterSpacing: "0.3px",
                      zIndex: 20,
                    }}>#{rank}</div>
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0, position: "relative" }}>

                    {/* Eyebrow */}
                    <div style={{
                      fontSize: "11px", fontWeight: 800, letterSpacing: "1.6px",
                      textTransform: "uppercase", color: chartAccent,
                      marginBottom: "8px",
                      fontFamily: "'IBM Plex Sans Condensed', Helvetica, sans-serif",
                      display: "flex", alignItems: "center", gap: "6px",
                    }}>
                      <span>{slideIdx + 1} / {top5.length}</span>
                      <span style={{ width: "3px", height: "3px", borderRadius: "50%", background: `${chartAccent}88`, display: "inline-block" }} />
                      <span>{isArtist ? "Artist" : isSingles ? "Single" : "Album"}</span>
                    </div>

                    {/* Title */}
                    <div style={{
                      fontSize: "22px", fontWeight: 800,
                      color: textPrimary,
                      lineHeight: 1.15, marginBottom: "6px",
                      fontFamily: "'IBM Plex Sans', Helvetica, sans-serif",
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}>{cardTitle || "—"}</div>

                    {/* Subtitle */}
                    {cardSub && (
                      <div style={{
                        fontSize: "15px",
                        color: textSub,
                        marginBottom: "13px",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        fontFamily: "'IBM Plex Sans', Helvetica, sans-serif",
                      }}>{cardSub}</div>
                    )}

                    {/* Badges row */}
                    <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                      {pts > 0 && (
                        <span style={{
                          fontSize: "12px", fontWeight: 700,
                          color: chartAccent,
                          background: `${chartAccent}1A`,
                          border: `1px solid ${chartAccent}44`,
                          borderRadius: "5px", padding: "3px 9px",
                          fontFamily: "'IBM Plex Sans Condensed', Helvetica, sans-serif",
                          letterSpacing: "0.3px",
                        }}>{pts.toLocaleString()} pts</span>
                      )}
                      <span style={{
                        fontSize: "12px", fontWeight: 800,
                        color: mvStyle.color,
                        background: mvStyle.background || mvFallbackBg,
                        borderRadius: "5px", padding: "3px 8px",
                        fontFamily: "'IBM Plex Sans Condensed', Helvetica, sans-serif",
                      }}>{mvmt.label}</span>
                      {cert && <CertificationTag entry={item} />}
                    </div>
                  </div>
                </div>

                {/* Bottom bar: dots + arrows */}
                <div style={{
                  position: "relative", zIndex: 3,
                  display: "flex", alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 18px 16px 26px",
                }}>
                  {/* Dot indicators */}
                  <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                    {top5.map((_, i) => (
                      <button
                        key={i}
                        className="ngoma-dot-btn"
                        onClick={e => { e.stopPropagation(); setSlideIdx(i); }}
                        style={{
                          width: i === slideIdx ? "22px" : "7px",
                          height: "7px",
                          borderRadius: "4px",
                          background: i === slideIdx ? chartAccent : dotInactive,
                          border: "none", padding: 0, cursor: "pointer", flexShrink: 0,
                        }}
                      />
                    ))}
                  </div>

                  {/* Prev / Next */}
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      className="ngoma-carousel-arrow"
                      style={{ borderColor: arrowBorder, background: arrowBg, color: arrowColor }}
                      onClick={e => { e.stopPropagation(); setSlideIdx(i => (i - 1 + top5.length) % top5.length); }}
                    >‹</button>
                    <button
                      className="ngoma-carousel-arrow"
                      style={{ borderColor: arrowBorder, background: arrowBg, color: arrowColor }}
                      onClick={e => { e.stopPropagation(); setSlideIdx(i => (i + 1) % top5.length); }}
                    >›</button>
                  </div>
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

      <section
        style={{
          ...styles.tableShell,
          borderTop:`3px solid ${chartAccent}`,
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

        <div style={styles.rows}>
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
                    animationDelay: `${Math.min(index * 20, 400)}ms`,
                    maxWidth: "100%",
                    boxSizing: "border-box",
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.background = `${chartAccent}0B`;
                    event.currentTarget.style.boxShadow = `inset 4px 0 0 ${chartAccent}`;
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.background = darkMode ? "#0d0f0d" : "transparent";
                    event.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div
                    style={{ ...styles.mobileCompactRow, cursor: "pointer" }}
                    onClick={() => toggleRow(rowKey)}
                    role="button"
                    aria-expanded={expanded}
                  >
                    <div style={{ ...styles.mobileRank, color: medalColor }}>{item.rank}</div>
                    <ReleaseArtwork item={item} size={42} />

                    <div style={styles.mobileEntryMain}>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          openRelease(item);
                        }}
                        className="ngoma-title-link"
                        style={{ ...styles.titleButton, ...(darkMode ? styles.titleButtonDark : null), color: darkMode ? "#FFFFFF" : "#050505" }}
                      >
                        {item.title}{certification && (
                          <span
                            aria-label={`${certification.label} certified`}
                            title={`${certification.label} certified · ${Number(certification.totalPts || 0).toLocaleString()} points`}
                            style={{ marginLeft: "4px", fontSize: "12px", opacity: 0.85, lineHeight: 1, verticalAlign: "middle" }}
                          ><span style={certification.iconFilter ? { filter: certification.iconFilter } : undefined}>{certification.icon}</span></span>
                        )}
                      </button>

                      {isArtistsChart ? (
                        item.artist ? (
                          <div style={{...styles.artistLinksWrap, ...(darkMode ? styles.artistButtonDark : null), cursor:"default"}}>
                            {item.artist}
                          </div>
                        ) : null
                      ) : <ArtistLinks item={item} />}
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
                  style={{
                    ...styles.row,
                    background: darkMode ? "#0d0f0d" : "transparent",
                    color: darkMode ? "#fffdf7" : "#050505",
                    animationDelay: `${Math.min(index * 20, 400)}ms`,
                    ...(item.rank === 1 ? { borderLeft: `3px solid ${chartAccent}` } : {}),
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.background = `${chartAccent}0B`;
                    event.currentTarget.style.boxShadow = `inset 4px 0 0 ${chartAccent}`;
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.background = darkMode ? "#0d0f0d" : "transparent";
                    event.currentTarget.style.boxShadow = item.rank === 1 ? "none" : "none";
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
                    <ReleaseArtwork item={item} size={50} />

                    <div style={styles.entryText}>
                      <button
                        onClick={() => openRelease(item)}
                        className="ngoma-title-link"
                        style={{ ...styles.titleButton, ...(darkMode ? styles.titleButtonDark : null), color: darkMode ? "#FFFFFF" : "#050505" }}
                      >
                        {item.title}{certification && (
                          <span
                            aria-label={`${certification.label} certified`}
                            title={`${certification.label} certified · ${Number(certification.totalPts || 0).toLocaleString()} points`}
                            style={{ marginLeft: "4px", fontSize: "12px", opacity: 0.85, lineHeight: 1, verticalAlign: "middle" }}
                          ><span style={certification.iconFilter ? { filter: certification.iconFilter } : undefined}>{certification.icon}</span></span>
                        )}
                      </button>

                      {isArtistsChart ? (
                        item.artist ? (
                          <div style={{...styles.artistLinksWrap, ...(darkMode ? styles.artistButtonDark : null), cursor:"default"}}>
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
    fontFamily: "'IBM Plex Sans', Helvetica, sans-serif",
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
    gridTemplateColumns: "54px 84px minmax(0, 1fr) 84px 60px 58px",
    gap: "14px",
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

  row: {
    display: "grid",
    gridTemplateColumns: "54px 84px minmax(0, 1fr) 84px 60px 58px",
    gap: "14px",
    alignItems: "center",
    padding: "16px 24px",
    borderBottom: "1px solid rgba(0,0,0,0.08)",
    color: "#050505",
    animation: "fadeUp 0.35s ease both",
    transition: "background 180ms ease, box-shadow 180ms ease",
  },

  mobileRow: {
    padding: "16px 18px",
    borderBottom: "1px solid rgba(0,0,0,0.08)",
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
    gridTemplateColumns: "34px 42px minmax(0, 1fr) max-content",
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
    margin: "8px 4px 12px",
    padding: "14px 16px 12px",
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: "14px",
    background: "#ffffff",
    boxShadow: "0 8px 28px rgba(0,0,0,0.07)",
    animation: "slideDown 220ms ease both",
  },

  mobileExpandedDetailsDark: {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "#0f120f",
    color: "#fffdf7",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.02)",
  },

  mobileCountryRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "11px",
    minWidth: 0,
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
    overflowWrap: "anywhere",
  },

  mobileRank: {
    fontSize: "28px",
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
    fontSize: "9px",
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
    fontSize: "12px",
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
    fontSize: "13px",
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
    padding: "14px 16px",
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
    gap: "10px",
  },

  mobileDetailsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "8px",
  },

  detailCard: {
    background: "#f7f7f7",
    border: "1px solid rgba(0,0,0,0.06)",
    borderRadius: "12px",
    padding: "9px 10px",
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
    fontSize: "9px",
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
    fontSize: "12px",
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
    fontWeight: 700,
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
    color: "#777777",
    padding: 0,
    marginTop: 0,
    textAlign: "left",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "normal",
    overflow: "visible",
    textOverflow: "clip",
  },

  artistButtonDark: {
    color: "#c8d0c8",
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
