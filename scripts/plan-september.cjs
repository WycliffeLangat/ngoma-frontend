const fs=require('fs');
const dir='output/september-2026';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const get=(id,type)=>{try{return read(`${dir}/${id}-${type}.json`)}catch{return {}}};
const before=read(`${dir}/backend-before.json`),plan={scope:'September 2026 new entries',policy:'Only fill empty fields; retain unresolved conflicts',releases:[],artists:[],notes:[]};
const norm=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s*[-–]\s*(single|ep)$/,'').replace(/[^a-z0-9]/g,'');
const base=s=>norm(String(s||'').replace(/\s*[([](?:feat\.|with)\s.*$/i,''));
const blank=v=>v===null||v===undefined||v==='';
function add(p,row,field,value,source){if(blank(row[field])&&!blank(value))p.fields[field]={value,source};}
const manualArtists=[
 [1858,'Nigeria','NG','Anambra State','Afro-fusion; Afrobeats; Hip-hop','6uff is a Nigerian artist and producer from Anambra State whose music blends Afro-fusion and hip-hop.','https://musicinafrica.net/directory/6uff/'],
 [3334,'Slovakia','SK','Los Angeles','Pop','ADÉLA is a Slovak singer and songwriter based in Los Angeles. She trained in ballet at English National Ballet School before pursuing music.','https://www.enbschool.org.uk/alumni/adela-jergova-music-artist/'],
 [1597,'United States','US','Los Angeles, California','R&B/Soul','Jhené Aiko is an American singer and songwriter from Los Angeles, known for her R&B recordings.','https://www.universalmusic.ca/2026/09/11/jhene-aiko-releases-highly-anticipated-new-album-westside-whimsy/'],
 [3292,'United States','US','Bronx, New York','Hip-hop/Rap','Fat Joe is an American rapper from the Bronx, New York.','https://www.bronxwalkoffame.com/inductees/fat-joe'],
 [334,'Kenya','KE','Mombasa','Afropop; R&B','Masauti is a Kenyan singer and songwriter from Mombasa who records in Swahili.','https://www.womex.com/virtual/georg_leitner_gmbh/mswazzi_masauti'],
 [1775,'Democratic Republic of the Congo','CD','Kinshasa','Congolese rumba; Soukous','Mbilia Bel is a Congolese singer associated with rumba and soukous, known for her work with Tabu Ley Rochereau.','https://musicinafrica.net/fr/directory/mbilia-bel/'],
 [3406,'Kenya','KE','Nairobi','Afro-pop','Fari Athman is an Afro-pop artist from Nairobi, Kenya.','https://audiomack.com/fari_athman_music'],
 [2456,'Kenya','KE','Kakamega','Bongo Flava; DJ mixes','DJGIDS254 is a Kenyan DJ who publishes Bongo Flava mixes under Thevibezmaster.','https://audiomack.com/thevibezmaster'],
 [858,'','','London','Afrosounds; DJ mixes','DJ EXRAY publishes mixes spanning Afrobeats, Bongo, dancehall, hip-hop and R&B.','https://audiomack.com/djexray'],
 [3425,'Kenya','KE','','Gengetone; Hip-hop','Zzero Sufuri is a Kenyan musician associated with the Gengetone scene.','https://k24.digital/entertainment/celebrity/kenyan-musician-zzero-sufuri-reveals-story-behind-otero-collaboration/amp'],
 [166,'','','Queens, New York','Hip-hop/Rap','Nicki Minaj is a Trinidad-born rapper raised in Queens, New York, known for Pink Friday.','https://music.apple.com/es/artist/nicki-minaj/278464538?l=en'],
 [204,'','','St. Petersburg, Florida','Hip-hop/Rap; R&B','Rod Wave is a singer and rapper from St. Petersburg, Florida, whose music draws on soul and hip-hop.','https://music.apple.com/us/album/pray-4-love/1574559019'],
 [187,'','','Kibera, Nairobi','Hip-hop','','https://octopizzo.com/about/'],
 [23,'','','Nairobi','Hip-hop/Rap','','https://www.allmusic.com/artist/nyashinski-mn0003967998/biography'],
 [331,'','','Shinyanga','Bongo Flava; Afrobeat; Compa','','https://open.spotify.com/artist/5QSt7WdkvDgt6YNZbKyWG7'],
 [478,'','','Lagos','Afrobeats','','https://musicinafrica.net/directory/tml-vibez/'],
 [495,'','','','Christian & Gospel','','https://memaawards.africa/c/youth-emerging-talent']
];
for(const m of manualArtists){const a=before.artists.find(x=>x.id===m[0]);if(!a)continue;const p={id:a.id,name:a.name,fields:{}};['country','country_code','city_region','genre','biography'].forEach((f,i)=>add(p,a,f,m[i+1],m[6]));if(Object.keys(p.fields).length)plan.artists.push(p);}
const dateSkip=new Set([23681,23611,23686,23254,23514,23543,23452]);
for(const r of before.releases){
 const p={id:r.id,title:r.title,artist_id:r.artist_id,fields:{}},artist=before.artists.find(a=>a.id===r.artist_id),a=get(r.id,'apple'),d=get(r.id,'deezer'),c=get(r.id,'credits');
 const album=r.chart_type==='albums';
 const appleIdentity=(a.artists||[]).some(x=>norm(x)===norm(artist.name)||artist.aliases?.some(v=>norm(x)===norm(v)));
 const t=(a.tracks||[]).find(x=>norm(x.title)===norm(r.title)||base(x.title)===base(r.title));
 const appleValid=appleIdentity&&(album?norm(a.title)===norm(r.title):!!t)&&r.id!==23686;
 let matches=(d.details||[]).filter(x=>norm(x.item?.artist?.name)===norm(artist.name)&&(album?norm(x.item.title)===norm(r.title):base(x.item.title)===base(r.title)));
 if(album&&appleValid)matches=matches.filter(x=>x.item.nb_tracks===a.track_count);
 if(r.id===23712)matches=matches.filter(x=>x.item.nb_tracks===14);
 const dz=matches[0],item=dz?.item,da=dz?.album|| (album?item:null),ds=item?.link;
 if(appleValid){
  add(p,r,'apple_music_url',album?a.resolved_url:t.url,a.url);
  if(!album){const featured=t.title.match(/\(feat\.\s+([^)]+)\)/i)?.[1];if(featured)add(p,r,'featured_artists',featured,t.url);}
  let genre=(a.genre||'').split('·')[0].trim();if(r.id===23372)genre='African Music';
  add(p,r,'genre',genre,a.url);
  if(album)add(p,r,'number_of_tracks',a.track_count,a.url);
  const dateLine=(a.footer||'').split('\n')[0],stamp=Date.parse(dateLine+' 00:00:00 GMT');
  let date=Number.isFinite(stamp)?new Date(stamp).toISOString().slice(0,10):null;
  if(r.id===21564)date='2020-11-20';if(r.id===19616)date='2021-08-27';if(r.id===23100)date='2025-06-29';
  if(date&&!dateSkip.has(r.id)){add(p,r,'release_date',date,[21564,19616].includes(r.id)?ds:a.url);add(p,r,'release_year',Number(date.slice(0,4)),[21564,19616].includes(r.id)?ds:a.url);}
  let label=(a.footer||'').match(/℗\s*\d{4}\s+([^\n]+)/)?.[1]?.trim();
  if(label&&label.length%2===1){const half=(label.length-1)/2;if(label.slice(0,half)===label.slice(half+1))label=label.slice(0,half);}
  if(label&&r.id!==18038)add(p,r,'label',label,a.url);
  const distributor=label?.match(/distributed by (.+)$/i)?.[1];
  if(distributor)add(p,r,'distributor',distributor,a.url);
  if(album){const composers=[...new Set((a.tracks||[]).map(x=>x.composer).filter(Boolean))];if(composers.length)add(p,r,'songwriters',composers.join('; '),a.url);}
  if(!album&&t.composer)add(p,r,'songwriters',t.composer,t.url);
  if(!album&&c.url&&base(c.page_title).includes(base(r.title))){
   const writers=(c.credits||[]).filter(x=>x.roles.some(v=>['Songwriter','Composer','Lyrics','Lyricist'].includes(v))).map(x=>x.name);
   const producers=(c.credits||[]).filter(x=>x.roles.includes('Producer')).map(x=>x.name);
   if(writers.length&&blank(r.songwriters))p.fields.songwriters={value:[...new Set(writers)].join('; '),source:c.url};
   add(p,r,'producers',[...new Set(producers)].join('; '),c.url);
  }
 }
 if(item){
  if(!album)add(p,r,'isrc',item.isrc,ds);
  // UPC describes a product, so only use an exact matching album or standalone single.
  if(!dateSkip.has(r.id)&&(album||base(da?.title)===base(r.title)))add(p,r,'upc',album?item.upc:da?.upc,da?.link||ds);
  if(!appleValid){
   if(!dateSkip.has(r.id)){add(p,r,'release_date',item.release_date,ds);if(item.release_date)add(p,r,'release_year',Number(item.release_date.slice(0,4)),ds);}
   add(p,r,'label',da?.label,da?.link||ds);
   add(p,r,'genre',da?.genres?.data?.map(x=>x.name).join('; '),da?.link||ds);
   if(album)add(p,r,'number_of_tracks',item.nb_tracks,ds);
  }
 }
 const manual={
  22240:{release_date:'2026-03-19',release_year:2026,producers:'Thevibezmaster',genre:'Instrumental; Bongo Flava',audiomack_url:'https://audiomack.com/thevibezmaster/song/latest-bongo-mix-2026-djgids254-ft-marioodiamond-platnumz-jay-melodyzuchumbosso'},
  18823:{release_date:'2026-03-13',release_year:2026,producers:'DJ EXRAY',genre:'Afrosounds',audiomack_url:'https://audiomack.com/djexray/song/69aa2e90e7baa'},
  23100:{youtube_url:'https://www.youtube.com/watch?v=BM66nlRY4vo',songwriters:'Zacharia Gerald'},
  23632:{spotify_url:'https://open.spotify.com/album/1U5UY674wcDu0FisO7SXXp'},
  23625:{spotify_url:'https://open.spotify.com/album/4NpFPpGJRXGyrzDDJYtYfk'}
 }[r.id];
 if(manual){const src=manual.audiomack_url||manual.youtube_url||manual.spotify_url;for(const [f,v] of Object.entries(manual))add(p,r,f,v,src);}
 const ap=plan.artists.find(x=>x.id===r.artist_id);
 for(const f of ['country','country_code'])add(p,r,f,ap?.fields[f]?.value||artist[f],ap?.fields[f]?.source||`Existing artist record ${artist.id}`);
 if(Object.keys(p.fields).length)plan.releases.push(p);
 if(dateSkip.has(r.id))plan.notes.push({id:r.id,title:r.title,note:'Release date withheld because sources describe conflicting dates or editions.'});
 if(!appleValid&&!item&&!manual)plan.notes.push({id:r.id,title:r.title,note:'No sufficiently verified catalogue match; unavailable fields left empty.'});
}
fs.writeFileSync(`${dir}/update-plan.json`,JSON.stringify(plan,null,2));
const counts={releases:plan.releases.length,artists:plan.artists.length,release_fields:plan.releases.reduce((n,p)=>n+Object.keys(p.fields).length,0),artist_fields:plan.artists.reduce((n,p)=>n+Object.keys(p.fields).length,0)};
console.log(counts);
console.log(plan.releases.map(p=>`${p.id} ${p.title}: ${Object.entries(p.fields).map(([f,v])=>f+'='+v.value).join(' | ')}`).join('\n'));
