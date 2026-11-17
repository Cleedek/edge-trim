// Edge Trim: the background worker. Right-click a picture on a page -> trim it, then copy or save it.
// With "Trim downloaded pictures" on, pictures downloaded from any page are trimmed too.

importScripts('lib/i18n.js', 'lib/trim.js', 'lib/whats-new.js', 'lib/goodbye.js', 'lib/support-ask.js');

// The "why did you leave?" page Chrome opens after the extension is removed (lib/goodbye.js).
setupGoodbye({ ext: 'edge-trim', i18n: TrimI18n });
const t = TrimI18n.t;

// The menu is rebuilt in the new language when it changes in the popup.
// Rebuilds run one after another: two at once (quick language switches) would
// both add the same entries and Chrome refuses the second copy of an id.
let menusQueue = Promise.resolve();
function createMenus() {
  menusQueue = menusQueue.then(buildMenus, buildMenus);
  return menusQueue;
}
async function buildMenus() {
  await TrimI18n.load();
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({ id: 'copy', title: t('Trim and copy image'), contexts: ['image'] });
  chrome.contextMenus.create({ id: 'save', title: t('Trim and save image'), contexts: ['image'] });
  // A site's "Download" link, which often leads to the full picture behind a small or watermarked preview.
  chrome.contextMenus.create({ id: 'link', title: t('Trim and download linked image'), contexts: ['link'] });
}
chrome.runtime.onInstalled.addListener(createMenus);
chrome.runtime.onInstalled.addListener(rememberUpdate);
chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && changes.uiLang) createMenus(); });

chrome.contextMenus.onClicked.addListener((info, tab) => {
  // Chrome leaves out the tab for some places the menu can open (not a normal web page).
  const target = tab?.id >= 0 ? { tabId: tab.id, frameIds: [info.frameId || 0] } : null;
  resetIcon();
  run(info.menuItemId, info.menuItemId === 'link' ? info.linkUrl : info.srcUrl, target).catch((e) => toast(target, e.message, true));
});

async function run(action, src, target) {
  await TrimI18n.load();
  const { faint } = await chrome.storage.local.get({ faint: 'exact' });
  const { blob, name } = await loadImage(src, target);
  let res;
  try { res = await EdgeTrim.trimBlob(blob, faint); }
  catch (e) {
    // Many "Download" buttons lead to a page with a countdown first, not to the picture.
    throw new Error(action === 'link'
      ? t('This link doesn’t lead straight to a picture. Download it as usual with "Trim downloaded pictures" turned on.')
      : t('This file type can’t be trimmed.'));
  }
  if (res.status === 'empty') throw new Error(t('The picture is fully transparent, there’s nothing to keep.'));
  if (res.status === 'tight') return toast(target, t('Already tight, nothing to trim.'));

  const size = { w: res.box.w, h: res.box.h };
  const dataUrl = await toDataUrl(res.blob);
  if (action === 'copy' && target) {
    const [{ result: copied } = {}] = await chrome.scripting.executeScript({ target, func: copyInPage, args: [dataUrl] }).catch(() => []);
    if (copied) return trimmed(target, res, t('Copied the trimmed image ({w} × {h} px).', size));
    await save(dataUrl, name);
    return trimmed(target, res, t('This page doesn’t allow copying, so the image was saved instead.'));
  }
  await save(dataUrl, name);
  trimmed(target, res, t('Saved the trimmed image ({w} × {h} px).', size));
}

// From the worker first (it can reach any site). If the server says no, the page tries
// itself, since it has the site's cookies (pictures behind a login).
// Also returns the file's name: the one the server gives it, else the address it was loaded from.
async function loadImage(src, target) {
  try {
    const r = await fetch(src, { credentials: 'include' });
    if (r.ok) return { blob: await r.blob(), name: serverName(r) };
  } catch (e) { /* try the page */ }
  if (!target) throw new Error(t('Couldn’t load this picture.'));
  const [{ result } = {}] = await chrome.scripting.executeScript({ target, func: fetchInPage, args: [src] }).catch(() => []);
  if (!result) throw new Error(t('Couldn’t load this picture.'));
  return { blob: await (await fetch(result)).blob(), name: src };
}

