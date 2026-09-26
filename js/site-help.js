/** Site guidance only: no network requests and no changes to generator state. */
const about = `
<section class="info-section">
  <h3>DOCUMENTS CREATOR とは？</h3>
  <p class="info-lead"><strong>RAG（検索拡張生成）の精度検証や検索システムのテストに使える「架空の業務ドキュメント」を、ブラウザ内でまとめて生成できるツールです。</strong></p>
  <p>本番データ（機密情報や個人情報）を持ち出せない環境でも、実務を想定したWord・PDF・Excel・PowerPointファイルと、評価用の質問・期待回答・根拠箇所（Ground Truth）をセットで準備できます。</p>
  <p class="info-note">文書と評価データは、用意された架空シナリオに基づく検証用の素材です。RAG自体の回答生成や自動採点を行うツールではありません。</p>
</section>
<section class="info-section">
  <h3>こんな課題・シーンに</h3>
  <div class="info-use-cases">
    <div class="info-use-case"><h4>RAGの精度評価・ベンチマーク</h4><p>検証用ドキュメントと「質問・期待回答・根拠箇所」のペアを揃えたいとき。Ragas・TruLens等への組み込みでは、利用する評価ツールに合わせた項目変換や、実際の検索結果・生成回答の追加が必要です。</p></div>
    <div class="info-use-case"><h4>本番データを使わない検証環境づくり</h4><p>外部ベンダーへのPoC委託やパブリッククラウド上の検証で、社内データを使えない場合の代替データとして。実際の顧客情報や社内文書のアップロードは不要です。</p></div>
    <div class="info-use-case"><h4>ローダー・パーサーの抽出比較</h4><p>LangChain・LlamaIndexなどから利用するローダーやパーサーで、表組み・スライド・段落をどのようにテキスト化できるか、抽出結果を比較したいとき。</p></div>
    <div class="info-use-case"><h4>検索エンジン・社内ポータルの検証</h4><p>複数形式のファイルを投入し、インデックス作成や検索画面、ハイライト表示の挙動を確認したいとき。1回の生成件数は10・30・50ファイルから選べます。</p></div>
  </div>
</section>
<section class="info-section">
  <h3>3つの特徴</h3>
  <ol class="info-features">
    <li><strong>生成処理はブラウザ内で完結</strong><p>入力した生成条件や生成ドキュメントを、本ツールの生成処理から外部サーバーや生成AI APIへ送信することはありません。実行時は、必要なライブラリや日本語PDF用フォントを外部配信元から取得します。完全オフライン動作や、あらゆる環境での情報漏洩ゼロを保証するものではありません。</p></li>
    <li><strong>RAG評価用データ（Ground Truth）を同梱</strong><p>「詳細設定」の同梱オプションがONの場合、ZIPには質問・期待回答例・根拠箇所・文書IDなどを追加します。記載がなく回答できない質問も含みます。評価データは検索対象の文書とは別フォルダに分けています。</p></li>
    <li><strong>実務を想定したマルチフォーマット</strong><p>Word、日本語フォントを埋め込んだテキストPDF、段落別シートのExcel、複数スライドのPowerPointに対応しています。職務経歴書・求人票・製品マニュアル・業務マニュアルなど、業種・職種に応じた文書を生成します。</p></li>
  </ol>
</section>
<section class="info-section info-disclaimer">
  <h3>免責事項・ご利用上の注意</h3>
  <p>本ツールはシステム検証・テスト用途専用です。生成される文書はすべて架空のものであり、実在の法令・契約・業務手順の正確性を保証するものではありません。実際の応募書類や業務上の指示・判断には使用しないでください。</p>
  <p><strong>本ツールおよび生成データは、内容を確認のうえ、利用者ご自身の責任でご利用ください。</strong>利用により生じた損害について、製作者は法令上認められる範囲で責任を負いません。</p>
  <p>各文書は独立した架空ケースです。同名の製品でも別文書の設定値は異なる場合があります。名称の実在との偶然の一致を排除するものではなく、複数文書の関連性・旧版比較を保証するデータセットではありません。</p>
</section>`;

