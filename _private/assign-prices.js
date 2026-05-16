const fs = require('fs');
const path = require('path');
const root = process.cwd();

const FALLBACK = {
  apartmentPpsm: 195500,
  newbuildPpsm: 195500,
  housePpsm: 74000,
  landPerSot: 260000,
  commercialPpsm: 120000,
  constructionPpsm: 80000
};

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const n of fs.readdirSync(dir)) {
    const p = path.join(dir, n);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}

function readJson(f) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } }
function writeJson(f, data) { fs.writeFileSync(f, JSON.stringify(data, null, 2) + '\n', 'utf8'); }

function num(v) {
  if (v == null) return null;
  const s = String(v).replace(/\s+/g,'').replace(',', '.');
  const m = s.match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function parsePrice(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const cleaned = s.replace(/[^0-9,\.]/g,'').replace(',', '.');
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0 || n < 1000) return null;
  return Math.round(n);
}

function formatPrice(n) {
  const x = Math.max(500000, Math.round(n / 50000) * 50000);
  return x.toLocaleString('ru-RU') + ' ₽';
}

function inferType(item, rel) {
  const explicit = (item && item.type ? String(item.type) : '').toLowerCase();
  if (explicit.includes('apart')) return 'apartment';
  if (explicit.includes('newbuild')) return 'newbuild';
  if (explicit.includes('house')) return 'house';
  if (explicit.includes('land')) return 'land';
  if (explicit.includes('commercial')) return 'commercial';
  if (explicit.includes('construction')) return 'construction';

  const p = rel.toLowerCase();
  if (p.includes('/output/houses/')) return 'house';
  if (p.includes('/lands/')) return 'land';
  if (p.includes('newbuild')) return 'newbuild';

  const t = [item?.title, item?.description, item?.shortDescription].filter(Boolean).join(' ').toLowerCase();
  if (/(\u0443\u0447\u0430\u0441\u0442|\u0438\u0436\u0441|\u0441\u043e\u0442)/.test(t)) return 'land';
  if (/(\u0434\u043e\u043c|\u043a\u043e\u0442\u0442\u0435\u0434\u0436|\u0442\u0430\u0443\u043d\u0445\u0430\u0443\u0441)/.test(t)) return 'house';
  if (/(\u0436\u043a|\u043d\u043e\u0432\u043e\u0441\u0442\u0440\u043e\u0439)/.test(t)) return 'newbuild';
  if (/(\u043a\u043e\u043c\u043c\u0435\u0440\u0446|\u043e\u0444\u0438\u0441|\u0441\u043a\u043b\u0430\u0434|\u043f\u043e\u043c\u0435\u0449\u0435\u043d)/.test(t)) return 'commercial';
  return 'apartment';
}

function extractRooms(item) {
  const direct = num(item?.rooms ?? item?.meta?.rooms ?? item?.features?.rooms);
  if (direct && direct > 0 && direct < 10) return Math.round(direct);
  const text = [item?.title, item?.description, item?.shortDescription].filter(Boolean).join(' ');
  const m = text.match(/(\d+)\s*[- ]?\s*(?:\u043a\u043e\u043c\u043d|\u043a\u043e\u043c\u043d\u0430\u0442)/i);
  return m ? Number(m[1]) : null;
}

function extractArea(item) {
  const candidates = [item?.area, item?.totalArea, item?.square, item?.meta?.area, item?.features?.area, item?.features?.totalArea];
  for (const c of candidates) {
    const n = num(c);
    if (n && n > 10 && n < 1000) return n;
  }
  const text = [item?.title, item?.description, item?.shortDescription].filter(Boolean).join(' ');
  const m = text.match(/(\d+(?:[\.,]\d+)?)\s*м(?:²|2)?/i);
  return m ? num(m[1]) : null;
}

function extractLand(item) {
  const candidates = [item?.landArea, item?.plotArea, item?.meta?.landArea, item?.features?.landArea];
  for (const c of candidates) {
    const n = num(c);
    if (n && n > 0.5 && n < 500) return n;
  }
  const text = [item?.title, item?.description, item?.shortDescription].filter(Boolean).join(' ');
  const m = text.match(/(\d+(?:[\.,]\d+)?)\s*(?:\u0441\u043e\u0442|\u0441\u043e\u0442\u043a)/i);
  return m ? num(m[1]) : null;
}

function median(arr) {
  const a = arr.filter(Number.isFinite).sort((x,y)=>x-y);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m-1] + a[m]) / 2;
}

function targetFiles() {
  const files = [];
  walk(path.join(root, 'objects')).forEach(f => {
    const r = path.relative(root, f).replace(/\\/g,'/');
    if (/^objects\/object_[^/]+\/data\.json$/.test(r)) files.push(f);
  });
  walk(path.join(root, 'output')).forEach(f => {
    const r = path.relative(root, f).replace(/\\/g,'/');
    if (/^output\/houses\/house_[^/]+\/data\.json$/.test(r)) files.push(f);
    if (/^output\/(home|apartments|houses|newbuilds)\/new-objects\.json$/.test(r)) files.push(f);
  });
  return [...new Set(files)];
}

