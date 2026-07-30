const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const DATA_PATH = path.join(ROOT, "output", "newbuilds", "catalog-v3.json");
const SITEMAP_PATH = path.join(ROOT, "sitemap.xml");
const errors = [];
const warnings = [];

function fail(message) { errors.push(message); }
function warn(message) { warnings.push(message); }
function exists(relative) { return fs.existsSync(path.join(ROOT, relative)); }
function clean(value) { return String(value ?? "").trim(); }
function normalize(value) { return clean(value).toLocaleLowerCase("ru-RU").replace(/ё/g, "е").replace(/[^a-zа-я0-9]+/gi, ""); }
function hash(file) { return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }
function validHttp(url) { try { return /^https?:$/.test(new URL(url).protocol); } catch { return false; } }

function webpDimensions(buffer) {
  if (buffer.length < 30 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") return null;
  const type = buffer.toString("ascii", 12, 16);
  if (type === "VP8X") return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) };
  if (type === "VP8 ") {
    for (let i = 20; i < Math.min(buffer.length - 9, 80); i += 1) {
      if (buffer[i] === 0x9d && buffer[i + 1] === 0x01 && buffer[i + 2] === 0x2a) {
        return { width: buffer.readUInt16LE(i + 3) & 0x3fff, height: buffer.readUInt16LE(i + 5) & 0x3fff };
      }
    }
  }
  if (type === "VP8L" && buffer.length >= 25) {
    const bits = buffer.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return null;
}

function pngDimensions(buffer) {
  const signature = "89504e470d0a1a0a";
  if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== signature) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function jpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) { offset += 1; continue; }
    const marker = buffer[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) { offset += 2; continue; }
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2 || offset + length + 2 > buffer.length) return null;
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }
    offset += length + 2;
  }
  return null;
}

function rasterDimensions(buffer) {
  return webpDimensions(buffer) || pngDimensions(buffer) || jpegDimensions(buffer);
}

function expectedCompleteness(item) {
  const checks = [item.city, item.address, item.developer, item.status, item.description, item.official_url, item.checked_at, item.cover?.src, item.images.length >= 3, item.detail_url];
  const missing = checks.filter((value) => !value).length;
  if (missing === 0) return "complete";
  if (item.official_url || item.images.length || item.checked_at) return "partial";
  if (!item.checked_at && !item.official_url && item.source_type === "aggregator") return "needs_review";
  return "legacy";
}

if (!fs.existsSync(DATA_PATH)) fail("catalog-v3.json is missing");
const data = errors.length ? { items: [] } : JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
if (data.schema_version !== 3) fail("schema_version must be 3");
if (!Array.isArray(data.items)) fail("items must be an array");
if (data.items.length !== 78) fail(`expected 78 items, found ${data.items.length}`);
if (data.item_count !== data.items.length) fail("item_count does not match items length");

const ids = new Set();
const slugs = new Set();
const names = new Set();
const activeMedia = new Set();
const mediaHashes = new Map();
let detailPages = 0;
let activeImages = 0;

