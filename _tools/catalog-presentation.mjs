// Presentation is derived from the existing source records; evidence stays private.
import { retainEditorial } from './catalog-editorial.mjs';
export const CATALOG_UPDATED_AT = '2026-11-06';
export const PUBLICATION_APPROVAL = Object.freeze({
  date: '2026-11-03', basis: 'owner-decision', scope: 'continued-publication',
  note: 'Решение владельца от 03.11.2026 о сохранении всех опубликованных объявлений; не индивидуальный осмотр или независимая проверка.'
});
const typeNames = {apartment:'Квартира',house:'Дом',land:'Участок'};
const number = s => Number(String(s).replace(/\s/g,'').replace(',','.'));
const unique = values => [...new Set(values.filter(v=>v!==null&&v!==undefined&&v!==''))];
export function normalizeText(value='') {
  const letters={a:'а',A:'А',c:'с',C:'С',e:'е',E:'Е',o:'о',O:'О',p:'р',P:'Р',x:'х',X:'Х',y:'у',Y:'У',B:'В',H:'Н',K:'К',k:'к',M:'М',m:'м',T:'Т',t:'т'};
  return String(value).normalize('NFC').replace(/[\p{L}]+/gu,word=>/[А-Яа-яЁё]/u.test(word)?word.replace(/[aAcCeEoOpPxXyYBHKkMmTt]/g,c=>letters[c]):word)
    .replace(/[\u00a0\u202f]/g,' ').replace(/[‑–]/g,'-').replace(/\r\n/g,'\n');
}
const propertyText = r => normalizeText([r.title_raw,r.description_raw].join('\n'))
  .split(/(?:Работаю\s+по|Ваш\s+участковый\s+риэлтор|Продажа\s+домов\s+в)/iu)[0]
  .replace(/^.*В Таганроге (?:стоит|размещ).*$/gimu,'');
