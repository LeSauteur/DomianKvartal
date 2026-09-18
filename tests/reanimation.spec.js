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


for (const [path, type, cta] of [
  ['/sell-apartment.html','sell','sell_apartment_hero'],
  ['/property-valuation.html','valuation','valuation_hero']
]) test('mobile service route preserves intent: ' + path, async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto(path+'?qa=1&utm_source=service_test');
  await expect(page.locator('h1')).toHaveCount(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.locator('[data-source-cta="'+cta+'"]').click();
  await expect(page.locator('#lead-form')).toBeVisible();
  const context=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('domian_lead_context')));
  expect(context.lead_type).toBe(type);
  expect(context.source_cta).toBe(cta);
  await page.waitForFunction(()=>Boolean(window.domianAttribution));
  expect((await page.evaluate(()=>window.domianAttribution.get())).first_landing).toContain(path);
  expect(errors).toEqual([]);
});

test('lazy catalog photos load on scroll and gallery still changes the photo', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/apartments.html?qa=1');
  await expect(page.locator('#cards .property-card')).toHaveCount(124);
  const photo=page.locator('#cards .property-card__photo').last();
  expect(await photo.getAttribute('loading')).toBe('lazy');
  expect(await photo.evaluate(img=>img.complete)).toBe(false);
  await photo.scrollIntoViewIfNeeded();
  await expect.poll(()=>photo.evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
  const card=page.locator('#cards .property-card').filter({has:page.locator('.property-card__gallery-btn--next')}).filter({has:page.locator('img.property-card__photo[data-src^="objects/"]')}).first();
  const firstSrc=await card.locator('img.property-card__photo').getAttribute('src');
  await card.locator('.property-card__gallery-btn--next').click();
  await expect(card.locator('img.property-card__photo')).not.toHaveAttribute('src',firstSrc);
});

test('a recent listing outside the old index still opens its own details', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/apartments.html?qa=1&object=object_914');
  await expect(page.locator('#modal')).toBeVisible();
  await expect(page.locator('#modal [data-object-id="object_914"]')).toBeVisible();
  await expect(page.locator('#modalDesc')).toContainText('66 м²');
  await expect(page.locator('[data-modal-facts]')).toContainText('3 комн.');
  await page.keyboard.press('Escape');
  await expect(page.locator('#modal')).not.toBeVisible();
  expect(new URL(page.url()).searchParams.has('object')).toBe(false);
});
