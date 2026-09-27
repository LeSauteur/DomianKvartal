import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
const root=path.resolve(import.meta.dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
for(const [file,leadType] of [['sell-apartment.html','sell'],['property-valuation.html','valuation']]) test(`${file}: metadata, local lead form and existing internal destinations`,()=>{
 const html=read(file);
 assert.equal([...html.matchAll(/<h1\b/gi)].length,1);
 assert.match(html,/<title>[^<]+<\/title>/);
 assert.match(html,/<meta name="description" content="[^"]+"/);
 assert.ok(html.includes(`rel="canonical" href="https://domian-161.ru/${file}"`));
 assert.ok(read('sitemap.xml').includes(`https://domian-161.ru/${file}`));
 assert.match(html,new RegExp(`href="#lead-form-section" data-lead-type="${leadType}" data-source-cta="[^"]+"`));
 assert.doesNotMatch(html,/href="\/#lead-form-section"/);
 assert.match(html,new RegExp(`<form[^>]+data-lead-form[^>]+data-lead-type="${leadType}"`));
 assert.match(html,new RegExp(`name="service" value="${leadType}"`));
 for(const field of ['name','phone','privacy_consent','botcheck'])assert.match(html,new RegExp(`name="${field}"`));
 assert.match(html,/data-form-status/);
 assert.match(html,/assets\/js\/form-handler\.js/);
 for(const match of html.matchAll(/(?:href|src)="([^"]+)"/g)){
  if(/^(?:https?:|tel:|mailto:|data:)/.test(match[1]))continue;
  const u=new URL(match[1],`https://domian-161.ru/${file}`);
  const dest=decodeURIComponent(u.pathname).replace(/^\//,'')+(u.pathname.endsWith('/')?'index.html':'');
  assert.ok(fs.existsSync(path.join(root,dest)),`${file}: missing ${dest}`);
  if(u.hash&&dest.endsWith('.html'))assert.ok(read(dest).includes(`id="${u.hash.slice(1)}"`),`${file}: missing ${dest}${u.hash}`);
 }
});
test('linked local selections contain only valid specific catalog IDs',()=>{
 const configs=[['kvartiry-loc-aksay.html','apartments','objects/index.json'],['doma-loc-rossiyskiy.html','houses','output/houses/index.json'],['uchastki-loc-aksay.html','lands','lands/index.json']];
 for(const [file,type,index] of configs){
  const ids=JSON.parse(read(index)).map(item=>typeof item==='string'?item:item.id);
  const html=read('seo/'+file);
  assert.ok(read(type+'.html').includes(`href="seo/${file}"`));
  const links=[...html.matchAll(/href="\/(?:apartments|houses|lands)\.html\?object=([^"]+)"/g)];
  assert.equal(links.length,2);
  for(const match of links){assert.ok(ids.includes(match[1]),`${file}: unknown ${match[1]}`);assert.ok(html.includes(`data-object-id="${match[1]}"`));}
 }
});
test('confirmed public prototypes are excluded from index and sitemap',()=>{
 for(const file of ['company-rebuild/index.html','company-rebuild/main-no-company.html','ui-blocks/index.html','ui-blocks/blocks.html','ui-rebuild/index.html','source/apartments.html']){
  assert.match(read(file),/<meta name="robots" content="noindex, follow">/);
  assert.ok(!read('sitemap.xml').includes(`https://domian-161.ru/${file}`));
 }
});
