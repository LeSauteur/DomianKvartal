const { test, expect } = require("./captcha-fixture");
const path = require("node:path");

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

test("property discovery is photographic internally, active by section, and uses a clean mobile rail", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 844 });
  await page.goto("/apartments.html?qa=1");
  const nav = page.locator("[data-unified-property-nav]");
  await expect(nav).toHaveClass(/unified-property-nav--internal/);
  await expect(nav.getByRole("link", { name: "Квартиры" })).toHaveAttribute("aria-current", "page");
  await expect(nav.getByText("Подбор квартир")).toBeVisible();
  expect(await nav.locator(".unified-property-nav__image").first().evaluate((image) => getComputedStyle(image).backgroundImage)).not.toBe("none");
  await expect(page.locator(".unified-property-search")).toHaveAttribute("href", "#filters");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".unified-property-discovery")).toBeHidden();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
    { message: "Apartments must fit the resized mobile viewport" }).toBeLessThanOrEqual(0);

  await page.goto("/?qa=1");
  await expect(page.locator("[data-unified-property-nav]")).toHaveClass(/unified-property-nav--cards/);
  expect(await page.locator("[data-unified-property-nav] .unified-property-nav__track").evaluate((track) => track.scrollWidth > track.clientWidth)).toBeTruthy();

  await page.goto("/construction.html?qa=1");
  await expect(page.locator("[data-unified-property-nav] .is-active")).toHaveCount(0);
  await expect(page.locator(".unified-property-search")).toHaveAttribute("href", "#construction-projects");
  await expect(page.locator("[data-project-filter-panel]")).not.toHaveAttribute("open", "");
});

test("catalog heroes use light split media while service heroes remain individual", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  for (const url of ["/apartments.html", "/houses.html", "/lands.html"]) {
    await page.goto(`${url}?qa=1`);
    const hero = page.locator(".catalog-split-hero");
    await expect(hero).toBeVisible();
    await expect(hero.locator(".catalog-split-hero__media img")).toBeVisible();
    expect(await hero.evaluate((node) => getComputedStyle(node).backgroundColor !== "rgb(47, 39, 35)")).toBeTruthy();
  }
  await page.goto("/newbuilds.html?qa=1");
  await expect(page.locator(".nb-hero__media img")).toBeVisible();
  for (const url of ["/rent.html", "/commercial.html"]) {
    await page.goto(`${url}?qa=1`);
    await expect(page.locator(".service-hero__media img")).toBeVisible();
    await expect(page.locator(".catalog-split-hero")).toHaveCount(0);
  }
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

test("team objects button applies both theme colors on the first frame", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/team/zukhra-alieva.html?qa=1");
  const objects = page.locator("#zukhra-alieva .btn-outline");
  await expect(objects).toHaveText("Объекты");

  const colors = await objects.evaluate(async (button) => {
    const root = document.documentElement;
    const toggle = document.querySelector(".unified-header__desktop-theme");
    const read = (element) => {
      const style = getComputedStyle(element);
      return { color: style.color, background: style.backgroundColor };
    };
    const firstFrame = () => new Promise(requestAnimationFrame);
    const light = read(button);

    toggle.click();
    await firstFrame();
    const darkTheme = root.dataset.theme;
    const dark = read(button);
    const palette = document.createElement("span");
    palette.style.color = "var(--accent)";
    palette.style.backgroundColor = "var(--bg-soft)";
    document.body.append(palette);
    const darkPalette = read(palette);
    palette.remove();

    toggle.click();
    await firstFrame();
    return { light, darkTheme, dark, darkPalette, lightAgain: read(button) };
  });

  expect(colors.darkTheme).toBe("dark");
  expect(colors.dark).toEqual(colors.darkPalette);
  expect(colors.lightAgain).toEqual(colors.light);
});

