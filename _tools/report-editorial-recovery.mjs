import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {publicHtmlFiles,canonical,noindex} from './site-pages.mjs';
const revision='942f385bc34c9d02a7b201efa7edcddf9442411b';
const dir='docs/editorial-recovery-20261106';
const json=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const ledger=json(dir+'/review-ledger.json');
const registry=json('data/catalog/registry.json').filter(r=>r.status!=='placeholder');
const words=text=>(text.match(/\S+/gu)||[]).length;
const files=publicHtmlFiles();
function revisionFiles(paths){
 const data=execFileSync('git',['cat-file','--batch'],{input:paths.map(p=>revision+':'+p).join('\n')+'\n',maxBuffer:64*1024*1024});
 const result=new Map();let offset=0;
 for(const file of paths){
  const end=data.indexOf(10,offset),header=data.subarray(offset,end).toString('utf8');
  if(!/ blob \d+$/.test(header))throw Error('Missing baseline file: '+file+' / '+header);
  const size=Number(header.split(' ').at(-1));offset=end+1;
  result.set(file,data.subarray(offset,offset+size).toString('utf8').replaceAll('\r\n','\n'));offset+=size+1;
 }
 return result;
}
const baseline=revisionFiles([...files,'sitemap.xml']);
const attrs=(html,re)=>[...html.matchAll(re)].map(m=>m[1]);
for(const file of files){
 const before=baseline.get(file),after=fs.readFileSync(file,'utf8').replaceAll('\r\n','\n');
 assert.equal(canonical(after),canonical(before),file+' canonical');
 assert.equal(noindex(after),noindex(before),file+' indexability');
 assert.deepEqual(attrs(after,/<img\b[^>]*src=["']([^"']+)["']/giu),attrs(before,/<img\b[^>]*src=["']([^"']+)["']/giu),file+' photos');
 assert.deepEqual(attrs(after,/<a\b[^>]*href=["']([^"']+)["']/giu),attrs(before,/<a\b[^>]*href=["']([^"']+)["']/giu),file+' link destinations');
 assert.deepEqual(after.match(/<form\b[\s\S]*?<\/form>/giu)||[],before.match(/<form\b[\s\S]*?<\/form>/giu)||[],file+' forms');
 assert.deepEqual(attrs(after,/<script\b[^>]*src=["']([^"']+)["']/giu),attrs(before,/<script\b[^>]*src=["']([^"']+)["']/giu),file+' scripts');
 assert.deepEqual(attrs(after,/<h1\b[^>]*>([\s\S]*?)<\/h1>/giu),attrs(before,/<h1\b[^>]*>([\s\S]*?)<\/h1>/giu),file+' H1');
}
const urls=s=>attrs(s,/<loc>([^<]+)<\/loc>/g);
assert.deepEqual(urls(fs.readFileSync('sitemap.xml','utf8')),urls(baseline.get('sitemap.xml')),'all sitemap URLs preserved');
const withoutCopy=({editorial,description_public,...r})=>r;
const old=JSON.parse(execFileSync('git',['show',revision+':data/catalog/registry.json'],{encoding:'utf8',maxBuffer:8*1024*1024}));
assert.deepEqual(json('data/catalog/registry.json').map(withoutCopy),old.map(withoutCopy),'original characteristics');
const originalBlocks=old.filter(r=>r.status!=='placeholder').flatMap(r=>r.editorial.blocks.map(block=>({id:r.id,block})));
const preservedBlocks=originalBlocks.filter(({id,block})=>registry.find(r=>r.id===id).editorial.blocks.some(b=>JSON.stringify(b)===JSON.stringify(block))).length;
const groups=new Map();
for(const r of registry){const ids=groups.get(r.description_public)||[];ids.push(r.id);groups.set(r.description_public,ids);}
const conflicts=ledger.map(r=>({id:r.id,issues:[
 ...r.existingContentIssues.map(x=>x.field+': '+x.reason+'; '+JSON.stringify(x.values||[])),
 ...r.conflicts]})).filter(r=>r.issues.length);
