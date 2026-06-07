export default function ChartExportCard({
  title = "NGOMA CHARTS",
  subtitle = "Kenya's Official Music Charts",
  rangeLabel = "Top 10",
  monthLabel = "December 2024",
  entries = [],
}) {
  return (
    <div style={styles.card}>
      <div style={styles.topBand}>
        <div style={styles.brandSmall}>KENYA'S OFFICIAL MUSIC CHARTS</div>
        <div style={styles.date}>CHART MONTH · {monthLabel}</div>
      </div>

      <div style={styles.header}>
        <div>
          <div style={styles.logoText}>
            NGOMA <span style={styles.gold}>CHARTS</span>
          </div>
          <div style={styles.subtitle}>{subtitle}</div>
        </div>

        <div style={styles.rangeBadge}>{rangeLabel}</div>
      </div>

      <div style={styles.divider} />

      <div style={styles.list}>
        {entries.map((item, index) => {
          const rank = item.rank || item.position || index + 1;
          const titleText =
            item.title ||
            item.song_title ||
            item.name ||
            item.release_title ||
            "Untitled";

          const artistText =
            item.artist ||
            item.artist_name ||
            item.primary_artist ||
            item.artistName ||
            item.artists ||
            "Unknown artist";

          const points =
            item.points ||
            item.total_points ||
            item.score ||
            item.value ||
            "";

          const lastWeek =
            item.last_week ||
            item.previous_rank ||
            item.previousPosition ||
            item.prev_rank ||
            "";

          return (
            <div key={index} style={styles.row}>
              <div style={styles.rank}>{rank}</div>

              <div style={styles.songBlock}>
                <div style={styles.songTitle}>{titleText}</div>
                <div style={styles.artist}>{artistText}</div>
              </div>

              <div style={styles.metaBlock}>
                {points && <div style={styles.points}>{points}</div>}
                {lastWeek && <div style={styles.lastWeek}>LW {lastWeek}</div>}
              </div>
            </div>
          );
        })}
      </div>

      <div style={styles.footer}>
        <div>ngomacharts.com</div>
        <div>Powered by Ngoma Charts Data</div>
      </div>
    </div>
  );
}

const styles = {
  card: {
    width: "1080px",
    height: "1350px",
    background:
      "linear-gradient(180deg, #0f0f0f 0%, #171717 45%, #050505 100%)",
    color: "#ffffff",
    fontFamily:
      "Inter, Arial, Helvetica, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    padding: "58px 68px",
    boxSizing: "border-box",
    position: "relative",
    overflow: "hidden",
  },

  topBand: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    color: "#d6a21c",
    fontSize: "18px",
    letterSpacing: "4px",
    textTransform: "uppercase",
    marginBottom: "45px",
  },

  brandSmall: {
    fontWeight: 700,
  },

  date: {
    color: "#ffffff",
    fontWeight: 700,
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: "38px",
  },

  logoText: {
    fontSize: "64px",
    lineHeight: 1,
    fontWeight: 900,
    letterSpacing: "5px",
  },

  gold: {
    color: "#d6a21c",
  },

  subtitle: {
    marginTop: "14px",
    fontSize: "23px",
    color: "#bdbdbd",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
  },

  rangeBadge: {
    background: "#d6a21c",
    color: "#080808",
    fontSize: "30px",
    fontWeight: 900,
    padding: "16px 28px",
    borderRadius: "999px",
    textTransform: "uppercase",
    letterSpacing: "2px",
  },

  divider: {
    height: "2px",
    background: "#d6a21c",
    marginBottom: "24px",
  },

  list: {
    display: "flex",
    flexDirection: "column",
  },

  row: {
    display: "grid",
    gridTemplateColumns: "82px 1fr 150px",
    alignItems: "center",
    minHeight: "94px",
    borderBottom: "1px solid rgba(214, 162, 28, 0.45)",
    columnGap: "22px",
  },

  rank: {
    fontSize: "42px",
    fontWeight: 900,
    color: "#ffffff",
  },

  songBlock: {
    minWidth: 0,
  },

  songTitle: {
    fontSize: "32px",
    lineHeight: 1.1,
    fontWeight: 900,
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  artist: {
    marginTop: "8px",
    fontSize: "23px",
    color: "#cfcfcf",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  metaBlock: {
    textAlign: "right",
  },

  points: {
    fontSize: "30px",
    fontWeight: 900,
    color: "#d6a21c",
  },

  lastWeek: {
    marginTop: "8px",
    fontSize: "17px",
    fontWeight: 700,
    color: "#d6a21c",
    letterSpacing: "1px",
  },

  footer: {
    position: "absolute",
    left: "68px",
    right: "68px",
    bottom: "44px",
    display: "flex",
    justifyContent: "space-between",
    fontSize: "18px",
    color: "#9ca3af",
    letterSpacing: "1px",
  },
};