// A download link like /download/123 usually names the file in a header or redirects to it.
function serverName(r) {
  const header = r.headers.get('content-disposition') || '';
  const m = header.match(/filename\*=UTF-8''([^;]+)/i) || header.match(/filename="?([^";]+)"?/i);
  if (!m) return r.url;
  try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; }
}

function save(dataUrl, name) {
  return chrome.downloads.download({ url: dataUrl, filename: EdgeTrim.outputName(name), conflictAction: 'uniquify' });
}

// ---------- trimmed pictures, for the one-time support card (lib/support-ask.js) ----------

// Written here only, one after another, so the popup and a right-click can't lose a count.
let statsWrite = Promise.resolve();
function countTrim(res) {
  statsWrite = statsWrite.then(async () => {
    const { trimStats: s = { pictures: 0, pixels: 0, days: 0, lastDay: '' } } = await chrome.storage.local.get('trimStats');
    const day = new Date().toLocaleDateString('sv'); // 2026-11-09, in the person's own time zone
    s.pictures++;
    s.pixels += Math.max(0, res.before.w * res.before.h - res.box.w * res.box.h);
    if (s.lastDay !== day) { s.days++; s.lastDay = day; }
    await chrome.storage.local.set({ trimStats: s });
  }).catch(() => {});
  return statsWrite;
}
// shown: one more time it appeared; done: any click on it, for good.
function markAsk(change) {
  statsWrite = statsWrite.then(async () => {
    const { supportAsk: a = { shown: 0 } } = await chrome.storage.local.get('supportAsk');
    if (a.done) return;
    if (change.done) a.done = true;
    if (change.shown) a.shown = (a.shown || 0) + 1;
    await chrome.storage.local.set({ supportAsk: a });
  }).catch(() => {});
  return statsWrite;
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'count-trim' && msg.res?.before && msg.res?.box) countTrim(msg.res);
  if (msg?.type === 'support-ask') markAsk(msg);
});

// A picture trimmed by right-click or as it downloaded: counted, then the usual
// note, or, once it's due, the support card with the same note at its top.
async function trimmed(target, res, text) {
  await countTrim(res);
  const { trimStats, supportAsk } = await chrome.storage.local.get(['trimStats', 'supportAsk']);
  if (!target || !SupportAsk.due(trimStats, supportAsk)) return toast(target, text);
  const n = trimStats.pictures;
  const alipay = TrimI18n.lang.startsWith('zh');
  const card = {
    note: text,
    title: t('{n} pictures trimmed', { n }),
    lines: t('That’s {count} empty pixels gone. Nice!', { n: trimStats.pixels, count: trimStats.pixels.toLocaleString(TrimI18n.lang) }),
    intro: t('I make Edge Trim on my own, for free. Any support helps me keep giving it the care it deserves.'),
    tip: t('Send me any tip you like'),
    tipSub: t('No account needed'),
    donate: t('Support the creator'),
    more: t('More ways to pay in the extension popup'),
    share: t('Share with a friend'), shareSub: t('Copies the link'),
    review: t('Write a review'), reviewSub: t('In the Chrome Web Store'),
    gh: t('Or give it a star on GitHub'),
    once: t('You’ll only see this once.'),
    close: t('Close (it won’t come back)'),
    copied: t('The link is copied. Send it to someone who’d like it.'),
    photo: chrome.runtime.getURL('icons/support/filip.jpg'),
    logos: chrome.runtime.getURL(alipay ? 'icons/support/pay-logos-alipay-dark.svg' : 'icons/support/pay-logos-dark.svg'),
    logosAlt: alipay ? 'Alipay, Google Pay, Apple Pay, Visa, Mastercard' : 'Google Pay, Apple Pay, PayPal, Visa, Mastercard',
    kofi: alipay ? SupportAsk.ALIPAY : SupportAsk.KOFI, store: SupportAsk.STORE, github: SupportAsk.GITHUB,
    rtl: TrimI18n.rtl,
  };
  try {
    await chrome.scripting.executeScript({ target, func: showSupportCard, args: [card] });
    await markAsk({ shown: true });
  } catch (e) { toast(target, text); }
}

// ---------- pictures downloaded from any page ----------
// Reacts to the finished download, not to the site's button, so it works the same after
// a countdown or a captcha (which you still get through yourself, as always).

const TRIMMABLE = /\.(png|webp|avif|gif)$/i;

chrome.downloads.onChanged.addListener((delta) => {
  if (delta.state?.current === 'complete') trimDownload(delta.id).catch(() => {});
});

