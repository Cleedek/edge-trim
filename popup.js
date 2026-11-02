// Edge Trim: the popup. Trims dropped, chosen or pasted pictures and holds the settings.

const $ = (id) => document.getElementById(id);
const t = TrimI18n.t;
let faint = 'exact';
// One entry per picture: the original file stays, so a new setting can trim it again.
const items = [];
// "Add shadow" lasts while the popup is open, like the pictures; the look itself is remembered.
// guess: no look chosen yet, so the first one comes from the first picture. saved: My shadows.
// shown: the picture in the large preview, picked with its arrows (the first one otherwise).
const shadow = { on: false, look: null, guess: false, bg: 'white', saved: [], shown: null };

init();

async function init() {
  // The same page also opens in a tab, for bigger batches.
  if (await chrome.tabs.getCurrent()) document.documentElement.classList.add('page');
  await TrimI18n.load();
  TrimI18n.translatePage(document.body);
  const stored = await chrome.storage.local.get({ faint: 'exact', autoTrim: false, shadowLook: null, shadowBg: 'white', shadowSaved: [] });
  faint = stored.faint;
  // Read by the background worker, which trims finished downloads.
  $('autoTrim').checked = stored.autoTrim;
  $('autoTrim').addEventListener('change', () => chrome.storage.local.set({ autoTrim: $('autoTrim').checked }));

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
    for (const item of items.splice(0)) { revoke(item); forget(item); }
    $('results').replaceChildren();
    showBar();
  });
  // One after another: with a shadow, each file is first made at full size.
  $('downloadAll').addEventListener('click', async () => { for (const item of items) if (hasOutput(item)) await download(item); });
  $('openTab').addEventListener('click', () => chrome.tabs.create({ url: 'popup.html' }));

  setupShadow(stored);
  setupSupport();
  setupUiLang();
  setupAppearance();
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
    const img = el.querySelector('img');
    img.addEventListener('load', () => img.style.setProperty('--ratio', img.naturalWidth / img.naturalHeight));
    el.querySelector('.thumb').addEventListener('click', () => expand(item, !el.classList.contains('expanded')));
    expand(item, false);
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
  forget(item);
  item.result = result;
  // An untouched picture is still shown, so you can see what was checked.
  const shown = result.blob || (result.status === 'tight' ? item.file : null);
  item.url = shown ? URL.createObjectURL(shown) : null;
  el.querySelector('img').src = item.url || '';
  el.querySelector('.thumb').disabled = !item.url;
  if (!item.url) expand(item, false);
  showItem(item);
}

// What a row shows: the trimmed picture or, with "Add shadow" on, the picture with its shadow.
async function showItem(item) {
  const { el, result } = item;
  let withShadow = shadow.on && !!item.url;
  if (withShadow) {
    try { await preparePreview(item); } catch (e) { withShadow = false; }
    if (item.result !== result) return; // trimmed again meanwhile; that run shows it
    if (!shadow.on) withShadow = false;
    if (withShadow) {
      drawShadow(item);
      if (item === shownItem()) drawStage(item);
    }
  }
  el.querySelector('img').hidden = !item.url || withShadow;
  el.querySelector('canvas').hidden = !withShadow;

  const { before, box } = result;
  const size = before && box && `${before.w} × ${before.h} → ${box.w} × ${box.h} px`;
  const messages = {
    trimmed: withShadow ? t('{size}, with shadow', { size }) : size,
    tight: withShadow ? t('Nothing to trim, shadow added.') : t('Already tight, nothing to trim.'),
    empty: t('The picture is fully transparent, there’s nothing to keep.'),
    unsupported: t('This file type can’t be trimmed.'),
  };
  const sizeEl = el.querySelector('.result-size');
  sizeEl.textContent = messages[result.status];
  sizeEl.classList.toggle('error', result.status === 'empty' || result.status === 'unsupported');
  el.querySelector('.result-actions').hidden = !hasOutput(item);
  showBar();
}

// Something to copy or save: a trimmed picture or, with a shadow, also one that had nothing to trim.
function hasOutput(item) {
  return !!item.result && (!!item.result.blob || (shadow.on && item.result.status === 'tight'));
}

// Clicking the picture shows it across the whole width, with the name and buttons under it; another click shrinks it back.
function expand(item, on) {
  const thumb = item.el.querySelector('.thumb');
  item.el.classList.toggle('expanded', on);
  thumb.setAttribute('aria-expanded', String(on));
  thumb.title = thumb.ariaLabel = on ? t('Show smaller') : t('Show larger');
}

