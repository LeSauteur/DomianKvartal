import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { root, dist, inside, readJson } from '../src/paths.mjs';
import { localMediaPath } from '../src/media.mjs';
import { escapeHtml as esc } from '../src/page-contract.mjs';

const guard = `window.DOMIAN_ANALYTICS_DISABLED=true;document.addEventListener('submit',function(event){event.preventDefault();event.stopImmediatePropagation();var form=event.target;var status=form.querySelector('[data-form-status]');if(!status){status=document.createElement('p');status.setAttribute('role','status');form.appendChild(status);}status.hidden=false;status.textContent='Локальный просмотр: заявка не отправлена.';},true);`;
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2','.woff':'font/woff','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8','.gif':'image/gif','.avif':'image/avif','.mp4':'video/mp4'};
const imageUrl = /https:\/\/[^\s"'<>]+?\.(?:webp|avif|jpe?g|png|gif|svg|ico)(?=[\s"'<>),]|$)/gi;

function previewMedia(source) {
  const local=localMediaPath(source);
  if (!local || !fs.existsSync(inside(dist,decodeURIComponent(local.slice(1))))) return source;
  return local;
}

function previewHtml(html) {
  return html.replace(/<head(?:\s[^>]*)?>/i,match=>match+'<script src="/__local/guard.js"></script>')
    .replace(/<script\b[^>]*src=["']https?:\/\/[^"']+["'][^>]*>\s*<\/script>/gi,'')
    .replace(/\b(?:src|srcset|href|poster)=["'][^"']*["']/gi, attribute=>attribute.replace(imageUrl,previewMedia));
}

function reviewPage() {
  const published = readJson(path.join(root,'src/data/listings.json')).filter(item=>item.published);
  const pilotIds = ['object_1013','house_914','land_01','object_904','house_915'];
  const pilot = pilotIds.map(id=>published.find(item=>item.id===id)).filter(Boolean);
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Локальная проверка Квартала</title><style>body{max-width:900px;margin:48px auto;padding:0 24px;font:18px/1.6 system-ui;color:#202526}a{color:#17704a}li{margin:16px 0}</style></head><body><h1>Локальный Квартал</h1><p><a href="/">Открыть сайт</a></p><p>Из записей собраны ${published.length} страниц. Контрольные страницы новой сборки.</p><ul>${pilot.map(item=>`<li><a href="${esc(item.url)}">${esc(item.title)}</a></li>`).join('')}</ul></body></html>`;
}

export function createPreviewServer() {
  return http.createServer((req,res) => {
    res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    // Even if a legacy form handler runs, it cannot send anything externally.
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self'; form-action 'none'; frame-src 'none'; object-src 'none'; base-uri 'self'");
    if (!['GET','HEAD'].includes(req.method)) {res.writeHead(405,{'Allow':'GET, HEAD'});res.end('Local preview is read-only');return;}
    let route;
    let parsed;
    try {parsed=new URL(req.url,'http://127.0.0.1');route=decodeURIComponent(parsed.pathname);} catch {res.writeHead(400);res.end('Invalid URL');return;}
    const category={'/apartments.html':'object','/houses.html':'house','/lands.html':'land'}[route];
    const oldId=parsed.searchParams.get('object');
    if (category && oldId && new RegExp(`^${category}_\\d+$`).test(oldId)) {
      const destination=`obekt/${oldId}.html`;
      if (fs.existsSync(inside(dist,destination))) {res.writeHead(302,{Location:'/'+destination});res.end();return;}
    }
    if (route==='/robots.txt') {res.writeHead(200,{'Content-Type':'text/plain'});res.end('User-agent: *\nDisallow: /\n');return;}
    if (['/__review','/__review/','/__review/index.html'].includes(route)) {
      res.writeHead(200,{'Content-Type':mime['.html']});
      res.end(req.method==='HEAD' ? undefined : previewHtml(reviewPage()));
      return;
    }
    if (route==='/__local/guard.js') {res.writeHead(200,{'Content-Type':mime['.js']});res.end(guard);return;}
    if (route.startsWith('/__reference/')) {res.writeHead(404);res.end('Page is not available');return;}
    if (route.endsWith('/')) route+='index.html';
    route=route.replace(/^\/+/, '');
    if (route.split(/[\\/]/).some(part=>part.startsWith('.'))) {res.writeHead(404);res.end('Page is not available');return;}
    let target;
    try {target=inside(dist,route);} catch {res.writeHead(404);res.end('Page is not available');return;}
    let status=200;
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
      status=404;
      target=inside(dist,'404.html');
      if (!fs.existsSync(target)) {res.writeHead(404);res.end('Build the local project first');return;}
    }
    const extension=path.extname(target).toLowerCase();
    res.setHeader('Content-Type',mime[extension]||'application/octet-stream');
    res.writeHead(status);
    if (req.method==='HEAD') {res.end();return;}
    if (extension==='.html') res.end(previewHtml(fs.readFileSync(target,'utf8')));
    else if (extension==='.json'||extension==='.css') res.end(fs.readFileSync(target,'utf8').replace(imageUrl,previewMedia));
    else fs.createReadStream(target).pipe(res);
  });
}

if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  if (!fs.existsSync(path.join(dist,'index.html'))) throw new Error('Run npm run build first');
  const portIndex=process.argv.indexOf('--port');
  const port=portIndex<0?4187:Number(process.argv[portIndex+1]);
  if (!Number.isInteger(port)||port<1024||port>65535) throw new Error('Invalid preview port');
  const server=createPreviewServer();
  server.on('error',error=>{console.error(error.message);process.exitCode=1;});
  server.listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}/__review/\nRead-only preview; no public hosting, form submissions or analytics.`));
  for (const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>server.close());
}
