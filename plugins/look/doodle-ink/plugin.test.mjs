import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import './index.js';

test('look/doodle-ink plugin metadata and runtime hook load cleanly', async () => {
  const meta = JSON.parse(await readFile(new URL('./plugin.json', import.meta.url), 'utf8'));
  assert.equal(meta.kind, 'look');
  assert.equal(meta.id, 'doodle-ink');
  assert.equal(meta.lane, 'launch');
  const p = globalThis.VBC_PLUGINS?.['look/doodle-ink'];
  assert.ok(p);
  assert.equal(p.id, 'doodle-ink');
});
