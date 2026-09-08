const fs = require('fs');
const dir = 'output/credits';
const inventory = JSON.parse(fs.readFileSync(`${dir}/catalog-inventory.json`, 'utf8'));
const known = JSON.parse(fs.readFileSync(`${dir}/apple-known-identifiers.json`, 'utf8'));
const norm = v => String(v || '').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/\s*-\s*(single|ep)$/i,'').replace(/[^\p{L}\p{N}]/gu,'');
const artistMatches = (r,a) => {
  const x=norm(r.artist), y=norm(a);
  return x && y && (x===y || y.startsWith(x) || norm(r.artist_credit)===y);
};
const albums = new Map(), songs = new Map();
for(const file of fs.readdirSync(dir).filter(f=>/^apple-(albums|songs)-\d+\.json$/.test(f))) {
  const data=JSON.parse(fs.readFileSync(`${dir}/${file}`,'utf8'));
  for(const r of data.data || []) {
    if(r.type==='albums') { albums.set(r.id,r); for(const t of r.relationships?.tracks?.data || []) if(t.type==='songs') songs.set(t.id,t); }
    if(r.type==='songs') songs.set(r.id,r);
  }
}
for(const file of fs.readdirSync(dir).filter(f=>/^search-\d+\.json$/.test(f))) {
  const data=JSON.parse(fs.readFileSync(`${dir}/${file}`,'utf8'));
  for(const r of data.results?.songs?.data || []) songs.set(r.id,r);
  for(const r of data.results?.albums?.data || []) albums.set(r.id,r);
}
const tracks=[], releases=[], search=[];
for(const r of inventory) {
  const kind=r.chart_type==='albums'?'albums':'songs';
  const pool=kind==='albums'?albums:songs;
  const candidates=[...pool.values()].filter(c=>norm(c.attributes?.name)===norm(r.title) && artistMatches(r,c.attributes?.artistName));
  const linked=known[kind].find(k=>k.release_id===r.id);
  const chosen=candidates.find(c=>r.isrc && c.attributes?.isrc===r.isrc) || candidates.find(c=>c.id===linked?.id) || (candidates.length===1?candidates[0]:null);
  const release={release_id:r.id,title:r.title,artist:r.artist_credit||r.artist,chart_type:r.chart_type,live_public_top50:!!r.live_public_top50,local_weekly_appearances:r.local_weekly_appearances||0,local_monthly_appearances:r.local_monthly_appearances||0,existing_songwriters_unverified:r.songwriters||'',existing_producers_unverified:r.producers||'',status:chosen?'catalog_matched':candidates.length?'ambiguous_catalog_match':'catalog_search_required',apple_id:chosen?.id||'',source_url:chosen?.attributes?.url||'',tracklist_complete:false};
  if(chosen){
    const tt=kind==='albums'?(chosen.relationships?.tracks?.data||[]).filter(t=>t.type==='songs'):[chosen];
    release.tracklist_complete=kind==='songs'||(!chosen.relationships?.tracks?.next && tt.length===chosen.attributes.trackCount);
    release.expected_tracks=kind==='albums'?chosen.attributes.trackCount:1;
    release.retrieved_tracks=tt.length;
    for(const t of tt){const a=t.attributes||{};tracks.push({release_id:r.id,album:kind==='albums'?r.title:a.albumName||'',apple_song_id:t.id,title:a.name,artist:a.artistName,disc:a.discNumber,track_number:a.trackNumber,isrc:a.isrc||'',composition_credit:a.composerName||'',composition_role:'Apple Music composerName (composition/writing credit)',songwriters_status:a.composerName?'source_credit_retrieved':'not_listed_in_catalog_response',producers:'',producers_status:'not_researched',source_url:a.url||'',source_provider:'Apple Music via Shazam connector',live_public_top50:!!r.live_public_top50});}
  }
  if(!chosen) search.push({id:r.id,title:r.title,artist:r.artist,kind,term:`${r.title} ${r.artist}`});
  releases.push(release);
}
const summary={catalog_releases:releases.length,matched_releases:releases.filter(r=>r.apple_id).length,matched_albums:releases.filter(r=>r.chart_type==='albums'&&r.apple_id).length,complete_album_tracklists:releases.filter(r=>r.chart_type==='albums'&&r.tracklist_complete).length,track_occurrences:tracks.length,unique_recordings_by_apple_id:new Set(tracks.map(t=>t.apple_song_id)).size,track_occurrences_with_composition_credits:tracks.filter(t=>t.composition_credit).length,releases_needing_catalog_resolution:search.length,producer_research_complete:false,entire_research_complete:false};
for(const [name,data] of Object.entries({'release-audit':releases,'track-credits':tracks,'catalog-search-queue':search,'research-summary':summary}))fs.writeFileSync(`${dir}/${name}.json`,JSON.stringify(data,null,2));
console.log(JSON.stringify(summary));
if(process.argv.includes('--queue'))console.log(JSON.stringify(search));
