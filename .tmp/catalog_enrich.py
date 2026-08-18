import argparse
import concurrent.futures
import json
import re
import time
import unicodedata
import urllib.parse
import urllib.request
from datetime import datetime, timezone


DEEZER_BASE = "https://api.deezer.com"
USER_AGENT = "NgomaChartsMetadataEnrichment/1.0"
REQUEST_TIMEOUT = 12
DEEZER_FIELDS = {
    "songs": {"genre", "label", "release_date", "release_year", "isrc"},
    "albums": {"genre", "label", "release_date", "release_year", "upc", "number_of_tracks"},
}


def clean(value):
    return str(value or "").strip()


def fold(value):
    text = unicodedata.normalize("NFKD", clean(value))
    text = text.encode("ascii", "ignore").decode("ascii")
    text = text.casefold()
    text = re.sub(r"\b(feat|ft|featuring)\.?\b", " ", text)
    text = text.replace("&", " and ")
    return re.sub(r"[^a-z0-9]+", " ", text).strip()


def compact(value):
    return re.sub(r"[^a-z0-9]+", "", fold(value))


def without_feature_parenthetical(value):
    text = clean(value)
    text = re.sub(r"\s*\((?:feat|ft|featuring)\.?.*?\)\s*", " ", text, flags=re.I)
    text = re.sub(r"\s*\[(?:feat|ft|featuring)\.?.*?\]\s*", " ", text, flags=re.I)
    return re.sub(r"\s+", " ", text).strip()


def artist_parts(value):
    pieces = re.split(
        r"\s*(?:,|&|\band\b|\bx\b|\bwith\b|\bfeat\.?\b|\bft\.?\b|\bfeaturing\b)\s*",
        clean(value),
        flags=re.I,
    )
    return {compact(piece) for piece in pieces if compact(piece)}


def exact_date(value):
    text = clean(value)
    if re.match(r"^\d{4}-\d{2}-\d{2}$", text):
        return text
    return ""


def year_from_date(value):
    text = clean(value)
    match = re.match(r"^(\d{4})", text)
    return int(match.group(1)) if match else None


def request_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as response:
        return json.loads(response.read().decode("utf-8"))


def deezer_get(path, params=None):
    url = DEEZER_BASE + path
    if params:
        url += "?" + urllib.parse.urlencode(params)
    return request_json(url)


def best_score(row, candidate, kind):
    title = clean(row["title"])
    title_key = compact(title)
    title_base_key = compact(without_feature_parenthetical(title))
    if kind == "songs":
        candidate_title = clean(candidate.get("title_short") or candidate.get("title") or "")
        candidate_full = clean(candidate.get("title") or "")
        candidate_artist = clean((candidate.get("artist") or {}).get("name") or "")
        candidate_album = clean((candidate.get("album") or {}).get("title") or "")
    else:
        candidate_title = clean(candidate.get("title") or "")
        candidate_full = candidate_title
        candidate_artist = clean((candidate.get("artist") or {}).get("name") or "")
        candidate_album = candidate_title

    cand_title_key = compact(candidate_title)
    cand_full_key = compact(candidate_full)
    cand_album_key = compact(candidate_album)
    if not cand_title_key:
        return 0

    title_exact = cand_title_key == title_key or cand_full_key == title_key
    title_base_exact = title_base_key and (
        cand_title_key == title_base_key or cand_full_key == title_base_key or cand_album_key == title_base_key
    )
    title_contains = title_base_key and (
        title_base_key in cand_title_key or cand_title_key in title_base_key
    )

    parts = artist_parts(row.get("artist"))
    cand_artist_key = compact(candidate_artist)
    artist_match = cand_artist_key in parts if cand_artist_key else False
    artist_overlap = any(part and (part in cand_artist_key or cand_artist_key in part) for part in parts) if cand_artist_key else False

    score = 0
    if title_exact:
        score += 70
    elif title_base_exact:
        score += 62
    elif title_contains and min(len(title_base_key), len(cand_title_key)) >= 5:
        score += 45
    else:
        return 0

    if artist_match:
        score += 30
    elif artist_overlap:
        score += 18
    elif len(parts) == 1 and not cand_artist_key:
        score += 5
    else:
        score -= 20

    return score


def choose_candidate(row, candidates, kind):
    scored = sorted(
        ((best_score(row, candidate, kind), candidate) for candidate in candidates),
        key=lambda item: item[0],
        reverse=True,
    )
    scored = [item for item in scored if item[0] >= 75]
    if not scored:
        return None, 0
    if len(scored) > 1 and scored[0][0] == scored[1][0]:
        return None, scored[0][0]
    return scored[0][1], scored[0][0]


