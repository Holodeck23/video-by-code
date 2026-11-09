// sound.js: the SOUND kit (see lib/API.md section 3). Plain browser script, sets window.SOUND.
// Everything is synthesised with Web Audio from oscillators and filtered noise. No audio files.
// Times passed to a kit are page times in seconds; the kit maps them onto its AudioContext clock.
(function () {
  'use strict';
  const SOUND = {};

  // ---------- small utilities ----------
  const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function hz(f, fallback = 440) {
    if (f == null) return fallback;
    if (typeof f === 'number') return f;
    const m = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(String(f).trim());
    if (!m) return fallback;
    const midi = 12 * (+m[3] + 1) + SEMI[m[1].toUpperCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    return 440 * Math.pow(2, (midi - 69) / 12);
  }
  function rngFrom(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    let a = h >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Seeded noise buffers, one set per context: white, pink (Kellet filter), brown (leaky integrator).
  const bufCache = new WeakMap();
  function noiseBuffers(ctx) {
    if (bufCache.has(ctx)) return bufCache.get(ctx);
    const len = Math.floor(ctx.sampleRate * 3), r = rngFrom('sound-noise');
    const make = (fill) => {
      const b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
      fill(d);
      let peak = 0;
      for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(d[i]));
      for (let i = 0; i < len; i++) d[i] = (d[i] / peak) * 0.9;
      return b;
    };
    const set = {
      white: make((d) => { for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1; }),
      pink: make((d) => {
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < d.length; i++) {
          const w = r() * 2 - 1;
          b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
          b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
          d[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362; b6 = w * 0.115926;
        }
      }),
      brown: make((d) => { let last = 0; for (let i = 0; i < d.length; i++) { last = (last + 0.02 * (r() * 2 - 1)) / 1.02; d[i] = last; } }),
    };
    bufCache.set(ctx, set);
    return set;
  }

  // Master chain: input gain, gentle bus compressor, fast limiter, soft clipper. Stacked hits never clip.
  function masterBus(ctx, voiceover, destination) {
    const input = ctx.createGain();
    input.gain.value = voiceover ? 0.63 : 1; // about -4 dB under narration
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 2.5; comp.attack.value = 0.005; comp.release.value = 0.2;
    const lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.08;
    const trim = ctx.createGain();
    trim.gain.value = 0.6; // takes back the compressors' automatic makeup gain
    const clip = ctx.createWaveShaper();
    const n = 2048, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1, ax = Math.abs(x);
      curve[i] = Math.sign(x) * (ax < 0.7 ? ax : 0.7 + 0.28 * Math.tanh((ax - 0.7) / 0.28));
    }
    clip.curve = curve;
    input.connect(comp); comp.connect(lim); lim.connect(trim); trim.connect(clip); clip.connect(destination || ctx.destination);
    return input;
  }

  // ---------- the kit ----------
  SOUND.kit = function (ctx, opts = {}) {
    const voiceover = !!opts.voiceover;
    const shift = opts.shift || 0;               // context time = page time + shift
    const from = opts.from != null ? opts.from : -Infinity; // live mode skips what started before this
    const bus = masterBus(ctx, voiceover, opts.destination);
    const bufs = noiseBuffers(ctx);
    let minorDepth = 0;
    const level = (g, minor) => g * (voiceover && (minor || minorDepth > 0) ? 0.6 : 1);
    const T = (t) => t + shift;

    // Gain envelope: linear attack, hold until dur, exponential release. Optional jitter for scratchy textures.
    function env(param, t, peak, a, dur, r, jitter, rnd) {
      const hold = Math.max(a, dur);
      param.setValueAtTime(0, t);
      param.linearRampToValueAtTime(peak, t + a);
      if (jitter && rnd) {
        for (let s = t + a + jitter.step; s < t + hold; s += jitter.step * (0.6 + rnd() * 0.8)) {
          param.linearRampToValueAtTime(peak * (jitter.lo + (1 - jitter.lo) * rnd()), s);
        }
      }
      param.linearRampToValueAtTime(peak, t + hold);
      param.exponentialRampToValueAtTime(Math.max(peak, 1e-4) * 0.001, t + hold + Math.max(r, 0.002));
      param.setValueAtTime(0, t + hold + Math.max(r, 0.002) + 0.001);
      return t + hold + r + 0.02;
    }
    function output(node, pan) {
      if (!pan) { node.connect(bus); return; }
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      node.connect(p); p.connect(bus);
    }
    function filterChain(src, filters, t, span) {
      let node = src;
      for (const f of filters || []) {
        const b = ctx.createBiquadFilter();
        b.type = f.type || 'lowpass'; b.Q.value = f.q != null ? f.q : 0.7;
        b.frequency.setValueAtTime(f.f, t);
        if (f.to) b.frequency.exponentialRampToValueAtTime(f.to, t + span);
        if (f.path) for (const [u, v] of f.path) b.frequency.exponentialRampToValueAtTime(v, t + span * u);
        node.connect(b); node = b;
      }
      return node;
    }
    function amStage(node, t, stop, am) {
      if (!am) return node;
      const g = ctx.createGain(), lfo = ctx.createOscillator(), depth = ctx.createGain();
      g.gain.value = 1 - am.depth / 2;
      lfo.type = am.type || 'sine'; lfo.frequency.value = am.rate;
      depth.gain.value = am.depth / 2;
      lfo.connect(depth); depth.connect(g.gain);
      lfo.start(t); lfo.stop(stop);
      node.connect(g);
      return g;
    }

    // Internal voices take context time `t`.
    function osc(t, o) {
      const f0 = hz(o.f), dur = o.dur != null ? o.dur : 0.2, a = o.a != null ? o.a : 0.005, r = o.r != null ? o.r : 0.1;
      const s = ctx.createOscillator();
      s.type = o.type || 'sine';
      s.frequency.setValueAtTime(f0, t);
      if (o.glideTo) s.frequency.exponentialRampToValueAtTime(hz(o.glideTo), t + (o.glideTime || Math.max(dur, a + 0.01)));
      if (o.detune) s.detune.value = o.detune;
      const g = ctx.createGain();
      const stop = env(g.gain, t, o.gain != null ? o.gain : 0.5, a, dur, r, o.jitter, o.rnd);
      filterChain(s, o.filters, t, dur + r).connect(g);
      output(g, o.pan);
      s.start(t); s.stop(stop);
      return stop;
    }
    function nz(t, o) {
      const dur = o.dur != null ? o.dur : 0.2, a = o.a != null ? o.a : 0.005, r = o.r != null ? o.r : 0.05;
      const src = ctx.createBufferSource();
      src.buffer = bufs[o.color || 'white'] || bufs.white; src.loop = true;
      const g = ctx.createGain();
      const stop = env(g.gain, t, o.gain != null ? o.gain : 0.3, a, dur, r, o.jitter, o.rnd);
      const filters = o.filters || [{ type: o.filter || 'lowpass', f: o.f || 2000, q: o.q != null ? o.q : 0.7 }];
      amStage(filterChain(src, filters, t, dur + r), t, stop, o.am).connect(g);
      output(g, o.pan);
      src.start(t, (o.rnd ? o.rnd() : 0) * 2.5); src.stop(stop);
      return stop;
    }

    // Presets. Each receives (t in context time, gain multiplier, options, seeded rnd).
    const PRESETS = {
      tock: (t, g, o) => { const f = hz(o.f, 1000);
        osc(t, { f, glideTo: f * 0.75, glideTime: 0.03, type: 'triangle', a: 0.001, dur: 0.005, r: 0.07, gain: 0.5 * g, pan: o.pan });
        nz(t, { filter: 'bandpass', f: f * 2.5, q: 3, a: 0.001, dur: 0.004, r: 0.015, gain: 0.25 * g, pan: o.pan, rnd: o.rnd }); },
      pop: (t, g, o) => { const f = hz(o.f, 420);
        osc(t, { f, glideTo: f * 2.6, glideTime: 0.04, a: 0.001, dur: 0.01, r: 0.06, gain: 0.55 * g, pan: o.pan });
        nz(t, { filter: 'highpass', f: 3000, a: 0.001, dur: 0.002, r: 0.01, gain: 0.15 * g, pan: o.pan, rnd: o.rnd }); },
      thud: (t, g, o) => { const f = hz(o.f, 95);
        osc(t, { f, glideTo: f * 0.45, glideTime: 0.2, a: 0.002, dur: 0.02, r: 0.28, gain: 0.8 * g, pan: o.pan });
        nz(t, { color: 'brown', f: 400, a: 0.002, dur: 0.02, r: 0.12, gain: 0.5 * g, pan: o.pan, rnd: o.rnd }); },
      ding: (t, g, o) => { const f = hz(o.f, 1318.5);
        osc(t, { f, a: 0.002, dur: 0.005, r: 0.9, gain: 0.35 * g, pan: o.pan });
        osc(t, { f: f * 2.76, a: 0.001, dur: 0.003, r: 0.25, gain: 0.08 * g, pan: o.pan });
        osc(t, { f: f * 5.4, a: 0.001, dur: 0.002, r: 0.08, gain: 0.04 * g, pan: o.pan }); },
      bell: (t, g, o) => { const f = hz(o.f, 880);
        [[1, 0.3, 2.2], [2.003, 0.16, 1.6], [2.76, 0.13, 1.0], [5.4, 0.07, 0.5], [8.93, 0.035, 0.25]].forEach(([m, a, d]) =>
          osc(t, { f: f * m, a: 0.002, dur: 0.005, r: d, gain: a * g, pan: o.pan })); },
      impact: (t, g, o) => {
        osc(t, { f: 70, glideTo: 32, glideTime: 0.5, a: 0.002, dur: 0.03, r: 0.7, gain: 0.85 * g, pan: o.pan });
        osc(t, { f: 140, glideTo: 60, glideTime: 0.15, a: 0.001, dur: 0.01, r: 0.2, gain: 0.3 * g, pan: o.pan });
        nz(t, { color: 'brown', f: 900, a: 0.002, dur: 0.03, r: 0.45, gain: 0.6 * g, pan: o.pan, rnd: o.rnd });
        nz(t, { filter: 'highpass', f: 2500, a: 0.001, dur: 0.005, r: 0.06, gain: 0.3 * g, pan: o.pan, rnd: o.rnd }); },
      slap: (t, g, o) => {
        nz(t, { filter: 'bandpass', f: 1400, q: 1.2, a: 0.001, dur: 0.004, r: 0.07, gain: 0.7 * g, pan: o.pan, rnd: o.rnd });
        nz(t, { color: 'pink', f: 350, a: 0.001, dur: 0.01, r: 0.05, gain: 0.45 * g, pan: o.pan, rnd: o.rnd });
        nz(t, { filter: 'highpass', f: 5000, a: 0.001, dur: 0.002, r: 0.02, gain: 0.2 * g, pan: o.pan, rnd: o.rnd }); },
      click: (t, g, o) => {
        nz(t, { filter: 'highpass', f: 3500, a: 0.0005, dur: 0.001, r: 0.012, gain: 0.5 * g, pan: o.pan, rnd: o.rnd });
        osc(t, { f: hz(o.f, 2200), type: 'square', a: 0.0005, dur: 0.001, r: 0.008, gain: 0.07 * g, pan: o.pan }); },
      tick: (t, g, o) => {
        nz(t, { filter: 'bandpass', f: 6000, q: 6, a: 0.0005, dur: 0.001, r: 0.018, gain: 0.6 * g, pan: o.pan, rnd: o.rnd });
        osc(t, { f: hz(o.f, 3200), a: 0.0005, dur: 0.001, r: 0.012, gain: 0.12 * g, pan: o.pan }); },
      key: (t, g, o) => { const v = 0.85 + o.rnd() * 0.3;
        nz(t, { filter: 'bandpass', f: 2600 * v, q: 1.5, a: 0.001, dur: 0.003, r: 0.03, gain: 0.45 * g, pan: o.pan, rnd: o.rnd });
        nz(t, { color: 'pink', f: 500 * v, a: 0.001, dur: 0.005, r: 0.035, gain: 0.3 * g, pan: o.pan, rnd: o.rnd }); },
      press: (t, g, o) => {
        nz(t, { filter: 'bandpass', f: 1200, q: 2, a: 0.001, dur: 0.004, r: 0.045, gain: 0.45 * g, pan: o.pan, rnd: o.rnd });
        osc(t, { f: hz(o.f, 210), glideTo: hz(o.f, 210) * 0.75, glideTime: 0.05, a: 0.001, dur: 0.005, r: 0.06, gain: 0.35 * g, pan: o.pan });
        nz(t + 0.09, { filter: 'bandpass', f: 2400, q: 2, a: 0.001, dur: 0.002, r: 0.02, gain: 0.2 * g, pan: o.pan, rnd: o.rnd }); },
      stamp: (t, g, o) => {
        osc(t, { f: 120, glideTo: 55, glideTime: 0.15, a: 0.002, dur: 0.02, r: 0.22, gain: 0.7 * g, pan: o.pan });
        nz(t, { color: 'brown', f: 1200, a: 0.002, dur: 0.03, r: 0.15, gain: 0.6 * g, pan: o.pan, rnd: o.rnd });
        nz(t, { filter: 'highpass', f: 2500, a: 0.001, dur: 0.01, r: 0.07, gain: 0.25 * g, pan: o.pan, rnd: o.rnd }); },
      paper: (t, g, o) => { const d = o.dur || 0.45;
        nz(t, { color: 'pink', filter: 'bandpass', f: 2800, q: 0.7, a: d * 0.3, dur: d * 0.6, r: d * 0.4, gain: 0.32 * g, pan: o.pan, rnd: o.rnd, jitter: { step: 0.03, lo: 0.4 } });
        for (let i = 0; i < 5; i++) nz(t + o.rnd() * d, { filter: 'highpass', f: 5000, a: 0.001, dur: 0.004, r: 0.012, gain: 0.15 * g, pan: o.pan, rnd: o.rnd }); },
      tape: (t, g, o) => { const d = o.dur || 0.5;
        nz(t, { filters: [{ type: 'bandpass', f: 900, to: 4200, q: 1.5 }], a: 0.02, dur: d * 0.8, r: 0.08, gain: 0.45 * g, pan: o.pan, rnd: o.rnd, jitter: { step: 0.012, lo: 0.1 } });
        nz(t + d * 0.85, { color: 'pink', f: 300, a: 0.002, dur: 0.01, r: 0.06, gain: 0.25 * g, pan: o.pan, rnd: o.rnd }); },
      roller: (t, g, o) => { const d = o.dur || 0.8;
        nz(t, { color: 'brown', f: 700, q: 0.5, a: 0.08, dur: d, r: 0.15, gain: 0.55 * g, pan: o.pan, rnd: o.rnd, am: { rate: 16, depth: 0.6 } });
        nz(t, { color: 'pink', filter: 'bandpass', f: 2000, q: 0.6, a: 0.08, dur: d, r: 0.15, gain: 0.08 * g, pan: o.pan, rnd: o.rnd, jitter: { step: 0.02, lo: 0.2 } }); },
      success: (t, g, o) => { const f = hz(o.f, 523.25);
        [0, 4, 7, 12].forEach((s, i) => osc(t + i * 0.075, { f: f * Math.pow(2, s / 12), type: 'triangle', a: 0.003, dur: 0.02, r: i === 3 ? 0.6 : 0.3, gain: 0.3 * g, pan: o.pan }));
        osc(t + 0.225, { f: f * 4, a: 0.003, dur: 0.02, r: 0.5, gain: 0.07 * g, pan: o.pan }); },
      error: (t, g, o) => { const f = hz(o.f, 330);
        [[0, 1], [0.15, 0.75]].forEach(([dt, m]) => osc(t + dt, { f: f * m, type: 'sawtooth', filters: [{ type: 'lowpass', f: 1400 }], a: 0.005, dur: 0.11, r: 0.08, gain: 0.22 * g, pan: o.pan })); },
      buzz: (t, g, o) => { const f = hz(o.f, 110), d = o.dur || 0.35;
        osc(t, { f, type: 'sawtooth', filters: [{ type: 'lowpass', f: 1600 }], a: 0.005, dur: d, r: 0.05, gain: 0.25 * g, pan: o.pan });
        osc(t, { f: f * 1.01, type: 'square', filters: [{ type: 'lowpass', f: 1600 }], a: 0.005, dur: d, r: 0.05, gain: 0.12 * g, pan: o.pan }); },
      count: (t, g, o) => {
        osc(t, { f: hz(o.f, 1760), a: 0.001, dur: 0.002, r: 0.045, gain: 0.28 * g, pan: o.pan });
        nz(t, { filter: 'bandpass', f: 7000, q: 4, a: 0.0005, dur: 0.001, r: 0.01, gain: 0.15 * g, pan: o.pan, rnd: o.rnd }); },
      blip: (t, g, o) => osc(t, { f: hz(o.f, 880), type: 'square', filters: [{ type: 'lowpass', f: 5000 }], a: 0.002, dur: 0.04, r: 0.03, gain: 0.14 * g, pan: o.pan }),
      select: (t, g, o) => { const f = hz(o.f, 660);
        osc(t, { f, type: 'square', filters: [{ type: 'lowpass', f: 5000 }], a: 0.002, dur: 0.03, r: 0.03, gain: 0.12 * g, pan: o.pan });
        osc(t + 0.06, { f: f * 1.5, type: 'square', filters: [{ type: 'lowpass', f: 5000 }], a: 0.002, dur: 0.04, r: 0.05, gain: 0.12 * g, pan: o.pan }); },
      coin: (t, g, o) => { const f = hz(o.f, 987.8);
        osc(t, { f, type: 'square', a: 0.001, dur: 0.07, r: 0.01, gain: 0.12 * g, pan: o.pan });
        osc(t + 0.075, { f: f * 1.335, type: 'square', a: 0.001, dur: 0.05, r: 0.35, gain: 0.12 * g, pan: o.pan }); },
      powerup: (t, g, o) => { const f = hz(o.f, 262);
        [0, 4, 7, 12, 4, 7, 12, 16, 7, 12, 16, 19].forEach((s, i) => osc(t + i * 0.04, { f: f * Math.pow(2, s / 12 + i / 24), type: 'square', filters: [{ type: 'lowpass', f: 4500 }], a: 0.002, dur: 0.03, r: 0.03, gain: 0.11 * g, pan: o.pan }));
        osc(t, { f: f / 2, glideTo: f * 2, glideTime: 0.5, type: 'triangle', a: 0.02, dur: 0.45, r: 0.15, gain: 0.12 * g, pan: o.pan }); },
      sparkle: (t, g, o) => {
        for (let i = 0; i < 7; i++) osc(t + i * 0.055 + o.rnd() * 0.03, { f: 2600 + o.rnd() * 3400, a: 0.001, dur: 0.003, r: 0.22 + o.rnd() * 0.15, gain: 0.11 * g, pan: (o.pan || 0) + (o.rnd() - 0.5) * 1.2 });
        nz(t, { filter: 'highpass', f: 8000, a: 0.03, dur: 0.2, r: 0.3, gain: 0.05 * g, pan: o.pan, rnd: o.rnd }); },
      glitch: (t, g, o) => { let s = t;
        for (let i = 0; i < 9; i++) {
          const d = 0.012 + o.rnd() * 0.03, pan = (o.rnd() - 0.5) * 1.4;
          if (o.rnd() < 0.55) osc(s, { f: 200 + o.rnd() * 2800, type: 'square', a: 0.0005, dur: d, r: 0.004, gain: 0.12 * g, pan });
          else nz(s, { filter: 'highpass', f: 1500 + o.rnd() * 4000, a: 0.0005, dur: d, r: 0.004, gain: 0.25 * g, pan, rnd: o.rnd });
          s += d + o.rnd() * 0.015;
        } },
      neon: (t, g, o) => { const d = o.dur || 0.8;
        [[0, 0.04], [0.07, 0.03], [0.13, 0.02], [0.2, Math.max(0.1, d - 0.2)]].forEach(([dt, len]) => {
          osc(t + dt, { f: 120, type: 'sawtooth', filters: [{ type: 'lowpass', f: 900 }], a: 0.002, dur: len, r: 0.02, gain: 0.22 * g, pan: o.pan });
          osc(t + dt, { f: 240, type: 'square', filters: [{ type: 'lowpass', f: 2000 }], a: 0.002, dur: len, r: 0.02, gain: 0.04 * g, pan: o.pan });
          nz(t + dt, { filter: 'highpass', f: 3000, a: 0.0005, dur: 0.006, r: 0.015, gain: 0.25 * g, pan: o.pan, rnd: o.rnd });
        }); },
      whoosh: (t, g, o) => { const d = o.dur || 0.6;
        nz(t, { color: 'pink', filters: [{ type: 'bandpass', f: 300, q: 1.2, path: [[0.55, 2500], [1, 600]] }], a: d * 0.5, dur: d * 0.5, r: d * 0.5, gain: 0.6 * g, pan: o.pan, rnd: o.rnd });
        nz(t + d * 0.1, { filters: [{ type: 'bandpass', f: 1500, q: 0.8, path: [[0.5, 5000], [1, 1200]] }], a: d * 0.4, dur: d * 0.4, r: d * 0.4, gain: 0.12 * g, pan: o.pan, rnd: o.rnd }); },
      swish: (t, g, o) => { const d = o.dur || 0.28;
        nz(t, { filters: [{ type: 'bandpass', f: 1800, to: 6500, q: 1 }], a: d * 0.4, dur: d * 0.4, r: d * 0.6, gain: 0.4 * g, pan: o.pan, rnd: o.rnd }); },
      riser: (t, g, o) => { const d = o.dur || 2;
        nz(t, { filters: [{ type: 'bandpass', f: 300, to: 7000, q: 2 }], a: d * 0.92, dur: d, r: 0.05, gain: 0.3 * g, pan: o.pan, rnd: o.rnd });
        osc(t, { f: hz(o.f, 110), glideTo: hz(o.f, 110) * 8, glideTime: d, type: 'sawtooth', filters: [{ type: 'lowpass', f: 2500 }], a: d * 0.9, dur: d, r: 0.05, gain: 0.07 * g, pan: o.pan });
        osc(t, { f: 55, glideTo: 110, glideTime: d, a: d * 0.8, dur: d, r: 0.05, gain: 0.12 * g, pan: o.pan }); },
      stroke: (t, g, o) => { const d = o.dur || 0.6;
        nz(t, { color: 'pink', filter: 'bandpass', f: 2300, q: 1.1, a: 0.02, dur: d, r: 0.06, gain: 0.34 * g, pan: o.pan, rnd: o.rnd, jitter: { step: 0.02, lo: 0.55 } });
        nz(t, { filter: 'highpass', f: 6000, a: 0.02, dur: d, r: 0.04, gain: 0.05 * g, pan: o.pan, rnd: o.rnd, jitter: { step: 0.015, lo: 0.3 } }); },
      pencil: (t, g, o) => { const d = o.dur || 0.6;
        nz(t, { filter: 'bandpass', f: 4500, q: 1.8, a: 0.01, dur: d, r: 0.03, gain: 0.32 * g, pan: o.pan, rnd: o.rnd, jitter: { step: 0.008, lo: 0.15 } });
        nz(t, { filter: 'highpass', f: 7000, a: 0.01, dur: d, r: 0.03, gain: 0.06 * g, pan: o.pan, rnd: o.rnd, jitter: { step: 0.006, lo: 0.1 } }); },
      chalk: (t, g, o) => { const d = o.dur || 0.6;
        nz(t, { filter: 'bandpass', f: 2200, q: 2.5, a: 0.005, dur: d, r: 0.03, gain: 0.38 * g, pan: o.pan, rnd: o.rnd, jitter: { step: 0.006, lo: 0.05 } });
        nz(t, { color: 'pink', f: 600, a: 0.01, dur: d, r: 0.05, gain: 0.1 * g, pan: o.pan, rnd: o.rnd, jitter: { step: 0.01, lo: 0.3 } }); },
      erase: (t, g, o) => { const d = o.dur || 0.6;
        nz(t, { color: 'pink', filter: 'bandpass', f: 1100, q: 0.9, a: 0.03, dur: d, r: 0.06, gain: 0.38 * g, pan: o.pan, rnd: o.rnd, am: { rate: 7, depth: 0.8 } });
        nz(t, { filter: 'highpass', f: 3500, a: 0.03, dur: d, r: 0.06, gain: 0.08 * g, pan: o.pan, rnd: o.rnd, am: { rate: 7, depth: 0.8 } }); },
      typing: (t, g, o) => { const d = o.dur || 1.2;
        let s = 0, n = 0;
        while (s < d) {
          const v = g * (0.7 + o.rnd() * 0.3);
          if (n > 0 && n % 7 === 6) {
            nz(t + s, { color: 'pink', f: 320, a: 0.001, dur: 0.006, r: 0.05, gain: 0.35 * v, pan: o.pan, rnd: o.rnd });
            nz(t + s, { filter: 'bandpass', f: 1500, q: 1.2, a: 0.001, dur: 0.003, r: 0.03, gain: 0.3 * v, pan: o.pan, rnd: o.rnd });
          } else PRESETS.key(t + s, v, o);
          s += 0.06 + o.rnd() * 0.09; n++;
        } },
    };

    const k = {
      presets: Object.keys(PRESETS),
      play(name, t, o = {}) {
        const fn = PRESETS[name];
        if (!fn) { console.warn('SOUND: unknown preset', name); return; }
        if (t < from - 1e-6) return;
        const rnd = rngFrom(`${name}:${t.toFixed(4)}`);
        fn(T(t), level(o.gain != null ? o.gain : 1, o.minor), { ...o, rnd });
      },
      tone(t, o = {}) {
        if (t < from - 1e-6) return;
        osc(T(t), { ...o, gain: level(o.gain != null ? o.gain : 0.5, o.minor) });
      },
      noise(t, o = {}) {
        if (t < from - 1e-6) return;
        nz(T(t), { ...o, gain: level(o.gain != null ? o.gain : 0.3, o.minor), rnd: rngFrom(`noise:${t.toFixed(4)}`) });
      },
      bed(t0, t1, o = {}) {
        if (voiceover) return;
        const s = Math.max(t0, from);
        if (t1 - s < 0.05) return;
        bed(T(s), T(t1), o.kind || 'room', o.gain != null ? o.gain : 0.15, rngFrom(`bed:${t0}`), s > t0);
      },
      music(t0, t1, o = {}) {
        if (voiceover) return;
        music(t0, t1, { mood: 'calm', bpm: 96, key: 'C', gain: 0.4, ...o });
      },
      track(pcm, offset = 0, o = {}) {
        if (!pcm || !pcm.channels || !pcm.channels.length || !pcm.sampleRate) return;
        const ch0 = pcm.channels[0];
        if (!ch0 || !ch0.length) return;
        const dur = ch0.length / pcm.sampleRate;
        const startP = Number(offset) || 0;
        if (startP + dur <= from + 1e-6) return;
        const buf = ctx.createBuffer(pcm.channels.length, ch0.length, pcm.sampleRate);
        for (let c = 0; c < pcm.channels.length; c++) {
          buf.getChannelData(c).set(pcm.channels[c]);
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const g = ctx.createGain();
        g.gain.value = o.gain != null ? o.gain : 1;
        src.connect(g);
        g.connect(opts.destination || ctx.destination);
        if (from > startP) src.start(Math.max(0, T(from)), from - startP);
        else src.start(Math.max(0, T(startP)), 0);
      },
      minor(fn) { minorDepth++; try { fn(); } finally { minorDepth--; } },
    };

    // ---------- beds ----------
    function bedLoop(t0, t1, gain, src, filters, fadeIn) {
      const g = ctx.createGain(), fade = Math.min(1.5, (t1 - t0) / 3);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(gain, t0 + (fadeIn ? 0.05 : fade));
      g.gain.setValueAtTime(gain, t1 - fade);
      g.gain.linearRampToValueAtTime(0, t1);
      filterChain(src, filters, t0, t1 - t0).connect(g);
      g.connect(bus);
      src.start(t0); src.stop(t1 + 0.05);
      return g;
    }
    function loopNoise(color, rnd) {
      const s = ctx.createBufferSource();
      s.buffer = bufs[color]; s.loop = true; s.loopStart = rnd() * 0.5;
      return s;
    }
    function bed(t0, t1, kind, gain, rnd, joined) {
      const len = t1 - t0;
      if (kind === 'hum') {
        [[50, 1], [100, 0.5], [150, 0.25], [200, 0.1]].forEach(([f, a]) => {
          const o = ctx.createOscillator(); o.frequency.value = f; bedLoop(t0, t1, gain * a * 0.5, o, [], joined);
        });
        bedLoop(t0, t1, gain * 0.3, loopNoise('brown', rnd), [{ type: 'lowpass', f: 300 }], joined);
      } else if (kind === 'vinyl') {
        bedLoop(t0, t1, gain * 0.5, loopNoise('pink', rnd), [{ type: 'bandpass', f: 2500, q: 0.5 }], joined);
        for (let s = t0 + rnd() * 0.3; s < t1 - 0.05; s += 0.04 + rnd() * 0.3) {
          nz(s, { filter: 'highpass', f: 1500 + rnd() * 3000, a: 0.0003, dur: 0.0005, r: 0.004 + rnd() * 0.01, gain: gain * (0.4 + rnd() * 1.2), pan: (rnd() - 0.5) * 0.6, rnd });
        }
      } else if (kind === 'wind') {
        const steps = Math.max(2, Math.floor(len / 2)), path = [];
        for (let i = 1; i <= steps; i++) path.push([i / steps, 250 + rnd() * 700]);
        bedLoop(t0, t1, gain * 1.6, loopNoise('pink', rnd), [{ type: 'bandpass', f: 400, q: 1.5, path }], joined);
        bedLoop(t0, t1, gain * 0.8, loopNoise('brown', rnd), [{ type: 'lowpass', f: 250 }], joined);
      } else if (kind === 'tape') {
        bedLoop(t0, t1, gain * 0.4, loopNoise('white', rnd), [{ type: 'highpass', f: 5000 }, { type: 'lowpass', f: 12000 }], joined);
        const o = ctx.createOscillator(); o.frequency.value = 60; bedLoop(t0, t1, gain * 0.15, o, [], joined);
      } else if (kind === 'night') {
        bedLoop(t0, t1, gain * 0.6, loopNoise('brown', rnd), [{ type: 'lowpass', f: 400 }], joined);
        const c = ctx.createOscillator(); c.frequency.value = 4400;
        const cg = ctx.createGain(); cg.gain.setValueAtTime(0, t0);
        for (let s = t0 + 0.2 + rnd(); s < t1 - 0.3; s += 0.7 + rnd() * 0.9) {
          for (let p = 0; p < 3; p++) {
            const ps = s + p * 0.06;
            cg.gain.setValueAtTime(0, ps); cg.gain.linearRampToValueAtTime(gain * 0.25, ps + 0.01); cg.gain.linearRampToValueAtTime(0, ps + 0.04);
          }
        }
        c.connect(cg); cg.connect(bus); c.start(t0); c.stop(t1);
      } else { // room
        bedLoop(t0, t1, gain * 1.2, loopNoise('pink', rnd), [{ type: 'lowpass', f: 500 }], joined);
        bedLoop(t0, t1, gain * 0.12, loopNoise('white', rnd), [{ type: 'highpass', f: 6000 }], joined);
      }
    }

    // ---------- music: a pad that changes chord each bar, plus a pulse ----------
    const MOODS = {
      calm: { minor: false, prog: [0, 9, 5, 7], chord: [0, 4, 7], pulse: 'quarter', wave: 'triangle' },
      bright: { minor: false, prog: [0, 7, 9, 5], chord: [0, 4, 7], pulse: 'eighth', wave: 'square' },
      tense: { minor: true, prog: [0, 8, 10, 0], chord: [0, 3, 7], pulse: 'eighth', wave: 'sawtooth' },
      dreamy: { minor: false, prog: [0, 5, 9, 4], chord: [0, 4, 7, 11], pulse: 'sparse', wave: 'sine' },
    };
    function music(t0p, t1p, o) {
      const m = MOODS[o.mood] || MOODS.calm, beat = 60 / o.bpm, bar = beat * 4;
      const root = hz(String(o.key).replace(/m$/, '') + '3', 130.8);
      const rnd = rngFrom(`music:${t0p}:${o.mood}`), start = Math.max(t0p, from);
      for (let b = 0; t0p + b * bar < t1p; b++) {
        const bs = t0p + b * bar, be = Math.min(t1p, bs + bar);
        if (be <= start) continue;
        const step = m.prog[b % m.prog.length];
        const quality = m.minor ? [0, 3, 7] : m.chord;
        const minorDeg = !m.minor && (step === 9 || step === 4) ? [0, 3, 7] : quality;
        const fadeOut = be >= t1p - 1e-6;
        const ps = Math.max(bs, start);
        minorDeg.forEach((iv, i) => {
          const f = root * Math.pow(2, (step + iv) / 12);
          [-6, 6].forEach((det) => osc(T(ps), { f, type: 'triangle', detune: det, filters: [{ type: 'lowpass', f: 1200 }], a: Math.min(0.4, be - ps), dur: be - ps - 0.05, r: fadeOut ? 0.8 : 0.3, gain: o.gain * 0.07, pan: (i - 1) * 0.3 }));
        });
        osc(T(ps), { f: root * Math.pow(2, (step - 12) / 12), a: 0.05, dur: be - ps - 0.05, r: 0.2, gain: o.gain * 0.18 });
        const pulseStep = m.pulse === 'eighth' ? beat / 2 : beat;
        for (let s = bs; s < be - 1e-6; s += pulseStep) {
          if (s < start) continue;
          if (m.pulse === 'sparse' && rnd() < 0.55) continue;
          const iv = minorDeg[Math.floor(rnd() * minorDeg.length)] + (m.pulse === 'sparse' ? 12 : 0);
          osc(T(s), { f: root * 2 * Math.pow(2, (step + iv) / 12), type: m.wave, filters: [{ type: 'lowpass', f: m.wave === 'sine' ? 6000 : 2200 }], a: 0.004, dur: 0.02, r: m.pulse === 'sparse' ? 0.6 : 0.16, gain: o.gain * (m.wave === 'square' || m.wave === 'sawtooth' ? 0.06 : 0.12) });
        }
      }
    }

    return k;
  };

  // ---------- real-time preview ----------
  SOUND.live = function (scoreFn, fromT = 0, opts = {}) {
    const ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
    if (ctx.state === 'suspended') ctx.resume();
    const lead = 0.06, base = ctx.currentTime + lead;
    const voiceover = opts.voiceover != null ? opts.voiceover : !!scoreFn?.voiceover;
    const k = SOUND.kit(ctx, { voiceover, shift: base - fromT, from: fromT });
    if (scoreFn) scoreFn(k);
    let stopped = false;
    const stop = () => { if (!stopped) { stopped = true; ctx.close().catch(() => {}); } };
    stop.ctx = ctx;
    stop.time = () => fromT + (ctx.currentTime - base); // page time the listener hears now
    return stop;
  };

  // ---------- offline render ----------
  SOUND.renderOffline = async function (scoreFn, duration, sampleRate = 48000, opts = {}) {
    const length = Math.max(1, Math.ceil(duration * sampleRate));
    const ctx = new OfflineAudioContext({ numberOfChannels: 2, length, sampleRate });
    const voiceover = opts.voiceover != null ? opts.voiceover : !!scoreFn?.voiceover;
    const k = SOUND.kit(ctx, { voiceover });
    if (scoreFn) scoreFn(k);
    const buf = await ctx.startRendering();
    const L = buf.getChannelData(0), R = buf.getChannelData(1), out = new Float32Array(length * 2);
    for (let i = 0; i < length; i++) { out[2 * i] = L[i]; out[2 * i + 1] = R[i]; }
    return out;
  };

  SOUND.decodeWav = function (arrayBuffer) {
    const u8 = arrayBuffer instanceof Uint8Array ? arrayBuffer : new Uint8Array(arrayBuffer);
    const v = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    let fmt = null, dataOff = 0, dataLen = 0;
    for (let at = 12; at + 8 <= u8.byteLength; ) {
      const id = String.fromCharCode(u8[at], u8[at + 1], u8[at + 2], u8[at + 3]);
      const sz = v.getUint32(at + 4, true), body = at + 8;
      if (id === 'fmt ') {
        fmt = { tag: v.getUint16(body, true), channels: v.getUint16(body + 2, true), rate: v.getUint32(body + 4, true), bits: v.getUint16(body + 14, true) };
      } else if (id === 'data') {
        dataOff = body; dataLen = Math.min(sz, u8.byteLength - body);
      }
      at = body + sz + (sz % 2);
    }
    if (!fmt || !dataOff) throw new Error('SOUND.decodeWav: invalid WAV');
    const bytes = fmt.bits / 8, frames = Math.floor(dataLen / (bytes * fmt.channels));
    const channels = Array.from({ length: fmt.channels }, () => new Float32Array(frames));
    for (let i = 0; i < frames; i++) {
      for (let c = 0; c < fmt.channels; c++) {
        const o = dataOff + (i * fmt.channels + c) * bytes;
        channels[c][i] = fmt.tag === 3 ? v.getFloat32(o, true) : v.getInt16(o, true) / 32768;
      }
    }
    return { channels, sampleRate: fmt.rate, duration: frames / fmt.rate };
  };

  SOUND.toWav = function (interleaved, sampleRate = 48000, channels = 2) {
    const n = interleaved.length, bytes = new Uint8Array(44 + n * 2), v = new DataView(bytes.buffer);
    const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE');
    str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, channels, true);
    v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * channels * 2, true);
    v.setUint16(32, channels * 2, true); v.setUint16(34, 16, true);
    str(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) {
      const s = Math.max(-1, Math.min(1, interleaved[i]));
      v.setInt16(44 + i * 2, s < 0 ? s * 32768 : s * 32767, true);
    }
    return bytes;
  };

  (typeof window !== 'undefined' ? window : globalThis).SOUND = SOUND;
})();
