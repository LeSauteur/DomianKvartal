import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { root, dist, origin, inside, readJson } from '../src/paths.mjs';
import { createPreviewServer } from './preview.mjs';
import { active, categories, indexable } from '../src/catalog.mjs';
import { siteThemeLink, usesSiteStyles } from '../src/site-theme.mjs';

function walk(folder, prefix = '') {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
    const name = prefix + entry.name;
    return entry.isDirectory() ? walk(path.join(folder, entry.name), name + '/') : [name];
  });
}

const files = walk(dist);
assert.ok(!files.some(file => /^__(?:review|reference|local)\//.test(file)), 'Preview resources in the static build');
const pages = files.filter(file => file.endsWith('.html'));
const sources = new Map(pages.map(file => [file, fs.readFileSync(inside(dist, file), 'utf8')
  .replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<!--[\s\S]*?-->/g, '')]));
let references = 0;
let themedPages = 0;
const errors = [];
for (const [file, html] of sources) {
  const themed = !/^(?:google|yandex)\w+\.html$/i.test(file);
  assert.equal(usesSiteStyles(html), themed, file + ': shared styles');
  assert.equal(html.split(siteThemeLink).length - 1, Number(themed), file + ': wine theme');
  themedPages += Number(themed);
  for (const match of html.matchAll(/\b(?:href|src|poster)=["']([^"']+)["']/gi)) {
    const url = new URL(match[1].replaceAll('&amp;', '&'), origin + '/' + file);
    if (url.origin !== origin) continue;
    references++;
    const relative = decodeURIComponent(url.pathname.slice(1)) + (url.pathname.endsWith('/') ? 'index.html' : '');
    if (!fs.existsSync(inside(dist, relative))) errors.push(`${file}: missing ${url.pathname}`);
    const fragment = decodeURIComponent(url.hash.slice(1));
    const destination = sources.get(relative);
    if (fragment && !fragment.includes('=') && destination &&
        !destination.includes(`id="${fragment}"`) && !destination.includes(`id='${fragment}'`)) {
      errors.push(`${file}: missing anchor ${url.pathname}#${fragment}`);
    }
  }
}
assert.deepEqual(errors, [], 'Broken internal references');
const listings = readJson(path.join(root, 'src/data/listings.json'));
const catalog = readJson(path.join(dist, 'output/catalog/registry.json'));
assert.deepEqual(new Set(catalog.map(item => item.id)), new Set(listings.filter(active).map(item => item.id)));
const robots = fs.readFileSync(path.join(dist, 'robots.txt'), 'utf8');
assert.equal(robots, fs.readFileSync(path.join(root, 'public/robots.txt'), 'utf8'), 'Static robots.txt differs from the original');
assert.match(robots, /^Allow:\s*\/\s*$/im);
assert.match(robots, /^Sitemap:\s*https:\/\/domian-161\.ru\/sitemap\.xml\s*$/im);
assert.doesNotMatch(robots, /^Disallow:\s*\/\s*$/im, 'Static site blocks all crawling');

for (const [type, category] of Object.entries(categories)) {
  const file = category + '.html';
  const html = fs.readFileSync(inside(dist, file), 'utf8');
  const list = html.match(/<!-- static-object-links:start -->\s*<section\b[^>]*>\s*<h2>Все объекты раздела<\/h2>\s*<p>[^<]+<\/p>\s*<ul>([\s\S]*?)<\/ul>\s*<\/section>\s*<!-- static-object-links:end -->/u)?.[1];
  assert.notEqual(list, undefined, file + ': missing visible directory with heading and introduction');
  const links = [...list.matchAll(/<a\b[^>]*\bhref="([^"]+)"[^>]*>/g)].map(match => match[1]);
  assert.equal(links.length, new Set(links).size, file + ': duplicate directory links');
  assert.deepEqual(new Set(links), new Set(listings.filter(item => active(item) && item.type === type).map(item => item.url)), file + ': wrong directory links');
}

const sitemap = fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
assert.equal(urls.length, new Set(urls).size, 'Duplicate sitemap URLs');
for (const item of listings) {
  assert.equal(urls.includes(item.seo.canonical), Boolean(item.published && indexable(item)), `${item.id}: sitemap visibility`);
}

const server = createPreviewServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
let cursor = 0;
try {
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (cursor < pages.length) {
      const page = pages[cursor++];
      const response = await fetch(`${base}/${page}`, { method: 'HEAD' });
      assert.equal(response.status, 200, page);
      assert.match(response.headers.get('x-robots-tag'), /noindex/, page);
    }
  }));
} finally {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
const report = { pages: pages.length, themedPages, internalReferences: references, sitemapUrls: urls.length, catalogObjects: catalog.length, errors };
fs.mkdirSync(path.join(root, 'output'), { recursive: true });
fs.writeFileSync(path.join(root, 'output/site-validation.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`Проверено ${pages.length} страниц, ${references} внутренних ссылок и ресурсов, ${urls.length} URL sitemap.`);
