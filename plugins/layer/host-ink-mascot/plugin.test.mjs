import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import './index.js';

test('layer/host-ink-mascot plugin loads and registers draw hook', async () => {
  const meta = JSON.parse(await readFile(new URL('./plugin.json', import.meta.url), 'utf8'));
  assert.equal(meta.id, 'host-ink-mascot');
  assert.equal(meta.slot, 'host');
  const plugin = globalThis.VBC_PLUGINS?.['layer/host-ink-mascot'];
  assert.equal(typeof plugin?.draw, 'function');
});

