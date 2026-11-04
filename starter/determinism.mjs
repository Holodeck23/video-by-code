// Renders the same timestamps after jumping around; every hash for one t must match.
// Usage: node determinism.mjs <page.html>   (any kit page: reads canvas#c and window.DURATION)
import { createHash } from 'node:crypto';
import { openPage, grabPng } from './lib-render/page.mjs';
const file = process.argv[2];
if (!file) { console.error('usage: node determinism.mjs <page.html>'); process.exit(2); }
let browser;
try {
const opened = await openPage(file);
browser = opened.browser;
const page = opened.page, dur = opened.meta.duration;
const grab = t => grabPng(page, t);
// Out-of-order visits, including the end, the start and repeats.
const at = (u) => Math.round(u * dur * 1000) / 1000;
const order = [0.5, 0.875, 0.025, 0.5, 0.25, 0.999, 0.875, 0, 0.5, 0.25, 0, 0.999].map(at);
const seen = new Map();
for (const t of order) {
  if (!seen.has(t)) seen.set(t, new Set());
  seen.get(t).add(createHash('sha256').update(await grab(t)).digest('hex').slice(0, 12));
}

let ok = true;
for (const [t, h] of seen) { console.log(`t=${t}: ${[...h].join(', ')}`); if (h.size > 1) ok = false; }
console.log(ok ? 'DETERMINISTIC' : 'NOT DETERMINISTIC: a frame depends on render history');
process.exitCode = ok ? 0 : 1;
} catch (error) {
  console.error(`determinism: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
}
