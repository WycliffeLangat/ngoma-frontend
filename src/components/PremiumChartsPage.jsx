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
  const chartTitle = isSingles ? "Ngoma Top 50" : "Ngoma Top Albums";
  const chartLabel = isSingles ? "Singles" : "Albums";
  const platformLabel =
    liveChartMeta?.platform || (plat === "Combined" ? "Combined" : PLAT_LABEL[plat] || plat);

  function movement(item) {
    if (item.movement) {
      const text = String(item.movement).trim();

      if (text.toLowerCase() === "new") return { type: "new", label: "NEW" };
      if (text.toLowerCase() === "re") return { type: "re", label: "RE" };
      if (text === "=" || text === "—") return { type: "same", label: "—" };
      if (text.startsWith("▲") || text.startsWith("+")) {
        return { type: "up", label: text.replace("+", "▲ ") };
      }
      if (text.startsWith("▼") || text.startsWith("-")) {
        return { type: "down", label: text.replace("-", "▼ ") };
      }

      return { type: "same", label: text };
    }

    if (item.first) return { type: "new", label: "NEW" };

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

    if (m.type === "up") return { color: "#21C45D", background: "rgba(33,196,93,0.12)" };
    if (m.type === "down") return { color: "#EF4444", background: "rgba(239,68,68,0.12)" };
    if (m.type === "new") return { color: GOLD, background: "rgba(184,134,11,0.18)" };
    if (m.type === "re") return { color: "#60A5FA", background: "rgba(96,165,250,0.14)" };

    return { color: "rgba(255,255,255,0.55)", background: "rgba(255,255,255,0.07)" };
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

  function getCountryDisplay(item) {
    const code =
      item.artist_country_code ||
      item.country_code ||
      item.artistCountryCode ||
      "";

    const country =
      item.artist_country ||
      item.country ||
      item.artistCountry ||
      "";

    if (code) return String(code).toUpperCase();
    if (country) return String(country).slice(0, 3).toUpperCase();

    return "—";
  }

  function getCountryTitle(item) {
    const code =
      item.artist_country_code ||
      item.country_code ||
      item.artistCountryCode ||
      "";

    const country =
      item.artist_country ||
      item.country ||
      item.artistCountry ||
      "";

    if (country && code) return `${country} (${String(code).toUpperCase()})`;
    if (country) return country;
    if (code) return String(code).toUpperCase();

    return "Artist country not added";
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
                background: active ? GOLD : "rgba(255,255,255,0.08)",
                color: active ? "#090909" : "#ffffff",
                borderColor: active ? GOLD : "rgba(255,255,255,0.14)",
              }}
            >
              {item}
            </button>
          );
        })}
      </div>
    );
  }

  const sourceLabel = liveStatus === "live" ? "Live database" : "Static preview";
  const perfectCoverageCount = data.filter((item) => item.plat === `${tp}/${tp}`).length;
  const newEntriesCount = data.filter((item) => movement(item).type === "new").length;

  return (
    <div style={styles.page}>
      <section
        style={{
          ...styles.hero,
          padding: isMobile ? "28px 18px 24px" : "46px 44px 40px",
          opacity: loaded ? 1 : 0,
          transform: loaded ? "none" : "translateY(8px)",
        }}
      >
        <div style={styles.heroGlow} />

        <div style={styles.eyebrowRow}>
          <span
            style={{
              ...styles.liveDot,
              background: liveStatus === "live" ? "#22C55E" : "#9CA3AF",
              boxShadow:
                liveStatus === "live"
                  ? "0 0 0 4px rgba(34,197,94,0.14)"
                  : "0 0 0 4px rgba(156,163,175,0.12)",
            }}
          />
          <span>{sourceLabel}</span>
          <span style={styles.eyebrowDivider}>/</span>
          <span>{month}</span>
          <span style={styles.eyebrowDivider}>/</span>
          <span>{platformLabel}</span>
          {liveChartLoading && (
            <>
              <span style={styles.eyebrowDivider}>/</span>
              <span>Loading</span>
            </>
          )}
        </div>

        <div style={styles.heroMain}>
          <div style={styles.heroLeft}>
            <div style={styles.logoRow}>
              <MiniBars GOLD={GOLD} />
              <div>
                <div style={styles.logoText}>
                  NGOMA <span style={{ color: GOLD }}>CHARTS</span>
                </div>
                <div style={styles.logoSub}>Music ranking intelligence</div>
              </div>
            </div>

            <h1 style={{ ...styles.heroTitle, fontSize: isMobile ? "40px" : "76px" }}>
              {chartTitle}
            </h1>

            <div style={styles.heroMeta}>
              <span>{chartLabel}</span>
              <span>{platformLabel}</span>
              <span>{month}</span>
            </div>
          </div>

          <div style={styles.numberOneCard}>
            <div style={styles.numberOneLabel}>#1 this month</div>

            <div style={styles.numberOneRank}>1</div>

            <button onClick={() => top && openRelease(top)} style={styles.numberOneTitle}>
              {top?.title || "—"}
            </button>

            <button onClick={() => top && openArtist(top.artist)} style={styles.numberOneArtist}>
              {top?.artist || ""}
            </button>

            {top?.plat && <div style={styles.coveragePill}>{top.plat} platforms</div>}
          </div>
        </div>
      </section>

      <section style={styles.statsBand}>
        {[
          {
            label: "Entries",
            value: data.length,
            sub: isSingles ? "songs" : "albums",
          },
          {
            label: "Perfect coverage",
            value: perfectCoverageCount,
            sub: `${tp}/${tp} platforms`,
          },
          {
            label: "New entries",
            value: newEntriesCount,
            sub: "this month",
          },
          {
            label: "Chart leader",
            value: top?.title || "—",
            sub: top?.artist || "",
            compact: true,
          },
        ].map((item, index) => (
          <div key={item.label} style={styles.statItem}>
            <div style={styles.statLabel}>{item.label}</div>
            <div
              style={{
                ...styles.statValue,
                fontSize: item.compact ? "18px" : "30px",
                color: index === 3 ? GOLD : "#ffffff",
              }}
            >
              {item.value}
            </div>
            <div style={styles.statSub}>{item.sub}</div>
          </div>
        ))}
      </section>

      <section style={styles.controls}>
        <ChartToggle />

        <select
          value={month}
          onChange={(event) => setMonth(event.target.value)}
          style={styles.select}
        >
          {MONTHS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <div style={styles.platforms}>
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
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div style={styles.viewOptions}>
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
                  background: active ? "#111111" : "#ffffff",
                  color: active ? "#ffffff" : "#6b7280",
                  opacity: disabled ? 0.45 : 1,
                }}
              >
                {item.l}
              </button>
            );
          })}
        </div>
      </section>

      <section style={styles.tableShell}>
        <div style={styles.tableTop}>
          <div>
            <div style={styles.tableTitle}>{chartTitle}</div>
            <div style={styles.tableSub}>
              {chartLabel} · {platformLabel} · {month}
            </div>
          </div>

          <div style={styles.tableRange}>Top {Math.min(vc, data.length)}</div>
        </div>

        <div style={styles.tableHeader}>
          <span>#</span>
          <span>Move</span>
          <span>Entry</span>
          <span>Last</span>
          <span>Peak</span>
          <span>Wks</span>
          <span>Plat.</span>
        </div>

        <div style={styles.rows}>
          {display.map((item, index) => {
            const profile = getReleaseProfile(item);
            const move = movement(item);
            const moveStyle = movementStyle(item);
            const medalColor = item.rank <= 3 ? MEDALS[item.rank - 1] : "#ffffff";
            const countryDisplay = getCountryDisplay(item);
            const countryTitle = getCountryTitle(item);

            return (
              <div
                key={`${item.title}-${item.artist}-${item.rank}-${index}`}
                style={{
                  ...styles.row,
                  animationDelay: `${Math.min(index * 20, 400)}ms`,
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
                  <div style={styles.countryBox} title={countryTitle}>
                    <span>{countryDisplay}</span>
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
      <rect x="0" y="15" width="3.5" height="9" fill="#ffffff" rx="0.5" />
      <rect x="5.5" y="10" width="3.5" height="14" fill="#ffffff" rx="0.5" />
      <rect x="11" y="5" width="3.5" height="19" fill={GOLD} rx="0.5" />
      <rect x="16.5" y="0" width="3.5" height="24" fill="#ffffff" rx="0.5" />
    </svg>
  );
}

const styles = {
  page: {
    background: "#070707",
    color: "#ffffff",
    minHeight: "60vh",
  },

  hero: {
    position: "relative",
    overflow: "hidden",
    background:
      "radial-gradient(circle at 85% 5%, rgba(184,134,11,0.20), transparent 34%), linear-gradient(135deg, #080808 0%, #171717 56%, #0B0B0B 100%)",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    transition: "all 0.5s ease-out",
  },

  heroGlow: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(90deg, rgba(184,134,11,0.08), transparent 35%, rgba(255,255,255,0.04))",
    pointerEvents: "none",
  },

  eyebrowRow: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "2.6px",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.58)",
    marginBottom: "32px",
  },

  liveDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
  },

  eyebrowDivider: {
    color: "rgba(184,134,11,0.65)",
  },

  heroMain: {
    position: "relative",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(260px, 360px)",
    gap: "28px",
    alignItems: "end",
  },

  heroLeft: {
    minWidth: 0,
  },

  logoRow: {
    display: "flex",
    gap: "16px",
    alignItems: "center",
    marginBottom: "30px",
  },

  logoText: {
    fontSize: "24px",
    fontWeight: 900,
    letterSpacing: "4px",
  },

  logoSub: {
    marginTop: "4px",
    fontSize: "11px",
    letterSpacing: "2px",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.45)",
  },

  heroTitle: {
    margin: 0,
    lineHeight: 0.92,
    fontWeight: 950,
    letterSpacing: "-3px",
    textTransform: "uppercase",
  },

  heroMeta: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginTop: "22px",
  },

  numberOneCard: {
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "28px",
    padding: "24px",
    boxShadow: "0 26px 60px rgba(0,0,0,0.35)",
    backdropFilter: "blur(10px)",
  },

  numberOneLabel: {
    fontSize: "11px",
    fontWeight: 900,
    letterSpacing: "2.5px",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.5)",
  },

  numberOneRank: {
    marginTop: "12px",
    fontSize: "96px",
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
    color: "#ffffff",
    fontSize: "28px",
    fontWeight: 900,
    lineHeight: 1.05,
    cursor: "pointer",
  },

  numberOneArtist: {
    border: "none",
    background: "transparent",
    padding: 0,
    marginTop: "8px",
    color: "rgba(255,255,255,0.62)",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
  },

  coveragePill: {
    display: "inline-flex",
    marginTop: "18px",
    padding: "8px 13px",
    borderRadius: "999px",
    background: "rgba(184,134,11,0.16)",
    color: "#D6A21C",
    fontSize: "12px",
    fontWeight: 900,
  },

  statsBand: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    background: "#121212",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },

  statItem: {
    padding: "18px 24px",
    borderRight: "1px solid rgba(255,255,255,0.08)",
    minWidth: 0,
  },

  statLabel: {
    fontSize: "10px",
    letterSpacing: "2.4px",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.38)",
    fontWeight: 800,
  },

  statValue: {
    marginTop: "8px",
    fontWeight: 950,
    lineHeight: 1,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  statSub: {
    marginTop: "6px",
    fontSize: "12px",
    color: "rgba(255,255,255,0.35)",
  },

  controls: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
    padding: "16px 28px",
    background: "#ffffff",
    color: "#111111",
    borderBottom: "1px solid #EAEAE6",
  },

  toggleWrap: {
    display: "flex",
    gap: "6px",
    padding: "4px",
    borderRadius: "999px",
    background: "#111111",
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
    fontSize: "13px",
    fontWeight: 700,
    outline: "none",
  },

  platforms: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
  },

  platformButton: {
    border: "1.5px solid",
    borderRadius: "999px",
    background: "#ffffff",
    padding: "8px 12px",
    fontSize: "12px",
    fontWeight: 800,
    cursor: "pointer",
  },

  viewOptions: {
    marginLeft: "auto",
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
    margin: "24px 28px 34px",
    background: "#101010",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: "26px",
    overflow: "hidden",
    boxShadow: "0 30px 80px rgba(0,0,0,0.28)",
  },

  tableTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "20px",
    alignItems: "center",
    padding: "24px 26px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },

  tableTitle: {
    fontSize: "24px",
    fontWeight: 950,
    letterSpacing: "-0.5px",
  },

  tableSub: {
    marginTop: "6px",
    fontSize: "12px",
    color: "rgba(255,255,255,0.42)",
    fontWeight: 700,
    letterSpacing: "1.2px",
    textTransform: "uppercase",
  },

  tableRange: {
    padding: "10px 14px",
    borderRadius: "999px",
    background: "rgba(184,134,11,0.18)",
    color: "#D6A21C",
    fontSize: "13px",
    fontWeight: 900,
    letterSpacing: "1px",
    textTransform: "uppercase",
  },

  tableHeader: {
    display: "grid",
    gridTemplateColumns: "64px 78px minmax(0, 1fr) 70px 70px 70px 80px",
    gap: "12px",
    alignItems: "center",
    padding: "14px 22px",
    background: "#161616",
    color: "rgba(255,255,255,0.38)",
    fontSize: "10px",
    fontWeight: 900,
    letterSpacing: "2px",
    textTransform: "uppercase",
  },

  rows: {
    display: "flex",
    flexDirection: "column",
  },

  row: {
    display: "grid",
    gridTemplateColumns: "64px 78px minmax(0, 1fr) 70px 70px 70px 80px",
    gap: "12px",
    alignItems: "center",
    padding: "16px 22px",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
    background: "linear-gradient(90deg, rgba(255,255,255,0.035), transparent)",
    animation: "fadeUp 0.35s ease both",
  },

  rank: {
    fontSize: "34px",
    fontWeight: 950,
    lineHeight: 1,
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
    gap: "14px",
    alignItems: "center",
    minWidth: 0,
  },

  countryBox: {
    width: "50px",
    height: "50px",
    borderRadius: "12px",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(135deg, rgba(184,134,11,0.95), rgba(255,255,255,0.08))",
    color: "#111111",
    fontSize: "14px",
    fontWeight: 950,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },

  entryText: {
    minWidth: 0,
  },

  titleButton: {
    display: "block",
    maxWidth: "100%",
    border: "none",
    background: "transparent",
    color: "#ffffff",
    padding: 0,
    textAlign: "left",
    fontSize: "17px",
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
    color: "rgba(255,255,255,0.48)",
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
    color: "rgba(255,255,255,0.74)",
    fontSize: "15px",
    fontWeight: 900,
    textAlign: "center",
  },

  platformCell: {
    justifySelf: "center",
    padding: "6px 9px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.68)",
    fontSize: "12px",
    fontWeight: 900,
  },

  tableFooter: {
    padding: "16px 22px",
    textAlign: "center",
    color: "rgba(255,255,255,0.36)",
    fontSize: "12px",
    fontWeight: 700,
  },
};
