const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const publicFile = path.join(root, "output", "newbuilds", "newbuilds-v2-merged.json");
const privateFile = path.join(root, "_private", "output", "newbuilds", "newbuilds-v2.json");
const badText = /^(?:undefined|null|nan)$/i;

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
}

function present(value) {
  return value !== null && value !== undefined && String(value).trim() !== "" && !badText.test(String(value).trim());
}

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\b(?:жк|жилой комплекс|жилой район)\b/gi, " ")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .trim();
}

function numericPrice(value) {
  const digits = String(value == null ? "" : value).replace(/\D/g, "");
  return digits ? Number(digits) : null;
}

function validHttpUrl(value) {
  if (!present(value)) return false;
  try {
    const parsed = new URL(String(value));
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (_error) {
    return false;
  }
}

const data = readJson(publicFile);
const mirror = readJson(privateFile);
const errors = [];
const warnings = [];
const seenNames = new Map();
const seenSlugs = new Map();
const seoSlugs = new Set(
  fs.readdirSync(path.join(root, "seo"))
    .filter((name) => /^zhk-.*\.html$/i.test(name))
    .map((name) => name.replace(/\.html$/i, ""))
);

if (!Array.isArray(data) || !data.length) errors.push("Public catalog is not a non-empty array");
if (JSON.stringify(data) !== JSON.stringify(mirror)) errors.push("Public and private V2 JSON copies differ");

const missing = {
  city: 0,
  developer: 0,
  status: 0,
  checked_at: 0,
  class: 0,
  description: 0,
  official_url: 0
};

data.forEach((item, index) => {
  const label = `#${index + 1} ${item.title || "(untitled)"}`;
  ["title", "address", "image", "source_url", "source_type", "price_type"].forEach((field) => {
    if (!present(item[field])) errors.push(`${label}: missing ${field}`);
  });

  Object.keys(missing).forEach((field) => {
    if (!present(item[field])) missing[field] += 1;
  });

  const nameKey = `${normalizeName(item.title)}|${normalizeName(item.city)}`;
  if (seenNames.has(nameKey)) errors.push(`${label}: duplicate normalized name with ${seenNames.get(nameKey)}`);
  else seenNames.set(nameKey, label);

  if (present(item.slug)) {
    const slug = String(item.slug).trim().toLowerCase();
    if (seenSlugs.has(slug)) errors.push(`${label}: duplicate slug with ${seenSlugs.get(slug)}`);
    else seenSlugs.set(slug, label);
    if (seoSlugs.has(slug)) errors.push(`${label}: slug conflicts with seo/${slug}.html`);
  }

  const price = numericPrice(item.price);
  if (price !== null && price < 100000) errors.push(`${label}: suspicious price ${item.price}`);
  if (item.price_type === "on_request" && price !== null) warnings.push(`${label}: on_request item also contains a numeric price`);
  if (item.price_type !== "on_request" && price === null) errors.push(`${label}: numeric price is missing without on_request type`);

  const image = String(item.image || "").replace(/\//g, path.sep);
  if (image && !/^https?:/i.test(image) && !fs.existsSync(path.join(root, image))) {
    errors.push(`${label}: missing local image ${item.image}`);
  }

  ["source_url", "official_url", "secondary_source_url"].forEach((field) => {
    if (present(item[field]) && !validHttpUrl(item[field])) errors.push(`${label}: invalid ${field}`);
  });

  ["title", "city", "address", "developer", "status", "deadline", "class", "description"].forEach((field) => {
    if (item[field] !== null && item[field] !== undefined && badText.test(String(item[field]).trim())) {
      errors.push(`${label}: placeholder text in ${field}`);
    }
  });
});

Object.keys(missing).forEach((field) => {
  if (missing[field]) warnings.push(`missing ${field}: ${missing[field]}`);
});

console.log(`cards=${data.length}`);
console.log(`errors=${errors.length}`);
console.log(`warnings=${warnings.length}`);
warnings.forEach((warning) => console.log(`WARN ${warning}`));
errors.forEach((error) => console.error(`ERROR ${error}`));

if (errors.length) process.exitCode = 1;
