"""Retrieve public track-credit sections; reject mismatched pages, keep roles distinct."""
import argparse, concurrent.futures, datetime, html, json, pathlib, re, urllib.request, unicodedata
OUT=pathlib.Path(__file__).resolve().parents[1]/'output'/'credits'
def norm(s):
    return ''.join(c for c in unicodedata.normalize('NFKD',s).lower() if c.isalnum())
def plain(s):
    return html.unescape(re.sub('<[^>]+>',' ',s)).strip()
def fetch(t):
    dest=OUT/'shazam'/f"{t['apple_song_id']}.json"
    if dest.exists(): return json.loads(dest.read_text(encoding='utf-8'))
    slug=re.sub('[^a-z0-9]+','-',unicodedata.normalize('NFKD',t['title']).encode('ascii','ignore').decode().lower()).strip('-')
    url=f"https://www.shazam.com/song/{t['apple_song_id']}/{slug}"
    result={'apple_song_id':t['apple_song_id'],'requested_title':t['title'],'requested_artist':t['artist'],'source_url':url,'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'credits':[]}
    try:
        request=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
        with urllib.request.urlopen(request,timeout=20) as response:
            page=response.read().decode('utf-8'); result['resolved_url']=response.url
        title=re.search(r'<title>(.*?)</title>',page,re.S)
        result['page_title']=plain(title.group(1)) if title else ''
        expected=norm(t['title']+' '+t['artist'])
        actual=norm(result['page_title'].split(': Song')[0])
        if actual!=expected:
            result['status']='page_identity_mismatch'
        else:
            start=page.find('data-test-id="track_impression_credits"')
            if start<0: result['status']='credits_not_exposed'
            else:
                block=page[start:]
                end=block.find('</script>')
                if end>=0: block=block[:end]
                for person in re.split(r'<div class="OldSongCredits_person__[^\"]+">',block)[1:]:
                    person=re.split(r'<div class="OldSongCredits_(?:container|title)__',person)[0]
                    parts=[html.unescape(re.sub('<[^>]+>','',v)).strip() for v in re.findall(r'>([^<>]+)<',person)]
                    parts=[v for v in parts if v]
                    if len(parts)>=2: result['credits'].append({'name':parts[0],'role':parts[1]})
                result['status']='role_credits_retrieved' if result['credits'] else 'credits_not_exposed'
    except Exception as e: result.update(status='request_failed',error=str(e))
    dest.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    return result
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--limit',type=int,default=30);p.add_argument('--start',type=int,default=0);args=p.parse_args()
    (OUT/'shazam').mkdir(exist_ok=True)
    tracks=list({t['apple_song_id']:t for t in json.loads((OUT/'track-credits.json').read_text(encoding='utf-8'))}.values())
    tracks.sort(key=lambda t:(not t['live_public_top50'],t['artist']))
    counts={}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for r in pool.map(fetch,tracks[args.start:args.start+args.limit]):
            counts[r['status']]=counts.get(r['status'],0)+1
    print(json.dumps(counts))
