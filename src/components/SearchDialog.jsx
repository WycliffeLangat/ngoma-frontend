import { useEffect, useMemo, useRef, useState } from "react";
import "../styles/search.css";

const categories = [["all", "All"], ["song", "Songs"], ["album", "Albums"], ["artist", "Artists"], ["producer", "Producers"], ["cert", "Certifications"]];
const labels = { song: "Song", album: "Album", artist: "Artist", producer: "Producer", cert: "Certification" };
const title = item => item.display_name || item.name || item.title || item.t || "Untitled";
const recentKey = "ngoma.recent-searches";
function readRecent() {
  try { const value = JSON.parse(localStorage.getItem(recentKey) || "[]"); return Array.isArray(value) ? value.filter(x => typeof x === "string").slice(0, 5) : []; } catch { return []; }
}
function Highlight({ text, query }) {
  const value = String(text || "");
  const index = value.toLowerCase().indexOf(query.trim().toLowerCase());
  if (!query.trim() || index < 0) return value;
  return <>{value.slice(0, index)}<mark>{value.slice(index, index + query.trim().length)}</mark>{value.slice(index + query.trim().length)}</>;
}
export default function SearchDialog({ query, onQuery, results, onClose, onSelect, isDark, renderThumb }) {
  const [category, setCategory] = useState("all");
  const [active, setActive] = useState(-1);
  const [limit, setLimit] = useState(20);
  const [recent, setRecent] = useState(readRecent);
  const dialog = useRef(null);
  const input = useRef(null);
  const ready = query.trim().length >= 2;
  const filtered = useMemo(() => results.filter(item => category === "all" || item._kind === category).sort((a,b) => (b._score || 0) - (a._score || 0) || title(a).localeCompare(title(b))), [results, category]);
  const visible = filtered.slice(0, limit);
  useEffect(() => { setActive(-1); setLimit(20); }, [query, category]);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    input.current?.focus();
    return () => { document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus(); };
  }, []);
  useEffect(() => { if (active >= 0) document.getElementById(`search-result-${active}`)?.scrollIntoView({ block: "nearest" }); }, [active]);
  function saveRecent(value) { setRecent(value); try { localStorage.setItem(recentKey, JSON.stringify(value)); } catch {} }
  function select(item) {
    if (!item) return;
    const value = query.trim();
    if (value) saveRecent([value, ...recent.filter(x => x.toLowerCase() !== value.toLowerCase())].slice(0, 5));
    onSelect(item);
  }
  function keys(event) {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); }
    if (event.key === "Tab") {
      const focusable = [...dialog.current.querySelectorAll('button, input, [tabindex="0"]')].filter(el => !el.disabled);
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  }
  return <div className={`ng-search-overlay ${isDark ? "ng-search-dark" : ""}`} onClick={onClose}>
    <section className="ng-search-dialog" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="search-title" onClick={e => e.stopPropagation()} onKeyDown={keys}>
      <header className="ng-search-header"><div><span className="ng-search-eyebrow">NGOMA CHARTS</span><h2 id="search-title">Find your next favourite.</h2><p>Songs, albums and the people behind the music.</p></div><button className="ng-search-close" aria-label="Close search" onClick={onClose}>×</button></header>
      <div className="ng-search-field"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/></svg><input ref={input} value={query} onChange={e => onQuery(e.target.value)} placeholder="Search a title, artist or producer…" aria-label="Search music and people" role="combobox" aria-expanded={ready && visible.length > 0} aria-controls="ng-search-results" aria-autocomplete="list" aria-activedescendant={active >= 0 && visible[active] ? `search-result-${active}` : undefined} onKeyDown={e => {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setActive(i => !visible.length ? -1 : e.key === "ArrowDown" ? Math.min(i + 1, visible.length - 1) : Math.max(i - 1, 0)); }
        if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); select(visible[Math.max(0, active)]); }
      }}/>{query && <button aria-label="Clear search" onClick={() => { onQuery(""); input.current?.focus(); }}>×</button>}</div>
      <nav className="ng-search-filters" aria-label="Search categories">{categories.map(([key,label]) => <button key={key} aria-pressed={category === key} onClick={() => setCategory(key)}>{label}{ready && <span>{key === "all" ? results.length : results.filter(item => item._kind === key).length}</span>}</button>)}</nav>
      <div className="ng-search-body">
        {!ready && <div className="ng-search-discovery">{recent.length > 0 && <><div className="ng-search-section-title"><strong>Recent searches</strong><button onClick={() => saveRecent([])}>Clear history</button></div><div className="ng-search-recent">{recent.map(value => <button key={value} onClick={() => { onQuery(value); input.current?.focus(); }}>{value}<span>↗</span></button>)}</div></>}<div className="ng-search-tip"><strong>A little curiosity goes a long way.</strong><p>Search by title, artist, producer, genre or country. Two letters are enough to start, and small spelling mistakes are welcome.</p></div></div>}
        {ready && <><div className="ng-search-section-title" role="status"><strong>{filtered.length ? `${filtered.length} result${filtered.length === 1 ? "" : "s"}` : "No matches yet"}</strong><span>{category === "all" ? "Most relevant first" : categories.find(x => x[0] === category)[1]}</span></div>{!filtered.length && <div className="ng-search-empty"><strong>No {category === "all" ? "results" : categories.find(x => x[0] === category)[1].toLowerCase()} for “{query}”</strong><p>Try a shorter name, a different spelling or another category.</p>{category !== "all" && <button onClick={() => setCategory("all")}>Search all categories</button>}</div>}</>}
        <div id="ng-search-results" role="listbox" aria-label="Search results">{ready && visible.map((item,index) => <div key={`${item._kind}-${item.id || title(item)}-${index}`} id={`search-result-${index}`} role="option" aria-selected={active === index} tabIndex={0} className={`ng-search-result ${active === index ? "is-active" : ""} ${index === 0 && category === "all" ? "is-top" : ""}`} onFocus={() => setActive(index)} onClick={() => select(item)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(item); } }}>
          {renderThumb(item)}<div className="ng-search-result-copy">{index === 0 && category === "all" && <span className="ng-search-top-label">BEST MATCH</span>}<strong><Highlight text={title(item)} query={query}/></strong><small><Highlight text={[labels[item._kind], item.artist || item.a || item.genre, item.country].filter(Boolean).join(" · ")} query={query}/></small></div><div className="ng-search-result-meta">{item._kind === "cert" ? <span>{item.level} certified</span> : item._bestRank > 0 && item._bestRank < 999 ? <><strong>#{item._bestRank}</strong><small>Peak position</small></> : <span>{labels[item._kind]}</span>}<span className="ng-search-arrow" aria-hidden="true">↗</span></div>
        </div>)}</div>
        {ready && filtered.length > limit && <button className="ng-search-more" onClick={() => setLimit(value => value + 20)}>Show more results ({filtered.length - limit} remaining)</button>}
      </div><footer className="ng-search-footer"><span>↑ ↓ Navigate <span>·</span> Enter Open</span><span>Esc Close</span></footer>
    </section>
  </div>;
}
