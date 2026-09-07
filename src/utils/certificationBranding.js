// Keep the API's level keys so existing awards and rules retain their meaning.
export const CERTIFICATION_BRANDING = {
  gold: { label: "Pulse", color: "#C98545", textColor: "#975321", cropX: 38 },
  platinum: { label: "Wave", color: "#AFC6DA", textColor: "#4F687E", cropX: 536 },
  diamond: { label: "Legacy", color: "#E5B744", textColor: "#87620C", cropX: 1042 },
};

export const certificationLabel = (level) =>
  CERTIFICATION_BRANDING[String(level || "").toLowerCase()]?.label || level;
