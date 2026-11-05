import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {publicHtmlFiles} from '../_tools/site-pages.mjs';

test('published marketing pages omit repeated disclaimers and developer notes',()=>{
  for(const file of publicHtmlFiles()){
    if(file==='offer.html')continue;
    assert.doesNotMatch(fs.readFileSync(file,'utf8'),/публичн.{0,30}оферт|Неизвестные характеристики не выдуманы|JavaScript отключ[её]н|предложение №/iu,file);
  }
});

test('the user agreement source remains unchanged',()=>{
  assert.equal(createHash('sha256').update(fs.readFileSync('offer.html','utf8').replaceAll('\r\n','\n')).digest('hex'),'4b852cdf74e0850d1e7c3772a803abea1db55f9ba9de207e145aa03214c1751b');
});

test('runtime card builders and regeneration sources cannot restore disclaimers',()=>{
  for(const file of ['assets/js/main.js','assets/js/showcase-cards.js','assets/js/newbuilds-catalog.js','_private/generate-newbuild-pages.js','tools/generate-construction-catalog.py'])assert.doesNotMatch(fs.readFileSync(file,'utf8'),/публичн.{0,30}оферт|Неизвестные характеристики не выдуманы|JavaScript отключ[её]н/iu,file);
});
