import { escapeHtml as esc } from './page-contract.mjs';
import { origin } from './paths.mjs';
import { localMediaPath } from './media.mjs';

export const categories = { apartment:'apartments', house:'houses', land:'lands' };
export const active = item => item.published && item.availability.status === 'active';
export const indexable = item => active(item) && !/noindex/i.test(item.seo.robots || '');
const aksay = item => ['Аксай','Аксайский район'].includes(item.location.city);
const asJson = value => JSON.stringify(value, null, 2) + '\n';
const money = price => price === null ? 'Цена по запросу' : new Intl.NumberFormat('ru-RU').format(price)+' ₽';

export function catalogItem(item) {
  const images = item.images.map(image=>image.src);
  const facts = item.characteristics;
  return {
    id:item.id,type:item.type,title:item.title,description:item.description,fullDescription:item.description,
    shortDescription:item.description.replace(/\s+/g,' ').slice(0,200),price:item.price,priceCurrency:item.currency,
    image:images[0]||null,cover:images[0]||null,images,
    city:item.location.city,district:item.location.district,settlement:item.location.settlement,address:item.location.address,
    status:item.availability.status,statusLabel:item.availability.label,availabilityStatus:item.availability.confirmation,
    features:{rooms:facts.rooms,area:facts.areaM2,livingArea:facts.livingAreaM2,kitchenArea:facts.kitchenAreaM2,floor:facts.floor,totalFloors:facts.floors,landArea:facts.landAreaSot},
    ...(item.publishedAt?{created_at:item.publishedAt}:{}),
    ...(item.floorPlans.length?{floor_plans:item.floorPlans}:{}),url:item.url
  };
}

export function generatedFeeds(listings, recent) {
  const items = listings.filter(active);
  const byId = new Map(items.map(item=>[item.id,item]));
  const baselineIds = new Set(Object.values(recent).flat());
  const fresh = items.filter(item=>item.publishedAt && !baselineIds.has(item.id))
    .sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)||a.id.localeCompare(b.id));
  const files = new Map([['output/catalog/registry.json',asJson(items.map(catalogItem))]]);
  for (const [section,ids] of Object.entries(recent)) {
    const introductory = fresh.filter(item=>section==='home'||categories[item.type]===section);
    const existing = ids.map(id=>byId.get(id)).filter(Boolean);
    files.set(`output/${section}/new-objects.json`,asJson([...introductory,...existing].map(catalogItem)));
  }
  return files;
}

const listLinks = items => items.map(item=>`<li data-registry-id="${esc(item.id)}"><a href="${esc(item.url)}">${esc(item.title)}</a></li>`).join('\n');

const selections = {
  'seo/kvartiry-loc-aksay.html':{type:'apartment',cities:['Аксай'],title:'Квартиры в Аксае'},
  'seo/doma-loc-aksay.html':{type:'house',cities:['Аксай','Аксайский район'],title:'Дома в Аксае и Аксайском районе'},
  'seo/uchastki-loc-aksay.html':{type:'land',cities:['Аксай'],title:'Участки в Аксае'}
};

function updateBlock(html, pattern, replacement, file) {
  if (!pattern.test(html)) throw new Error(`Missing catalog slot: ${file}`);
  return html.replace(pattern,typeof replacement==='function'?replacement:()=>replacement);
}

function selectionCard(item) {
  const id = esc(item.id), url = esc(item.url), title = esc(item.title);
  const summary = esc(item.description.split(/\n\s*\n/)[0]);
  return `<article class="card" data-registry-id="${id}"><div class="card-content"><h2><a href="${url}">${title}</a></h2><p>${summary}</p><div class="card-meta">${esc(money(item.price))}</div><div class="hero-actions" style="margin-top:12px; gap:10px;"><a class="btn secondary" href="${url}">Подробнее об объекте</a><a class="btn" href="${url}#lead-form-section" data-lead-type="buy" data-source-cta="seo_selection" data-object-id="${id}" data-object-type="${esc(item.type)}" data-object-title="${title}" data-object-url="${origin}${url}" aria-label="Связаться по объекту ${id}">Связаться</a></div></div></article>`;
}

