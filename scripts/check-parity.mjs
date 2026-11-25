import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { root, dist, readJson, inside } from '../src/paths.mjs';
import { pageContract, sha256 } from '../src/page-contract.mjs';
import { objectGalleryAssets, siteThemeLink } from '../src/site-theme.mjs';

const baseline = readJson(path.join(root,'tests/fixtures/kvartal-release-baseline.json'));
const catalogue = readJson(path.join(dist,'output/catalog/registry.json'));
const sitemap=fs.readFileSync(path.join(dist,'sitemap.xml'),'utf8');
const urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>match[1]);
assert.deepEqual(new Set(urls),new Set(baseline.sitemapUrls),'Established sitemap routes changed');
assert.equal(new Set(urls).size,urls.length,'Duplicate sitemap URL');
assert.equal(catalogue.length,baseline.objects.length);
assert.equal(new Set(catalogue.map(item=>item.id)).size,catalogue.length);
const byId=new Map(catalogue.map(item=>[item.id,item]));
for (const object of baseline.objects) {
  const html=fs.readFileSync(inside(dist,object.route),'utf8');
  assert.ok(html.includes(objectGalleryAssets), `${object.id}: photo gallery assets are missing`);
  assert.ok(html.includes(siteThemeLink), `${object.id}: site theme is missing`);
  const actual=pageContract(html.replace(objectGalleryAssets,'').replace(siteThemeLink,''));
  const fields=Object.keys(actual).filter(field=>JSON.stringify(actual[field])!==JSON.stringify(object.page[field]));
  assert.deepEqual(fields,[],`${object.id}: generated HTML differs`);
  const item=byId.get(object.id);
  for(const field of ['url','price','title','fullDescription','city','district','settlement','address','features','statusLabel']) {
    assert.deepEqual(item[field],object.publicFeed[field],`${object.id}: catalog ${field}`);
  }
}
const mirror=readJson(path.join(root,'src/data/media-mirror.json'));
for (const item of mirror.files) assert.equal(sha256(fs.readFileSync(inside(dist,decodeURIComponent(item.local.slice(1))))),item.sha256,item.local);
console.log(`Проверено совпадение ${baseline.objects.length} перегенерированных страниц, характеристик в каталоге, ${urls.length} URL и ${mirror.files.length} локальных копий фото.`);
