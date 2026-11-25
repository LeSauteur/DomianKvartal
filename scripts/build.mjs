import fs from 'node:fs';
import path from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { root, dist, origin, readJson, inside } from '../src/paths.mjs';
import { escapeHtml as esc, lf } from '../src/page-contract.mjs';
import { validateListings } from '../src/listings.mjs';
import { renderListing } from '../src/render-listing.mjs';
import { active, catalogHtml, catalogItem, generatedFeeds, indexable } from '../src/catalog.mjs';
import { localMediaPath } from '../src/media.mjs';
import { applySiteTheme, objectGalleryAssets } from '../src/site-theme.mjs';

const config = readJson(path.join(root,'src/data/site.json'));
const listings = validateListings(readJson(path.join(root,'src/data/listings.json')));
const publicDir = path.join(root,'public');
const published = listings.filter(item=>item.published);
const activeListings = listings.filter(active);
const outputDir = path.join(root,'output');
for (const folder of [publicDir,dist,outputDir]) {
  if (fs.existsSync(folder) && fs.realpathSync.native(folder).toLowerCase() !== folder.toLowerCase()) {
    throw new Error(`Unexpected directory link: ${folder}`);
  }
}
for (const item of listings) {
  for (const file of item.complexPages || []) if (!config.complexPages.includes(file)) throw new Error(`${item.id}: unknown complex page ${file}`);
  if (!item.published) continue;
  for (const source of [...item.images.map(image=>image.src), ...item.floorPlans]) {
    const local = localMediaPath(source);
    if (!local || !fs.existsSync(inside(publicDir,decodeURIComponent(local.slice(1))))) {
      throw new Error(`${item.id}: missing local media ${source}`);
    }
  }
}

function walk(folder,prefix='') {
  return fs.readdirSync(folder,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(entry=>{
    const relative=prefix+entry.name;
    if (entry.isDirectory()) return walk(path.join(folder,entry.name),relative+'/');
    if (entry.isFile()) return [relative];
    throw new Error(`Unsupported input file: ${relative}`);
  });
}
const staticPaths = walk(publicDir);
const files = generatedFeeds(listings,config.recent);
for (const item of published) {
  files.set(item.url.slice(1),renderListing(item).replace('</head>',objectGalleryAssets+'</head>'));
}
files.set('assets/data/listings-v2.json',JSON.stringify(activeListings.map(catalogItem),null,2)+'\n');

const routes = new Set(staticPaths);
for (const file of files.keys()) {
  if (routes.has(file)) throw new Error(`Generated output would replace a public input: ${file}`);
  routes.add(file);
}
const eligible = new Map();
for (const [url,date] of Object.entries(config.lastmod)) {
  const pathname=new URL(url).pathname;
  const file=pathname.endsWith('/')?pathname.slice(1)+'index.html':pathname.slice(1);
  if (!routes.has(file)) {
    if (pathname.startsWith('/obekt/')) continue;
    throw new Error(`Missing established route: ${pathname}`);
  }
  if (!pathname.startsWith('/obekt/')) eligible.set(url,date);
}
for (const item of published.filter(indexable)) eligible.set(item.seo.canonical,item.contentUpdatedAt||config.lastmod[item.seo.canonical]||null);
const ordered = [...new Set([...Object.keys(config.lastmod), ...eligible.keys()])].filter(url=>eligible.has(url));
files.set('sitemap.xml','<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+ordered.map(url=>{
  const date=eligible.get(url);
  return `  <url><loc>${esc(url)}</loc>${date?`<lastmod>${esc(date)}</lastmod>`:''}</url>`;
}).join('\n')+'\n</urlset>\n');

fs.mkdirSync(outputDir,{recursive:true});
const stage = fs.mkdtempSync(path.join(root,'dist-next-'));
const previous = stage+'-previous';
let swapped=false;
async function rename(from,to) {
  for (let attempt=0;;attempt++) {
    try {fs.renameSync(from,to);return;}
    catch (error) {
      if (!['EPERM','EBUSY','EACCES'].includes(error.code)||attempt>=6) throw error;
      await setTimeout(100*(attempt+1));
    }
  }
}
function write(file,bytes) {
  const target=inside(stage,file);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  const output = file.endsWith('.html') ? applySiteTheme(bytes) : bytes;
  fs.writeFileSync(target,output);
}
function updateExistingBuild() {
  // Windows can lock a served directory even though its individual files are writable.
  // The staged tree is complete before any file in the existing output is touched.
  fs.mkdirSync(dist,{recursive:true});
  const nextPaths=new Set(walk(stage));
  for (const file of nextPaths) {
    const source=inside(stage,file), target=inside(dist,file);
    if (fs.existsSync(target) && fs.readFileSync(source).equals(fs.readFileSync(target))) continue;
    fs.mkdirSync(path.dirname(target),{recursive:true});
    fs.copyFileSync(source,target);
  }
  for (const file of walk(dist)) if (!nextPaths.has(file)) fs.unlinkSync(inside(dist,file));
}
try {
  for (const file of staticPaths) {
    const bytes=fs.readFileSync(inside(publicDir,file));
    if (file.endsWith('.html')) write(file,catalogHtml(file,lf(bytes.toString('utf8')),activeListings,config.complexPages));
    else write(file,bytes);
  }
  for (const [file,contents] of files) write(file,contents);
  if (fs.existsSync(dist)) {
    try {await rename(dist,previous);}
    catch (error) {
      if (!['EPERM','EBUSY','EACCES'].includes(error.code)) throw error;
      updateExistingBuild();
      swapped=true;
    }
  }
  if (!swapped) {
    try {await rename(stage,dist);swapped=true;}
    catch (error) {
      if (!fs.existsSync(previous) && ['EPERM','EBUSY','EACCES'].includes(error.code)) {
        updateExistingBuild();
        swapped=true;
      } else {
        if (fs.existsSync(previous)) await rename(previous,dist);
        throw error;
      }
    }
  }
} finally {
  for (const folder of swapped?[stage,previous]:[stage]) {
    if (path.dirname(folder)!==root || !path.basename(folder).startsWith('dist-next-')) throw new Error('Unsafe staging directory');
    fs.rmSync(folder,{recursive:true,force:true});
  }
}
const report={mode:'static',origin,published:published.length,active:activeListings.length,drafts:listings.length-published.length,sitemapUrls:ordered.length,files:staticPaths.length+files.size};
fs.writeFileSync(path.join(outputDir,'build-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(`Собрано ${published.length} страниц объектов, ${ordered.length} URL в sitemap, ${report.files} файлов.`);
