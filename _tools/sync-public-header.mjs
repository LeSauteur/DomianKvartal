import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");
const maxUrl = "https://max.ru/u/f9LHodD0cOKImT5sxxh2fLN4YFJ-paNFCiI79MwgO-LJJZ8oHXX5TN007y4";
const telegramUrl = "https://t.me/httpsmealieva_rieltor";

function publicPaths() {
  const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
  const paths = [...sitemap.matchAll(/<loc>https:\/\/domian-161\.ru\/(.*?)<\/loc>/g)]
    .map((match) => match[1] || "index.html");
  paths.push("seo/zhk-flora-aksay.html");
  const unique = [...new Set(paths)];
  if (unique.length !== 96) throw new Error(`Expected 96 public pages, found ${unique.length}.`);
  return unique;
}

function fileFor(publicPath) {
  if (!publicPath || publicPath === "index.html") return "index.html";
  return publicPath.endsWith("/") ? `${publicPath}index.html` : publicPath;
}

function clusterFor(file) {
  if (file === "apartments.html" || file.startsWith("seo/kvartiry-")) return "apartments";
  if (file === "houses.html" || file.startsWith("seo/doma-")) return "houses";
  if (file === "lands.html" || file.startsWith("seo/uchastki-")) return "lands";
  if (file === "newbuilds.html" || file.startsWith("newbuilds/") || file.startsWith("seo/zhk-")) return "newbuilds";
  if (file === "rent.html") return "rent";
  if (file === "commercial.html") return "commercial";
  if (file.startsWith("construction")) return "construction";
  if (file.startsWith("guides/")) return "guides";
  if (file.startsWith("team/")) return "team";
  return "";
}

function active(current, key) {
  return current === key ? ' class="is-active" aria-current="page"' : "";
}

function desktopLink(label, href, current, key) {
  return `<a href="${href}"${active(current, key)}>${label}</a>`;
}

function drawerLink(label, href, current, key) {
  return `<a href="${href}"${active(current, key)}>${label}</a>`;
}

function logoMarkup() {
  return `<svg class="kvartal-mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <rect class="kvartal-mark__piece kvartal-mark__top" x="9" y="4" width="14" height="3" rx="1.5" />
        <rect class="kvartal-mark__piece kvartal-mark__right" x="25" y="9" width="3" height="14" rx="1.5" />
        <rect class="kvartal-mark__piece kvartal-mark__bottom" x="9" y="25" width="14" height="3" rx="1.5" />
        <rect class="kvartal-mark__piece kvartal-mark__left" x="4" y="9" width="3" height="14" rx="1.5" />
        <rect class="kvartal-mark__center" x="13.5" y="13.5" width="5" height="5" rx="1" />
      </svg>`;
}

