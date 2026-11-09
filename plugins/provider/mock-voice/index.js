// Plugin provider/mock-voice: deterministic fake narration for tests and offline development.
// Duration follows the amount of text (and the take), so cache and timing behaviour can be tested exactly.
(function (root) {
  'use strict';
  const LANGUAGES = ['en', 'ja', 'de', 'fr', 'es', 'zh'];
  const CJK = ['ja', 'zh'];
  const RATE = 24000;

  function hash(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      h = Math.imul(h ^ text.charCodeAt(i), 16777619) >>> 0;
    }
    return h;
  }

  const plugin = {
    kind: 'provider',
    id: 'mock-voice',
    modality: 'voice',
    languages: LANGUAGES,
    identity() {
      return { provider: 'mock-voice', version: '0.1.0' };
    },
    /** Returns { samples: Float32Array, rate }. Longer text, higher speed value => shorter audio. */
    async synthesize({ text, lang, speed = 1, take = 0 }) {
      const folded = text.normalize('NFKC');
      const units = CJK.includes(lang)
        ? [...folded.replace(/[^\p{L}\p{N}]/gu, '')].length * 0.14
        : folded.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length * 0.32;
      const h = hash(`${text}|${lang}|${take}`);
      const jitter = take ? 1 + 0.06 * (((h >>> 8) % 7) - 3) : 1;
      const seconds = Math.max(0.4, (units * jitter) / speed);
      const n = Math.round(seconds * RATE);
      const freq = 120 + (h % 140);
      const samples = new Float32Array(n);
      const fade = Math.round(0.01 * RATE);
      for (let i = 0; i < n; i += 1) {
        const env = Math.min(1, i / fade, (n - 1 - i) / fade) * (0.6 + 0.4 * Math.abs(Math.sin((i / RATE) * 11)));
        samples[i] = 0.2 * env * Math.sin((2 * Math.PI * freq * i) / RATE);
      }
      return { samples, rate: RATE };
    },
  };
  root.VBC_PLUGINS = root.VBC_PLUGINS || {};
  root.VBC_PLUGINS['provider/mock-voice'] = plugin;
})(typeof window !== 'undefined' ? window : globalThis);
