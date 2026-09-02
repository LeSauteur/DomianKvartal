const { test, expect } = require("@playwright/test");

function rgb(value) {
  return (value.match(/\d+(?:\.\d+)?/g) || []).slice(0, 3).map(Number);
}

function isLight([red, green, blue]) {
  return red >= 190 && green >= 190 && blue >= 190;
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("domian-color-theme", "light"));
});

for (const pageName of ["commercial.html", "rent.html"]) {
  test(`${pageName} renders its service page without console errors`, async ({ page }) => {
    const errors = [];
    page.on("console", (message) => {
      if (message.type() === "error" && !/net::ERR|favicon/i.test(message.text())) errors.push(message.text());
    });
    await page.goto(`/${pageName}?qa=1`, { waitUntil: "networkidle" });
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("#lead-form-section")).toBeVisible();
    await expect(page.locator("[data-lead-form] input[name=name]")).toBeVisible();
    await expect(page.locator("[data-lead-form] input[name=phone]")).toBeVisible();
    const contentImages = page.locator("main img");
    expect(await contentImages.count()).toBeGreaterThanOrEqual(pageName === "commercial.html" ? 6 : 5);
    const eagerImages = page.locator('main img:not([loading="lazy"])');
    expect(await eagerImages.evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0))).toBe(true);
    await page.locator('a[href="#lead-form-section"]').first().click();
    await expect(page.locator("#lead-form-section")).toBeInViewport();
    expect(errors).toEqual([]);
  });
}

test("light theme keeps service backgrounds and text colors independent from global static-page cards", async ({ page }) => {
  await page.goto("/commercial.html?qa=1", { waitUntil: "networkidle" });

  const processStyles = await page.locator(".service-process").evaluate((section) => {
    const process = getComputedStyle(section);
    const heading = getComputedStyle(section.querySelector("h2"));
    const stepHeading = getComputedStyle(section.querySelector("h3"));
    const description = getComputedStyle(section.querySelector(".process-steps p"));
    return { background: process.backgroundColor, heading: heading.color, stepHeading: stepHeading.color, description: description.color };
  });
  const [processRed, processGreen, processBlue] = rgb(processStyles.background);
  expect(processRed).toBeLessThan(100);
  expect(processGreen).toBeLessThan(100);
  expect(processBlue).toBeLessThan(100);
  expect(isLight(rgb(processStyles.heading))).toBe(true);
  expect(isLight(rgb(processStyles.stepHeading))).toBe(true);
  expect(rgb(processStyles.description)[0]).toBeGreaterThan(150);

  const briefStyles = await page.locator(".service-brief").evaluate((section) => {
    const brief = getComputedStyle(section);
    const heading = getComputedStyle(section.querySelector("h2"));
    const label = getComputedStyle(section.querySelector("label"));
    const consent = getComputedStyle(section.querySelector(".form-consent"));
    return { background: brief.backgroundColor, heading: heading.color, label: label.color, consent: consent.color };
  });
  const [briefRed, briefGreen, briefBlue] = rgb(briefStyles.background);
  expect(briefRed).toBeGreaterThan(120);
  expect(briefGreen).toBeLessThan(110);
  expect(briefBlue).toBeLessThan(100);
  expect(isLight(rgb(briefStyles.heading))).toBe(true);
  expect(isLight(rgb(briefStyles.label))).toBe(true);
  expect(isLight(rgb(briefStyles.consent))).toBe(true);

  const mosaicColors = await page.locator(".mosaic-card").evaluateAll((cards) => cards.map((card) => ({
    heading: getComputedStyle(card.querySelector("h3")).color,
    description: getComputedStyle(card.querySelector("p")).color
  })));
  expect(mosaicColors).toHaveLength(4);
  for (const colors of mosaicColors) {
    expect(isLight(rgb(colors.heading))).toBe(true);
    expect(isLight(rgb(colors.description))).toBe(true);
  }
});

test("rent route labels stay dark enough on light cards", async ({ page }) => {
  await page.goto("/rent.html?qa=1", { waitUntil: "networkidle" });
  const labels = await page.locator(".rent-route span").evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).color));
  expect(labels).toHaveLength(3);
  for (const color of labels) {
    const [red, green, blue] = rgb(color);
    expect(red).toBeLessThan(170);
    expect(green).toBeLessThan(100);
    expect(blue).toBeLessThan(100);
  }
});

test("service pages remain usable at tablet and mobile widths", async ({ page }) => {
  for (const viewport of [{ width: 768, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto(`/commercial.html?qa=1`, { waitUntil: "networkidle" });
    await expect(page.locator(".service-hero__media")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.goto(`/rent.html?qa=1`, { waitUntil: "networkidle" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});
