import fs from 'node:fs';
import path from 'node:path';
import { root, origin } from './paths.mjs';
import { escapeHtml as esc } from './page-contract.mjs';

const category = { apartment: ['Квартиры','apartments.html'], house: ['Дома','houses.html'], land: ['Участки','lands.html'] };
const money = value => value === null ? 'Цена по запросу' : new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
const jsonLd = value => '<script type="application/ld+json">' + JSON.stringify(value).replaceAll('<', '\\u003c') + '</script>';
function fill(template, values) {
  return template.replace(/\{\{([A-Z][A-Z0-9_]*)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`Unknown template field: ${key}`);
    return values[key];
  });
}
function breadcrumbs(item) {
  const links = [['Главная','/'], [category[item.type][0], '/' + category[item.type][1]], [item.title,item.url]];
  return '<nav class="visibility-breadcrumbs" aria-label="Хлебные крошки">' + links.map(([name,url]) => '<a href="'+esc(url)+'">'+esc(name)+'</a>').join(' → ') + '</nav>' + jsonLd({
    '@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:links.map(([name,url],i) => ({'@type':'ListItem',position:i+1,name,item:new URL(url,origin).href}))
  });
}
function structuredData(item) {
  const url = origin + item.url, c = item.characteristics, l = item.location;
  const property = { '@type':{apartment:'Apartment',house:'House',land:'Place'}[item.type], '@id':url+'#property',name:item.title,description:item.description||item.title,image:item.images.map(image => new URL(image.src,origin).href),url };
  if (l.city || l.settlement || l.address) property.address = [...new Set([l.city,l.settlement,l.address].filter(Boolean))].join(', ');
  if (c.areaM2 !== null && item.type !== 'land') property.floorSize = {'@type':'QuantitativeValue',value:c.areaM2,unitCode:'MTK'};
  if (c.rooms !== null && item.type !== 'land') property.numberOfRooms = c.rooms;
  const listing = {'@context':'https://schema.org','@type':'RealEstateListing','@id':url+'#listing',url,name:item.title,description:item.description||item.title,mainEntity:property,...(item.contentUpdatedAt?{dateModified:item.contentUpdatedAt}:{})};
  if (item.price !== null && item.availability.status==='active') listing.offers = {'@type':'Offer',price:item.price,priceCurrency:item.currency,...(item.availability.confirmation==='confirmed'?{availability:'https://schema.org/InStock'}:{}),url,itemOffered:{'@id':property['@id']}};
  return listing;
}
export function renderListing(item) {
  const l = item.location, c = item.characteristics;
  const facts = [[l.precision==='region'?'Регион':l.precision==='district'?'Территория':'Город',l.city],['Населённый пункт',l.settlement],['Район',l.district!==l.city?l.district:null],['Адрес',l.address],['Расположение',!l.city&&!l.settlement&&!l.address?'Уточняется':null],['Категория',{apartment:'Квартира',house:'Дом',land:'Участок'}[item.type]],['Площадь',c.areaM2===null?null:c.areaM2+' м²'],['Жилая площадь',c.livingAreaM2?c.livingAreaM2+' м²':null],['Кухня',c.kitchenAreaM2?c.kitchenAreaM2+' м²':null],['Комнаты',c.rooms],['Этаж',c.floor],['Этажей в доме',c.floors],['Участок',c.landAreaSot===null?null:c.landAreaSot+' сот.']];
  const body = breadcrumbs(item)
    + '<p class="visibility-price">'+esc(money(item.price))+'</p><dl class="visibility-facts">'+facts.filter(([,v])=>v!==null).map(([label,v])=>'<div><dt>'+esc(label)+'</dt><dd>'+esc(v)+'</dd></div>').join('')+'</dl>'
    + '<p class="visibility-status" data-listing-status>'+esc(item.availability.label)+'</p>'
    + '<div class="visibility-actions"><a class="btn" href="tel:+79536091122">Позвонить</a><a class="btn" href="https://max.ru/u/f9LHodD0cOKImT5sxxh2fLN4YFJ-paNFCiI79MwgO-LJJZ8oHXX5TN007y4" target="_blank" rel="noopener noreferrer" data-channel="max" data-max-trigger>MAX</a><a class="btn" href="https://t.me/httpsmealieva_rieltor" target="_blank" rel="noopener noreferrer" data-channel="telegram">Telegram</a><a class="btn" href="#lead-form-section" data-lead-type="buy" data-source-cta="object_page" data-object-id="'+esc(item.id)+'" data-object-type="'+esc(item.type)+'" data-object-title="'+esc(item.title)+'" data-object-url="'+origin+item.url+'">Заявка по объекту</a></div>'
    + '<div class="visibility-gallery">'+item.images.map(image=>'<img src="'+esc(image.src)+'" alt="'+esc(image.alt)+'" loading="lazy" width="'+image.width+'" height="'+image.height+'">').join('')+'</div>'
    + (item.floorPlans.length?'<section class="visibility-plans" data-object-plans><h2>Планировка</h2>'+item.floorPlans.map(src=>'<a href="'+esc(src)+'" target="_blank" rel="noopener noreferrer"><img src="'+esc(src)+'" alt="Планировка — '+esc(item.title)+'" loading="lazy" width="1320" height="1145"></a>').join('')+'</section>':'')
    + (item.description?'<section class="visibility-description" data-listing-description><h2>Описание</h2>'+item.description.split(/\n\s*\n/).map(p=>'<p>'+esc(p).replaceAll('\n','<br>')+'</p>').join('')+'</section>':'');
  const robots = item.availability.status==='active' ? item.seo.robots : 'noindex,follow';
  const values = { ID:esc(item.id),TYPE:esc(item.type),H1:esc(item.title),TITLE:esc(item.seo.title),META_DESCRIPTION:esc(item.seo.description),CANONICAL:esc(item.seo.canonical),ROBOTS:robots?'<meta name="robots" content="'+esc(robots)+'">':'',PRICE_ATTRIBUTE:item.price===null?'':' data-object-price="'+item.price+'"' };
  const form = fill(fs.readFileSync(path.join(root,'src/templates/lead-form.html'),'utf8'),values);
  return fill(fs.readFileSync(path.join(root,'src/templates/layout.html'),'utf8'),{...values,FORM:form,BODY:body,LISTING_SCHEMA:jsonLd(structuredData(item))});
}
