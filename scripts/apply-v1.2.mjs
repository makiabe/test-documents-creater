// One-time migration from the reviewed v1.1.2 baseline. Fail on unexpected source.
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8'),write=(p,c)=>fs.writeFileSync(p,c);
const replace=(c,a,b)=>{if(!c.includes(a))throw new Error('Patch anchor missing: '+a.slice(0,70));return c.replace(a,b);};
let c=read('js/content-engine.js');
c="import {buildResume} from './resume.js?v=1.2.0';\n"+c.replace("VERSION = '1.1.0'","VERSION = '1.2.0'");
c=replace(c,"['name','description','phaseTitle','caseTitle']","(t.renderer === 'resume' ? ['name','description'] : ['name','description','phaseTitle','caseTitle'])");
c=replace(c,"if (!t.facts?.length","if (t.renderer === 'resume') continue;\n    if (!t.facts?.length");
c=replace(c,'export function plainText(doc) {',`export function sectionText(section) {
  const table = section.table;
  return [...(table ? table.rows.map(row => row.map((value, i) => table.headers[i] + '：' + value).join(' ／ ')) : []), ...section.paragraphs];
}
export function plainText(doc) {`);
c=replace(c,'...s.paragraphs])','...sectionText(s)])');
c=replace(c,'  for (const f of template.facts) {',`  let resumeResult;
  if (template.renderer === 'resume') {
    resumeResult=buildResume({profile,id,index,depth:LEVELS[level],integer});
    sections.push(...resumeResult.sections);questions.push(...resumeResult.questions);
  } else {
  for (const f of template.facts) {`);
