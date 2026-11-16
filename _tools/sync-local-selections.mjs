import fs from 'node:fs';
import { root } from './build-registry.mjs';
import { writeGenerated } from './write-generated.mjs';
import { esc, money, origin } from './public-page.mjs';
import { heading, publicFacts } from './catalog-presentation.mjs';

const records=JSON.parse(fs.readFileSync(root+'/data/catalog/registry.json','utf8'));
const selections=[
  {file:'seo/kvartiry-loc-aksay.html',type:'apartment',cities:['Аксай']},
  {file:'seo/doma-loc-aksay.html',type:'house',cities:['Аксай','Аксайский район']},
  {file:'seo/uchastki-loc-aksay.html',type:'land',cities:['Аксай']}
];
for(const selection of selections) {
  const items=records.filter(r=>r.type===selection.type && (!r.status||r.status==='active') && selection.cities.includes(r.city));
  const cards=items.map(r=>{
    const file='/obekt/'+r.id+'.html',facts=publicFacts(r),title=heading(r);
    return '<article class="card" data-registry-id="'+esc(r.id)+'"><div class="card-content">'
      +'<h2><a href="'+file+'">'+esc(title)+'</a></h2>'
      +'<p>'+esc(r.description_public.split(/\n\s*\n/)[0])+'</p>'
      +'<div class="card-meta">'+esc(money(facts.price))+'</div>'
      +'<div class="hero-actions" style="margin-top:12px; gap:10px;">'
      +'<a class="btn secondary" href="'+file+'">Подробнее об объекте</a>'
      +'<a class="btn" href="'+file+'#lead-form-section" data-lead-type="buy" data-source-cta="seo_selection" data-object-id="'+esc(r.id)+'" data-object-type="'+esc(r.type)+'" data-object-title="'+esc(title)+'" data-object-url="'+origin+file+'" aria-label="Связаться по объекту '+esc(r.id)+'">Связаться</a>'
      +'</div></div></article>';
  }).join('\n');
  const file=root+'/'+selection.file,html=fs.readFileSync(file,'utf8');
  const pattern=/<div class="cards">\s*(?:<article\b[\s\S]*?<\/article>\s*)+<\/div>/u;
  if(!pattern.test(html)) throw new Error('Selection card container missing: '+selection.file);
  const title={apartment:'Квартиры в Аксае',house:'Дома в Аксае и Аксайском районе',land:'Участки в Аксае'}[selection.type];
  const description=title+'. В подборке объектов: '+items.length+'. Характеристики, описания и связь с агентством. Наличие и условия просмотра уточним при обращении.';
  writeGenerated(file,html.replace(pattern,'<div class="cards">\n'+cards+'\n</div>')
    .replace(/<meta name="description" content="[^"]*">/u,'<meta name="description" content="'+esc(description)+'">')
    .replace('Подборка объектов с адресом в указанной локации.','Подборка объектов с указанным городом или районом.'));
  console.log(selection.file+': '+items.length+' registry cards');
}