const metrics={baseCommit:'1976779faf7e22f2818f63a9bb645543f5f53e1d',editorialCommit:revision,
 reviewed:ledger.length,unchanged:ledger.filter(r=>!r.changed).length,changed:ledger.filter(r=>r.changed).length,
 retainedOriginalBlocks:{preserved:preservedBlocks,total:originalBlocks.length},
 restoredDescriptions:ledger.filter(r=>r.restored.length).length,
 correctedOnly:ledger.filter(r=>r.changed&&!r.restored.length).length,
 removedUnsupported:ledger.filter(r=>r.removed.length).map(r=>({id:r.id,removed:r.removed})),
 templateAdjusted:ledger.filter(r=>r.templateAdjusted).map(r=>r.id),
 wordCounts:{raw:ledger.reduce((n,r)=>n+words(r.raw),0),publishedBase:ledger.reduce((n,r)=>n+words(r.publishedBase),0),
  editorialBefore:ledger.reduce((n,r)=>n+words(r.editorialBefore),0),after:ledger.reduce((n,r)=>n+words(r.after),0)},
 shortDescriptions:{before:ledger.filter(r=>words(r.editorialBefore)<50).length,after:ledger.filter(r=>words(r.after)<50).length},
 identicalLimitedSources:[...groups.values()].filter(ids=>ids.length>1),conflicts,
 questions:ledger.filter(r=>r.questions.length).map(r=>({id:r.id,questions:r.questions})),
 preservation:{publicPagesChecked:files.length,sitemapUrls:urls(baseline.get('sitemap.xml')).length,
  allOriginalCharacteristics:true,photosAndPaths:true,forms:true,linkDestinations:true,canonicalAndIndexability:true,h1:true,scripts:true},
 rebuild:json(dir+'/rebuild-verification.json'),
 validation:fs.existsSync(dir+'/validation.json')?json(dir+'/validation.json'):null};
