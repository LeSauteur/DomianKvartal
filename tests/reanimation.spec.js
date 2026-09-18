const { test, expect } = require('@playwright/test');
test.use({ screenshot: 'off', trace: 'off' });
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => {
    if (new URL(route.request().url()).hostname === '127.0.0.1') return route.continue();
    return route.fulfill({status:204, body:''});
  });
});
test('filter, object, direct link, back and object CTA preserve identity', async ({ page }) => {
  await page.goto('/apartments.html?qa=1');
  await expect(page.locator('#cards .property-card')).toHaveCount(124);
  await expect(page.locator('#cards')).not.toContainText(/(?:905|901|100) комн/);
  await page.locator('[data-filter="priceMax"]').fill('5000000');
  const card = page.locator('#cards .property-card').first();
  const id = await card.getAttribute('data-object-id');
  const title = await card.locator('h2').innerText();
  await card.locator('.property-card__cta').click();
  await expect(page.locator('#modal')).toBeVisible();
  await expect(page.locator('#modalTitle')).toHaveText(title);
  expect(new URL(page.url()).searchParams.get('object')).toBe(id);
  await page.goBack();
  await expect(page.locator('#modal')).not.toBeVisible();
  await expect(page.locator('[data-filter="priceMax"]')).toHaveValue('5000000');
  await page.goto('/apartments.html?qa=1&object=' + id);
  await expect(page.locator('#modal')).toBeVisible();
  await expect(page.locator('#modalTitle')).toHaveText(title);
  await page.locator('#modal [data-source-cta="object_detail"]').click();
  const context = await page.evaluate(() => JSON.parse(sessionStorage.getItem('domian_lead_context')));
  expect(context.object_id).toBe(id);
  expect(context.object_title).toBe(title);
  expect(context.object_url).toContain('object=' + id);
  await expect(page.locator('#lead-form')).toBeVisible();
});
test('unknown direct object never opens a different listing', async ({ page }) => {
  await page.goto('/apartments.html?qa=1&object=does-not-exist');
  await expect(page.locator('#resultsCount')).toContainText('Объект по ссылке не найден');
  await expect(page.locator('#modal')).not.toBeVisible();
});

test('first source survives internal navigation and is included with an anonymous lead ID', async ({ page }) => {
  let payload = '';
  const counters = [];
  page.on('request', request => { if (/mc\.yandex/.test(request.url())) counters.push(request.url()); });
  await page.route('https://api.web3forms.com/submit', async route => {
    payload = route.request().postData();
    await route.fulfill({status:200,contentType:'application/json',body:'{"success":true}'});
  });
  await page.goto('/apartments.html?qa=1&utm_source=audit&utm_medium=test&utm_campaign=route&object=object_905', {referer:'https://yandex.ru/search/?text=not-stored'});
  await expect(page.locator('#modal')).toBeVisible();
  const initial = await page.evaluate(() => window.domianAttribution.get());
  await page.locator('#modal [data-source-cta="object_detail"]').click();
  expect(new URL(page.url()).searchParams.get('qa')).toBe('1');
  await page.waitForFunction(() => Boolean(window.domianAttribution));
  const subsequent = await page.evaluate(() => window.domianAttribution.get());
  expect(subsequent.session_id).toBe(initial.session_id);
  expect(subsequent.first_landing).toBe(initial.first_landing);
  expect(subsequent.initial_referrer).toBe('https://yandex.ru/search/');
  await page.locator('#lead-name').fill('Тест без отправки');
  await page.locator('#lead-phone').fill('+79991234567');
  await page.locator('#lead-service').selectOption('buy');
  await page.locator('#lead-privacy-consent').check();
  await page.locator('#lead-form').evaluate(form => form.requestSubmit());
  await expect(page).toHaveURL(/thanks\.html\?qa=1/);
  for (const field of ['first_landing','initial_referrer','session_id','lead_id','utm_source','source_cta','object_id','object_url','is_test']) expect(payload).toContain('name="' + field + '"');
  expect(payload).toContain(initial.session_id);
  expect(payload).toContain('object_905');
  expect(payload).not.toContain('not-stored');
  expect(counters).toEqual([]);
});

test('a blocked analytics callback cannot prevent successful form completion', async ({ page }) => {
  await page.route('https://api.web3forms.com/submit', route => route.fulfill({status:200,contentType:'application/json',body:'{"success":true}'}));
  await page.goto('/?qa=1');
  await page.evaluate(() => { window.domianReachGoal = () => {}; });
  await page.locator('#lead-name').fill('Тест без отправки');
  await page.locator('#lead-phone').fill('+79991234567');
  await page.locator('#lead-service').selectOption('buy');
  await page.locator('#lead-privacy-consent').check();
  await page.locator('#lead-form').evaluate(form => form.requestSubmit());
  await expect(page).toHaveURL(/thanks\.html\?qa=1/);
});

