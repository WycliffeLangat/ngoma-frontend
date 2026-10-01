const fs=require('fs');
const dir='output/september-2026',base='https://web-production-0f6b5.up.railway.app/api/v1';
const plan=JSON.parse(fs.readFileSync(`${dir}/update-plan.json`,'utf8'));
if(fs.existsSync(`${dir}/profile-links-apply-result.json`)){
 const links=JSON.parse(fs.readFileSync(`${dir}/profile-links-plan.json`,'utf8'));
 for(const p of links.artists){const prior=plan.artists.find(x=>x.id===p.id);if(prior)Object.assign(prior.fields,p.fields);else plan.artists.push(p);}
}
(async()=>{
 const checks=[],errors=[];
 const rows=[...plan.releases.map(p=>({...p,type:'releases'})),...plan.artists.map(p=>({...p,type:'artists'}))];
 for(let i=0;i<rows.length;i+=4){await Promise.all(rows.slice(i,i+4).map(async p=>{
  const url=`${base}/${p.type}/${p.id}/`;
  try{const response=await fetch(url,{signal:AbortSignal.timeout(45000)});if(!response.ok)throw Error('HTTP '+response.status);const data=await response.json();
   const wrong=Object.entries(p.fields).filter(([f,e])=>data[f]!==e.value).map(([f,e])=>({field:f,expected:e.value,actual:data[f]}));
   checks.push({type:p.type,id:p.id,checked_fields:Object.keys(p.fields).length,mismatches:wrong});if(wrong.length)errors.push({id:p.id,wrong});
  }catch(e){errors.push({id:p.id,error:e.message});}
 }));}
 const revision=await (await fetch(`${base}/app-data/revision/`)).json();
 fs.writeFileSync(`${dir}/public-verification.json`,JSON.stringify({checked_at:new Date().toISOString(),revision,checks,errors},null,2));
 console.log(JSON.stringify({records:checks.length,fields:checks.reduce((n,c)=>n+c.checked_fields,0),errors,revision}));
 if(errors.length)process.exitCode=1;
})();