function headerMarkup(file) {
  const cluster = clusterFor(file);
  const servicesActive = ["rent", "commercial", "construction"].includes(cluster);
  const companyActive = cluster === "team";
  return `<!-- unified-public-header:start -->
<script>(function(){try{if(!window.matchMedia("(prefers-reduced-motion: reduce)").matches&&!window.sessionStorage.getItem("domian-kvartal-logo-seen-v1")){document.documentElement.classList.add("kvartal-logo-motion");window.sessionStorage.setItem("domian-kvartal-logo-seen-v1","1");}}catch(_error){}}());</script>
<header class="unified-header" data-unified-header data-active-cluster="${cluster}">
  <div class="unified-header__inner">
    <button class="theme-toggle theme-toggle--header unified-header__utility" type="button" data-unified-theme-toggle aria-label="Включить тёмную тему" aria-pressed="false" title="Тёмная тема"><span aria-hidden="true">◐</span><span class="visually-hidden">Переключить тему</span></button>
    <a class="unified-header__brand" href="/" aria-label="Домиан Квартал — на главную">${logoMarkup()}<span class="unified-header__brand-text"><span>Домиан</span> Квартал</span></a>
    <nav class="unified-header__desktop-nav" aria-label="Основная навигация">
      ${desktopLink("Квартиры", "/apartments.html", cluster, "apartments")}
      ${desktopLink("Дома", "/houses.html", cluster, "houses")}
      ${desktopLink("Участки", "/lands.html", cluster, "lands")}
      ${desktopLink("Новостройки", "/newbuilds.html", cluster, "newbuilds")}
      <div class="unified-header__dropdown" data-unified-dropdown><button type="button" aria-expanded="false" aria-controls="header-services-menu"${servicesActive ? ' class="is-active" aria-current="page"' : ""}>Услуги <span aria-hidden="true">⌄</span></button><div id="header-services-menu" class="unified-header__submenu" role="group" aria-label="Услуги" hidden>${desktopLink("Аренда", "/rent.html", cluster, "rent")}${desktopLink("Коммерческая недвижимость", "/commercial.html", cluster, "commercial")}${desktopLink("Строительство домов", "/construction.html", cluster, "construction")}</div></div>
      ${desktopLink("Гид", "/guides/", cluster, "guides")}
      <div class="unified-header__dropdown" data-unified-dropdown><button type="button" aria-expanded="false" aria-controls="header-company-menu"${companyActive ? ' class="is-active" aria-current="page"' : ""}>О компании <span aria-hidden="true">⌄</span></button><div id="header-company-menu" class="unified-header__submenu" role="group" aria-label="О компании" hidden>${desktopLink("Команда", "/team/zukhra-alieva.html", cluster, "team")}<a href="/#contact">Контакты</a><a href="/details.html">Реквизиты</a></div></div>
    </nav>
    <div class="unified-header__contacts header-contacts"><button class="unified-header__desktop-theme" type="button" data-unified-theme-toggle aria-label="Включить тёмную тему" aria-pressed="false" title="Тёмная тема"><span aria-hidden="true">◐</span><span class="visually-hidden">Переключить тему</span></button><a href="tel:+79536091122">+7 953 609-11-22</a><a href="${maxUrl}" target="_blank" rel="noopener noreferrer" data-channel="max" data-max-trigger aria-label="Написать Зухре в MAX">MAX</a><a href="${telegramUrl}" target="_blank" rel="noopener noreferrer" data-channel="telegram" aria-label="Написать Зухре в Telegram">Telegram</a></div>
    <button class="mobile-menu-toggle unified-header__toggle" type="button" aria-label="Открыть меню" aria-expanded="false" aria-controls="mobile-drawer"><span></span><span></span><span></span></button>
  </div>
</header>
<div class="mobile-drawer unified-mobile-drawer" id="mobile-drawer" data-unified-drawer aria-hidden="true" inert>
  <div class="mobile-drawer__panel" role="dialog" aria-modal="true" aria-label="Мобильное меню" tabindex="-1">
    <div class="unified-mobile-drawer__top"><strong>Навигация</strong><button class="mobile-drawer__close" type="button" aria-label="Закрыть меню">×</button></div>
    <nav class="mobile-drawer__nav" aria-label="Мобильная навигация">
      ${drawerLink("Главная", "/", cluster, "home")}
      ${drawerLink("Квартиры", "/apartments.html", cluster, "apartments")}
      ${drawerLink("Дома", "/houses.html", cluster, "houses")}
      ${drawerLink("Участки", "/lands.html", cluster, "lands")}
      ${drawerLink("Новостройки", "/newbuilds.html", cluster, "newbuilds")}
      ${drawerLink("Аренда", "/rent.html", cluster, "rent")}
      ${drawerLink("Коммерческая недвижимость", "/commercial.html", cluster, "commercial")}
      ${drawerLink("Строительство домов", "/construction.html", cluster, "construction")}
      ${drawerLink("Гид покупателя", "/guides/", cluster, "guides")}
      ${drawerLink("Команда", "/team/zukhra-alieva.html", cluster, "team")}
      <a href="/#contact">Контакты</a>
    </nav>
    <div class="mobile-drawer__actions"><a class="mobile-drawer__call" href="tel:+79536091122">Позвонить: +7 953 609-11-22</a><a class="mobile-drawer__messenger" href="${maxUrl}" target="_blank" rel="noopener noreferrer" data-channel="max" data-max-trigger>MAX</a><a class="mobile-drawer__messenger" href="${telegramUrl}" target="_blank" rel="noopener noreferrer" data-channel="telegram">Telegram</a></div>
  </div>
</div>
<!-- unified-public-header:end -->`;
}

