// Edge Trim: the background worker. Right-click a picture on a page -> trim it, then copy or save it.

importScripts('lib/i18n.js', 'lib/locales.js', 'lib/trim.js');
const t = TrimI18n.t;

// The menu is rebuilt in the new language when it changes in the popup.
async function createMenus() {
  await TrimI18n.load();
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({ id: 'copy', title: t('Trim and copy image'), contexts: ['image'] });
  chrome.contextMenus.create({ id: 'save', title: t('Trim and save image'), contexts: ['image'] });
}
chrome.runtime.onInstalled.addListener(createMenus);
chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && changes.uiLang) createMenus(); });

chrome.contextMenus.onClicked.addListener((info, tab) => {
  // Chrome leaves out the tab for some places the menu can open (not a normal web page).
  const target = tab?.id >= 0 ? { tabId: tab.id, frameIds: [info.frameId || 0] } : null;
  resetIcon();
  run(info.menuItemId, info.srcUrl, target).catch((e) => toast(target, e.message, true));
});

async function run(action, src, target) {
  await TrimI18n.load();
  const { faint } = await chrome.storage.local.get({ faint: 'exact' });
  const blob = await loadImage(src, target);
  let res;
  try { res = await EdgeTrim.trimBlob(blob, faint); }
  catch (e) { throw new Error(t('This file type can’t be trimmed.')); }
  if (res.status === 'empty') throw new Error(t('The picture is fully transparent, there’s nothing to keep.'));
  if (res.status === 'tight') return toast(target, t('Already tight, nothing to trim.'));

  const size = { w: res.box.w, h: res.box.h };
  const dataUrl = await toDataUrl(res.blob);
  if (action === 'copy' && target) {
    const [{ result: copied } = {}] = await chrome.scripting.executeScript({ target, func: copyInPage, args: [dataUrl] }).catch(() => []);
    if (copied) return toast(target, t('Copied the trimmed image ({w} × {h} px).', size));
    await save(dataUrl, src);
    return toast(target, t('This page doesn’t allow copying, so the image was saved instead.'));
  }
  await save(dataUrl, src);
  toast(target, t('Saved the trimmed image ({w} × {h} px).', size));
}

// From the worker first (it can reach any site). If the server says no, the page tries
// itself, since it has the site's cookies (pictures behind a login).
async function loadImage(src, target) {
  try {
    const r = await fetch(src, { credentials: 'include' });
    if (r.ok) return await r.blob();
  } catch (e) { /* try the page */ }
  if (!target) throw new Error(t('Couldn’t load this picture.'));
  const [{ result } = {}] = await chrome.scripting.executeScript({ target, func: fetchInPage, args: [src] }).catch(() => []);
  if (!result) throw new Error(t('Couldn’t load this picture.'));
  return (await fetch(result)).blob();
}

function save(dataUrl, src) {
  return chrome.downloads.download({ url: dataUrl, filename: EdgeTrim.trimmedName(src), conflictAction: 'uniquify' });
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
  const host = Object.assign(document.createElement('div'), { id: 'edge-trim-toast' });
  const shadow = host.attachShadow({ mode: 'closed' });
  shadow.innerHTML = `<style>
    div { position: fixed; z-index: 2147483647; left: 50%; bottom: 24px; transform: translate(-50%, 8px); opacity: 0;
      max-width: min(420px, calc(100vw - 32px)); padding: 10px 14px; border-radius: 10px;
      background: oklch(0.225 0.010 290); color: oklch(0.94 0.006 290); border: 1px solid oklch(0.36 0.014 290);
      font: 500 13px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif; box-shadow: 0 8px 24px oklch(0.1 0.01 290 / .45);
      display: flex; gap: 8px; align-items: center; transition: opacity .2s cubic-bezier(.25,1,.5,1), transform .2s cubic-bezier(.25,1,.5,1); }
    div.on { opacity: 1; transform: translate(-50%, 0); }
    i { flex: none; width: 8px; height: 8px; border-radius: 50%; background: ${isError ? 'oklch(0.72 0.16 22)' : 'oklch(0.86 0.13 150)'}; }
    @media (prefers-reduced-motion: reduce) { div { transition: none; } }
  </style><div role="status"><i></i><span></span></div>`;
  const box = shadow.querySelector('div');
  box.querySelector('span').textContent = text;
  document.documentElement.append(host);
  requestAnimationFrame(() => box.classList.add('on'));
  setTimeout(() => { box.classList.remove('on'); setTimeout(() => host.remove(), 250); }, 2800);
}
