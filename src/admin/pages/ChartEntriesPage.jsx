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
  { key: "rank",             label: "Rank",             type: "number" },
  { key: "total_points",     label: "Total points",     type: "number" },
  { key: "weeks_on_chart",   label: "Weeks on chart",   type: "number" },
  { key: "peak_rank",        label: "Peak rank",        type: "number" },
  { key: "prev_rank",        label: "Prev rank",        type: "number" },
  { key: "featured_artists", label: "Featured artists", type: "text"   },
  { key: "confidence",       label: "Confidence",       type: "text"   },
];

const COMBINED = "combined";

export default function ChartEntriesPage() {
  const [charts, setCharts]         = useState([]);
  const [platforms, setPlatforms]   = useState([]);
  const [chartType, setChartType]   = useState("singles");
  const [chartId, setChartId]       = useState("");
  const [platformId, setPlatformId] = useState(COMBINED);
  const [entries, setEntries]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [selected, setSelected]     = useState(null);
  const [form, setForm]             = useState({});
  const [saving, setSaving]         = useState(false);
  const [imageFile, setImageFile]   = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const imgInputRef = useRef();

  // Load platforms once
  useEffect(() => {
    cmsApi.get("/platforms/?active=true&page_size=100")
      .then(d => setPlatforms(getResults(d)))
      .catch(() => {});
  }, []);

  // Reload charts whenever chart type changes so we get the full list for each type
  useEffect(() => {
    cmsApi.get(`/charts/?chart_type=${chartType}&ordering=-year,-month&page_size=200`)
      .then(d => setCharts(getResults(d)))
      .catch(e => setError(e.message));
  }, [chartType]);

  const typedCharts = charts;

  // Platforms relevant to the current chart type
  const relevantPlatforms = platforms.filter(p =>
    chartType === "singles" ? p.supports_singles : p.supports_albums
  );

  // Auto-select most recent chart when type changes; reset platform to Combined
  useEffect(() => {
    const first = typedCharts[0];
    setChartId(first ? String(first.id) : "");
    setPlatformId(COMBINED);
    setSelected(null);
  }, [chartType, charts]); // eslint-disable-line

  // Reset platform to Combined when chart month changes
  useEffect(() => {
    setPlatformId(COMBINED);
    setSelected(null);
  }, [chartId]);

  // Load entries whenever chart or platform changes
  useEffect(() => {
    if (!chartId) { setEntries([]); return; }
    setLoading(true); setError(""); setSelected(null);
    const platformParam = platformId === COMBINED ? "combined" : platformId;
    cmsApi.get(`/chart-entries/?chart=${chartId}&platform=${platformParam}&ordering=rank&page_size=200`)
      .then(d => setEntries(getResults(d)))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [chartId, platformId]);

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

      if (imageFile && selected.release) {
        const fd = new FormData();
        fd.append("cover_image", imageFile);
        const updatedRelease = await cmsApi.patch(`/releases/${selected.release}/`, fd);
        updated.cover_image = updatedRelease?.cover_image || imagePreview;
      }

      setEntries(prev => prev.map(e => e.id === selected.id ? { ...e, ...updated } : e));
      setSelected(prev => ({ ...prev, ...updated }));
      setImageFile(null);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  const selectedChart   = charts.find(c => String(c.id) === chartId);
  const isLocked        = !!selectedChart?.locked;
  const activePlatform  = platformId === COMBINED
    ? { name: "Combined", color: "#B8860B" }
    : platforms.find(p => String(p.id) === String(platformId));

  const panelLabel = (label) => (
    <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "#5e625c", display: "block", marginBottom: 5 }}>
      {label}
    </span>
  );

  const pillBtn = (key, label, color) => {
    const active = String(platformId) === String(key);
    return (
      <button
        key={key}
        type="button"
        onClick={() => setPlatformId(String(key))}
        style={{
          border: active ? `2px solid ${color || "#111"}` : "2px solid #E8E1D2",
          borderRadius: 999,
          padding: "4px 14px",
          fontSize: 12,
          fontWeight: 750,
          cursor: "pointer",
          background: active ? (color || "#111") : "#fff",
          color: active ? "#fff" : "#555",
          whiteSpace: "nowrap",
          transition: "all .12s",
        }}
      >{label}</button>
    );
  };

  return (
    <section>
      <div className="cms-page-head">
        <div>
          <h1>Chart Entries</h1>
          <p>Browse and edit chart entries by month and platform.</p>
        </div>
      </div>

      {error && <div className="cms-alert error">{error}</div>}

      {/* ── Toolbar: chart type + month ── */}
      <div className="cms-toolbar" style={{ flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, background: "#f0ece5", borderRadius: 12, padding: 4 }}>
          {["singles", "albums"].map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setChartType(t)}
              style={{
                border: 0, borderRadius: 9, padding: "5px 16px", fontSize: 13, fontWeight: 750, cursor: "pointer",
                background: chartType === t ? "#111" : "transparent",
                color:      chartType === t ? "#fff"  : "#666",
              }}
            >{t === "singles" ? "Singles" : "Albums"}</button>
          ))}
        </div>

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
            🔒 Locked — read only
          </span>
        )}

        {chartId && entries.length > 0 && (
          <span style={{ marginLeft: "auto", fontSize: 12, color: "#888" }}>
            {entries.length} entr{entries.length === 1 ? "y" : "ies"}
            {activePlatform ? ` · ${activePlatform.name}` : ""}
          </span>
        )}
      </div>

      {/* ── Platform pill bar ── */}
      {chartId && (
        <div className="cms-pill-bar" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16, alignItems: "center" }}>
          {pillBtn(COMBINED, "Combined", "#B8860B")}
          {relevantPlatforms.map(p =>
            pillBtn(p.id, p.short_name || p.name, p.color || "#555")
          )}
        </div>
      )}

      {/* ── Body ── */}
      {!chartId ? (
        <div className="cms-empty">Select a chart month above to view its entries.</div>
      ) : loading ? (
        <div className="cms-empty">Loading entries…</div>
      ) : (
        <div className="cms-entries-layout" style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>

          {/* Entry table */}
          <div className="cms-entries-table" style={{ flex: 1, minWidth: 0 }}>
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
                    const mv     = movement(entry);
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
                      <td colSpan={7} style={{ textAlign: "center", color: "#bbb", padding: 36 }}>
                        No entries for this chart{activePlatform ? ` on ${activePlatform.name}` : ""}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Edit panel */}
          {selected && <div className="cms-entries-backdrop" onClick={() => setSelected(null)} />}
          {selected && (
            <div className="cms-entries-panel" style={{ width: 300, flexShrink: 0, background: "#fff", border: "1px solid #E8E1D2", borderRadius: 20, padding: 20, position: "sticky", top: 90 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.2 }}>{selected.title}</div>
                  <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{selected.artist_display || selected.artist}</div>
                  {activePlatform?.name && activePlatform.name !== "Combined" && (
                    <div style={{ fontSize: 10, fontWeight: 700, color: activePlatform.color || "#555", marginTop: 3, textTransform: "uppercase", letterSpacing: ".04em" }}>
                      {activePlatform.name}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  style={{ border: 0, background: "#f1eee7", borderRadius: 8, width: 30, height: 30, fontSize: 18, cursor: "pointer", lineHeight: 1, flexShrink: 0, marginLeft: 8 }}
                >×</button>
              </div>

              {/* Cover image — only meaningful on Combined; platform rows share the same release */}
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
                    {imageFile
                      ? <span style={{ color: "#1B7F3A", fontWeight: 700 }}>✓ {imageFile.name}</span>
                      : "Click thumbnail to replace"
                    }
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
                  <button className="cms-btn full" disabled={saving} onClick={save} style={{ marginTop: 6 }}>
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
