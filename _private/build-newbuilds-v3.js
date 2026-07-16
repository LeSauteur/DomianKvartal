const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const V2_PATH = path.join(ROOT, "output", "newbuilds", "newbuilds-v2-merged.json");
const MEDIA_PATH = path.join(__dirname, "newbuilds-media-selection.json");
const OUTPUT_PATH = path.join(ROOT, "output", "newbuilds", "catalog-v3.json");
const CHECKED_AT = "2026-07-13";
const GENERATED_AT = "2026-07-16";

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
  ["Сияние (Ростов-на-Дону)", "siyanie"],
  ["Умный квартал smartpolet (смартполет)", "smartpolet"],
  ["Октябрь Парк", "oktyabr-park"],
  ["Royal Towers (Роял Тауэрс)", "royal-towers"],
  ["FOUR PREMIERS ( Четыре Премьеры)", "four-premiers"],
  ["Акватория", "akvatoriya"],
  ["Донской Арбат", "donskoy-arbat"],
  ["Донской Арбат 2", "donskoy-arbat-2"],
  ["Кристалл-2", "kristall-2"],
  ["Легенда Ростова", "legenda-rostova"],
  ["ACADEMIA (АКАДЕМИЯ)", "academia"]
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
  },
  "Умный квартал smartpolet (смартполет)": {
    title: "Умный квартал «Смартполет»",
    city: "Ростов-на-Дону",
    district: "Первомайский район",
    address: "Ростов-на-Дону, ул. Берберовская",
    developer: "ГК «ЮгСтройИнвест»",
    class: "комфорт+",
    status: "Строится; продажи открыты",
    deadline: "Уточняется по литеру",
    price: null,
    price_type: "on_request",
    area_min: 31.3,
    area_max: 84.9,
    official_url: "https://poletsmart.ru/",
    checked_at: "2026-07-16",
    description: "Умный квартал на территории бывшего ростовского аэропорта. Проект объединяет жилые дома разной этажности, закрытые дворы, детский сад, сквер и цифровые сервисы для жителей.",
    features: ["закрытые дворы", "детский сад", "сквер", "умные технологии"],
    sources: [
      { url: "https://poletsmart.ru/", type: "official" },
      { url: "https://poletsmart.ru/stroyashhiesya-obekty/klaster-1/", type: "official" },
      { url: "https://poletsmart.ru/stroyashhiesya-obekty/klaster-3/", type: "official" }
    ]
  },
  "Октябрь Парк": {
    title: "Октябрь Парк",
    city: "Ростов-на-Дону",
    address: "Ростов-на-Дону, территория в границах пер. Элеваторного, пер. Нефтяного и ул. Таганрогской",
    developer: "СЗ «Ростовстрой-Дон» (ССК)",
    class: "комфорт",
    status: "Строится; квартиры в продаже",
    deadline: "IV квартал 2026",
    price: 2900000,
    price_type: "minimum_total",
    price_note: "Минимальная стоимость студии на официальном сайте проекта на дату проверки.",
    area_min: 18.57,
    area_max: null,
    official_url: "https://www.ssk-oktyabr-park.ru/",
    checked_at: "2026-07-16",
    description: "Жилой комплекс комфорт-класса с закрытой территорией, детскими садами, школой, прогулочными зонами и спортивными площадками. Предусмотрены квартиры от студий до трёхкомнатных.",
    features: ["закрытая территория", "школа", "детские сады", "паркинг"],
    sources: [
      { url: "https://www.ssk-oktyabr-park.ru/", type: "official" },
      { url: "https://apiv2.sskuban.ru/storage/4372/%D0%A2%D0%B0%D0%B3%D0%B0%D0%BD%D1%80%D0%BE%D0%B3%D1%81%D0%BA%D0%B0%D1%8F-%D0%BF%D0%BE%D0%B7.-1.1%2C-%D0%BF%D0%BE%D0%B7.-1.2.pdf", type: "official_document" }
    ]
  },
  "Royal Towers (Роял Тауэрс)": {
    title: "РОЯЛ ТАУЭРС",
    city: "Ростов-на-Дону",
    district: "Железнодорожный район",
    address: "Ростов-на-Дону, ул. Привокзальная, 9",
    developer: "ГК «МСК»",
    class: "бизнес",
    status: "Строится; квартиры в продаже",
    deadline: "I квартал 2027",
    price: 3789450,
    price_type: "minimum_total",
    price_note: "Минимальная полная стоимость доступной студии в официальном подборе квартир на дату проверки.",
    area_min: 24,
    area_max: 72,
    official_url: "https://msk-development.ru/projects/flats/zhk-royal-towers",
    checked_at: "2026-07-16",
    description: "Жилой комплекс бизнес-класса из четырёх высотных домов в Железнодорожном районе. Проект включает закрытый многоуровневый двор, спортивные и детские зоны, торговую инфраструктуру и подземный паркинг.",
    features: ["закрытый двор", "подземный паркинг", "торговый центр", "воркаут-зона"],
    sources: [
      { url: "https://msk-development.ru/projects/flats/zhk-royal-towers", type: "official" },
      { url: "https://msk-development.ru/property/flats/zhk-royal-towers-studii", type: "official_inventory" }
    ]
  },
  "FOUR PREMIERS ( Четыре Премьеры)": {
    title: "ФОР ПРЕМЬЕРС",
    city: "Ростов-на-Дону",
    district: "Ленинский район",
    address: "Ростов-на-Дону, ул. Мечникова, 110Г",
    developer: "ГК «МСК»",
    class: "бизнес",
    status: "Часть домов сдана; строительство и продажи продолжаются",
    deadline: "По литерам: сдан и IV квартал 2028",
    price: 5859240,
    price_type: "minimum_total",
    price_note: "Минимальная полная стоимость квартиры в официальном подборе по проекту на дату проверки.",
    area_min: 35,
    area_max: 110,
    official_url: "https://msk-development.ru/projects/flats/four-premiers",
    checked_at: "2026-07-16",
    description: "Жилой комплекс бизнес-класса в Ленинском районе с четырьмя домами, закрытым двором, фитнес-залом, кафе, подземным паркингом и обзорной площадкой на крыше.",
    features: ["фитнес-зал", "кафе", "подземный паркинг", "обзорная площадка"],
    sources: [
      { url: "https://msk-development.ru/projects/flats/four-premiers", type: "official" },
      { url: "https://msk-development.ru/property/flats?project=four-premiers", type: "official_inventory" }
    ]
  },
  "Акватория": {
    title: "Акватория",
    city: "Ростов-на-Дону",
    district: "Ворошиловский район",
    address: "Ростов-на-Дону, пр-т Космонавтов, 1В",
    developer: "ГК «МСК»",
    class: "бизнес",
    status: "Сдан; квартиры в продаже",
    deadline: "Сдан",
    price: 3356700,
    price_type: "minimum_total",
    price_note: "Минимальная полная стоимость студии в официальном подборе квартир на дату проверки.",
    area_min: 16.6,
    area_max: 77,
    official_url: "https://msk-development.ru/projects/flats/aquatoria",
    checked_at: "2026-07-16",
    description: "Сданный жилой комплекс бизнес-класса на берегу Темерника рядом с Северным водохранилищем. В двух домах предусмотрены закрытый двор, детская площадка, подземный паркинг и коммерческие помещения.",
    features: ["закрытый двор", "подземный паркинг", "вид на водохранилище", "магазины в доме"],
    sources: [
      { url: "https://msk-development.ru/projects/flats/aquatoria", type: "official" },
      { url: "https://msk-development.ru/property/flats/aquatoria", type: "official_inventory" }
    ]
  },
  "Донской Арбат": {
    title: "ДОНСКОЙ АРБАТ",
    city: "Ростов-на-Дону",
    district: "Кировский район",
    address: "Ростов-на-Дону, пр-т Кировский, 89",
    developer: "ГК «МСК»",
    class: null,
    status: "Сдан; квартиры в продаже",
    deadline: "Сдан",
    price: 6006000,
    price_type: "minimum_total",
    price_note: "Минимальная полная стоимость квартиры в официальном подборе по проекту на дату проверки.",
    area_min: 27,
    area_max: 77,
    official_url: "https://msk-development.ru/projects/flats/donskoi-arbat",
    checked_at: "2026-07-16",
    description: "Сданный комплекс из пяти домов переменной этажности в центре Ростова-на-Дону. Для жителей предусмотрены благоустроенные дворы и три многоуровневых паркинга.",
    features: ["центр города", "благоустроенные дворы", "многоуровневые паркинги", "коммерческие помещения"],
    sources: [
      { url: "https://msk-development.ru/projects/flats/donskoi-arbat", type: "official" },
      { url: "https://msk-development.ru/property/flats?project=donskoi-arbat", type: "official_inventory" }
    ]
  },
  "Донской Арбат 2": {
    title: "ДОНСКОЙ АРБАТ 2",
    city: "Ростов-на-Дону",
    address: "Ростов-на-Дону, пр-т Кировский, 89А",
    developer: "ГК «МСК»",
    class: null,
    status: "Строится; квартиры в продаже",
    deadline: "III квартал 2026",
    price: 4160500,
    price_type: "minimum_total",
    price_note: "Минимальная полная стоимость квартиры в официальном подборе по проекту на дату проверки.",
    area_min: 28,
    area_max: 77,
    official_url: "https://msk-development.ru/projects/flats/donskoi-arbat2",
    checked_at: "2026-07-16",
    description: "Два 20-этажных дома в центре Ростова-на-Дону рядом с пересечением улицы Текучёва и Кировского проспекта. В проекте предусмотрены благоустроенная территория и коммерческие помещения.",
    features: ["центр города", "благоустроенная территория", "коммерческие помещения", "закрытая территория"],
    sources: [
      { url: "https://msk-development.ru/projects/flats/donskoi-arbat2", type: "official" },
      { url: "https://msk-development.ru/property/flats?project=donskoi-arbat2", type: "official_inventory" }
    ]
  },
  "Кристалл-2": {
    title: "КРИСТАЛЛ-2",
    city: "Ростов-на-Дону",
    district: "Кировский район",
    address: "Ростов-на-Дону, пр-т Ворошиловский, 82/4",
    developer: "ГК «МСК»",
    class: "бизнес",
    status: "Сдан; наличие квартир уточняется",
    deadline: "Сдан",
    price: null,
    price_type: "on_request",
    area_min: 58,
    area_max: 76,
    official_url: "https://msk-development.ru/projects/flats/kristall2",
    checked_at: "2026-07-16",
    description: "Сданный дом бизнес-класса переменной этажности в Кировском районе. Проект включает двухуровневый подземный паркинг, террасу на стилобате и коммерческие помещения.",
    features: ["подземный паркинг", "терраса на стилобате", "коммерческие помещения", "центр города"],
    sources: [
      { url: "https://msk-development.ru/projects/flats/kristall2", type: "official" },
      { url: "https://msk-development.ru/property/flats/kristall2", type: "official_inventory" }
    ]
  },
  "Легенда Ростова": {
    title: "ЛЕГЕНДА РОСТОВА",
    city: "Ростов-на-Дону",
    district: "Ворошиловский район",
    address: "Ростов-на-Дону, пр-т Михаила Нагибина, 40",
    developer: "ГК «МСК»",
    class: null,
    status: "Строится; квартиры в продаже",
    deadline: "III квартал 2026",
    price: 3463260,
    price_type: "minimum_total",
    price_note: "Минимальная полная стоимость квартиры в официальном подборе по проекту на дату проверки.",
    area_min: 23,
    area_max: 87,
    official_url: "https://msk-development.ru/projects/flats/legenda-rostova",
    checked_at: "2026-07-16",
    description: "Крупный жилой комплекс из тринадцати домов в Ворошиловском районе. В составе проекта заявлены детский сад, двухуровневый подземный паркинг, спортивные и детские площадки.",
    features: ["детский сад", "подземный паркинг", "футбольное поле", "детские площадки"],
    sources: [
      { url: "https://msk-development.ru/projects/flats/legenda-rostova", type: "official" },
      { url: "https://msk-development.ru/property/flats?project=legenda-rostova", type: "official_inventory" }
    ]
  },
  "ACADEMIA (АКАДЕМИЯ)": {
    title: "ACADEMIA",
    city: "Ростов-на-Дону",
    address: "Ростов-на-Дону, пр-т Стачки, 196",
    developer: "ГК «АльфаСтройИнвест»",
    class: "комфорт+",
    status: "Строится; квартиры в продаже",
    deadline: "По этапам: II–IV кварталы 2028",
    price: 5800000,
    price_type: "minimum_total",
    price_note: "Минимальная стоимость квартиры «от 5,8 млн ₽» на официальной странице застройщика на дату проверки.",
    area_min: 33,
    area_max: 144,
    official_url: "https://alfastroyinvest.com/zhk-academia/",
    checked_at: "2026-07-16",
    description: "Жилой комплекс комфорт-класса на проспекте Стачки из семи секций, реализуемых в три этапа. Проект предусматривает закрытую территорию, дворы без машин, лобби, коворкинг и подземный паркинг.",
    features: ["дворы без машин", "подземный паркинг", "коворкинг", "закрытая территория"],
    sources: [
      { url: "https://alfastroyinvest.com/zhk-academia/", type: "official_developer" },
      { url: "https://academia-dom.ru/", type: "official" }
    ]
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
    const checkedAt = override.checked_at || (override.official_url ? CHECKED_AT : (record.checked_at || null));
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
      title: override.title || record.title,
      city: override.city || record.city || null,
      district: override.district || record.district || (/район/i.test(record.address || "") ? record.address : null),
      address: override.address || record.address || null,
      developer: override.developer || record.developer || null,
      class: Object.prototype.hasOwnProperty.call(override, "class") ? override.class : (record.class || null),
      status: override.status || record.status || null,
      deadline: override.deadline || record.deadline || null,
      price: {
        value: priceValue,
        currency: "RUB",
        type: priceValue ? (override.price_type || record.price_type || "minimum_total") : "on_request",
        verified: Boolean(priceValue && checkedAt && sourceType === "official"),
        note: priceValue ? (override.price_note || record.price_note || null) : "Актуальная минимальная цена не подтверждена на первичном источнике."
      },
      areas: {
        min: Object.prototype.hasOwnProperty.call(override, "area_min") ? numberOrNull(override.area_min) : numberOrNull(record.area_min),
        max: Object.prototype.hasOwnProperty.call(override, "area_max") ? numberOrNull(override.area_max) : numberOrNull(record.area_max),
        unit: "m2"
      },
      description: override.description || record.description || null,
      features: override.features || [],
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
      sources: (override.sources || (sourceUrl ? [{ url: sourceUrl, type: sourceType }] : [])).map((source) => ({
        url: source.url,
        domain: domainOf(source.url),
        type: source.type || sourceType,
        checked_at: source.checked_at || checkedAt
      }))
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
    generated_at: `${GENERATED_AT}T00:00:00+03:00`,
    item_count: items.length,
    completeness_counts: counts,
    items
  };
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`wrote ${path.relative(ROOT, OUTPUT_PATH)}`);
  console.log(JSON.stringify(counts));
}

main();
