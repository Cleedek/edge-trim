// The one-time "support the creator" card: after 100 trimmed pictures, on at
// least 3 different days (a batch of 60 at once isn't a habit yet). It shows at
// most 3 times, on the page after a right-click or download trim, or in the
// popup, and any click on it (the cross too) ends it for good.
// Shared by the background worker and the popup.
(function (root) {
  'use strict';

  const RULES = { pictures: 100, days: 3, times: 3 };
  const KOFI = 'https://ko-fi.com/cleedek';
  // Filip's own Stripe link with Alipay (CNY, any amount), in place of Ko-fi for Simplified Chinese.
  const ALIPAY = 'https://buy.stripe.com/7sYdRa1FleEm97lbVecQU00';
  const STORE = 'https://chromewebstore.google.com/detail/edge-trim/mmejeaonnkgpfofmkhognnkcelklobaj';
  const GITHUB = 'https://github.com/Cleedek/edge-trim';

  // trimStats: { pictures, pixels, days, lastDay }; supportAsk: { shown, done }
  function due(stats, ask) {
    const s = stats || {}, a = ask || {};
    return !a.done && (a.shown || 0) < RULES.times && (s.pictures || 0) >= RULES.pictures && (s.days || 0) >= RULES.days;
  }

  root.SupportAsk = { RULES, KOFI, ALIPAY, STORE, GITHUB, due };
})(globalThis);
