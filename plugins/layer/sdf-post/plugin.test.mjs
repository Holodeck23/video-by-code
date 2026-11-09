import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import './index.js';

test('layer/sdf-post plugin metadata and runtime hook load cleanly', async () => {
  const meta = JSON.parse(await readFile(new URL('./plugin.json', import.meta.url), 'utf8'));
  assert.equal(meta.kind, 'layer');
  assert.equal(meta.id, 'sdf-post');
  assert.equal(meta.lane, 'launch');
  const p = globalThis.VBC_PLUGINS?.['layer/sdf-post'];
  assert.ok(p);
  assert.equal(p.id, 'sdf-post');
});
