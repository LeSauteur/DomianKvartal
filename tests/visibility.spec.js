const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.fulfill({status:204,body:''}));
});
test('placeholder query never opens a listing and no placeholder cards are rendered',async({page})=>{
  for(const category of ['houses','lands']) {
    const id=category==='houses'?'house_901':'land_901';
    await page.goto('/'+category+'.html?qa=1&object='+id);
    await expect(page.locator('#cards .property-card').first()).toBeVisible();
    await expect(page.locator('#modal')).not.toBeVisible();
    await expect(page.locator('a[href*="'+id+'"]')).toHaveCount(0);
    await expect(page.locator('[data-object-id="'+id+'"]')).toHaveCount(0);
  }
});
test('Aksay district joins Aksay ahead of other cities',async({page})=>{
  const data=require('../output/catalog/registry.json').filter(r=>r.type==='house');
  const sample=[{...data[0],city:'Ростов-на-Дону'},{...data[1],city:'Аксайский район'},{...data[2],city:'Аксай'}];
  await page.route('**/output/catalog/registry.json',route=>route.fulfill({json:sample}));
  await page.goto('/houses.html?qa=1');
  await expect(page.locator('#cards .property-card')).toHaveCount(3);
  await expect(page.locator('#cards .property-card').nth(0)).toContainText('Аксайский район');
  await expect(page.locator('#cards .property-card').nth(1)).toContainText('Аксай');
  await expect(page.locator('#cards .property-card').nth(2)).toContainText('Ростов-на-Дону');
});

async function serveProductionLocally(page) {
  await page.route('https://domian-161.ru/**', async route => {
    const url=new URL(route.request().url());
    await route.fulfill({response:await route.fetch({url:'http://127.0.0.1:4173'+url.pathname+url.search})});
  });
}
test('production counter initializes exactly once through main.js, without live analytics',async({page})=>{
  await serveProductionLocally(page);
  await page.goto('https://domian-161.ru/');
  await expect.poll(()=>page.evaluate(()=>Array.from(window.ym?.a||[]).filter(a=>a[1]==='init').length)).toBe(1);
  await page.addScriptTag({url:'https://domian-161.ru/assets/js/main.js'});
  expect(await page.evaluate(()=>Array.from(window.ym.a).filter(a=>a[1]==='init').length)).toBe(1);
  expect(await page.locator('script[src*="mc.yandex.ru/metrika/tag.js"]').count()).toBe(1);
  expect(await page.evaluate(()=>window.DOMIAN_CONSENT_MODE)).toBe('off');
  await expect(page.locator('#domian-cookie-banner')).toHaveCount(0);
});

