const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, "output", "newbuilds", "catalog-v3.json"), "utf8"));

function esc(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function asset(src) { return `../../${src}`; }

function priceMarkup(price) {
  if (!price?.value || price.value < 100000) return '<span class="nbd-price nbd-price--request">Цена по запросу</span>';
  const amount = new Intl.NumberFormat("ru-RU").format(price.value);
  const prefix = price.type === "minimum_total" ? "от " : "";
  return `<span class="nbd-price"><span>${prefix}${amount}</span><small>₽</small></span>`;
}

function fact(label, value) {
  if (!value) return "";
  return `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`;
}

const missingLabels = {
  city: "город", address: "адрес", developer: "застройщик", status: "статус",
  description: "описание", official_url: "официальный сайт", checked_at: "дата проверки",
  cover: "обложка", gallery_3: "третье изображение галереи", detail_page: "внутренняя страница"
};

function render(item) {
  const canonical = `https://domian-161.ru/newbuilds/${item.slug}/`;
  const checked = item.checked_at ? new Intl.DateTimeFormat("ru-RU").format(new Date(`${item.checked_at}T12:00:00`)) : "уточняется";
  const area = item.areas?.min && item.areas?.max ? `${item.areas.min}–${item.areas.max} м²` : item.areas?.min ? `от ${item.areas.min} м²` : null;
  const quality = item.completeness.state === "complete" ? "Проверено по официальному источнику" : "Часть данных уточняется";
  const qualityClass = item.completeness.state === "complete" ? "is-complete" : "is-partial";
  const gallery = item.images.map((image, index) => `
        <figure class="nbd-gallery__item${index === 0 ? " is-wide" : ""}">
          <img src="${asset(image.src)}" alt="${esc(image.alt)}" loading="${index === 0 ? "eager" : "lazy"}" width="1200" height="800">
          <figcaption>${esc(image.alt)}</figcaption>
        </figure>`).join("");
  const floorplans = item.floorplans.length ? `
    <section class="nbd-section" aria-labelledby="floorplans-title">
      <div class="nbd-section__head"><span>Квартиры</span><h2 id="floorplans-title">Планировки</h2><p>Изображения получены с официального сайта проекта. Наличие конкретной квартиры и параметры нужно подтвердить перед сделкой.</p></div>
      <div class="nbd-floorplans">${item.floorplans.map((plan) => `
        <figure><img src="${asset(plan.src)}" alt="${esc(plan.alt)}" loading="lazy"><figcaption>${esc(plan.alt)}</figcaption></figure>`).join("")}</div>
    </section>` : "";
  const missing = item.completeness.missing.length ? `<p class="nbd-note"><strong>Что уточнить:</strong> ${esc(item.completeness.missing.map((key) => missingLabels[key] || key).join(", "))}.</p>` : "";

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(item.title)} — цены, фото и информация о ЖК | Домиан Квартал</title>
  <meta name="description" content="${esc(item.title)}: ${esc(item.description || "информация о жилом комплексе")}. Адрес, застройщик, статус, официальные фото и планировки.">
  <link rel="canonical" href="${canonical}">
  <meta property="og:title" content="${esc(item.title)} — Домиан Квартал">
  <meta property="og:description" content="${esc(item.description || "Информация о жилом комплексе")}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="https://domian-161.ru/${esc(item.cover.src)}">
  <link rel="stylesheet" href="../../assets/css/main.css">
  <link rel="stylesheet" href="../../assets/css/visual-premium.css">
  <link rel="stylesheet" href="../../assets/css/newbuild-detail.css">
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org", "@type": "Residence", name: item.title,
    description: item.description, address: item.address, url: canonical,
    image: item.images.map((image) => `https://domian-161.ru/${image.src}`)
  }).replace(/</g, "\\u003c")}</script>
