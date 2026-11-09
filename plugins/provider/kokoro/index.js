// Plugin provider/kokoro: the default local voice (Kokoro ONNX via tools/timing/kokoro-narrate.py).
// Node-only. Needs the model files in ~/.local/share/kokoro (or KOKORO_MODEL_DIR) and `uv`.
(function (root) {
  'use strict';
  const LANG_TAG = { en: 'en-us', fr: 'fr-fr', ja: 'ja', zh: 'cmn', it: 'it', pt: 'pt-br', es: 'es' };

  const plugin = {
    kind: 'provider',
    id: 'kokoro',
    modality: 'voice',
    languages: Object.keys(LANG_TAG),
    /** Model identity for cache keys: file sizes and modification times (not content hashes: the model is 300 MB). */
    async identity() {
      const { statSync } = await import('node:fs');
      const { join } = await import('node:path');
      const { homedir } = await import('node:os');
      const dir = process.env.KOKORO_MODEL_DIR || join(homedir(), '.local/share/kokoro');
      const files = ['kokoro-v1.0.onnx', 'voices-v1.0.bin'].map((name) => {
        try {
          const st = statSync(join(dir, name));
          return `${name}:${st.size}:${Math.round(st.mtimeMs)}`;
        } catch {
          throw new Error(`Kokoro model file ${name} not found in ${dir}; see tools/timing/kokoro-narrate.py`);
        }
      });
      return { provider: 'kokoro', version: '0.1.0', model: files };
    },
    /** One paragraph in, mono samples out. A new take nudges the speed by up to +/-2.4% so a reroll is audibly different. */
    async synthesize({ text, lang, voice, speed = 0.89, take = 0, rootDir, workDir, helpers }) {
      const { writeFileSync, mkdtempSync, rmSync } = await import('node:fs');
      const { join } = await import('node:path');
      const { spawnSync } = await import('node:child_process');
      const tag = LANG_TAG[lang];
      if (!tag) {
        throw new Error(`Kokoro has no language mapping for '${lang}'`);
      }
      const nudge = take ? 1 + 0.012 * (take % 2 ? 1 : -1) * Math.ceil(take / 2) : 1;
      const tmp = mkdtempSync(join(workDir, 'kokoro-'));
      try {
        const input = join(tmp, 'in.txt');
        const output = join(tmp, 'out.wav');
        writeFileSync(input, text);
        const args = ['run', '--python', '3.12', join(rootDir, 'tools/timing/kokoro-narrate.py'), input, output,
          '--lang', tag, '--speed', String(speed * nudge), '--gap', '0', '--lead', '0', '--force'];
        if (voice) {
          args.push('--voice', voice);
        }
        const run = spawnSync('uv', args, { encoding: 'utf8', cwd: rootDir });
        if (run.status !== 0) {
          throw new Error(`kokoro-narrate failed: ${(run.stderr || run.stdout || '').trim().split('\n').slice(-3).join(' | ')}`);
        }
        return await helpers.readWav(output);
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    },
  };
  root.VBC_PLUGINS = root.VBC_PLUGINS || {};
  root.VBC_PLUGINS['provider/kokoro'] = plugin;
})(typeof window !== 'undefined' ? window : globalThis);
