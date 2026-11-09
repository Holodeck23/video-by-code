import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { resolveCues } from '../lib/contracts.mjs';
import {
  assertBundleFresh,
  buildCues,
  buildMusic,
  buildWords,
  checkProduction,
  initProduction,
  makeProduction,
  previewProduction,
} from '../lib/pipeline.mjs';
import { parseStoryboard } from '../lib/storyboard.mjs';
import { buildVoice } from '../lib/voice.mjs';
import { writeWav } from '../lib/wav.mjs';
import '../lib/sound.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CLI = join(ROOT, 'bin', 'vbc.mjs');

async function tempDir(prefix = 'vbc-pipe-') {
  return mkdtemp(join(tmpdir(), prefix));
}

test('parseStoryboard parses headers, anchors, items, lanes and rejects missing anchors', () => {
  const sb = [
    '== title id=intro title="Hello Stage" subtitle="Sub" kicker="KICK"',
    '@ every frame',
    '- First item | 10ms | A1',
    '',
    '== flow id=lanes title="Lanes"',
    '@bar 2',
    '| Fast Path | 2ms | fast | 0.9 | Zero copy |',
  ].join('\n');
  const doc = parseStoryboard(sb);
  assert.equal(doc.schemaVersion, 1);
  assert.equal(doc.cues.length, 2);
  assert.equal(doc.cues[0].id, 'intro');
  assert.equal(doc.cues[0].anchor, '@ every frame');
  assert.equal(doc.cues[0].content.items[0].value, '10ms');
  assert.equal(doc.cues[1].content.lanes[0].label, 'Fast Path');

  assert.throws(() => parseStoryboard('== title id=bad\n- no anchor\n'), /missing @ anchor/);
  assert.throws(() => parseStoryboard('// empty\n'), /no cues/);
});

test('resolveCues matches {shown|spoken} tokens by either form and CJK character tokens', () => {
  const words = [
    { text: '24', spoken: 'twenty four', start: 0.4, end: 0.9, confidence: 1 },
    { text: 'layers', spoken: 'layers', start: 0.9, end: 1.4, confidence: 1 },
    { text: 'こ', spoken: 'こ', start: 2.0, end: 2.2, confidence: 1 },
    { text: 'ん', spoken: 'ん', start: 2.2, end: 2.4, confidence: 1 },
    { text: 'に', spoken: 'に', start: 2.4, end: 2.6, confidence: 1 },
    { text: 'ち', spoken: 'ち', start: 2.6, end: 2.8, confidence: 1 },
    { text: 'は', spoken: 'は', start: 2.8, end: 3.0, confidence: 1 },
  ];
  const bySpoken = resolveCues(
    {
      cues: [
        { id: 'c1', line: 1, anchor: '@ twenty four', type: 'title', content: {} },
        { id: 'c2', line: 3, anchor: '@ こんにちは', type: 'big', content: {} },
      ],
    },
    { words, music: {}, duration: 4 }
  );
  assert.equal(bySpoken[0].start, 0.4);
  assert.equal(bySpoken[1].start, 2.0);
});