</head>
<body class="newbuild-detail-page">
  <header class="nbd-header">
    <div class="container nbd-header__inner">
      <a class="nbd-logo" href="../../index.html">Домиан · офис «Квартал»</a>
      <nav aria-label="Основная навигация"><a href="../../index.html">Главная</a><a href="../../apartments.html">Квартиры</a><a href="../../newbuilds.html" aria-current="page">Новостройки</a><a href="../../index.html#contact">Контакты</a></nav>
      <a class="nbd-phone" href="tel:+79536091122">+7 953 609-11-22</a>
    </div>
  </header>

  <main>
    <div class="container nbd-breadcrumbs"><a href="../../index.html">Главная</a><span>→</span><a href="../../newbuilds.html">Новостройки</a><span>→</span><span>${esc(item.title)}</span></div>
    <section class="nbd-hero">
      <div class="container nbd-hero__grid">
        <div class="nbd-hero__media"><img src="${asset(item.cover.src)}" alt="${esc(item.cover.alt)}" width="1200" height="800"></div>
        <div class="nbd-hero__content">
          <span class="nbd-quality ${qualityClass}">${quality}</span>
          <p class="nbd-location">${esc(item.city || "Ростовская область")}</p>
          <h1>${esc(item.title)}</h1>
          ${priceMarkup(item.price)}
          <p class="nbd-lead">${esc(item.description || "Информация о проекте уточняется.")}</p>
          <div class="nbd-actions"><a class="btn" href="../../index.html#contact">Уточнить наличие</a><a class="btn secondary" href="tel:+79536091122">Позвонить</a></div>
          <p class="nbd-disclaimer">Цена и наличие не являются публичной офертой. Проверено: ${checked}.</p>
        </div>
      </div>
    </section>

    <section class="nbd-facts-wrap">
      <div class="container">
        <dl class="nbd-facts">
          ${fact("Адрес", item.address || "Уточняется")}
          ${fact("Застройщик", item.developer || "Уточняется")}
          ${fact("Статус", item.status || "Уточняется")}
          ${fact("Срок", item.deadline || "Уточняется")}
          ${fact("Класс", item.class || "Уточняется")}
          ${fact("Площадь", area || "Уточняется")}
        </dl>
      </div>
    </section>

    <section class="nbd-section" aria-labelledby="gallery-title">
      <div class="nbd-section__head"><span>Официальные материалы</span><h2 id="gallery-title">Галерея проекта</h2><p>Файлы сохранены локально с официального сайта ЖК или застройщика. Изображения агрегаторов не используются.</p></div>
      <div class="nbd-gallery">${gallery}</div>
    </section>
    ${floorplans}

    <section class="nbd-section nbd-source" aria-labelledby="source-title">
      <div class="nbd-source__content">
        <span>Проверка данных</span><h2 id="source-title">Источник и актуальность</h2>
        <p>Основные сведения сверены с первичным источником. Для цены, конкретного корпуса, срока передачи ключей и доступности квартиры обязательна повторная проверка перед бронированием.</p>
        ${missing}
      </div>
      <div class="nbd-source__card"><small>Официальный источник</small><strong>${esc(item.sources[0]?.domain || "Не указан")}</strong><a href="${esc(item.official_url || item.sources[0]?.url || "../../newbuilds.html")}" target="_blank" rel="noopener noreferrer">Открыть официальный сайт →</a><span>Проверено: ${checked}</span></div>
    </section>

    <section class="nbd-cta"><div><span>Поможем сравнить проекты</span><h2>Нужна квартира в новостройке?</h2><p>Проверим доступность лотов, условия застройщика и документы на дату обращения.</p></div><a class="btn" href="../../index.html#contact">Получить подборку</a></section>
  </main>

  <footer class="nbd-footer"><div class="container"><p>© 2022–2026 АН «Домиан Квартал»</p><div><a href="../../newbuilds.html">Каталог новостроек</a><a href="../../privacy.html">Политика конфиденциальности</a></div><p>Информация не является публичной офертой</p></div></footer>
  <script src="../../assets/js/main.js" defer></script>
</body>
</html>\n`;
}

let count = 0;
for (const item of DATA.items.filter((entry) => entry.detail_url)) {
  const directory = path.join(ROOT, "newbuilds", item.slug);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, "index.html"), render(item), "utf8");
  count += 1;
}
console.log(`generated=${count}`);
