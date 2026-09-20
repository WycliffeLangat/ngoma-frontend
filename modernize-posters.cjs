const fs = require('node:fs');
const { parse } = require('@babel/parser');
const admin = ['PosterGeneratorPage', 'MoversPosterPage', 'CrossPlatformPosterPage', 'HallOfFamePosterPage', 'HeadToHeadPosterPage', 'PlatformBreakdownPosterPage', 'SpotlightGeneratorPage', 'AnalyticsRecordPage', 'QRCodePosterPage'];
const paths = [...admin.map(name => `src/admin/pages/${name}.jsx`), ...fs.readdirSync('src/components/sharePosters').filter(name => name.endsWith('.jsx')).map(name => `src/components/sharePosters/${name}`), 'src/components/SharePosterCard.jsx'];
for (const path of paths) {
  let source = fs.readFileSync(path, 'utf8');
  const limit = path.includes('/admin/') ? source.indexOf('export default function') : source.length;
  const edits = [];
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'ObjectProperty' && node.key.name === 'fontSize' && node.start < limit) {
      edits.push([node.value.start, node.value.end, `posterFontSize(${source.slice(node.value.start, node.value.end)})`]);
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') visit(value);
    }
  }
  visit(parse(source, {sourceType: 'module', plugins: ['jsx']}));
  for (const [start, end, value] of edits.sort((a,b) => b[0]-a[0])) source = source.slice(0,start)+value+source.slice(end);
  if (edits.length) source = source.replace(/import \{(\r?\n)  POSTER_/, 'import {$1  posterFontSize,$1  POSTER_');
  const boundary = path.includes('/admin/') ? source.indexOf('export default function') : source.length;
  let content = source.slice(0, boundary).replaceAll('background: t.pageBg', 'background: t.posterBackground');
  content = content.replaceAll('const headerH = 365;', 'const headerH = 340;').replaceAll('const listTop = 365;', 'const listTop = 340;');
  content = content.replaceAll('Math.min(88, Math.max(40, rowH - 18))', 'Math.min(112, Math.max(36, rowH - 12))');
  content = content.replaceAll('borderRadius: 14, background: t.rowBg', 'borderRadius: 24, background: t.rowBg');
  content = content.replaceAll('borderRadius: 14,\n', 'borderRadius: 24,\n');
  if (/ChartListSharePoster|PosterGeneratorPage|Movers/.test(path)) {
    content = content.replaceAll('paddingTop: rowPadY,', 'paddingTop: rowPadY,\n                  paddingLeft: 16,\n                  paddingRight: 16,\n                  background: i % 2 === 0 ? t.rowBg : "transparent",\n                  borderRadius: 16,');
    content = content.replaceAll('gap: Math.round(28 * scale)', 'gap: Math.round(20 * scale)');
  }
  if (/HeadToHead/.test(path)) {
    content = content.replaceAll('width: 100, height: 100', 'width: 128, height: 128').replaceAll('width={100} height={100}', 'width={128} height={128}');
    content = content.replaceAll('fontSize: posterFontSize(19)', 'fontSize: 30').replaceAll('padding: "10px 12px"', 'padding: "14px 16px"');
    content = content.replaceAll('strokeWidth={3}', 'strokeWidth={4}').replaceAll('width={40}', 'width={64}');
  }
  if (/HallOfFame/.test(path)) content = content.replaceAll('cardH - 150', 'cardH - 166');
  if (/QRCodePoster/.test(path)) {
    content = content.replace('const qrSize = 520;', 'const qrSize = 460;').replace('top: 246,', 'top: 220,');
    content = content.replace('width: qrSize + 72,', 'width: qrSize,\n            flexShrink: 0,\n            boxSizing: "content-box",').replace('height: qrSize + 72,', 'height: qrSize,');
  }
  fs.writeFileSync(path, content + source.slice(boundary));
  console.log(path, edits.length);
}
