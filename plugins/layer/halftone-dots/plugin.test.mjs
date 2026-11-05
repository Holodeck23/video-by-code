import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import './index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('layer/halftone-dots registers and exposes draw()', () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'plugin.json'), 'utf8')
  );
  assert.equal(manifest.id, 'halftone-dots');
  assert.equal(manifest.kind, 'layer');
  assert.equal(manifest.slot, 'marks');

  const plugin = globalThis.VBC_PLUGINS['layer/halftone-dots'];
  assert.ok(plugin);
  assert.equal(typeof plugin.draw, 'function');
});
