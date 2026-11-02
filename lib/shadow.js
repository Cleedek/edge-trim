// Edge Trim: a shadow made from the picture's own outline, added after trimming.
// No AI and nothing uploaded: the outline is coloured, squashed, shifted and blurred on a canvas.
// Sizes are shares of the picture's own size, so a setting looks the same on a 300 px icon and a 4000 px photo.
// Needs lib/trim.js first (EdgeTrim.findBox). Uses OffscreenCanvas, so it runs in the popup and the background worker.
(function (root) {
  'use strict';

  // Ready-made looks. The colour isn't part of them: it stays as chosen.
  // light: where the light comes from on a 3 × 3 grid, x and y each -1, 0 or 1; 0, 0 is straight above.
  // intensity, softness and distance run from 0 to 100.
  const PRESETS = {
    soft: { type: 'ground', light: { x: 0, y: 0 }, intensity: 50, softness: 65, distance: 0 },
    hard: { type: 'ground', light: { x: -1, y: -1 }, intensity: 85, softness: 25, distance: 45 },
    floating: { type: 'float', light: { x: 0, y: 0 }, intensity: 50, softness: 55, distance: 40 },
    above: { type: 'drop', light: { x: 0, y: 0 }, intensity: 40, softness: 45, distance: 0 },
    side: { type: 'drop', light: { x: -1, y: -1 }, intensity: 45, softness: 40, distance: 40 },
  };

  // One layer: the part `src` of the outline (or of `image`, a mask of its own), stretched into `box`
  // (picture coordinates), blurred and faded.
  const part = (src, box, blur, alpha, image) => ({ src, box, blur, alpha, image, reach: blur });

  const LAYERS = {
    // Standing on a surface, seen from the front: a nearly black line where it touches, a soft pool
    // around its feet and, with light from one side, a shadow laid on the ground behind it.
    ground({ source, w, h, unit, intensity: I, softness: S, distance: D, lx, ly }) {
      const line = Math.max(2, unit * 0.01), depth = unit * (0.03 + 0.04 * S);
      const pool = footprint(source, depth * 0.4, depth * 0.6), contact = footprint(source, line, line * 0.5);
      const layers = [
        part(whole(pool), whole(pool), unit * (0.012 + 0.04 * S), I * 0.6, pool),
        part(whole(contact), whole(contact), unit * (0.002 + 0.006 * S), Math.min(1, I * 1.4), contact),
      ];
      // Light from straight above casts nothing further, and light from below doesn't reach a surface.
      if (D > 0 && ly <= 0 && (lx || ly)) {
        const length = D * 1.4;
        // Seen from the front, the ground is foreshortened: a shadow going back looks short, one going sideways doesn't.
        const rise = (ly < 0 ? 0.3 : 0.08) * length; // how far back it reaches, as a share of the height
        const lean = -lx * (ly < 0 ? 0.65 : 1.6) * length; // how far to the side the tip goes, same share
        const near = unit * (0.002 + 0.004 * S), far = unit * (0.01 + 0.06 * S) + h * rise * 0.08;
        layers.push({
          cast: true,
          // x' = x + lean·(h − y), y' = h − rise·(h − y): the bottom row stays put, the top goes back and to the side.
          matrix: [1, 0, -lean, rise, lean * h, h * (1 - rise)],
          box: { x: Math.min(0, lean * h), y: h * (1 - rise), w: w + Math.abs(lean * h), h: h * rise },
          blurs: [0, 1, 2, 3].map((k) => near + (far - near) * k / 3),
          fade: 0.7, alpha: I * 0.55, reach: far,
        });
      }
      return layers;
    },

    // Hovering above the surface: a soft, flattened shadow below it, fainter and softer the higher it floats.
    float({ w, h, unit, intensity: I, softness: S, distance: D, lx }) {
      const gap = h * (0.03 + 0.3 * D);
      const depth = unit * (0.025 + 0.03 * S) + gap * 0.12;
      const width = w * (0.95 - 0.25 * D);
      const cx = w / 2 - lx * gap * 0.5, cy = h + gap;
      const blur = unit * (0.008 + 0.035 * S) + gap * 0.15;
      const alpha = I * (1 - 0.45 * D);
      const all = { x: 0, y: 0, w, h };
      const flat = (fw, fh) => ({ x: cx - fw / 2, y: cy - fh / 2, w: fw, h: fh });
      return [
        part(all, flat(width * 0.75, depth * 0.7), blur * 0.45, alpha * 0.6),
        part(all, flat(width, depth), blur, alpha * 0.7),
      ];
    },

    // A flat drop shadow: away from the light, or evenly all around when the light is straight above.
    drop({ w, h, unit, intensity: I, softness: S, distance: D, lx, ly }) {
      const len = Math.hypot(lx, ly) || 1, off = D * unit * 0.12;
      const dx = -lx / len * off, dy = -ly / len * off;
      const blur = unit * (0.004 + 0.05 * S);
      const all = { x: 0, y: 0, w, h };
      return [
        part(all, { x: dx * 0.3, y: dy * 0.3, w, h }, blur * 0.25, I * 0.5),
        part(all, { x: dx, y: dy, w, h }, blur, I * 0.75),
      ];
    },
  };

  // The picture with its shadow: the canvas and where the picture sits in it (x, y).
  // trim: crop to the visible pixels, shadow included (for saving; the preview doesn't need it).
  function render(source, settings, { trim = false } = {}) {
    const w = source.width, h = source.height;
    const layers = (LAYERS[settings.type] || LAYERS.drop)({
      source, w, h, unit: Math.max(w, h),
      intensity: share(settings.intensity), softness: share(settings.softness), distance: share(settings.distance),
      lx: Math.sign(settings.light?.x || 0), ly: Math.sign(settings.light?.y || 0),
    });

    // The canvas grows to hold every layer with its blur, which fades out at about three times its radius.
    // The picture lands on whole pixels, so it is copied as it is, without resampling.
    let x0 = 0, y0 = 0, x1 = w, y1 = h;
    for (const l of layers) {
      const r = 3 * l.reach;
      x0 = Math.min(x0, l.box.x - r); y0 = Math.min(y0, l.box.y - r);
      x1 = Math.max(x1, l.box.x + l.box.w + r); y1 = Math.max(y1, l.box.y + l.box.h + r);
    }
    const ox = -Math.floor(x0), oy = -Math.floor(y0);
    const out = new OffscreenCanvas(Math.ceil(x1) + ox, Math.ceil(y1) + oy);
    const ctx = out.getContext('2d');
    if (share(settings.intensity) > 0) {
      const color = settings.color || '#000000', silhouette = tinted(source, color);
      for (const l of layers) (l.cast ? drawCast : drawPart)(ctx, l.image ? tinted(l.image, color) : silhouette, l, ox, oy);
    }
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
    ctx.drawImage(source, ox, oy);
    if (!trim) return { canvas: out, x: ox, y: oy };

    const image = ctx.getImageData(0, 0, out.width, out.height);
    const box = root.EdgeTrim.findBox(image.data, out.width, out.height, 0);
    const cut = new OffscreenCanvas(box.w, box.h);
    cut.getContext('2d').putImageData(image, -box.x, -box.y, box.x, box.y, box.w, box.h);
    return { canvas: cut, x: ox - box.x, y: oy - box.y };
  }

  function drawPart(ctx, silhouette, { src, box, blur, alpha }, ox, oy) {
    ctx.filter = blurFilter(blur);
    ctx.globalAlpha = alpha;
    ctx.drawImage(silhouette, src.x, src.y, src.w, src.h, box.x + ox, box.y + oy, box.w, box.h);
  }

  // A cast shadow is sharp and dark where it leaves the object, softer and fainter further away.
  // Canvas can't blur by distance, so the outline is cut into overlapping bands by height above the
  // ground; each band is laid down, blurred a little more than the one before, and added back.
  function drawCast(ctx, silhouette, { matrix, blurs, fade, alpha }, ox, oy) {
    const { width: w, height: h } = silhouette, { width, height } = ctx.canvas;
    const band = new OffscreenCanvas(w, h).getContext('2d');
    const laid = new OffscreenCanvas(width, height).getContext('2d');
    const sum = new OffscreenCanvas(width, height).getContext('2d');
    sum.globalCompositeOperation = 'lighter';
    const [a, b, c, d, e, f] = matrix, last = blurs.length - 1;
    blurs.forEach((blur, k) => {
      band.globalCompositeOperation = 'copy';
      band.drawImage(silhouette, 0, 0);
      band.globalCompositeOperation = 'destination-in';
      // Height above the ground: 0 at the bottom row, 1 at the top. The bands' weights add up to 1 everywhere.
      const g = band.createLinearGradient(0, h, 0, 0);
      for (let i = 0; i <= 16; i++) {
        const t = i / 16, weight = Math.max(0, 1 - Math.abs(t * last - k));
        g.addColorStop(t, `rgba(0,0,0,${weight * (1 - fade * t)})`);
      }
      band.fillStyle = g;
      band.fillRect(0, 0, w, h);
      laid.setTransform(1, 0, 0, 1, 0, 0);
      laid.clearRect(0, 0, width, height);
      laid.setTransform(a, b, c, d, e + ox, f + oy);
      laid.drawImage(band.canvas, 0, 0);
      sum.filter = blurFilter(blur);
      sum.drawImage(laid.canvas, 0, 0);
    });
    ctx.filter = 'none';
    ctx.globalAlpha = alpha;
    ctx.drawImage(sum.canvas, 0, 0);
  }

  // The outline in the shadow's colour, keeping every pixel's transparency (glass and hair cast lighter shadows).
  function tinted(source, color) {
    const ctx = new OffscreenCanvas(source.width, source.height).getContext('2d');
    ctx.drawImage(source, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, source.width, source.height);
    return ctx.canvas;
  }

  // Where the object touches the ground: under every column that comes down close to its lowest point,
  // a short stroke from `up` above that column's lowest pixel to `down` below it, fainter the higher the
  // column ends. Rails, handles and seats that end higher up leave nothing; a chair's back legs still do.
  function footprint(source, up, down) {
    const feet = lowest(source), { width: w, height: h } = source;
    const height = Math.ceil(h + down), reach = h * 0.28;
    const image = new ImageData(w, height);
    const px = new Uint32Array(image.data.buffer);
    for (let x = 0; x < w; x++) {
      const lift = feet[x] < 0 ? 1 : (h - 1 - feet[x]) / reach;
      if (lift >= 1) continue;
      // Black, with the alpha in the top byte (little-endian, like lib/trim.js).
      const pixel = Math.round(255 * (1 - lift) ** 1.5) << 24;
      const y1 = Math.min(height - 1, Math.round(feet[x] + down));
      for (let y = Math.max(0, Math.round(feet[x] - up)); y <= y1; y++) px[y * w + x] = pixel;
    }
    const ctx = new OffscreenCanvas(w, height).getContext('2d');
    ctx.putImageData(image, 0, 0);
    return ctx.canvas;
  }

  // For every column, the lowest pixel the object covers (at least half opaque), or -1. Kept per picture,
  // since a slider moves many times over the same one.
  const feetOf = new WeakMap();
  function lowest(source) {
    if (feetOf.has(source)) return feetOf.get(source);
    const { width: w, height: h } = source;
    const ctx = new OffscreenCanvas(w, h).getContext('2d', { willReadFrequently: true });
    ctx.drawImage(source, 0, 0);
    const px = new Uint32Array(ctx.getImageData(0, 0, w, h).data.buffer);
    const feet = new Int32Array(w).fill(-1);
    for (let x = 0; x < w; x++) {
      for (let y = h - 1; y >= 0; y--) if ((px[y * w + x] >>> 24) > 127) { feet[x] = y; break; }
    }
    feetOf.set(source, feet);
    return feet;
  }

  const whole = (image) => ({ x: 0, y: 0, w: image.width, h: image.height });
  const blurFilter = (r) => (r >= 0.5 ? `blur(${r}px)` : 'none');
  const share = (v) => Math.min(100, Math.max(0, Number(v) || 0)) / 100;

  // A first guess at the look from the picture alone (no AI): a flat graphic with few colours, like a logo,
  // gets "above"; anything with the many shades of a photo gets "soft", standing on a surface.
  function guess(source) {
    const k = Math.min(1, 200 / Math.max(source.width, source.height));
    const w = Math.max(1, Math.round(source.width * k)), h = Math.max(1, Math.round(source.height * k));
    const ctx = new OffscreenCanvas(w, h).getContext('2d', { willReadFrequently: true });
    ctx.drawImage(source, 0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h).data;
    const counts = new Map();
    let solid = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 250) continue;
      solid++;
      const key = (d[i] >> 4) << 8 | (d[i + 1] >> 4) << 4 | d[i + 2] >> 4;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    // How much of the picture its six most common colours cover.
    const flat = solid ? [...counts.values()].sort((a, b) => b - a).slice(0, 6).reduce((s, n) => s + n, 0) / solid : 0;
    return { preset: flat > 0.6 ? 'above' : 'soft', flat };
  }

  root.EdgeShadow = { PRESETS, render, guess };
})(globalThis);
