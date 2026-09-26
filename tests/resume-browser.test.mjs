import {chromium} from 'playwright';
import JSZip from 'jszip';
import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const root=path.resolve('.'),out=path.join(root,'test-output');await fs.mkdir(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp'};
const server=createServer(async(req,res)=>{try{const n=decodeURIComponent(new URL(req.url,'http://local').pathname);const f=path.resolve(root,'.'+(n==='/'?'/index.html':n));if(!f.startsWith(root+path.sep))throw Error();const data=await fs.readFile(f);res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'text/plain'});res.end(data);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=process.env.TEST_BASE_URL||`http://127.0.0.1:${server.address().port}/`;
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1271,height:900},acceptDownloads:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
const normal=s=>s.replace(/\s/g,'');const decode=s=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
const runs=(xml,tag)=>[...xml.matchAll(new RegExp(`<${tag}(?: [^>]*)?>([\\s\\S]*?)<\\/${tag}>`,'g'))].map(m=>decode(m[1])).join('');
try{
 await page.goto(base);await page.waitForFunction(()=>document.querySelector('#industry').options.length===17);
 assert.equal(await page.locator('.version').innerText(),'v1.2.0');
 const header=await page.locator('.hero-inner').evaluate(el=>({padding:parseFloat(getComputedStyle(el).paddingTop),height:el.getBoundingClientRect().height}));assert.equal(header.height,170);assert.ok(header.padding>=24);
 await page.screenshot({path:path.join(out,'header-room.png'),fullPage:true});
 await page.selectOption('#industry','wholesale');await page.waitForFunction(()=>document.querySelector('#job').options.length===3);
 await page.selectOption('#job','dx');await page.selectOption('#scene','hiring');await page.locator('.dsel[value="job"]').uncheck();await page.selectOption('#length','detailed');await page.click('#generate');
 await page.click('[data-preview="0"]');assert.ok(await page.locator('.resume-table').count()>=6);assert.ok((await page.locator('#previewBody').innerText()).includes('テスト 太郎'));await page.screenshot({path:path.join(out,'cv-preview.png')});await page.click('#closePreview');
 const source=await page.evaluate(async()=> (await import('./js/app.js?v=1.2.0')).getGenerated()[0]);await fs.writeFile(path.join(out,'cv-source.json'),JSON.stringify(source,null,2));
 const paragraphs=source.sections.flatMap(s=>s.paragraphs),cells=source.sections.flatMap(s=>s.table?[...s.table.headers,...s.table.rows.flat()]:[]);
 for(const format of ['docx','xlsx','pptx','pdf']){
  const bytes=await page.evaluate(async format=>{const app=await import('./js/app.js?v=1.2.0'),exp=await import('./js/exporters.js?v=1.2.0'),doc=structuredClone(app.getGenerated()[0]);doc.format=format;return Array.from(new Uint8Array(await (await exp.exportDocument(doc)).arrayBuffer()));},format);
  const file=path.join(out,`career-example.${format}`);await fs.writeFile(file,Buffer.from(bytes));let text='';
  if(format==='pdf'){
   text=execFileSync('pdftotext',['-layout',file,'-'],{encoding:'utf8'}).split('\n').filter(l=>!/^\s*TEST-DOC-\S+\s*$/.test(l)&&!/^\s*TEST DATA ONLY \/ \d+ \/ \d+\s*$/.test(l)).join('\n');
   execFileSync('pdftoppm',['-scale-to','1050','-png',file,path.join(out,'cv-page')]);
  }else{
   const z=await JSZip.loadAsync(Buffer.from(bytes));
   if(format==='docx'){const xml=await z.file('word/document.xml').async('string');assert.ok((xml.match(/<w:tbl>/g)||[]).length>=6);text=runs(xml,'w:t');}
   if(format==='xlsx'){const xml=await z.file('xl/worksheets/sheet2.xml').async('string');text=[...xml.matchAll(/<c r="D\d+"[^>]*>([\s\S]*?)<\/c>/g)].map(m=>runs(m[1],'t')).join('');}
   if(format==='pptx'){const names=Object.keys(z.files).filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a,b)=>Number(a.match(/slide(\d+)/)[1])-Number(b.match(/slide(\d+)/)[1]));for(const n of names){const xml=await z.file(n).async('string'),shapes=[...xml.matchAll(/<p:sp>[\s\S]*?<\/p:sp>/g)];text+=runs(shapes.at(-1)?.[0]||'','a:t');}}
  }
  for(const p of [...paragraphs,...cells])assert.ok(normal(text).includes(normal(p)),`${format}: missing content: ${p.slice(0,80)}`);
  console.log(`PASS ${format}: ${paragraphs.length} paragraphs and ${cells.length} table cells retained.`);
 }
 await page.locator('.rsel').first().check();const waiting=page.waitForEvent('download');await page.click('#zip');const dl=await waiting,zipPath=path.join(out,'cv-selected.zip');await dl.saveAs(zipPath);const z=await JSZip.loadAsync(await fs.readFile(zipPath));assert.ok(z.file('_evaluation/questions.jsonl'));assert.equal(Object.keys(z.files).filter(f=>f.startsWith('documents/')&&!z.files[f].dir).length,1);
 for(const [industry,job,scene]of [['medical','office','operations'],['media','director','improvement'],['construction','estimator','requirements']]){await page.selectOption('#industry',industry);await page.waitForFunction(()=>document.querySelector('#job').options.length===3);await page.selectOption('#job',job);await page.selectOption('#scene',scene);await page.click('#generate');assert.equal(await page.locator('.result').count(),10);}
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(out,'header-mobile.png'),fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS: 16 industries, realistic CV tables, four formats, ZIP evaluation isolation, new workflows and relaxed header.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
