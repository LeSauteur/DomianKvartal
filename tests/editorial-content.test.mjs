import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {descriptionText,editorialFingerprint,retainEditorial,renderDescription} from '../_tools/catalog-editorial.mjs';
import {syncPublicPage} from '../_tools/sync-public-header.mjs';
import {selection} from '../_tools/build-seo-pages.mjs';

const read=file=>fs.readFileSync(file,'utf8');
const json=file=>JSON.parse(read(file));
const records=json('data/catalog/registry.json').filter(r=>r.status!=='placeholder');
const clean=s=>s.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

test('all 220 reviewed descriptions retain provenance and render their content-driven blocks',()=>{
  assert.equal(records.length,220);
  let lists=0;
  for(const r of records){
    assert.equal(r.editorial.scope,'copy-editing',r.id);
    assert.equal(r.editorial.sourceHash,editorialFingerprint(r),r.id);
    assert.equal(r.description_public,descriptionText(r.editorial.blocks),r.id);
    const markup=renderDescription(r),html=read('obekt/'+r.id+'.html');
    assert.ok(html.includes(markup),r.id);
    if(r.editorial.blocks.some(b=>b.items)){lists++;assert.match(markup,/<ul><li>/u,r.id);}
    for(const block of r.editorial.blocks.filter(b=>b.title))assert.ok(markup.includes('<h3>'+block.title+'</h3>'),r.id);
    assert.doesNotMatch(r.description_public,/это очень хорошее предложение|жд[её]т вас|взрослый человек в|полная юридическая прозрачность|внутреннее пространство включает\.|ремонтом,\.|44[.,]3\s*м|предложение №|фотографий\s*[:—]\s*\d|могу доработать|могу сделать вариант|укажите особенности|счастливый май|для согласования\s*$/iu,r.id);
  }
  assert.ok(lists>100&&lists<220,'formatting follows available content');
});

test('a changed source invalidates reviewed copy instead of reusing stale facts',()=>{
  const r=records[0];
  assert.equal(retainEditorial({...r},r).description_public,r.description_public);
  for(const patch of [{description_raw:r.description_raw+' New fact'},{area_total:999},{images:[]}]){
    const changed={...r,...patch,description_public:'Fresh fallback'};
    assert.equal(retainEditorial(changed,r).editorial,undefined);
    assert.equal(retainEditorial(changed,r).description_public,'Fresh fallback');
    assert.throws(()=>renderDescription(changed),/needs source review/);
  }
  const hostile={...r};
  hostile.editorial={sourceHash:editorialFingerprint(hostile),blocks:[{text:'<script>alert("x")</script> 30 м²'},{title:'A & B',items:['<img src=x onerror=alert(1)>']}]};
  const html=renderDescription(hostile);
  assert.doesNotMatch(html,/<script|<img/);
  assert.match(html,/<strong>30 м²<\/strong>/);
  assert.match(html,/A &amp; B/);
});

test('editorial evidence remains private in every public catalogue projection',()=>{
  for(const file of ['output/catalog/registry.json','output/home/new-objects.json','output/apartments/new-objects.json','output/houses/new-objects.json','output/lands/new-objects.json'])
    assert.doesNotMatch(read(file),/"(?:editorial|visualEvidence|comparisonIds|sourceHash|reviewedAt)"/,file);
});

test('four similar houses link to each concrete alternative without claiming one builder',()=>{
  const ids=['house_45','house_47','house_48','house_69'];
  for(const id of ids){
    const html=read('obekt/'+id+'.html'),section=html.match(/<section class="visibility-comparison">([\s\S]*?)<\/section>/)?.[1];
    assert.ok(section,id);
    for(const other of ids.filter(other=>other!==id))assert.ok(section.includes('/obekt/'+other+'.html'),id+' '+other);
    assert.doesNotMatch(section,/одного застройщика|одной компании/iu);
  }
});

test('all 26 SEO pages preserve canonical policy and original images',()=>{
  for(const c of json('tests/fixtures/editorial-seo-20261106.json')){
    const html=read(c.file);
    assert.equal(html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/i)?.[1],c.canonical,c.file);
    assert.equal(/<meta[^>]*(?:name="robots"[^>]*content="[^"]*noindex|content="[^"]*noindex[^>]*name="robots")/i.test(html),c.noindex,c.file);
    assert.deepEqual([...html.matchAll(/<img\b[^>]*src="([^"]+)"/g)].map(m=>m[1]),c.images,c.file);
    assert.equal(syncPublicPage(html,c.file),html,c.file+' header must be current');
  }
});

test('SEO selections show actual matching inventory, full introductions and direct object links',()=>{
  const publicIds=new Set(records.map(r=>r.id));
  for(const config of json('data/seo/landing-pages.json')){
    const html=read(config.file),main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)[1];
    const actual=[...main.matchAll(/<article class="card" data-registry-id="([^"]+)"/g)].map(m=>m[1]);
    assert.deepEqual(actual,selection(config,records).map(r=>r.id),config.file);
    for(const id of actual){
      assert.ok(publicIds.has(id),config.file+' '+id);
      assert.ok(main.includes('href="/obekt/'+id+'.html"'),id);
      const r=records.find(r=>r.id===id),lead=r.editorial.blocks[0].text;
      assert.ok(clean(main).includes(lead.replaceAll('&','&amp;')),id+' full lead');
    }
    assert.doesNotMatch(main,/предложений типа|data-registry-id="nb_|\.\.\.|\[object Object\]|[\u{1F300}-\u{1FAFF}]/u,config.file);
  }
});

test('construction keeps original facts and media while removing duplicate scenario paragraphs',()=>{
  const fixture=json('tests/fixtures/editorial-construction-20261106.json');
  const projects=json('_private/construction-projects.json').projects;
  assert.deepEqual(projects.map(p=>p.slug),fixture.ids);
  assert.equal(hash(projects.map(p=>Object.fromEntries(fixture.keys.map(key=>[key,p[key]??null])))),fixture.hash);
  for(const p of projects){
    const html=read('construction/projects/'+p.slug+'.html');
    assert.doesNotMatch(html,/class="project-living"|Кухня-гостиная формирует общее пространство/u,p.slug);
    const content=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)[1];
    const paragraphs=[...content.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)].map(m=>clean(m[1])).filter(s=>s.length>90);
    assert.equal(new Set(paragraphs).size,paragraphs.length,p.slug+' repeated paragraph');
  }
  const p=projects.find(p=>p.slug==='soyuz-142-2');
  assert.ok(p.features.includes('Раздельные кухня и гостиная'));
});
