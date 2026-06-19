import StatusBadge from "./StatusBadge";

export default function UploadPreviewTable({ rows = [], limit = 50 }) {
  const visible = rows.slice(0, limit);
  return (
    <div className="cms-table-wrap compact">
      <table className="cms-table">
        <thead>
          <tr><th>#</th><th>Rank</th><th>Title</th><th>Artist</th><th>Country</th><th>Year</th><th>Points</th><th>Status</th></tr>
        </thead>
        <tbody>
          {visible.map((row, i) => (
            <tr key={`${row.row_number}-${i}`}>
              <td>{row.row_number}</td>
              <td>{row.rank}</td>
              <td>{row.title || "—"}</td>
              <td>{row.artist || "—"}</td>
              <td>{row.country_code || row.country || "—"}</td>
              <td>{row.release_year || "—"}</td>
              <td>{row.total_points ?? "—"}</td>
              <td><StatusBadge value={row.entry_status || "draft"} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > limit && <div className="cms-help">Showing first {limit} of {rows.length} rows.</div>}
    </div>
  );
}
