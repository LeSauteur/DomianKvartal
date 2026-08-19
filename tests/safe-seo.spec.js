const { test, expect } = require("@playwright/test");

const LOCAL_ORIGIN = "http://127.0.0.1:4173";

async function isolateProductionServices(page) {
  const network = { providerRequests: 0, metrikaRequests: 0, external: [] };
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin === LOCAL_ORIGIN) return;
    network.external.push(url.href);
    if (url.hostname === "api.web3forms.com") network.providerRequests += 1;
    if (url.hostname === "mc.yandex.ru" || url.hostname === "mc.yandex.com") network.metrikaRequests += 1;
  });
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === LOCAL_ORIGIN) return route.continue();
    return route.fulfill({ status: 204, body: "" });
  });
  return network;
}

async function preventNavigation(locator) {
  await locator.evaluate((link) => link.addEventListener("click", (event) => event.preventDefault(), { once: true }));
}

test("QA mode blocks Metrika while the complete funnel emits non-personal events", async ({ page }) => {
  const events = [];
  await page.exposeFunction("__recordAnalyticsEvent", (event) => events.push(event));
  await page.addInitScript(() => {
    window.DOMIAN_ANALYTICS_TEST_HOOK = (goal, params) => window.__recordAnalyticsEvent({ goal, params });
  });
  const network = await isolateProductionServices(page);

  await page.goto("/newbuilds.html?qa=1", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#cards > .nb-card")).toHaveCount(78);
  await page.locator("#nbCompleteness").selectOption("complete");
  const newbuildLink = page.locator("#cards > .nb-card h3 a").first();
  await preventNavigation(newbuildLink);
  await newbuildLink.click();
  const mapLink = page.locator('a[href*="yandex.ru/maps"]').first();
  await preventNavigation(mapLink);
  await mapLink.click();

  await page.goto("/guides/chto-proverit-pered-pokupkoy-kvartiry-v-aksaye.html?qa=1", { waitUntil: "domcontentloaded" });
  const catalogLink = page.locator('a[href="../apartments.html"]').first();
  await preventNavigation(catalogLink);
  await catalogLink.click();
  const leadLink = page.locator('a[href="/#lead-form-section"]').first();
  await preventNavigation(leadLink);
  await leadLink.click();

  await page.goto("/?qa=1", { waitUntil: "domcontentloaded" });
  await page.locator("#mg-price").fill("6 000 000");
  await page.locator("#mg-price").dispatchEvent("change");
  const showcaseLink = page.locator('[data-showcase="aksay-secondary"] .showcase-card__cta').first();
  await expect(showcaseLink).toBeVisible();
  await preventNavigation(showcaseLink);
  await showcaseLink.click();

  await expect.poll(() => events.length).toBeGreaterThan(7);
  const goals = new Set(events.map((event) => event.goal));
  for (const goal of ["catalog_filter_use", "property_card_open", "map_click", "external_profile_click", "guide_to_catalog", "guide_to_lead", "mortgage_interaction", "showcase_open"]) {
    expect(goals.has(goal), `${goal} must be emitted`).toBe(true);
  }
  const allowedKeys = new Set(["error_category", "page_type", "object_type", "object_id", "source_section", "source_cta", "catalog_type", "filter_name", "card_type", "destination_type", "profile", "interaction", "project_id", "project_name", "builder"]);
  for (const event of events) {
    expect(Object.keys(event.params).every((key) => allowedKeys.has(key))).toBe(true);
    expect(JSON.stringify(Object.values(event.params))).not.toMatch(/(?:phone|email|message|utm|referrer|example\.ru|7999)/i);
  }
  expect(network.metrikaRequests).toBe(0);
  expect(network.providerRequests).toBe(0);
});

test("mobile drawer and dynamic property images expose valid accessibility state", async ({ page }) => {
  const network = await isolateProductionServices(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?qa=1", { waitUntil: "domcontentloaded" });

  const drawer = page.locator("#mobile-drawer");
  await expect(drawer).toHaveAttribute("inert", "");
  await page.locator(".mobile-menu-toggle").click();
  await expect(drawer).toHaveAttribute("aria-hidden", "false");
  await expect(drawer).not.toHaveAttribute("inert", "");
  await page.locator(".mobile-drawer__close").click();
  await expect(drawer).toHaveAttribute("aria-hidden", "true");
  await expect(drawer).toHaveAttribute("inert", "");

  await expect(page.locator('.property-card__photo[role="img"]').first()).toBeAttached();
  for (const id of ["mg-price", "mg-down", "mg-term", "mg-rate"]) {
    await expect(page.locator(`label[for="${id}"]`)).toHaveCount(1);
  }
  expect(network.providerRequests).toBe(0);
});

test("homepage and team photos preserve their intended rendered proportions", async ({ page }) => {
  const network = await isolateProductionServices(page);

  for (const width of [390, 768, 1024, 1366]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/?qa=1", { waitUntil: "networkidle" });

    const homepageRatios = await page.evaluate((mobile) => {
      const ratio = (selector) => {
        const rect = document.querySelector(selector).getBoundingClientRect();
        return rect.width / rect.height;
      };
      return {
        construction: ratio(".home-construction__card img"),
        story: ratio(".photo-block img"),
        team: ratio(".about img"),
        leadership: ratio(".leadership img"),
        expectedStory: mobile ? 16 / 10 : 4 / 3,
        expectedPortrait: mobile ? 16 / 10 : 3 / 4
      };
    }, width <= 768);

    expect(homepageRatios.construction).toBeCloseTo(16 / 10, 1);
    expect(homepageRatios.story).toBeCloseTo(homepageRatios.expectedStory, 1);
    expect(homepageRatios.team).toBeCloseTo(homepageRatios.expectedPortrait, 1);
    expect(homepageRatios.leadership).toBeCloseTo(homepageRatios.expectedPortrait, 1);

    await page.goto("/team/zukhra-alieva.html?qa=1", { waitUntil: "networkidle" });
    const teamLayout = await page.evaluate(() => {
      const header = document.querySelector("header").getBoundingClientRect();
      const introLabel = document.querySelector(".team-intro__label").getBoundingClientRect();
      return { headerBottom: header.bottom, introTop: introLabel.top };
    });
    expect(teamLayout.introTop).toBeGreaterThanOrEqual(teamLayout.headerBottom - 1);

    const teamRatios = await page.locator(".agent-photo img").evaluateAll((images) => images.map((image) => {
      const rect = image.getBoundingClientRect();
      return rect.width / rect.height;
    }));
    expect(teamRatios).toHaveLength(5);
    for (const ratio of teamRatios) expect(ratio).toBeCloseTo(1, 1);
  }

  expect(network.providerRequests).toBe(0);
});

for (const width of [390, 768, 1024, 1366]) {
  test(`changed representative pages have no horizontal overflow at ${width}px`, async ({ page }) => {
    const network = await isolateProductionServices(page);
    await page.setViewportSize({ width, height: 900 });
    for (const target of [
      "/?qa=1",
      "/newbuilds.html?qa=1",
      "/newbuilds/dvizhenie-61/?qa=1",
      "/guides/chto-proverit-pered-pokupkoy-kvartiry-v-aksaye.html?qa=1",
      "/construction/projects/domanstroy-ds-80.html?qa=1",
      "/team/zukhra-alieva.html?qa=1"
    ]) {
      await page.goto(target, { waitUntil: "networkidle" });
      const result = await page.evaluate(() => ({
        overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
        duplicateIds: [...document.querySelectorAll("[id]")]
          .map((node) => node.id)
          .filter((id, index, ids) => ids.indexOf(id) !== index)
      }));
      expect(result.overflow, `${target} overflows at ${width}px`).toBeLessThanOrEqual(1);
      expect(result.duplicateIds, `${target} has duplicate ids`).toEqual([]);
    }
    expect(network.providerRequests).toBe(0);
  });
}
