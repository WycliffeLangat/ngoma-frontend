export default function MobileDisclosure({ label, isMobile, children }) {
  if (!isMobile) return <>{children}</>;
  return <details className="ngoma-mobile-disclosure">
    <summary>{label}</summary>
    <div className="ngoma-mobile-disclosure-content">{children}</div>
  </details>;
}
