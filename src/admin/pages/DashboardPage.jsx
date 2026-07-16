import { useEffect, useState } from "react";
import { cmsApi } from "../api";
import DataTable from "../components/DataTable";
import { buildDashboardAudit, mergeDashboardAudit } from "../dataQualityAudit";

const labels = {
  total_songs: "Total songs", total_albums: "Total albums", total_artists: "Total artists",
  latest_uploaded_chart_month: "Latest chart month", pending_approvals: "Pending approvals",
  missing_artist_countries: "Artists without country", duplicate_artists_detected: "Duplicate artists",
  latest_news_posts: "News posts", recently_edited_data: "Audit events", errors_warnings: "Open reports",
  system_health: "System health", last_backup_date: "Last backup", editors_admins: "Editors/admins",
  unpublished_chart_months: "Unpublished charts", automatic_certifications: "Automatic certifications", certifications_unofficial: "Automatic certifications", uploads_awaiting_review: "Uploads awaiting review",
  data_audit_findings: "Audit findings", critical_data_issues: "Critical issues", incomplete_metadata: "Incomplete metadata",
  missing_media_assets: "Missing media", invalid_urls_detected: "Invalid URLs", questionable_countries: "Questionable countries",
  chart_uploads_needed: "Uploads needed",
};

const cardMeta = {
  total_songs: { icon: "♪", hint: "Songs in the catalogue", target: "songs" },
  total_albums: { icon: "◉", hint: "Albums in the catalogue", target: "albums" },
  total_artists: { icon: "A", hint: "Artist profiles", target: "artists" },
  latest_uploaded_chart_month: { icon: "↗", hint: "Most recent chart import", target: "uploads" },
  pending_approvals: { icon: "✓", hint: "Items awaiting review", target: "uploads" },
  missing_artist_countries: { icon: "!", hint: "Profiles needing attention", target: "artists" },
  duplicate_artists_detected: { icon: "≋", hint: "Potential duplicate profiles", target: "duplicate-review" },
  latest_news_posts: { icon: "N", hint: "Published and draft stories", target: "news" },
  recently_edited_data: { icon: "↺", hint: "Recent change events", target: "audit" },
  errors_warnings: { icon: "!", hint: "Open quality reports", target: "reports" },
  system_health: { icon: "●", hint: "Publishing and data checks", target: "reports" },
  last_backup_date: { icon: "↧", hint: "Most recent backup", target: "backups" },
  editors_admins: { icon: "U", hint: "People with CMS access", target: "users" },
  unpublished_chart_months: { icon: "○", hint: "Charts not yet public", target: "charts" },
  automatic_certifications: { icon: "◇", hint: "Point-driven public awards", target: "certifications" },
  certifications_unofficial: { icon: "◇", hint: "Point-driven public awards", target: "certifications" },
  uploads_awaiting_review: { icon: "↑", hint: "Imports awaiting review", target: "uploads" },
  data_audit_findings: { icon: "QA", hint: "Deep CMS audit results", target: "reports" },
  critical_data_issues: { icon: "!", hint: "Fix first", target: "reports" },
  incomplete_metadata: { icon: "i", hint: "Required details missing", target: "reports" },
  missing_media_assets: { icon: "IMG", hint: "Images and files missing", target: "media" },
  invalid_urls_detected: { icon: "URL", hint: "Broken or wrong links", target: "reports" },
  questionable_countries: { icon: "CC", hint: "Country data to verify", target: "countries" },
  chart_uploads_needed: { icon: "UP", hint: "Chart periods or uploads missing", target: "uploads" },
};

// Keys where a non-zero value signals something needs attention
const WARN_IF_NONZERO = new Set([
  "missing_artist_countries", "duplicate_artists_detected",
  "errors_warnings",
  "data_audit_findings", "incomplete_metadata", "missing_media_assets",
  "invalid_urls_detected", "questionable_countries",
]);

const DANGER_IF_NONZERO = new Set([
  "critical_data_issues", "chart_uploads_needed",
]);

// Where each alert's "Fix" button should land, keyed by the stable alert id
// the backend assigns (see cms_alerts.py). A handful of alerts share a
// `module` with a page that can't actually resolve their record ids (e.g.
// duplicate-artist groups, or chart-entry problems whose ids point at the
// parent chart) so those are listed explicitly rather than derived from
// `module` alone.
const ALERT_PAGE_BY_ID = {
  "open-data-quality-reports": "reports",
  "artists-missing-country": "artists",
  "artists-partial-country": "artists",
  "artists-unknown-country-code": "artists",
  "artist-profile-completeness": "artists",
  "releases-missing-country": "songs",
  "releases-partial-country": "songs",
  "releases-unknown-country-code": "songs",
  "release-metadata-completeness": "songs",
  "possible-duplicate-artists": "duplicate-review",
  "country-settings-incomplete": "countries",
  "platform-settings-invalid": "platforms",
  "charts-unpublished": "charts",
  "chart-publication-state-mismatch": "charts",
  "charts-without-entries": "chart-entries",
  "charts-missing-combined-ranking": "chart-entries",
  "invalid-chart-entry-values": "chart-entries",
  "chart-rank-gaps": "chart-entries",
  "uploads-awaiting-action": "uploads",
  "upload-validation-errors": "uploads",
  "upload-validation-warnings": "uploads",
  "news-awaiting-action": "news",
  "scheduled-news-overdue": "news",
  "news-publication-state-mismatch": "news",
  "published-news-completeness": "news",
  "certifications-invalid-values": "certifications",
  "certifications-below-threshold": "certifications",
  "certification-rule-configuration": "certification-rules",
  "visible-page-content-empty": "page-content",
  "media-metadata-incomplete": "media",
  "methodology-active-count": "methodology",
  "countries-duplicate-code": "countries",
  "inactive-editor-accounts": "users",
  "backup-missing": "backups",
  "latest-backup-failed": "backups",
  "backup-stale": "backups",
};

