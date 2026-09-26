import {buildResume} from './resume.js?v=1.2.0';
/** Pure, deterministic generation. No network, eval, LLM, or real customer data. */
export const VERSION = '1.2.0';
export const FORMATS = ['xlsx', 'docx', 'pptx', 'pdf'];
export const LEVELS = { standard: 0, long: 1, detailed: 2 };
export const DISCLAIMER = 'TEST DATA ONLY / 本文書はテスト用の架空情報です。実在する人物・組織・製品の記録や規程ではありません。';
const pad = (n, w = 3) => String(n).padStart(w, '0');
export function fingerprint(value) {
  let h = 2166136261;
  for (const c of String(value)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16).padStart(8, '0');
}
function random(seed) {
  let state = parseInt(fingerprint(seed), 16);
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}
function requireText(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`データ定義に ${name} がありません。`);
}
export function validateIndustry(pack) {
  requireText(pack.id, '業種ID'); requireText(pack.name, '業種名');
  if (!Array.isArray(pack.profiles) || !pack.profiles.length) throw new Error('職種定義が空です。');
  const seen = new Set();
  for (const p of pack.profiles) {
    for (const k of ['id','role','department','company','theme','product','productType','objective','issue','inputs','outputs','must','preferred','metric']) requireText(p[k], k);
    if (seen.has(p.id)) throw new Error(`職種IDが重複しています: ${p.id}`);
    seen.add(p.id);
    if (!Array.isArray(p.skills) || !p.skills.length) throw new Error('スキル定義が空です。');
    if (!Array.isArray(p.phases) || !p.phases.length || !Array.isArray(p.cases) || !p.cases.length) throw new Error('手順と事例の定義が必要です。');
    for (const s of p.phases) for (const k of ['title','action','rule','evidence']) requireText(s[k], k);
    for (const c of p.cases) for (const k of ['title','problem','decision','followup']) requireText(c[k], k);
    const sceneIds = new Set();
    if (!Array.isArray(p.scenes) || !p.scenes.length) throw new Error('利用シーンが必要です。');
    for (const s of p.scenes) {
      requireText(s.id, 'シーンID'); requireText(s.name, 'シーン名');
      if (sceneIds.has(s.id)) throw new Error('シーンIDが重複しています。');
      sceneIds.add(s.id);
      if (!Array.isArray(s.templates) || !s.templates.length) throw new Error('文書テンプレートの指定が必要です。');
    }
  }
  return pack;
}
export function validateTemplates(data) {
  if (!data?.templates || typeof data.templates !== 'object') throw new Error('文書テンプレートを読み込めません。');
  for (const [id, t] of Object.entries(data.templates)) {
    for (const k of (t.renderer === 'resume' ? ['name','description'] : ['name','description','phaseTitle','caseTitle'])) requireText(t[k], `${id}.${k}`);
    if (!t.formats?.length || t.formats.some(f => !FORMATS.includes(f))) throw new Error(`${id}: 未対応の形式です。`);
    if (t.renderer === 'resume') continue;
    if (!t.facts?.length || !t.sections?.length || !t.phaseText?.length || !t.caseText?.length) throw new Error(`${id}: 本文定義が不足しています。`);
    const ids = new Set();
    for (const s of [...t.facts, ...t.sections]) {
      if (ids.has(s.id)) throw new Error(`${id}: 章IDが重複しています。`);
      ids.add(s.id); requireText(s.title, `${id}.title`);
    }
  }
  return data.templates;
}
export function interpolate(text, values) {
  return String(text).replace(/\{\{([A-Za-z][A-Za-z0-9]*)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`未定義の差し込み項目: ${key}`);
    return String(values[key]);
  });
}
export function sectionText(section) {
  const table = section.table;
  return [...(table ? table.rows.map(row => row.map((value, i) => table.headers[i] + '：' + value).join(' ／ ')) : []), ...section.paragraphs];
}
export function plainText(doc) {
  return [doc.title, DISCLAIMER, `文書ID: ${doc.id}`, `ケースID: ${doc.caseId}`, `業種: ${doc.industry}`, `職種: ${doc.role}`, `対象: ${doc.subject}`, `適用版: ${doc.version}`,
    '各文書は独立した架空ケースです。別文書の設定値を混ぜず、文書IDと適用条件を確認してください。',
    ...doc.sections.flatMap(s => [`${s.number}. ${s.title} [${s.id}]`, ...sectionText(s)])].join('\n\n');
}
export function generateDocument({ industry, profile, template, templateId, seed, index = 0, level = 'long', format = 'docx' }) {
  if (!(level in LEVELS)) throw new Error('文書の長さが不正です。');
  if (!template.formats.includes(format)) throw new Error(`${template.name} は ${format} に対応していません。`);
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 999999999) throw new Error('シードは0〜999999999の整数を指定してください。');
  const rng = random(`${VERSION}|${seed}|${industry.id}|${profile.id}|${templateId}|${index}`);
  const integer = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const serial = pad(index + 1);
  const run = fingerprint(`${VERSION}|${seed}|${industry.id}|${profile.id}|${templateId}|${level}`);
  const id = `TEST-DOC-${run}-${serial}`;
  const total = integer(180, 480), pending = integer(6, 20), returned = integer(5, 18);
  const before = integer(24, 40), after = integer(4, 12), startYear = integer(2015, 2018);
  const batchLimit = integer(2, 6) * 100, salaryMin = integer(4, 6) * 100;
  const v = { ...profile, serial, id,
    company: `【架空】${profile.company}・ケース${serial}`,
    person: `TEST-PERSON-${run}-${serial}`, skills: profile.skills.join('、'),
    version: `TEST-1.${integer(0, 3)}`, startYear, experience: 2025 - startYear,
    team: integer(6, 16), total, pending, returned, completed: total - pending - returned,
    completionRate: ((total - pending - returned) * 100 / total).toFixed(1),
    before, after, reduction: before - after, batchLimit, overLimit: batchLimit + 1,
    retention: integer(3, 6) * 30, cutoff: ['15時00分','15時30分','16時00分'][integer(0, 2)],
    salaryMin, salaryMax: salaryMin + 200
  };
  const sections = [], questions = [];
  function add(key, title, paragraphs) {
    const number = sections.length + 1;
    const s = { id: `${id}-S${pad(number, 2)}`, key, number, title: interpolate(title, v), paragraphs: paragraphs.map(p => interpolate(p, v)) };
    sections.push(s); return s;
  }
  let resumeResult;
  if (template.renderer === 'resume') {
    resumeResult=buildResume({profile,id,index,depth:LEVELS[level],integer});
    sections.push(...resumeResult.sections);questions.push(...resumeResult.questions);
  } else {
  for (const f of template.facts) {
    const s = add(`fact-${f.id}`, f.title, [f.text]);
    questions.push({ questionId: `${id}-Q${pad(questions.length + 1, 2)}`, documentId: id, type: f.kind,
      question: `文書ID「${id}」について、${interpolate(f.question, v)}`, answer: interpolate(f.answer, v),
      answerable: true, sourceSectionId: s.id, sourceSectionTitle: s.title, evidence: s.paragraphs[0] });
  }
  const depth = LEVELS[level];
  for (const s of template.sections) add(s.id, s.title, [...s.paragraphs, ...(depth >= 1 ? (s.extended || []) : []), ...(depth >= 2 ? (s.deep || []) : [])]);
  for (let i = 0; i < profile.phases.length; i++) {
    const phase = profile.phases[i], values = { ...v, ...phase };
    add(`phase-${i + 1}`, interpolate(template.phaseTitle, values), template.phaseText.slice(0, depth + 1).map(x => interpolate(x, values)));
  }
  // Different cases, not copies of a filler paragraph. Detailed mode keeps all authored cases.
  const caseCount = [1, Math.min(3, profile.cases.length), profile.cases.length][depth];
  const offset = integer(0, profile.cases.length - 1);
  for (let i = 0; i < caseCount; i++) {
    const c = profile.cases[(i + offset) % profile.cases.length];
    const values = { ...v, ...c, caseTitle: c.title };
    add(`case-${i + 1}`, interpolate(template.caseTitle, values), template.caseText.slice(0, depth + 1).map(x => interpolate(x, values)));
  }
  questions.push({ questionId: `${id}-Q99`, documentId: id, type: 'unanswerable', question: `文書ID「${id}」について、2030年度の確定した売上目標額はいくらですか。`, answer: 'この文書には記載されていません。', answerable: false, sourceSectionId: null, evidence: null });
  }
  const doc = { schemaVersion: 2, generatorVersion: VERSION, id, caseId: `TEST-CASE-${run}-${serial}`,
    industry: industry.name, industryId: industry.id, role: profile.role, profileId: profile.id, templateId,
    title: `${template.name}｜${profile.role}`, subject: profile.theme, company: v.company, version: v.version,
    seed, index, level, format, sections, questions, facts: v,
    filename: `${template.name}_${profile.id}_${id}.${format}` };
  if(resumeResult){Object.assign(doc,resumeResult);doc.facts={...v,candidate:resumeResult.candidate};}
  doc.charCount = Array.from(plainText(doc)).length;
  doc.contentFingerprint = fingerprint(plainText(doc)); // Non-cryptographic, for reproducibility only.
  if (/\{\{[^}]+\}\}/.test(plainText(doc))) throw new Error('未置換の差し込み項目があります。');
  return doc;
}
export function createBatch({ industry, profile, templates, templateIds, formats, count, seed, level }) {
  if (![10, 30, 50].includes(count)) throw new Error('生成件数は10・30・50件から選択してください。');
  if (!templateIds.length || !formats.length) throw new Error('文書とファイル形式を選択してください。');
  for (const id of templateIds) if (!templates[id]) throw new Error(`文書定義がありません: ${id}`);
  const supported = formats.filter(f => templateIds.some(id => templates[id].formats.includes(f)));
  if (supported.length !== formats.length) throw new Error('選択した文書に対応していない形式があります。');
  return Array.from({ length: count }, (_, index) => {
    const format = supported[index % supported.length];
    const eligible = templateIds.filter(id => templates[id].formats.includes(format));
    const templateId = eligible[(Math.floor(index / supported.length) + index % supported.length) % eligible.length];
    return generateDocument({ industry, profile, template: templates[templateId], templateId, seed, index, level, format });
  });
}
export function evaluationFiles(docs) {
  if (!docs.length) throw new Error('出力対象がありません。');
  const manifest = { schemaVersion: 1, generatorVersion: VERSION, synthetic: true, independentCases: true,
    caution: '_evaluation と _metadata は検索インデックスへ投入しないでください。正解漏洩を避け、documents フォルダだけを投入してください。',
    documents: docs.map(d => ({ documentId: d.id, path: `documents/${d.filename}`, industry: d.industry, role: d.role, template: d.templateId, level: d.level, seed: d.seed, index: d.index, format: d.format, charCount: d.charCount, contentFingerprint: d.contentFingerprint, sectionIds: d.sections.map(s => s.id) })) };
  const questions = docs.flatMap(d => d.questions.map(q => ({ ...q, sourceFile: `documents/${d.filename}` })));
  return { manifest, questions };
}
