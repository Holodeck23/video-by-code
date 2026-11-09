// harness.js: the H helper library (see lib/API.md section 2). Plain browser script, sets window.H.
// Points are [x, y] arrays. Functions that take points also accept {x, y} objects.
(function () {
  'use strict';
  const H = {};

  // ---------- randomness ----------
  function hashSeed(seed) {
    // Turns a number or string into a 32-bit integer seed (FNV-1a over the string form).
    const s = typeof seed === 'number' && Number.isInteger(seed) ? null : String(seed);
    if (s === null) return seed >>> 0;
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  H.rng = function (seed = 1) {
    let a = hashSeed(seed);
    const r = () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.range = (lo, hi) => lo + (hi - lo) * r();
    r.int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
    r.pick = (arr) => arr[Math.floor(r() * arr.length)];
    r.chance = (p) => r() < p;
    r.gauss = () => {
      const u = 1 - r(), v = r();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
    return r;
  };

  // Gradient noise on a seeded permutation table (Perlin "improved" construction).
  const noiseCache = new Map();
  H.noise = function (seed = 0) {
    const key = String(seed);
    if (noiseCache.has(key)) return noiseCache.get(key);
    const r = H.rng('noise:' + key);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const tmp = p[i]; p[i] = p[j]; p[j] = tmp; }
    const perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    const lerp = (a, b, t) => a + t * (b - a);
    const g2 = (h, x, y) => {
      switch (h & 7) {
        case 0: return x + y; case 1: return -x + y; case 2: return x - y; case 3: return -x - y;
        case 4: return x; case 5: return -x; case 6: return y; default: return -y;
      }
    };
    const g3 = (h, x, y, z) => {
      const k = h & 15, u = k < 8 ? x : y, v = k < 4 ? y : (k === 12 || k === 14 ? x : z);
      return ((k & 1) ? -u : u) + ((k & 2) ? -v : v);
    };
    function n2(x, y) {
      const X = Math.floor(x), Y = Math.floor(y), xf = x - X, yf = y - Y, xi = X & 255, yi = Y & 255;
      const u = fade(xf), v = fade(yf);
      const aa = perm[perm[xi] + yi], ab = perm[perm[xi] + yi + 1];
      const ba = perm[perm[xi + 1] + yi], bb = perm[perm[xi + 1] + yi + 1];
      const x1 = lerp(g2(aa, xf, yf), g2(ba, xf - 1, yf), u);
      const x2 = lerp(g2(ab, xf, yf - 1), g2(bb, xf - 1, yf - 1), u);
      return lerp(x1, x2, v) * 0.7071;
    }
    function n3(x, y, z) {
      const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z);
      const xf = x - X, yf = y - Y, zf = z - Z, xi = X & 255, yi = Y & 255, zi = Z & 255;
      const u = fade(xf), v = fade(yf), w = fade(zf);
      const A = perm[xi] + yi, AA = perm[A] + zi, AB = perm[A + 1] + zi;
      const B = perm[xi + 1] + yi, BA = perm[B] + zi, BB = perm[B + 1] + zi;
      return lerp(
        lerp(lerp(g3(perm[AA], xf, yf, zf), g3(perm[BA], xf - 1, yf, zf), u),
          lerp(g3(perm[AB], xf, yf - 1, zf), g3(perm[BB], xf - 1, yf - 1, zf), u), v),
        lerp(lerp(g3(perm[AA + 1], xf, yf, zf - 1), g3(perm[BA + 1], xf - 1, yf, zf - 1), u),
          lerp(g3(perm[AB + 1], xf, yf - 1, zf - 1), g3(perm[BB + 1], xf - 1, yf - 1, zf - 1), u), v), w);
    }
    function fbm(fn, oct, args) {
      let sum = 0, amp = 0.5, norm = 0, f = 1;
      for (let o = 0; o < oct; o++) {
        sum += amp * fn(...args.map((a) => a * f + o * 31.7));
        norm += amp; amp *= 0.5; f *= 2;
      }
      return sum / norm;
    }
    const api = {
      n2, n3,
      fbm2: (x, y, oct = 4) => fbm(n2, oct, [x, y]),
      fbm3: (x, y, z, oct = 4) => fbm(n3, oct, [x, y, z]),
    };
    noiseCache.set(key, api);
    return api;
  };

  // ---------- math and timing ----------
  H.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  H.lerp = (a, b, u) => a + (b - a) * u;
  H.invLerp = (a, b, v) => (a === b ? 0 : (v - a) / (b - a));
  H.remap = (v, a, b, c, d) => H.lerp(c, d, H.clamp(H.invLerp(a, b, v), 0, 1));
  H.smoothstep = (a, b, x) => { const u = H.clamp(H.invLerp(a, b, x), 0, 1); return u * u * (3 - 2 * u); };
  H.prog = (t, start, end) => (t <= start ? 0 : t >= end ? 1 : (t - start) / (end - start));

  H.ease = {
    linear: (u) => u,
    inQuad: (u) => u * u,
    outQuad: (u) => 1 - (1 - u) * (1 - u),
    inOutQuad: (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2),
    outCubic: (u) => 1 - Math.pow(1 - u, 3),
    inOutCubic: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
    outQuart: (u) => 1 - Math.pow(1 - u, 4),
    outExpo: (u) => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * u)),
    inOutSine: (u) => -(Math.cos(Math.PI * u) - 1) / 2,
    outBack: (u, s = 1.7) => 1 + (s + 1) * Math.pow(u - 1, 3) + s * Math.pow(u - 1, 2),
    outElastic: (u) => (u <= 0 ? 0 : u >= 1 ? 1 : Math.pow(2, -10 * u) * Math.sin((u * 10 - 0.75) * (2 * Math.PI / 3)) + 1),
  };

  H.shake = (t, seed = 0, amp = 1, freq = 8) => {
    const n = H.noise('shake:' + seed);
    return [n.fbm2(t * freq, 0.5, 2) * amp * 2, n.fbm2(0.5, t * freq + 40, 2) * amp * 2];
  };

  // ---------- colour ----------
  H.hex = (s) => {
    let h = String(s).replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h.slice(0, 6), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  H.rgba = (c, a = 1) => {
    const [r, g, b] = typeof c === 'string' ? H.hex(c) : c;
    return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;
  };
  H.mixRGB = (a, b, u) => {
    const A = typeof a === 'string' ? H.hex(a) : a, B = typeof b === 'string' ? H.hex(b) : b;
    return [H.lerp(A[0], B[0], u), H.lerp(A[1], B[1], u), H.lerp(A[2], B[2], u)];
  };

  // ---------- textures and finishing ----------
  const offCache = new Map();
  const makeCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  H.offscreen = (key, w, h, drawFn) => {
    const k = `${key}|${w}x${h}`;
    let c = offCache.get(k);
    if (!c) { c = makeCanvas(w, h); drawFn(c.getContext('2d'), w, h); offCache.set(k, c); }
    return c;
  };

  H.paperTexture = (w, h, opts = {}) => {
    const o = { seed: 1, tone: '#f4efe4', fiber: 0.5, grain: 0.5, blotch: 0.3, ...opts };
    const key = `paper:${o.seed}:${o.tone}:${o.fiber}:${o.grain}:${o.blotch}`;
    return H.offscreen(key, w, h, (ctx) => {
      const base = H.hex(o.tone), r = H.rng('paper:' + o.seed), n = H.noise('paper:' + o.seed);
      // 1. blotches: low-frequency fbm at 1/8 scale, smoothed up to full size.
      const sw = Math.ceil(w / 8), sh = Math.ceil(h / 8), small = makeCanvas(sw, sh), sctx = small.getContext('2d');
      const sim = sctx.createImageData(sw, sh);
      for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
        const v = n.fbm2(x / 40, y / 40, 4) * o.blotch * 0.22 + n.n2(x / 6, y / 6) * o.blotch * 0.03;
        const i = (y * sw + x) * 4;
        for (let c = 0; c < 3; c++) sim.data[i + c] = H.clamp(base[c] * (1 + v), 0, 255);
        sim.data[i + 3] = 255;
      }
      sctx.putImageData(sim, 0, 0);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(small, 0, 0, w, h);
      // 2. fine grain baked into the paper.
      if (o.grain > 0) {
        const im = ctx.getImageData(0, 0, w, h), d = im.data, amt = o.grain * 14;
        for (let i = 0; i < d.length; i += 4) {
          const g = (r() - 0.5) * amt;
          d[i] += g; d[i + 1] += g; d[i + 2] += g * 0.9;
        }
        ctx.putImageData(im, 0, 0);
      }
      // 3. fibres: short faint curved strokes, a mix of darker and lighter.
      const count = Math.round(w * h / 900 * o.fiber);
      ctx.lineCap = 'round';
      for (let i = 0; i < count; i++) {
        const x = r() * w, y = r() * h, len = 6 + r() * 22, ang = r() * Math.PI * 2, bend = (r() - 0.5) * 0.8;
        const dark = r() < 0.6;
        ctx.strokeStyle = dark ? H.rgba(H.mixRGB(base, [90, 75, 55], 0.5), 0.05 + r() * 0.07) : H.rgba([255, 255, 250], 0.08 + r() * 0.1);
        ctx.lineWidth = 0.4 + r() * 0.8;
        ctx.beginPath(); ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + Math.cos(ang + bend) * len * 0.5, y + Math.sin(ang + bend) * len * 0.5,
          x + Math.cos(ang) * len, y + Math.sin(ang) * len);
        ctx.stroke();
      }
    });
  };

  // Film grain: a 256 px tile made from H.rng(seed, frame index), pattern-filled at a per-frame offset.
  const TILE = 256, grainTiles = new Map();
  function grainTile(seed, frame, cell, mono) {
    const key = `${seed}:${frame}:${cell}:${mono}`;
    let c = grainTiles.get(key);
    if (c) return c;
    c = makeCanvas(TILE, TILE);
    const ctx = c.getContext('2d'), im = ctx.createImageData(TILE, TILE), d = im.data;
    const r = H.rng(`grain:${seed}:${frame}`), cells = Math.ceil(TILE / cell);
    for (let cy = 0; cy < cells; cy++) for (let cx = 0; cx < cells; cx++) {
      const a = r() * 255, b = mono ? a : r() * 255, g = mono ? a : r() * 255;
      for (let yy = cy * cell; yy < Math.min(TILE, cy * cell + cell); yy++) {
        let i = (yy * TILE + cx * cell) * 4;
        for (let xx = 0; xx < cell && cx * cell + xx < TILE; xx++, i += 4) { d[i] = a; d[i + 1] = b; d[i + 2] = g; d[i + 3] = 255; }
      }
    }
    ctx.putImageData(im, 0, 0);
    if (grainTiles.size > 48) grainTiles.delete(grainTiles.keys().next().value);
    grainTiles.set(key, c);
    return c;
  }
  H.grain = (ctx, t, opts = {}) => {
    const o = { strength: 0.06, cell: 2, seed: 1, fps: 30, mono: true, blend: 'overlay', ...opts };
    const frame = Math.floor(t * o.fps + 1e-6), cell = Math.max(1, Math.round(o.cell));
    const tile = grainTile(o.seed, frame, cell, o.mono);
    const r = H.rng(`grainoff:${o.seed}:${frame}`);
    const pat = ctx.createPattern(tile, 'repeat');
    pat.setTransform(new DOMMatrix([1, 0, 0, 1, Math.floor(r() * TILE), Math.floor(r() * TILE)]));
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = o.blend;
    ctx.globalAlpha = H.clamp(o.strength * 2.5, 0, 1);
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  };

  H.vignette = (ctx, opts = {}) => {
    const o = { strength: 0.35, color: '#000', inner: 0.55, ...opts };
    const w = ctx.canvas.width, h = ctx.canvas.height, R = Math.hypot(w, h) / 2;
    const c = H.hex(o.color);
    const g = ctx.createRadialGradient(w / 2, h / 2, R * o.inner, w / 2, h / 2, R);
    g.addColorStop(0, H.rgba(c, 0));
    g.addColorStop(0.5, H.rgba(c, o.strength * 0.35));
    g.addColorStop(1, H.rgba(c, o.strength));
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.restore();
  };

  // ---------- lines and shapes ----------
  const P = (p) => (Array.isArray(p) ? p : [p.x, p.y]);
  H.bezier = (p0, p1, p2, p3, n = 48) => {
    const [a, b, c, d] = [P(p0), P(p1), P(p2), P(p3)], out = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, m = 1 - t;
      const k0 = m * m * m, k1 = 3 * m * m * t, k2 = 3 * m * t * t, k3 = t * t * t;
      out.push([k0 * a[0] + k1 * b[0] + k2 * c[0] + k3 * d[0], k0 * a[1] + k1 * b[1] + k2 * c[1] + k3 * d[1]]);
    }
    return out;
  };
  H.pathLength = (pts) => {
    let L = 0;
    for (let i = 1; i < pts.length; i++) { const a = P(pts[i - 1]), b = P(pts[i]); L += Math.hypot(b[0] - a[0], b[1] - a[1]); }
    return L;
  };
  function pointAt(pts, dist) {
    // Point at arc length `dist`, plus the index of the segment it lies on.
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = P(pts[i - 1]), b = P(pts[i]), seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (acc + seg >= dist && seg > 0) { const u = (dist - acc) / seg; return { p: [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u], i }; }
      acc += seg;
    }
    return { p: P(pts[pts.length - 1]).slice(), i: pts.length - 1 };
  }
  H.resample = (pts, step) => {
    if (pts.length < 2) return pts.map((p) => P(p).slice());
    const L = H.pathLength(pts), n = Math.max(1, Math.round(L / step)), out = [];
    for (let k = 0; k <= n; k++) out.push(pointAt(pts, (L * k) / n).p);
    return out;
  };
  H.partial = (pts, u) => {
    if (pts.length < 2 || u >= 1) return pts.map((p) => P(p).slice());
    if (u <= 0) return [];
    const { p, i } = pointAt(pts, H.pathLength(pts) * u);
    const out = pts.slice(0, i).map((q) => P(q).slice());
    out.push(p);
    return out;
  };
  H.wobble = (pts, noise, opts = {}) => {
    const o = { amp: 1.5, freq: 0.012, seed: 0, ...opts };
    const n = noise || H.noise(o.seed);
    const q = pts.map(P), out = [];
    let s = 0;
    for (let i = 0; i < q.length; i++) {
      if (i > 0) s += Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]);
      const a = q[Math.max(0, i - 1)], b = q[Math.min(q.length - 1, i + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
      const off = n.fbm2(s * o.freq, o.seed * 7.31 + 0.5, 3) * o.amp * 2;
      out.push([q[i][0] - (dy / len) * off, q[i][1] + (dx / len) * off]);
    }
    return out;
  };
  H.strokePath = (ctx, pts) => {
    ctx.beginPath();
    pts.forEach((p, i) => { const [x, y] = P(p); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
  };

  // ---------- type ----------
  H.loadFonts = (specs = []) =>
    Promise.all(specs.map((s) => document.fonts.load(s).catch(() => []))).then(() => document.fonts.ready);
  H.fitFont = (ctx, text, maxWidth, sizeToSpec, maxPx = 200, minPx = 8) => {
    const prev = ctx.font;
    const fits = (px) => { ctx.font = sizeToSpec(px); return ctx.measureText(text).width <= maxWidth; };
    let lo = Math.floor(minPx), hi = Math.floor(maxPx), best = lo;
    if (fits(hi)) best = hi;
    else {
      while (lo <= hi) { const mid = (lo + hi) >> 1; if (fits(mid)) { best = mid; lo = mid + 1; } else hi = mid - 1; }
    }
    ctx.font = prev;
    return best;
  };
  H.typeOn = (text, u) => {
    const chars = Array.from(String(text));
    return chars.slice(0, Math.round(H.clamp(u, 0, 1) * chars.length)).join('');
  };

  (typeof window !== 'undefined' ? window : globalThis).H = H;
})();
