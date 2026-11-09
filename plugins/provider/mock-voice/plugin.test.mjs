import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import './index.js';

test('provider/mock-voice plugin metadata and runtime hook load cleanly', async () => {
  const meta = JSON.parse(await readFile(new URL('./plugin.json', import.meta.url), 'utf8'));
  assert.equal(meta.kind, 'provider');
  assert.equal(meta.id, 'mock-voice');
  assert.equal(meta.lane, 'lab');
  assert.ok(globalThis.VBC_PLUGINS?.['provider/mock-voice']);
});
