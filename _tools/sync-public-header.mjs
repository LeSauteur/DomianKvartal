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

function variantFor(file) {
  // Construction hero photography is intentionally light. A solid shell keeps
  // every navigation control legible without altering the hero content.
  if (file === "index.html" || file.startsWith("guides/") || file.startsWith("newbuilds/")) return "overlay";
  return "solid";
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

function headerMarkup(file) {
  const cluster = clusterFor(file);
  const variant = variantFor(file);
  const servicesActive = ["rent", "commercial", "construction"].includes(cluster);
  const companyActive = cluster === "team";
  const compact = file.startsWith("newbuilds/") ? " unified-header--compact" : "";
  return `<!-- unified-public-header:start -->
<header class="unified-header unified-header--${variant}${compact}" data-unified-header data-header-variant="${variant}" data-active-cluster="${cluster}">
  <div class="unified-header__inner">
    <button class="theme-toggle theme-toggle--header unified-header__utility" type="button" data-unified-theme-toggle aria-label="Включить тёмную тему" aria-pressed="false" title="Тёмная тема"><span aria-hidden="true">◐</span><span class="visually-hidden">Переключить тему</span></button>
    <a class="unified-header__brand" href="/">Домиан · офис «Квартал»</a>
    <nav class="unified-header__desktop-nav" aria-label="Основная навигация">
      ${desktopLink("Квартиры", "/apartments.html", cluster, "apartments")}
      ${desktopLink("Дома", "/houses.html", cluster, "houses")}
      ${desktopLink("Участки", "/lands.html", cluster, "lands")}
      ${desktopLink("Новостройки", "/newbuilds.html", cluster, "newbuilds")}
      <div class="unified-header__dropdown" data-unified-dropdown><button type="button" aria-expanded="false" aria-controls="header-services-menu"${servicesActive ? ' class="is-active" aria-current="page"' : ""}>Услуги <span aria-hidden="true">⌄</span></button><div id="header-services-menu" class="unified-header__submenu" role="group" aria-label="Услуги" hidden>${desktopLink("Аренда", "/rent.html", cluster, "rent")}${desktopLink("Коммерческая недвижимость", "/commercial.html", cluster, "commercial")}${desktopLink("Строительство домов", "/construction.html", cluster, "construction")}</div></div>
      ${desktopLink("Гид", "/guides/", cluster, "guides")}
      <div class="unified-header__dropdown" data-unified-dropdown><button type="button" aria-expanded="false" aria-controls="header-company-menu"${companyActive ? ' class="is-active" aria-current="page"' : ""}>О компании <span aria-hidden="true">⌄</span></button><div id="header-company-menu" class="unified-header__submenu" role="group" aria-label="О компании" hidden>${desktopLink("Команда", "/team/zukhra-alieva.html", cluster, "team")}<a href="/#contact">Контакты</a><a href="/details.html">Реквизиты</a></div></div>
    </nav>
    <div class="unified-header__contacts header-contacts"><a href="tel:+79536091122">+7 953 609-11-22</a><a href="${maxUrl}" target="_blank" rel="noopener noreferrer" data-channel="max" data-max-trigger aria-label="Написать Зухре в MAX">MAX</a><a href="${telegramUrl}" target="_blank" rel="noopener noreferrer" data-channel="telegram" aria-label="Написать Зухре в Telegram">Telegram</a></div>
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

function normalizeHeaderBoundary(source) {
  return source.replace(/(<!-- unified-public-header:end -->\r?\n)[ \t]*\r?\n[ \t]*(?=<section\b)/, "$1\n");
}

let changed = 0;
for (const publicPath of publicPaths()) {
  const file = fileFor(publicPath);
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) throw new Error(`Missing public page: ${file}`);
  const source = fs.readFileSync(absolute, "utf8");
  const output = normalizeHeaderBoundary(addAssets(replaceHeader(source, headerMarkup(file))));
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
