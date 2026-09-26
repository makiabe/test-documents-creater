import {VERSION,DISCLAIMER,validateIndustry,validateTemplates,createBatch,evaluationFiles} from './content-engine.js?v=1.2.0';
import {exportDocument,loadLibrary} from './exporters.js?v=1.2.0';
const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let manifest,templates,pack,documents=[],loadId=0,busy=false,cancelled=false;
const packs=new Map();
export const getGenerated=()=>documents;
function status(text,kind=''){const el=$('#status');el.textContent=text;el.className=`status ${kind}`;}
function error(e){console.error(e);status(e.message||String(e),'error');}
function fill(el,options,placeholder){el.replaceChildren(new Option(placeholder,''));for(const o of options||[])el.add(new Option(o.name||o.role,o.id));el.disabled=!options?.length;}
async function json(path){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);try{const r=await fetch(`${path}?v=${VERSION}`,{cache:'no-cache',signal:controller.signal});if(!r.ok)throw new Error(`${path} の読み込みに失敗しました（${r.status}）。`);return await r.json();}catch(e){if(e.name==='AbortError')throw new Error('データ読み込みがタイムアウトしました。再読み込みしてください。');throw e;}finally{clearTimeout(timer);}}
const profile=()=>pack?.profiles.find(p=>p.id===$('#job').value);
const scene=()=>profile()?.scenes.find(s=>s.id===$('#scene').value);
function clearDocs(){documents=[];$('#resultPanel').hidden=true;$('#preview').close();$('#documents').className='empty';$('#documents').textContent='業務・利用シーンを選択してください。';$('#selectDocs').disabled=true;$('#generate').disabled=true;}
async function chooseIndustry(){
 const request=++loadId;clearDocs();pack=undefined;fill($('#job'),null,'業種を先に選択');fill($('#scene'),null,'職種を先に選択');
 const ref=manifest.industries.find(i=>i.id===$('#industry').value);if(!ref)return;
 status('職種・業務データを読み込んでいます…');
 try{let data=packs.get(ref.id);if(!data){data=validateIndustry(await json(ref.path));packs.set(ref.id,data);}if(request!==loadId)return;pack=data;fill($('#job'),data.profiles,'職種を選択');status('職種と業務・利用シーンを選択してください。');}
 catch(e){if(request===loadId){error(e);$('#retry').hidden=false;}}
}
function showTemplates(){
 clearDocs();const s=scene();if(!s)return;
 const available=s.templates.map(id=>{if(!templates[id])throw new Error(`文書定義がありません: ${id}`);return{id,...templates[id]};});
 $('#documents').className='';$('#documents').innerHTML=available.map(t=>`<label class="doc"><input class="dsel" type="checkbox" value="${escape(t.id)}" checked><strong>${escape(t.name)}</strong><p>${escape(t.description)}</p><div class="tags">${t.contains.map(x=>`<span class="tag">${escape(x)}</span>`).join('')}</div><span class="fmt">${t.formats.map(f=>f.toUpperCase()).join(' / ')}</span></label>`).join('');
 $('#selectDocs').disabled=false;$('#generate').disabled=false;
 $('#profileInfo').textContent=`想定組織：【架空】${profile().company} ／ 対象製品：${profile().product} ／ 業務：${profile().theme}`;
 status('文書と生成条件を選んでください。');
}
function selected(){return $$('.rsel:checked').map(x=>documents[Number(x.value)]);}
function selectionCount(){$('#selectedCount').textContent=`選択: ${selected().length}件 / ${documents.length}件`;}
function render(){
 $('#resultPanel').hidden=false;$('#count').textContent=`${documents.length}件`;
 const total=documents.reduce((n,d)=>n+d.charCount,0);$('#resultSummary').textContent=`合計 ${total.toLocaleString()}字 / 各ファイルの本文をプレビューできます。`;
 $('#results').innerHTML=documents.map((d,i)=>`<div class="result"><input class="rsel" type="checkbox" value="${i}" aria-label="${escape(d.filename)}を選択"><div><div class="filename">${escape(d.filename)}</div><div class="stats">${d.charCount.toLocaleString()}字 · ${d.sections.length}章 · ${escape(d.role)}</div></div><span class="format-badge">${d.format.toUpperCase()}</span><div class="actions"><button type="button" data-preview="${i}">プレビュー</button><button type="button" data-save="${i}">保存</button></div></div>`).join('');selectionCount();
 $('#resultPanel').scrollIntoView({behavior:'smooth',block:'start'});
}
function previewTable(table){
 if(!table)return '';
 return '<div class="preview-table-wrap"><table class="resume-table"><thead><tr>'+table.headers.map(h=>'<th scope="col">'+escape(h)+'</th>').join('')+'</tr></thead><tbody>'+table.rows.map(row=>'<tr>'+row.map(cell=>'<td>'+escape(cell)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
}
function preview(i){
 const d=documents[i];if(!d)return;$('#previewTitle').textContent=d.title;
 $('#previewBody').innerHTML=`<div class="preview-meta">${escape(DISCLAIMER)}<br>文書ID：${escape(d.id)}<br>対象：${escape(d.company)} / ${escape(d.subject)}<br>${d.asOfDate?'作成基準日：'+escape(d.asOfDate):'適用版：'+escape(d.version)} ／ ${d.charCount.toLocaleString()}字 ／ シード ${d.seed}</div><details class="preview-toc"><summary>目次（開く）</summary>${d.sections.map(s=>`<a href="#preview-${s.id}">${s.number}. ${escape(s.title)}</a>`).join('')}</details>${d.sections.map(s=>`<section class="preview-section" id="preview-${s.id}"><h3>${s.number}. ${escape(s.title)}</h3><div class="sid">${s.id}</div>${previewTable(s.table)}${s.paragraphs.map(p=>`<p>${escape(p)}</p>`).join('')}</section>`).join('')}`;
 $('#preview').showModal();$('#preview').scrollTop=0;
}
function save(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
async function task(fn){
 if(busy)return;busy=true;cancelled=false;
 const disabled=$$('main button, main input, main select').map(el=>[el,el.disabled]);for(const [el]of disabled)if(el.id!=='cancel')el.disabled=true;
 $('#cancel').hidden=false;$('#cancel').disabled=false;
 try{await fn();}catch(e){if(e.name==='AbortError')status('処理を中止しました。ファイルは保存していません。');else error(e);}
 finally{for(const [el,state]of disabled)el.disabled=state;$('#cancel').hidden=true;busy=false;}
}
function checkCancel(){if(cancelled)throw new DOMException('Cancelled','AbortError');}
const yieldUI=()=>new Promise(resolve=>setTimeout(resolve,0));
async function downloadOne(i){const doc=documents[i];if(!doc)return;await task(async()=>{status(`${doc.filename} を作成しています。${doc.format==='pdf'?'初回は日本語フォントを取得します。':''}`);await yieldUI();const blob=await exportDocument(doc);checkCancel();save(blob,doc.filename);status('ダウンロードを開始しました。','success');});}
async function zipFiles(docs){
 if(!docs.length){status('ZIPに含めるファイルを選択してください。','error');return;}
 const includeEvaluation=$('#evaluation').checked;
 await task(async()=>{
  const Zip=await loadLibrary('zip'),zip=new Zip();
  for(let i=0;i<docs.length;i++){
   checkCancel();status(`ファイルを作成中 ${i+1} / ${docs.length}：${docs[i].filename}`);await yieldUI();
   const blob=await exportDocument(docs[i]);checkCancel();zip.file(`documents/${docs[i].filename}`,await blob.arrayBuffer());
  }
  if(includeEvaluation){const e=evaluationFiles(docs);zip.file('_metadata/manifest.json',JSON.stringify(e.manifest,null,2));zip.file('_evaluation/questions.jsonl',e.questions.map(q=>JSON.stringify(q)).join('\n')+'\n');zip.file('_evaluation/README.txt','RAG評価用データ（UTF-8）\n\n検索インデックスには documents フォルダだけを投入してください。\n_evaluation と _metadata を投入すると正解や検証用情報が漏洩します。\nquestion: 質問 / answer: 期待回答例 / evidence: 本文中の根拠（原文）\nsourceSectionId: 章ID / answerable: 文書から回答可能か\nanswerable=false の質問では根拠のない数値を答えないことを検証します。\n各文書は独立ケースです。複数文書をまたぐ整合性・旧版比較のテストセットではありません。\n');}
  status('ZIPを圧縮しています…');await yieldUI();const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:3}});checkCancel();save(blob,`test-documents-${docs[0].seed}-${docs.length}.zip`);status(`${docs.length}ファイルのZIPダウンロードを開始しました。`,'success');
 });
}
$('#industry').addEventListener('change',()=>void chooseIndustry());
$('#job').addEventListener('change',()=>{clearDocs();fill($('#scene'),profile()?.scenes,'業務・利用シーンを選択');$('#profileInfo').textContent=profile()?`対象業務：${profile().theme}`:'職種を選択してください。';});
$('#scene').addEventListener('change',()=>{try{showTemplates();}catch(e){error(e);}});
$('#selectDocs').addEventListener('click',()=>$$('.dsel').forEach(x=>x.checked=true));
$('#generate').addEventListener('click',()=>{
 try{if(!profile()||!scene())throw new Error('業種・職種・業務シーンを選択してください。');const raw=$('#seed').value;if(raw==='')throw new Error('再現用シードを入力してください。');
  documents=createBatch({industry:pack,profile:profile(),templates,templateIds:$$('.dsel:checked').map(x=>x.value),formats:$$('input[name=fmt]:checked').map(x=>x.value),count:Number($('input[name=count]:checked').value),seed:Number(raw),level:$('#length').value});
  $('#preview').close();render();status(`${documents.length}件の長文データを生成しました。形式への変換は保存時に行います。`,'success');
 }catch(e){error(e);}
});
$('#results').addEventListener('click',e=>{const button=e.target.closest('button');if(!button)return;if(button.dataset.preview!==undefined)preview(Number(button.dataset.preview));if(button.dataset.save!==undefined)void downloadOne(Number(button.dataset.save));});
$('#results').addEventListener('change',selectionCount);
$('#all').addEventListener('click',()=>{$$('.rsel').forEach(x=>x.checked=true);selectionCount();});
$('#none').addEventListener('click',()=>{$$('.rsel').forEach(x=>x.checked=false);selectionCount();});
$('#zip').addEventListener('click',()=>void zipFiles(selected()));$('#zipAll').addEventListener('click',()=>void zipFiles(documents));
$('#cancel').addEventListener('click',()=>{cancelled=true;status('中止を受け付けました。現在のファイル処理が終わった時点で停止します。');});
$('#closePreview').addEventListener('click',()=>$('#preview').close());
try{
 manifest=await json('data/manifest.json');templates=validateTemplates(await json(manifest.templates));fill($('#industry'),manifest.industries,'業種を選択');
 status(`${manifest.industries.length}業種・${Object.keys(templates).length}種類の文書テンプレートを読み込みました。`);$('#retry').hidden=true;
}catch(e){error(e);$('#retry').hidden=false;}
