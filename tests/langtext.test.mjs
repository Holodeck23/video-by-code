import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('language-aware text units, mouth moras and aligner cache (python unittest)', () => {
  const script = fileURLToPath(new URL('./langtext.test.py', import.meta.url));
  const run = spawnSync('python3', [script], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stdout + run.stderr);
});
