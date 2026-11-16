import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {normalizeRecord} from '../_tools/catalog-presentation.mjs';
import {objectPage} from '../_tools/build-object-pages.mjs';
import local from '../_private/local-newbuild-projects.js';

const read=file=>fs.readFileSync(file,'utf8');
const records=JSON.parse(read('data/catalog/registry.json'));
test('publication approval and a verification date alone never claim confirmed availability',()=>{
  const original=records.find(r=>r.id==='object_01');
  for(const input of [original,{...original,verifiedAt:'2026-11-16'}]) {
    const r=normalizeRecord(input);
    assert.equal(r.status,'active');
    assert.equal(r.availability_status,'unverified');
    assert.equal(r.status_label,'В каталоге');
    assert.doesNotMatch(objectPage(r),/schema.org\/InStock/);
  }
  const confirmed=normalizeRecord({...original,verifiedAt:'2026-11-16',availability_status:'confirmed'});
  assert.equal(confirmed.availability_status,'confirmed');
  assert.match(objectPage(confirmed),/schema.org\/InStock/);
  assert.equal(normalizeRecord({...original,status:'sold'}).status,'sold');
});
test('chosen service overrides generic or stale CTA classification in email subjects',()=>{
  const source=read('assets/js/form-handler.js');
  const code=source.slice(source.indexOf('  function inferLeadType('),source.indexOf('  function isMortgageRelevant('));
  const sandbox=vm.createContext({normalizeValue:value=>String(value||'').trim()});
  vm.runInContext(code,sandbox);
  const classify=(service,context)=>sandbox.inferLeadType({elements:{service:{value:service}}},context);
  assert.equal(classify('buy',{lead_type:'contact'}),'buy');
  assert.equal(classify('sell',{lead_type:'contact'}),'sell');
  assert.equal(classify('sell',{lead_type:'buy',object_id:'object_01'}),'sell');
  assert.equal(classify('buy',{lead_type:'newbuild'}),'newbuild');
  assert.equal(classify('mortgage',{lead_type:'contact'}),'mortgage');
  assert.equal(classify('consultation',{lead_type:'buy'}),'contact');
  assert.equal(classify('valuation',{}),'valuation');
});
test('local developments are synchronized once without fabricated prices, facts or new detail pages',()=>{
  const catalog=JSON.parse(read('output/newbuilds/catalog-v3.json'));
  const projects=JSON.parse(read('data/zhk/aksay.json'));
  assert.deepEqual(local.syncLocalProjects(structuredClone(catalog.items),projects),catalog.items);
  const original=JSON.parse(execFileSync('git',['show','1976779:output/newbuilds/catalog-v3.json'],{encoding:'utf8'}));
  for(const before of original.items) {
    const after=catalog.items.find(r=>r.id===before.id);
    const {local_detail_url,...unchanged}=after;
    assert.deepEqual(unchanged,before,before.id+' original facts must survive');
  }
  for(const project of projects.filter(r=>r.publish)) {
    const items=catalog.items.filter(r=>r.local_detail_url==='/seo/zhk-'+project.slug+'-aksay.html');
    assert.equal(items.length,1,project.name);
    assert.ok(fs.existsSync(items[0].local_detail_url.slice(1)));
  }
  for(const item of catalog.items.filter(r=>r.source_type==='site_page')) {
    assert.equal(item.price.value,null);assert.equal(item.status,null);assert.equal(item.checked_at,null);
    assert.equal(item.detail_url,null);assert.equal(item.completeness.state,'needs_review');
  }
});
test('published descriptions and underlying listing evidence survive the technical changes',()=>{
  const original=JSON.parse(execFileSync('git',['show','1976779:data/catalog/registry.json'],{encoding:'utf8'}));
  for(const before of original) {
    const after=records.find(r=>r.id===before.id);
    for(const field of ['description_raw','description_public','title_raw','price','area_total','city','settlement','address','images','price_conflict','area_conflict']) assert.deepEqual(after[field],before[field],before.id+': '+field);
  }
});
test('local selection cards link directly to every matching published registry property',()=>{
  for(const [file,type,cities] of [
    ['kvartiry','apartment',['Аксай']],['doma','house',['Аксай','Аксайский район']],['uchastki','land',['Аксай']]
  ]) {
    const html=read('seo/'+file+'-loc-aksay.html');
    const ids=[...html.matchAll(/<article\b[^>]*data-registry-id="([^"]+)"/g)].map(m=>m[1]);
    assert.deepEqual(ids,records.filter(r=>r.type===type&&r.status==='active'&&cities.includes(r.city)).map(r=>r.id));
    assert.ok(html.includes('В подборке объектов: '+ids.length+'.'));
    for(const id of ids) assert.ok(html.includes('/obekt/'+id+'.html#lead-form-section'));
  }
});
