const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");

const LOCAL_ORIGIN = "http://127.0.0.1:4173";

async function installGoalProbe(page) {
  await page.addInitScript(() => {
    window.DOMIAN_ANALYTICS_TEST_HOOK = (goal, params) => {
      const events = JSON.parse(sessionStorage.getItem("__construction_goals") || "[]");
      events.push({ goal, params: params || {} });
      sessionStorage.setItem("__construction_goals", JSON.stringify(events));
    };
  });
}

async function mockExternalRequests(page) {
  const network = { providerRequests: 0, payloads: [] };
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === LOCAL_ORIGIN) {
      await route.continue();
      return;
    }
    if (url.hostname === "api.web3forms.com") {
      network.providerRequests += 1;
      network.payloads.push(request.postData() || "");
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) });
      return;
    }
    await route.fulfill({ status: 204, body: "" });
  });
  return network;
}

test.beforeEach(async ({ page }) => {
  await installGoalProbe(page);
});

test("catalogue shows all projects and filters by builder without reload", async ({ page }) => {
  await page.goto("/construction.html", { waitUntil: "domcontentloaded" });
  const cards = page.locator("[data-project-grid] [data-project-card]");
  await expect(cards).toHaveCount(32);
  await expect(page.locator("[data-project-count]")).toHaveText("32");

  await page.locator('[data-project-filters] select[name="builder"]').selectOption("domanstroy");
  await expect(page.locator("[data-project-grid] [data-project-card]:visible")).toHaveCount(7);
  await expect(page.locator("[data-project-count]")).toHaveText("7");

  await page.locator('[data-project-filters] select[name="builder"]').selectOption("eqvita");
  await expect(page.locator("[data-project-grid] [data-project-card]:visible")).toHaveCount(4);
  await page.locator('[data-project-filters] button[type="reset"]').click();
  await expect(page.locator("[data-project-count]")).toHaveText("32");
});

test("unknown characteristics are excluded only when that filter is active", async ({ page }) => {
  await page.goto("/construction.html", { waitUntil: "domcontentloaded" });
  const cards = page.locator("[data-project-grid] [data-project-card]");
  await expect(cards).toHaveCount(32);
  await page.locator('[data-project-filters] select[name="bedrooms"]').selectOption("3");
  const visible = page.locator("[data-project-grid] [data-project-card]:visible");
  await expect(visible.first()).toBeVisible();
  const values = await visible.evaluateAll((nodes) => nodes.map((node) => node.dataset.bedrooms));
  expect(values.length).toBeGreaterThan(0);
  expect(values.every((value) => value === "3")).toBe(true);
});

test("completed objects filter without invented characteristics", async ({ page }) => {
  await page.goto("/construction.html", { waitUntil: "domcontentloaded" });
  const visible = page.locator("[data-project-grid] [data-project-card]:visible");
  await page.locator('[data-project-filters] select[name="recordType"]').selectOption("built-object");
  await expect(visible).toHaveCount(6);
  await page.locator('[data-project-filters] select[name="builder"]').selectOption("postroim-dom");
  await expect(visible).toHaveCount(6);
  const links = await visible.locator("h3 a").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")));
  expect(new Set(links).size).toBe(6);
  expect(links).toContain("construction/projects/postroim-dom-rostov-brick-100-180.html");
  expect(links).toContain("construction/projects/postroim-dom-rostov-brick-100-90.html");
  await page.locator('[data-project-filters] select[name="floors"]').selectOption("1");
  await expect(visible).toHaveCount(0);
  await expect(page.locator("[data-project-empty]")).toBeVisible();
  await page.locator('[data-project-filters] select[name="floors"]').selectOption("");
  await page.locator('[data-project-filters] select[name="bedrooms"]').selectOption("3");
  await expect(visible).toHaveCount(1);
  await expect(visible.locator("h3 a")).toHaveAttribute("href", /postroim-dom-rostov-brick-100-180\.html$/);
  await page.locator('[data-project-filters] button[type="reset"]').click();
  await expect(page.locator("[data-project-count]")).toHaveText("32");
});

