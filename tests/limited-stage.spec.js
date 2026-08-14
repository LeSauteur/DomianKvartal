const { test, expect } = require("@playwright/test");

const LOCAL_ORIGIN = "http://127.0.0.1:4173";
const THANKS_KEY = "domian_thanks_category";
const THANKS_WRITE_LOG = "__test_thanks_category_writes";

const GUIDE_URLS = {
  apartment: "guides/chto-proverit-pered-pokupkoy-kvartiry-v-aksaye.html",
  house: "guides/chto-proverit-pered-pokupkoy-doma-v-aksaye.html",
  land: "guides/chto-proverit-pered-pokupkoy-uchastka-v-aksaye.html",
  newbuild: "guides/novostroyka-ili-vtorichka-v-aksaye.html",
  houseArea: "guides/gde-kupit-dom-v-aksaye-ryadom-s-rostovom.html"
};

const CATEGORY_CASES = [
  {
    category: "apartment",
    source: "/seo/kvartiry-loc-aksay.html",
    cta: 'a[aria-label="Связаться по объекту object_01"]',
    guides: [GUIDE_URLS.apartment, GUIDE_URLS.newbuild, GUIDE_URLS.land]
  },
  {
    category: "house",
    source: "/seo/doma-loc-aksay.html",
    cta: 'a[aria-label="Связаться по объекту house_14"]',
    guides: [GUIDE_URLS.house, GUIDE_URLS.houseArea, GUIDE_URLS.land]
  },
  {
    category: "land",
    source: "/seo/uchastki-loc-aksay.html",
    cta: 'a[aria-label="Связаться по объекту land_03"]',
    guides: [GUIDE_URLS.land, GUIDE_URLS.house, GUIDE_URLS.houseArea]
  },
  {
    category: "newbuild",
    source: "/newbuilds/dvizhenie-61/",
    cta: ".nbd-actions .btn",
    guides: [GUIDE_URLS.newbuild, GUIDE_URLS.apartment, GUIDE_URLS.house]
  }
];

function createGate() {
  let release;
  const promise = new Promise((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

async function blockExternalRequests(page, options = {}) {
  const network = { providerRequests: 0, providerPayloads: [], externalUrls: [] };

  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.origin === LOCAL_ORIGIN) {
      await route.continue();
      return;
    }

    network.externalUrls.push(url.href);
    if (url.hostname === "api.web3forms.com") {
      network.providerRequests += 1;
      network.providerPayloads.push(request.postData() || "");
      if (options.providerHandler) {
        await options.providerHandler(route);
      } else {
        await route.fulfill({ status: 204, body: "" });
      }
      return;
    }
    await route.fulfill({ status: 204, body: "" });
  });

  return network;
}

async function fillLeadForm(page) {
  await page.locator("#lead-name").fill("Проверка категории");
  await page.locator("#lead-phone").fill("+7 999 123-45-67");
  await page.locator("#lead-email").fill("category-test@example.ru");
  await page.locator("#lead-service").selectOption("buy");
  await page.locator("#lead-privacy-consent").check();
}

async function guideHrefs(page) {
  return page.locator("[data-thanks-guide]").evaluateAll((links) => links.map((link) => link.getAttribute("href")));
}