const propertyItems = [
  { key: "apartments", label: "Квартиры", description: "Подбор квартир", href: "/apartments.html", tone: "rose" },
  { key: "houses", label: "Дома", description: "Город и загород", href: "/houses.html", tone: "green" },
  { key: "lands", label: "Участки", description: "ИЖС и дачи", href: "/lands.html", tone: "olive" },
  { key: "commercial", label: "Коммерция", description: "Для бизнеса", href: "/commercial.html", tone: "blue" },
  { key: "newbuilds", label: "Новостройки", description: "ЖК и комплексы", href: "/newbuilds.html", tone: "gold" }
];

function propertyActiveFor(file) {
  const cluster = clusterFor(file);
  return propertyItems.some((item) => item.key === cluster) ? cluster : "";
}

const internalSearchTargets = new Map([
  ["apartments.html", "#listing-new-objects"],
  ["houses.html", "#listing-new-objects"],
  ["lands.html", "#listing-new-objects"],
  ["newbuilds.html", "#catalog"],
  ["rent.html", "/#home-stage12-catalog"],
  ["commercial.html", "/#home-stage12-catalog"],
  ["construction.html", "#construction-projects"],
  ["guides/index.html", "/#home-stage12-catalog"]
]);

function propertyNavMode(file) {
  if (file === "index.html") return "cards";
  if (internalSearchTargets.has(file)) return "internal";
  return "compact";
}

function propertyNavMarkup(file, mode) {
  const current = propertyActiveFor(file);
  const links = propertyItems.map((item) => {
    const currentAttributes = current === item.key ? ' is-active" aria-current="page' : "";
    return `<a class="unified-property-nav__item unified-property-nav__item--${item.tone}${currentAttributes}" href="${item.href}"><span class="unified-property-nav__copy"><strong>${item.label}</strong><em>${item.description}</em></span><span class="unified-property-nav__image" aria-hidden="true"></span></a>`;
  }).join("");
  return `<!-- unified-property-nav:start -->
<nav class="unified-property-nav unified-property-nav--${mode}" aria-label="Направления недвижимости" data-unified-property-nav>
  <div class="unified-property-nav__track">${links}</div>
</nav>
<!-- unified-property-nav:end -->`;
}

function propertyDiscoveryMarkup(file) {
  const mode = propertyNavMode(file);
  const nav = propertyNavMarkup(file, mode);
  const searchTarget = internalSearchTargets.get(file);
  if (!searchTarget) return nav;
  return `<!-- unified-property-nav:start -->
<section class="unified-property-discovery" aria-label="Подбор недвижимости">
  <a class="unified-property-search" href="${searchTarget}">
    <span class="unified-property-search__icon" aria-hidden="true"></span>
    <span class="unified-property-search__text">Поиск по городу, району или адресу</span>
    <span class="unified-property-search__button">Найти</span>
  </a>
  <nav class="unified-property-nav unified-property-nav--${mode}" aria-label="Направления недвижимости" data-unified-property-nav>
    <div class="unified-property-nav__track">${nav.match(/<div class="unified-property-nav__track">([\s\S]*?)<\/div>/)?.[1] || ""}</div>
  </nav>
</section>
<!-- unified-property-nav:end -->`;
}

function legalPage(file) {
  return ["details.html", "offer.html", "privacy.html", "personal-data-consent.html", "cookies.html"].includes(file) || /(?:agreement|consent|privacy|policy)/i.test(file);
}

function matchingDivEnd(source, start) {
  const tag = /<\/?div\b[^>]*>/gi;
  tag.lastIndex = start;
  let depth = 0;
  for (let match = tag.exec(source); match; match = tag.exec(source)) {
    if (match[0].startsWith("</")) depth -= 1;
    else depth += 1;
    if (depth === 0) return tag.lastIndex;
  }
  throw new Error("Unclosed mobile drawer.");
}

function matchingElementEnd(source, start, name) {
  const tag = new RegExp(`<\\/?${name}\\b[^>]*>`, "gi");
  tag.lastIndex = start;
  let depth = 0;
  for (let match = tag.exec(source); match; match = tag.exec(source)) {
    if (match[0].startsWith("</")) depth -= 1;
    else depth += 1;
    if (depth === 0) return tag.lastIndex;
  }
  throw new Error(`Unclosed ${name} element.`);
}

