import { useEffect, useRef, useState } from "react";
import { cmsApi, getResults } from "../api";

const MOVE_COLOR = { NEW: "#1565C0", up: "#1B7F3A", down: "#C62828", same: "#999" };

function movement(entry) {
  if (!entry.prev_rank) return { label: "NEW", color: MOVE_COLOR.NEW };
  const diff = entry.prev_rank - entry.rank;
  if (diff > 0) return { label: `+${diff}`, color: MOVE_COLOR.up };
  if (diff < 0) return { label: String(diff), color: MOVE_COLOR.down };
  return { label: "=", color: MOVE_COLOR.same };
}

const FIELD_DEFS = [
  { key: "rank",            label: "Rank",             type: "number" },
  { key: "total_points",    label: "Total points",     type: "number" },
  { key: "weeks_on_chart",  label: "Weeks on chart",   type: "number" },
  { key: "peak_rank",       label: "Peak rank",        type: "number" },
  { key: "prev_rank",       label: "Prev rank",        type: "number" },
  { key: "featured_artists",label: "Featured artists", type: "text"   },
  { key: "confidence",      label: "Confidence",       type: "text"   },
];

export default function ChartEntriesPage() {
  const [charts, setCharts]     = useState([]);
  const [chartType, setChartType] = useState("singles");
  const [chartId, setChartId]   = useState("");
  const [entries, setEntries]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [selected, setSelected] = useState(null);
  const [form, setForm]         = useState({});
  const [saving, setSaving]     = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const imgInputRef = useRef();

  // Load all chart months once
  useEffect(() => {
    cmsApi.get("/charts/?ordering=-year,-month&page_size=200")
      .then(d => setCharts(getResults(d)))
      .catch(e => setError(e.message));
  }, []);

  const typedCharts = charts.filter(c => c.chart_type === chartType);

  // Auto-select most recent chart when type changes
  useEffect(() => {
    const first = typedCharts[0];
    setChartId(first ? String(first.id) : "");
    setSelected(null);
  }, [chartType, charts]); // eslint-disable-line

  // Load entries when chart selection changes
  useEffect(() => {
    if (!chartId) { setEntries([]); return; }
    setLoading(true); setError(""); setSelected(null);
    cmsApi.get(`/chart-entries/?chart=${chartId}&platform=combined&ordering=rank&page_size=200`)
      .then(d => setEntries(getResults(d)))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [chartId]);

  function pickEntry(entry) {
    setSelected(entry);
    setForm({
      rank:             entry.rank,
      total_points:     entry.total_points,
      weeks_on_chart:   entry.weeks_on_chart,
      peak_rank:        entry.peak_rank,
      prev_rank:        entry.prev_rank ?? "",
      featured_artists: entry.featured_artists || "",
      confidence:       entry.confidence || "",
    });
    setImageFile(null);
    setImagePreview(null);
  }

  function pickImage(file) {
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function save() {
    if (!selected || saving) return;
    setSaving(true); setError("");
    try {
      const payload = {
        rank:             Number(form.rank),
        total_points:     Number(form.total_points),
        weeks_on_chart:   Number(form.weeks_on_chart),
        peak_rank:        Number(form.peak_rank),
        prev_rank:        form.prev_rank !== "" ? Number(form.prev_rank) : null,
        featured_artists: form.featured_artists,
        confidence:       form.confidence,
      };
      const updated = await cmsApi.patch(`/chart-entries/${selected.id}/`, payload);

      // Upload cover image to the release if changed
      if (imageFile && selected.release) {
        const fd = new FormData();
        fd.append("cover_image", imageFile);
        await cmsApi.patch(`/releases/${selected.release}/`, fd);
        updated.cover_image = imagePreview; // optimistic local update
      }

      setEntries(prev => prev.map(e => e.id === selected.id ? { ...e, ...updated } : e));
      setSelected(prev => ({ ...prev, ...updated }));
      setImageFile(null);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  const selectedChart = charts.find(c => String(c.id) === chartId);
  const isLocked = !!selectedChart?.locked;

  const panelLabel = (label) => (
    <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "#5e625c", display: "block", marginBottom: 5 }}>{label}</span>
  );

  return (
    <section>
      <div className="cms-page-head">
        <div>
          <h1>Chart Entries</h1>
          <p>Browse and edit the Combined Top 50 for any chart month.</p>
        </div>
      </div>

      {error && <div className="cms-alert error">{error}</div>}

      {/* Toolbar */}
      <div className="cms-toolbar" style={{ flexWrap: "wrap" }}>
        {/* Singles / Albums toggle */}
        <div style={{ display: "flex", gap: 6, background: "#f0ece5", borderRadius: 12, padding: 4 }}>
          {["singles", "albums"].map(t => (
            <button
              key={t}
              onClick={() => setChartType(t)}
              style={{
                border: 0, borderRadius: 9, padding: "5px 16px", fontSize: 13, fontWeight: 750, cursor: "pointer",
                background: chartType === t ? "#111" : "transparent",
                color: chartType === t ? "#fff" : "#666",
              }}
            >{t === "singles" ? "Singles" : "Albums"}</button>
          ))}
        </div>

        {/* Month selector */}
        <select
          className="cms-select"
          value={chartId}
          onChange={e => setChartId(e.target.value)}
          style={{ minWidth: 200 }}
        >
          <option value="">— Select month —</option>
          {typedCharts.map(c => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>

        {isLocked && (
          <span style={{ fontSize: 12, color: "#C62828", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
            🔒 Chart is locked — read only
          </span>
        )}

        {chartId && entries.length > 0 && (
          <span style={{ marginLeft: "auto", fontSize: 12, color: "#888" }}>{entries.length} entr{entries.length === 1 ? "y" : "ies"}</span>
        )}
      </div>

      {/* Body */}
      {!chartId ? (
        <div className="cms-empty">Select a chart month above to view its entries.</div>
      ) : loading ? (
        <div className="cms-empty">Loading entries…</div>
      ) : (
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>

          {/* ── Entry table ── */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="cms-table-wrap">
              <table className="cms-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th style={{ width: 42 }}></th>
                    <th>Title / Artist</th>
                    <th style={{ width: 80 }}>Points</th>
                    <th style={{ width: 52 }}>Wks</th>
                    <th style={{ width: 52 }}>Peak</th>
                    <th style={{ width: 52 }}>Chg</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(entry => {
                    const mv = movement(entry);
                    const active = selected?.id === entry.id;
                    return (
                      <tr
                        key={entry.id}
                        className="clickable"
                        onClick={() => pickEntry(entry)}
                        style={{ background: active ? "#fffaf0" : undefined }}
                      >
                        <td style={{ fontWeight: 800, color: "#aaa", fontSize: 13 }}>{entry.rank}</td>
                        <td style={{ padding: "8px 10px" }}>
                          {entry.cover_image
                            ? <img src={entry.cover_image} alt="" style={{ width: 36, height: 36, borderRadius: 7, objectFit: "cover", display: "block" }} />
                            : <div style={{ width: 36, height: 36, borderRadius: 7, background: "#f0ece5", display: "grid", placeItems: "center", fontSize: 17 }}>🎵</div>
                          }
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.3 }}>{entry.title}</div>
                          <div style={{ fontSize: 11, color: "#888", marginTop: 1 }}>{entry.artist_display || entry.artist}</div>
                        </td>
                        <td style={{ fontSize: 13, fontWeight: 600 }}>{(entry.total_points || 0).toLocaleString()}</td>
                        <td style={{ fontSize: 13, color: "#666" }}>{entry.weeks_on_chart}</td>
                        <td style={{ fontSize: 13, color: "#666" }}>{entry.peak_rank}</td>
                        <td>
                          <span style={{ fontSize: 11, fontWeight: 800, color: mv.color }}>{mv.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                  {!entries.length && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", color: "#bbb", padding: 36 }}>No entries for this chart</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Edit panel ── */}
          {selected && (
            <div style={{ width: 300, flexShrink: 0, background: "#fff", border: "1px solid #E8E1D2", borderRadius: 20, padding: 20, position: "sticky", top: 90 }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.2 }}>{selected.title}</div>
                  <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{selected.artist_display || selected.artist}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  style={{ border: 0, background: "#f1eee7", borderRadius: 8, width: 30, height: 30, fontSize: 18, cursor: "pointer", lineHeight: 1, flexShrink: 0 }}
                >×</button>
              </div>

              {/* Cover image */}
              <div style={{ marginBottom: 18 }}>
                {panelLabel("Cover image")}
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <button
                    type="button"
                    title="Click to upload a new cover image"
                    onClick={() => imgInputRef.current?.click()}
                    style={{ width: 70, height: 70, borderRadius: 12, overflow: "hidden", border: "2px dashed #E8E1D2", background: "#faf8f2", cursor: "pointer", padding: 0, flexShrink: 0 }}
                  >
                    {(imagePreview || selected.cover_image)
                      ? <img src={imagePreview || selected.cover_image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      : <span style={{ fontSize: 26, color: "#ccc" }}>+</span>
                    }
                  </button>
                  <div style={{ fontSize: 11, color: "#888", lineHeight: 1.5 }}>
                    {imageFile ? <span style={{ color: "#1B7F3A", fontWeight: 700 }}>✓ {imageFile.name}</span> : "Click thumbnail to replace"}
                  </div>
                  <input
                    ref={imgInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: "none" }}
                    onChange={e => pickImage(e.target.files?.[0])}
                  />
                </div>
              </div>

              {/* Fields */}
              {FIELD_DEFS.map(({ key, label, type }) => (
                <label key={key} style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
                  {panelLabel(label)}
                  <input
                    type={type}
                    value={form[key] ?? ""}
                    disabled={isLocked}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ border: "1px solid #E8E1D2", borderRadius: 10, padding: "8px 11px", font: "inherit", fontSize: 13, outline: "none", background: isLocked ? "#faf8f2" : "#fff" }}
                  />
                </label>
              ))}

              {isLocked
                ? <div className="cms-alert" style={{ marginTop: 8, fontSize: 12 }}>This chart is locked. Unlock it first to make changes.</div>
                : (
                  <button
                    className="cms-btn full"
                    disabled={saving}
                    onClick={save}
                    style={{ marginTop: 6 }}
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                )
              }
            </div>
          )}
        </div>
      )}
    </section>
  );
}