test("JSON enhancement reuses every static card and every filter reuses the same DOM nodes", async ({ page }) => {
  const catalogGate = createGate();
  const network = await blockExternalRequests(page);
  await page.route("**/output/newbuilds/catalog-v3.json", async (route) => {
    await catalogGate.promise;
    await route.continue();
  });

  await page.goto("/newbuilds.html", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#cards > .nb-card")).toHaveCount(20);
  await page.evaluate(() => {
    window.__staticCardRefs = new Map(
      [...document.querySelectorAll("#cards > .nb-card")].map((card) => [card.dataset.newbuildId, card])
    );
  });

  catalogGate.release();
  await expect(page.locator("#resultsCount")).toContainText("Найдено: 78 из 78");
  await expect(page.locator("#cards > .nb-card")).toHaveCount(78);
  expect(await page.evaluate(() => {
    return [...window.__staticCardRefs].every(([id, card]) => card === document.querySelector(`[data-newbuild-id="${id}"]`));
  })).toBe(true);

  await page.evaluate(() => {
    window.__catalogCardRefs = new Map(
      [...document.querySelectorAll("#cards > .nb-card")].map((card) => [card.dataset.newbuildId, card])
    );
  });

  for (const [value, count] of [["partial", 5], ["complete", 20], ["needs_review", 53], ["", 78], ["complete", 20], ["", 78]]) {
    await page.locator("#nbCompleteness").selectOption(value);
    await expect(page.locator("#cards > .nb-card")).toHaveCount(count);
    const identity = await page.evaluate(() => {
      const cards = [...document.querySelectorAll("#cards > .nb-card")];
      return {
        allReused: cards.every((card) => window.__catalogCardRefs.get(card.dataset.newbuildId) === card),
        uniqueIds: new Set(cards.map((card) => card.dataset.newbuildId)).size,
        uniqueNodes: new Set(cards).size
      };
    });
    expect(identity).toEqual({ allReused: true, uniqueIds: count, uniqueNodes: count });
  }

  expect(network.providerRequests).toBe(0);
});

for (const [label, body] of [
  ["malformed JSON", "{"],
  ["object without items", "{}"],
  ["array root", "[]"],
  ["null items", '{"items":null}'],
  ["empty items", '{"items":[]}'],
  ["nonempty incomplete items", '{"items":[{"id":"newbuild-review","slug":"review","completeness":{"state":"needs_review"}}]}'],
  ["duplicate item keys", '{"items":[{"id":"duplicate","slug":"one","completeness":{"state":"complete"},"detail_url":"newbuilds/one/"},{"id":"duplicate","slug":"two","completeness":{"state":"complete"},"detail_url":"newbuilds/two/"}]}']
]) {
  test(`catalog keeps exactly 20 usable static cards for ${label}`, async ({ page }) => {
    const network = await blockExternalRequests(page);
    await page.route("**/output/newbuilds/catalog-v3.json", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body
    }));

    await page.goto("/newbuilds.html", { waitUntil: "domcontentloaded" });
    await expect(page.locator("#resultsCount")).toContainText("Показано 20 проверенных комплексов");
    const cards = page.locator("#cards > .nb-card");
    await expect(cards).toHaveCount(20);
    await expect(cards.first()).toBeVisible();
    const usability = await cards.evaluateAll((nodes) => ({
      uniqueIds: new Set(nodes.map((node) => node.dataset.newbuildId)).size,
      linked: nodes.filter((node) => /^newbuilds\/[a-z0-9-]+\/$/.test(node.querySelector("h3 a")?.getAttribute("href") || "")).length
    }));
    expect(usability).toEqual({ uniqueIds: 20, linked: 20 });
    expect(network.providerRequests).toBe(0);
  });
}

test("partial and needs_review cards only expose declared, existing detail pages", async ({ page, request }) => {
  const network = await blockExternalRequests(page);
  await page.goto("/newbuilds.html", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#cards > .nb-card")).toHaveCount(78);

  const comparison = await page.evaluate(async () => {
    const catalog = await fetch("output/newbuilds/catalog-v3.json", { cache: "no-store" }).then((response) => response.json());
    return catalog.items
      .filter((item) => item.completeness.state !== "complete")
      .map((item) => {
        const card = document.querySelector(`[data-newbuild-id="${item.id}"]`);
        const detailLinks = [...card.querySelectorAll('a[href^="newbuilds/"]')].map((link) => link.getAttribute("href"));
        return { id: item.id, expected: item.detail_url || "", detailLinks };
      });
  });

  for (const item of comparison) {
    if (item.expected) {
      expect(item.detailLinks, `${item.id} must use its declared detail URL`).toContain(item.expected);
      const response = await request.get(new URL(item.expected, `${LOCAL_ORIGIN}/newbuilds.html`).href);
      expect(response.status(), `${item.id} detail URL must exist`).toBe(200);
    } else {
      expect(item.detailLinks, `${item.id} must not link to an undeclared detail page`).toEqual([]);
    }
  }
  expect(network.providerRequests).toBe(0);
});

test("without JavaScript the 20 complete newbuild links remain visible", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  const network = await blockExternalRequests(page);

  await page.goto("/newbuilds.html", { waitUntil: "domcontentloaded" });
  const cards = page.locator("#cards > .nb-card");
  await expect(cards).toHaveCount(20);
  await expect(cards.first()).toBeVisible();
  const links = await cards.evaluateAll((nodes) => nodes.map((node) => node.querySelector("h3 a")?.getAttribute("href")));
  expect(links).toHaveLength(20);
  expect(links.every((href) => /^newbuilds\/[a-z0-9-]+\/$/.test(href))).toBe(true);
  expect(network.providerRequests).toBe(0);
  await context.close();
});

