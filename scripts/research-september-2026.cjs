const fs = require('node:fs');
const path = require('node:path');
const dir = 'output/september-2026';
fs.mkdirSync(dir, {recursive:true});
const read = p => JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const live = read('output/september-2026-live.json');
const entries = read('output/september-2026-new-entries.json');
const rows = entries.map(e=>live.releases.find(r=>r.id===e.release_id));
const norm = s => String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const base = s => s.replace(/\s*\((?:feat\.|ft\.).*?\)/ig,'').replace(/ - (Single|EP)$/i,'').trim();
async function get(url) { const r=await fetch(url,{signal:AbortSignal.timeout(25000)}); if(!r.ok)throw Error('HTTP '+r.status); return r.json(); }
async function research(row) {
 const file=path.join(dir,`${row.id}-itunes.json`);
 if(fs.existsSync(file))return;
 const entity=row.chart_type==='albums'?'album':'song';
 const url='https://itunes.apple.com/search?'+new URLSearchParams({term:row.artist+' '+base(row.title),entity,limit:'30',country:'US'});
 try {
  const data=await get(url);
  const candidates=data.results.filter(x=>norm(base(x[entity==='album'?'collectionName':'trackName']))===norm(base(row.title))&&(norm(x.artistName).includes(norm(row.artist))||norm(row.artist).includes(norm(x.artistName))));
  fs.writeFileSync(file,JSON.stringify({id:row.id,title:row.title,artist:row.artist,url,candidates,results:data.results},null,2));
  console.log(row.id,row.title,'matches',candidates.length);
 } catch(e) { console.log(row.id,'ERROR',e.message); }
}
(async()=>{for(const row of rows){if(!fs.existsSync(path.join(dir,`${row.id}-itunes.json`))){await research(row);await new Promise(r=>setTimeout(r,3500));}}})();
