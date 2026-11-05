const {test,expect}=require('./captcha-fixture');
const fs=require('node:fs'),path=require('node:path');
const records=require('../output/catalog/registry.json');
test.beforeEach(async({page,baseURL})=>{
  await page.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.origin===new URL(baseURL).origin)return route.continue();
    if(url.origin==='https://domian-161.ru'){
      const file=path.resolve(__dirname,'..','.'+decodeURIComponent(url.pathname));
      if(file.startsWith(path.resolve(__dirname,'..')+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({path:file});
    }
    return route.fulfill({status:204,body:''});
  });
});
for(const width of [390,1440])test(`updated apartment, house and land remain readable without JavaScript at ${width}`,async({browser,baseURL},info)=>{
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width,height:900}});
  const page=await context.newPage();
  await page.route('https://domian-161.ru/**',route=>{
    const file=path.resolve(__dirname,'..','.'+decodeURIComponent(new URL(route.request().url()).pathname));
    return fs.existsSync(file)?route.fulfill({path:file}):route.fulfill({status:404,body:''});
  });
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const id of ['object_1013','house_914','land_10']){
    await page.goto(baseURL+'/obekt/'+id+'.html?qa=1');
    await expect(page.locator('[data-listing-status]')).toHaveText('Актуально');
    await expect(page.locator('[data-listing-description]')).toContainText(records.find(r=>r.id===id).fullDescription.replace(/\s+/g,' '),{useInnerText:true});
    await expect(page.locator('h1')).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const image=page.locator('.visibility-gallery img').first();await image.scrollIntoViewIfNeeded();
    await expect.poll(()=>image.evaluate(i=>i.complete&&i.naturalWidth>0)).toBe(true);
    await page.locator('h1').scrollIntoViewIfNeeded();
    await page.screenshot({path:info.outputPath(`${id}-${width}.png`)});
    await page.locator('[data-listing-description]').screenshot({path:info.outputPath(`${id}-description-${width}.png`)});
  }
  expect(errors).toEqual([]);await context.close();
});
test('geography filters retain named regions and the modal uses the public description and status',async({page})=>{
  await page.goto('/apartments.html?qa=1');
  const expected=records.filter(r=>r.type==='apartment'&&r.city&&!['Аксай','Аксайский район','Ростов-на-Дону'].includes(r.city));
  await page.locator('[data-filter="city"]').selectOption('другое');
  await expect(page.locator('#cards .property-card')).toHaveCount(expected.length);
  expect(expected.length).toBeGreaterThan(0);
  await page.locator('#cards .property-card').first().locator('.property-card__cta').click();
  await expect(page.locator('#modal')).toBeVisible();
  await expect(page.locator('#modal [data-listing-status]')).toHaveText('Актуально');
  const id=new URL(page.url()).searchParams.get('object');
  await expect(page.locator('#modalDesc')).toHaveText(records.find(r=>r.id===id).fullDescription);
});
