import fs from 'node:fs';
import { root } from './build-registry.mjs';
import { writeGenerated } from './write-generated.mjs';
import local from '../_private/local-newbuild-projects.js';

const file=root+'/output/newbuilds/catalog-v3.json';
const catalog=JSON.parse(fs.readFileSync(file,'utf8'));
const projects=JSON.parse(fs.readFileSync(root+'/data/zhk/aksay.json','utf8'));
catalog.items=local.syncLocalProjects(catalog.items,projects);
catalog.item_count=catalog.items.length;
catalog.completeness_counts=catalog.items.reduce((counts,item)=>{
  counts[item.completeness.state]=(counts[item.completeness.state]||0)+1;
  return counts;
},{});
writeGenerated(file,JSON.stringify(catalog,null,2)+'\n');
const page=root+'/newbuilds.html';
const html=fs.readFileSync(page,'utf8');
writeGenerated(page,html.replace(/(<strong id="nbTotalStat">)\d+(<\/strong>)/u,(_,start,end)=>start+catalog.item_count+end));
console.log('Local projects synchronized; catalog:',catalog.item_count);
