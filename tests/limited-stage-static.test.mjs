import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function attribute(markup, name) {
  const match = markup.match(new RegExp(`${name}=["']([^"']+)["']`, "i"));
  return match ? match[1] : "";
}

function decodeHtml(value) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function textContent(markup) {
  return decodeHtml(markup.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function staticCardSnapshot(match) {
  const attributes = match[1];
  const body = match[2];
  const heading = body.match(/<h3>\s*<a\b([^>]*)>([\s\S]*?)<\/a>\s*<\/h3>/i);
  const image = body.match(/<img\b([^>]*)>/i);
  if (/\d[\d\s.,]*\s*₽/.test(textContent(body))) assert.match(body, /Цена и наличие не являются публичной офертой/);

  assert.ok(heading, `card ${attribute(attributes, "data-newbuild-id")} needs a linked heading`);
  assert.ok(image, `card ${attribute(attributes, "data-newbuild-id")} needs a cover image`);


  return {
    id: attribute(attributes, "data-newbuild-id"),
    slug: attribute(attributes, "data-newbuild-slug"),
    state: attribute(attributes, "data-completeness"),
    detailUrl: attribute(heading[1], "href"),
    title: textContent(heading[2]),
    coverSrc: attribute(image[1], "src"),
    coverAlt: attribute(image[1], "alt")
  };
}

function expectedCompleteSnapshot(item) {
  return {
    id: item.id,
    slug: item.slug,
    state: item.completeness.state,
    detailUrl: item.detail_url,
    title: item.title,
    coverSrc: item.cover.src,
    coverAlt: item.cover.alt
  };
}

test("newbuilds source HTML contains exactly the 20 complete catalog cards", () => {
  const html = read("newbuilds.html");
  const catalog = JSON.parse(read("output/newbuilds/catalog-v3.json"));
  const section = html.match(/<!-- STATIC_COMPLETE_CARDS_START -->([\s\S]*?)<!-- STATIC_COMPLETE_CARDS_END -->/);

  assert.ok(section, "static complete-card markers must be present");
  const cards = [...section[1].matchAll(/<article\b([^>]*)>([\s\S]*?)<\/article>/gi)];
  const completeItems = catalog.items.filter((item) => item.completeness?.state === "complete");

  assert.equal(completeItems.length, 20, "catalog should still have 20 complete entries");
  assert.equal(cards.length, 20, "source HTML must expose 20 cards");

  const actual = cards.map(staticCardSnapshot).sort((left, right) => left.id.localeCompare(right.id));
  const expected = completeItems.map(expectedCompleteSnapshot).sort((left, right) => left.id.localeCompare(right.id));
  assert.deepEqual(actual, expected, "static card data must match the complete JSON records field by field");
  assert.equal(new Set(actual.map((card) => card.id)).size, 20, "static card ids must be unique");
  assert.equal(new Set(actual.map((card) => card.slug)).size, 20, "static card slugs must be unique");

  actual.forEach((card) => {
    assert.ok(exists(`${card.detailUrl}index.html`), `detail page missing for ${card.id}: ${card.detailUrl}`);
    assert.ok(exists(card.coverSrc), `cover image missing for ${card.id}: ${card.coverSrc}`);
  });
});

test("partial and needs_review records do not gain static cards or undeclared detail pages", () => {
  const html = read("newbuilds.html");
  const catalog = JSON.parse(read("output/newbuilds/catalog-v3.json"));
  const section = html.match(/<!-- STATIC_COMPLETE_CARDS_START -->([\s\S]*?)<!-- STATIC_COMPLETE_CARDS_END -->/)[1];

  assert.doesNotMatch(section, /data-completeness=["'](?:partial|needs_review)["']/);

  catalog.items
    .filter((item) => item.completeness?.state !== "complete")
    .forEach((item) => {
      const generatedPath = `newbuilds/${item.slug}/index.html`;
      if (item.detail_url) {
        assert.ok(exists(`${item.detail_url}index.html`), `declared detail page missing for ${item.id}`);
      } else {
        assert.ok(!exists(generatedPath), `unexpected detail page for ${item.id}: ${generatedPath}`);
      }
    });
});

test("thanks remains noindex and its fallback guides point to existing files", () => {
  const html = read("thanks.html");
  const robots = html.match(/<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/i);
  const fallbackLinks = [...html.matchAll(/data-thanks-guide\s+href=["']([^"']+)["']/gi)].map((match) => match[1]);
  const allGuideLinks = [...new Set([...html.matchAll(/href:\s*["'](guides\/[^"']+\.html)["']/gi)].map((match) => match[1]))];

  assert.ok(robots);
  assert.match(robots[1], /\bnoindex\b/i);
  assert.match(robots[1], /\bnofollow\b/i);
  assert.equal(fallbackLinks.length, 3);
  assert.equal(allGuideLinks.length, 5);
  [...fallbackLinks, ...allGuideLinks].forEach((href) => assert.ok(exists(href), `guide missing: ${href}`));
  assert.match(html, /window\.sessionStorage/);
  assert.doesNotMatch(html, /window\.localStorage/);
});

test("every local offer link and fragment resolves to an existing target", () => {
  const html = read("offer.html");
  const hrefs = [...html.matchAll(/<a\b[^>]*\shref=["']([^"']+)["']/gi)].map((match) => match[1]);

  hrefs.forEach((href) => {
    if (/^(?:https?:|mailto:|tel:)/i.test(href)) return;

    const [rawTarget, fragment = ""] = href.split("#");
    const target = rawTarget || "offer.html";
    const relativeFile = target.endsWith("/") ? `${target}index.html` : target;
    assert.ok(exists(relativeFile), `offer link target missing: ${href}`);

    if (fragment) {
      const targetHtml = read(relativeFile);
      const escaped = fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      assert.match(targetHtml, new RegExp(`id=["']${escaped}["']`), `anchor missing: ${href}`);
    }
  });
});

test("thanks context persistence is limited to an allowlisted non-personal category", () => {
  const handler = read("assets/js/form-handler.js");
  const successGuard = handler.indexOf("data.success !== true");
  const persistenceCall = handler.lastIndexOf("saveThanksCategory(payloadValues)");

  assert.match(handler, /THANKS_CATEGORY_KEY\s*=\s*["']domian_thanks_category["']/);
  assert.match(handler, /aliases\[objectType\]\s*\|\|\s*aliases\[leadType\]/);
  assert.doesNotMatch(handler, /localStorage/);
  assert.ok(successGuard >= 0 && persistenceCall > successGuard, "thanks category must be saved after the success guard");
});


test("newbuild detail regeneration retains values and omits approved technical annotations", async () => {
  const { default: generator } = await import("../_private/generate-newbuild-pages.js");
  const catalog = JSON.parse(read("output/newbuilds/catalog-v3.json"));
  for (const item of catalog.items.filter(item => item.detail_url)) {
    const html = generator.render(item);
    assert.doesNotMatch(html, /Проверено|Источник и актуальность|Проверка данных|Файлы сохранены локально|Официальные материалы/);
    assert.match(html, /Цена и наличие не являются публичной офертой/);
    assert.ok(html.includes(item.official_url || item.sources[0]?.url));
    if (item.price?.value >= 100000) assert.ok(html.includes(new Intl.NumberFormat("ru-RU").format(item.price.value)));
    const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    const residence = schema["@graph"]?.find(node => node["@type"] === "Residence") || schema;
    assert.equal(residence.description, item.description);
    assert.equal(residence.name, item.title);
    const currentSchema = JSON.parse(read(`newbuilds/${item.slug}/index.html`).match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert.deepEqual(schema, currentSchema, `existing schema changed for ${item.slug}`);
  }
});


test("client descriptions stay nonempty and gallery omission never generates a placeholder", async () => {
  const { default: generator } = await import("../_private/generate-newbuild-pages.js");
  const catalog = JSON.parse(read("output/newbuilds/catalog-v3.json"));
  const first = catalog.items.find(item => item.detail_url);
  const empty = generator.render({ ...first, description: "" });
  assert.match(empty, /Подробности — по запросу/);
  assert.doesNotMatch(empty, /undefined|Что уточнить|<p[^>]*>\s*<\/p>/);
  for (const [slug, expected] of [["zhk-lenina-46-rostov", "Сданный жилой комплекс рядом с площадью Ленина."], ["zhk-ekaterininskiy-rostov", "Многокорпусный жилой комплекс в западной части Ростова-на-Дону."]]) {
    const original = catalog.items.find(item => item.slug === slug);
    const html = generator.render({ ...first, description: original.description });
    const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    const residence = schema["@graph"]?.find(node => node["@type"] === "Residence") || schema;
    assert.equal(residence.description, expected);
    assert.ok(html.includes(`<p class="nbd-lead">${expected}</p>`));
    assert.doesNotMatch(html, /не подтвержден|не подтверждён/);
    assert.equal(original.description, catalog.items.find(item => item.slug === slug).description);
  }
  const river = catalog.items.find(item => item.slug === "levoberezhe");
  const html = generator.render(river);
  assert.equal([...html.matchAll(/class="nbd-gallery__item/g)].length, river.images.length);
  assert.doesNotMatch(html, /Что уточнить|nbd-note|placeholder/);
});
