import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parsePrice, parseNumbers, parseLocation } from "./catalog-parser.mjs";
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), "utf8").replace(/^\uFEFF/, ""));
const write = (p, value) => { fs.mkdirSync(path.dirname(path.join(root,p)), {recursive:true}); fs.writeFileSync(path.join(root,p), typeof value === "string" ? value : JSON.stringify(value, null, 2) + "\n"); };
export const csv = value => '"' + String(value ?? "").replaceAll('"','""') + '"';
const feeds = ["output/apartments/new-objects.json", "output/houses/new-objects.json", "output/lands/new-objects.json", "output/home/new-objects.json"];
export function buildRegistry() {
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
  const registry = [...objects.values()].sort((a,b)=>a.id.localeCompare(b.id,"en")).map(obj=>{
    const source = obj.sources[0], data = source.data;
    const prices = obj.sources.map(s=>({source_path:s.path,price:parsePrice(s.data.price)})).filter(s=>s.price !== null);
    const price_conflict = new Set(prices.map(s=>s.price)).size > 1 ? {sources:prices} : null;
    const images = [...new Set((data.images || (data.image ? [data.image] : [])).map(image=>new URL(image, "https://domian-161.ru/" + source.base).href))];
    const title_raw = data.title || obj.id, description_raw = data.description || "";
    const photo_folder_mismatch = images.some(image=>{
      const folder = image.match(/\/(object_\d+|house_\d+|land_\d+)\//)?.[1];
      return folder && folder !== obj.id;
    });
    return {
      id:obj.id,type:obj.type,source_path:source.path,title_raw,description_raw,
      ...parseLocation(title_raw,description_raw,source.path.endsWith("/data.json") ? data : {}),
      ...parseNumbers(title_raw,description_raw,obj.type),
      price:price_conflict ? null : prices[0]?.price ?? null,price_conflict,images,photo_folder_mismatch,
      status:data.status || null,status_source:data.status ? source.path : null,
      verifiedAt:data.verifiedAt || null,verifiedBy:data.verifiedBy || null,agent:data.agent || null,
      listing_urls:[...new Set([...(obj.sources.some(s=>s.path==="output/home/new-objects.json") ? ["/"] : []),"/" + {apartment:"apartments",house:"houses",land:"lands"}[obj.type] + ".html"])]
    };
  });
  write("data/catalog/registry.json",registry);
  const byId = new Map(registry.map(r=>[r.id,r]));
  function feedItem(r, old = {}) {
    return {...old,id:r.id,type:r.type,title:r.title_raw,description:r.description_raw,
      fullDescription:r.description_raw,shortDescription:r.description_raw.slice(0,200),
      price:r.price === null ? null : r.price,price_conflict:r.price_conflict,
      image:r.images[0] || null,cover:r.images[0] || null,images:r.images,
      city:r.city,district:r.district,settlement:r.settlement,address:r.address,status:r.status,
      features:{rooms:r.rooms,area:r.area_total,floor:r.floor,totalFloors:r.floors,landArea:r.lot_area_sotok},
      url:"/obekt/" + r.id + ".html",source_path:r.source_path};
  }
  for (const p of feeds) write(p,snapshot[p].map(item=>byId.has(item.id) ? feedItem(byId.get(item.id),item) : item));
  // Public projection; internal evidence remains excluded by Jekyll.
  write("output/catalog/registry.json",registry.map(r=>feedItem(r)));
  const rows = registry.filter(r=>r.city === null || r.price_conflict || r.photo_folder_mismatch).map(r=>[
    r.id,r.type,r.title_raw,r.price,r.city_suggested,r.city_evidence,
    [r.city===null?"city_missing":"",r.price_conflict?"price_conflict":"",r.photo_folder_mismatch?"photo_folder_mismatch":""].filter(Boolean).join(", "),
    "https://domian-161.ru/obekt/" + r.id + ".html"
  ].map(csv).join(";"));
  write("docs/owner/registry-to-verify.csv","id;type;title;price;city_suggested;city_evidence;issue;URL на сайте\n"+rows.join("\n")+"\n");
  return registry;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = buildRegistry();
  console.log("Registry:",r.length,"properties;",r.filter(r=>r.city===null).length,"without city;",r.filter(r=>r.price_conflict).length,"price conflicts.");
}
