import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { root, readJson, inside } from '../src/paths.mjs';
import { validateListings, publicListing } from '../src/listings.mjs';
import { renderListing } from '../src/render-listing.mjs';
import { pageContract } from '../src/page-contract.mjs';
import { createPreviewServer } from '../scripts/preview.mjs';
import { categories } from '../src/catalog.mjs';

const records=readJson(path.join(root,'tests/fixtures/pilot.json'));
const baseline=readJson(path.join(root,'tests/fixtures/kvartal-release-baseline.json'));

test('pilot covers plans, missing price, conflicting facts and a mismatched media folder',()=>{
  validateListings(records);
  assert.equal(records.length,5);
  assert.ok(records.some(r=>r.floorPlans.length));
  assert.ok(records.some(r=>r.price===null));
  assert.ok(records.some(r=>r.migration.issues.some(i=>i.field==='area_total')));
  assert.ok(records.some(r=>r.migration.issues.some(i=>i.field==='price')));
  assert.ok(records.some(r=>r.migration.photoFolderMismatch));
});

test('every pilot preserves the complete object HTML contract from the committed reference',()=>{
  for(const item of records) assert.deepEqual(pageContract(renderListing(item)),baseline.objects.find(r=>r.id===item.id).page,item.id);
});

test('duplicate IDs and unsupported availability confirmation cannot silently publish',()=>{
  assert.throws(()=>validateListings([...records,structuredClone(records[0])]),/duplicate id/);
  const item=structuredClone(records[0]);item.availability.confirmation='confirmed';item.availability.verifiedAt=null;
  assert.throws(()=>validateListings([item]),/verification date/);
  item.availability.confirmation='unverified';item.price=6.3;
  assert.throws(()=>validateListings([item]),/price/);
});

test('invalid calendar dates and impossible floor combinations are rejected',()=>{
  for (const value of ['2026-02-30','2026-13-01','2026-01-00']) {
    const item=structuredClone(records[0]);
    item.contentUpdatedAt=value;
    assert.throws(()=>validateListings([item]),/invalid date/);
  }
  const item=structuredClone(records[0]);
  item.characteristics.floor=11;
  item.characteristics.floors=10;
  assert.throws(()=>validateListings([item]),/floor exceeds/);
});

test('a new record renders its own URL, metadata, images and form context without reading an old object',()=>{
  const item=structuredClone(records[0]);
  item.id='local-new-apartment';item.url='/obekt/'+item.id+'.html';
  item.title='Пробная квартира <проверка>';
  item.description='Проверка новой записи без извлечения характеристик из текста.';
  item.price=1234567;
  item.seo={title:'Новый объект',description:item.description,canonical:'https://domian-161.ru'+item.url,robots:null};
  item.images=[{src:'/assets/test.webp',alt:'Новое фото',width:1200,height:900}];
  item.floorPlans=[];item.migration={sourceId:null};
  validateListings([item]);
  const html=renderListing(item), contract=pageContract(html);
  assert.equal(contract.canonical,item.seo.canonical);
  assert.equal(contract.h1,item.title);
  assert.equal(contract.form['data-object-id'],item.id);
  assert.equal(contract.form['data-object-title'],item.title);
  assert.equal(contract.form['data-object-price'],'1234567');
  assert.deepEqual(contract.gallery.map(r=>r.src),['/assets/test.webp']);
  assert.doesNotMatch(html,/object_1013|object_1014/);
  assert.ok(html.includes('&lt;проверка&gt;'));
});

test('public data omits migration evidence and internal verification attribution',()=>{
  for(const item of records) {
    const visible=publicListing(item);
    assert.equal(visible.migration,undefined);
    assert.equal(visible.availability.verifiedBy,undefined);
    assert.equal(visible.availability.verifiedAt,undefined);
  }
});

test('output paths cannot escape the new project directory',()=>{
  for(const input of ['../original','..\\original','C:\\KV\\DomianKvartal\\index.html']) assert.throws(()=>inside(path.join(root,'dist'),input),/escapes/);
});