test('pipeline builds explainer, lyric, instrumental and vertical-short bundles and enforces freshness', async () => {
  const prod = await tempDir('vbc-explainer-');
  try {
    await initProduction({
      prod,
      rootDir: ROOT,
      slug: 'explainer-test',
      format: 'explainer',
      look: 'neon-sign',
      voice: 'mock-voice:test',
    });
    const { bundle } = await makeProduction({
      prod,
      rootDir: ROOT,
      provider: 'mock-voice',
      backend: 'mock',
      music: true,
      narrationOffset: 0.15,
      musicOffset: 0.25,
    });
    assert.equal(bundle.format, 'explainer');
    assert.equal(bundle.look.id, 'neon-sign');
    assert.equal(bundle.look.resolved.hostVariant, 'ink-mascot');
    assert.equal(bundle.look.resolved.showHost, true);
    assert.equal(bundle.tracks.length, 2);
    assert.equal(bundle.tracks[0].offset, 0.15);
    assert.equal(bundle.tracks[1].offset, 0.25);
    assert.ok(existsSync(join(prod, 'build', 'index.html')));

    const checkReport = await checkProduction({ prod, rootDir: ROOT, skipBrowser: true });
    assert.equal(checkReport.status, 'PASS');

    const preview = await previewProduction({ prod, rootDir: ROOT, once: true });
    assert.match(preview.url, /^http:\/\/127\.0\.0\.1:\d+\/$/);

    // Reroll paragraph 1: downstream products and bundle become stale and must be refused!
    await buildVoice({ prod, rootDir: ROOT, provider: 'mock-voice', redo: 1 });
    await assert.rejects(buildCues({ prod, rootDir: ROOT }), /stale products/);
    await assert.rejects(assertBundleFresh(prod), /stale products/);
    await assert.rejects(checkProduction({ prod, rootDir: ROOT, skipBrowser: true }), /stale products/);

    // Rebuild words, but before rebuilding cues, bundle.json is still stale!
    await buildWords({ prod, rootDir: ROOT, backend: 'mock' });
    await assert.rejects(assertBundleFresh(prod), /stale products|stale bundle\.json/);

    // Rebuild cues: bundle.json is fresh again!
    await buildCues({ prod, rootDir: ROOT });
    const refreshed = await assertBundleFresh(prod);
    assert.notEqual(refreshed.inputsDigest, bundle.inputsDigest);
  } finally {
    await rm(prod, { recursive: true, force: true });
  }
});

test('pipeline supports lyric (doodle-ink) and instrumental (crumbs-sdf) and vertical (1080x1920)', async () => {
  const lyricDir = await tempDir('vbc-lyric-');
  const instDir = await tempDir('vbc-inst-');
  const vertDir = await tempDir('vbc-vert-');
  try {
    await initProduction({
      prod: lyricDir,
      rootDir: ROOT,
      format: 'lyric',
      look: 'doodle-ink',
      voice: 'mock-voice:lyric',
    });
    const lyricRes = await makeProduction({
      prod: lyricDir,
      rootDir: ROOT,
      provider: 'mock-voice',
      backend: 'mock',
    });
    assert.equal(lyricRes.bundle.format, 'lyric');
    assert.equal(lyricRes.bundle.look.id, 'doodle-ink');
    assert.equal(lyricRes.bundle.look.resolved.showHost, false);
    assert.equal(lyricRes.bundle.tracks.length, 2);

    await initProduction({
      prod: instDir,
      rootDir: ROOT,
      format: 'instrumental',
      look: 'crumbs-sdf',
    });
    const instRes = await makeProduction({
      prod: instDir,
      rootDir: ROOT,
      duration: 8,
    });
    assert.equal(instRes.bundle.format, 'instrumental');
    assert.equal(instRes.bundle.look.id, 'crumbs-sdf');
    assert.equal(instRes.bundle.narrated, false);
    assert.equal(instRes.bundle.tracks.length, 1);
    assert.equal(instRes.bundle.tracks[0].kind, 'music');

    await initProduction({
      prod: vertDir,
      rootDir: ROOT,
      format: 'vertical-short',
      look: 'neon-sign + palette=risograph',
      voice: 'mock-voice:vert',
      vertical: true,
    });
    const vertRes = await makeProduction({
      prod: vertDir,
      rootDir: ROOT,
      provider: 'mock-voice',
      backend: 'mock',
      vertical: true,
    });
    assert.equal(vertRes.bundle.width, 1080);
    assert.equal(vertRes.bundle.height, 1920);
    assert.equal(vertRes.bundle.look.resolved.palette, 'risograph');
  } finally {
    await rm(lyricDir, { recursive: true, force: true });
    await rm(instDir, { recursive: true, force: true });
    await rm(vertDir, { recursive: true, force: true });
  }
});

