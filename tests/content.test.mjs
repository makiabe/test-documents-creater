import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateIndustry,validateTemplates,generateDocument,plainText,createBatch,evaluationFiles} from '../js/content-engine.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const load=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const manifest=load('data/manifest.json');
const templates=validateTemplates(load(manifest.templates));
let count=0;const sizes={standard:[],long:[],detailed:[]};
for(const ref of manifest.industries){
 const industry=validateIndustry(load(ref.path));
 for(const profile of industry.profiles)for(const [templateId,template]of Object.entries(templates)){
  let last=0;
  for(const level of Object.keys(sizes)){
   const cfg={industry,profile,template,templateId,seed:31415,index:0,level,format:'docx'};
   const doc=generateDocument(cfg),text=plainText(doc);
   assert.deepEqual(doc,generateDocument(cfg),'determinism');
   assert.ok(doc.charCount>last,'longer mode must add real authored content');last=doc.charCount;
   assert.ok(!/\{\{|\[JP\]|undefined|NaN/.test(text));
   assert.equal(new Set(doc.sections.map(x=>x.id)).size,doc.sections.length);
   for(const q of doc.questions.filter(q=>q.answerable)){
    assert.ok(text.includes(q.evidence),'verbatim evidence must occur in source');
    assert.ok(doc.sections.some(s=>s.id===q.sourceSectionId));
   }
   assert.equal(doc.facts.total,doc.facts.completed+doc.facts.pending+doc.facts.returned);
   assert.equal(doc.facts.reduction,doc.facts.before-doc.facts.after);
   assert.ok(!/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(text),'no email addresses');
   assert.ok(!/\b0\d{1,4}-\d{1,4}-\d{4}\b/.test(text),'no phone numbers');
   sizes[level].push(doc.charCount);count++;
  }
  for(const n of [10,30,50]){
   const docs=createBatch({industry,profile,templates,templateIds:[templateId],formats:['xlsx','docx','pptx','pdf'],count:n,seed:42,level:'long'});
   assert.equal(docs.length,n);assert.equal(new Set(docs.map(d=>d.filename)).size,n);
   assert.equal(new Set(docs.map(d=>d.contentFingerprint)).size,n);
   assert.deepEqual([...new Set(docs.map(d=>d.format))].sort(),['docx','pdf','pptx','xlsx']);
   const subset=[docs[0],docs[3]];const e=evaluationFiles(subset);
   assert.equal(e.manifest.documents.length,2);assert.equal(e.questions.length,8);
   assert.ok(e.questions.every(q=>subset.some(d=>d.id===q.documentId)));
  }
 }
}
const report={templates:Object.keys(templates).length,industries:manifest.industries.length,profileCount:manifest.industries.reduce((n,r)=>n+load(r.path).profiles.length,0),checkedConfigurations:count,characters:Object.fromEntries(Object.entries(sizes).map(([k,v])=>[k,{min:Math.min(...v),max:Math.max(...v),mean:Math.round(v.reduce((s,n)=>s+n,0)/v.length)}]))};
console.log(JSON.stringify(report,null,2));
fs.writeFileSync(path.join(root,'tests/last-content-result.json'),JSON.stringify(report,null,2)+'\n');
