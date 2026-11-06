import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {descriptionText, editorialFingerprint} from './catalog-editorial.mjs';
import {decisions} from '../docs/editorial-recovery-20261106/decisions.mjs';

// Reproducible application of the individual review, never a new bulk rewrite.
const revision='942f385bc34c9d02a7b201efa7edcddf9442411b';
const baseline='1976779faf7e22f2818f63a9bb645543f5f53e1d';
const at=(commit,file)=>JSON.parse(execFileSync('git',['show',commit+':'+file],{encoding:'utf8',maxBuffer:16*1024*1024}));
const original=at(revision,'data/catalog/registry.json');
const base=new Map(at(baseline,'data/catalog/registry.json').map(r=>[r.id,r]));
const active=original.filter(r=>r.status!=='placeholder');
const byId=new Map(decisions.map(d=>[d.id,d]));
if(decisions.length!==220||byId.size!==220||active.some(r=>!byId.has(r.id)))throw Error('Review must cover exactly the original 220 IDs');
const snapshot=at(revision,'data/catalog/source-feeds.json');
const copies={},ledger=[];
for(const r of active){
  const d=byId.get(r.id),review=structuredClone(r.editorial);
  if(!d.note)throw Error('Missing individual review: '+r.id);
  if(d.set)review.blocks=d.set.map(text=>({text}));
  if(d.lead)review.blocks[0]={text:d.lead};
  if(d.dropParagraphStarts)review.blocks=review.blocks.filter((b,i)=>!i||!d.dropParagraphStarts.some(s=>b.text?.startsWith(s)));
  for(const [from,to] of d.replace||[]){
    let matches=0;
    const replace=text=>{if(text.includes(from)){matches++;return text.replace(from,to);}return text;};
    review.blocks=review.blocks.map(b=>b.items?{...b,items:b.items.map(replace)}:{...b,text:replace(b.text)});
    if(matches!==1)throw Error('Expected exactly one reviewed replacement: '+r.id+' / '+from+'; got '+matches);
  }
  if(d.append)review.blocks.push(...d.append.map(text=>({text})));
  // No traits inferred from photos survive this review.
  delete review.visualEvidence;
  if(d.sparse)review.allowIdenticalSparseCopy=true;
  if(d.suppressFacts)review.suppressedFacts=d.suppressFacts;
  review.sourceHash=editorialFingerprint(r);
  const after=descriptionText(review.blocks),changed=after!==r.description_public;
  if(!changed&&(d.restored?.length||d.removed?.length))throw Error('Review claims a text change without a diff: '+r.id);
  copies[r.id]=review;
  const source=at(revision,r.source_path);
  ledger.push({id:r.id,sourcePath:r.source_path,review:d.note,changed,
    restored:d.restored||[],removed:d.removed||[],templateAdjusted:!!d.template,
    conflicts:d.conflicts||[],questions:d.questions||[],suppressedPublicFacts:d.suppressFacts||[],
    identicalSparseCopyAllowed:!!d.sparse,
    sourceData:Array.isArray(source)?source.find(item=>item.id===r.id):source,
    sourceFeedEvidence:Object.fromEntries(Object.entries(snapshot).map(([file,items])=>[file,items.filter(item=>item.id===r.id)]).filter(([,items])=>items.length)),
    raw:r.description_raw,publishedBase:base.get(r.id).description_public,
    editorialBefore:r.description_public,after,
    visibleParameters:Object.fromEntries(['area_total','area_living','area_kitchen','area_conflict','lot_area_sotok','rooms','floor','floors','city','district','settlement','address'].map(k=>[k,r[k]??null])),
    existingContentIssues:r.content_issues||[],existingPriceConflict:r.price_conflict||null});
}
const write=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
write('data/catalog/editorial-copy.json',copies);
write('docs/editorial-recovery-20261106/review-ledger.json',ledger);
console.log(JSON.stringify({reviewed:ledger.length,changed:ledger.filter(r=>r.changed).length,restored:ledger.filter(r=>r.restored.length).length,unchanged:ledger.filter(r=>!r.changed).length}));
