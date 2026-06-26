export default function ArtistChartSection({ ctx, title = "Top Artists", description = "Artist rankings from credited appearances across the Combined Top 50.", compactIntro = false }) {
  const {
    CountryBadge,
    F,
    GOLD,
    MEDALS,
    MONTHS,
    PAD,
    SF,
    TXT,
    Tog,
    artistMonth,
    artistTrendFor,
    artists,
    cmp1,
    cmp2,
    cmpA1,
    cmpA2,
    expandedArtistRows,
    isDark,
    isMobile,
    getArtistImageUrl,
    openArtistDetails,
    setArtistMonth,
    setCmpA1,
    setCmpA2,
    toggleArtistRow,
  } = ctx;

  const surface = isDark ? "#0F120F" : "#FFFFFF";
  const elevated = isDark ? "#151915" : "#FBFAF7";
  const cardBorder = isDark ? "#2F352F" : "rgba(0,0,0,0.08)";
  const text = isDark ? "#F6F3EA" : "#050505";
  const muted = isDark ? "#B8BDB8" : "#59645D";

  const ArtistAvatar = ({ artist, size = 42, compact = false, style = {} }) => {
    const name = typeof artist === "string" ? artist : artist?.n || artist?.title || artist?.name || "";
    const image = getArtistImageUrl?.(typeof artist === "string" ? { title: name } : artist, { name });
    if (image) {
      return (
        <img
          src={image}
          alt={name}
          loading="lazy"
          decoding="async"
          style={{
            width: size,
            height: size,
            minWidth: size,
            borderRadius: compact ? "10px" : "12px",
            objectFit: "cover",
            display: "block",
            flexShrink: 0,
            border: `1px solid ${cardBorder}`,
            ...style,
          }}
        />
      );
    }
    return <CountryBadge artist={name} compact={compact} style={{ minWidth: size, width: size, height: size, borderRadius: compact ? "10px" : "12px", padding: 0, flexShrink: 0, ...style }} />;
  };

  const metricRows = [
    { label: "Total Points", a: cmp1.p || 0, b: cmp2.p || 0, fmt: (value) => Number(value || 0).toLocaleString(), hi: "max" },
    { label: "Best Artist Rank", a: cmp1.pk || 999, b: cmp2.pk || 999, fmt: (value) => value === 999 ? "—" : `#${value}`, hi: "min" },
    { label: "Months Active", a: cmp1.m || 0, b: cmp2.m || 0, fmt: (value) => value, hi: "max" },
    { label: "Entries", a: cmp1.t || 0, b: cmp2.t || 0, fmt: (value) => value, hi: "max" },
  ];

  return (
    <div style={{ padding: PAD, minHeight: "60vh", boxSizing: "border-box", overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "stretch" : "flex-end", marginBottom: isMobile ? "18px" : "22px", gap: isMobile ? "14px" : "20px", flexDirection: isMobile ? "column" : "row" }}>
        <div style={{ maxWidth: isMobile ? "100%" : "660px" }}>
          {!compactIntro && <div style={{ fontFamily: F, fontSize: TXT.kicker, letterSpacing: "2.6px", textTransform: "uppercase", color: GOLD, marginBottom: "6px" }}>Artist chart</div>}
          <h2 style={{ fontSize: TXT.pageTitle, fontWeight: 800, margin: 0, color: text }}>{title}</h2>
          <p style={{ fontFamily: F, fontSize: TXT.lead, color: muted, margin: "4px 0 0", lineHeight: 1.55 }}>{description}</p>
        </div>
        <div style={{ display: "flex", gap: isMobile ? "10px" : "10px", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "center", width: isMobile ? "100%" : "auto" }}>
          <select value={artistMonth} onChange={(event) => setArtistMonth(event.target.value)} style={{ width: isMobile ? "100%" : "auto", padding: isMobile ? "11px 12px" : "8px 12px", border: `1.5px solid ${cardBorder}`, borderRadius: "9px", background: surface, color: text, fontSize: isMobile ? "12.5px" : "10.5px", fontFamily: F, fontWeight: 750, cursor: "pointer", outline: "none" }}>
            {MONTHS.map((month) => <option key={month} value={month}>{month}</option>)}
          </select>
          <Tog sm />
        </div>
      </div>

      <section style={{ background: surface, border: `1px solid ${cardBorder}`, borderRadius: "16px", padding: isMobile ? "16px" : "20px", marginBottom: isMobile ? "18px" : "22px", boxShadow: isDark ? "none" : "0 8px 24px rgba(31,36,31,0.04)" }}>
        <div style={{ fontFamily: F, fontSize: isMobile ? "10px" : "10.5px", fontWeight: 900, letterSpacing: "2px", textTransform: "uppercase", color: GOLD, marginBottom: "12px" }}>Artist comparison</div>
        <div style={{ display: "flex", gap: isMobile ? "9px" : "12px", alignItems: "center", flexDirection: isMobile ? "column" : "row", marginBottom: "16px", flexWrap: "wrap" }}>
          <select value={cmpA1} onChange={(event) => setCmpA1(event.target.value)} style={{ flex: isMobile ? "none" : 1, width: isMobile ? "100%" : "auto", minWidth: 0, padding: isMobile ? "11px 12px" : "9px 12px", border: `1.5px solid ${cardBorder}`, borderRadius: "8px", background: surface, color: text, fontSize: isMobile ? "12px" : "11.5px", fontFamily: F, fontWeight: 700, cursor: "pointer", outline: "none" }}>
            {artists.map((artist) => <option key={artist.n} value={artist.n}>{artist.n}</option>)}
          </select>
          <span style={{ fontFamily: F, fontSize: isMobile ? "10px" : "11px", color: muted, fontWeight: 900, letterSpacing: "1px" }}>vs</span>
          <select value={cmpA2} onChange={(event) => setCmpA2(event.target.value)} style={{ flex: isMobile ? "none" : 1, width: isMobile ? "100%" : "auto", minWidth: 0, padding: isMobile ? "11px 12px" : "9px 12px", border: `1.5px solid ${cardBorder}`, borderRadius: "8px", background: surface, color: text, fontSize: isMobile ? "12px" : "11.5px", fontFamily: F, fontWeight: 700, cursor: "pointer", outline: "none" }}>
            {artists.map((artist) => <option key={artist.n} value={artist.n}>{artist.n}</option>)}
          </select>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? "10px" : "12px", marginBottom: "14px" }}>
          {[{ d: cmp1, c: GOLD }, { d: cmp2, c: "#1565C0" }].map(({ d, c }) => (
            <button key={d.n || c} type="button" onClick={() => openArtistDetails(d.n)} style={{ padding: isMobile ? "13px" : "15px", background: isDark ? `${c}20` : `${c}0D`, borderRadius: "10px", border: isDark ? `1px solid ${c}55` : "none", borderLeft: `3px solid ${c}`, cursor: "pointer", minWidth: 0, textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                <ArtistAvatar artist={d} size={30} compact />
                <div style={{ fontFamily: SF, fontSize: isMobile ? "15px" : "16px", fontWeight: 850, lineHeight: 1.2, whiteSpace: "normal", overflowWrap: "anywhere", color: text }}>{d.n}</div>
              </div>
            </button>
          ))}
        </div>

        <div style={{ width: "100%", maxWidth: isMobile ? "360px" : "none", margin: "0 auto", border: `1px solid ${cardBorder}`, borderRadius: "12px", overflow: "hidden", background: surface }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "minmax(76px,1fr) minmax(100px,0.9fr) minmax(76px,1fr)" : "minmax(130px,1fr) minmax(150px,0.8fr) minmax(130px,1fr)", gap: "8px", alignItems: "center", padding: isMobile ? "10px 9px" : "12px 16px", background: "#1F241F", color: "#FFF" }}>
            <div style={{ fontFamily: F, fontSize: isMobile ? "10px" : "11px", fontWeight: 850, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#E4BE55" }}>{cmp1.n}</div>
            <div style={{ fontFamily: F, fontSize: "9px", fontWeight: 900, letterSpacing: "1.4px", textAlign: "center", textTransform: "uppercase", color: "#C9CEC9" }}>Metric</div>
            <div style={{ fontFamily: F, fontSize: isMobile ? "10px" : "11px", fontWeight: 850, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#72A7E8" }}>{cmp2.n}</div>
          </div>
          {metricRows.map((row, index) => {
            const aWins = row.hi === "max" ? row.a > row.b : row.a < row.b;
            const bWins = row.hi === "max" ? row.b > row.a : row.b < row.a;
            return (
              <div key={row.label} style={{ display: "grid", gridTemplateColumns: isMobile ? "minmax(76px,1fr) minmax(100px,0.9fr) minmax(76px,1fr)" : "minmax(130px,1fr) minmax(150px,0.8fr) minmax(130px,1fr)", alignItems: "stretch", background: isDark ? (index % 2 ? "#121612" : "#0F120F") : (index % 2 ? "#FBFAF7" : "#FFF"), borderBottom: index === metricRows.length - 1 ? "none" : `1px solid ${cardBorder}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: isMobile ? "9px 6px" : "11px 12px", fontFamily: F, fontSize: isMobile ? "13px" : "14px", fontWeight: aWins ? 900 : 800, color: GOLD }}>{row.fmt(row.a)}</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: isMobile ? "9px 5px" : "11px 10px", borderLeft: `1px solid ${cardBorder}`, borderRight: `1px solid ${cardBorder}`, fontFamily: F, fontSize: isMobile ? "8.6px" : "9.5px", letterSpacing: "0.8px", textTransform: "uppercase", color: muted, fontWeight: 850, lineHeight: 1.25 }}>{row.label}</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: isMobile ? "9px 6px" : "11px 12px", fontFamily: F, fontSize: isMobile ? "13px" : "14px", fontWeight: bWins ? 900 : 800, color: "#1565C0" }}>{row.fmt(row.b)}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section style={{ background: surface, border: `1px solid ${cardBorder}`, borderRadius: "16px", padding: isMobile ? "16px" : "20px", boxShadow: isDark ? "none" : "0 8px 24px rgba(31,36,31,0.04)" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "10px", marginBottom: "14px" }}>
          <div style={{ fontFamily: F, fontSize: isMobile ? "10px" : "10.5px", fontWeight: 900, letterSpacing: "2px", textTransform: "uppercase", color: GOLD }}>Top 50 artists</div>
          <div style={{ fontFamily: F, fontSize: "10px", color: muted, fontWeight: 800 }}>Through {artistMonth}</div>
        </div>

        {isMobile ? (
          <div style={{ display: "grid", gap: "10px" }}>
            {artists.slice(0, 50).map((artist, index) => {
              const trend = artistTrendFor(artist);
              const rowKey = `${artist.n}-${index}`;
              const expanded = Boolean(expandedArtistRows[rowKey]);
              const artistStats = [
                { label: "Peak Rank", value: `#${artist.pk}` },
                { label: "Months", value: artist.m },
                { label: "Entries", value: artist.t },
                { label: "Points", value: Number(artist.p || 0).toLocaleString() },
              ];
              return (
                <div key={rowKey} style={{ padding: "15px 16px", border: `1px solid ${cardBorder}`, borderRadius: "16px", background: surface, boxShadow: expanded ? `inset 4px 0 0 ${GOLD}` : "none" }}>
                  <div onClick={() => toggleArtistRow(rowKey)} role="button" aria-expanded={expanded} style={{ display: "grid", gridTemplateColumns: "34px 42px minmax(0,1fr) 38px", gap: "10px", alignItems: "center", cursor: "pointer", minWidth: 0 }}>
                    <div style={{ fontSize: index < 3 ? "28px" : "24px", fontWeight: 950, lineHeight: 1, color: index < 3 ? MEDALS[index] : muted, textAlign: "center", fontFamily: F }}>{index + 1}</div>
                    <ArtistAvatar artist={artist} size={42} />
                    <div style={{ minWidth: 0 }}>
                      <button type="button" onClick={(event) => { event.stopPropagation(); openArtistDetails(artist.n); }} style={{ display: "block", width: "100%", border: 0, background: "transparent", padding: 0, margin: 0, textAlign: "left", fontFamily: SF, fontSize: "15.5px", fontWeight: 850, lineHeight: 1.2, color: text, whiteSpace: "normal", overflowWrap: "anywhere", cursor: "pointer" }}>{artist.n}</button>
                      <div style={{ fontFamily: F, fontSize: "11.5px", fontWeight: 800, color: trend.color, marginTop: "5px", lineHeight: 1.25 }}>{trend.symbol} {trend.shortLabel}</div>
                    </div>
                    <button type="button" onClick={(event) => { event.stopPropagation(); toggleArtistRow(rowKey); }} aria-label={expanded ? "Hide artist details" : "Show artist details"} aria-expanded={expanded} style={{ width: "38px", height: "34px", border: `1px solid ${cardBorder}`, borderRadius: "14px", background: elevated, color: muted, fontSize: "18px", fontWeight: 900, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 0 2px" }}>{expanded ? "▴" : "▾"}</button>
                  </div>
                  {expanded && (
                    <div style={{ marginTop: "14px", padding: "14px 16px 12px", border: `1px solid ${cardBorder}`, borderRadius: "16px", background: elevated }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: "8px" }}>
                        {artistStats.map((stat) => (
                          <div key={stat.label} style={{ background: surface, border: `1px solid ${cardBorder}`, borderRadius: "12px", padding: "9px 7px", minWidth: 0 }}>
                            <span style={{ display: "block", fontFamily: F, fontSize: "9px", color: muted, fontWeight: 900, letterSpacing: "1px", textTransform: "uppercase", textAlign: "center" }}>{stat.label}</span>
                            <span style={{ display: "block", marginTop: "4px", fontFamily: F, color: text, fontSize: "12px", fontWeight: 850, textAlign: "center", whiteSpace: "normal", overflowWrap: "anywhere" }}>{stat.value}</span>
                          </div>
                        ))}
                      </div>
                      <button type="button" onClick={() => openArtistDetails(artist.n)} style={{ marginTop: "11px", width: "100%", border: `1px solid rgba(184,134,11,0.35)`, borderRadius: "13px", background: surface, color: GOLD, fontFamily: F, fontSize: "10.5px", fontWeight: 900, letterSpacing: "1px", textTransform: "uppercase", padding: "10px 12px", cursor: "pointer" }}>View Artist Profile</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "44px 38px minmax(0,1fr) 70px 126px", gap: "12px", alignItems: "center", padding: "0 12px 10px", borderBottom: `1px solid ${cardBorder}`, fontFamily: F, fontSize: "10px", fontWeight: 900, letterSpacing: "1.6px", textTransform: "uppercase", color: muted }}>
              <div></div><div title="Country"></div><div>Artist</div><div style={{ textAlign: "center" }}>Move</div><div style={{ textAlign: "center" }}>Total Points</div>
            </div>
            {artists.slice(0, 50).map((artist, index) => {
              const trend = artistTrendFor(artist);
              return (
                <div key={artist.n} className="ngoma-artist-row" style={{ display: "grid", gridTemplateColumns: "44px 38px minmax(0,1fr) 70px 126px", gap: "12px", padding: "12px", borderBottom: `1px solid ${cardBorder}`, alignItems: "center", minWidth: 0 }}>
                  <div style={{ fontSize: index < 3 ? "17px" : "13.5px", fontWeight: 900, color: index < 3 ? MEDALS[index] : muted, textAlign: "center", fontFamily: F }}>{index + 1}</div>
                  <ArtistAvatar artist={artist} size={34} compact />
                  <div style={{ minWidth: 0 }}>
                    <button type="button" onClick={() => openArtistDetails(artist.n)} style={{ border: 0, background: "transparent", color: text, padding: 0, fontFamily: SF, fontSize: "15.5px", fontWeight: 850, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.15, cursor: "pointer", maxWidth: "100%", textAlign: "left" }}>{artist.n}</button>
                    <div style={{ fontSize: "12px", color: muted, fontFamily: F, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: "4px", lineHeight: 1.35 }}>{artist.t} {artist.t === 1 ? "entry" : "entries"} · Artist peak: #{artist.pk} · {artist.m} {artist.m === 1 ? "month" : "months"}</div>
                  </div>
                  <div title={trend.label} style={{ textAlign: "center", fontFamily: F, fontSize: "14px", fontWeight: 900, color: trend.color }}>{trend.symbol}</div>
                  <div style={{ textAlign: "center", fontFamily: F, fontSize: "16px", fontWeight: 900, color: GOLD, whiteSpace: "nowrap" }}>{Number(artist.p || 0).toLocaleString()}</div>
                </div>
              );
            })}
          </>
        )}
      </section>
    </div>
  );
}
