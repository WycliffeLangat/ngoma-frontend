import { useEffect, useRef, useState } from "react";
import { cmsApi } from "../api";

const TYPE_META = {
  artist:        { label: "Artists",       page: "artists",        color: "#7c5cbf" },
  singles:       { label: "Songs",         page: "songs",          color: "#2d7dd2" },
  albums:        { label: "Albums",        page: "albums",         color: "#1a8a5a" },
  news:          { label: "News",          page: "news",           color: "#c05c00" },
  certification: { label: "Certifications",page: "certifications", color: "#b7980f" },
};

export default function GlobalSearch({ onNavigate }) {
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState([]);
  const [open, setOpen]         = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [loading, setLoading]   = useState(false);
  const inputRef = useRef(null);
  const wrapRef  = useRef(null);

  // Debounced fetch
  useEffect(() => {
    if (!query.trim()) { setResults([]); setOpen(false); return; }
    const t = setTimeout(() => {
      setLoading(true);
      cmsApi.get(`/search/?q=${encodeURIComponent(query)}`)
        .then(d => { setResults(d.results || []); setOpen(true); setActiveIdx(-1); })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 230);
    return () => clearTimeout(t);
  }, [query]);

  // Close on click outside
  useEffect(() => {
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false); setActiveIdx(-1);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function select(r) {
    const meta = TYPE_META[r.type] || { page: r.type };
    onNavigate(meta.page, r.title, r.id);
    setQuery(""); setResults([]); setOpen(false); setActiveIdx(-1);
  }

  function onKeyDown(e) {
    if (e.key === "Escape") {
      setOpen(false); setActiveIdx(-1); inputRef.current?.blur(); return;
    }
    if (!open || !results.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && activeIdx >= 0) { e.preventDefault(); select(results[activeIdx]); }
  }

  // Group results by type, preserving first-appearance order
  const typeOrder = [];
  const grouped   = {};
  results.forEach((r, i) => {
    if (!grouped[r.type]) { grouped[r.type] = []; typeOrder.push(r.type); }
    grouped[r.type].push({ ...r, _idx: i });
  });

  return (
    <div ref={wrapRef} style={{ position: "relative", flex: 1, maxWidth: 440 }}>
      {/* Input */}
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search songs, artists, ISRC, labels…"
          style={{ width: "100%", boxSizing: "border-box", paddingRight: query ? 28 : undefined }}
        />
        {query && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => { setQuery(""); setResults([]); setOpen(false); inputRef.current?.focus(); }}
            style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: 17, lineHeight: 1, padding: "0 2px" }}
          >×</button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 1200,
          background: "#fff", border: "1px solid #ddd", borderRadius: 8,
          boxShadow: "0 6px 24px rgba(0,0,0,.13)", maxHeight: 420, overflowY: "auto",
        }}>
          {loading && results.length === 0 && (
            <div style={{ padding: "12px 14px", color: "#aaa", fontSize: 13 }}>Searching…</div>
          )}
          {!loading && results.length === 0 && (
            <div style={{ padding: "12px 14px", color: "#888", fontSize: 13 }}>No results for "{query}"</div>
          )}

          {typeOrder.map(type => {
            const meta = TYPE_META[type] || { label: type, color: "#888" };
            return (
              <div key={type}>
                <div style={{
                  padding: "6px 14px 4px", fontSize: 10, fontWeight: 700,
                  color: meta.color, textTransform: "uppercase", letterSpacing: ".09em",
                  background: "#fafafa", borderTop: "1px solid #f0f0f0", borderBottom: "1px solid #f0f0f0",
                }}>
                  {meta.label}
                </div>
                {grouped[type].map(r => (
                  <button
                    key={`${r.type}-${r.id}`}
                    type="button"
                    onMouseEnter={() => setActiveIdx(r._idx)}
                    onClick={() => select(r)}
                    style={{
                      display: "flex", alignItems: "baseline", gap: 8, width: "100%",
                      textAlign: "left", padding: "8px 14px", border: "none", cursor: "pointer",
                      background: r._idx === activeIdx ? "#f0f7ff" : "transparent",
                      borderBottom: "1px solid #f9f9f9",
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#1a1a1a", flexShrink: 0 }}>{r.title}</span>
                    {r.subtitle && (
                      <span style={{ fontSize: 12, color: "#777", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.subtitle}
                      </span>
                    )}
                    {r.meta && (
                      <span style={{ fontSize: 11, color: "#bbb", marginLeft: "auto", flexShrink: 0 }}>
                        {r.meta}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            );
          })}

          <div style={{ padding: "6px 14px", fontSize: 10, color: "#bbb", borderTop: "1px solid #f0f0f0", textAlign: "right" }}>
            ↑↓ navigate &nbsp;·&nbsp; Enter select &nbsp;·&nbsp; Esc close
          </div>
        </div>
      )}
    </div>
  );
}
