// ink-doodle.js: Hand-drawn ink primitives, 8 fps line-boil, write-on marker lettering,
// thought clouds, arrows, and cover-fit Ken Burns image-plate camera with K-table POI mapping.
// Exposes window.INK. Pure function of (shape, seed, boil frame, progress) so any frame seeks cleanly.
(function (root) {
  'use strict';

  const C = {
    orange: '#F5820D', cobalt: '#2D5FBF', green: '#3A9E3A', yellow: '#F5C518', red: '#D94040',
    brown: '#8B5E3C', sky: '#6EB5E8', tan: '#C4965A', white: '#FFFFFF', night: '#1F2D52',
    grey: '#9AA3B0', skin: '#FFFFFF', ink: '#161616',
  };

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = (p) => 1 - Math.pow(1 - clamp(p), 3);
  const smooth = (p) => { const u = clamp(p); return u * u * (3 - 2 * u); };

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Line boil: strokes re-jitter 8 times a second across 3 boil states, deterministic in t.
  let BOIL = 0;
  const setBoil = (t) => { BOIL = Math.floor(t * 8) % 3; };

  function wobble(pts, seed, amp = 2.2) {
    const r = rng(seed * 7919 + BOIL * 104729 + 1);
    const p1 = r() * 6.28, p2 = r() * 6.28, f1 = 0.02 + r() * 0.02, f2 = 0.06 + r() * 0.03;
    const out = [];
    let d = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const L = Math.hypot(x1 - x0, y1 - y0) || 1, n = Math.max(1, Math.ceil(L / 9));
      const nx = -(y1 - y0) / L, ny = (x1 - x0) / L;
      const last = i === pts.length - 2;
      for (let j = 0; j < (last ? n + 1 : n); j++) {
        const u = j / n, o = amp * (Math.sin(d * f1 + p1) * 0.7 + Math.sin(d * f2 + p2) * 0.3);
        out.push([x0 + (x1 - x0) * u + nx * o, y0 + (y1 - y0) * u + ny * o]);
        d += L / n;
      }
    }
    return out;
  }

  function path(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  }

  function trace(ctx, pts, p) {
    if (p <= 0 || pts.length < 2) return;
    let L = 0;
    const seg = [];
    for (let i = 1; i < pts.length; i++) {
      const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      seg.push(l); L += l;
    }
    let left = L * clamp(p);
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length && left > 0; i++) {
      const u = Math.min(1, left / (seg[i - 1] || 1));
      ctx.lineTo(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * u,
                 pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * u);
      left -= seg[i - 1];
    }
    ctx.stroke();
  }

  function shape(ctx, pts, { fill = null, w = 6, color = C.ink, p = 1, seed = 1, amp = 2.2, closed = true } = {}) {
    if (p <= 0) return;
    const src = closed ? [...pts, pts[0]] : pts;
    const wp = wobble(src, seed, amp);
    if (fill) {
      ctx.save();
      ctx.globalAlpha *= clamp((p - 0.25) / 0.45);
      ctx.fillStyle = fill;
      path(ctx, wp);
      ctx.fill();
      ctx.restore();
    }
    if (w > 0) {
      ctx.lineWidth = w; ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      trace(ctx, wp, ease(p * 1.15));
    }
  }

  const line = (ctx, x0, y0, x1, y1, o = {}) => shape(ctx, [[x0, y0], [x1, y1]], { ...o, closed: false });
  const poly = (ctx, pts, o = {}) => shape(ctx, pts, { ...o, closed: false });

  function ellipsePts(cx, cy, rx, ry, a0 = -1.9, turns = 1.04, n = 56) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + (i / n) * Math.PI * 2 * turns;
      pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
    }
    return pts;
  }

  const circle = (ctx, cx, cy, r, o = {}) => shape(ctx, ellipsePts(cx, cy, r, r), { ...o, closed: false });
  const ellipse = (ctx, cx, cy, rx, ry, o = {}) => shape(ctx, ellipsePts(cx, cy, rx, ry), { ...o, closed: false });
  const rect = (ctx, x, y, w, h, o = {}) => shape(ctx, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], o);
  function dot(ctx, x, y, r, color = C.ink) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }

  /** ALL CAPS marker lettering that writes on left-to-right, anchored by full width so it never shifts. */
  function marker(ctx, text, x, y, { size = 88, font = 'Marker, Impact, Arial Black, sans-serif', color = C.ink, outline = null, p = 1, tilt = -0.015 } = {}) {
    if (p <= 0) return;
    text = String(text).toUpperCase();
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    ctx.font = `800 ${size}px ${font}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const full = ctx.measureText(text).width;
    const s = text.slice(0, Math.ceil(text.length * clamp(p)));
    if (outline) {
      ctx.lineWidth = size * 0.14; ctx.strokeStyle = outline; ctx.lineJoin = 'round';
      ctx.strokeText(s, -full / 2, 0);
    }
    ctx.fillStyle = color;
    ctx.fillText(s, -full / 2, 0);
    ctx.restore();
  }

  /** Classic thought cloud with trailing bubbles toward (tx, ty). */
  function thought(ctx, x, y, w, h, tx, ty, { p = 1, seed = 5, fill = C.white } = {}) {
    const pts = [], n = 90, bumps = 9;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2, b = 1 + 0.09 * Math.abs(Math.sin(a * bumps / 2));
      pts.push([x + Math.cos(a) * w / 2 * b, y + Math.sin(a) * h / 2 * b]);
    }
    for (let k = 0; k < 3; k++) {
      const u = 0.25 + k * 0.25;
      circle(ctx, x + (tx - x) * (0.55 + u * 0.5), y + h / 2 * 0.6 + (ty - y - h / 2 * 0.6) * u,
             18 - k * 5, { fill, p: clamp(p * 3 - k), seed: seed + k, w: 5 });
    }
    shape(ctx, pts, { fill, p, seed, w: 6, closed: false });
  }

  /** Labelled diagonal arrow pointing at (x, y) from (fx, fy). */
  function arrow(ctx, fx, fy, x, y, label, { p = 1, color = C.ink, seed = 9, size = 54 } = {}) {
    line(ctx, fx, fy, x, y, { p, seed, w: 7, color });
    const a = Math.atan2(y - fy, x - fx), h = 30;
    if (p > 0.7) {
      const q = (p - 0.7) / 0.3;
      poly(ctx, [[x - Math.cos(a - 0.5) * h, y - Math.sin(a - 0.5) * h], [x, y],
                 [x - Math.cos(a + 0.5) * h, y - Math.sin(a + 0.5) * h]],
           { p: q, seed: seed + 1, w: 7, color });
    }
    if (label) marker(ctx, label, fx - Math.cos(a) * 20, fy - Math.sin(a) * 50, { size, color, p: clamp((p - 0.4) / 0.6) });
  }

  /**
   * Cover-fit image `im` to canvas (default 1920x1080) and move camera from `a` to `b` over [t0, t1].
   * `a` and `b` are `{z, x, y}` (zoom and focus point in image pixels, or normalized 0..1 when <= 1).
   * Clamps offsets so the frame never shows past the image edge. Returns a mapper `(px, py) => [sx, sy, scale]`.
   */
  function plate(ctx, im, t, t0, t1, a, b = a) {
    const W = ctx.canvas.width || 1920, H = ctx.canvas.height || 1080;
    const u = smooth((t - t0) / Math.max(1e-6, t1 - t0));
    const ax = a.x <= 1 && a.y <= 1 ? a.x * im.width : a.x;
    const ay = a.x <= 1 && a.y <= 1 ? a.y * im.height : a.y;
    const bx = b.x <= 1 && b.y <= 1 ? b.x * im.width : b.x;
    const by = b.x <= 1 && b.y <= 1 ? b.y * im.height : b.y;
    const z = a.z + (b.z - a.z) * u, fx = ax + (bx - ax) * u, fy = ay + (by - ay) * u;
    const s = Math.max(W / im.width, H / im.height) * z;
    const ox = Math.min(0, Math.max(W - im.width * s, W / 2 - fx * s));
    const oy = Math.min(0, Math.max(H - im.height * s, H / 2 - fy * s));
    ctx.drawImage(im, ox, oy, im.width * s, im.height * s);
    return (px, py) => {
      const ix = px <= 1 && py <= 1 ? px * im.width : px;
      const iy = px <= 1 && py <= 1 ? py * im.height : py;
      return [ox + ix * s, oy + iy * s, s];
    };
  }

  /** Additive radial light bloom; `color` is an rgba() template with 'A' placeholder, e.g. 'rgba(255,170,60,A)'. */
  function glow(ctx, x, y, r, color, a) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color.replace('A', String(clamp(a))));
    g.addColorStop(1, color.replace('A', '0'));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    ctx.restore();
  }

  /** Deterministic candle/lamp intensity in 0..1. */
  const flicker = (t, seed = 0) =>
    0.75 + 0.12 * Math.sin(t * 11 + seed) + 0.08 * Math.sin(t * 23.7 + seed * 2) + 0.05 * Math.sin(t * 5.3 + seed);

  root.INK = {
    C, clamp, ease, smooth, setBoil, wobble, shape, line, poly,
    ellipsePts, circle, ellipse, rect, dot, marker, thought, arrow,
    plate, glow, flicker,
  };
})(typeof window !== 'undefined' ? window : globalThis);
