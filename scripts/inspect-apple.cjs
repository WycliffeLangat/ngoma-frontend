const fs=require('fs');
const s=fs.readFileSync('output/september-2026/apple-sample.html','utf8');
console.log([...s.matchAll(/<script[^>]*>/g)].map(x=>x[0]).join('\n'));
const i=s.indexOf('Ziiki');console.log(s.slice(i-180,i+180));
for(const m of s.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)){
 if(m[1].includes('serialized-server-data')){
 const d=JSON.parse(m[2]);fs.writeFileSync('output/september-2026/apple-structured-sample.json',JSON.stringify(d,null,2));
 const walk=(o,p=[])=>{if(o&&typeof o==='object')for(const[k,v]of Object.entries(o)){if(/composer|copyright|releaseDate|recordLabel|isrc|upc|trackCount|legal/i.test(k))console.log(p.concat(k).join('.'),JSON.stringify(v).slice(0,400));walk(v,p.concat(k));}};walk(d);
 }
}
