import {
  POSTER_W,
  POSTER_H,
  POSTER_FONT_FAMILY,
  HEADER_ZONE_H,
  PosterBrandRow,
  PosterFooter,
  ArtPlaceholder,
  usePosterTheme,
} from "../../admin/utils/exportPoster.jsx";
import { resolveEntryImageUrl } from "../../components/EntryThumb.jsx";

// Same certification badge-card design as the CMS's Certification Card
// Generator (admin/pages/CertificationCardPage.jsx), applied here to the
// public Certifications page's single most notable certified release.
const CERT_META = {
  diamond: { emoji: "\u{1F48E}", color: "#7B1FA2", label: "Diamond" },
  platinum: { emoji: "\u{1F3B5}", color: "#868C97", label: "Platinum" },
  gold: { emoji: "\u{1F4C0}", color: "#C97A12", label: "Gold" },
};

function formatCertDate(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString(undefined, { year: "numeric", month: "long" });
}

// Adapts a public certification row (chartHelpers/automaticPublicContent
// shape: t/a/level/totalPts) into the {title,subtitle,image,level,points,
// certifiedDate} shape CertificationCardContent expects.
export function certificationToPosterItem(cert = {}) {
  return {
    title: cert.t || cert.title || "",
    subtitle: cert.a || cert.artist || "",
    image: resolveEntryImageUrl(cert, { name: cert.a }),
    level: cert.level || null,
    points: Number(cert.totalPts ?? cert.total_points) || 0,
    certifiedDate: formatCertDate(cert.certified_at || cert.certification_date),
  };
}

export default function CertificationSharePoster({ item, theme = "dark" }) {
  const t = usePosterTheme(theme);
  const padX = 64;

  if (!item) return null;

  const meta = CERT_META[item.level] || CERT_META.gold;
  const artSize = 460;
  const tileBg = theme === "light" ? "rgba(0,0,0,0.045)" : "rgba(255,255,255,0.055)";
  const tileBorder = theme === "light" ? "rgba(0,0,0,0.14)" : "rgba(255,255,255,0.16)";
  const headerH = HEADER_ZONE_H;

  return (
    <div
      style={{
        width: POSTER_W,
        height: POSTER_H,
        boxSizing: "border-box",
        background: t.pageBg,
        fontFamily: POSTER_FONT_FAMILY,
        color: t.titleColor,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: `72px ${padX}px 0`, position: "relative", zIndex: 1 }}>
        <PosterBrandRow theme={theme} />
      </div>

      <div
        style={{
          position: "absolute",
          top: headerH,
          bottom: 360,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: `0 ${padX}px`,
          zIndex: 1,
        }}
      >
        <div style={{ position: "relative", flexShrink: 0 }}>
          {item.image ? (
            <img
              src={item.image}
              alt=""
              style={{ width: artSize, height: artSize, borderRadius: 26, objectFit: "cover", boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}
            />
          ) : (
            <div style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.4)", borderRadius: 26 }}>
              <ArtPlaceholder width={artSize} height={artSize} radius={26} theme={theme} accentColor={meta.color} markSize={116} />
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: 48,
            fontSize: item.title.length > 22 ? 44 : item.title.length > 14 ? 52 : 60,
            fontWeight: 900,
            lineHeight: 1.12,
            letterSpacing: "-0.5px",
            color: t.titleColor,
            textAlign: "center",
            textTransform: "uppercase",
            maxWidth: 920,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {item.title}
        </div>
        {item.subtitle && (
          <div style={{ marginTop: 10, fontSize: 26, fontWeight: 700, color: t.metaColor, textAlign: "center" }}>
            {item.subtitle}
          </div>
        )}
      </div>

      <div style={{ position: "absolute", bottom: 150, left: 0, right: 0, padding: `0 ${padX}px`, zIndex: 1 }}>
        <div style={{ borderTop: `2px solid ${t.dividerColor}`, marginBottom: 30 }} />
        <div style={{ display: "grid", gridTemplateColumns: item.certifiedDate ? "repeat(2, 1fr)" : "1fr", gap: 14 }}>
          <div style={{ background: tileBg, border: `1px solid ${tileBorder}`, borderRadius: 16, padding: "22px 8px", textAlign: "center" }}>
            <span style={{ fontSize: 92, lineHeight: 1, display: "block" }}>{meta.emoji}</span>
            <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: "0.5px", textTransform: "uppercase", color: meta.color, marginTop: 14 }}>
              {meta.label} Certified
            </div>
          </div>
          {item.certifiedDate && (
            <div style={{ background: tileBg, border: `1px solid ${tileBorder}`, borderRadius: 16, padding: "24px 8px", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ fontSize: 44, fontWeight: 900, color: meta.color }}>{item.certifiedDate}</div>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "0.5px", textTransform: "uppercase", color: t.metaColor, marginTop: 10 }}>
                Certified
              </div>
            </div>
          )}
        </div>
      </div>

      <PosterFooter theme={theme} padX={padX} />
    </div>
  );
}
