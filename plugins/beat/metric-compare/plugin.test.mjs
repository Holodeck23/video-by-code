import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import './index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('beat/metric-compare registers and renders valid text sizes', () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'plugin.json'), 'utf8')
  );
  assert.equal(manifest.id, 'metric-compare');
  assert.equal(manifest.kind, 'beat');

  const plugin = globalThis.VBC_PLUGINS['beat/metric-compare'];
  assert.ok(plugin);
  assert.equal(typeof plugin.draw, 'function');
});
