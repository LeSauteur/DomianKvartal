import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { objectPage } from '../_tools/build-object-pages.mjs';

const read = file => JSON.parse(fs.readFileSync(file,'utf8'));
const provenance = read('docs/owner/max-listings-2026-10-26.json');
const registry = read('data/catalog/registry.json');
const expected = {house_914:[11500000,10],house_915:[null,14],object_1013:[8800000,19],house_916:[24500000,23],object_1014:[6900000,10]};

test('MAX listings retain approved prices, unique local media and exclude unconfirmed apartments',()=>{
  const hashes=new Set();
  for(const record of provenance.records){
    assert.doesNotMatch(record.canonical,/\\/,'Source paths must work on Windows and Linux');
    const r=registry.find(r=>r.id===record.id), d=read(record.canonical);
    assert.equal(r.price,expected[r.id][0]);
    assert.equal(r.images.length,expected[r.id][1]);
    assert.equal(d.price,expected[r.id][0]);
    for(const media of record.media){
      assert.ok(media.source_message_index<=112);
      if(record.id==='object_1014')assert.equal(media.source_message_index,112);
      const bytes=fs.readFileSync('.'+media.path);
      const sha=crypto.createHash('sha256').update(bytes).digest('hex');
      assert.equal(sha,media.sha256);
      assert.equal(bytes.subarray(8,12).toString(),'WEBP');
      assert.ok(!hashes.has(sha),media.path); hashes.add(sha);
    }
    const html=fs.readFileSync('obekt/'+record.id+'.html','utf8');
    assert.match(html,/class="visibility-description"/);
    assert.match(html,/class="h-captcha"/);
    assert.doesNotMatch(html,/oneme\.ru/);
    assert.equal(html,objectPage(r));
  }
  assert.equal(hashes.size,77);
  const yantar=registry.find(r=>r.id==='house_915');
  for(const value of [yantar.description_raw,fs.readFileSync('obekt/house_915.html','utf8')]){
    assert.doesNotMatch(value,/16\s*500\s*000|10300/);
  }
  assert.match(fs.readFileSync('obekt/house_915.html','utf8'),/Цена по запросу/);
  assert.doesNotMatch(fs.readFileSync('obekt/house_915.html','utf8'),/"@type":"Offer"/);
});

test('floor plan is separate from all photograph galleries and new listings survive feed generation',()=>{
  const r=registry.find(r=>r.id==='object_1013');
  assert.equal(r.floor_plans.length,1);
  assert.ok(!r.images.includes(r.floor_plans[0]));
  const html=fs.readFileSync('obekt/object_1013.html','utf8');
  assert.match(html,/<section class="visibility-plans" data-object-plans><h2>Планировка<\/h2>/);
  const gallery=html.match(/<div class="visibility-gallery">([\s\S]*?)<\/div>/)[1];
  assert.doesNotMatch(gallery,/plan\.webp/);
  for(const record of provenance.records){
    for(const dir of ['home','catalog',record.type==='house'?'houses':'apartments']){
      const feed=read('output/'+dir+'/'+(dir==='catalog'?'registry':'new-objects')+'.json');
      const item=feed.find(item=>item.id===record.id);
      assert.ok(item,dir+': '+record.id);
      assert.equal(item.price,record.price);
      assert.equal(item.images.length,expected[record.id][1]);
      assert.ok(item.images.every(image=>image.startsWith('/assets/images/listings/')));
    }
    assert.match(fs.readFileSync('sitemap.xml','utf8'),new RegExp('/obekt/'+record.id+'\\.html'));
  }
});
