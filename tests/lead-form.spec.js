const { test, expect } = require("@playwright/test");

const LOCAL_ORIGIN = "http://127.0.0.1:4173";
const MAX_DIRECT_URL = "https://max.ru/u/f9LHodD0cOKImT5sxxh2fLN4YFJ-paNFCiI79MwgO-LJJZ8oHXX5TN007y4";

async function installAnalyticsProbe(page, shortenTimeout) {
  await page.addInitScript(({ shorten }) => {
    const goalStorageKey = "__domian_test_goals";
    const originalSetTimeout = window.setTimeout.bind(window);

    if (shorten) {
      window.setTimeout = (callback, delay, ...args) => {
        return originalSetTimeout(callback, delay === 12000 ? 30 : delay, ...args);
      };
    }

    window.ym = (_id, method, goal, params) => {
      if (method !== "reachGoal") return;
      const goals = JSON.parse(window.sessionStorage.getItem(goalStorageKey) || "[]");
      goals.push({ goal, params: params || {} });
      window.sessionStorage.setItem(goalStorageKey, JSON.stringify(goals));
    };
  }, { shorten: Boolean(shortenTimeout) });
}

async function mockExternalRequests(page, scenario = {}) {
  const network = {
    providerRequests: 0,
    payloads: [],
    externalUrls: []
  };

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
      network.payloads.push(request.postData() || "");

      if (scenario.abort) {
        await route.abort("failed");
        return;
      }

      if (scenario.delay) {
        await new Promise((resolve) => setTimeout(resolve, scenario.delay));
      }

      await route.fulfill({
        status: scenario.status || 200,
        contentType: scenario.contentType || "application/json",
        body: scenario.body === undefined ? JSON.stringify({ success: true }) : scenario.body
      });
      return;
    }

    await route.fulfill({ status: 204, body: "" });
  });

  return network;
}

async function getGoals(page) {
  return page.evaluate(() => JSON.parse(window.sessionStorage.getItem("__domian_test_goals") || "[]"));
}

async function preventContactNavigation(page) {
  await page.evaluate(() => {
    document.addEventListener("click", (event) => {
      const link = event.target.closest("a[href]");
      if (link && /^(tel:|https:\/\/(?:wa\.me|t\.me|max\.ru)\/)/.test(link.href)) {
        event.preventDefault();
      }
    }, true);
  });
}

async function openPage(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
}

async function fillValidForm(page, overrides = {}) {
  await page.locator("#lead-name").fill(overrides.name || "Тест Клиент");
  await page.locator("#lead-phone").fill(overrides.phone || "8 999 123-45-67");
  if (overrides.email !== null) {
    await page.locator("#lead-email").fill(overrides.email || "test@example.ru");
  }
  await page.locator("#lead-service").selectOption(overrides.service || "buy");
  await page.locator("#lead-privacy-consent").check();
}

async function submitAndExpectError(page, category) {
  await page.locator("#lead-form button[type='submit']").click();
  await expect(page.locator("[data-form-fallback]")).toBeVisible();
  await expect(page.locator("#lead-form button[type='submit']")).toBeEnabled();
  await expect(page.locator("[data-form-status]")).toHaveClass(/form-status--error/);
  expect(page.url()).toContain("index.html");

  const goals = await getGoals(page);
  const errors = goals.filter((event) => event.goal === "lead_form_error");
  expect(errors.at(-1)?.params?.error_category).toBe(category);
}

test.beforeEach(async ({ page }) => {
  await installAnalyticsProbe(page, false);
});

