"""Apply the source-backed, blank-only September metadata plan atomically."""
import os, sys, json
from pathlib import Path
from datetime import date
root=Path(__file__).resolve().parents[1]
out=root/'output/september-2026'
sys.path.insert(0,str(root.parent.parent/'ngoma_charts_backend'/'backend'))
if not os.environ.get('DATABASE_PUBLIC_URL'):
    raise SystemExit('Missing public database connection; no local fallback')
os.environ['DATABASE_URL']=os.environ['DATABASE_PUBLIC_URL']
os.environ['DJANGO_SETTINGS_MODULE']='ngoma_backend.settings'
import django
django.setup()
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from charts.models import Artist, Release, ReleaseArtistCredit, MonthlyChartEntry, RegionalChartEntry, MonthlyChart
from charts.cms_utils import sync_release_chart_entry_snapshots, harmonize_chart_history, audit, bump_public_revision
supplement='--profile-links' in sys.argv
prefix='profile-links-' if supplement else ''
plan=json.loads((out/('profile-links-plan.json' if supplement else 'update-plan.json')).read_text(encoding='utf-8'))
def save_json(name,data):
    (out/name).write_text(json.dumps(data,ensure_ascii=False,indent=2,default=str),encoding='utf-8')
def blank(v): return v is None or v==''
changes=[]
with transaction.atomic():
    for key,model in [('artists',Artist),('releases',Release)]:
        for p in plan[key]:
            obj=model.objects.select_for_update().get(pk=p['id'])
            identity='name' if key=='artists' else 'title'
            if getattr(obj,identity)!=p[identity]: raise ValueError('Identity changed: '+str(obj.pk))
            if key=='releases' and obj.artist_id!=p['artist_id']:raise ValueError('Artist changed')
            fields={}
            for f,entry in p['fields'].items():
                if not entry['source']:raise ValueError('Missing provenance')
                field=model._meta.get_field(f)
                value=field.to_python(entry['value'])
                if field.max_length and len(str(value))>field.max_length:raise ValueError(f'Too long: {obj.pk} {f}')
                current=getattr(obj,f)
                if blank(current): fields[f]=value
                elif current!=value: raise ValueError(f'Concurrent nonblank change: {key} {obj.pk} {f}')
            if fields:changes.append((key,obj,fields,p))
    country_artists=[o.pk for k,o,f,p in changes if k=='artists' and ('country' in f or 'country_code' in f)]
    related_ids=set(Release.objects.filter(Q(artist_id__in=country_artists)|Q(artist_credits__artist_id__in=country_artists,artist_credits__role='primary',artist_credits__position=0)).values_list('pk',flat=True))
    release_ids=related_ids|{o.pk for k,o,f,p in changes if k=='releases'}
    chart_ids=list(MonthlyChartEntry.objects.filter(release_id__in=related_ids).values_list('chart_id',flat=True).distinct())
    print(json.dumps({'mode':'apply' if '--apply' in sys.argv else 'dry-run','records':len(changes),'fields':sum(len(f) for k,o,f,p in changes),'country_related_releases':len(related_ids),'charts_to_synchronize':len(chart_ids)}),flush=True)
    if '--apply' not in sys.argv:sys.exit(0)
    backup=out/(prefix+'before-apply.json')
    if backup.exists():raise ValueError('Application backup already exists; inspect result before retrying')
    save_json(backup.name,{'artists':list(Artist.objects.filter(pk__in=[o.pk for k,o,f,p in changes if k=='artists']).values()),'releases':list(Release.objects.filter(pk__in=release_ids).values()),'monthly_entries':list(MonthlyChartEntry.objects.all().values()),'regional_entries':list(RegionalChartEntry.objects.all().values()),'charts':list(MonthlyChart.objects.all().values())})
    result={'changed':[],'cascaded':[],'snapshot_updates':0}
    for key,obj,fields,p in changes:
        old={f:getattr(obj,f) for f in fields}
        for f,v in fields.items():setattr(obj,f,v)
        obj.save(update_fields=list(fields)+['updated_at'])
        if key=='releases':result['snapshot_updates']+=sync_release_chart_entry_snapshots(obj)['updated']
        audit(None,'update',module=key,obj=obj,old=old,new=fields,reason='September 2026 new-entry enrichment; verified sources: '+json.dumps({f:p['fields'][f]['source'] for f in fields},ensure_ascii=False))
        result['changed'].append({'type':key,'id':obj.pk,'fields':list(fields)})
    for artist in Artist.objects.filter(pk__in=country_artists):
        ids=ReleaseArtistCredit.objects.filter(artist=artist,role='primary',position=0).values_list('release_id',flat=True)
        for r in Release.objects.filter(Q(artist=artist)|Q(id__in=ids)):
            values={f:getattr(artist,f) for f in ('country','country_code') if blank(getattr(r,f)) and getattr(artist,f)}
            if values:
                old={f:getattr(r,f) for f in values}
                for f,v in values.items():setattr(r,f,v)
                r.save(update_fields=list(values)+['updated_at'])
                audit(None,'update',module='releases',obj=r,old=old,new=values,reason='Synchronize verified primary artist country after September metadata enrichment')
                result['cascaded'].append({'id':r.pk,'fields':list(values)})
    print('Metadata saved inside transaction; synchronizing chart history.',flush=True)
    result['harmonization']=harmonize_chart_history(chart_ids=chart_ids) if chart_ids else {}
    bump_public_revision()
    for key,obj,fields,p in changes:
        obj.refresh_from_db()
        for f,v in fields.items():
            if getattr(obj,f)!=v:raise ValueError(f'Verification failed {obj.pk} {f}')
    result['verified_fields']=sum(len(f) for k,o,f,p in changes)
    result['status']='committed'
save_json(prefix+'apply-result.json',result)
save_json('backend-after.json',{'releases':list(Release.objects.filter(pk__in=[r['id'] for r in json.loads((out/'backend-before.json').read_text(encoding='utf-8'))['releases']]).values()),'artists':list(Artist.objects.filter(pk__in=[a['id'] for a in json.loads((out/'backend-before.json').read_text(encoding='utf-8'))['artists']]).values())})
print(json.dumps({'status':result['status'],'verified_fields':result['verified_fields'],'records':len(result['changed']),'cascaded':len(result['cascaded']),'snapshots':result['snapshot_updates']}),flush=True)
