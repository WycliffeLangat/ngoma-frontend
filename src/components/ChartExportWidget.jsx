import { useEffect, useMemo, useRef, useState } from "react";
import { toJpeg, toPng } from "html-to-image";
import ChartExportCard from "./ChartExportCard";

const API_BASE =
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000/api/v1";

const months = [
  { value: "", label: "Latest available" },
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const ranges = {
  top10: { label: "Top 10", end: 10 },
  upTo20: { label: "Up to 20", end: 20 },
  upTo30: { label: "Up to 30", end: 30 },
  upTo40: { label: "Up to 40", end: 40 },
  upTo50: { label: "Up to 50", end: 50 },
};

const exportBlocks = [
  { key: "top10", label: "Top 10", start: 0, end: 10, fileLabel: "top-10" },
  { key: "11_20", label: "11–20", start: 10, end: 20, fileLabel: "11-20" },
  { key: "21_30", label: "21–30", start: 20, end: 30, fileLabel: "21-30" },
  { key: "31_40", label: "31–40", start: 30, end: 40, fileLabel: "31-40" },
  { key: "41_50", label: "41–50", start: 40, end: 50, fileLabel: "41-50" },
];

export default function ChartExportWidget() {
  const cardRefs = useRef({});

  const currentYear = new Date().getFullYear();

  const [open, setOpen] = useState(false);
  const [chartType, setChartType] = useState("singles");
  const [year, setYear] = useState(String(currentYear));
  const [month, setMonth] = useState("");
  const [platform, setPlatform] = useState("combined");
  const [range, setRange] = useState("top10");
  const [format, setFormat] = useState("png");

  const [chartData, setChartData] = useState(null);
  const [entries, setEntries] = useState([]);
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
  }, [open, chartType, year, month, platform]);

  async function fetchChartData() {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      params.set("type", chartType);

      if (year) params.set("year", year);
      if (month) params.set("month", month);
      if (platform) params.set("platform", platform);

      const response = await fetch(
        `${API_BASE}/export/chart-image-data/?${params.toString()}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not load chart export data.");
      }

      setChartData(data);
      setEntries(data.entries || []);
    } catch (err) {
      setChartData(null);
      setEntries([]);
      setError(err.message || "Could not load chart data for export.");
    } finally {
      setLoading(false);
    }
  }

  function makeFileName(block) {
    const label = chartData?.label || "latest-chart";
    const typeLabel = chartData?.chart_type_label || chartType;
    const platformLabel = chartData?.platform || platform;

    const safeLabel = String(label)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const safeType = String(typeLabel)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const safePlatform = String(platformLabel)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    return `ngoma-charts-${safeLabel}-${safeType}-${safePlatform}-${block.fileLabel}.${format}`;
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
                  Export real chart data by type, month, year, platform and range.
                </div>
              </div>

              <button onClick={() => setOpen(false)} style={styles.closeButton}>
                ×
              </button>
            </div>

            <div style={styles.controls}>
              <label style={styles.label}>
                Chart
                <select
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value)}
                  style={styles.select}
                >
                  <option value="singles">Singles</option>
                  <option value="albums">Albums</option>
                </select>
              </label>

              <label style={styles.label}>
                Year
                <input
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  style={styles.input}
                  placeholder="2024"
                />
              </label>

              <label style={styles.label}>
                Month
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  style={styles.select}
                >
                  {months.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label style={styles.label}>
                Platform
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  style={styles.select}
                >
                  <option value="combined">Combined</option>
                  <option value="apple-music">Apple Music</option>
                  <option value="audiomack">Audiomack</option>
                  <option value="boomplay">Boomplay</option>
                  <option value="spotify">Spotify</option>
                  <option value="youtube">YouTube</option>
                  <option value="shazam">Shazam</option>
                </select>
              </label>

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

            {loading && <div style={styles.notice}>Loading real chart data...</div>}

            {error && <div style={styles.error}>{error}</div>}

            {!loading && !error && chartData && (
              <div style={styles.notice}>
                Selected: {chartData.chart_type_label} · {chartData.label} ·{" "}
                {chartData.platform}. This will download{" "}
                {blocksToDownload.map((block) => block.label).join(", ")}.
              </div>
            )}

            <div style={styles.previewWrapper}>
              <div style={styles.previewScale}>
                <ChartExportCard
                  rangeLabel={previewBlock?.label || "Top 10"}
                  monthLabel={chartData?.label || "Current Chart"}
                  chartType={chartData?.chart_type_label || "Singles"}
                  platformLabel={chartData?.platform || "Combined"}
                  entries={previewEntries}
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
                      monthLabel={chartData?.label || "Current Chart"}
                      chartType={chartData?.chart_type_label || "Singles"}
                      platformLabel={chartData?.platform || "Combined"}
                      entries={blockEntries}
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
    width: "min(1180px, 96vw)",
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
    minWidth: "140px",
    padding: "10px 12px",
    borderRadius: "12px",
    border: "1px solid #d1d5db",
    fontSize: "14px",
  },

  input: {
    width: "100px",
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