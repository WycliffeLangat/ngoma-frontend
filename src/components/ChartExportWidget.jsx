import { useEffect, useMemo, useRef, useState } from "react";
import { toJpeg, toPng } from "html-to-image";
import ChartExportCard from "./ChartExportCard";

const API_BASE =
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000/api/v1";

const ranges = {
  top10: { label: "Top 10", end: 10 },
  upTo20: { label: "Up to 20", end: 20 },
  upTo30: { label: "Up to 30", end: 30 },
  upTo40: { label: "Up to 40", end: 40 },
  upTo50: { label: "Up to 50", end: 50 },
};

const exportBlocks = [
  { key: "top10", label: "Top 10", start: 0, end: 10, startRank: 1, fileLabel: "top-10" },
  { key: "11_20", label: "11–20", start: 10, end: 20, startRank: 11, fileLabel: "11-20" },
  { key: "21_30", label: "21–30", start: 20, end: 30, startRank: 21, fileLabel: "21-30" },
  { key: "31_40", label: "31–40", start: 30, end: 40, startRank: 31, fileLabel: "31-40" },
  { key: "41_50", label: "41–50", start: 40, end: 50, startRank: 41, fileLabel: "41-50" },
];

export default function ChartExportWidget() {
  const cardRefs = useRef({});

  const [open, setOpen] = useState(false);
  const [range, setRange] = useState("top10");
  const [format, setFormat] = useState("png");
  const [entries, setEntries] = useState([]);
  const [monthLabel, setMonthLabel] = useState("Current Chart");
  const [chartType, setChartType] = useState("Singles");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const selectedRange = ranges[range];

  const blocksToDownload = useMemo(() => {
    return exportBlocks.filter((block) => block.end <= selectedRange.end);
  }, [selectedRange]);

  const previewBlock = blocksToDownload[blocksToDownload.length - 1];

  const previewEntries = useMemo(() => {
    if (!previewBlock) return [];
    return entries.slice(previewBlock.start, previewBlock.end);
  }, [entries, previewBlock]);

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
      setChartType(normalized.chartType);
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
      const latest = source[0] || {};

      const possibleEntries =
        latest.entries ||
        latest.chart_entries ||
        latest.items ||
        latest.songs ||
        latest.releases ||
        latest.data ||
        source;

      const month =
        latest.month ||
        latest.month_name ||
        latest.period ||
        latest.title ||
        latest.name ||
        "Current Chart";

      const year = latest.year || "";

      const type =
        latest.chart_type ||
        latest.type ||
        latest.category ||
        latest.chart_category ||
        "Singles";

      return {
        entries: normalizeEntries(possibleEntries),
        monthLabel: `${month} ${year}`.trim(),
        chartType: formatChartType(type),
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

    const type =
      source?.chart_type ||
      source?.type ||
      source?.category ||
      source?.chart_category ||
      "Singles";

    return {
      entries: normalizeEntries(possibleEntries),
      monthLabel: `${month} ${year}`.trim(),
      chartType: formatChartType(type),
    };
  }

  function normalizeEntries(rawEntries) {
    if (!Array.isArray(rawEntries)) return [];

    return rawEntries
      .map((item, index) => {
        const release = item.release || item.song || item.track || item.album || {};
        const artistObject = item.artist || release.artist || {};

        const realRank =
          item.rank ||
          item.position ||
          item.chart_position ||
          item.current_rank ||
          item.current_position ||
          index + 1;

        const title =
          item.title ||
          item.song_title ||
          item.release_title ||
          item.name ||
          release.title ||
          release.name ||
          "Untitled";

        const artist =
          item.artist_name ||
          item.primary_artist ||
          item.artistName ||
          item.artists ||
          release.artist_name ||
          release.primary_artist ||
          release.artistName ||
          artistObject.name ||
          artistObject.title ||
          "Unknown artist";

        const lastMonth =
          item.last_month ||
          item.last_month_position ||
          item.previous_rank ||
          item.previous_position ||
          item.prev_rank ||
          item.previous_month_rank ||
          item.previous_month_position ||
          "";

        const movement =
          item.movement ||
          item.move ||
          item.change ||
          item.position_change ||
          item.rank_change ||
          "";

        return {
          id: item.id || release.id || index,
          realRank,
          title,
          artist,
          movement,
          last_month: lastMonth,
          is_new: item.is_new || item.new || item.status === "new",
          re_entry:
            item.re_entry || item.reentry || item.status === "re-entry",
          status: item.status || "",
        };
      })
      .sort((a, b) => Number(a.realRank) - Number(b.realRank));
  }

  function formatChartType(type) {
    const cleanType = String(type || "Singles").trim();

    if (!cleanType) return "Singles";

    return cleanType.charAt(0).toUpperCase() + cleanType.slice(1);
  }

  function makeFileName(block) {
    const safeMonth = monthLabel
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const safeType = chartType
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    return `ngoma-charts-${safeMonth}-${safeType}-${block.fileLabel}.${format}`;
  }

  async function downloadImageForBlock(block) {
    const node = cardRefs.current[block.key];

    if (!node) return;

    let dataUrl;

    if (format === "png") {
      dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#111111",
      });
    } else {
      dataUrl = await toJpeg(node, {
        cacheBust: true,
        pixelRatio: 2,
        quality: 0.95,
        backgroundColor: "#111111",
      });
    }

    const link = document.createElement("a");
    link.download = makeFileName(block);
    link.href = dataUrl;
    link.click();

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  async function downloadImagePack() {
    if (entries.length === 0 || blocksToDownload.length === 0) return;

    setDownloading(true);

    try {
      for (const block of blocksToDownload) {
        await downloadImageForBlock(block);
      }
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
                <div style={styles.title}>Download Chart Pack</div>
                <div style={styles.subtitle}>
                  Choose a final range. The download includes all prior ranges
                  automatically.
                </div>
              </div>

              <button onClick={() => setOpen(false)} style={styles.closeButton}>
                ×
              </button>
            </div>

            <div style={styles.controls}>
              <label style={styles.label}>
                Final range
                <select
                  value={range}
                  onChange={(e) => setRange(e.target.value)}
                  style={styles.select}
                >
                  <option value="top10">Top 10 only</option>
                  <option value="upTo20">Up to 20</option>
                  <option value="upTo30">Up to 30</option>
                  <option value="upTo40">Up to 40</option>
                  <option value="upTo50">Up to 50</option>
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
                onClick={downloadImagePack}
                disabled={loading || downloading || entries.length === 0}
                style={styles.downloadButton}
              >
                {downloading
                  ? "Preparing..."
                  : `Download ${blocksToDownload.length} Image${
                      blocksToDownload.length > 1 ? "s" : ""
                    }`}
              </button>
            </div>

            {loading && <div style={styles.notice}>Loading chart data...</div>}

            {error && <div style={styles.error}>{error}</div>}

            {!loading && !error && entries.length === 0 && (
              <div style={styles.notice}>
                No entries found. Confirm chart data is available.
              </div>
            )}

            {!loading && !error && entries.length > 0 && (
              <div style={styles.notice}>
                Selected: {selectedRange.label}. This will download{" "}
                {blocksToDownload.map((block) => block.label).join(", ")}.
              </div>
            )}

            <div style={styles.previewWrapper}>
              <div style={styles.previewScale}>
                <ChartExportCard
                  rangeLabel={previewBlock?.label || "Top 10"}
                  monthLabel={monthLabel}
                  chartType={chartType}
                  entries={previewEntries}
                  startRank={previewBlock?.startRank || 1}
                />
              </div>
            </div>

            <div style={styles.hiddenExportArea}>
              {blocksToDownload.map((block) => {
                const blockEntries = entries.slice(block.start, block.end);

                return (
                  <div
                    key={block.key}
                    ref={(element) => {
                      cardRefs.current[block.key] = element;
                    }}
                  >
                    <ChartExportCard
                      rangeLabel={block.label}
                      monthLabel={monthLabel}
                      chartType={chartType}
                      entries={blockEntries}
                      startRank={block.startRank}
                    />
                  </div>
                );
              })}
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

  hiddenExportArea: {
    position: "fixed",
    left: "-99999px",
    top: 0,
    width: "1080px",
    height: "1350px",
    overflow: "hidden",
    pointerEvents: "none",
    opacity: 0,
  },
};