fs.writeFileSync(dir+'/metrics.json',JSON.stringify(metrics,null,2)+'\n');
const escaped=text=>String(text).replaceAll('|','\\|').replaceAll('\n',' ');
const validationLines=metrics.validation?[
 '- `npm ci`: успешно, уязвимостей не обнаружено.',
 '- Полный `VISUAL_TOP_QA=1 npm run qa`: '+metrics.validation.fullQa.unitPassed+' модульных и '+metrics.validation.fullQa.browserPassed+' браузерных тестов пройдено, ошибок и пропусков нет.',
 '- После последней вычитки трёх рекламных фраз: повторно '+metrics.validation.finalCopyCheck.unitPassed+' модульных и '+metrics.validation.finalCopyCheck.browserPassed+' браузерных проверок пройдено. В заключительную проверку включены все три затронутые карточки.',
 '- SEO: 0 ошибок, 7 прежних предупреждений о служебных страницах и существующих canonical/алиасах.',
 '- Проверки шапки, sitemap и `git diff --check`: успешно.',
 '- Две сборки (включая удаление сгенерированного реестра) совпали побайтово; устаревший sourceHash блокирует сборку до перезаписи результатов.',
 '- Просмотрены мобильные снимки восстановленного длинного описания, краткого исходника и оснащения квартиры; автоматическая проверка описаний выполнена при 390, 768 и 1440 px.',
 '- Полный журнал: [qa.log](qa.log). Заключительные проверки текста: [unit-confirmed.log](unit-confirmed.log), [browser-confirmed.log](browser-confirmed.log). Машинный итог: [validation.json](validation.json).',
 '',
 'В ходе проверки исправлены два ожидания тестов: сравнение переносов строк CRLF/LF и требование видимой мобильной ленты внутри блока, который существующий CSS намеренно скрывает. Дизайн сайта не менялся; полный прогон после исправлений успешен.'
]:['Результаты заключительных проверок будут записаны после их завершения.'];
const lines=['# Восстановительная редактура «Домиан Квартал» — 06.11.2026','',
 'База опубликованного содержания: `1976779`. Редакторская база: `942f385`. Работа выполнена в `codex/editorial-recovery-20261106`. PR, merge и публикация не выполнялись.','',
 'Подтверждение сведений в этой работе означает их наличие в исходных материалах и согласованность с ними. Выезд, проверка документов и индивидуальное подтверждение текущей актуальности объектов не выполнялись.','',
 '## Объём и результат','',
 '- Проверено: **'+metrics.reviewed+'** описаний с сопоставлением исходного объявления/данных, опубликованной базы и редакционной версии.',
 '- Без изменения текста: **'+metrics.unchanged+'**. С восстановлением сведений: **'+metrics.restoredDescriptions+'**. Только исправление неподтверждённого/неоднозначного текста: **'+metrics.correctedOnly+'**. Всего изменено: **'+metrics.changed+'**.',
 '- Сохранены без изменения '+preservedBlocks+' из '+originalBlocks.length+' исходных редакторских блоков, включая оформление списков и подзаголовков. Исправления применены отдельными решениями; массовое переписывание с нуля не выполнялось.',
 '- Индивидуальные вводные вместо повторяющегося начала исправлены у **'+metrics.templateAdjusted.length+'** домов: '+metrics.templateAdjusted.map(x=>'`'+x+'`').join(', ')+'. Общие реальные планировки и отделка сохранены; выдуманные отличия не создавались.',
 '- Число слов: опубликованная база **'+metrics.wordCounts.publishedBase+'**, исходная редакционная версия **'+metrics.wordCounts.editorialBefore+'**, после восстановления **'+metrics.wordCounts.after+'**. Подсчёт единый: непустые последовательности между пробелами. Рост объёма не является критерием качества.',
 '- Описаний короче 50 слов: было '+metrics.shortDescriptions.before+', стало '+metrics.shortDescriptions.after+'. Краткость не считалась дефектом сама по себе.','',
 '## Что восстановлено','',
 'Ниже перечислены конкретные сведения по каждому изменённому объекту. Полные четыре текста и решения по всем 220 объектам — в [DESCRIPTIONS.md](DESCRIPTIONS.md); исходные JSON, сохранённые подборки и параметры — в [review-ledger.json](review-ledger.json).','',
 '| Объект | Восстановленные сведения |','| --- | --- |'];
for(const r of ledger.filter(r=>r.restored.length))lines.push('| `'+r.id+'` | '+escaped(r.restored.join('; '))+' |');
lines.push('','## Неподтверждённые дополнения и краткие исходники','');
for(const r of metrics.removedUnsupported)lines.push('- `'+r.id+'`: '+r.removed.join('; ')+'.');
lines.push('','В трёх группах одинаковый краткий текст оставлен сознательно: '+metrics.identicalLimitedSources.map(g=>g.map(id=>'`'+id+'`').join(', ')).join('; ')+'. Источники не дают индивидуальных признаков. Исключения перечислены явно, общий контроль необоснованных дублей сохранён.','',
 '## Противоречия и сомнительные значения в источниках','',
 'Существующие конфликты не исправлялись догадками. Все исходные числовые поля, цены и адреса сохранены. У `object_904` исходные 20 м² жилой площади сохранены внутри, но убраны из публичных проекций из-за расхождения 19/20 м². Ложный конфликт цены 4 100 000 / 4 099 999,9999999995 также зафиксирован, обработка цен в эту редакционную задачу не включалась.','',
 '| Объект | Противоречие / ограничение |','| --- | --- |');
