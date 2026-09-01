const { test, expect } = require("@playwright/test");

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
