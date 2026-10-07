import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { root } from "./build-registry.mjs";
import { publicPage, esc, origin, category, money, breadcrumbs, schema, leadForm } from "./public-page.mjs";
export function objectHeading(r) {
  const name = {apartment:"Квартира",house:"Дом",land:"Участок"}[r.type];
  const facts = [r.rooms===null?null:r.rooms+" комн.",r.area_total===null?null:r.area_total+" м²",r.type==="land"&&r.lot_area_sotok!==null?r.lot_area_sotok+" сот.":null].filter(Boolean);
  return name+(facts.length?" "+facts.join(", "):"")+" · "+r.id+(r.city!==null?" — "+r.city:"");
}
export function eligible(r) { return (r.status===null || r.status==="active") && r.images.length>0; }
export function objectPage(r) {
  const file = "obekt/"+r.id+".html", h1 = objectHeading(r);
  const price = r.price_conflict ? null : r.price;
  const facts = [["Город",r.city],["Населённый пункт",r.settlement],["Район",r.district],["Адрес",r.address],["Площадь",r.area_total===null?null:r.area_total+" м²"],["Комнаты",r.rooms],["Этаж",r.floor],["Этажей в доме",r.floors],["Участок",r.lot_area_sotok===null?null:r.lot_area_sotok+" сот."]];
  const body = breadcrumbs([["Главная","/"],category[r.type].map((v,i)=>i?"/"+v:v),[r.id,"/"+file]])
    +'<p class="visibility-price">'+esc(money(price))+'</p><dl class="visibility-facts">'+facts.filter(([,v])=>v!==null).map(([label,v])=>'<div><dt>'+esc(label)+'</dt><dd>'+esc(v)+'</dd></div>').join('')+'</dl>'
    +'<p>Мы агентство недвижимости. Уточним наличие объекта и организуем просмотр по договорённости.</p>'
    +'<div class="visibility-actions"><a class="btn" href="tel:+79536091122">Позвонить</a><a class="btn" href="https://max.ru/u/f9LHodD0cOKImT5sxxh2fLN4YFJ-paNFCiI79MwgO-LJJZ8oHXX5TN007y4" target="_blank" rel="noopener noreferrer" data-channel="max" data-max-trigger>MAX</a><a class="btn" href="https://t.me/httpsmealieva_rieltor" target="_blank" rel="noopener noreferrer" data-channel="telegram">Telegram</a><a class="btn" href="#lead-form-section" data-lead-type="buy" data-source-cta="object_page" data-object-id="'+esc(r.id)+'" data-object-type="'+esc(r.type)+'" data-object-title="'+esc(h1)+'" data-object-url="'+origin+'/'+file+'">Заявка по объекту</a></div>'
    +'<div class="visibility-gallery">'+r.images.map((image,i)=>'<img src="'+esc(image)+'" alt="'+esc(h1)+' — фото '+(i+1)+'" loading="lazy" width="800" height="600">').join('')+'</div>';
  const product = price!==null ? schema({"@context":"https://schema.org","@type":"Product",name:h1,image:r.images,url:origin+"/"+file,offers:{"@type":"Offer",price,priceCurrency:"RUB",url:origin+"/"+file}}) : "";
  return publicPage({file,h1,title:h1+" — "+money(price)+" | Домиан Квартал",description:h1+". "+money(price)+". Уточните наличие и условия просмотра в агентстве Домиан Квартал.",body,structured:product,noindex:!eligible(r),
    form:leadForm("object_page",{lead_type:"buy",object_id:r.id,object_type:r.type,object_title:h1,object_price:price,object_url:origin+"/"+file})});
}
export function buildObjectPages() {
  const registry = JSON.parse(fs.readFileSync(root+"/data/catalog/registry.json","utf8"));
  fs.mkdirSync(root+"/obekt",{recursive:true});
  for (const r of registry) fs.writeFileSync(root+"/obekt/"+r.id+".html",objectPage(r));
  for (const type of ["apartment","house","land"]) {
    const file = category[type][1], name = category[type][0];
    const links = registry.filter(r=>r.type===type && (r.status===null||r.status==="active")).map(r=>'<li data-registry-id="'+r.id+'"><a href="/obekt/'+r.id+'.html">'+esc(objectHeading(r))+'</a></li>').join("\n");
    const block = '<!-- static-object-links:start -->\n<section class="visibility-static-links" aria-label="'+name+' — ссылки на объекты"><h2>Все объекты раздела</h2><p>Откройте страницу объекта, чтобы посмотреть характеристики и связаться с нами.</p><ul>'+links+'</ul></section>\n<!-- static-object-links:end -->';
    let source = fs.readFileSync(root+"/"+file,"utf8");
    source = /<!-- static-object-links:start -->/.test(source) ? source.replace(/<!-- static-object-links:start -->[\s\S]*?<!-- static-object-links:end -->/,block) : source.replace('</main>',block+'\n</main>');
    if(!source.includes("/assets/css/visibility.css")) source=source.replace('</head>','<link rel="stylesheet" href="/assets/css/visibility.css">\n</head>');
    fs.writeFileSync(root+"/"+file,source);
  }
  // S6 replaces this migration append with the complete sitemap generator.
  let sitemap = fs.readFileSync(root+"/sitemap.xml","utf8").replace(/\s*<url>\s*<loc>https:\/\/domian-161\.ru\/obekt\/[\s\S]*?<\/url>/g,"");
  const added = registry.filter(eligible).map(r=>{
    const lastmod = execFileSync("git",["log","-1","--format=%cs","--",r.source_path],{cwd:root,encoding:"utf8"}).trim() || "2026-10-07";
    return "  <url><loc>"+origin+"/obekt/"+r.id+".html</loc><lastmod>"+lastmod+"</lastmod></url>";
  }).join("\n");
  fs.writeFileSync(root+"/sitemap.xml",sitemap.replace('</urlset>',added+'\n</urlset>'));
  console.log("Object pages:",registry.length,"; indexed:",registry.filter(eligible).length);
}
if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) buildObjectPages();
