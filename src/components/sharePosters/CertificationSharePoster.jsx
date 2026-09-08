import CertificationIcon from "../CertificationIcon.jsx";
import { CERTIFICATION_BRANDING } from "../../utils/certificationBranding.js";
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
const CERT_META = CERTIFICATION_BRANDING;

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
  const awardColor = theme === "light" ? meta.textColor : meta.color;

  return (
    <div style={{ width: POSTER_W, height: POSTER_H, background: t.pageBg, fontFamily: POSTER_FONT_FAMILY, color: t.titleColor, position: "relative", overflow: "hidden" }}>
      <div style={{ padding: "72px 64px 0" }}><PosterBrandRow theme={theme} /></div>
      <div style={{ position: "absolute", top: HEADER_ZONE_H, left: padX, right: padX, bottom: 150, display: "flex", flexDirection: "column", justifyContent: "center", gap: 36 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 44, padding: "36px 24px", background: t.rowBg, border: "1px solid " + t.dividerColor, borderRadius: 32 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22, flexShrink: 0 }}>
            <CertificationIcon level={item.level || "gold"} size={280} />
            <span style={{ fontSize: 22, fontWeight: 850, letterSpacing: "3px", textTransform: "uppercase", color: awardColor }}>Official certification</span>
          </div>
          {item.image ? (
            <img src={item.image} alt="" style={{ width: 360, height: 360, objectFit: "cover", borderRadius: 24, boxShadow: "0 16px 40px #00000026" }} />
          ) : <ArtPlaceholder width={360} height={360} radius={24} theme={theme} accentColor={meta.color} markSize={100} />}
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 68, fontWeight: 900, letterSpacing: "-2px", lineHeight: 1.05, color: awardColor }}>{meta.label} Certified</div>
          <div style={{ marginTop: 26, fontSize: item.title.length > 22 ? 44 : 54, fontWeight: 900, lineHeight: 1.12, overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{item.title}</div>
          {item.subtitle && <div style={{ marginTop: 14, fontSize: 28, lineHeight: 1.3, color: t.metaColor, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{item.subtitle}</div>}
          {item.certifiedDate && <div style={{ marginTop: 28, fontSize: 22, color: t.metaColor }}>Certified {item.certifiedDate}</div>}
        </div>
      </div>
      <PosterFooter theme={theme} padX={padX} />
    </div>
  );
}