async function trimDownload(id) {
  const { autoTrim, faint } = await chrome.storage.local.get({ autoTrim: false, faint: 'exact' });
  if (!autoTrim) return;
  const [item] = await chrome.downloads.search({ id });
  // Our own saves (popup, right-click and the trimmed downloads) are left alone; JPEG has no transparency.
  if (!item?.exists || item.byExtensionId === chrome.runtime.id) return;
  if (!TRIMMABLE.test(item.filename) && !/^image\/(png|webp|avif|gif)$/.test(item.mime)) return;
  await TrimI18n.load();
  const target = await pageOf(item);
  const kept = t('Couldn’t trim this download, so it stays as it was.');

  const blob = await loadDownload(item, target);
  if (!blob) return toast(target, kept, true);
  if (await isAnimated(blob)) return toast(target, t('Animated picture, so it stays as it was.'));
  const res = await EdgeTrim.trimBlob(blob, faint).catch(() => null);
  if (res?.status === 'tight') return toast(target, t('Already tight, nothing to trim.'));
  if (res?.status !== 'trimmed') return toast(target, kept, true);

  // The original makes room first, so the trimmed picture gets its exact name in Downloads.
  const name = item.filename.split(/[\\/]/).pop();
  const [trimmedUrl, originalUrl] = await Promise.all([toDataUrl(res.blob), toDataUrl(blob)]);
  await chrome.downloads.removeFile(id);
  await chrome.downloads.erase({ id });
  try {
    await chrome.downloads.download({ url: trimmedUrl, filename: EdgeTrim.outputName(name), conflictAction: 'uniquify', saveAs: false });
  } catch (e) {
    // Never lose the download: the original goes back.
    await chrome.downloads.download({ url: originalUrl, filename: name, conflictAction: 'uniquify', saveAs: false });
    return toast(target, kept, true);
  }
  trimmed(target, res, t('Trimmed the downloaded picture ({w} × {h} px).', { w: res.box.w, h: res.box.h }));
}

// The tab the download came from: a blob: link only opens there, and it has the site's cookies.
async function pageOf(item) {
  const origin = (u) => { try { return new URL(u).origin; } catch (e) { return null; } };
  const from = [origin(item.referrer), origin(item.url)].filter((o) => o && o !== 'null');
  const tabs = (await chrome.tabs.query({})).filter((tab) => from.includes(origin(tab.url)));
  const tab = tabs.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))[0];
  return tab ? { tabId: tab.id, frameIds: [0] } : null;
}

// The downloaded file loaded once more: from the worker first, then from the page.
// Only the very same file counts, since a server can answer a second request with an
// error page or a different picture (a link that only works once).
async function loadDownload(item, target) {
  const url = item.finalUrl || item.url;
  const tries = [
    async () => (url.startsWith('blob:') ? null : (await fetch(url, { credentials: 'include' })).blob()),
    async () => {
      const [{ result } = {}] = target ? await chrome.scripting.executeScript({ target, func: fetchInPage, args: [url] }) : [];
      return result ? (await fetch(result)).blob() : null;
    },
  ];
  for (const load of tries) {
    const blob = await load().catch(() => null);
    if (blob && (item.fileSize < 0 || blob.size === item.fileSize)) return blob;
  }
  return null;
}

// Trimming keeps only the first frame, so animated GIF, WebP, AVIF and PNG stay as they are.
async function isAnimated(blob) {
  const head = new TextDecoder('latin1').decode(await blob.slice(0, 65536).arrayBuffer());
  const actl = head.indexOf('acTL'), idat = head.indexOf('IDAT');
  return (head.startsWith('GIF') && head.includes('NETSCAPE2.0'))
    || (head.slice(12, 16) === 'VP8X' && (head.charCodeAt(20) & 2) !== 0)
    || head.slice(8, 12) === 'avis'
    || (head.slice(1, 4) === 'PNG' && actl > 0 && (idat < 0 || actl < idat));
}

function toDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

// ---------- run inside the page (they can't use anything from this file) ----------