// Fallback for any alert id not listed above (forward-compatible with new
// backend alerts), derived from its `module` field.
const ALERT_PAGE_BY_MODULE = {
  reports: "reports", artists: "artists", releases: "songs", countries: "countries",
  platforms: "platforms", charts: "charts", chart_entries: "chart-entries",
  chart_uploads: "uploads", news: "news", certifications: "certifications",
  certification_rules: "certification-rules", page_content: "page-content",
  media: "media", methodology: "methodology", backups: "backups",
};

const PAGE_LABELS = {
  reports: "Data quality", artists: "Artists", songs: "Songs", countries: "Countries",
  platforms: "Platforms", charts: "Chart periods", "chart-entries": "Chart entries",
  uploads: "Imports & uploads", news: "News", certifications: "Certifications",
  "certification-rules": "Certification rules", "page-content": "Page content",
  media: "Media library", methodology: "Ranking methodology", backups: "Backups",
  "duplicate-review": "Duplicate review", users: "Users & roles",
};

function alertPage(alert) {
  return alert.page || ALERT_PAGE_BY_ID[alert.id] || ALERT_PAGE_BY_MODULE[alert.module];
}

// Which alert backs each "needs attention" stat card, so clicking the card
// can jump straight into the worst offending record rather than an
// unfiltered list.
const CARD_ALERT_ID = {
  missing_artist_countries: "artists-missing-country",
  duplicate_artists_detected: "possible-duplicate-artists",
  errors_warnings: "open-data-quality-reports",
  unpublished_chart_months: "charts-unpublished",
  uploads_awaiting_review: "uploads-awaiting-action",
  data_audit_findings: "audit-open-quality-reports",
  critical_data_issues: "audit-upload-validation-errors",
  incomplete_metadata: "audit-artist-details-incomplete",
  missing_media_assets: "audit-artist-image-missing",
  invalid_urls_detected: "audit-artist-invalid-url",
  questionable_countries: "audit-artist-country-questionable",
  chart_uploads_needed: "audit-chart-upload-needed",
};

// Exact values returned by the backend (cms_views.py line 106)
// 'ACTION_REQUIRED' → error alerts exist
// 'NEEDS_ATTENTION' → warning alerts exist
// 'OK'             → no alerts

function cardClass(key, value) {
  if (DANGER_IF_NONZERO.has(key) && Number(value) > 0) return "danger";
  if (WARN_IF_NONZERO.has(key) && Number(value) > 0) return "warn";
  if (key === "system_health") {
    if (value === "ACTION_REQUIRED") return "danger";
    if (value === "NEEDS_ATTENTION") return "warn";
    if (value === "OK") return "good";
  }
  return "";
}

