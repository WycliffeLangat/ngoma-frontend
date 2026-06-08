import { useEffect, useState } from "react";

const ARTIST_COUNTRY_FALLBACK = {
  "Joel Lwaga": { country: "Tanzania", code: "TZ" },
  "Kifo Cha Mende": { country: "Kenya", code: "KE" },
  Iyanii: { country: "Kenya", code: "KE" },
  Bensoul: { country: "Kenya", code: "KE" },
  "Dyana Cods": { country: "Kenya", code: "KE" },
  Ruger: { country: "Nigeria", code: "NG" },
  Charisma: { country: "Kenya", code: "KE" },
  Zuchu: { country: "Tanzania", code: "TZ" },
  "D Voice": { country: "Tanzania", code: "TZ" },
  Jux: { country: "Tanzania", code: "TZ" },
  Tux: { country: "Tanzania", code: "TZ" },
  "Ayra Starr": { country: "Nigeria", code: "NG" },
  "Kendrick Lamar": { country: "United States", code: "US" },
  Asake: { country: "Nigeria", code: "NG" },
  Nyashinski: { country: "Kenya", code: "KE" },
  Marioo: { country: "Tanzania", code: "TZ" },
  Bien: { country: "Kenya", code: "KE" },
  "Sauti Sol": { country: "Kenya", code: "KE" },
  Wakadinali: { country: "Kenya", code: "KE" },
  "Nikita Kering": { country: "Kenya", code: "KE" },
  "Diamond Platnumz": { country: "Tanzania", code: "TZ" },
  Harmonize: { country: "Tanzania", code: "TZ" },
  Simi: { country: "Nigeria", code: "NG" },
  "Burna Boy": { country: "Nigeria", code: "NG" },
  Rema: { country: "Nigeria", code: "NG" },
  Davido: { country: "Nigeria", code: "NG" },
  Wizkid: { country: "Nigeria", code: "NG" },
  Tyla: { country: "South Africa", code: "ZA" },
  "Chris Brown": { country: "United States", code: "US" },
  "Amiso thwango": { country: "Kenya", code: "KE" },
  "Amiso Thwango": { country: "Kenya", code: "KE" },
  "Big yasa": { country: "Kenya", code: "KE" },
  "Big Yasa": { country: "Kenya", code: "KE" },
  "Bruni Star": { country: "Kenya", code: "KE" },
  "From The Hood Music": { country: "Kenya", code: "KE" },
  "HOOD BOYZ": { country: "Kenya", code: "KE" },
  "Kaka Talanta": { country: "Kenya", code: "KE" },
  Keemlyf: { country: "Kenya", code: "KE" },
  KODONGKLAN: { country: "Kenya", code: "KE" },
  "Koppa Gekon": { country: "Kenya", code: "KE" },
  "Mad Clan": { country: "Kenya", code: "KE" },
  "Mr Right": { country: "Kenya", code: "KE" },
  "Sosa The Prodigy": { country: "Kenya", code: "KE" },
  Soundkraft: { country: "Kenya", code: "KE" },
  Spoiler: { country: "Kenya", code: "KE" },
  "Toby Mr Romantic": { country: "Kenya", code: "KE" },
  "Tonny Young": { country: "Kenya", code: "KE" },
  "Uncle Eddy": { country: "Kenya", code: "KE" },
  "ZIGGY MADUDU": { country: "Kenya", code: "KE" },
  "Geniusjini x66": { country: "Tanzania", code: "TZ" },
  Anni3: { country: "Nigeria", code: "NG" },
  "Excess Van": { country: "Nigeria", code: "NG" },
  "Justin Vibes": { country: "South Africa", code: "ZA" },
  "Minister Danybless": { country: "United States", code: "US" },
  prodbycpkshawn: { country: "Guyana", code: "GY" },
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

        <div
          style={{
            ...styles.platforms,
            flexWrap: mobile ? "nowrap" : "wrap",
            overflowX: mobile ? "auto" : "visible",
            paddingBottom: mobile ? "4px" : 0,
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
                  background: active ? GOLD : "#ffffff",
                  color: active ? "#050505" : "#6b7280",
                  borderColor: active ? GOLD : "#e5e7eb",
                  opacity: disabled ? 0.45 : 1,
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

          <div style={styles.tableRange}>Top {Math.min(vc, data.length)}</div>
        </div>

        {!mobile && (
          <div style={styles.tableHeader}>
            <span style={styles.headerCell}>#</span>
            <span style={styles.headerCell}>Move</span>
            <span style={styles.headerEntryCell}>Entry</span>
            <span style={styles.headerCell}>Last Month</span>
            <span style={styles.headerCell}>Peak</span>
            <span style={styles.headerCell}>Weeks</span>
            <span style={styles.headerCell}>Platforms</span>
          </div>
        )}

        <div style={styles.rows}>
          {display.map((item, index) => {
            const profile = getReleaseProfile(item);
            const move = movement(item);
            const moveStyle = movementStyle(item);
            const medalColor = item.rank <= 3 ? MEDALS[item.rank - 1] : "#050505";
            const artistCountry = getArtistCountry(item);

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
                  <div style={styles.mobileCompactRow}>
                    <div style={{ ...styles.mobileRank, color: medalColor }}>{item.rank}</div>

                    <div style={styles.mobileEntryMain}>
                      <button onClick={() => openRelease(item)} style={styles.titleButton}>
                        {item.title}
                      </button>

                      <button onClick={() => openArtist(item.artist)} style={styles.artistButton}>
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
                        onClick={() => toggleMobileRow(rowKey)}
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
                          }}
                          title={`${artistCountry.country}${
                            artistCountry.code ? ` (${artistCountry.code})` : ""
                          }`}
                        >
                          <span style={styles.flagText}>{artistCountry.code || "—"}</span>
                        </div>

                        <div>
                          <div style={styles.mobileDetailLabel}>Country</div>
                          <div style={styles.mobileDetailValue}>
                            {artistCountry.country || "Country not set"}
                            {artistCountry.code ? ` (${artistCountry.code})` : ""}
                          </div>
                        </div>
                      </div>

                      <div style={styles.mobileStatsRow}>
                        <MobileStat label="L.M" value={profile.lastMonth} />
                        <MobileStat label="Peak" value={profile.peak} />
                        <MobileStat label="Wks" value={profile.weeks} />
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
                <div style={{ ...styles.rank, color: medalColor }}>{item.rank}</div>

                <div
                  style={{
                    ...styles.moveBadge,
                    color: moveStyle.color,
                    background: moveStyle.background,
                  }}
                >
                  {move.label || "—"}
                </div>

                <div style={styles.entryCell}>
                  <div
                    style={styles.flagBox}
                    title={`${artistCountry.country}${
                      artistCountry.code ? ` (${artistCountry.code})` : ""
                    }`}
                  >
                    <span style={styles.flagText}>{artistCountry.code || "—"}</span>
                  </div>

                  <div style={styles.entryText}>
                    <button onClick={() => openRelease(item)} style={styles.titleButton}>
                      {item.title}
                    </button>

                    <button onClick={() => openArtist(item.artist)} style={styles.artistButton}>
                      {item.artist}
                    </button>
                  </div>
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
          Showing {display.length} of {data.length} · {month} · {platformLabel}
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
    color: "#777777",
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
    fontSize: "10px",
    letterSpacing: "2.4px",
    textTransform: "uppercase",
    color: "#777777",
    fontWeight: 800,
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
    color: "#777777",
    fontWeight: 700,
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
    gridTemplateColumns: "64px 78px minmax(0, 1fr) 96px 70px 76px 96px",
    gap: "12px",
    alignItems: "center",
    justifyItems: "center",
    padding: "14px 22px",
    background: "#f7f7f7",
    color: "#777777",
    fontSize: "10px",
    fontWeight: 900,
    letterSpacing: "1.7px",
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
    gridTemplateColumns: "64px 78px minmax(0, 1fr) 96px 70px 76px 96px",
    gap: "12px",
    alignItems: "center",
    padding: "16px 22px",
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
};