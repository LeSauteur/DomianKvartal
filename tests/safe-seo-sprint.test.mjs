import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = process.cwd();
const ORIGIN = "https://domian-161.ru";
const ORG_ID = `${ORIGIN}/#organization`;
const SKIP_PREFIXES = ["_private/", "_prototype_catalog/", "company-rebuild/", "source/", "ui-blocks/", "ui-rebuild/"];

function trackedHtml() {
  return execFileSync("git", ["ls-files", "*.html"], { encoding: "utf8" })
    .trim()
    .split(/\r?\n/u)
    .map((file) => file.replaceAll("\\", "/"))
    .filter((file) => file && file !== "index-preview.html" && !SKIP_PREFIXES.some((prefix) => file.startsWith(prefix)))
    .filter((file) => !/^(?:google|yandex_).*\.html$/u.test(file));
}

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), "utf8");
}

function jsonLd(file) {
  return [...read(file).matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/giu)]
    .flatMap((match) => {
      const value = JSON.parse(match[1]);
      if (Array.isArray(value)) return value;
      return Array.isArray(value["@graph"]) ? value["@graph"] : [value];
    });
}

function jsonLdFromSource(source) {
  return [...source.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/giu)]
    .flatMap((match) => {
      const value = JSON.parse(match[1]);
      if (Array.isArray(value)) return value;
      return Array.isArray(value["@graph"]) ? value["@graph"] : [value];
    });
}

function typesIn(value, result = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => typesIn(item, result));
  } else if (value && typeof value === "object") {
    if (value["@type"]) result.push(...(Array.isArray(value["@type"]) ? value["@type"] : [value["@type"]]));
    Object.values(value).forEach((item) => typesIn(item, result));
  }
  return result;
}

