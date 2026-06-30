import { useEffect, useRef } from "react";
import StatusBadge from "./StatusBadge";

function SelectCheckbox({ checked, indeterminate = false, label, onChange }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      aria-label={label}
      onChange={onChange}
      onClick={(event) => event.stopPropagation()}
    />
  );
}

export default function DataTable({
  columns = [],
  rows = [],
  onRowClick,
  empty = "No data yet.",
  selectable = false,
  selectedIds = new Set(),
  onToggleRow,
  onToggleAll,
}) {
  if (!rows.length) return <div className="cms-empty">{empty}</div>;
  const selectedCount = rows.filter((row) => selectedIds.has(row.id)).length;
  const allSelected = selectedCount === rows.length;
  return (
    <div className="cms-table-wrap">
      <table className="cms-table">
        <thead>
          <tr>
            {selectable && (
              <th className="cms-select-cell">
                <SelectCheckbox
                  checked={allSelected}
                  indeterminate={selectedCount > 0 && !allSelected}
                  label={allSelected ? "Clear all rows on this page" : "Select all rows on this page"}
                  onChange={() => onToggleAll?.(rows, !allSelected)}
                />
              </th>
            )}
            {columns.map((col) => <th key={col.key}>{col.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.id || index}
              onClick={() => onRowClick?.(row)}
              className={[
                onRowClick ? "clickable" : "",
                selectedIds.has(row.id) ? "selected" : "",
              ].filter(Boolean).join(" ")}
            >
              {selectable && (
                <td className="cms-select-cell" data-label="Select">
                  <SelectCheckbox
                    checked={selectedIds.has(row.id)}
                    label={`Select row ${row.id}`}
                    onChange={() => onToggleRow?.(row)}
                  />
                </td>
              )}
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
