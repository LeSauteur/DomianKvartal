import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from 'node:child_process';
import { zhkPage, zhkFile, apartmentsFor } from "../_tools/build-zhk-pages.mjs";
const records=JSON.parse(fs.readFileSync("data/zhk/aksay.json","utf8"));
const mainContent=html=>html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/iu)?.[1]||'';
const words=html=>mainContent(html).replace(/<(?:script|style)\b[\s\S]*?<\/(?:script|style)>/giu,'').replace(/<[^>]*>/g,' ').trim().split(/\s+/u).filter(Boolean).length;
test('each Aksay ZHK retains main content volume, substantive blocks, title and any FAQ schema',()=>{
  for(const record of records.filter(r=>r.publish)) {
    const file=zhkFile(record), before=execFileSync('git',['show','origin/main:'+file],{encoding:'utf8'}), after=fs.readFileSync(file,'utf8');
    assert.ok(words(after)>=words(before),`${file}: ${words(before)} -> ${words(after)}`);
    for(const heading of [...mainContent(before).matchAll(/<h[23]\b[^>]*>([\s\S]*?)<\/h[23]>/giu)]) assert.ok(after.includes(heading[1]),file+': '+heading[1]);
    const title=before.match(/<title>(.*?)<\/title>/u)[1];
    if(/Акса[йея]/iu.test(title)) assert.equal(after.match(/<title>(.*?)<\/title>/u)[1],title);
    assert.ok(after.indexOf('preserved-zhk-content:start')>after.indexOf(record.source?'Факты о ЖК':'Информация о проекте'));
    const faq=JSON.parse(fs.readFileSync('data/zhk/main-content.json','utf8')).pages[file].faq;
    for(const node of faq) assert.ok(after.includes(JSON.stringify(node).replaceAll('<','\\u003c')),file);
    const registry=JSON.parse(fs.readFileSync('data/catalog/registry.json','utf8'));
    assert.equal(zhkPage(record,registry),zhkPage(record,registry),'deterministic legacy preservation');
  }
});
test("five existing ZHK pages share factual layout and omit every unknown field",()=>{
  for(const record of records.filter(r=>r.publish)) {
    const html=fs.readFileSync(zhkFile(record),"utf8");
    assert.match(html,/Мы агентство недвижимости, а не застройщик/);
    assert.match(html,/Чем поможем/);
    assert.match(html,new RegExp('data-source-cta="zhk_'+record.slug+'"'));
    assert.doesNotMatch(html,/UNK|city_suggested|лучшие|самые выгодные|гарантируем/iu);
    if(record.source) {assert.ok(html.includes(record.source));assert.match(html,/07\.10\.2026/);}
    else assert.doesNotMatch(html,/Застройщик<\/dt>|Сроки и отдельные корпуса<\/dt>/);
  }
  const flora=fs.readFileSync("seo/zhk-flora-aksay.html","utf8");
  assert.match(flora,/литеры 4\.1, 4\.2/);
  const gems=fs.readFileSync("seo/zhk-samotsvety-aksay.html","utf8");
  assert.match(gems,/IV кв\. 2021 \(7а\), IV кв\. 2022 \(10\/6\)/);
});
test("unconfirmed developments remain data templates without public HTML",()=>{
  for(const r of records.filter(r=>!r.publish)) {
    assert.equal(fs.existsSync(zhkFile(r)),false,r.slug);
    assert.ok(zhkPage(r,[]).includes(r.name));
    assert.ok(!fs.readFileSync("sitemap.xml","utf8").includes(zhkFile(r)));
  }
  assert.equal(records.filter(r=>!r.publish).length,3);
});
test("project matching uses explicit ЖК name and excludes incompatible geography",()=>{
  const record=records.find(r=>r.slug==="atmosfera");
  const r={id:"object_1",type:"apartment",status:null,city:"Аксай",title_raw:"Квартира",description_raw:"Уютная атмосфера"};
  assert.equal(apartmentsFor(record,[r]).length,0);
  assert.equal(apartmentsFor(record,[{...r,description_raw:'ЖК «Атмосфера»'}]).length,1);
  assert.equal(apartmentsFor(record,[{...r,city:"Ростов-на-Дону",description_raw:'ЖК «Атмосфера»'}]).length,0);
});
