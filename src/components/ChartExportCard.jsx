export default function ChartExportCard({
  subtitle = "Kenya's Official Music Charts",
  rangeLabel = "Top 10",
  monthLabel = "December 2024",
  chartType = "Singles",
  platformLabel = "Combined",
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

        <div style={styles.headerRight}>
          <div style={styles.chartType}>{chartType}</div>
          <div style={styles.platform}>{platformLabel}</div>
          <div style={styles.rangeBadge}>{rangeLabel}</div>
        </div>
      </div>

      <div style={styles.tableHeader}>
        <div>#</div>
        <div>TITLE / ARTIST</div>
        <div style={styles.centerText}>MOVE</div>
        <div style={styles.centerText}>LAST MONTH</div>
      </div>

      <div style={styles.list}>
        {entries.map((item, index) => {
          return (
            <div key={item.id || index} style={styles.row}>
              <div style={styles.rank}>{item.rank}</div>

              <div style={styles.songBlock}>
                <div style={styles.songTitle}>{item.title}</div>
                <div style={styles.artist}>{item.artist}</div>
              </div>

              <div style={styles.movement}>{item.movement || "—"}</div>

              <div style={styles.lastMonth}>{item.last_month || "—"}</div>
            </div>
          );
        })}
      </div>

      <div style={styles.footer}>
        <div>NGOMA CHARTS</div>
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
    marginBottom: "34px",
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

  headerRight: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "10px",
  },

  chartType: {
    fontSize: "18px",
    fontWeight: 800,
    letterSpacing: "3px",
    color: "#d6a21c",
    textTransform: "uppercase",
  },

  platform: {
    fontSize: "15px",
    fontWeight: 800,
    letterSpacing: "2px",
    color: "#ffffff",
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

  tableHeader: {
    display: "grid",
    gridTemplateColumns: "82px 1fr 120px 150px",
    columnGap: "22px",
    alignItems: "center",
    height: "54px",
    borderTop: "2px solid #d6a21c",
    borderBottom: "2px solid #d6a21c",
    color: "#d6a21c",
    fontSize: "16px",
    fontWeight: 900,
    letterSpacing: "3px",
    textTransform: "uppercase",
  },

  centerText: {
    textAlign: "center",
  },

  list: {
    display: "flex",
    flexDirection: "column",
  },

  row: {
    display: "grid",
    gridTemplateColumns: "82px 1fr 120px 150px",
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
    fontSize: "31px",
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

  movement: {
    textAlign: "center",
    fontSize: "24px",
    fontWeight: 900,
    color: "#d6a21c",
  },

  lastMonth: {
    textAlign: "center",
    fontSize: "24px",
    fontWeight: 900,
    color: "#ffffff",
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