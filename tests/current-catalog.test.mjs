import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { active, categories, indexable } from '../src/catalog.mjs';
import { validateListings } from '../src/listings.mjs';
import { decodeHtml, pageContract } from '../src/page-contract.mjs';

const read = file => fs.readFileSync(file, 'utf8');
const json = file => JSON.parse(read(file));
const records = validateListings(json('src/data/listings.json'));
const listed = records.filter(active);
const published = records.filter(item => item.published);

test('every published record has exactly one page with current metadata, facts, media and form context', () => {
  const files = fs.readdirSync('obekt').filter(file => file.endsWith('.html')).sort();
  assert.deepEqual(files, published.map(item => item.url.split('/').at(-1)).sort());
  const titles = new Set(), descriptions = new Set();
  for (const item of published) {
    const page = pageContract(read(item.url.slice(1)));
    assert.deepEqual([page.title, page.description, page.canonical, page.h1, page.robots],
      [item.seo.title, item.seo.description, item.seo.canonical, item.title, active(item) ? item.seo.robots : 'noindex,follow'], item.id);
    assert.ok(!titles.has(page.title) && !descriptions.has(page.description), item.id + ': duplicate metadata');
    titles.add(page.title);
    descriptions.add(page.description);
    assert.doesNotMatch([page.title, page.h1, page.description].join(' '), /(?:object|house|land)_\d+/u);
    assert.deepEqual(page.gallery.map(image => ({src:image.src, alt:image.alt, width:+image.width, height:+image.height})), item.images);
    assert.deepEqual([...page.plansHtml.matchAll(/<img\b[^>]*src="([^"]+)"/g)].map(match => decodeHtml(match[1])), item.floorPlans);
    assert.ok(item.floorPlans.every(plan => !page.gallery.some(photo => photo.src === plan)), item.id);
    assert.equal(decodeHtml(page.descriptionHtml.replaceAll('<br>', '\n').replaceAll('</p><p>', '\n\n').replace(/<[^>]+>/g,'')),
      'Описание' + item.description.replace(/\n\s*\n/g, '\n\n'), item.id);
    const listing = page.structuredData.find(node => node['@type'] === 'RealEstateListing');
    const breadcrumb = page.structuredData.find(node => node['@type'] === 'BreadcrumbList').itemListElement.at(-1);
    assert.deepEqual([breadcrumb.name,breadcrumb.item], [item.title,item.seo.canonical]);
    assert.equal(listing.url,item.seo.canonical);
    assert.equal(listing.description,item.description || item.title);
    assert.equal(listing.mainEntity['@type'], {apartment:'Apartment',house:'House',land:'Place'}[item.type]);
    const facts = item.characteristics;
    for (const [label, value] of [['Площадь',facts.areaM2],['Жилая площадь',facts.livingAreaM2],['Кухня',facts.kitchenAreaM2],['Участок',facts.landAreaSot]]) {
      const actual = page.introHtml.match(new RegExp('<dt>'+label+'</dt><dd>([^<]+)</dd>'))?.[1];
      assert.equal(actual, value === null ? undefined : value+(label==='Участок'?' сот.':' м²'), item.id+': '+label);
    }
    assert.equal(listing.mainEntity.floorSize?.value,item.type === 'land' ? undefined : facts.areaM2 ?? undefined);
    assert.equal(listing.offers?.price, active(item) ? item.price ?? undefined : undefined);
    if (listing.offers) assert.equal(listing.offers.priceCurrency, item.currency);
    assert.equal(listing.offers?.availability, listing.offers && item.availability.confirmation === 'confirmed' ? 'https://schema.org/InStock' : undefined);
    for (const attrs of [page.form, ...page.actions]) {
      for (const [key,value] of Object.entries({id:item.id,type:item.type,title:item.title,url:item.seo.canonical}))
        assert.equal(attrs['data-object-'+key],value,item.id+': '+key);
      if (attrs === page.form || 'data-object-price' in attrs)
        assert.equal(attrs['data-object-price'],item.price === null ? undefined : String(item.price),item.id+': price');
    }
    const price = item.price === null ? 'Цена по запросу' : new Intl.NumberFormat('ru-RU').format(item.price) + ' ₽';
    assert.ok(decodeHtml(page.introHtml).includes('<p class="visibility-price">'+price+'</p>'),item.id);
    assert.ok(page.introHtml.includes('href="tel:+79536091122"'),item.id);
    assert.equal(decodeHtml(page.introHtml.match(/data-listing-status>([^<]+)</)[1]),item.availability.label);
  }
});

test('current feeds publish active listings only, with matching values and no duplicates', () => {
  const byId = new Map(listed.map(item => [item.id,item]));
  for (const section of ['catalog','home',...Object.values(categories)]) {
    const feed = json('output/'+section+'/'+(section==='catalog'?'registry':'new-objects')+'.json');
    assert.equal(new Set(feed.map(item=>item.id)).size,feed.length);
    if (section==='catalog') assert.deepEqual(new Set(feed.map(item=>item.id)),new Set(byId.keys()));
    for (const row of feed) {
      const item = byId.get(row.id);
      assert.ok(item,section+': '+row.id);
      assert.ok(['catalog','home',categories[item.type]].includes(section),row.id);
      assert.deepEqual([row.url,row.type,row.title,row.price,row.priceCurrency,row.fullDescription,row.statusLabel,row.images,row.floor_plans??[]],
        [item.url,item.type,item.title,item.price,item.currency,item.description,item.availability.label,item.images.map(photo=>photo.src),item.floorPlans],row.id);
      assert.deepEqual(row.features, {
        rooms:item.characteristics.rooms, area:item.characteristics.areaM2, livingArea:item.characteristics.livingAreaM2,
        kitchenArea:item.characteristics.kitchenAreaM2, floor:item.characteristics.floor,
        totalFloors:item.characteristics.floors, landArea:item.characteristics.landAreaSot
      },row.id);
      for (const key of ['migration','verifiedBy','source_path','price_conflict','area_conflict']) assert.ok(!(key in row),row.id+': '+key);
    }
  }
  const sitemap = read('sitemap.xml');
  for (const item of records) assert.equal(sitemap.includes('<loc>'+item.seo.canonical+'</loc>'),indexable(item),item.id);
});