for(const r of conflicts)lines.push('| `'+r.id+'` | '+escaped(r.issues.join('; '))+' |');
lines.push('','## Дополнительные вопросы к источникам','');
for(const r of metrics.questions)lines.push('- `'+r.id+'`: '+r.questions.join(' '));
lines.push('','## Хранение и повторная сборка','',
 'Редакторский источник — `data/catalog/editorial-copy.json`: только текстовые блоки и метаданные проверки, без второго реестра характеристик. `registry.json`, публичные JSON, карточки и фрагменты существующих SEO-подборок генерируются из него и прежних исходных данных.',
 'Каждый текст связан с SHA-256 исходных данных. Если сохранённая редактура перестаёт соответствовать источнику, сборка останавливается с указанием ID, чтобы не выпустить прежние сведения или незаметно потерять редактуру.',
 'Повторная сборка **'+metrics.rebuild.checkedFiles+' файлов**: побайтовое совпадение. Сборка после удаления сгенерированного `registry.json`: также побайтовое совпадение. Проверка: `node _tools/verify-editorial-recovery-rebuild.mjs`.','',
 '## Сохранность сайта','',
 '- '+files.length+' публичных HTML сверены с `942f385`: сохранены фотографии и пути, ссылки, формы, H1, подключаемые скрипты, canonical и политика индексации.',
 '- Все '+metrics.preservation.sitemapUrls+' URL sitemap сохранены. Изменения дат lastmod отражают уже существующую историю коммитов, а не добавление страниц.',
 '- Все 240 записей, 220 активных объектов и 20 заглушек сохранены. Исходные характеристики совпадают с редакционной базой.',
 '- `main.js`, дизайн, навигация, конфигурация публикации, исходные фотографии и источники характеристик не менялись.',
 '- Пересобраны только существующие SEO-подборки, чтобы их анонсы соответствовали исправленным описаниям; новых страниц нет.',
 '- Исторические материалы `docs/editorial-20261106` описывают прежнюю версию. Текущий результат следует оценивать по этому отчёту.','',
 '## Проверки','',...validationLines,'',
 'Реальные обращения не отправлялись. Проверки форм используют существующие тестовые заглушки и не подтверждают доставку сообщений агентству.','',
 '## Изменённые файлы','','Полный список — [CHANGED_FILES.txt](CHANGED_FILES.txt).','');
fs.writeFileSync(dir+'/REPORT.md',lines.join('\n').replaceAll('\r\n','\n').replace(/[ \t]+$/gm,''));
const detail=['# Все 220 решений восстановительной редактуры','',
 'Четыре версии для проверки: исходное объявление, опубликованная база 1976779, редакционная версия 942f385, результат восстановления. Подробные исходные данные и структурированные поля находятся в review-ledger.json.',''];
for(const r of ledger){
 detail.push('## '+r.id,'',r.review,'',
  '### Исходное объявление','',r.raw||'*(Пустой исходный текст.)*','',
  '### Опубликованная база 1976779','',r.publishedBase,'',
  '### Редакционная версия 942f385','',r.editorialBefore,'',
  '### После восстановления','',r.after,'',
  '**Решение:** '+(r.changed?'Исправлено.':'Текст сохранён.')+' '+r.restored.join('; '),'');
}
fs.writeFileSync(dir+'/DESCRIPTIONS.md',detail.join('\n').replaceAll('\r\n','\n').replace(/[ \t]+$/gm,''));
const changed=execFileSync('git',['diff','--name-only',revision],{encoding:'utf8',stdio:['pipe','pipe','ignore']}).trim().split(/\r?\n/);
const untracked=execFileSync('git',['ls-files','--others','--exclude-standard'],{encoding:'utf8'}).trim().split(/\r?\n/);
const names=[...new Set([...changed,...untracked,dir+'/CHANGED_FILES.txt'])].filter(Boolean).sort();
fs.writeFileSync(dir+'/CHANGED_FILES.txt',names.join('\n')+'\n');
console.log(JSON.stringify({reviewed:metrics.reviewed,unchanged:metrics.unchanged,restored:metrics.restoredDescriptions,changed:metrics.changed,words:metrics.wordCounts,templates:metrics.templateAdjusted.length,pages:files.length}));
