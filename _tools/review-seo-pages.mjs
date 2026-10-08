import fs from "node:fs";
import { root, csv } from "./build-registry.mjs";
import { esc } from "./public-page.mjs";
import { publicHtmlFiles, readPage, urlFor, canonical, noindex, fileForUrl, linkGraph } from "./site-pages.mjs";
const write=(file,html)=>fs.writeFileSync(root+"/"+file,html);
const objectIds=html=>[...new Set([...html.matchAll(/(?:object|house|land|nb)_\d+/g)].map(m=>m[0]))];
const robots=(html,value)=> /<meta\b[^>]*name=["']robots["'][^>]*>/iu.test(html)
  ? html.replace(/<meta\b[^>]*name=["']robots["'][^>]*>/iu,'<meta name="robots" content="'+value+'">')
  : html.replace('</head>','<meta name="robots" content="'+value+'">\n</head>');
const title=html=>(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/iu)?.[1]||"").replace(/<[^>]*>/g,"").trim();
const files=publicHtmlFiles().filter(file=>file.startsWith("seo/") || /^newbuilds\/[^/]+\/index.html$/.test(file));
const decisions=new Map();
const pairs=[["seo/kvartiry-zhk-veresaeva.html","seo/kvartiry-zhk-veresaevo.html"],["seo/kvartiry-zhk-sokol-grad-2.html","seo/kvartiry-zhk-sokol-grad.html"]];
const duplicates=new Map();
for (const pair of pairs) {
  const sorted=pair.slice().sort((a,b)=>objectIds(readPage(b)).length-objectIds(readPage(a)).length);
  duplicates.set(sorted[1],sorted[0]);
}
for (const file of files) {
  let html=readPage(file), city=null, duplicate=duplicates.get(file)||"";
  const count=objectIds(html).length;
  if (/^newbuilds\//.test(file)) city="Ростов-на-Дону"; // All 21 existing detail pages explicitly say so.
  else if (/zhk-[^/]+-aksay|(?:doma|uchastki|kvartiry)-(?:loc-aksay|raion-aksayskiy-rayon)/.test(file)) city="Аксай / Аксайский район";
  else if (/kvartiry-zhk-/.test(file) && !file.includes("vishnevyy-sad")) city="Ростов-на-Дону";
  else if (/loc-rostov|roletarskiy|40-let-pobedy/.test(file)) city="Ростов-на-Дону";
  let decision="оставить",reason="Сохранение индексируемой страницы и статическая ссылка с хаба";
  if(duplicate) {
    decision="canonical";reason="Дубль; каноничная подборка содержит больше объектов ("+objectIds(readPage(duplicate)).length+")";
    html=html.replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/iu,'<link rel="canonical" href="'+urlFor(duplicate)+'">');
    if(noindex(html)) html=robots(html,"index,follow");
  } else if (city==="Ростов-на-Дону" && (file.startsWith("newbuilds/") || file.includes("kvartiry-zhk-")) && count<=2) {
    decision="noindex,follow";reason="Ростовский ЖК: не более двух объектов в статической подборке; файл и URL сохранены";
    html=robots(html,"noindex,follow");
  } else if(file==="seo/kvartiry-zhk-vishnevyy-sad.html") {
    decision="вопрос владельцу";reason="nb_22 и nb_23 не содержат города/адреса. Общих подтверждённых объектов с аксайской страницей нет; canonical не меняется";
  } else if (file.includes("rossiyskiy")) {
    reason="Аксайская посадочная сохраняется по заданию; город объектов не выведен из названия посёлка";
  }
  write(file,html);decisions.set(file,{city,count,duplicate,decision,reason});
}
// Link every retained indexable page; keep aliases available at their old URLs.
const retained=files.filter(file=>!noindex(readPage(file)) && canonical(readPage(file))===urlFor(file));
for (const [hub,test,label] of [
  ["apartments.html",file=>file.startsWith("seo/kvartiry-"),"Подборки по районам и ЖК"],
  ["houses.html",file=>file.startsWith("seo/doma-"),"Подборки по районам и ЖК"],
  ["lands.html",file=>file.startsWith("seo/uchastki-"),"Подборки по районам и ЖК"],
  ["newbuilds.html",file=>file.startsWith("newbuilds/") || file.startsWith("seo/zhk-") || file.includes("kvartiry-zhk-"),"ЖК и подборки квартир"]
]) {
  const links=retained.filter(test).map(file=>'<li><a href="'+new URL(urlFor(file)).pathname+'">'+esc(title(readPage(file)))+'</a></li>').join("\n");
  const marker="visibility-seo-hub",block='<!-- '+marker+':start -->\n<section class="visibility-static-links"><h2>'+label+'</h2><ul>'+links+'</ul></section>\n<!-- '+marker+':end -->';
  let html=readPage(hub);
  html=html.includes('<!-- '+marker+':start -->')?html.replace(new RegExp('<!-- '+marker+':start -->[\\s\\S]*?<!-- '+marker+':end -->'),block):html.replace('</main>',block+'\n</main>');
  if(!html.includes("/assets/css/visibility.css"))html=html.replace('</head>','<link rel="stylesheet" href="/assets/css/visibility.css">\n</head>');
  write(hub,html);
}
let sitemap=readPage("sitemap.xml");
sitemap=sitemap.replace(/\s*<url>[\s\S]*?<\/url>/g,block=>{
  const url=block.match(/<loc>(.*?)<\/loc>/)?.[1],file=fileForUrl(url);
  return file && !noindex(readPage(file)) && canonical(readPage(file))===url ? block : "";
});
const flora="seo/zhk-flora-aksay.html";
if(!sitemap.includes("<loc>"+urlFor(flora)+"</loc>"))sitemap=sitemap.replace("</urlset>","  <url><loc>"+urlFor(flora)+"</loc><lastmod>2026-10-07</lastmod></url>\n</urlset>");
write("sitemap.xml",sitemap);
const {incoming}=linkGraph();
const rows=files.map(file=>{
  const html=readPage(file),main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/iu)?.[1]||html.replace(/<header\b[\s\S]*?<\/header>|<footer\b[\s\S]*?<\/footer>/giu,"");
  const words=main.replace(/<(?:script|style)\b[\s\S]*?<\/(?:script|style)>/giu,"").replace(/<[^>]*>/g," ").trim().split(/\s+/u).filter(Boolean).length;
  const d=decisions.get(file);
  return [urlFor(file),words,d.count,d.city,d.duplicate?urlFor(d.duplicate):"",incoming.get(file)||0,d.decision,d.reason].map(csv).join(";");
});
fs.mkdirSync(root+"/docs/owner",{recursive:true});
write("docs/owner/seo-pages-decision.csv","URL;слов;объектов_на_странице;город;дубль_чего;входящих_внутренних_ссылок;решение;причина\n"+rows.join("\n")+"\n");
console.log("SEO decisions:",files.length,"pages;",[...decisions.values()].filter(d=>d.decision==="noindex,follow").length,"noindex;",duplicates.size,"canonical aliases.");
