const {test,expect,mockCaptchaScript}=require('./captcha-fixture');
const catalog=require('../output/newbuilds/catalog-v3.json');

test.beforeEach(async({page,baseURL})=>{
  await page.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.origin===new URL(baseURL).origin)return route.continue();
    if(url.href==='https://web3forms.com/client/script.js')return mockCaptchaScript(route);
    return route.fulfill({status:204,body:''});
  });
});
async function completeContact(page) {
  await page.locator('#lead-name').fill('Тест перехваченной отправки');
  await page.locator('#lead-phone').fill('+79991234567');
  await page.locator('#lead-privacy-consent').check();
  await page.getByRole('checkbox',{name:'Тестовая hCaptcha'}).check();
}
function field(payload,name) {
  const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return payload.match(new RegExp('name="'+escaped+'"\\r?\\n\\r?\\n([^\\r\\n]*)'))?.[1];
}
for(const width of [390,1440])test('honest catalog actions and local project cards at '+width,async({page},info)=>{
  await page.setViewportSize({width,height:900});
  await page.goto('/?qa=1');
  const catalogLink=page.locator('.stage12-search');
  await expect(catalogLink).toHaveText(/Каталог квартир\s+Открыть/);
  await catalogLink.click();
  await expect(page).toHaveURL(/apartments\.html.*#catalog/);
  await expect(page.locator('#cards .property-card')).toHaveCount(130);
  await expect(page.locator('.unified-property-search')).toHaveAttribute('href','#filters');
  await page.goto('/newbuilds.html?qa=1');
  await expect(page.locator('#cards>.nb-card')).toHaveCount(catalog.item_count);
  await page.locator('#nbCity').selectOption('Аксай');
  const projects=catalog.items.filter(item=>item.city==='Аксай');
  await expect(page.locator('#cards>.nb-card')).toHaveCount(projects.length);
  for(const item of projects.filter(item=>item.local_detail_url)) {
    const card=page.locator('[data-newbuild-id="'+item.id+'"]');
    await expect(card.locator('h3 a')).toHaveAttribute('href',item.local_detail_url);
    await expect(card.locator('.nb-card__primary')).toHaveAttribute('href','/#lead-form-section');
    await expect(card.locator('.nb-card__primary')).toHaveAttribute('data-project-name',item.title);
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.locator('#cards').screenshot({path:info.outputPath('local-projects-'+width+'.png')});
});
test('newbuild CTA preserves the project and prefills purchase without a repeated service choice',async({page})=>{
  let payload='';
  await page.route('https://api.web3forms.com/submit',route=>{
    payload=route.request().postData();
    return route.fulfill({status:200,contentType:'application/json',body:'{"success":true}'});
  });
  await page.goto('/newbuilds.html?qa=1&utm_source=audit_test');
  await page.locator('#nbCity').selectOption('Аксай');
  await page.locator('[data-newbuild-id="aksay-novyy"] .nb-card__primary').click();
  await expect(page.locator('#lead-name')).toBeFocused();
  await expect(page.locator('#lead-service')).toHaveValue('buy');
  await completeContact(page);
  await page.locator('#lead-form').evaluate(form=>form.requestSubmit());
  await expect(page).toHaveURL(/thanks\.html/);
  expect(field(payload,'service')).toBe('buy');
  expect(field(payload,'lead_type')).toBe('newbuild');
  expect(field(payload,'project_code')).toBe('aksay-novyy');
  expect(field(payload,'project_name')).toBe('Новый Аксай');
  expect(field(payload,'project_url')).toContain('/seo/zhk-novyy-aksay.html');
  expect(field(payload,'utm_source')).toBe('audit_test');
  expect(field(payload,'lead_id')).toBeTruthy();
});
test('a generic contact CTA cannot override the selected sell service in the email',async({page})=>{
  let payload='';
  await page.route('https://api.web3forms.com/submit',route=>{
    payload=route.request().postData();
    return route.fulfill({status:200,contentType:'application/json',body:'{"success":true}'});
  });
  await page.goto('/?qa=1');
  await page.locator('[data-source-cta="team_contact"]').click();
  await page.locator('#lead-service').selectOption('sell');
  await completeContact(page);
  await page.locator('#lead-form').evaluate(form=>form.requestSubmit());
  await expect(page).toHaveURL(/thanks\.html/);
  expect(field(payload,'service')).toBe('sell');
  expect(field(payload,'lead_type')).toBe('sell');
  expect(field(payload,'subject')).toBe('Новая заявка с domian-161.ru: sell');
});
test('object purchase is preselected; double clicks are blocked and a retry retains its lead ID',async({page})=>{
  const payloads=[];
  await page.route('https://api.web3forms.com/submit',async route=>{
    payloads.push(route.request().postData());
    await new Promise(resolve=>setTimeout(resolve,100));
    return route.fulfill({status:payloads.length===1?500:200,contentType:'application/json',body:JSON.stringify({success:payloads.length>1})});
  });
  await page.goto('/obekt/object_1013.html?qa=1');
  await expect(page.locator('#lead-service')).toHaveValue('buy');
  await completeContact(page);
  await page.locator('#lead-form').evaluate(form=>{form.requestSubmit();form.requestSubmit();});
  await expect(page.locator('[data-form-status]')).toHaveClass(/error/);
  expect(payloads).toHaveLength(1);
  await page.locator('#lead-form').evaluate(form=>form.requestSubmit());
  await expect(page).toHaveURL(/thanks\.html/);
  expect(payloads).toHaveLength(2);
  expect(field(payloads[0],'lead_id')).toBe(field(payloads[1],'lead_id'));
  expect(field(payloads[1],'object_id')).toBe('object_1013');
  expect(field(payloads[1],'service')).toBe('buy');
});
