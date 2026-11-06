const {test,expect,LOCAL_ORIGIN}=require('./captcha-fixture');
const path=require('node:path');
const fs=require('node:fs');

async function localOnly(page){
  await page.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.origin===LOCAL_ORIGIN)return route.continue();
    if(url.hostname==='domian-161.ru')return route.fulfill({response:await route.fetch({url:LOCAL_ORIGIN+url.pathname+url.search})});
    return route.fulfill({status:204,body:''});
  });
}

test('reviewed copy remains readable at mobile and desktop widths, including direct SEO links',async({page},testInfo)=>{
  test.setTimeout(90000);
  await localOnly(page);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const files=['/obekt/house_05.html','/obekt/house_06.html','/obekt/object_905.html','/obekt/object_82.html','/seo/kvartiry-loc-rostov-na-donu.html','/seo/kvartiry-zhk-ersona.html','/seo/kvartiry-zhk-zapadnye-allei.html','/seo/zhk-flora-aksay.html','/construction/projects/soyuz-142-2.html','/construction/projects/eqvita-01.html'];
  for(const width of [390,1440]){
    await page.setViewportSize({width,height:900});
    for(const file of files){
      const response=await page.goto(file+'?qa=1');expect(response.status()).toBe(200);
      await expect(page.locator('main h1')).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),file+' '+width).toBe(true);
      if(file.startsWith('/seo/kvartiry-')){
        await expect(page.locator('main')).not.toContainText('[object Object]');
        const heroImage=page.locator('.seo-editorial-hero img');
        const fits=await heroImage.evaluate(img=>{const image=img.getBoundingClientRect(),parent=img.parentElement.getBoundingClientRect();return image.width<=parent.width&&image.height<=361;});
        expect(fits,file+' bounded hero image').toBe(true);
      }
      if(file.includes('/obekt/')){
        await expect(page.locator('.visibility-description')).toBeVisible();
        const img=page.locator('.visibility-gallery img').first();
        const src=await img.getAttribute('src');
        const imageUrl=new URL(src,LOCAL_ORIGIN);
        if(imageUrl.origin===LOCAL_ORIGIN||imageUrl.hostname==='domian-161.ru'){
          await img.scrollIntoViewIfNeeded();
          await expect.poll(()=>img.evaluate(image=>image.complete&&image.naturalWidth>0)).toBe(true);
        }else{
          // External source photos are deliberately blocked in this offline suite.
          const record=require('../data/catalog/registry.json').find(r=>file==='/obekt/'+r.id+'.html');
          expect(src).toBe(record.images[0]);
        }
      }
      if(file==='/obekt/house_05.html'){
        await expect(page.locator('.visibility-description h3').first()).toBeVisible();
        expect(await page.locator('.visibility-description li').count()).toBeGreaterThan(1);
        expect(await page.locator('.visibility-description strong').count()).toBeGreaterThan(0);
      }
      if(file==='/seo/kvartiry-zhk-zapadnye-allei.html')await expect(page.locator('[data-registry-id]')).toHaveCount(0);
      if(file==='/seo/zhk-flora-aksay.html')await expect(page.locator('main')).not.toContainText('3,8–7,2');
      if(file==='/obekt/house_05.html'||file==='/seo/kvartiry-zhk-ersona.html'){
        const output=process.env.EDITORIAL_SCREENSHOT_DIR||testInfo.outputDir;
        fs.mkdirSync(output,{recursive:true});
        const screenshotPath=path.join(output,(file.includes('obekt')?'house05':'persona')+'-'+width+'.png');
        if(file.includes('obekt'))await page.locator('.visibility-description').screenshot({path:screenshotPath});
        else await page.screenshot({path:screenshotPath,fullPage:true});
      }
    }
  }
  await page.goto('/seo/kvartiry-zhk-ersona.html?qa=1');
  const card=page.locator('[data-registry-id]').first(),id=await card.getAttribute('data-registry-id');
  await card.locator('a[href$="#lead-form-section"]').click();
  await expect(page).toHaveURL(url=>url.pathname==='/obekt/'+id+'.html'&&url.hash==='#lead-form-section');
  await expect(page.locator('#lead-form')).toBeVisible();
  expect(errors).toEqual([]);
});

test('edited descriptions, structured lists and object links work without JavaScript',async({browser})=>{
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
  const page=await context.newPage();await localOnly(page);
  await page.goto(LOCAL_ORIGIN+'/obekt/house_05.html');
  await expect(page.locator('.visibility-description h3').first()).toBeVisible();
  expect(await page.locator('.visibility-description li').count()).toBeGreaterThan(1);
  await page.goto(LOCAL_ORIGIN+'/seo/kvartiry-zhk-ersona.html');
  const link=page.locator('[data-registry-id] h2 a').first(),href=await link.getAttribute('href');
  await link.click();await expect(page).toHaveURL(LOCAL_ORIGIN+href);
  await expect(page.locator('.visibility-description')).toBeVisible();
  await context.close();
});

test('recovered facts, sparse sources and unresolved areas stay readable on three widths',async({page},testInfo)=>{
  test.setTimeout(90000);
  await localOnly(page);
  const examples={
    house_02:'Подвал и терраса — по 25 м²',
    house_64:'Участок — 6 соток',
    house_913:'125 м²',
    house_22:'Дом.',
    house_43:'Документы готовы, возможен торг',
    object_41:'Мебель и техника остаются',
    object_94:'Территория дома закрытая',
    object_58:'Ипотечный расчёт не подходит',
    object_97:'два санузла',
    object_904:'отопление центральное',
    object_910:'августе 2025 года'
  };
  for(const width of [390,768,1440]){
    await page.setViewportSize({width,height:900});
    for(const [id,fact]of Object.entries(examples)){
      await page.goto('/obekt/'+id+'.html?qa=1');
      const description=page.locator('.visibility-description');
      await expect(description).toContainText(fact);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),id+' '+width).toBe(true);
      if(id==='object_904')await expect(page.locator('.visibility-facts')).not.toContainText('Жилая площадь');
      if(width===390&&['house_02','house_22','object_910'].includes(id))
        await description.screenshot({path:testInfo.outputPath('recovery-'+id+'-'+width+'.png')});
    }
  }
});