async function fetchInPage(src) {
  try {
    const blob = await (await fetch(src)).blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch (e) { return null; }
}

async function copyInPage(dataUrl) {
  try {
    // Built by hand: some pages block fetch() of data: URLs.
    const bytes = Uint8Array.from(atob(dataUrl.split(',')[1]), (c) => c.charCodeAt(0));
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': new Blob([bytes], { type: 'image/png' }) })]);
    return true;
  } catch (e) { return false; }
}

// Some pages don't let extensions in (chrome:// pages, the Web Store, the PDF viewer).
// There the note goes on the toolbar icon instead: a mark on it, the text on hover.
async function toast(target, text, isError) {
  try {
    if (!target) throw new Error('no page');
    await chrome.scripting.executeScript({ target, func: showToast, args: [text, !!isError] });
  } catch (e) {
    await chrome.action.setBadgeBackgroundColor({ color: isError ? '#d9534f' : '#3fa66b' });
    await chrome.action.setBadgeText({ text: isError ? '!' : '✓' });
    await chrome.action.setTitle({ title: text });
    // Cleared again by the next right-click trim if the worker stops before this runs.
    setTimeout(resetIcon, 4000);
  }
}

function resetIcon() {
  chrome.action.setBadgeText({ text: '' }).catch(() => {});
  chrome.action.setTitle({ title: chrome.i18n.getMessage('extName') }).catch(() => {});
}

function showToast(text, isError) {
  document.getElementById('edge-trim-toast')?.remove();

  // The note always stands out: the popup's light look on a dark page, the dark look on a light one.
  // The page's colour is the first solid background under the spot where the note appears
  // (then the body's, which fills the window on a short page). With none at all, the text
  // colour tells: light text, dark page. If anything goes wrong, the note stays dark, as before.
  const darkPage = (() => {
    try {
      const ctx = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true });
      const rgba = (color) => { // any CSS colour (rgb, oklch, lab…) -> [r, g, b, a], 0-255
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
        return ctx.getImageData(0, 0, 1, 1).data;
      };
      const brightness = ([r, g, b]) => r * 0.299 + g * 0.587 + b * 0.114;
      const under = [...document.elementsFromPoint(innerWidth / 2, innerHeight - 40), document.body, document.documentElement];
      const solid = under.filter(Boolean).map((el) => rgba(getComputedStyle(el).backgroundColor)).find((c) => c[3] > 128);
      return solid
        ? brightness(solid) < 128
        : brightness(rgba(getComputedStyle(document.body || document.documentElement).color)) >= 128;
    } catch (e) { return false; }
  })();

  const host = Object.assign(document.createElement('div'), { id: 'edge-trim-toast' });
  const shadow = host.attachShadow({ mode: 'closed' });
  shadow.innerHTML = `<style>
    div { --surface: oklch(0.225 0.010 290); --text: oklch(0.94 0.006 290); --line: oklch(0.36 0.014 290);
      --ok: oklch(0.86 0.13 150); --bad: oklch(0.72 0.16 22);
      position: fixed; z-index: 2147483647; left: 50%; bottom: 24px; transform: translate(-50%, 8px); opacity: 0;
      max-width: min(420px, calc(100vw - 32px)); padding: 10px 14px; border-radius: 10px;
      background: var(--surface); color: var(--text); border: 1px solid var(--line);
      font: 500 13px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif; box-shadow: 0 8px 24px oklch(0.1 0.01 290 / .45);
      display: flex; gap: 8px; align-items: center; transition: opacity .2s cubic-bezier(.25,1,.5,1), transform .2s cubic-bezier(.25,1,.5,1); }
    /* Same colours as the popup's light theme (popup.css). */
    div.light { --surface: oklch(0.985 0.003 290); --text: oklch(0.22 0.012 290); --line: oklch(0.83 0.012 290);
      --ok: oklch(0.55 0.15 150); --bad: oklch(0.55 0.19 25); }
    div.on { opacity: 1; transform: translate(-50%, 0); }
    i { flex: none; width: 8px; height: 8px; border-radius: 50%; background: ${isError ? 'var(--bad)' : 'var(--ok)'}; }
    @media (prefers-reduced-motion: reduce) { div { transition: none; } }
  </style><div role="status" dir="auto"><i></i><span></span></div>`;
  const box = shadow.querySelector('div');
  box.classList.toggle('light', darkPage);
  box.querySelector('span').textContent = text;
  document.documentElement.append(host);
  requestAnimationFrame(() => box.classList.add('on'));
  setTimeout(() => { box.classList.remove('on'); setTimeout(() => host.remove(), 250); }, 2800);
}


