import assert from 'node:assert/strict';
import fs from 'node:fs';
import {generateDocument,plainText,validateTemplates,validateIndustry} from '../js/content-engine.js';
import {ageOn,AS_OF} from '../js/resume.js';
const read=p=>JSON.parse(fs.readFileSync(p));const m=read('data/manifest.json'),t=validateTemplates(read(m.templates));
assert.equal(m.industries.length,16);assert.equal(Object.keys(t).length,12);
const top=['基本情報','職務要約','学歴','勤務先概要','職務経歴詳細','保有資格','活かせる経験・スキル','自己PR'];let count=0;
for(const ref of m.industries){const industry=validateIndustry(read(ref.path));for(const profile of industry.profiles){
 assert.ok(profile.scenes.every(s=>s.templates.every(id=>t[id])),'Unknown scene template');
 for(const seed of [0,42,31415,999999999])for(const index of [0,9,49])for(const level of ['standard','long','detailed']){
  const doc=generateDocument({industry,profile,template:t.resume,templateId:'resume',seed,index,level,format:'docx'});const r=doc.candidate;
  assert.equal(doc.title,'職務経歴書');assert.equal(doc.asOfDate,AS_OF);assert.equal(r.age,ageOn(r.birth));
  assert.deepEqual(doc.sections.filter(s=>!String(s.number).includes('-')).map(s=>s.title),top);
  assert.ok(r.name.match(/テスト|サンプル|架空|試験/));assert.ok(plainText(doc).includes(r.name));assert.equal(r.periods[0].start,`${r.startYear}-04`);
  for(let i=0;i<r.periods.length-1;i++){assert.equal(r.periods[i].end,r.periods[i+1].start.replace('-04','-03'));assert.ok(r.periods[i].start<r.periods[i].end);}
  assert.equal(r.periods.at(-1).end,null);assert.ok(`${r.startYear}-03`<r.periods[0].start);
  assert.equal(r.hours,Number(((r.before-r.after)*r.volume*12/60).toFixed(1)));assert.ok(r.projectTeam>r.team);
  assert.ok(doc.sections.filter(s=>s.table).length>=6);
  for(const s of doc.sections)if(s.table){assert.ok(s.table.rows.every(row=>row.length===s.table.headers.length));assert.ok(Math.abs(s.table.widths.reduce((a,b)=>a+b,0)-1)<.001);}
  for(const q of doc.questions.filter(q=>q.answerable))assert.ok(plainText(doc).includes(q.evidence));
  assert.ok(!/TEST-PERSON|比較用に作成した|本経歴書の実績はすべて|\{\{|undefined|NaN/.test(plainText(doc)));
  if(profile.id==='dx'){assert.equal(r.age,49);assert.equal(r.hours,2640);assert.equal(r.startYear,2000);assert.ok(plainText(doc).includes('112.5％'));}
  count++;
 }
}}
assert.equal(ageOn('2000-09-28'),25);assert.equal(ageOn('2000-09-27'),26);
console.log(`PASS: ${count} CV configurations; chronological employment, synthetic identity, age, table shape, arithmetic, RAG evidence and domain-specific content.`);