test("empty fields and an invalid phone never create a request", async ({ page }) => {
  const network = await mockExternalRequests(page);
  await openPage(page, "/index.html#lead-form-section");

  await page.locator("#lead-form button[type='submit']").click();
  await expect(page.locator(".form-field-error")).toHaveCount(4);
  await expect(page.locator("#lead-name")).toBeFocused();
  expect(network.providerRequests).toBe(0);

  await page.locator("#lead-name").fill("Иван");
  await page.locator("#lead-phone").fill("1");
  await page.locator("#lead-service").selectOption("buy");
  await page.locator("#lead-privacy-consent").check();
  await page.locator("#lead-form button[type='submit']").click();

  await expect(page.locator("#lead-phone-error")).toBeVisible();
  await expect(page.locator("#lead-form button[type='submit']")).toBeEnabled();
  await expect(page.locator("#lead-name")).toHaveValue("Иван");
  expect(network.providerRequests).toBe(0);

  await page.locator("#lead-name").fill("Я");
  await page.locator("#lead-phone").fill("+7 999 123-45-67");
  await page.locator("#lead-email").fill("wrong@");
  await page.locator("#lead-form button[type='submit']").click();
  await expect(page.locator("#lead-name-error")).toBeVisible();
  await expect(page.locator("#lead-email-error")).toBeVisible();
  expect(network.providerRequests).toBe(0);

  const goals = await getGoals(page);
  expect(goals.filter((event) => event.goal === "lead_form_error")).toHaveLength(0);
  expect(goals.filter((event) => event.goal === "lead_form_submit_attempt")).toHaveLength(0);
});

