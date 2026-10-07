import fs from "node:fs";
import { root } from "./build-registry.mjs";
import { headerMarkup, propertyDiscoveryMarkup } from "./sync-public-header.mjs";
export const origin = "https://domian-161.ru";
export const esc = value => String(value ?? "").replaceAll("&","&amp;").replaceAll('"',"&quot;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll("'","&#39;");
export const category = {apartment:["Квартиры","apartments.html"],house:["Дома","houses.html"],land:["Участки","lands.html"]};
export const money = price => price === null ? "Цена по запросу" : new Intl.NumberFormat("ru-RU").format(price) + " ₽";
export const schema = node => '<script type="application/ld+json">' + JSON.stringify(node).replaceAll("<","\\u003c") + '</script>';
export function breadcrumbs(items) {
  return '<nav class="visibility-breadcrumbs" aria-label="Хлебные крошки">' + items.map(([name,url])=>'<a href="'+esc(url)+'">'+esc(name)+'</a>').join(' → ')+'</nav>' + schema({
    "@context":"https://schema.org","@type":"BreadcrumbList",
    itemListElement:items.map(([name,url],i)=>({"@type":"ListItem",position:i+1,name,item:new URL(url,origin).href}))
  });
}
function footer() {
  const source = fs.readFileSync(root+"/index.html","utf8").match(/<footer\b[\s\S]*?<\/footer>/i)?.[0];
  if (!source) throw new Error("Site footer missing");
  return source.replace(/(href|src)=(["'])(.*?)\2/g,(full,key,q,url)=> {
    if (/^(?:https?:|mailto:|tel:|\/|data:)/i.test(url)) return full;
    return key+'='+q+'/'+url+q;
  });
}
export function leadForm(sourceCta, data = {}) {
  const source = fs.readFileSync(root+"/index.html","utf8").match(/<form\b[^>]*data-lead-form[\s\S]*?<\/form>/i)?.[0];
  if (!source) throw new Error("Production lead form missing");
  const attrs = Object.entries(data).filter(([,v])=>v!==null && v!==undefined).map(([key,v])=>' data-'+key.replaceAll("_","-")+'="'+esc(v)+'"').join("");
  const form = source.replace('data-source-cta="contact_form"','data-source-cta="'+esc(sourceCta)+'"'+attrs)
    .replace(/ class="([^"]*)fade-in([^"]*)"/g,' class="$1$2"');
  return '<section class="form-section" id="lead-form-section" aria-labelledby="lead-form-title"><div class="container form-container"><h2 id="lead-form-title">Оставьте заявку</h2><p>Мы свяжемся с вами и уточним детали.</p>'+form+'</div></section>';
}
export function publicPage({file,title,description,h1,body,structured="",noindex=false,form=""}) {
  return '<!DOCTYPE html>\n<html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
    +'<title>'+esc(title)+'</title><meta name="description" content="'+esc(description)+'"><link rel="canonical" href="'+origin+'/'+file+'">'
    +(noindex?'<meta name="robots" content="noindex,follow">':'')+'\n'
    +['main','visual-premium','header-unified','visibility'].map(name=>'<link rel="stylesheet" href="/assets/css/'+name+'.css">').join('\n')
    +structured+'\n</head><body class="visibility-page">'+headerMarkup(file)+'\n'
    +'<main><section class="visibility-intro container"><h1>'+esc(h1)+'</h1>'+body+'</section>\n'
    +propertyDiscoveryMarkup(file)+'\n'+form+'</main>'+footer()
    +'<script src="/assets/js/lead-config.js" defer></script><script src="/assets/js/main.js" defer></script><script src="/assets/js/form-handler.js" defer></script><script src="/assets/js/header-unified.js" defer></script></body></html>\n';
}
