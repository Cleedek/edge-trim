// Edge Trim: the popup. Trims dropped, chosen or pasted pictures and holds the settings.

const $ = (id) => document.getElementById(id);
const t = TrimI18n.t;
let faint = 'exact';
// One entry per picture: the original file stays, so a new setting can trim it again.
const items = [];

init();

async function init() {
  // The same page also opens in a tab, for bigger batches.
  if (await chrome.tabs.getCurrent()) document.documentElement.classList.add('page');
  await TrimI18n.load();
  TrimI18n.translatePage(document.body);
  ({ faint } = await chrome.storage.local.get({ faint: 'exact' }));

  document.querySelectorAll('[data-faint][role=radio]').forEach((b) => b.addEventListener('click', () => {
    faint = b.dataset.faint;
    chrome.storage.local.set({ faint });
    showFaint();
    for (const item of items) trimItem(item);
  }));
  showFaint();

  $('files').addEventListener('change', () => { addFiles($('files').files); $('files').value = ''; });
  const drop = $('drop');
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); addFiles(e.dataTransfer.files); });
  // A drop that misses the zone shouldn't open the picture in place of the popup.
  document.addEventListener('dragover', (e) => e.preventDefault());
  document.addEventListener('drop', (e) => e.preventDefault());
  document.addEventListener('paste', (e) => addFiles(e.clipboardData.files));

  $('clear').addEventListener('click', () => {
    for (const item of items.splice(0)) revoke(item);
    $('results').replaceChildren();
    showBar();
  });
  $('downloadAll').addEventListener('click', () => { for (const item of items) if (item.result?.blob) download(item); });
  $('openTab').addEventListener('click', () => chrome.tabs.create({ url: 'popup.html' }));

  setupSupport();
  setupUiLang();
}

function showFaint() {
  document.querySelectorAll('[data-faint][role=radio]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.faint === faint)));
  document.querySelectorAll('.hint[data-for]').forEach((h) => { h.hidden = h.dataset.for !== faint; });
}

// ---------- trimming ----------

function addFiles(fileList) {
  const pictures = [...fileList].filter((f) => f.type.startsWith('image/'));
  for (const file of pictures) {
    const el = $('resultTpl').content.firstElementChild.cloneNode(true);
    const item = { file, el, result: null, url: null };
    el.querySelector('.result-name').textContent = file.name || t('Pasted picture');
    el.querySelector('.copy-img').title = el.querySelector('.copy-img').ariaLabel = t('Copy');
    el.querySelector('.save-img').title = el.querySelector('.save-img').ariaLabel = t('Download');
    el.querySelector('.copy-img').addEventListener('click', (e) => copy(item, e.currentTarget));
    el.querySelector('.save-img').addEventListener('click', () => download(item));
    items.push(item);
    $('results').append(el);
    trimItem(item);
  }
  showBar();
}

async function trimItem(item) {
  const { el } = item;
  const sizeEl = el.querySelector('.result-size');
  const wanted = faint;
  sizeEl.textContent = t('Trimming…');
  sizeEl.classList.remove('error');
  let result;
  try { result = await EdgeTrim.trimBlob(item.file, wanted); }
  catch (e) { result = { status: 'unsupported' }; }
  if (wanted !== faint) return; // the setting changed meanwhile; the newer run wins
  revoke(item);
  item.result = result;
  // An untouched picture is still shown, so you can see what was checked.
  const shown = result.blob || (result.status === 'tight' ? item.file : null);
  item.url = shown ? URL.createObjectURL(shown) : null;
  el.querySelector('img').src = item.url || '';
  el.querySelector('img').hidden = !item.url;

  const { before, box } = result;
  const messages = {
    trimmed: before && box && `${before.w} × ${before.h} → ${box.w} × ${box.h} px`,
    tight: t('Already tight, nothing to trim.'),
    empty: t('The picture is fully transparent, there’s nothing to keep.'),
    unsupported: t('This file type can’t be trimmed.'),
  };
  sizeEl.textContent = messages[result.status];
  sizeEl.classList.toggle('error', result.status === 'empty' || result.status === 'unsupported');
  el.querySelector('.result-actions').hidden = !result.blob;
  showBar();
}

function showBar() {
  const ready = items.filter((i) => i.result?.blob).length;
  $('resultsBar').hidden = !items.length;
  $('count').textContent = t('{n} trimmed', { n: ready });
  $('downloadAll').hidden = ready < 2;
}

function revoke(item) {
  if (item.url) URL.revokeObjectURL(item.url);
  item.url = null;
}

async function download(item) {
  try {
    await chrome.downloads.download({ url: item.url, filename: EdgeTrim.trimmedName(item.file.name || 'image'), conflictAction: 'uniquify' });
  } catch (e) {
    const sizeEl = item.el.querySelector('.result-size');
    sizeEl.textContent = t('Download failed');
    sizeEl.classList.add('error');
  }
}

async function copy(item, btn) {
  const icon = btn.innerHTML;
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': item.result.blob })]);
    btn.textContent = '✓';
  } catch (e) {
    btn.textContent = '!';
    btn.title = t('Copy failed');
  }
  setTimeout(() => { btn.innerHTML = icon; btn.title = t('Copy'); }, 1500);
}