test("valid submission sends once, includes attribution, and redirects only on confirmed success", async ({ page }) => {
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  const network = await mockExternalRequests(page, { delay: 80 });
  const sourceUrl = "/seo/kvartiry-loc-aksay.html?utm_source=audit&utm_medium=test&utm_campaign=lead&utm_content=card&utm_term=aksay";
  await openPage(page, sourceUrl);
  await page.getByRole("link", { name: /Связаться по объекту object_01/ }).click();
  await page.waitForURL(/index\.html#lead-form-section$/);
  await expect(page.locator("#lead-name")).toBeFocused();

  await fillValidForm(page, { phone: "89991234567" });
  await page.locator("#lead-form").evaluate((form) => {
    form.requestSubmit();
    form.requestSubmit();
  });

  await page.waitForURL(/thanks\.html$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Спасибо");
  expect(network.providerRequests).toBe(1);

  const payload = network.payloads[0];
  expect(payload).toContain("+79991234567");
  expect(payload).toContain('name="utm_source"');
  expect(payload).toContain("audit");
  expect(payload).toContain('name="utm_medium"');
  expect(payload).toContain('name="utm_campaign"');
  expect(payload).toContain('name="utm_content"');
  expect(payload).toContain('name="utm_term"');
  expect(payload).toContain('name="object_id"');
  expect(payload).toContain("object_01");
  expect(payload).toContain('name="object_title"');
  expect(payload).toContain('name="lead_type"');
  expect(payload).toContain('name="source_cta"');
  expect(payload).toContain('name="subject"');
  expect(payload).toContain('name="from_name"');
  expect(payload).toContain('name="source"');
  expect(payload).toContain('name="page_url"');
  expect(payload).toContain('name="page_title"');
  expect(payload).toContain('name="replyto"');
  expect(payload).not.toContain('name="mortgage_price"');
  expect(payload).not.toContain('name="mortgage_down_payment"');

  const goals = await getGoals(page);
  expect(goals.filter((event) => event.goal === "lead_form_submit_attempt")).toHaveLength(1);
  expect(goals.filter((event) => event.goal === "lead_form_success")).toHaveLength(1);
  expect(goals.filter((event) => event.goal === "lead_form_error")).toHaveLength(0);

  const storedContext = await page.evaluate(() => window.sessionStorage.getItem("domian_lead_context"));
  expect(storedContext).toBeNull();
  expect(consoleErrors).toEqual([]);
});

for (const [status, category] of [
  [400, "http_400"],
  [403, "http_403"],
  [429, "http_429"],
  [500, "http_500"]
]) {
  test(`HTTP ${status} restores the form and shows fallback actions`, async ({ page }) => {
    const network = await mockExternalRequests(page, {
      status,
      body: JSON.stringify({ success: false })
    });
    await openPage(page, "/index.html#lead-form-section");
    await fillValidForm(page);
    await submitAndExpectError(page, category);

    expect(network.providerRequests).toBe(1);
    await expect(page.locator("#lead-name")).toHaveValue("Тест Клиент");
    await expect(page.locator("[data-fallback-whatsapp]")).toBeVisible();
    await expect(page.locator("[data-fallback-telegram]")).toBeVisible();
    await expect(page.locator("[data-fallback-max]")).toBeVisible();
    await expect(page.locator("[data-fallback-phone]")).toHaveAttribute("href", /^tel:/);
    await expect(page.locator("[data-fallback-whatsapp]")).toHaveAttribute("target", "_blank");
    await expect(page.locator("[data-fallback-telegram]")).toHaveAttribute("rel", "noopener noreferrer");
    await expect(page.locator("[data-fallback-max]")).toHaveAttribute("href", MAX_DIRECT_URL);
    await expect(page.locator("[data-fallback-max]")).toHaveAttribute("aria-label", "Написать Зухре в MAX");

    const whatsappUrl = new URL(await page.locator("[data-fallback-whatsapp]").getAttribute("href"));
    const fallbackText = whatsappUrl.searchParams.get("text") || "";
    expect(fallbackText).not.toContain("Тест Клиент");
    expect(fallbackText).not.toContain("test@example.ru");
    expect(fallbackText).not.toContain("89991234567");

    if (status === 500) {
      await page.locator("[data-fallback-retry]").click();
      await expect(page.locator("[data-form-fallback]")).toBeVisible();
      expect(network.providerRequests).toBe(2);
    }
  });
}

test("success:false is an error and never redirects", async ({ page }) => {
  const network = await mockExternalRequests(page, {
    body: JSON.stringify({ success: false, message: "Rejected" })
  });
  await openPage(page, "/index.html#lead-form-section");
  await fillValidForm(page);
  await submitAndExpectError(page, "success_false");
  expect(network.providerRequests).toBe(1);
});

test("invalid JSON is an error and never redirects", async ({ page }) => {
  const network = await mockExternalRequests(page, {
    body: "not-json",
    contentType: "text/plain"
  });
  await openPage(page, "/index.html#lead-form-section");
  await fillValidForm(page);
  await submitAndExpectError(page, "invalid_json");
  expect(network.providerRequests).toBe(1);
});

test("fetch exception restores the button and preserves user data", async ({ page }) => {
  const network = await mockExternalRequests(page, { abort: true });
  await openPage(page, "/index.html#lead-form-section");
  await fillValidForm(page);
  await submitAndExpectError(page, "network");
  expect(network.providerRequests).toBe(1);
  await expect(page.locator("#lead-phone")).toHaveValue("+79991234567");
});

test("offline submission makes no request and offers phone plus all messengers", async ({ page, context }) => {
  const network = await mockExternalRequests(page);
  await openPage(page, "/index.html#lead-form-section");
  await fillValidForm(page);
  await context.setOffline(true);
  await submitAndExpectError(page, "offline");
  expect(network.providerRequests).toBe(0);
  await context.setOffline(false);
});

test("AbortController timeout is reported as timeout", async ({ page }) => {
  await installAnalyticsProbe(page, true);
  const network = await mockExternalRequests(page, { delay: 500 });
  await openPage(page, "/index.html#lead-form-section");
  await fillValidForm(page);
  await submitAndExpectError(page, "timeout");
  expect(network.providerRequests).toBe(1);
});

test("view/open and contact-channel goals are distinct and contain no personal data", async ({ page }) => {
  await mockExternalRequests(page);
  await openPage(page, "/index.html#lead-form-section");
  await expect(page.locator("#lead-form-section")).toBeInViewport();
  await page.locator("#lead-name").fill("И");

  await page.evaluate(() => {
    document.addEventListener("click", (event) => {
      const link = event.target.closest("a[href]");
      if (link && /^(tel:|https:\/\/wa\.me|https:\/\/t\.me)/.test(link.href)) {
        event.preventDefault();
      }
    }, true);
  });

  await page.locator('a[href^="tel:"]').first().click();
  await page.locator('a[href*="wa.me"]').first().click();
  await page.locator('a[href*="t.me"]').first().click();

  const goals = await getGoals(page);
  expect(goals.some((event) => event.goal === "lead_form_view")).toBeTruthy();
  expect(goals.filter((event) => event.goal === "lead_form_open")).toHaveLength(1);
  expect(goals.some((event) => event.goal === "phone_click")).toBeTruthy();
  expect(goals.some((event) => event.goal === "whatsapp_click")).toBeTruthy();
  expect(goals.some((event) => event.goal === "telegram_click")).toBeTruthy();
  expect(JSON.stringify(goals)).not.toContain("И");
});

test("desktop MAX opens the accessible QR dialog and every close path restores focus", async ({ page }) => {
  const network = await mockExternalRequests(page);
  await openPage(page, "/index.html");
  await preventContactNavigation(page);

  const trigger = page.locator(".header-contacts [data-channel='max']");
  const dialog = page.locator("[data-max-dialog]");
  const close = page.locator("[data-max-dialog-close]");
  const direct = page.locator("[data-max-direct]");

  await expect(trigger).toBeVisible();
  await expect(trigger).toHaveAttribute("href", MAX_DIRECT_URL);
  await expect(trigger).toHaveAttribute("target", "_blank");
  await expect(trigger).toHaveAttribute("rel", "noopener noreferrer");
  await expect(trigger).toHaveAttribute("aria-label", "Написать Зухре в MAX");

  await trigger.click();
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("heading", { name: "Написать Зухре в MAX" })).toBeVisible();
  await expect(page.locator(".max-dialog__name")).toHaveText("Зухра Алиева");
  await expect(page.locator(".max-dialog__instruction")).toContainText("Отсканируйте QR-код");
  await expect(page.locator(".max-dialog__qr")).toHaveAttribute("src", "/assets/images/max-zukhra-qr.png");
  await expect(direct).toHaveAttribute("href", MAX_DIRECT_URL);
  await expect(close).toBeFocused();

  await page.keyboard.press("Shift+Tab");
  await expect(direct).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await close.click();
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(close).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await dialog.evaluate((element) => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await direct.click();
  const goals = await getGoals(page);
  expect(goals.filter((event) => event.goal === "max_click")).toHaveLength(4);
  expect(goals.filter((event) => event.goal === "max_qr_open")).toHaveLength(4);
  expect(goals.filter((event) => event.goal === "max_direct_open")).toHaveLength(1);
  expect(network.externalUrls.filter((url) => url.startsWith("https://max.ru/"))).toEqual([]);
});

test("mobile MAX stays a direct external link and does not open the QR dialog", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const network = await mockExternalRequests(page);
  await openPage(page, "/index.html");
  await preventContactNavigation(page);

  await page.locator(".mobile-menu-toggle").click();
  const trigger = page.locator(".mobile-drawer__actions [data-channel='max']");
  await expect(trigger).toBeVisible();
  await expect(trigger).toHaveAttribute("href", MAX_DIRECT_URL);
  await trigger.click();

  await expect(page.locator("[data-max-dialog]")).toHaveCount(0);
  const goals = await getGoals(page);
  expect(goals.filter((event) => event.goal === "max_click")).toHaveLength(1);
  expect(goals.filter((event) => event.goal === "max_direct_open")).toHaveLength(1);
  expect(goals.filter((event) => event.goal === "max_qr_open")).toHaveLength(0);
  expect(network.externalUrls.filter((url) => url.startsWith("https://max.ru/"))).toEqual([]);
});

test("required pages expose compact WhatsApp, Telegram, and MAX controls without console errors", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await mockExternalRequests(page);
  for (const [url, selector] of [
    ["/index.html", ".contact-actions"],
    ["/team/zukhra-alieva.html", ".agent-contact-channels"],
    ["/thanks.html", ".thanks-channels"]
  ]) {
    await openPage(page, url);
    const group = page.locator(selector);
    await expect(group.locator(".channel-icon")).toHaveCount(3);
    await expect(group.locator("[data-channel='whatsapp']")).toHaveAttribute("aria-label", /WhatsApp/);
    await expect(group.locator("[data-channel='telegram']")).toHaveAttribute("aria-label", /Telegram/);
    await expect(group.locator("[data-channel='max']")).toHaveAttribute("href", MAX_DIRECT_URL);

    const sizes = await group.locator(".channel-icon").evaluateAll((links) => links.map((link) => {
      const rect = link.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }));
    for (const size of sizes) {
      expect(size.width).toBeGreaterThanOrEqual(40);
      expect(size.height).toBeGreaterThanOrEqual(40);
    }
  }

  const unexpectedErrors = errors.filter((message) => {
    return !/Failed to load resource/.test(message);
  });
  expect(unexpectedErrors).toEqual([]);
});

