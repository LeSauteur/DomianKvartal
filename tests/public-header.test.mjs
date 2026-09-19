import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
const publicPaths = [...new Set([...sitemap.matchAll(/<loc>https:\/\/domian-161\.ru\/(.*?)<\/loc>/g)].map((match) => match[1] || "index.html").concat("seo/zhk-flora-aksay.html"))];
const desktop = ["Квартиры", "Дома", "Участки", "Новостройки", "Услуги", "Гид", "О компании"];
const mobile = ["Главная", "Квартиры", "Дома", "Участки", "Новостройки", "Аренда", "Коммерческая недвижимость", "Строительство домов", "Гид покупателя", "Команда", "Контакты"];
const propertyDirections = ["Квартиры", "Дома", "Участки", "Коммерция", "Новостройки"];
const propertyDescriptions = ["Подбор квартир", "Город и загород", "ИЖС и дачи", "Для бизнеса", "ЖК и комплексы"];
const legalPages = new Set(["details.html", "offer.html", "privacy.html", "personal-data-consent.html", "cookies.html"]);
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

function fileFor(publicPath) { return publicPath.endsWith("/") ? `${publicPath}index.html` : publicPath; }
function expectedCluster(file) {
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

test("public header sync is current", () => {
  execFileSync(process.execPath, ["_tools/sync-public-header.mjs", "--check"], { cwd: root, stdio: "pipe" });
});

test("all sitemap public pages use the canonical static header", () => {
  assert.ok(publicPaths.length >= 95);
  assert.ok(publicPaths.includes("sell-apartment.html"));
  assert.ok(publicPaths.includes("property-valuation.html"));
  for (const publicPath of publicPaths) {
    const file = fileFor(publicPath);
    const html = fs.readFileSync(path.join(root, file), "utf8");
    const headerBlock = html.match(/<!-- unified-public-header:start -->[\s\S]*?<!-- unified-public-header:end -->/)?.[0] || "";
    assert.match(html, /data-unified-header/,
      `${file}: missing unified header marker`);
    assert.match(html, /data-unified-drawer/,
      `${file}: missing unified drawer`);
    assert.match(html, /class="unified-header__brand" href="\/"/,
      `${file}: brand must point to /`);
    assert.match(html, /aria-label="Домиан Квартал — на главную"/,
      `${file}: brand must have a stable accessible name`);
    assert.match(html, /class="kvartal-mark"[^>]*aria-hidden="true"/,
      `${file}: inline brand mark is missing or exposed to assistive technology`);
    assert.match(html, /domian-kvartal-logo-seen-v1/,
      `${file}: session logo-animation key is missing`);
    assert.doesNotMatch(headerBlock, /unified-header--(?:overlay|solid|compact)|data-header-variant/,
      `${file}: legacy visual header variant remains`);
    assert.doesNotMatch(headerBlock, /Домиан · офис «Квартал»/,
      `${file}: legacy visible brand name remains`);
    assert.match(html, new RegExp(`data-active-cluster="${expectedCluster(file)}"`),
      `${file}: wrong active cluster`);
    for (const item of desktop) assert.match(html, new RegExp(item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${file}: missing desktop ${item}`);
    for (const item of mobile) assert.match(html, new RegExp(`>${item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}<`), `${file}: missing mobile ${item}`);

    const navBlocks = html.match(/<!-- unified-property-nav:start -->[\s\S]*?<!-- unified-property-nav:end -->/g) || [];
    if (legalPages.has(file)) {
      assert.equal(navBlocks.length, 0, `${file}: legal pages must not include property navigation`);
    } else {
      assert.equal(navBlocks.length, 1, `${file}: must include one generated property navigation block`);
      for (const item of propertyDirections) assert.match(navBlocks[0], new RegExp(`>${item}<`), `${file}: property navigation is missing ${item}`);
      for (const item of propertyDescriptions) assert.match(navBlocks[0], new RegExp(`>${item}<`), `${file}: property navigation is missing ${item}`);
      assert.match(navBlocks[0], /unified-property-nav__image/, `${file}: property navigation must stay photographic`);
      const expectedMode = file === "index.html" ? "cards" : (internalSearchTargets.has(file) ? "internal" : "compact");
      assert.match(navBlocks[0], new RegExp(`unified-property-nav--${expectedMode}`),
        `${file}: wrong property navigation mode`);
      const searchTarget = internalSearchTargets.get(file);
      if (searchTarget) {
        assert.match(navBlocks[0], /class="unified-property-search"/, `${file}: missing shared search action`);
        assert.match(navBlocks[0], new RegExp(`href="${searchTarget.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`), `${file}: wrong shared search destination`);
      } else {
        assert.doesNotMatch(navBlocks[0], /class="unified-property-search"/, `${file}: shared search must only appear on main internal pages`);
      }
    }
  }
});

test("canonical header stylesheet enforces a normal-flow shell and a clean mobile rail", () => {
  const css = fs.readFileSync(path.join(root, "assets/css/header-unified.css"), "utf8");
  assert.match(css, /--site-shell-width:\s*1320px/);
  assert.match(css, /body > header\.unified-header\s*\{[\s\S]*?position:\s*relative\s*!important/);
  assert.doesNotMatch(css, /\.unified-header(?:--[a-z-]+)?\s*\{[^}]*position:\s*(?:absolute|fixed)/);
  assert.match(css, /scroll-snap-type:\s*x\s+mandatory/);
  assert.match(css, /scrollbar-width:\s*none/);
  assert.match(css, /unified-property-nav__track::\-webkit-scrollbar\s*\{\s*display:\s*none/);
  assert.match(css, /touch-action:\s*pan-x/);
  assert.match(css, /@media \(max-width:\s*768px\)[\s\S]*?\.unified-property-discovery\s*\{[\s\S]*?display:\s*none/);
  assert.doesNotMatch(css, /unified-property-nav--compact[^}]*unified-property-nav__image[^}]*display:\s*none/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

test("canonical public navigation destinations resolve locally", () => {
  for (const target of ["/", "/apartments.html", "/houses.html", "/lands.html", "/newbuilds.html", "/rent.html", "/commercial.html", "/construction.html", "/guides/", "/team/zukhra-alieva.html", "/details.html"]) {
    const local = target === "/" ? "index.html" : (target.endsWith("/") ? `${target.slice(1)}index.html` : target.slice(1));
    assert.ok(fs.existsSync(path.join(root, local)), `${target} must resolve to a public file`);
  }
});
