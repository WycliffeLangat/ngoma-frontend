export default function ScaffoldPage({ title, phase = "Phase 2/3", items = [] }) {
  return <section><div className="cms-page-head"><div><h1>{title}</h1><p>{phase} structure is ready for expansion after the core CMS foundation.</p></div></div><div className="cms-card"><h2>Included structure</h2><div className="cms-pill-list">{items.map((item)=><span key={item}>{item}</span>)}</div><p className="cms-help">This module has backend placeholders/routes where applicable and a CMS menu page so it can be filled in without restructuring later.</p></div></section>;
}