const themeCardRoutes = [
  "/team/zukhra-alieva.html",
  "/guides/",
  "/guides/chto-proverit-pered-pokupkoy-doma-v-aksaye.html",
  "/guides/chto-proverit-pered-pokupkoy-kvartiry-v-aksaye.html",
  "/guides/chto-proverit-pered-pokupkoy-uchastka-v-aksaye.html",
  "/guides/gde-kupit-dom-v-aksaye-ryadom-s-rostovom.html",
  "/guides/novostroyka-ili-vtorichka-v-aksaye.html",
  "/apartments.html",
  "/houses.html",
  "/lands.html",
  "/newbuilds.html"
];

for (const route of themeCardRoutes) {
  test(`profile and link card contrast on ${route}`, async ({ page }, testInfo) => {
    test.setTimeout(60000);
    await page.goto(`${route}?qa=1`);
    for (const theme of ["light", "dark"]) {
      await page.evaluate((theme) => localStorage.setItem("domian-color-theme", theme), theme);

      for (const [width, height] of [[1366, 900], [390, 844], [360, 844]]) {
        await page.setViewportSize({ width, height });
        await page.reload();
        if (theme === "dark") {
          await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
        } else {
          await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");
        }
        const label = `${route} ${theme} ${width}×${height}`;
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth), { message: label }).toBeLessThanOrEqual(width);
        const cards = page.locator(".agent-card, .team-profile-card, .seo-content__link-card");
        expect(await cards.count(), label).toBeGreaterThan(0);
        const results = await cards.evaluateAll((cards) => {
          const rgb = (color) => color.match(/[\d.]+/g).map(Number);
          const composite = ([r, g, b, alpha = 1], under) =>
            [r, g, b].map((channel, index) => channel * alpha + under[index] * (1 - alpha));
          const luminance = (color) => color.reduce((sum, channel, index) => {
            const value = channel / 255;
            const linear = value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
            return sum + linear * [0.2126, 0.7152, 0.0722][index];
          }, 0);
          const contrast = (foreground, background) => {
            const values = [luminance(foreground), luminance(background)];
            return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
          };
          // Card surfaces are flat colors or simple gradients. Compare both ends of each gradient.
          const paint = (style, under) => {
            const colors = under.map((color) => composite(rgb(style.backgroundColor), color));
            const stops = style.backgroundImage.match(/rgba?\([^)]+\)/g);
            return stops ? colors.flatMap((color) => stops.map((stop) => composite(rgb(stop), color))) : colors;
          };
          const backdrops = (node) => node
            ? paint(getComputedStyle(node), backdrops(node.parentElement))
            : [[255, 255, 255]];
          const measure = (node, pseudo = null, icon = false) => {
            const style = getComputedStyle(node, pseudo);
            const fontSize = parseFloat(style.fontSize);
            const large = fontSize >= 24 || (fontSize >= 56 / 3 && Number(style.fontWeight) >= 700);
            const under = backdrops(pseudo ? node : node.parentElement);
            const backgrounds = paint(style, under);
            return {
              name: pseudo ?? ((node.textContent.trim() || node.parentElement.getAttribute("aria-label") || node.tagName).slice(0, 65)),
              ratio: Math.min(...backgrounds.map((background) => contrast(composite(rgb(style.color), background), background))),
              minimum: icon || large ? 3 : 4.5,
              icon
            };
          };

          const adjacent = document.querySelectorAll(
            "body.guide-page .seo-content__links > h3, .guide-local-note > :is(h3, p, span), " +
            ".guide-callout :is(h3, p, .guide-callout__icon), " +
            "body:is([data-agent], .guide-page) .footer-cta-content > :is(h2, p, a)"
          );
          const components = cards.map((card) => {
            const style = getComputedStyle(card);
            const surface = style.getPropertyValue("--bg-surface").trim();
            const paletteColor = document.createElement("span");
            paletteColor.style.backgroundColor = surface;
            card.append(paletteColor);
            const darkBackground = getComputedStyle(paletteColor).backgroundColor;
            paletteColor.remove();

            const box = card.getBoundingClientRect();
            const content = [...card.querySelectorAll("h2, h3, h4, p, a:not(.channel-icon), .contacts > div, .seo-content__link-badge, .agent-photo, .channel-icon")];
            const visible = content.filter((node) => node.getClientRects().length);
            const text = visible.filter((node) => !node.matches(".agent-photo, .channel-icon") && node.textContent.trim());
            const measurements = text.map((node) => measure(node));
            const arrow = getComputedStyle(card, "::after");
            if (arrow.content !== "none") measurements.push(measure(card, "::after", true));
            const telegram = card.querySelector(".channel-icon--telegram svg");
            if (telegram) measurements.push(measure(telegram, null, true));

            return {
              background: style.backgroundColor,
              image: style.backgroundImage,
              darkBackground,
              lightBackground: card.closest(".guide-card-grid") ? "rgb(255, 253, 250)"
                : card.closest(".guide-page .seo-content__links") ? "rgba(255, 255, 255, 0.9)"
                : "rgba(255, 255, 255, 0.84)",
              fits: box.width > 0 && box.left >= -1 && box.right <= innerWidth + 1
                && cards.every((other) => {
                  if (other === card) return true;
                  const rect = other.getBoundingClientRect();
                  return rect.right <= box.left + 1 || rect.left >= box.right - 1
                    || rect.bottom <= box.top + 1 || rect.top >= box.bottom - 1;
                })
                && visible.every((node) => [...node.getClientRects()].every((rect) =>
                  rect.left >= box.left - 1 && rect.right <= box.right + 1
                  && rect.top >= box.top - 1 && rect.bottom <= box.bottom + 1)),
              measurements
            };
          });
          return {
            components,
            adjacent: [...adjacent].map((node) => measure(node, null, node.matches(".guide-callout__icon")))
          };
        });
        for (const [index, result] of results.components.entries()) {
          const card = `${label}, card ${index + 1}`;
          expect(result.fits, card).toBe(true);
          expect(result.image, card).toBe("none");
          expect(result.background, card).toBe(theme === "dark" ? result.darkBackground : result.lightBackground);
          for (const { name, ratio, minimum } of result.measurements) {
            expect(ratio, `${card}, ${name}`).toBeGreaterThanOrEqual(minimum);
          }
        }
        for (const { name, ratio, minimum } of results.adjacent) {
          expect(ratio, `${label}, ${name}`).toBeGreaterThanOrEqual(minimum);
        }
        await testInfo.attach(`contrast-${theme}-${width}`, {
          body: JSON.stringify([...results.adjacent, ...results.components.flatMap(({ measurements }) => measurements)]),
          contentType: "application/json"
        });
      }
    }
  });
}

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

