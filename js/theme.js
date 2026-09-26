// UI-only enhancement. The original generator and exporters remain unchanged.
const byId = id => document.getElementById(id);
const count = selector => document.querySelectorAll(selector).length;
const emptyMessage = 'まずは、上の項目から業種・職種・業務シーンを選択してください。';
function documentCount() {
  const total = count('.dsel');
  byId('docSelectionCount').textContent = total ? `${count('.dsel:checked')} / ${total}種類を選択中` : '';
  byId('selectDocs').hidden = total === 0;
  document.querySelector('.purpose-panel').classList.toggle('has-profile', Boolean(byId('scene').value));
  const box = byId('documents');
  if (box.classList.contains('empty') && box.textContent !== emptyMessage) box.textContent = emptyMessage;
}
function resultCount() {
  byId('zip').textContent = `選択した${count('.rsel:checked')}件をZIP`;
  byId('zipAll').textContent = `全${count('.rsel')}件をZIP`;
}
function settingsSummary() {
  const enabled = byId('evaluation').checked;
  byId('advancedSummary').textContent = `RAG評価${enabled ? 'あり' : 'なし'} ／ シード ${byId('seed').value || '未入力'}`;
  byId('resultEvaluation').textContent = enabled ? 'RAG評価データを同梱します。検索対象は documents/ のみです。' : 'RAG評価データは同梱しません。文書ファイルのみを保存します。';
}
new MutationObserver(documentCount).observe(byId('documents'), {childList: true});
byId('documents').addEventListener('change', documentCount);
byId('selectDocs').addEventListener('click', documentCount);
new MutationObserver(resultCount).observe(byId('results'), {childList: true});
byId('results').addEventListener('change', resultCount);
byId('all').addEventListener('click', resultCount);
byId('none').addEventListener('click', resultCount);
byId('seed').addEventListener('input', settingsSummary);
byId('evaluation').addEventListener('change', settingsSummary);
byId('generate').addEventListener('click', () => {
  if (!byId('seed').value || !byId('seed').checkValidity()) {
    byId('advanced').open = true;
    byId('seed').focus();
  }
});
new MutationObserver(() => {
  if (byId('status').classList.contains('error')) byId('status').scrollIntoView({block: 'nearest'});
}).observe(byId('status'), {childList: true});
documentCount(); resultCount(); settingsSummary();
