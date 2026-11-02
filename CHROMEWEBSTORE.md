# Chrome Web Store Listing: Edge Trim

> Last Updated: 2026-11-02

Everything the Chrome Developer Dashboard asks for, ready to copy. Items marked **TODO** still need you.

## Store Listing

**Extension Name**
Edge Trim

**Short Description** (119 of 132 characters, same as `_locales/en/messages.json`)
Crop transparent pictures right to their edge: drop, paste or right-click a picture. Everything stays on your computer.

**Detailed Description** (plain text, the store strips formatting)

```
Edge Trim crops transparent pictures right to the edge of what's in them, so cut-out photos and logos stop carrying empty space around them.

FEATURES
• Trim in the toolbar popup: drop pictures, choose files, or paste a copied picture.
• Trim straight from a web page: right-click any picture and choose "Trim and copy image" or "Trim and save image".
• Trim several pictures at once and download them all with one click, or open Edge Trim in a tab for bigger batches.
• Choose how to treat nearly invisible pixels: keep them for an exact edge, trim faint haze left by background removal, or trim soft shadows and glow too.
• The result is always a lossless PNG named after the original, for example "logo-trimmed.png".
• Works with PNG, WebP, AVIF and GIF.
• Interface in English, Czech, Slovak, German, French, Spanish, Vietnamese and Simplified Chinese.

HOW TO USE
1. Click the Edge Trim icon in the toolbar.
2. Drop a picture into the box, click to choose one, or paste a copied picture.
3. Click Copy or Download next to the trimmed result.
Or right-click a picture on any web page and pick one of the two Edge Trim options.

PRIVACY
Every picture is trimmed on your computer. Nothing is uploaded, there are no analytics and no accounts. Edge Trim only remembers your two settings (how to treat nearly invisible pixels, and the interface language), stored in your browser.

PERMISSIONS
• "Read and change all your data on all websites": when you right-click a picture and choose an Edge Trim option, the extension loads that one picture from where the page already loads it and shows a short note on the page saying what happened. It does nothing on a page until you choose an Edge Trim option there.
• "Manage your downloads": to save the trimmed picture to your Downloads folder.

SUPPORT
Questions or bugs: TODO (support email or URL).
```

**Category**
TODO: pick in the dashboard. Closest fit is a photo or image tool category. (The template lists "Photos"; the dashboard's category names may have changed since, so check the list there.)

**Single Purpose**
Crops transparent images to the edge of their visible content.

**Primary Language**
English

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon | 128×128 PNG | ✅ Ready | `icons/icon128.png` |
| Screenshot 1 (required) | 1280×800 or 640×400 | ⬜ Not created | |
| Screenshot 2 | 1280×800 or 640×400 | ⬜ Not created | |
| Screenshot 3 | 1280×800 or 640×400 | ⬜ Not created | |
| Small Promo Tile | 440×280 | ⬜ Not created | |
| Marquee Promo Tile | 1400×560 | ⬜ Not created | |

### Screenshot Notes

1. The popup with two or three trimmed results, showing "before → after" sizes.
2. A web page with the right-click menu open on a picture, showing "Trim and copy image".
3. The "Nearly invisible pixels" setting with a picture that has haze around it, before and after.

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `contextMenus` | permissions | Adds "Trim and copy image" and "Trim and save image" to the right-click menu on pictures, the extension's main way to trim a picture from a web page. |
| `downloads` | permissions | Saves the trimmed picture to the user's Downloads folder when they click Download or "Download all" in the popup, or choose "Trim and save image". Also used when a page blocks copying, so the result is saved instead of lost. |
| `scripting` | permissions | After the user chooses an Edge Trim menu item on a picture, runs a small one-off script in that page to: copy the trimmed picture to the clipboard, load the picture with the page's own access when the server refuses a direct load (pictures behind a login), and show a short on-page note saying what happened. Nothing runs on a page unless the user picked the menu item there. |
| `storage` | permissions | Remembers two settings on this device: how to treat nearly invisible pixels and the interface language. |
| `<all_urls>` | host_permissions | Pictures on a page are very often served from a different site than the page itself (image hosts, CDNs). To trim the picture the user right-clicked, the extension must load it from wherever it is hosted, which can be any site. The picture is only loaded after the user picks an Edge Trim menu item on it, and it is processed locally; nothing is sent anywhere else. |

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|-----------|-----------|------------------------|---------|---------------------------|
| Personally identifiable info | No | No | | No |
| Health info | No | No | | No |
| Financial info | No | No | | No |
| Authentication info | No | No | | No |
| Personal communications | No | No | | No |
| Location | No | No | | No |
| Web history | No | No | | No |
| User activity | No | No | | No |
| Website content | No | No | The right-clicked picture is loaded and trimmed in the browser only; it is never sent to the developer or anyone else. | No |

Notes for the disclosure form:
- Settings use local browser storage only (not synced), so nothing goes to Google's servers.
- The only network request is loading the picture the user right-clicked, from the site that already hosts it.
- The "Support the creator" screen only shows payment links and QR codes. Opening one is the user's choice and goes to that payment service; the extension sends nothing.

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy

**Privacy Policy URL**
TODO: publish the text below at a public address (for example cleedek.com/edge-trim/privacy) and paste the link here. A `<all_urls>` permission makes the policy required, and a dead link is an automatic rejection.

```
Privacy Policy for Edge Trim

Last updated: 2026-11-02

Edge Trim does not collect, store or transmit any personal data or browsing information.

Pictures you trim, whether dropped, chosen, pasted or right-clicked on a web page, are processed entirely in your browser on your computer. They are never uploaded to the developer or any other service.

When you right-click a picture and choose an Edge Trim option, the extension loads that picture from the website that already hosts it, the same way the page itself does. No other requests are made.

Edge Trim stores two settings in your browser on this device: how to treat nearly invisible pixels and the interface language. Removing the extension deletes them.

Edge Trim does not use cookies, analytics, advertising or third-party services. The optional "Support the creator" screen contains links to payment services; they are only opened if you click them.

If this policy changes, the new version will be posted at this address with a new date.

Questions: TODO (email).
```

## Distribution

**Visibility**: Public
**Regions**: All regions

## Developer Info

**Publisher Name**: Cleedek
**Contact Email**: TODO (shown publicly on the listing, must be monitored)
**Support URL / Email**: TODO
**Homepage URL**: https://cleedek.com

## Packaging

The upload ZIP should contain only what the extension needs. From the project folder:

```bash
mkdir -p dist && rm -f dist/edge-trim.zip && zip -r dist/edge-trim.zip manifest.json background.js popup.html popup.css popup.js lib _locales icons -x "*.DS_Store" "icons/icon.svg" "icons/icon-small.svg"
```

`icons/support/*.svg` stays in (the support screen uses it). `dist/` is already in `.gitignore`.

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 0.1.0 | 2026-11-02 | First version. | Draft |

## Review Notes

### Known Issues / Limitations
- SVG isn't supported; animated GIF/WebP keep only the first frame.
- JPEG has no transparency, so there's nothing to trim.
- Colour profiles and metadata are dropped when the PNG is re-encoded.
- Copy from the right-click menu needs a secure (https) page; elsewhere the picture is saved instead.
- On pages extensions can't touch (browser settings pages, the Web Store, the PDF viewer), the result note shows on the toolbar icon instead of the page.
- `<all_urls>` brings a more thorough review. A narrower alternative (asking for site access only when needed) was considered but not tested.
- The support screen lists crypto wallet addresses (Solana, Sui). Not known whether reviewers question this; if they do, those two tabs can be removed.

### Rejection History
None yet.
