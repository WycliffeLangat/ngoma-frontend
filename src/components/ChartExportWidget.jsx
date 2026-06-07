import { useEffect, useMemo, useRef, useState } from "react";
import { toJpeg, toPng } from "html-to-image";
import ChartExportCard from "./ChartExportCard";

const API_BASE =
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000/api/v1";

const ranges = {
  top10: { label: "Top 10", start: 0, end: 10 },
  "11_20": { label: "11–20", start: 10, end: 20 },
  "21_30": { label: "21–30", start: 20, end: 30 },
  "31_40": { label: "31–40", start: 30, end: 40 },
  "41_50": { label: "41–50", start: 40, end: 50 },
};

export default function ChartExportWidget() {
  const cardRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [range, setRange] = useState("top10");
  const [format, setFormat] = useState("png");
  const [entries, setEntries] = useState([]);
  const [monthLabel, setMonthLabel] = useState("Current Chart");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const selectedRange = ranges[range];

  const selectedEntries = useMemo(() => {
    return entries.slice(selectedRange.start, selectedRange.end);
  }, [entries, selectedRange]);

  useEffect(() => {
    if (open) {
      fetchChartData();
    }
  }, [open]);

  async function fetchChartData() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE}/charts/`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error("Could not load chart data.");
      }

      const normalized = normalizeChartData(data);

      setEntries(normalized.entries);
      setMonthLabel(normalized.monthLabel);
    } catch (err) {
      setError("Could not load chart data for export.");
    } finally {
      setLoading(false);
    }
  }

  function normalizeChartData(data) {
    let source = data;

    if (Array.isArray(data?.results)) {
      source = data.results;
    }

    if (Array.isArray(source)) {
      const latest = source[0];

      const possibleEntries =
        latest?.entries ||
        latest?.chart_entries ||
        latest?.items ||
        latest?.songs ||
        latest?.releases ||
        latest?.data ||
        source;

      const month =
        latest?.month ||
        latest?.month_name ||
        latest?.period ||
        latest?.title ||
        latest?.name ||
        "Current Chart";

      const year = latest?.year || "";

      return {
        entries: normalizeEntries(possibleEntries),
        monthLabel: `${month} ${year}`.trim(),
      };
    }

    const possibleEntries =
      source?.entries ||
      source?.chart_entries ||
      source?.items ||
      source?.songs ||
      source?.releases ||
      source?.data ||
      [];

    const month =
      source?.month ||
      source?.month_name ||
      source?.period ||
      source?.title ||
      source?.name ||
      "Current Chart";

    const year = source?.year || "";

    return {
      entries: normalizeEntries(possibleEntries),
      monthLabel: `${month} ${year}`.trim(),
    };
  }

  function normalizeEntries(rawEntries) {
    if (!Array.isArray(rawEntries)) return [];

    return rawEntries
      .map((item, index) => {
        const release = item.release || item.song || item.track || item.album || {};

        return {
          id: item.id || release.id || index,
          rank: item.rank || item.position || item.chart_position || index + 1,
          title:
            item.title ||
            item.song_title ||
            item.release_title ||
            item.name ||
            release.title ||
            release.name ||
            "Untitled",
          artist:
            item.artist ||
            item.artist_name ||
            item.primary_artist ||
            item.artistName ||
            release.artist ||
            release.artist_name ||
            release.primary_artist ||
            "Unknown artist",
          points:
            item.points ||
            item.total_points ||
            item.score ||
            item.value ||
            item.monthly_points ||
            "",
          last_week:
            item.last_week ||
            item.previous_rank ||
            item.previous_position ||
            item.prev_rank ||
            "",
        };
      })
      .sort((a, b) => Number(a.rank) - Number(b.rank));
  }

  async function downloadImage() {
    if (!cardRef.current || selectedEntries.length === 0) return;

    setDownloading(true);

    try {
      const fileSafeRange = selectedRange.label
        .toLowerCase()
        .replace("–", "-")
        .replace(/\s+/g, "-");

      const fileName = `ngoma-charts-${fileSafeRange}.${format}`;

      let dataUrl;

      if (format === "png") {
        dataUrl = await toPng(cardRef.current, {
          cacheBust: true,
          pixelRatio: 2,
          backgroundColor: "#111111",
        });
      } else {
        dataUrl = await toJpeg(cardRef.current, {
          cacheBust: true,
          pixelRatio: 2,
          quality: 0.95,
          backgroundColor: "#111111",
        });
      }

      const link = document.createElement("a");
      link.download = fileName;
      link.href = dataUrl;
      link.click();
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={styles.shareButton}
        title="Export chart image for socials"
      >
        Export for Socials
      </button>

      {open && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div>
                <div style={styles.title}>Download Chart Image</div>
                <div style={styles.subtitle}>
                  Export Top 10, 11–20, 21–30, 31–40 or 41–50 for socials.
                </div>
              </div>

              <button onClick={() => setOpen(false)} style={styles.closeButton}>
                ×
              </button>
            </div>

            <div style={styles.controls}>
              <label style={styles.label}>
                Range
                <select
                  value={range}
                  onChange={(e) => setRange(e.target.value)}
                  style={styles.select}
                >
                  <option value="top10">Top 10</option>
                  <option value="11_20">11–20</option>
                  <option value="21_30">21–30</option>
                  <option value="31_40">31–40</option>
                  <option value="41_50">41–50</option>
                </select>
              </label>

              <label style={styles.label}>
                Format
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  style={styles.select}
                >
                  <option value="png">PNG</option>
                  <option value="jpg">JPG</option>
                </select>
              </label>

              <button
                onClick={downloadImage}
                disabled={loading || downloading || selectedEntries.length === 0}
                style={styles.downloadButton}
              >
                {downloading ? "Preparing..." : "Download Image"}
              </button>
            </div>

            {loading && <div style={styles.notice}>Loading chart data...</div>}

            {error && <div style={styles.error}>{error}</div>}

            {!loading && !error && selectedEntries.length === 0 && (
              <div style={styles.notice}>
                No entries found for this range. Confirm chart data is available.
              </div>
            )}

            <div style={styles.previewWrapper}>
              <div style={styles.previewScale}>
                <div ref={cardRef}>
                  <ChartExportCard
                    rangeLabel={selectedRange.label}
                    monthLabel={monthLabel}
                    entries={selectedEntries}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  shareButton: {
    position: "fixed",
    right: "24px",
    bottom: "24px",
    zIndex: 9998,
    border: "none",
    borderRadius: "999px",
    background: "#111827",
    color: "#ffffff",
    padding: "12px 18px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 10px 26px rgba(0,0,0,0.25)",
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    zIndex: 10001,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
  },

  modal: {
    width: "min(1100px, 96vw)",
    maxHeight: "94vh",
    overflow: "auto",
    background: "#ffffff",
    borderRadius: "22px",
    padding: "22px",
    boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
  },

  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    marginBottom: "18px",
  },

  title: {
    fontSize: "24px",
    fontWeight: 800,
    color: "#111827",
  },

  subtitle: {
    marginTop: "6px",
    fontSize: "14px",
    color: "#6b7280",
  },

  closeButton: {
    border: "none",
    background: "transparent",
    fontSize: "32px",
    cursor: "pointer",
    color: "#111827",
  },

  controls: {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    alignItems: "end",
    marginBottom: "18px",
  },

  label: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    fontSize: "13px",
    fontWeight: 700,
    color: "#374151",
  },

  select: {
    minWidth: "150px",
    padding: "10px 12px",
    borderRadius: "12px",
    border: "1px solid #d1d5db",
    fontSize: "14px",
  },

  downloadButton: {
    border: "none",
    borderRadius: "12px",
    background: "#c18a00",
    color: "#ffffff",
    padding: "11px 18px",
    fontWeight: 800,
    cursor: "pointer",
  },

  notice: {
    padding: "14px",
    borderRadius: "12px",
    background: "#f3f4f6",
    color: "#374151",
    marginBottom: "16px",
  },

  error: {
    padding: "14px",
    borderRadius: "12px",
    background: "#fee2e2",
    color: "#991b1b",
    marginBottom: "16px",
  },

  previewWrapper: {
    width: "100%",
    overflow: "auto",
    background: "#f3f4f6",
    borderRadius: "16px",
    padding: "20px",
  },

  previewScale: {
    transform: "scale(0.42)",
    transformOrigin: "top left",
    width: "1080px",
    height: "1350px",
  },
};