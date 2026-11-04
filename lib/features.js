// features.js: Pure-time browser loader for analysis.json, features.f32 and words.json.
// Exposes window.FEATURES (and ES module exports when bundled).
// Derived from a deterministic audio-feature pipeline used across several music films.
(function (root) {
  'use strict';

  const STEMS = ['drums', 'bass', 'guitar', 'piano', 'other', 'vocals'];

  function percentile(curve, q) {
    const copy = Float32Array.from(curve);
    copy.sort();
    const i = Math.min(copy.length - 1, Math.max(0, Math.round(q * (copy.length - 1))));
    return copy[i];
  }

  // Rising-edge detection with a refractory window so one attack produces one event.
  function crossings(curve, rate, threshold, refractory) {
    const out = [];
    let last = -1e9;
    for (let i = 1; i < curve.length; i++) {
      if (curve[i - 1] < threshold && curve[i] >= threshold) {
        const t = i / rate;
        if (t - last >= refractory) { out.push(t); last = t; }
      }
    }
    return Float32Array.from(out);
  }

  // Binary search for the most recent event at or before t (or -1). Pure function of t.
  function cursorAt(events, t) {
    let lo = 0, hi = events.length - 1, best = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (events[mid] <= t) { best = mid; lo = mid + 1; } else { hi = mid - 1; }
    }
    return best;
  }

  // Time since the most recent event in `events`, or Infinity if none has occurred yet.
  function sinceLast(events, t) {
    const idx = cursorAt(events, t);
    return idx < 0 ? Infinity : t - events[idx];
  }

  // Exponential decay pulse triggered by the latest event in `events`.
  function pulseAt(events, t, halfLife = 0.12) {
    const dt = sinceLast(events, t);
    return dt === Infinity || dt < 0 ? 0 : Math.exp(-dt / Math.max(1e-4, halfLife));
  }

  async function loadAnalysis(base) {
    const analysis = await fetch(`${base}/analysis.json`).then((r) => {
      if (!r.ok) throw new Error(`analysis.json unavailable at ${base} (${r.status})`);
      return r.json();
    });
    const spec = analysis.features;
    if (spec.dtype !== 'float32-le') throw new Error(`unsupported feature dtype ${spec.dtype}`);
    if (spec.layout !== '[feature][frame]') throw new Error(`unsupported feature layout ${spec.layout}`);

    const buffer = await fetch(`${base}/${spec.file}`).then((r) => {
      if (!r.ok) throw new Error(`${spec.file} unavailable (${r.status})`);
      return r.arrayBuffer();
    });
    const expected = spec.names.length * spec.frames * 4;
    if (buffer.byteLength !== expected) {
      throw new Error(`${spec.file} is ${buffer.byteLength} bytes, analysis.json declares ${expected}`);
    }
    const flat = new Float32Array(buffer);
    const curves = Object.create(null);
    spec.names.forEach((name, i) => {
      curves[name] = flat.subarray(i * spec.frames, (i + 1) * spec.frames);
    });

    const rate = spec.rate, frames = spec.frames, duration = analysis.duration;

    function sample(name, t) {
      const curve = curves[name];
      if (curve === undefined) throw new Error(`no feature named ${name}`);
      const x = t * rate;
      if (x <= 0) return curve[0];
      if (x >= frames - 1) return curve[frames - 1];
      const i = Math.floor(x), f = x - i;
      return curve[i] * (1 - f) + curve[i + 1] * f;
    }

    // Per-stem noise-floor auto-gating: if p98 - p05 < 0.04, the stem is separation residue
    // and is pinned to 0 so its visual layer stays genuinely empty when the instrument is absent.
    const gains = Object.create(null);
    for (const stem of STEMS.concat(['mix'])) {
      const level = curves[`${stem}.level`];
      const env = curves[`${stem}.env`];
      if (!level) continue;
      const lo = percentile(level, 0.05), hi = percentile(level, 0.98);
      const span = hi - lo;
      gains[stem] = {
        floor: lo,
        ceil: hi,
        span,
        present: span >= 0.04,
        envFloor: env ? percentile(env, 0.05) : lo,
        envCeil: env ? percentile(env, 0.98) : hi,
      };
    }

    function norm(stem, kind, t) {
      const g = gains[stem];
      if (!g || !g.present) return 0;
      const lo = kind === 'env' ? g.envFloor : g.floor;
      const hi = kind === 'env' ? g.envCeil : g.ceil;
      if (hi - lo < 1e-6) return 0;
      const v = (sample(`${stem}.${kind}`, t) - lo) / (hi - lo);
      return v < 0 ? 0 : v > 1 ? 1 : v;
    }

    const onsets = Object.create(null);
    for (const stem of STEMS) {
      const curve = curves[`${stem}.onset`];
      if (!curve) { onsets[stem] = new Float32Array(0); continue; }
      onsets[stem] = gains[stem] && gains[stem].present
        ? crossings(curve, rate, 0.45, 0.07)
        : new Float32Array(0);
    }

    const silences = (analysis.silences || []).map((s) => ({ start: s.start, end: s.end, dur: s.dur }));
    function inSilence(t) {
      for (const s of silences) if (t >= s.start && t < s.end) return s;
      return null;
    }

    return {
      analysis, curves, rate, frames, duration,
      sample, norm, gains, onsets, silences, inSilence,
      cursorAt, sinceLast, pulseAt,
      beats: Float64Array.from(analysis.beats || []),
      downbeats: Float64Array.from(analysis.downbeats || []),
    };
  }

  // Trim Whisper's pre-silence stretch on phrase-initial words (> 0.7 s -> cap lead at 0.45 s).
  function fixFirstWord(words) {
    return words.map((w, i) => (
      i === 0 && w.end - w.start > 0.7
        ? { ...w, start: Math.max(w.start, w.end - 0.45), fixed: true }
        : w
    ));
  }

  async function loadLyrics(urlOrBase) {
    const url = urlOrBase.endsWith('.json') ? urlOrBase : `${urlOrBase}/words.json`;
    const data = await fetch(url).then((r) => {
      if (!r.ok) throw new Error(`lyrics unavailable at ${url} (${r.status})`);
      return r.json();
    });
    const lines = (data.lines || []).map((l, i) => {
      const ws = fixFirstWord((l.words || []).map((w) => ({
        w: String(w.w),
        start: Number(w.start),
        end: Number(w.end),
        src: w.src || w.source || 'asr',
      })));
      return {
        id: l.id || `l${i}`,
        i: l.i ?? i,
        text: l.text || ws.map((w) => w.w).join(' '),
        start: ws.length ? ws[0].start : Number(l.start),
        end: ws.length ? ws[ws.length - 1].end : Number(l.end),
        words: ws,
      };
    });
    lines.sort((a, b) => a.start - b.start);
    const byId = Object.fromEntries(lines.map((l) => [l.id, l]));
    return { lines, byId, matched: data.matched, total: data.total };
  }

  function lineAt(lyrics, t, lead = 0.25, tail = 0.6) {
    return (lyrics.lines || []).find((l) => t >= l.start - lead && t < l.end + tail) || null;
  }

  const API = { STEMS, loadAnalysis, loadLyrics, lineAt, fixFirstWord, cursorAt, sinceLast, pulseAt };
  root.FEATURES = API;
})(typeof window !== 'undefined' ? window : globalThis);
