import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  bundleErrors,
  migrate,
  publishBundle,
  releaseErrors,
  schemaFor,
  validate
} from '../lib/contracts.mjs';
import {
  buildDynamicSchema,
  catalogFromRegistry,
  discoverPlugins,
  evaluateApprovalCarryOver,
  lintCapabilities,
  loadCapabilities,
  scaffoldPlugin,
  scopedLookFingerprint,
  validateBundleExtensions
} from '../lib/registry.mjs';

test('discoverPlugins finds host, beat and layer plugins and lints capabilities', async () => {
  const registry = await discoverPlugins();
  assert.equal(registry.errors.length, 0, registry.errors.join('; '));
  assert.ok(registry.entries.length >= 6);

  const ids = registry.entries.map((p) => `${p.kind}/${p.id}`);
  assert.ok(ids.includes('layer/host-pixel-sprite'));
  assert.ok(ids.includes('layer/host-geometric-bot'));
  assert.ok(ids.includes('layer/host-ink-mascot'));
  assert.ok(ids.includes('layer/host-cyber-bust'));
  assert.ok(ids.includes('beat/metric-compare'));
  assert.ok(ids.includes('layer/halftone-dots'));

  const caps = await loadCapabilities();
  const lintErrs = lintCapabilities(registry, caps);
  assert.deepEqual(lintErrs, []);

  const typoRegistry = {
    entries: [
      {
        id: 'bad-plugin',
        kind: 'layer',
        requires: ['pixel-grid', 'typo-capability'],
        provides: ['unknown-output']
      }
    ]
  };
  const typoErrs = lintCapabilities(typoRegistry, caps);
  assert.equal(typoErrs.length, 2);
  assert.match(typoErrs[0], /unknown required capability "typo-capability"/);
  assert.match(typoErrs[1], /unknown provided capability "unknown-output"/);
});

