// Edge Trim: finds where the visible pixels end and crops the picture to that box.
// Shared by the popup and the background worker (both have OffscreenCanvas).
(function (root) {
  'use strict';

  // The most opaque a pixel can be (alpha 0-255) and still count as empty.
  // light ≈ under 2 % (haze left by background removal), strong ≈ under 10 % (soft shadows, glow).
  const FAINT = { exact: 0, light: 5, strong: 25 };

  // The box around every pixel more opaque than `faint`, or null when none is.
  // `isEmpty(p)` can mark more pixels as empty (a painted-in checkerboard).
  function findBox(data, width, height, faint, isEmpty) {
    // One 32-bit number per pixel; on little-endian machines (all of Chrome's) alpha is the top byte.
    const px = new Uint32Array(data.buffer, data.byteOffset, width * height);
    const solid = (x, y) => (px[y * width + x] >>> 24) > faint && !(isEmpty && isEmpty(y * width + x));
    const rowHas = (y, x0, x1) => { for (let x = x0; x <= x1; x++) if (solid(x, y)) return true; return false; };
    const colHas = (x, y0, y1) => { for (let y = y0; y <= y1; y++) if (solid(x, y)) return true; return false; };

    let top = 0;
    while (top < height && !rowHas(top, 0, width - 1)) top++;
    if (top === height) return null;
    let bottom = height - 1;
    while (!rowHas(bottom, 0, width - 1)) bottom--;
    let left = 0;
    while (!colHas(left, top, bottom)) left++;
    let right = width - 1;
    while (!colHas(right, top, bottom)) right--;
    return { x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
  }

  // ---------- fake transparency: a checkerboard painted into the picture ----------
  // Stock and AI pictures often come with the grey-and-white "transparent" pattern drawn
  // in as ordinary opaque pixels. Rows and columns that hold nothing but that pattern are
  // cut away like empty ones. The pixels themselves are never changed.

  const TOL = 12; // per colour channel, for finding the pattern; leaves room for JPEG noise
  const near = (d, i, c, tol = TOL) => Math.abs(d[i] - c[0]) <= tol && Math.abs(d[i + 1] - c[1]) <= tol && Math.abs(d[i + 2] - c[2]) <= tol;

  // Square size and grid offset along one line of pixels, from where the two colours swap.
  function gridFrom(d, idx, n, a, b) {
    const cls = [];
    for (let k = 0; k < n; k++) {
      const i = idx(k);
      cls.push(d[i + 3] < 255 ? -1 : near(d, i, a) ? 0 : near(d, i, b) ? 1 : -1);
    }
    const swaps = [];
    let prev = -1, prevAt = -1;
    for (let k = 0; k < n; k++) {
      if (cls[k] < 0) continue;
      if (prev >= 0 && cls[k] !== prev && k - prevAt <= 3) swaps.push((k + prevAt + 1) / 2);
      prev = cls[k]; prevAt = k;
    }
    if (swaps.length < 3) return null;
    const size = (swaps[swaps.length - 1] - swaps[0]) / (swaps.length - 1);
    if (size < 4) return null;
    // Every swap has to sit on the grid, or this is just a two-coloured photo.
    if (swaps.some((s) => Math.abs((s - swaps[0]) / size - Math.round((s - swaps[0]) / size)) > 0.15)) return null;
    return { size, offset: swaps[0] };
  }

  // The checkerboard along the picture's edge, or null when there isn't one.
  function findChecker(d, w, h) {
    // Its two colours: the two most common opaque colours on the border.
    const counts = new Map();
    const border = [];
    for (let x = 0; x < w; x++) border.push(x, (h - 1) * w + x);
    for (let y = 1; y < h - 1; y++) border.push(y * w, y * w + w - 1);
    for (const p of border) {
      const i = p * 4;
      if (d[i + 3] < 255) continue;
      const key = (d[i] >> 3) << 10 | (d[i + 1] >> 3) << 5 | d[i + 2] >> 3;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const top = [...counts].sort((p, q) => q[1] - p[1]);
    if (top.length < 2) return null;
    const unpack = (k) => [((k >> 10) & 31) * 8 + 4, ((k >> 5) & 31) * 8 + 4, (k & 31) * 8 + 4];
    const a = unpack(top[0][0]);
    const b = top.map((e) => unpack(e[0])).find((c) => Math.max(...c.map((v, j) => Math.abs(v - a[j]))) > TOL);
    if (!b) return null;
    // The exact colours: the average of the border pixels close to each guess.
    for (const c of [a, b]) {
      const sum = [0, 0, 0];
      let n = 0;
      for (const p of border) {
        const i = p * 4;
        if (d[i + 3] === 255 && near(d, i, c)) { sum[0] += d[i]; sum[1] += d[i + 1]; sum[2] += d[i + 2]; n++; }
      }
      if (n) for (let j = 0; j < 3; j++) c[j] = Math.round(sum[j] / n);
    }
    // How much the pattern itself varies (0 in a PNG, a few levels in a JPEG). Only that much
    // difference counts as pattern later, so a near-white edge of the object is never taken for it.
    let noise = 0;
    for (const p of border) {
      const i = p * 4;
      if (d[i + 3] < 255) continue;
      for (const c of [a, b]) if (near(d, i, c)) for (let j = 0; j < 3; j++) noise = Math.max(noise, Math.abs(d[i + j] - c[j]));
    }
    const tol = Math.min(TOL, noise + 2);

    // The squares: measured along the top and left edges, a few pixels in (corners may be rounded).
    const row = Math.min(4, h - 1), col = Math.min(4, w - 1);
    const gx = gridFrom(d, (k) => (row * w + k) * 4, w, a, b) || gridFrom(d, (k) => ((h - 1 - row) * w + k) * 4, w, a, b);
    const gy = gridFrom(d, (k) => (k * w + col) * 4, h, a, b) || gridFrom(d, (k) => (k * w + w - 1 - col) * 4, h, a, b);
    if (!gx || !gy || Math.abs(gx.size - gy.size) > 1) return null;

    // Which colour comes first is whichever fits the border better; most of it has to fit.
    let best = null;
    for (const parity of [0, 1]) {
      const checker = { a, b, tol, size: (gx.size + gy.size) / 2, ox: gx.offset, oy: gy.offset, parity };
      let opaque = 0, fit = 0;
      for (const p of border) {
        if (d[p * 4 + 3] < 255) continue;
        opaque++;
        if (isBackground(d, w, checker, p)) fit++;
      }
      if (opaque && fit / opaque > 0.9 && (!best || fit > best.fit)) best = { checker, fit };
    }
    return best && best.checker;
  }

  function cellParity(c, x, y) {
    return (Math.floor((x - c.ox) / c.size) + Math.floor((y - c.oy) / c.size)) & 1;
  }

  // A pixel of the pattern: the colour its square should have, or, right on a square's
  // edge (blended when the picture was resized), anything between the two colours.
  function isBackground(d, w, c, p) {
    const i = p * 4;
    // Faint pixels can only be the soft edge of the picture's own (rounded) outline.
    if (d[i + 3] < 128) return true;
    const x = p % w, y = (p - x) / w;
    if (d[i + 3] === 255 && near(d, i, (cellParity(c, x, y) ^ c.parity) ? c.b : c.a, c.tol)) return true;
    const fx = (((x - c.ox) / c.size) % 1 + 1) % 1, fy = (((y - c.oy) / c.size) % 1 + 1) % 1;
    const onEdge = Math.min(fx, 1 - fx, fy, 1 - fy) * c.size < 1.5;
    // Semi-transparent pattern pixels: the soft edge of rounded corners around the picture.
    if (!onEdge && d[i + 3] === 255) return false;
    for (let j = 0; j < 3; j++) {
      const lo = Math.min(c.a[j], c.b[j]) - c.tol, hi = Math.max(c.a[j], c.b[j]) + c.tol;
      if (d[i + j] < lo || d[i + j] > hi) return false;
    }
    return true;
  }

  // Trims a picture file. Always returns a lossless PNG.
  // status: "trimmed", "tight" (nothing around it to cut) or "empty" (fully transparent).
  // checker: true when a painted-in checkerboard was cut away too.
  async function trimBlob(blob, faintLevel) {
    let bitmap;
    try { bitmap = await createImageBitmap(blob); }
    catch (e) { throw new Error('unsupported'); }
    const { width, height } = bitmap;
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const image = ctx.getImageData(0, 0, width, height);
    const pattern = findChecker(image.data, width, height);
    const isEmpty = pattern && ((p) => isBackground(image.data, width, pattern, p));
    let box = findBox(image.data, width, height, FAINT[faintLevel] ?? 0, isEmpty);
    // A 1 px safety margin on the pattern: when in doubt, keep a pixel rather than cut one.
    if (box && pattern) {
      const x0 = Math.max(0, box.x - 1), y0 = Math.max(0, box.y - 1);
      box = { x: x0, y: y0, w: Math.min(width, box.x + box.w + 1) - x0, h: Math.min(height, box.y + box.h + 1) - y0 };
    }
    const checker = !!pattern;
    const before = { w: width, h: height };
    if (!box) return { status: 'empty', before, checker };
    if (box.w === width && box.h === height) return { status: 'tight', before, box };

    const out = new OffscreenCanvas(box.w, box.h);
    // putImageData copies the pixels as they are: no scaling, no smoothing.
    out.getContext('2d').putImageData(image, -box.x, -box.y, box.x, box.y, box.w, box.h);
    return { status: 'trimmed', before, box, checker, blob: await out.convertToBlob({ type: 'image/png' }) };
  }

  // Keeps the original name; only the extension follows the format: "photo.png" stays
  // "photo.png", "photo.webp" becomes "photo.png" (the result is always a PNG).
  function outputName(source) {
    let base = String(source || '');
    try { base = decodeURIComponent(new URL(base).pathname.split('/').pop()); } catch (e) { /* a plain file name */ }
    base = base.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[\\/:*?"<>|]+/g, '-').trim().slice(0, 80) || 'image';
    return `${base}.png`;
  }

  root.EdgeTrim = { FAINT, findBox, findChecker, isBackground, trimBlob, outputName };
})(globalThis);