function showBar() {
  $('resultsBar').hidden = !items.length;
  $('count').textContent = t('{n} trimmed', { n: items.filter((i) => i.result?.blob).length });
  $('downloadAll').hidden = items.filter(hasOutput).length < 2;
  // A shadow is offered once there's a picture to put it under.
  $('shadowSection').hidden = !items.some((i) => i.url);
  if (shadow.on) {
    showStageNav();
    if (presetSource() !== presetsFrom) drawPresets();
  }
}

function revoke(item) {
  if (item.url) URL.revokeObjectURL(item.url);
  item.url = null;
}

// Chrome resolves with the download's id only once the download has started, so the ✓ is real.
async function download(item) {
  const btn = item.el.querySelector('.save-img');
  try {
    const url = shadow.on ? (await shadowFile(item)).url : item.url;
    const id = await chrome.downloads.download({ url, filename: EdgeTrim.outputName(item.file.name || 'image'), conflictAction: 'uniquify' });
    if (id === undefined) throw new Error('not started');
    flash(btn, '✓', t('Download'));
  } catch (e) {
    flash(btn, '!', t('Download'), t('Download failed'));
    const sizeEl = item.el.querySelector('.result-size');
    sizeEl.textContent = t('Download failed');
    sizeEl.classList.add('error');
  }
}

async function copy(item, btn) {
  try {
    // A promise keeps the click's permission to copy while the file with a shadow is still being made.
    const png = shadow.on ? shadowFile(item).then((f) => f.blob) : item.result.blob;
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
    flash(btn, '✓', t('Copy'));
  } catch (e) {
    flash(btn, '!', t('Copy'), t('Copy failed'));
  }
}

// Swaps an icon button for ✓ or ! for a moment, then puts its icon back.
function flash(btn, mark, title, failTitle) {
  clearTimeout(btn.flashTimer);
  if (!btn.icon) btn.icon = btn.innerHTML;
  btn.textContent = mark;
  btn.title = failTitle || title;
  btn.classList.toggle('ok', !failTitle);
  btn.classList.toggle('fail', !!failTitle);
  btn.flashTimer = setTimeout(() => { btn.innerHTML = btn.icon; btn.title = title; btn.classList.remove('ok', 'fail'); }, 1500);
}

// ---------- shadow, added after trimming (lib/shadow.js) ----------

const DISTANCE = { ground: 'Shadow length', float: 'Height above ground', drop: 'Distance' };
const MAX_SAVED = 5; // one row
let drawQueued = false;
let presetsFrom = null, neutral = null;

function setupShadow(stored) {
  shadow.look = stored.shadowLook || { ...structuredClone(EdgeShadow.PRESETS.soft), color: '#000000' };
  shadow.guess = !stored.shadowLook;
  shadow.bg = stored.shadowBg;
  shadow.saved = stored.shadowSaved;

  $('shadowOn').addEventListener('change', async () => {
    shadow.on = $('shadowOn').checked;
    if (shadow.on && shadow.guess) await guessLook();
    $('shadowPanel').hidden = !shadow.on;
    showShadow();
    for (const item of items) showItem(item);
  });
  document.querySelectorAll('[data-preset]').forEach((b) => b.addEventListener('click', () => {
    setLook({ ...structuredClone(EdgeShadow.PRESETS[b.dataset.preset]), color: shadow.look.color });
  }));
  $('shadowType').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    const { x, y } = shadow.look.light;
    // Light from below only makes sense for a flat drop shadow.
    setLook({ type: b.dataset.type, light: { x, y: b.dataset.type === 'drop' ? y : Math.min(0, y) } });
  }));
  $('light').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    setLook({ light: { x: Number(b.dataset.x), y: Number(b.dataset.y) } });
  }));
  $('swatches').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => setLook({ color: b.dataset.color })));
  // The system colour picker opens a window of its own, which may close the popup; a hex code can't.
  $('shadowHex').addEventListener('input', () => {
    const hex = `#${$('shadowHex').value.trim().replace(/^#/, '')}`;
    if (/^#[0-9a-f]{6}$/i.test(hex)) setLook({ color: hex.toLowerCase() }, { typing: true });
  });
  $('shadowHex').addEventListener('blur', () => showShadow()); // back to the colour in use after a half-typed code
  for (const key of ['intensity', 'softness', 'distance']) {
    // Saved when the slider is let go, not at every step.
    $(key).addEventListener('input', () => setLook({ [key]: Number($(key).value) }, { save: false }));
    $(key).addEventListener('change', () => chrome.storage.local.set({ shadowLook: shadow.look }));
  }
  $('previewBg').querySelectorAll('button').forEach((b) => {
    b.title = b.ariaLabel = `${t('Preview background')}: ${t(b.dataset.name)}`;
    b.addEventListener('click', () => {
      shadow.bg = b.dataset.bg;
      chrome.storage.local.set({ shadowBg: shadow.bg });
      showShadow();
    });
  });
  for (const [id, step] of [['stagePrev', -1], ['stageNext', 1]]) $(id).addEventListener('click', () => {
    const list = items.filter((i) => i.url);
    shadow.shown = list[list.indexOf(shownItem()) + step];
    showStageNav();
    if (shadow.shown?.preview) drawStage(shadow.shown);
    else $('stage').width = 0; // drawn by showItem once it's ready
  });
  $('lookNew').addEventListener('click', () => toggleSaveForm(true));
  $('lookCancel').addEventListener('click', () => toggleSaveForm(false));
  $('lookSave').addEventListener('click', saveLook);
  $('lookName').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveLook();
    if (e.key === 'Escape') { e.preventDefault(); toggleSaveForm(false); }
  });
  showMine();
  showShadow();
}