test('dynamic schemas accept plugin beat types and validate plugin beat schema', async () => {
  const registry = await discoverPlugins();
  const baseBundleSchema = await schemaFor('bundle');
  const baseCueSchema = await schemaFor('cue');
  const bundleSchema = buildDynamicSchema('bundle', baseBundleSchema, registry);
  const cueSchema = buildDynamicSchema('cue', baseCueSchema, registry);

  assert.ok(bundleSchema.properties.beats.items.properties.type.enum.includes('metric-compare'));
  assert.ok(cueSchema.properties.cues.items.properties.type.enum.includes('metric-compare'));

  const validBeatBundle = {
    beats: [
      {
        id: 'mc1',
        type: 'metric-compare',
        start: 0,
        end: 5,
        content: {
          title: 'TCP vs QUIC',
          leftColumn: { name: 'TCP', metric: '240 ms', barRatio: 0.9 }
        }
      }
    ]
  };
  assert.deepEqual(validateBundleExtensions(validBeatBundle, registry), []);

  const invalidBeatBundle = {
    beats: [
      {
        id: 'mc1',
        type: 'metric-compare',
        start: 0,
        end: 5,
        content: {
          title: 'TCP vs QUIC',
          leftColumn: { name: 'TCP', barRatio: 5 }
        }
      }
    ]
  };
  const beatErrs = validateBundleExtensions(invalidBeatBundle, registry);
  assert.ok(beatErrs.some((e) => e.includes('barRatio')));

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vbc-pub-test-'));
  try {
    const outPath = path.join(tmpDir, 'bundle.json');
    const fullBundle = {
      schemaVersion: 1,
      inputsDigest: 'a'.repeat(64),
      format: 'explainer',
      width: 1920,
      height: 1080,
      fps: 30,
      duration: 5,
      narrated: false,
      look: {
        id: 'pilot',
        fingerprint: 'b'.repeat(64),
        resolved: { palette: 'warm-editorial', host: 'ink-mascot' }
      },
      beats: [
        {
          id: 'mc1',
          type: 'metric-compare',
          start: 0,
          end: 5,
          content: {
            title: 'TCP vs QUIC',
            leftColumn: { name: 'TCP', metric: '240 ms', barRatio: 0.9 }
          }
        }
      ],
      words: [],
      mouth: { fps: 12, shapes: 'cccc' },
      music: { beats: [], downbeats: [], sections: [] },
      captions: [],
      tracks: [],
      score: [],
      ext: {}
    };
    assert.deepEqual(bundleErrors(fullBundle), []);
    await publishBundle(outPath, fullBundle);
    assert.ok(fs.existsSync(outPath));

    const badTypeBundle = {
      ...fullBundle,
      beats: [
        {
          id: 'b1',
          type: 'unregistered-beat-type',
          start: 0,
          end: 5,
          content: { title: 'Nope' }
        }
      ]
    };
    assert.ok(bundleErrors(badTypeBundle).some((e) => e.includes('unregistered-beat-type')));
    await assert.rejects(() => publishBundle(outPath, badTypeBundle), /unknown value/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('scaffoldPlugin creates passing plugins and validates ext.<analyserId>', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vbc-plugin-test-'));
  try {
    fs.mkdirSync(path.join(tmpRoot, 'schemas'), { recursive: true });
    fs.copyFileSync(
      path.resolve('schemas/capabilities.json'),
      path.join(tmpRoot, 'schemas/capabilities.json')
    );

    const dir = await scaffoldPlugin(tmpRoot, 'analyser', 'pitch-contour');
    assert.ok(fs.existsSync(path.join(dir, 'plugin.json')));

    const reg = await discoverPlugins(tmpRoot);
    assert.deepEqual(reg.errors, []);
    assert.equal(reg.entries.length, 1);

    const manifestSchema = await schemaFor('plugin');
    const rawMeta = JSON.parse(fs.readFileSync(path.join(dir, 'plugin.json'), 'utf8'));
    assert.deepEqual(validate(manifestSchema, rawMeta), []);

    const caps = await loadCapabilities(tmpRoot);
    assert.deepEqual(lintCapabilities(reg, caps), []);

    const bundleWithExt = {
      beats: [],
      ext: {
        'pitch-contour': { title: 'F0 contour' }
      }
    };
    assert.deepEqual(validateBundleExtensions(bundleWithExt, reg), []);

    const bundleWithUnknownExt = {
      beats: [],
      ext: {
        'unregistered-tool': { title: 'x' }
      }
    };
    const extErrs = validateBundleExtensions(bundleWithUnknownExt, reg);
    assert.ok(extErrs.some((e) => e.includes('unregistered-tool')));
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('scopedLookFingerprint ignores unrelated plugins and carries over approvals', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vbc-fp-test-'));
  try {
    fs.mkdirSync(path.join(tmpRoot, 'lib/stage'), { recursive: true });
    fs.mkdirSync(path.join(tmpRoot, 'schemas'), { recursive: true });
    fs.writeFileSync(path.join(tmpRoot, 'lib/stage/index.js'), '// engine v1\n');
    fs.copyFileSync(
      path.resolve('schemas/capabilities.json'),
      path.join(tmpRoot, 'schemas/capabilities.json')
    );

    await scaffoldPlugin(tmpRoot, 'layer', 'marks-a', { slot: 'marks' });
    await scaffoldPlugin(tmpRoot, 'layer', 'marks-b', { slot: 'marks' });
    const reg1 = await discoverPlugins(tmpRoot);

    const lookA = {
      id: 'look-a',
      slots: { marks: 'marks-a' }
    };
    const fp1 = await scopedLookFingerprint(lookA, reg1, tmpRoot);

    // Modify unrelated plugin marks-b
    fs.appendFileSync(
      path.join(tmpRoot, 'plugins/layer/marks-b/index.js'),
      '// unrelated edit\n'
    );
    const fp2 = await scopedLookFingerprint(lookA, reg1, tmpRoot);
    assert.equal(fp1, fp2, 'unrelated plugin edit must not change look-a fingerprint');

    // Modify engine file used by look-a
    fs.writeFileSync(path.join(tmpRoot, 'lib/stage/index.js'), '// engine v2\n');
    const fp3 = await scopedLookFingerprint(lookA, reg1, tmpRoot);
    assert.notEqual(fp1, fp3, 'engine edit alters code fingerprint');

    const acceptedEntry = {
      id: 'look-a',
      status: 'accepted',
      approval: {
        reviewer: 'David',
        date: '2026-11-05',
        fingerprint: fp1
      }
    };
    const carried = evaluateApprovalCarryOver(
      acceptedEntry,
      fp3,
      ['f0-aaa', 'f1-bbb'],
      ['f0-aaa', 'f1-bbb']
    );
    assert.equal(carried.carriedOver, true);
    assert.equal(carried.needsReview, false);
    assert.equal(carried.status, 'accepted');
    assert.equal(carried.approval.fingerprint, fp3);

    const changedFrames = evaluateApprovalCarryOver(
      acceptedEntry,
      fp3,
      ['f0-aaa', 'f1-bbb'],
      ['f0-aaa', 'f1-DIFF']
    );
    assert.equal(changedFrames.carriedOver, false);
    assert.equal(changedFrames.needsReview, true);
    assert.equal(changedFrames.status, 'clip-passed');
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('lab lane plugins never block release and migrate upgrades older schemas', async () => {
  const registry = await discoverPlugins();
  const catalog = catalogFromRegistry(registry);
  assert.ok(catalog['marks/halftone-dots']);
  assert.ok(catalog['host/host-pixel-sprite']);

  const manifest = {
    schemaVersion: 1,
    scopeFrozen: true,
    unresolvedSources: [],
    entries: [
      {
        id: 'pilot-look',
        sourceClass: 'rewritten-style-spec',
        status: 'accepted',
        launch: true,
        approval: {
          reviewer: 'David',
          date: '2026-11-05',
          fingerprint: 'fp-1',
          evidence: [
            { aspect: 'landscape', clip: '16x9.mp4', moving: true, sound: true },
            { aspect: 'vertical', clip: '9x16.mp4', moving: true, sound: true }
          ]
        }
      },
      {
        id: 'experimental-look',
        sourceClass: 'rewritten-style-spec',
        lane: 'lab',
        status: 'spec',
        launch: false
      }
    ]
  };
  const labPlugins = [{ kind: 'beat', id: 'exp-beat', lane: 'lab', status: 'lab' }];
  assert.deepEqual(
    releaseErrors(manifest, { 'pilot-look': 'fp-1' }, labPlugins),
    []
  );

  const migratedBundle = migrate('bundle', { duration: 5 }, 1);
  assert.equal(migratedBundle.schemaVersion, 1);
  assert.deepEqual(migratedBundle.ext, {});

  const migratedPlugin = migrate('plugin', { id: 'x', kind: 'beat' }, 1);
  assert.equal(migratedPlugin.schemaVersion, 1);
  assert.equal(migratedPlugin.lane, 'lab');
});
