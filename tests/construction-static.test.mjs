import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const dataFile = path.join(root, "_private", "construction-projects.json");
const catalogueFile = path.join(root, "construction.html");
const projectDirectory = path.join(root, "construction", "projects");
const builderDirectory = path.join(root, "construction", "builders");
const data = JSON.parse(fs.readFileSync(dataFile, "utf8"));
const catalogue = fs.readFileSync(catalogueFile, "utf8");

function count(source, expression) {
  return [...source.matchAll(expression)].length;
}

function filesIn(directory) {
  return fs.readdirSync(directory).filter((name) => name.endsWith(".html")).sort();
}

function localMediaReferences(file, source) {
  const refs = [];
  const expression = /\b(?:src|srcset)="([^"]+)"/g;
  for (const match of source.matchAll(expression)) {
    for (const candidate of match[1].split(",")) {
      const reference = candidate.trim().split(/\s+/)[0];
      if (!reference || /^(?:https?:|data:|#)/.test(reference)) continue;
      if (!/\.(?:webp|png|jpe?g)$/i.test(reference)) continue;
      refs.push(path.resolve(path.dirname(file), decodeURIComponent(reference)));
    }
  }
  return refs;
}

function localPageReferences(file, source) {
  const refs = [];
  for (const match of source.matchAll(/\bhref="([^"]+)"/g)) {
    const reference = match[1];
    if (!reference || /^(?:https?:|mailto:|tel:|javascript:)/.test(reference)) continue;
    const [pathAndQuery, fragment] = reference.split("#");
    const pathname = pathAndQuery.split("?")[0];
    const target = pathname
      ? pathname.startsWith("/")
        ? path.resolve(root, decodeURIComponent(pathname).replace(/^\/+/, ""))
        : path.resolve(path.dirname(file), decodeURIComponent(pathname))
      : file;
    refs.push({ reference, target, fragment: fragment || "" });
  }
  return refs;
}

test("central catalogue preserves 26 projects and adds six distinct completed objects", () => {
  assert.equal(data.projects.length, 32);
  assert.deepEqual(
    Object.fromEntries(["domanstroy", "soyuz", "eqvita", "postroim-dom"].map((builder) => [builder, data.projects.filter((project) => project.builderId === builder).length])),
    { domanstroy: 7, soyuz: 15, eqvita: 4, "postroim-dom": 6 }
  );
  assert.equal(new Set(data.projects.map((project) => project.slug)).size, 32);
  assert.ok(data.projects.filter((project) => project.recordType === "project").every((project) => project.sourceDocument && project.sourcePage));
  const built = data.projects.filter((project) => project.recordType === "built-object");
  assert.deepEqual(built.map((project) => [project.area, project.constructionDays, project.location]), [
    [110, 180, "Константиновск"], [100, 120, "Ростов-на-Дону"], [110, 180, "Ростов-на-Дону"],
    [100, 180, "Ростов-на-Дону"], [100, 90, "Ростов-на-Дону"], [120, 200, "Ростов-на-Дону"]
  ]);
  assert.equal(new Set(built.map((project) => project.sourceRecordId)).size, 6);
  assert.equal(new Set(built.map((project) => project.sourceImages[0].originalUrl)).size, 6);
  for (const project of built) {
    assert.equal(project.sourceUrl, "https://postroim-dom-rostov.ru/");
    assert.equal(project.price, null);
    assert.equal(project.floors, null);
    assert.equal(project.projectType, null);
    assert.equal(project.bathrooms, null);
    assert.deepEqual(project.floorPlans, []);
    assert.equal(project.gallery.length, 1);
    assert.match(project.sourceImages[0].originalUrl, /^https:\/\/static\.tildacdn\.com\/tild[^/]+\/[^/]+\.(?:png|jpeg)$/);
    assert.equal(project.pricePackage, "Под ключ");
  }
  assert.deepEqual(built.map((project) => project.bedrooms), [null, null, null, 3, null, null]);
});

