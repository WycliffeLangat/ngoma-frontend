"""Retrieve public track-credit sections; reject mismatched pages, keep roles distinct."""
import argparse
import concurrent.futures
import datetime
import html
import json
import pathlib
import re
import unicodedata
import urllib.request

OUT = pathlib.Path(__file__).resolve().parents[1] / 'output' / 'credits'


def norm(s):
    return ''.join(c for c in unicodedata.normalize('NFKD', s).lower() if c.isalnum())


def plain(s):
    return html.unescape(re.sub('<[^>]+>', ' ', s)).strip()


def fetch(t):
    dest = OUT / 'shazam' / f"{t['apple_song_id']}.json"

    url = f"https://www.shazam.com/track/{t['apple_song_id']}"
    result = {
        'apple_song_id': t['apple_song_id'],
        'requested_title': t['title'],
        'requested_artist': t['artist'],
        'source_url': url,
        'checked_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'credits': []
    }

    try:
        request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(request, timeout=30) as response:
            page = response.read().decode('utf-8', 'ignore')
            result['resolved_url'] = response.url

        result['page_title'] = plain(re.search(r'<title>(.*?)</title>', page, re.S).group(1)) if re.search(r'<title>(.*?)</title>', page, re.S) else ''
        requested_title = norm(t['title'])
        resolved_title = norm(result['page_title'].split(':', 1)[0])
        if not requested_title or requested_title not in resolved_title:
            result['status'] = 'page_identity_mismatch'
            result['identity_note'] = 'Resolved page title does not contain the requested track title.'
            dest.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
            return result

        matches = re.findall(r'OldSongCredits_name__[^>]*>(.*?)</div>.*?Text-module_text-gray-900__[^>]*>(.*?)</div>', page, re.S)
        credits = []
        for name, role in matches:
            clean_name = plain(name)
            clean_role = plain(role)
            if clean_name and clean_role and clean_name.lower() not in {'credits', 'performing artists'}:
                credits.append({'name': clean_name, 'role': clean_role})

        result['credits'] = credits
        result['status'] = 'role_credits_retrieved' if credits else 'credits_not_exposed'

    except Exception as e:
        result.update(status='request_failed', error=str(e))

    dest.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    return result


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--limit', type=int, default=30)
    p.add_argument('--start', type=int, default=0)
    args = p.parse_args()

    (OUT / 'shazam').mkdir(exist_ok=True)
    tracks = list({t['apple_song_id']: t for t in json.loads((OUT / 'track-credits.json').read_text(encoding='utf-8'))}.values())
    tracks.sort(key=lambda t: (not t['live_public_top50'], t['artist']))
    counts = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for r in pool.map(fetch, tracks[args.start:args.start + args.limit]):
            counts[r['status']] = counts.get(r['status'], 0) + 1
    print(json.dumps(counts))
