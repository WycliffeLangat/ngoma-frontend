import { CERTIFICATION_BRANDING } from "../utils/certificationBranding.js";

// Display each original badge from the supplied artwork, without its wordmark.
// An ordinary image keeps the artwork compatible with PNG poster exports.
export default function CertificationIcon({ level, size = "1.35em" }) {
  const meta = CERTIFICATION_BRANDING[level];
  if (!meta) return null;
  return (
    <span role="img" aria-label={`${meta.label} certification`} style={{
      display: "inline-block", position: "relative", overflow: "hidden",
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      verticalAlign: "middle", lineHeight: 0,
    }}>
      <img src="/certifications/award-icons.jpeg" alt="" draggable={false} style={{
        position: "absolute", width: `${1600 / 264 * 100}%`, maxWidth: "none",
        height: "auto", left: `${-meta.cropX / 264 * 100}%`,
        top: `${-180 / 264 * 100}%`,
      }} />
    </span>
  );
}