test("homepage removes the demo showcase and keeps production-fed cards", async ({ page }) => {
  await page.goto("/?qa=1", { waitUntil: "networkidle" });
  await expect(page.locator(".stage12-featured, .stage12-filter-row, .stage12-mini-grid, .stage12-tabs")).toHaveCount(0);
  await expect(page.locator("#new-objects-cards .property-card").first()).toBeVisible();
});

test("mobile task cards and direct header call stay aligned at acceptance widths", async ({ page }) => {
  for (const width of [375, 390, 434, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/?qa=1");

    const widths = await page.locator(".buyer-path").evaluateAll((cards) => cards.map((card) => card.getBoundingClientRect().width));
    expect(widths).toHaveLength(6);
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(1);

    const call = page.locator(".unified-header__contacts > a[href='tel:+79536091122']");
    await expect(call).toBeVisible();
    await expect(call).toHaveAttribute("aria-label", "Позвонить: +7 953 609-11-22");
    const controls = await page.evaluate(() => {
      const rect = (selector) => {
        const box = document.querySelector(selector).getBoundingClientRect();
        return { left: box.left, right: box.right };
      };
      return [
        rect(".unified-header__utility"),
        rect(".unified-header__brand"),
        rect(".unified-header__contacts > a[href='tel:+79536091122']"),
        rect(".unified-header__toggle")
      ].sort((left, right) => left.left - right.left);
    });
    for (let index = 1; index < controls.length; index += 1) {
      expect(controls[index - 1].right).toBeLessThanOrEqual(controls[index].left);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/?qa=1");
  await expect(page.locator(".unified-header__contacts > a[href='tel:+79536091122']")).toBeVisible();
});

test("requested visual top-system matrix", async ({ page }) => {
  test.skip(process.env.VISUAL_TOP_QA !== "1", "Run explicitly before publication.");
  test.setTimeout(240000);

  const widths = [375, 390, 430, 768, 1024, 1100, 1101, 1366, 1440, 1920];
  const routes = [
    "/", "/apartments.html", "/houses.html", "/lands.html", "/newbuilds.html",
    "/rent.html", "/commercial.html", "/construction.html", "/guides/",
    "/newbuilds/gray/", "/guides/chto-proverit-pered-pokupkoy-kvartiry-v-aksaye.html", "/privacy.html"
  ];
  const internalRoutes = new Set(["/apartments.html", "/houses.html", "/lands.html", "/newbuilds.html", "/rent.html", "/commercial.html", "/construction.html", "/guides/"]);
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  for (const width of widths) {
    for (const route of routes) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${route}?qa=1`, { waitUntil: "domcontentloaded" });
      const metrics = await page.evaluate(({ route, internal }) => {
        const header = document.querySelector("[data-unified-header]");
        const nav = document.querySelector("[data-unified-property-nav]");
        const search = document.querySelector(".unified-property-search");
        const h1s = [...document.querySelectorAll("h1")].filter((node) => getComputedStyle(node).display !== "none");
        const tiles = nav ? [...nav.querySelectorAll(".unified-property-nav__item")] : [];
        const imageLayers = nav ? [...nav.querySelectorAll(".unified-property-nav__image")].map((node) => getComputedStyle(node).backgroundImage) : [];
        return {
          route,
          internal,
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth,
          h1Count: h1s.length,
          h1Top: h1s[0]?.getBoundingClientRect().top ?? 0,
          headerBottom: header?.getBoundingClientRect().bottom ?? 0,
          navExists: Boolean(nav),
          navVisible: Boolean(nav && nav.getClientRects().length),
          navScrollable: nav ? nav.querySelector(".unified-property-nav__track").scrollWidth > nav.querySelector(".unified-property-nav__track").clientWidth : false,
          tileCount: tiles.length,
          tileHeights: tiles.map((tile) => Math.round(tile.getBoundingClientRect().height)),
          imageLayers,
          searchHref: search?.getAttribute("href") ?? ""
        };
      }, { route, internal: internalRoutes.has(route) });

      expect(metrics.documentWidth, `${route} at ${width}px overflows`).toBeLessThanOrEqual(metrics.viewportWidth);
      expect(metrics.h1Count, `${route} at ${width}px must have one visible H1`).toBe(1);
      expect(metrics.h1Top, `${route} at ${width}px header overlaps H1`).toBeGreaterThanOrEqual(metrics.headerBottom);
      if (route === "/privacy.html") {
        expect(metrics.navExists).toBeFalsy();
      } else {
        expect(metrics.navExists).toBeTruthy();
        expect(metrics.tileCount).toBe(5);
        expect(metrics.imageLayers.every((value) => value !== "none")).toBeTruthy();
        if (metrics.internal && width <= 768) {
          expect(metrics.navVisible, `${route} at ${width}px uses the mobile drawer`).toBeFalsy();
        } else {
          expect(metrics.navVisible, `${route} at ${width}px must show its property rail`).toBeTruthy();
          if (width <= 900) expect(metrics.navScrollable, `${route} at ${width}px must use the horizontal rail`).toBeTruthy();
        }
        if (width > 900) expect(new Set(metrics.tileHeights).size, `${route} at ${width}px tile heights must match`).toBe(1);
      }
      if (metrics.internal) {
        expect(metrics.searchHref).not.toBe("");
        expect(metrics.searchHref).not.toBe("#");
      } else {
        expect(metrics.searchHref).toBe("");
      }
    }
  }

  expect(pageErrors).toEqual([]);

  const shots = [
    ["/", "home"],
    ["/houses.html", "houses"],
    ["/rent.html", "rent"],
    ["/commercial.html", "commercial"],
    ["/guides/", "guides"]
  ];
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const [route, name] of shots) {
    await page.goto(`${route}?qa=1`, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join("tmp", "visual-top-system", `${name}-desktop.png`), fullPage: true });
  }
});
