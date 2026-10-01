const fs=require('fs');const dir='output/september-2026';
const data=JSON.parse(fs.readFileSync(dir+'/backend-before.json'));
const norm=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const base=s=>s.replace(/\s*\((?:feat\.|ft\.).*?\)/ig,'').replace(/ - (Single|EP)$/i,'').trim();
async function get(u){let r=await fetch(u,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('HTTP '+r.status);return r.json();}
async function one(row){const out=dir+'/'+row.id+'-deezer.json';if(fs.existsSync(out))return;
const artist=data.artists.find(a=>a.id===row.artist_id)?.name;const kind=row.chart_type==='albums'?'album':'track';
const url='https://api.deezer.com/search/'+kind+'?q='+encodeURIComponent(artist+' '+base(row.title))+'&limit=25';
try{const results=await get(url);const candidates=(results.data||[]).filter(x=>norm(base(x.title))===norm(base(row.title))&&norm(x.artist?.name)===norm(artist));
const details=[];for(const c of candidates.slice(0,3)){const d=await get('https://api.deezer.com/'+kind+'/'+c.id);let album=kind==='album'?d:await get('https://api.deezer.com/album/'+d.album.id);details.push({item:d,album});}
fs.writeFileSync(out,JSON.stringify({id:row.id,url,details},null,2));console.log(row.id,details.length);
}catch(e){console.log(row.id,e.message);}}
(async()=>{for(let i=0;i<data.releases.length;i+=3)await Promise.all(data.releases.slice(i,i+3).map(one));})();
