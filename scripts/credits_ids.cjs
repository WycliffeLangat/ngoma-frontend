const fs = require('fs');
const rows = JSON.parse(fs.readFileSync('output/credits/catalog-inventory.json', 'utf8'));
const out = { songs: [], albums: [] };
for (const r of rows) {
  const u = r.apple_music_url || '';
  const m = u.match(/[?&]i=(\d+)/) || u.match(/\/(\d+)(?:\?|$)/);
  if (m) out[r.chart_type === 'albums' ? 'albums' : 'songs'].push({release_id:r.id,id:m[1],title:r.title,artist:r.artist});
}
console.log(JSON.stringify(out));