for (const [index, item] of data.items.entries()) {
  const label = `${index + 1}:${clean(item.title) || "untitled"}`;
  if (!item.id || ids.has(item.id)) fail(`${label} duplicate or missing id`); else ids.add(item.id);
  if (!item.slug || slugs.has(item.slug)) fail(`${label} duplicate or missing slug`); else slugs.add(item.slug);
  const name = normalize(item.title);
  if (!name || names.has(name)) fail(`${label} duplicate or missing normalized title`); else names.add(name);
  if (!item.city) warn(`${label} city is missing`);
  if (item.price?.value !== null && (!Number.isFinite(item.price.value) || item.price.value < 100000)) fail(`${label} suspicious price ${item.price?.value}`);
  if (item.price?.value === null && item.price?.type !== "on_request") fail(`${label} missing price must use on_request`);
  if (item.price?.value !== null && !item.price?.verified) fail(`${label} active price is not verified`);
  const serialized = JSON.stringify(item);
  if (/\b(?:NaN|undefined)\b/.test(serialized) || /"(?:null|undefined|NaN)"/i.test(serialized)) fail(`${label} contains invalid text value`);
  if (item.official_url && !validHttp(item.official_url)) fail(`${label} invalid official_url`);
  if (item.official_url && /etagi\./i.test(item.official_url)) fail(`${label} aggregator used as official_url`);
  if (item.completeness?.state !== expectedCompleteness(item)) fail(`${label} incorrect completeness state`);

  const coverIsGalleryImage = (item.images || []).some((media) => media.src === item.cover?.src);
  if (item.cover?.src && !coverIsGalleryImage) {
    activeImages += 1;
    if (!["legacy", "user_provided"].includes(item.cover.source_type)) fail(`${label} fallback cover has unsupported source_type`);
    if (/etagi/i.test(item.cover.src)) fail(`${label} fallback cover path contains Etazhi marker`);
    const coverFile = path.join(ROOT, item.cover.src);
    if (!fs.existsSync(coverFile)) fail(`${label} missing fallback cover ${item.cover.src}`);
    else {
      const coverStat = fs.statSync(coverFile);
      if (coverStat.size < 5000) fail(`${label} fallback cover too small ${item.cover.src} (${coverStat.size} bytes)`);
      const coverDimensions = rasterDimensions(fs.readFileSync(coverFile));
      if (!coverDimensions) fail(`${label} unreadable fallback cover ${item.cover.src}`);
      else if (coverDimensions.width < 200 || coverDimensions.height < 120) fail(`${label} fallback cover dimensions too small ${item.cover.src} (${coverDimensions.width}x${coverDimensions.height})`);
    }
  }

  const projectHashes = new Set();
  for (const media of [...(item.images || []), ...(item.floorplans || [])]) {
    activeImages += 1;
    if (!media.src || activeMedia.has(media.src)) fail(`${label} duplicate or missing active media path ${media.src}`);
    activeMedia.add(media.src);
    if (/newbuilds-v2|etagi/i.test(media.src + " " + media.source_url)) fail(`${label} active media points to legacy/Etazhi source`);
    if (!validHttp(media.source_url)) fail(`${label} media source_url is invalid`);
    const file = path.join(ROOT, media.src || "");
    if (!fs.existsSync(file)) { fail(`${label} missing media ${media.src}`); continue; }
    const stat = fs.statSync(file);
    if (stat.size < 18000) fail(`${label} media too small ${media.src} (${stat.size} bytes)`);
    const dimensions = webpDimensions(fs.readFileSync(file));
    if (!dimensions) fail(`${label} unreadable WebP ${media.src}`);
    else if (dimensions.width < 480 || dimensions.height < 320) fail(`${label} media dimensions too small ${media.src} (${dimensions.width}x${dimensions.height})`);
    const digest = hash(file);
    if (projectHashes.has(digest)) fail(`${label} duplicate image content inside project`);
    projectHashes.add(digest);
    if (mediaHashes.has(digest)) warn(`${label} shares media content with ${mediaHashes.get(digest)}`); else mediaHashes.set(digest, label);
  }

  if (item.detail_url) {
    detailPages += 1;
    const pagePath = path.join(ROOT, item.detail_url, "index.html");
    if (!fs.existsSync(pagePath)) fail(`${label} detail page missing ${item.detail_url}`);
    else {
      const html = fs.readFileSync(pagePath, "utf8");
      if (!html.includes(item.title)) fail(`${label} title missing from detail HTML`);
      if (!html.includes(`https://domian-161.ru/${item.detail_url}`)) fail(`${label} canonical missing from detail HTML`);
      if (/etagi\./i.test(html)) fail(`${label} detail HTML contains Etazhi link`);
      if (/undefined|>null<|NaN/.test(html)) fail(`${label} detail HTML contains invalid text`);
    }
  }
}

const sitemap = fs.existsSync(SITEMAP_PATH) ? fs.readFileSync(SITEMAP_PATH, "utf8") : "";
for (const item of data.items.filter((entry) => entry.detail_url)) {
  if (!sitemap.includes(`https://domian-161.ru/${item.detail_url}`)) fail(`${item.title} missing from sitemap`);
}

for (const required of ["assets/js/newbuilds-catalog.js", "assets/css/newbuilds-catalog.css", "assets/css/newbuild-detail.css", "newbuilds.html"]) {
  if (!exists(required)) fail(`required file missing: ${required}`);
}

const stateCounts = data.items.reduce((acc, item) => { acc[item.completeness.state] = (acc[item.completeness.state] || 0) + 1; return acc; }, {});
console.log(`cards=${data.items.length}`);
console.log(`detail_pages=${detailPages}`);
console.log(`active_images=${activeImages}`);
console.log(`completeness=${JSON.stringify(stateCounts)}`);
console.log(`errors=${errors.length}`);
console.log(`warnings=${warnings.length}`);
for (const message of warnings) console.log(`WARN ${message}`);
for (const message of errors) console.error(`ERROR ${message}`);
if (errors.length) process.exitCode = 1;