// My shadows: one tile per saved look, with its name and a small x to remove it. Hidden while there are none.
function showMine() {
  $('mine').replaceChildren();
  shadow.saved.forEach(({ name: saved, ...look }, i) => {
    const el = $('mineTpl').content.firstElementChild.cloneNode(true);
    const name = saved || t('My shadow {n}', { n: i + 1 });
    const pick = el.querySelector('.preset');
    pick.dataset.saved = i;
    pick.title = name;
    pick.querySelector('span').textContent = name;
    pick.addEventListener('click', () => setLook(structuredClone(look)));
    const remove = el.querySelector('.remove');
    remove.title = remove.ariaLabel = t('Remove {name}', { name });
    remove.addEventListener('click', () => {
      shadow.saved.splice(i, 1);
      saveMine();
    });
    $('mine').append(el);
  });
  $('mineBox').hidden = !shadow.saved.length;
}

function toggleSaveForm(open) {
  $('saveForm').hidden = !open;
  $('lookNew').hidden = open;
  if (open) {
    // A suggested name that isn't taken, so saving it doesn't replace another look.
    let n = shadow.saved.length + 1;
    while (shadow.saved.some((l) => l.name === t('My shadow {n}', { n }))) n++;
    $('lookName').value = t('My shadow {n}', { n });
    $('lookName').focus();
    $('lookName').select();
  }
}

// A name that's already there replaces that look.
function saveLook() {
  const name = $('lookName').value.trim();
  if (!name) return $('lookName').focus();
  shadow.saved = shadow.saved.filter((l) => l.name !== name);
  shadow.saved.push({ ...structuredClone(shadow.look), name });
  toggleSaveForm(false);
  saveMine();
  const motion = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  $('mineBox').scrollIntoView({ behavior: motion, block: 'center' });
}

function saveMine() {
  chrome.storage.local.set({ shadowSaved: shadow.saved });
  showMine();
  showShadow();
  drawPresets();
}

function setLook(change, { save = true, typing = false } = {}) {
  shadow.look = { ...shadow.look, ...change };
  shadow.guess = false;
  // Files already made with the old look are thrown away.
  for (const item of items) dropShadowFile(item);
  showShadow({ typing });
  queueDraw();
  if (save) chrome.storage.local.set({ shadowLook: shadow.look });
}

// The first time, the look is guessed from the first picture: a flat graphic gets "Above", a photo "Soft".
async function guessLook() {
  const item = items.find((i) => i.url);
  if (!item) return;
  try { await preparePreview(item); } catch (e) { return; }
  if (item.small) setLook({ ...structuredClone(EdgeShadow.PRESETS[EdgeShadow.guess(item.small).preset]), color: shadow.look.color });
}