test('consent on blocks analytics until acceptance and remembers acceptance across pages',async({page})=>{
  await serveProductionLocally(page);
  await page.addInitScript(()=>window.DOMIAN_CONSENT_MODE='on');
  let analyticsRequests=0;
  await page.route('https://mc.yandex.ru/**',route=>{analyticsRequests++;return route.fulfill({status:204,body:''});});
  await page.goto('https://domian-161.ru/obekt/object_910.html');
  await expect(page.locator('#domian-cookie-banner')).toBeVisible();
  expect(await page.evaluate(()=>typeof window.ym)).toBe('undefined');
  expect(analyticsRequests).toBe(0);
  await page.getByRole('button',{name:'Принять',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>Array.from(window.ym?.a||[]).filter(a=>a[1]==='init').length)).toBe(1);
  await expect(page.locator('#domian-cookie-banner')).toHaveCount(0);
  await expect.poll(()=>analyticsRequests).toBe(1);
  await page.goto('https://domian-161.ru/seo/zhk-flora-aksay.html');
  await expect.poll(()=>page.evaluate(()=>Array.from(window.ym?.a||[]).filter(a=>a[1]==='init').length)).toBe(1);
  await expect(page.locator('#domian-cookie-banner')).toHaveCount(0);
});
test('necessary-only choice survives reload without analytics and banner fits mobile',async({page})=>{
  await serveProductionLocally(page);
  await page.addInitScript(()=>window.DOMIAN_CONSENT_MODE='on');
  await page.setViewportSize({width:390,height:844});
  let analyticsRequests=0;
  await page.route('https://mc.yandex.ru/**',route=>{analyticsRequests++;return route.fulfill({status:204,body:''});});
  await page.goto('https://domian-161.ru/');
  await expect(page.locator('#domian-cookie-banner')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.getByRole('button',{name:'Только необходимые',exact:true}).click();
  await page.reload();
  await expect(page.locator('#domian-cookie-banner')).toHaveCount(0);
  expect(await page.evaluate(()=>typeof window.ym)).toBe('undefined');
  expect(analyticsRequests).toBe(0);
});
test('consent acceptance keeps QA analytics disabled',async({page})=>{
  await page.addInitScript(()=>window.DOMIAN_CONSENT_MODE='on');
  await page.goto('/?qa=1');
  await page.getByRole('button',{name:'Принять',exact:true}).click();
  expect(await page.evaluate(()=>typeof window.ym)).toBe('undefined');
});
test('static category links and object facts remain available without JavaScript',async({browser})=>{
  const context=await browser.newContext({javaScriptEnabled:false});
  const page=await context.newPage();
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.fulfill({status:204,body:''}));
  await page.goto('http://127.0.0.1:4173/apartments.html');
  await expect(page.locator('[data-registry-id="object_910"] a')).toHaveAttribute('href','/obekt/object_910.html');
  await page.locator('[data-registry-id="object_910"] a').click();
  await expect(page.locator('h1')).toHaveText(/Квартира.*36 м².*Ростов-на-Дону/);
  await expect(page.locator('h1')).not.toContainText('object_910');
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
test('reviewed apartment areas stay corrected or absent in modal facts and public headings',async({page})=>{
  for(const [id,correct,wrong] of [[112,null,10],[45,null,15],[59,17.8,13],[62,54.4,13],[91,40.5,10],[95,null,15]]) {
    await page.goto('/apartments.html?qa=1&object=object_'+id);
    await expect(page.locator('#modal')).toBeVisible();
    const facts=page.locator('[data-modal-facts]');
    if(correct!==null) await expect(facts).toContainText(correct+' м²');
    await expect(facts).not.toContainText(wrong+' м²');
    await expect(page.locator('#modalTitle')).not.toContainText(wrong+' м²');
    await page.goto('/obekt/object_'+id+'.html?qa=1');
    await expect(page.locator('h1')).not.toContainText(wrong+' м²');
    if(correct!==null) await expect(page.locator('.visibility-facts')).toContainText(correct+' м²');
    else await expect(page.locator('.visibility-facts dt').filter({hasText:/^Площадь$/})).toHaveCount(0);
  }
});
test('ZHK forms keep their project attribution and page layouts fit mobile',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  for(const slug of ['flora','vishnevyy-sad','samotsvety','atmosfera','novyy']){
    await page.goto('/seo/zhk-'+slug+'-aksay.html?qa=1');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('[data-lead-form]')).toHaveAttribute('data-source-cta','zhk_'+slug);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  }
  let payload='';
  await page.route('https://api.web3forms.com/submit',route=>{payload=route.request().postData();return route.fulfill({status:200,contentType:'application/json',body:'{"success":true}'});});
  await page.goto('/seo/zhk-flora-aksay.html?qa=1');
  await page.locator('#lead-name').fill('Тест без отправки');
  await page.locator('#lead-phone').fill('+79991234567');
  await page.locator('#lead-service').selectOption('buy');
  await page.locator('#lead-privacy-consent').check();
  await page.locator('#lead-form').evaluate(form=>form.requestSubmit());
  await expect(page).toHaveURL(/thanks\.html\?qa=1/);
  expect(payload).toContain('zhk_flora');
  expect(payload).toContain('/seo/zhk-flora-aksay.html');
});
