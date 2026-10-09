const fs = require("fs");
const path = require("path");
const { syncPublicPage } = require("../_tools/sync-public-header.mjs");

const ROOT = path.resolve(__dirname, "..");
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, "output", "newbuilds", "catalog-v3.json"), "utf8"));
const PRESENTATION = JSON.parse(fs.readFileSync(path.join(ROOT, "_private", "newbuild-page-presentation.json"), "utf8"));

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

function clientDescription(item) {
  const descriptions = {
    "Сданный жилой комплекс рядом с площадью Ленина. Актуальная цена и наличие квартир на официальной странице не подтверждены.": "Сданный жилой комплекс рядом с площадью Ленина.",
    "Многокорпусный жилой комплекс в западной части Ростова-на-Дону. Актуальная цена первичного предложения не подтверждена.": "Многокорпусный жилой комплекс в западной части Ростова-на-Дону."
  };
  return descriptions[item.description] || item.description || "Подробности — по запросу";
}

function render(item) {
  const description = clientDescription(item);
  const canonical = `https://domian-161.ru/newbuilds/${item.slug}/`;
  const presentation = PRESENTATION[item.slug] || { schemaGraph: false, robots: "noindex,follow", floorplans: {} };
  const residence = {
    "@context": "https://schema.org", "@type": "Residence", name: item.title,
    description, address: item.address, url: canonical,
    image: item.images.map((image) => `https://domian-161.ru/${image.src}`)
  };
  const structured = presentation.schemaGraph ? { "@context": "https://schema.org", "@graph": [
    { ...residence, "@id": `${canonical}#residence` },
    { "@type": "BreadcrumbList", "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Главная", "item": "https://domian-161.ru/" },
      { "@type": "ListItem", "position": 2, "name": "Новостройки", "item": "https://domian-161.ru/newbuilds.html" },
      { "@type": "ListItem", "position": 3, "name": item.title, "item": canonical }
    ] }
  ] } : residence;
  const floorplanSize = (plan) => {
    const size = presentation.floorplans[plan.src];
    return size ? ` width="${size.width}" height="${size.height}"` : "";
  };
  const area = item.areas?.min && item.areas?.max ? `${item.areas.min}–${item.areas.max} м²` : item.areas?.min ? `от ${item.areas.min} м²` : null;
  const gallery = item.images.map((image, index) => `
        <figure class="nbd-gallery__item${index === 0 ? " is-wide" : ""}">
          <img src="${asset(image.src)}" alt="${esc(image.alt)}" loading="${index === 0 ? "eager" : "lazy"}" width="1200" height="800">
          <figcaption>${esc(image.alt)}</figcaption>
        </figure>`).join("");
  const floorplans = item.floorplans.length ? `
    <section class="nbd-section" aria-labelledby="floorplans-title">
      <div class="nbd-section__head"><span>Квартиры</span><h2 id="floorplans-title">Планировки</h2><p>Выберите подходящую планировку — поможем подобрать квартиру.</p></div>
      <div class="nbd-floorplans">${item.floorplans.map((plan) => `
        <figure><img src="${asset(plan.src)}" alt="${esc(plan.alt)}" loading="lazy"${floorplanSize(plan)}><figcaption>${esc(plan.alt)}</figcaption></figure>`).join("")}</div>
    </section>` : "";

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(item.title)} — цены, фото и информация о ЖК | Домиан Квартал</title>
  <meta name="description" content="${esc(item.title)}: ${esc(description)}. Адрес, застройщик, статус, официальные фото и планировки.">
  <link rel="canonical" href="${canonical}">
  <meta property="og:title" content="${esc(item.title)} — Домиан Квартал">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="https://domian-161.ru/${esc(item.cover.src)}">
  <link rel="stylesheet" href="../../assets/css/main.css">
  <link rel="stylesheet" href="../../assets/css/visual-premium.css">
  <link rel="stylesheet" href="../../assets/css/newbuild-detail.css">
  <script type="application/ld+json">${JSON.stringify(structured).replace(/</g, "\\u003c")}</script>
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
          <p class="nbd-location">${esc(item.city || "Ростовская область")}</p>
          <h1>${esc(item.title)}</h1>
          ${priceMarkup(item.price)}
          <p class="nbd-lead">${esc(description)}</p>
          <div class="nbd-actions"><a class="btn" href="../../index.html#contact">Уточнить наличие</a><a class="btn secondary" href="tel:+79536091122">Позвонить</a></div>
          <p class="nbd-disclaimer">Цена и наличие не являются публичной офертой</p>
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
      <div class="nbd-section__head"><h2 id="gallery-title">Галерея проекта</h2></div>
      <div class="nbd-gallery">${gallery}</div>
    </section>
    ${floorplans}

    <div class="nbd-section nbd-source" role="group" aria-label="Информация для покупателя">
      <div class="nbd-source__content">

        <p>Поможем выбрать корпус и квартиру, сравнить стоимость, сроки передачи ключей и условия покупки.</p>
      </div>
      <div class="nbd-source__card"><small>Сайт застройщика</small><strong>${esc(item.sources[0]?.domain || "Не указан")}</strong><a href="${esc(item.official_url || item.sources[0]?.url || "../../newbuilds.html")}" target="_blank" rel="noopener noreferrer">Сайт застройщика →</a></div>
    </div>

    <section class="nbd-cta"><div><span>Поможем сравнить проекты</span><h2>Нужна квартира в новостройке?</h2><p>Проверим доступность лотов, условия застройщика и документы на дату обращения.</p></div><a class="btn" href="../../index.html#contact">Получить подборку</a></section>
  </main>

  <footer class="nbd-footer"><div class="container"><p>© 2022–2026 АН «Домиан Квартал»</p><div><a href="../../newbuilds.html">Каталог новостроек</a><a href="../../privacy.html">Политика конфиденциальности</a></div><p>Информация не является публичной офертой</p></div></footer>
  <script src="../../assets/js/main.js" defer></script>