// The controls follow the look, and the pictures sit on the chosen preview background.
function showShadow({ typing = false } = {}) {
  const s = shadow.look;
  if (shadow.on) document.body.dataset.shadowBg = shadow.bg;
  else delete document.body.dataset.shadowBg;
  // A saved look is chosen only with its own colour; a built-in one with any colour, unless a saved one is.
  const savedAt = shadow.saved.findIndex((l) => sameLook(l, s) && l.color === s.color);
  document.querySelectorAll('[data-saved]').forEach((b) => b.setAttribute('aria-checked', String(Number(b.dataset.saved) === savedAt)));
  document.querySelectorAll('[data-preset]').forEach((b) => b.setAttribute('aria-checked', String(savedAt < 0 && sameLook(EdgeShadow.PRESETS[b.dataset.preset], s))));
  // Nothing to save when the look is already there, or when My shadows is full.
  const known = savedAt >= 0 || (s.color === '#000000' && Object.values(EdgeShadow.PRESETS).some((p) => sameLook(p, s)));
  const full = shadow.saved.length >= MAX_SAVED;
  $('lookNew').disabled = known || full;
  $('saveHint').hidden = !known && !full;
  $('saveHint').textContent = full ? t('My shadows is full: remove one to save another.') : t('You already have this look.');
  if (known || full) toggleSaveForm(false);
  check($('shadowType'), (b) => b.dataset.type === s.type);
  $('light').querySelectorAll('button').forEach((b) => {
    const x = Number(b.dataset.x), y = Number(b.dataset.y);
    b.setAttribute('aria-checked', String(x === s.light.x && y === s.light.y));
    b.disabled = s.type !== 'drop' && y > 0;
  });
  check($('swatches'), (b) => b.dataset.color === s.color);
  if (!typing) $('shadowHex').value = s.color;
  for (const key of ['intensity', 'softness', 'distance']) {
    $(key).value = s[key];
    $(key).style.setProperty('--fill', `${s[key]}%`);
    $(`${key}Out`).textContent = s[key];
  }
  $('distanceLabel').textContent = t(DISTANCE[s.type]);
  $('distance').disabled = s.type === 'ground' && !s.light.x && !s.light.y;
  $('lightHint').textContent = t(lightHint(s));
  check($('previewBg'), (b) => b.dataset.bg === shadow.bg);
}

function check(group, test) {
  group.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', String(test(b))));
}

// A preset counts as chosen while nothing but the colour differs from it.
function sameLook(p, s) {
  return p.type === s.type && p.light.x === s.light.x && p.light.y === s.light.y
    && p.intensity === s.intensity && p.softness === s.softness && p.distance === s.distance;
}

// What the light does with this kind of shadow (the English text, translated where it's shown).
function lightHint({ type, light: { x, y }, distance }) {
  if (type === 'ground') {
    if (!x && !y) return 'Light from straight above: only a shadow at the base, nothing is cast.';
    if (!distance) return 'Raise Shadow length to cast a shadow.';
    return y < 0 ? 'Light from the front and above: the shadow falls back, behind the object.' : 'Low light from the side: a long shadow along the ground.';
  }
  if (type === 'float') return x ? 'The shadow moves away from the light.' : 'The shadow sits right under the object.';
  if (!x && !y) return 'The shadow spreads evenly all around.';
  return distance ? 'The shadow moves away from the light.' : 'Raise Distance to move the shadow away from the light.';
}

// A smaller copy of the trimmed picture, redrawn while a slider moves, and a tiny one for the look previews.
// The full size is only loaded to make the file.
function preparePreview(item) {
  const { result } = item;
  item.preparing ||= (async () => {
    const full = await createImageBitmap(result.blob || item.file);
    const preview = await scaled(full, 640);
    if (preview !== full) full.close();
    const small = await scaled(preview, 160);
    if (item.result === result) Object.assign(item, { preview, small });
  })();
  return item.preparing;
}

async function scaled(bitmap, max) {
  const k = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  if (k === 1) return bitmap;
  return createImageBitmap(bitmap, { resizeWidth: Math.max(1, Math.round(bitmap.width * k)), resizeHeight: Math.max(1, Math.round(bitmap.height * k)), resizeQuality: 'high' });
}

// Drops what was made from the last trim: the smaller copies and the file with a shadow.
function forget(item) {
  item.preview?.close();
  item.small?.close();
  item.preview = item.small = item.preparing = null;
  dropShadowFile(item);
}

// With a shadow, the file is made at full size only when it's copied or saved, and kept until the look changes.
function shadowFile(item) {
  const { look } = shadow;
  item.shadowed ||= (async () => {
    const full = await createImageBitmap(item.result.blob || item.file);
    const r = EdgeShadow.render(full, look, { trim: true });
    full.close();
    const blob = await r.canvas.convertToBlob({ type: 'image/png' });
    return { blob, url: URL.createObjectURL(blob) };
  })();
  return item.shadowed;
}

