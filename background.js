// Edge Trim: the background worker. Right-click a picture on a page -> trim it, then copy or save it.
// With "Trim downloaded pictures" on, pictures downloaded from any page are trimmed too.

importScripts('lib/i18n.js', 'lib/locales.js', 'lib/trim.js', 'lib/whats-new.js');
const t = TrimI18n.t;

// The menu is rebuilt in the new language when it changes in the popup.
async function createMenus() {
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
    if (copied) return toast(target, t('Copied the trimmed image ({w} × {h} px).', size));
    await save(dataUrl, name);
    return toast(target, t('This page doesn’t allow copying, so the image was saved instead.'));
  }
  await save(dataUrl, name);
  toast(target, t('Saved the trimmed image ({w} × {h} px).', size));
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
  toast(target, t('Trimmed the downloaded picture ({w} × {h} px).', { w: res.box.w, h: res.box.h }));
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
  </style><div role="status"><i></i><span></span></div>`;
  const box = shadow.querySelector('div');
  box.classList.toggle('light', darkPage);
  box.querySelector('span').textContent = text;
  document.documentElement.append(host);
  requestAnimationFrame(() => box.classList.add('on'));
  setTimeout(() => { box.classList.remove('on'); setTimeout(() => host.remove(), 250); }, 2800);
}