</body>
</html>\n`;
  const file = `newbuilds/${item.slug}/index.html`;
  const withHeader = syncPublicPage(html.replaceAll('href="../../index.html#contact"', 'href="/#lead-form-section"')
    .replaceAll('href="../../index.html"', 'href="/"')
    .replace('<a href="../../privacy.html">Политика конфиденциальности</a>', '<a href="/privacy.html">Политика обработки персональных данных</a><a href="/personal-data-consent.html">Согласие на обработку персональных данных</a><a href="/cookies.html">Политика cookie</a><a href="/offer.html">Пользовательское соглашение</a><a href="/details.html">Реквизиты</a>'), file);
  return syncPublicPage(withHeader, file)
    .replace('</head>', `<meta name="robots" content="${esc(presentation.robots)}">\n</head>`)
    .replace(/[ \t]+$/gm, "");
}

function generatePages() {
  let count = 0;
  const detailItems = DATA.items.filter((entry) => entry.detail_url);
  for (const item of detailItems) {
    const directory = path.join(ROOT, "newbuilds", item.slug);
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, "index.html"), render(item), "utf8");
    count += 1;
  }

  const sitemapPath = path.join(ROOT, "sitemap.xml");
  let sitemap = fs.readFileSync(sitemapPath, "utf8");
  const generatedDate = String(DATA.generated_at || "").slice(0, 10);
  if (generatedDate) {
    sitemap = sitemap.replace(
      /(<url><loc>https:\/\/domian-161\.ru\/newbuilds\.html<\/loc><lastmod>)[^<]+/,
      `$1${generatedDate}`
    );
  }

  const missingSitemapEntries = [];
  for (const item of detailItems) {
    const loc = `https://domian-161.ru/newbuilds/${item.slug}/`;
    if (sitemap.includes(`<loc>${loc}</loc>`)) continue;
    missingSitemapEntries.push(`  <url><loc>${loc}</loc><lastmod>${item.checked_at || generatedDate}</lastmod></url>`);
  }
  if (missingSitemapEntries.length) {
    sitemap = sitemap.replace("</urlset>", `${missingSitemapEntries.join("\n")}\n</urlset>`);
  }
  fs.writeFileSync(sitemapPath, sitemap, "utf8");

  console.log(`generated=${count}`);
  console.log(`sitemap_added=${missingSitemapEntries.length}`);
}

module.exports = { render };
if (require.main === module) generatePages();
