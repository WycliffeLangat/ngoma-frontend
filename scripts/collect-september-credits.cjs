const fs=require('fs');const dir='output/september-2026';
const rows=JSON.parse(fs.readFileSync(dir+'/backend-before.json')).releases.filter(r=>r.chart_type==='singles');
const norm=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const base=s=>s.replace(/\s*\((?:feat\.|ft\.).*?\)/ig,'').trim();
async function one(row){
const out=dir+'/'+row.id+'-credits.json';if(fs.existsSync(out))return;
const p=dir+'/'+row.id+'-apple.json';if(!fs.existsSync(p))return;
const page=JSON.parse(fs.readFileSync(p));
const track=page.tracks.find(t=>norm(base(t.title))===norm(base(row.title)));
let id=track?.id;if(!id&&/\/song\/\d+/.test(page.url))id=page.url.match(/\/song\/(\d+)/)[1];if(!id)return;
const url='https://music.apple.com/us/song/'+id;
try{const response=await fetch(url,{signal:AbortSignal.timeout(25000)});if(!response.ok)throw Error('HTTP '+response.status);const html=await response.text();
const m=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].find(m=>m[1].includes('serialized-server-data'));if(!m)throw Error('No page data');
const data=JSON.parse(m[2]);const credits=[];let title=html.match(/<title>(.*?)<\/title>/s)?.[1];
function walk(o){if(o&&typeof o==='object'){if(o.name&&Array.isArray(o.roleNames))credits.push({name:o.name,roles:o.roleNames});for(const v of Object.values(o))walk(v);}}
walk(data);
const unique=[...new Map(credits.map(c=>[JSON.stringify(c),c])).values()];
const result={id:row.id,url,page_title:title,credits:unique};fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(row.id,unique.filter(c=>c.roles.some(r=>/produc|compos|songwrit/i.test(r))));
}catch(e){console.log(row.id,e.message);}}
(async()=>{for(let i=0;i<rows.length;i+=3)await Promise.all(rows.slice(i,i+3).map(one));})();
