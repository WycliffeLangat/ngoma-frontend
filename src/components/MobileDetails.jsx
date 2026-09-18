import { Children, useState } from "react";

export default function MobileDetails({ label, isMobile, children }) {
  const [expanded, setExpanded] = useState(false);
  if (!isMobile) return <>{children}</>;
  return <details className="ngoma-more-details" open={expanded} onToggle={event => setExpanded(event.currentTarget.open)}>
    <summary><span>{label}</span><span className="ngoma-details-chevron" aria-hidden="true" /></summary>
    {expanded && <div className="ngoma-more-details-body">{children}</div>}
  </details>;
}

export function MobileStatSummary({ isMobile, children, previewCount = 4, ...gridProps }) {
  const stats = Children.toArray(children);
  if (!isMobile) return <div {...gridProps}>{children}</div>;
  return <>
    <div {...gridProps}>{stats.slice(0, previewCount)}</div>
    {stats.length > previewCount && <MobileDetails label="More chart statistics" isMobile>
      <div {...gridProps}>{stats.slice(previewCount)}</div>
    </MobileDetails>}
  </>;
}