def search_deezer(row, kind):
    title = clean(row["title"])
    artist = clean(row["artist"])
    if kind == "songs":
        q = f'artist:"{artist}" track:"{title}"'
        data = deezer_get("/search/track", {"q": q, "limit": 5})
        candidates = data.get("data") or []
        if not candidates:
            data = deezer_get("/search/track", {"q": f"{title} {artist}", "limit": 5})
            candidates = data.get("data") or []
    else:
        q = f'artist:"{artist}" album:"{title}"'
        data = deezer_get("/search/album", {"q": q, "limit": 5})
        candidates = data.get("data") or []
        if not candidates:
            data = deezer_get("/search/album", {"q": f"{title} {artist}", "limit": 5})
            candidates = data.get("data") or []
    return choose_candidate(row, candidates, kind)


def album_detail_from_candidate(candidate, kind):
    album = candidate.get("album") if kind == "songs" else candidate
    album_id = (album or {}).get("id")
    if not album_id:
        return {}
    return deezer_get(f"/album/{album_id}")


def genre_from_album(album):
    genres = ((album or {}).get("genres") or {}).get("data") or []
    names = [clean(item.get("name")) for item in genres if clean(item.get("name"))]
    return " / ".join(dict.fromkeys(names))


def row_from_deezer(row, kind):
    missing = set(row.get("missing_fields") or [])
    useful_missing = missing & DEEZER_FIELDS[kind]
    if not useful_missing:
        return None
    try:
        candidate, score = search_deezer(row, kind)
        if not candidate:
            return None
        album = album_detail_from_candidate(candidate, kind)
    except Exception as exc:
        return {"_error": f"{row['id']} {row['title']}: {exc}"}

    values = {"id": row["id"], "title": row["title"], "artist": row["artist"]}
    sources = []
    if kind == "songs":
        isrc = clean(candidate.get("isrc"))
        if "isrc" in missing and isrc:
            values["isrc"] = isrc
            sources.append(candidate.get("link"))

    release_date = exact_date(album.get("release_date"))
    if release_date:
        if "release_date" in missing:
            values["release_date"] = release_date
        if "release_year" in missing:
            values["release_year"] = year_from_date(release_date)
    elif "release_year" in missing:
        year = year_from_date(album.get("release_date"))
        if year:
            values["release_year"] = year

    genre = genre_from_album(album)
    if "genre" in missing and genre:
        values["genre"] = genre

    label = clean(album.get("label"))
    if "label" in missing and label:
        values["label"] = label

    if kind == "albums":
        upc = clean(album.get("upc"))
        if "upc" in missing and upc:
            values["upc"] = upc
        tracks = album.get("nb_tracks")
        if "number_of_tracks" in missing and isinstance(tracks, int) and tracks > 0:
            values["number_of_tracks"] = tracks

    link = clean(album.get("link") or candidate.get("link"))
    if link:
        sources.append(link)
    values["source"] = f"Deezer API high-confidence match ({score})"
    values["source_url"] = sources[0] if sources else "https://api.deezer.com"
    return values if len(values) > 5 else None


def process_group(rows, kind, limit, workers):
    selected = [
        row for row in rows
        if set(row.get("missing_fields") or []) & DEEZER_FIELDS[kind]
    ]
    if limit:
        selected = selected[:limit]

    results = []
    errors = []
    started = time.time()
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {executor.submit(row_from_deezer, row, kind): row for row in selected}
        for index, future in enumerate(concurrent.futures.as_completed(futures), 1):
            value = future.result()
            if isinstance(value, dict) and value.get("_error"):
                errors.append(value["_error"])
            elif value:
                results.append(value)
            if index % 100 == 0:
                elapsed = time.time() - started
                print(f"{kind}: checked {index}/{len(selected)}, found {len(results)}, errors {len(errors)}, {elapsed:.1f}s", flush=True)
    return results, errors, len(selected)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--queue", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--sources-out", required=True)
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--workers", type=int, default=4)
    args = parser.parse_args()

    with open(args.queue, encoding="utf-8") as handle:
        queue = json.load(handle)

    songs, song_errors, song_checked = process_group(queue.get("songs", []), "songs", args.limit, args.workers)
    albums, album_errors, album_checked = process_group(queue.get("albums", []), "albums", args.limit, args.workers)

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_note": "Automated high-confidence Deezer public catalog lookup. Only blank fields are applied by apply_researched_metadata.",
        "artists": [],
        "songs": songs,
        "albums": albums,
    }
    source_payload = {
        "generated_at": payload["generated_at"],
        "checked": {"songs": song_checked, "albums": album_checked},
        "matched": {"songs": len(songs), "albums": len(albums)},
        "errors": {"songs": song_errors[:100], "albums": album_errors[:100]},
        "sources": {
            "deezer_api": "https://api.deezer.com",
        },
    }
    with open(args.out, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2, ensure_ascii=False)
    with open(args.sources_out, "w", encoding="utf-8") as handle:
        json.dump(source_payload, handle, indent=2, ensure_ascii=False)
    print(json.dumps(source_payload, indent=2), flush=True)


if __name__ == "__main__":
    main()
