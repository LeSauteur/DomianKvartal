import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parsePrice, parseNumbers, parseLocation } from "../_tools/catalog-parser.mjs";
import { buildRegistry, root } from "../_tools/build-registry.mjs";
const nums = (t,d="",type="apartment") => parseNumbers(t,d,type);
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
