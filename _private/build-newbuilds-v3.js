const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const V2_PATH = path.join(ROOT, "output", "newbuilds", "newbuilds-v2-merged.json");
const MEDIA_PATH = path.join(__dirname, "newbuilds-media-selection.json");
const OUTPUT_PATH = path.join(ROOT, "output", "newbuilds", "catalog-v3.json");
const CHECKED_AT = "2026-07-13";

const translitMap = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
  х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya"
};

const pilotSlugs = new Map([
  ["Грей (GRAY)", "gray"],
  ["Гринсайд", "grinside"],
  ["Западные Аллеи", "zapadnye-allei"],
  ["Суворовский", "suvorovskiy"],
  ["Концепт-проект «Левенцовка Парк»", "leventsovka-park"],
  ["5 элемент Аске", "5-element-aske"],
  ["Город у реки", "gorod-u-reki"],
  ["Грин Парк", "green-park"],
  ["Движение 61", "dvizhenie-61"],
  ["Левобережье", "levoberezhe"],
  ["Сияние (Ростов-на-Дону)", "siyanie"]
]);

const officialOverrides = {
  "Движение 61": {
    official_url: "https://dvizhenie61.ru/",
    status: "Строится; квартиры в продаже",
    deadline: "Уточняется",
    price: null,
    price_type: "on_request",
    description: "Квартал комплексной застройки на территории бывшего ростовского аэропорта. Проект включает дома разной этажности, дворы, социальную и коммерческую инфраструктуру."
  },
  "Левобережье": {
    official_url: "https://levoberezhe.ru/",
    address: "Ростов-на-Дону, ул. Левобережная, 6/6",
    status: "Строительство завершено; квартиры в продаже",
    deadline: "Сдан",
    price: null,
    price_type: "on_request",
    description: "Жилой квартал на левом берегу Дона с благоустроенной территорией и домами у зелёной зоны. Официальный сайт сообщает о завершении строительства в мае 2026 года."
  },
  "Сияние (Ростов-на-Дону)": {
    official_url: "https://kvartal-siyanie.ru/",
    status: "Строится; квартиры в продаже",
    deadline: "Уточняется",
    price: null,
    price_type: "on_request",
    description: "Новый квартал в районе проспекта Шолохова, спроектированный как часть комплексного развития территории с дворами, прогулочными зонами и собственной инфраструктурой."
  }
};

const userCovers = {
  "Белый Ангел": "assets/images/newbuilds/zhk-belyy-angel-rostov/cover-user.png",
  "Екатерининский": "assets/images/newbuilds/zhk-ekaterininskiy-rostov/cover-user.webp",
  "Красный Аксай": "assets/images/newbuilds/zhk-krasnyy-aksay-rostov/cover-user.webp",
  "Ленина, 46": "assets/images/newbuilds/zhk-lenina-46-rostov/cover-user.webp"
};

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .split("")
    .map((char) => translitMap[char] ?? char)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "newbuild";
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replace(/[^\d.,-]/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function domainOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return null; }
}

function localMedia(slug, item) {
  return {
    src: `assets/images/newbuilds/${slug}/${item.name}`,
    alt: item.alt,
    type: item.type,
    source_url: item.url,
    source_domain: domainOf(item.url),
    source_type: "official"
  };
}

function legacyCover(record) {
  if (!record.image) return null;
  const sourceUrl = record.source_url || record.url || null;
  return {
    src: record.image,
    alt: `Жилой комплекс ${record.title}`,
    type: "legacy_cover",
    source_url: sourceUrl,
    source_domain: record.source_domain || domainOf(sourceUrl),
    source_type: "legacy"
  };
}

function userCover(record) {
  const src = userCovers[record.title];
  if (!src) return null;
  return {
    src,
    alt: `Жилой комплекс ${record.title}`,
    type: "user_cover",
    source_url: null,
    source_domain: null,
    source_type: "user_provided"
  };
}

