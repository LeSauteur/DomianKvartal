const { test, expect } = require("@playwright/test");

test("unified header keeps a navigation entry point through the construction breakpoint", async ({ page }) => {
  for (const width of [375, 390, 430, 768, 980, 1024, 1099, 1100, 1101, 1180, 1366, 1440, 1920]) {
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

  for (const url of ["/", "/apartments.html", "/houses.html", "/commercial.html", "/rent.html", "/construction.html", "/newbuilds.html", "/newbuilds/gray/", "/guides/", "/guides/chto-proverit-pered-pokupkoy-kvartiry-v-aksaye.html", "/seo/kvartiry-loc-aksay.html", "/team/zukhra-alieva.html", "/privacy.html"]) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${url}?qa=1`);
    await expect(page.locator("[data-unified-header]")).toBeVisible();
    await expect(page.locator("[data-unified-header] .mobile-menu-toggle")).toBeVisible();
    expect(await page.locator("[data-unified-header]").evaluate((header) => header.getBoundingClientRect().height <= 90)).toBeTruthy();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  }
});

test("header stays in normal flow and the shared property rail follows the first screen", async ({ page }) => {
  for (const url of ["/", "/apartments.html", "/rent.html", "/newbuilds/gray/", "/guides/", "/team/zukhra-alieva.html"]) {
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto(`${url}?qa=1`);
    const geometry = await page.evaluate(() => {
      const header = document.querySelector("[data-unified-header]");
      const h1 = document.querySelector("h1");
      const nav = document.querySelector("[data-unified-property-nav]");
      return {
        position: getComputedStyle(header).position,
        headerBottom: header.getBoundingClientRect().bottom,
        h1Top: h1 && h1.getBoundingClientRect().top,
        navTop: nav && nav.getBoundingClientRect().top,
        headerHeight: header.getBoundingClientRect().height
      };
    });
    expect(geometry.position).toBe("relative");
    expect(geometry.headerHeight).toBeGreaterThanOrEqual(70);
    expect(geometry.headerHeight).toBeLessThanOrEqual(82);
    expect(geometry.h1Top).toBeGreaterThanOrEqual(geometry.headerBottom);
    if (url !== "/privacy.html") expect(geometry.navTop).toBeGreaterThanOrEqual(geometry.headerBottom);
  }
});

test("property navigation is compact internally, active by section, and horizontally scrollable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/apartments.html?qa=1");
  const nav = page.locator("[data-unified-property-nav]");
  await expect(nav).toHaveClass(/unified-property-nav--compact/);
  await expect(nav.getByRole("link", { name: "Квартиры" })).toHaveAttribute("aria-current", "page");
  expect(await nav.locator(".unified-property-nav__track").evaluate((track) => track.scrollWidth > track.clientWidth)).toBeTruthy();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();

  await page.goto("/?qa=1");
  await expect(page.locator("[data-unified-property-nav]")).toHaveClass(/unified-property-nav--cards/);
  expect(await page.locator("[data-unified-property-nav] .unified-property-nav__track").evaluate((track) => track.scrollWidth > track.clientWidth)).toBeTruthy();
});

test("saved dark theme restores matching accessible toggle state", async ({ page }) => {
  await page.goto("/?qa=1");
  await page.evaluate(() => localStorage.setItem("domian-color-theme", "dark"));
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  for (const button of await page.locator("[data-unified-theme-toggle]").all()) {
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(button).toHaveAttribute("aria-label", "Включить светлую тему");
    await expect(button).toHaveAttribute("title", "Светлая тема");
  }
});

test("brand animation runs once per session and reduced motion is immediately static", async ({ page }) => {
  await page.goto("/?qa=1");
  await page.evaluate(() => sessionStorage.removeItem("domian-kvartal-logo-seen-v1"));
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/kvartal-logo-motion/);
  expect(await page.evaluate(() => sessionStorage.getItem("domian-kvartal-logo-seen-v1"))).toBe("1");
  await page.reload();
  await expect(page.locator("html")).not.toHaveClass(/kvartal-logo-motion/);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => sessionStorage.removeItem("domian-kvartal-logo-seen-v1"));
  await page.reload();
  await expect(page.locator("html")).not.toHaveClass(/kvartal-logo-motion/);
  expect(await page.locator(".kvartal-mark__top").evaluate((piece) => getComputedStyle(piece).animationName)).toBe("none");
});

test("homepage featured house keeps its natural framing and compact body", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/?qa=1");
  const metrics = await page.locator(".stage12-featured").evaluate((card) => {
    const imageSlot = card.querySelector(".stage12-featured__image");
    const image = imageSlot.querySelector("img");
    const body = card.querySelector(".stage12-featured__body");
    return {
      slotRatio: imageSlot.clientWidth / imageSlot.clientHeight,
      naturalRatio: image.naturalWidth / image.naturalHeight,
      objectFit: getComputedStyle(image).objectFit,
      bodyHeight: body.getBoundingClientRect().height,
      cardHeight: card.getBoundingClientRect().height
    };
  });
  expect(metrics.objectFit).toBe("cover");
  expect(Math.abs(metrics.slotRatio - metrics.naturalRatio)).toBeLessThan(.04);
  expect(metrics.bodyHeight / metrics.cardHeight).toBeLessThan(.52);
});
