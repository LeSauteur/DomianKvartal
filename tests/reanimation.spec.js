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