function completeness(item) {
  const checks = [
    ["city", item.city], ["address", item.address], ["developer", item.developer], ["status", item.status],
    ["description", item.description], ["official_url", item.official_url], ["checked_at", item.checked_at],
    ["cover", item.cover?.src], ["gallery_3", item.images.length >= 3], ["detail_page", item.detail_url]
  ];
  const missing = checks.filter(([, value]) => !value).map(([key]) => key);
  const score = Math.round(((checks.length - missing.length) / checks.length) * 100);
  let state = "legacy";
  if (missing.length === 0) state = "complete";
  else if (item.official_url || item.images.length || item.checked_at) state = "partial";
  if (!item.checked_at && !item.official_url && item.source_type === "aggregator") state = "needs_review";
  return { state, score, missing };
}

function main() {
  const source = JSON.parse(fs.readFileSync(V2_PATH, "utf8"));
  const media = JSON.parse(fs.readFileSync(MEDIA_PATH, "utf8"));
  const mediaByTitle = new Map(media.map((project) => [project.title, project]));
  const usedSlugs = new Set();

  const items = source.map((record, index) => {
    const override = officialOverrides[record.title] || {};
    const selectedMedia = mediaByTitle.get(record.title) || null;
    let slug = pilotSlugs.get(record.title) || slugify(record.slug || record.title);
    const baseSlug = slug;
    let suffix = 2;
    while (usedSlugs.has(slug)) slug = `${baseSlug}-${suffix++}`;
    usedSlugs.add(slug);

    const officialUrl = override.official_url || record.official_url || null;
    const checkedAt = override.official_url ? CHECKED_AT : (record.checked_at || null);
    const sourceType = officialUrl && checkedAt ? "official" : (record.source_type || "unknown");
    const keepPrice = sourceType === "official" && checkedAt && record.price_type !== "on_request";
    const rawPrice = Object.prototype.hasOwnProperty.call(override, "price") ? override.price : (keepPrice ? numberOrNull(record.price) : null);
    const priceValue = rawPrice !== null && rawPrice >= 100000 ? rawPrice : null;
    const images = selectedMedia ? selectedMedia.images.map((item) => localMedia(slug, item)) : [];
    const floorplans = selectedMedia ? (selectedMedia.floorplans || []).map((item) => localMedia(slug, item)) : [];
    const detailUrl = selectedMedia ? `newbuilds/${slug}/` : null;
    const sourceUrl = officialUrl || record.source_url || record.url || null;

    const item = {
      id: `newbuild-${String(index + 1).padStart(3, "0")}`,
      slug,
      title: record.title,
      city: record.city || null,
      district: /район/i.test(record.address || "") ? record.address : null,
      address: override.address || record.address || null,
      developer: record.developer || null,
      class: record.class || null,
      status: override.status || record.status || null,
      deadline: override.deadline || record.deadline || null,
      price: {
        value: priceValue,
        currency: "RUB",
        type: priceValue ? (record.price_type || "minimum_total") : "on_request",
        verified: Boolean(priceValue && checkedAt && sourceType === "official"),
        note: priceValue ? (record.price_note || null) : "Актуальная минимальная цена не подтверждена на первичном источнике."
      },
      areas: { min: numberOrNull(record.area_min), max: numberOrNull(record.area_max), unit: "m2" },
      description: override.description || record.description || null,
      features: [],
      official_url: officialUrl,
      checked_at: checkedAt,
      source_type: sourceType,
      cover: images[0] || userCover(record) || legacyCover(record),
      images,
      floorplans,
      detail_url: detailUrl,
      legacy: {
        source_url: record.source_url || record.url || null,
        source_domain: record.source_domain || domainOf(record.source_url || record.url),
        image: record.image || null,
        price: record.price ?? null
      },
      sources: sourceUrl ? [{
        url: sourceUrl,
        domain: domainOf(sourceUrl),
        type: sourceType,
        checked_at: checkedAt
      }] : []
    };
    item.completeness = completeness(item);
    return item;
  });

  const counts = items.reduce((acc, item) => {
    acc[item.completeness.state] = (acc[item.completeness.state] || 0) + 1;
    return acc;
  }, {});
  const output = {
    schema_version: 3,
    generated_at: `${CHECKED_AT}T00:00:00+03:00`,
    item_count: items.length,
    completeness_counts: counts,
    items
  };
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`wrote ${path.relative(ROOT, OUTPUT_PATH)}`);
  console.log(JSON.stringify(counts));
}

main();
