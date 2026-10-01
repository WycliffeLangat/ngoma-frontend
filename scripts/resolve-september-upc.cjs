const fs=require('fs');const dir='output/september-2026';
const rows=JSON.parse(fs.readFileSync(dir+'/backend-before.json')).releases;
(async()=>{for(const row of rows){
if(fs.existsSync(dir+'/'+row.id+'-apple.json')&&row.id!==23541)continue;
const p=dir+'/'+row.id+'-deezer.json';if(!fs.existsSync(p))continue;
const d=JSON.parse(fs.readFileSync(p)).details[0];if(!d?.album?.upc)continue;
const out=dir+'/'+row.id+'-upc.json';if(fs.existsSync(out))continue;
const url='https://itunes.apple.com/lookup?'+new URLSearchParams({upc:d.album.upc,entity:'song',country:'US'});
try{const r=await fetch(url,{signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error('HTTP '+r.status);const data=await r.json();fs.writeFileSync(out,JSON.stringify({id:row.id,url,...data},null,2));console.log(row.id,data.results?.filter(x=>x.wrapperType==='collection').map(x=>({title:x.collectionName,artist:x.artistName,url:x.collectionViewUrl})));}catch(e){console.log(row.id,e.message);}
await new Promise(r=>setTimeout(r,3500));
}})();
