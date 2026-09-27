import {chromium} from 'playwright';
import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.resolve('.'),out=path.join(root,'test-output');
await fs.mkdir(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp'};
const server=createServer(async(req,res)=>{
  try {
    const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
    if(!file.startsWith(root+path.sep))throw new Error('Forbidden');
    const bytes=await fs.readFile(file);
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(bytes);
  } catch {res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=process.env.TEST_BASE_URL||`http://127.0.0.1:${server.address().port}/`;
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1271,height:960}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
  await page.goto(base);
  await page.waitForFunction(()=>document.documentElement.dataset.siteHelp==='1.2.0-help1');
  await page.waitForFunction(()=>document.querySelector('#industry').options.length===17);
  await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
  assert.equal(await page.locator('.version').innerText(),'v1.2.0');
  assert.equal(await page.locator('.brand-actions .version + .header-nav').count(),1);
  const metrics=[];
  for(const width of [320,390,700,768,900,901,1024,1100,1101,1271,1440,1669,1920]) {
    await page.setViewportSize({width,height:960});await page.evaluate(()=>scrollTo(0,0));
    const m=await page.evaluate(()=>{
      const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,right:r.right,bottom:r.bottom};};
      return{width:innerWidth,scrollWidth:document.documentElement.scrollWidth,brand:rect('.brand-block'),nav:rect('.header-nav'),mascot:rect('.mascot'),card:rect('.purpose-panel')};
    });
    metrics.push(m);assert.ok(m.scrollWidth<=width,`horizontal overflow at ${width}`);
    assert.ok(m.nav.x>=0&&m.nav.right<=width,`nav clipping at ${width}`);
    assert.ok(m.brand.bottom<=m.card.y,`header under first card at ${width}`);
    if(width>900)assert.ok(m.mascot.x>=7&&m.mascot.right<=width,`mascot image, including speech, clipped at ${width}`);
    if([390,1271,1669].includes(width))await page.screenshot({path:path.join(out,`site-help-home-${width}.png`),fullPage:true});
  }
  await page.setViewportSize({width:1271,height:960});
  await page.click('#openFaq');assert.ok(await page.locator('#faqDialog').isVisible());
  const faqItems=page.locator('#faqDialog .faq-item');
  assert.equal(await faqItems.count(),4);
  assert.deepEqual(await faqItems.locator('summary').allTextContents(),[
    'Q1. 商用利用や外部ベンダーへの提供に使えますか？',
    'Q2. PDFの文字は検索・テキスト抽出できますか？',
    'Q3. 毎回同じ内容のドキュメントを再現できますか？',
    'Q4. 外部の生成AI APIを裏で呼び出していますか？'
  ]);
  assert.ok(!(await page.locator('#faqDialog').textContent()).includes('ZIP内の documents/ と _evaluation/'));
  assert.ok(!(await page.locator('#faqDialog').textContent()).includes('_metadata/'));
  await faqItems.nth(1).locator('summary').click();
  assert.ok(await faqItems.nth(1).locator('.faq-answer').isVisible());
  assert.ok((await faqItems.nth(1).innerText()).includes('テキストPDF'));
  await page.screenshot({path:path.join(out,'site-help-faq.png')});
  for(let i=0;i<12;i++) {
    await page.keyboard.press('Tab');
    assert.ok(await page.evaluate(()=>document.querySelector('#faqDialog').contains(document.activeElement)),'modal focus trap');
  }
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>!document.documentElement.classList.contains('info-modal-open'));
  assert.equal(await page.evaluate(()=>document.activeElement.id),'openFaq');
  await page.click('#openAbout');await page.screenshot({path:path.join(out,'site-help-about.png')});
  await page.locator('#aboutDialog [data-info-switch]').click();
  assert.ok(await page.locator('#faqDialog').isVisible());assert.ok(await page.locator('#aboutDialog').isHidden());
  await page.locator('#faqDialog .info-close').click();
  await page.waitForFunction(()=>!document.querySelector('#faqDialog').open);
  await page.selectOption('#industry','it');await page.waitForFunction(()=>document.querySelector('#job').options.length>=3);
  await page.selectOption('#job','engineer');await page.selectOption('#scene','operations');await page.click('#generate');
  assert.equal(await page.locator('.result').count(),10);
  await page.locator('.rsel').first().check();const before=await page.locator('#results').innerText();
  await page.evaluate(()=>scrollTo(0,0));await page.click('#openAbout');await page.keyboard.press('Escape');
  await page.waitForFunction(()=>!document.querySelector('#aboutDialog').open);
  assert.equal(await page.locator('#results').innerText(),before);assert.equal(await page.locator('.rsel:checked').count(),1);
  assert.equal(await page.locator('#industry').inputValue(),'it');
  await page.click('[data-preview="0"]');assert.ok(await page.locator('#preview').isVisible());await page.click('#closePreview');
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));await page.click('#openAbout');
  assert.ok(await page.locator('#aboutDialog').evaluate(d=>d.scrollWidth<=d.clientWidth));
  await page.screenshot({path:path.join(out,'site-help-about-mobile.png')});
  await page.locator('#aboutDialog .info-dialog-body').evaluate(d=>d.scrollTop=d.scrollHeight);
  const close=await page.locator('#aboutDialog .info-close').boundingBox();assert.ok(close.y>=0&&close.y+close.height<844);
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.documentElement.classList.contains('info-modal-open'));
  await page.setViewportSize({width:1271,height:960});await page.click('#openFaq');
  await page.mouse.click(5,5);await page.waitForFunction(()=>!document.querySelector('#faqDialog').open);
  assert.deepEqual(errors,[]);
  await fs.writeFile(path.join(out,'site-help-metrics.json'),JSON.stringify(metrics,null,2));
  console.log('PASS: complete mascot bounds at 13 widths, header links, 4 sequential FAQs, removed ZIP FAQ, About, keyboard focus/Escape/backdrop, retained generation/selection and existing preview.');
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
