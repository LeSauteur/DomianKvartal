import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { root, inside, origin, readJson } from '../src/paths.mjs';
import { validateListings } from '../src/listings.mjs';
import { localMediaPath } from '../src/media.mjs';

const date = () => new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Moscow'}).format(new Date());
const labels = {active:'В каталоге',reserved:'Забронирован',sold:'Продан',archived:'Снят с публикации'};
const types = {apartment:'Квартира',house:'Дом',land:'Участок'};

function save(file,records) {
  validateListings(records);
  const temporary=file+'.tmp';
  fs.writeFileSync(temporary,JSON.stringify(records,null,2)+'\n',{flag:'wx'});
  try {fs.renameSync(temporary,file);}
  finally {if(fs.existsSync(temporary)) fs.unlinkSync(temporary);}
}

export function runListingCommand(args, workspace=root) {
  const [operation,target,value]=args;
  const file = path.join(workspace,'src/data/listings.json');
  const records = validateListings(readJson(file));
  if (operation==='init') {
    if (!/^[a-z][a-z0-9_-]*$/.test(target||'') || !Object.hasOwn(types,value)) throw new Error('listing init <id> <apartment|house|land>');
    if (records.some(item=>item.id===target)) throw new Error(`ID already exists: ${target}`);
    const url = `/obekt/${target}.html`;
    const title = types[value];
    const draft={schemaVersion:1,id:target,type:value,url,published:false,title,description:'',price:null,currency:'RUB',
      location:{city:null,settlement:null,district:null,address:null,precision:null},
      characteristics:{areaM2:null,livingAreaM2:null,kitchenAreaM2:null,rooms:null,floor:null,floors:null,landAreaSot:null},
      availability:{status:'active',label:labels.active,confirmation:'unverified',verifiedAt:null,verifiedBy:null},
      images:[],floorPlans:[],seo:{title:title+' | Домиан Квартал',description:'',canonical:origin+url,robots:null},
      contentUpdatedAt:null,publishedAt:null,complexPages:[]};
    const draftFile=inside(workspace,`output/drafts/${target}.json`);
    fs.mkdirSync(path.dirname(draftFile),{recursive:true});
    fs.writeFileSync(draftFile,JSON.stringify(draft,null,2)+'\n',{flag:'wx'});
    return draftFile;
  }
  if (operation==='save') {
    const input = inside(workspace,target||'');
    const item = validateListings([readJson(input)])[0];
    const index = records.findIndex(current=>current.id===item.id);
    if (index>=0 && value!=='--replace') throw new Error(`ID already exists: ${item.id}`);
    if (index<0 && item.published) throw new Error('Save new objects as drafts first');
    if (index>=0) {
      if (records[index].published!==item.published || records[index].availability.status!==item.availability.status) throw new Error('Change visibility with the status command');
      records[index]={...item,contentUpdatedAt:date()};
    } else records.push(item);
    save(file,records);
    return `Запись сохранена: ${item.id}`;
  }
  if (operation==='status' && Object.hasOwn(labels,value)) {
    const item = records.find(current=>current.id===target);
    if (!item) throw new Error(`Unknown ID: ${target}`);
    if (!item.published && value!=='active') throw new Error('A draft needs an active listing before changing its sales status');
    if (!item.published) {
      if (item.title.trim()===types[item.type] || !item.description.trim() || !item.seo.title.trim() || !item.seo.description.trim() || !item.images.length) {
        throw new Error('Fill title, description, meta description and at least one photo');
      }
      item.published=true;
      item.publishedAt=date();
    }
    for (const source of [...item.images.map(image=>image.src),...item.floorPlans]) {
      const local=localMediaPath(source);
      if (!local || !fs.existsSync(inside(path.join(workspace,'public'),decodeURIComponent(local.slice(1))))) throw new Error(`Missing media: ${source}`);
    }
    item.availability={status:value,label:labels[value],confirmation:'unverified',verifiedAt:null,verifiedBy:null};
    item.contentUpdatedAt=date();
    save(file,records);
    return `Локальный статус ${item.id}: ${labels[value]}`;
  }
  throw new Error('listing init <id> <type> | save <project-relative.json> [--replace] | status <id> <active|reserved|sold|archived>');
}

if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {console.log(runListingCommand(process.argv.slice(2)));}
  catch (error) {console.error(error.message);process.exitCode=1;}
}
