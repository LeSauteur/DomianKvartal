import fs from 'node:fs';
import { root, csv } from './build-registry.mjs';
import { canonical, noindex, linkGraph, readPage } from './site-pages.mjs';
import { writeGenerated } from './write-generated.mjs';

const folder=root+'/docs/technical-audit-20261116';
const registry=JSON.parse(fs.readFileSync(root+'/data/catalog/registry.json','utf8')).filter(r=>r.status!=='placeholder');
const origin='https://domian-161.ru';
const rows=name=>fs.readFileSync(folder+'/source/'+name,'utf8').trim().split(/\r?\n/).slice(1).filter(Boolean).map(line=>line.trim().split(';'));
const discovered=new Set(rows('discovered_not_indexed_256.csv').map(row=>row[0]));
const indexed=new Set(rows('index_41_vs_performance.csv').map(row=>row[0]));
const {incoming,reachable}=linkGraph();
const sitemap=readPage('sitemap.xml');
const robots=readPage('robots.txt');
const facts=r=>[r.city,r.address,r.price,r.area_conflict?null:r.area_total,r.rooms].filter(v=>v!==null&&v!==undefined).length;
const url=r=>origin+'/obekt/'+r.id+'.html';
const local=r=>['Аксай','Аксайский район'].includes(r.city);
const controls=new Set([
  ...registry.filter(local).map(r=>r.id),
  ...registry.filter(r=>!local(r)&&discovered.has(url(r))).sort((a,b)=>facts(b)-facts(a)||a.id.localeCompare(b.id)).slice(0,5).map(r=>r.id),
  ...registry.filter(r=>indexed.has(url(r))).slice(0,3).map(r=>r.id)
]);
const results=registry.map(r=>{
  const file='obekt/'+r.id+'.html',html=readPage(file);
  const checks={self_canonical:canonical(html)===url(r),allows_indexing:!noindex(html),
    sitemap:sitemap.includes('<loc>'+url(r)+'</loc>'),reachable:reachable.has(file),
    static_description:html.includes('data-listing-description')&&html.includes('<h1>'),
    robots_allows:!/^Disallow:\s*\/(?:obekt\/?)?\s*$/imu.test(robots)};
  return {id:r.id,url:url(r),gsc_20261109:discovered.has(url(r))?'discovered_not_indexed':indexed.has(url(r))?'indexed':'unknown',
    control:controls.has(r.id),local:local(r),incoming:incoming.get(file)||0,description_words:r.description_public.split(/\s+/u).length,
    missing:[!r.city||r.city==='Ростовская область'?'precise_location':null,r.price===null?'price':null,r.type!=='land'&&(r.area_total===null||r.area_conflict)?'total_area':null,!r.verifiedAt?'availability_verification':null].filter(Boolean),
    checks,local_ok:Object.values(checks).every(Boolean),live:null};
});

if(process.argv.includes('--live')) {
  const robotsResponse=await fetch(origin+'/robots.txt',{signal:AbortSignal.timeout(20000)});
  const robotsText=await robotsResponse.text();
  const liveRobots={status:robotsResponse.status,allows:!/^Disallow:\s*\/(?:obekt\/?)?\s*$/imu.test(robotsText)};
  const queue=results.filter(row=>row.control);
  await Promise.all(Array.from({length:5},async()=>{
    while(queue.length) {
      const row=queue.shift();
      try {
        const response=await fetch(row.url,{signal:AbortSignal.timeout(20000),redirect:'follow'});
        const html=await response.text();
        const xrobots=response.headers.get('x-robots-tag')||'';
        const checks={http_200:response.status===200,no_redirect:response.url===row.url,
          html:/text\/html/i.test(response.headers.get('content-type')||''),self_canonical:canonical(html)===row.url,
          allows_indexing:!noindex(html)&&!/(?:noindex|none)/i.test(xrobots),
          static_description:html.includes('data-listing-description')&&html.includes('<h1>'),
          robots_allows:liveRobots.status===200&&liveRobots.allows};
        row.live={status:response.status,x_robots_tag:xrobots,final_url:response.url,checks,ok:Object.values(checks).every(Boolean)};
      } catch(error) {row.live={ok:false,error:error.message};}
      console.log(row.id+': '+(row.live.ok?'OK':JSON.stringify(row.live)));
    }
  }));
}

const output={checked_at:new Date().toISOString(),gsc_snapshot:'2026-11-09',
  baseline:'1976779faf7e22f2818f63a9bb645543f5f53e1d',scope:'Local checks: all 220. Live checks: 25 local, 5 complete non-local, 3 indexed controls, deduplicated.',
  totals:{local_checked:results.length,local_failed:results.filter(r=>!r.local_ok).length,
    live_checked:results.filter(r=>r.live).length,live_failed:results.filter(r=>r.live&&!r.live.ok).length},results};
writeGenerated(folder+'/indexation-checks.json',JSON.stringify(output,null,2)+'\n');
const header=['id','url','gsc_20261109','control','local_checks_pass','incoming_links','description_words','data_to_confirm','live_http','live_checks_pass'];
writeGenerated(folder+'/indexation-checks.csv',header.join(';')+'\n'+results.map(r=>[r.id,r.url,r.gsc_20261109,r.control,r.local_ok,r.incoming,r.description_words,r.missing.join(', '),r.live?.status,r.live?.ok].map(csv).join(';')).join('\n')+'\n');
console.log(JSON.stringify(output.totals));
if(output.totals.local_failed||output.totals.live_failed)process.exitCode=1;
