import { useEffect, useMemo, useState } from "react";
import { fetchAppData } from "../../api/public";
import { buildYearEndMirror } from "../../utils/publicChartMirror";

export default function YearEndPage({ onNavigate }) {
  const [type, setType] = useState("singles");
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetchAppData()
      .then((data) => { if (active) setPayload(data); })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const rows = useMemo(() => payload ? buildYearEndMirror(payload, type) : [], [payload, type]);
  const openRow = (row) => {
    if (type === "artists") onNavigate?.("artists", row.name, row.artistId);
    else onNavigate?.(type === "albums" ? "albums" : "songs", row.title, row.releaseId);
  };

  return (
    <section>
      <div className="cms-page-head">
        <div>
          <h1>Year End Charts</h1>
          <p>Live mirror of the public year-end Top 50. Select an entry to edit its CMS record.</p>
        </div>
      </div>

      <div className="cms-pill-bar">
        {["singles", "albums", "artists"].map((value) => (
          <button
            key={value}
            type="button"
            className={`cms-btn small ${type === value ? "" : "light"}`}
            onClick={() => setType(value)}
          >
            {value[0].toUpperCase() + value.slice(1)}
          </button>
        ))}
        <span className="cms-help">{rows.length} entries · calculated from every available chart month</span>
      </div>

      {error && <div className="cms-alert error">{error}</div>}
      {loading ? <div className="cms-empty">Loading live year-end chart…</div> : (
        <div className="cms-table-wrap cms-year-end-table">
          <table className="cms-table">
            <thead>
              <tr>
                <th>#</th><th>Image</th><th>{type === "artists" ? "Artist" : "Title / Artist"}</th>
                <th>Points</th><th>Months</th><th>{type === "artists" ? "Unique releases" : "Best rank"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${type}-${row.rank}-${row.artistId || row.releaseId || row.name || row.title}`} className="clickable" onClick={() => openRow(row)}>
                  <td data-label="Rank"><strong>{row.rank}</strong></td>
                  <td data-label="Image">
                    {row.image
                      ? <img src={row.image} alt="" className="cms-chart-image" />
                      : <span className="cms-chart-image cms-chart-image-empty">{type === "artists" ? "A" : "♪"}</span>}
                  </td>
                  <td data-label={type === "artists" ? "Artist" : "Release"}>
                    <strong>{type === "artists" ? row.name : row.title}</strong>
                    {type !== "artists" && <small className="cms-row-subtitle">{row.artist}</small>}
                  </td>
                  <td data-label="Points">{Number(row.points || 0).toLocaleString()}</td>
                  <td data-label="Months">{row.months}</td>
                  <td data-label={type === "artists" ? "Unique releases" : "Best rank"}>
                    {type === "artists" ? row.uniqueReleases : `#${row.best}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