c=replace(c,'  const doc = { schemaVersion: 1','  }\n  const doc = { schemaVersion: 2');
c=replace(c,'  doc.charCount = Array.from','  if(resumeResult){Object.assign(doc,resumeResult);doc.facts={...v,candidate:resumeResult.candidate};}\n  doc.charCount = Array.from');write('js/content-engine.js',c);
let a=read('js/app.js').replaceAll('?v=1.1.0','?v=1.2.0');
a=replace(a,'function preview(i){',`function previewTable(table){
 if(!table)return '';
 return '<div class="preview-table-wrap"><table class="resume-table"><thead><tr>'+table.headers.map(h=>'<th scope="col">'+escape(h)+'</th>').join('')+'</tr></thead><tbody>'+table.rows.map(row=>'<tr>'+row.map(cell=>'<td>'+escape(cell)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
}
function preview(i){`);
a=replace(a,'${s.paragraphs.map(p=>','${previewTable(s.table)}${s.paragraphs.map(p=>');
a=replace(a,'適用版：${escape(d.version)}',"${d.asOfDate?'作成基準日：'+escape(d.asOfDate):'適用版：'+escape(d.version)}");write('js/app.js',a);
let e=read('js/exporters.js').replace('{ DISCLAIMER, VERSION }','{ DISCLAIMER, VERSION, sectionText }').replaceAll('?v=1.1.0','?v=1.2.0');
e=replace(e,'export async function toDocx(doc) {',`function wordTable(table){
 const widths=(table.widths||table.headers.map(()=>1/table.headers.length)).map(x=>Math.round(x*9638));
 const grid='<w:tblGrid>'+widths.map(w=>'<w:gridCol w:w="'+w+'"/>').join('')+'</w:tblGrid>';
 const row=(cells,header=false)=>'<w:tr><w:trPr><w:cantSplit/>'+(header?'<w:tblHeader/>':'')+'</w:trPr>'+cells.map((v,i)=>'<w:tc><w:tcPr><w:tcW w:w="'+widths[i]+'" w:type="dxa"/>'+(header?'<w:shd w:fill="EAF0F8"/>':'')+'</w:tcPr><w:p><w:pPr><w:spacing w:after="80" w:before="80" w:line="280" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:sz w:val="20"/>'+(header?'<w:b/>':'')+'</w:rPr><w:t xml:space="preserve">'+xml(v)+'</w:t></w:r></w:p></w:tc>').join('')+'</w:tr>';
 const borders=['top','left','bottom','right','insideH','insideV'].map(k=>'<w:'+k+' w:val="single" w:sz="4" w:color="D5DFEA"/>').join('');
 return '<w:tbl><w:tblPr><w:tblW w:w="9638" w:type="dxa"/><w:tblBorders>'+borders+'</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="50" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="50" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr>'+grid+row(table.headers,true)+table.rows.map(r=>row(r)).join('')+'</w:tbl>'+wordParagraph('','Caption');
}
export async function toDocx(doc) {`);
const start=e.indexOf('  let body=wordParagraph(doc.title'),end=e.indexOf('  body+=`<w:sectPr>',start);if(start<0||end<0)throw new Error('DOCX anchor');
e=e.slice(0,start)+`  let body=wordParagraph(doc.title,'Title');
  if(doc.asOfDate){
    body+=wordParagraph(doc.asOfDate.replace(/(\\d+)-(\\d+)-(\\d+)/,(_,y,m,d)=>y+'年'+Number(m)+'月'+Number(d)+'日現在'),'Caption');
    body+=wordParagraph(DISCLAIMER,'Caption');
  }else{
    body+=wordParagraph(DISCLAIMER,'Caption');
    for(const text of ['文書ID: '+doc.id,'対象: '+doc.company+' / '+doc.subject,'適用版: '+doc.version+' / シード: '+doc.seed])body+=wordParagraph(text,'Caption');
    body+=wordParagraph('目次','Heading1');for(const s of doc.sections)body+=wordParagraph(s.number+'. '+s.title,'Caption');
  }
  for(const s of doc.sections){
    body+=wordParagraph(s.number+'. '+s.title,'Heading1');
    if(!doc.asOfDate)body+=wordParagraph('章ID: '+s.id,'Caption',true);
    if(s.table)body+=wordTable(s.table);
    for(const text of s.paragraphs)body+=wordParagraph(text,'Normal',/^【.+】$/.test(text));
  }
`+e.slice(end);
e=replace(e,'s.paragraphs.forEach((p,pi)=>','sectionText(s).forEach((p,pi)=>');
e=replace(e,'const lines=section.paragraphs.flatMap','const lines=sectionText(section).flatMap');
e=replace(e,'  const cover=slide(doc.title,doc.id);',"  const cover=slide(doc.title,doc.asOfDate?doc.asOfDate+'現在 / '+doc.id:doc.id);");
const pdfTable=`  function drawTable(table){
    p.setFont('MPLUS1p','normal');p.setFontSize(9);
    const widths=(table.widths||table.headers.map(()=>1/table.headers.length)).map(w=>w*right);
    const split=(text,max)=>{let lines=[],line='';for(const ch of String(text)){if(p.getTextWidth(line+ch)>max&&line){lines.push(line);line='';}line+=ch;}lines.push(line);return lines;};
    const leading=4.8,padding=2.3;
    function row(cells,header=false){
      p.setFontSize(9);
      const wrapped=cells.map((t,i)=>split(t,widths[i]-padding*2));
      const h=Math.max(...wrapped.map(x=>x.length))*leading+padding*2;
      if(h>bottom-32)throw new Error('表の1行が長すぎます。段落に分割してください。');
      if(y+h>bottom){newPage();if(!header)row(table.headers,true);}
      let x=left;
      cells.forEach((_,i)=>{p.setDrawColor(210,220,234);p.setFillColor(...(header?[234,240,248]:[255,255,255]));p.rect(x,y,widths[i],h,'FD');p.setTextColor(30,41,59);for(let j=0;j<wrapped[i].length;j++)p.text(wrapped[i][j],x+padding,y+padding+3.4+j*leading);x+=widths[i];});
      y+=h;
    }
    row(table.headers,true);table.rows.forEach(r=>row(r));y+=8;
  }
`;
e=replace(e,'  paragraph(doc.title,18,[33,62,104],5);',pdfTable+"  paragraph(doc.title,18,[33,62,104],5);\n  if(doc.asOfDate)paragraph(doc.asOfDate.replace(/(\\d+)-(\\d+)-(\\d+)/,(_,y,m,d)=>y+'年'+Number(m)+'月'+Number(d)+'日現在'),9,[71,85,105],4);");
e=replace(e,'  paragraph(`文書ID: ${doc.id}','  if(!doc.asOfDate)paragraph(`文書ID: ${doc.id}');
e=replace(e,"  paragraph('各文書は独立した架空ケースです。","  if(!doc.asOfDate)paragraph('各文書は独立した架空ケースです。");
e=replace(e,'paragraph(`章ID: ${s.id}`,7,[100,116,139],2);','if(!doc.asOfDate)paragraph(`章ID: ${s.id}`,7,[100,116,139],2);\n    if(s.table){y+=2;drawTable(s.table);}');write('js/exporters.js',e);
let html=read('index.html');html=html.replace('<meta name="theme-color"','<link href="css/comfort.css?v=1.2.0" rel="stylesheet">\n<meta name="theme-color"');
html=html.replaceAll('./js/app.js?v=1.1.0','./js/app.js?v=1.2.0').replace(/(<span class="version">)v[\d.]+/,'$1v1.2.0').replace('UI v1.1.2','v1.2.0');
html=html.replace('標準｜約2,500〜3,000字','標準｜主要経歴・要点').replace('長文｜約4,000〜4,600字','長文｜背景・対応・実績').replace('詳細｜約5,700〜6,400字','詳細｜全経歴・事例・根拠');
html=html.replaceAll('実名・連絡先・住所・秘密情報は生成しません。','職務経歴書の氏名・生年月日は架空の値です。実在の個人情報、連絡先、住所、秘密情報は使用しません。').replace('文字数は初期データの目安です。','文字数は文書種類と職種により異なります。実際の文字数を一覧で確認できます。');write('index.html',html);
write('css/comfort.css',`/* Header breathing room; card widths and artwork remain unchanged. */
.hero-inner{height:170px;padding-top:28px;padding-bottom:26px}
.header-cat,.hero-inner:after{transform:translateY(24px)}
.hero p{margin-top:9px;line-height:1.8}
.resume-table{width:100%;border-collapse:collapse;font-size:13px;line-height:1.75;margin:14px 0 22px;table-layout:auto}
.resume-table th,.resume-table td{border:1px solid #d5dfeb;padding:8px 12px;text-align:left;vertical-align:top;overflow-wrap:anywhere}
.resume-table th{background:#edf3fb;font-weight:700}.resume-table td:first-child{min-width:90px;color:#354e73}
.preview-table-wrap{overflow-x:auto;max-width:100%}
@media(max-width:900px){.hero-inner{height:auto;min-height:170px;padding-top:26px;padding-bottom:62px}.header-cat,.hero-inner:after{transform:translateY(18px)}}
@media(max-width:760px){.hero-inner{height:auto;min-height:0;padding:26px 20px 42px}.header-cat,.hero-inner:after{transform:none}.resume-table{font-size:12px}.resume-table th,.resume-table td{padding:7px 8px}}
`);
for(const f of ['tests/browser.test.mjs','tests/ui.test.mjs']){
 let s=read(f).replaceAll('app.js?v=1.1.0','app.js?v=1.2.0').replaceAll('exporters.js?v=1.1.0','exporters.js?v=1.2.0').replaceAll('options.length===8','options.length===17').replaceAll("'v1.1.2'","'v1.2.0'").replaceAll("'v1.1.1'","'v1.2.0'");
 s=s.replaceAll("'#job').options.length===2","'#job').options.length===3").replace('assert.equal(sizes.hero.height,124','assert.equal(sizes.hero.height,170').replace('assert.equal(sizes.purpose.y,84','assert.equal(sizes.purpose.y,130').replace('sizes.generate.bottom<830','sizes.generate.bottom<880');write(f,s);
}
const pkg=JSON.parse(read('package.json'));pkg.version='1.2.0';pkg.scripts['test:resume']='node tests/resume.test.mjs';pkg.scripts['test:resume-browser']='node tests/resume-browser.test.mjs';write('package.json',JSON.stringify(pkg,null,2)+'\n');
const wf='.github/workflows/verify-pages-ui.yml';if(fs.existsSync(wf)){let w=read(wf).replaceAll('?v=1.1.2','?v=1.2.0').replace('theme.js?v=1.2.0','comfort.css?v=1.2.0').replace('node tests/ui.test.mjs','node tests/ui.test.mjs\n          node tests/resume-browser.test.mjs');write(wf,w);}
fs.mkdirSync('docs',{recursive:true});write('docs/RELEASE_1.2.0.md',read('scripts/release-notes-v1.2.md'));write('README.md',read('scripts/release-notes-v1.2.md')+'\n\n## 検証\n\n`npm test`、`npm run test:resume`、`npm run test:browser`、`npm run test:resume-browser` を実行します。ブラウザ検証にはChromiumとpdftotextを使用します。\n');
