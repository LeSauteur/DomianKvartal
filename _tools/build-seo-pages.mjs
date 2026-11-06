import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {root} from './build-registry.mjs';
import {heading,normalizeText,publicFacts} from './catalog-presentation.mjs';
import {esc,money,schema} from './public-page.mjs';
import {propertyDiscoveryMarkup,syncPublicPage} from './sync-public-header.mjs';
import {writeGenerated} from './write-generated.mjs';
import {seoCopy} from './seo-editorial-copy.mjs';

const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const norm=value=>normalizeText(value).toLocaleLowerCase('ru-RU').replaceAll('ё','е').replace(/[«»"ъ.,-]/gu,' ').replace(/\s+/g,' ').trim();
const known=value=>typeof value==='string'&&value&&!/^(?:UNK|Уточняется|Нет данных)/iu.test(value);
const plural=(n,one,few,many)=>n%100>=11&&n%100<=14?many:n%10===1?one:n%10>=2&&n%10<=4?few:many;
const quantity=n=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(n);

export function selection(config,registry) {
  const records=registry.filter(r=>r.status!=='placeholder'&&r.type===config.type);
  const text=r=>norm([r.title_raw,r.description_raw].join(' ').split(/Работаю\s+по|Ваш\s+участковый\s+риэлтор/iu)[0]);
  if(config.selector==='seed')return records.filter(r=>config.originalIds.includes(r.id));
  if(config.selector==='aksay')return records.filter(r=>r.city==='Аксай');
  if(config.selector==='aksay-area')return records.filter(r=>['Аксай','Аксайский район'].includes(r.city));
  if(config.selector==='russian')return records.filter(r=>r.settlement==='Российский');
  if(config.selector==='rostov')return records.filter(r=>r.city==='Ростов-на-Дону');
  if(config.selector==='proletarskiy')return records.filter(r=>r.city==='Ростов-на-Дону'&&/пролетарск/u.test(text(r)));
  if(config.selector==='40-pobedy')return records.filter(r=>r.city==='Ростов-на-Дону'&&/40\s*(?:летия|лет)\s+победы/u.test(text(r)));
  const names=config.projectNames.map(norm);
  return records.filter(r=>names.some(name=>new RegExp('жк\\s+'+name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?=\\s|$)','u').test(text(r))));
}

function summary(records) {
  if(!records.length)return '';
  const type=records[0].type,areas=records.map(r=>publicFacts(r).area_total).filter(n=>typeof n==='number');
  const lots=records.map(r=>r.lot_area_sotok).filter(n=>typeof n==='number');
  const prices=records.map(r=>publicFacts(r).price).filter(n=>typeof n==='number');
  const facts=[['Предложения',records.length+' '+plural(records.length,'объект','объекта','объектов')]];
  const range=values=>Math.min(...values)===Math.max(...values)?quantity(values[0]):quantity(Math.min(...values))+'–'+quantity(Math.max(...values));
  if(areas.length&&type!=='land')facts.push(['Площадь',range(areas)+' м²']);
  if(lots.length&&type!=='apartment')facts.push(['Участки',range(lots)+' сот.']);
  if(prices.length)facts.push(['Стоимость',Math.min(...prices)===Math.max(...prices)?money(prices[0]):money(Math.min(...prices))+' — '+money(Math.max(...prices))]);
  return '<dl class="visibility-facts">'+facts.map(([k,v])=>'<div><dt>'+esc(k)+'</dt><dd>'+esc(v)+'</dd></div>').join('')+'</dl>';
}

function objectCard(record) {
  const p=publicFacts(record),url='/obekt/'+record.id+'.html';
  const text=record.editorial?.blocks[0]?.text||record.description_public.split('\n\n')[0];
  const labels=[p.area_total!==null&&record.type!=='land'?quantity(p.area_total)+' м²':null,record.lot_area_sotok!==null?quantity(record.lot_area_sotok)+' сот.':null,record.floor!==null?'Этаж '+record.floor:null].filter(Boolean);
  return '<article class="card" data-registry-id="'+record.id+'"><div class="card-content"><h2><a href="'+url+'">'+esc(heading(record))+'</a></h2><p>'+esc(text)+'</p><div class="card-meta">'+esc(labels.join(' · '))+'</div><p>'+esc(money(p.price))+'</p><div class="hero-actions"><a class="btn secondary" href="'+url+'">Открыть объект</a><a class="btn" href="'+url+'#lead-form-section" data-lead-type="buy" data-source-cta="seo_object" data-object-id="'+record.id+'" data-object-type="'+record.type+'" data-object-title="'+esc(heading(record))+'" data-object-url="https://domian-161.ru'+url+'">Записаться на просмотр</a></div></div></article>';
}

function projectCard(project) {
  const url='/'+project.detail_url.replace(/^\//,'');
  const facts=[known(project.city)?project.city:null,known(project.address)?project.address:null,known(project.developer)?project.developer:null].filter(Boolean);
  return '<article class="card"><div class="card-content"><h2><a href="'+esc(url)+'">ЖК «'+esc(project.title)+'»</a></h2><p>'+esc(facts.join('. '))+'.</p><a class="btn secondary" href="'+esc(url)+'">О комплексе</a></div></article>';
}

export function buildSeoPages() {
  const configs=read('data/seo/landing-pages.json'),registry=read('data/catalog/registry.json'),projects=read('output/newbuilds/catalog-v3.json').items;
  const coverage=[];
  for(const c of configs){
    const key=c.file.replace(/^seo\//,'').replace(/\.html$/,''),copy=seoCopy[key];
    if(!copy?.length)throw new Error('Missing reviewed SEO copy: '+key);
    const records=selection(c,registry),project=projects.find(p=>p.detail_url&&(c.projectNames||[]).some(name=>norm(name)===norm(p.title)));
    const related=(c.related||[]).map(r=>'<li><a href="/'+esc(r.file)+'">'+esc(r.label)+'</a></li>').join('');
    const selectionTitle=records.length?{apartment:'Квартиры в подборке',house:'Дома в подборке',land:'Участки в подборке'}[c.type]:project?'Информация о комплексе':'Индивидуальный подбор';
    const intro='<section class="hero seo-editorial-hero" style="margin-bottom:24px"><div class="container"><h1>'+esc(c.h1)+'</h1>'+c.hero+'<p>'+esc(copy[0])+'</p></div></section>';
    const article='<section class="container seo-editorial-copy"><h2>'+esc(c.focusTitle)+'</h2><p>'+esc(copy[1])+'</p><p>'+esc(copy[2])+'</p>'+summary(records)+'</section>';
    const cards='<section aria-label="'+esc(selectionTitle)+'"><div class="container"><h2>'+esc(records.length?'Предложения по выбранной локации':selectionTitle)+'</h2></div><div class="cards">'+records.map(objectCard).join('')+(project?projectCard(project):'')+'</div></section>';
    const links='<section class="container seo-editorial-copy"><h2>Продолжить поиск</h2><ul>'+related+'<li><a href="/'+{apartment:'apartments',house:'houses',land:'lands'}[c.type]+'.html">Все '+{apartment:'квартиры',house:'дома',land:'участки'}[c.type]+'</a></li></ul><p><a href="tel:+79536091122">Согласовать подбор и просмотр: +7 953 609-11-22</a></p></section>';
    const listItems=records.map((r,i)=>({'@type':'ListItem',position:i+1,url:'https://domian-161.ru/obekt/'+r.id+'.html',name:heading(r)}));
    if(project)listItems.push({'@type':'ListItem',position:listItems.length+1,url:'https://domian-161.ru/'+project.detail_url.replace(/^\//,''),name:'ЖК «'+project.title+'»'});
    const list=schema({'@context':'https://schema.org','@type':'ItemList',name:c.h1,itemListElement:listItems});
    let html=fs.readFileSync(path.join(root,c.file),'utf8');
    html=html.replace(/<main\b[^>]*>[\s\S]*?<\/main>/iu,'<main>'+intro+propertyDiscoveryMarkup(c.file)+article+cards+links+list+'</main>')
      .replace(/<title>[\s\S]*?<\/title>/iu,'<title>'+esc(c.title)+'</title>')
      .replace(/<meta\b[^>]*name=["']description["'][^>]*>/iu,'<meta name="description" content="'+esc(c.description)+'">');
    if(!html.includes('/assets/css/visibility.css'))html=html.replace('</head>','<link rel="stylesheet" href="/assets/css/visibility.css"></head>');
    writeGenerated(path.join(root,c.file),syncPublicPage(html,c.file));
    coverage.push({file:c.file,objectIds:records.map(r=>r.id),projectId:project?.id||null,omittedPlaceholderIds:c.originalIds.filter(id=>id.startsWith('nb_'))});
  }
  fs.mkdirSync(path.join(root,'docs/editorial-20261106'),{recursive:true});
  fs.writeFileSync(path.join(root,'docs/editorial-20261106/seo-coverage.json'),JSON.stringify(coverage,null,2)+'\n');
  // Refresh counts without revisiting the owner's indexing/canonical decisions.
  const csvFile=path.join(root,'docs/owner/seo-pages-decision.csv');
  const updated=new Map(coverage.map(c=>['https://domian-161.ru/'+c.file,c]));
  const rows=fs.readFileSync(csvFile,'utf8').split(/\r?\n/).map(line=>{
    const url=line.match(/^"([^"]+)"/)?.[1],c=updated.get(url);if(!c)return line;
    const html=fs.readFileSync(path.join(root,c.file),'utf8').match(/<main\b[^>]*>([\s\S]*?)<\/main>/iu)[1];
    const words=html.replace(/<script\b[\s\S]*?<\/script>/giu,'').replace(/<[^>]*>/g,' ').trim().split(/\s+/u).length;
    return line.replace(/^("[^"]+";)"[^"]*";"[^"]*";/u,'$1"'+words+'";"'+c.objectIds.length+'";');
  });
  fs.writeFileSync(csvFile,rows.join('\n'));
  console.log('Edited SEO selections:',coverage.length,'; direct object links:',coverage.reduce((n,c)=>n+c.objectIds.length,0));
  return coverage;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))buildSeoPages();
