import fs from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";
import { objectPage, eligible } from "../_tools/build-object-pages.mjs";
const root = process.cwd(), registry = JSON.parse(fs.readFileSync("data/catalog/registry.json","utf8"));
test("every property has a unique self-canonical page with only supported facts",()=>{
  const titles = new Set(), canonicals = new Set();
  for(const r of registry) {
    const html=fs.readFileSync(root+"/obekt/"+r.id+".html","utf8");
    const title=html.match(/<title>(.*?)<\/title>/)[1], canonical=html.match(/rel="canonical" href="([^"]+)"/)[1];
    assert.ok(!titles.has(title),r.id); titles.add(title);
    assert.ok(!canonicals.has(canonical),r.id); canonicals.add(canonical);
    assert.equal(canonical,"https://domian-161.ru/obekt/"+r.id+".html");
    assert.equal((html.match(/<h1\b/g)||[]).length,1);
    const visible=html.replace(/<script\b[\s\S]*?<\/script>/g,"").replace(/<[^>]*>/g," ");
    assert.doesNotMatch(visible,/\b(?:null|undefined|NaN)\b/);
    const intro=html.match(/<section class="visibility-intro container">([\s\S]*?)<\/section>/)[1];
    if(r.city===null) assert.doesNotMatch(intro,/Город<\/dt>|Аксай/);
    if(r.city!=="Аксай"&&r.city!=="Аксайский район") assert.doesNotMatch(intro,/Аксай/);
    if(r.price_conflict) {assert.match(intro,/Цена по запросу/);assert.doesNotMatch(html,/"@type":"(?:Product|Offer)"/);}
    else if(r.price!==null) assert.match(html,/"@type":"Offer"/);
    for(const match of html.matchAll(/type="application\/ld\+json">([\s\S]*?)<\/script>/g)) assert.doesNotThrow(()=>JSON.parse(match[1]));
    assert.doesNotMatch(intro,/лучши|гаранти|самые низкие/iu);
  }
});
test("unknown values stay absent and non-active or imageless properties are excluded",()=>{
  const empty={...registry[0],city:null,settlement:null,district:null,address:null,rooms:null,floor:null,floors:null,area_total:null,lot_area_sotok:null,price:null,price_conflict:null,images:[]};
  assert.equal(eligible(empty),false);
  const html=objectPage(empty);
  assert.doesNotMatch(html,/0 м²|уточняйте этаж/);
  assert.match(html,/noindex,follow/);
  assert.equal(eligible({...registry[0],status:"sold"}),false);
});
test("category source exposes every registry property without JavaScript",()=>{
  for(const [type,file] of [["apartment","apartments.html"],["house","houses.html"],["land","lands.html"]]){
    const html=fs.readFileSync(file,"utf8");
    for(const r of registry.filter(x=>x.type===type)) assert.ok(html.includes('href="/obekt/'+r.id+'.html"'),r.id);
  }
});
