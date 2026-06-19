import StatusBadge from "./StatusBadge";

export default function DataTable({ columns = [], rows = [], onRowClick, empty = "No data yet." }) {
  if (!rows.length) return <div className="cms-empty">{empty}</div>;
  return (
    <div className="cms-table-wrap">
      <table className="cms-table">
        <thead><tr>{columns.map((col) => <th key={col.key}>{col.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || index} onClick={() => onRowClick?.(row)} className={onRowClick ? "clickable" : ""}>
              {columns.map((col) => (
                <td key={col.key} data-label={col.label}>
                  {col.render ? col.render(row) : col.key === "status" || col.key === "level" ? <StatusBadge value={row[col.key]} /> : formatValue(row[col.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
