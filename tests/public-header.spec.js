const { test, expect } = require("@playwright/test");

test("unified header keeps a navigation entry point through the construction breakpoint", async ({ page }) => {
  for (const width of [980, 981, 1024, 1099, 1100, 1101]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/construction.html?qa=1");
    const desktop = page.locator(".unified-header__desktop-nav");
    const toggle = page.locator("[data-unified-header] .mobile-menu-toggle");
    if (width <= 1100) {
      await expect(desktop).toBeHidden();
      await expect(toggle).toBeVisible();
    } else {
      await expect(desktop).toBeVisible();
      await expect(toggle).toBeHidden();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  }
});

test("mobile drawer traps focus and restores it to the hamburger", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/commercial.html?qa=1");
  const toggle = page.locator("[data-unified-header] .mobile-menu-toggle");
  const drawer = page.locator("[data-unified-drawer]");
  await toggle.click();
  await expect(drawer).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator(".mobile-drawer__close")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveAttribute("aria-hidden", "true");
  await expect(toggle).toBeFocused();
});

test("desktop dropdown works with keyboard and representative mobile headers do not overflow", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/rent.html?qa=1");
  const services = page.locator(".unified-header__desktop-nav").getByRole("button", { name: /Услуги/ });
  await services.focus();
  await services.click();
  await expect(services).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(services).toHaveAttribute("aria-expanded", "false");

  for (const url of ["/", "/apartments.html", "/commercial.html", "/rent.html", "/construction.html", "/newbuilds/gray/", "/seo/kvartiry-loc-aksay.html", "/privacy.html"]) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${url}?qa=1`);
    await expect(page.locator("[data-unified-header]")).toBeVisible();
    await expect(page.locator("[data-unified-header] .mobile-menu-toggle")).toBeVisible();
    expect(await page.locator("[data-unified-header]").evaluate((header) => header.getBoundingClientRect().height <= 90)).toBeTruthy();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  }
});
