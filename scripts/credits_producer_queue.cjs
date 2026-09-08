const fs=require('fs');
const rows=JSON.parse(fs.readFileSync('output/credits/track-credits.json','utf8'));
console.log(JSON.stringify([...new Map(rows.map(x=>[x.apple_song_id,{id:x.apple_song_id,title:x.title,artist:x.artist}])).values()]));
