import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { root } from "./build-registry.mjs";
import { esc, origin, publicPage, leadForm, breadcrumbs, schema } from "./public-page.mjs";
import { objectHeading } from "./build-object-pages.mjs";
export const known = value => typeof value === "string" && value && !/^UNK\b/.test(value);
export const zhkFile = record => "seo/zhk-"+record.slug+"-aksay.html";
export function apartmentsFor(record, registry) {
  const name=record.name.toLowerCase().replaceAll("ё","е");
  return registry.filter(r=>{
    if(r.type!=="apartment" || (r.status!==null&&r.status!=="active") || (r.city!==null && !["Аксай","Аксайский район"].includes(r.city)))return false;
    const text=(r.title_raw+" "+r.description_raw).toLowerCase().replaceAll("ё","е");
    // A common word such as "атмосфера" without ЖК is not a project match.
    return new RegExp("жк\\s*[«\"„]?\\s*"+name.replace(/[.*+?^{}$()|[\]\\]/g,"\\$&")+"(?=[»\"\\s,.!]|$)","u").test(text);
  });
}
export function zhkPage(record,registry) {
  const file=zhkFile(record),h1="ЖК «"+record.name+"»"+(record.name==="Новый Аксай"?"":" в Аксае");
  // Frozen approved content from origin/main; regeneration must not recursively copy its own output after merge.
  const legacy=JSON.parse(fs.readFileSync(root+'/data/zhk/main-content.json','utf8')).pages[file];
  const legacyContent=legacy ? '<!-- preserved-zhk-content:start -->\n<div class="preserved-zhk-content">'+legacy.main
    .replace(/<h1\b([^>]*)>/giu,'<h2$1>').replace(/<\/h1>/giu,'</h2>')
    .replaceAll('href="/#lead-form-section"','href="#lead-form-section"')
    .replace('<p>Диапазон:', '<p>Архивный ориентир из прежней страницы (актуальность не подтверждена). Диапазон:')+'</div>\n<!-- preserved-zhk-content:end -->' : '';
  const apartments=apartmentsFor(record,registry);
  const values=[["Застройщик",record.developer],["Адрес",record.address],["Статус указанных домов",record.status],["Сроки и отдельные корпуса",record.deadlines],["Цена в публикации застройщика",record.price]].filter(([,v])=>known(v));
  const facts=record.source ? '<h2>Факты о ЖК</h2><p>По данным застройщика на 07.10.2026. Сроки ниже относятся к указанным корпусам и очередям.</p><dl class="visibility-facts">'+values.map(([label,v])=>'<div><dt>'+esc(label)+'</dt><dd>'+esc(v)+'</dd></div>').join('')+'</dl><p><a href="'+esc(record.source)+'" target="_blank" rel="noopener noreferrer">Первичный источник сведений</a></p>' : '<h2>Информация о проекте</h2><p>Первичный источник о проекте пока не подтверждён. Мы поможем уточнить название, адрес и документы конкретного дома.</p>';
  const body=breadcrumbs([["Главная","/"],["Новостройки","/newbuilds.html"],["ЖК «"+record.name+"»","/"+file]])
    +facts+legacyContent+'<h2>Квартиры из нашего реестра</h2>'
    +(apartments.length?'<ul>'+apartments.map(r=>'<li data-registry-id="'+r.id+'"><a href="/obekt/'+r.id+'.html">'+esc(objectHeading(r))+'</a></li>').join('')+'</ul>':'<p>В реестре пока нет квартир с подтверждённой привязкой к этому ЖК. Уточним наличие предложений при обращении.</p>')
    +'<h2>Чем поможем</h2><p>Подберём квартиру под вашу задачу, проверим документы, поможем с ипотекой и сопроводим сделку.</p>'
    +'<p class="visibility-notice">Мы агентство недвижимости, а не застройщик. Цены и сроки уточняйте у нас — проверим актуальность у застройщика.</p>'
    +'<div class="visibility-actions"><a class="btn" href="#lead-form-section" data-lead-type="newbuild" data-source-cta="zhk_'+esc(record.slug)+'">Заявка по ЖК</a><a class="btn secondary" href="tel:+79536091122">Позвонить</a></div>';
  return publicPage({file,h1,title:legacy && /Акса[йея]/iu.test(legacy.title) ? legacy.title : h1+" — информация и подбор квартиры | Домиан Квартал",description:"Мы агентство недвижимости. Поможем с подбором квартиры в ЖК «"+record.name+"», проверкой документов, ипотекой и сопровождением сделки.",body,structured:(legacy?.faq||[]).map(schema).join('\n'),
    form:leadForm("zhk_"+record.slug,{lead_type:"newbuild",project_code:"zhk_"+record.slug,project_name:"ЖК «"+record.name+"»",project_url:origin+"/"+file,object_type:"newbuild"})});
}
export function buildZhkPages(args=process.argv.slice(2)) {
  const records=JSON.parse(fs.readFileSync(root+"/data/zhk/aksay.json","utf8"));
  const registry=JSON.parse(fs.readFileSync(root+"/data/catalog/registry.json","utf8"));
  const option=args.indexOf("--only");
  const selected=option>=0 ? (args[option+1]||"").split(",").filter(Boolean) : null;
  if(selected && (!selected.length || selected.some(slug=>!records.some(r=>r.slug===slug))))throw new Error("Unknown or empty --only list");
  for(const record of records.filter(r=>selected ? selected.includes(r.slug) : r.publish))fs.writeFileSync(root+"/"+zhkFile(record),zhkPage(record,registry));
  // --only is the explicit future owner-approved activation command.
  if(selected) {
    for(const record of records.filter(r=>selected.includes(r.slug)))record.publish=true;
    fs.writeFileSync(root+"/data/zhk/aksay.json",JSON.stringify(records,null,2)+"\n");
  }
  const block='<!-- visibility-aksay-zhk:start -->\n<section class="visibility-static-links"><h2>ЖК Аксая</h2><ul>'+records.filter(r=>r.publish).map(r=>'<li><a href="/'+zhkFile(r)+'">ЖК «'+esc(r.name)+'»</a></li>').join('')+'</ul></section>\n<!-- visibility-aksay-zhk:end -->';
  const hub=root+"/newbuilds.html";
  let html=fs.readFileSync(hub,"utf8");
  html=html.includes("<!-- visibility-aksay-zhk:start -->")?html.replace(/<!-- visibility-aksay-zhk:start -->[\s\S]*?<!-- visibility-aksay-zhk:end -->/,block):html.replace("</main>",block+"\n</main>");
  fs.writeFileSync(hub,html);
  console.log("ZHK pages built:",selected?.length || records.filter(r=>r.publish).length,"; inactive templates:",records.filter(r=>!r.publish).length);
}
if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url))buildZhkPages();