const faq = `
<p class="info-note">生成ファイルの利用、RAG評価データ、PDF、再現性についてご案内します。質問を押すと回答を開閉できます。</p>
<details class="faq-item" open><summary>Q1. 商用利用や外部ベンダーへの提供に使えますか？</summary><div class="faq-answer">
<p><strong>A. はい。生成したテスト文書は、自社のPoC・ベンチマーク・外部委託先への検証データ配布などに利用できます。</strong></p>
<p>収録する人物名・企業名・案件内容などは、テスト用途の架空設定を組み合わせたものです。実在の個人情報や本番の業務データを加工したものではありません。内容と提供先のルールをご確認のうえ、自己責任でご活用ください。</p>
<p>この案内は生成したテスト文書の利用に関するものです。アプリ本体・猫などの画像素材・外部ライブラリ・フォント自体の再配布には、それぞれの権利・ライセンス条件が適用されます。</p>
</div></details>
<details class="faq-item"><summary>Q2. ZIP内の documents/ と _evaluation/ はなぜ分かれていますか？</summary><div class="faq-answer">
<p><strong>A. 検索インデックスに正解データが混入する「データリーク」を防ぐためです。</strong></p>
<ul><li><code>documents/</code>：ベクターDBや検索エンジンへ投入する文書ファイルです。</li><li><code>_evaluation/</code>：質問・期待回答・本文の根拠など、評価側で利用するデータです。検索対象に混ぜないでください。</li><li><code>_metadata/</code>：文書ID・シード・文字数など、再現・管理用の情報です。こちらも検索対象から除外してください。</li></ul>
<p>RAGには<strong>documents/ だけ</strong>を投入します。Ragas・TruLens等に評価データを渡す場合は、利用するバージョンや評価指標に合わせて項目を変換し、実際の検索結果や生成回答を用意してください。専用形式への自動変換・自動採点機能は含まれていません。</p>
<p>評価データとメタデータは、同梱オプションをONにしてZIP保存した場合に追加されます。個別ダウンロードは文書ファイルのみです。</p>
</div></details>
<details class="faq-item"><summary>Q3. PDFの文字は検索・テキスト抽出できますか？</summary><div class="faq-answer">
<p><strong>A. はい。画像だけのPDFではなく、日本語フォントを埋め込んだテキストPDFを生成します。</strong></p>
<p>文字の選択・コピー・検索や、PDFパーサーによるテキスト抽出に利用できます。ただし、読み取り順・改行・表の復元結果は、利用するビューアーやパーサーの仕様・バージョンに依存します。</p>
<p>pypdf・pdfminerなど、すべてのパーサーで同じ結果になることや、文字化けが一切起きないことを保証するものではありません。ご利用の環境で抽出結果を検証してください。</p>
</div></details>
<details class="faq-item"><summary>Q4. 毎回同じ内容のドキュメントを再現できますか？</summary><div class="faq-answer">
<p><strong>A. はい。同じ生成条件・シード・ジェネレーターとデータの版で、同じ本文を再生成できます。</strong></p>
<p>「詳細設定」のシード値（初期値：<code>31415</code>）に加えて、業種・職種・シーン、文書と形式の選択、件数、文章の詳しさを揃えてください。アプリの更新でテンプレートや生成ロジックが変わると、同じシードでも内容が変わる場合があります。</p>
<p>本文を使った回帰テストに活用できますが、OfficeファイルやZIP内には作成日時などが含まれる場合があるため、ファイル全体のバイト単位の一致は保証していません。</p>
</div></details>
<details class="faq-item"><summary>Q5. 外部の生成AI APIを裏で呼び出していますか？</summary><div class="faq-answer">
<p><strong>A. いいえ。文書生成にChatGPTやClaudeなどの生成AI APIは使用していません。</strong></p>
<p>あらかじめ用意した架空の業務シナリオと文章テンプレートをブラウザ内で組み合わせる方式です。APIキーの設定は不要で、本ツールの文書生成に生成AI APIの利用料はかかりません。</p>
<p>一方、アプリの表示・データ定義の読み込みや、出力ライブラリ・日本語フォントの取得には通信が発生します。初回のPDF出力などでは読み込み時間がかかることがあります。別途利用するRAG評価ツールの外部通信や利用料金は、そのツールの設定に依存します。</p>
</div></details>`;

