const fs=require('fs');
const dir='output/september-2026';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const live=read('output/september-2026-live.json');
const entries=read('output/september-2026-new-entries.json');
const overrides=fs.existsSync(dir+'/apple-overrides.json')?read(dir+'/apple-overrides.json'):{};
const clean=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').trim();
const norm=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
async function one(e){
 const row=live.releases.find(r=>r.id===e.release_id),out=dir+'/'+row.id+'-apple.json';
 if(fs.existsSync(out)&&(!overrides[row.id]||read(out).url===overrides[row.id]))return;
 let c;const p=dir+'/'+row.id+'-itunes.json';if(fs.existsSync(p))c=read(p).candidates[0];
 let resolved;const up=dir+'/'+row.id+'-upc.json';if(fs.existsSync(up)){const matches=read(up).results.filter(x=>x.wrapperType==='collection');resolved=matches.find(x=>row.chart_type==='singles'||norm(x.collectionName)===norm(row.title))?.collectionViewUrl;}
 const url=overrides[row.id]||resolved||c?.collectionViewUrl||row.apple_music_url;
 if(!url?.startsWith('https://music.apple.com/')||url.includes('/search?'))return;
 try{
 const response=await fetch(url,{signal:AbortSignal.timeout(25000)});if(!response.ok)throw Error('HTTP '+response.status);
 const html=await response.text();
 const m=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].find(m=>m[1].includes('serialized-server-data'));
 if(!m)throw Error('No page data');
 const d=JSON.parse(m[2]).data[0].data;
 const header=d.sections.flatMap(s=>s.items||[]).find(i=>i.id?.startsWith('album-detail-header'));
 const tracks=d.sections.flatMap(s=>s.items||[]).filter(i=>i.id?.startsWith('track-lockup')).map(i=>({title:i.title,artist:i.artistName,composer:i.composer,url:i.contentDescriptor?.url,id:i.contentDescriptor?.identifiers?.storeAdamID}));
 const footer=clean(html.match(/data-testid="tracklist-footer-description"[^>]*>([\s\S]*?)<\/p>/)?.[1]);
 const record={id:row.id,requested_title:row.title,requested_artist:row.artist,url,resolved_url:response.url,page_title:clean(html.match(/<title>(.*?)<\/title>/s)?.[1]),title:header?.title,artists:header?.subtitleLinks?.map(x=>x.title),genre:header?.quaternaryTitle,track_count:header?.trackCount,artwork:header?.artwork?.dictionary,footer,tracks,checked_at:new Date().toISOString()};
 fs.writeFileSync(out,JSON.stringify(record,null,2));console.log(row.id,record.title||record.page_title,footer);
 }catch(err){console.log(row.id,'ERROR',err.message);}
}
(async()=>{for(let i=0;i<entries.length;i+=3)await Promise.all(entries.slice(i,i+3).map(one));})();