test("completed-object form attributes the request to the selected house", async ({ page }) => {
  const network = await mockExternalRequests(page);
  await page.goto("/construction/projects/postroim-dom-rostov-brick-100-90.html", { waitUntil: "domcontentloaded" });
  await expect(page.locator("h1")).toContainText("Кирпичный дом 100 м²");
  await expect(page.locator(".project-facts")).toContainText("90 дней");
  await expect(page.locator(".project-plan")).toHaveCount(0);
  await expect(page.locator(".project-hero__media img")).toHaveAttribute("src", /assets\/images\/construction\/postroim-dom-rostov-brick-100-90\/facade\.webp$/);
  await expect.poll(() => page.locator(".project-hero__media img").evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
  await page.locator(".project-hero [data-project-quote]").click();
  await expect(page.locator("[data-selected-project]")).toContainText("Выбран объект:");
  await page.locator("#lead-name").fill("Тест Построим Дом");
  await page.locator("#lead-phone").fill("8 999 111-22-33");
  await page.locator("#lead-privacy-consent").check();
  await page.locator("#lead-form button[type='submit']").click();
  await page.waitForURL(/thanks\.html$/);
  expect(network.providerRequests).toBe(1);
  expect(network.payloads[0]).toContain("Построим Дом");
  expect(network.payloads[0]).toContain("postroim-dom-rostov-brick-100-90");
});

test("project selection reaches the form with full attribution", async ({ page }) => {
  await page.goto("/construction.html", { waitUntil: "domcontentloaded" });
  const quote = page.locator('[data-project-grid] [data-project-quote][data-project-code="DS-80"]');
  await quote.click();
  await expect(page.locator("[data-selected-project]")).toContainText("Проект DS-80");
  await expect(page.locator('input[name="project_code"]')).toHaveValue("DS-80");
  await expect(page.locator('input[name="project_name"]')).toHaveValue("Проект DS-80");
  await expect(page.locator('input[name="builder"]')).toHaveValue("ДоманСтрой");
  await expect(page.locator('input[name="project_area"]')).toHaveValue("80 м²");
  await expect(page.locator('input[name="price_version"]')).toHaveValue("по запросу");
});

test("project cards navigate to distinct detail pages with one H1", async ({ page }) => {
  await page.goto("/construction.html", { waitUntil: "domcontentloaded" });
  await page.locator('[data-project-grid] [data-project-card][data-area="85"] h3 a').first().click();
  await expect(page).toHaveURL(/construction\/projects\/domanstroy-ds-85-5\.html$/);
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("h1")).toContainText("DS-85(5)");
  await expect(page.locator(".project-plan img")).toBeVisible();
});

test("construction form submits once and includes project context", async ({ page }) => {
  const network = await mockExternalRequests(page);
  await page.goto("/construction/projects/domanstroy-ds-116.html", { waitUntil: "domcontentloaded" });
  await page.locator("#lead-name").fill("Тест Строительство");
  await page.locator("#lead-phone").fill("8 999 111-22-33");
  await page.locator("#lead-privacy-consent").check();
  await page.locator("#lead-form button[type='submit']").click();
  await page.waitForURL(/thanks\.html$/);

  expect(network.providerRequests).toBe(1);
  expect(network.payloads[0]).toContain('name="lead_type"');
  expect(network.payloads[0]).toContain("construction");
  expect(network.payloads[0]).toContain('name="project_code"');
  expect(network.payloads[0]).toContain("DS-116");
  expect(network.payloads[0]).toContain('name="builder"');
  expect(network.payloads[0]).toContain("ДоманСтрой");
  expect(network.payloads[0]).toContain('name="price_version"');
  expect(network.payloads[0]).toContain("май 2026");

  const goals = await page.evaluate(() => JSON.parse(sessionStorage.getItem("__construction_goals") || "[]"));
  expect(goals.some((event) => event.goal === "construction_project_page_open")).toBe(true);
  expect(goals.some((event) => event.goal === "construction_lead_success")).toBe(true);
});

test("partner and completed-object pages retain usable desktop and mobile layouts", async ({ page }) => {
  test.setTimeout(90000);
  await mockExternalRequests(page);
  const screenshotDir = path.join(__dirname, "..", "output", "playwright");
  fs.mkdirSync(screenshotDir, { recursive: true });
  for (const width of [375, 768, 1366]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/construction.html", "/construction/builders/postroim-dom.html", "/construction/projects/postroim-dom-konstantinovsk-110.html"]) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page.locator("h1")).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${route} at ${width}px`).toBeLessThanOrEqual(1);
      if (route.includes("postroim-dom")) {
        const hero = page.locator(".project-hero__media img, .builder-hero img");
        await expect.poll(() => hero.evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
        if (width === 375) expect(await hero.evaluate((image) => image.currentSrc)).toContain("-640.webp");
      }
      if (route.includes("/builders/") && width === 1366) {
        await page.screenshot({ path: path.join(screenshotDir, "postroim-dom-desktop.jpg"), type: "jpeg", quality: 85 });
      }
      if (route.includes("/projects/") && width === 375) {
        await page.screenshot({ path: path.join(screenshotDir, "postroim-dom-mobile.jpg"), type: "jpeg", quality: 85 });
      }
    }
  }
});