export function geography(r) {
  const text=propertyText(r), evidence=[];
  const cities=[['Ростов-на-Дону',/Ростов(?:е|а)?[ -]на[ -]Дону/iu],['Аксай',/(?:г\.?\s*|город\s+|в\s+|улиц\s+г\.?\s*)(?:Аксай|Аксае|Аксая)(?!\p{L})/iu],['Батайск',/Батайск(?:е|а)?(?!\p{L})/iu],['Таганрог',/Таганрог(?:е|а)?(?!\p{L})/iu],['Шахты',/Шахт(?:ы|ах)(?!\p{L})/iu]];
  let city=r.city && r.city!=='другое'?r.city:null;
  for(const [name,re]of cities){
    const m=[...text.matchAll(new RegExp(re.source,'giu'))].find(m=>!/(?:до|от|сторон[уы]|направлении|выезд(?:ом)?\s+(?:в|на))\s*(?:г(?:орода)?\.?\s*)?$/iu.test(text.slice(Math.max(0,m.index-70),m.index)));
    if(m){evidence.push(m[0]);if(!city)city=name;}
  }
  // Keep a named locality without guessing which of its namesakes is intended.
  const settlements=[['Большой Лог',/Больш(?:ой|ом)\s+Лог(?:е)?/iu],['Российский',/Российск(?:ий|ом|ого)/iu],['Щепкин',/Щепкин(?:е|а)?(?!\p{L})/iu],['Янтарный',/Янтарн(?:ый|ом|ого)/iu],['Темерницкий',/Темерницк(?:ий|ом|ого)/iu],['Камышеваха',/Камышевах(?:а|е|и)/iu],['Реконструктор',/Реконструктор(?:е|а)?(?!\p{L})/iu],['Мержаново',/Мержаново/iu],['Багаевская',/Багаевск(?:ая|ой|ую)/iu]];
  settlements.push(['Верхнетемерницкий',/Верхнетемерницк(?:ий|ом|ого)/iu],['Октябрьский',/Октябрьск(?:ий|ом|ого)/iu],['Городище',/Городище/iu]);
  const matches=settlements.filter(([,re])=>new RegExp('(?<![\\p{L}])(?:'+re.source+')(?![\\p{L}])','iu').test(text));
  let settlement=r.settlement?normalizeText(r.settlement):null;
  if(settlement&&/^(?:Удобства|Продается|Продаётся|Объект|Квартира)$/iu.test(settlement))settlement=null;
  if(settlement)settlement=settlement.replace(/\s+(?:Аксайского|Продается|Продаётся).*$/iu,'');
  if(matches.length===1){settlement=matches[0][0];evidence.push(text.match(matches[0][1])[0]);}
  let district=r.district||null;
  const dm=text.match(/(Аксайск|Мясниковск|Азовск)(?:ий|ого|ом)\s+(?:район(?:а|е)?|р-н)/iu);
  if(dm){district=dm[1].slice(0,-2)+'ский район';evidence.push(dm[0]);if(!city)city=district;}
  if(district&&settlement&&!r.address&&/территориально|напротив/iu.test(text)&&/в\s+пос\.\s*Верхнетемерницк/iu.test(text)){city=district;evidence.push('Населённый пункт и район указаны до рекламного ориентира');}
  if(!city&&/Ростовская\s+область|Ростовской\s+области/iu.test(text)){city='Ростовская область';evidence.push(text.match(/Ростовск(?:ая|ой)\s+област[ьи]/iu)[0]);}
  // Explicit project locations already present in the same site's local pages.
  if((!city||city==='Ростовская область')&&/ЖК\s*[«"\s]*Вересаев[оа]/iu.test(text)){city='Ростов-на-Дону';evidence.push('ЖК Вересаево; seo/kvartiry-zhk-veresaevo.html');}
  const precision=city==='Ростовская область'?'region':city?.includes('район')?'district':city?'city':settlement?'settlement':null;
  return {city,settlement,district,geography_precision:precision,geography_evidence:unique([r.city_evidence,...evidence])};
}
function pricesIn(text) {
  return unique([...text.matchAll(/(?:цена|стоимость)(?:\s+за\s+один\s+участок)?\s*[:—-]?\s*(?:всего\s*)?(\d[\d ]*(?:[.,]\d+)?)\s*(млн|миллион\p{L}*|тыс\p{L}*|тр(?!\p{L})|₽|руб\p{L}*)/giu)]
    .filter(m=>!/^\s*(?:\/|за\s*)\s*(?:м|сот)/iu.test(text.slice(m.index+m[0].length)))
    .map(m=>number(m[1])*(/^м/iu.test(m[2])?1e6:/^т/iu.test(m[2])?1e3:1)).filter(n=>Number.isFinite(n)&&n>0));
}
function labelled(text,expression,min=0,max=100000) {
  const values=unique([...text.matchAll(expression)].map(m=>number(m[1])).filter(n=>n>min&&n<=max));
  return {value:values.length===1?values[0]:null,values};
}
export function normalizeRecord(r) {
  if(r.status==='placeholder')return r;
  const text=propertyText(r),geo=geography(r),issues=[];
  const rawPrices=pricesIn(text),allPrices=unique([r.price,...rawPrices]);
  const priceConflict=r.price_conflict|| (allPrices.length>1?{sources:[...(r.price!==null?[{source_path:r.source_path,price:r.price}]:[]),...rawPrices.map(price=>({source_path:r.source_path+'#description',price}))]}:null);
  if(priceConflict)issues.push({field:'price',reason:'conflicting_values',values:unique(priceConflict.sources.map(s=>s.price))});
  const square='(?:м²|м2|кв\\.?\\s*м\\.?|квадратных\\s+метров)';
  const living=labelled(text,new RegExp('(?:жилая\\s+площадь|площадь\\s+жилая)\\s*[:—-]?\\s*(\\d+(?:[.,]\\d+)?)\\s*'+square,'giu'));
  const kitchen=labelled(text,new RegExp('(?:площадь\\s+кухни|кухня)\\s*[:—-]?\\s*(\\d+(?:[.,]\\d+)?)\\s*'+square,'giu'));
  let area=r.area_total,areaConflict=r.area_conflict;
  if(r.type==='house'){
    const total=labelled(text,new RegExp('(?:общ(?:ая|ей)\\s+площад(?:ь|ью)(?:\\s+дома)?|площадь\\s+дома|дом\\s+площадью|(?:^|\\n)\\s*площадь)\\s*(?:[:—-]|составляет)?\\s*(\\d+(?:[.,]\\d+)?)\\s*'+square,'giu'));
    if(total.value!==null&&area===null)area=total.value;
    if(total.values.length>1||(total.value!==null&&area!==null&&total.value!==area))areaConflict={title:area===null?[]:[area],description:total.values,evidence:[],reason:'conflicting_total_area'};
  }
  if(areaConflict)issues.push({field:'area_total',reason:areaConflict.reason,values:unique([...(areaConflict.title||[]),...(areaConflict.description||[])])});
  if(living.values.length>1)issues.push({field:'area_living',reason:'conflicting_values',values:living.values});
  if(kitchen.values.length>1)issues.push({field:'area_kitchen',reason:'conflicting_values',values:kitchen.values});
  const rooms=labelled(text,/(?:количество\s+комнат|комнат)\s*:\s*(\d{1,2})(?!\d)/giu,0,30).value;
  const address=normalizeText(r.description_raw).match(/(?:Адрес\s*:\s*|по\s+адресу\s*:\s*)([^\n]+)/iu)?.[1]?.split(/(?:Цена|Стоимость|Основные\s+параметры|Тип\s+объекта|Количество\s+комнат|Общая\s+площадь|Этаж|Расположение|Инфраструктура)\s*:|\s+Общая\s+площадь|,\s*евро[- ]\d|,?\s*(?:дом\s+\d+\s*кв|—|\s-\s)/iu)[0]?.trim().replace(/[.,\s]+$/u,'');
  const result={...r,...geo,address:r.address||address||null,area_total:area,area_conflict:areaConflict,area_living:living.value,area_kitchen:kitchen.value,
    rooms:r.rooms??rooms,
    floor:r.floor??(r.type==='apartment'?labelled(text,/(?:^|\n)\s*(\d{1,3})\s*этаж(?!\p{L})/giu,0,200).value:null),
    lot_area_sotok:r.lot_area_sotok??(r.type==='land'?labelled(normalizeText(r.title_raw),/(\d+(?:[.,]\d+)?)\s*сот(?:ок|ки|ка|\.)?/giu,0,100000).value:null),
    price:priceConflict?null:r.price??rawPrices[0]??null,price_conflict:priceConflict,
    price_currency:'RUB',status:'active',status_label:'Актуально',content_updated_at:CATALOG_UPDATED_AT,
    publication_approval:{...PUBLICATION_APPROVAL},content_issues:issues};
  result.description_public=cleanDescription(result);
  return retainEditorial(result,r);
}
export function publicFacts(r) {
  return {...r,area_total:r.area_conflict?null:r.area_total,price:r.price_conflict?null:r.price,
    area_living:r.editorial?.suppressedFacts?.includes('area_living')?null:r.area_living};
}
export function locationLabel(r) {return unique([r.city,r.settlement,r.address]).join(', ')||r.district||'';}
export function heading(r) {
  const p=publicFacts(r),facts=[p.rooms===null?null:p.rooms+' комн.',p.area_total===null?null:p.area_total+' м²',p.type==='land'&&p.lot_area_sotok!==null?p.lot_area_sotok+' сот.':null,p.type==='apartment'&&p.floor!==null?'этаж '+p.floor:null].filter(Boolean);
  return typeNames[p.type]+(facts.length?' '+facts.join(', '):'')+(locationLabel(p)?' — '+locationLabel(p):'');
}
export const amount = price => price===null?'Цена по запросу':new Intl.NumberFormat('ru-RU').format(price)+' ₽';
export function cleanDescription(r) {
  let raw=normalizeText(r.description_raw||'').split(/(?:Работаю\s+по|Ваш\s+участковый\s+риэлтор|Продажа\s+домов\s+в)/iu)[0];
  raw=raw.replace(/https?:\/\/\S+/giu,'').replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/giu,'')
    .replace(/(?:\+7|8)\s*\(?\d{3}\)?[\s-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}/g,'')
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D★☆✓✔✅🔹•⦁*]/gu,'').replace(/!+/g,'.').replace(/#[\p{L}\d_]+/gu,'');
  raw=raw.replace(/\s+(?=(?:Цена|Стоимость|Основные\s+параметры|Тип\s+объекта|Количество\s+комнат|Общая\s+площадь|Жилая\s+площадь|Площадь\s+кухни|Этаж|Расположение|Район|Инфраструктура|Условия\s+сделки|Планировка|Санузел|Балкон|Состояние|Дополнительно|Материал\s+дома|Год\s+постройки|Высота\s+потолков|Тип\s+жилья|Удобства\s+в\s+доме)\s*:)/gu,'\n');
  raw=raw.replace(/(^|[^\p{L}])(ул|г|п|х|д|кв|м|пер|пр|обл|мкр|пос|руб|р)\./giu,'$1$2\uE000');
  const blocks=raw.split(/\n+|(?<=[.!?])\s+(?=[А-ЯЁA-Z])/u).map(s=>s.replaceAll('\uE000','.').replace(/^\s*(?:\d+[.)]\s*|[-—:]\s*)/u,'').trim()).filter(Boolean);
  const kept=[];
  for(let line of blocks){
    if(/^(?:ищете(?=\s|[,?])|остались\s+вопросы|просто\s+берите|отвечу\s+на|не\s+откладывайте|выгодные\s+условия|если\s+объявление\s+актуально|что\s+(?:получаете|остаётся)|возможность\s+создать\s+дом\s+своей\s+мечты)|новый\s+двухконтурный\s+клиентов|стабильный\s+доход/iu.test(line))continue;
    line=line.replace(/\s*Почему\s+(?:стоит|нужно)[\s\S]*$/iu,'').replace(/\s*—\s*(?:заезжайте|вам\s+не\s+нужно|продумано\s+всё|сами\s+регулируете|особенно\s+оценят|никаких\s+согласований|прозрачная\s+сделка)[\s\S]*$/iu,'')
      .replace(/всю\s+необходимую\s+инвентарь/giu,'весь необходимый инвентарь').replace(/в\s+доме\s+и\s+выполнение/giu,'В доме выполнен').replace(/дворе\s+борудована/giu,'дворе оборудована').replace(/большая\s+гостиную/giu,'большую гостиную').replace(/дом\s+мечты/giu,'дом');
    const priceAt=line.search(/(?:цена|стоимость)(?:\s+за\s+один\s+участок)?\s*[:—-]?\s*(?:всего\s*)?\d/iu);
    if(priceAt>0)line=line.slice(0,priceAt).trim().replace(/[.…\s]+$/u,'');
    if(/оставля(?:й|йте)|долго\s+не\s+(?:стоят|ждут)|только\s+реальные\s+объекты|за\s+наличный\s+расчет|^каждая\s+женщина|^всех,?\s+кто|^для\s+кого|^кому\s+подойдёт|^хотите\s+жить|^живите\s+в\s+элитн|^ваш[аи]?\s+(?:новый\s+)?(?:дом|мечта)|^кухня-гостиная\s+мечты|^чудесный\s+вариант|квартиру\s+мечты|^организую|^покажу|^продажа\s+от\s+собственника|^экология\s+и\s+транспорт|^объект:\s*квартира|^статус:\s*в\s+продаже/iu.test(line))continue;
    line=line.replace(/\s*[—-]\s*(?:наслаждайтесь|создайте|поддерживайте|ощущение|приватность|экономия)[\s\S]*$/iu,'')
      .replace(/\s*\([^)]*!?[^)]*\)/gu,m=>/готово\s+для\s+вашего|баланс\s+приватности|экономия\s+на\s+черновых/iu.test(m)?'':m)
      .replace(/,?\s*никто\s+не\s+затопит\s+и\s+по\s+голове\s+не\s+бегает,?/iu,',')
      .replace(/супер\s+вид,?\s*/iu,'').replace(/заходи\s+и\s+живи|заезжай\s+и\s+живи/giu,'')
      .replace(/жд[её]т\s+своих\s+новых\s+владельцев/giu,'').replace(/\bRЕНАU\b/gu,'REHAU');
    line=line.replace(/\s*[—-]\s*(?:идеальн\p{L}*\s+(?:место|вариант|решение|сочетание)|отличн\p{L}*\s+(?:место|вариант|сочетание)|всё\s+для\s+комфорта)[\s\S]*$/iu,'').trim();
    if(/(?:звоните|позвоните|пишите|обращайтесь|не\s+упустите|одобрени|ипотек|маткапитал|первоначальн|рассрочк|^продажа\s+от\s+ип|^вариант\s+\d|^ссылка|^в\s+таганроге\s+(?:стоит|размещ)|мы\s+не\s+торопимся|по\s+стоимости\s+хотелось|представьте\s+себе|^почему\s|^что\s+вас\s+ждёт|^что\s+вы\s+получаете|это\s+не\s+просто|ваш\s+шанс|дом\s+вашей\s+мечты|экологически\s+чист|инвестиц|всё\s+для\s+комфортной|идеальное\s+(?:место|решение|сочетание)|отличное\s+(?:место|предложение|сочетание)|уникальн\p{L}*\s+предложение|^срочн\p{L}*\s+продажа)/iu.test(line))continue;
    if(/(?:цена|стоимость|(?<!\p{L})торг(?!\p{L})|\d\s*(?:млн|миллион|тыс\.|₽|рубл))/iu.test(line))continue;
    if(/^(?:преимущества|характеристики|об\s+объекте|о\s+квартире|в\s+доме|функциональные\s+зоны|нет[, .]|инфраструктура\s+в\s+шаговой\s+доступности)[\s:!?.]*$/iu.test(line))continue;
    if(r.area_conflict&&/\d+(?:[.,]\d+)?\s*(?:м²|м2|кв\.?\s*м\.?)/iu.test(line)){
      const conflicting=new Set([...(r.area_conflict.title||[]),...(r.area_conflict.description||[])]);
      if([...line.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:м²|м2|кв\.?\s*м\.?)/giu)].some(m=>conflicting.has(number(m[1]))))continue;
    }
    if(/(?:наши[^.!?]*коттеджи|всё\s+продумано\s+до\s+мелочей|дом,\s+построенный\s+c?\s*душой|представляем\s+исключительное\s+предложение|^свежий\s+воздух|^премиальное\s+качество|^отличное\s+расположение\.?$|^подробная\s+информация|возможен\s+показ\s+в\s+удобное|вроде\s+ровный)/iu.test(line))continue;
    line=line.replace(/(?:шикарн|роскошн|великолепн|прекрасн|эксклюзивн|идеальн|добротн)(?:ый|ая|ое|ые|ую|ого|ой|ые|ых)\s+/giu,'')
      .replace(/[,\s]*(?:что\s+)?гаранти[\s\S]*$/iu,'').replace(/лучш(?:ий|ая|ее|ие|ую|их)\s+/giu,'').replace(/самые\s+низкие\s+/giu,'')
      .replace(/(?:—|-)\s*(?:идеально|отлично|всё|все|лучше\s+не\s+бывает)[\s\S]*$/iu,'')
      .replace(/(^|\s)(?:Продаю|Продаем|Продаём)(?=\s)/giu,'$1Продаётся').replace(/Предлагаем\s+вашему\s+вниманию\s+/giu,'')
      .replace(/\s*\(бабушка\s+была\s+строител[ьб]\)/giu,'').replace(/^Нет,\s*/iu,'')
      .replace(/\s{2,}/g,' ').replace(/\s+([,.;:])/g,'$1').replace(/^[,;:\s-]+|[,;:\s-]+$/g,'').replace(/\s*[—-]\s*\.$/u,'.').trim();
    if(line.length<10||line.split(/\s+/).length<2||/\d+\s*кв[.\s]*$/iu.test(line)||/^Отличное\s+расположение[.!]?$/iu.test(line)||/^Прода[её]тся\s+(?:квартира|участок\s+с\s+территорией\s+и\s+местоположением)[.!]?$/iu.test(line))continue;
    const letters=line.match(/\p{L}/gu)||[],caps=line.match(/\p{Lu}/gu)||[];
    if(letters.length>4&&caps.length/letters.length>0.7)line=line.toLocaleLowerCase('ru-RU');
    line=line.replace(/(?<!\p{L})[cC](?=\s+[А-Яа-яЁё])/gu,'с').replace(/(?<!\p{L})[Bb](?=\s+[А-Яа-яЁё])/gu,'в').replace(/(?<!\p{L})[Kk](?=\s+[А-Яа-яЁё])/gu,'к')
      .replace(/(?<!\p{L})[kк][bв]\s*[mм](?!\p{L})/giu,'м²').replace(/\.{2,}/g,'.').replace(/\s+\./g,'.').replace(/,\s*,/g,',').trim();
    line=line[0].toLocaleUpperCase('ru-RU')+line.slice(1);
    if(!/[.!?]$/.test(line))line+='.';
    if(!kept.some(s=>s.toLocaleLowerCase('ru-RU')===line.toLocaleLowerCase('ru-RU')))kept.push(line);
  }
  if(kept.length){
    if(!/дом|квартир|участ|коттедж|таунхаус|дач|студи/iu.test(kept[0]))kept.unshift(heading(r)+'.');
    return kept.join('\n\n');
  }
  const p=publicFacts(r),facts=[p.area_total!==null?'Общая площадь — '+p.area_total+' м²':null,p.lot_area_sotok!==null?'Площадь участка — '+p.lot_area_sotok+' сот.':null,p.rooms!==null?'Количество комнат — '+p.rooms:null,p.floor!==null?'Этаж — '+p.floor+(p.floors!==null?' из '+p.floors:''):null].filter(Boolean);
  const name=r.type==='house'&&/коттедж/iu.test(r.title_raw)?'Коттедж':typeNames[r.type];
  const photos=r.images.length;
  return [name+(locationLabel(p)?'. '+locationLabel(p):''),...facts,amount(p.price),photos?'В галерее — '+photos+' '+(photos%10===1&&photos%100!==11?'фотография':photos%10>=2&&photos%10<=4&&!(photos%100>=12&&photos%100<=14)?'фотографии':'фотографий'):null].filter(Boolean).map(s=>s.replace(/[.\s]+$/u,'')+'.').join(' ');
}
export function finalizeDescriptions(records) {
  const openings = {
    house_14:'Одноэтажный дом площадью 100 м² на участке 5 соток в посёлке Октябрьский Аксайского района.',
    house_23:'Одноэтажный дом площадью 150 м² на участке 5 соток с широким фасадом и придомовой территорией.',
    house_32:'В посёлке Октябрьский Аксайского района продаётся одноэтажный дом с предчистовой отделкой.',
    house_42:'Дом площадью 115 м² на участке 6 соток с кухней-столовой и выходом на террасу.',
    house_50:'Дом 115 м² с тремя изолированными спальнями, кухней-столовой и участком 6 соток.',
    house_70:'Продаётся одноэтажный дом 150 м² с участком 5 соток и широким фасадом.',
    object_01:'Двухкомнатная квартира 55,1 м² с дизайнерским ремонтом в ЖК «Новый Аксай», на Объездной улице, 7к5.',
    object_40:'Двухкомнатная квартира 76 м² на 11-м этаже 19-этажного дома: Ростов-на-Дону, улица 40-летия Победы, 85.',
    object_46:'Двухкомнатная квартира с дизайнерским ремонтом в доме 2021 года в Ростове-на-Дону.',
    object_54:'Квартира с двумя изолированными комнатами, мебелью и техникой в Ростове-на-Дону, в доме 2021 года.',
    object_55:'В Ростове-на-Дону продаётся двухкомнатная квартира 76 м² на улице 40-летия Победы, 85; комнаты изолированы.',
    object_99:'Квартира с дизайнерским ремонтом, индивидуальным отоплением и тёплыми полами на кухне и в санузле.'
  };
  for(const r of records)if(openings[r.id]&&!r.editorial){
    const paragraphs=r.description_public.split('\n\n');
    paragraphs[0]=openings[r.id];
    r.description_public=paragraphs.join('\n\n');
  }
  const groups=new Map();
  for(const r of records.filter(r=>r.status!=='placeholder')){const key=r.description_public;const group=groups.get(key)||[];group.push(r);groups.set(key,group);}
  for(const group of groups.values())if(group.length>1&&!group.every(r=>r.editorial?.allowIdenticalSparseCopy===true))throw new Error('Duplicate descriptions need editorial review: '+group.map(r=>r.id).join(', '));
  return records;
}
export function metaDescription(r) {
  // The real catalogue number distinguishes identical source listings without inventing facts.
  const prefix=heading(r)+'. '+amount(r.price_conflict?null:r.price)+'. ';
  const detail=r.description_public.replace(/\s+/g,' ').trim();
  const text=(prefix+detail).replace(/\s+/g,' ');
  const short=text.length>195?text.slice(0,170).replace(/\s+\S*$/u,'').replace(/[.,;:\s]+$/u,'')+'…':text.replace(/[.\s]+$/u,'');
  return short+' · № '+Number(r.id.split('_')[1])+'.';
}