for (const categoryCase of CATEGORY_CASES) {
  test(`confirmed ${categoryCase.category} lead stores only its category and shows relevant guides`, async ({ page }) => {
    const providerGate = createGate();
    await page.addInitScript(({ key, logKey }) => {
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (storageKey, value) {
        if (this === window.sessionStorage && storageKey === key) {
          const writes = JSON.parse(window.sessionStorage.getItem(logKey) || "[]");
          writes.push(String(value));
          originalSetItem.call(window.sessionStorage, logKey, JSON.stringify(writes));
        }
        return originalSetItem.call(this, storageKey, value);
      };
    }, { key: THANKS_KEY, logKey: THANKS_WRITE_LOG });
    const network = await blockExternalRequests(page, {
      providerHandler: async (route) => {
        await providerGate.promise;
        await route.fulfill({ status: 200, contentType: "application/json", body: '{"success":true}' });
      }
    });

    await page.goto(categoryCase.source, { waitUntil: "domcontentloaded" });
    await page.locator(categoryCase.cta).first().click();
    await page.waitForURL(/\/(?:index\.html)?#lead-form-section$/);
    await fillLeadForm(page);
    await page.locator("#lead-form").evaluate((form) => form.requestSubmit());
    await expect.poll(() => network.providerRequests).toBe(1);
    expect(await page.evaluate((key) => sessionStorage.getItem(key), THANKS_KEY)).toBeNull();
    expect(await page.evaluate((logKey) => sessionStorage.getItem(logKey), THANKS_WRITE_LOG)).toBeNull();

    providerGate.release();
    await page.waitForURL(/thanks\.html$/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /\bnoindex\b.*\bnofollow\b/i);
    expect(await guideHrefs(page)).toEqual(categoryCase.guides);
    expect(await page.evaluate((key) => sessionStorage.getItem(key), THANKS_KEY)).toBeNull();
    expect(JSON.parse(await page.evaluate((logKey) => sessionStorage.getItem(logKey), THANKS_WRITE_LOG))).toEqual([categoryCase.category]);
    expect(network.providerRequests).toBe(1);
    expect(network.providerPayloads[0]).toContain("category-test@example.ru");
  });
}

test("thanks fallback is accessible without storage and category is consumed only once", async ({ page }) => {
  const network = await blockExternalRequests(page);
  await page.goto("/thanks.html", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("region", { name: "Полезные материалы перед консультацией" })).toBeVisible();
  expect(await guideHrefs(page)).toEqual([GUIDE_URLS.apartment, GUIDE_URLS.house, GUIDE_URLS.land]);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /\bnoindex\b.*\bnofollow\b/i);
  await expect(page.locator("[data-thanks-guide]")).toHaveCount(3);
  const names = await page.locator("[data-thanks-guide]").evaluateAll((links) => links.map((link) => link.textContent.trim()));
  expect(names.every(Boolean)).toBe(true);

  await page.evaluate((key) => sessionStorage.setItem(key, "house"), THANKS_KEY);
  await page.reload({ waitUntil: "domcontentloaded" });
  expect((await guideHrefs(page))[0]).toBe(GUIDE_URLS.house);
  expect(await page.evaluate((key) => sessionStorage.getItem(key), THANKS_KEY)).toBeNull();
  await page.reload({ waitUntil: "domcontentloaded" });
  expect(await guideHrefs(page)).toEqual([GUIDE_URLS.apartment, GUIDE_URLS.house, GUIDE_URLS.land]);
  expect(network.providerRequests).toBe(0);
});

test("unknown and hostile storage values are discarded without HTML injection", async ({ page }) => {
  const network = await blockExternalRequests(page);
  await page.goto("/index.html", { waitUntil: "domcontentloaded" });
  const hostile = '\"><img src=x onerror="window.__thanksXss=true">';
  await page.evaluate(({ key, value }) => {
    window.__thanksXss = false;
    sessionStorage.setItem(key, value);
  }, { key: THANKS_KEY, value: hostile });
  await page.goto("/thanks.html", { waitUntil: "domcontentloaded" });

  expect(await guideHrefs(page)).toEqual([GUIDE_URLS.apartment, GUIDE_URLS.house, GUIDE_URLS.land]);
  expect(await page.evaluate((key) => sessionStorage.getItem(key), THANKS_KEY)).toBeNull();
  expect(await page.evaluate(() => Boolean(window.__thanksXss))).toBe(false);
  expect(await page.locator(".thanks-guides img").count()).toBe(0);
  expect(network.providerRequests).toBe(0);
});

for (const viewportWidth of [390, 768, 1024, 1366]) {
  test(`changed pages have no horizontal overflow at ${viewportWidth}px`, async ({ page }) => {
    const network = await blockExternalRequests(page);
    await page.setViewportSize({ width: viewportWidth, height: 900 });

    for (const target of ["/newbuilds.html", "/thanks.html"]) {
      await page.goto(target, { waitUntil: "domcontentloaded" });
      if (target.includes("newbuilds")) {
        await expect(page.locator("#resultsCount")).toContainText("Найдено: 78 из 78");
      }
      const overflow = await page.evaluate(() => {
        return Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth;
      });
      expect(overflow, `${target} overflows at ${viewportWidth}px`).toBeLessThanOrEqual(1);
    }

    expect(network.providerRequests).toBe(0);
  });
}
