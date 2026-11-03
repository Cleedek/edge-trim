# Edge Trim

[![License: GPL-3.0](https://img.shields.io/badge/license-GPL--3.0-7c3aed)](LICENSE)

A Chrome extension (also Arc, Edge, Brave) that crops transparent pictures right to the edge of what's in them. Made for cut-out photos and logos exported with too much empty space around them, which makes consistent positioning painful.

The code is public so anyone can check what the extension does. It is plain JavaScript with no build step and no dependencies: what you read here is exactly what runs in your browser. Same family as [Subtitle Overlay](https://github.com/Cleedek/subtitle-overlay).

## Use it

- **In the popup:** drop pictures, click to choose files, or paste a copied picture (⌘V / Ctrl+V). Each one gets Copy and Download; several at once get "Download all".
- **On a web page:** right-click a picture → *Trim and copy image* or *Trim and save image*. A small note at the bottom of the page says what happened.
- **On a download link:** right-click a site's "Download" link → *Trim and download linked image*. Handy when the picture on the page is a small or watermarked preview and the full one sits behind the link. The file keeps the name the site gives it. If the link leads to a page with a countdown first, there's no picture to trim yet: download as usual with *Trim downloaded pictures* on.
- **Add shadow** (popup, shows up under the trimmed pictures, off until you turn it on): a shadow made from each picture's own outline, added after trimming. The picture shows large with its shadow (with several, arrows on it go through them); the dots on it switch the background it sits on (white, grey, black, transparent), only for looking, since the file is always transparent. Start from one of five looks (Soft, Strong, Floating, Above, Side), drawn on your picture or, with several, on a plain grey bottle, and open *Advanced shadow settings* for the type (on a surface, floating, classic), where the light comes from, the colour (six to pick from, or a hex code), intensity, softness and distance. The previews follow every slider, and the large one stays in view while you scroll the settings. *Save to My shadows*, at the end of the settings, asks for a name and keeps the look as a tile under *My shadows* (up to five, each with a small x to remove it; the same name replaces it). Copy, Download and "Download all" then give the picture with its shadow, cropped to where the shadow ends; the large preview has its own *Download with shadow* and *Copy* under it, for the picture it shows, and they stay in view with it. The switch lasts while the popup is open, like the pictures; the look you picked is remembered. No AI: the shadow is drawn from the outline, on this computer.
- **Open in a tab** (popup link) for bigger batches.
- **Appearance** (popup, under the language): the same as the browser (default), dark, or light. The note on a web page doesn't follow it: it always takes the opposite look of the page under it, light on a dark page and dark on a light one, so it stands out.
- **Trim downloaded pictures** (popup switch, off by default): every PNG, WebP, AVIF or GIF you download from a website is replaced by a trimmed copy, with the "Nearly invisible pixels" setting you have chosen. It reacts to the finished download, not to the site's button, so it also works after a countdown or a captcha (which you still get through yourself). A note on the page says what happened.

The result is always a lossless PNG with the original name: `logo.png` stays `logo.png`, `photo.webp` becomes `photo.png`. If a file with that name is already in Downloads, the browser adds a number, for example `logo (1).png`.

**Fake transparency:** many stock and AI pictures have the grey-and-white checkerboard painted in as ordinary opaque pixels. When the picture's outer edge follows such a pattern, rows and columns holding nothing but the pattern are cut away too, with a 1 px safety margin. Pixels are never changed: the pattern left in the corners of the box stays.

## Nearly invisible pixels

| Choice | Counts as empty | For |
| --- | --- | --- |
| Keep (default) | only fully transparent pixels | an exact edge |
| Trim haze | under ~2% opacity (alpha ≤ 5) | haze left by background removal |
| Trim more | under ~10% opacity (alpha ≤ 25) | soft shadows and glow; can eat into the object's own soft edge |

## Limits

- SVG isn't supported (it's a vector), and animated GIF/WebP keep only the first frame.
- A shadow only knows the picture's outline, not the object's shape in 3D. "On a surface" puts the darkest part where the outline comes down lowest, which suits things photographed from the front; for something seen from above at an angle (a box from its corner) the contact with the ground is only approximate.
- JPEG has no transparency, so there's nothing to trim.
- The PNG is re-encoded by the browser, so embedded colour profiles and metadata are dropped.
- Copy from the right-click menu needs a secure (https) page; elsewhere the image is saved instead.
- **Trim downloaded pictures** has to load the picture once more from the same address (an extension can't read your Downloads folder). It only replaces the download when that second copy is byte for byte the same size as the file you got. Otherwise the download stays as it was, for example with links that work only once, or pictures a page hands over and then throws away right away. Animated pictures, JPEGs and pictures with nothing to trim stay as they are too. The trimmed copy always goes to the Downloads folder, even if you picked another folder for the original.

## Privacy

Everything is trimmed on this computer. Nothing is uploaded, no analytics, no accounts. The right-click menu downloads the picture from where the page already loads it, and "Trim downloaded pictures" loads a picture you just downloaded once more from the same address; that's why the extension asks for access to all sites (`<all_urls>`).

## Install while developing

1. Open `chrome://extensions` and turn on **Developer mode** (top right).
2. Click **Load unpacked** and choose this folder.
3. Pin the extension.

Icons: `icons/icon.svg` (128/48/32) and `icons/icon-small.svg` (16), rendered to PNG with headless Chrome.

Store images: templates in `store/src` (the real popup, with the cut-out photo from `store/src/photos`), saved as PNG to `store/images/<lang>` with `node store/render.mjs [lang]` (needs Google Chrome and puppeteer-core). The promo video: `store/video/render-all.sh` (needs ffmpeg too), from the scene in `store/src/video.html` and its timeline in `store/video/timeline.js`. What goes into the store form is in [CHROMEWEBSTORE.md](CHROMEWEBSTORE.md).

## Licence

[GPL-3.0](LICENSE). Made by [Cleedek](https://cleedek.com).