test("fallback MAX opens the same desktop dialog while preserving entered fields", async ({ page }) => {
  await mockExternalRequests(page, {
    status: 500,
    body: JSON.stringify({ success: false })
  });
  await openPage(page, "/index.html#lead-form-section");
  await preventContactNavigation(page);
  await fillValidForm(page);
  await submitAndExpectError(page, "http_500");

  await page.locator("[data-fallback-max]").click();
  await expect(page.locator("[data-max-dialog]")).toBeVisible();
  await expect(page.locator("#lead-name")).toHaveValue("Тест Клиент");
  await expect(page.locator("#lead-email")).toHaveValue("test@example.ru");
  const goals = await getGoals(page);
  expect(goals.some((event) => event.goal === "max_click")).toBeTruthy();
  expect(goals.some((event) => event.goal === "max_qr_open")).toBeTruthy();
});

test("MAX dialog respects dark theme and fits tablet viewport", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await mockExternalRequests(page);
  await openPage(page, "/index.html");
  await preventContactNavigation(page);

  await page.locator(".theme-toggle").first().click();
  await page.locator(".mobile-menu-toggle").click();
  await page.locator(".mobile-drawer__actions [data-channel='max']").click();
  const dialog = page.locator("[data-max-dialog]");
  await expect(dialog).toBeVisible();

  const metrics = await page.evaluate(() => {
    const dialog = document.querySelector("[data-max-dialog]");
    const panel = document.querySelector(".max-dialog__panel");
    const rect = dialog.getBoundingClientRect();
    return {
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      dialogLeft: rect.left,
      dialogRight: rect.right,
      panelBackground: getComputedStyle(panel).backgroundColor,
      dark: document.documentElement.getAttribute("data-theme")
    };
  });
  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.dialogLeft).toBeGreaterThanOrEqual(0);
  expect(metrics.dialogRight).toBeLessThanOrEqual(metrics.viewportWidth);
  expect(metrics.panelBackground).not.toBe("rgb(255, 250, 245)");
  expect(metrics.dark).toBe("dark");
});