const version = document.querySelector('.brand-line .version');
if (version) {
  const actions = document.createElement('div');
  actions.className = 'brand-actions';
  version.before(actions);
  actions.append(version);
  const nav = document.createElement('nav');
  nav.className = 'header-nav';
  nav.setAttribute('aria-label', 'このツールについて');
  nav.innerHTML = '<button type="button" id="openFaq" aria-haspopup="dialog" aria-controls="faqDialog" aria-expanded="false">FAQ</button><button type="button" id="openAbout" aria-haspopup="dialog" aria-controls="aboutDialog" aria-expanded="false">初めましての方へ</button>';
  actions.append(nav);

  const entries = [
    {id:'faqDialog', opener:'openFaq', title:'よくある質問', label:'FAQ', body:faq, next:'aboutDialog', nextLabel:'初めましての方へ'},
    {id:'aboutDialog', opener:'openAbout', title:'初めましての方へ', label:'ABOUT', body:about, next:'faqDialog', nextLabel:'よくある質問を見る'}
  ];
  const dialogs = new Map();
  for (const entry of entries) {
    const dialog = document.createElement('dialog');
    dialog.id = entry.id;
    dialog.className = 'info-dialog';
    dialog.setAttribute('aria-labelledby', `${entry.id}Title`);
    dialog.innerHTML = `<div class="info-dialog-toolbar"><div><span class="info-eyebrow">${entry.label} / DOCUMENTS CREATOR</span><h2 id="${entry.id}Title">${entry.title}</h2></div><button class="info-close" type="button" data-info-close autofocus aria-label="${entry.title}を閉じる">閉じる</button></div><div class="info-dialog-body">${entry.body}<div class="info-footer"><button type="button" data-info-switch="${entry.next}">${entry.nextLabel}</button><button type="button" data-info-close>ツールに戻る</button></div></div>`;
    document.body.append(dialog);
    dialogs.set(entry.id, dialog);
    const opener = document.getElementById(entry.opener);
    opener.addEventListener('click', () => openDialog(entry.id));
    dialog.querySelectorAll('[data-info-close]').forEach(button => button.addEventListener('click', () => dialog.close()));
    dialog.querySelector('[data-info-switch]').addEventListener('click', event => openDialog(event.currentTarget.dataset.infoSwitch));
    // Light dismiss only when both pointer-down and click are outside the dialog box.
    let startedOutside = false;
    const outside = event => {
      const r = dialog.getBoundingClientRect();
      return event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom;
    };
    dialog.addEventListener('pointerdown', event => { startedOutside = event.target === dialog && outside(event); });
    dialog.addEventListener('click', event => { if (startedOutside && event.target === dialog && outside(event)) dialog.close(); startedOutside = false; });
    dialog.addEventListener('close', () => {
      opener.setAttribute('aria-expanded', 'false');
      const anotherOpen = [...dialogs.values()].some(item => item.open);
      document.documentElement.classList.toggle('info-modal-open', anotherOpen);
      if (!anotherOpen) opener.focus({preventScroll:true});
    });
  }
  function openDialog(id) {
    const dialog = dialogs.get(id);
    if (!dialog || dialog.open) return;
    for (const other of dialogs.values()) if (other.open) other.close();
    dialog.showModal();
    dialog.querySelector('.info-dialog-body').scrollTop = 0;
    document.documentElement.classList.add('info-modal-open');
    const entry = entries.find(item => item.id === id);
    document.getElementById(entry.opener).setAttribute('aria-expanded', 'true');
  }
  document.documentElement.dataset.siteHelp = '1.2.0-help1';
}
