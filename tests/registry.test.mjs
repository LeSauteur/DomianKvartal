import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parsePrice, parseNumbers, parseLocation } from "../_tools/catalog-parser.mjs";
import { buildRegistry, root } from "../_tools/build-registry.mjs";
import { publicHtmlFiles, readPage } from '../_tools/site-pages.mjs';
const nums = (t,d="",type="apartment") => parseNumbers(t,d,type);
test('source placeholders remain marked and never gain public pages, links or feeds',()=>{
  const registry=JSON.parse(fs.readFileSync(root+'/data/catalog/registry.json','utf8'));
  const placeholders=registry.filter(r=>r.status==='placeholder');
  assert.equal(placeholders.length,20);
  for(const r of placeholders) {
    assert.equal(JSON.parse(fs.readFileSync(root+'/'+r.source_path,'utf8')).is_placeholder,true,r.id);
    assert.deepEqual(r.listing_urls,[]);
    assert.equal(fs.existsSync(root+'/obekt/'+r.id+'.html'),false,r.id);
    for(const file of publicHtmlFiles()) assert.doesNotMatch(readPage(file),new RegExp('(?:/obekt/|object=|data-registry-id=["\'])'+r.id+'(?:\\.html|["\'&])'),file);
    assert.ok(!fs.readFileSync(root+'/sitemap.xml','utf8').includes('/obekt/'+r.id+'.html'));
    for(const dir of ['apartments','houses','lands','home','catalog']) {
      const feed=JSON.parse(fs.readFileSync(root+'/output/'+dir+'/'+(dir==='catalog'?'registry':'new-objects')+'.json','utf8'));
      assert.ok(!feed.some(item=>item.id===r.id),dir+': '+r.id);
    }
  }
});
test("registry numeric rules accept explicit units and reject IDs and unrelated letters",()=>{
  for (const t of ["100 кв.м","object_905","2 квартиры рядом","100-комнатная","улица 3к5"]) assert.equal(nums(t).rooms,null,t);
  for (const [t,n] of [["1-комнатная",1],["2-к квартира",2],["3 комнаты",3],["3х-комнатная",3]]) assert.equal(nums(t).rooms,n,t);
  assert.equal(nums("Дом 100 кв.м","", "house").area_total,100);
  assert.equal(nums("Квартира 44 м²","Общая площадь 44 м², кухня 9 м²").area_total,44);
  assert.equal(nums("Квартира","Общая площадь 44 м². Общая площадь 45 м²").area_total,null);
  assert.equal(nums("Участок 6,5 соток","","land").lot_area_sotok,6.5);
  assert.equal(nums("Участок 6 соток, 7 соток","","land").lot_area_sotok,null);
  assert.equal(nums("","Этаж 3 из 9").floor,3);
  assert.equal(nums("","Этаж 3/9").floors,9);
  assert.equal(nums("","на 15-м этаже из 17").floor,15);
  assert.equal(nums("","Этаж 20/10").floor,null);
  assert.equal(nums("","Берберовская 4/5").floors,null);
  assert.equal(nums("2-этажный дом","","house").floors,2);
  assert.equal(nums("","Этаж: 2").floor,2);
});
test("price and location rules require evidence",()=>{
  for(const [s,n] of [["5 950 000 ₽",5950000],["6,2 млн",6200000],["100 тыс руб",100000],["по запросу",null],["200000 руб/м²",null],["-5000000",null]]) assert.equal(parsePrice(s),n);
  assert.equal(parseLocation("ЖК Красный Аксай","").city,null);
  assert.equal(parseLocation("Дом","до Аксая 20 минут, до Ростова 35").city,null);
  assert.equal(parseLocation("Дом","Ваш участковый риэлтор в Аксае").city,null);
  assert.equal(parseLocation("Квартира","Адрес: г. Аксай, ул. Речников").city,"Аксай");
  assert.equal(parseLocation("Участок","Аксайский р-н, пос. Российский").city,"Аксайский район");
  assert.equal(parseLocation("Дом","в Ростов-на-Дону").city,"Ростов-на-Дону");
  assert.equal(parseLocation("Дом","г. Шахты").city,"другое");
  assert.equal(parseLocation("Участок","Азовский р-н").district,"Азовский р-н");
  assert.equal(parseLocation("Дом","п. Российский").city_suggested,"Российский");
  assert.match(parseLocation("Дом","п. Российский").city_evidence,/п\. Российский/);
});
test('apartment total area prioritizes description, rejects small unconfirmed titles and excludes partial areas',()=>{
  for(const [title,description,area] of [
    ['Квартира 50 м²','Общая площадь — 42,5 м²',42.5],
    ['Квартира 10 м²','Площадь — 40,5 м², кухня — 10 м²',40.5],
    ['Квартира 13 м²','Квартира:\n- 2 изолированные комнаты, 54,4 м²\n- Кухня 13 м²',54.4],
    ['Квартира 13 м²','Общая площадь — 17.8 м², жилая — 13 м²',17.8],
    ['Квартира 15 м²','До центра 15 минут',null],
    ['Квартира 15 м²','Жилая площадь 20 м², площадь кухни 9 м²',null],
    ['Квартира 50 м²','Общая площадь 42 м². Общая площадь 43 м²',null],
    ['Квартира 50 м²','Жилая площадь 20 м², площадь кухни 9 м²',50],
    ['Квартира','Студия площадью 25 м²',25],
    ['Квартира 55,1 м² + 6 м² лоджия','',55.1],
    ['Квартира 35 м². Общая площадь 35 м² Площадь кухни 12.4 м² Жилая площадь 12.6 м²','',35],
    ['Квартира 40 м²','40 м² общая площадь 8.8 м² площадь кухни',40],
    ['Квартира 40 м²','40 м² общая площадь 8.8 м² площадь кухни. Общая площадь — 39,8 м²',null],
    ['Квартира 18 м²','Общая площадь 18 м²',18]
  ]) assert.equal(nums(title,description).area_total,area,title+': '+description);
  const conflict=nums('Квартира 10 м²','Площадь — 40,5 м²');
  assert.deepEqual(conflict.area_conflict.title,[10]);
  assert.deepEqual(conflict.area_conflict.description,[40.5]);
  assert.ok(conflict.area_conflict.evidence.includes('Площадь — 40,5 м²'));
  assert.equal(nums('Квартира 18 м²','Общая площадь 18 м²').area_conflict,null);
});
test('reviewed apartment areas and every area conflict appear in the owner CSV and public facts',()=>{
  const registry=JSON.parse(fs.readFileSync(root+'/data/catalog/registry.json','utf8'));
  const feed=JSON.parse(fs.readFileSync(root+'/output/catalog/registry.json','utf8'));
  const csv=fs.readFileSync(root+'/docs/owner/registry-to-verify.csv','utf8');
  for(const [id,area,wrong] of [[112,null,10],[45,null,15],[59,17.8,13],[62,54.4,13],[91,40.5,10],[95,null,15]]) {
    const r=registry.find(r=>r.id==='object_'+id), item=feed.find(r=>r.id==='object_'+id);
    assert.equal(r.area_total,area,r.id);
    assert.equal(item.features.area,area,r.id);
    assert.ok(r.area_conflict,r.id);
    assert.doesNotMatch(item.title,new RegExp('(?:^|[^\\d])'+wrong+' м²'),r.id);
  }
  for(const r of registry.filter(r=>r.area_conflict && r.status!=='placeholder')) {
    // Parse the ID/issue columns without splitting quoted evidence containing semicolons/newlines.
    const start=csv.indexOf('"'+r.id+'";');
    assert.ok(start>=0,r.id);
    const prefix=csv.slice(start).match(/^(?:"(?:[^"]|"")*";){6}"([^"]*)";/s);
    assert.ok(prefix?.[1].includes('area_conflict'),r.id);
  }
});
test("registry is deterministic, retains conflicting evidence and covers feed IDs",()=>{
  const first=buildRegistry(), bytes=fs.readFileSync(root+"/data/catalog/registry.json","utf8");
  assert.deepEqual(buildRegistry(),first);
  assert.equal(fs.readFileSync(root+"/data/catalog/registry.json","utf8"),bytes);
  const r=first.find(x=>x.id==="object_910");
  assert.equal(r.price,null); assert.equal(r.photo_folder_mismatch,true);
  assert.deepEqual(new Set(r.price_conflict.sources.map(x=>x.price)),new Set([5050000,5950000]));
  for(const dir of ["apartments","houses","lands","home"])for(const item of JSON.parse(fs.readFileSync(root+"/output/"+dir+"/new-objects.json","utf8"))){
    if(["apartment","house","land"].includes(item.type)) assert.ok(first.some(x=>x.id===item.id));
  }
});