const files = targetFiles();
const entries = [];
for (const file of files) {
  const data = readJson(file);
  if (!data) continue;
  const rel = path.relative(root, file).replace(/\\/g,'/');
  if (Array.isArray(data)) {
    data.forEach((item, idx) => entries.push({file, rel, array: true, idx, item}));
  } else {
    entries.push({file, rel, array: false, idx: null, item: data});
  }
}

const priced = [];
for (const e of entries) {
  const p = parsePrice(e.item?.price);
  if (!p) continue;
  priced.push({
    type: inferType(e.item, e.rel),
    price: p,
    rooms: extractRooms(e.item),
    area: extractArea(e.item),
    land: extractLand(e.item)
  });
}

const types = ['apartment','newbuild','house','land','commercial','construction'];
const byTypePpsm = {}, byTypeMedian = {}, byTypeRoomPpsm = {}, byTypeRoomMedian = {};
for (const t of types) {
  const arr = priced.filter(x => x.type === t);
  byTypeMedian[t] = median(arr.map(x => x.price));
  byTypePpsm[t] = t === 'land'
    ? median(arr.filter(x => x.land).map(x => x.price / x.land))
    : median(arr.filter(x => x.area).map(x => x.price / x.area));
  byTypeRoomPpsm[t] = {}; byTypeRoomMedian[t] = {};
  for (let r=1; r<=5; r++) {
    const rr = arr.filter(x => x.rooms === r);
    byTypeRoomMedian[t][r] = median(rr.map(x => x.price));
    byTypeRoomPpsm[t][r] = median(rr.filter(x => x.area).map(x => x.price / x.area));
  }
}

function estimate(item, rel) {
  const type = inferType(item, rel);
  const rooms = extractRooms(item);
  const area = extractArea(item);
  const land = extractLand(item);
  let n = null;

  if (type === 'land') {
    const per = byTypePpsm.land || FALLBACK.landPerSot;
    n = land ? land * per : (byTypeMedian.land || 1600000);
  } else {
    const roomPpsm = rooms ? byTypeRoomPpsm[type]?.[rooms] : null;
    const ppsm = roomPpsm || byTypePpsm[type] || (
      type === 'apartment' ? FALLBACK.apartmentPpsm :
      type === 'newbuild' ? FALLBACK.newbuildPpsm :
      type === 'house' ? FALLBACK.housePpsm :
      type === 'commercial' ? FALLBACK.commercialPpsm :
      FALLBACK.constructionPpsm
    );
    n = area ? area * ppsm : ((rooms ? byTypeRoomMedian[type]?.[rooms] : null) || byTypeMedian[type] || (type === 'house' ? 7400000 : 5200000));
  }

  if (type === 'house') { if (n < 2500000) n = 2500000; if (n > 25000000) n = 25000000; }
  if (type === 'apartment' || type === 'newbuild') { if (n < 2200000) n = 2200000; if (n > 22000000) n = 22000000; }
  if (type === 'land') { if (n < 450000) n = 450000; if (n > 18000000) n = 18000000; }

  return Math.round(n);
}

const changed = [];
const assignedById = new Map();

for (const e of entries) {
  if (/^output\/(home|apartments|houses|newbuilds)\/new-objects\.json$/.test(e.rel)) continue;
  if (parsePrice(e.item?.price)) continue;
  const v = formatPrice(estimate(e.item, e.rel));
  e.item.price = v;
  if (e.item?.id) assignedById.set(String(e.item.id), v);
  changed.push({file: e.rel, id: e.item?.id || '', title: e.item?.title || '', price: v});
}

for (const e of entries) {
  if (!/^output\/(home|apartments|houses|newbuilds)\/new-objects\.json$/.test(e.rel)) continue;
  if (parsePrice(e.item?.price)) continue;
  const id = e.item?.id ? String(e.item.id) : '';
  const v = (id && assignedById.get(id)) || formatPrice(estimate(e.item, e.rel));
  e.item.price = v;
  changed.push({file: `${e.rel}[#${e.idx}]`, id, title: e.item?.title || '', price: v});
}

const byFile = new Map();
for (const e of entries) {
  if (!byFile.has(e.file)) byFile.set(e.file, readJson(e.file));
}
for (const [file, data] of byFile.entries()) {
  if (Array.isArray(data)) {
    const es = entries.filter(x => x.file === file).sort((a,b)=>a.idx-b.idx);
    for (const x of es) data[x.idx] = x.item;
    writeJson(file, data);
  } else {
    const one = entries.find(x => x.file === file);
    if (one) writeJson(file, one.item);
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  fallbackUsed: FALLBACK,
  pricedComparablesCount: priced.length,
  changedCount: changed.length,
  sample: changed.slice(0, 50)
};
fs.mkdirSync(path.join(root, '_private'), { recursive: true });
const reportPath = path.join(root, '_private', 'price-assignment-report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');

console.log('files=' + files.length);
console.log('priced_comps=' + priced.length);
console.log('changed=' + changed.length);
console.log('report=' + path.relative(root, reportPath).replace(/\\/g,'/'));
