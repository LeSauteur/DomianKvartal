import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { root } from './build-registry.mjs';
import { publicHtmlFiles, readPage, noindex, canonical, urlFor } from './site-pages.mjs';

export function indexableFiles() {
  return publicHtmlFiles().filter(file => {
    const html = readPage(file);
    return !noindex(html) && canonical(html) === urlFor(file);
  });
}
let committedDates;
export function lastmod(file) {
  if (!committedDates) {
    committedDates = new Map();
    // Read history once rather than launching git for every property page.
    const history = execFileSync('git', ['-c','core.quotePath=false','log','--format=DATE:%cs','--name-only'], {cwd:root, encoding:'utf8', maxBuffer:32*1024*1024});
    let date;
    for (const line of history.split(/\r?\n/)) {
      if (/^DATE:\d{4}-\d{2}-\d{2}$/.test(line)) date = line.slice(5);
      else if (line && date && !committedDates.has(line)) committedDates.set(line,date);
    }
  }
  const date = committedDates.get(file) || '';
  // A new file has no committed modification date yet. Omit rather than invent it.
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}
export function buildSitemap() {
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + indexableFiles().map(file => {
      const date = lastmod(file);
      return '  <url><loc>' + urlFor(file) + '</loc>' + (date ? '<lastmod>' + date + '</lastmod>' : '') + '</url>';
    }).join('\n') + '\n</urlset>\n';
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = buildSitemap();
  if (process.argv.includes('--check')) {
    if (fs.readFileSync(root + '/sitemap.xml', 'utf8').replaceAll('\r\n','\n') !== output) {
      console.error('Sitemap differs from eligible pages and git modification dates. Run node _tools/build-sitemap.mjs');
      process.exitCode = 1;
    } else console.log('Sitemap is current.');
  } else {
    fs.writeFileSync(root + '/sitemap.xml', output);
    console.log('Sitemap generated: ' + indexableFiles().length + ' URLs.');
  }
}
