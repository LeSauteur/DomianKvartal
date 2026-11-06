import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {editorialFingerprint} from '../_tools/catalog-editorial.mjs';
import {finalizeDescriptions,publicFacts} from '../_tools/catalog-presentation.mjs';
const read=file=>fs.readFileSync(file,'utf8');
const json=file=>JSON.parse(read(file));
const registry=json('data/catalog/registry.json'),active=registry.filter(r=>r.status!=='placeholder');
const prior=JSON.parse(execFileSync('git',['show','942f385:data/catalog/registry.json'],{encoding:'utf8',maxBuffer:8*1024*1024}));
const ledger=json('docs/editorial-recovery-20261106/review-ledger.json');
const saved=json('data/catalog/editorial-copy.json');
const withoutCopy=({editorial,description_public,...source})=>source;
const sparseIds=['house_06','house_07','house_19','house_22','house_24','land_06','land_07','object_20'];

test('recovery covers all 220 objects and changes no original characteristics or media',()=>{
  assert.deepEqual(registry.map(withoutCopy),prior.map(withoutCopy));
  assert.equal(ledger.length,220);
  assert.deepEqual(ledger.map(r=>r.id),active.map(r=>r.id));
  assert.deepEqual(Object.keys(saved),active.map(r=>r.id));
  for(const r of active){
    assert.deepEqual(r.editorial,saved[r.id],r.id);
    assert.equal(saved[r.id].sourceHash,editorialFingerprint(r),r.id);
    const row=ledger.find(row=>row.id===r.id);
    assert.equal(row.raw,r.description_raw,r.id);
    assert.equal(row.after,r.description_public,r.id);
    assert.ok(row.review.length>20,r.id+' individual decision');
    assert.equal(row.editorialBefore,prior.find(p=>p.id===r.id).description_public,r.id);
  }
});

test('known lost facts are visible in descriptions or in rendered parameters',()=>{
  const expected={
    house_02:[/5,5 сотки/u,/Подвал и терраса — по 25 м²/u,/итальянский котёл/u],
    house_64:[/четырьмя комнатами/u,/Участок — 6 соток/u,/Двор ухожен/u],
    house_913:[/Двухэтажный/u,/125 м²/u,/27 м²/u,/9 соток/u],
    object_42:[/белорусская кухня/u,/телевизор в спальне не остаётся/u],
    object_48:[/Квартира находится в ипотеке/u],
    object_58:[/Ипотечный расчёт не подходит/u],
    object_97:[/Три изолированные комнаты/u,/два санузла/u],
    object_907:[/евроремонт/u,/лоджия/u,/Индивидуальное отопление/u],
    object_910:[/августе 2025/u,/посудомоечная/u,/водонагреватель/u],
    object_916:[/панельный/u,/балкон/u,/косметический ремонт/u]
  };
  for(const [id,patterns]of Object.entries(expected)){
    const text=active.find(r=>r.id===id).description_public;
    for(const re of patterns)assert.match(text,re,id);
    const html=read('obekt/'+id+'.html');
    assert.ok(html.includes('data-listing-description'),id);
  }
  assert.doesNotMatch(active.find(r=>r.id==='object_94').description_public,/подземн/iu);
});

test('sparse sources stay honest and only audited exceptions can have identical copy',()=>{
  assert.deepEqual(active.filter(r=>r.editorial.allowIdenticalSparseCopy).map(r=>r.id).sort(),[...sparseIds].sort());
  for(const id of ['house_19','house_22','house_24'])assert.equal(saved[id].blocks[0].text,'Дом.');
  for(const id of sparseIds)assert.equal(saved[id].visualEvidence,undefined,id);
  const a=active.find(r=>r.id==='house_06'),b=active.find(r=>r.id==='house_07');
  assert.doesNotThrow(()=>finalizeDescriptions([a,b]));
  assert.throws(()=>finalizeDescriptions([a,{...b,editorial:{...b.editorial,allowIdenticalSparseCopy:false}}]),/editorial review/);
});

test('conflicting living area never leaks through any public projection',()=>{
  const r=active.find(r=>r.id==='object_904');
  assert.equal(r.area_living,20,'original source field preserved');
  assert.equal(publicFacts(r).area_living,null);
  const html=read('obekt/object_904.html');
  const main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)[1];
  assert.doesNotMatch(main,/<dt>Жилая площадь<\/dt>/);
  for(const file of ['output/catalog/registry.json','output/apartments/new-objects.json','output/houses/new-objects.json','output/lands/new-objects.json','output/home/new-objects.json']){
    const item=json(file).find(x=>x.id===r.id);
    if(item)assert.equal(item.features.livingArea,null,file);
    assert.doesNotMatch(read(file),/"(?:suppressedFacts|allowIdenticalSparseCopy)"/,file+' private review metadata');
  }
  assert.ok(ledger.find(x=>x.id===r.id).conflicts.some(x=>x.includes('19 и 20')));
});
