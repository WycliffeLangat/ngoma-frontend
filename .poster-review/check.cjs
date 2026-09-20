const fs=require('fs');
const path=require('path');
const esbuild=require('esbuild');
const {chromium}=require('playwright');
(async()=>{
 await esbuild.build({entryPoints:['.poster-review/review.jsx'],bundle:true,jsx:'automatic',outfile:'.poster-review/review.js',define:{'import.meta.env':'{}'},plugins:[{name:'review-exports',setup(build){build.onLoad({filter:/src[\\/]admin[\\/]pages[\\/].*\.jsx$/},args=>{const source=fs.readFileSync(args.path,'utf8');const names=[...source.matchAll(/^function (\w*Content)\(/gm)].map(m=>m[1]);if(args.path.endsWith('NewsCardPage.jsx'))names.push('DEFAULT_NEWS_DESIGN','DEFAULT_VIDEO_DESIGN');return {contents:source+(names.length?'\nexport { '+names.join(',')+' };':''),loader:'jsx'};});}}]});
 fs.writeFileSync('.poster-review/index.html','<!doctype html><html><head><meta charset="UTF-8"><style>*{box-sizing:border-box}body{margin:0;background:#888}section{width:1080px;height:1350px;margin-bottom:30px}img{max-width:100%}</style></head><body><div id="root"></div><script src="review.js"></script></body></html>');
 const server=require('http').createServer((req,res)=>{const file=req.url.split('?')[0].endsWith('.js')?'review.js':'index.html';res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':'text/html');res.end(fs.readFileSync(path.join('.poster-review',file)));}).listen(5189,'127.0.0.1');
 const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1080,height:1350}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5189');await page.waitForSelector('section');
 const names=await page.locator('section').evaluateAll(nodes=>nodes.map(n=>n.dataset.fixture));
 for(const theme of ['dark','light']){
 await page.goto('http://127.0.0.1:5189?theme='+theme);await page.waitForSelector('section');await page.evaluate(()=>document.fonts.ready);
 for(const name of names)await page.locator(`[data-fixture="${name}"]`).screenshot({path:`.poster-review/${name}-${theme}.png`});
 const overflows=await page.locator('section').evaluateAll(sections=>sections.flatMap(section=>{const bounds=section.getBoundingClientRect();return [...section.querySelectorAll('*')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&(r.bottom>bounds.bottom+2||r.right>bounds.right+2||r.left<bounds.left-2)}).map(el=>({poster:section.dataset.fixture,text:el.textContent.slice(0,70),tag:el.tagName})).slice(0,8)}));
 console.log(theme,JSON.stringify(overflows));
 }
 await page.goto('http://127.0.0.1:5189?name=chart5');await page.waitForSelector('section');const download=page.waitForEvent('download');await page.evaluate(()=>window.exportReview());await(await download).saveAs('.poster-review/export.png');
 console.log('Rendered',names.length,'poster layouts in both themes. Browser errors:',JSON.stringify(errors));await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1)});
