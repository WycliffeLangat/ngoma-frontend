export default function StatusBadge({ value = "draft" }) {
  const status = String(value || "draft").toLowerCase();
  return <span className={`cms-status cms-status-${status.replace(/_/g, "-")}`}>{String(value || "draft").replace(/_/g, " ")}</span>;
}