// ---------- interface language (same as Snap Translate) ----------

async function setupUiLang() {
  const { uiLang } = await chrome.storage.local.get('uiLang');
  $('uiLang').replaceChildren(...TrimI18n.LOCALES.map(([code, name]) => new Option(code === 'auto' ? t('Same as browser') : name, code)));
  $('uiLang').value = uiLang || 'auto';
  $('uiLang').addEventListener('change', async () => {
    await chrome.storage.local.set({ uiLang: $('uiLang').value });
    location.reload();
  });
}

// ---------- footer and the "support the creator" screen (same as Snap Translate) ----------

function setupSupport() {
  const author = Object.assign(document.createElement('a'), { href: 'https://cleedek.com', target: '_blank', rel: 'noopener', textContent: 'Cleedek' });
  // The name is a link, so the sentence is split around {name} instead of translated as page text.
  const [before, after] = t('Created with 💜 by {name} in Vietnam').split('{name}');
  $('credit').append(before, author, after || '');

  const showSupport = (on) => {
    document.body.classList.toggle('support', on);
    window.scrollTo(0, 0);
    (on ? $('supportBack') : $('supportOpen')).focus();
  };
  $('supportOpen').addEventListener('click', () => showSupport(true));
  $('supportBack').addEventListener('click', () => showSupport(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('support')) { e.preventDefault(); showSupport(false); }
  });

  const payTabs = document.querySelectorAll('#supportView .segmented [role=tab]');
  const selectPayTab = (tabBtn) => {
    for (const b of payTabs) {
      b.setAttribute('aria-selected', String(b === tabBtn));
      $(b.getAttribute('aria-controls')).hidden = b !== tabBtn;
    }
  };
  for (const tabBtn of payTabs) tabBtn.addEventListener('click', () => selectPayTab(tabBtn));

  // Local bank QR as the default tab, only for Czech or Vietnamese speakers (browser language, not location).
  // The language picked in the extension decides first, then the browser's own language.
  const browserLang = chrome.i18n.getUILanguage().toLowerCase().split('-')[0];
  const bankLang = [TrimI18n.lang, browserLang].find((l) => l === 'cs' || l === 'vi');
  const localTab = { cs: $('tabBankCz'), vi: $('tabBankVn') }[bankLang];
  if (localTab) {
    localTab.hidden = false;
    selectPayTab(localTab);
  }

  for (const btn of document.querySelectorAll('.pay-card .copy')) {
    const label = btn.textContent;
    btn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(btn.dataset.copy); btn.textContent = t('Copied'); }
      catch (e) { btn.textContent = t('Copy failed'); }
      setTimeout(() => { btn.textContent = label; }, 1500);
    });
  }
}
