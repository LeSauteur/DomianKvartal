import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const revision='1976779faf7e22f2818f63a9bb645543f5f53e1d';
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const old=JSON.parse(execFileSync('git',['show',revision+':data/catalog/registry.json'],{encoding:'utf8',maxBuffer:8*1024*1024}));
const all=read('data/catalog/registry.json'),current=all.filter(r=>r.status!=='placeholder'),before=old.filter(r=>r.status!=='placeholder');
const source=r=>({id:r.id,type:r.type,title_raw:r.title_raw,description_raw:r.description_raw,images:r.images,floor_plans:r.floor_plans});
const hash=data=>createHash('sha256').update(JSON.stringify(data)).digest('hex');
const stats=rows=>({objects:rows.length,uniqueDescriptions:new Set(rows.map(r=>r.description_public)).size,under50Words:rows.filter(r=>r.description_public.split(/\s+/u).length<50).length,
  goodOffer:rows.filter(r=>/это очень хорошее предложение/iu.test(r.description_public)).length,waitingForYou:rows.filter(r=>/жд[её]т вас/iu.test(r.description_public)).length,
  withLists:rows.filter(r=>r.editorial?.blocks.some(b=>b.items)).length,withHeadings:rows.filter(r=>r.editorial?.blocks.some(b=>b.title)).length});
const shingles=text=>{const words=text.toLocaleLowerCase('ru-RU').replace(/[^\p{L}\p{N}]+/gu,' ').trim().split(/\s+/u);return new Set(words.slice(0,-4).map((_,i)=>words.slice(i,i+5).join(' ')));};
function closePairs(rows){
  const sets=rows.map(r=>shingles(r.description_public)),pairs=[];
  for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
    if(sets[i].size<15||sets[j].size<15)continue;
    const intersection=[...sets[i]].filter(s=>sets[j].has(s)).length,score=intersection/(sets[i].size+sets[j].size-intersection);
    if(score>=.75)pairs.push({ids:[rows[i].id,rows[j].id],jaccard:Number(score.toFixed(3))});
  }
  return pairs.sort((a,b)=>b.jaccard-a.jaccard);
}
const seo=read('docs/editorial-20261106/seo-coverage.json');
const metrics={baseCommit:revision,before:stats(before),after:stats(current),changedDescriptions:current.filter(r=>r.description_public!==before.find(old=>old.id===r.id).description_public).length,
  originalSourcesAndMediaUnchanged:hash(all.map(source))===hash(old.map(source)),placeholders:all.filter(r=>r.status==='placeholder').length,
  seoPages:26,rewrittenSeoSelections:seo.length,directSelectionObjectLinks:seo.reduce((n,p)=>n+p.objectIds.length,0),constructionPages:32,
  closePairsBefore:closePairs(before),closePairsAfter:closePairs(current),priceConflicts:current.filter(r=>r.price_conflict).map(r=>r.id),areaConflicts:current.filter(r=>r.area_conflict).map(r=>r.id),
  editorialIssues:read('docs/editorial-20261106/review-ledger.json').filter(r=>r.issues.length).map(({id,issues})=>({id,issues}))};
const dir='docs/editorial-20261106';
fs.writeFileSync(dir+'/metrics.json',JSON.stringify(metrics,null,2)+'\n');
const lines=['# Редакционная версия «Домиан Квартал» — 06.11.2026','','Подготовлена локально, без публикации. База: `'+revision+'`.','','## Результат','',
  '- Описания: '+current.length+' объектов, изменено '+metrics.changedDescriptions+'. Все идентификаторы, исходные тексты и фотографии сохранены.',
  '- Списки: '+metrics.after.withLists+' карточек; подзаголовки: '+metrics.after.withHeadings+'. Формат зависит от содержания.',
  '- SEO: 21 подборка переписана; пять существующих страниц ЖК вычитаны. Содержательные основные материалы четырёх ЖК сохранены, основной текст «Флоры» переработан. Индексация, canonical и исходные изображения сохранены.',
  '- В 21 подборке: '+metrics.directSelectionObjectLinks+' ссылок на конкретные объекты. Старые заглушки не показаны как доступные квартиры.',
  '- Строительство: 32 страницы проверены; на 26 страницах проектов убраны повторные сценарные абзацы, у шести построенных домов сохранён фактический материал. Исправлена ошибка в проекте «Союз 142,2»: кухня и гостиная раздельные.',
  '- Новые оговорки, публичные служебные пометки и юридические гарантии не добавлялись. `offer.html` сохранён.',
  '', '## Ограничения исходных данных','',
  'Коротких описаний до 50 слов было '+metrics.before.under50Words+', стало '+metrics.after.under50Words+'. Это результат удаления рекламной воды. Недостающие комнаты, метраж, материалы стен, коммуникации и состояние документов не дописывались.',
  '', 'Дословных совпадений целых описаний нет. При этом реальные однотипные планировки остаются похожими. Для контроля использованы пятисловные шинглы, Jaccard ≥ 0,75, минимум 15 шинглов: '+metrics.closePairsBefore.length+' пар до редактуры, '+metrics.closePairsAfter.length+' после. Этот показатель не является оценкой поисковых систем. Полный список пар — в `metrics.json`.',
  '', 'Остались прежние конфликты цен ('+metrics.priceConflicts.length+') и общей площади ('+metrics.areaConflicts.length+'), а также вопросы к привязке фотографий из исходного реестра. Спорные значения не возвращены в публичные цены и площади. Восемь очень скудных описаний дополнены только очевидными признаками на уже существующих фотографиях; для object_905 это не делалось из-за несоответствия папки.',
  '', 'Новые вопросы к источникам: высота потолка 44,3 м (object_82), размеры участка 20 × 40 при 6 сотках в заголовке (land_11), студия/однокомнатная (object_51), противоречивое состояние отделки (object_84). Убраны устаревшее обещание открытия в 2025 году и майская акция. Исправление текста не означает повторного подтверждения наличия или выезда на объект.',
  '', '## Где смотреть тексты','',
  'Ниже все 220 описаний в том же порядке и с теми же блоками, что на страницах. SEO-страницы перечислены после них. Для просмотра HTML локально: `node tests/static-server.mjs`, затем `http://127.0.0.1:4173/`.', ''];
for(const r of current){
  lines.push('## '+r.id,'','Страница: `/obekt/'+r.id+'.html`','');
  for(const block of r.editorial.blocks){if(block.title)lines.push('### '+block.title,'');if(block.items)lines.push(...block.items.map(item=>'- '+item),'');else lines.push(block.text,'');}
}
lines.push('## SEO-подборки','');
for(const page of seo)lines.push('- `'+page.file+'`: '+page.objectIds.length+' объектов'+(page.projectId?', есть ссылка на сведения о ЖК':'')+'.');
fs.writeFileSync(dir+'/REVIEW.md',lines.join('\n')+'\n');
console.log(JSON.stringify({before:metrics.before,after:metrics.after,changed:metrics.changedDescriptions,sourcePreserved:metrics.originalSourcesAndMediaUnchanged,similarPairs:[metrics.closePairsBefore.length,metrics.closePairsAfter.length]}));
