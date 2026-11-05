import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import './index.js';

test('layer/host-cyber-bust plugin loads and registers draw hook', async () => {
  const meta = JSON.parse(await readFile(new URL('./plugin.json', import.meta.url), 'utf8'));
  assert.equal(meta.id, 'host-cyber-bust');
  assert.equal(meta.slot, 'host');
  const plugin = globalThis.VBC_PLUGINS?.['layer/host-cyber-bust'];
  assert.equal(typeof plugin?.draw, 'function');
});