function replaceHeader(source, markup) {
  const generated = /<!-- unified-public-header:start -->[\s\S]*?<!-- unified-public-header:end -->/;
  if (generated.test(source)) return source.replace(generated, markup);
  let withoutDrawer = source;
  const drawer = /<div\b[^>]*\bid=["']mobile-drawer["'][^>]*>/i.exec(withoutDrawer);
  if (drawer) {
    const end = matchingDivEnd(withoutDrawer, drawer.index);
    withoutDrawer = withoutDrawer.slice(0, drawer.index) + withoutDrawer.slice(end);
  }
  const header = /<header\b[^>]*>[\s\S]*?<\/header>/i;
  if (!header.test(withoutDrawer)) throw new Error("Public page has no header.");
  return withoutDrawer.replace(header, markup);
}

function addAssets(source) {
  let next = source;
  if (!next.includes('/assets/css/header-unified.css')) next = next.replace(/<\/head>/i, '  <link rel="stylesheet" href="/assets/css/header-unified.css">\n</head>');
  if (!next.includes('/assets/js/header-unified.js')) next = next.replace(/<\/body>/i, '<script src="/assets/js/header-unified.js" defer></script>\n</body>');
  return next;
}

function replacePropertyNav(source, file) {
  const generated = /\s*<!-- unified-property-nav:start -->[\s\S]*?<!-- unified-property-nav:end -->\s*/;
  if (legalPage(file)) return source.replace(generated, "\n");
  const markup = propertyDiscoveryMarkup(file);
  if (generated.test(source)) return source.replace(generated, `\n${markup}\n`);

  const next = source;
  if (file === "index.html") {
    const legacy = /<section\b[^>]*class=["'][^"']*\bstage12-categories\b[^"']*["'][^>]*>/i.exec(next);
    if (!legacy) throw new Error("Homepage property navigation target is missing.");
    const end = matchingElementEnd(next, legacy.index, "section");
    return `${next.slice(0, legacy.index)}${markup}${next.slice(end)}`;
  }

  const headerEnd = next.indexOf("<!-- unified-public-header:end -->");
  if (headerEnd === -1) throw new Error(`${file}: generated header boundary is missing.`);
  const contentStart = headerEnd + "<!-- unified-public-header:end -->".length;
  const main = /<main\b[^>]*>/i.exec(next.slice(contentStart));
  const mainStart = main ? contentStart + main.index : -1;
  const firstSection = /<section\b[^>]*>/i.exec(next.slice(contentStart));
  const sectionStart = firstSection ? contentStart + firstSection.index : -1;
  const sectionTag = firstSection ? firstSection[0] : "";
  const sectionBeforeMain = sectionStart !== -1 && (mainStart === -1 || sectionStart < mainStart);
  const sectionIsHero = /class=["'][^"']*(?:hero|team-intro)[^"']*["']/i.test(sectionTag);

  if (sectionStart !== -1 && (sectionBeforeMain || sectionIsHero)) {
    const end = matchingElementEnd(next, sectionStart, "section");
    return `${next.slice(0, end)}\n${markup}\n${next.slice(end)}`;
  }
  if (mainStart !== -1) return `${next.slice(0, mainStart)}${markup}\n${next.slice(mainStart)}`;
  return `${next.slice(0, contentStart)}\n${markup}\n${next.slice(contentStart)}`;
}

function normalizeHeaderBoundary(source) {
  return source.replace(/(<!-- unified-public-header:end -->\r?\n)[ \t]*\r?\n[ \t]*(?=<section\b)/, "$1\n");
}

let changed = 0;
for (const publicPath of publicPaths()) {
  const file = fileFor(publicPath);
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) throw new Error(`Missing public page: ${file}`);
  const source = fs.readFileSync(absolute, "utf8");
  const withHeader = replaceHeader(source, headerMarkup(file));
  const output = normalizeHeaderBoundary(addAssets(replacePropertyNav(withHeader, file)));
  if (output !== source) {
    changed += 1;
    if (!check) fs.writeFileSync(absolute, output);
  }
}

if (check && changed) {
  console.error(`Public header drift detected in ${changed} page(s). Run: node _tools/sync-public-header.mjs`);
  process.exit(1);
}
console.log(check ? "Public header sync is current." : `Unified public header synced: ${changed} page(s).`);