// The support card, bottom right, always dark (it has its own place, apart from the note).
// It goes by itself after 30 s untouched (counted as shown); any click ends it for good.
function showSupportCard(c) {
  document.getElementById('edge-trim-ask')?.remove();
  document.getElementById('edge-trim-toast')?.remove();
  const host = Object.assign(document.createElement('div'), { id: 'edge-trim-ask' });
  const shadow = host.attachShadow({ mode: 'closed' });
  const ICON = {
    heart: '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 13.5S2 10 2 6a3 3 0 0 1 6-1 3 3 0 0 1 6 1c0 4-6 7.5-6 7.5Z" fill="currentColor"/></svg>',
    share: '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 10V2M5 5l3-3 3 3M3.5 8v5.5h9V8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    star: '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.6l1.95 4.02 4.43.62-3.22 3.1.78 4.4L8 11.65l-3.94 2.09.78-4.4L1.62 6.24l4.43-.62L8 1.6Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    github: '<svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>',
    close: '<svg width="10" height="10" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3 3 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  };
  shadow.innerHTML = `<style>
    .card { all: initial; position: fixed; z-index: 2147483647; right: 20px; bottom: 20px; box-sizing: border-box;
      width: min(310px, calc(100vw - 32px)); max-height: calc(100vh - 40px); overflow: auto;
      display: flex; flex-direction: column; gap: 10px; padding: 12px 12px 10px; border-radius: 14px;
      background: oklch(0.2 0.01 290 / .97); color: #fff; border: 1px solid oklch(0.36 0.014 290);
      font: 500 13px/1.3 system-ui, -apple-system, "Segoe UI", sans-serif; box-shadow: 0 16px 40px -10px rgba(0,0,0,.55);
      opacity: 0; transform: translateY(10px); transition: opacity .3s cubic-bezier(.25,1,.5,1), transform .3s cubic-bezier(.25,1,.5,1); }
    .card.on { opacity: 1; transform: none; }
    .card * { box-sizing: border-box; }
    a, button { font: inherit; color: #fff; text-decoration: none; cursor: pointer; }
    svg { flex: none; }
    .note { display: flex; align-items: center; gap: 8px; padding: 0 26px 9px 2px; border-bottom: 1px solid rgba(255,255,255,.1); font-size: 12px; color: rgba(255,255,255,.8); }
    .note i { flex: none; width: 8px; height: 8px; border-radius: 50%; background: oklch(0.86 0.13 150); }
    .x { position: absolute; top: 8px; inset-inline-end: 8px; display: grid; place-items: center; width: 24px; height: 24px; padding: 0; border: 0; border-radius: 7px; background: transparent; color: rgba(255,255,255,.6); }
    .x:hover { background: rgba(255,255,255,.14); color: #fff; }
    .hello { display: flex; flex-direction: column; gap: 3px; }
    .hello strong { font-size: 14.5px; font-weight: 700; }
    .hello span { font-size: 12px; color: rgba(255,255,255,.72); line-height: 1.45; }
    .intro { margin: 0; padding-top: 10px; border-top: 1px solid rgba(255,255,255,.12); font-size: 12px; color: rgba(255,255,255,.72); line-height: 1.45; }
    .tile { display: flex; flex-direction: column; gap: 10px; padding: 11px; border-radius: 10px; background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.12); }
    .who { display: flex; align-items: center; gap: 10px; }
    .who img { flex: none; width: 38px; height: 38px; border-radius: 50%; object-fit: cover; box-shadow: 0 0 0 2px rgba(255,255,255,.14); }
    .who div { display: flex; flex-direction: column; gap: 1px; line-height: 1.3; }
    .who strong { font-weight: 650; font-size: 13.5px; }
    .who span { font-size: 11.5px; color: rgba(255,255,255,.65); }
    .logos { display: block; width: 200px; max-width: 100%; height: auto; }
    .main { display: flex; align-items: center; justify-content: center; gap: 7px; padding: 9px 12px; border-radius: 8px; background: #7c3aed; font-weight: 650; font-size: 13.5px; }
    .main:hover { background: #8b5cf6; }
    .more { font-size: 11px; color: rgba(255,255,255,.6); }
    .minor { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .minor > * { display: flex; align-items: center; gap: 8px; padding: 8px 9px; border: 0; border-radius: 9px; background: rgba(255,255,255,.1); text-align: start; }
    .minor > *:hover { background: rgba(255,255,255,.18); }
    .minor svg { color: rgba(255,255,255,.7); }
    .minor div { display: flex; flex-direction: column; line-height: 1.25; min-width: 0; }
    .minor b { font-weight: 600; font-size: 12.5px; }
    .minor small { font-size: 10.5px; color: rgba(255,255,255,.55); }
    .gh { display: inline-flex; align-items: center; justify-content: center; gap: 6px; align-self: center; padding: 2px 8px; color: rgba(255,255,255,.65); font-size: 11.5px; text-decoration: underline; text-decoration-color: rgba(255,255,255,.3); text-underline-offset: 3px; }
    .gh:hover { color: #fff; text-decoration-color: currentColor; }
    .once { margin: -2px 0 0; text-align: center; font-size: 10.5px; color: rgba(255,255,255,.5); }
    .thanks { display: flex; align-items: center; gap: 8px; padding: 2px 24px 2px 2px; font-size: 12.5px; }
    @media (prefers-reduced-motion: reduce) { .card { transition: none; } }
  </style>`;
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; };
  const card = el('div', 'card');
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', c.donate);
  if (c.rtl) card.dir = 'rtl';
  let timer = 0;
  const leave = () => { clearTimeout(timer); card.classList.remove('on'); setTimeout(() => host.remove(), 300); };
  const later = () => { clearTimeout(timer); timer = setTimeout(() => (card.matches(':hover') ? later() : leave()), 30000); };
  const end = () => { try { chrome.runtime.sendMessage({ type: 'support-ask', done: true }); } catch (e) { /* the extension was reloaded */ } };
  const link = (cls, href) => {
    const a = el('a', cls);
    Object.assign(a, { href, target: '_blank', rel: 'noopener' });
    a.addEventListener('click', () => { end(); leave(); });
    return a;
  };
  const two = (big, small, tagBig = 'b', tagSmall = 'small') => { const d = el('div'); d.append(el(tagBig, '', big), el(tagSmall, '', small)); return d; };

  const close = el('button', 'x');
  close.innerHTML = ICON.close;
  close.title = c.close;
  close.setAttribute('aria-label', c.close);
  close.addEventListener('click', () => { end(); leave(); });
  const note = el('div', 'note');
  note.append(el('i'), el('span', '', c.note));
  const hello = el('div', 'hello');
  hello.append(el('strong', '', c.title), el('span', '', c.lines));
  const tile = el('div', 'tile');
  const who = el('div', 'who');
  const photo = Object.assign(el('img'), { src: c.photo, width: 38, height: 38, alt: '' });
  photo.addEventListener('error', () => photo.remove()); // a page that blocks it: the card works without
  who.append(photo, two(c.tip, c.tipSub, 'strong', 'span'));
  const logos = Object.assign(el('img', 'logos'), { src: c.logos, alt: c.logosAlt });
  logos.addEventListener('error', () => logos.remove());
  const main = link('main', c.kofi);
  main.innerHTML = ICON.heart;
  main.append(c.donate);
  tile.append(who, logos, main, el('span', 'more', c.more));
  const minor = el('div', 'minor');
  const share = el('button');
  share.innerHTML = ICON.share;
  share.append(two(c.share, c.shareSub));
  share.addEventListener('click', async () => {
    end();
    let ok = true;
    try { await navigator.clipboard.writeText(c.store); } catch (e) { ok = false; }
    const thanks = el('div', 'thanks');
    thanks.innerHTML = ICON.share;
    thanks.append(ok ? c.copied : c.store);
    card.replaceChildren(close, thanks);
    timer = setTimeout(leave, 4000);
  });
  const review = link('', c.store + '/reviews');
  review.innerHTML = ICON.star;
  review.append(two(c.review, c.reviewSub));
  minor.append(share, review);
  const gh = link('gh', c.github);
  gh.innerHTML = ICON.github;
  gh.append(c.gh);
  card.append(close, note, hello, el('p', 'intro', c.intro), tile, minor, gh, el('p', 'once', c.once));
  card.addEventListener('mouseleave', later);
  shadow.append(card);
  document.documentElement.append(host);
  requestAnimationFrame(() => card.classList.add('on'));
  later();
}
