"""Read live September inventory; metadata writes require a separate reviewed plan."""
import os, sys, json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
backend=root.parent.parent/'ngoma_charts_backend'/'backend'
sys.path.insert(0,str(backend))
if not os.environ.get('DATABASE_PUBLIC_URL'):
    raise SystemExit('Missing configured public database connection; refusing local fallback')
os.environ['DATABASE_URL']=os.environ['DATABASE_PUBLIC_URL']
os.environ['DJANGO_SETTINGS_MODULE']='ngoma_backend.settings'
import django
django.setup()
from charts.models import Release, Artist, MonthlyChart
from django.forms.models import model_to_dict
rows=json.loads((root/'output/september-2026-new-entries.json').read_text(encoding='utf-8'))
ids=[r['release_id'] for r in rows]
releases=list(Release.objects.filter(id__in=ids).values())
artist_ids={r['artist_id'] for r in releases}
artists=list(Artist.objects.filter(id__in=artist_ids).values())
out={'releases':releases,'artists':artists,'charts':list(MonthlyChart.objects.filter(year=2026,month=9).values())}
(root/'output/september-2026/backend-before.json').write_text(json.dumps(out,default=str,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'releases':len(releases),'artists':len(artists),'charts':len(out['charts'])}))
