import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { root } from '../_tools/build-registry.mjs';
import { indexableFiles, lastmod, buildSitemap } from '../_tools/build-sitemap.mjs';
import { fileForUrl, readPage, canonical, noindex, urlFor, publicHtmlFiles } from '../_tools/site-pages.mjs';

test('sitemap contains exactly eligible self-canonical pages, no noindex pages', () => {
  const xml = fs.readFileSync(root + '/sitemap.xml','utf8');
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
  assert.deepEqual(urls, indexableFiles().map(urlFor));
  assert.equal(new Set(urls).size, urls.length);
  assert.ok(!urls.includes(urlFor('404.html')));
  for (const url of urls) {
    const html = readPage(fileForUrl(url));
    assert.equal(noindex(html), false, url);
    assert.equal(canonical(html), url);
  }
});
test('generated lastmod comes from file git history and generation is deterministic', () => {
  assert.equal(lastmod('index.html'), execFileSync('git',['log','-1','--format=%cs','--','index.html'],{cwd:root,encoding:'utf8'}).trim());
  assert.equal(lastmod('never-committed-page.html'), null);
  assert.equal(buildSitemap(), buildSitemap());
});
test('404 provides shared navigation, phone and noindex without a form', () => {
  const html = readPage('404.html');
  assert.equal(noindex(html), true);
  assert.match(html, /unified-public-header:start/);
  assert.match(html, /<footer\b/);
  for (const file of ['apartments','houses','lands','newbuilds']) assert.ok(html.includes('/'+file+'.html'));
  assert.match(html, /href="tel:\+79536091122"/);
  assert.doesNotMatch(html, /data-lead-form/);
});
test('public HTML has no inline counter or tracking pixel bypassing main.js', () => {
  for (const file of publicHtmlFiles()) {
    assert.doesNotMatch(readPage(file), /mc\.yandex\.ru|\bym\s*\([^)]*["']init["']/i, file);
  }
  const html = readPage('index.html');
  assert.doesNotMatch(html, /<strong>35<\/strong><span>оценок/);
  assert.match(html, /Отзывы о нас в Яндекс Картах/);
});
