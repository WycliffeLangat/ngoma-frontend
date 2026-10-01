const fs=require('fs'),dir='output/september-2026',b=JSON.parse(fs.readFileSync(`${dir}/backend-before.json`,'utf8'));
const plan={artists:[],releases:[]};
for(const a of b.artists){
 const fields={},c=[];
 for(const r of b.releases.filter(r=>r.artist_id===a.id)){
  try{const data=JSON.parse(fs.readFileSync(`${dir}/${r.id}-itunes.json`,'utf8'));c.push(...data.candidates.filter(x=>x.artistName.toLowerCase()===a.name.toLowerCase()&&x.artistViewUrl));}catch{}
 }
 if(!a.apple_music_url&&c.length&&new Set(c.map(x=>x.artistId)).size===1)fields.apple_music_url={value:c[0].artistViewUrl,source:c[0].collectionViewUrl||c[0].trackViewUrl};
 const manual={3406:['audiomack_url','https://audiomack.com/fari_athman_music'],2456:['audiomack_url','https://audiomack.com/thevibezmaster'],858:['audiomack_url','https://audiomack.com/djexray'],187:['website_url','https://octopizzo.com/'],331:['spotify_url','https://open.spotify.com/artist/5QSt7WdkvDgt6YNZbKyWG7']}[a.id];
 if(manual&&!a[manual[0]])fields[manual[0]]={value:manual[1],source:manual[1]};
 if(Object.keys(fields).length)plan.artists.push({id:a.id,name:a.name,fields});
}
fs.writeFileSync(`${dir}/profile-links-plan.json`,JSON.stringify(plan,null,2));
console.log({artists:plan.artists.length,fields:plan.artists.reduce((n,p)=>n+Object.keys(p.fields).length,0)});