test("contact layouts have no horizontal overflow at desktop, tablet, or mobile widths", async ({ page }) => {
  await mockExternalRequests(page);

  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 768, height: 900 },
    { width: 390, height: 844 }
  ]) {
    await page.setViewportSize(viewport);
    await openPage(page, "/index.html");
    const metrics = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth
    }));
    expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  }
});

test("generic owner CTA does not inherit a nearby property's title or price", async ({ page }) => {
  await mockExternalRequests(page);
  await openPage(page, "/index.html");
  await page.getByRole("link", { name: /Расскажите о вашем объекте/ }).click();
  await expect(page.locator("#lead-name")).toBeFocused();

  const context = await page.evaluate(() => JSON.parse(
    window.sessionStorage.getItem("domian_lead_context") || "{}"
  ));

  expect(context.lead_type).toBe("sell");
  expect(context.source_cta).toBe("owner_quick_request");
  expect(context.object_id).toBe("");
  expect(context.object_title).toBe("");
  expect(context.object_price).toBe("");
  expect(context.object_url).toBe("");
});

test("nested CTA scrolls to the form and focuses the first field", async ({ page }) => {
  await mockExternalRequests(page);
  await openPage(page, "/newbuilds/zapadnye-allei/");
  await page.getByRole("link", { name: "Уточнить наличие" }).click();
  await page.waitForURL(/index\.html#lead-form-section$/);
  await expect(page.locator("#lead-name")).toBeFocused();

  const position = await page.locator("#lead-form-section").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, viewport: window.innerHeight };
  });
  expect(position.bottom).toBeGreaterThan(0);
  expect(position.top).toBeLessThan(position.viewport);
});

test("mobile fallback layout is usable and form errors produce no console errors", async ({ page }) => {
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.setViewportSize({ width: 390, height: 844 });
  await mockExternalRequests(page, {
    status: 500,
    body: JSON.stringify({ success: false })
  });
  await openPage(page, "/index.html#lead-form-section");
  await fillValidForm(page, { email: null });
  await submitAndExpectError(page, "http_500");

  await expect(page.locator(".form-fallback__actions .btn")).toHaveCount(2);
  await expect(page.locator(".form-fallback__channels .channel-icon")).toHaveCount(3);
  const dimensions = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth
  }));
  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
  const unexpectedErrors = consoleErrors.filter((message) => {
    return !/Failed to load resource: the server responded with a status of 500/.test(message);
  });
  expect(unexpectedErrors).toEqual([]);
});