test('local preview denies writes and private files, protects forms and labels pages noindex',async()=>{
  const server=createPreviewServer();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  try {
    const page=await fetch(base+records[0].url);
    assert.equal(page.status,200);
    assert.match(page.headers.get('x-robots-tag'),/noindex/);
    assert.match(page.headers.get('content-security-policy'),/connect-src 'self'; form-action 'none'/);
    assert.match(await page.text(),/<head><script src="\/__local\/guard.js"><\/script>/);
    for(const route of ['/package.json','/reference/baseline.json','/__reference/data/catalog/registry.json','/.git/config','/%2e%2e%5cpackage.json']) assert.equal((await fetch(base+route)).status,404,route);
    const post=await fetch(base+'/api/submit',{method:'POST',body:'test'});
    assert.equal(post.status,405);
    assert.equal(await (await fetch(base+'/robots.txt')).text(), 'User-agent: *\nDisallow: /\n');
    const review = await fetch(base+'/__review/');
    assert.equal(review.status,200);
    assert.match(review.headers.get('x-robots-tag'),/noindex/);
    assert.ok((await review.text()).includes(records[0].url));
    assert.equal((await fetch(base+'/__reference'+records[0].url)).status,404);
    assert.equal((await fetch(base+'/assets/css/main.css')).status,200);
    assert.equal((await fetch(base+'/obekt/unknown-for-qa.html')).status,404);
  } finally {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

test('isolated build and CLI add, retire and reactivate each listing type',()=>{
  const parent=path.join(root,'output');
  fs.mkdirSync(parent,{recursive:true});
  const folder=fs.mkdtempSync(path.join(parent,'listing-test-'));
  const files=[
    'scripts/build.mjs','scripts/listing.mjs',
    'src/paths.mjs','src/page-contract.mjs','src/site-theme.mjs','src/listings.mjs',
    'src/render-listing.mjs','src/catalog.mjs','src/media.mjs',
    'src/templates/layout.html','src/templates/lead-form.html',
    'public/index.html','public/apartments.html','public/houses.html','public/lands.html','public/robots.txt',
    'public/seo/kvartiry-loc-aksay.html','public/seo/doma-loc-aksay.html','public/seo/uchastki-loc-aksay.html'
  ];
  const group=readJson(path.join(root,'src/data/site.json'));
  const put=(file,data)=>{
    const target=inside(folder,file);
    fs.mkdirSync(path.dirname(target),{recursive:true});
    fs.writeFileSync(target,data);
  };
  const read=file=>fs.readFileSync(inside(folder,'dist/'+file),'utf8');
  const run=(script,...args)=>execFileSync(process.execPath,[
    '--permission','--allow-fs-read='+folder,'--allow-fs-write='+folder,path.join(folder,'scripts',script),...args
  ],{cwd:folder,stdio:'pipe'});
  const cli=(...args)=>run('listing.mjs',...args);
  const build=()=>run('build.mjs');
  const image=records[0].images[0];
  const imageSource=decodeURIComponent(new URL(image.src,group.origin).pathname);
  const cases=[
    {type:'apartment', title:'Лофт в Аксае', selection:'kvartiry-loc-aksay'},
    {type:'house', title:'Дом на углу', selection:'doma-loc-aksay'},
    {type:'land', title:'Участок у леса', selection:'uchastki-loc-aksay'}
  ].map(item=>({...item,id:'qa-'+item.type,category:categories[item.type]}));
  try {
    for(const file of files) put(file,fs.readFileSync(inside(root,file)));
    put('public'+imageSource,fs.readFileSync(inside(root,'public'+imageSource)));
    put('src/data/listings.json','[]');
    put('src/data/site.json',JSON.stringify({...group,recent:{home:[],apartments:[],houses:[],lands:[]},complexPages:[],lastmod:{[group.origin+'/']:'2026-11-16'}}));
    for (const {id,type} of cases) {
      cli('init',id,type);
      cli('save','output/drafts/'+id+'.json');
      assert.throws(()=>cli('status',id,'active'),/Fill title/);
    }
    build();
    for (const {id,title} of cases) {
      assert.equal(fs.existsSync(inside(folder,'dist/obekt/'+id+'.html')),false);
      assert.ok(!read('output/catalog/registry.json').includes(id));
      const draft='output/drafts/'+id+'.json';
      const data=readJson(inside(folder,draft));
      put(draft,JSON.stringify({...data,title,description:'Проверка новой записи.',images:[image],price:6500000,
        location:{...data.location,city:'Аксай'},seo:{...data.seo,title:title+' | Квартал',description:'Тестовое описание'}}));
      cli('save',draft,'--replace');
      cli('status',id,'active');
    }
    build();
    for (const {id,title,type,category,selection} of cases) {
      const url='/obekt/'+id+'.html';
      const contract=pageContract(read(url.slice(1)));
      assert.equal(contract.form['data-object-id'],id);
      assert.equal(contract.form['data-object-type'],type);
      assert.equal(contract.h1,title);
      for (const file of [category+'.html','seo/'+selection+'.html','output/catalog/registry.json','output/home/new-objects.json','output/'+category+'/new-objects.json','sitemap.xml']) {
        assert.ok(read(file).includes(url),file+' missing '+id);
      }
      cli('status',id,'sold');
    }
    build();
    for (const {id,category,selection} of cases) {
      const contract=pageContract(read('obekt/'+id+'.html'));
      assert.equal(contract.robots,'noindex,follow');
      assert.ok(!contract.structuredData.some(node=>node.offers),'Sold object must not retain an active offer');
      for (const file of [category+'.html','seo/'+selection+'.html','output/catalog/registry.json','output/home/new-objects.json','output/'+category+'/new-objects.json','sitemap.xml']) {
        assert.ok(!read(file).includes(id),file+' still includes '+id);
      }
      cli('status',id,'active');
    }
    build();
    for (const {id} of cases) {
      assert.ok(read('output/catalog/registry.json').includes(id));
      assert.equal(pageContract(read('obekt/'+id+'.html')).robots,null);
      assert.throws(()=>cli('save','output/drafts/'+id+'.json'),/ID already exists/);
    }
  } finally {
    if (path.dirname(folder)!==parent || !path.basename(folder).startsWith('listing-test-')) throw new Error('Unsafe test folder');
    fs.rmSync(folder,{recursive:true,force:true});
  }
});
