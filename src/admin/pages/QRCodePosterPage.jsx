import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  POSTER_W,
  POSTER_H,
  PREVIEW_W,
  PREVIEW_SCALE,
  exportNodeAsPng,
  PosterBrandRow,
  PosterFooter,
  PosterCanvas,
  PosterSettingsPanel,
  defaultPosterSettings,
  readableInk,
  usePosterTheme,
} from "../utils/exportPoster.jsx";

const DEFAULT_DESTINATION = "https://www.ngomacharts.com/";
const DEFAULT_TITLE = "Scan for Ngoma Charts";
const DEFAULT_SUBTITLE = "Open Kenya's official music charts, records, analytics and artist rankings.";
const DEFAULT_CTA = "Open Ngoma Charts";

const ERROR_LEVELS = [
  ["M", "Standard"],
  ["Q", "Strong"],
  ["H", "Max"],
];

const labelStyle = {
  display: "grid",
  gap: 6,
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: ".06em",
  color: "var(--cms-muted)",
};

function normalizeDestination(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return `https://www.ngomacharts.com${trimmed}`;
  if (/^[\w.-]+\.[a-z]{2,}(?:[/:?#].*)?$/i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

function safeText(value, fallback) {
  const trimmed = String(value || "").trim();
  return trimmed || fallback;
}

function safeFilename(value) {
  return String(value || "qr-code")
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "qr-code";
}

function TextField({ label, value, onChange, placeholder, multiline = false, rows = 3 }) {
  const commonProps = {
    className: "cms-select",
    value,
    onChange: (event) => onChange(event.target.value),
    placeholder,
    style: { cursor: "text", width: "100%" },
  };
  return (
    <label style={labelStyle}>
      {label}
      {multiline ? <textarea {...commonProps} rows={rows} style={{ ...commonProps.style, resize: "vertical", minHeight: rows * 36 }} /> : <input {...commonProps} type="text" />}
    </label>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <label style={labelStyle}>
      {label}
      <input
        className="cms-select"
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{ width: "100%", height: 42, padding: 4 }}
      />
    </label>
  );
}

function QRPosterContent({
  qrDataUrl,
  destination,
  title,
  subtitle,
  cta,
  theme = "dark",
  accentColor,
  qrBackground,
}) {
  const t = usePosterTheme(theme);
  const displayTitle = safeText(title, DEFAULT_TITLE);
  const displaySubtitle = safeText(subtitle, DEFAULT_SUBTITLE);
  const displayCta = safeText(cta, DEFAULT_CTA);
  const displayDestination = safeText(destination, DEFAULT_DESTINATION).replace(/^https?:\/\//i, "");
  const accentInk = readableInk(accentColor);
  const padX = 74;
  const footerH = 74;
  const titleSize = displayTitle.length > 54 ? 48 : displayTitle.length > 34 ? 56 : 66;
  const qrSize = 520;

  return (
    <div style={{ position: "relative", width: POSTER_W, height: POSTER_H, background: t.pageBg, color: t.titleColor }}>
      <div style={{ padding: "70px 70px 0" }}>
        <PosterBrandRow theme={theme} />
      </div>

      <div
        style={{
          position: "absolute",
          top: 246,
          left: padX,
          right: padX,
          bottom: footerH + 34,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 34,
            padding: "7px 14px",
            borderRadius: 999,
            background: `${accentColor}22`,
            color: accentColor,
            fontSize: 17,
            fontWeight: 900,
            letterSpacing: "2.2px",
            textTransform: "uppercase",
          }}
        >
          Scan to open
        </div>

        <h1
          style={{
            width: "100%",
            margin: "25px 0 0",
            color: t.titleColor,
            fontSize: titleSize,
            lineHeight: 1.02,
            fontWeight: 950,
            letterSpacing: 0,
            textTransform: "uppercase",
            overflowWrap: "anywhere",
          }}
        >
          {displayTitle}
        </h1>

        <p
          style={{
            maxWidth: 760,
            margin: "22px 0 0",
            color: t.metaColor,
            fontSize: displaySubtitle.length > 100 ? 25 : 28,
            lineHeight: 1.38,
            fontWeight: 650,
            overflowWrap: "anywhere",
          }}
        >
          {displaySubtitle}
        </p>

        <div
          style={{
            marginTop: 42,
            width: qrSize + 72,
            height: qrSize + 72,
            borderRadius: 48,
            padding: 36,
            background: qrBackground,
            border: `6px solid ${accentColor}`,
            boxShadow: theme === "dark" ? "0 28px 70px rgba(0,0,0,.42)" : "0 24px 60px rgba(30,20,0,.12)",
          }}
        >
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt=""
              style={{ display: "block", width: qrSize, height: qrSize, objectFit: "contain" }}
            />
          ) : (
            <div
              style={{
                width: qrSize,
                height: qrSize,
                display: "grid",
                placeItems: "center",
                color: "#6B7169",
                fontSize: 24,
                fontWeight: 800,
              }}
            >
              Enter destination
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: 34,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 56,
            maxWidth: 760,
            padding: "13px 28px",
            borderRadius: 999,
            background: accentColor,
            color: accentInk,
            fontSize: 24,
            fontWeight: 900,
            letterSpacing: "1.3px",
            textTransform: "uppercase",
            overflowWrap: "anywhere",
          }}
        >
          {displayCta}
        </div>

        <div
          style={{
            marginTop: 18,
            maxWidth: 820,
            color: t.metaColor,
            fontSize: 20,
            lineHeight: 1.25,
            fontWeight: 750,
            overflowWrap: "anywhere",
          }}
        >
          {displayDestination}
        </div>
      </div>

      <PosterFooter theme={theme} height={footerH} padX={padX} />
    </div>
  );
}

export default function QRCodePosterPage() {
  const [destination, setDestination] = useState(DEFAULT_DESTINATION);
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [subtitle, setSubtitle] = useState(DEFAULT_SUBTITLE);
  const [cta, setCta] = useState(DEFAULT_CTA);
  const [theme, setTheme] = useState("dark");
  const [accentColor, setAccentColor] = useState("#B8860B");
  const [qrDark, setQrDark] = useState("#050505");
  const [qrLight, setQrLight] = useState("#FFFFFF");
  const [errorCorrectionLevel, setErrorCorrectionLevel] = useState("H");
  const [posterSettings, setPosterSettings] = useState(() => defaultPosterSettings());
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrError, setQrError] = useState("");
  const [exportError, setExportError] = useState("");
  const [exporting, setExporting] = useState(false);
  const posterRef = useRef(null);

  const encodedValue = useMemo(() => normalizeDestination(destination), [destination]);

  useEffect(() => {
    if (!encodedValue) {
      setQrDataUrl("");
      setQrError("");
      return undefined;
    }

    let active = true;
    setQrError("");
    QRCode.toDataURL(encodedValue, {
      errorCorrectionLevel,
      margin: 2,
      width: 760,
      color: { dark: qrDark, light: qrLight },
    })
      .then((dataUrl) => {
        if (active) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (active) {
          setQrDataUrl("");
          setQrError("Couldn't generate this QR code. Shorten the destination or check the link.");
        }
      });

    return () => {
      active = false;
    };
  }, [encodedValue, errorCorrectionLevel, qrDark, qrLight]);

  function resetContent() {
    setDestination(DEFAULT_DESTINATION);
    setTitle(DEFAULT_TITLE);
    setSubtitle(DEFAULT_SUBTITLE);
    setCta(DEFAULT_CTA);
    setAccentColor("#B8860B");
    setQrDark("#050505");
    setQrLight("#FFFFFF");
  }

  async function handleDownload() {
    if (!posterRef.current || !qrDataUrl || exporting) return;
    setExporting(true);
    setExportError("");
    try {
      await exportNodeAsPng(posterRef.current, `ngoma-qr-${safeFilename(encodedValue)}-${theme}.png`);
    } catch {
      setExportError("Couldn't generate the image. Try again.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <section>
      <div className="cms-page-head">
        <div>
          <h1>QR Code Poster Generator</h1>
          <p>Create a branded 4:5 QR poster for NgomaCharts.com.</p>
        </div>
      </div>

      {qrError && <div className="cms-alert error">{qrError}</div>}
      {exportError && <div className="cms-alert error">{exportError}</div>}

      <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div className="cms-card" style={{ flex: "1 1 320px", minWidth: 280 }}>
          <div className="cms-card-heading"><h2>QR poster details</h2></div>

          <div style={{ display: "grid", gap: 14 }}>
            <TextField
              label="Destination URL"
              value={destination}
              onChange={setDestination}
              placeholder={DEFAULT_DESTINATION}
            />
            {encodedValue && encodedValue !== destination.trim() && (
              <span className="cms-help" style={{ marginTop: -8 }}>Encoded as: {encodedValue}</span>
            )}

            <TextField label="Poster title" value={title} onChange={setTitle} placeholder={DEFAULT_TITLE} />
            <TextField
              label="Subtitle"
              value={subtitle}
              onChange={setSubtitle}
              placeholder={DEFAULT_SUBTITLE}
              multiline
            />
            <TextField label="CTA label" value={cta} onChange={setCta} placeholder={DEFAULT_CTA} />

            <label style={labelStyle}>
              Poster theme
              <div className="cms-pill-bar" style={{ marginBottom: 0 }}>
                {[["dark", "Dark"], ["light", "Light"]].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`cms-btn small ${theme === value ? "" : "light"}`}
                    onClick={() => setTheme(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(105px, 1fr))", gap: 10 }}>
              <ColorField label="Accent" value={accentColor} onChange={setAccentColor} />
              <ColorField label="QR ink" value={qrDark} onChange={setQrDark} />
              <ColorField label="QR base" value={qrLight} onChange={setQrLight} />
            </div>

            <label style={labelStyle}>
              QR resilience
              <div className="cms-pill-bar" style={{ marginBottom: 0 }}>
                {ERROR_LEVELS.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`cms-btn small ${errorCorrectionLevel === value ? "" : "light"}`}
                    onClick={() => setErrorCorrectionLevel(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </label>

            <div className="cms-pill-bar" style={{ marginBottom: 0 }}>
              <button type="button" className="cms-btn small light" onClick={resetContent}>
                Reset to NgomaCharts.com
              </button>
            </div>

            <PosterSettingsPanel
              theme={theme}
              settings={posterSettings}
              onChange={setPosterSettings}
              onReset={() => setPosterSettings(defaultPosterSettings())}
            />
          </div>

          <button
            type="button"
            className="cms-btn full"
            style={{ marginTop: 20 }}
            onClick={handleDownload}
            disabled={exporting || !qrDataUrl}
          >
            {exporting ? "Generating..." : "Download QR poster (PNG)"}
          </button>
          <p className="cms-help" style={{ marginTop: 10 }}>
            Exports as an HD 1080 4:5 PNG with a QR code pointing to NgomaCharts.com.
          </p>
        </div>

        <div style={{ flex: "0 0 auto" }}>
          <div
            style={{
              width: PREVIEW_W,
              height: PREVIEW_W * (POSTER_H / POSTER_W),
              overflow: "hidden",
              borderRadius: 18,
              border: "1px solid var(--cms-line)",
              boxShadow: "0 20px 50px rgba(20,16,4,.18)",
            }}
          >
            <div style={{ width: POSTER_W, height: POSTER_H, transform: `scale(${PREVIEW_SCALE})`, transformOrigin: "top left" }}>
              <PosterCanvas settings={posterSettings} theme={theme}>
                <QRPosterContent
                  qrDataUrl={qrDataUrl}
                  destination={encodedValue}
                  title={title}
                  subtitle={subtitle}
                  cta={cta}
                  theme={theme}
                  accentColor={accentColor}
                  qrBackground={qrLight}
                />
              </PosterCanvas>
            </div>
          </div>
        </div>

        <div style={{ position: "fixed", top: 0, left: -99999, pointerEvents: "none" }} aria-hidden="true">
          <div ref={posterRef}>
            <PosterCanvas settings={posterSettings} theme={theme}>
              <QRPosterContent
                qrDataUrl={qrDataUrl}
                destination={encodedValue}
                title={title}
                subtitle={subtitle}
                cta={cta}
                theme={theme}
                accentColor={accentColor}
                qrBackground={qrLight}
              />
            </PosterCanvas>
          </div>
        </div>
      </div>
    </section>
  );
}
