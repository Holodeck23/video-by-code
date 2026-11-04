// Real browser contract regressions; no files are produced. Run from any directory:
// node tests/runtime-contract.mjs
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { openPage, grabPng } from '../starter/lib-render/page.mjs';
const starter = fileURLToPath(new URL('../starter/scene.html', import.meta.url));
const sound = fileURLToPath(new URL('../lib/sound.js', import.meta.url));
const { browser, page } = await openPage(starter);
const hash = b => createHash('sha256').update(b).digest('hex');
try {
  const original = hash(await grabPng(page, 1));
  for (const t of [3.9, 0, 2.5, 1]) await grabPng(page, t);
  assert.equal(hash(await grabPng(page, 1)), original, 'out-of-order seeks changed pixels');
  await page.addScriptTag({ path: sound });
  const result = await page.evaluate(async () => {
    const score = k => {
      k.noise(0.1, { dur: 0.4, color: 'pink' });
      k.play('paper', 0.3);
      k.play('pencil', 0.8, { dur: 0.2 });
      k.music(0, 1.8, { mood: 'bright' });
    };
    const a = await SOUND.renderOffline(score, 2);
    const b = await SOUND.renderOffline(score, 2);
    const beds = k => { k.bed(0, 2); k.music(0, 2); };
    const silent = await SOUND.renderOffline(beds, 2, 48000, { voiceover: true });
    let peak = 0, mismatches = 0, maxDiff = 0, voicePeak = 0;
    for (let i = 0; i < a.length; i++) { peak = Math.max(peak, Math.abs(a[i])); if (a[i] !== b[i]) mismatches++; maxDiff = Math.max(maxDiff, Math.abs(a[i]-b[i])); }
    for (const x of silent) voicePeak = Math.max(voicePeak, Math.abs(x));
    const bytes = SOUND.toWav(a, 48000);
    return { samples: a.length, peak, mismatches, maxDiff, voicePeak, wavBytes: bytes.length };
  });
  assert.equal(result.samples, 192000);
  assert.ok(result.peak > 0.01 && result.peak < 1, `unexpected signal peak ${result.peak}`);
  assert.ok(result.maxDiff < 1e-6, 'offline audio waveform changed beyond native float rounding');
  assert.equal(result.voicePeak, 0, 'voiceover mode did not suppress beds/music');
  assert.equal(result.wavBytes, 44 + 192000 * 2);
  console.log(JSON.stringify({ status: 'PASS', frameSeek: true, ...result }, null, 2));
} finally {
  await browser.close();
}
