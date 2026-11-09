import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  applySayMap,
  assertFresh,
  buildVoice,
  comparableCount,
  parseBrief,
  parseMarkup,
  parseScript,
  staleProducts,
  withProductionLock,
} from '../lib/voice.mjs';
import { decodeWav, encodeWav } from '../lib/wav.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SCRIPT = `# Intro
[[hello]] Welcome to the {Q3|quarter three} review.

The first number is {3:07|three oh seven} on the clock today.

# Close
Thanks for watching and see you next time everyone.
`;

async function production(script = SCRIPT, extra = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'vbc-voice-'));
  await writeFile(join(dir, 'script.md'), script);
  for (const [name, body] of Object.entries(extra)) {
    await writeFile(join(dir, name), body);
  }
  return dir;
}

const build = (prod, opts = {}) => buildVoice({ prod, rootDir: ROOT, provider: 'mock-voice', ...opts });
const readVoice = async (prod) => JSON.parse(await readFile(join(prod, 'build', 'voice.json'), 'utf8'));

test('markup keeps shown and spoken forms apart and rejects unbalanced braces', () => {
  assert.deepEqual(parseMarkup('Revenue {Q3|quarter three} grew {12%|twelve percent}.'), {
    display: 'Revenue Q3 grew 12%.',
    spoken: 'Revenue quarter three grew twelve percent.',
  });
  assert.equal(parseMarkup('literal \\{braces\\} and \\| bars').display, 'literal {braces} and | bars');
  assert.throws(() => parseMarkup('oops {not closed'), /unbalanced/);
  assert.equal(comparableCount('…！？ 、。', 'ja'), 0);
  assert.equal(comparableCount('…', 'en'), 0);
  assert.ok(comparableCount('今日は晴れ', 'ja') >= 5);
  assert.deepEqual(parseBrief('- Voice: kokoro:af_heart\nlanguage: ja\nVoice, pronunciation and allowed edits:'),
    { voice: 'kokoro:af_heart', language: 'ja' });
  assert.equal(applySayMap('call 3:07 or 3:075', { '3:07': 'three oh seven' }), 'call three oh seven or 3:075');
});

test('paragraph ids are stable when other paragraphs are inserted; repeats are numbered; empties fail', () => {
  const a = parseScript('One two three four.\n\nFive six seven eight.\n\nOne two three four.');
  assert.equal(a.length, 3);
  assert.equal(a[2].id, `${a[0].id}-2`);
  const b = parseScript('Brand new opening paragraph here.\n\nOne two three four.\n\nFive six seven eight.\n\nOne two three four.');
  assert.deepEqual(b.slice(1).map((p) => p.id), a.map((p) => p.id));
  assert.equal(parseScript('[[x-1]] Some words here.').at(0).id, 'x-1');
  assert.throws(() => parseScript('[[a]] one two\n\n[[a]] three four'), /duplicate paragraph id/);
  assert.throws(() => parseScript('Hello there.\n\n…\n'), /no comparable narration tokens/);
  assert.throws(() => parseScript('！？。', 'ja'), /no comparable narration tokens/);
  assert.equal(parseScript(SCRIPT)[0].section, 'Intro');
  assert.equal(parseScript(SCRIPT)[2].section, 'Close');
});

test('wav codec round-trips PCM16', () => {
  const samples = Float32Array.from([0, 0.5, -0.5, 1, -1]);
  const back = decodeWav(encodeWav(samples, 24000));
  assert.equal(back.rate, 24000);
  samples.forEach((v, i) => assert.ok(Math.abs(back.samples[i] - v) < 1e-3));
});

test('first build synthesizes everything; an unchanged rebuild reuses every paragraph', async () => {
  const prod = await production();
  try {
    const first = await build(prod);
    assert.equal(first.synthesized.length, 3);
    assert.equal(first.reused.length, 0);
    const v = first.voice;
    assert.equal(v.paragraphs[0].id, 'hello');
    assert.match(v.paragraphs[0].display, /Q3/);
    assert.match(v.paragraphs[0].spoken, /quarter three/);
    assert.ok(v.paragraphs[1].start >= v.paragraphs[0].end + 0.74);
    assert.ok(existsSync(join(prod, 'build', 'audio', 'narration.wav')));
    const second = await build(prod);
    assert.equal(second.synthesized.length, 0);
    assert.equal(second.reused.length, 3);
    assert.equal(second.voice.fingerprint, v.fingerprint);
  } finally {
    await rm(prod, { recursive: true, force: true });
  }
});

test('editing one paragraph or inserting another re-synthesizes only what changed', async () => {
  const prod = await production();
  try {
    const first = await build(prod);
    const second = first.voice.paragraphs[1].id;
    await writeFile(join(prod, 'script.md'), SCRIPT.replace('first number', 'second number'));
    const edited = await build(prod);
    assert.equal(edited.synthesized.length, 1);
    assert.equal(edited.reused.length, 2);
    assert.notEqual(edited.voice.paragraphs[1].id, second);

    await writeFile(join(prod, 'script.md'), `A brand new paragraph appears right here.\n\n${SCRIPT.replace('first number', 'second number')}`);
    const inserted = await build(prod);
    assert.equal(inserted.synthesized.length, 1, 'only the inserted paragraph is synthesized');
    assert.equal(inserted.reused.length, 3);
  } finally {
    await rm(prod, { recursive: true, force: true });
  }
});

test('pronunciation dictionary re-synthesizes only paragraphs it rewrote', async () => {
  const prod = await production(SCRIPT.replace('{3:07|three oh seven}', '3:07'), { 'say.json': '{}' });
  try {
    await build(prod);
    await writeFile(join(prod, 'say.json'), JSON.stringify({ '3:07': 'three oh seven' }));
    const next = await build(prod);
    assert.deepEqual(next.synthesized.length, 1);
    assert.equal(next.reused.length, 2);
  } finally {
    await rm(prod, { recursive: true, force: true });
  }
});

test('--redo N regenerates only that paragraph and invalidates every dependent timing product', async () => {
  const prod = await production();
  try {
    const first = await build(prod);
    const ids = first.voice.paragraphs.map((p) => p.id);
    for (const name of ['words', 'mouth', 'cues', 'captions']) {
      await writeFile(join(prod, 'build', `${name}.json`), JSON.stringify({ sources: { voice: first.voice.fingerprint } }));
    }
    assert.deepEqual(await staleProducts(prod), []);
    await assertFresh(prod);

    const redo = await build(prod, { redo: 2 });
    assert.deepEqual(redo.synthesized, [ids[1]]);
    assert.deepEqual(redo.reused.sort(), [ids[0], ids[2]].sort());
    assert.notEqual(redo.voice.fingerprint, first.voice.fingerprint);
    assert.notEqual(redo.voice.paragraphs[1].audioSha256, first.voice.paragraphs[1].audioSha256);
    assert.equal(redo.voice.paragraphs[0].audioSha256, first.voice.paragraphs[0].audioSha256);
    assert.deepEqual(redo.stale.map((s) => s.product).sort(), ['captions.json', 'cues.json', 'mouth.json', 'words.json']);
    await assert.rejects(assertFresh(prod, ['words']), /stale products.*words\.json/);

    const again = await build(prod);
    assert.equal(again.synthesized.length, 0, 'the rerolled take is now the cached take');
    assert.equal(again.voice.fingerprint, redo.voice.fingerprint);
    const byId = await build(prod, { redo: ids[2] });
    assert.deepEqual(byId.synthesized, [ids[2]]);
    await assert.rejects(build(prod, { redo: 'nope' }), /no such paragraph/);
    await assert.rejects(build(prod, { redo: 9 }), /no such paragraph/);
  } finally {
    await rm(prod, { recursive: true, force: true });
  }
});

test('products that never recorded their voice are stale, not trusted', async () => {
  const prod = await production();
  try {
    await build(prod);
    await writeFile(join(prod, 'build', 'words.json'), '{}');
    const stale = await staleProducts(prod);
    assert.equal(stale.length, 1);
    assert.match(stale[0].reason, /no sources\.voice/);
  } finally {
    await rm(prod, { recursive: true, force: true });
  }
});

test('providers and languages are checked up front', async () => {
  const prod = await production();
  try {
    await assert.rejects(build(prod, { provider: 'no-such-provider' }), /unknown voice provider/);
    await assert.rejects(build(prod, { lang: 'xx' }), /does not support language 'xx'/);
    await assert.rejects(buildVoice({ prod, rootDir: ROOT, provider: 'kokoro', lang: 'ru' }), /does not support language 'ru'/);
    await assert.rejects(buildVoice({ rootDir: ROOT }), /--prod DIR is required/);
    await assert.rejects(buildVoice({ prod: ROOT, rootDir: ROOT, provider: 'mock-voice' }), /no script\.md|inside the code checkout/);
  } finally {
    await rm(prod, { recursive: true, force: true });
  }
});

test('a production inside the code checkout is refused', async () => {
  const inside = join(ROOT, 'tests', '.tmp-prod');
  await mkdir(inside, { recursive: true });
  try {
    await writeFile(join(inside, 'script.md'), 'Some words to say here.');
    await assert.rejects(build(inside), /inside the code checkout/);
    assert.equal(existsSync(join(inside, 'build')), false, 'nothing was written');
  } finally {
    await rm(inside, { recursive: true, force: true });
  }
});

test('a failing provider publishes nothing and leaves the previous product intact', async () => {
  const root = await mkdtemp(join(tmpdir(), 'vbc-root-'));
  const prod = await production();
  try {
    await mkdir(join(root, 'plugins', 'provider', 'flaky'), { recursive: true });
    await writeFile(join(root, 'plugins', 'provider', 'flaky', 'index.js'), `
      globalThis.VBC_PLUGINS = globalThis.VBC_PLUGINS || {};
      globalThis.VBC_PLUGINS['provider/flaky'] = {
        kind: 'provider', id: 'flaky', modality: 'voice', languages: ['en'],
        async synthesize({ text }) {
          if (/Thanks/.test(text)) throw new Error('boom: provider fell over');
          return { samples: new Float32Array(24000).fill(0.1), rate: 24000 };
        },
      };`);
    await assert.rejects(buildVoice({ prod, rootDir: root, provider: 'flaky' }), /boom/);
    assert.equal(existsSync(join(prod, 'build', 'voice.json')), false);
    assert.equal(existsSync(join(prod, 'build', 'audio', 'narration.wav')), false);
    assert.equal(existsSync(join(prod, '.vbc.lock')), false, 'lock released after failure');

    const good = await build(prod);
    const before = await readFile(join(prod, 'build', 'voice.json'), 'utf8');
    await writeFile(join(prod, 'script.md'), SCRIPT.replace('see you next time', 'Thanks again'));
    await assert.rejects(buildVoice({ prod, rootDir: root, provider: 'flaky' }), /boom/);
    assert.equal(await readFile(join(prod, 'build', 'voice.json'), 'utf8'), before);
    assert.ok(good.voice.fingerprint);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(prod, { recursive: true, force: true });
  }
});

test('two builds of one production serialize; a dead process lock is replaced', async () => {
  const prod = await production();
  try {
    await withProductionLock(prod, async () => {
      await assert.rejects(build(prod), /another vbc build holds/);
    });
    assert.equal(existsSync(join(prod, 'build', 'voice.json')), false, 'the rejected build wrote nothing');
    await writeFile(join(prod, '.vbc.lock'), '999999\n');
    await build(prod);
    assert.equal(existsSync(join(prod, '.vbc.lock')), false);
    await writeFile(join(prod, '.vbc.lock'), `${process.pid}\n`);
    await assert.rejects(withProductionLock(prod, async () => 1), /another vbc build holds/);
  } finally {
    await rm(prod, { recursive: true, force: true });
  }
});

const MASTER = '[[a]] One two three four.\n\n[[b]] Five six seven eight nine ten.\n';

test('other-language takes fit the master timeline: shorter pads, modest overrun speeds up', async () => {
  const en = await production(MASTER);
  const ja = await production('[[a]] あいうえお かきくけこ\n\n[[b]] いち に さん し ご ろく\n');
  try {
    const master = (await build(en)).voice;
    const fitted = (await build(ja, { lang: 'ja', master: en })).voice;
    for (const [i, m] of master.paragraphs.entries()) {
      const p = fitted.paragraphs[i];
      assert.equal(p.id, m.id);
      assert.equal(p.start, m.start);
      assert.equal(p.end, m.end, 'padded or fitted to the master slot');
    }
    assert.equal(fitted.duration, master.duration);
    assert.equal(fitted.language, 'ja');
    assert.ok(fitted.paragraphs[0].duration <= master.paragraphs[0].duration + 1e-6);
    assert.ok(fitted.paragraphs[0].speed > fitted.speed, 'a modest overrun is re-synthesized faster');
    assert.equal(fitted.paragraphs[1].speed, fitted.speed, 'a shorter take keeps its natural pace and is padded');
    assert.ok(fitted.paragraphs[1].duration < master.paragraphs[1].duration);
  } finally {
    await rm(en, { recursive: true, force: true });
    await rm(ja, { recursive: true, force: true });
  }
});

test('a take over 1.25x the master fails naming the paragraph and publishes nothing', async () => {
  const en = await production(MASTER);
  const ja = await production('[[a]] いちにさんしごろくしちはちくじゅう\n\n[[b]] あいうえお\n');
  try {
    await build(en);
    await assert.rejects(build(ja, { lang: 'ja', master: en }), (err) => {
      assert.match(err.message, /language fit failed/);
      assert.match(err.message, /\ba: /);
      assert.doesNotMatch(err.message, /\bb: /);
      assert.match(err.message, /cap x1\.25/);
      return true;
    });
    assert.equal(existsSync(join(ja, 'build', 'voice.json')), false);
    assert.equal(existsSync(join(ja, 'build', 'audio', 'narration.wav')), false);
  } finally {
    await rm(en, { recursive: true, force: true });
    await rm(ja, { recursive: true, force: true });
  }
});

test('translations must share paragraph ids with the master', async () => {
  const en = await production(MASTER);
  const ja = await production('いち に さん し\n\nご ろく しち はち\n');
  try {
    await build(en);
    await assert.rejects(build(ja, { lang: 'ja', master: en }), /paragraph ids differ from the master/);
    await assert.rejects(build(en, { master: en }), /already 'en'/);
  } finally {
    await rm(en, { recursive: true, force: true });
    await rm(ja, { recursive: true, force: true });
  }
});

test('vbc voice CLI: builds, reports reuse, rejects a missing --prod and unknown flags', async () => {
  const prod = await production();
  try {
    const cli = (...args) => spawnSync('node', [join(ROOT, 'bin/vbc.mjs'), 'voice', ...args], { encoding: 'utf8' });
    const first = cli('--prod', prod, '--provider', 'mock-voice');
    assert.equal(first.status, 0, first.stdout + first.stderr);
    assert.match(first.stdout, /PASS: voice en .*\(synthesized 3/);
    const redo = cli('--prod', prod, '--provider', 'mock-voice', '--redo', 'hello');
    assert.match(redo.stdout, /synthesized 1: hello/);
    assert.equal(cli('--provider', 'mock-voice').status, 1);
    assert.equal(cli('--prod', prod, '--bogus', 'x').status, 1);
    assert.equal(cli('--prod').status, 1);
    assert.equal((await readVoice(prod)).paragraphs.find((p) => p.id === 'hello').take, 1);
  } finally {
    await rm(prod, { recursive: true, force: true });
  }
});