test("catalogue renders all cards and all filters without hiding unknown data by default", () => {
  assert.equal(count(catalogue, /<article class="construction-card(?:\s|\")/g), 32);
  assert.equal(count(catalogue, /\bdata-project-card\b/g), 32);
  for (const field of ["builder", "area", "floors", "bedrooms", "material", "price", "projectType", "recordType"]) {
    assert.match(catalogue, new RegExp(`name="${field}"`));
  }
  assert.match(catalogue, /<noscript>/);
  assert.match(catalogue, /data-project-count>32</);
});

test("every project and builder has a separate indexable page", () => {
  const projectFiles = filesIn(projectDirectory);
  const builderFiles = filesIn(builderDirectory);
  assert.equal(projectFiles.length, 32);
  assert.equal(builderFiles.length, 4);

  for (const name of [...projectFiles, ...builderFiles]) {
    const file = projectFiles.includes(name) ? path.join(projectDirectory, name) : path.join(builderDirectory, name);
    const source = fs.readFileSync(file, "utf8");
    assert.equal(count(source, /<title>[^<]+<\/title>/g), 1, `${name}: title`);
    assert.equal(count(source, /<meta name="description" content="[^"]+">/g), 1, `${name}: description`);
    assert.equal(count(source, /<link rel="canonical" href="https:\/\/domian-161\.ru\/[^"]+">/g), 1, `${name}: canonical`);
    assert.equal(count(source, /<h1(?:\s[^>]*)?>/g), 1, `${name}: H1`);
    assert.match(source, /property="og:title"/);
    assert.match(source, /application\/ld\+json/);
  }
});

test("project pages use honest service schema and expose no invented offer", () => {
  for (const name of filesIn(projectDirectory)) {
    const source = fs.readFileSync(path.join(projectDirectory, name), "utf8");
    const built = name.startsWith("postroim-dom-");
    assert.match(source, built ? /"@type":"WebPage"/ : /"@type":"Service"/);
    assert.doesNotMatch(source, /"@type":"Product"/);
    assert.doesNotMatch(source, /"offers"\s*:/);
    if (!built) assert.match(source, /Не является публичной офертой/);
    if (built) {
      assert.doesNotMatch(source, /Рендер проекта|вариант фасада|class="[^\"]*project-plan|class="[^\"]*project-living|None этажа/);
      assert.doesNotMatch(source, /(?:src|srcset)="https?:\/\//);
      assert.match(source, /Стоимость и срок нового строительства определяются отдельно/);
    }
    assert.match(source, /data-project-code=/);
    assert.match(source, /name="project_code"/);
    assert.match(source, /name="price_version"/);
  }
});

test("all construction image references resolve to optimized local media", () => {
  const files = [
    catalogueFile,
    ...filesIn(projectDirectory).map((name) => path.join(projectDirectory, name)),
    ...filesIn(builderDirectory).map((name) => path.join(builderDirectory, name))
  ];
  const missing = [];
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    for (const mediaFile of localMediaReferences(file, source)) {
      if (!fs.existsSync(mediaFile)) missing.push(`${path.relative(root, file)} -> ${path.relative(root, mediaFile)}`);
    }
  }
  assert.deepEqual(missing, []);
  assert.ok(filesIn(projectDirectory).every((name) => /-640\.webp/.test(fs.readFileSync(path.join(projectDirectory, name), "utf8"))));
});

test("all local links in the construction cluster resolve", () => {
  const files = [
    catalogueFile,
    ...filesIn(projectDirectory).map((name) => path.join(projectDirectory, name)),
    ...filesIn(builderDirectory).map((name) => path.join(builderDirectory, name))
  ];
  const failures = [];
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    for (const link of localPageReferences(file, source)) {
      if (!fs.existsSync(link.target)) {
        failures.push(`${path.relative(root, file)} -> missing ${link.reference}`);
        continue;
      }
      if (link.fragment && path.extname(link.target).toLowerCase() === ".html") {
        const targetSource = fs.readFileSync(link.target, "utf8");
        if (!new RegExp(`\\bid=["']${link.fragment.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}["']`).test(targetSource)) {
          failures.push(`${path.relative(root, file)} -> missing anchor ${link.reference}`);
        }
      }
    }
  }
  assert.deepEqual(failures, []);
});

test("approved prices remain visible while source dates stay private", () => {
  const domanPrices = Object.fromEntries(data.projects.filter((project) => project.builderId === "domanstroy" && project.price).map((project) => [project.area, project.price]));
  assert.deepEqual(domanPrices, { 85: 4590000, 116: 6032000, 130: 6760000 });
  assert.ok(data.projects.filter((project) => project.builderId === "soyuz").every((project) => project.priceDate === "2023" && project.priceStatus === "partner-outdated"));
  assert.ok(data.projects.filter((project) => project.builderId === "eqvita").every((project) => project.price === null && project.priceStatus === "individual"));
  assert.doesNotMatch(catalogue, /Ориентир по материалам партнёра 2023 года|таблица от май 2026|Что подтверждено|структурированные данные/);
  for (const project of data.projects.filter(project => project.price)) {
    const card = catalogue.match(new RegExp(`<article[^>]*data-project-card[^>]*data-price="${project.price}"[\\s\\S]*?</article>`));
    assert.ok(card, project.slug);
    assert.ok(card[0].includes(new Intl.NumberFormat("ru-RU").format(project.price)), project.slug);
    assert.match(card[0], /Цена и наличие не являются публичной офертой/);
  }
});

test("private partner mechanics are absent from public construction pages", () => {
  const sources = [catalogue, ...filesIn(projectDirectory).map((name) => fs.readFileSync(path.join(projectDirectory, name), "utf8"))].join("\n");
  for (const forbidden of [
    /89281740083/,
    /8\s*928\s*174[\s-]*00[\s-]*83/,
    /domanstroy_partners/i,
    /закрепляется за агентом/i,
    /агентское вознаграждение/i,
    /комисси(?:я|онные) агент/i
  ]) {
    assert.doesNotMatch(sources, forbidden);
  }
});

test("price requests are not repeated and White Box belongs only to Soyuz cards", () => {
  const sources = [catalogue, ...filesIn(projectDirectory).map(name => fs.readFileSync(path.join(projectDirectory, name), "utf8")), ...filesIn(builderDirectory).map(name => fs.readFileSync(path.join(builderDirectory, name), "utf8"))];
  for (const source of sources) {
    for (const match of source.matchAll(/<div class="(?:construction-card__price|project-hero__price|project-price-note)">([\s\S]*?)<\/div>/g)) {
      const text = match[1].replace(/<[^>]+>/g, " ");
      assert.ok(count(text, /Стоимость по запросу/g) <= 1, text);
      assert.doesNotMatch(match[1], /<(?:small|span|p)>\s*<\//);
    }
    for (const match of source.matchAll(/<article class="construction-card[^>]*>[\s\S]*?<\/article>/g)) {
      if (match[0].includes("Комплектация White Box")) assert.match(match[0], /data-builder="soyuz"/);
    }
  }
  for (const project of data.projects) {
    if (JSON.stringify(project).includes("White Box")) assert.equal(project.builderId, "soyuz");
  }
});

test("builder descriptions use customer text and counted projects", () => {
  const expected = { domanstroy: "7 проектов", soyuz: "15 проектов", eqvita: "4 проекта", "postroim-dom": "6 построенных домов" };
  for (const [builder, quantity] of Object.entries(expected)) {
    const html = fs.readFileSync(path.join(builderDirectory, `${builder}.html`), "utf8");
    for (const pattern of [/<meta name="description" content="([^"]*)"/, /<meta property="og:description" content="([^"]*)"/]) {
      const description = html.match(pattern)?.[1];
      assert.ok(description?.includes(quantity), description);
      assert.doesNotMatch(description, /из материалов компании/);
    }
  }
});

test("sitemap and contextual navigation include the construction cluster", () => {
  const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
  assert.match(sitemap, /https:\/\/domian-161\.ru\/construction\.html/);
  for (const project of data.projects) {
    assert.match(sitemap, new RegExp(`https://domian-161\\.ru/construction/projects/${project.slug}\\.html`));
  }
  assert.match(fs.readFileSync(path.join(root, "index.html"), "utf8"), /Проекты домов под ключ/);
  assert.match(fs.readFileSync(path.join(root, "lands.html"), "utf8"), /Подобрать проект под участок/);
  assert.match(fs.readFileSync(path.join(root, "houses.html"), "utf8"), /Купить готовый дом или построить/);
  assert.match(fs.readFileSync(path.join(root, "newbuilds.html"), "utf8"), /Сравнить с частным домом/);
});
