import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve('.'),out=path.join(root,'test-output');await fs.mkdir(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp'};
const server=createServer(async(req,res)=>{try{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const f=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!f.startsWith(root+path.sep))throw new Error('Forbidden');const bytes=await fs.readFile(f);res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'text/plain'});res.end(bytes);}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=process.env.TEST_BASE_URL||`http://127.0.0.1:${server.address().port}/`;
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1080}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(base);await page.waitForFunction(()=>document.querySelector('#industry').options.length===17);
 assert.equal(await page.locator('.version').innerText(),'v1.2.0');
 assert.equal(await page.locator('h1').innerText(),'DOCUMENTS CREATOR');
 assert.ok((await page.title()).startsWith('DOCUMENTS CREATOR'));
 await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
 const expected={'assets/mascots/header-cat.webp':'c17cdd6097b182467ac07ccf9c09c22e4c62f5be7b3b79c20271b7d84248da07','assets/mascots/laptop-cat.webp':'1eca070774aa7f68395d8e0e2323699f0bf800ac1f7b8af30a8e6ba760409d96','assets/favicon-32.png':'169da59116c58b28effe51b99381f3fb97d3eccf416f10a9f1ba65b9735e2c10'};
 for(const [file,sha] of Object.entries(expected)){const response=await page.request.get(new URL(file,base).href);assert.equal(response.status(),200);assert.equal(createHash('sha256').update(await response.body()).digest('hex'),sha);}
 assert.match(await page.locator('link[rel=icon]').getAttribute('href'),/favicon-32\.png/);
 await page.screenshot({path:path.join(out,'desktop-empty.png'),fullPage:true});
 const layout=[];
 for(const width of [1920,1440,1271,1024,768,390,320]){
  await page.setViewportSize({width,height:900});await page.evaluate(()=>scrollTo(0,0));
  const sizes=await page.evaluate(()=>{
   const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right};};
   return {viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,hero:rect('.hero'),purpose:rect('.purpose-panel'),documents:rect('.documents-panel'),settings:rect('.settings-panel'),generate:rect('#generate'),length:rect('#length')};
  });layout.push(sizes);
  assert.ok(sizes.scrollWidth<=width,`overflow at ${width}`);
  if(width===1271){
   assert.equal(sizes.hero.height,170,'Reference header must stay compact');
   assert.ok(Math.abs(sizes.purpose.x-122)<4,'Reference card left edge');
   assert.ok(Math.abs(sizes.purpose.width-1092)<5,'Reference card width');
   assert.equal(sizes.purpose.y,130,'Reference first card top');
   assert.ok(sizes.generate.bottom<880,'Primary action should not be pushed far below the reference');
   const format=await page.locator('.format-field').boundingBox(),counts=await page.locator('.count-field').boundingBox();
   assert.ok(Math.abs(format.y-counts.y)<2,'Formats and counts must share a row');
  }
  assert.ok(sizes.length.width>120,'Length input remains usable');
  await page.screenshot({path:path.join(out,`reference-${width}.png`),fullPage:true});
 }
 await fs.writeFile(path.join(out,'layout-metrics.json'),JSON.stringify(layout,null,2));
 console.log('REFERENCE LAYOUT',JSON.stringify(layout.find(x=>x.viewport===1271)));
 await page.setViewportSize({width:1271,height:900});
 await page.selectOption('#industry','it');await page.waitForFunction(()=>document.querySelector('#job').options.length===3);await page.selectOption('#job','engineer');await page.selectOption('#scene','operations');
 await page.waitForFunction(()=>document.querySelector('#docSelectionCount').textContent.includes('2 / 2'));
 await page.locator('.dsel').first().uncheck();await page.waitForFunction(()=>document.querySelector('#docSelectionCount').textContent.includes('1 / 2'));await page.click('#selectDocs');assert.equal(await page.locator('.dsel:checked').count(),2);
 await page.selectOption('#length','detailed');await page.click('#generate');assert.equal(await page.locator('.result').count(),10);
 await page.locator('.rsel').first().check();await page.waitForFunction(()=>document.querySelector('#zip').textContent==='選択した1件をZIP');
 await page.click('#all');assert.equal(await page.locator('.rsel:checked').count(),10);await page.click('#none');assert.equal(await page.locator('.rsel:checked').count(),0);
 await page.click('[data-preview="0"]');assert.ok(await page.locator('.preview-section').count()>15);await page.screenshot({path:path.join(out,'preview-themed.png')});await page.click('#closePreview');
 await page.locator('#advanced').evaluate(el=>el.open=true);await page.fill('#seed','42');await page.uncheck('#evaluation');await page.waitForFunction(()=>document.querySelector('#advancedSummary').textContent.includes('なし'));await page.check('#evaluation');await page.locator('#advanced').evaluate(el=>el.open=false);
 for(const width of [1920,1440,1280,1024,768,390,320]){
  await page.setViewportSize({width,height:980});await page.evaluate(()=>scrollTo(0,0));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`results overflow at ${width}`);
  if(width>=1024){const image=await page.locator('.mascot').boundingBox();const control=await page.locator('#generate').boundingBox();assert.ok(image.x+image.width<=control.x,'Mascot overlaps controls');}
  await page.screenshot({path:path.join(out,`width-${width}.png`),fullPage:true});
 }
 assert.deepEqual(errors,[]);console.log('PASS: DOCUMENTS CREATOR title, supplied artwork and favicon, compact reference geometry, all existing UI interactions and seven responsive widths.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
