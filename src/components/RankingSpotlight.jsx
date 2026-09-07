import EntryThumb from "./EntryThumb.jsx";

/** Editorial highlights always follow the selected dataset, independently of table sorting. */
export default function RankingSpotlight({ entries = [], lifetime = false, onOpen }) {
  const title = (item) => item.title || item.t || item.n || "Untitled";
  const artist = (item) => item.artist || item.a || item.primary_artist || "";
  const rank = (item, index) => item.rank ?? item.r ?? index + 1;
  const leaders = lifetime ? entries.slice(0, 3) : [...entries].sort((a, b) => rank(a, 0) - rank(b, 0)).slice(0, 5);
  if (!leaders.length) return null;
  const points = (item) => Number(item.totalPts ?? item.total_points ?? item.points ?? item.pts ?? item.score ?? 0).toLocaleString();
  const artwork = (item, size) => <EntryThumb item={item} name={artist(item) || title(item)} size={size} />;
  if (lifetime) return (
    <section className="v2-ranking-surface" aria-label="Lifetime podium">
      <div className="v2-section-heading"><h2>Leading the charts</h2><span>The selected period · Top three</span></div>
      <div className="v2-podium">{leaders.map((item, index) => (
        <button key={`${title(item)}-${index}`} className={`v2-podium-card place-${index + 1}`} onClick={() => onOpen(item)}>
          <span className="v2-rank">#{rank(item, index)}</span>{artwork(item, 100)}
          <strong>{title(item)}</strong><span>{artist(item)}</span><b>{points(item)} <small>pts</small></b>
        </button>
      ))}</div>
    </section>
  );
  const leader = leaders[0];
  return (
    <section className="v2-ranking-surface" aria-label="Current chart leaders">
      <div className="v2-section-heading"><h2>At the top</h2><span>The leaders in this chart</span></div>
      <div className="v2-chart-lead">
        <button className="v2-leader" onClick={() => onOpen(leader)}>
          <span className="v2-eyebrow">Current number one</span>
          <div className="v2-leader-copy">{artwork(leader, 116)}<div><h2>{title(leader)}</h2><p>{artist(leader)}</p></div></div>
          <div className="v2-leader-stats"><span>Rank<b>#{rank(leader, 0)}</b></span><span>Points<b>{points(leader)}</b></span><span>Explore<b>View details ↗</b></span></div>
        </button>
        <div className="v2-runners">{leaders.slice(1).map((item, index) => (
          <button className="v2-mini-rank" key={`${title(item)}-${index}`} onClick={() => onOpen(item)}>
            <span className="v2-rank">{rank(item, index + 1)}</span>{artwork(item, 48)}<span className="v2-mini-copy"><strong>{title(item)}</strong><small>{artist(item)}</small></span><span aria-hidden="true">↗</span>
          </button>
        ))}</div>
      </div>
    </section>
  );
}
