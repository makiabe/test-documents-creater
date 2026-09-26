import { DISCLAIMER, VERSION } from './content-engine.js?v=1.1.0';
export const FONT_URL = 'https://raw.githubusercontent.com/google/fonts/a24c920263576ec723d64c1b26f8afabb841601d/ofl/mplus1p/MPLUS1p-Regular.ttf';
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const MIME = {docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',pdf:'application/pdf'};
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PKG = 'http://schemas.openxmlformats.org/package/2006/relationships';
const CONTENT_TYPES = 'http://schemas.openxmlformats.org/package/2006/content-types';
export const xml = value => String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const libraries = new Map();
const deps = {
 zip: {global:'JSZip',file:'jszip@3.10.1/dist/jszip.min.js'},
 pptx: {global:'PptxGenJS',file:'pptxgenjs@4.0.0/dist/pptxgen.bundle.js'},
 pdf: {global:'jspdf',file:'jspdf@4.2.1/dist/jspdf.umd.min.js'}
};
export async function loadLibrary(key) {
  const dep = deps[key];
  if (!dep) throw new Error('未対応の出力ライブラリです。');
  if (globalThis[dep.global]) return globalThis[dep.global];
  if (libraries.has(key)) return libraries.get(key);
  const task = (async()=>{
    for (const host of ['https://cdn.jsdelivr.net/npm/','https://unpkg.com/']) {
      try {
        await new Promise((resolve,reject)=>{
          const script=document.createElement('script');
          const timer=setTimeout(()=>{script.remove();reject(new Error('読み込みタイムアウト'));},20000);
          script.src=host+dep.file;script.async=true;script.crossOrigin='anonymous';
          script.onload=()=>{clearTimeout(timer);resolve();};
          script.onerror=()=>{clearTimeout(timer);script.remove();reject(new Error('読み込み失敗'));};
          document.head.append(script);
        });
        if (globalThis[dep.global]) return globalThis[dep.global];
      } catch { /* Retry an independent CDN, without uploading any document data. */ }
    }
    throw new Error('出力ライブラリを取得できません。ネットワークやCDNの制限を確認して再試行してください。');
  })();
  libraries.set(key,task);
  task.catch(()=>libraries.delete(key));
  return task;
}
function addMetadata(zip, doc) {
  zip.file('docProps/core.xml', XML+`<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xml(doc.title)}</dc:title><dc:creator>Test Documents Creator</dc:creator><dc:description>${xml(DISCLAIMER)}</dc:description><dc:identifier>${xml(doc.id)}</dc:identifier><cp:keywords>SYNTHETIC TEST DATA</cp:keywords><dcterms:created xsi:type="dcterms:W3CDTF">2025-12-31T00:00:00Z</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">2025-12-31T00:00:00Z</dcterms:modified></cp:coreProperties>`);
  zip.file('docProps/app.xml',XML+'<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Test Documents Creator</Application></Properties>');
}
function packageRoot(main) {
  return XML+`<Relationships xmlns="${PKG}"><Relationship Id="rId1" Type="${R}/officeDocument" Target="${main}"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="${R}/extended-properties" Target="docProps/app.xml"/></Relationships>`;
}
const typeBase='<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>';
async function packed(zip,type){return new Blob([await zip.generateAsync({type:'uint8array',compression:'DEFLATE'})],{type:MIME[type]});}
function wordParagraph(text,style='Normal') {
  return `<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr><w:r><w:t xml:space="preserve">${xml(text)}</w:t></w:r></w:p>`;
}
export async function toDocx(doc) {
  const Zip=await loadLibrary('zip'), z=new Zip();
  addMetadata(z,doc);z.file('_rels/.rels',packageRoot('word/document.xml'));
  z.file('[Content_Types].xml',XML+`<Types xmlns="${CONTENT_TYPES}">${typeBase}<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>`);
  z.file('word/_rels/document.xml.rels',XML+`<Relationships xmlns="${PKG}"><Relationship Id="rId1" Type="${R}/styles" Target="styles.xml"/><Relationship Id="rId2" Type="${R}/footer" Target="footer1.xml"/></Relationships>`);
  const wns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  z.file('word/styles.xml',XML+`<w:styles xmlns:w="${wns}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Yu Gothic" w:hAnsi="Yu Gothic" w:eastAsia="Yu Gothic"/><w:sz w:val="22"/><w:lang w:val="ja-JP" w:eastAsia="ja-JP"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="340" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="200" w:after="320"/></w:pPr><w:rPr><w:b/><w:sz w:val="38"/><w:color w:val="213E68"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="300" w:after="180"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="213E68"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Caption"><w:name w:val="Caption"/><w:basedOn w:val="Normal"/><w:rPr><w:sz w:val="17"/><w:color w:val="64748B"/></w:rPr></w:style></w:styles>`);
  z.file('word/footer1.xml',XML+`<w:ftr xmlns:w="${wns}"><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:t>TEST DATA ONLY / </w:t></w:r><w:fldSimple w:instr="PAGE"><w:r><w:t>1</w:t></w:r></w:fldSimple></w:p></w:ftr>`);
  let body=wordParagraph(doc.title,'Title')+wordParagraph(DISCLAIMER,'Caption');
  for(const t of [`文書ID: ${doc.id}`,`対象: ${doc.company} / ${doc.subject}`,`適用版: ${doc.version} / シード: ${doc.seed}`, '各文書は独立した架空ケースです。別文書の条件を混ぜて参照しないでください。']) body+=wordParagraph(t,'Caption');
  body+=wordParagraph('目次','Heading1');
  for(const s of doc.sections)body+=wordParagraph(`${s.number}. ${s.title}`,'Caption');
  for(const s of doc.sections){body+=wordParagraph(`${s.number}. ${s.title}`,'Heading1');body+=wordParagraph(`章ID: ${s.id}`,'Caption');for(const p of s.paragraphs)body+=wordParagraph(p);}
  body+=`<w:sectPr><w:footerReference w:type="default" r:id="rId2"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="500" w:footer="500"/><w:cols w:space="720"/></w:sectPr>`;
  z.file('word/document.xml',XML+`<w:document xmlns:w="${wns}" xmlns:r="${R}"><w:body>${body}</w:body></w:document>`);
  return packed(z,'docx');
}
function columnName(n){let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;}
function spreadsheetSheet(rows,widths){
  const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const cells=rows.map((row,r)=>`<row r="${r+1}" ht="${r===0?26:96}" customHeight="1">${row.map((value,c)=>`<c r="${columnName(c)}${r+1}" t="inlineStr" s="${r===0?1:0}"><is><t xml:space="preserve">${xml(value)}</t></is></c>`).join('')}</row>`).join('');
  return XML+`<worksheet xmlns="${ns}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="18"/><cols>${widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${cells}</sheetData><autoFilter ref="A1:${columnName(widths.length-1)}${rows.length}"/><pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`;
}
export async function toXlsx(doc){
  const Zip=await loadLibrary('zip'),z=new Zip();addMetadata(z,doc);z.file('_rels/.rels',packageRoot('xl/workbook.xml'));
  const meta=[['項目','内容'],['文書名',doc.title],['文書ID',doc.id],['対象組織',doc.company],['対象業務',doc.subject],['適用版',doc.version],['シード',doc.seed],['文字数',doc.charCount],['データ区分',DISCLAIMER],['収録方法','本文シートに全段落を収録しています。各文書は独立した架空ケースです。']];
  const body=[['章ID','見出し','段落・分割番号','本文（全文収録）']];
  const outline=[['章ID','見出し','段落数']];
  for(const s of doc.sections){outline.push([s.id,s.title,s.paragraphs.length]);s.paragraphs.forEach((p,pi)=>{const chars=Array.from(p);for(let k=0;k<chars.length;k+=150)body.push([s.id,s.title,`${pi+1}-${1+Math.floor(k/150)}`,chars.slice(k,k+150).join('')]);});}
  const sheets=[{name:'文書情報',rows:meta,widths:[26,100]},{name:'本文',rows:body,widths:[40,40,18,90]},{name:'章索引',rows:outline,widths:[40,55,16]}];
  z.file('[Content_Types].xml',XML+`<Types xmlns="${CONTENT_TYPES}">${typeBase}<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`);
  z.file('xl/workbook.xml',XML+`<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${R}"><bookViews><workbookView/></bookViews><sheets>${sheets.map((s,i)=>`<sheet name="${s.name}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`);
  z.file('xl/_rels/workbook.xml.rels',XML+`<Relationships xmlns="${PKG}">${sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="${R}/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId4" Type="${R}/styles" Target="styles.xml"/></Relationships>`);
  z.file('xl/styles.xml',XML+'<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Yu Gothic"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Yu Gothic"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF213E68"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>');
  sheets.forEach((s,i)=>z.file(`xl/worksheets/sheet${i+1}.xml`,spreadsheetSheet(s.rows,s.widths)));
  return packed(z,'xlsx');
}
export function wrapCharacters(text,maxUnits=42){
  const lines=[];let line='',width=0;
  for(const c of String(text)){
    if(c==='\n'){lines.push(line);line='';width=0;continue;}
    const w=/[\u0000-\u00ff]/.test(c)?0.55:1;
    if(width+w>maxUnits&&line){lines.push(line);line='';width=0;}
    line+=c;width+=w;
  }
  if(line)lines.push(line);return lines;
}
export async function toPptx(doc){
  const Pptx=await loadLibrary('pptx'), p=new Pptx();p.layout='LAYOUT_WIDE';p.author='Test Documents Creator';p.subject=DISCLAIMER;p.title=doc.title;p.company='SYNTHETIC';p.lang='ja-JP';p.theme={headFontFace:'Yu Gothic',bodyFontFace:'Yu Gothic',lang:'ja-JP'};
  let page=0;
  function slide(title,caption){const s=p.addSlide();page++;s.background={color:'FFFFFF'};s.addText(title,{x:.65,y:.4,w:12,h:.7,fontFace:'Yu Gothic',fontSize:22,bold:true,color:'213E68',margin:0,breakLine:false});s.addText(caption,{x:.65,y:1.15,w:12,h:.25,fontFace:'Yu Gothic',fontSize:9,color:'64748B',margin:0});s.addText(`TEST DATA ONLY | ${doc.id} | ${page}`,{x:.65,y:7.08,w:12,h:.18,fontSize:8,color:'64748B',margin:0});return s;}
  const cover=slide(doc.title,doc.id);
  cover.addText([DISCLAIMER,`対象: ${doc.company}`,`業務: ${doc.subject}`,`適用版: ${doc.version}`, '本文を省略せず複数スライドに分割して収録しています。', '各文書は独立したケースです。別文書の条件を混ぜないでください。'].join('\n\n'),{x:.75,y:1.85,w:11.7,h:4.7,fontSize:18,fontFace:'Yu Gothic',margin:0,breakLine:false});
  for(const section of doc.sections){
    const lines=section.paragraphs.flatMap(x=>[...wrapCharacters(x), '']);
    for(let k=0;k<lines.length;k+=12){
      const s=slide(`${section.number}. ${section.title}${k?'（続き）':''}`,section.id);
      s.addText(lines.slice(k,k+12).join('\n'),{x:.75,y:1.75,w:11.7,h:4.95,fontFace:'Yu Gothic',fontSize:17,margin:0,valign:'top',paraSpaceAfterPt:0,breakLine:false});
    }
  }
  return new Blob([await p.write({outputType:'arraybuffer'})],{type:MIME.pptx});
}
let fontPromise;
async function fontBinary(){
  if(!fontPromise)fontPromise=(async()=>{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
    try{const r=await fetch(FONT_URL,{signal:controller.signal});if(!r.ok)throw new Error(`HTTP ${r.status}`);
      const bytes=new Uint8Array(await r.arrayBuffer());let text='';
      for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));
      return text;
    }catch{throw new Error('PDF用の日本語フォントを取得できません。通信設定を確認して再試行してください。画像PDFへの置換は行いません。');}finally{clearTimeout(timer);}
  })();
  try{return await fontPromise;}catch(e){fontPromise=undefined;throw e;}
}
export async function toPdf(doc){
  const lib=await loadLibrary('pdf'),font=await fontBinary();
  const p=new lib.jsPDF({unit:'mm',format:'a4',compress:true,putOnlyUsedFonts:true});
  p.addFileToVFS('MPLUS1p-Regular.ttf',font);p.addFont('MPLUS1p-Regular.ttf','MPLUS1p','normal');p.setFont('MPLUS1p');
  p.setProperties({title:doc.title,subject:DISCLAIMER,author:'Test Documents Creator',creator:`Test Documents Creator ${VERSION}`,keywords:'SYNTHETIC TEST DATA'});
  let y=24;const left=18,right=174,bottom=274;
  function newPage(){p.addPage();y=24;}
  function paragraph(text,size=10.5,color=[30,41,59],after=3){
    p.setFont('MPLUS1p','normal');p.setFontSize(size);p.setTextColor(...color);
    const leading=size*.3528*1.65;const lines=[];let line='',width=0;
    const widths=new Map();
    for(const c of String(text)){
      if(c==='\n'){lines.push(line);line='';width=0;continue;}
      if(!widths.has(c))widths.set(c,p.getTextWidth(c));const w=widths.get(c);
      if(width+w>right&&line){lines.push(line);line='';width=0;}
      line+=c;width+=w;
    }
    if(line)lines.push(line);
    for(const l of lines){if(y+leading>bottom)newPage();p.text(l,left,y);y+=leading;}
    y+=after;
  }
  paragraph(doc.title,18,[33,62,104],5);paragraph(DISCLAIMER,8,[100,116,139],4);
  paragraph(`文書ID: ${doc.id}\n対象: ${doc.company}\n業務: ${doc.subject}\n適用版: ${doc.version}`,9,[71,85,105],5);
  paragraph('各文書は独立した架空ケースです。別文書の設定値を混ぜず、文書IDと適用条件を確認してください。',9,[71,85,105],5);
  for(const s of doc.sections){
    if(y+35>bottom)newPage();
    paragraph(`${s.number}. ${s.title}`,13,[33,62,104],1);paragraph(`章ID: ${s.id}`,7,[100,116,139],2);
    for(const text of s.paragraphs)paragraph(text);
  }
  const total=p.getNumberOfPages();
  for(let i=1;i<=total;i++){p.setPage(i);p.setFont('MPLUS1p','normal');p.setFontSize(7);p.setTextColor(100,116,139);p.text(doc.id,left,10);p.text(`TEST DATA ONLY / ${i} / ${total}`,left,287);}
  return p.output('blob');
}
export async function exportDocument(doc){
  const fn={docx:toDocx,xlsx:toXlsx,pptx:toPptx,pdf:toPdf}[doc.format];
  if(!fn)throw new Error('未対応の形式です。');
  return fn(doc);
}
