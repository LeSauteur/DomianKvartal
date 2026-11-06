import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { root } from "./build-registry.mjs";
import { publicPage, esc, origin, category, money, breadcrumbs, schema, leadForm } from "./public-page.mjs";
import { buildSitemap } from "./build-sitemap.mjs";
import { writeGenerated } from './write-generated.mjs';
import { heading, publicFacts, metaDescription } from './catalog-presentation.mjs';
import { renderDescription } from './catalog-editorial.mjs';
export function objectHeading(r) {
  return heading(r);
}
export function eligible(r) { return (r.status===null || r.status==="active") && r.images.length>0; }
export const objectTitle = r => objectHeading(r)+" — "+money(r.price_conflict ? null : r.price)+" | Домиан Квартал";
export function objectPage(r, duplicateTitles = new Set(), registry = []) {
  const file = "obekt/"+r.id+".html", h1 = objectHeading(r);
  const p=publicFacts(r);
  const asset = image => r.published_at && image.startsWith(origin+'/') ? image.slice(origin.length) : image;
  const price = r.price_conflict ? null : r.price;
  const compare=(r.editorial?.comparisonIds||[]).map(id=>registry.find(item=>item.id===id&&item.status!=='placeholder'&&eligible(item))).filter(Boolean);
  const facts = [[r.geography_precision==='region'?'Регион':r.geography_precision==='district'?'Территория':'Город',r.city],["Населённый пункт",r.settlement],["Район",r.district!==r.city?r.district:null],["Адрес",r.address],["Расположение",!r.city&&!r.settlement&&!r.address?'Уточняется':null],["Категория",{apartment:'Квартира',house:'Дом',land:'Участок'}[r.type]],["Площадь",p.area_total===null?null:p.area_total+" м²"],["Жилая площадь",p.area_living?p.area_living+' м²':null],["Кухня",r.area_kitchen?r.area_kitchen+' м²':null],["Комнаты",r.rooms],["Этаж",r.floor],["Этажей в доме",r.floors],["Участок",r.lot_area_sotok===null?null:r.lot_area_sotok+" сот."]];
  const body = breadcrumbs([["Главная","/"],category[r.type].map((v,i)=>i?"/"+v:v),[h1,"/"+file]])
    +'<p class="visibility-price">'+esc(money(price))+'</p><dl class="visibility-facts">'+facts.filter(([,v])=>v!==null).map(([label,v])=>'<div><dt>'+esc(label)+'</dt><dd>'+esc(v)+'</dd></div>').join('')+'</dl>'
    +'<p class="visibility-status" data-listing-status>Актуально</p>'
    +'<div class="visibility-actions"><a class="btn" href="tel:+79536091122">Позвонить</a><a class="btn" href="https://max.ru/u/f9LHodD0cOKImT5sxxh2fLN4YFJ-paNFCiI79MwgO-LJJZ8oHXX5TN007y4" target="_blank" rel="noopener noreferrer" data-channel="max" data-max-trigger>MAX</a><a class="btn" href="https://t.me/httpsmealieva_rieltor" target="_blank" rel="noopener noreferrer" data-channel="telegram">Telegram</a><a class="btn" href="#lead-form-section" data-lead-type="buy" data-source-cta="object_page" data-object-id="'+esc(r.id)+'" data-object-type="'+esc(r.type)+'" data-object-title="'+esc(h1)+'" data-object-url="'+origin+'/'+file+'">Заявка по объекту</a></div>'
    +'<div class="visibility-gallery">'+r.images.map((image,i)=>'<img src="'+esc(asset(image))+'" alt="'+esc(h1)+' — фото '+(i+1)+'" loading="lazy" width="800" height="600">').join('')+'</div>'
    +(r.floor_plans?.length ? '<section class="visibility-plans" data-object-plans><h2>Планировка</h2>'+r.floor_plans.map(image=>'<a href="'+esc(asset(image))+'" target="_blank" rel="noopener noreferrer"><img src="'+esc(asset(image))+'" alt="Планировка — '+esc(h1)+'" loading="lazy" width="1320" height="1145"></a>').join('')+'</section>' : '')
    +(r.description_public ? '<section class="visibility-description" data-listing-description><h2>Описание</h2>'+renderDescription(r)+'</section>' : '')
    +(compare.length?'<section class="visibility-comparison"><h2>Другие дома для сравнения</h2><ul>'+compare.map(item=>'<li><a href="/obekt/'+item.id+'.html">'+esc(objectHeading(item))+'</a></li>').join('')+'</ul></section>':'');
  const url=origin+'/'+file;
  const property={"@type":{apartment:'Apartment',house:'House',land:'Place'}[r.type],"@id":url+'#property',name:h1,description:r.description_public||h1,image:r.images,url};
  if(r.city||r.settlement||r.address)property.address=[...new Set([r.city,r.settlement,r.address].filter(Boolean))].join(', ');
  if(p.area_total!==null&&r.type!=='land')property.floorSize={"@type":"QuantitativeValue",value:p.area_total,unitCode:'MTK'};
  if(r.rooms!==null&&r.type!=='land')property.numberOfRooms=r.rooms;
  const listing={"@context":"https://schema.org","@type":"RealEstateListing","@id":url+'#listing',url,name:h1,description:r.description_public||h1,mainEntity:property,...(r.content_updated_at?{dateModified:r.content_updated_at}:{})};
  if(price!==null)listing.offers={"@type":"Offer",price,priceCurrency:'RUB',availability:'https://schema.org/InStock',url,itemOffered:{'@id':property['@id']}};
  const product=schema(listing);
  const title = objectTitle(r)+(duplicateTitles.has(objectTitle(r)) ? " № "+Number(r.id.split('_')[1]) : "");
  const html = publicPage({file,h1,title,description:metaDescription(r),body,structured:product,noindex:!eligible(r),
    form:leadForm("object_page",{lead_type:"buy",object_id:r.id,object_type:r.type,object_title:h1,object_price:price,object_url:origin+"/"+file})});
  return r.published_at ? html.replaceAll('\r\n','\n').replace(/[ \t]+$/gm,'') : html;
}
export function buildObjectPages() {
  const registry = JSON.parse(fs.readFileSync(root+"/data/catalog/registry.json","utf8"));
  fs.mkdirSync(root+"/obekt",{recursive:true});
  const counts=new Map();
  for(const r of registry.filter(r=>r.status!=="placeholder")) counts.set(objectTitle(r),(counts.get(objectTitle(r))||0)+1);
  const duplicateTitles=new Set([...counts].filter(([,count])=>count>1).map(([title])=>title));
  const mainPages = new Set(execFileSync("git",["ls-tree","-r","--name-only","origin/main","--","obekt/"],{cwd:root,encoding:"utf8"}).trim().split(/\r?\n/));
  for (const r of registry) {
    const file = "obekt/"+r.id+".html";
    if (r.status === "placeholder") {
      if (fs.existsSync(root+"/"+file)) {
        if (mainPages.has(file)) throw new Error("Refusing to remove an existing main page: "+file);
        fs.unlinkSync(root+"/"+file); // Only placeholder pages introduced in this PR.
      }
    } else writeGenerated(root+"/"+file,objectPage(r,duplicateTitles,registry));
  }
  for (const type of ["apartment","house","land"]) {
    const file = category[type][1], name = category[type][0];
    const aksay = r => ["Аксай","Аксайский район"].includes(r.city) ? 1 : 0;
    const links = registry.filter(r=>r.type===type && (r.status===null||r.status==="active")).sort((a,b)=>aksay(b)-aksay(a)).map(r=>'<li data-registry-id="'+r.id+'"><a href="/obekt/'+r.id+'.html">'+esc(objectHeading(r))+'</a></li>').join("\n");
    const block = '<!-- static-object-links:start -->\n<section class="visibility-static-links" aria-label="'+name+' — ссылки на объекты"><h2>Все объекты раздела</h2><p>Откройте страницу объекта, чтобы посмотреть характеристики и связаться с нами.</p><ul>'+links+'</ul></section>\n<!-- static-object-links:end -->';
    let source = fs.readFileSync(root+"/"+file,"utf8");
    source = /<!-- static-object-links:start -->/.test(source) ? source.replace(/<!-- static-object-links:start -->[\s\S]*?<!-- static-object-links:end -->/,block) : source.replace('</main>',block+'\n</main>');
    if(!source.includes("/assets/css/visibility.css")) source=source.replace('</head>','<link rel="stylesheet" href="/assets/css/visibility.css">\n</head>');
    writeGenerated(root+"/"+file,source);
  }
  writeGenerated(root+"/sitemap.xml",buildSitemap());
  console.log("Object pages:",registry.filter(r=>r.status!=="placeholder").length,"; indexed:",registry.filter(eligible).length);
}
if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) buildObjectPages();