function dropShadowFile(item) {
  item.shadowed?.then((f) => URL.revokeObjectURL(f.url), () => {});
  item.shadowed = null;
}

// The picture with its shadow, cropped the way the file will be.
function drawShadow(item) {
  const r = EdgeShadow.render(item.preview, shadow.look, { trim: true });
  const canvas = item.el.querySelector('canvas');
  canvas.width = r.canvas.width;
  canvas.height = r.canvas.height;
  canvas.getContext('2d').drawImage(r.canvas, 0, 0);
  canvas.style.setProperty('--ratio', r.canvas.width / r.canvas.height);
}

// The picture in the large preview: the one picked with the arrows while it's still there, else the first.
function shownItem() {
  const list = items.filter((i) => i.url);
  return list.includes(shadow.shown) ? shadow.shown : list[0];
}

function showStageNav() {
  const list = items.filter((i) => i.url), item = shownItem(), at = list.indexOf(item);
  $('stageBox').classList.toggle('multi', list.length > 1);
  if (!item) return;
  $('stageCount').textContent = `${at + 1} / ${list.length}`;
  $('stageCount').title = item.file.name || t('Pasted picture');
  $('stagePrev').disabled = at <= 0;
  $('stageNext').disabled = at >= list.length - 1;
}

// The large preview: the same drawing as the picture's row, which drawShadow has just made.
function drawStage(item) {
  const from = item.el.querySelector('canvas'), canvas = $('stage');
  canvas.width = from.width;
  canvas.height = from.height;
  canvas.getContext('2d').drawImage(from, 0, 0);
}

// The looks are drawn small on the only picture or, with several, on a plain grey bottle,
// so they show the shadow rather than one of the pictures.
function presetSource() {
  if (items.filter((i) => i.url).length > 1) return neutralObject();
  return items.find((i) => i.small)?.small || null;
}

function neutralObject() {
  if (neutral) return neutral;
  neutral = new OffscreenCanvas(90, 160);
  const ctx = neutral.getContext('2d');
  const grey = ctx.createLinearGradient(0, 0, 90, 0);
  grey.addColorStop(0, '#a9a9b4');
  grey.addColorStop(0.45, '#dedee5');
  grey.addColorStop(1, '#8f8f9b');
  ctx.fillStyle = grey;
  ctx.beginPath(); ctx.roundRect(8, 54, 74, 106, 16); ctx.fill(); // body
  ctx.beginPath(); ctx.roundRect(30, 18, 30, 46, 6); ctx.fill(); // neck
  ctx.fillStyle = '#74747f';
  ctx.beginPath(); ctx.roundRect(27, 4, 36, 18, 4); ctx.fill(); // cap
  return neutral;
}

// Every look takes the same room, whatever its shadow adds.
// The built-in looks in the colour in use, the saved ones in their own.
function drawPresets() {
  const pic = presetsFrom = presetSource();
  if (!pic) return;
  document.querySelectorAll('[data-preset], [data-saved]').forEach((b) => {
    const canvas = b.querySelector('canvas'), ctx = canvas.getContext('2d');
    const look = b.dataset.preset ? { ...EdgeShadow.PRESETS[b.dataset.preset], color: shadow.look.color } : shadow.saved[b.dataset.saved];
    const r = EdgeShadow.render(pic, look);
    const k = Math.min(canvas.width * 0.5 / pic.width, canvas.height * 0.5 / pic.height);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(r.canvas, canvas.width / 2 - (r.x + pic.width / 2) * k, canvas.height * 0.45 - (r.y + pic.height / 2) * k, r.canvas.width * k, r.canvas.height * k);
  });
}

// While a slider moves, everything is redrawn at most once per frame.
function queueDraw() {
  if (drawQueued) return;
  drawQueued = true;
  requestAnimationFrame(() => {
    drawQueued = false;
    if (!shadow.on) return;
    for (const item of items) if (item.preview && item.url) drawShadow(item);
    drawPresets();
    const shown = shownItem();
    if (shown?.preview) drawStage(shown);
  });
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

// ---------- appearance: dark, light or same as browser (applied by theme.js) ----------

function setupAppearance() {
  $('appearance').value = document.querySelector('meta[name="color-scheme"]').content;
  $('appearance').addEventListener('change', () => {
    localStorage.setItem('colorScheme', $('appearance').value);
    applyScheme();
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
