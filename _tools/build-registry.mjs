import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parsePrice, parseNumbers, parseLocation } from "./catalog-parser.mjs";
import { writeGenerated } from './write-generated.mjs';
import { normalizeRecord, finalizeDescriptions, publicFacts, heading, metaDescription } from './catalog-presentation.mjs';
import { retainEditorial } from './catalog-editorial.mjs';
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), "utf8").replace(/^\uFEFF/, ""));
const write = (p, value) => writeGenerated(path.join(root,p), typeof value === "string" ? value : JSON.stringify(value, null, 2) + "\n");
export const csv = value => '"' + String(value ?? "").replace(/[ \t]+$/gm,'').replaceAll('"','""') + '"';
const feeds = ["output/apartments/new-objects.json", "output/houses/new-objects.json", "output/lands/new-objects.json", "output/home/new-objects.json"];
export function buildRegistry() {
  const previous = new Map((fs.existsSync(path.join(root,'data/catalog/registry.json'))?read('data/catalog/registry.json'):[]).map(r=>[r.id,r]));
  // Immutable migration evidence; generated feeds must never erase conflicts.
  const snapshotPath = "data/catalog/source-feeds.json";
  if (!fs.existsSync(path.join(root,snapshotPath))) write(snapshotPath, Object.fromEntries(feeds.map(p=>[p,read(p)])));
  const snapshot = read(snapshotPath);
  const objects = new Map();
  function add(id, type, sourcePath, data, base) {
    if (!/^(object|house|land)_\d+$/.test(id)) throw new Error("Invalid property ID: " + id);
    if (!objects.has(id)) objects.set(id, {id,type,sources:[]});
    objects.get(id).sources.push({path:sourcePath, data, base});
  }
  for (const [dir,type] of [["objects","apartment"],["output/houses","house"],["lands","land"]]) {
    for (const id of fs.readdirSync(path.join(root,dir)).sort()) {
      const p = dir + "/" + id + "/data.json";
      if (!fs.existsSync(path.join(root,p))) continue;
      const raw = fs.readFileSync(path.join(root,p),"utf8");
      if (raw.startsWith("\uFEFF")) fs.writeFileSync(path.join(root,p),raw.slice(1));
      add(id,type,p,read(p),dir + "/" + id + "/");
    }
  }
  for (const p of feeds) for (const item of snapshot[p]) {
    if (!["apartment","house","land"].includes(item.type)) continue;
    add(item.id,item.type,p,{...item,description:item.fullDescription || item.description || item.shortDescription || ""},"");
  }
  const registry = finalizeDescriptions([...objects.values()].sort((a,b)=>a.id.localeCompare(b.id,"en")).map(obj=>{
    const source = obj.sources[0], data = source.data;
    const prices = obj.sources.map(s=>({source_path:s.path,price:parsePrice(s.data.price)})).filter(s=>s.price !== null);
    const price_conflict = new Set(prices.map(s=>s.price)).size > 1 ? {sources:prices} : null;
    const images = [...new Set((data.images || (data.image ? [data.image] : [])).map(image=>new URL(image, "https://domian-161.ru/" + source.base).href))];
    const title_raw = data.title || obj.id, description_raw = data.description || "";
    const photo_folder_mismatch = images.some(image=>{
      const folder = image.match(/\/(object_\d+|house_\d+|land_\d+)\//)?.[1];
      return folder && folder !== obj.id;
    });
    return retainEditorial(normalizeRecord({
      id:obj.id,type:obj.type,source_path:source.path,title_raw,description_raw,
      ...parseLocation(title_raw,description_raw,source.path.endsWith("/data.json") ? data : {}),
      ...parseNumbers(title_raw,description_raw,obj.type),
      price:price_conflict ? null : prices[0]?.price ?? null,price_conflict,images,photo_folder_mismatch,
      status:data.is_placeholder === true ? "placeholder" : data.status || null,
      status_source:data.is_placeholder === true || data.status ? source.path : null,
      verifiedAt:data.verifiedAt || null,verifiedBy:data.verifiedBy || null,agent:data.agent || null,
      ...(data.published_at ? {published_at:data.published_at,publication_order:data.publication_order || 0,description_public:description_raw} : {}),
      ...(data.floor_plans?.length ? {floor_plans:data.floor_plans.map(image=>new URL(image,"https://domian-161.ru/"+source.base).href)} : {}),
      listing_urls:data.is_placeholder === true ? [] : [...new Set([...(data.published_at || obj.sources.some(s=>s.path==="output/home/new-objects.json") ? ["/"] : []),"/" + {apartment:"apartments",house:"houses",land:"lands"}[obj.type] + ".html"])]
    }),previous.get(obj.id));
  }));
  write("data/catalog/registry.json",registry);
  const byId = new Map(registry.map(r=>[r.id,r]));
  const publicTitle = r => {
    if(r.type!=="apartment" || !r.area_conflict) return r.title_raw;
    const clean=r.title_raw.replace(/\s*[·,]?\s*\d+(?:[.,]\d+)?\s*(?:м²|м2|кв\.?\s*м\.?)/giu,'').replace(/\s*[·,]\s*$/u,'').trim();
    return clean+(r.area_total!==null?' · '+r.area_total+' м²':'');
  };
  function feedItem(r, old = {}) {
    const {source_path, price_conflict:oldConflict, ...publicOld}=old;
    const p=publicFacts(r);
    const images=r.published_at?r.images.map(image=>image.replace(/^https:\/\/domian-161\.ru(?=\/)/,'')):r.images;
    return {...publicOld,id:r.id,type:r.type,title:heading(r),description:r.description_public,
      fullDescription:r.description_public,shortDescription:r.editorial?.blocks[0]?.text||r.description_public.split(/\n\s*\n/)[0],
      price:p.price,priceCurrency:'RUB',price_conflict:r.price_conflict?true:null,
      image:images[0] || null,cover:images[0] || null,images,
      city:r.city,district:r.district,settlement:r.settlement,address:r.address,status:r.status,statusLabel:r.status_label,
      features:{rooms:r.rooms,area:p.area_total,livingArea:r.area_living,kitchenArea:r.area_kitchen,floor:r.floor,totalFloors:r.floors,landArea:r.lot_area_sotok},
      ...(r.published_at ? {created_at:r.published_at} : {}),
      ...(r.floor_plans?.length ? {floor_plans:r.floor_plans} : {}),
      url:"/obekt/" + r.id + ".html"};
  }
  for (const p of feeds) {
    const existing=snapshot[p].filter(item=>byId.get(item.id)?.status !== "placeholder").map(item=>byId.has(item.id) ? feedItem(byId.get(item.id),item) : item);
    const ids=new Set(existing.map(item=>item.id));
    const type=p.includes('/apartments/')?'apartment':p.includes('/houses/')?'house':p.includes('/lands/')?'land':null;
    const recent=registry.filter(r=>r.published_at && r.status==='active' && !ids.has(r.id) && (!type || r.type===type))
      .sort((a,b)=>b.published_at.localeCompare(a.published_at)||a.publication_order-b.publication_order||a.id.localeCompare(b.id));
    write(p,[...recent.map(r=>feedItem(r)),...existing]);
  }
  // Public projection; internal evidence remains excluded by Jekyll.
  write("output/catalog/registry.json",registry.filter(r=>r.status!=="placeholder").map(r=>feedItem(r)));
  const rows = registry.filter(r=>r.status!=="placeholder" && (r.city === null || r.price_conflict || r.photo_folder_mismatch || r.area_conflict)).map(r=>[
    r.id,r.type,r.title_raw,r.price,r.city_suggested,r.city_evidence,
    [r.city===null?"city_missing":"",r.price_conflict?"price_conflict":"",r.photo_folder_mismatch?"photo_folder_mismatch":"",r.area_conflict?"area_conflict":""].filter(Boolean).join(", "),
    "https://domian-161.ru/obekt/" + r.id + ".html",
    r.area_conflict?.title.join(', '),r.area_conflict?.description.join(', '),r.area_conflict?.evidence.join(' | '),r.area_total
  ].map(csv).join(";"));
  write("docs/owner/registry-to-verify.csv","id;type;title;price;city_suggested;city_evidence;issue;URL на сайте;area_title;area_description;area_evidence;area_selected\n"+rows.join("\n")+"\n");
  write('docs/owner/catalog-completeness-20261103.json',{
    date:'2026-11-03',scope:'publication approval, not individual inspection',
    count:registry.filter(r=>r.status!=='placeholder').length,
    issues:registry.filter(r=>r.status!=='placeholder'&&(r.content_issues.length||r.photo_folder_mismatch||!r.city)).map(r=>({id:r.id,issues:r.content_issues,city:r.city,settlement:r.settlement,photo_folder_mismatch:r.photo_folder_mismatch,source_path:r.source_path}))
  });
  return registry;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = buildRegistry();
  console.log("Registry:",r.length,"properties;",r.filter(r=>r.city===null).length,"without city;",r.filter(r=>r.price_conflict).length,"price conflicts.");
}