test('external track audio parity: decodeWav, offset, gain and mid-track seek in SOUND.kit', async () => {
  const dir = await tempDir('vbc-audio-');
  try {
    const wavFile = join(dir, 'tone.wav');
    const rate = 24000;
    const samples = new Float32Array(rate); // 1.0s constant 0.5 amplitude
    samples.fill(0.5);
    await writeWav(wavFile, samples, rate);
    const bytes = await readFile(wavFile);
    const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

    const decoded = globalThis.SOUND.decodeWav(ab);
    assert.equal(decoded.sampleRate, rate);
    assert.equal(decoded.channels.length, 1);
    assert.equal(decoded.channels[0].length, rate);
    assert.ok(Math.abs(decoded.channels[0][100] - 0.5) < 1e-3);

    function makeMockAudioCtx() {
      const starts = [];
      const gains = [];
      return {
        sampleRate: rate,
        destination: {},
        starts,
        gains,
        createGain() {
          const g = { gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
          gains.push(g);
          return g;
        },
        createDynamicsCompressor() {
          return { threshold: {}, knee: {}, ratio: {}, attack: {}, release: {}, connect() {} };
        },
        createWaveShaper() {
          return { curve: null, connect() {} };
        },
        createBuffer(ch, len, sr) {
          const data = Array.from({ length: ch }, () => new Float32Array(len));
          return {
            sampleRate: sr,
            getChannelData: (c) => data[c],
          };
        },
        createBufferSource() {
          return {
            buffer: null,
            connect() {},
            start(when, offset) {
              starts.push({ when, offset });
            },
          };
        },
      };
    }

    // 1. Offline / start-from-0 scheduling with offset=0.5, gain=0.8
    const offlineCtx = makeMockAudioCtx();
    const kit0 = globalThis.SOUND.kit(offlineCtx, { shift: 0, from: -Infinity });
    kit0.track(decoded, 0.5, { gain: 0.8 });
    assert.equal(offlineCtx.starts.length, 1);
    assert.equal(offlineCtx.starts[0].when, 0.5);
    assert.equal(offlineCtx.starts[0].offset, 0);
    assert.equal(offlineCtx.gains.at(-1).gain.value, 0.8);

    // 2. Live mid-track seek at from=0.85s (0.35s into the track that starts at 0.5s)
    const seekCtx = makeMockAudioCtx();
    const kitSeek = globalThis.SOUND.kit(seekCtx, { shift: -0.79, from: 0.85 });
    kitSeek.track(decoded, 0.5, { gain: 0.8 });
    assert.equal(seekCtx.starts.length, 1);
    assert.ok(Math.abs(seekCtx.starts[0].when - 0.06) < 1e-6);
    assert.ok(Math.abs(seekCtx.starts[0].offset - 0.35) < 1e-6);

    // 3. Seek past track end (from=1.7s > 0.5s + 1.0s) skips scheduling
    const pastCtx = makeMockAudioCtx();
    const kitPast = globalThis.SOUND.kit(pastCtx, { shift: -1.64, from: 1.7 });
    kitPast.track(decoded, 0.5, { gain: 0.8 });
    assert.equal(pastCtx.starts.length, 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('vbc CLI new/make/check round-trip and rejection of missing --prod', async () => {
  const prod = await tempDir('vbc-cli-pipe-');
  try {
    const run = (...args) => spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
    assert.equal(run('new', 'demo').status, 1);
    assert.equal(run('make').status, 1);

    const newRes = run('new', 'cli-demo', '--prod', prod, '--look', 'doodle-ink', '--voice', 'mock-voice:v1');
    assert.equal(newRes.status, 0, newRes.stderr);

    const makeRes = run('make', '--prod', prod, '--provider', 'mock-voice', '--backend', 'mock');
    assert.equal(makeRes.status, 0, makeRes.stderr);
    assert.match(makeRes.stdout, /PASS: built explainer bundle/);

    const checkRes = run('check', '--prod', prod, '--skip-browser');
    assert.equal(checkRes.status, 0, checkRes.stderr);
    assert.match(checkRes.stdout, /PASS: check doodle-ink/);
  } finally {
    await rm(prod, { recursive: true, force: true });
  }
});
