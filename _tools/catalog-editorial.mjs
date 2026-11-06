import { createHash } from 'node:crypto';

// Copy is stored with its property in the existing registry, not in a second catalogue.
export function editorialFingerprint(r) {
  const keys=['id','type','title_raw','description_raw','city','district','settlement','address','area_total','area_conflict','area_living','area_kitchen','lot_area_sotok','rooms','floor','floors','images','floor_plans'];
  return createHash('sha256').update(JSON.stringify(keys.map(key=>[key,r[key]??null]))).digest('hex');
}

export function descriptionText(blocks) {
  return blocks.map(block=>[block.title,...(block.items||[block.text])].filter(Boolean).join('\n')).join('\n\n');
}

export function retainEditorial(record, previous) {
  const {editorial:stale,...fresh}=record;
  const review=previous?.editorial;
  if(!review?.blocks?.length || review.sourceHash!==editorialFingerprint(fresh))return fresh;
  return {...fresh,description_public:descriptionText(review.blocks),editorial:review};
}

const escape = value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
function inline(text) {
  return escape(text).replace(/\d+(?:[.,]\d+)?\s*(?:м²|сот(?:ок|ки|ка)?)(?!\p{L})/u,match=>'<strong>'+match+'</strong>');
}

export function renderDescription(record) {
  const blocks=record.editorial?.blocks;
  if(!blocks?.length)return (record.description_public||'').split(/\n\s*\n/).map(p=>'<p>'+escape(p).replaceAll('\n','<br>')+'</p>').join('');
  if(record.editorial.sourceHash!==editorialFingerprint(record))throw new Error('Editorial copy needs source review: '+record.id);
  return blocks.map(block=>{
    const heading=block.title?'<h3>'+escape(block.title)+'</h3>':'';
    if(block.items)return heading+'<ul>'+block.items.map(item=>'<li>'+inline(item)+'</li>').join('')+'</ul>';
    return heading+'<p>'+inline(block.text)+'</p>';
  }).join('');
}
