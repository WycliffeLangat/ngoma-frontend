const fs=require('fs');const dir='output/september-2026';
const data=JSON.parse(fs.readFileSync(dir+'/backend-before.json'));
(async()=>{for(const row of data.releases){
const out=dir+'/'+row.id+'-links.json';if(fs.existsSync(out))continue;
let url;const p=dir+'/'+row.id+'-deezer.json';if(fs.existsSync(p)){const d=JSON.parse(fs.readFileSync(p));url=d.details[0]?.item?.link;}
if(!url){const a=dir+'/'+row.id+'-apple.json';if(fs.existsSync(a)){const d=JSON.parse(fs.readFileSync(a));url=d.url;}}
if(!url)continue;
try{const r=await fetch('https://api.song.link/v1-alpha.1/links?'+new URLSearchParams({url,userCountry:'KE'}),{signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error('HTTP '+r.status);const d=await r.json();fs.writeFileSync(out,JSON.stringify({id:row.id,requested_url:url,...d},null,2));console.log(row.id,Object.keys(d.linksByPlatform||{}).join(','));}catch(e){console.log(row.id,e.message);}
await new Promise(r=>setTimeout(r,6500));
}})();