function localTarget(fromFile, href) {
  const baseDir = path.posix.dirname(fromFile) === "." ? "" : `${path.posix.dirname(fromFile)}/`;
  const url = new URL(href, `${ORIGIN}/${baseDir}`);
  return { url, file: decodeURIComponent(url.pathname).replace(/^\//u, "") || "index.html" };
}

test("homepage links are normalized by resolved target, without touching nested index pages", () => {
  let homepageLinks = 0;
  for (const file of trackedHtml()) {
    for (const match of read(file).matchAll(/<a\b[^>]*href=(["'])(.*?)\1/giu)) {
      const href = match[2].replaceAll("&amp;", "&");
      if (!href || href.includes("${") || /^(?:https?:|mailto:|tel:|#|\/\/)/u.test(href)) continue;
      const { url } = localTarget(file, href);
      if (url.origin === ORIGIN && url.pathname === "/index.html") {
        homepageLinks += 1;
        assert.fail(`${file} still links to the homepage through ${href}`);
      }
      if (href === "/" || href.startsWith("/#")) homepageLinks += 1;
    }
  }
  assert.ok(homepageLinks > 100, "expected a repo-wide set of normalized homepage links");
});

test("entity graph uses one organization id and only verified profile URLs", () => {
  const nodes = jsonLd("index.html");
  const organization = nodes.find((node) => node["@type"] === "RealEstateAgent");
  assert.ok(organization);
  assert.equal(organization["@id"], ORG_ID);
  assert.equal("logo" in organization, false);
  assert.deepEqual(new Set(organization.sameAs), new Set([
    "https://yandex.ru/maps/org/domian/158078581361/",
    "https://2gis.ru/aksaj/firm/70000001100211878",
    "https://agencies.domclick.ru/agency/354726",
    "https://reestr.rgr.ru/agentstvo-alieva-z-a-an-domian-21158/",
    "https://vk.com/domian_kvartal"
  ]));
  assert.doesNotMatch(read("index.html"), /assets\/logo\.png/u);
});

test("public specialists are represented as Person nodes connected to the organization", () => {
  const html = read("team/zukhra-alieva.html");
  const personNodes = jsonLd("team/zukhra-alieva.html").filter((node) => node["@type"] === "Person");
  const profileIds = [...html.matchAll(/class=["'][^"']*\bagent-card\b[^"']*["'][^>]*\bid=["']([^"']+)["']/giu)]
    .map((match) => match[1]);
  assert.equal(profileIds.length, 5);
  assert.equal(personNodes.length, profileIds.length);
  for (const person of personNodes) {
    assert.equal(person.worksFor?.["@id"], ORG_ID);
    assert.ok(person.name && html.includes(person.name));
    assert.ok(person.url && profileIds.some((id) => person.url.endsWith(`#${id}`)));
  }
  assert.ok(jsonLd("team/zukhra-alieva.html").some((node) => node["@type"] === "BreadcrumbList"));
});

test("guides reuse the organization and expose valid breadcrumbs", () => {
  const files = fs.readdirSync(path.join(ROOT, "guides"))
    .filter((file) => file.endsWith(".html") && file !== "index.html")
    .map((file) => `guides/${file}`);
  assert.ok(files.length >= 5);
  for (const file of files) {
    const nodes = jsonLd(file);
    const article = nodes.find((node) => node["@type"] === "Article");
    assert.ok(article, `${file} must have Article schema`);
    assert.equal(article.author?.["@id"], ORG_ID);
    assert.equal(article.publisher?.["@id"], ORG_ID);
    assert.ok(nodes.some((node) => node["@type"] === "BreadcrumbList"));
  }
  assert.ok(jsonLd("guides/index.html").some((node) => node["@type"] === "BreadcrumbList"));
});

test("only complete newbuild records receive the new breadcrumb graph", () => {
  const catalog = JSON.parse(read("output/newbuilds/catalog-v3.json"));
  const complete = catalog.items.filter((item) => item.completeness.state === "complete");
  assert.equal(complete.length, catalog.completeness_counts.complete);
  for (const item of complete) {
    const file = `${item.detail_url}index.html`;
    assert.ok(fs.existsSync(path.join(ROOT, file)), `${item.id} detail page must exist`);
    const nodes = jsonLd(file);
    assert.ok(nodes.some((node) => node["@type"] === "Residence" && node["@id"]?.endsWith("#residence")));
    assert.ok(nodes.some((node) => node["@type"] === "BreadcrumbList"));
  }
  for (const item of catalog.items.filter((entry) => entry.completeness.state !== "complete" && entry.detail_url)) {
    const nodes = jsonLd(`${item.detail_url}index.html`);
    assert.equal(nodes.some((node) => node["@type"] === "BreadcrumbList"), false, `${item.id} is not complete`);
  }
});

test("construction projects expose honest Service and Breadcrumb schemas", () => {
  const files = fs.readdirSync(path.join(ROOT, "construction/projects"))
    .filter((file) => file.endsWith(".html"))
    .map((file) => `construction/projects/${file}`);
  assert.equal(files.length, 26);
  for (const file of files) {
    const nodes = jsonLd(file);
    const service = nodes.find((node) => node["@type"] === "Service");
    assert.ok(service, `${file} must have Service schema`);
    assert.equal(service.provider?.["@id"], ORG_ID);
    assert.equal("offers" in service, false);
    assert.ok(nodes.some((node) => node["@type"] === "BreadcrumbList"));
  }
  for (const file of fs.readdirSync(path.join(ROOT, "construction/builders")).filter((item) => item.endsWith(".html"))) {
    assert.ok(jsonLd(`construction/builders/${file}`).some((node) => node["@type"] === "BreadcrumbList"));
  }
  assert.equal(jsonLd("construction.html").find((node) => node["@type"] === "Service")?.provider?.["@id"], ORG_ID);
});

test("structured data contains none of the prohibited mass schema types", () => {
  const prohibited = new Set(["AggregateRating", "FAQPage", "Offer", "Product"]);
  for (const file of trackedHtml()) {
    let baseline = "";
    try {
      baseline = execFileSync("git", ["show", `HEAD:${file}`], { encoding: "utf8" });
    } catch {
      baseline = "";
    }
    const baselineTypes = baseline ? typesIn(jsonLdFromSource(baseline)) : [];
    const currentTypes = typesIn(jsonLd(file));
    for (const type of prohibited) {
      const before = baselineTypes.filter((value) => value === type).length;
      const after = currentTypes.filter((value) => value === type).length;
      assert.ok(after <= before, `${file} newly adds ${type}`);
    }
  }
});

test("every static local content image has intrinsic dimensions", () => {
  for (const file of trackedHtml()) {
    const html = read(file);
    for (const match of html.matchAll(/<img\b[^>]*>/giu)) {
      const tag = match[0];
      const src = (tag.match(/(?:^|\s)src\s*=\s*(["'])(.*?)\1/iu) || [])[2] || "";
      if (!src || src.startsWith("#") || tag.includes("${") || /^(?:https?:|data:|\/\/)/u.test(src)) continue;
      const target = localTarget(file, src).file;
      if (!fs.existsSync(path.join(ROOT, target))) continue;
      assert.match(tag, /(?:^|\s)width=["']\d+["']/iu, `${file}: ${src} has no width`);
      assert.match(tag, /(?:^|\s)height=["']\d+["']/iu, `${file}: ${src} has no height`);
    }
  }
});

test("analytics guards are present and performance images are materially smaller", () => {
  const main = read("assets/js/main.js");
  assert.match(main, /DOMIAN_ANALYTICS_DISABLED/u);
  assert.match(main, /catalog_filter_use/u);
  assert.match(main, /property_card_open/u);
  assert.match(main, /guide_to_catalog/u);
  assert.match(main, /guide_to_lead/u);
  assert.match(main, /mortgage_interaction/u);
  for (const file of trackedHtml().filter((item) => read(item).includes("mc.yandex.ru/metrika/tag.js"))) {
    assert.match(read(file), /DOMIAN_ANALYTICS_DISABLED/u, `${file} lacks a local/QA Metrika guard`);
  }
  for (const name of ["hero-interior", "premium-house"]) {
    const png = fs.statSync(path.join(ROOT, `assets/images/home-stage12/${name}.png`)).size;
    const webp = fs.statSync(path.join(ROOT, `assets/images/home-stage12/${name}.webp`)).size;
    assert.ok(webp < png * 0.25, `${name}.webp should be at least 75% smaller`);
  }
});
