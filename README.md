# Edge Trim

[![License: GPL-3.0](https://img.shields.io/badge/license-GPL--3.0-7c3aed)](LICENSE)

A Chrome extension (also Arc, Edge, Brave) that crops transparent pictures right to the edge of what's in them. Made for cut-out photos and logos exported with too much empty space around them, which makes consistent positioning painful.

The code is public so anyone can check what the extension does. It is plain JavaScript with no build step and no dependencies: what you read here is exactly what runs in your browser. Same family as [Subtitle Overlay](https://github.com/Cleedek/subtitle-overlay).

## Use it

- **In the popup:** drop pictures, click to choose files, or paste a copied picture (⌘V / Ctrl+V). Each one gets Copy and Download; several at once get "Download all".
- **On a web page:** right-click a picture → *Trim and copy image* or *Trim and save image*. A small note at the bottom of the page says what happened.
- **Open in a tab** (popup link) for bigger batches.

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
- JPEG has no transparency, so there's nothing to trim.
- The PNG is re-encoded by the browser, so embedded colour profiles and metadata are dropped.
- Copy from the right-click menu needs a secure (https) page; elsewhere the image is saved instead.

## Privacy

Everything is trimmed on this computer. Nothing is uploaded, no analytics, no accounts. The right-click menu downloads the picture from where the page already loads it; that's why the extension asks for access to all sites (`<all_urls>`).

## Install while developing

1. Open `chrome://extensions` and turn on **Developer mode** (top right).
2. Click **Load unpacked** and choose this folder.
3. Pin the extension.

Icons: `icons/icon.svg` (128/48/32) and `icons/icon-small.svg` (16), rendered to PNG with headless Chrome.

## Licence

[GPL-3.0](LICENSE). Made by [Cleedek](https://cleedek.com).
