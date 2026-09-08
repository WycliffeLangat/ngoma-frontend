"""Export the complete local catalog read-only and overlay the live public catalog."""
import collections
import datetime
import json
import pathlib
import sqlite3

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'output' / 'credits'
db = ROOT.parent.parent / 'ngoma_charts_backend' / 'backend' / 'ngoma_charts.db'
con = sqlite3.connect(db.resolve().as_uri() + '?mode=ro', uri=True)
con.row_factory = sqlite3.Row
rows = {r['id']: dict(r) for r in con.execute('SELECT r.*, a.name AS artist FROM charts_release r JOIN charts_artist a ON a.id=r.artist_id')}
for r in rows.values():
    r['inventory_source'] = 'local_database'
    r['live_public_top50'] = False
    r['local_weekly_appearances'] = 0
    r['local_monthly_appearances'] = 0
    r['research_status'] = 'not_researched'
for r in con.execute('SELECT release_id, COUNT(*) AS n FROM charts_platformchartentry GROUP BY release_id'):
    if r['release_id'] in rows: rows[r['release_id']]['local_weekly_appearances'] = r['n']
for r in con.execute('SELECT release_id, COUNT(*) AS n FROM charts_monthlychartentry GROUP BY release_id'):
    if r['release_id'] in rows: rows[r['release_id']]['local_monthly_appearances'] = r['n']
live = json.loads((OUT / 'live-public-inventory.json').read_text(encoding='utf-8'))
for r in live['releases']:
    old = rows.setdefault(r['id'], {})
    old.update(r)
    old['inventory_source'] = 'live_public_with_local_history'
    old['research_status'] = 'not_researched'
def walk(obj):
    if isinstance(obj, dict):
        if obj.get('release_id') in rows:
            rows[obj['release_id']]['live_public_top50'] = True
        for value in obj.values(): walk(value)
    elif isinstance(obj, list):
        for value in obj: walk(value)
walk(live['full'])
records = sorted(rows.values(), key=lambda r: (not r.get('live_public_top50'), r['chart_type'], r['title']))
summary = {'generated_at': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'local_database': str(db.resolve()), 'live_generated_at': live['generated_at'], 'live_revision': live['revision'], 'months': live['months'], 'catalog_counts': dict(collections.Counter(r['chart_type'] for r in records)), 'live_public_releases': len(live['releases']), 'outside_live_public_top50': sum(not r.get('live_public_top50') for r in records), 'existing_songwriters_unverified': sum(bool(r.get('songwriters')) for r in records), 'existing_producers_unverified': sum(bool(r.get('producers')) for r in records), 'limitations': ['Local catalog is not proof of current live unpublished inventory.', 'Albums have no stored individual tracklist; expansion is required.', 'Existing credits are not independently verified.']}
(OUT / 'catalog-inventory.json').write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding='utf-8')
(OUT / 'inventory-summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(summary, ensure_ascii=True))
