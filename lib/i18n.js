// Interface language, same as Snap Translate and Subtitle Overlay. The English text is the key:
// each file in lib/locales maps it to a translation, and anything without one stays in English.
// Only the language in use is loaded. Shared by the popup and the background worker.
(function (root) {
  'use strict';
  if (root.TrimI18n) return; // the page script can be added to a tab more than once

  // [code, name in its own language]; "auto" follows the browser. Same list as Subtitle Overlay.
  const LOCALES = [
    ['auto', ''], ['en', 'English'], ['id', 'Bahasa Indonesia'], ['ms', 'Bahasa Melayu'], ['cs', 'Čeština'],
    ['da', 'Dansk'], ['de', 'Deutsch'], ['es', 'Español'], ['tl', 'Filipino'], ['fr', 'Français'],
    ['hr', 'Hrvatski'], ['it', 'Italiano'], ['hu', 'Magyar'], ['nl', 'Nederlands'], ['no', 'Norsk'],
    ['pl', 'Polski'], ['pt', 'Português'], ['ro', 'Română'], ['sk', 'Slovenčina'], ['fi', 'Suomi'],
    ['sv', 'Svenska'], ['vi', 'Tiếng Việt'], ['tr', 'Türkçe'], ['el', 'Ελληνικά'], ['uk', 'Українська'],
    ['ar', 'العربية'], ['hi', 'हिन्दी'], ['th', 'ไทย'], ['ja', '日本語'], ['zh-CN', '简体中文'], ['zh-TW', '繁體中文'], ['ko', '한국어'],
  ];
  const RTL = new Set(['ar']);
  const dicts = {};
  let lang;
  let wanted = 0; // the newest language request wins if two overlap

  // A browser language like "de-AT" or "zh-TW" -> one we have.
  function match(code) {
    const c = String(code || '').toLowerCase();
    if (c.startsWith('zh')) return /tw|hk|mo|hant/.test(c) ? 'zh-TW' : 'zh-CN';
    const base = c.split('-')[0];
    const alias = { nb: 'no', nn: 'no', fil: 'tl' }[base] || base;
    return LOCALES.some((l) => l[0] === alias && alias !== 'auto') ? alias : 'en';
  }

  function resolve(choice) {
    return choice && choice !== 'auto' && LOCALES.some((l) => l[0] === choice)
      ? choice
      : match(root.chrome && chrome.i18n ? chrome.i18n.getUILanguage() : root.navigator && navigator.language);
  }

  // Until a language file is loaded, the browser's language is known but its text isn't (English shows);
  // lib/goodbye.js reads it right away.
  lang = resolve('auto');

  // Switches language once its text is here. If it can't be loaded, English shows.
  async function setLang(choice) {
    const code = resolve(choice);
    const mine = ++wanted;
    if (code !== 'en' && !dicts[code]) {
      try {
        const res = await fetch(chrome.runtime.getURL('lib/locales/' + code + '.json'));
        dicts[code] = await res.json();
      } catch (e) { /* stays in English */ }
    }
    if (mine === wanted) lang = dicts[code] || code === 'en' ? code : 'en';
    return lang;
  }

  async function load() {
    let uiLang;
    try { ({ uiLang } = await chrome.storage.local.get('uiLang')); } catch (e) { /* no storage here */ }
    return setLang(uiLang);
  }
  // Other parts of the extension follow a change made in the popup.
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.uiLang) setLang(changes.uiLang.newValue);
    });
  } catch (e) { /* no storage here */ }

  // vars fill {name} placeholders. A translation can be an object of plural
  // forms ({ one, few, many, other }), picked by vars.n.
  function t(en, vars) {
    let s = (dicts[lang] && dicts[lang][en]) || en;
    if (typeof s === 'object') {
      const n = vars ? Number(vars.n) : 0;
      let form = 'other';
      try { form = new Intl.PluralRules(lang).select(n); } catch (e) { /* keep "other" */ }
      s = s[form] || s.other;
    }
    if (!vars) return s;
    // In right-to-left text a Latin name or number keeps its own direction (isolates).
    const [open, close] = RTL.has(lang) ? ['⁨', '⁩'] : ['', ''];
    return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? open + vars[k] + close : m));
  }

  // Translates a static page in place: every text node, plus the title,
  // placeholder and aria-label attributes.
  function translatePage(rootEl) {
    const doc = rootEl.ownerDocument;
    doc.documentElement.lang = lang;
    doc.documentElement.dir = RTL.has(lang) ? 'rtl' : 'ltr';
    if (lang === 'en') return;
    const walker = doc.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const key = n.nodeValue.trim().replace(/\s+/g, ' ');
      if (!key) continue;
      const tr = t(key);
      if (tr !== key) n.nodeValue = n.nodeValue.match(/^\s*/)[0] + tr + n.nodeValue.match(/\s*$/)[0];
    }
    for (const el of rootEl.querySelectorAll('[title], [placeholder], [aria-label]')) {
      for (const a of ['title', 'placeholder', 'aria-label']) {
        const v = el.getAttribute(a);
        if (v) el.setAttribute(a, t(v));
      }
    }
  }

  root.TrimI18n = { LOCALES, load, setLang, t, translatePage, get lang() { return lang; }, get rtl() { return RTL.has(lang); } };
})(globalThis);