export default function DashboardPage({ user, onNavigate }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditError, setAuditError] = useState("");
  useEffect(() => {
    let active = true;
    let auditResult = null;
    Promise.all([cmsApi.get("/dashboard/"), cmsApi.get("/dashboard/insights/")])
      .then(([summary, insights]) => {
        if (!active) return;
        const baseData = { ...summary, ...insights, cards: { ...summary.cards, ...insights.cards } };
        setData(auditResult ? mergeDashboardAudit(baseData, auditResult) : baseData);
      })
      .catch((e) => { if (active) setError(e.message); });

    buildDashboardAudit(cmsApi)
      .then((audit) => {
        auditResult = audit;
        if (!active) return;
        setData((current) => current ? mergeDashboardAudit(current, audit) : current);
      })
      .catch((e) => { if (active) setAuditError(e.message || "Deep CMS audit failed."); })
      .finally(() => { if (active) setAuditLoading(false); });
    return () => { active = false; };
  }, []);
  if (error) return <div className="cms-alert error">{error}</div>;
  if (!data) return <div className="cms-empty">Loading dashboard...</div>;
  const firstName = user?.first_name || user?.username || "there";
  return (
    <section>
      <div className="cms-page-head cms-dashboard-head">
        <div>
          <span className="cms-eyebrow">Overview</span>
          <h1>Welcome back, {firstName}</h1>
          <p>Here is what needs your attention across Ngoma Charts.</p>
        </div>
        {!user?.permissions?.read_only && (
          <div className="cms-quick-actions" aria-label="Quick actions">
            <button className="cms-btn light" onClick={() => onNavigate?.("chart-entries")}>Manage chart</button>
            <button className="cms-btn" onClick={() => onNavigate?.("uploads")}>Upload chart</button>
          </div>
        )}
      </div>
      <div className="cms-card-grid">
        {Object.entries(data.cards || {}).map(([key, value]) => {
          const cls = cardClass(key, value);
          const meta = cardMeta[key] || { icon: "•", hint: "View details" };
          const linkedAlert = (data.alerts || []).find((a) => a.id === CARD_ALERT_ID[key]);
          const targetPage = linkedAlert ? alertPage(linkedAlert) : meta.target;
          const interactive = Boolean(targetPage && onNavigate);
          const Card = interactive ? "button" : "div";
          const pinpoint = (linkedAlert?.details || []).find((d) => d.id != null);
          return (
            <Card
              type={interactive ? "button" : undefined}
              className={`cms-stat-card${cls ? ` ${cls}` : ""}${interactive ? " interactive" : ""}`}
              key={key}
              onClick={interactive ? () => (
                pinpoint ? onNavigate(targetPage, pinpoint.label, pinpoint.id) : onNavigate(targetPage)
              ) : undefined}
            >
              <span className="cms-stat-icon" aria-hidden="true">{meta.icon}</span>
              <span className="cms-stat-label">{labels[key] || key}</span>
              <strong>{format(value)}</strong>
              <small>{meta.hint}</small>
            </Card>
          );
        })}
      </div>
      <div className="cms-grid two">
        <div className="cms-card">
          <div className="cms-card-heading">
            <div><span className="cms-eyebrow">Needs attention</span><h2>Alerts</h2></div>
            <span className="cms-count-badge">{(data.alerts || []).length}</span>
          </div>
          {(auditLoading || data.auditCoverage || auditError || (data.auditLoadWarnings || []).length > 0) && (
            <div className="cms-audit-strip">
              {auditLoading && <span className="cms-audit-chip">Deep audit running...</span>}
              {data.auditCoverage && (
                <span className="cms-audit-chip">
                  Checked {Number(data.auditCoverage.recordCount || 0).toLocaleString()} records across {data.auditCoverage.moduleCount || 0} modules
                </span>
              )}
              {auditError && <span className="cms-audit-chip error">Deep audit skipped: {auditError}</span>}
              {(data.auditLoadWarnings || []).slice(0, 3).map((warning, index) => (
                <span className="cms-audit-chip warning" key={index}>Skipped {warning}</span>
              ))}
            </div>
          )}
          {(data.alerts || []).length === 0 && <div className="cms-empty compact">Everything looks good. No open alerts.</div>}
          {(data.alerts || []).map((a, i) => {
          const page = alertPage(a);
          const pageLabel = PAGE_LABELS[page] || page;
          const linkableDetails = (a.details || []).filter((d) => d.id != null);
          return (
            <div key={i} className={`cms-alert ${a.level}`}>
              <div className="cms-alert-heading">
                <b>{a.title}</b>
                {a.category && <span>{a.category}</span>}
              </div>
              <div>{a.message}</div>
              {page && onNavigate && linkableDetails.length > 0 && (
                <ul className="cms-alert-detail-list">
                  {linkableDetails.map((d, di) => (
                    <li key={di}>
                      <button className="cms-text-btn" onClick={() => onNavigate(page, d.label, d.id)}>
                        {d.label}{d.problem ? ` — ${d.problem}` : ""}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {page && onNavigate && (
                <div style={{ marginTop: 8 }}>
                  <button className="cms-btn light" style={{ fontSize: 11, padding: "3px 12px" }} onClick={() => onNavigate(page)}>
                    Fix in {pageLabel} →
                  </button>
                </div>
              )}
            </div>
          );
        })}
        </div>
        <div className="cms-card"><div className="cms-card-heading"><div><span className="cms-eyebrow">Current leaders</span><h2>Top performing releases</h2></div></div><DataTable columns={[{key:"release__title",label:"Title"},{key:"release__artist__name",label:"Artist"},{key:"points",label:"Points"}]} rows={data.top_performing || []} /></div>
      </div>
      <div className="cms-card"><div className="cms-card-heading"><div><span className="cms-eyebrow">Audit trail</span><h2>Recent activity</h2></div><button className="cms-text-btn" onClick={() => onNavigate?.("audit")}>View audit log →</button></div><DataTable columns={[{key:"created_at",label:"Time",render:(r)=>new Date(r.created_at).toLocaleString()},{key:"user_name",label:"User"},{key:"action",label:"Action"},{key:"object_repr",label:"Item"}]} rows={data.recent_activity || []} /></div>
    </section>
  );
}
function format(v){
  if(v === null || v === undefined || v === "") return "—";
  if(v === 0) return "0";
  const s = String(v);
  if(/^\d{4}-\d{2}-\d{2}T/.test(s)){
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toLocaleString();
  }
  // Humanise ALL_CAPS_ENUM strings from the backend
  if(/^[A-Z][A-Z0-9_]+$/.test(s)){
    return s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()).toLowerCase()
            .replace(/\b\w/g, c => c.toUpperCase());
  }
  return s;
}
