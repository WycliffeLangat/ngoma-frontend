const fs=require('fs');const dir='output/september-2026';
const norm=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const base=s=>s.replace(/\s*\((?:feat\.|ft\.).*?\)/ig,'').replace(/ - (Single|EP)$/i,'').trim();
const rows=JSON.parse(fs.readFileSync(dir+'/backend-before.json')).releases;
(async()=>{for(const row of rows){
 if(fs.existsSync(dir+'/'+row.id+'-apple.json'))continue;
 const out=dir+'/'+row.id+'-broad.json';if(fs.existsSync(out))continue;
 const entity=row.chart_type==='albums'?'album':'song';
 const url='https://itunes.apple.com/search?'+new URLSearchParams({term:base(row.title),entity,limit:'100',country:'KE'});
 try{let r=await fetch(url,{signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error('HTTP '+r.status);let data=await r.json();
 let candidates=data.results.filter(x=>norm(base(x[entity==='album'?'collectionName':'trackName']))===norm(base(row.title)));
 fs.writeFileSync(out,JSON.stringify({id:row.id,url,candidates},null,2));console.log(row.id,row.title,JSON.stringify(candidates.map(x=>({artist:x.artistName,title:x.trackName||x.collectionName,url:x.collectionViewUrl}))));
 }catch(e){console.log(row.id,e.message);}await new Promise(r=>setTimeout(r,3500));
}})();
