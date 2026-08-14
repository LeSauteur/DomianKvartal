const { test, expect } = require("@playwright/test");

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
  await expect(cards).toHaveCount(26);
  await expect(page.locator("[data-project-count]")).toHaveText("26");

  await page.locator('[data-project-filters] select[name="builder"]').selectOption("domanstroy");
  await expect(page.locator("[data-project-grid] [data-project-card]:visible")).toHaveCount(7);
  await expect(page.locator("[data-project-count]")).toHaveText("7");

  await page.locator('[data-project-filters] select[name="builder"]').selectOption("eqvita");
  await expect(page.locator("[data-project-grid] [data-project-card]:visible")).toHaveCount(4);
  await page.locator('[data-project-filters] button[type="reset"]').click();
  await expect(page.locator("[data-project-count]")).toHaveText("26");
});

test("unknown characteristics are excluded only when that filter is active", async ({ page }) => {
  await page.goto("/construction.html", { waitUntil: "domcontentloaded" });
  const cards = page.locator("[data-project-grid] [data-project-card]");
  await expect(cards).toHaveCount(26);
  await page.locator('[data-project-filters] select[name="bedrooms"]').selectOption("3");
  const visible = page.locator("[data-project-grid] [data-project-card]:visible");
  await expect(visible.first()).toBeVisible();
  const values = await visible.evaluateAll((nodes) => nodes.map((node) => node.dataset.bedrooms));
  expect(values.length).toBeGreaterThan(0);
  expect(values.every((value) => value === "3")).toBe(true);
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
