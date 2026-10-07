const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.fulfill({status:204,body:''}));
});
test('static category links and object facts remain available without JavaScript',async({browser})=>{
  const context=await browser.newContext({javaScriptEnabled:false});
  const page=await context.newPage();
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.fulfill({status:204,body:''}));
  await page.goto('http://127.0.0.1:4173/apartments.html');
  await expect(page.locator('[data-registry-id="object_910"] a')).toHaveAttribute('href','/obekt/object_910.html');
  await page.locator('[data-registry-id="object_910"] a').click();
  await expect(page.locator('h1')).toContainText('object_910');
  await expect(page.locator('.visibility-price')).toHaveText('Цена по запросу');
  await context.close();
});
test('modal keeps category canonical and links to the real object page',async({page})=>{
  await page.goto('/houses.html?qa=1&object=house_912');
  await expect(page.locator('#modal')).toBeVisible();
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href','https://domian-161.ru/houses.html');
  await expect(page.locator('#modal [data-object-page]')).toHaveAttribute('href','/obekt/house_912.html');
});
test('direct object form overrides stale object context and uses the shared provider',async({page})=>{
  let payload='';
  await page.route('https://api.web3forms.com/submit',route=>{payload=route.request().postData();return route.fulfill({status:200,contentType:'application/json',body:'{"success":true}'});});
  await page.addInitScript(()=>sessionStorage.setItem('domian_lead_context',JSON.stringify({object_id:'other-object',source_cta:'old-cta',lead_type:'sell'})));
  await page.goto('/obekt/object_910.html?qa=1');
  await page.locator('#lead-name').fill('Тест без отправки');
  await page.locator('#lead-phone').fill('+79991234567');
  await page.locator('#lead-service').selectOption('buy');
  await page.locator('#lead-privacy-consent').check();
  await page.locator('#lead-form').evaluate(form=>form.requestSubmit());
  await expect(page).toHaveURL(/thanks\.html\?qa=1/);
  expect(payload).toContain('object_910');
  expect(payload).toContain('object_page');
  expect(payload).not.toContain('other-object');
  expect(payload).not.toContain('5950000');
});
test('city filters preserve unknown locations and expose Rostov and Azov accurately',async({page})=>{
  await page.goto('/apartments.html?qa=1');
  await expect(page.locator('#cards .property-card').first()).toContainText('Аксай');
  await page.locator('[data-filter=city]').selectOption('Аксай');
  await expect(page.locator('#cards .property-card')).toHaveCount(6);
  await expect(page).toHaveURL(/f_city=/);
  await page.locator('[data-filter=city]').selectOption('unknown');
  const registry=require('../data/catalog/registry.json');
  await expect(page.locator('#cards .property-card')).toHaveCount(registry.filter(r=>r.type==='apartment'&&r.city===null).length);
  await page.goto('/houses.html?qa=1');
  await page.locator('[data-filter=city]').selectOption('Ростов-на-Дону');
  await expect(page.locator('#cards .property-card')).toHaveCount(1);
  await expect(page.locator('#cards [data-object-id="house_912"]')).toContainText('Ростов-на-Дону');
  await page.goto('/lands.html?qa=1');
  await page.locator('[data-filter=city]').selectOption('другое');
  await expect(page.locator('#cards [data-object-id="land_01"]')).toContainText('Азовский р-н');
});
