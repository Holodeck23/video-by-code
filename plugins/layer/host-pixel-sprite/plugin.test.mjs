import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import './index.js';

test('layer/host-pixel-sprite plugin loads and registers draw hook', async () => {
  const meta = JSON.parse(await readFile(new URL('./plugin.json', import.meta.url), 'utf8'));
  assert.equal(meta.id, 'host-pixel-sprite');
  assert.equal(meta.slot, 'host');
  const plugin = globalThis.VBC_PLUGINS?.['layer/host-pixel-sprite'];
  assert.equal(typeof plugin?.draw, 'function');
});