export function catalogHtml(file,html,listings,complexPages) {
  if (file==='index.html') {
    const apartments=listings.filter(item=>item.type==='apartment').slice(0,4);
    const houses=listings.filter(item=>item.type==='house').slice(0,2);
    const lands=listings.filter(item=>item.type==='land').slice(0,2);
    const featured=[...apartments,...houses,...lands].map(item=>{
      const image=item.images[0], facts=item.characteristics;
      const details=[facts.rooms?`${facts.rooms} комн.`:null,facts.areaM2?`${facts.areaM2} м²`:null,facts.landAreaSot?`${facts.landAreaSot} сот.`:null];
      const url = esc(item.url);
      const photos = item.images.map(photo => encodeURIComponent(localMediaPath(photo.src) || photo.src)).join('|');
      const many = item.images.length > 1;
      return `<article class="ub-card" data-id="${esc(item.id)}" data-cat="${item.type==='apartment'?'secondary':'houses'}">
        <div class="ub-card__media property-card__gallery" data-images="${esc(photos)}" data-index="0">
          <a href="${url}" class="featured-photo-link" aria-label="${esc(item.title)}"><img class="ub-mediaimg property-card__photo" src="${esc(image.src)}" alt="${esc(image.alt)}" loading="lazy" decoding="async" width="${image.width}" height="${image.height}"></a>
          ${many ? '<button class="property-card__gallery-btn property-card__gallery-btn--prev" type="button" aria-label="Предыдущее фото">‹</button><button class="property-card__gallery-btn property-card__gallery-btn--next" type="button" aria-label="Следующее фото">›</button>' : ''}
        </div>
        <a href="${url}" class="ub-card__body"><div class="ub-price"><strong>${esc(money(item.price))}</strong></div><div class="ub-meta">${details.filter(Boolean).map(value=>`<span>${esc(value)}</span>`).join('')}</div><div class="ub-addr">${esc(item.title)}</div></a>
      </article>`;
    }).join('\n');
    const pattern=/(<!-- featured-listings:start -->)[\s\S]*?(<!-- featured-listings:end -->)/;
    html=updateBlock(html,pattern,(_,start,end)=>`${start}\n${featured}\n${end}`,file);
  }
  const type = Object.keys(categories).find(type=>file===categories[type]+'.html');
  if (type) {
    const items = listings.filter(item=>item.type===type).sort((a,b)=>Number(aksay(b))-Number(aksay(a)));
    const links = listLinks(items);
    const pattern = /(<!-- static-object-links:start -->[\s\S]*?<ul>)[\s\S]*?(<\/ul>[\s\S]*?<!-- static-object-links:end -->)/;
    html = updateBlock(html,pattern,(_,start,end)=>start+links+end,file);
    if (type==='apartment') {
      const count=items.filter(item=>item.location.city==='Аксай').length;
      const suffix=count%10===1&&count%100!==11?'а':count%10>=2&&count%10<=4&&!(count%100>=12&&count%100<=14)?'ы':'';
      html=html.replace(/В Аксае сейчас \d+ квартир[\p{L}]* в реестре\./u,`В Аксае сейчас ${count} квартир${suffix} в реестре.`);
    }
  }
  if (selections[file]) {
    const selection=selections[file];
    const selected=listings.filter(item=>item.type===selection.type&&selection.cities.includes(item.location.city));
    const body=selected.length?selected.map(selectionCard).join('\n'):'<p>Пока нет объектов в этой подборке.</p>';
    html=updateBlock(html,/<div class="cards">\s*(?:<article\b[\s\S]*?<\/article>\s*)*<\/div>/u,`<div class="cards">\n${body}\n</div>`,file);
    const description=selection.title+'. В подборке объектов: '+selected.length+'. Характеристики, описания и связь с агентством. Наличие и условия просмотра уточним при обращении.';
    html=html.replace(/<meta name="description" content="[^"]*">/u,`<meta name="description" content="${esc(description)}">`);
  }
  if (complexPages.includes(file)) {
    const selected=listings.filter(item=>item.complexPages?.includes(file));
    const body=selected.length?`<ul>${listLinks(selected).replaceAll('\n','')}</ul>`:'<p>Обратитесь к нам, чтобы подобрать предложения в этом ЖК.</p>';
    const pattern=/(<h2>Квартиры в продаже в этом ЖК<\/h2>)[\s\S]*?(<h2>Чем поможем<\/h2>)/u;
    if (pattern.test(html)) html=html.replace(pattern,(_,before,after)=>before+body+after);
  }
  return html;
}
