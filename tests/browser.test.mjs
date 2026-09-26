import {chromium} from 'playwright';
import JSZip from 'jszip';
import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const root=path.resolve('.'),out=path.join(root,'test-output');await fs.mkdir(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp'};
const server=createServer(async(req,res)=>{try{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(name==='/favicon.ico'){res.writeHead(204);res.end();return;}const f=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!f.startsWith(root+path.sep))throw new Error('Forbidden');const data=await fs.readFile(f);res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'text/plain'});res.end(data);}catch{res.writeHead(404);res.end('Not found');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url=process.env.TEST_BASE_URL||`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:1000},acceptDownloads:true});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const normal=s=>s.replace(/\s/g,'');
const decode=s=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
const runs=(xml,tag)=>[...xml.matchAll(new RegExp(`<${tag}(?: [^>]*)?>([\\s\\S]*?)<\\/${tag}>`,'g'))].map(m=>decode(m[1])).join('');
try{
 await page.goto(url);await page.waitForFunction(()=>document.querySelector('#industry').options.length===8);
 await page.selectOption('#industry','it');await page.waitForFunction(()=>document.querySelector('#job').options.length===3);
 await page.selectOption('#job','engineer');await page.selectOption('#scene','operations');
 assert.equal(await page.locator('.dsel').count(),2);await page.selectOption('#length','detailed');await page.click('#generate');
 assert.equal(await page.locator('.result').count(),10);
 await page.screenshot({path:path.join(out,'ui.png'),fullPage:true});
 await page.click('[data-preview="0"]');assert.ok(await page.locator('.preview-section').count()>15);
 await page.screenshot({path:path.join(out,'preview.png')});await page.click('#closePreview');
 const source=await page.evaluate(async()=> (await import('./js/app.js?v=1.1.0')).getGenerated()[0]);
 await fs.writeFile(path.join(out,'source.json'),JSON.stringify(source,null,2));
 const paragraphs=source.sections.flatMap(s=>s.paragraphs);
 for(const format of ['docx','xlsx','pptx','pdf']){
  const bytes=await page.evaluate(async format=>{
   const app=await import('./js/app.js?v=1.1.0'),exp=await import('./js/exporters.js?v=1.1.0');
   const doc=structuredClone(app.getGenerated()[0]);doc.format=format;
   return Array.from(new Uint8Array(await (await exp.exportDocument(doc)).arrayBuffer()));
  },format);
  const file=path.join(out,`sample.${format}`);await fs.writeFile(file,Buffer.from(bytes));let text='';
  if(format==='pdf'){
   text=execFileSync('pdftotext',['-layout',file,'-'],{encoding:'utf8'});
   assert.ok(text.includes('TEST DATA ONLY'));assert.ok(!text.includes('[JP]'));
   text=text.split('\n').filter(line=>!/^\s*TEST-DOC-\S+\s*$/.test(line)&&!/^\s*TEST DATA ONLY \/ \d+ \/ \d+\s*$/.test(line)).join('\n');
   const info=execFileSync('pdfinfo',[file],{encoding:'utf8'});console.log(info.match(/Pages:\s+\d+/)?.[0]);
   execFileSync('pdftoppm',['-f','1','-l','1','-scale-to','1200','-png',file,path.join(out,'pdf-preview')]);
  }else{
   const zip=await JSZip.loadAsync(Buffer.from(bytes));
   if(format==='docx')text=runs(await zip.file('word/document.xml').async('string'),'w:t');
   if(format==='xlsx'){
    const xml=await zip.file('xl/worksheets/sheet2.xml').async('string');
    text=[...xml.matchAll(/<c r="D\d+"[^>]*>([\s\S]*?)<\/c>/g)].map(m=>runs(m[1],'t')).join('');
   }
   if(format==='pptx'){
    const names=Object.keys(zip.files).filter(x=>/^ppt\/slides\/slide\d+\.xml$/.test(x)).sort((a,b)=>Number(a.match(/slide(\d+)/)[1])-Number(b.match(/slide(\d+)/)[1]));
    for(const n of names){const xml=await zip.file(n).async('string');const shapes=[...xml.matchAll(/<p:sp>[\s\S]*?<\/p:sp>/g)];text+=runs(shapes.at(-1)?.[0]||'','a:t');}
   }
  }
  for(const p of paragraphs)assert.ok(normal(text).includes(normal(p)),`${format} dropped source text: ${p.slice(0,35)}`);
  console.log(`${format}: ${bytes.length} bytes; all ${paragraphs.length} source paragraphs retained`);
 }
 await page.locator('.rsel').nth(0).check();await page.locator('.rsel').nth(1).check();
 const waiting=page.waitForEvent('download');await page.click('#zip');const download=await waiting;const zipPath=path.join(out,'selected.zip');await download.saveAs(zipPath);
 const zip=await JSZip.loadAsync(await fs.readFile(zipPath));
 assert.equal(Object.keys(zip.files).filter(n=>n.startsWith('documents/')&&!zip.files[n].dir).length,2);
 const q=(await zip.file('_evaluation/questions.jsonl').async('string')).trim().split('\n').map(JSON.parse);assert.equal(q.length,8);
 const ids=new Set(q.map(x=>x.documentId));assert.equal(ids.size,2);
 assert.ok(q.filter(x=>x.answerable).every(x=>x.evidence));
 for(const f of ['xlsx','pptx','pdf'])await page.check(`input[name=fmt][value=${f}]`);
 await page.check('input[name=count][value="50"]');await page.click('#generate');assert.equal(await page.locator('.result').count(),50);
 const formats=await page.evaluate(async()=>[...new Set((await import('./js/app.js?v=1.1.0')).getGenerated().map(x=>x.format))]);assert.equal(formats.length,4);
 await page.selectOption('#industry','hr');await page.waitForFunction(()=>document.querySelector('#job').options.length===2);assert.ok(await page.locator('#resultPanel').isHidden());
 await page.selectOption('#job','recruiter');await page.selectOption('#scene','hiring');await page.locator('#advanced').evaluate(el=>el.open=true);await page.fill('#seed','');await page.click('#generate');assert.ok((await page.locator('#status').innerText()).includes('シード'));
 await page.fill('#seed','42');await page.check('input[name=count][value="10"]');await page.click('#generate');
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
 assert.deepEqual(errors,[],'Uncaught browser errors');
 console.log('PASS: actual ESM loading, cascading filters, four exporters, full text retention, searchable Japanese PDF, preview, ZIP, evaluation isolation, validation, mobile layout.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
